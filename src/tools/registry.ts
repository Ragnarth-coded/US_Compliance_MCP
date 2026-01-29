import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { searchRegulations, SearchInput } from './search.js';
import { getSection, GetSectionInput } from './section.js';
import { listRegulations, ListInput } from './list.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (db: Database.Database, args: any) => Promise<any>;
}

/**
 * Centralized registry of all MCP tools.
 * Single source of truth for both stdio and HTTP servers.
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: 'search_regulations',
    description: 'Search across all US regulations using full-text search. Returns relevant sections with highlighted snippets. Token-efficient: returns 32-token snippets with >>> <<< markers around matched terms.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (supports natural language and technical terms)',
        },
        regulations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Filter results to specific regulations (e.g., ["HIPAA", "CCPA"])',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10, max: 1000)',
          default: 10,
        },
      },
      required: ['query'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await searchRegulations(db, args as SearchInput);
    },
  },
  {
    name: 'get_section',
    description: 'Retrieve the full text of a specific regulation section. Returns section content, metadata, and cross-references. Large sections are automatically truncated with a warning.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Regulation ID (e.g., "HIPAA", "CCPA")',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "164.502", "1798.100")',
        },
      },
      required: ['regulation', 'section'],
    },
    handler: async (db: Database.Database, args: any) => {
      return await getSection(db, args as GetSectionInput);
    },
  },
  {
    name: 'list_regulations',
    description: 'List all available regulations or get the structure of a specific regulation. Without parameters, returns all regulations with metadata. With a regulation ID, returns chapters and sections organized hierarchically.',
    inputSchema: {
      type: 'object',
      properties: {
        regulation: {
          type: 'string',
          description: 'Optional: Regulation ID to get detailed structure for (e.g., "HIPAA")',
        },
      },
    },
    handler: async (db: Database.Database, args: any) => {
      return await listRegulations(db, args as ListInput);
    },
  },
];

/**
 * Register all tools with an MCP server instance.
 * Use this for both stdio and HTTP servers to ensure parity.
 */
export function registerTools(server: Server, db: Database.Database): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = TOOLS.find(t => t.name === name);

    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
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
