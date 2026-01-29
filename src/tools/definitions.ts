import type { Database } from 'better-sqlite3';

export interface DefinitionsInput {
  term: string;
  regulation?: string;
}

export interface Definition {
  regulation: string;
  term: string;
  definition: string;
  section: string;
}

export interface DefinitionsResult {
  term: string;
  definitions: Definition[];
  total_definitions: number;
}

function escapeSqlLike(str: string): string {
  return str.replace(/[%_]/g, '\\$&');
}

/**
 * Look up official term definitions across regulations.
 * Uses LIKE search to match partial terms (e.g., "health" matches "protected health information").
 */
export async function getDefinitions(
  db: Database,
  input: DefinitionsInput
): Promise<DefinitionsResult> {
  const { term, regulation } = input;

  if (!term || term.trim().length === 0) {
    throw new Error('Term is required');
  }

  // Build query with optional regulation filter
  let sql = `
    SELECT
      regulation,
      term,
      definition,
      section
    FROM definitions
    WHERE term LIKE ?
  `;

  // Use LIKE for partial matching (case-insensitive)
  const params: string[] = [`%${escapeSqlLike(term)}%`];

  if (regulation) {
    sql += ' AND regulation = ?';
    params.push(regulation);
  }

  sql += ' ORDER BY regulation, term';

  const rows = db.prepare(sql).all(...params) as Array<{
    regulation: string;
    term: string;
    definition: string;
    section: string;
  }>;

  const definitions = rows.map((row) => ({
    regulation: row.regulation,
    term: row.term,
    definition: row.definition,
    section: row.section,
  }));

  return {
    term,
    definitions,
    total_definitions: definitions.length,
  };
}
