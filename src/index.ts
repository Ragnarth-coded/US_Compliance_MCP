#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Database from '@ansvar/mcp-sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { readFileSync, statSync } from 'fs';

import { registerTools } from './tools/registry.js';
import { registerPrompts } from './tools/prompts.js';
import { registerResources } from './tools/resources.js';
import type { AboutContext } from './tools/about.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path - look for regulations.db in data folder
const DB_PATH = process.env.US_COMPLIANCE_DB_PATH || join(__dirname, '..', 'data', 'regulations.db');
const PKG_PATH = join(__dirname, '..', 'package.json');
const pkgVersion: string = JSON.parse(readFileSync(PKG_PATH, 'utf-8')).version;

function getDatabase(): InstanceType<typeof Database> {
  try {
    return new Database(DB_PATH, { readonly: true });
  } catch (error) {
    throw new Error(`Failed to open database at ${DB_PATH}: ${error}`);
  }
}

function computeAboutContext(): AboutContext {
  let fingerprint = 'unknown';
  let dbBuilt = new Date().toISOString();
  try {
    const dbBuffer = readFileSync(DB_PATH);
    fingerprint = createHash('sha256').update(dbBuffer).digest('hex').slice(0, 12);
    const dbStat = statSync(DB_PATH);
    dbBuilt = dbStat.mtime.toISOString();
  } catch {
    // Non-fatal
  }
  return { version: pkgVersion, fingerprint, dbBuilt };
}

const aboutContext = computeAboutContext();
const db = getDatabase();
const server = new Server(
  {
    name: 'us-regulations-mcp',
    version: pkgVersion,
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
registerTools(server, db, aboutContext);
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
