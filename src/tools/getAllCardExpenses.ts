/**
 * @file Get All Card Expenses Tool
 * @version 1.0.0
 * @description Implementation of the get_all_card_expenses tool with pagination and filtering support
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
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { limitExpensesPayload } from "../utils/responseLimiter.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for get_all_card_expenses tool input parameters
 */
interface GetAllCardExpensesParams {
  page_size?: number;
  max_items?: number;
  status?: ExpenseStatus[];
  payment_status?: ExpensePaymentStatus[];
  start_date?: string;
  end_date?: string;
  merchant_name?: string;
  summary_only?: boolean;
  fields?: string[];
  min_amount?: number;
  max_amount?: number;
  window_days?: number;
}

/**
 * Validates and processes the get_all_card_expenses tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: unknown): GetAllCardExpensesParams {
  if (!input) {
    return {}; // All parameters are optional
  }
  
  const raw = input as Record<string, unknown>;
  const params: GetAllCardExpensesParams = {};
  
  // Validate page_size if provided
  if (raw.page_size !== undefined) {
    const pageSize = parseInt(String(raw.page_size), 10);
    if (isNaN(pageSize) || pageSize <= 0 || pageSize > 100) {
      throw new Error("Invalid page_size: must be a positive number between 1 and 100");
    }
    params.page_size = pageSize;
  }
  
  // Validate max_items if provided
  if (raw.max_items !== undefined) {
    const maxItems = parseInt(String(raw.max_items), 10);
    if (isNaN(maxItems) || maxItems <= 0) {
      throw new Error("Invalid max_items: must be a positive number");
    }
    params.max_items = maxItems;
  }
  
  // Validate status if provided
  if (raw.status !== undefined) {
    const statuses = Array.isArray(raw.status) 
      ? raw.status 
      : [raw.status];
      
    statuses.forEach((status: string) => {
      // Type assertion to ensure status is treated as the correct enum type
      if (!Object.values(ExpenseStatus).includes(status as ExpenseStatus)) {
        throw new Error(`Invalid status: ${status}`);
      }
    });
    
    params.status = statuses as ExpenseStatus[];
  }
  
  // Validate payment_status if provided
  if (raw.payment_status !== undefined) {
    const paymentStatuses = Array.isArray(raw.payment_status) 
      ? raw.payment_status 
      : [raw.payment_status];
      
    paymentStatuses.forEach((status: string) => {
      // Type assertion to ensure status is treated as the correct enum type
      if (!Object.values(ExpensePaymentStatus).includes(status as ExpensePaymentStatus)) {
        throw new Error(`Invalid payment_status: ${status}`);
      }
    });
    
    params.payment_status = paymentStatuses as ExpensePaymentStatus[];
  }
  
  // Validate start_date if provided
  if (raw.start_date !== undefined) {
    try {
      const date = new Date(String(raw.start_date));
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      params.start_date = date.toISOString();
    } catch (error) {
      throw new Error("Invalid start_date: must be a valid ISO date string");
    }
  }
  
  // Validate end_date if provided
  if (raw.end_date !== undefined) {
    try {
      const date = new Date(String(raw.end_date));
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      params.end_date = date.toISOString();
    } catch (error) {
      throw new Error("Invalid end_date: must be a valid ISO date string");
    }
  }
  
  // Add merchant name filter if provided
  if (raw.merchant_name !== undefined) {
    if (typeof raw.merchant_name !== 'string' || String(raw.merchant_name).trim() === '') {
      throw new Error("Invalid merchant_name: must be a non-empty string");
    }
    params.merchant_name = String(raw.merchant_name).trim();
  }
  // Amount thresholds
  if (raw.min_amount !== undefined) {
    const n = parseFloat(String(raw.min_amount));
    if (isNaN(n) || n < 0) throw new Error("Invalid min_amount: must be non-negative");
    params.min_amount = n;
  }
  if (raw.max_amount !== undefined) {
    const n = parseFloat(String(raw.max_amount));
    if (isNaN(n) || n < 0) throw new Error("Invalid max_amount: must be non-negative");
    params.max_amount = n;
  }
  if (params.min_amount !== undefined && params.max_amount !== undefined && params.min_amount > params.max_amount) {
    throw new Error("min_amount cannot be greater than max_amount");
  }
  // Optional batching window size (days)
  if (raw.window_days !== undefined) {
    const d = parseInt(String(raw.window_days), 10);
    if (isNaN(d) || d <= 0) throw new Error("Invalid window_days: must be a positive integer");
    params.window_days = d;
  }
  
  return params;
}

/**
 * Helper function to handle pagination of card expenses
 * @param client The Brex client
 * @param params Pagination parameters
 * @returns An array of all fetched card expenses
 */
async function fetchAllCardExpenses(client: BrexClient, params: GetAllCardExpensesParams): Promise<unknown[]> {
  const pageSize = params.page_size || 50;
  const maxItems = params.max_items || Infinity;
  let allExpenses: unknown[] = [];
  const start = params.start_date ? new Date(params.start_date) : undefined;
  const end = params.end_date ? new Date(params.end_date) : undefined;
  const windowDays = params.window_days && start && end ? params.window_days : undefined;
  const windows: Array<{ start?: string; end?: string }> = [];
  if (windowDays && start && end) {
    const cursorStart = new Date(start);
    while (cursorStart <= end && allExpenses.length < maxItems) {
      const cursorEnd = new Date(cursorStart);
      cursorEnd.setUTCDate(cursorEnd.getUTCDate() + windowDays);
      if (cursorEnd > end) cursorEnd.setTime(end.getTime());
      windows.push({ start: cursorStart.toISOString(), end: cursorEnd.toISOString() });
      cursorStart.setUTCDate(cursorStart.getUTCDate() + windowDays);
    }
  } else {
    windows.push({ start: params.start_date, end: params.end_date });
  }
  for (const w of windows) {
    let cursor: string | undefined = undefined;
    let hasMore = true;
    while (hasMore && allExpenses.length < maxItems) {
      try {
        const limit = Math.min(pageSize, maxItems - allExpenses.length);
        const requestParams: ListExpensesParams = {
          limit,
          cursor,
          expense_type: [ExpenseType.CARD],
          expand: ['merchant', 'budget']
        };
        if (params.status) requestParams.status = params.status;
        if (params.payment_status) requestParams.payment_status = params.payment_status;
        if (w.start) requestParams.updated_at_start = w.start;
        if (w.end) requestParams.updated_at_end = w.end;
        
        logDebug(`Fetching card expenses page (window ${w.start || 'none'}..${w.end || 'none'}) cursor: ${cursor || 'initial'}`);
        const response = await client.getCardExpenses(requestParams);
        let validExpenses = response.items.filter(isExpense);
        if (params.merchant_name) {
          const merchantNameLower = params.merchant_name.toLowerCase();
          validExpenses = validExpenses.filter(expense => (expense.merchant?.raw_descriptor || '').toLowerCase().includes(merchantNameLower));
        }
        if (params.min_amount !== undefined) {
          validExpenses = validExpenses.filter(e => typeof e.purchased_amount?.amount === 'number' && e.purchased_amount.amount >= (params.min_amount as number));
        }
        if (params.max_amount !== undefined) {
          validExpenses = validExpenses.filter(e => typeof e.purchased_amount?.amount === 'number' && e.purchased_amount.amount <= (params.max_amount as number));
        }
        allExpenses = allExpenses.concat(validExpenses);
        logDebug(`Retrieved ${validExpenses.length} card expenses (total: ${allExpenses.length})`);
        cursor = response.nextCursor;
        hasMore = !!cursor;
      } catch (error) {
        logError(`Error fetching card expenses page: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    if (allExpenses.length >= maxItems) break;
  }
  return allExpenses;
}

/**
 * Registers the get_all_card_expenses tool with the server
 * @param server The MCP server instance
 */
export function registerGetAllCardExpenses(_server: Server): void {
  registerToolHandler("get_all_card_expenses", async (request: ToolCallRequest) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments);
      logDebug(`Getting all card expenses with params: ${JSON.stringify(params)}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Fetch all card expenses with pagination
        const allCardExpenses = await fetchAllCardExpenses(brexClient, params);
        const { items, summaryApplied } = limitExpensesPayload(allCardExpenses as any, {
          summaryOnly: params.summary_only,
          fields: params.fields,
          hardTokenLimit: 24000
        });
        
        logDebug(`Successfully fetched ${allCardExpenses.length} total card expenses`);
        
        // Add helpful metadata about the request
        const result = {
          card_expenses: items,
          meta: {
            total_count: items.length,
            requested_parameters: params,
            summary_applied: summaryApplied
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
        throw new Error(`Failed to get card expenses: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in get_all_card_expenses tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 