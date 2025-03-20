/**
 * @file Budget Resource Handler
 * @description Implements resource handlers for Brex budget API endpoints
 */

import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { BrexClient } from '../services/brex/client.js';
import { parseQueryParams } from '../models/common.js';
import { Budget, isBudget } from '../models/budget.js';

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
export const registerBudgetsResource = (server: any) => {
  server.setRequestHandler(ReadResourceRequestSchema, async (request: any, extra: any) => {
    const { uri } = request;
    
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
        
        return {
          handled: true,
          resource: budget
        };
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
        
        return {
          handled: true,
          resource: budgetsResponse,
        };
      }
    } catch (error) {
      logError(`Error handling budget request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
};

export default registerBudgetsResource; 