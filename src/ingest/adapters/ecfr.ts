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
 * Adapter for fetching HIPAA from eCFR API
 */
export class EcfrAdapter implements SourceAdapter {
  private readonly regulationId: string;
  private readonly cfr_title: number;
  private readonly cfr_parts: number[];

  constructor(regulationId: string, cfr_title: number, cfr_parts: number[]) {
    this.regulationId = regulationId;
    this.cfr_title = cfr_title;
    this.cfr_parts = cfr_parts;
  }

  /**
   * Fetch HIPAA metadata
   *
   * PLACEHOLDER: Returns hardcoded HIPAA metadata
   * TODO: Integrate with eCFR API to fetch live metadata
   */
  async fetchMetadata(): Promise<RegulationMetadata> {
    // Placeholder metadata for HIPAA
    return {
      id: this.regulationId,
      full_name: 'Health Insurance Portability and Accountability Act',
      citation: '45 CFR Parts 160, 162, 164',
      effective_date: '2003-04-14',
      last_amended: '2013-01-25',
      source_url: 'https://www.ecfr.gov/current/title-45',
      jurisdiction: 'federal',
      regulation_type: 'rule',
    };
  }

  /**
   * Fetch all HIPAA sections
   *
   * Fetches XML from eCFR API and parses sections with hierarchical structure
   * API endpoint: https://www.ecfr.gov/api/versioner/v1/full/{date}/title-{title}.xml
   */
  async *fetchSections(): AsyncGenerator<Section[]> {
    // Get today's date in YYYY-MM-DD format
    const date = new Date().toISOString().split('T')[0];
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

    // Navigate XML structure: ECFR → DIV1 (Title) → DIV3 (Part) → DIV5 (Subpart) → DIV8 (Section)
    const title = xmlDoc.ECFR?.DIV1;
    if (!title) {
      console.warn(`No title found in eCFR XML for Title ${this.cfr_title}`);
      return;
    }

    // Extract parts (array or single object)
    const parts = Array.isArray(title.DIV3) ? title.DIV3 : [title.DIV3].filter(Boolean);

    for (const part of parts) {
      const partNum = this.extractNumber(part['@_N']);

      // Only process our target parts
      if (!this.cfr_parts.includes(partNum)) {
        continue;
      }

      // Extract subparts
      const subparts = Array.isArray(part.DIV5) ? part.DIV5 : [part.DIV5].filter(Boolean);

      for (const subpart of subparts) {
        // Extract sections (DIV8)
        const sectionDivs = Array.isArray(subpart.DIV8) ? subpart.DIV8 : [subpart.DIV8].filter(Boolean);

        for (const sectionDiv of sectionDivs) {
          const section = this.parseSection(sectionDiv, partNum, subpart['@_N']);
          if (section) {
            sections.push(section);
          }
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

    // Build section number (e.g., "164.308")
    const fullSectionNum = `${partNum}.${sectionNum}`;

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
        return element['#text'].trim();
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
  return new EcfrAdapter('HIPAA', 45, [160, 162, 164]);
}
