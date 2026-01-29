/**
 * eCFR Adapter (Electronic Code of Federal Regulations)
 *
 * Fetches HIPAA regulations from ecfr.gov API.
 * Source: 45 CFR Parts 160, 162, 164 (Privacy Rule, Security Rule, Breach Notification)
 *
 * PRODUCTION IMPLEMENTATION
 * Uses the eCFR API: https://www.ecfr.gov/developers/documentation/api/v1
 */

import {
  SourceAdapter,
  RegulationMetadata,
  Section,
  Definition,
  UpdateStatus,
} from '../framework.js';
import { XMLParser } from 'fast-xml-parser';

/**
 * Configuration for regulation metadata fallback
 */
export interface RegulationConfig {
  full_name: string;
  citation: string;
  effective_date: string;
  jurisdiction: 'federal' | 'state';
  regulation_type: 'rule' | 'statute';
}

/**
 * Adapter for fetching HIPAA from eCFR API
 */
export class EcfrAdapter implements SourceAdapter {
  private readonly regulationId: string;
  private readonly cfr_title: number;
  private readonly cfr_parts: number[];
  private readonly fallbackMetadata: RegulationConfig;

  constructor(
    regulationId: string,
    cfr_title: number,
    cfr_parts: number[],
    fallbackMetadata: RegulationConfig
  ) {
    this.regulationId = regulationId;
    this.cfr_title = cfr_title;
    this.cfr_parts = cfr_parts;
    this.fallbackMetadata = fallbackMetadata;
  }

  /**
   * Fetch metadata from eCFR API
   * Returns effective_date and last_amended from API with fallback metadata for other fields
   */
  private async fetchMetadataFromAPI(): Promise<RegulationMetadata> {
    try {
      // Get latest available date for this CFR title
      const latestDate = await this.getLatestDate();

      // Fetch structure JSON (lighter than full XML)
      const url = `https://www.ecfr.gov/api/versioner/v1/structure/${latestDate}/title-${this.cfr_title}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`eCFR API returned ${response.status} for ${url}`);
      }

      const data = await response.json();

      // Extract dates from API response
      // Note: eCFR structure API may not have these exact fields, using latest date as proxy
      const effectiveDate = data.effective_date || latestDate;
      const lastAmended = data.last_amended || latestDate;

      return {
        id: this.regulationId,
        full_name: this.fallbackMetadata.full_name,
        citation: this.fallbackMetadata.citation,
        effective_date: effectiveDate,
        last_amended: lastAmended,
        source_url: `https://www.ecfr.gov/current/title-${this.cfr_title}`,
        jurisdiction: this.fallbackMetadata.jurisdiction,
        regulation_type: this.fallbackMetadata.regulation_type
      };
    } catch (error) {
      // Re-throw to be caught by fetchMetadata
      throw error;
    }
  }

  /**
   * Fetch regulation metadata
   *
   * Hybrid approach:
   * 1. Try to fetch effective_date and last_amended from eCFR API
   * 2. Fall back to hardcoded metadata if API unavailable
   */
  async fetchMetadata(): Promise<RegulationMetadata> {
    try {
      return await this.fetchMetadataFromAPI();
    } catch (error) {
      console.warn(`⚠️  eCFR API unavailable for ${this.regulationId}, using fallback metadata`);
      console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}`);

      return {
        id: this.regulationId,
        full_name: this.fallbackMetadata.full_name,
        citation: this.fallbackMetadata.citation,
        effective_date: this.fallbackMetadata.effective_date,
        last_amended: this.fallbackMetadata.effective_date, // Use effective_date as fallback
        source_url: `https://www.ecfr.gov/current/title-${this.cfr_title}`,
        jurisdiction: this.fallbackMetadata.jurisdiction,
        regulation_type: this.fallbackMetadata.regulation_type
      };
    }
  }

  /**
   * Fetch all HIPAA sections
   *
   * Fetches XML from eCFR API and parses sections with hierarchical structure
   * API endpoint: https://www.ecfr.gov/api/versioner/v1/full/{date}/title-{title}.xml
   */
  async *fetchSections(): AsyncGenerator<Section[]> {
    // Get the latest available date for this title
    const date = await this.getLatestDate();
    const url = `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${this.cfr_title}.xml`;

    console.log(`Fetching eCFR Title ${this.cfr_title} from ${url}...`);

    // Fetch XML with retry logic
    const response = await this.fetchWithRetry(url);
    const xmlText = await response.text();

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      preserveOrder: false,
    });

    const xmlDoc = parser.parse(xmlText);

    // Extract sections from relevant parts
    const sections: Section[] = [];

    // Navigate XML structure: ECFR → DIV1 (Title) → DIV5 (Part) → DIV8 (Section)
    // The structure is: DIV1 (title) → DIV2 (subtitle) → DIV4 (subchapter) → DIV5 (part) → DIV8 (section)
    const title = xmlDoc.ECFR?.DIV1;
    if (!title) {
      console.warn(`No title found in eCFR XML for Title ${this.cfr_title}`);
      return;
    }

    // Find all DIV5 (parts) recursively
    const findParts = (node: any): any[] => {
      if (!node || typeof node !== 'object') return [];

      const parts: any[] = [];

      if (node.DIV5) {
        const div5s = Array.isArray(node.DIV5) ? node.DIV5 : [node.DIV5];
        parts.push(...div5s.filter(Boolean));
      }

      // Recurse into child DIVs
      for (const key of Object.keys(node)) {
        if (key.startsWith('DIV') && key !== 'DIV5' && typeof node[key] === 'object') {
          const childNodes = Array.isArray(node[key]) ? node[key] : [node[key]];
          for (const child of childNodes) {
            parts.push(...findParts(child));
          }
        }
      }

      return parts;
    };

    const parts = findParts(title);
    console.log(`  Found ${parts.length} parts in Title ${this.cfr_title}`);

    for (const part of parts) {
      const partNum = this.extractNumber(part['@_N']);

      // Only process our target parts
      if (!this.cfr_parts.includes(partNum)) {
        continue;
      }

      console.log(`  Processing Part ${partNum}...`);

      // Sections are in DIV6 (subparts) → DIV8 (sections)
      const findSections = (node: any): any[] => {
        if (!node || typeof node !== 'object') return [];

        const secs: any[] = [];

        // If this node has DIV8, collect them
        if (node.DIV8) {
          const div8s = Array.isArray(node.DIV8) ? node.DIV8 : [node.DIV8];
          secs.push(...div8s.filter(Boolean));
        }

        // Recurse into DIV6 (subparts) and other child DIVs
        for (const key of Object.keys(node)) {
          if (key.startsWith('DIV') && key !== 'DIV8' && typeof node[key] === 'object') {
            const childNodes = Array.isArray(node[key]) ? node[key] : [node[key]];
            for (const child of childNodes) {
              secs.push(...findSections(child));
            }
          }
        }

        return secs;
      };

      const sectionDivs = findSections(part);
      console.log(`    Found ${sectionDivs.length} sections in Part ${partNum}`);

      for (const sectionDiv of sectionDivs) {
        const section = this.parseSection(sectionDiv, partNum, '');
        if (section) {
          sections.push(section);
        }
      }

      // Yield in batches of 50
      if (sections.length >= 50) {
        yield sections.splice(0, 50);
      }
    }

    // Yield remaining sections
    if (sections.length > 0) {
      yield sections;
    }
  }

  /**
   * Parse a section from XML DIV8 element
   */
  private parseSection(div: any, partNum: number, subpartId: string): Section | null {
    const sectionNum = div['@_N'];
    if (!sectionNum) return null;

    // Extract section text
    const text = this.extractText(div);
    if (!text || text.length < 10) return null;

    // Extract title (HEAD)
    const title = div.HEAD ? this.extractText(div.HEAD) : undefined;

    // Build section number - eCFR @_N already includes part number (e.g., "164.308")
    // Don't prepend if section already starts with part number
    const fullSectionNum = sectionNum.startsWith(`${partNum}.`)
      ? sectionNum
      : `${partNum}.${sectionNum}`;

    // Extract cross-references (CITA tags)
    const crossReferences = this.extractCrossReferences(div);

    return {
      sectionNumber: fullSectionNum,
      title,
      text,
      chapter: `Part ${partNum}, Subpart ${subpartId}`,
      parentSection: undefined, // TODO: implement parent detection for nested sections
      crossReferences: crossReferences.length > 0 ? crossReferences : undefined,
    };
  }

  /**
   * Extract text content from XML element recursively
   */
  private extractText(element: any): string {
    if (typeof element === 'string') {
      return element.trim();
    }

    if (typeof element === 'object') {
      if (element['#text']) {
        const text = element['#text'];
        return typeof text === 'string' ? text.trim() : String(text).trim();
      }

      // Recursively extract from child elements
      const texts: string[] = [];
      for (const key of Object.keys(element)) {
        if (key.startsWith('@_')) continue; // Skip attributes
        if (key === 'HEAD') continue; // Skip title

        const child = element[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            const text = this.extractText(item);
            if (text) texts.push(text);
          }
        } else {
          const text = this.extractText(child);
          if (text) texts.push(text);
        }
      }
      return texts.join(' ').trim();
    }

    return '';
  }

  /**
   * Extract cross-references from CITA tags
   */
  private extractCrossReferences(element: any): string[] {
    const refs: string[] = [];

    const findCITA = (obj: any) => {
      if (typeof obj !== 'object') return;

      for (const key of Object.keys(obj)) {
        if (key === 'CITA') {
          const cita = obj[key];
          if (Array.isArray(cita)) {
            refs.push(...cita.map(c => this.extractText(c)).filter(Boolean));
          } else {
            const ref = this.extractText(cita);
            if (ref) refs.push(ref);
          }
        } else if (typeof obj[key] === 'object') {
          findCITA(obj[key]);
        }
      }
    };

    findCITA(element);
    return refs;
  }

  /**
   * Extract numeric part from section number
   */
  private extractNumber(str: string | undefined): number {
    if (!str) return 0;
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  /**
   * Get the latest available date for this title from eCFR titles API
   */
  private async getLatestDate(): Promise<string> {
    try {
      const response = await fetch('https://www.ecfr.gov/api/versioner/v1/titles');
      const data = await response.json();

      const titleInfo = data.titles.find((t: any) => t.number === this.cfr_title);
      if (titleInfo && titleInfo.latest_issue_date) {
        return titleInfo.latest_issue_date;
      }

      // Fallback to current date
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn('Failed to fetch latest date, using current date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Fetch with retry logic and exponential backoff
   */
  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url);

        if (response.status === 429) {
          // Rate limited - backoff
          const delay = Math.min(1000 * 2 ** attempt + Math.random() * 1000, 30000);
          console.warn(`Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
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
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Check for updates since last fetch
   *
   * Queries eCFR API for revision dates and compares with lastFetched
   * eCFR updates daily from Federal Register
   */
  async checkForUpdates(lastFetched: Date): Promise<UpdateStatus> {
    try {
      // eCFR provides last-modified in HTTP headers
      const date = new Date().toISOString().split('T')[0];
      const url = `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${this.cfr_title}.xml`;

      const response = await fetch(url, { method: 'HEAD' });
      const lastModifiedHeader = response.headers.get('last-modified');

      if (!lastModifiedHeader) {
        console.warn('No last-modified header from eCFR');
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
          ? [`Title ${this.cfr_title} updated on ${lastModified.toISOString()}`]
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
   * Extract definitions from HIPAA sections
   *
   * Future enhancement: Parse definition sections (e.g., 45 CFR 160.103, 164.103)
   * For now, returns empty array - definitions can be added manually if needed
   */
  async extractDefinitions(): Promise<Definition[]> {
    // TODO: Implement definition extraction
    // HIPAA definitions are in:
    // - 45 CFR 160.103 (General definitions)
    // - 45 CFR 164.103 (Security Rule definitions)
    // - 45 CFR 164.501 (Privacy Rule definitions)
    //
    // These sections have structured format: "Term means definition."
    // Would need regex parsing or NLP to extract accurately
    return [];
  }
}

/**
 * Factory function to create HIPAA adapter
 */
export function createHipaaAdapter(): EcfrAdapter {
  return new EcfrAdapter('HIPAA', 45, [160, 162, 164], {
    full_name: 'Health Insurance Portability and Accountability Act',
    citation: '45 CFR Parts 160, 162, 164',
    effective_date: '2003-04-14',
    jurisdiction: 'federal',
    regulation_type: 'rule'
  });
}
