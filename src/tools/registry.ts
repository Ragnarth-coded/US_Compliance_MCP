import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';
import { searchRegulations, SearchInput } from './search.js';
import { getSection, GetSectionInput } from './section.js';
import { listRegulations, ListInput } from './list.js';
import { compareRequirements, CompareInput } from './compare.js';
import { mapControls, MapControlsInput } from './map.js';
import { checkApplicability, ApplicabilityInput } from './applicability.js';
import { getEvidenceRequirements, EvidenceInput } from './evidence.js';
import { getComplianceActionItems, ActionItemsInput } from './action-items.js';
import { getBreachNotificationTimeline, BreachNotificationInput } from './breach-notification.js';
import { getAbout, type AboutContext } from './about.js';
import {
  getSectionHistory,
  diffSection,
  getRecentChanges,
  type GetSectionHistoryInput,
  type DiffSectionInput,
  type GetRecentChangesInput,
} from './version-tracking.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  annotations?: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
  };
  handler: (db: InstanceType<typeof Database>, args: any) => Promise<any>;
}


const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
} as const;

function toTitle(name: string): string {
  return name
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function annotateTools(tools: ToolDefinition[]): ToolDefinition[] {
  return tools.map((tool) => ({
    ...tool,
    annotations: tool.annotations ?? {
      title: toTitle(tool.name),
      readOnlyHint: READ_ONLY_ANNOTATIONS.readOnlyHint,
      destructiveHint: READ_ONLY_ANNOTATIONS.destructiveHint,
    },
  }));
}

/**
 * Centralized registry of all MCP tools.
 * Single source of truth for both stdio and HTTP servers.
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: 'search_regulations',
    description: 'Full-text search across 15 US federal and state regulations (HIPAA, CCPA, SOX, GLBA, etc.). Returns ranked results with BM25 scoring and 32-token snippets with >>> <<< markers around matched terms. Use this as the primary discovery tool when you need to find regulation text on a topic. Prefer get_section when you already know the exact regulation and section number. Output: { results: [{ regulation, section, title, snippet, score }], total_results, query, diagnostics? }. Returns diagnostics object with suggestions on empty results.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — supports natural language ("breach notification requirements") and technical terms ("PHI", "GLBA safeguards"). Terms are stemmed and prefix-matched automatically.',
        },
        regulations: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 15,
          description: 'Filter results to specific regulations (e.g., ["HIPAA", "CCPA"]). Use list_regulations to see valid IDs.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum results to return',
          default: 10,
          minimum: 1,
          maximum: 1000,
        },
        offset: {
          type: 'integer',
          description: 'Number of results to skip for pagination',
          default: 0,
          minimum: 0,
        },
      },
      required: ['query'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await searchRegulations(db, args as SearchInput);
    },
  },
  {
    name: 'get_section',
    description: 'Retrieve the full text of a specific regulation section by ID and section number. Use this when you know exactly which section you need — use search_regulations first if you need to discover sections. Output: { regulation, section, title, chapter, text, cross_references? }. Throws a descriptive error listing available regulations if the regulation ID is invalid, or available sections if the section number is not found. Large sections (>8000 chars) are truncated with a warning.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA", "SOX"). Call list_regulations with no params to see all valid IDs.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.502", "1798.100", "SOX-302"). Call list_regulations with a regulation ID to see available sections.',
        },
      },
      required: ['regulation', 'section'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await getSection(db, args as GetSectionInput);
    },
  },
  {
    name: 'list_regulations',
    description: 'List all available regulations or get the structure (chapters and sections) of a specific one. Call with no parameters first to discover valid regulation IDs. Call with a regulation ID to get its table of contents (chapters and section numbers). Output without params: { regulations: [{ id, title, description, effective_date }] }. Output with regulation param: { structure: { regulation: { id, title }, chapters: [{ name, sections: [{ number, title }] }] } }. Do not use this for searching — use search_regulations instead.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID to get detailed structure for (e.g., "HIPAA"). Omit to list all regulations.',
        },
      },
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await listRegulations(db, args as ListInput);
    },
  },
  {
    name: 'compare_requirements',
    description: 'Compare how multiple regulations address the same topic (e.g., "encryption", "breach notification"). Returns the top 5 matching sections per regulation with relevance scores, plus a synthesis summary identifying common themes and coverage gaps. Use this when you need a cross-regulation comparison — for single-regulation searches, use search_regulations instead. Output: { topic, comparisons: [{ regulation, sections: [{ section, title, snippet, score }] }], synthesis: { coverage_summary, common_themes } }.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic to compare across regulations (e.g., "breach notification", "access controls", "encryption", "data retention")',
        },
        regulations: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 10,
          description: 'Regulations to compare (2-10). Use list_regulations to see valid IDs. Example: ["HIPAA", "CCPA", "GLBA"]',
        },
      },
      required: ['topic', 'regulations'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await compareRequirements(db, args as CompareInput);
    },
  },
  {
    name: 'map_controls',
    description: 'Map NIST control framework objectives to US regulation sections. Shows which regulatory requirements satisfy specific control objectives. Use this for compliance mapping and gap analysis. Returns diagnostics with available frameworks if the framework ID is unknown. Output: { framework, mappings: [{ control_id, control_name, regulation, section, description }], total_mappings, diagnostics? }. Do not use this for free-text search — use search_regulations instead.',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['NIST_800_53_R5', 'NIST_CSF', 'NIST_CSF_2_0'],
          description: 'Control framework to map from. NIST_800_53_R5 = NIST SP 800-53 Rev 5. NIST_CSF / NIST_CSF_2_0 = NIST Cybersecurity Framework.',
        },
        control: {
          type: 'string',
          description: 'Specific control ID to look up (e.g., "AC-1", "PR.AC-1"). Omit to return all mappings for the framework.',
        },
        regulation: {
          type: 'string',
          description: 'Filter mappings to a specific regulation (e.g., "HIPAA", "SOX"). Omit to return mappings across all regulations.',
        },
      },
      required: ['framework'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await mapControls(db, args as MapControlsInput);
    },
  },
  {
    name: 'check_applicability',
    description: 'Determine which US regulations apply to a given industry sector. Returns applicable regulations with confidence levels (definite, likely, possible) and reasoning. Use this as a starting point for compliance assessments. Returns diagnostics listing all available sectors if no match is found. Output: { sector, subsector?, applicable_regulations: [{ regulation, confidence, reason }], diagnostics? }. Do not use this for text search — use search_regulations instead.',
    inputSchema: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          enum: ['all', 'financial', 'healthcare', 'insurance', 'marketing', 'medical-devices', 'retail', 'technology'],
          description: 'Industry sector. Use "medical-devices" for medical device manufacturers. Use "all" to see regulations that apply universally.',
        },
        subsector: {
          type: 'string',
          description: 'Specific subsector for more precise matching (e.g., "hospital", "bank", "e-commerce"). Optional — omit for sector-level results.',
        },
      },
      required: ['sector'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await checkApplicability(db, args as ApplicabilityInput);
    },
  },
  {
    name: 'get_evidence_requirements',
    description: 'Extract audit evidence requirements from a specific regulation section. Analyzes section text using 26 keyword patterns to identify required artifacts (policies, logs, risk assessments, training records, incident response plans, etc.). Distinguishes mandatory ("shall", "must") vs recommended ("should", "may") evidence. Use this after identifying relevant sections via search_regulations or get_section. Output: { regulation, section, title, evidence: [{ type, description, mandatory, source_text }] }. Do not use this for discovery — use search_regulations first.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "SOX", "NYDFS_500")',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.312(b)", "SOX-404")',
        },
      },
      required: ['regulation', 'section'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await getEvidenceRequirements(db, args as EvidenceInput);
    },
  },
  {
    name: 'get_compliance_action_items',
    description: 'Generate prioritized compliance action items from one or more regulation sections. Extracts priority (high/medium/low) based on regulatory language: "shall"/"must" = high, "should" = medium, "may" = low. Identifies evidence needed for each action. Use this after identifying relevant sections via search_regulations. Output: { regulation, action_items: [{ section, title, priority, action, evidence_needed }] }. Do not use this for discovery — use search_regulations or check_applicability first.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA", "GLBA")',
        },
        sections: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 20,
          description: 'Section numbers to generate action items for (1-20 sections). Example: ["164.308(a)(1)(ii)(A)", "164.312(b)"]',
        },
      },
      required: ['regulation', 'sections'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await getComplianceActionItems(db, args as ActionItemsInput);
    },
  },
  {
    name: 'get_breach_notification_timeline',
    description: 'Query breach notification deadlines across federal and state jurisdictions. Returns notification timelines, who must be notified (individuals, regulators, media), penalties, and trigger thresholds. Covers 4 federal laws (HIPAA, GLBA, FERPA, COPPA) and 9 state jurisdictions. Call with no parameters to get all jurisdictions. Output: { rules: [{ jurisdiction, regulation, timeline, notify_individuals, notify_regulators, notify_media, penalty, threshold }], total_results }. Use compare_requirements for topical comparison across regulations instead.',
    inputSchema: {
      type: 'object',
      properties: {
        state: {
          type: 'string',
          description: 'State or jurisdiction name (e.g., "California", "New York", "Federal"). Omit to return all jurisdictions.',
        },
        regulation: {
          type: 'string',
          description: 'Filter by regulation (e.g., "HIPAA", "CCPA"). Omit to return all regulations.',
        },
      },
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await getBreachNotificationTimeline(db, args as BreachNotificationInput);
    },
  },
  // --- Premium tools: version tracking ---
  {
    name: 'get_section_history',
    description:
      'Get the full version timeline for a specific regulation section, showing all amendments with dates and change summaries. ' +
      'Premium feature — requires Ansvar Intelligence Portal.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA", "SOX"). Use list_regulations to see valid IDs.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.502", "1798.100").',
        },
      },
      required: ['regulation', 'section'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await getSectionHistory(db, args as GetSectionHistoryInput);
    },
  },
  {
    name: 'diff_section',
    description:
      'Show what changed in a specific regulation section between two dates, including a unified diff and change summary. ' +
      'Premium feature — requires Ansvar Intelligence Portal.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA").',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.502", "1798.100").',
        },
        from_date: {
          type: 'string',
          description: 'ISO date to diff from (e.g., "2024-01-01").',
        },
        to_date: {
          type: 'string',
          description: 'ISO date to diff to (defaults to current). E.g., "2025-12-31".',
        },
      },
      required: ['regulation', 'section', 'from_date'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await diffSection(db, args as DiffSectionInput);
    },
  },
  {
    name: 'get_recent_changes',
    description:
      'List all regulation sections that changed since a given date, with change summaries. Optionally filter to a specific regulation. ' +
      'Premium feature — requires Ansvar Intelligence Portal.',
    inputSchema: {
      type: 'object',
      properties: {
        since: {
          type: 'string',
          description: 'ISO date (e.g., "2024-06-01").',
        },
        regulation: {
          type: 'string',
          description: 'Filter to a specific regulation (e.g., "HIPAA"). Omit for all.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum changes to return. Default: 50, max: 200.',
          default: 50,
          minimum: 1,
          maximum: 200,
        },
      },
      required: ['since'],
    },
    handler: async (db: InstanceType<typeof Database>, args: any) => {
      return await getRecentChanges(db, args as GetRecentChangesInput);
    },
  },
];

function createAboutTool(context: AboutContext): ToolDefinition {
  return {
    name: 'about',
    description:
      'Server metadata, dataset statistics, data freshness, and provenance information. ' +
      'Call this first in any session to verify data coverage, currency (last update check date), ' +
      'and content basis before relying on results for compliance decisions. ' +
      'Output: { server, version, dataset: { regulations, sections, built, freshness }, provenance }.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (db) => {
      return await getAbout(db, context);
    },
  };
}

export function buildTools(context: AboutContext): ToolDefinition[] {
  return [...TOOLS, createAboutTool(context)];
}

/**
 * Register all tools with an MCP server instance.
 * Use this for both stdio and HTTP servers to ensure parity.
 */
export function registerTools(server: Server, db: InstanceType<typeof Database>, context?: AboutContext): void {
  const allTools = annotateTools(context ? buildTools(context) : TOOLS);
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    })),
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = allTools.find(t => t.name === name);

    if (!tool) {
      const available = allTools.map(t => t.name).join(', ');
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}. Available tools: ${available}` }],
        isError: true,
      };
    }

    try {
      const result = await tool.handler(db, args || {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });
}
