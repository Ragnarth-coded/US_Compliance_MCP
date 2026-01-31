# Changelog

All notable changes to the US Compliance MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2026-01-31

### Added
- CODE_OF_CONDUCT.md based on Contributor Covenant
- CONTRIBUTING.md with development setup and guidelines
- GitHub issue templates (bug report, feature request)
- Pull request template

### Changed
- Updated README contributing section to reference new community docs

## [1.2.2] - 2026-01-31

### Changed
- Updated mcpName for MCP Registry compatibility
- Security fixes for code scanning vulnerabilities

## [1.2.1] - 2026-01-31

### Added
- Automated regulation update monitoring (`check-updates.ts`)
- Comprehensive CI/CD pipeline with GitHub Actions
  - Test workflow with security audit
  - CodeQL semantic analysis
  - Semgrep SAST scanning
  - Trivy vulnerability scanning
  - OpenSSF Scorecard metrics
- CLAUDE.md development guide with [central architecture documentation](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md)

### Fixed
- UpdateStatus interface usage in regulation adapters

### Changed
- Cleaned up repository structure (removed internal development artifacts)
- Enhanced .gitignore for better development workflow

## [1.2.0] - 2026-01-29

### Added
- **4 new state privacy laws - 40% regulation increase (10 → 14 regulations):**
  - Virginia CDPA (Va. Code Ann. §59.1-575 to 59.1-585) - 10 sections
    - Consumer rights framework (access, deletion, correction, portability, opt-out)
    - Data protection assessments for high-risk processing
    - Controller and processor obligations
  - Colorado CPA (C.R.S. §6-1-1301 to 6-1-1313) - 13 sections
    - Universal opt-out mechanism requirements
    - Browser/device-based opt-out signal recognition
    - Comprehensive consumer privacy rights
  - Connecticut CTDPA (Conn. Gen. Stat. §42-515 to 42-524) - 12 sections
    - Detailed data protection assessment requirements
    - Consumer rights with appeal process
    - Heightened risk processing standards
  - Utah UCPA (Utah Code Ann. §13-61-101 to 13-61-404) - 14 sections
    - Business-friendly privacy approach
    - Streamlined consumer rights (no correction right)
    - Ongoing 30-day cure period

### Improved
- **Seed data adapter infrastructure** for state-specific regulations
  - StateSeedAdapter base class for consistent state law ingestion
  - JSON-based configuration for rapid state law addition
  - Structured metadata management (effective dates, jurisdiction, enforcement)

- **Cross-state privacy comparison capabilities**
  - Compare consumer rights across 5 state privacy laws (CA, VA, CO, CT, UT)
  - Analyze opt-out mechanisms (universal vs. individual)
  - Compare enforcement approaches and cure periods

### Changed
- Total coverage increased from 320 to 384 sections (+20%)
- State privacy law representation now covers 5 of top 10 US states by population
- Enhanced test suite with 4 new state privacy adapter tests

### Documentation
- Updated README with state privacy law examples and queries
- Enhanced coverage.md with detailed state law sections
- Added comparison guides for multi-state compliance

### Performance
- Regulation coverage increased 40% (10 → 14 regulations)
- Geographic coverage: Federal + 6 states (CA, NY, VA, CO, CT, UT)
- Section count increased 20% (320 → 384 sections)

## [1.1.0] - 2026-01-29

### Added
- **5 new regulations from financial services and sector-specific domains:**
  - GLBA Safeguards Rule (16 CFR 314) - Financial institution data security
  - FERPA (34 CFR 99) - Student education records privacy
  - COPPA (16 CFR 312) - Children's online privacy protection
  - FDA 21 CFR Part 11 - Electronic records and signatures for pharmaceutical/medical device industries
  - EPA RMP (40 CFR 68) - Chemical facility risk management and accident prevention

### Improved
- **Generalized EcfrAdapter** to support any CFR title/part combination
  - Single adapter class now handles 6 regulations (HIPAA, SOX, GLBA, FERPA, COPPA, FDA, EPA)
  - Factory pattern for easy addition of new eCFR-based regulations

- **Hybrid metadata fetching** for long-term maintainability
  - Primary: Fetch effective dates and amendment history from eCFR API
  - Fallback: Use hardcoded metadata if API unavailable
  - Enables automated detection of regulation updates

### Changed
- Refactored ingestion orchestrator (`scripts/ingest.ts`) to be configuration-driven
  - Adding new regulations now requires only 2 lines of code
  - No orchestrator logic changes needed for new regulations

- Enhanced test suite with v1.1 regulation coverage
  - 5 new integration tests for search quality
  - 7 new unit tests for factory functions
  - Total: 45 tests (up from 33)

### Performance
- Regulation coverage increased 167% (3 → 8 regulations)
- Test coverage increased 36% (33 → 45 tests)

### Documentation
- Updated README with v1.1 regulations and example queries
- Enhanced package.json with sector-specific keywords

## [1.0.0] - 2026-01-XX

### Added
- Initial production release with 3 foundational US regulations:
  - HIPAA (Health Insurance Portability and Accountability Act)
  - CCPA/CPRA (California Consumer Privacy Act)
  - SOX (Sarbanes-Oxley Act)
- 8 MCP tools for querying and analyzing regulations
- FTS5-powered semantic search across all regulations
- Control framework mappings (NIST 800-53, NIST CSF)
- Applicability checking by sector/subsector
- Cross-regulation comparison tools
- 100% test coverage with 33 comprehensive tests

### Technical
- SQLite database with FTS5 full-text search
- Three specialized adapters:
  - EcfrAdapter for federal regulations (eCFR.gov API)
  - CaliforniaLeginfoAdapter for state law (leginfo.legislature.ca.gov)
  - RegulationsGovAdapter for federal rules (regulations.gov)
- Production-ready ingestion pipeline
- MCP SDK v1.25.3 integration
