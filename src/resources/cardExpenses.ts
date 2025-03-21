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
  ExpenseType, 
  ExpenseStatus,
  Expense
} from "../services/brex/expenses-types.js";

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
function isCardExpense(obj: any): obj is Expense {
  return obj && 
    typeof obj === 'object' && 
    'id' in obj;
}

/**
 * Normalize card expense data to ensure required fields are present
 */
function normalizeCardExpense(expense: any, id?: string): any {
  // Create a copy to avoid modifying the original
  const normalizedExpense = { ...expense };
  
  // Ensure required fields
  if (!normalizedExpense.id) normalizedExpense.id = id || "unknown-" + Math.random().toString(36).substring(2, 9);
  if (!normalizedExpense.updated_at) normalizedExpense.updated_at = new Date().toISOString();
  if (!normalizedExpense.status) normalizedExpense.status = ExpenseStatus.SUBMITTED; // Default status
  
  // Format merchant information
  if (normalizedExpense.merchant) {
    if (typeof normalizedExpense.merchant === 'object') {
      const merchantName = normalizedExpense.merchant.raw_descriptor || 'Unknown Merchant';
      (normalizedExpense as any).merchant_name = merchantName;
      
      if (!normalizedExpense.merchant.raw_descriptor) {
        (normalizedExpense.merchant as any).raw_descriptor = 'Unknown';
      }
    }
  } else if (normalizedExpense.merchant_id) {
    normalizedExpense.merchant = {
      raw_descriptor: 'Merchant ID: ' + normalizedExpense.merchant_id,
      id: normalizedExpense.merchant_id
    };
    (normalizedExpense as any).merchant_name = 'Merchant ID: ' + normalizedExpense.merchant_id;
  }
  
  return normalizedExpense;
}

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
  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
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
          expense_type: [ExpenseType.CARD],
          limit: 50,
          expand: ['merchant'] // Always expand merchant information
        };
        const cardExpenses = await brexClient.getCardExpenses(listParams);
        logDebug(`Successfully fetched ${cardExpenses.items.length} card expenses`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(cardExpenses.items, null, 2)
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
          expand: ['merchant', 'location', 'department', 'receipts.download_uris'],
          load_custom_fields: true
        });
        
        if (!isCardExpense(cardExpense)) {
          logError(`Invalid card expense data received for card expense ID: ${params.id}`);
          throw new Error('Invalid card expense data received');
        }
        
        logDebug(`Successfully fetched card expense ${params.id}`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(cardExpense, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch card expense ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  });
} 