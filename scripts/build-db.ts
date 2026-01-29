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

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
  regulation,
  section_number,
  title,
  text,
  content='sections',
  content_rowid='rowid'
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
  notes TEXT
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
  notes TEXT
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
  id: string;
  full_name: string;
  short_name?: string;
  citation: string;
  effective_date?: string;
  source_url?: string;
  jurisdiction?: string;
  regulation_type?: string;
  sections: Array<{
    number: string;
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
      if (file.startsWith('mappings')) continue;

      console.log(`Loading ${file}...`);
      const content = readFileSync(join(SEED_DIR, file), 'utf-8');
      const regulation: RegulationSeed = JSON.parse(content);

      // Insert regulation
      db.prepare(`
        INSERT INTO regulations (id, full_name, short_name, citation, effective_date, source_url, jurisdiction, regulation_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        regulation.id,
        regulation.full_name,
        regulation.short_name || null,
        regulation.citation,
        regulation.effective_date || null,
        regulation.source_url || null,
        regulation.jurisdiction || null,
        regulation.regulation_type || null
      );

      // Insert sections
      const insertSection = db.prepare(`
        INSERT INTO sections (regulation, section_number, title, text, part, subpart, chapter, parent_section, cross_references)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const section of regulation.sections) {
        insertSection.run(
          regulation.id,
          section.number,
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
      if (regulation.definitions) {
        const insertDefinition = db.prepare(`
          INSERT OR IGNORE INTO definitions (regulation, term, definition, section)
          VALUES (?, ?, ?, ?)
        `);

        for (const def of regulation.definitions) {
          insertDefinition.run(regulation.id, def.term, def.definition, def.section);
        }
      }

      // Update source registry with timestamps
      const now = new Date().toISOString();
      const sourceType = regulation.source_url?.includes('api') ? 'api' : regulation.source_url?.includes('.pdf') ? 'pdf' : 'html';
      db.prepare(`
        INSERT INTO source_registry (regulation, source_type, source_url, api_endpoint, last_fetched, sections_expected, sections_parsed, quality_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'complete')
      `).run(
        regulation.id,
        sourceType,
        regulation.source_url || '',
        regulation.source_url?.includes('api') ? regulation.source_url : null,
        now,
        regulation.sections.length,
        regulation.sections.length
      );

      console.log(`  Loaded ${regulation.sections.length} sections, ${regulation.definitions?.length || 0} definitions`);
    }

    // Load mappings
    const mappingsDir = join(SEED_DIR, 'mappings');
    if (existsSync(mappingsDir)) {
      const mappingFiles = readdirSync(mappingsDir).filter((f: string) => f.endsWith('.json'));

      for (const file of mappingFiles) {
        console.log(`Loading mappings from ${file}...`);
        const content = readFileSync(join(mappingsDir, file), 'utf-8');
        const mappings = JSON.parse(content);

        // Detect framework from filename
        let framework = 'NIST_CSF';
        if (file.startsWith('nist-csf-')) {
          framework = 'NIST_CSF';
        } else if (file.startsWith('iso27001-')) {
          framework = 'ISO27001';
        } else if (file.startsWith('nist-800-53-')) {
          framework = 'NIST_800_53';
        }

        const insertMapping = db.prepare(`
          INSERT INTO control_mappings (framework, control_id, control_name, regulation, sections, coverage, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const mapping of mappings) {
          insertMapping.run(
            framework,
            mapping.control_id,
            mapping.control_name,
            mapping.regulation,
            JSON.stringify(mapping.sections),
            mapping.coverage,
            mapping.notes || null
          );
        }

        console.log(`  Loaded ${mappings.length} ${framework} control mappings`);
      }
    }

    // Load applicability rules
    const applicabilityDir = join(SEED_DIR, 'applicability');
    if (existsSync(applicabilityDir)) {
      const applicabilityFiles = readdirSync(applicabilityDir).filter((f: string) => f.endsWith('.json'));

      const insertApplicability = db.prepare(`
        INSERT INTO applicability_rules (regulation, sector, subsector, applies, confidence, basis_section, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const file of applicabilityFiles) {
        console.log(`Loading applicability rules from ${file}...`);
        const content = readFileSync(join(applicabilityDir, file), 'utf-8');
        const rules = JSON.parse(content);

        for (const rule of rules) {
          insertApplicability.run(
            rule.regulation,
            rule.sector,
            rule.subsector || null,
            rule.applies ? 1 : 0,
            rule.confidence,
            rule.basis_section || null,
            rule.notes || null
          );
        }

        console.log(`  Loaded ${rules.length} applicability rules`);
      }
    }
  } else {
    console.log('No seed directory found. Database created with empty tables.');
    console.log(`Create seed files in: ${SEED_DIR}`);
  }

  db.close();
  console.log(`\nDatabase created at: ${DB_PATH}`);
}

buildDatabase();
