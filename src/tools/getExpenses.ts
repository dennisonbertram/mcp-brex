/**
 * @file Get Expenses Tool
 * @version 1.0.0
 * @description Implementation of the get_expenses tool for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { 
  ExpenseType, 
  ExpenseStatus, 
  ExpensePaymentStatus,
  ListExpensesParams,
  isExpense 
} from "../services/brex/expenses-types.js";
import { registerToolHandler } from "./index.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for get_expenses tool input parameters
 */
interface GetExpensesParams {
  expense_type?: ExpenseType;
  status?: ExpenseStatus;
  payment_status?: ExpensePaymentStatus;
  limit?: number;
}

/**
 * Validates and processes the get_expenses tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): GetExpensesParams {
  if (!input) {
    return {}; // All parameters are optional
  }
  
  const params: GetExpensesParams = {};
  
  // Validate expense_type if provided
  if (input.expense_type !== undefined) {
    if (!Object.values(ExpenseType).includes(input.expense_type)) {
      throw new Error(`Invalid expense_type: ${input.expense_type}`);
    }
    params.expense_type = input.expense_type;
  }
  
  // Validate status if provided
  if (input.status !== undefined) {
    if (!Object.values(ExpenseStatus).includes(input.status)) {
      throw new Error(`Invalid status: ${input.status}`);
    }
    params.status = input.status;
  }
  
  // Validate payment_status if provided
  if (input.payment_status !== undefined) {
    if (!Object.values(ExpensePaymentStatus).includes(input.payment_status)) {
      throw new Error(`Invalid payment_status: ${input.payment_status}`);
    }
    params.payment_status = input.payment_status;
  }
  
  // Validate limit if provided
  if (input.limit !== undefined) {
    const limit = parseInt(input.limit.toString(), 10);
    if (isNaN(limit) || limit <= 0) {
      throw new Error("Invalid limit: must be a positive number");
    }
    params.limit = limit;
  }
  
  return params;
}

/**
 * Registers the get_expenses tool with the server
 * @param server The MCP server instance
 */
export function registerGetExpenses(server: Server): void {
  registerToolHandler("get_expenses", async (request) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments);
      logDebug(`Getting expenses with params: ${JSON.stringify(params)}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      // Set default limit if not provided
      const limit = params.limit || 50;
      
      try {
        // Prepare API parameters
        const apiParams: ListExpensesParams = {
          limit
        };
        
        // Add filters if provided, ensuring expense_type is an array
        if (params.expense_type) {
          apiParams.expense_type = [params.expense_type];
        }
        
        if (params.status) {
          apiParams.status = [params.status];
        }
        
        if (params.payment_status) {
          apiParams.payment_status = [params.payment_status];
        }
        
        // Call Brex API to get expenses
        const expenses = await brexClient.getExpenses(apiParams);
        
        // Validate expenses data
        if (!expenses || !Array.isArray(expenses.items)) {
          throw new Error("Invalid response format from Brex API");
        }
        
        // Filter valid expenses
        const validExpenses = expenses.items.filter(isExpense);
        logDebug(`Found ${validExpenses.length} valid expenses out of ${expenses.items.length} total`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(validExpenses, null, 2)
          }]
        };
      } catch (apiError) {
        logError(`Error calling Brex API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        throw new Error(`Failed to get expenses: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in get_expenses tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 