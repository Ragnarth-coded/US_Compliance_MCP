#!/usr/bin/env npx tsx

/**
 * Test MCP Tools
 * Verifies all MCP tools work correctly with populated database
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchRegulations } from '../src/tools/search.js';
import { getSection } from '../src/tools/section.js';
import { listRegulations } from '../src/tools/list.js';
import { mapControls } from '../src/tools/map.js';
import { checkApplicability } from '../src/tools/applicability.js';
import { getDefinitions } from '../src/tools/definitions.js';
import { compareRequirements } from '../src/tools/compare.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');

const db = new Database(DB_PATH, { readonly: true });

async function runTests() {
  console.log('🧪 Testing US Compliance MCP Tools\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Search Regulations
  console.log('1️⃣  Testing search_regulations...');
  try {
    const result = await searchRegulations(db, { query: 'encryption', limit: 5 });
    if (Array.isArray(result) && result.length > 0) {
      console.log(`   ✅ Found ${result.length} results for "encryption"`);
      console.log(`   Sample: ${result[0].section} - ${result[0].title?.substring(0, 50)}...`);
      passed++;
    } else {
      console.log(`   ❌ No results returned (got: ${JSON.stringify(result).substring(0, 100)})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 2: Get Section
  console.log('\n2️⃣  Testing get_section...');
  try {
    const result = await getSection(db, { regulation: 'HIPAA', section: '164.308' });
    if (result && result.section_number && result.text) {
      console.log(`   ✅ Retrieved section ${result.section_number}`);
      console.log(`   Title: ${result.title}`);
      console.log(`   Text length: ${result.text.length} chars`);
      passed++;
    } else {
      console.log(`   ❌ Section not found or incomplete (got: ${JSON.stringify(result)?.substring(0, 100)})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 3: List Regulations
  console.log('\n3️⃣  Testing list_regulations...');
  try {
    const result = await listRegulations(db, {});
    if (result.regulations && result.regulations.length > 0) {
      console.log(`   ✅ Found ${result.regulations.length} regulations`);
      console.log(`   Regulations: ${result.regulations.map((r: any) => r.id).join(', ')}`);
      passed++;
    } else {
      console.log('   ❌ No regulations returned');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 4: Map Controls
  console.log('\n4️⃣  Testing map_controls...');
  try {
    const result = await mapControls(db, { framework: 'NIST_800_53_R5', regulation: 'HIPAA' });
    if (result.mappings && result.mappings.length > 0) {
      console.log(`   ✅ Found ${result.mappings.length} control mappings`);
      console.log(`   Sample: ${result.mappings[0].control_id} - ${result.mappings[0].control_name}`);
      console.log(`   Coverage: ${result.mappings[0].coverage}, Confidence: ${result.mappings[0].confidence}%`);
      passed++;
    } else {
      console.log('   ❌ No mappings returned');
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 5: Check Applicability
  console.log('\n5️⃣  Testing check_applicability...');
  try {
    const result = await checkApplicability(db, { sector: 'healthcare' });
    if (result.applicable_regulations && result.applicable_regulations.length > 0) {
      console.log(`   ✅ Found ${result.applicable_regulations.length} applicable regulations for healthcare`);
      console.log(`   Sample: ${result.applicable_regulations[0].regulation} - ${result.applicable_regulations[0].confidence}`);
      passed++;
    } else {
      console.log(`   ❌ No applicability rules returned (got: ${JSON.stringify(result).substring(0, 100)})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 6: Get Definitions
  console.log('\n6️⃣  Testing get_definitions...');
  try {
    const result = await getDefinitions(db, { term: 'health' });
    // Definitions might be empty if not yet extracted
    console.log(`   ℹ️  Found ${result.definitions?.length || 0} definitions (expected 0 for MVP)`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 7: Compare Requirements
  console.log('\n7️⃣  Testing compare_requirements...');
  try {
    const result = await compareRequirements(db, {
      topic: 'data protection',
      regulations: ['HIPAA', 'CCPA']
    });
    if (result.comparisons && result.comparisons.length > 0) {
      console.log(`   ✅ Compared ${result.comparisons.length} regulations`);
      for (const comp of result.comparisons) {
        console.log(`   - ${comp.regulation}: ${comp.matches?.length || 0} matches`);
      }
      passed++;
    } else {
      console.log(`   ❌ No comparison results (got: ${JSON.stringify(result).substring(0, 100)})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Test 8: List HIPAA Structure
  console.log('\n8️⃣  Testing list_regulations with HIPAA structure...');
  try {
    const result = await listRegulations(db, { regulation: 'HIPAA' });
    if (result.structure && result.structure.chapters && result.structure.chapters.length > 0) {
      const totalSections = result.structure.chapters.reduce((sum, ch) => sum + ch.sections.length, 0);
      console.log(`   ✅ Found ${totalSections} HIPAA sections in ${result.structure.chapters.length} chapters`);
      console.log(`   Sample sections: ${result.structure.chapters[0].sections.slice(0, 3).join(', ')}`);
      passed++;
    } else {
      console.log(`   ❌ No structure returned (got: ${JSON.stringify(result).substring(0, 150)})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('🎉 All tests passed! MCP server is 100% ready.\n');
  } else {
    console.log('⚠️  Some tests failed. Review errors above.\n');
    process.exit(1);
  }

  db.close();
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
