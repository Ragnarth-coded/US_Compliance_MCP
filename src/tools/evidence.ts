import type { Database } from '@ansvar/mcp-sqlite';

export interface EvidenceInput {
  regulation: string;
  section: string;
}

export interface EvidenceRequirement {
  evidence_type: string;
  description: string;
  required: boolean;
}

export interface EvidenceResult {
  regulation: string;
  section: string;
  section_title: string | null;
  evidence_requirements: EvidenceRequirement[];
  total_requirements: number;
  notes: string;
}

/**
 * Evidence patterns: maps regulatory language keywords to evidence types.
 * Each pattern has a keyword to match, evidence type name, description, and
 * whether the evidence is mandatory (required) or recommended.
 */
const EVIDENCE_PATTERNS: Array<{
  keyword: string;
  evidence_type: string;
  description: string;
  required_keywords: string[];
}> = [
  {
    keyword: 'risk assessment',
    evidence_type: 'Risk Assessment Report',
    description: 'Documented risk assessment identifying threats, vulnerabilities, and likelihood of occurrence',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'risk analysis',
    evidence_type: 'Risk Analysis Documentation',
    description: 'Formal analysis of risks to confidentiality, integrity, and availability',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'audit log',
    evidence_type: 'Audit Logs',
    description: 'System-generated logs recording access, modifications, and security events',
    required_keywords: ['shall', 'must', 'required', 'maintain'],
  },
  {
    keyword: 'access log',
    evidence_type: 'Access Logs',
    description: 'Records of user access attempts including successful and failed logins',
    required_keywords: ['shall', 'must', 'required', 'maintain'],
  },
  {
    keyword: 'security incident',
    evidence_type: 'Incident Response Documentation',
    description: 'Documented incident response procedures, incident logs, and post-incident reviews',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'breach',
    evidence_type: 'Breach Notification Records',
    description: 'Records of breach detection, investigation, notification, and remediation',
    required_keywords: ['shall', 'must', 'required', 'notify'],
  },
  {
    keyword: 'policy',
    evidence_type: 'Written Policies',
    description: 'Formal written policies approved by management and communicated to workforce',
    required_keywords: ['shall', 'must', 'required', 'implement'],
  },
  {
    keyword: 'procedure',
    evidence_type: 'Written Procedures',
    description: 'Documented procedures for implementing policies and handling operational tasks',
    required_keywords: ['shall', 'must', 'required', 'implement'],
  },
  {
    keyword: 'training',
    evidence_type: 'Training Records',
    description: 'Evidence of security awareness training including attendance, content, and frequency',
    required_keywords: ['shall', 'must', 'required', 'provide'],
  },
  {
    keyword: 'encryption',
    evidence_type: 'Encryption Documentation',
    description: 'Documentation of encryption methods, key management, and data-at-rest/in-transit protections',
    required_keywords: ['shall', 'must', 'required', 'implement'],
  },
  {
    keyword: 'access control',
    evidence_type: 'Access Control Matrix',
    description: 'Documentation of role-based access controls, user provisioning, and access reviews',
    required_keywords: ['shall', 'must', 'required', 'implement'],
  },
  {
    keyword: 'authentication',
    evidence_type: 'Authentication Records',
    description: 'Evidence of authentication mechanisms including MFA, password policies, and session controls',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'authorization',
    evidence_type: 'Authorization Records',
    description: 'Records of access authorization decisions, approvals, and periodic reviews',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'backup',
    evidence_type: 'Backup Records',
    description: 'Evidence of data backup procedures, testing, and restoration capabilities',
    required_keywords: ['shall', 'must', 'required', 'maintain'],
  },
  {
    keyword: 'disaster recovery',
    evidence_type: 'Disaster Recovery Plan',
    description: 'Documented disaster recovery plan with testing evidence and recovery time objectives',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'business continuity',
    evidence_type: 'Business Continuity Plan',
    description: 'Business continuity plan with impact analysis, recovery strategies, and testing records',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'penetration test',
    evidence_type: 'Penetration Test Reports',
    description: 'Reports from authorized penetration testing with findings and remediation plans',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'vulnerability',
    evidence_type: 'Vulnerability Assessment Reports',
    description: 'Vulnerability scan results, risk ratings, and remediation tracking',
    required_keywords: ['shall', 'must', 'required', 'assess'],
  },
  {
    keyword: 'contingency plan',
    evidence_type: 'Contingency Plan',
    description: 'Documented contingency plan for responding to system emergencies',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'consent',
    evidence_type: 'Consent Records',
    description: 'Records of individual consent collection, storage, and withdrawal',
    required_keywords: ['shall', 'must', 'required', 'obtain'],
  },
  {
    keyword: 'privacy notice',
    evidence_type: 'Privacy Notices',
    description: 'Published privacy notices with version history and distribution records',
    required_keywords: ['shall', 'must', 'required', 'provide'],
  },
  {
    keyword: 'data protection impact',
    evidence_type: 'Data Protection Impact Assessment',
    description: 'Formal assessment of data processing impact on individual rights and freedoms',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'retention',
    evidence_type: 'Data Retention Schedule',
    description: 'Documented data retention and disposal schedule with implementation evidence',
    required_keywords: ['shall', 'must', 'required'],
  },
  {
    keyword: 'vendor',
    evidence_type: 'Vendor Management Records',
    description: 'Third-party vendor assessments, contracts with security requirements, and monitoring records',
    required_keywords: ['shall', 'must', 'required', 'ensure'],
  },
  {
    keyword: 'third party',
    evidence_type: 'Third-Party Agreements',
    description: 'Contractual agreements with third parties including data protection provisions',
    required_keywords: ['shall', 'must', 'required', 'ensure'],
  },
  {
    keyword: 'monitor',
    evidence_type: 'Monitoring Records',
    description: 'Evidence of ongoing monitoring activities, alerts, and review processes',
    required_keywords: ['shall', 'must', 'required'],
  },
];

/**
 * Get evidence requirements for compliance with a specific section.
 * Extracts evidence types from section text by matching regulatory language patterns.
 */
export async function getEvidenceRequirements(
  db: Database,
  input: EvidenceInput
): Promise<EvidenceResult> {
  const { regulation, section } = input;

  if (!regulation || !section) {
    throw new Error('Both regulation and section are required');
  }

  // Fetch section text
  const row = db.prepare(
    'SELECT section_number, title, text FROM sections WHERE regulation = ? AND section_number = ?'
  ).get(regulation, section) as { section_number: string; title: string | null; text: string } | undefined;

  if (!row) {
    // Check if regulation exists
    const regExists = db.prepare('SELECT 1 FROM regulations WHERE id = ?').get(regulation);
    if (!regExists) {
      const available = db.prepare('SELECT id FROM regulations ORDER BY id').all() as Array<{ id: string }>;
      throw new Error(
        `Regulation "${regulation}" not found. Available regulations: ${available.map(r => r.id).join(', ')}`
      );
    }
    throw new Error(
      `Section "${section}" not found in ${regulation}. Use list_regulations with regulation="${regulation}" to see available sections.`
    );
  }

  const lowerText = row.text.toLowerCase();
  const evidence: EvidenceRequirement[] = [];
  const seen = new Set<string>();

  for (const pattern of EVIDENCE_PATTERNS) {
    if (lowerText.includes(pattern.keyword) && !seen.has(pattern.evidence_type)) {
      seen.add(pattern.evidence_type);

      // Determine if required based on mandatory language in the section
      const isRequired = pattern.required_keywords.some(kw => lowerText.includes(kw));

      evidence.push({
        evidence_type: pattern.evidence_type,
        description: pattern.description,
        required: isRequired,
      });
    }
  }

  // Sort: required first, then alphabetically
  evidence.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.evidence_type.localeCompare(b.evidence_type);
  });

  return {
    regulation,
    section,
    section_title: row.title,
    evidence_requirements: evidence,
    total_requirements: evidence.length,
    notes: evidence.length > 0
      ? 'Evidence requirements extracted from regulatory language analysis. Items marked "required" contain mandatory language (shall, must, required).'
      : 'No specific evidence patterns detected in this section. Review the section text manually or try a parent section with broader requirements.',
  };
}
