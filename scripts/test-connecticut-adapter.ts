import { createConnecticutAdapter } from '../src/ingest/adapters/connecticut-cga.js';

console.log('Testing Connecticut CTDPA Adapter...\n');

const adapter = createConnecticutAdapter();

console.log('Testing metadata...');
const metadata = await adapter.fetchMetadata();
console.log('  ✅ ID:', metadata.id);
console.log('  ✅ Full name:', metadata.full_name);
console.log('  ✅ Citation:', metadata.citation);
console.log('  ✅ Jurisdiction:', metadata.jurisdiction);

console.log('\nTesting sections (single chapter page)...');
let totalSections = 0;
for await (const batch of adapter.fetchSections()) {
  totalSections += batch.length;
  console.log(`  ✅ Batch fetched: ${batch.length} sections`);

  // Show first few sections
  console.log('\n  Sections found:');
  for (let i = 0; i < Math.min(3, batch.length); i++) {
    const sample = batch[i];
    console.log(`    ${sample.section_number} - ${sample.title}`);
    console.log(`    Text length: ${sample.text.length} chars`);
  }
}

console.log(`\n✅ Total sections: ${totalSections}`);

if (totalSections >= 8) {
  console.log('\n✅ CONNECTICUT ADAPTER TEST PASSED');
} else {
  console.log('\n❌ CONNECTICUT ADAPTER TEST FAILED: Expected at least 8 sections');
  process.exit(1);
}
