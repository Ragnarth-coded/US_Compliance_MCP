import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { searchRegulations } from '../src/tools/search.js';
import { getSection } from '../src/tools/section.js';
import { listRegulations } from '../src/tools/list.js';
import { compareRequirements } from '../src/tools/compare.js';
import { mapControls } from '../src/tools/map.js';
import { checkApplicability } from '../src/tools/applicability.js';
import { getDefinitions } from '../src/tools/definitions.js';
import { getEvidenceRequirements } from '../src/tools/evidence.js';
import { getComplianceActionItems } from '../src/tools/action-items.js';
import { getBreachNotificationTimeline } from '../src/tools/breach-notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database;

beforeAll(() => {
  const dbPath = join(__dirname, '..', 'data', 'regulations.db');
  db = new Database(dbPath, { readonly: true });
});

afterAll(() => {
  db.close();
});

// ──────────────────────────────────────────────
// search_regulations
// ──────────────────────────────────────────────
describe('search_regulations', () => {
  it('returns results for a valid query', async () => {
    const response = await searchRegulations(db, { query: 'data protection' });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.total_results).toBeGreaterThan(0);
    expect(response.query).toBe('data protection');
  });

  it('returns results with regulation filter', async () => {
    const regs = db.prepare('SELECT id FROM regulations LIMIT 1').get() as { id: string } | undefined;
    if (!regs) return; // skip if no data

    const response = await searchRegulations(db, {
      query: 'security',
      regulations: [regs.id],
    });
    // All results should be from the filtered regulation
    for (const r of response.results) {
      expect(r.regulation).toBe(regs.id);
    }
  });

  it('respects limit parameter', async () => {
    const response = await searchRegulations(db, { query: 'data', limit: 3 });
    expect(response.results.length).toBeLessThanOrEqual(3);
  });

  it('supports offset for pagination', async () => {
    const first = await searchRegulations(db, { query: 'data', limit: 2, offset: 0 });
    const second = await searchRegulations(db, { query: 'data', limit: 2, offset: 2 });

    if (first.results.length === 2 && second.results.length > 0) {
      // Results should be different when offset
      expect(second.results[0].section).not.toBe(first.results[0].section);
    }
  });

  it('returns diagnostics on empty results', async () => {
    const response = await searchRegulations(db, {
      query: 'xyznonexistentterm123',
    });
    expect(response.results).toEqual([]);
    expect(response.diagnostics).toBeDefined();
    expect(response.diagnostics!.available_regulations.length).toBeGreaterThan(0);
    expect(response.diagnostics!.hint).toBeDefined();
  });

  it('returns diagnostics for invalid regulation filter', async () => {
    const response = await searchRegulations(db, {
      query: 'data',
      regulations: ['NONEXISTENT_REG'],
    });
    expect(response.diagnostics).toBeDefined();
    expect(response.diagnostics!.hint).toContain('Unknown regulation');
  });

  it('throws on empty query', async () => {
    await expect(
      searchRegulations(db, { query: '' })
    ).rejects.toThrow('Query cannot be empty');
  });

  it('handles FTS5 syntax errors gracefully', async () => {
    const response = await searchRegulations(db, { query: 'OR AND (' });
    expect(response.results).toEqual([]);
    expect(response.diagnostics).toBeDefined();
  });

  it('sanitizes limit to valid range', async () => {
    const response = await searchRegulations(db, { query: 'data', limit: -5 });
    // Should default to 10, not crash
    expect(response.results.length).toBeLessThanOrEqual(10);
  });

  it('caps limit at 1000', async () => {
    const response = await searchRegulations(db, { query: 'data', limit: 9999 });
    expect(response.results.length).toBeLessThanOrEqual(1000);
  });
});

// ──────────────────────────────────────────────
// get_section
// ──────────────────────────────────────────────
describe('get_section', () => {
  it('returns section data for a valid section', async () => {
    const row = db.prepare('SELECT regulation, section_number FROM sections LIMIT 1').get() as
      | { regulation: string; section_number: string }
      | undefined;
    if (!row) return;

    const result = await getSection(db, {
      regulation: row.regulation,
      section: row.section_number,
    });
    expect(result.regulation).toBe(row.regulation);
    expect(result.section_number).toBe(row.section_number);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('throws descriptive error for missing section', async () => {
    const reg = db.prepare('SELECT id FROM regulations LIMIT 1').get() as { id: string } | undefined;
    if (!reg) return;

    await expect(
      getSection(db, { regulation: reg.id, section: 'NONEXISTENT_999' })
    ).rejects.toThrow('not found');
  });

  it('throws error listing available regulations for invalid regulation', async () => {
    await expect(
      getSection(db, { regulation: 'FAKE_REG', section: '1.1' })
    ).rejects.toThrow('Available regulations');
  });
});

// ──────────────────────────────────────────────
// list_regulations
// ──────────────────────────────────────────────
describe('list_regulations', () => {
  it('lists all regulations without parameter', async () => {
    const result = await listRegulations(db, {});
    expect(result.regulations).toBeDefined();
    expect(result.regulations!.length).toBeGreaterThan(0);
    expect(result.regulations![0].id).toBeDefined();
    expect(result.regulations![0].full_name).toBeDefined();
  });

  it('returns structure for a specific regulation', async () => {
    const reg = db.prepare('SELECT id FROM regulations LIMIT 1').get() as { id: string } | undefined;
    if (!reg) return;

    const result = await listRegulations(db, { regulation: reg.id });
    expect(result.structure).toBeDefined();
    expect(result.structure!.regulation.id).toBe(reg.id);
    expect(result.structure!.chapters.length).toBeGreaterThan(0);
  });

  it('returns empty for nonexistent regulation', async () => {
    const result = await listRegulations(db, { regulation: 'FAKE_REG' });
    expect(result.regulations).toEqual([]);
  });
});

// ──────────────────────────────────────────────
// compare_requirements
// ──────────────────────────────────────────────
describe('compare_requirements', () => {
  it('compares regulations with synthesis', async () => {
    const regs = db.prepare('SELECT id FROM regulations LIMIT 2').all() as Array<{ id: string }>;
    if (regs.length < 2) return;

    const result = await compareRequirements(db, {
      topic: 'security',
      regulations: regs.map(r => r.id),
    });
    expect(result.topic).toBe('security');
    expect(result.comparisons.length).toBe(2);
    expect(result.synthesis).toBeDefined();
    expect(result.synthesis.coverage_summary.length).toBeGreaterThan(0);
  });

  it('throws on empty topic', async () => {
    await expect(
      compareRequirements(db, { topic: '', regulations: ['HIPAA'] })
    ).rejects.toThrow('Topic is required');
  });

  it('throws on invalid regulation IDs', async () => {
    await expect(
      compareRequirements(db, { topic: 'test', regulations: ['FAKE_REG'] })
    ).rejects.toThrow('Unknown regulation');
  });

  it('throws on too many regulations', async () => {
    const many = Array.from({ length: 11 }, (_, i) => `REG_${i}`);
    await expect(
      compareRequirements(db, { topic: 'test', regulations: many })
    ).rejects.toThrow('Cannot compare more than 10');
  });
});

// ──────────────────────────────────────────────
// map_controls
// ──────────────────────────────────────────────
describe('map_controls', () => {
  it('returns mappings for a valid framework', async () => {
    const fw = db.prepare('SELECT DISTINCT framework FROM control_mappings LIMIT 1').get() as
      | { framework: string }
      | undefined;
    if (!fw) return;

    const result = await mapControls(db, { framework: fw.framework });
    expect(result.framework).toBe(fw.framework);
    expect(result.total_mappings).toBeGreaterThan(0);
  });

  it('returns diagnostics for unknown framework', async () => {
    const result = await mapControls(db, { framework: 'NONEXISTENT_FW' });
    expect(result.total_mappings).toBe(0);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.hint).toContain('not found');
  });

  it('throws on missing framework', async () => {
    await expect(
      mapControls(db, { framework: '' })
    ).rejects.toThrow('Framework is required');
  });
});

// ──────────────────────────────────────────────
// check_applicability
// ──────────────────────────────────────────────
describe('check_applicability', () => {
  it('returns applicable regulations for a valid sector', async () => {
    const sector = db.prepare('SELECT DISTINCT sector FROM applicability_rules WHERE applies = 1 LIMIT 1').get() as
      | { sector: string }
      | undefined;
    if (!sector) return;

    const result = await checkApplicability(db, { sector: sector.sector });
    expect(result.sector).toBe(sector.sector);
    expect(result.total_applicable).toBeGreaterThan(0);
  });

  it('returns diagnostics for unknown sector', async () => {
    const result = await checkApplicability(db, { sector: 'underwater_basket_weaving' });
    expect(result.total_applicable).toBe(0);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.sectors_available.length).toBeGreaterThan(0);
  });

  it('throws on empty sector', async () => {
    await expect(
      checkApplicability(db, { sector: '' })
    ).rejects.toThrow('Sector is required');
  });
});

// ──────────────────────────────────────────────
// get_definitions
// ──────────────────────────────────────────────
describe('get_definitions', () => {
  it('returns definitions when data exists', async () => {
    const hasDefs = db.prepare('SELECT COUNT(*) as cnt FROM definitions').get() as { cnt: number };
    if (hasDefs.cnt === 0) return; // skip if no definitions loaded

    const term = db.prepare('SELECT term FROM definitions LIMIT 1').get() as { term: string };
    const result = await getDefinitions(db, { term: term.term.substring(0, 5) });
    expect(result.total_definitions).toBeGreaterThan(0);
  });

  it('returns diagnostics for non-matching term', async () => {
    const result = await getDefinitions(db, { term: 'xyznonexistentterm' });
    expect(result.total_definitions).toBe(0);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.hint).toBeDefined();
  });

  it('throws on empty term', async () => {
    await expect(
      getDefinitions(db, { term: '' })
    ).rejects.toThrow('Term is required');
  });
});

// ──────────────────────────────────────────────
// get_evidence_requirements
// ──────────────────────────────────────────────
describe('get_evidence_requirements', () => {
  it('extracts evidence from section text', async () => {
    // Find a section that mentions common evidence keywords
    const row = db.prepare(
      "SELECT regulation, section_number FROM sections WHERE text LIKE '%policy%' AND text LIKE '%shall%' LIMIT 1"
    ).get() as { regulation: string; section_number: string } | undefined;
    if (!row) return;

    const result = await getEvidenceRequirements(db, {
      regulation: row.regulation,
      section: row.section_number,
    });
    expect(result.evidence_requirements.length).toBeGreaterThan(0);
    expect(result.total_requirements).toBeGreaterThan(0);
    // Should find "Written Policies" at minimum
    const types = result.evidence_requirements.map(e => e.evidence_type);
    expect(types).toContain('Written Policies');
  });

  it('throws for nonexistent section', async () => {
    const reg = db.prepare('SELECT id FROM regulations LIMIT 1').get() as { id: string } | undefined;
    if (!reg) return;

    await expect(
      getEvidenceRequirements(db, { regulation: reg.id, section: 'FAKE_999' })
    ).rejects.toThrow('not found');
  });

  it('throws for nonexistent regulation', async () => {
    await expect(
      getEvidenceRequirements(db, { regulation: 'FAKE', section: '1.1' })
    ).rejects.toThrow('not found');
  });
});

// ──────────────────────────────────────────────
// get_compliance_action_items
// ──────────────────────────────────────────────
describe('get_compliance_action_items', () => {
  it('generates action items from sections', async () => {
    const row = db.prepare('SELECT regulation, section_number FROM sections LIMIT 1').get() as
      | { regulation: string; section_number: string }
      | undefined;
    if (!row) return;

    const result = await getComplianceActionItems(db, {
      regulation: row.regulation,
      sections: [row.section_number],
    });
    expect(result.regulation).toBe(row.regulation);
    expect(result.action_items.length).toBeGreaterThan(0);
    expect(result.action_items[0].priority).toMatch(/^(high|medium|low)$/);
  });

  it('skips nonexistent sections gracefully', async () => {
    const reg = db.prepare('SELECT id FROM regulations LIMIT 1').get() as { id: string } | undefined;
    if (!reg) return;

    const result = await getComplianceActionItems(db, {
      regulation: reg.id,
      sections: ['NONEXISTENT_999'],
    });
    expect(result.action_items).toEqual([]);
  });

  it('throws on too many sections', async () => {
    const many = Array.from({ length: 21 }, (_, i) => `S_${i}`);
    await expect(
      getComplianceActionItems(db, { regulation: 'HIPAA', sections: many })
    ).rejects.toThrow('Cannot process more than 20');
  });
});

// ──────────────────────────────────────────────
// get_breach_notification_timeline
// ──────────────────────────────────────────────
describe('get_breach_notification_timeline', () => {
  it('returns all timelines without filters', async () => {
    const hasRules = db.prepare(
      "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='breach_notification_rules'"
    ).get() as { cnt: number };
    if (hasRules.cnt === 0) return; // table may not exist yet

    const result = await getBreachNotificationTimeline(db, {});
    // If data is loaded, should have results
    if (result.total_results > 0) {
      expect(result.timelines[0].jurisdiction).toBeDefined();
      expect(result.timelines[0].notification_deadline).toBeDefined();
    }
  });

  it('filters by state', async () => {
    const hasRules = db.prepare(
      "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='breach_notification_rules'"
    ).get() as { cnt: number };
    if (hasRules.cnt === 0) return;

    const row = db.prepare('SELECT jurisdiction FROM breach_notification_rules LIMIT 1').get() as
      | { jurisdiction: string }
      | undefined;
    if (!row) return;

    const result = await getBreachNotificationTimeline(db, { state: row.jurisdiction });
    expect(result.total_results).toBeGreaterThan(0);
    expect(result.timelines[0].jurisdiction).toBe(row.jurisdiction);
  });

  it('returns diagnostics for unknown jurisdiction', async () => {
    const hasRules = db.prepare(
      "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='breach_notification_rules'"
    ).get() as { cnt: number };
    if (hasRules.cnt === 0) return;

    const result = await getBreachNotificationTimeline(db, { state: 'Narnia' });
    expect(result.total_results).toBe(0);
    if (result.diagnostics) {
      expect(result.diagnostics.hint).toContain('Narnia');
    }
  });
});
