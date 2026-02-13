import type { Database } from '@ansvar/mcp-sqlite';

export interface SearchInput {
  query: string;
  regulations?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  regulation: string;
  section: string;
  title: string;
  snippet: string;
  relevance: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  query: string;
  diagnostics?: {
    available_regulations: string[];
    hint?: string;
  };
}

/**
 * Escape special FTS5 query characters and build optimal search query.
 * Uses adaptive logic:
 * - Short queries (1-3 words): AND logic with exact matching for precision
 * - Long queries (4+ words): OR logic with prefix matching for recall
 * This prevents empty results on complex queries while maintaining precision on simple ones.
 *
 * Handles hyphenated terms by converting them to spaces (e.g., "third-party" → "third party")
 * to avoid FTS5 syntax errors where hyphens are interpreted as operators.
 */
function escapeFts5Query(query: string): string {
  // Common stopwords that add noise to searches
  const stopwords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);

  // Normalize query: remove quotes, convert hyphens to spaces
  // This allows "third-party" to become "third party" which FTS5 handles naturally
  const words = query
    .replace(/['"]/g, '') // Remove quotes
    .replace(/-/g, ' ') // Convert hyphens to spaces (fixes "third-party" → "third party")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word.toLowerCase())); // Filter short words and stopwords

  if (words.length === 0) {
    return '';
  }

  if (words.length <= 2) {
    // Short queries (1-2 words): Use AND logic with prefix matching for precision
    // Example: "incident reporting" → incident* reporting*
    // Prefix matching handles word variations (encrypt vs encryption)
    return words.map(word => `${word}*`).join(' ');
  } else {
    // Long queries (3+ words): Use OR logic with prefix matching for better recall
    // Example: "encryption transmission storage" → encryption* OR transmission* OR storage*
    // BM25 will still rank documents with more matches higher
    return words.map(word => `${word}*`).join(' OR ');
  }
}

export async function searchRegulations(
  db: Database,
  input: SearchInput
): Promise<SearchResponse> {
  let { query, regulations, limit = 10, offset = 0 } = input;

  // Validate and sanitize limit parameter
  if (!Number.isFinite(limit) || limit < 0) {
    limit = 10; // Default to safe value
  }
  // Cap at reasonable maximum
  limit = Math.min(Math.floor(limit), 1000);

  // Validate and sanitize offset parameter
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }
  offset = Math.floor(offset);

  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty. Please provide a search term.');
  }

  const escapedQuery = escapeFts5Query(query);

  if (!escapedQuery) {
    const available = db.prepare('SELECT id FROM regulations ORDER BY id').all() as Array<{ id: string }>;
    return {
      results: [],
      total_results: 0,
      query,
      diagnostics: {
        available_regulations: available.map(r => r.id),
        hint: 'Query contained only stopwords or special characters. Try more specific terms like "encryption", "breach notification", or "access control".',
      },
    };
  }

  const params: (string | number)[] = [escapedQuery];

  // Build optional regulation filter
  let regulationFilter = '';
  if (regulations && regulations.length > 0) {
    const placeholders = regulations.map(() => '?').join(', ');
    regulationFilter = ` AND regulation IN (${placeholders})`;
    params.push(...regulations);
  }

  // Search in sections
  const sectionsQuery = `
    SELECT
      sections_fts.regulation,
      sections_fts.section_number as section,
      sections_fts.title,
      snippet(sections_fts, 3, '>>>', '<<<', '...', 32) as snippet,
      bm25(sections_fts) as relevance
    FROM sections_fts
    WHERE sections_fts MATCH ?
    ${regulationFilter}
    ORDER BY bm25(sections_fts)
    LIMIT ? OFFSET ?
  `;

  try {
    // Execute query
    const sectionsParams = [...params, limit, offset];

    const sectionStmt = db.prepare(sectionsQuery);

    const sectionRows = sectionStmt.all(...sectionsParams) as Array<{
      regulation: string;
      section: string;
      title: string;
      snippet: string;
      relevance: number;
    }>;

    // BM25 returns negative scores; convert to positive for clarity
    const results = sectionRows.map(row => ({
      ...row,
      relevance: Math.abs(row.relevance),
    }));

    // If no results, provide diagnostics to help the agent self-correct
    if (results.length === 0) {
      const available = db.prepare('SELECT id FROM regulations ORDER BY id').all() as Array<{ id: string }>;
      const availableIds = available.map(r => r.id);

      let hint: string | undefined;
      if (regulations && regulations.length > 0) {
        const invalid = regulations.filter(r => !availableIds.includes(r));
        if (invalid.length > 0) {
          hint = `Unknown regulation(s): ${invalid.join(', ')}. Try without the regulations filter, or use list_regulations to see valid IDs.`;
        } else {
          hint = 'No matches found in the specified regulations. Try broadening your query or removing the regulation filter.';
        }
      } else {
        hint = 'No matches found. Try simpler or alternative terms.';
      }

      return {
        results: [],
        total_results: 0,
        query,
        diagnostics: {
          available_regulations: availableIds,
          hint,
        },
      };
    }

    return { results, total_results: results.length, query };
  } catch (error) {
    // If FTS5 query fails (e.g., syntax error), return empty results with diagnostics
    if (error instanceof Error && error.message.includes('fts5')) {
      return {
        results: [],
        total_results: 0,
        query,
        diagnostics: {
          available_regulations: [],
          hint: `Search query syntax error. Try simpler terms without special characters.`,
        },
      };
    }
    throw error;
  }
}
