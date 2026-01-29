/**
 * Ingestion Framework
 *
 * Defines interfaces for regulation data ingestion from multiple sources.
 * Supports automated fetching from APIs (regulations.gov, ecfr.gov, California LegInfo).
 */

/**
 * Metadata about a regulation
 */
export interface RegulationMetadata {
  id: string;                       // 'HIPAA', 'CCPA', 'SOX'
  full_name: string;                // 'Health Insurance Portability and Accountability Act'
  citation: string;                 // 'Pub. L. 104-191' or 'Cal. Civ. Code § 1798.100'
  effective_date?: string;          // ISO 8601 date string
  last_amended?: string;            // ISO 8601 date string
  source_url: string;               // API endpoint or official source URL
  jurisdiction: string;             // 'federal', 'california', 'virginia', etc.
  regulation_type: string;          // 'statute', 'rule', 'guidance'
}

/**
 * A single section within a regulation
 */
export interface Section {
  sectionNumber: string;            // '164.308(a)(1)(ii)(A)' for HIPAA
  title?: string;                   // Section title/heading
  text: string;                     // Full text content
  chapter?: string;                 // Chapter or part designation
  parentSection?: string;           // Parent section for nested structures
  crossReferences?: string[];       // Array of referenced section numbers
}

/**
 * A term definition from a regulation
 */
export interface Definition {
  regulation: string;               // Regulation ID
  term: string;                     // Defined term
  definition: string;               // Full definition text
  section: string;                  // Section where defined
}

/**
 * Status of potential updates from source
 */
export interface UpdateStatus {
  hasChanges: boolean;              // Whether updates detected
  lastModified?: Date;              // Last modification date from source
  changes?: string[];               // Description of changes (if available)
  sectionsAdded?: number;           // Count of new sections
  sectionsModified?: number;        // Count of modified sections
}

/**
 * Source adapter interface
 *
 * Each regulation source (regulations.gov, ecfr.gov, etc.) implements this interface
 * to provide normalized access to regulation data.
 */
export interface SourceAdapter {
  /**
   * Fetch regulation metadata
   */
  fetchMetadata(): Promise<RegulationMetadata>;

  /**
   * Fetch all sections with pagination support
   * Returns an async generator for memory-efficient streaming
   */
  fetchSections(): AsyncGenerator<Section[]>;

  /**
   * Check if source has updates since last fetch
   */
  checkForUpdates(lastFetched: Date): Promise<UpdateStatus>;

  /**
   * Extract definitions from regulation text
   */
  extractDefinitions(): Promise<Definition[]>;
}

/**
 * Regulation source configuration
 */
export interface RegulationSource {
  id: string;                       // 'HIPAA', 'CCPA', 'SOX'
  name: string;                     // Full regulation name
  sourceType: 'api' | 'html' | 'pdf';
  adapter: SourceAdapter;
}
