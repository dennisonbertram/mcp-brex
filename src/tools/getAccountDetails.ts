/**
 * @file Get Account Details Tool
 * @version 1.0.0
 * @description Implementation of the get_account_details tool for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { isBrexAccount } from "../services/brex/types.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for get_account_details tool input parameters
 */
interface GetAccountDetailsParams {
  accountId: string;
}

/**
 * Validates and processes the get_account_details tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): GetAccountDetailsParams {
  if (!input) {
    throw new Error("Missing parameters");
  }
  
  if (!input.accountId) {
    throw new Error("Missing required parameter: accountId");
  }
  
  return {
    accountId: input.accountId
  };
}

/**
 * Registers the get_account_details tool with the server
 * @param server The MCP server instance
 */
export function registerGetAccountDetails(_server: Server): void {
  registerToolHandler("get_account_details", async (request: ToolCallRequest) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments as unknown as Record<string, unknown>);
      logDebug(`Getting account details for account ${params.accountId}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Call Brex API to get account details
        const account = await brexClient.getAccount(params.accountId);
        
        // Validate account data
        if (!isBrexAccount(account)) {
          throw new Error("Invalid account data received from Brex API");
        }
        
        // Get additional account information if available
        try {
          const transactions = await brexClient.getTransactions(params.accountId, undefined, 5);
          const recentActivity = transactions.items.slice(0, 5);
          
          // Combine account details with recent activity
          const enrichedAccount = {
            ...account,
            recent_activity: recentActivity
          };
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(enrichedAccount, null, 2)
            }]
          };
        } catch (transactionError) {
          // If we can't get transactions, just return the account details
          logError(`Error fetching recent transactions: ${transactionError instanceof Error ? transactionError.message : String(transactionError)}`);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(account, null, 2)
            }]
          };
        }
      } catch (apiError) {
        logError(`Error calling Brex API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        throw new Error(`Failed to get account details: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in get_account_details tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 