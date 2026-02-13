#!/usr/bin/env node

/**
 * REST API Server for US Compliance MCP
 *
 * Provides OpenAPI-compatible REST endpoints for Copilot/Teams integration.
 * Uses the same tool handlers as the MCP server.
 */

import express from 'express';
import cors from 'cors';
import Database from '@ansvar/mcp-sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { searchRegulations } from './tools/search.js';
import { getSection } from './tools/section.js';
import { listRegulations } from './tools/list.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = process.env.US_COMPLIANCE_DB_PATH || join(__dirname, '..', 'data', 'regulations.db');
const PORT = parseInt(process.env.PORT || '3000', 10);

let db: InstanceType<typeof Database>;

function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

async function main() {
  const database = getDatabase();
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: { connected: true, type: 'sqlite' },
      service: 'us-regulations-api',
      version: '1.2.5'
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'us-regulations-api',
      version: '1.2.5',
      database: 'sqlite',
      endpoints: {
        health: '/health',
        search: 'POST /api/search',
        section: 'GET /api/sections/:regulation/:section',
        listRegulations: 'GET /api/regulations',
        getRegulation: 'GET /api/regulations/:regulation'
      }
    });
  });

  // Search regulations
  app.post('/api/search', async (req, res) => {
    try {
      const { query, regulations, limit = 10 } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Query parameter is required'
        });
      }

      const result = await searchRegulations(database, { query, regulations, limit });
      res.json(result);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Get specific section
  app.get('/api/sections/:regulation/:section', async (req, res) => {
    try {
      const { regulation, section } = req.params;
      const result = await getSection(database, {
        regulation: regulation.toUpperCase(),
        section
      });

      if (!result) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Section ${section} not found in ${regulation}`
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get section error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // List all regulations
  app.get('/api/regulations', async (req, res) => {
    try {
      const result = await listRegulations(database, {});
      res.json(result);
    } catch (error) {
      console.error('List regulations error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Get specific regulation structure
  app.get('/api/regulations/:regulation', async (req, res) => {
    try {
      const { regulation } = req.params;
      const result = await listRegulations(database, {
        regulation: regulation.toUpperCase()
      });

      if (!result.structure) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Regulation ${regulation} not found`
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get regulation error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('✅ US Regulations API Server running');
    console.log('='.repeat(60));
    console.log(`Port: ${PORT}`);
    console.log(`Database: ${DB_PATH}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log('='.repeat(60));
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    if (db) db.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
