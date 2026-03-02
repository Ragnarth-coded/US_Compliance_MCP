import Database from '@ansvar/mcp-sqlite';

const PREMIUM_UPGRADE_MESSAGE =
  'Version tracking is available in the Ansvar Intelligence Portal. Contact hello@ansvar.ai for access.';

// --- Types ---

export interface GetSectionHistoryInput {
  regulation: string;
  section: string;
}

export interface DiffSectionInput {
  regulation: string;
  section: string;
  from_date: string;
  to_date?: string;
}

export interface GetRecentChangesInput {
  regulation?: string;
  since: string;
  limit?: number;
}

interface SectionVersion {
  effective_date: string | null;
  superseded_date: string | null;
  change_summary: string | null;
  source_url: string | null;
}

interface SectionHistory {
  regulation: string;
  section: string;
  current_version: string | null;
  versions: SectionVersion[];
}

interface SectionDiff {
  regulation: string;
  section: string;
  from_date: string;
  to_date: string;
  diff: string | null;
  change_summary: string | null;
}

interface RecentChange {
  regulation: string;
  section: string;
  effective_date: string;
  change_summary: string | null;
  source_url: string | null;
}

// --- Premium gate ---

function isPremiumEnabled(): boolean {
  return process.env.PREMIUM_ENABLED === 'true';
}

function hasVersionsTable(db: InstanceType<typeof Database>): boolean {
  try {
    const row = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='section_versions'")
      .get() as { ok?: number } | undefined;
    return Boolean(row?.ok);
  } catch {
    return false;
  }
}

// --- Handlers ---

export async function getSectionHistory(
  db: InstanceType<typeof Database>,
  input: GetSectionHistoryInput,
): Promise<SectionHistory | { premium: false; message: string }> {
  if (!isPremiumEnabled()) {
    return { premium: false, message: PREMIUM_UPGRADE_MESSAGE };
  }

  if (!hasVersionsTable(db)) {
    throw new Error('Version tracking data not available in this database build.');
  }

  const { regulation, section } = input;

  const sectionRow = db
    .prepare('SELECT rowid FROM sections WHERE regulation = ? AND section_number = ?')
    .get(regulation, section) as { rowid: number } | undefined;

  if (!sectionRow) {
    throw new Error(`Section ${section} not found in ${regulation}`);
  }

  const versions = db
    .prepare(
      `SELECT effective_date, superseded_date, change_summary, source_url
       FROM section_versions
       WHERE section_id = ?
       ORDER BY effective_date ASC`,
    )
    .all(sectionRow.rowid) as SectionVersion[];

  const currentVersion =
    versions.length > 0 ? versions[versions.length - 1].effective_date : null;

  return {
    regulation,
    section,
    current_version: currentVersion,
    versions,
  };
}

export async function diffSection(
  db: InstanceType<typeof Database>,
  input: DiffSectionInput,
): Promise<SectionDiff | { premium: false; message: string }> {
  if (!isPremiumEnabled()) {
    return { premium: false, message: PREMIUM_UPGRADE_MESSAGE };
  }

  if (!hasVersionsTable(db)) {
    throw new Error('Version tracking data not available in this database build.');
  }

  const { regulation, section, from_date, to_date } = input;
  const effectiveToDate = to_date ?? new Date().toISOString().slice(0, 10);

  const sectionRow = db
    .prepare('SELECT rowid FROM sections WHERE regulation = ? AND section_number = ?')
    .get(regulation, section) as { rowid: number } | undefined;

  if (!sectionRow) {
    throw new Error(`Section ${section} not found in ${regulation}`);
  }

  const diffRow = db
    .prepare(
      `SELECT diff_from_previous, change_summary, effective_date
       FROM section_versions
       WHERE section_id = ?
         AND effective_date > ?
         AND effective_date <= ?
       ORDER BY effective_date DESC
       LIMIT 1`,
    )
    .get(sectionRow.rowid, from_date, effectiveToDate) as {
    diff_from_previous: string | null;
    change_summary: string | null;
    effective_date: string | null;
  } | undefined;

  if (!diffRow) {
    return {
      regulation,
      section,
      from_date,
      to_date: effectiveToDate,
      diff: null,
      change_summary: 'No changes found in this date range.',
    };
  }

  return {
    regulation,
    section,
    from_date,
    to_date: effectiveToDate,
    diff: diffRow.diff_from_previous,
    change_summary: diffRow.change_summary,
  };
}

export async function getRecentChanges(
  db: InstanceType<typeof Database>,
  input: GetRecentChangesInput,
): Promise<{ since: string; changes: RecentChange[]; total: number } | { premium: false; message: string }> {
  if (!isPremiumEnabled()) {
    return { premium: false, message: PREMIUM_UPGRADE_MESSAGE };
  }

  if (!hasVersionsTable(db)) {
    throw new Error('Version tracking data not available in this database build.');
  }

  const { regulation, since, limit } = input;
  const effectiveLimit = Math.min(limit ?? 50, 200);

  let sql = `
    SELECT
      s.regulation,
      s.section_number AS section,
      v.effective_date,
      v.change_summary,
      v.source_url
    FROM section_versions v
    JOIN sections s ON s.rowid = v.section_id
    WHERE v.effective_date >= ?
  `;
  const params: (string | number)[] = [since];

  if (regulation) {
    sql += ' AND s.regulation = ?';
    params.push(regulation);
  }

  sql += ' ORDER BY v.effective_date DESC LIMIT ?';
  params.push(effectiveLimit);

  const changes = db.prepare(sql).all(...params) as RecentChange[];

  return {
    since,
    changes,
    total: changes.length,
  };
}
