/**
 * @file Get Transactions Tool
 * @version 1.0.0
 * @description Implementation of the get_transactions tool for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { isBrexTransaction } from "../services/brex/types.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { estimateTokens } from "../utils/responseLimiter.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for get_transactions tool input parameters
 */
interface GetTransactionsParams {
  accountId: string;
  limit?: number;
  summary_only?: boolean;
  fields?: string[];
}

/**
 * Validates and processes the get_transactions tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: unknown): GetTransactionsParams {
  if (!input) {
    throw new Error("Missing parameters");
  }
  const raw = input as Record<string, unknown>;
  if (!raw.accountId) {
    throw new Error("Missing required parameter: accountId");
  }
  
  const params: GetTransactionsParams = {
    accountId: String(raw.accountId)
  };
  
  // Add optional parameters if provided
  if (raw.limit !== undefined) {
    const limit = parseInt(String(raw.limit), 10);
    if (isNaN(limit) || limit <= 0) {
      throw new Error("Invalid limit: must be a positive number");
    }
    params.limit = limit;
  }
  
  // Validate summary_only if provided
  if (raw.summary_only !== undefined) {
    params.summary_only = Boolean(raw.summary_only);
  }
  
  // Validate fields if provided
  if (raw.fields !== undefined) {
    if (Array.isArray(raw.fields)) {
      params.fields = raw.fields.map(String).filter((f: string) => f.trim().length > 0);
    } else {
      throw new Error("Invalid fields: must be an array of strings");
    }
  }
  
  return params;
}

/**
 * Registers the get_transactions tool with the server
 * @param server The MCP server instance
 */
export function registerGetTransactions(_server: Server): void {
  registerToolHandler("get_transactions", async (request: ToolCallRequest) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments);
      logDebug(`Getting transactions for account ${params.accountId}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      // Set default limit if not provided
      const limit = params.limit || 50;
      
      try {
        // Call Brex API to get transactions (fallback via statements). Prefer get_cash_transactions.
        const transactions = await brexClient.getTransactions(params.accountId, undefined, limit);
        
        // Validate transactions data
        if (!transactions || !Array.isArray(transactions.items)) {
          throw new Error("Invalid response format from Brex API");
        }
        
        // Filter valid transactions
        const validTransactions = transactions.items.filter(isBrexTransaction);
        logDebug(`Found ${validTransactions.length} valid transactions out of ${transactions.items.length} total`);
        
        // Apply response limiting
        const fullText = JSON.stringify(validTransactions);
        const tooBig = estimateTokens(fullText) > 24000;
        const shouldSummarize = params.summary_only || tooBig;
        
        let processedTransactions = validTransactions;
        if (shouldSummarize && params.fields) {
          // Apply field projection if specified
          processedTransactions = validTransactions.map(transaction => {
            const projected: any = {};
            for (const field of params.fields!) {
              const value = getNestedValue(transaction, field);
              if (value !== undefined) {
                setNestedValue(projected, field, value);
              }
            }
            return projected;
          });
        } else if (shouldSummarize) {
          // Default summary fields for transactions
          const defaultFields = ['id', 'posted_at', 'amount', 'description', 'status'];
          processedTransactions = validTransactions.map(transaction => {
            const projected: any = {};
            for (const field of defaultFields) {
              const value = getNestedValue(transaction, field);
              if (value !== undefined) {
                setNestedValue(projected, field, value);
              }
            }
            return projected;
          });
        }
        
        const result = {
          transactions: processedTransactions,
          meta: {
            account_id: params.accountId,
            total_count: validTransactions.length,
            requested_parameters: params,
            summary_applied: shouldSummarize
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
        throw new Error(`Failed to get transactions: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in get_transactions tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}

// Helper functions for field projection
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] == null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
} 