# Coverage & Roadmap

This document details the current regulation coverage, planned expansions, control framework mappings, and data source information for the US Regulations MCP.

---

## Table of Contents

1. [MVP Regulations](#mvp-regulations)
2. [Planned Future Coverage](#planned-future-coverage)
3. [Control Framework Coverage](#control-framework-coverage)
4. [Update Frequency](#update-frequency)
5. [Data Sources](#data-sources)
6. [Quality Metrics](#quality-metrics)

---

## MVP Regulations

The initial release (v0.1.0) includes three core US regulations with placeholder ingestion adapters. Full automated ingestion is in development.

### HIPAA - Health Insurance Portability and Accountability Act

**Status**: Placeholder adapter (schema ready, automated ingestion in development)

**Citation**: Pub. L. 104-191, 45 CFR Parts 160, 162, 164

**Jurisdiction**: Federal

**Effective Date**: August 21, 1996

**Last Major Amendment**: March 26, 2013 (HITECH Omnibus Rule)

**Expected Coverage**:
- **Part 160**: General Administrative Requirements
  - Subpart A: General Provisions (§160.101-160.104)
  - Subpart B: Preemption of State Law (§160.201-160.205)
  - Subpart C: Compliance and Investigations (§160.300-160.316)
  - Subpart D: Imposition of Civil Money Penalties (§160.400-160.426)

- **Part 162**: Administrative Requirements
  - Subpart A: General Provisions (§162.100-162.103)
  - Subparts B-O: Transaction Standards

- **Part 164**: Security and Privacy
  - Subpart A: General Provisions (§164.102-164.106)
  - Subpart C: Security Rule (§164.302-164.318) - **~50 sections**
  - Subpart D: Breach Notification (§164.400-164.414) - **~15 sections**
  - Subpart E: Privacy Rule (§164.500-164.534) - **~35 sections**

**Total Expected Sections**: ~150-200

**Coverage Areas**:
- Administrative Safeguards (policies, procedures, training)
- Physical Safeguards (facility access, workstation security)
- Technical Safeguards (access controls, encryption, audit controls)
- Privacy rights and restrictions
- Breach notification requirements
- Business associate agreements
- Enforcement and penalties

**Applicability**:
- Healthcare providers (clinics, hospitals, physicians)
- Health plans (insurers, HMOs)
- Healthcare clearinghouses
- Business associates of covered entities

**Data Source**: ecfr.gov API - Electronic Code of Federal Regulations

---

### CCPA/CPRA - California Consumer Privacy Act / Privacy Rights Act

**Status**: Placeholder adapter (schema ready, automated ingestion in development)

**Citation**: California Civil Code §1798.100-1798.199

**Jurisdiction**: California (state)

**Effective Date**:
- CCPA: January 1, 2020
- CPRA amendments: January 1, 2023

**Last Amendment**: January 1, 2023 (CPRA)

**Expected Coverage**:
- **Title 1.81.5**: California Consumer Privacy Act
  - §1798.100-1798.135: Consumer Rights
  - §1798.140: Definitions
  - §1798.145-1798.148: Exemptions and Scope
  - §1798.150-1798.155: Enforcement and Remedies
  - §1798.160-1798.175: Service Providers and Contractors
  - §1798.180-1798.199: CPRA Amendments (Privacy Rights Agency)

**Total Expected Sections**: ~100

**Coverage Areas**:
- Consumer rights (access, deletion, opt-out, correction)
- Business obligations (transparency, disclosures, data minimization)
- Sensitive personal information protections
- Service provider and contractor requirements
- Enforcement and private right of action
- California Privacy Protection Agency regulations

**Applicability**:
- Businesses that:
  - Have gross annual revenues >$25 million, OR
  - Buy, sell, or share PI of 100,000+ CA consumers/households, OR
  - Derive 50%+ revenue from selling/sharing PI
- Applies to personal information of California residents

**Data Source**: California Legislative Information (leginfo.legislature.ca.gov)

---

### SOX - Sarbanes-Oxley Act

**Status**: Placeholder adapter (schema ready, automated ingestion in development)

**Citation**: Pub. L. 107-204, 116 Stat. 745

**Jurisdiction**: Federal

**Effective Date**: July 30, 2002

**Last Amendment**: July 21, 2010 (Dodd-Frank Act amendments)

**Expected Coverage**:
- **Title I**: Public Company Accounting Oversight Board (PCAOB)
- **Title II**: Auditor Independence
- **Title III**: Corporate Responsibility
- **Title IV**: Enhanced Financial Disclosures
  - **Section 404**: Management Assessment of Internal Controls - **PRIMARY FOCUS**
  - Section 409: Real-time disclosures
- **Title VII**: Studies and Reports
- **Title VIII**: Corporate and Criminal Fraud Accountability
  - **Section 802**: Criminal penalties for document destruction
- **Title IX**: White Collar Crime Penalty Enhancements
- **Title XI**: Corporate Fraud Accountability

**Total Expected Sections**: ~50 key sections (IT/compliance focused)

**Coverage Areas** (IT/Security Focus):
- Internal controls over financial reporting (ICFR)
- IT general controls (ITGC)
- Access controls for financial systems
- Change management procedures
- Data retention requirements (7 years for audit workpapers)
- Audit trail and logging requirements
- Separation of duties
- Management certifications

**Applicability**:
- All publicly traded companies in the US
- Foreign companies registered with SEC
- Accounting firms that audit public companies

**Data Source**: SEC.gov + regulations.gov for implementing regulations

---

## Planned Future Coverage

### Phase 2: State Privacy Laws (Q2 2026)

**Virginia CDPA** - Consumer Data Protection Act
- Citation: Va. Code Ann. §59.1-575 to 59.1-585
- Effective: January 1, 2023
- ~30 sections
- Similar structure to CCPA but narrower scope

**Colorado CPA** - Colorado Privacy Act
- Citation: C.R.S. §6-1-1301 to 6-1-1313
- Effective: July 1, 2023
- ~25 sections
- Universal opt-out mechanism requirements

**Connecticut CTDPA** - Connecticut Data Privacy Act
- Citation: Conn. Gen. Stat. §42-515 to 42-524
- Effective: July 1, 2023
- ~20 sections
- Data protection assessment requirements

**Utah UCPA** - Utah Consumer Privacy Act
- Citation: Utah Code Ann. §13-61-101 to 13-61-404
- Effective: December 31, 2023
- ~20 sections
- Business-friendly privacy approach

### Phase 3: Federal Privacy & Security (Q3 2026)

**GLBA** - Gramm-Leach-Bliley Act
- Financial services privacy and security
- 16 CFR Part 314 - Safeguards Rule
- ~40 sections

**COPPA** - Children's Online Privacy Protection Act
- 16 CFR Part 312
- Online services directed to children <13
- ~25 sections

**FERPA** - Family Educational Rights and Privacy Act
- 34 CFR Part 99
- Student education records privacy
- ~70 sections

**FISMA** - Federal Information Security Management Act
- 44 U.S.C. §3551 et seq.
- Federal agency cybersecurity
- ~30 key sections

### Phase 4: Sector-Specific & Agency Guidance (Q4 2026)

**FINRA** - Financial Industry Regulatory Authority
- Cybersecurity and technology governance
- Rule 3110, 4370, 4530
- ~15 key rules

**FDIC/OCC** - Banking Regulators
- Interagency guidance on information security
- 12 CFR Part 30 (OCC), Part 364 (FDIC)
- ~20 sections

**FDA** - Food and Drug Administration
- Software as a Medical Device (SaMD) guidance
- Cybersecurity for medical devices
- ~10 key guidance documents

**CISA** - Cybersecurity and Infrastructure Security Agency
- Binding Operational Directives (BODs)
- Critical infrastructure cybersecurity
- ~25 active directives

**NIST** - National Institute of Standards and Technology
- Special Publications (800-series)
- Cybersecurity guidance documents
- ~50 key publications

---

## Control Framework Coverage

### NIST 800-53 Rev 5 - Security and Privacy Controls

**Coverage**: Primary framework for HIPAA and SOX mappings

**Total Controls**: 1,084 controls across 20 families

**MVP Mapping Status**: Placeholder mappings (automated mapping in development)

**Expected Mappings**:
- **HIPAA to 800-53**: ~150 mappings
  - Full coverage: Administrative, Physical, Technical Safeguards
  - Control families: AC, AU, AT, CP, IA, IR, MA, MP, PE, RA, SC, SI

- **SOX to 800-53**: ~60 mappings
  - IT General Controls (ITGC)
  - Control families: AC, AU, CM, IA, SA, SC, SI

- **CCPA to 800-53**: ~40 mappings
  - Privacy controls and transparency
  - Control families: PT (PII Processing), AC, SC, IR

**Control Families Included**:
- AC: Access Control
- AT: Awareness and Training
- AU: Audit and Accountability
- CA: Assessment, Authorization, and Monitoring
- CM: Configuration Management
- CP: Contingency Planning
- IA: Identification and Authentication
- IR: Incident Response
- MA: Maintenance
- MP: Media Protection
- PE: Physical and Environmental Protection
- PL: Planning
- PM: Program Management
- PS: Personnel Security
- PT: PII Processing and Transparency
- RA: Risk Assessment
- SA: System and Services Acquisition
- SC: System and Communications Protection
- SI: System and Information Integrity

### NIST CSF 2.0 - Cybersecurity Framework

**Coverage**: Cross-regulation framework mapping

**Functions**: 6 (Govern, Identify, Protect, Detect, Respond, Recover)

**Categories**: 23

**MVP Mapping Status**: Placeholder mappings (automated mapping in development)

**Expected Mappings**:
- **All regulations to CSF**: ~120 mappings total
  - HIPAA: ~60 mappings
  - SOX: ~40 mappings
  - CCPA: ~20 mappings

**Function Coverage**:
1. **Govern (GV)**: Organizational cybersecurity oversight
   - SOX (corporate governance, audit committees)

2. **Identify (ID)**: Asset and risk management
   - HIPAA (risk analysis, asset inventory)
   - SOX (ITGC, financial system identification)

3. **Protect (PR)**: Safeguards implementation
   - HIPAA (administrative, physical, technical safeguards)
   - CCPA (data minimization, purpose limitation)
   - SOX (access controls, change management)

4. **Detect (DE)**: Monitoring and detection
   - HIPAA (audit controls, log monitoring)
   - SOX (detective controls, anomaly detection)

5. **Respond (RS)**: Incident response
   - HIPAA (breach notification)
   - CCPA (breach notification, consumer rights)
   - SOX (fraud detection response)

6. **Recover (RC)**: Recovery and resilience
   - HIPAA (contingency planning, disaster recovery)

### ISO 27001 (Planned - Phase 5)

**Status**: Future enhancement

**Coverage**: International information security management standard

**Expected Mappings**:
- Map ISO 27001 Annex A controls to HIPAA, SOX
- Provide ISO → NIST 800-53 → US Regulation cross-walk

---

## Update Frequency

### MVP (Manual Updates)

**Current Status**: Database initialized with schema, placeholder adapters

**Update Process**:
1. Manual ingestion script execution
2. Human review of changes
3. Version bump and release

**Frequency**: As needed for major regulatory changes

### Post-MVP (Automated Updates)

**Planned Timeline**: Q2 2026

**Automated Processes**:

1. **Daily Freshness Checks**
   - GitHub Actions cron job (6 AM UTC daily)
   - Check all data sources for updates
   - Create GitHub issue if changes detected

2. **Source-Specific Update Detection**:

   **ecfr.gov (HIPAA)**:
   - Check CFR revision dates daily
   - eCFR updates from Federal Register
   - Typical update frequency: Daily technical updates, annual major revisions

   **California LegInfo (CCPA)**:
   - Query bill history for Civil Code §1798 amendments
   - Track legislative session updates
   - Typical update frequency: Annually (legislative sessions)

   **regulations.gov (SOX/Federal)**:
   - Query by regulation ID with `lastModifiedDate` filter
   - Track SEC rule amendments
   - Typical update frequency: Rarely (SOX stable, occasional SEC rule updates)

3. **Update Workflow**:
   ```
   Daily Check → Changes Detected → GitHub Issue → Human Review → Approve → Auto-Ingest → Test → Release
   ```

4. **Version Management**:
   - Patch version: Minor text corrections, clarifications
   - Minor version: New sections, significant amendments
   - Major version: New regulations added, breaking schema changes

### Expected Update Cadence (Post-MVP)

| Regulation | Typical Update Frequency | Detection Method |
|------------|-------------------------|------------------|
| HIPAA | 1-2 times/year (guidance updates) | eCFR API revision dates |
| CCPA | Annually (legislative amendments) | CA LegInfo bill tracking |
| SOX | Rarely (law stable since 2010) | regulations.gov API |
| State Privacy | Annually (legislative sessions) | State legislature APIs |
| NIST Guidance | Quarterly (SP publications) | NIST CSRC RSS feeds |

---

## Data Sources

### Primary Official Sources

| Regulation | Source | API/Format | Documentation | Rate Limits |
|------------|--------|------------|---------------|-------------|
| HIPAA | ecfr.gov | XML/JSON REST API | [eCFR API v1](https://www.ecfr.gov/developers/documentation/api/v1) | No API key required, 1000 req/hour |
| CCPA | leginfo.legislature.ca.gov | HTML + Structured API | [CA LegInfo](https://leginfo.legislature.ca.gov/) | No API key, reasonable use |
| SOX | SEC.gov + regulations.gov | HTML/JSON API | [SEC API](https://www.sec.gov/edgar/sec-api-documentation), [Regulations.gov API](https://open.gsa.gov/api/regulationsgov/) | regulations.gov requires free API key |

### API Key Requirements

**Required**:
- regulations.gov - Free API key from [api.data.gov](https://api.data.gov/signup/)

**Not Required**:
- ecfr.gov - Open API
- California LegInfo - Open access

### Data Quality Assurance

**Ingestion Validation**:
1. **Section Count Verification**: Compare parsed sections to expected count
2. **Cross-Reference Validation**: Verify all internal references resolve
3. **Completeness Scoring**:
   - Complete: All expected sections parsed, <5% missing cross-refs
   - Review: 90-99% sections parsed
   - Incomplete: <90% sections parsed

**Quality Metrics** (Planned):
```sql
SELECT
  regulation,
  sections_expected,
  sections_parsed,
  (sections_parsed * 100.0 / sections_expected) as completeness_pct,
  quality_status
FROM source_registry;
```

Expected output (post-MVP):
```
HIPAA  | 180 | 178 | 98.9% | review
CCPA   |  98 |  98 | 100%  | complete
SOX    |  52 |  48 | 92.3% | review
```

**Manual Review Triggers**:
- Completeness <95%
- New sections added (potential breaking changes)
- Sections removed (deprecated provisions)
- Major text changes (>50% diff)

### Data Freshness

**MVP Status**: Static snapshot at release time

**Post-MVP**: Database includes last_fetched timestamps

```sql
SELECT
  regulation,
  last_fetched,
  datetime('now') - last_fetched as days_since_update
FROM source_registry;
```

Target freshness: <7 days for all regulations

---

## Quality Metrics

### Current MVP Metrics (v0.1.0)

| Metric | Target | Current Status |
|--------|--------|----------------|
| Database Schema | Complete | Complete |
| MCP Tools | 9 tools | 9 implemented |
| Regulations | 3 (HIPAA, CCPA, SOX) | Schema ready, placeholder adapters |
| Sections | 300+ | 0 (placeholder adapters) |
| Control Mappings | 100+ | 0 (schema ready) |
| Definitions | 50+ | 0 (schema ready) |
| Applicability Rules | 20+ | 0 (schema ready) |
| FTS5 Index | Configured | Ready for data |
| Documentation | Complete | README, tools.md, coverage.md |

### Post-MVP Quality Targets (v0.2.0+)

| Metric | Target | Implementation |
|--------|--------|----------------|
| Section Coverage | >95% for all regs | Automated ingestion with validation |
| Control Mappings | 150+ NIST 800-53 | Manual expert review + automated extraction |
| Applicability Rules | 30+ sector/subsector | Industry analysis + legal review |
| Update Latency | <7 days from source | Daily automated checks |
| Search Precision | >90% relevant results | FTS5 tuning + snippet optimization |
| Documentation Accuracy | 100% | Sync with code changes |

### Testing & Validation (Planned)

**Automated Tests**:
- Unit tests for each tool (vitest)
- Integration tests for database queries
- E2E tests for full MCP protocol flow

**Quality Assurance**:
- Sample query test suite (30+ realistic queries)
- Expert review of control mappings
- Legal review of applicability rules
- User acceptance testing with compliance professionals

---

## Roadmap Summary

### Q1 2026 (Current - v0.1.0)
- MVP release with 3 regulations (placeholder adapters)
- 9 MCP tools fully functional
- Database schema and infrastructure complete
- Comprehensive documentation

### Q2 2026 (v0.2.0)
- Automated ingestion from ecfr.gov, California LegInfo, regulations.gov
- Full HIPAA, CCPA, SOX section coverage (300+ sections)
- NIST 800-53 control mappings (150+ mappings)
- Daily update check automation
- State privacy law expansion (4 states)

### Q3 2026 (v0.3.0)
- NIST CSF 2.0 mappings (120+ mappings)
- Federal privacy laws (GLBA, COPPA, FERPA, FISMA)
- Enhanced applicability rules (30+ sectors)
- Evidence requirements database (audit artifacts)

### Q4 2026 (v0.4.0)
- Sector-specific regulations (FINRA, FDIC/OCC, FDA, CISA)
- ISO 27001 framework mappings
- Cross-walk tool (framework ↔ framework ↔ regulation)
- Compliance gap analysis tool

### 2027+ (v1.0.0+)
- State law harmonization analysis
- Automated compliance scoring
- Audit readiness checklists
- Integration with GRC platforms
- Multi-language support (Spanish, French)

---

## Contributing to Coverage

### How to Request New Regulations

1. Open a [GitHub issue](https://github.com/ansvar-systems/us-regulations-mcp/issues)
2. Use the "New Regulation Request" template
3. Provide:
   - Regulation name and citation
   - Official data source URL
   - Use case / why it's needed
   - Estimated section count
   - Your industry/sector

### Priority Criteria

Regulations prioritized by:
1. **Applicability breadth**: How many organizations are subject to it?
2. **Data availability**: Is there a structured API or machine-readable source?
3. **User demand**: How many requests have we received?
4. **Complementarity**: Does it fill a gap in existing coverage?
5. **Implementation complexity**: How difficult is the ingestion adapter?

### Community Contributions

We welcome:
- New regulation adapters (see `src/ingest/adapters/`)
- Control framework mappings (expert review appreciated)
- Applicability rules for specific sectors
- Improved search queries and test cases
- Documentation improvements

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## Contact

For coverage questions, expansion requests, or data quality issues:

- GitHub Issues: https://github.com/ansvar-systems/us-regulations-mcp/issues
- Email: hello@ansvar.eu
- Documentation: https://github.com/ansvar-systems/us-regulations-mcp/tree/main/docs

---

**Last Updated**: 2026-01-29

**Document Version**: 1.0.0 (MVP Release)
