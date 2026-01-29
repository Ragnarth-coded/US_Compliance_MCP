#!/usr/bin/env npx tsx

/**
 * Ingestion Orchestrator
 *
 * Coordinates all three regulation adapters (HIPAA, CCPA, SOX) to populate the database.
 * Run with: npx tsx scripts/ingest.ts
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHipaaAdapter } from '../src/ingest/adapters/ecfr.js';
import { createCcpaAdapter } from '../src/ingest/adapters/california-leginfo.js';
import { createSoxAdapter } from '../src/ingest/adapters/regulations-gov.js';
import type { SourceAdapter } from '../src/ingest/framework.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');

interface IngestResult {
  regulation: string;
  success: boolean;
  sections_added: number;
  definitions_added: number;
  error?: string;
  duration_ms: number;
}

/**
 * Ingest a single regulation
 */
async function ingestRegulation(
  db: Database.Database,
  regulationId: string,
  adapter: SourceAdapter
): Promise<IngestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n📥 Ingesting ${regulationId}...`);

    let sectionsAdded = 0;
    let definitionsAdded = 0;

    // One transaction per regulation (isolated failure)
    await db.transaction(async () => {
      // 1. Insert regulation metadata
      console.log(`  Fetching metadata...`);
      const metadata = await adapter.fetchMetadata();

      db.prepare(`
        INSERT OR REPLACE INTO regulations
        (id, full_name, short_name, citation, effective_date, last_amended, source_url, jurisdiction, regulation_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        metadata.id,
        metadata.full_name,
        null, // short_name
        metadata.citation,
        metadata.effective_date,
        metadata.last_amended,
        metadata.source_url,
        metadata.jurisdiction,
        metadata.regulation_type
      );

      // 2. Insert sections (streaming)
      console.log(`  Fetching sections...`);
      for await (const sectionBatch of adapter.fetchSections()) {
        for (const section of sectionBatch) {
          db.prepare(`
            INSERT OR REPLACE INTO sections
            (regulation, section_number, title, text, part, subpart, chapter, parent_section, cross_references)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            regulationId,
            section.sectionNumber,
            section.title || null,
            section.text,
            null, // part (deprecated, using chapter)
            null, // subpart (deprecated, using chapter)
            section.chapter || null,
            section.parentSection || null,
            section.crossReferences ? JSON.stringify(section.crossReferences) : null
          );
          sectionsAdded++;
        }
        console.log(`    ${sectionsAdded} sections...`);
      }

      // 3. Insert definitions
      console.log(`  Fetching definitions...`);
      const definitions = await adapter.extractDefinitions();
      for (const def of definitions) {
        db.prepare(`
          INSERT OR REPLACE INTO definitions (regulation, term, definition, section)
          VALUES (?, ?, ?, ?)
        `).run(regulationId, def.term, def.definition, def.section);
        definitionsAdded++;
      }

      // 4. Update source registry
      db.prepare(`
        INSERT OR REPLACE INTO source_registry
        (regulation, last_fetched, last_modified, sections_count, source_url)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        regulationId,
        new Date().toISOString(),
        metadata.last_amended,
        sectionsAdded,
        metadata.source_url
      );
    })();

    const duration = Date.now() - startTime;

    console.log(`✅ ${regulationId}: ${sectionsAdded} sections, ${definitionsAdded} definitions (${duration}ms)`);

    return {
      regulation: regulationId,
      success: true,
      sections_added: sectionsAdded,
      definitions_added: definitionsAdded,
      duration_ms: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`❌ ${regulationId} failed: ${errorMessage}`);

    return {
      regulation: regulationId,
      success: false,
      sections_added: 0,
      definitions_added: 0,
      error: errorMessage,
      duration_ms: duration,
    };
  }
}

/**
 * Main ingestion function
 */
async function ingestAll(): Promise<IngestResult[]> {
  console.log('🚀 Starting US Compliance MCP Ingestion...\n');
  console.log(`Database: ${DB_PATH}`);

  const db = Database(DB_PATH);
  const results: IngestResult[] = [];

  const adapters: Array<{ id: string; adapter: SourceAdapter }> = [
    { id: 'HIPAA', adapter: createHipaaAdapter() },
    { id: 'CCPA', adapter: createCcpaAdapter() },
    { id: 'SOX', adapter: createSoxAdapter() },
  ];

  for (const { id, adapter } of adapters) {
    const result = await ingestRegulation(db, id, adapter);
    results.push(result);
  }

  db.close();

  console.log('\n📊 Ingestion Summary:');
  console.table(
    results.map(r => ({
      Regulation: r.regulation,
      Status: r.success ? '✅ Success' : '❌ Failed',
      Sections: r.sections_added,
      Definitions: r.definitions_added,
      'Duration (s)': (r.duration_ms / 1000).toFixed(2),
      Error: r.error || '-',
    }))
  );

  const totalSections = results.reduce((sum, r) => sum + r.sections_added, 0);
  const successCount = results.filter(r => r.success).length;

  console.log(`\n✨ Total: ${totalSections} sections from ${successCount}/${adapters.length} regulations`);

  return results;
}

// Run if executed directly
ingestAll()
  .then(results => {
    const allSuccess = results.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
