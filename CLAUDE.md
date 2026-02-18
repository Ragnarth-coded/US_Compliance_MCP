# US Regulations MCP - Development Guide

**Part of the Ansvar MCP Suite** → See [central architecture docs](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md) for complete suite documentation

## Project Overview

MCP server providing searchable access to US federal and state compliance laws. Local-first architecture using TypeScript, SQLite + FTS5.

## Key Features

- **15 US Regulations**: HIPAA, CCPA, SOX, GLBA, FERPA, COPPA, FDA 21 CFR Part 11, and 8 more
- **Federal & State Laws**: Complete text with cross-references
- **Breach Notification**: Timeline mapping for all states
- **Full-Text Search**: SQLite FTS5 across all regulations
- **Cross-Regulation Comparison**: Compare requirements across laws

## Tech Stack

- **Language**: TypeScript
- **Database**: SQLite with FTS5 full-text search
- **Package Manager**: npm
- **Distribution**: npm (`npm install @ansvar/us-regulations-mcp`)
- **Data Sources**: GPO, state government sites (official public sources)

## Quick Start

```bash
# Install globally
npm install -g @ansvar/us-regulations-mcp

# Or use with npx
npx @ansvar/us-regulations-mcp

# Claude Desktop config
{
  "mcpServers": {
    "us-regulations": {
      "command": "npx",
      "args": ["-y", "@ansvar/us-regulations-mcp"]
    }
  }
}
```

## Project Structure

```
US_Compliance_MCP/
├── src/
│   ├── index.ts               # MCP server entry point (stdio transport)
│   ├── http-server.ts         # HTTP/SSE transport
│   ├── rest-server.ts         # REST API transport
│   └── tools/
│       ├── registry.ts        # Tool definitions (single source of truth)
│       ├── search.ts          # FTS5 search with BM25
│       ├── section.ts         # Section retrieval
│       ├── list.ts            # Regulation listing/structure
│       ├── compare.ts         # Cross-regulation comparison
│       ├── map.ts             # Control framework mappings
│       ├── applicability.ts   # Sector applicability
│       ├── definitions.ts     # Legal term definitions
│       ├── evidence.ts        # Evidence requirements extraction
│       ├── action-items.ts    # Compliance action items
│       ├── breach-notification.ts  # Breach notification timelines
│       ├── prompts.ts         # MCP Prompts (workflow templates)
│       └── resources.ts       # MCP Resources (static context)
├── data/
│   ├── regulations.db         # Pre-built database
│   └── seed/                  # Source JSON files
│       ├── *.json             # Regulation seed data
│       ├── sources.yml         # Data provenance metadata
│       ├── breach-notification-rules.json
│       ├── mappings/          # Control framework mappings
│       └── applicability/     # Sector applicability rules
├── scripts/                   # Build & ingestion scripts
├── fixtures/
│   ├── golden-tests.json      # Golden contract tests for data accuracy
│   └── golden-hashes.json     # Database drift detection hashes
├── tests/
│   ├── tools.test.ts          # Vitest tool + adversarial tests (48 tests)
│   └── golden.test.ts         # Golden contract tests (19 tests)
└── vitest.config.ts           # Sequential test execution config
```

## Regulations Included

### Healthcare
- **HIPAA** - Health Insurance Portability and Accountability Act
- **HITECH** - Health Information Technology for Economic and Clinical Health Act

### Privacy
- **CCPA** - California Consumer Privacy Act (includes CPRA amendments)
- **VCDPA** - Virginia Consumer Data Protection Act
- **COLORADO_CPA** - Colorado Privacy Act
- **CTDPA** - Connecticut Data Privacy Act
- **UCPA** - Utah Consumer Privacy Act

### Financial
- **SOX** - Sarbanes-Oxley Act
- **GLBA** - Gramm-Leach-Bliley Act (Safeguards Rule, 16 CFR Part 314)
- **NYDFS_500** - NY DFS Cybersecurity Regulation (23 NYCRR 500)
- **FFIEC** - FFIEC IT Examination Handbook

### Education & Children
- **FERPA** - Family Educational Rights and Privacy Act
- **COPPA** - Children's Online Privacy Protection Act

### Industry-Specific
- **FDA_CFR_11** - FDA 21 CFR Part 11 - Electronic Records & Signatures
- **EPA_RMP** - EPA Risk Management Plan Rule (40 CFR Part 68)

## Available Tools

### 1. `search_regulations`
Full-text search across all regulations using FTS5 with BM25 ranking. Supports regulation filtering, pagination (limit/offset), and returns diagnostics on empty results.

### 2. `get_section`
Retrieve a specific section by regulation ID and section number. Throws descriptive errors with available alternatives on not-found.

### 3. `list_regulations`
List all regulations (no params) or get the full structure of a specific regulation (chapters/sections tree).

### 4. `compare_requirements`
Compare requirements across up to 10 regulations on a given topic. Returns per-regulation matches plus a synthesis with coverage summary.

### 5. `map_controls`
Map regulation requirements to control frameworks (NIST 800-53, NIST CSF). Filter by regulation or control ID. Returns diagnostics for unknown frameworks.

### 6. `check_applicability`
Determine which regulations apply to a given industry sector/subsector. Returns diagnostics with available sectors on no match.

### 7. `get_evidence_requirements`
Extract audit evidence requirements from a regulation section. Uses 26 keyword patterns to identify evidence types and marks mandatory vs. recommended items.

### 8. `get_compliance_action_items`
Generate prioritized compliance action items from regulation sections. Extracts priority (high/medium/low) and evidence needs from section text.

### 9. `get_breach_notification_timeline`
Query breach notification deadlines across federal and state jurisdictions. Filter by state or regulation. Returns notification requirements, thresholds, and penalties.

## MCP Prompts

### 1. `compliance_assessment`
Multi-step workflow for assessing which regulations apply to a given sector and generating action items.

### 2. `regulation_comparison`
Guided workflow for comparing requirements across multiple regulations on a specific topic.

### 3. `breach_readiness_check`
Structured workflow for evaluating breach notification readiness across applicable jurisdictions.

## MCP Resources

- `us-regulations://regulations/list` - All loaded regulations with IDs and metadata
- `us-regulations://sectors/list` - Sector taxonomy for applicability checks
- `us-regulations://frameworks/list` - Available control frameworks and their regulation mappings
- `us-regulations://breach-notification/summary` - Breach notification jurisdictions overview

## Development

```bash
# Clone and install
git clone https://github.com/Ansvar-Systems/US_Compliance_MCP
cd US_Compliance_MCP
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm run dev
```

## Data Updates

### Adding New Regulations

```bash
# 1. Create JSON file in data/seed/
# 2. Run ingestion script
npx tsx scripts/ingest-regulation.ts data/seed/new-regulation.json

# 3. Rebuild database
npm run build:db

# 4. Test
npm test

# 5. Publish
npm version patch
npm publish
```

## Database Architecture

Similar to EU Regulations MCP:
- Pre-built database shipped in npm package
- No user-side build required
- SQLite + FTS5 for fast search
- ~10MB database size

## Integration with Other Ansvar MCPs

Works seamlessly with:
- **Security Controls MCP**: Map HIPAA → NIST 800-53
- **EU Regulations MCP**: Compare CCPA ↔ GDPR
- **Sanctions MCP**: Vendor screening for GLBA compliance
- **OT Security MCP**: Healthcare IoT device security (HIPAA + IEC 62443)

See [central architecture docs](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md) for workflow examples.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npx vitest run tests/tools.test.ts
```

## Coding Guidelines

- TypeScript strict mode
- ESLint + Prettier
- Vitest for testing
- Conventional Commits
- All content from official public sources

## Current Statistics

- **Regulations**: 15 US federal & state laws
- **Tools**: 9 MCP tools (+1 `about` tool)
- **Prompts**: 3 MCP workflow prompts
- **Resources**: 4 MCP static resources
- **Tests**: 71 passing (Vitest) — 35 tool + 13 adversarial + 23 golden contract tests
- **Transports**: stdio, HTTP/SSE, REST

## Support

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and use cases
- **Commercial**: hello@ansvar.eu

## License

Apache License 2.0 - See [LICENSE](./LICENSE)

---

**For complete Ansvar MCP suite documentation, see:**
📖 [Central Architecture Documentation](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md)

## Git Workflow

- **Never commit directly to `main`.** Always create a feature branch and open a Pull Request.
- Branch protection requires: verified signatures, PR review, and status checks to pass.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.
