#!/usr/bin/env npx tsx

/**
 * Load Seed Data
 *
 * Loads pre-generated control mappings and applicability rules into the database
 * Run with: npx tsx scripts/load-seed-data.ts
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');
const MAPPINGS_DIR = join(__dirname, '..', 'data', 'seed', 'mappings');
const APPLICABILITY_DIR = join(__dirname, '..', 'data', 'seed', 'applicability');

interface Mapping {
  section_number: string;
  control_id: string;
  control_name: string;
  coverage: 'full' | 'partial' | 'related';
  confidence: number;
  rationale: string;
  function?: string;
  category?: string;
  subcategory?: string;
}

interface ApplicabilityRule {
  regulation: string;
  sector: string;
  subsector: string | null;
  confidence: 'definite' | 'likely' | 'possible';
  rationale: string;
}

console.log('🌱 Loading seed data into database...\n');

const db = Database(DB_PATH);

// Load control mappings
console.log('📊 Loading control mappings...');
let totalMappings = 0;

const mappingFiles = readdirSync(MAPPINGS_DIR).filter(f => f.endsWith('.json'));

for (const file of mappingFiles) {
  const filePath = join(MAPPINGS_DIR, file);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log(`  ${file}: ${data.mappings.length} mappings`);

  const insertMapping = db.prepare(`
    INSERT OR REPLACE INTO control_mappings
    (framework, control_id, control_name, regulation, sections, coverage, notes, confidence, generated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const mapping of data.mappings as Mapping[]) {
      // For NIST CSF, construct control_id from function/category/subcategory
      const controlId = mapping.control_id ||
        (mapping.function && mapping.category ?
          `${mapping.function}.${mapping.category}${mapping.subcategory ? `.${mapping.subcategory}` : ''}` :
          'UNKNOWN');

      const controlName = mapping.control_name ||
        (mapping.category ? mapping.category : 'Unknown');

      insertMapping.run(
        data.framework,
        controlId,
        controlName,
        data.regulation,
        JSON.stringify([mapping.section_number]),
        mapping.coverage,
        mapping.rationale,
        mapping.confidence,
        data.generated_by
      );
      totalMappings++;
    }
  })();
}

console.log(`✅ Loaded ${totalMappings} control mappings\n`);

// Load applicability rules
console.log('🎯 Loading applicability rules...');
let totalRules = 0;

const applicabilityFiles = readdirSync(APPLICABILITY_DIR).filter(f => f.endsWith('.json'));

for (const file of applicabilityFiles) {
  const filePath = join(APPLICABILITY_DIR, file);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log(`  ${file}: ${data.rules.length} rules`);

  const insertRule = db.prepare(`
    INSERT OR REPLACE INTO applicability_rules
    (regulation, sector, subsector, applies, confidence, rationale)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const rule of data.rules as ApplicabilityRule[]) {
      insertRule.run(
        rule.regulation,
        rule.sector,
        rule.subsector,
        1, // applies = true
        rule.confidence,
        rule.rationale
      );
      totalRules++;
    }
  })();
}

console.log(`✅ Loaded ${totalRules} applicability rules\n`);

db.close();

console.log('🎉 Seed data loading complete!');
console.log(`\nSummary:`);
console.log(`  Control mappings: ${totalMappings}`);
console.log(`  Applicability rules: ${totalRules}`);
