/**
 * @file Budget Resource Handler
 * @description Implements resource handlers for Brex budget API endpoints
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { BrexClient } from '../services/brex/client.js';
import { parseQueryParams } from '../models/common.js';
import { isBudget } from '../models/budget.js';
import { estimateTokens } from '../utils/responseLimiter.js';

/**
 * Get Brex client
 */
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Resource template for budget API
 */
const budgetsTemplate = new ResourceTemplate('brex://budgets{/id}');

/**
 * Register the budget resource handler
 * @param server - MCP server instance
 */
export const registerBudgetsResource = (server: Server): void => {
  server.setRequestHandler(ReadResourceRequestSchema, async (request: unknown) => {
    const req = request as { params: { uri: string } };
    const { uri } = req.params;
    if (!canHandleBudgetsUri(uri)) return { handled: false } as any;
    return await readBudgetsUri(uri);
  });
};

export function registerBudgetsCapabilities(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://budgets{/id}": {
        description: "Brex budgets (list or by ID)",
        mimeTypes: ["application/json"],
      }
    }
  });
}

export function canHandleBudgetsUri(uri: string): boolean {
  return uri.startsWith('brex://budgets');
}

export async function readBudgetsUri(uri: string): Promise<any> {
  logDebug(`Handling budget request for URI: ${uri}`);
  const brexClient = getBrexClient();
  const params = budgetsTemplate.parse(uri);
  const id = params.id;
  if (id) {
    const budget = await brexClient.getBudget(id);
    if (!budget || !isBudget(budget)) throw new Error(`Invalid budget data received for ID: ${id}`);
    const qp = parseQueryParams(uri);
    const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const summaryOnly = qp.summary_only === 'true';
    const summarized = summaryOnly || estimateTokens(JSON.stringify(budget)) > 24000;
    const out = fields && fields.length ? project(budget, fields) : budget;
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(summarized ? out : budget, null, 2) }] } as any;
  } else {
    const queryParams = parseQueryParams(uri);
    const budgetsResponse = await brexClient.getBudgets({
      cursor: queryParams.cursor,
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      parent_budget_id: queryParams.parent_budget_id,
      spend_budget_status: queryParams.spend_budget_status as any
    });
    const qp = parseQueryParams(uri);
    const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const summaryOnly = qp.summary_only === 'true';
    const summarized = summaryOnly || estimateTokens(JSON.stringify(budgetsResponse)) > 24000;
    const projected = fields && fields.length ? budgetsResponse.items.map((b: any) => project(b, fields)) : budgetsResponse.items;
    const out = summarized ? { ...budgetsResponse, items: projected } : budgetsResponse;
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(out, null, 2) }] } as any;
  }
}

function project(src: any, fields?: string[]): any {
  if (!fields || !fields.length) return src;
  const out: any = {};
  for (const f of fields) {
    const parts = f.split('.');
    let cur: any = src;
    for (const p of parts) { cur = cur?.[p]; if (cur === undefined) break; }
    if (cur !== undefined) {
      let o: any = out;
      for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] ?? {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = cur;
    }
  }
  return out;
}
