/**
 * @file Budget Programs Resource Handler
 * @description Implements resource handlers for Brex budget programs API endpoints
 */

import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { BrexClient } from '../services/brex/client.js';
import { parseQueryParams } from '../models/common.js';
import { isBudgetProgram } from '../models/budget.js';

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
export const registerBudgetProgramsResource = (server: any) => {
  server.setRequestHandler(ReadResourceRequestSchema, async (request: any, extra: any) => {
    const { uri } = request;
    
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
        
        return {
          handled: true,
          resource: budgetProgram
        };
      } else {
        // List budget programs with pagination
        logDebug('Fetching budget programs list');
        const queryParams = parseQueryParams(uri);
        const budgetProgramsResponse = await brexClient.getBudgetPrograms({
          cursor: queryParams.cursor,
          limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
          budget_program_status: queryParams.budget_program_status as any
        });
        
        return {
          handled: true,
          resource: budgetProgramsResponse,
        };
      }
    } catch (error) {
      logError(`Error handling budget program request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
};

export default registerBudgetProgramsResource; 