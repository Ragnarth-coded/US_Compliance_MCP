import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { searchRegulations, SearchInput } from './search.js';

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
