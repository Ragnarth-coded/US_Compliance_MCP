# US Regulations MCP

[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

A Model Context Protocol (MCP) server for US cybersecurity and privacy regulations. Query HIPAA, CCPA, SOX, and more directly from Claude with full-text search, control framework mappings, and compliance action item generation.

**Built by [Ansvar Systems](https://ansvar.eu)**

## Features

- **Full-text search** across HIPAA, CCPA, and SOX regulations
- **Control framework mappings** (NIST 800-53, NIST CSF)
- **Compliance action items** with structured priority and evidence requirements
- **Cross-regulation comparison** (e.g., compare breach notification requirements)
- **Applicability checking** (which regulations apply to your sector?)
- **Official term definitions** from regulatory sources
- **Section retrieval** with cross-references and metadata
- **Token-efficient** search results with highlighted snippets

## Quick Start

### Installation

```bash
npm install @ansvar/us-regulations-mcp
```

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "us-regulations": {
      "command": "npx",
      "args": ["-y", "@ansvar/us-regulations-mcp"]
    }
  }
}
```

Restart Claude Desktop. The server will appear in the MCP tools menu.

## Example Queries

Try these queries in Claude Desktop:

### Healthcare & HIPAA
```
"What are the HIPAA security rule requirements for access controls?"
"Does my telemedicine app need to comply with HIPAA?"
"What audit logs does HIPAA require for ePHI access?"
```

### Privacy & CCPA
```
"Compare breach notification timelines between HIPAA and CCPA"
"What consumer rights does CCPA provide for data deletion?"
"Do I need to comply with CCPA if I have 10,000 California customers?"
```

### Financial & SOX
```
"What IT controls does SOX Section 404 require?"
"Which NIST 800-53 controls satisfy SOX audit requirements?"
"How long must I retain financial records under SOX?"
```

### Cross-Regulation Analysis
```
"Compare incident response requirements across HIPAA, CCPA, and SOX"
"Which regulations apply to a fintech company in California?"
"Map NIST CSF to our HIPAA and SOX obligations"
```

### Compliance Planning
```
"Generate compliance action items for HIPAA security risk assessment"
"What evidence do I need for HIPAA access control compliance?"
"List all CCPA consumer rights requirements"
```

## What's Included

### MVP Regulations (3)

- **HIPAA** - Health Insurance Portability and Accountability Act
  - Privacy Rule (45 CFR Part 160, 164 Subpart E)
  - Security Rule (45 CFR 164 Subpart C)
  - Breach Notification Rule (45 CFR 164 Subpart D)

- **CCPA/CPRA** - California Consumer Privacy Act / Privacy Rights Act
  - California Civil Code §1798.100-1798.199
  - Consumer rights and business obligations

- **SOX** - Sarbanes-Oxley Act
  - Section 404 (Management Assessment of Internal Controls)
  - IT controls and audit requirements
  - Financial data retention requirements

### Control Framework Mappings

- **NIST 800-53** - Security and Privacy Controls (Rev 5)
- **NIST CSF 2.0** - Cybersecurity Framework
- **ISO 27001** - Information Security Management (planned)

### Data Status

**MVP Note**: This is an initial release with placeholder ingestion adapters. The database schema and all 9 MCP tools are fully functional. Automated ingestion from official API sources (regulations.gov, ecfr.gov, California LegInfo) is in development.

## Available Tools

The server provides 9 MCP tools:

| Tool | Description |
|------|-------------|
| `search_regulations` | Full-text search across all regulations with highlighted snippets |
| `get_section` | Retrieve full text of a specific regulation section |
| `list_regulations` | List available regulations or get hierarchical structure |
| `compare_requirements` | Compare topic across multiple regulations |
| `map_controls` | Map NIST controls to regulation sections |
| `check_applicability` | Determine which regulations apply to your sector |
| `get_definitions` | Look up official term definitions |
| `get_evidence_requirements` | Get compliance evidence requirements for a section |
| `get_compliance_action_items` | Generate structured compliance action items |

See [docs/tools.md](docs/tools.md) for complete tool reference with examples.

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/ansvar-systems/us-regulations-mcp.git
cd us-regulations-mcp

# Install dependencies
npm install

# Build the database schema
npm run build:db

# Build the TypeScript code
npm run build

# Run in development mode
npm run dev
```

### Available Scripts

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Run server in development mode with tsx
npm run build:db     # Initialize database schema
npm test             # Run test suite with vitest
```

### Project Structure

```
us-regulations-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # MCP tool implementations
│   │   ├── registry.ts       # Central tool registry
│   │   ├── search.ts         # Full-text search
│   │   ├── section.ts        # Section retrieval
│   │   ├── list.ts           # List regulations
│   │   ├── compare.ts        # Compare requirements
│   │   ├── map.ts            # Control mappings
│   │   ├── applicability.ts  # Applicability checker
│   │   ├── definitions.ts    # Term definitions
│   │   ├── evidence.ts       # Evidence requirements
│   │   └── action-items.ts   # Compliance action items
│   └── ingest/               # Ingestion framework (in development)
│       ├── framework.ts      # Base interfaces
│       └── adapters/         # Source-specific adapters
├── scripts/
│   └── build-db.ts           # Database schema builder
├── data/
│   └── regulations.db        # SQLite database
└── docs/                     # Documentation
```

## Architecture Overview

### Database

The server uses SQLite with FTS5 (full-text search) for efficient querying:

- **regulations** - Metadata for each regulation
- **sections** - Regulation sections with full text
- **sections_fts** - FTS5 index for fast full-text search
- **definitions** - Official term definitions
- **control_mappings** - NIST control to regulation mappings
- **applicability_rules** - Sector applicability rules
- **source_registry** - Data source tracking for updates

### Ingestion Framework

The ingestion framework uses an adapter pattern to normalize data from multiple US regulatory sources:

- **regulations.gov API** - Federal regulations
- **ecfr.gov API** - Electronic Code of Federal Regulations (HIPAA)
- **California LegInfo API** - State legislation (CCPA/CPRA)

Each adapter handles source-specific pagination, authentication, and data normalization.

### MCP Protocol

The server implements the Model Context Protocol specification:

- **stdio transport** for Claude Desktop integration
- **Centralized tool registry** for consistent tool definitions
- **Structured error handling** with informative messages
- **Token-efficient responses** with snippet highlighting

## Coverage & Roadmap

See [docs/coverage.md](docs/coverage.md) for:

- Current regulation coverage status
- Planned future regulations
- Control framework mappings
- Data source details
- Update frequency

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

## Disclaimer

This tool provides regulatory text from official sources but is **NOT legal advice**. Control mappings and applicability rules are interpretive aids only. Always consult qualified legal counsel for compliance decisions.

## Contributing

Contributions are welcome. Please open an issue or pull request for:

- Bug fixes
- New regulation support
- Additional control framework mappings
- Documentation improvements

## Support

For issues, questions, or feature requests:

- Open a [GitHub issue](https://github.com/ansvar-systems/us-regulations-mcp/issues)
- Email: hello@ansvar.eu

## Acknowledgments

- Based on the EU Compliance MCP architecture
- Uses the [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- Regulatory data from official US government sources

---

**Built by Ansvar Systems** - Making compliance accessible through AI