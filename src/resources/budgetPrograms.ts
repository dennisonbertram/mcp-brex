/**
 * @file Budget Programs Resource Handler
 * @description Implements resource handlers for Brex budget programs API endpoints
 */

import { ReadResourceRequestSchema } from '@anthropic-ai/sdk';
import { logDebug, logError } from '../utils/logger.js';
import { ResourceTemplate } from '../models/resourceTemplate.js';
import { getBrexClient } from '../services/brex/index.js';
import { parseQueryParams } from '../models/common.js';
import { isBudgetProgram } from '../models/budget.js';

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
      const match = budgetProgramsTemplate.match(uri);
      const id = match?.id;
      
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
        const params = parseQueryParams(uri);
        const budgetProgramsResponse = await brexClient.getBudgetPrograms({
          cursor: params.cursor,
          limit: params.limit ? parseInt(params.limit, 10) : undefined,
          budget_program_status: params.budget_program_status as any
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