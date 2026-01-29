/**
 * Colorado Public Law Adapter
 *
 * Fetches Colorado CPA from colorado.public.law (third-party aggregator).
 * Source: C.R.S. § 6-1-1301 to 6-1-1313
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

export class ColoradoPublicAdapter implements SourceAdapter {
  private readonly regulationId = 'COLORADO_CPA';
  private readonly sectionStart = 1301;
  private readonly sectionEnd = 1313;

  async fetchMetadata(): Promise<RegulationMetadata> {
    return {
      id: 'COLORADO_CPA',
      full_name: 'Colorado Privacy Act',
      citation: 'C.R.S. §6-1-1301 to 6-1-1313',
      effective_date: '2023-07-01',
      last_amended: '2023-07-01',
      source_url: 'https://colorado.public.law/statutes/crs_title-6',
      jurisdiction: 'colorado',
      regulation_type: 'statute',
    };
  }

  async *fetchSections(): AsyncGenerator<Section[]> {
    const sections: Section[] = [];
    let totalCount = 0;

    console.log(`Fetching Colorado CPA sections ${this.sectionStart}-${this.sectionEnd}...`);

    for (let num = this.sectionStart; num <= this.sectionEnd; num++) {
      try {
        const url = `https://colorado.public.law/statutes/crs_6-1-${num}`;

        await this.sleep(500);
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`  Skipping § 6-1-${num} (HTTP ${response.status})`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const section = this.parseSection($, num);
        if (section) {
          sections.push(section);
          totalCount++;
          console.log(`  Fetched § 6-1-${num}`);
        }

        if (sections.length >= 10) {
          yield sections.splice(0, 10);
        }
      } catch (error) {
        console.warn(`  Failed to fetch § 6-1-${num}, continuing...`, error);
      }
    }

    if (sections.length > 0) {
      yield sections;
    }

    if (totalCount < 10) {
      throw new ScrapingError(`Expected at least 10 sections, got ${totalCount}`);
    }
  }

  private parseSection($: cheerio.Root, num: number): Section | null {
    // colorado.public.law has simple structure - extract main content
    // Extract title from h1#name
    const titleEl = $('h1#number_and_name span#name');
    const title = titleEl.text().trim() || `Section 6-1-${num}`;

    // Extract statute body text
    const bodyEl = $('#leaf-statute-body');
    const text = bodyEl.text().trim();

    if (!text || text.length < 50) {
      return null;
    }

    return {
      sectionNumber: `6-1-${num}`,
      title: title,
      text: text,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async extractDefinitions(): Promise<Definition[]> {
    return [];
  }

  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    return { hasChanges: false };
  }
}

export function createColoradoAdapter(): SourceAdapter {
  return new ColoradoPublicAdapter();
}
