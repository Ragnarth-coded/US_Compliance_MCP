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
import {
  createHipaaAdapter,
  createGlbaAdapter,
  createFerpaAdapter,
  createCoppaAdapter,
  createFdaAdapter,
  createEpaRmpAdapter
} from '../src/ingest/adapters/ecfr.js';
import { createCcpaAdapter } from '../src/ingest/adapters/california-leginfo.js';
import { createSoxAdapter } from '../src/ingest/adapters/regulations-gov.js';
import { createFfiecAdapter } from '../src/ingest/adapters/ffiec.js';
import { createNydfsAdapter } from '../src/ingest/adapters/nydfs.js';
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

    // Fetch all data first (async operations)
    console.log(`  Fetching metadata...`);
    const metadata = await adapter.fetchMetadata();

    console.log(`  Fetching sections...`);
    const allSections: typeof sectionBatch = [];
    for await (const sectionBatch of adapter.fetchSections()) {
      allSections.push(...sectionBatch);
      console.log(`    ${allSections.length} sections...`);
    }

    console.log(`  Fetching definitions...`);
    const definitions = await adapter.extractDefinitions();

    // Then insert everything in one synchronous transaction
    console.log(`  Writing to database...`);
    const insertTransaction = db.transaction(() => {
      // 1. Insert regulation metadata
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

      // 2. Insert sections
      const insertSection = db.prepare(`
        INSERT OR REPLACE INTO sections
        (regulation, section_number, title, text, part, subpart, chapter, parent_section, cross_references)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const section of allSections) {
        insertSection.run(
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

      // 3. Insert definitions
      const insertDef = db.prepare(`
        INSERT OR REPLACE INTO definitions (regulation, term, definition, section)
        VALUES (?, ?, ?, ?)
      `);

      for (const def of definitions) {
        insertDef.run(regulationId, def.term, def.definition, def.section);
        definitionsAdded++;
      }

      // 4. Update source registry
      db.prepare(`
        INSERT OR REPLACE INTO source_registry
        (regulation, source_type, source_url, last_fetched, sections_expected, sections_parsed, quality_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        regulationId,
        'api',
        metadata.source_url,
        new Date().toISOString(),
        sectionsAdded,
        sectionsAdded,
        sectionsAdded > 0 ? 'complete' : 'incomplete'
      );
    });

    // Execute transaction
    insertTransaction();

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
 * All regulations to ingest
 * Adding new regulations: add import + entry to this array
 */
const REGULATIONS = [
  { id: 'HIPAA', adapter: createHipaaAdapter() },
  { id: 'CCPA', adapter: createCcpaAdapter() },
  { id: 'SOX', adapter: createSoxAdapter() },
  { id: 'GLBA', adapter: createGlbaAdapter() },
  { id: 'FERPA', adapter: createFerpaAdapter() },
  { id: 'COPPA', adapter: createCoppaAdapter() },
  { id: 'FDA_CFR_11', adapter: createFdaAdapter() },
  { id: 'EPA_RMP', adapter: createEpaRmpAdapter() },
  { id: 'FFIEC', adapter: createFfiecAdapter() },
  { id: 'NYDFS_500', adapter: createNydfsAdapter() },
];

/**
 * Main ingestion function
 */
async function ingestAll(): Promise<IngestResult[]> {
  const db = Database(DB_PATH);
  const results: IngestResult[] = [];

  console.log(`🚀 Ingesting ${REGULATIONS.length} regulations...\n`);

  // Sequential ingestion for now
  for (const { id, adapter } of REGULATIONS) {
    const result = await ingestRegulation(db, id, adapter);
    results.push(result);
  }

  db.close();

  // Summary report
  console.log('\n📊 Ingestion Summary:');
  console.log('━'.repeat(60));

  let totalSections = 0;
  let totalDefinitions = 0;
  let successCount = 0;

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const secStr = `${r.sections_added} sections`.padEnd(15);
    const defStr = `${r.definitions_added} defs`.padEnd(10);
    const timeStr = `${r.duration_ms}ms`;

    console.log(`${status} ${r.regulation.padEnd(12)} ${secStr} ${defStr} ${timeStr}`);

    if (r.success) {
      successCount++;
      totalSections += r.sections_added;
      totalDefinitions += r.definitions_added;
    } else {
      console.error(`   Error: ${r.error}`);
    }
  });

  console.log('━'.repeat(60));
  console.log(`Total: ${successCount}/${results.length} regulations, ${totalSections} sections, ${totalDefinitions} definitions`);

  // Exit with error if any failed
  if (successCount < results.length) {
    console.error('\n❌ Some regulations failed to ingest');
    process.exit(1);
  }

  console.log('\n✅ All regulations ingested successfully!');

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
