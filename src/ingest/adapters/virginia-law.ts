/**
 * Virginia Legislative Information System Adapter
 *
 * Fetches Virginia CDPA from Virginia LIS.
 * Source: Va. Code Ann. § 59.1-575 to 59.1-585
 */

import {
  SourceAdapter,
  RegulationMetadata,
  Section,
  Definition,
  UpdateStatus,
} from '../framework.js';
import * as cheerio from 'cheerio';

class ScrapingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class VirginiaLawAdapter implements SourceAdapter {
  private readonly regulationId = 'VIRGINIA_CDPA';
  private readonly sectionStart = 575;
  private readonly sectionEnd = 585;

  async fetchMetadata(): Promise<RegulationMetadata> {
    return {
      id: 'VIRGINIA_CDPA',
      full_name: 'Virginia Consumer Data Protection Act',
      citation: 'Va. Code Ann. §59.1-575 to 59.1-585',
      effective_date: '2023-01-01',
      last_amended: '2026-01-01',
      source_url: 'https://law.lis.virginia.gov/vacode/title59.1/chapter53/',
      jurisdiction: 'virginia',
      regulation_type: 'statute',
    };
  }

  async *fetchSections(): AsyncGenerator<Section[]> {
    const sections: Section[] = [];
    let totalCount = 0;

    console.log(`Fetching Virginia CDPA sections ${this.sectionStart}-${this.sectionEnd}...`);

    for (let num = this.sectionStart; num <= this.sectionEnd; num++) {
      try {
        const url = `https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-${num}/`;

        await this.sleep(500); // Polite delay
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`  Skipping § 59.1-${num} (HTTP ${response.status})`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        this.validateDOM($);

        const section = this.parseSection($, num);
        if (section) {
          sections.push(section);
          totalCount++;
          console.log(`  Fetched § 59.1-${num}`);
        }

        if (sections.length >= 10) {
          yield sections.splice(0, 10);
        }
      } catch (error) {
        if (error instanceof ScrapingError) {
          throw error; // Fail fast on DOM issues
        }
        console.warn(`  Failed to fetch § 59.1-${num}, continuing...`, error);
      }
    }

    if (sections.length > 0) {
      yield sections;
    }

    // Validation
    if (totalCount < 10) {
      throw new ScrapingError(`Expected at least 10 sections, got ${totalCount}`);
    }
  }

  private validateDOM($: cheerio.Root): void {
    const codeContent = $('#va_code');
    if (codeContent.length === 0) {
      throw new ScrapingError('DOM structure changed: no #va_code element found');
    }
  }

  private parseSection($: cheerio.Root, num: number): Section | null {
    // Extract section text from #va_code
    const textEl = $('#va_code');
    const text = textEl.text().trim();

    if (!text || text.length < 100) {
      return null; // Skip sections with insufficient content
    }

    // Extract title from h2 within #va_code
    const titleEl = textEl.find('h2').first();
    const titleRaw = titleEl.text().trim();

    // Parse title to extract just the description
    // Format: "§ 59.1-575. (Effective January 1, 2026) Definitions."
    const titleMatch = titleRaw.match(/§\s*59\.1-\d+\.?\s*(?:\([^)]+\))?\s*(.+?)\.?\s*$/);
    const title = titleMatch ? titleMatch[1].trim() : titleRaw;

    return {
      sectionNumber: `59.1-${num}`,
      title: title,
      text: text,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async extractDefinitions(): Promise<Definition[]> {
    // No separate definitions for Virginia CDPA
    return [];
  }

  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    return { hasChanges: false };
  }
}

export function createVirginiaAdapter(): SourceAdapter {
  return new VirginiaLawAdapter();
}
