# Tools Reference

Complete reference for all 9 MCP tools provided by US Regulations MCP.

---

## Table of Contents

1. [search_regulations](#search_regulations)
2. [get_section](#get_section)
3. [list_regulations](#list_regulations)
4. [compare_requirements](#compare_requirements)
5. [map_controls](#map_controls)
6. [check_applicability](#check_applicability)
7. [get_definitions](#get_definitions)
8. [get_evidence_requirements](#get_evidence_requirements)
9. [get_compliance_action_items](#get_compliance_action_items)
10. [NIST Framework Reference](#nist-framework-reference)

---

## search_regulations

Search across all US regulations using full-text search. Returns relevant sections with highlighted snippets.

**Token Efficiency**: Returns 32-token snippets with `>>>` `<<<` markers around matched terms to minimize token usage while preserving context.

### Input Schema

```json
{
  "query": "string (required)",
  "regulations": ["array of strings (optional)"],
  "limit": "number (optional, default: 10, max: 1000)"
}
```

### Parameters

- **query** (required): Search query. Supports natural language and technical terms.
  - Examples: "breach notification", "access controls", "risk assessment"

- **regulations** (optional): Filter results to specific regulations.
  - Values: `["HIPAA"]`, `["CCPA"]`, `["SOX"]`, or combinations
  - Default: Search all regulations

- **limit** (optional): Maximum number of results to return.
  - Default: 10
  - Max: 1000
  - Recommendation: Use lower limits (10-20) for focused queries

### Output Example

```json
{
  "results": [
    {
      "regulation": "HIPAA",
      "section": "164.308(a)(1)(ii)(A)",
      "title": "Risk Analysis",
      "snippet": "...conduct an accurate and thorough >>>assessment<<< of the potential >>>risks<<< and vulnerabilities to the confidentiality...",
      "rank": 0.95
    },
    {
      "regulation": "CCPA",
      "section": "1798.150",
      "title": "Personal Information Breach",
      "snippet": "...consumer whose >>>personal information<<< was subject to a >>>breach<<< may institute a civil action...",
      "rank": 0.87
    }
  ],
  "total": 2,
  "query": "breach assessment risks"
}
```

### Token Usage Notes

- Snippets limited to ~32 tokens each
- Use `limit` parameter to control response size
- For large result sets, consider narrowing your query or using `regulations` filter

### Example Queries

```
# General search
"incident response procedures"

# Regulation-specific search
query: "audit logs"
regulations: ["HIPAA"]

# Multi-regulation comparison
query: "data retention"
regulations: ["HIPAA", "SOX"]
limit: 20
```

---

## get_section

Retrieve the full text of a specific regulation section. Returns section content, metadata, and cross-references.

### Input Schema

```json
{
  "regulation": "string (required)",
  "section": "string (required)"
}
```

### Parameters

- **regulation** (required): Regulation ID
  - Values: `"HIPAA"`, `"CCPA"`, `"SOX"`

- **section** (required): Section number
  - HIPAA format: `"164.308(a)(1)(ii)(A)"`, `"164.502"`
  - CCPA format: `"1798.100"`, `"1798.150(a)(1)"`
  - SOX format: `"404"`, `"802"`

### Output Example

```json
{
  "regulation": "HIPAA",
  "section": "164.308(a)(1)(ii)(A)",
  "title": "Risk Analysis (Required)",
  "text": "Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of electronic protected health information held by the covered entity or business associate.",
  "chapter": "Subpart C - Security Standards for the Protection of Electronic Protected Health Information",
  "parent_section": "164.308(a)(1)(ii)",
  "cross_references": [
    "164.306(a)",
    "164.308(a)(1)(ii)(B)",
    "164.316(b)(2)"
  ],
  "metadata": {
    "citation": "45 CFR 164.308(a)(1)(ii)(A)",
    "effective_date": "2005-04-21",
    "last_amended": "2013-03-26"
  }
}
```

### Token Usage Notes

- Large sections are automatically truncated with a warning
- Full section text can be several hundred tokens
- Use `search_regulations` first to find relevant sections, then retrieve specific ones

### Example Queries

```json
# HIPAA security rule
{
  "regulation": "HIPAA",
  "section": "164.308(a)(1)(ii)(A)"
}

# CCPA consumer rights
{
  "regulation": "CCPA",
  "section": "1798.100"
}

# SOX internal controls
{
  "regulation": "SOX",
  "section": "404"
}
```

---

## list_regulations

List all available regulations or get the hierarchical structure of a specific regulation.

### Input Schema

```json
{
  "regulation": "string (optional)"
}
```

### Parameters

- **regulation** (optional): Regulation ID to get detailed structure for
  - Values: `"HIPAA"`, `"CCPA"`, `"SOX"`
  - Default: If omitted, returns all regulations with metadata

### Output Example (All Regulations)

```json
{
  "regulations": [
    {
      "id": "HIPAA",
      "full_name": "Health Insurance Portability and Accountability Act",
      "citation": "Pub. L. 104-191, 45 CFR Parts 160, 164",
      "jurisdiction": "federal",
      "effective_date": "1996-08-21",
      "last_amended": "2013-03-26",
      "section_count": 156
    },
    {
      "id": "CCPA",
      "full_name": "California Consumer Privacy Act",
      "citation": "Cal. Civ. Code § 1798.100-1798.199",
      "jurisdiction": "california",
      "effective_date": "2020-01-01",
      "last_amended": "2023-01-01",
      "section_count": 98
    }
  ]
}
```

### Output Example (Specific Regulation Structure)

```json
{
  "regulation": "HIPAA",
  "full_name": "Health Insurance Portability and Accountability Act",
  "structure": {
    "chapters": [
      {
        "name": "Subpart C - Security Standards",
        "sections": [
          {
            "section": "164.302",
            "title": "Applicability"
          },
          {
            "section": "164.304",
            "title": "Definitions"
          },
          {
            "section": "164.306",
            "title": "Security standards: General rules"
          }
        ]
      }
    ]
  }
}
```

### Token Usage Notes

- Listing all regulations is very token-efficient (typically <500 tokens)
- Detailed structure can be 1000+ tokens for regulations with many sections
- Use this tool first to understand what's available

### Example Queries

```
# List all available regulations
{}

# Get HIPAA structure
{ "regulation": "HIPAA" }

# Get CCPA structure
{ "regulation": "CCPA" }
```

---

## compare_requirements

Compare requirements across multiple regulations for a specific topic. Searches each regulation and returns the top matching sections with relevance scores.

### Input Schema

```json
{
  "topic": "string (required)",
  "regulations": ["array of strings (required)"]
}
```

### Parameters

- **topic** (required): Topic to compare across regulations
  - Examples: "breach notification", "access controls", "data retention"

- **regulations** (required): List of regulations to compare
  - Minimum: 2 regulations
  - Values: `["HIPAA", "CCPA"]`, `["HIPAA", "CCPA", "SOX"]`

### Output Example

```json
{
  "topic": "breach notification",
  "comparison": [
    {
      "regulation": "HIPAA",
      "sections": [
        {
          "section": "164.404",
          "title": "Notification to individuals",
          "snippet": "...notify each individual whose >>>unsecured protected health information<<< has been...>>>breached<<<...",
          "relevance": 0.98
        },
        {
          "section": "164.406",
          "title": "Notification to the Secretary",
          "snippet": "...>>>breach<<< of >>>unsecured<<< protected health information involving more than 500 individuals...",
          "relevance": 0.89
        }
      ]
    },
    {
      "regulation": "CCPA",
      "sections": [
        {
          "section": "1798.150",
          "title": "Personal information security breaches",
          "snippet": "...consumer whose >>>personal information<<< was subject to a >>>breach<<< may institute a civil action...",
          "relevance": 0.95
        }
      ]
    }
  ],
  "summary": {
    "total_sections": 3,
    "regulations_compared": 2
  }
}
```

### Token Usage Notes

- Returns top 3-5 sections per regulation
- Total token usage scales with number of regulations compared
- Use specific topics for more focused results

### Example Queries

```json
# Compare breach notification
{
  "topic": "breach notification",
  "regulations": ["HIPAA", "CCPA"]
}

# Compare access controls
{
  "topic": "access controls authentication",
  "regulations": ["HIPAA", "SOX"]
}

# Three-way comparison
{
  "topic": "incident response",
  "regulations": ["HIPAA", "CCPA", "SOX"]
}
```

---

## map_controls

Map NIST controls (800-53, CSF) to regulation sections. Shows which regulatory requirements satisfy specific control objectives.

### Input Schema

```json
{
  "framework": "string (required)",
  "control": "string (optional)",
  "regulation": "string (optional)"
}
```

### Parameters

- **framework** (required): Control framework
  - Values: `"NIST_800_53"`, `"NIST_CSF"`, `"ISO27001"`

- **control** (optional): Specific control ID
  - NIST 800-53: `"AC-1"`, `"AU-2"`, `"SC-7"`
  - NIST CSF: `"PR.AC-1"`, `"DE.AE-1"`, `"RS.RP-1"`
  - If omitted: Returns all mappings for the framework

- **regulation** (optional): Filter to specific regulation
  - Values: `"HIPAA"`, `"CCPA"`, `"SOX"`
  - If omitted: Returns mappings across all regulations

### Output Example

```json
{
  "framework": "NIST_800_53",
  "control": "AC-1",
  "mappings": [
    {
      "regulation": "HIPAA",
      "control_id": "AC-1",
      "control_name": "Policy and Procedures",
      "sections": [
        "164.308(a)(1)",
        "164.316(a)",
        "164.316(b)(1)"
      ],
      "coverage": "full",
      "notes": "HIPAA Administrative Safeguards directly satisfy AC-1 requirements for access control policies and procedures."
    },
    {
      "regulation": "SOX",
      "control_id": "AC-1",
      "control_name": "Policy and Procedures",
      "sections": [
        "404(a)",
        "404(b)"
      ],
      "coverage": "partial",
      "notes": "SOX Section 404 requires documented controls but doesn't explicitly mandate access control policies."
    }
  ]
}
```

### Coverage Levels

- **full**: Regulation fully satisfies the control requirement
- **partial**: Regulation addresses some aspects of the control
- **related**: Regulation has related requirements but doesn't directly satisfy control

### Token Usage Notes

- Single control mapping: ~100-300 tokens
- All mappings for a framework: Can be 2000+ tokens
- Filter by regulation for more focused results

### Example Queries

```json
# Map single NIST 800-53 control
{
  "framework": "NIST_800_53",
  "control": "AC-1"
}

# Map NIST CSF control to HIPAA
{
  "framework": "NIST_CSF",
  "control": "PR.AC-1",
  "regulation": "HIPAA"
}

# Get all NIST CSF mappings
{
  "framework": "NIST_CSF"
}
```

---

## check_applicability

Determine which regulations apply to a specific sector or subsector. Returns applicable regulations with confidence levels.

### Input Schema

```json
{
  "sector": "string (required)",
  "subsector": "string (optional)"
}
```

### Parameters

- **sector** (required): Industry sector
  - Values: `"healthcare"`, `"financial"`, `"retail"`, `"technology"`, `"education"`, `"government"`

- **subsector** (optional): Specific subsector for refined applicability
  - Healthcare: `"hospital"`, `"clinic"`, `"pharmacy"`, `"health-tech"`
  - Financial: `"bank"`, `"fintech"`, `"investment"`, `"insurance"`
  - Retail: `"e-commerce"`, `"brick-and-mortar"`

### Output Example

```json
{
  "sector": "healthcare",
  "subsector": "hospital",
  "applicable_regulations": [
    {
      "regulation": "HIPAA",
      "applies": true,
      "confidence": "definite",
      "basis_section": "160.103",
      "notes": "Hospitals are covered entities under HIPAA as healthcare providers who transmit health information electronically."
    },
    {
      "regulation": "SOX",
      "applies": false,
      "confidence": "possible",
      "basis_section": null,
      "notes": "Only applies if the hospital is publicly traded. Private hospitals are not subject to SOX."
    },
    {
      "regulation": "CCPA",
      "applies": false,
      "confidence": "possible",
      "basis_section": "1798.140(d)",
      "notes": "CCPA exempts PHI covered by HIPAA. May apply to non-HIPAA data if hospital does business in California."
    }
  ]
}
```

### Confidence Levels

- **definite**: Regulation clearly applies based on sector/subsector
- **likely**: Regulation probably applies but depends on additional factors
- **possible**: Regulation may apply under certain circumstances

### Token Usage Notes

- Typically 200-500 tokens per query
- More specific subsectors provide more detailed applicability analysis

### Example Queries

```json
# Healthcare sector
{
  "sector": "healthcare"
}

# Specific hospital
{
  "sector": "healthcare",
  "subsector": "hospital"
}

# Fintech company
{
  "sector": "financial",
  "subsector": "fintech"
}

# E-commerce retailer
{
  "sector": "retail",
  "subsector": "e-commerce"
}
```

---

## get_definitions

Look up official term definitions across regulations. Uses partial matching to find terms.

### Input Schema

```json
{
  "term": "string (required)",
  "regulation": "string (optional)"
}
```

### Parameters

- **term** (required): Term to look up
  - Supports partial matching: `"health"` matches `"protected health information"`
  - Case-insensitive

- **regulation** (optional): Filter to specific regulation
  - Values: `"HIPAA"`, `"CCPA"`, `"SOX"`
  - If omitted: Searches all regulations

### Output Example

```json
{
  "term": "protected health information",
  "definitions": [
    {
      "regulation": "HIPAA",
      "term": "Protected Health Information",
      "definition": "Individually identifiable health information that is transmitted by electronic media, maintained in electronic media, or transmitted or maintained in any other form or medium. This includes information created or received by a health care provider, health plan, public health authority, employer, life insurer, school or university, or health care clearinghouse; and relates to the past, present, or future physical or mental health or condition of an individual; the provision of health care to an individual; or the past, present, or future payment for the provision of health care to an individual.",
      "section": "160.103",
      "citation": "45 CFR 160.103"
    }
  ],
  "matches": 1
}
```

### Token Usage Notes

- Single definition: ~100-400 tokens depending on definition length
- Multiple matches: Token usage scales linearly
- Use regulation filter to reduce token usage

### Example Queries

```json
# Look up HIPAA term
{
  "term": "protected health information",
  "regulation": "HIPAA"
}

# Search across all regulations
{
  "term": "personal information"
}

# Partial matching
{
  "term": "breach"
}
```

---

## get_evidence_requirements

Get compliance evidence requirements for a specific section. Shows what audit artifacts, documentation, or processes are needed for compliance.

### Input Schema

```json
{
  "regulation": "string (required)",
  "section": "string (required)"
}
```

### Parameters

- **regulation** (required): Regulation ID
  - Values: `"HIPAA"`, `"CCPA"`, `"SOX"`

- **section** (required): Section number
  - Same format as `get_section` tool

### Output Example

```json
{
  "regulation": "HIPAA",
  "section": "164.312(b)",
  "title": "Audit controls",
  "evidence_requirements": [
    {
      "category": "Technical Safeguards",
      "evidence_type": "audit_logs",
      "description": "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information.",
      "artifacts": [
        "Audit log configuration documentation",
        "Sample audit logs showing ePHI access tracking",
        "Audit log review procedures",
        "Audit log retention policy (6 years minimum)"
      ]
    },
    {
      "category": "Documentation",
      "evidence_type": "policies_procedures",
      "description": "Written policies and procedures for audit controls implementation",
      "artifacts": [
        "Audit controls policy",
        "Log monitoring procedures",
        "Incident response procedures (log-based detection)"
      ]
    }
  ],
  "audit_frequency": "ongoing",
  "retention_period": "6 years"
}
```

### MVP Status

**Note**: Evidence requirements are currently placeholders. Full evidence mapping will be added in a future release. The tool currently returns section text and basic evidence categories.

### Token Usage Notes

- Typically 300-600 tokens per section
- Evidence requirements can be extensive for complex sections

### Example Queries

```json
# HIPAA audit controls
{
  "regulation": "HIPAA",
  "section": "164.312(b)"
}

# CCPA data deletion
{
  "regulation": "CCPA",
  "section": "1798.105"
}

# SOX internal controls
{
  "regulation": "SOX",
  "section": "404"
}
```

---

## get_compliance_action_items

Generate structured compliance action items from regulation sections. Extracts priority based on regulatory language and identifies evidence needed.

### Input Schema

```json
{
  "regulation": "string (required)",
  "sections": ["array of strings (required)"]
}
```

### Parameters

- **regulation** (required): Regulation ID
  - Values: `"HIPAA"`, `"CCPA"`, `"SOX"`

- **sections** (required): Section numbers to generate action items for
  - Array of section identifiers
  - Same format as `get_section` tool

### Output Example

```json
{
  "regulation": "HIPAA",
  "action_items": [
    {
      "section": "164.308(a)(1)(ii)(A)",
      "title": "Risk Analysis (Required)",
      "required_state": "Conduct an accurate and thorough assessment of the potential risks and vulnerabilities to the confidentiality, integrity, and availability of electronic protected health information",
      "priority": "high",
      "rationale": "Section explicitly marked as 'Required' - mandatory implementation",
      "evidence_needed": [
        "Risk assessment report",
        "Risk register or risk tracking system",
        "Threat modeling documentation",
        "Vulnerability assessment results",
        "Asset inventory (systems containing ePHI)"
      ],
      "implementation_notes": "Must be comprehensive and documented. Should be repeated periodically and when environmental or operational changes occur."
    },
    {
      "section": "164.308(a)(5)(ii)(C)",
      "title": "Log-in Monitoring (Addressable)",
      "required_state": "Procedures for monitoring log-in attempts and reporting discrepancies",
      "priority": "medium",
      "rationale": "Addressable safeguard - implementation or documented alternative required",
      "evidence_needed": [
        "Log monitoring procedures",
        "Failed login attempt reports",
        "SIEM or log analysis tool configuration",
        "Incident response procedures for suspicious login activity"
      ],
      "implementation_notes": "If not implementing, must document why not reasonable and appropriate, and what alternative measures are in place."
    }
  ],
  "summary": {
    "total_items": 2,
    "high_priority": 1,
    "medium_priority": 1,
    "low_priority": 0
  }
}
```

### Priority Levels

- **high**: Required implementations, "shall", "must" language, or critical controls
- **medium**: Addressable safeguards, "should" language, or important but flexible controls
- **low**: Optional enhancements, recommendations, or supplementary measures

### Token Usage Notes

- ~200-400 tokens per action item
- Total scales with number of sections requested
- Recommend processing 3-5 sections per query for manageability

### Example Queries

```json
# HIPAA security risk assessment
{
  "regulation": "HIPAA",
  "sections": [
    "164.308(a)(1)(ii)(A)",
    "164.308(a)(1)(ii)(B)"
  ]
}

# CCPA consumer rights
{
  "regulation": "CCPA",
  "sections": [
    "1798.100",
    "1798.105",
    "1798.110"
  ]
}

# SOX IT controls
{
  "regulation": "SOX",
  "sections": ["404"]
}
```

---

## NIST Framework Reference

### NIST 800-53 Rev 5 Control Families

Common control families mapped in this MCP:

| Family | Name | Common Regulations |
|--------|------|-------------------|
| AC | Access Control | HIPAA, SOX |
| AU | Audit and Accountability | HIPAA, SOX |
| AT | Awareness and Training | HIPAA |
| CM | Configuration Management | SOX |
| CP | Contingency Planning | HIPAA |
| IA | Identification and Authentication | HIPAA, SOX |
| IR | Incident Response | HIPAA, CCPA |
| MA | Maintenance | HIPAA |
| MP | Media Protection | HIPAA |
| PE | Physical and Environmental Protection | HIPAA |
| PL | Planning | HIPAA, SOX |
| PM | Program Management | HIPAA, SOX |
| PS | Personnel Security | HIPAA |
| PT | PII Processing and Transparency | CCPA |
| RA | Risk Assessment | HIPAA, SOX |
| CA | Assessment, Authorization, and Monitoring | HIPAA, SOX |
| SC | System and Communications Protection | HIPAA, SOX |
| SI | System and Information Integrity | HIPAA, SOX |
| SA | System and Services Acquisition | HIPAA |

### NIST CSF 2.0 Functions

| Function | Categories | Common Regulations |
|----------|-----------|-------------------|
| Identify (ID) | Asset Management, Risk Assessment, Governance | HIPAA, SOX |
| Protect (PR) | Access Control, Data Security, Training | HIPAA, CCPA, SOX |
| Detect (DE) | Monitoring, Detection Processes | HIPAA, SOX |
| Respond (RS) | Response Planning, Communications, Analysis | HIPAA, CCPA |
| Recover (RC) | Recovery Planning, Improvements, Communications | HIPAA |
| Govern (GV) | Organizational Context, Risk Management, Oversight | SOX |

### Example Control IDs

**NIST 800-53**:
- `AC-1` - Access Control Policy and Procedures
- `AU-2` - Event Logging
- `RA-1` - Risk Assessment Policy and Procedures
- `SC-7` - Boundary Protection
- `IR-1` - Incident Response Policy and Procedures

**NIST CSF**:
- `PR.AC-1` - Identities and credentials are issued, managed, verified, revoked
- `DE.AE-1` - Network baseline established and managed
- `RS.RP-1` - Response plan is executed during or after an incident
- `ID.RA-1` - Asset vulnerabilities are identified and documented

---

## Notes

### Token Optimization

All tools are designed for token efficiency:

- Search results use 32-token snippets with highlight markers
- Large sections are automatically truncated with warnings
- Use `limit` parameters to control response size
- Filter by regulation to reduce cross-regulation noise

### Error Handling

All tools return structured errors:

```json
{
  "error": "Section not found",
  "regulation": "HIPAA",
  "section": "999.999",
  "suggestion": "Use list_regulations to see available sections"
}
```

### Best Practices

1. **Start broad, narrow down**: Use `list_regulations` and `search_regulations` first
2. **Use filters**: Specify `regulation` parameter when you know which regulation applies
3. **Batch queries**: For `get_compliance_action_items`, process related sections together
4. **Chain tools**: Use search → get_section → get_compliance_action_items workflow
5. **Check applicability first**: Use `check_applicability` before deep-diving into regulations

---

## Support

For tool usage questions or issues:

- GitHub: https://github.com/ansvar-systems/us-regulations-mcp/issues
- Email: hello@ansvar.eu
