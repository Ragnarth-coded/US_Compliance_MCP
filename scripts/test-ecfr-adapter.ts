#!/usr/bin/env npx tsx

/**
 * Unit tests for EcfrAdapter factory functions
 * Tests that all v1.1 adapters are correctly configured
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 EcfrAdapter Factory Function Tests\n');

let passed = 0;
let failed = 0;

/**
 * Test a factory function
 */
async function testFactory(
  name: string,
  factory: () => any,
  expectedId: string,
  expectedCitation: string
) {
  try {
    const adapter = factory();
    const metadata = await adapter.fetchMetadata();

    // Check ID
    if (metadata.id !== expectedId) {
      throw new Error(`Expected id=${expectedId}, got ${metadata.id}`);
    }

    // Check citation
    if (metadata.citation !== expectedCitation) {
      throw new Error(`Expected citation="${expectedCitation}", got "${metadata.citation}"`);
    }

    // Check jurisdiction is federal
    if (metadata.jurisdiction !== 'federal') {
      throw new Error(`Expected jurisdiction=federal, got ${metadata.jurisdiction}`);
    }

    // Check regulation_type is rule
    if (metadata.regulation_type !== 'rule') {
      throw new Error(`Expected regulation_type=rule, got ${metadata.regulation_type}`);
    }

    console.log(`✅ ${name}: ${expectedId} (${expectedCitation})`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

/**
 * Test that adapter can fetch sections
 */
async function testFetchSections(name: string, factory: () => any) {
  try {
    const adapter = factory();
    const sections = [];

    // Fetch first batch only (don't need all sections for test)
    for await (const batch of adapter.fetchSections()) {
      sections.push(...batch);
      break; // Just first batch
    }

    if (sections.length === 0) {
      throw new Error('No sections fetched');
    }

    // Check section structure
    const firstSection = sections[0];
    if (!firstSection.sectionNumber) {
      throw new Error('Section missing sectionNumber');
    }
    if (!firstSection.text) {
      throw new Error('Section missing text');
    }

    console.log(`✅ ${name} sections: ${sections.length} in first batch`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name} sections: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

async function main() {
  // Test metadata for all factory functions
  await testFactory('HIPAA', createHipaaAdapter, 'HIPAA', '45 CFR Parts 160, 162, 164');
  await testFactory('GLBA', createGlbaAdapter, 'GLBA', '16 CFR Part 314');
  await testFactory('FERPA', createFerpaAdapter, 'FERPA', '34 CFR Part 99');
  await testFactory('COPPA', createCoppaAdapter, 'COPPA', '16 CFR Part 312');
  await testFactory('FDA', createFdaAdapter, 'FDA_CFR_11', '21 CFR Part 11');
  await testFactory('EPA', createEpaRmpAdapter, 'EPA_RMP', '40 CFR Part 68');

  console.log();

  // Test section fetching (slower, only test one new regulation)
  console.log('Testing section fetching...\n');
  await testFetchSections('GLBA', createGlbaAdapter);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
