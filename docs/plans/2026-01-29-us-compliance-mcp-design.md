# US Compliance MCP - Design Document

**Date**: 2026-01-29
**Status**: Approved
**Based on**: EU Compliance MCP architecture

---

## Overview

A Model Context Protocol (MCP) server for US cybersecurity and privacy regulations, enabling AI-powered querying of HIPAA, CCPA, SOX, and other US compliance requirements directly from Claude.

**Core Value Proposition**: Automated ingestion and daily updates from official US regulatory sources (regulations.gov, ecfr.gov, state legislature APIs), making US compliance as accessible as the EU MCP makes European regulations.

---

## Architecture

### High-Level Structure

```
US_Compliance_MCP/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── http-server.ts              # HTTP server (optional)
│   ├── tools/                      # MCP tool implementations
│   │   ├── registry.ts             # Central tool registry
│   │   ├── search.ts               # Full-text search
│   │   ├── article.ts              # Get specific sections
│   │   ├── compare.ts              # Compare across regulations
│   │   ├── map.ts                  # Control framework mappings
│   │   ├── applicability.ts        # Sector applicability
│   │   ├── definitions.ts          # Term definitions
│   │   ├── evidence.ts             # Compliance evidence
│   │   └── action-items.ts         # NEW: Compliance action items
│   └── ingest/                     # Ingestion framework
│       ├── framework.ts            # Base ingestion interfaces
│       ├── adapters/               # Source-specific adapters
│       │   ├── regulations-gov.ts  # Federal regulations API
│       │   ├── ecfr.ts             # eCFR API (HIPAA)
│       │   ├── california-leginfo.ts # CA legislature (CCPA)
│       │   └── sec-edgar.ts        # SEC regulations (SOX)
│       └── orchestrator.ts         # Parallel ingestion coordinator
├── scripts/
│   ├── build-db.ts                 # Initialize database schema
│   ├── ingest-parallel.ts          # Parallel sub-agent ingestion
│   ├── check-updates.ts            # Daily freshness checks
│   └── sync-versions.ts            # Version management
├── data/
│   ├── regulations.db              # SQLite database
│   └── seed/                       # Initial seed data (fallback)
└── package.json
```

### Key Differences from EU MCP

1. **Ingestion Framework**: New `ingest/` module with adapter pattern for multiple US sources
2. **Parallel Processing**: Sub-agent orchestration for simultaneous regulation ingestion
3. **Control Mappings**: NIST-focused (800-53, CSF) vs. EU's ISO 27001
4. **New Tool**: `get_compliance_action_items` for structured action item generation

---

## Database Schema

Mirrors EU MCP structure with US-specific adaptations:

```sql
-- Core tables
CREATE TABLE regulations (
  id TEXT PRIMARY KEY,              -- 'HIPAA', 'CCPA', 'SOX'
  full_name TEXT NOT NULL,          -- 'Health Insurance Portability and Accountability Act'
  citation TEXT NOT NULL,           -- 'Pub. L. 104-191' or 'Cal. Civ. Code § 1798.100'
  effective_date TEXT,
  last_amended TEXT,
  source_url TEXT,                  -- API endpoint or official source
  jurisdiction TEXT,                -- 'federal', 'california', 'virginia'
  regulation_type TEXT              -- 'statute', 'rule', 'guidance'
);

CREATE TABLE sections (
  rowid INTEGER PRIMARY KEY,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  section_number TEXT NOT NULL,     -- '164.308(a)(1)(ii)(A)' for HIPAA
  title TEXT,
  text TEXT NOT NULL,
  chapter TEXT,
  parent_section TEXT,              -- For nested sections
  cross_references TEXT,            -- JSON array of references
  UNIQUE(regulation, section_number)
);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE sections_fts USING fts5(
  regulation,
  section_number,
  title,
  text,
  content='sections',
  content_rowid='rowid'
);

-- Definitions
CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  section TEXT NOT NULL,
  UNIQUE(regulation, term)
);

-- Control mappings (NIST-focused)
CREATE TABLE control_mappings (
  id INTEGER PRIMARY KEY,
  framework TEXT NOT NULL,          -- 'NIST_800_53', 'NIST_CSF'
  control_id TEXT NOT NULL,         -- 'AC-1', 'PR.AC-1'
  control_name TEXT NOT NULL,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  sections TEXT NOT NULL,           -- JSON array of section numbers
  coverage TEXT CHECK(coverage IN ('full', 'partial', 'related')),
  notes TEXT
);

-- Applicability rules
CREATE TABLE applicability_rules (
  id INTEGER PRIMARY KEY,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  sector TEXT NOT NULL,             -- 'healthcare', 'financial', etc.
  subsector TEXT,
  applies INTEGER NOT NULL,
  confidence TEXT CHECK(confidence IN ('definite', 'likely', 'possible')),
  basis_section TEXT,
  notes TEXT
);

-- Source tracking (for update checks)
CREATE TABLE source_registry (
  regulation TEXT PRIMARY KEY REFERENCES regulations(id),
  source_type TEXT NOT NULL,        -- 'api', 'html', 'pdf'
  source_url TEXT NOT NULL,
  api_endpoint TEXT,                -- If API-based
  last_fetched TEXT,
  sections_expected INTEGER,
  sections_parsed INTEGER,
  quality_status TEXT CHECK(quality_status IN ('complete', 'review', 'incomplete')),
  notes TEXT
);
```

**Key Schema Decisions**:
- `sections` instead of `articles` (US regulatory terminology)
- `jurisdiction` field to distinguish federal vs. state regulations
- `parent_section` for nested regulatory structures (e.g., HIPAA's multi-level sections)
- `source_registry` tracks API endpoints for automated updates

---

## Ingestion Framework

### Adapter Pattern

```typescript
// src/ingest/framework.ts
export interface RegulationSource {
  id: string;                    // 'HIPAA', 'CCPA', 'SOX'
  name: string;
  sourceType: 'api' | 'html' | 'pdf';
  adapter: SourceAdapter;
}

export interface SourceAdapter {
  // Fetch regulation metadata
  fetchMetadata(): Promise<RegulationMetadata>;

  // Fetch all sections with pagination support
  fetchSections(): AsyncGenerator<Section[]>;

  // Check if source has updates since last fetch
  checkForUpdates(lastFetched: Date): Promise<UpdateStatus>;

  // Extract definitions from regulation text
  extractDefinitions(): Promise<Definition[]>;
}

export interface Section {
  sectionNumber: string;
  title?: string;
  text: string;
  chapter?: string;
  parentSection?: string;
  crossReferences?: string[];
}
```

### MVP Source Adapters

1. **regulations.gov API** - Federal regulations (SOX-related rules, SEC regulations)
2. **ecfr.gov API** - Electronic Code of Federal Regulations (HIPAA: 45 CFR Part 160/164)
3. **California LegInfo API** - State legislature (CCPA/CPRA: Cal. Civ. Code § 1798.100+)

Each adapter:
- Handles source-specific API pagination and authentication
- Normalizes to common `Section` interface
- Extracts cross-references and definitions automatically
- Validates completeness (expected vs. parsed section counts)

### Parallel Ingestion Orchestrator

```typescript
// src/ingest/orchestrator.ts
export class IngestionOrchestrator {
  async ingestParallel(sources: RegulationSource[]): Promise<void> {
    // Spawn sub-agents for each regulation
    // Each agent: fetch → parse → validate → insert
    // Reports progress back to main process
    // Ensures atomic updates (all or nothing)
  }
}
```

**Execution Flow**:
1. Main script spawns 3 parallel sub-agents (HIPAA, CCPA, SOX)
2. Each agent runs independently, writes to separate temp DBs
3. Main process validates all results
4. Merges temp DBs into `regulations.db` atomically
5. Updates `source_registry` with fetch timestamps

---

## MCP Tools (API Surface)

### 9 Tools

1. **search_regulations**
   - Search across all US regulations
   - Returns section snippets (32 tokens each, FTS5-powered)
   - Example: "incident reporting healthcare"

2. **get_section**
   - Retrieve full text of specific section
   - Input: `{ regulation: 'HIPAA', section: '164.308(a)(1)(ii)(A)' }`
   - Includes cross-references and related definitions

3. **list_regulations**
   - List available regulations
   - Optional: get hierarchical structure of specific regulation
   - Shows chapters/parts/subparts

4. **compare_requirements**
   - Compare topic across multiple regulations
   - Example: "breach notification" across HIPAA + CCPA
   - Returns matching sections from each with relevance scoring

5. **map_controls**
   - Map NIST 800-53 or NIST CSF controls to regulations
   - Input: `{ framework: 'NIST_800_53', control: 'AC-1' }`
   - Returns which HIPAA/SOX sections satisfy the control

6. **check_applicability**
   - Determine which regulations apply to an organization
   - Input: `{ sector: 'healthcare', subsector: 'hospital', state: 'CA' }`
   - Returns: HIPAA (definite), CCPA (definite if CA), SOX (if public company)

7. **get_definitions**
   - Look up official term definitions
   - Example: "protected health information" → HIPAA 45 CFR 160.103 definition
   - Shows term across all regulations where defined

8. **get_evidence_requirements**
   - What audit artifacts are needed for compliance?
   - Input: `{ regulation: 'HIPAA', section: '164.312(b)' }`
   - Returns: audit logs, encryption documentation, policies, procedures

9. **get_compliance_action_items** *(NEW)*
   - Generate structured, actionable compliance items
   - Input: `{ regulation: 'HIPAA', sections: ['164.308(a)(1)(ii)(A)'] }`
   - Output JSON format:
     ```json
     {
       "action_items": [{
         "section": "§164.308(a)(1)(ii)(A)",
         "title": "Risk Analysis Required",
         "required_state": "Conduct accurate and thorough assessment of potential risks per §164.308(a)(1)(ii)(A)",
         "priority": "high",
         "evidence_needed": ["risk assessment report", "risk register", "threat modeling docs"]
       }]
     }
     ```

### Tool Implementation Notes

- All tools use the same registry pattern as EU MCP (`src/tools/registry.ts`)
- FTS5 full-text search with BM25 ranking
- Token usage warnings for large sections (like EU MCP)
- Standardized error handling and validation

---

## Daily Update Checks

### Automated Freshness Monitoring

Mirrors EU MCP's EUR-Lex daily checks:

```typescript
// scripts/check-updates.ts

interface UpdateChecker {
  async checkSource(regulation: RegulationSource): Promise<UpdateResult> {
    const lastFetched = await getLastFetchDate(regulation.id);
    const status = await regulation.adapter.checkForUpdates(lastFetched);

    return {
      regulation: regulation.id,
      hasUpdates: status.hasChanges,
      lastChecked: new Date(),
      changes: status.changes, // New sections, amendments, corrections
    };
  }
}
```

### Per-Source Update Detection

1. **regulations.gov API**
   - Query by regulation ID + `lastModifiedDate` filter
   - Compare document versions and checksums
   - Detects: new rules, amendments, corrections

2. **ecfr.gov API**
   - Check title/part revision dates (e.g., 45 CFR 164)
   - Compare section counts and hashes
   - eCFR updates daily from Federal Register

3. **California LegInfo**
   - Query bill history for amendments to Civil Code § 1798
   - Track legislative session updates
   - CCPA/CPRA amendments typically annual

### GitHub Actions Workflow

```yaml
# .github/workflows/check-updates.yml
name: Daily US Regulations Check
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run check-updates
      - name: Create issue if updates found
        if: env.UPDATES_FOUND == 'true'
        uses: actions/github-script@v6
        # ... create GitHub issue with update details
```

**Update Workflow**:
1. Daily cron checks all sources in parallel
2. If changes detected → creates GitHub issue with details
3. Manual review + approval
4. Run `npm run auto-update` to re-ingest changed regulations
5. Bump package version, publish to npm

---

## MVP Regulations

### Phase 1 (Initial Release)

1. **HIPAA** (Health Insurance Portability and Accountability Act)
   - **Source**: ecfr.gov API - 45 CFR Parts 160, 162, 164
   - **Coverage**: Privacy Rule, Security Rule, Breach Notification
   - **Sections**: ~150-200 sections
   - **Control Mappings**: NIST 800-53 (healthcare-focused controls)

2. **CCPA/CPRA** (California Consumer Privacy Act / Privacy Rights Act)
   - **Source**: California LegInfo API - Cal. Civ. Code § 1798.100-1798.199
   - **Coverage**: Consumer rights, business obligations, enforcement
   - **Sections**: ~100 sections
   - **Control Mappings**: NIST Privacy Framework

3. **SOX** (Sarbanes-Oxley Act)
   - **Source**: SEC.gov (Section 404) + regulations.gov (related rules)
   - **Coverage**: IT controls, audit requirements, data retention
   - **Sections**: ~50 key sections
   - **Control Mappings**: NIST 800-53, NIST CSF (financial controls)

### Phase 2+ (Future Expansion)

- **State Privacy Laws**: VCDPA (VA), CPA (CO), CTDPA (CT), UCPA (UT)
- **Federal Privacy**: GLBA, COPPA, FERPA
- **Federal Cyber**: CISA directives, OMB memos, FISMA
- **Sector-Specific**: FINRA, FDIC, OCC cyber guidance, FDA software guidance

---

## Control Framework Mappings

### NIST 800-53 (Security and Privacy Controls)

**Coverage**: Federal government standard, widely adopted in healthcare and finance

- **HIPAA Mappings**: All Security Rule requirements (164.308-164.312)
- **SOX Mappings**: IT controls for financial reporting (Section 404)
- **CCPA Mappings**: Privacy controls (SC-*, AC-*, AU-*)

**Example Mapping**:
```json
{
  "framework": "NIST_800_53",
  "control_id": "AC-1",
  "control_name": "Policy and Procedures",
  "regulation": "HIPAA",
  "sections": ["164.308(a)(1)", "164.316(a)", "164.316(b)(1)"],
  "coverage": "full",
  "notes": "HIPAA Administrative Safeguards directly satisfy AC-1"
}
```

### NIST CSF 2.0 (Cybersecurity Framework)

**Coverage**: Industry-standard risk management framework

- **All Regulations**: Map to CSF categories (Identify, Protect, Detect, Respond, Recover)
- **Cross-Regulation**: Show how HIPAA + SOX together satisfy CSF

**Example Mapping**:
```json
{
  "framework": "NIST_CSF",
  "control_id": "PR.AC-1",
  "control_name": "Identities and credentials are issued, managed, verified, revoked",
  "regulation": "HIPAA",
  "sections": ["164.308(a)(3)", "164.308(a)(4)", "164.312(a)(2)(i)"],
  "coverage": "partial",
  "notes": "HIPAA covers access management but not full credential lifecycle"
}
```

---

## Parallel Implementation Plan

### Sub-Agent Orchestration

**Agent 1: Database & Core Infrastructure**
- Create project structure
- Set up `package.json` (copy from EU MCP, adapt)
- Build database schema (`scripts/build-db.ts`)
- Implement base MCP server (`src/index.ts`)
- Set up TypeScript config & build scripts

**Agent 2: Ingestion Framework**
- Build adapter interfaces (`src/ingest/framework.ts`)
- Implement regulations.gov adapter
- Implement ecfr.gov adapter (HIPAA)
- Implement California LegInfo adapter (CCPA)
- Build parallel orchestrator (`src/ingest/orchestrator.ts`)
- Create `scripts/ingest-parallel.ts`

**Agent 3: MCP Tools Implementation**
- Implement `search_regulations` (FTS5)
- Implement `get_section`
- Implement `compare_requirements`
- Implement `map_controls` (NIST 800-53, CSF)
- Implement `check_applicability`
- Implement `get_compliance_action_items` (NEW)

**Agent 4: Control Mappings & Seed Data**
- Map NIST 800-53 controls to HIPAA sections
- Map NIST CSF to CCPA requirements
- Map NIST 800-53 to SOX requirements (Section 404)
- Create applicability rules (sector mappings)
- Build initial seed data (fallback if APIs unavailable)

**Agent 5: Testing & Documentation**
- Create test queries (like EU MCP's `TEST_QUERIES.md`)
- Write `README.md`
- Document tool API surface (`docs/tools.md`)
- Set up GitHub Actions (daily update checks)
- Create usage examples and quickstart guide

### Timeline

- **Parallel Phase**: Agents 1-3 run simultaneously (core functionality)
- **Sequential Dependencies**: Agent 4 waits for Agent 2 (needs ingestion), Agent 5 waits for Agents 1-3 (needs working tools)
- **Total Estimate**: 3-4 parallel sessions vs. 8-10 sequential sessions

### Coordination Points

- All agents share database schema (defined by Agent 1)
- Agents 2-3 coordinate on data format contracts (`Section` interface)
- Agent 4 waits for ingestion to complete before running mappings
- Agent 5 validates end-to-end functionality

---

## Deployment & Configuration

### Package Setup

```json
{
  "name": "@ansvar/us-regulations-mcp",
  "version": "0.1.0",
  "mcpName": "us.ansvar/us-regulations-mcp",
  "description": "MCP server for US cybersecurity & privacy regulations. Query HIPAA, CCPA, SOX, and more directly from Claude.",
  "main": "dist/index.js",
  "bin": {
    "us-regulations-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "ingest": "tsx scripts/ingest-parallel.ts",
    "check-updates": "tsx scripts/check-updates.ts",
    "build:db": "tsx scripts/build-db.ts"
  },
  "keywords": [
    "mcp", "compliance", "hipaa", "ccpa", "sox",
    "nist", "privacy", "cybersecurity", "us-regulations"
  ],
  "license": "Apache-2.0"
}
```

### User Installation

```bash
# Install
npm install @ansvar/us-regulations-mcp

# Claude Desktop configuration
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json

{
  "mcpServers": {
    "us-regulations": {
      "command": "npx",
      "args": ["-y", "@ansvar/us-regulations-mcp"]
    }
  }
}
```

### Example Queries

**Healthcare**:
- "What are the HIPAA security rule requirements for access controls?"
- "Does my telemedicine app need to comply with HIPAA?"
- "What audit logs does HIPAA require for ePHI access?"

**Privacy**:
- "Compare breach notification timelines between HIPAA and CCPA"
- "What consumer rights does CCPA provide for data deletion?"
- "Do I need to comply with CCPA if I have 10,000 California customers?"

**Financial**:
- "What IT controls does SOX Section 404 require?"
- "Which NIST 800-53 controls satisfy SOX audit requirements?"
- "How long must I retain financial records under SOX?"

**Cross-Regulation**:
- "Compare incident response requirements across HIPAA, CCPA, and SOX"
- "Which regulations apply to a fintech company in California?"
- "Map NIST CSF to our HIPAA and SOX obligations"

### Environment Variables

```bash
# Optional: custom database path
US_COMPLIANCE_DB_PATH=/path/to/regulations.db

# API keys for ingestion
REGULATIONS_GOV_API_KEY=xxx  # Required for regulations.gov API
```

---

## Success Criteria

### Functional Requirements

✅ Automated ingestion from 3 API sources (regulations.gov, ecfr.gov, California LegInfo)
✅ Daily update checks with GitHub Actions automation
✅ Full-text search across HIPAA, CCPA, SOX
✅ 9 MCP tools with same UX as EU MCP
✅ NIST 800-53 and NIST CSF control mappings
✅ Structured action item generation (`get_compliance_action_items`)

### Quality Requirements

✅ Database completeness: 300+ sections across 3 regulations
✅ Control mappings: 100+ mappings (NIST 800-53 + CSF)
✅ Applicability rules: 20+ sector/subsector combinations
✅ Test coverage: 30+ test queries in `TEST_QUERIES.md`
✅ Documentation: README, tools.md, coverage.md, use-cases.md

### Performance Requirements

✅ Search queries: <100ms (FTS5 index)
✅ Section retrieval: <50ms
✅ Update checks: <5 minutes for all sources
✅ Parallel ingestion: 3 regulations in <10 minutes total

---

## Future Enhancements

### Short-Term (Phase 2)

- **State Privacy Expansion**: Add VCDPA, CPA, CTDPA, UCPA
- **Federal Privacy**: GLBA, COPPA, FERPA
- **Recitals/Preambles**: Add regulatory preambles (like EU recitals) for context

### Medium-Term (Phase 3)

- **Agency Guidance**: CISA directives, OMB memos, NIST guidance
- **Sector-Specific**: FINRA, FDIC, OCC, FDA software regulations
- **Cross-Walk Tool**: Map between different frameworks (800-53 ↔ CSF ↔ ISO 27001)

### Long-Term (Phase 4)

- **State Law Harmonization**: Identify common requirements across state privacy laws
- **Compliance Gap Analysis**: Compare organization's current state vs. requirements
- **Audit Readiness**: Generate audit prep checklists and evidence matrices

---

## Notes

- **License**: Apache 2.0 (same as EU MCP)
- **Author**: Ansvar Systems <hello@ansvar.eu>
- **Repository**: TBD (GitHub)
- **Legal Disclaimer**: This tool provides regulatory text from official sources but is NOT legal advice. Control mappings and applicability rules are interpretive aids. Always consult qualified legal counsel for compliance decisions.

---

## Appendix: Data Sources

### Primary Sources

| Regulation | Source | API/Format | Update Frequency |
|------------|--------|------------|------------------|
| HIPAA | ecfr.gov | XML/JSON API | Daily (from Federal Register) |
| CCPA/CPRA | leginfo.legislature.ca.gov | HTML/API | Real-time (legislative sessions) |
| SOX | SEC.gov + regulations.gov | HTML/API | As amended (rare) |

### API Documentation

- **eCFR API**: https://www.ecfr.gov/developers/documentation/api/v1
- **regulations.gov API**: https://open.gsa.gov/api/regulationsgov/
- **California LegInfo**: https://leginfo.legislature.ca.gov/faces/codes.xhtml
- **SEC.gov**: https://www.sec.gov/edgar/sec-api-documentation

### API Keys

- **regulations.gov**: Requires free API key (https://open.gsa.gov/api/regulationsgov/)
- **eCFR**: No API key required
- **California LegInfo**: No API key required
