#!/usr/bin/env tsx
/**
 * Comprehensive quality check across all data sources
 */

import Database from 'better-sqlite3';
import { searchRegulations } from '../dist/tools/search.js';
import { getSection } from '../dist/tools/section.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data', 'regulations.db');

async function runQualityChecks() {
  const db = new Database(DB_PATH, { readonly: true });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  US REGULATIONS MCP - DATA QUALITY VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // TIER 1: Official API Sources
  console.log('🔵 TIER 1: Official API Sources (eCFR.gov, CA LegInfo)\n');

  // Test 1: HIPAA (eCFR API)
  console.log('1️⃣  HIPAA - Breach Notification (45 CFR 164 Subpart D)');
  const hipaa = await searchRegulations(db, {
    query: 'breach notification timeline',
    regulations: ['HIPAA'],
    limit: 2
  });
  console.log(`   ✓ Found ${hipaa.length} results`);
  if (hipaa[0]) {
    console.log(`   📄 §${hipaa[0].section}: ${hipaa[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${hipaa[0].relevance.toFixed(2)}`);
    console.log(`   📝 Snippet: ${hipaa[0].snippet?.substring(0, 100)}...`);
    const section = await getSection(db, { regulation: 'HIPAA', section: hipaa[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Test 2: FDA 21 CFR Part 11 (eCFR API)
  console.log('2️⃣  FDA 21 CFR Part 11 - Electronic Signatures');
  const fda = await searchRegulations(db, {
    query: 'electronic signature',
    regulations: ['FDA_CFR_11'],
    limit: 2
  });
  console.log(`   ✓ Found ${fda.length} results`);
  if (fda[0]) {
    console.log(`   📄 §${fda[0].section}: ${fda[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${fda[0].relevance.toFixed(2)}`);
    const section = await getSection(db, { regulation: 'FDA_CFR_11', section: fda[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Test 3: CCPA (California LegInfo API)
  console.log('3️⃣  CCPA - Consumer Rights (Cal. Civ. Code §1798)');
  const ccpa = await searchRegulations(db, {
    query: 'right to delete personal information',
    regulations: ['CCPA'],
    limit: 2
  });
  console.log(`   ✓ Found ${ccpa.length} results`);
  if (ccpa[0]) {
    console.log(`   📄 §${ccpa[0].section}: ${ccpa[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${ccpa[0].relevance.toFixed(2)}`);
    const section = await getSection(db, { regulation: 'CCPA', section: ccpa[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Test 4: EPA RMP (eCFR API)
  console.log('4️⃣  EPA RMP - Chemical Facility Safety (40 CFR 68)');
  const epa = await searchRegulations(db, {
    query: 'risk management plan',
    regulations: ['EPA_RMP'],
    limit: 2
  });
  console.log(`   ✓ Found ${epa.length} results`);
  if (epa[0]) {
    console.log(`   📄 §${epa[0].section}: ${epa[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${epa[0].relevance.toFixed(2)}`);
  }
  console.log();

  // TIER 2: HTML Scraping Sources
  console.log('🟢 TIER 2: Official State Sources (HTML Scraping)\n');

  // Test 5: Virginia CDPA
  console.log('5️⃣  Virginia CDPA - Consumer Privacy Rights');
  const va = await searchRegulations(db, {
    query: 'consumer rights opt out',
    regulations: ['VIRGINIA_CDPA'],
    limit: 2
  });
  console.log(`   ✓ Found ${va.length} results`);
  if (va[0]) {
    console.log(`   📄 §${va[0].section}: ${va[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${va[0].relevance.toFixed(2)}`);
    const section = await getSection(db, { regulation: 'VIRGINIA_CDPA', section: va[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Test 6: Connecticut CTDPA
  console.log('6️⃣  Connecticut CTDPA - Data Protection Assessments');
  const ct = await searchRegulations(db, {
    query: 'data protection assessment',
    regulations: ['CONNECTICUT_CTDPA'],
    limit: 2
  });
  console.log(`   ✓ Found ${ct.length} results`);
  if (ct[0]) {
    console.log(`   📄 §${ct[0].section}: ${ct[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${ct[0].relevance.toFixed(2)}`);
    const section = await getSection(db, { regulation: 'CONNECTICUT_CTDPA', section: ct[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Test 7: Utah UCPA
  console.log('7️⃣  Utah UCPA - Consumer Access Rights');
  const ut = await searchRegulations(db, {
    query: 'right to access personal data',
    regulations: ['UTAH_UCPA'],
    limit: 2
  });
  console.log(`   ✓ Found ${ut.length} results`);
  if (ut[0]) {
    console.log(`   📄 §${ut[0].section}: ${ut[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${ut[0].relevance.toFixed(2)}`);
  }
  console.log();

  // TIER 3: Seed Data Sources
  console.log('🟡 TIER 3: Verified Seed Data (Static but Accurate)\n');

  // Test 8: Colorado CPA
  console.log('8️⃣  Colorado CPA - Universal Opt-Out Mechanism');
  const co = await searchRegulations(db, {
    query: 'universal opt out',
    regulations: ['COLORADO_CPA'],
    limit: 2
  });
  console.log(`   ✓ Found ${co.length} results`);
  if (co[0]) {
    console.log(`   📄 §${co[0].section}: ${co[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${co[0].relevance.toFixed(2)}`);
    const section = await getSection(db, { regulation: 'COLORADO_CPA', section: co[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Test 9: NYDFS 500
  console.log('9️⃣  NYDFS 500 - Multi-Factor Authentication');
  const nydfs = await searchRegulations(db, {
    query: 'multi-factor authentication',
    regulations: ['NYDFS_500'],
    limit: 2
  });
  console.log(`   ✓ Found ${nydfs.length} results`);
  if (nydfs[0]) {
    console.log(`   📄 §${nydfs[0].section}: ${nydfs[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${nydfs[0].relevance.toFixed(2)}`);
  }
  console.log();

  // Test 10: SOX
  console.log('🔟 SOX - Internal Controls (Sarbanes-Oxley)');
  const sox = await searchRegulations(db, {
    query: 'internal control financial reporting',
    regulations: ['SOX'],
    limit: 2
  });
  console.log(`   ✓ Found ${sox.length} results`);
  if (sox[0]) {
    console.log(`   📄 §${sox[0].section}: ${sox[0].title?.substring(0, 60)}...`);
    console.log(`   🎯 Relevance: ${sox[0].relevance.toFixed(2)}`);
    const section = await getSection(db, { regulation: 'SOX', section: sox[0].section });
    const wordCount = section.text?.split(/\s+/).length || 0;
    console.log(`   📊 Content: ${wordCount} words, ${section.text?.length || 0} chars`);
  }
  console.log();

  // Summary Stats
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY STATISTICS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const stats = db.prepare(`
    SELECT
      regulation,
      COUNT(*) as sections,
      AVG(LENGTH(text)) as avg_length,
      MIN(LENGTH(text)) as min_length,
      MAX(LENGTH(text)) as max_length
    FROM sections
    GROUP BY regulation
    ORDER BY regulation
  `).all();

  stats.forEach((stat: any) => {
    console.log(`${stat.regulation.padEnd(20)} ${String(stat.sections).padStart(3)} sections | Avg: ${Math.round(stat.avg_length)} chars | Range: ${stat.min_length}-${stat.max_length}`);
  });

  const total = db.prepare('SELECT COUNT(*) as count FROM sections').get() as { count: number };
  console.log(`\n${'TOTAL'.padEnd(20)} ${String(total.count).padStart(3)} sections across 14 regulations`);

  console.log('\n✅ Quality check complete!\n');

  db.close();
}

runQualityChecks().catch(console.error);
