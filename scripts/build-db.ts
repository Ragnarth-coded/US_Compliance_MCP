#!/usr/bin/env npx tsx

/**
 * Build the regulations.db SQLite database for US regulations.
 * Run with: npm run build:db
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const SEED_DIR = join(DATA_DIR, 'seed');
const DB_PATH = join(DATA_DIR, 'regulations.db');

const SCHEMA = `
-- Core regulation metadata
CREATE TABLE IF NOT EXISTS regulations (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  short_name TEXT,
  citation TEXT NOT NULL,
  effective_date TEXT,
  last_amended TEXT,
  source_url TEXT,
  jurisdiction TEXT,
  regulation_type TEXT
);

-- Sections table (equivalent to articles in EU regulations)
CREATE TABLE IF NOT EXISTS sections (
  rowid INTEGER PRIMARY KEY,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  section_number TEXT NOT NULL,
  title TEXT,
  text TEXT NOT NULL,
  part TEXT,
  subpart TEXT,
  chapter TEXT,
  parent_section TEXT,
  cross_references TEXT,
  UNIQUE(regulation, section_number)
);

-- FTS5 virtual table for full-text search with Porter stemming
CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
  regulation,
  section_number,
  title,
  text,
  content='sections',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- FTS5 triggers
CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
  INSERT INTO sections_fts(rowid, regulation, section_number, title, text)
  VALUES (new.rowid, new.regulation, new.section_number, new.title, new.text);
END;

CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, regulation, section_number, title, text)
  VALUES('delete', old.rowid, old.regulation, old.section_number, old.title, old.text);
END;

CREATE TRIGGER IF NOT EXISTS sections_au AFTER UPDATE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, regulation, section_number, title, text)
  VALUES('delete', old.rowid, old.regulation, old.section_number, old.title, old.text);
  INSERT INTO sections_fts(rowid, regulation, section_number, title, text)
  VALUES (new.rowid, new.regulation, new.section_number, new.title, new.text);
END;

-- Definitions
CREATE TABLE IF NOT EXISTS definitions (
  id INTEGER PRIMARY KEY,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  section TEXT NOT NULL,
  UNIQUE(regulation, term)
);

-- Control mappings (e.g., to NIST, ISO, etc.)
CREATE TABLE IF NOT EXISTS control_mappings (
  id INTEGER PRIMARY KEY,
  framework TEXT NOT NULL DEFAULT 'NIST_CSF',
  control_id TEXT NOT NULL,
  control_name TEXT NOT NULL,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  sections TEXT NOT NULL,
  coverage TEXT CHECK(coverage IN ('full', 'partial', 'related')),
  notes TEXT,
  confidence INTEGER,
  generated_by TEXT,
  UNIQUE(framework, control_id, regulation, sections)
);

-- Applicability rules (which sectors/industries each regulation applies to)
CREATE TABLE IF NOT EXISTS applicability_rules (
  id INTEGER PRIMARY KEY,
  regulation TEXT NOT NULL REFERENCES regulations(id),
  sector TEXT NOT NULL,
  subsector TEXT,
  applies INTEGER NOT NULL,
  confidence TEXT CHECK(confidence IN ('definite', 'likely', 'possible')),
  basis_section TEXT,
  notes TEXT,
  rationale TEXT,
  UNIQUE(regulation, sector, subsector)
);

-- Breach notification rules (state and federal)
CREATE TABLE IF NOT EXISTS breach_notification_rules (
  id INTEGER PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  regulation TEXT NOT NULL,
  notification_deadline TEXT NOT NULL,
  notify_individuals INTEGER NOT NULL DEFAULT 1,
  notify_regulator INTEGER NOT NULL DEFAULT 1,
  notify_media INTEGER NOT NULL DEFAULT 0,
  regulator_name TEXT,
  threshold TEXT,
  penalties TEXT,
  notes TEXT,
  UNIQUE(jurisdiction, regulation)
);

-- Source registry for tracking data quality
CREATE TABLE IF NOT EXISTS source_registry (
  regulation TEXT PRIMARY KEY REFERENCES regulations(id),
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  api_endpoint TEXT,
  last_fetched TEXT,
  sections_expected INTEGER,
  sections_parsed INTEGER,
  quality_status TEXT CHECK(quality_status IN ('complete', 'review', 'incomplete')),
  notes TEXT
);
`;

interface RegulationSeed {
  regulation: {
    id: string;
    full_name: string;
    short_name?: string;
    citation: string;
    effective_date?: string;
    source_url?: string;
    jurisdiction?: string;
    regulation_type?: string;
  };
  source?: {
    official_url?: string;
    publisher?: string;
    last_verified?: string;
    verification_method?: string;
    disclaimer?: string;
  };
  sections: Array<{
    sectionNumber: string;
    title?: string;
    text: string;
    part?: string;
    subpart?: string;
    chapter?: string;
    parent_section?: string;
    cross_references?: string[];
  }>;
  definitions?: Array<{
    term: string;
    definition: string;
    section: string;
  }>;
}

function buildDatabase() {
  console.log('Building US regulations database...');

  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // Delete existing database
  if (existsSync(DB_PATH)) {
    console.log('Removing existing database...');
    unlinkSync(DB_PATH);
  }

  // Create new database
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Create schema
  console.log('Creating schema...');
  db.exec(SCHEMA);

  // Load and insert seed files
  if (existsSync(SEED_DIR)) {
    const seedFiles = readdirSync(SEED_DIR).filter((f: string) => f.endsWith('.json'));

    for (const file of seedFiles) {
      if (file.startsWith('mappings') || file.startsWith('breach-notification') || file.startsWith('applicability')) continue;

      console.log(`Loading ${file}...`);
      let seedData: RegulationSeed;
      try {
        const content = readFileSync(join(SEED_DIR, file), 'utf-8');
        seedData = JSON.parse(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to parse ${file}: ${message}`);
        throw error;
      }
      const reg = seedData.regulation;

      // Insert regulation
      db.prepare(`
        INSERT INTO regulations (id, full_name, short_name, citation, effective_date, source_url, jurisdiction, regulation_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reg.id,
        reg.full_name,
        reg.short_name || null,
        reg.citation,
        reg.effective_date || null,
        seedData.source?.official_url || reg.source_url || null,
        reg.jurisdiction || null,
        reg.regulation_type || null
      );

      // Insert sections
      const insertSection = db.prepare(`
        INSERT INTO sections (regulation, section_number, title, text, part, subpart, chapter, parent_section, cross_references)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const section of seedData.sections) {
        insertSection.run(
          reg.id,
          section.sectionNumber,
          section.title || null,
          section.text,
          section.part || null,
          section.subpart || null,
          section.chapter || null,
          section.parent_section || null,
          section.cross_references ? JSON.stringify(section.cross_references) : null
        );
      }

      // Insert definitions
      if (seedData.definitions) {
        const insertDefinition = db.prepare(`
          INSERT OR IGNORE INTO definitions (regulation, term, definition, section)
          VALUES (?, ?, ?, ?)
        `);

        for (const def of seedData.definitions) {
          insertDefinition.run(reg.id, def.term, def.definition, def.section);
        }
      }

      // Update source registry with timestamps
      const now = new Date().toISOString();
      const sourceUrl = seedData.source?.official_url || reg.source_url || '';
      const sourceType = sourceUrl.includes('api') ? 'api' : sourceUrl.includes('.pdf') ? 'pdf' : 'seed';
      db.prepare(`
        INSERT INTO source_registry (regulation, source_type, source_url, api_endpoint, last_fetched, sections_expected, sections_parsed, quality_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'complete')
      `).run(
        reg.id,
        sourceType,
        sourceUrl,
        sourceUrl.includes('api') ? sourceUrl : null,
        now,
        seedData.sections.length,
        seedData.sections.length
      );

      console.log(`  Loaded ${seedData.sections.length} sections, ${seedData.definitions?.length || 0} definitions`);
    }

    // Note: Control mappings and applicability rules are loaded separately
    // using scripts/load-seed-data.ts after data ingestion
    console.log('\nNote: Run "npm run load-seed" to load control mappings and applicability rules');
  } else {
    console.log('No seed directory found. Database created with empty tables.');
    console.log(`Create seed files in: ${SEED_DIR}`);
  }

  db.close();
  console.log(`\nDatabase created at: ${DB_PATH}`);
}

buildDatabase();
