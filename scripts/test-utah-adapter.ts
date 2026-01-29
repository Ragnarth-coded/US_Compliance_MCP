import { createUtahAdapter } from '../src/ingest/adapters/utah-xcode.js';

console.log('Testing Utah UCPA Adapter...\n');

const adapter = createUtahAdapter();

console.log('Testing metadata...');
const metadata = await adapter.fetchMetadata();
console.log('  ✅ ID:', metadata.id);
console.log('  ✅ Citation:', metadata.citation);

console.log('\nTesting sections (two-step version resolution)...');
let totalSections = 0;
for await (const batch of adapter.fetchSections()) {
  totalSections += batch.length;
  console.log(`  ✅ Batch: ${batch.length} sections`);

  if (batch.length > 0 && totalSections <= batch.length) {
    const sample = batch[0];
    console.log(`  Sample: ${sample.section_number} - ${sample.title}`);
  }
}

console.log(`\n✅ Total sections: ${totalSections}`);

if (totalSections >= 10) {
  console.log('\n✅ UTAH ADAPTER TEST PASSED');
} else {
  console.log('\n❌ TEST FAILED');
  process.exit(1);
}
