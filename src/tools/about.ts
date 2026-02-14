import type { Database } from '@ansvar/mcp-sqlite';

export interface AboutContext {
  version: string;
  fingerprint: string;
  dbBuilt: string;
}

export interface AboutResult {
  server: {
    name: string;
    package: string;
    version: string;
    suite: string;
    repository: string;
  };
  dataset: {
    fingerprint: string;
    built: string;
    jurisdiction: string;
    content_basis: string;
    counts: Record<string, number>;
    freshness: {
      last_checked: string | null;
      check_method: string;
      source_registry_entries: number;
    };
  };
  provenance: {
    sources: string[];
    license: string;
    authenticity_note: string;
  };
  security: {
    access_model: string;
    network_access: boolean;
    filesystem_access: boolean;
    arbitrary_execution: boolean;
  };
}

function safeCount(db: Database, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

export async function getAbout(
  db: Database,
  context: AboutContext
): Promise<AboutResult> {
  const counts: Record<string, number> = {
    regulations: safeCount(db, 'SELECT COUNT(*) as count FROM regulations'),
    sections: safeCount(db, 'SELECT COUNT(*) as count FROM sections'),
    definitions: safeCount(db, 'SELECT COUNT(*) as count FROM definitions'),
    control_mappings: safeCount(db, 'SELECT COUNT(*) as count FROM control_mappings'),
    applicability_rules: safeCount(db, 'SELECT COUNT(*) as count FROM applicability_rules'),
    breach_notification_rules: safeCount(db, 'SELECT COUNT(*) as count FROM breach_notification_rules'),
  };

  let lastChecked: string | null = null;
  let sourceRegistryEntries = 0;
  try {
    const row = db.prepare(
      'SELECT COUNT(*) as entry_count, MAX(last_fetched) as last_checked FROM source_registry'
    ).get() as { entry_count: number; last_checked: string | null } | undefined;
    if (row) {
      lastChecked = row.last_checked;
      sourceRegistryEntries = Number(row.entry_count);
    }
  } catch {
    // source_registry table may not exist
  }

  return {
    server: {
      name: 'US Regulations MCP',
      package: '@ansvar/us-regulations-mcp',
      version: context.version,
      suite: 'Ansvar Compliance Suite',
      repository: 'https://github.com/Ansvar-Systems/US_Compliance_MCP',
    },
    dataset: {
      fingerprint: context.fingerprint,
      built: context.dbBuilt,
      jurisdiction: 'US',
      content_basis:
        'US federal and state regulations from official government sources (CFR, USC, state statutes). ' +
        'Not an official legal publication.',
      counts,
      freshness: {
        last_checked: lastChecked,
        check_method: 'Manual review + source monitoring',
        source_registry_entries: sourceRegistryEntries,
      },
    },
    provenance: {
      sources: ['US Government Publishing Office', 'State Legislatures'],
      license:
        'Apache-2.0 (server code). US federal law is public domain under 17 U.S.C. \u00A7 105.',
      authenticity_note:
        'This dataset is derived from publicly available US regulatory text. ' +
        'Verify against official publications (Federal Register, CFR) for legal purposes.',
    },
    security: {
      access_model: 'read-only',
      network_access: false,
      filesystem_access: false,
      arbitrary_execution: false,
    },
  };
}
