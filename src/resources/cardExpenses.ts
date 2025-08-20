/**
 * @file Card Expenses Resource Handler
 * @version 1.0.0
 * @description Handles Brex card expenses resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { 
  ListExpensesParams, 
  Expense
} from "../services/brex/expenses-types.js";
import { parseQueryParams } from "../models/common.js";
import { limitExpensesPayload } from "../utils/responseLimiter.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define card expenses resource template
const cardExpensesTemplate = new ResourceTemplate("brex://expenses/card{/id}");

/**
 * Checks if an object is a card expense (has expected properties)
 * @param obj The object to check
 * @returns true if the object appears to be a valid expense
 */
function isCardExpense(obj: unknown): obj is Expense {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// normalizeCardExpense helper intentionally removed as unused

/**
 * Registers the card expenses resource handler with the server
 * @param server The MCP server instance
 */
export function registerCardExpensesResource(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://expenses/card{/id}": {
        description: "Brex card expenses",
        mimeTypes: ["application/json"],
      }
    }
  });

  // Use the standard approach with setRequestHandler
  server.setRequestHandler(ReadResourceRequestSchema, async (request, _extra) => {
    const uri = request.params.uri;
    
    // Check if this handler should process this URI
    if (!uri.startsWith("brex://expenses/card")) {
      return { handled: false }; // Not handled by this handler
    }
    
    logDebug(`Reading card expenses resource: ${uri}`);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Parse parameters from URI
    const params = cardExpensesTemplate.parse(uri);
    
    if (!params.id) {
      // List all card expenses
      try {
        logDebug("Fetching all card expenses from Brex API");
        const listParams: ListExpensesParams = {
          // expense_type not needed for /card endpoint
          limit: 50,
          expand: ['merchant', 'budget'] // Always expand merchant and budget information
        };
        const cardExpenses = await brexClient.getCardExpenses(listParams);
        const qp = parseQueryParams(uri);
        const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
        const summaryOnly = qp.summary_only === 'true';
        const limited = limitExpensesPayload(cardExpenses.items as any, { summaryOnly, fields, hardTokenLimit: 24000 });
        logDebug(`Successfully fetched ${cardExpenses.items.length} card expenses (returned: ${limited.items.length})`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(limited.items, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch card expenses: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      // Get specific card expense
      try {
        logDebug(`Fetching card expense ${params.id} from Brex API`);
        const cardExpense = await brexClient.getCardExpense(params.id, { 
          expand: ['merchant', 'budget', 'location', 'department', 'receipts.download_uris'],
          load_custom_fields: true
        });
        
        if (!isCardExpense(cardExpense)) {
          logError(`Invalid card expense data received for card expense ID: ${params.id}`);
          throw new Error('Invalid card expense data received');
        }
        
        const qp = parseQueryParams(uri);
        const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
        const summaryOnly = qp.summary_only === 'true';
        const limited = limitExpensesPayload([cardExpense] as any, { summaryOnly, fields, hardTokenLimit: 24000 });
        logDebug(`Successfully fetched card expense ${params.id}`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(limited.items[0] || {}, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch card expense ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  });
} 