/**
 * FFIEC Adapter - Seed-based for v1.1
 * TODO: Implement PDF scraping for automated updates
 *
 * Source: FFIEC IT Examination Handbook
 * URL: https://www.ffiec.gov/examination.htm
 */

import { SourceAdapter, RegulationMetadata, Section, Definition, UpdateStatus } from '../framework.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Seed-based adapter for FFIEC Guidelines
 *
 * Future enhancement: Implement PDF scraping from ffiec.gov
 * The IT Examination Handbook is published as a collection of PDF booklets
 */
export class FfiecAdapter implements SourceAdapter {
  private seedPath: string;

  constructor() {
    this.seedPath = join(__dirname, '../../../data/seed/ffiec.json');
  }

  /**
   * Fetch regulation metadata from seed file
   */
  async fetchMetadata(): Promise<RegulationMetadata> {
    const seed = JSON.parse(readFileSync(this.seedPath, 'utf-8'));
    return {
      ...seed.regulation,
      source_url: 'https://www.ffiec.gov/examination.htm',
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
   * Future: Extract from PDF glossary sections
   */
  async extractDefinitions(): Promise<Definition[]> {
    return [];
  }

  /**
   * Check for updates (not implemented for seed-based adapter)
   * Future: Check PDF publication dates on ffiec.gov
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
 * Factory function to create FFIEC adapter
 */
export function createFfiecAdapter(): FfiecAdapter {
  return new FfiecAdapter();
}
