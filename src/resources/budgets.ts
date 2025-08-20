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
  server.setRequestHandler(ReadResourceRequestSchema, async (request: unknown, _extra: unknown) => {
    const req = request as { params: { uri: string } };
    const { uri } = req.params;
    
    // Check if we can handle this URI
    if (!uri.startsWith('brex://budgets')) {
      return { handled: false };
    }
    
    logDebug(`Handling budget request for URI: ${uri}`);
    
    try {
      const brexClient = getBrexClient();
      // Use parse instead of match to get URI parameters
      const params = budgetsTemplate.parse(uri);
      const id = params.id;
      
      if (id) {
        // Get single budget
        logDebug(`Fetching single budget with ID: ${id}`);
        const budget = await brexClient.getBudget(id);
        
        if (!budget || !isBudget(budget)) {
          throw new Error(`Invalid budget data received for ID: ${id}`);
        }
        
        const qp = parseQueryParams(uri);
        const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
        const summaryOnly = qp.summary_only === 'true';
        const out = project(budget, fields);
        const summarized = summaryOnly || estimateTokens(JSON.stringify(budget)) > 24000;
        return { handled: true, resource: summarized ? out : budget };
      } else {
        // List budgets with pagination
        logDebug('Fetching budget list');
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
        return { handled: true, resource: summarized ? { ...budgetsResponse, items: projected } : budgetsResponse };
      }
    } catch (error) {
      logError(`Error handling budget request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
};

export default registerBudgetsResource; 

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