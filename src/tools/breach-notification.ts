import type { Database } from 'better-sqlite3';

export interface BreachNotificationInput {
  state?: string;
  regulation?: string;
}

export interface BreachTimeline {
  jurisdiction: string;
  regulation: string;
  notification_deadline: string;
  notify_individuals: boolean;
  notify_regulator: boolean;
  notify_media: boolean;
  regulator_name: string | null;
  threshold: string | null;
  penalties: string | null;
  notes: string | null;
}

export interface BreachNotificationResult {
  timelines: BreachTimeline[];
  total_results: number;
  diagnostics?: {
    jurisdictions_available: string[];
    hint?: string;
  };
}

/**
 * Get breach notification timelines by state or regulation.
 * Returns deadlines, required notifications, and penalties.
 */
export async function getBreachNotificationTimeline(
  db: Database,
  input: BreachNotificationInput
): Promise<BreachNotificationResult> {
  const { state, regulation } = input;

  // Build query
  let sql = `
    SELECT
      jurisdiction,
      regulation,
      notification_deadline,
      notify_individuals,
      notify_regulator,
      notify_media,
      regulator_name,
      threshold,
      penalties,
      notes
    FROM breach_notification_rules
  `;

  const conditions: string[] = [];
  const params: string[] = [];

  if (state) {
    conditions.push('(jurisdiction = ? OR jurisdiction = ?)');
    params.push(state, state.toUpperCase());
  }

  if (regulation) {
    conditions.push('regulation = ?');
    params.push(regulation);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY jurisdiction, regulation';

  const rows = db.prepare(sql).all(...params) as Array<{
    jurisdiction: string;
    regulation: string;
    notification_deadline: string;
    notify_individuals: number;
    notify_regulator: number;
    notify_media: number;
    regulator_name: string | null;
    threshold: string | null;
    penalties: string | null;
    notes: string | null;
  }>;

  const timelines = rows.map(row => ({
    jurisdiction: row.jurisdiction,
    regulation: row.regulation,
    notification_deadline: row.notification_deadline,
    notify_individuals: row.notify_individuals === 1,
    notify_regulator: row.notify_regulator === 1,
    notify_media: row.notify_media === 1,
    regulator_name: row.regulator_name,
    threshold: row.threshold,
    penalties: row.penalties,
    notes: row.notes,
  }));

  if (timelines.length === 0) {
    const jurisdictions = db.prepare('SELECT DISTINCT jurisdiction FROM breach_notification_rules ORDER BY jurisdiction').all() as Array<{ jurisdiction: string }>;
    const jurisdictionIds = jurisdictions.map(j => j.jurisdiction);

    let hint: string | undefined;
    if (state && !jurisdictionIds.some(j => j.toLowerCase() === state.toLowerCase())) {
      hint = `No breach notification data for "${state}". Available jurisdictions: ${jurisdictionIds.join(', ')}`;
    } else if (regulation) {
      hint = `No breach notification rules for regulation "${regulation}". Try without the regulation filter.`;
    }

    return {
      timelines: [],
      total_results: 0,
      diagnostics: {
        jurisdictions_available: jurisdictionIds,
        hint,
      },
    };
  }

  return {
    timelines,
    total_results: timelines.length,
  };
}
