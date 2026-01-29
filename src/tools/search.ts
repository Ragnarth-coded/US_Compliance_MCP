import type { Database } from 'better-sqlite3';

export interface SearchInput {
  query: string;
  regulations?: string[];
  limit?: number;
}

export interface SearchResult {
  regulation: string;
  section: string;
  title: string;
  snippet: string;
  relevance: number;
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

  if (words.length <= 3) {
    // Short queries: Use AND logic with exact matching for precision
    // Example: "incident reporting" → "incident" "reporting"
    return words.map(word => `"${word}"`).join(' ');
  } else {
    // Long queries: Use OR logic with prefix matching for better recall
    // Example: "incident reporting notification timeline" → incident* OR reporting* OR notification* OR timeline*
    // BM25 will still rank documents with more matches higher
    return words.map(word => `${word}*`).join(' OR ');
  }
}

export async function searchRegulations(
  db: Database,
  input: SearchInput
): Promise<SearchResult[]> {
  let { query, regulations, limit = 10 } = input;

  // Validate and sanitize limit parameter
  if (!Number.isFinite(limit) || limit < 0) {
    limit = 10; // Default to safe value
  }
  // Cap at reasonable maximum
  limit = Math.min(Math.floor(limit), 1000);

  if (!query || query.trim().length === 0) {
    return [];
  }

  const escapedQuery = escapeFts5Query(query);

  if (!escapedQuery) {
    return [];
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
    LIMIT ?
  `;

  try {
    // Execute query
    const sectionsParams = [...params, limit];

    const sectionStmt = db.prepare(sectionsQuery);

    const sectionRows = sectionStmt.all(...sectionsParams) as Array<{
      regulation: string;
      section: string;
      title: string;
      snippet: string;
      relevance: number;
    }>;

    // Convert relevance to absolute value and sort
    const results = sectionRows
      .map(row => ({
        ...row,
        relevance: Math.abs(row.relevance),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return results;
  } catch (error) {
    // If FTS5 query fails (e.g., syntax error), return empty results
    if (error instanceof Error && error.message.includes('fts5')) {
      return [];
    }
    throw error;
  }
}
