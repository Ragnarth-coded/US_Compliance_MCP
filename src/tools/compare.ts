import type { Database } from 'better-sqlite3';
import { searchRegulations, SearchResult } from './search.js';

export interface CompareInput {
  topic: string;
  regulations: string[];
}

export interface CompareResult {
  topic: string;
  comparisons: Array<{
    regulation: string;
    matches: SearchResult[];
    total_matches: number;
  }>;
  synthesis: {
    regulations_with_matches: string[];
    regulations_without_matches: string[];
    coverage_summary: string;
  };
}

/**
 * Compare requirements across multiple regulations for a specific topic.
 * Uses search_regulations internally to find relevant sections in each regulation,
 * then provides a synthesis summary.
 */
export async function compareRequirements(
  db: Database,
  input: CompareInput
): Promise<CompareResult> {
  const { topic, regulations } = input;

  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic is required');
  }

  if (!regulations || regulations.length === 0) {
    throw new Error('At least one regulation must be specified');
  }

  if (regulations.length > 10) {
    throw new Error('Cannot compare more than 10 regulations at once');
  }

  // Validate all regulation IDs exist
  const available = db.prepare('SELECT id FROM regulations ORDER BY id').all() as Array<{ id: string }>;
  const availableIds = available.map(r => r.id);
  const invalid = regulations.filter(r => !availableIds.includes(r));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown regulation(s): ${invalid.join(', ')}. Available: ${availableIds.join(', ')}`
    );
  }

  // Search each regulation independently
  const comparisons = await Promise.all(
    regulations.map(async (regulation) => {
      const response = await searchRegulations(db, {
        query: topic,
        regulations: [regulation],
        limit: 5, // Top 5 matches per regulation
      });

      return {
        regulation,
        matches: response.results,
        total_matches: response.results.length,
      };
    })
  );

  // Build synthesis
  const withMatches = comparisons.filter(c => c.total_matches > 0).map(c => c.regulation);
  const withoutMatches = comparisons.filter(c => c.total_matches === 0).map(c => c.regulation);

  let coverageSummary: string;
  if (withMatches.length === regulations.length) {
    coverageSummary = `All ${regulations.length} regulations address "${topic}". Review the matched sections to compare specific requirements and identify differences in scope or stringency.`;
  } else if (withMatches.length === 0) {
    coverageSummary = `No regulations matched "${topic}". Try different search terms or use search_regulations for broader results.`;
  } else {
    coverageSummary = `${withMatches.length} of ${regulations.length} regulations address "${topic}" (${withMatches.join(', ')}). ${withoutMatches.join(', ')} ${withoutMatches.length === 1 ? 'does' : 'do'} not appear to have specific provisions on this topic.`;
  }

  return {
    topic,
    comparisons,
    synthesis: {
      regulations_with_matches: withMatches,
      regulations_without_matches: withoutMatches,
      coverage_summary: coverageSummary,
    },
  };
}
