import type { Database } from '@ansvar/mcp-sqlite';
import { getSection, SectionData } from './section.js';

export interface ActionItemsInput {
  regulation: string;
  sections: string[];
}

export interface ActionItem {
  section: string;
  title: string;
  required_state: string;
  priority: 'high' | 'medium' | 'low';
  evidence_needed: string[];
}

export interface ActionItemsResult {
  regulation: string;
  action_items: ActionItem[];
  total_items: number;
}

/**
 * Extract action items priority from section text.
 * - High: Contains "shall", "must", "required"
 * - Medium: Contains "should", "recommended"
 * - Low: Everything else
 */
function extractPriority(text: string): 'high' | 'medium' | 'low' {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes('shall') ||
    lowerText.includes('must') ||
    lowerText.includes('required')
  ) {
    return 'high';
  }

  if (lowerText.includes('should') || lowerText.includes('recommended')) {
    return 'medium';
  }

  return 'low';
}

/**
 * Extract evidence keywords from section text.
 * Looks for common audit artifacts and documentation types.
 */
function extractEvidenceNeeded(text: string): string[] {
  const lowerText = text.toLowerCase();
  const evidence: Set<string> = new Set();

  // Common evidence types
  const evidenceKeywords: Record<string, string> = {
    'risk assessment': 'risk assessment report',
    'risk analysis': 'risk assessment report',
    'audit log': 'audit logs',
    'access log': 'access logs',
    'security incident': 'incident response documentation',
    'breach': 'breach notification records',
    'policy': 'written policies',
    'procedure': 'written procedures',
    'training': 'training records',
    'documentation': 'supporting documentation',
    'encryption': 'encryption documentation',
    'access control': 'access control matrix',
    'authentication': 'authentication logs',
    'authorization': 'authorization records',
    'backup': 'backup records',
    'disaster recovery': 'disaster recovery plan',
    'business continuity': 'business continuity plan',
  };

  for (const [keyword, evidenceType] of Object.entries(evidenceKeywords)) {
    if (lowerText.includes(keyword)) {
      evidence.add(evidenceType);
    }
  }

  return Array.from(evidence);
}

/**
 * Generate compliance action items from regulation sections.
 * Extracts priority and evidence requirements from section text.
 */
export async function getComplianceActionItems(
  db: Database,
  input: ActionItemsInput
): Promise<ActionItemsResult> {
  const { regulation, sections } = input;

  if (!regulation) {
    throw new Error('Regulation is required');
  }

  if (!sections || sections.length === 0) {
    throw new Error('At least one section must be specified');
  }

  if (sections.length > 20) {
    throw new Error('Cannot process more than 20 sections at once');
  }

  // Fetch section data
  const actionItems: ActionItem[] = [];

  for (const sectionNumber of sections) {
    let sectionData;
    try {
      sectionData = await getSection(db, {
        regulation,
        section: sectionNumber,
      });
    } catch {
      // Section not found - skip silently for batch operations
      continue;
    }

    // Extract action item components
    const priority = extractPriority(sectionData.text);
    const evidenceNeeded = extractEvidenceNeeded(sectionData.text);

    // Generate required state description
    const requiredState = generateRequiredState(sectionData);

    actionItems.push({
      section: `§${sectionData.section_number}`,
      title: sectionData.title || `Section ${sectionData.section_number}`,
      required_state: requiredState,
      priority,
      evidence_needed: evidenceNeeded.length > 0 ? evidenceNeeded : ['supporting documentation'],
    });
  }

  return {
    regulation,
    action_items: actionItems,
    total_items: actionItems.length,
  };
}

/**
 * Generate a concise required state description from section data.
 * Extracts first sentence or up to 200 characters from section text.
 */
function generateRequiredState(section: SectionData): string {
  const text = section.text.trim();

  // Try to extract first sentence
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  if (firstSentence) {
    let sentence = firstSentence[0].trim();
    if (sentence.length > 200) {
      sentence = sentence.substring(0, 197) + '...';
    }
    return `Comply with requirements of §${section.section_number}: ${sentence}`;
  }

  // Fallback: first 200 characters
  const truncated = text.length > 200 ? text.substring(0, 197) + '...' : text;
  return `Comply with requirements of §${section.section_number}: ${truncated}`;
}
