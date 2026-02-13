import type { Database } from '@ansvar/mcp-sqlite';

export interface ListInput {
  regulation?: string;
}

export interface RegulationInfo {
  id: string;
  full_name: string;
  citation: string;
  effective_date: string | null;
  jurisdiction: string | null;
}

export interface Chapter {
  name: string;
  sections: string[];
}

export interface RegulationStructure {
  regulation: RegulationInfo;
  chapters: Chapter[];
}

export interface ListResult {
  regulations?: RegulationInfo[];
  structure?: RegulationStructure;
}

export async function listRegulations(
  db: Database,
  input: ListInput
): Promise<ListResult> {
  const { regulation } = input;

  if (regulation) {
    // Get specific regulation with chapters
    const regRow = db.prepare(`
      SELECT id, full_name, citation, effective_date, jurisdiction
      FROM regulations
      WHERE id = ?
    `).get(regulation) as {
      id: string;
      full_name: string;
      citation: string;
      effective_date: string | null;
      jurisdiction: string | null;
    } | undefined;

    if (!regRow) {
      return { regulations: [] };
    }

    // Get sections grouped by chapter
    const sections = db.prepare(`
      SELECT section_number, title, chapter
      FROM sections
      WHERE regulation = ?
      ORDER BY section_number
    `).all(regulation) as Array<{
      section_number: string;
      title: string | null;
      chapter: string | null;
    }>;

    // Group by chapter
    const chapterMap = new Map<string, Chapter>();
    for (const section of sections) {
      const chapterKey = section.chapter || 'General';
      if (!chapterMap.has(chapterKey)) {
        chapterMap.set(chapterKey, {
          name: chapterKey,
          sections: [],
        });
      }
      chapterMap.get(chapterKey)!.sections.push(section.section_number);
    }

    return {
      structure: {
        regulation: {
          id: regRow.id,
          full_name: regRow.full_name,
          citation: regRow.citation,
          effective_date: regRow.effective_date,
          jurisdiction: regRow.jurisdiction,
        },
        chapters: Array.from(chapterMap.values()),
      },
    };
  }

  // List all regulations
  const rows = db.prepare(`
    SELECT
      id,
      full_name,
      citation,
      effective_date,
      jurisdiction
    FROM regulations
    ORDER BY id
  `).all() as Array<{
    id: string;
    full_name: string;
    citation: string;
    effective_date: string | null;
    jurisdiction: string | null;
  }>;

  return {
    regulations: rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      citation: row.citation,
      effective_date: row.effective_date,
      jurisdiction: row.jurisdiction,
    })),
  };
}
