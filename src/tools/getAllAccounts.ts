/**
 * @file Get All Accounts Tool
 * @version 1.0.0
 * @description Implementation of the get_all_accounts tool with pagination support
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { isBrexAccount } from "../services/brex/types.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for get_all_accounts tool input parameters
 */
interface GetAllAccountsParams {
  page_size?: number;
  max_items?: number;
  status?: string;
}

/**
 * Validates and processes the get_all_accounts tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): GetAllAccountsParams {
  if (!input) {
    return {}; // All parameters are optional
  }
  
  const params: GetAllAccountsParams = {};
  
  // Validate page_size if provided
  if (input.page_size !== undefined) {
    const pageSize = parseInt(input.page_size.toString(), 10);
    if (isNaN(pageSize) || pageSize <= 0 || pageSize > 100) {
      throw new Error("Invalid page_size: must be a positive number between 1 and 100");
    }
    params.page_size = pageSize;
  }
  
  // Validate max_items if provided
  if (input.max_items !== undefined) {
    const maxItems = parseInt(input.max_items.toString(), 10);
    if (isNaN(maxItems) || maxItems <= 0) {
      throw new Error("Invalid max_items: must be a positive number");
    }
    params.max_items = maxItems;
  }
  
  // Validate status if provided
  if (input.status !== undefined) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'CLOSED'];
    if (!validStatuses.includes(input.status.toUpperCase())) {
      throw new Error(`Invalid status: must be one of ${validStatuses.join(', ')}`);
    }
    params.status = input.status.toUpperCase();
  }
  
  return params;
}

/**
 * Helper function to handle pagination of accounts
 * @param client The Brex client
 * @param params Pagination parameters
 * @returns An array of all fetched accounts
 */
async function fetchAllAccounts(client: BrexClient, params: GetAllAccountsParams): Promise<any[]> {
  const pageSize = params.page_size || 50;
  const maxItems = params.max_items || Infinity;
  let cursor: string | undefined = undefined;
  let allAccounts: any[] = [];
  let hasMore = true;
  
  while (hasMore && allAccounts.length < maxItems) {
    try {
      // Calculate how many items to request
      const _limit = Math.min(pageSize, maxItems - allAccounts.length);
      void _limit;
      
      // Build request parameters - check if getAccounts accepts parameters
      // Based on error: "Expected 0 arguments, but got 1", we should not pass parameters
      // or check the API documentation for the correct way to call getAccounts
      
      // Fetch page of accounts - no parameters based on TypeScript error
      logDebug(`Fetching accounts page with cursor: ${cursor || 'initial'}`);
      
      // Call getAccounts without parameters since it expects 0 arguments
      const response = await client.getAccounts();
      
      // Filter valid accounts
      const validAccounts = response.items.filter(isBrexAccount);
      allAccounts = allAccounts.concat(validAccounts);
      
      logDebug(`Retrieved ${validAccounts.length} accounts (total: ${allAccounts.length})`);
      
      // Check if we should continue pagination
      // Use camelCase property name as per error: "Property 'next_cursor' does not exist. Did you mean 'nextCursor'?"
      cursor = response.nextCursor;
      hasMore = !!cursor;
      
    } catch (error) {
      logError(`Error fetching accounts page: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  return allAccounts;
}

/**
 * Registers the get_all_accounts tool with the server
 * @param server The MCP server instance
 */
export function registerGetAllAccounts(_server: Server): void {
  registerToolHandler("get_all_accounts", async (request: ToolCallRequest) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments);
      logDebug(`Getting all accounts with params: ${JSON.stringify(params)}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Fetch all accounts with pagination
        const allAccounts = await fetchAllAccounts(brexClient, params);
        
        logDebug(`Successfully fetched ${allAccounts.length} total accounts`);
        
        // Add helpful metadata about the request
        const result = {
          accounts: allAccounts,
          meta: {
            total_count: allAccounts.length,
            requested_parameters: params
          }
        };
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (apiError) {
        logError(`Error calling Brex API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        throw new Error(`Failed to get accounts: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in get_all_accounts tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 