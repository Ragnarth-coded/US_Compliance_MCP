# US Regulations MCP Server

**Navigate US compliance from the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fus-regulations-mcp.svg)](https://www.npmjs.com/package/@ansvar/us-regulations-mcp)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/US_compliance_MCP?style=social)](https://github.com/Ansvar-Systems/US_compliance_MCP)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

Query **HIPAA, CCPA, SOX, GLBA, FERPA, COPPA, FDA 21 CFR Part 11, EPA RMP, FFIEC, and NYDFS 500** directly from Claude, Cursor, or any MCP-compatible client.

If you're building healthcare tech, consumer apps, or financial services for the US market, this is your compliance reference.

Built by [Ansvar Systems](https://ansvar.eu) — Stockholm, Sweden

---

## Why This Exists

US compliance is scattered across regulations.gov PDFs, eCFR.gov pages, state legislative sites, and agency guidance documents. Whether you're:
- A **developer** implementing HIPAA security controls or CCPA consumer rights
- A **product team** navigating breach notification requirements across multiple states
- A **compliance officer** mapping NIST controls to regulatory obligations
- A **legal researcher** comparing incident response timelines across federal and state laws

...you shouldn't need to navigate fragmented federal agencies, 50 state legislatures, and conflicting PDF formats. Ask Claude. Get the exact section. With context.

This MCP server makes US regulations **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Installation

```bash
npm install @ansvar/us-regulations-mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. Done.

### Cursor / VS Code

```json
{
  "mcp.servers": {
    "us-regulations": {
      "command": "npx",
      "args": ["-y", "@ansvar/us-regulations-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally:

### Healthcare & HIPAA
- *"What are the HIPAA security rule requirements for access controls?"*
- *"Does my telemedicine app need to comply with HIPAA?"*
- *"What audit logs does HIPAA require for ePHI access?"*
- *"How long do I have to report a HIPAA breach?"*

### Privacy & CCPA
- *"Compare breach notification timelines between HIPAA and CCPA"*
- *"What consumer rights does CCPA provide for data deletion?"*
- *"Do I need to comply with CCPA if I have 10,000 California customers?"*
- *"What is a 'sale' of personal information under CCPA?"*

### Financial & SOX
- *"What IT controls does SOX Section 404 require?"*
- *"Which NIST 800-53 controls satisfy SOX audit requirements?"*
- *"How long must I retain financial records under SOX?"*
- *"What are the requirements for SOX internal control assessments?"*

### Financial Services & GLBA
- *"What are the GLBA safeguards rule requirements for customer data protection?"*
- *"Compare encryption requirements across HIPAA, GLBA, and SOX"*

### Banking & FFIEC
- *"What are the FFIEC guidelines for information security governance?"*
- *"What does FFIEC require for business continuity planning?"*
- *"Compare FFIEC cybersecurity requirements with NYDFS 500"*

### New York Financial Services & NYDFS
- *"What are the NYDFS 500 requirements for multi-factor authentication?"*
- *"When must I notify NYDFS of a cybersecurity event?"*
- *"What are the penetration testing requirements under NYDFS 500?"*
- *"What information security program elements does GLBA require?"*

### Education & FERPA
- *"What are FERPA requirements for student record access?"*
- *"Can I share student data with third-party analytics tools under FERPA?"*
- *"What parental consent is needed to disclose student directory information?"*

### Children's Privacy & COPPA
- *"What parental consent mechanisms are acceptable under COPPA?"*
- *"COPPA requirements for collecting personal information from children under 13"*
- *"Do I need COPPA compliance for a kids' mobile app?"*

### Pharmaceutical & FDA
- *"What are FDA 21 CFR Part 11 requirements for electronic signatures?"*
- *"How must clinical trial data be validated under 21 CFR Part 11?"*
- *"What audit trail requirements apply to electronic records in pharma?"*

### Environmental & EPA
- *"Which chemical facilities must submit an EPA Risk Management Plan?"*
- *"What accident prevention requirements does EPA RMP mandate?"*
- *"How often must I update my facility's EPA RMP?"*

### Cross-Regulation Analysis
- *"Compare incident response requirements across HIPAA, CCPA, and SOX"*
- *"Which regulations apply to a fintech company in California?"*
- *"Map NIST CSF to our HIPAA and SOX obligations"*
- *"What are my data retention requirements across all regulations?"*

---

## What's Included

### v1.1 Regulations (8 total)

**Healthcare & Privacy:**
- **HIPAA** - Health Insurance Portability and Accountability Act
  - Privacy Rule (45 CFR Part 164 Subpart E)
  - Security Rule (45 CFR 164 Subpart C)
  - Breach Notification Rule (45 CFR 164 Subpart D)

- **CCPA/CPRA** - California Consumer Privacy Act / Privacy Rights Act
  - California Civil Code §1798.100-1798.199
  - Consumer rights and business obligations

**Financial Services:**
- **SOX** - Sarbanes-Oxley Act
  - Section 404 (Management Assessment of Internal Controls)
  - IT controls and audit requirements

- **GLBA** - Gramm-Leach-Bliley Act Safeguards Rule (NEW in v1.1)
  - 16 CFR Part 314
  - Financial institution data security requirements

**Education:**
- **FERPA** - Family Educational Rights and Privacy Act (NEW in v1.1)
  - 34 CFR Part 99
  - Student education records privacy

**Children's Privacy:**
- **COPPA** - Children's Online Privacy Protection Act (NEW in v1.1)
  - 16 CFR Part 312
  - Requirements for collecting data from children under 13

**Pharmaceutical & Medical Devices:**
- **FDA 21 CFR Part 11** - Electronic Records and Signatures (NEW in v1.1)
  - Electronic record keeping and digital signatures for FDA-regulated industries

**Environmental & Chemical Safety:**
- **EPA RMP** - Risk Management Plan Rule (NEW in v1.1)
  - 40 CFR Part 68
  - Chemical facility accident prevention

**Payment Card Industry:**
- **PCI DSS** - Payment Card Industry Data Security Standard (cross-reference)
  - See [security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp) for PCI DSS v4.0 requirements
  - This MCP provides PCI SSC official requirements and testing procedures

### Control Framework Mappings

- **NIST 800-53** - Security and Privacy Controls (Rev 5)
- **NIST CSF 2.0** - Cybersecurity Framework
- **ISO 27001** - Information Security Management (planned)

### Roadmap

Additional regulations in development:
- **State breach notification laws** (50 states)
- **FISMA** - Federal Information Security Management Act
- **CAN-SPAM** - Email marketing regulations

**Detailed coverage:** [docs/coverage.md](docs/coverage.md)

---

## 🎬 See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All regulatory text is ingested from official sources (eCFR.gov, California LegInfo)
- Snippets are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing — the database contains regulation text, not AI interpretations
- **Note:** HTML-to-text conversion normalizes whitespace/formatting, but preserves content

**Smart Context Management:**
- Search returns **32-token snippets** with highlighted matches (safe for context)
- Section retrieval warns about token usage (some sections can be large)
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
eCFR/LegInfo HTML → Parse → SQLite → FTS5 snippet() → MCP response
                      ↑                    ↑
               Formatting only      Verbatim database query
```

### Example: regulations.gov vs. This MCP

| regulations.gov / eCFR | This MCP Server |
|------------------------|-----------------|
| Search by CFR citation | Search by plain English: *"breach notification timeline"* |
| Navigate fragmented agency sites | Get the exact section with context |
| Manual cross-referencing across federal/state | `compare_requirements` tool does it instantly |
| "Which regulations apply to me?" → weeks of research | `check_applicability` tool → answer in seconds |
| Copy-paste from PDFs with formatting issues | Section + definitions + related requirements |
| Check eCFR, regulations.gov, 50 state sites | Unified search across all sources |
| No API for most sources | MCP protocol → AI-native |

**regulations.gov example:** Download HIPAA PDF → Ctrl+F "breach" → Read §164.410 → Google "What's a 'reportable breach'?" → Cross-reference CCPA → Check California site → Repeat for SOX

**This MCP:** *"Compare breach notification requirements across HIPAA, CCPA, and SOX"* → Done.

---

## ⚠️ Important Disclaimers

### Legal Advice

> **🚨 THIS TOOL IS NOT LEGAL ADVICE 🚨**
>
> Regulation text is sourced verbatim from eCFR.gov, California LegInfo, and other official public sources. However:
> - **Control mappings** (NIST 800-53, NIST CSF) are interpretive aids, not official guidance
> - **Applicability rules** are generalizations, not legal determinations
> - **Cross-references** are research helpers, not compliance mandates
>
> **Always verify against official sources and consult qualified legal counsel for compliance decisions.**

### Token Usage

> **⚠️ Context Window Warning**
>
> Some regulation sections can be large (e.g., HIPAA Privacy Rule sections with extensive commentary). The MCP server:
> - **Search tool**: Returns smart snippets (safe for context)
> - **Get section tool**: Returns full text (may consume significant tokens)
> - **Recommendation**: Use search first, then fetch specific sections as needed
>
> Claude Desktop has a 200k token context window. Monitor your usage when retrieving multiple large sections.

### MVP Status

> **📋 Initial Release**
>
> This is a production-ready MVP with three foundational regulations (HIPAA, CCPA, SOX). The database schema and all 9 MCP tools are fully functional and thoroughly tested (100% test coverage).
>
> **Data Ingestion**: Automated ingestion from official API sources (eCFR.gov, California LegInfo) is operational. Additional regulations are being added to the database.
>
> **Coming Soon**: Additional federal regulations (GLBA, FERPA, FISMA) and state breach notification laws.

### NIST Standards

**No copyrighted NIST standards are included.** Control mappings reference NIST 800-53 control IDs only (e.g., "AC-1", "SI-4"). While NIST standards are freely available from NIST, this tool helps map regulations to controls but doesn't replace reading the standards themselves.

---

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

**Detailed tool reference:** [docs/tools.md](docs/tools.md)

---

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/Ansvar-Systems/US_compliance_MCP.git
cd US_compliance_MCP

# Install dependencies
npm install

# Build the database schema
npm run build:db

# Load seed data
npm run load-seed

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
npm run load-seed    # Load seed data for testing
npm test             # Run test suite with vitest (100% coverage)
npm run test:mcp     # Test MCP tool integration
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
│   └── ingest/               # Ingestion framework
│       ├── framework.ts      # Base interfaces
│       └── adapters/         # Source-specific adapters
├── scripts/
│   ├── build-db.ts           # Database schema builder
│   ├── load-seed-data.ts     # Seed data loader
│   └── ingest.ts             # Data ingestion orchestrator
├── data/
│   └── regulations.db        # SQLite database
└── docs/                     # Documentation
```

---

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

- **eCFR.gov API** - Electronic Code of Federal Regulations (HIPAA, SOX)
- **California LegInfo API** - State legislation (CCPA/CPRA)
- **regulations.gov API** - Federal regulatory documents
- **Agency-specific sources** - HHS, SEC, FTC guidance

Each adapter handles source-specific pagination, authentication, and data normalization.

### MCP Protocol

The server implements the Model Context Protocol specification:

- **stdio transport** for Claude Desktop integration
- **Centralized tool registry** for consistent tool definitions
- **Structured error handling** with informative messages
- **Token-efficient responses** with snippet highlighting

---

## About Ansvar Systems

We build AI-accelerated threat modeling and compliance tools for automotive, financial services, and healthcare. This MCP server started as our internal reference tool for US regulations — turns out everyone building for US markets has the same compliance research frustrations.

So we're open-sourcing it. Navigating federal and state regulations shouldn't require a legal team.

**[ansvar.eu](https://ansvar.eu)** — Stockholm, Sweden

---

## Documentation

- **[Coverage Details](docs/coverage.md)** — All regulations with section counts
- **[Available Tools](docs/tools.md)** — Detailed tool descriptions with examples
- **[Development Status](docs/STATUS.md)** — Current implementation status

---

## Contributing

Contributions are welcome! Please open an issue or pull request for:

- Bug fixes
- New regulation support
- Additional control framework mappings
- Documentation improvements
- Test coverage enhancements

---

## Support

For issues, questions, or feature requests:

- Open a [GitHub issue](https://github.com/Ansvar-Systems/US_compliance_MCP/issues)
- Email: hello@ansvar.eu

---

## Acknowledgments

- Regulatory data from official US government sources (eCFR.gov, California LegInfo)
- Uses the [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- Inspired by the EU Regulations MCP architecture

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
