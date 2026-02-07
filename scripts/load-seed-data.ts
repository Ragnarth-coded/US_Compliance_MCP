#!/usr/bin/env npx tsx

/**
 * Load Seed Data
 *
 * Loads pre-generated control mappings and applicability rules into the database
 * Run with: npx tsx scripts/load-seed-data.ts
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');
const SEED_DIR = join(__dirname, '..', 'data', 'seed');
const MAPPINGS_DIR = join(SEED_DIR, 'mappings');
const APPLICABILITY_DIR = join(SEED_DIR, 'applicability');
const BREACH_RULES_PATH = join(SEED_DIR, 'breach-notification-rules.json');

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
// Disable FK enforcement: seed data may reference regulations loaded via ingest script
db.pragma('foreign_keys = OFF');

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

// Load breach notification rules
let totalBreachRules = 0;

if (existsSync(BREACH_RULES_PATH)) {
  console.log('🔔 Loading breach notification rules...');
  const breachData = JSON.parse(readFileSync(BREACH_RULES_PATH, 'utf-8'));

  console.log(`  breach-notification-rules.json: ${breachData.rules.length} rules`);

  const insertBreachRule = db.prepare(`
    INSERT OR REPLACE INTO breach_notification_rules
    (jurisdiction, regulation, notification_deadline, notify_individuals, notify_regulator, notify_media, regulator_name, threshold, penalties, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const rule of breachData.rules) {
      insertBreachRule.run(
        rule.jurisdiction,
        rule.regulation,
        rule.notification_deadline,
        rule.notify_individuals ? 1 : 0,
        rule.notify_regulator ? 1 : 0,
        rule.notify_media ? 1 : 0,
        rule.regulator_name || null,
        rule.threshold || null,
        rule.penalties || null,
        rule.notes || null
      );
      totalBreachRules++;
    }
  })();

  console.log(`✅ Loaded ${totalBreachRules} breach notification rules\n`);
} else {
  console.log('⚠️  No breach notification rules file found, skipping\n');
}

db.close();

console.log('🎉 Seed data loading complete!');
console.log(`\nSummary:`);
console.log(`  Control mappings: ${totalMappings}`);
console.log(`  Applicability rules: ${totalRules}`);
console.log(`  Breach notification rules: ${totalBreachRules}`);
