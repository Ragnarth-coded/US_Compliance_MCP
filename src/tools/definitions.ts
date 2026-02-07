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
  diagnostics?: {
    regulations_with_definitions: string[];
    hint?: string;
  };
}

function escapeSqlLike(str: string): string {
  // Escape backslashes first, then SQL LIKE wildcards
  return str.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
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

  // If no results, provide diagnostics
  if (definitions.length === 0) {
    const regsWithDefs = db.prepare('SELECT DISTINCT regulation FROM definitions ORDER BY regulation').all() as Array<{ regulation: string }>;
    const regIds = regsWithDefs.map(r => r.regulation);

    let hint: string | undefined;
    if (regulation && !regIds.includes(regulation)) {
      hint = `Regulation "${regulation}" has no definitions loaded. Regulations with definitions: ${regIds.join(', ') || 'none yet'}. Try search_regulations to find the term in section text instead.`;
    } else if (regIds.length === 0) {
      hint = 'No definitions are loaded yet. Use search_regulations to find terms in regulation text.';
    } else {
      hint = `No definitions match "${term}". Try a shorter or more general term, or use search_regulations to find it in section text.`;
    }

    return {
      term,
      definitions: [],
      total_definitions: 0,
      diagnostics: {
        regulations_with_definitions: regIds,
        hint,
      },
    };
  }

  return {
    term,
    definitions,
    total_definitions: definitions.length,
  };
}
