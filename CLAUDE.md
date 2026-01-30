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
│   ├── index.ts               # MCP server entry point
│   ├── database/              # SQLite database layer
│   ├── tools/                 # MCP tool implementations
│   └── data/
│       └── regulations.db     # Pre-built database (~10MB)
├── data/seed/                 # Source JSON files
│   ├── hipaa.json
│   ├── ccpa.json
│   └── ... (13 more)
├── scripts/                   # Ingestion scripts
└── tests/                     # Test suite
```

## Regulations Included

### Healthcare
- **HIPAA** - Health Insurance Portability and Accountability Act
- **HITECH** - Health Information Technology for Economic and Clinical Health Act

### Privacy
- **CCPA** - California Consumer Privacy Act
- **CPRA** - California Privacy Rights Act
- **VCDPA** - Virginia Consumer Data Protection Act
- **CPA** - Colorado Privacy Act
- **CTDPA** - Connecticut Data Privacy Act
- **UCPA** - Utah Consumer Privacy Act

### Financial
- **SOX** - Sarbanes-Oxley Act
- **GLBA** - Gramm-Leach-Bliley Act

### Education & Children
- **FERPA** - Family Educational Rights and Privacy Act
- **COPPA** - Children's Online Privacy Protection Act

### Industry-Specific
- **FDA 21 CFR Part 11** - Electronic Records & Signatures
- **FTC Act Section 5** - Unfair or Deceptive Practices

## Available Tools

### 1. `search_regulations`
Full-text search across all regulations

### 2. `get_regulation`
Retrieve specific regulation details

### 3. `compare_requirements`
Compare requirements across regulations

### 4. `check_applicability`
Determine which regulations apply to a scenario

### 5. `get_breach_notification_timeline`
State-by-state breach notification requirements

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

# With coverage
npm run test:coverage

# Specific test file
npm test -- tests/tools/search.test.ts
```

## Coding Guidelines

- TypeScript strict mode
- ESLint + Prettier
- Vitest for testing
- Conventional Commits
- All content from official public sources

## Current Statistics

- **Regulations**: 15 US federal & state laws
- **Articles/Sections**: ~1,500 entries
- **Database Size**: ~10MB
- **Tests**: All passing

## Support

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and use cases
- **Commercial**: hello@ansvar.eu

## License

Apache License 2.0 - See [LICENSE](./LICENSE)

---

**For complete Ansvar MCP suite documentation, see:**
📖 [Central Architecture Documentation](https://github.com/Ansvar-Systems/security-controls-mcp/blob/main/docs/ANSVAR_MCP_ARCHITECTURE.md)
