import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  getMessages: (args: Record<string, string>) => Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
}

/**
 * MCP Prompts encode multi-step compliance workflows.
 * These guide AI agents through structured assessment processes.
 */
export const PROMPTS: PromptDefinition[] = [
  {
    name: 'compliance_assessment',
    description: 'Guided compliance assessment for a specific industry sector. Walks through: applicability check, regulation identification, key requirements search, and action item generation.',
    arguments: [
      {
        name: 'sector',
        description: 'Industry sector (e.g., "healthcare", "financial", "technology", "retail")',
        required: true,
      },
      {
        name: 'focus_area',
        description: 'Optional compliance focus area (e.g., "data protection", "breach notification", "access controls")',
        required: false,
      },
    ],
    getMessages: (args) => {
      const sector = args.sector || 'technology';
      const focusArea = args.focus_area;

      let prompt = `Perform a US regulatory compliance assessment for the "${sector}" sector.\n\n`;
      prompt += `Follow these steps using the available tools:\n\n`;
      prompt += `1. **Identify Applicable Regulations**: Use \`check_applicability\` with sector="${sector}" to determine which US regulations apply.\n\n`;
      prompt += `2. **List Regulations**: Use \`list_regulations\` to get the full list of available regulations and their structure.\n\n`;

      if (focusArea) {
        prompt += `3. **Search Requirements**: Use \`search_regulations\` with query="${focusArea}" to find relevant provisions across all applicable regulations.\n\n`;
        prompt += `4. **Compare Across Regulations**: Use \`compare_requirements\` with topic="${focusArea}" and the applicable regulations to identify gaps and overlaps.\n\n`;
      } else {
        prompt += `3. **Search Key Areas**: Use \`search_regulations\` to search for key compliance topics like "data protection", "breach notification", "access controls", and "encryption" across applicable regulations.\n\n`;
        prompt += `4. **Compare Requirements**: Use \`compare_requirements\` to compare the applicable regulations on the most critical topics.\n\n`;
      }

      prompt += `5. **Check Breach Notification**: Use \`get_breach_notification_timeline\` to understand notification deadlines for the relevant jurisdictions.\n\n`;
      prompt += `6. **Generate Action Items**: For key sections identified, use \`get_compliance_action_items\` to generate prioritized tasks.\n\n`;
      prompt += `7. **Identify Evidence Needs**: For the most critical sections, use \`get_evidence_requirements\` to identify audit artifacts needed.\n\n`;
      prompt += `Provide a structured compliance report with findings organized by regulation and priority.`;

      return [
        {
          role: 'user',
          content: { type: 'text', text: prompt },
        },
      ];
    },
  },
  {
    name: 'regulation_comparison',
    description: 'Compare two or more regulations on a specific topic. Identifies overlaps, gaps, and differences in requirements.',
    arguments: [
      {
        name: 'regulations',
        description: 'Comma-separated regulation IDs (e.g., "HIPAA,CCPA,SOX")',
        required: true,
      },
      {
        name: 'topic',
        description: 'Topic to compare (e.g., "breach notification", "encryption", "access controls")',
        required: true,
      },
    ],
    getMessages: (args) => {
      const regulations = (args.regulations || '').split(',').map(r => r.trim());
      const topic = args.topic || 'data protection';

      let prompt = `Compare the following US regulations on the topic of "${topic}": ${regulations.join(', ')}.\n\n`;
      prompt += `Steps:\n`;
      prompt += `1. Use \`compare_requirements\` with topic="${topic}" and regulations=[${regulations.map(r => `"${r}"`).join(', ')}]\n`;
      prompt += `2. For each regulation with matches, use \`get_section\` to read the full text of the most relevant sections\n`;
      prompt += `3. Use \`get_definitions\` to check if key terms are defined differently across regulations\n`;
      prompt += `4. Use \`get_breach_notification_timeline\` if the topic relates to breach notification\n\n`;
      prompt += `Provide a comparison matrix showing:\n`;
      prompt += `- Which regulations address this topic\n`;
      prompt += `- Key differences in scope, stringency, and penalties\n`;
      prompt += `- Common requirements across all\n`;
      prompt += `- Unique requirements in each regulation`;

      return [
        {
          role: 'user',
          content: { type: 'text', text: prompt },
        },
      ];
    },
  },
  {
    name: 'breach_readiness_check',
    description: 'Assess breach notification readiness across all applicable jurisdictions. Reviews notification deadlines, required parties to notify, and evidence needed.',
    arguments: [
      {
        name: 'jurisdictions',
        description: 'Optional: Comma-separated jurisdictions (e.g., "Federal,California,New York"). Leave empty for all.',
        required: false,
      },
    ],
    getMessages: (args) => {
      const jurisdictions = args.jurisdictions
        ? args.jurisdictions.split(',').map(j => j.trim())
        : null;

      let prompt = `Perform a breach notification readiness assessment`;
      if (jurisdictions) {
        prompt += ` for: ${jurisdictions.join(', ')}`;
      }
      prompt += `.\n\n`;
      prompt += `Steps:\n`;
      prompt += `1. Use \`get_breach_notification_timeline\`${jurisdictions ? ` for each jurisdiction (${jurisdictions.join(', ')})` : ' without filters to get all jurisdictions'}\n`;
      prompt += `2. Use \`search_regulations\` with query="breach notification" to find all breach-related provisions\n`;
      prompt += `3. For the strictest deadline, use \`get_section\` to read the full requirements\n`;
      prompt += `4. Use \`get_evidence_requirements\` for the breach notification sections to identify what documentation is needed\n\n`;
      prompt += `Provide:\n`;
      prompt += `- A timeline table sorted by notification deadline (strictest first)\n`;
      prompt += `- Required notification recipients for each jurisdiction\n`;
      prompt += `- Key thresholds that trigger notification\n`;
      prompt += `- Evidence/documentation checklist for breach preparedness`;

      return [
        {
          role: 'user',
          content: { type: 'text', text: prompt },
        },
      ];
    },
  },
];

/**
 * Register MCP Prompts with the server.
 */
export function registerPrompts(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS.map(p => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const prompt = PROMPTS.find(p => p.name === name);

    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}. Available: ${PROMPTS.map(p => p.name).join(', ')}`);
    }

    return {
      description: prompt.description,
      messages: prompt.getMessages(args || {}),
    };
  });
}
