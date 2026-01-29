#!/usr/bin/env npx tsx

/**
 * Comprehensive Quality Test for US Compliance MCP
 * Tests various compliance queries to assess quality and coverage
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { searchRegulations } from '../src/tools/search.js';
import { getSection } from '../src/tools/section.js';
import { compareRequirements } from '../src/tools/compare.js';
import { mapControls } from '../src/tools/map.js';
import { checkApplicability } from '../src/tools/applicability.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');

const db = new Database(DB_PATH, { readonly: true });

interface TestCase {
  name: string;
  category: string;
  test: () => Promise<any>;
}

const tests: TestCase[] = [];
let passed = 0;
let failed = 0;

function addTest(category: string, name: string, test: () => Promise<any>) {
  tests.push({ category, name, test });
}

// ===== HIPAA QUERIES =====
addTest('HIPAA', 'Security rule access controls', async () => {
  const result = await searchRegulations(db, {
    query: 'access control security',
    regulation: 'HIPAA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section} - ${result[0].title}`);
  return result;
});

addTest('HIPAA', 'Audit logs and ePHI access', async () => {
  const result = await searchRegulations(db, {
    query: 'audit log electronic protected health',
    regulation: 'HIPAA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('HIPAA', 'Encryption requirements', async () => {
  const result = await searchRegulations(db, {
    query: 'encryption transmission storage',
    regulation: 'HIPAA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('HIPAA', 'Breach notification requirements', async () => {
  const result = await searchRegulations(db, {
    query: 'breach notification timeline',
    regulation: 'HIPAA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('HIPAA', 'Risk assessment requirements', async () => {
  const result = await searchRegulations(db, {
    query: 'risk assessment analysis',
    regulation: 'HIPAA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

// ===== CCPA QUERIES =====
addTest('CCPA', 'Consumer rights to data deletion', async () => {
  const result = await searchRegulations(db, {
    query: 'consumer right delete personal information',
    regulation: 'CCPA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('CCPA', 'Data disclosure requirements', async () => {
  const result = await searchRegulations(db, {
    query: 'disclosure categories personal information',
    regulation: 'CCPA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('CCPA', 'Do Not Sell opt-out', async () => {
  const result = await searchRegulations(db, {
    query: 'do not sell opt-out',
    regulation: 'CCPA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

// ===== SOX QUERIES =====
addTest('SOX', 'Section 404 IT controls', async () => {
  const result = await searchRegulations(db, {
    query: 'internal control information technology',
    regulation: 'SOX',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('SOX', 'Financial records retention', async () => {
  const result = await searchRegulations(db, {
    query: 'retention records audit',
    regulation: 'SOX',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

// ===== v1.1 FINANCIAL SERVICES & SECTOR-SPECIFIC QUERIES =====
addTest('GLBA', 'GLBA Safeguards Rule', async () => {
  const result = await searchRegulations(db, {
    query: 'safeguards rule financial institution customer data',
    regulation: 'GLBA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('FERPA', 'FERPA student records', async () => {
  const result = await searchRegulations(db, {
    query: 'student education records privacy parental consent',
    regulation: 'FERPA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('COPPA', 'COPPA children privacy', async () => {
  const result = await searchRegulations(db, {
    query: 'children under 13 online privacy parental consent',
    regulation: 'COPPA',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('FDA 21 CFR Part 11', 'FDA 21 CFR Part 11', async () => {
  const result = await searchRegulations(db, {
    query: 'electronic signatures records FDA pharmaceutical',
    regulation: 'FDA_CFR_11',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

addTest('EPA RMP', 'EPA RMP chemical safety', async () => {
  const result = await searchRegulations(db, {
    query: 'chemical facility risk management plan EPA',
    regulation: 'EPA_RMP',
    limit: 5
  });
  if (!result || result.length === 0) throw new Error('No results');
  console.log(`   📋 Found ${result.length} sections`);
  console.log(`   📝 Top result: ${result[0].section}`);
  return result;
});

// ===== CROSS-REGULATION QUERIES =====
addTest('Cross-Regulation', 'Compare breach notification timelines', async () => {
  const result = await compareRequirements(db, {
    topic: 'breach notification timeline',
    regulations: ['HIPAA', 'CCPA']
  });
  if (!result || !result.comparisons) throw new Error('No comparison results');
  console.log(`   📊 Compared ${result.comparisons.length} regulations`);
  for (const comp of result.comparisons) {
    console.log(`   - ${comp.regulation}: ${comp.matches?.length || 0} matches`);
  }
  return result;
});

addTest('Cross-Regulation', 'Compare incident response requirements', async () => {
  const result = await compareRequirements(db, {
    topic: 'incident response',
    regulations: ['HIPAA', 'CCPA', 'SOX']
  });
  if (!result || !result.comparisons) throw new Error('No comparison results');
  console.log(`   📊 Compared ${result.comparisons.length} regulations`);
  for (const comp of result.comparisons) {
    console.log(`   - ${comp.regulation}: ${comp.matches?.length || 0} matches`);
  }
  return result;
});

addTest('Cross-Regulation', 'Data protection across all regulations', async () => {
  const result = await compareRequirements(db, {
    topic: 'data protection security',
    regulations: ['HIPAA', 'CCPA', 'SOX']
  });
  if (!result || !result.comparisons) throw new Error('No comparison results');
  console.log(`   📊 Compared ${result.comparisons.length} regulations`);
  for (const comp of result.comparisons) {
    console.log(`   - ${comp.regulation}: ${comp.matches?.length || 0} matches`);
  }
  return result;
});

// ===== CONTROL MAPPINGS =====
addTest('Control Mappings', 'NIST 800-53 to HIPAA', async () => {
  const result = await mapControls(db, {
    framework: 'NIST_800_53_R5',
    regulation: 'HIPAA'
  });
  if (!result.mappings || result.mappings.length === 0) throw new Error('No mappings');
  console.log(`   🔗 Found ${result.mappings.length} mappings`);
  console.log(`   📝 Sample: ${result.mappings[0].control_id} → ${result.mappings[0].regulation_sections?.slice(0, 3).join(', ')}`);
  return result;
});

addTest('Control Mappings', 'NIST CSF to CCPA', async () => {
  const result = await mapControls(db, {
    framework: 'NIST_CSF_2_0',
    regulation: 'CCPA'
  });
  if (!result.mappings || result.mappings.length === 0) throw new Error('No mappings');
  console.log(`   🔗 Found ${result.mappings.length} mappings`);
  console.log(`   📝 Sample: ${result.mappings[0].control_id}`);
  return result;
});

// ===== APPLICABILITY CHECKS =====
addTest('Applicability', 'Healthcare sector', async () => {
  const result = await checkApplicability(db, { sector: 'healthcare' });
  if (!result.applicable_regulations) throw new Error('No results');
  console.log(`   ✅ ${result.applicable_regulations.length} applicable regulations`);
  for (const reg of result.applicable_regulations) {
    console.log(`   - ${reg.regulation}: ${reg.confidence}`);
  }
  return result;
});

addTest('Applicability', 'Financial services', async () => {
  const result = await checkApplicability(db, { sector: 'financial' });
  if (!result.applicable_regulations) throw new Error('No results');
  console.log(`   ✅ ${result.applicable_regulations.length} applicable regulations`);
  for (const reg of result.applicable_regulations) {
    console.log(`   - ${reg.regulation}: ${reg.confidence}`);
  }
  return result;
});

addTest('Applicability', 'E-commerce (California)', async () => {
  const result = await checkApplicability(db, {
    sector: 'technology',
    details: 'e-commerce selling to California consumers'
  });
  if (!result.applicable_regulations) throw new Error('No results');
  console.log(`   ✅ ${result.applicable_regulations.length} applicable regulations`);
  for (const reg of result.applicable_regulations) {
    console.log(`   - ${reg.regulation}: ${reg.confidence}`);
  }
  return result;
});

// ===== SECTION RETRIEVAL =====
addTest('Section Retrieval', 'HIPAA Security Rule 164.312', async () => {
  const result = await getSection(db, { regulation: 'HIPAA', section: '164.312' });
  if (!result || !result.text) throw new Error('Section not found');
  console.log(`   📄 ${result.section_number}: ${result.title}`);
  console.log(`   📊 Text length: ${result.text.length} chars`);
  return result;
});

addTest('Section Retrieval', 'CCPA 1798.100', async () => {
  const result = await getSection(db, { regulation: 'CCPA', section: '1798.100' });
  if (!result || !result.text) throw new Error('Section not found');
  console.log(`   📄 ${result.section_number}: ${result.title}`);
  console.log(`   📊 Text length: ${result.text.length} chars`);
  return result;
});

// ===== EDGE CASES =====
addTest('Edge Cases', 'Empty query handling', async () => {
  try {
    await searchRegulations(db, { query: '', limit: 5 });
    throw new Error('Should have rejected empty query');
  } catch (error: any) {
    if (error.message.includes('Query cannot be empty')) {
      console.log('   ✅ Correctly rejected empty query');
      return { success: true };
    }
    throw error;
  }
});

addTest('Edge Cases', 'Invalid regulation ID', async () => {
  const result = await searchRegulations(db, {
    query: 'test',
    regulation: 'INVALID',
    limit: 5
  });
  // Should return empty or handle gracefully
  console.log(`   ✅ Handled invalid regulation: ${result.length} results`);
  return result;
});

// ===== RUN TESTS =====
async function runAllTests() {
  console.log('🔍 US Compliance MCP - Comprehensive Quality Assessment\n');
  console.log('=' .repeat(70));

  let currentCategory = '';

  for (const testCase of tests) {
    if (testCase.category !== currentCategory) {
      currentCategory = testCase.category;
      console.log(`\n📂 ${currentCategory.toUpperCase()}`);
      console.log('-'.repeat(70));
    }

    try {
      console.log(`\n✨ ${testCase.name}`);
      await testCase.test();
      console.log('   ✅ PASSED');
      passed++;
    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`);
      failed++;
    }
  }

  // Final Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed} (${Math.round(passed/tests.length * 100)}%)`);
  console.log(`❌ Failed: ${failed} (${Math.round(failed/tests.length * 100)}%)`);

  if (failed === 0) {
    console.log('\n🎉 All quality tests passed! MCP is production-ready.\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review errors above.\n`);
    process.exit(1);
  }

  db.close();
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  db.close();
  process.exit(1);
});
