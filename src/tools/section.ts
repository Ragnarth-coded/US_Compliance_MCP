import type { Database } from '@ansvar/mcp-sqlite';

export interface GetSectionInput {
  regulation: string;
  section: string;
}

export interface SectionData {
  regulation: string;
  section_number: string;
  title: string | null;
  text: string;
  chapter: string | null;
  parent_section: string | null;
  cross_references: string[] | null;
  truncated?: boolean;
  original_length?: number;
  token_estimate?: number;
}

export async function getSection(
  db: Database,
  input: GetSectionInput
): Promise<SectionData> {
  const { regulation, section } = input;

  const sql = `
    SELECT
      regulation,
      section_number,
      title,
      text,
      chapter,
      parent_section,
      cross_references
    FROM sections
    WHERE regulation = ? AND section_number = ?
  `;

  const row = db.prepare(sql).get(regulation, section) as {
    regulation: string;
    section_number: string;
    title: string | null;
    text: string;
    chapter: string | null;
    parent_section: string | null;
    cross_references: string | null;
  } | undefined;

  if (!row) {
    // Check if regulation exists at all
    const regExists = db.prepare('SELECT 1 FROM regulations WHERE id = ?').get(regulation);
    if (!regExists) {
      const available = db.prepare('SELECT id FROM regulations ORDER BY id').all() as Array<{ id: string }>;
      throw new Error(
        `Regulation "${regulation}" not found. Available regulations: ${available.map(r => r.id).join(', ')}`
      );
    }
    throw new Error(
      `Section "${section}" not found in ${regulation}. Use list_regulations with regulation="${regulation}" to see available sections, or search_regulations to find content.`
    );
  }

  // Token management: Truncate very large sections to prevent context overflow
  const MAX_CHARS = 50000; // ~12,500 tokens (safe for 200k context window)
  const originalLength = row.text.length;
  const tokenEstimate = Math.ceil(originalLength / 4); // ~4 chars per token
  let text = row.text;
  let truncated = false;

  if (originalLength > MAX_CHARS) {
    text = row.text.substring(0, MAX_CHARS) + '\n\n[... Section truncated due to length. Original: ' + originalLength + ' chars (~' + tokenEstimate + ' tokens). Use search_regulations to find specific content.]';
    truncated = true;
  }

  return {
    regulation: row.regulation,
    section_number: row.section_number,
    title: row.title,
    text,
    chapter: row.chapter,
    parent_section: row.parent_section,
    cross_references: row.cross_references ? (() => {
      try {
        return JSON.parse(row.cross_references);
      } catch {
        console.warn(`Invalid cross_references JSON for ${row.regulation} ${row.section_number}`);
        return null;
      }
    })() : null,
    truncated,
    original_length: truncated ? originalLength : undefined,
    token_estimate: truncated ? tokenEstimate : undefined,
  };
}
