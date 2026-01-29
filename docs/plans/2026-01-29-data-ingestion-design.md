# US Compliance MCP - Data Ingestion Design

**Date**: 2026-01-29
**Status**: Approved for Implementation
**Version**: 1.0

---

## Executive Summary

This document describes the automated data ingestion system for the US Compliance MCP server. The system fetches HIPAA, CCPA, and SOX regulations from official government sources, normalizes the data, populates a SQLite database, and generates NIST control mappings using AI assistance.

**Key Goals:**
- 100% automated ingestion from authoritative sources
- Resilient parsing with fail-fast validation
- Pre-generated control mappings (maintainer-generated, user-consumed)
- Automated update monitoring via GitHub Actions

---

## Architecture Overview

### Three-Layer Architecture

**Layer 1: API/Scraping Adapters**
- eCFR Adapter (HIPAA) - XML API
- California LegInfo Adapter (CCPA) - HTML scraping
- SOX Adapter (15 USC + 17 CFR) - XML API via eCFR

**Layer 2: Normalization**
- Each adapter implements `SourceAdapter` interface
- Transforms source-specific formats into common `Section`, `Definition`, `RegulationMetadata` types
- Handles hierarchical section structures and cross-references

**Layer 3: Database Population**
- Orchestrator script coordinates all adapters
- Per-regulation transactions (isolated failures)
- Streaming sections via AsyncGenerators (low memory)
- FTS5 triggers handle search indexing automatically

---

## Data Sources

### HIPAA (Health Insurance Portability and Accountability Act)

**Source:** eCFR API (Electronic Code of Federal Regulations)

**API Endpoint:**
```
https://www.ecfr.gov/api/versioner/v1/full/{YYYY-MM-DD}/title-45.xml
```

**Coverage:**
- 45 CFR Part 160 (General Provisions)
- 45 CFR Part 162 (Administrative Requirements)
- 45 CFR Part 164 (Security and Privacy Rules)

**Update Frequency:** Daily (eCFR syncs with Federal Register)

**Authentication:** None required

**Format:** XML with hierarchical structure: `<PART> → <SUBPART> → <SECTION>`

**Estimated Sections:** ~100 sections

---

### CCPA/CPRA (California Consumer Privacy Act)

**Source:** California Legislative Information (LegInfo)

**URL Pattern:**
```
https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&part=4.&section={section_number}
```

**Coverage:**
- California Civil Code §§ 1798.100 - 1798.199

**Update Frequency:** As amended by California Legislature (typically annual)

**Authentication:** None required

**Format:** HTML (requires web scraping)

**Estimated Sections:** ~40 sections

**Challenges:**
- No official API
- HTML structure may change
- Requires fail-fast DOM validation

---

### SOX (Sarbanes-Oxley Act)

**Source:** US Code + eCFR for SEC regulations

**Statute Source:** US Code (Office of Law Revision Counsel)
```
15 USC Chapter 98 (§§ 7201-7266)
Available: https://uscode.house.gov/
```

**Implementing Regulations:** eCFR API
```
17 CFR Part 229 (Regulation S-K, Item 308)
17 CFR Part 240 (Exchange Act Rules 13a-15, 15d-15, etc.)
```

**Key Sections:**
- SOX Section 302 (Corporate Responsibility) → 15 USC 7241
- SOX Section 404 (Internal Controls) → 15 USC 7262
- SOX Section 802 (Document Destruction) → 15 USC 7243
- SEC Item 308 → 17 CFR 229.308
- SEC Rules 13a-15, 15d-15 → 17 CFR 240.13a-15, 240.15d-15

**Update Frequency:** Rare (statute), Quarterly (SEC regulations)

**Authentication:** None required

**Estimated Sections:** ~15 statutory + ~10 regulatory = ~25 total

---

## Adapter Implementations

### eCFR Adapter (HIPAA + SOX Regulations)

**Class:** `EcfrAdapter`

**Strategy:**
1. Fetch entire Title XML (45 for HIPAA, 17 for SOX)
2. Parse with streaming XML parser (`fast-xml-parser`)
3. Filter to relevant parts (160, 162, 164 for HIPAA; 229, 240 for SOX)
4. Extract sections with hierarchical structure
5. Normalize section numbers (strip `§`, preserve nesting)
6. Parse cross-references from `<CITA>` tags

**Update Detection:**
- Query eCFR version API for last-modified date
- Compare with `source_registry.last_fetched`
- Return `hasChanges: boolean`

**Error Handling:**
- Exponential backoff with jitter (for rate limits)
- Retry up to 3 times
- Fail gracefully if entire title unavailable

---

### California LegInfo Adapter (CCPA)

**Class:** `CaliforniaLeginfoAdapter`

**Strategy:**
1. Fetch each section individually (§ 1798.100, 1798.105, etc.)
2. Parse HTML with `cheerio`
3. **Fail-fast DOM validation** with structural assertions
4. Extract section text, title, and metadata
5. Parse cross-references from text patterns

**DOM Validation Schema:**
```typescript
const DOM_SCHEMA = {
  sectionContainer: 'div.Section',
  sectionNumber: 'span.codesectionnumber',
  sectionText: 'div.sectioncontent',
  minExpectedSections: 35,
  requiredAttributes: ['id', 'class']
};
```

**Validation Checks:**
- Section count >= expected minimum
- Required DOM selectors present
- Text length >= 100 characters (detect truncation)
- Throw `ScrapingError` on validation failure

**Rate Limiting:**
- 500ms delay between requests (polite scraping)
- ~20 seconds total for ~40 sections

**Error Handling:**
- Fail loudly if DOM structure changes
- Log specific validation failures
- Continue other adapters if CCPA fails (isolated transactions)

---

### SOX Adapter

**Class:** `SoxAdapter`

**Strategy:**
1. Fetch 15 USC Chapter 98 from US Code (if available as XML)
2. Fetch 17 CFR Parts 229, 240 from eCFR API
3. Filter to compliance-relevant sections:
   - Statute: 302, 404, 802, 906
   - Regulations: 229.308, 240.13a-15, 240.15d-15
4. Normalize citations (e.g., "15 USC 7262" → "404")
5. Link statute sections to implementing regulations

**Fallback:**
If US Code XML unavailable, use GovInfo:
```
https://www.govinfo.gov/content/pkg/PLAW-107publ204/xml/PLAW-107publ204.xml
```

---

## Orchestrator Script

**File:** `scripts/ingest.ts`

**Workflow:**
```typescript
for each adapter (HIPAA, CCPA, SOX):
  try:
    begin transaction

    // 1. Insert regulation metadata
    INSERT INTO regulations (...)

    // 2. Stream sections in batches
    for await (sectionBatch of adapter.fetchSections()):
      INSERT INTO sections (...)

    // 3. Insert definitions
    definitions = await adapter.extractDefinitions()
    INSERT INTO definitions (...)

    // 4. Update source registry
    INSERT INTO source_registry (last_fetched, sections_count)

    commit transaction

  catch error:
    rollback transaction
    log error
    continue with next adapter
```

**Key Features:**
- **Per-regulation transactions**: CCPA failure doesn't rollback HIPAA
- **Streaming**: AsyncGenerators keep memory low
- **Progress logging**: Real-time section counts
- **Exit code**: Non-zero if any adapter fails (CI/CD integration)

**Execution Time:** ~5 minutes (HIPAA XML fetch, CCPA scraping, SOX XML fetch)

---

## Control Mappings

### Approach: Maintainer-Generated, User-Consumed

**Problem:** This is open-source. Can't require users to have Anthropic API keys.

**Solution:** Ansvar (maintainer) generates mappings once, commits to repo, users get them for free.

### Generation Process (Maintainer-Only)

**Script:** `scripts/generate-mappings.ts`

**Requires:** `ANTHROPIC_API_KEY` environment variable

**Process:**
1. Read all sections from database
2. For each regulation, call Claude API to map sections → NIST controls
3. Multi-layer validation:
   - **Layer 1:** Self-consistency check (map control back to sections, verify overlap)
   - **Layer 2:** Confidence thresholding (regenerate with chain-of-thought if <60)
   - **Layer 3:** Cross-regulation sanity (verify similar sections map to same controls)
4. Write validated mappings to JSON seed files

**Output Files:**
```
data/seed/mappings/
├── hipaa-nist-800-53.json    # ~50 mappings
├── hipaa-nist-csf.json       # ~40 mappings
├── ccpa-nist-csf.json        # ~35 mappings
├── sox-nist-800-53.json      # ~30 mappings
└── metadata.json             # Generation timestamp, model version
```

**Mapping Format:**
```json
{
  "framework": "NIST_800_53_R5",
  "regulation": "HIPAA",
  "mappings": [
    {
      "section_number": "164.308(a)(1)",
      "control_id": "AC-1",
      "control_name": "Policy and Procedures",
      "coverage": "full",
      "confidence": 95,
      "rationale": "HIPAA requires formal security policies and procedures",
      "generated_by": "claude-sonnet-4-5-20250929",
      "validation_pass": true
    }
  ]
}
```

**Confidence Levels:**
- **≥80:** Strong semantic match (auto-approved)
- **60-79:** Conceptual overlap (flagged for review)
- **<60:** Tangential only (regenerate with CoT or exclude)

**Legal Disclaimer:**
Mappings with confidence <70 include:
```
"disclaimer": "AI-assisted mapping. Verify applicability for your specific context."
```

**Cost:** ~$10 one-time (300 sections × 2 validation passes = 600 API calls / batching = 60 calls)

### For Users

Users run:
```bash
npm install @ansvar/us-regulations-mcp
npm run build:db
```

The `build:db` script automatically loads pre-generated mappings from `data/seed/mappings/*.json` into the database.

**No API key required. Zero runtime cost.**

---

## Update Monitoring

### GitHub Actions Workflow

**File:** `.github/workflows/check-regulation-updates.yml`

**Schedule:** Weekly (Monday 00:00 UTC)

**Jobs:**
1. **Check eCFR last-modified** for Title 45 and Title 17
2. **Scrape LegInfo** for CCPA last-amended date
3. **Compare** with stored timestamps in `data/seed/metadata.json`
4. **Create GitHub issue** if updates detected

**Issue Template:**
```markdown
🔔 **Regulation Update Detected**

One or more source regulations have been updated:
- HIPAA: Updated (2026-01-20)
- CCPA: No changes
- SOX: No changes

**Action Required:**
1. Run `npm run ingest` to fetch latest regulation text
2. Start a Claude Code session
3. Ask Claude to regenerate control mappings
4. Review and commit updated mappings
5. Publish new version to npm

Last check: 2026-01-29
```

**Human-in-the-Loop:**
- Maintainer receives GitHub notification
- Starts conversation with Claude
- Claude regenerates mappings
- Maintainer reviews and commits

**No automation needed** - Claude (in a conversation) does the mapping work.

---

## Quality Verification

### Automated Quality Checks

**Script:** `scripts/verify-quality.ts`

**Checks:**
1. **Section counts** match expected ranges (HIPAA ~100, CCPA ~40, SOX ~25)
2. **FTS5 index populated** (sections_fts row count === sections row count)
3. **No empty text fields** (all sections have text ≥50 chars)
4. **Cross-references parseable** (all JSON fields valid)
5. **Search functionality works** (test query returns results)

**Exit code:** Non-zero if any check fails

**Integration:** Run in CI/CD after ingestion

### Manual Quality Spot Checks

After ingestion, manually verify:
- [ ] Search for "encryption" in HIPAA returns §164.312
- [ ] Search for "consumer rights" in CCPA returns §1798.100-110
- [ ] Search for "internal controls" in SOX returns Section 404
- [ ] Cross-references parse correctly (click through in DB browser)
- [ ] Definitions table populated (check HIPAA §160.103 terms)

---

## Testing Strategy

### Unit Tests

**File:** `src/tools/__tests__/search.test.ts`

**Coverage:**
- Search with query + regulation filter
- Compare requirements across regulations
- Map controls (NIST 800-53, CSF)
- Get section with cross-references
- Check applicability by sector

**Data Requirement:** Tests assume database populated via ingestion

**Run:** `npm test`

### Integration Tests

**Manual Testing:**
1. Install MCP server in Claude Desktop
2. Run test queries (see README examples)
3. Verify responses accurate and well-formatted
4. Test all 9 tools with real data

---

## Error Handling

### Resilience Patterns

**1. Per-Adapter Isolation**
- Each adapter runs in its own transaction
- Failure in one adapter doesn't block others
- Orchestrator logs errors and continues

**2. Exponential Backoff**
```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url);
    if (response.status === 429) {
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 1000, 30000);
      await sleep(delay);
      continue;
    }
    return response;
  }
  throw new RateLimitError();
}
```

**3. Fail-Fast Validation (HTML Scraping)**
- DOM structure assertions before parsing
- Throw `ScrapingError` with specific failure reason
- Prevents silent data corruption

**4. Transaction Rollback**
- Database changes rollback on adapter failure
- Maintains data integrity
- Allows retry without cleanup

---

## Implementation Checklist

### Phase 1: Core Ingestion (Week 1)

- [ ] Implement eCFR adapter for HIPAA
- [ ] Implement eCFR adapter for SOX
- [ ] Implement California LegInfo adapter for CCPA
- [ ] Implement orchestrator script
- [ ] Add quality verification script
- [ ] Test ingestion locally
- [ ] Verify database populated correctly

### Phase 2: Control Mappings (Week 1)

- [ ] Write mapping generation script
- [ ] Generate HIPAA → NIST 800-53 mappings
- [ ] Generate HIPAA → NIST CSF mappings
- [ ] Generate CCPA → NIST CSF mappings
- [ ] Generate SOX → NIST 800-53 mappings
- [ ] Validate mapping quality (spot checks)
- [ ] Commit mappings to repo

### Phase 3: Applicability Rules (Week 1)

- [ ] Define HIPAA applicability (healthcare sector)
- [ ] Define CCPA applicability (California businesses)
- [ ] Define SOX applicability (public companies)
- [ ] Create seed JSON files
- [ ] Load into database

### Phase 4: Update Monitoring (Week 2)

- [ ] Create GitHub Actions workflow
- [ ] Test update detection logic
- [ ] Verify issue creation on updates
- [ ] Document update response process

### Phase 5: Testing (Week 2)

- [ ] Write unit tests for all 9 tools
- [ ] Test with real ingested data
- [ ] Manual testing in Claude Desktop
- [ ] Performance testing (search speed)
- [ ] Edge case testing (malformed queries, etc.)

---

## Success Metrics

### Data Quality

- **Coverage:** ≥300 sections total (HIPAA 100, CCPA 40, SOX 25+)
- **Accuracy:** Spot-check 20 sections, verify text matches official sources
- **Search Quality:** 10 test queries return relevant results (precision ≥80%)
- **Mappings:** ≥150 control mappings with average confidence ≥75

### Performance

- **Ingestion Time:** <5 minutes for all three regulations
- **Search Latency:** <100ms for typical queries
- **Database Size:** <50MB (acceptable for SQLite)

### Reliability

- **Update Detection:** Weekly checks run successfully
- **Error Recovery:** Adapters handle failures gracefully (retry, fallback)
- **Data Integrity:** No orphaned records, valid JSON fields

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| HTML structure change (LegInfo) | High | Medium | Fail-fast validation, GitHub issue on error |
| API rate limits (eCFR, US Code) | Medium | Low | Backoff logic, respectful request rates |
| Incorrect control mappings | High | Medium | Multi-layer validation, confidence thresholds |
| US Code XML unavailable | Medium | Low | Fallback to GovInfo, manual curation |
| Regulation content errors | High | Low | Quality checks, manual spot-verification |

---

## Future Enhancements

### Incremental Updates

Currently: Full re-ingestion weekly

Future: Implement diffing logic
- Hash each section text
- Compare hashes between runs
- Only update changed sections
- Reduces ingestion time from 5min → 30sec

### Additional Regulations

- State privacy laws (VCDPA, CPA, CTDPA, UCPA)
- Federal privacy (GLBA, COPPA, FERPA)
- Agency guidance (CISA, OMB, NIST)

### Enhanced Mappings

- ISO 27001 control mappings
- CIS Controls mappings
- COBIT framework mappings

---

## Conclusion

This ingestion system provides a robust, automated pipeline for keeping US regulation data current. The combination of authoritative API sources (eCFR), resilient scraping (LegInfo), and AI-assisted control mapping delivers a production-ready, open-source compliance tool.

**Next Steps:**
1. Implement adapters (3 classes)
2. Implement orchestrator (1 script)
3. Run ingestion
4. Generate control mappings (with Claude)
5. Test and validate
6. Commit to repo
7. Publish to npm

**Estimated Timeline:** 1-2 weeks to full completion

---

**Document Version:** 1.0
**Last Updated:** 2026-01-29
**Author:** Claude Sonnet 4.5 (via brainstorming skill)
**Status:** Ready for Implementation
