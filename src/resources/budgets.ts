/**
 * @file Budget Resource Handler
 * @description Implements resource handlers for Brex budget API endpoints
 */

import { ReadResourceRequestSchema } from '@anthropic-ai/sdk';
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { getBrexClient } from '../services/brex/index.js';
import { parseQueryParams } from '../models/common.js';
import { Budget, isBudget } from '../models/budget.js';

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
      const match = budgetsTemplate.match(uri);
      const id = match?.id;
      
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
        const params = parseQueryParams(uri);
        const budgetsResponse = await brexClient.getBudgets({
          cursor: params.cursor,
          limit: params.limit ? parseInt(params.limit, 10) : undefined,
          parent_budget_id: params.parent_budget_id,
          spend_budget_status: params.spend_budget_status as any
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