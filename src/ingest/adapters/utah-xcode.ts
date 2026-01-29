/**
 * Utah XCode Adapter
 *
 * Fetches Utah UCPA from le.utah.gov with version resolution.
 * Source: Utah Code Ann. § 13-61-101 to 13-61-404
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

export class UtahXcodeAdapter implements SourceAdapter {
  private readonly regulationId = 'UTAH_UCPA';
  private readonly sections = [
    '101', '102', '103', '104', '201', '202', '203', '301', '302', '303', '304', '401', '402', '403', '404'
  ];

  async fetchMetadata(): Promise<RegulationMetadata> {
    return {
      id: 'UTAH_UCPA',
      full_name: 'Utah Consumer Privacy Act',
      citation: 'Utah Code Ann. §13-61-101 to 13-61-404',
      effective_date: '2023-12-31',
      last_amended: '2024-05-01',
      source_url: 'https://le.utah.gov/xcode/Title13/Chapter61/',
      jurisdiction: 'utah',
      regulation_type: 'statute',
    };
  }

  async *fetchSections(): AsyncGenerator<Section[]> {
    const sections: Section[] = [];
    let totalCount = 0;

    console.log(`Fetching Utah UCPA sections (two-step version resolution)...`);

    for (const sectionNum of this.sections) {
      try {
        // Step 1: Get version reference
        const indexUrl = `https://le.utah.gov/xcode/Title13/Chapter61/13-61-S${sectionNum}.html`;

        await this.sleep(500);
        const indexResponse = await fetch(indexUrl);
        if (!indexResponse.ok) {
          console.warn(`  Skipping § 13-61-${sectionNum} (HTTP ${indexResponse.status})`);
          continue;
        }

        const indexHtml = await indexResponse.text();

        // Extract version filename from JavaScript
        const versionMatch = indexHtml.match(/versionArr\s*=\s*\[\s*\['([^']+)'/);
        if (!versionMatch) {
          console.warn(`  Skipping § 13-61-${sectionNum} (no version found)`);
          continue;
        }

        const versionFile = versionMatch[1];

        // Step 2: Fetch versioned HTML
        const versionUrl = `https://le.utah.gov/xcode/Title13/Chapter61/${versionFile}`;
        await this.sleep(500);
        const versionResponse = await fetch(versionUrl);

        if (!versionResponse.ok) {
          console.warn(`  Skipping § 13-61-${sectionNum} versioned file (HTTP ${versionResponse.status})`);
          continue;
        }

        const versionHtml = await versionResponse.text();
        const $ = cheerio.load(versionHtml);

        const section = this.parseSection($, sectionNum);
        if (section) {
          sections.push(section);
          totalCount++;
          console.log(`  Fetched § 13-61-${sectionNum}`);
        }

        if (sections.length >= 10) {
          yield sections.splice(0, 10);
        }
      } catch (error) {
        console.warn(`  Failed to fetch § 13-61-${sectionNum}, continuing...`, error);
      }
    }

    if (sections.length > 0) {
      yield sections;
    }

    if (totalCount < 10) {
      throw new ScrapingError(`Expected at least 10 sections, got ${totalCount}`);
    }
  }

  private parseSection($: cheerio.Root, sectionNum: string): Section | null {
    // Utah uses a main content area
    const content = $('body').text().trim();

    if (!content || content.length < 200) {
      return null;
    }

    // Extract title - format: "13-61-101 Definitions."
    const titleMatch = content.match(/13-61-\d+\s+(.+?)\.(?:\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : `Section 13-61-${sectionNum}`;

    return {
      section_number: `13-61-${sectionNum}`,
      title: title,
      text: content,
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async *fetchDefinitions(): AsyncGenerator<Definition[]> {
    return;
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    return { hasChanges: false };
  }
}

export function createUtahAdapter(): SourceAdapter {
  return new UtahXcodeAdapter();
}
