/**
 * @file Spend Limits Resource Handler
 * @description Implements resource handlers for Brex spend limits API endpoints
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { BrexClient } from '../services/brex/client.js';
import { parseQueryParams } from '../models/common.js';
import { isSpendLimit } from '../models/budget.js';
import { estimateTokens } from '../utils/responseLimiter.js';

/**
 * Get Brex client
 */
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Resource template for spend limits API
 */
const spendLimitsTemplate = new ResourceTemplate('brex://spend_limits{/id}');

/**
 * Register the spend limits resource handler
 * @param server - MCP server instance
 */
export const registerSpendLimitsResource = (server: Server): void => {
  server.setRequestHandler(ReadResourceRequestSchema, async (request: unknown) => {
    const req = request as { params: { uri: string } };
    const { uri } = req.params;
    if (!canHandleSpendLimitsUri(uri)) return { handled: false } as any;
    return await readSpendLimitsUri(uri);
  });
};

export function canHandleSpendLimitsUri(uri: string): boolean {
  return uri.startsWith('brex://spend_limits');
}

export async function readSpendLimitsUri(uri: string): Promise<any> {
  logDebug(`Handling spend limit request for URI: ${uri}`);
  const brexClient = getBrexClient();
  const params = spendLimitsTemplate.parse(uri);
  const id = params.id;
  if (id) {
    const spendLimit = await brexClient.getSpendLimit(id);
    if (!spendLimit || !isSpendLimit(spendLimit)) throw new Error(`Invalid spend limit data received for ID: ${id}`);
    const qp = parseQueryParams(uri);
    const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const summaryOnly = qp.summary_only === 'true';
    const summarized = summaryOnly || estimateTokens(JSON.stringify(spendLimit)) > 24000;
    const out = fields && fields.length ? project(spendLimit, fields) : spendLimit;
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(summarized ? out : spendLimit, null, 2) }] } as any;
  } else {
    const queryParams = parseQueryParams(uri);
    const spendLimitsResponse = await brexClient.getSpendLimits({
      cursor: queryParams.cursor,
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      parent_budget_id: queryParams.parent_budget_id,
      status: queryParams.status as any,
      member_user_id: queryParams.member_user_id
    });
    const qp = parseQueryParams(uri);
    const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const summaryOnly = qp.summary_only === 'true';
    const summarized = summaryOnly || estimateTokens(JSON.stringify(spendLimitsResponse)) > 24000;
    const projected = fields && fields.length ? spendLimitsResponse.items.map((b: any) => project(b, fields)) : spendLimitsResponse.items;
    const out = summarized ? { ...spendLimitsResponse, items: projected } : spendLimitsResponse;
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
