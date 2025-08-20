/**
 * @file Budget Programs Resource Handler
 * @description Implements resource handlers for Brex budget programs API endpoints
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { BrexClient } from '../services/brex/client.js';
import { parseQueryParams } from '../models/common.js';
import { isBudgetProgram } from '../models/budget.js';
import { estimateTokens } from '../utils/responseLimiter.js';

/**
 * Get Brex client
 */
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Resource template for budget programs API
 */
const budgetProgramsTemplate = new ResourceTemplate('brex://budget_programs{/id}');

/**
 * Register the budget programs resource handler
 * @param server - MCP server instance
 */
export const registerBudgetProgramsResource = (server: Server): void => {
  server.setRequestHandler(ReadResourceRequestSchema, async (request: unknown, _extra: unknown) => {
    const req = request as { params: { uri: string } };
    const { uri } = req.params;
    
    // Check if we can handle this URI
    if (!uri.startsWith('brex://budget_programs')) {
      return { handled: false };
    }
    
    logDebug(`Handling budget program request for URI: ${uri}`);
    
    try {
      const brexClient = getBrexClient();
      // Use parse instead of match to get URI parameters
      const params = budgetProgramsTemplate.parse(uri);
      const id = params.id;
      
      if (id) {
        // Get single budget program
        logDebug(`Fetching single budget program with ID: ${id}`);
        const budgetProgram = await brexClient.getBudgetProgram(id);
        
        if (!budgetProgram || !isBudgetProgram(budgetProgram)) {
          throw new Error(`Invalid budget program data received for ID: ${id}`);
        }
        
        const qp = parseQueryParams(uri);
        const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
        const summaryOnly = qp.summary_only === 'true';
        const summarized = summaryOnly || estimateTokens(JSON.stringify(budgetProgram)) > 24000;
        const out = project(budgetProgram, fields);
        return { handled: true, resource: summarized ? out : budgetProgram };
      } else {
        // List budget programs with pagination
        logDebug('Fetching budget programs list');
        const queryParams = parseQueryParams(uri);
        const budgetProgramsResponse = await brexClient.getBudgetPrograms({
          cursor: queryParams.cursor,
          limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
          budget_program_status: queryParams.budget_program_status as any
        });
        
        const qp = parseQueryParams(uri);
        const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
        const summaryOnly = qp.summary_only === 'true';
        const summarized = summaryOnly || estimateTokens(JSON.stringify(budgetProgramsResponse)) > 24000;
        const projected = fields && fields.length ? budgetProgramsResponse.items.map((b: any) => project(b, fields)) : budgetProgramsResponse.items;
        return { handled: true, resource: summarized ? { ...budgetProgramsResponse, items: projected } : budgetProgramsResponse };
      }
    } catch (error) {
      logError(`Error handling budget program request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
};

export default registerBudgetProgramsResource; 

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