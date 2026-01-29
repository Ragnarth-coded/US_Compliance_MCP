/**
 * California Legislative Information Adapter
 *
 * Fetches CCPA/CPRA regulations from California LegInfo.
 * Source: California Civil Code § 1798.100-1798.199
 *
 * PRODUCTION IMPLEMENTATION
 * Uses HTML scraping with fail-fast DOM validation
 */

import {
  SourceAdapter,
  RegulationMetadata,
  Section,
  Definition,
  UpdateStatus,
} from '../framework.js';
import * as cheerio from 'cheerio';

/**
 * Scraping error thrown when DOM structure validation fails
 */
class ScrapingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapingError';
  }
}

/**
 * DOM structure schema for validation
 */
interface DOMSchema {
  minExpectedSections: number;
  minTextLength: number;
}

/**
 * Adapter for fetching CCPA/CPRA from California Legislative Information
 */
export class CaliforniaLeginfoAdapter implements SourceAdapter {
  private readonly regulationId: string;
  private readonly civilCodeStart: number;
  private readonly civilCodeEnd: number;

  constructor(regulationId: string, civilCodeStart: number, civilCodeEnd: number) {
    this.regulationId = regulationId;
    this.civilCodeStart = civilCodeStart;
    this.civilCodeEnd = civilCodeEnd;
  }

  /**
   * Fetch CCPA metadata
   *
   * PLACEHOLDER: Returns hardcoded CCPA metadata
   * TODO: Integrate with California LegInfo to fetch live metadata
   */
  async fetchMetadata(): Promise<RegulationMetadata> {
    // Placeholder metadata for CCPA/CPRA
    return {
      id: this.regulationId,
      full_name: 'California Consumer Privacy Act',
      citation: 'Cal. Civ. Code § 1798.100-1798.199',
      effective_date: '2020-01-01',
      last_amended: '2023-01-01',
      source_url: 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5',
      jurisdiction: 'california',
      regulation_type: 'statute',
    };
  }

  /**
   * Fetch all CCPA sections
   *
   * Scrapes HTML from California LegInfo with fail-fast validation
   * Source: https://leginfo.legislature.ca.gov/faces/codes.xhtml
   */
  async *fetchSections(): AsyncGenerator<Section[]> {
    const BASE_URL = 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml';
    const sections: Section[] = [];

    // CCPA spans sections 1798.100 - 1798.199
    // Generate all section numbers (100, 105, 110, ..., 199)
    const sectionNumbers: number[] = [];
    for (let i = this.civilCodeStart; i <= this.civilCodeEnd; i += 5) {
      sectionNumbers.push(i);
    }
    // Also add intermediate sections that exist
    sectionNumbers.push(1798.140, 1798.145, 1798.150, 1798.155, 1798.160, 1798.185, 1798.192, 1798.196, 1798.198, 1798.199);

    console.log(`Fetching ${sectionNumbers.length} CCPA sections from California LegInfo...`);

    for (const sectionNum of sectionNumbers) {
      try {
        const url = `${BASE_URL}?lawCode=CIV&division=3.&part=4.&section=${sectionNum}`;

        // Fetch HTML with polite delay
        await this.sleep(500); // 500ms between requests
        const response = await this.fetchWithRetry(url);
        const html = await response.text();

        // Parse HTML
        const $ = cheerio.load(html);

        // Validate DOM structure
        this.validateDOM($);

        // Extract section content
        const section = this.parseSection($, sectionNum.toString());
        if (section) {
          sections.push(section);
          console.log(`  Fetched § ${sectionNum}`);
        }

        // Yield in batches of 10
        if (sections.length >= 10) {
          yield sections.splice(0, 10);
        }
      } catch (error) {
        if (error instanceof ScrapingError) {
          console.error(`Scraping failed for § ${sectionNum}:`, error.message);
          throw error; // Fail fast on DOM structure issues
        } else {
          console.warn(`Failed to fetch § ${sectionNum}, continuing...`, error);
          // Continue with other sections
        }
      }
    }

    // Yield remaining sections
    if (sections.length > 0) {
      yield sections;
    }
  }

  /**
   * Validate DOM structure with fail-fast assertions
   */
  private validateDOM($: cheerio.Root): void {
    // Check for expected structure
    const sectionContent = $('.codesectionsection, .sectioncontent, .Section');

    if (sectionContent.length === 0) {
      throw new ScrapingError(
        'DOM structure changed: no section content found. Expected .codesectionsection, .sectioncontent, or .Section'
      );
    }

    // Additional validation: check if we got an error page
    if ($('title').text().includes('Error') || $('body').text().includes('not found')) {
      throw new ScrapingError('Section not found or error page returned');
    }
  }

  /**
   * Parse section from HTML
   */
  private parseSection($: cheerio.Root, sectionNum: string): Section | null {
    // Try multiple selectors (LegInfo HTML structure varies)
    let text = $('.codesectionsection').text().trim();
    if (!text) {
      text = $('.sectioncontent').text().trim();
    }
    if (!text) {
      text = $('.Section').text().trim();
    }
    if (!text) {
      text = $('body').text().trim(); // Fallback: get all body text
    }

    // Validate text length
    if (!text || text.length < 100) {
      console.warn(`Section § ${sectionNum} text too short (${text.length} chars) - may be empty or truncated`);
      return null;
    }

    // Extract title from first line or heading
    let title: string | undefined;
    const headings = $('h1, h2, h3, .sectiontitle').first();
    if (headings.length > 0) {
      title = headings.text().trim();
    } else {
      // Try to extract from first sentence
      const firstLine = text.split('\n')[0];
      if (firstLine.length < 200) {
        title = firstLine;
      }
    }

    // Extract cross-references (sections mentioned in text)
    const crossReferences = this.extractCrossReferences(text);

    return {
      sectionNumber: `1798.${sectionNum}`,
      title,
      text,
      chapter: 'Title 1.81.5 - California Consumer Privacy Act',
      parentSection: undefined,
      crossReferences: crossReferences.length > 0 ? crossReferences : undefined,
    };
  }

  /**
   * Extract cross-references from text
   */
  private extractCrossReferences(text: string): string[] {
    const refs: string[] = [];

    // Pattern: "Section 1798.XXX" or "§ 1798.XXX"
    const pattern = /(?:Section|§)\s+1798\.\d+/g;
    const matches = text.match(pattern);

    if (matches) {
      for (const match of matches) {
        const ref = match.replace(/^(?:Section|§)\s+/, '');
        if (!refs.includes(ref)) {
          refs.push(ref);
        }
      }
    }

    return refs;
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (response.status === 429) {
          const delay = Math.min(1000 * 2 ** attempt + Math.random() * 1000, 30000);
          console.warn(`Rate limited, retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        const delay = 1000 * 2 ** attempt;
        console.warn(`Fetch failed, retrying in ${delay}ms...`, error);
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check for updates since last fetch
   *
   * Checks California LegInfo for amendments to Civil Code § 1798
   * Note: This is best-effort since there's no official API
   */
  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    try {
      // Fetch a sample section to check for updates
      const url = 'https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=3.&part=4.&section=1798.100';
      const response = await fetch(url);
      const lastModifiedHeader = response.headers.get('last-modified');

      if (!lastModifiedHeader) {
        console.warn('No last-modified header from California LegInfo');
        return {
          hasChanges: false,
          lastModified: new Date(),
          changes: [],
        };
      }

      const lastModified = new Date(lastModifiedHeader);

      return {
        hasChanges: lastModified > lastFetched,
        lastModified,
        changes: lastModified > lastFetched
          ? [`California Civil Code § 1798 (CCPA) may have been updated on ${lastModified.toISOString()}`]
          : [],
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return {
        hasChanges: false,
        lastModified: new Date(),
        changes: [],
      };
    }
  }

  /**
   * Extract definitions from CCPA sections
   *
   * Future enhancement: Parse definition sections (primarily § 1798.140)
   * For now, returns empty array - definitions can be added manually if needed
   */
  async extractDefinitions(): Promise<Definition[]> {
    // TODO: Implement definition extraction
    // CCPA definitions are primarily in § 1798.140
    // Format: "(a) 'Term' means definition."
    // Would need careful parsing to extract all term-definition pairs
    return [];
  }
}

/**
 * Factory function to create CCPA adapter
 */
export function createCcpaAdapter(): CaliforniaLeginfoAdapter {
  return new CaliforniaLeginfoAdapter('CCPA', 1798.100, 1798.199);
}
