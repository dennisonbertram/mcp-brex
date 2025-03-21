/**
 * @file Expenses Resource Handler
 * @version 1.0.0
 * @description Handles Brex expenses resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { isExpense, ListExpensesParams } from "../services/brex/expenses-types.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define expenses resource template
const expensesTemplate = new ResourceTemplate("brex://expenses{/id}");

/**
 * Registers the expenses resource handler with the server
 * @param server The MCP server instance
 */
export function registerExpensesResource(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://expenses{/id}": {
        description: "Brex expenses",
        mimeTypes: ["application/json"],
      }
    }
  });

  // Use the standard approach with setRequestHandler
  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
    const uri = request.params.uri;
    
    // Check if this handler should process this URI
    if (!uri.startsWith("brex://expenses") || uri.includes("/card")) {
      return { handled: false }; // Not handled by this handler (card expenses have their own handler)
    }
    
    logDebug(`Reading expenses resource: ${uri}`);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Parse parameters from URI
    const params = expensesTemplate.parse(uri);
    
    if (!params.id) {
      // List all expenses
      try {
        logDebug("Fetching all expenses from Brex API");
        const listParams: ListExpensesParams = {
          limit: 50,
          expand: ['merchant'] // Always expand merchant information
        };
        const expenses = await brexClient.getExpenses(listParams);
        logDebug(`Successfully fetched ${expenses.items.length} expenses`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(expenses.items, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch expenses: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      // Get specific expense
      try {
        logDebug(`Fetching expense ${params.id} from Brex API`);
        const expense = await brexClient.getExpense(params.id, { 
          expand: ['merchant', 'location', 'department', 'receipts.download_uris'],
          load_custom_fields: true
        });
        
        if (!isExpense(expense)) {
          logError(`Invalid expense data received for expense ID: ${params.id}`);
          throw new Error('Invalid expense data received');
        }
        
        logDebug(`Successfully fetched expense ${params.id}`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(expense, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch expense ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  });
} 