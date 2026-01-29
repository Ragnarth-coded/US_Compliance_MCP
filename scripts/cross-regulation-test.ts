#!/usr/bin/env tsx
/**
 * Cross-regulation quality test - verify data accuracy and search quality
 */

import Database from 'better-sqlite3';
import { searchRegulations } from '../dist/tools/search.js';
import { compareRequirements } from '../dist/tools/compare.js';
import { getSection } from '../dist/tools/section.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');

async function runAdvancedTests() {
  const db = new Database(DB_PATH, { readonly: true });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CROSS-REGULATION QUALITY TESTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Compare breach notification across regulations
  console.log('🔍 Test 1: Compare Breach Notification Requirements\n');
  const breach = await compareRequirements(db, {
    topic: 'breach notification timeline',
    regulations: ['HIPAA', 'CCPA', 'VIRGINIA_CDPA']
  });

  breach.comparisons.forEach((comp) => {
    if (comp.matches && comp.matches.length > 0) {
      console.log(`${comp.regulation}:`);
      console.log(`  ✓ ${comp.total_matches} relevant sections found`);
      console.log(`  📄 Top match: §${comp.matches[0].section} (relevance: ${comp.matches[0].relevance.toFixed(2)})`);
      console.log(`  📝 ${comp.matches[0].snippet?.substring(0, 120)}...`);
    }
  });
  console.log();

  // Test 2: State privacy law comparison
  console.log('🔍 Test 2: State Privacy Laws - Consumer Rights Comparison\n');
  const privacy = await compareRequirements(db, {
    topic: 'consumer right to access personal data',
    regulations: ['CCPA', 'VIRGINIA_CDPA', 'COLORADO_CPA', 'CONNECTICUT_CTDPA', 'UTAH_UCPA']
  });

  privacy.comparisons.forEach((comp) => {
    if (comp.matches && comp.matches.length > 0) {
      console.log(`${comp.regulation}: ${comp.total_matches} sections (top relevance: ${comp.matches[0].relevance.toFixed(2)})`);
    }
  });
  console.log();

  // Test 3: Detailed content verification - sample random sections
  console.log('🔍 Test 3: Content Quality Spot Checks\n');

  const samples = [
    { regulation: 'HIPAA', section: '164.308', name: 'Administrative Safeguards' },
    { regulation: 'CCPA', section: '1798.100', name: 'Consumer Rights' },
    { regulation: 'SOX', section: '17-CFR-229.308', name: 'Internal Controls' },
    { regulation: 'NYDFS_500', section: '500.02', name: 'Cybersecurity Program' },
  ];

  for (const sample of samples) {
    try {
      const section = await getSection(db, {
        regulation: sample.regulation,
        section: sample.section
      });

      if (!section || !section.text) {
        console.log(`${sample.regulation} §${sample.section} - ${sample.name}: ⚠️ Section not found`);
        continue;
      }

      const wordCount = section.text.split(/\s+/).length;
      const hasSubstance = wordCount > 50;
      const hasTitle = section.title && section.title.length > 5;

      console.log(`${sample.regulation} §${sample.section} - ${sample.name}:`);
      console.log(`  ✓ Word count: ${wordCount} ${hasSubstance ? '✅' : '⚠️'}`);
      console.log(`  ✓ Has title: ${hasTitle ? '✅' : '⚠️'}`);
      console.log(`  ✓ Preview: ${section.text.substring(0, 100)}...`);
      console.log();
    } catch (e) {
      console.log(`${sample.regulation} §${sample.section} - ${sample.name}: ⚠️ Error: ${e}`);
    }
  }

  // Test 4: Search precision test
  console.log('🔍 Test 4: Search Precision Tests\n');

  const precisionTests = [
    { query: 'encryption at rest', expected: ['HIPAA', 'NYDFS_500', 'GLBA'] },
    { query: 'parental consent children', expected: ['COPPA', 'FERPA'] },
    { query: 'audit trail logging', expected: ['HIPAA', 'FDA_CFR_11', 'SOX'] },
  ];

  for (const test of precisionTests) {
    const results = await searchRegulations(db, {
      query: test.query,
      limit: 10
    });

    const foundRegs = new Set(results.map(r => r.regulation));
    const expectedFound = test.expected.filter(exp => foundRegs.has(exp));
    const precision = expectedFound.length / test.expected.length;

    console.log(`"${test.query}": ${results.length} results`);
    console.log(`  Expected: ${test.expected.join(', ')}`);
    console.log(`  Found: ${Array.from(foundRegs).join(', ')}`);
    console.log(`  Precision: ${(precision * 100).toFixed(0)}% ${precision >= 0.5 ? '✅' : '⚠️'}`);
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ ALL TESTS COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  db.close();
}

runAdvancedTests().catch(console.error);
