/**
 * Connecticut General Assembly Adapter
 *
 * Fetches Connecticut CTDPA from Connecticut General Assembly website.
 * Source: Conn. Gen. Stat. § 42-515 to 42-524
 *
 * NOTE: This adapter parses a SINGLE page containing ALL sections,
 * unlike Virginia/Colorado which fetch individual section pages.
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

export class ConnecticutCGAAdapter implements SourceAdapter {
  private readonly regulationId = 'CONNECTICUT_CTDPA';
  private readonly chapterUrl =
    'https://www.cga.ct.gov/current/pub/chap_743jj.htm';

  async fetchMetadata(): Promise<RegulationMetadata> {
    return {
      id: 'CONNECTICUT_CTDPA',
      full_name: 'Connecticut Data Privacy Act',
      citation: 'Conn. Gen. Stat. §42-515 to 42-524',
      effective_date: '2023-07-01',
      last_amended: '2023-07-01',
      source_url: this.chapterUrl,
      jurisdiction: 'connecticut',
      regulation_type: 'statute',
    };
  }

  async *fetchSections(): AsyncGenerator<Section[]> {
    console.log('Fetching Connecticut CTDPA from single chapter page...');

    const response = await fetch(this.chapterUrl);
    if (!response.ok) {
      throw new ScrapingError(
        `Failed to fetch chapter page: HTTP ${response.status}`
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const sections = this.parseSections($);

    if (sections.length < 8) {
      throw new ScrapingError(
        `Expected at least 8 sections, got ${sections.length}`
      );
    }

    console.log(`  ✅ Parsed ${sections.length} sections from chapter page`);
    yield sections;
  }

  private parseSections($: cheerio.Root): Section[] {
    const sections: Section[] = [];

    // Find all paragraphs containing section headers (span.catchln)
    $('span.catchln[id^="sec_42-"]').each((_idx, elem) => {
      const $span = $(elem);
      const id = $span.attr('id');

      if (!id) return;

      // Extract section number from id: "sec_42-515" -> "515"
      const idMatch = id.match(/sec_42-(\d+)/);
      if (!idMatch) return;

      const sectionNum = idMatch[1];

      // Extract title from span text: "Sec. 42-515. Definitions." -> "Definitions"
      const spanText = $span.text().trim();
      const titleMatch = spanText.match(/^Sec\.\s+42-\d+\.\s+(.+?)\.?\s*$/);
      const title = titleMatch ? titleMatch[1].trim() : `Section 42-${sectionNum}`;

      // Get the parent paragraph and all following paragraphs until next section
      const $startPara = $span.parent();
      let fullText = $startPara.text().trim();

      // Collect following paragraphs until we hit another section marker
      let $next = $startPara.next('p');
      while ($next.length > 0) {
        // Stop if this paragraph contains another section marker
        if ($next.find('span.catchln[id^="sec_42-"]').length > 0) {
          break;
        }

        const nextText = $next.text().trim();
        if (nextText.length > 0) {
          fullText += '\n\n' + nextText;
        }

        $next = $next.next('p');
      }

      // Only include sections in the 42-515 to 42-526 range (CTDPA)
      const num = parseInt(sectionNum);
      if (num >= 515 && num <= 526) {
        sections.push({
          section_number: `42-${sectionNum}`,
          title: title,
          text: fullText,
        });

        console.log(`  Found § 42-${sectionNum}: ${title}`);
      }
    });

    return sections;
  }

  async *fetchDefinitions(): AsyncGenerator<Definition[]> {
    // Definitions are in section 42-515, could be extracted if needed
    return;
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    return { hasChanges: false };
  }
}

export function createConnecticutAdapter(): SourceAdapter {
  return new ConnecticutCGAAdapter();
}
