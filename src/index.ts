#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Database from '@ansvar/mcp-sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { registerTools } from './tools/registry.js';
import { registerPrompts } from './tools/prompts.js';
import { registerResources } from './tools/resources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - look for regulations.db in data folder
const DB_PATH = process.env.US_COMPLIANCE_DB_PATH || join(__dirname, '..', 'data', 'regulations.db');

function getDatabase(): InstanceType<typeof Database> {
  try {
    return new Database(DB_PATH, { readonly: true });
  } catch (error) {
    throw new Error(`Failed to open database at ${DB_PATH}: ${error}`);
  }
}

const db = getDatabase();
const server = new Server(
  {
    name: 'us-regulations-mcp',
    version: '1.2.5',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
);

// Register all tools, prompts, and resources
registerTools(server, db);
registerPrompts(server);
registerResources(server, db);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('US Regulations MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
