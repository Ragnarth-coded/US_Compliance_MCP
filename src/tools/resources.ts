import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';

/**
 * Register MCP Resources with the server.
 * Resources provide static context that agents can read before making tool calls.
 */
export function registerResources(server: Server, db: Database.Database): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'us-regulations://regulations/list',
        name: 'Available Regulations',
        description: 'List of all loaded US regulations with IDs, names, and metadata. Read this first to discover valid regulation IDs.',
        mimeType: 'application/json',
      },
      {
        uri: 'us-regulations://sectors/list',
        name: 'Sector Taxonomy',
        description: 'Available industry sectors and subsectors for applicability checks.',
        mimeType: 'application/json',
      },
      {
        uri: 'us-regulations://frameworks/list',
        name: 'Control Frameworks',
        description: 'Available control frameworks (NIST CSF, NIST 800-53, etc.) and which regulations have mappings.',
        mimeType: 'application/json',
      },
      {
        uri: 'us-regulations://breach-notification/summary',
        name: 'Breach Notification Summary',
        description: 'Summary of breach notification jurisdictions available for timeline queries.',
        mimeType: 'application/json',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'us-regulations://regulations/list': {
        const rows = db.prepare(`
          SELECT id, full_name, citation, effective_date, jurisdiction, regulation_type
          FROM regulations ORDER BY id
        `).all();

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                total: rows.length,
                regulations: rows,
                usage_hint: 'Use these IDs in search_regulations, get_section, compare_requirements, and other tools.',
              }, null, 2),
            },
          ],
        };
      }

      case 'us-regulations://sectors/list': {
        const rows = db.prepare(`
          SELECT DISTINCT sector, subsector, COUNT(*) as regulation_count
          FROM applicability_rules
          WHERE applies = 1
          GROUP BY sector, subsector
          ORDER BY sector, subsector
        `).all();

        // Group by sector
        const sectors: Record<string, { subsectors: string[]; regulation_count: number }> = {};
        for (const row of rows as Array<{ sector: string; subsector: string | null; regulation_count: number }>) {
          if (!sectors[row.sector]) {
            sectors[row.sector] = { subsectors: [], regulation_count: 0 };
          }
          if (row.subsector) {
            sectors[row.sector].subsectors.push(row.subsector);
          }
          sectors[row.sector].regulation_count += row.regulation_count;
        }

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                sectors,
                usage_hint: 'Use these sector names with check_applicability to determine which regulations apply.',
              }, null, 2),
            },
          ],
        };
      }

      case 'us-regulations://frameworks/list': {
        const frameworks = db.prepare(`
          SELECT framework, COUNT(DISTINCT control_id) as controls, COUNT(DISTINCT regulation) as regulations,
                 GROUP_CONCAT(DISTINCT regulation) as regulation_list
          FROM control_mappings
          GROUP BY framework
          ORDER BY framework
        `).all();

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                frameworks,
                usage_hint: 'Use these framework names with map_controls to find regulatory mappings.',
              }, null, 2),
            },
          ],
        };
      }

      case 'us-regulations://breach-notification/summary': {
        const jurisdictions = db.prepare(`
          SELECT jurisdiction, regulation, notification_deadline
          FROM breach_notification_rules
          ORDER BY jurisdiction
        `).all();

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                total_jurisdictions: jurisdictions.length,
                jurisdictions,
                usage_hint: 'Use get_breach_notification_timeline with state or regulation filters for full details.',
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}
