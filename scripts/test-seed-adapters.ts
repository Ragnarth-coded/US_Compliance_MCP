#!/usr/bin/env npx tsx

/**
 * Unit tests for seed-based adapters (FFIEC and NYDFS)
 * Tests that seed files are correctly loaded and adapters work as expected
 */

import { createFfiecAdapter } from '../src/ingest/adapters/ffiec.js';
import { createNydfsAdapter } from '../src/ingest/adapters/nydfs.js';

console.log('🧪 Seed-Based Adapter Tests\n');

let passed = 0;
let failed = 0;

/**
 * Test a seed-based adapter
 */
async function testAdapter(
  name: string,
  factory: () => any,
  expectedId: string,
  expectedCitation: string,
  expectedJurisdiction: string,
  expectedRegType: string,
  expectedMinSections: number
) {
  try {
    console.log(`\n📋 Testing ${name}...`);

    const adapter = factory();

    // Test metadata
    console.log('  Testing metadata...');
    const metadata = await adapter.fetchMetadata();

    if (metadata.id !== expectedId) {
      throw new Error(`Expected id=${expectedId}, got ${metadata.id}`);
    }

    if (metadata.citation !== expectedCitation) {
      throw new Error(`Expected citation="${expectedCitation}", got "${metadata.citation}"`);
    }

    if (metadata.jurisdiction !== expectedJurisdiction) {
      throw new Error(`Expected jurisdiction=${expectedJurisdiction}, got ${metadata.jurisdiction}`);
    }

    if (metadata.regulation_type !== expectedRegType) {
      throw new Error(`Expected regulation_type=${expectedRegType}, got ${metadata.regulation_type}`);
    }

    if (!metadata.source_url) {
      throw new Error('Missing source_url');
    }

    console.log(`    ✅ ID: ${metadata.id}`);
    console.log(`    ✅ Citation: ${metadata.citation}`);
    console.log(`    ✅ Jurisdiction: ${metadata.jurisdiction}`);
    console.log(`    ✅ Type: ${metadata.regulation_type}`);
    console.log(`    ✅ Source: ${metadata.source_url}`);

    // Test sections
    console.log('  Testing sections...');
    const allSections = [];
    for await (const batch of adapter.fetchSections()) {
      allSections.push(...batch);
    }

    if (allSections.length < expectedMinSections) {
      throw new Error(
        `Expected at least ${expectedMinSections} sections, got ${allSections.length}`
      );
    }

    // Validate section structure
    for (const section of allSections) {
      if (!section.sectionNumber) {
        throw new Error(`Section missing sectionNumber: ${JSON.stringify(section)}`);
      }
      if (!section.text) {
        throw new Error(`Section ${section.sectionNumber} missing text`);
      }
      if (!section.chapter) {
        throw new Error(`Section ${section.sectionNumber} missing chapter`);
      }
    }

    console.log(`    ✅ Fetched ${allSections.length} sections`);
    console.log(`    ✅ All sections have required fields`);

    // Sample a few sections
    console.log('  Sample sections:');
    for (let i = 0; i < Math.min(3, allSections.length); i++) {
      const s = allSections[i];
      console.log(`    - ${s.sectionNumber}: ${s.title || 'No title'}`);
    }

    // Test definitions (should return empty array for seed adapters)
    console.log('  Testing definitions...');
    const definitions = await adapter.extractDefinitions();
    if (!Array.isArray(definitions)) {
      throw new Error('extractDefinitions() should return an array');
    }
    console.log(`    ✅ Definitions: ${definitions.length} (expected 0 for seed-based)`);

    // Test checkForUpdates
    console.log('  Testing checkForUpdates...');
    const updateStatus = await adapter.checkForUpdates(new Date());
    if (typeof updateStatus.hasChanges !== 'boolean') {
      throw new Error('checkForUpdates() should return object with hasChanges boolean');
    }
    console.log(`    ✅ Update check: hasChanges=${updateStatus.hasChanges}`);

    console.log(`\n✅ ${name} PASSED`);
    passed++;
  } catch (error) {
    console.log(`\n❌ ${name} FAILED: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
}

async function main() {
  console.log('Testing seed-based adapters for v1.1\n');
  console.log('='.repeat(60));

  // Test FFIEC adapter
  await testAdapter(
    'FFIEC',
    createFfiecAdapter,
    'FFIEC',
    'FFIEC Interagency Guidelines',
    'federal',
    'guidance',
    10 // Expected at least 10 sections
  );

  // Test NYDFS adapter
  await testAdapter(
    'NYDFS',
    createNydfsAdapter,
    'NYDFS_500',
    '23 NYCRR 500',
    'state',
    'rule',
    16 // Expected at least 16 sections
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
  }

  console.log('\n✅ All seed adapter tests passed!');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
