/**
 * NYDFS Adapter - Seed-based for v1.1
 * TODO: Implement HTML scraping for automated updates
 *
 * Source: NY DFS Cybersecurity Regulation (23 NYCRR 500)
 * URL: https://www.dfs.ny.gov/industry_guidance/cybersecurity
 */

import { SourceAdapter, RegulationMetadata, Section, Definition, UpdateStatus } from '../framework.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Seed-based adapter for NYDFS 23 NYCRR 500
 *
 * Future enhancement: Implement HTML scraping from NY DFS website
 * The regulation is published online at dfs.ny.gov
 */
export class NydfsAdapter implements SourceAdapter {
  private seedPath: string;

  constructor() {
    this.seedPath = join(__dirname, '../../../data/seed/nydfs.json');
  }

  /**
   * Fetch regulation metadata from seed file
   */
  async fetchMetadata(): Promise<RegulationMetadata> {
    const seed = JSON.parse(readFileSync(this.seedPath, 'utf-8'));
    return {
      ...seed.regulation,
      source_url: 'https://www.dfs.ny.gov/industry_guidance/cybersecurity',
      last_amended: seed.regulation.effective_date
    };
  }

  /**
   * Fetch sections from seed file
   * Returns all sections in a single batch
   */
  async *fetchSections(): AsyncGenerator<Section[]> {
    const seed = JSON.parse(readFileSync(this.seedPath, 'utf-8'));
    yield seed.sections;
  }

  /**
   * Extract definitions (not implemented for seed-based adapter)
   * Future: Extract from 500.01 Definitions section
   */
  async extractDefinitions(): Promise<Definition[]> {
    return [];
  }

  /**
   * Check for updates (not implemented for seed-based adapter)
   * Future: Check last-modified headers from NY DFS website
   */
  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    return {
      hasChanges: false,
      lastModified: new Date(),
      changes: []
    };
  }
}

/**
 * Factory function to create NYDFS adapter
 */
export function createNydfsAdapter(): NydfsAdapter {
  return new NydfsAdapter();
}
