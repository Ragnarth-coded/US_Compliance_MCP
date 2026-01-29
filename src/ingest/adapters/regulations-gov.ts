/**
 * SOX Adapter
 *
 * Fetches SOX regulations from eCFR (for SEC implementing rules).
 * Source: 17 CFR Part 229 (Regulation S-K, Item 308) and Part 240 (Exchange Act Rules)
 *
 * PRODUCTION IMPLEMENTATION
 * Uses eCFR API for SEC regulations implementing Sarbanes-Oxley Section 404
 */

import {
  SourceAdapter,
  RegulationMetadata,
  Section,
  Definition,
  UpdateStatus,
} from '../framework.js';
import { XMLParser } from 'fast-xml-parser';
import { EcfrAdapter } from './ecfr.js';

/**
 * Adapter for fetching SOX regulations from eCFR
 *
 * Uses eCFR API for SEC regulations implementing Sarbanes-Oxley
 */
export class SoxAdapter implements SourceAdapter {
  private readonly regulationId: string;
  private readonly ecfrAdapter: EcfrAdapter;

  constructor(regulationId: string) {
    this.regulationId = regulationId;
    // Use eCFR adapter for Title 17 (SEC regulations)
    this.ecfrAdapter = new EcfrAdapter('SOX-SEC', 17, [229, 240], {
      full_name: 'Sarbanes-Oxley Act',
      citation: '17 CFR Parts 229, 240',
      effective_date: '2002-07-30',
      jurisdiction: 'federal',
      regulation_type: 'rule'
    });
  }

  /**
   * Fetch SOX metadata
   */
  async fetchMetadata(): Promise<RegulationMetadata> {
    return {
      id: this.regulationId,
      full_name: 'Sarbanes-Oxley Act - SEC Implementing Regulations',
      citation: '17 CFR Parts 229, 240 (Regulation S-K Item 308, Exchange Act Rules)',
      effective_date: '2003-06-05',
      last_amended: new Date().toISOString().split('T')[0],
      source_url: 'https://www.ecfr.gov/current/title-17',
      jurisdiction: 'federal',
      regulation_type: 'rule',
    };
  }

  /**
   * Fetch all SOX-related sections from eCFR
   *
   * Fetches 17 CFR Parts 229 and 240, filtering to SOX-relevant sections
   */
  async *fetchSections(): AsyncGenerator<Section[]> {
    console.log('Fetching SOX sections from eCFR (Title 17)...');

    // Key SOX-related sections:
    // - 17 CFR 229.308 (Item 308: Internal control over financial reporting)
    // - 17 CFR 240.13a-15 (Controls and procedures)
    // - 17 CFR 240.15d-15 (Controls and procedures)
    // - 17 CFR 240.13a-14 (Certifications)
    // - 17 CFR 240.15d-14 (Certifications)

    const relevantSections = [
      '229.308',
      '240.13a-15',
      '240.15d-15',
      '240.13a-14',
      '240.15d-14',
    ];

    // Fetch from eCFR adapter
    for await (const sectionBatch of this.ecfrAdapter.fetchSections()) {
      // Filter to SOX-relevant sections
      const filtered = sectionBatch.filter(section =>
        relevantSections.some(relevant => section.sectionNumber.includes(relevant))
      );

      if (filtered.length > 0) {
        yield filtered;
      }
    }
  }

  /**
   * Check for updates since last fetch
   *
   * Delegates to eCFR adapter for update checking
   */
  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    return this.ecfrAdapter.checkForUpdates(lastFetched);
  }

  /**
   * Extract definitions from SOX sections
   *
   * Future enhancement: Parse definitions from SEC regulations
   */
  async extractDefinitions(): Promise<Definition[]> {
    return this.ecfrAdapter.extractDefinitions();
  }
}

/**
 * Factory function to create SOX adapter
 */
export function createSoxAdapter(): SoxAdapter {
  return new SoxAdapter('SOX');
}
