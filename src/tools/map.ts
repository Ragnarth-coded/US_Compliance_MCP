import type { Database } from 'better-sqlite3';

export interface MapControlsInput {
  framework: string;
  control?: string;
  regulation?: string;
}

export interface ControlMapping {
  framework: string;
  control_id: string;
  control_name: string;
  regulation: string;
  sections: string[];
  coverage: 'full' | 'partial' | 'related';
  notes: string | null;
}

export interface MapControlsResult {
  framework: string;
  mappings: ControlMapping[];
  total_mappings: number;
  diagnostics?: {
    frameworks_available: string[];
    regulations_with_mappings: string[];
    hint?: string;
  };
}

/**
 * Map NIST controls (800-53, CSF) to regulation sections.
 * Can filter by specific control ID or regulation.
 */
export async function mapControls(
  db: Database,
  input: MapControlsInput
): Promise<MapControlsResult> {
  const { framework, control, regulation } = input;

  if (!framework) {
    throw new Error('Framework is required (e.g., "NIST_CSF", "NIST_800_53")');
  }

  // Build query with optional filters
  let sql = `
    SELECT
      framework,
      control_id,
      control_name,
      regulation,
      sections,
      coverage,
      notes
    FROM control_mappings
    WHERE framework = ?
  `;

  const params: string[] = [framework];

  if (control) {
    sql += ' AND control_id = ?';
    params.push(control);
  }

  if (regulation) {
    sql += ' AND regulation = ?';
    params.push(regulation);
  }

  sql += ' ORDER BY control_id, regulation';

  const rows = db.prepare(sql).all(...params) as Array<{
    framework: string;
    control_id: string;
    control_name: string;
    regulation: string;
    sections: string;
    coverage: 'full' | 'partial' | 'related';
    notes: string | null;
  }>;

  // Parse sections JSON
  const mappings = rows.map((row) => ({
    framework: row.framework,
    control_id: row.control_id,
    control_name: row.control_name,
    regulation: row.regulation,
    sections: (() => {
      try {
        return JSON.parse(row.sections);
      } catch {
        console.warn(`Invalid sections JSON for ${row.control_id}`);
        return [];
      }
    })(),
    coverage: row.coverage,
    notes: row.notes,
  }));

  // If no results, provide diagnostics
  if (mappings.length === 0) {
    const frameworks = db.prepare('SELECT DISTINCT framework FROM control_mappings ORDER BY framework').all() as Array<{ framework: string }>;
    const regsWithMappings = db.prepare('SELECT DISTINCT regulation FROM control_mappings ORDER BY regulation').all() as Array<{ regulation: string }>;

    let hint: string | undefined;
    const frameworkIds = frameworks.map(f => f.framework);
    if (!frameworkIds.includes(framework)) {
      hint = `Framework "${framework}" not found. Available frameworks: ${frameworkIds.join(', ')}`;
    } else if (regulation) {
      const regIds = regsWithMappings.map(r => r.regulation);
      if (!regIds.includes(regulation)) {
        hint = `No mappings for regulation "${regulation}" in ${framework}. Regulations with mappings: ${regIds.join(', ')}`;
      }
    }

    return {
      framework,
      mappings: [],
      total_mappings: 0,
      diagnostics: {
        frameworks_available: frameworkIds,
        regulations_with_mappings: regsWithMappings.map(r => r.regulation),
        hint,
      },
    };
  }

  return {
    framework,
    mappings,
    total_mappings: mappings.length,
  };
}
