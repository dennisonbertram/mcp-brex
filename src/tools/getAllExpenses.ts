/**
 * @file Get All Expenses Tool
 * @version 1.0.0
 * @description Implementation of the get_all_expenses tool with pagination and filtering support
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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
 * Interface for get_all_expenses tool input parameters
 */
interface GetAllExpensesParams {
  page_size?: number;
  max_items?: number;
  expense_type?: ExpenseType[];
  status?: ExpenseStatus[];
  payment_status?: ExpensePaymentStatus[];
  start_date?: string;
  end_date?: string;
}

/**
 * Validates and processes the get_all_expenses tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): GetAllExpensesParams {
  if (!input) {
    return {}; // All parameters are optional
  }
  
  const params: GetAllExpensesParams = {};
  
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
  
  // Validate expense_type if provided
  if (input.expense_type !== undefined) {
    const expenseTypes = Array.isArray(input.expense_type) 
      ? input.expense_type 
      : [input.expense_type];
      
    expenseTypes.forEach((type: string) => {
      // Type assertion to ensure proper comparison
      if (!Object.values(ExpenseType).includes(type as ExpenseType)) {
        throw new Error(`Invalid expense_type: ${type}`);
      }
    });
    
    params.expense_type = expenseTypes as ExpenseType[];
  }
  
  // Validate status if provided
  if (input.status !== undefined) {
    const statuses = Array.isArray(input.status) 
      ? input.status 
      : [input.status];
      
    statuses.forEach((status: string) => {
      // Type assertion to ensure proper comparison
      if (!Object.values(ExpenseStatus).includes(status as ExpenseStatus)) {
        throw new Error(`Invalid status: ${status}`);
      }
    });
    
    params.status = statuses as ExpenseStatus[];
  }
  
  // Validate payment_status if provided
  if (input.payment_status !== undefined) {
    const paymentStatuses = Array.isArray(input.payment_status) 
      ? input.payment_status 
      : [input.payment_status];
      
    paymentStatuses.forEach((status: string) => {
      // Type assertion to ensure proper comparison
      if (!Object.values(ExpensePaymentStatus).includes(status as ExpensePaymentStatus)) {
        throw new Error(`Invalid payment_status: ${status}`);
      }
    });
    
    params.payment_status = paymentStatuses as ExpensePaymentStatus[];
  }
  
  // Validate start_date if provided
  if (input.start_date !== undefined) {
    try {
      const date = new Date(input.start_date);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      params.start_date = date.toISOString();
    } catch (error) {
      throw new Error("Invalid start_date: must be a valid ISO date string");
    }
  }
  
  // Validate end_date if provided
  if (input.end_date !== undefined) {
    try {
      const date = new Date(input.end_date);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      params.end_date = date.toISOString();
    } catch (error) {
      throw new Error("Invalid end_date: must be a valid ISO date string");
    }
  }
  
  return params;
}

/**
 * Helper function to handle pagination of expenses
 * @param client The Brex client
 * @param params Pagination parameters
 * @returns An array of all fetched expenses
 */
async function fetchAllExpenses(client: BrexClient, params: GetAllExpensesParams): Promise<any[]> {
  const pageSize = params.page_size || 50;
  const maxItems = params.max_items || Infinity;
  let cursor: string | undefined = undefined;
  let allExpenses: any[] = [];
  let hasMore = true;
  
  while (hasMore && allExpenses.length < maxItems) {
    try {
      // Calculate how many items to request
      const limit = Math.min(pageSize, maxItems - allExpenses.length);
      
      // Build request parameters
      const requestParams: ListExpensesParams = {
        limit,
        cursor,
        expand: ['merchant', 'budget'] // Always expand merchant and budget information
      };
      
      // Add filters if provided
      if (params.expense_type) {
        requestParams.expense_type = params.expense_type;
      }
      
      if (params.status) {
        requestParams.status = params.status;
      }
      
      if (params.payment_status) {
        requestParams.payment_status = params.payment_status;
      }
      
      // Use updated_at_start instead of created_at_start
      if (params.start_date) {
        requestParams.updated_at_start = params.start_date;
      }
      
      // Handle end date with a fallback to client-side filtering
      if (params.end_date) {
        if ('updated_at_end' in requestParams) {
          // @ts-ignore - we're checking it exists at runtime
          requestParams.updated_at_end = params.end_date;
        } else {
          // If no updated_at_end exists, we'll filter client-side
          logDebug("Note: end_date filtering will be applied client-side");
        }
      }
      
      // Fetch page of expenses
      logDebug(`Fetching expenses page with cursor: ${cursor || 'initial'}`);
      const response = await client.getExpenses(requestParams);
      
      // Filter valid expenses
      let validExpenses = response.items.filter(isExpense);
      
      // Client-side end_date filtering if needed
      if (params.end_date && !('updated_at_end' in requestParams)) {
        const endDate = new Date(params.end_date).getTime();
        validExpenses = validExpenses.filter(expense => {
          const updatedAt = new Date(expense.updated_at).getTime();
          return updatedAt <= endDate;
        });
      }
      
      allExpenses = allExpenses.concat(validExpenses);
      
      logDebug(`Retrieved ${validExpenses.length} expenses (total: ${allExpenses.length})`);
      
      // Check if we should continue pagination
      // Use camelCase property name
      cursor = response.nextCursor;
      hasMore = !!cursor;
      
    } catch (error) {
      logError(`Error fetching expenses page: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  return allExpenses;
}

/**
 * Registers the get_all_expenses tool with the server
 * @param server The MCP server instance
 */
export function registerGetAllExpenses(server: Server): void {
  registerToolHandler("get_all_expenses", async (request) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.input);
      logDebug(`Getting all expenses with params: ${JSON.stringify(params)}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Fetch all expenses with pagination
        const allExpenses = await fetchAllExpenses(brexClient, params);
        
        logDebug(`Successfully fetched ${allExpenses.length} total expenses`);
        
        // Add helpful metadata about the request
        const result = {
          expenses: allExpenses,
          meta: {
            total_count: allExpenses.length,
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
        throw new Error(`Failed to get expenses: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in get_all_expenses tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 