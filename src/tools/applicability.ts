import type { Database } from 'better-sqlite3';

export interface ApplicabilityInput {
  sector: string;
  subsector?: string;
}

export interface ApplicabilityRule {
  regulation: string;
  sector: string;
  subsector: string | null;
  applies: boolean;
  confidence: 'definite' | 'likely' | 'possible';
  basis_section: string | null;
  notes: string | null;
}

export interface ApplicabilityResult {
  sector: string;
  subsector: string | null;
  applicable_regulations: ApplicabilityRule[];
  total_applicable: number;
}

/**
 * Check which regulations apply to a specific sector/subsector.
 * Returns regulations that apply with confidence levels.
 */
export async function checkApplicability(
  db: Database,
  input: ApplicabilityInput
): Promise<ApplicabilityResult> {
  const { sector, subsector } = input;

  if (!sector || sector.trim().length === 0) {
    throw new Error('Sector is required (e.g., "healthcare", "financial", "retail")');
  }

  // Query applicability rules
  let sql = `
    SELECT
      regulation,
      sector,
      subsector,
      applies,
      confidence,
      basis_section,
      notes
    FROM applicability_rules
    WHERE sector = ?
  `;

  const params: string[] = [sector];

  if (subsector) {
    sql += ' AND (subsector = ? OR subsector IS NULL)';
    params.push(subsector);
  }

  sql += ' ORDER BY applies DESC, confidence ASC';

  const rows = db.prepare(sql).all(...params) as Array<{
    regulation: string;
    sector: string;
    subsector: string | null;
    applies: number; // Database stores as INTEGER (0 or 1)
    confidence: 'definite' | 'likely' | 'possible';
    basis_section: string | null;
    notes: string | null;
  }>;

  // Filter to only regulations that apply
  const applicableRules = rows
    .filter((row) => row.applies === 1)
    .map((row) => ({
      regulation: row.regulation,
      sector: row.sector,
      subsector: row.subsector,
      applies: row.applies === 1,
      confidence: row.confidence,
      basis_section: row.basis_section,
      notes: row.notes,
    }));

  return {
    sector,
    subsector: subsector || null,
    applicable_regulations: applicableRules,
    total_applicable: applicableRules.length,
  };
}
