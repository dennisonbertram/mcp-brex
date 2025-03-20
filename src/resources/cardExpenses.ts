/**
 * @file Card Expenses Resource Handler
 * @version 1.0.0
 * @description Handles Brex card expenses resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { 
  ListExpensesParams, 
  ExpenseType, 
  ExpenseStatus 
} from "../services/brex/expenses-types.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define card expenses resource template
const cardExpensesTemplate = new ResourceTemplate("brex://expenses/card{/id}");

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
  server.registerCapability({
    resources: {
      "brex://expenses/card{/id}": {
        description: "Brex card expenses",
        mimeTypes: ["application/json"],
      }
    }
  });

  server.setReadResourceHandler(cardExpensesTemplate, async (request) => {
    const uri = request.params.uri;
    logDebug(`Reading card expenses resource: ${uri}`);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Parse parameters from URI
    const params = cardExpensesTemplate.parse(uri);
    
    try {
      if (!params.id) {
        // List all card expenses
        logDebug("Fetching all card expenses from Brex API");
        const listParams: ListExpensesParams = {
          expense_type: [ExpenseType.CARD],
          limit: 50
        };
        
        try {
          const expenses = await brexClient.getCardExpenses(listParams);
          logDebug(`Successfully fetched ${expenses.items.length} card expenses`);
          
          // Normalize all items
          const normalizedItems = expenses.items.map(item => 
            normalizeCardExpense(item)
          );
          
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify(normalizedItems, null, 2)
            }]
          };
        } catch (cardExpensesError) {
          logError(`Error fetching card expenses data: ${cardExpensesError instanceof Error ? cardExpensesError.message : String(cardExpensesError)}`);
          // Provide a fallback empty response
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify([], null, 2),
            }]
          };
        }
      } else {
        // Get specific card expense
        logDebug(`Fetching card expense ${params.id} from Brex API`);
        
        try {
          const expense = await brexClient.getCardExpense(params.id, {
            expand: ['merchant', 'location', 'department', 'receipts.download_uris'],
            load_custom_fields: true
          });
          
          const normalizedExpense = normalizeCardExpense(expense, params.id);
          
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify(normalizedExpense, null, 2)
            }]
          };
        } catch (cardExpenseError) {
          logError(`Error fetching specific card expense data: ${cardExpenseError instanceof Error ? cardExpenseError.message : String(cardExpenseError)}`);
          // Return a minimal valid expense object
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify({
                id: params.id,
                updated_at: new Date().toISOString(),
                status: "UNKNOWN",
                error: "Failed to fetch expense details"
              }, null, 2)
            }]
          };
        }
      }
    } catch (error) {
      logError(`Failed to handle card expense request: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 