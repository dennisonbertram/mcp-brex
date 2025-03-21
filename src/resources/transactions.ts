/**
 * @file Transactions Resource Handler
 * @version 1.0.0
 * @description Handles Brex transactions resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { isCardTransaction, isCashTransaction } from "../services/brex/transactions-types.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define resource templates
const cardTransactionsTemplate = new ResourceTemplate("brex://transactions/card/primary");
const cashTransactionsTemplate = new ResourceTemplate("brex://transactions/cash/{id}");

/**
 * Registers the transactions resource handler with the server
 * @param server The MCP server instance
 */
export function registerTransactionsResource(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://transactions/card/primary": {
        description: "Brex card transactions",
        mimeTypes: ["application/json"],
      },
      "brex://transactions/cash/{id}": {
        description: "Brex cash transactions",
        mimeTypes: ["application/json"],
      }
    }
  });

  // Use the standard approach with setRequestHandler
  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
    const uri = request.params.uri;
    
    // Check if this handler should process this URI
    if (!uri.startsWith("brex://transactions")) {
      return { handled: false }; // Not handled by this handler
    }
    
    logDebug(`Reading transactions resource: ${uri}`);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Handle card transactions
    if (uri.includes("transactions/card/primary")) {
      // Extract query parameters
      const url = new URL(uri);
      const options = {
        cursor: url.searchParams.get("cursor") || undefined,
        limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit") as string, 10) : undefined,
        posted_at_start: url.searchParams.get("posted_at_start") || undefined,
        user_ids: url.searchParams.getAll("user_id") || undefined,
        expand: url.searchParams.getAll("expand") || undefined
      };
      
      try {
        logDebug("Fetching card transactions from Brex API", { options });
        const transactions = await brexClient.getCardTransactions(options);
        
        // Validate transactions
        if (!transactions.items || !Array.isArray(transactions.items)) {
          throw new Error('Invalid card transactions data received');
        }
        
        for (const transaction of transactions.items) {
          if (!isCardTransaction(transaction)) {
            logError(`Invalid card transaction data received: ${JSON.stringify(transaction)}`);
            throw new Error('Invalid card transaction data received');
          }
        }
        
        logDebug(`Successfully fetched ${transactions.items.length} card transactions`);
        
        // Format response with pagination information
        const result = {
          items: transactions.items,
          pagination: {
            hasMore: !!transactions.next_cursor,
            nextCursor: transactions.next_cursor
          }
        };
        
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch card transactions: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    // Handle cash transactions
    if (uri.includes("transactions/cash")) {
      const params = cashTransactionsTemplate.parse(uri);
      
      if (!params.id) {
        return {
          error: {
            message: "Account ID is required for cash transactions endpoint",
            code: 400
          }
        };
      }
      
      // Extract query parameters
      const url = new URL(uri);
      const options = {
        cursor: url.searchParams.get("cursor") || undefined,
        limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit") as string, 10) : undefined,
        posted_at_start: url.searchParams.get("posted_at_start") || undefined
      };
      
      try {
        logDebug(`Fetching cash transactions for account ${params.id} from Brex API`, { options });
        const transactions = await brexClient.getCashTransactions(params.id, options);
        
        // Validate transactions
        if (!transactions.items || !Array.isArray(transactions.items)) {
          throw new Error('Invalid cash transactions data received');
        }
        
        for (const transaction of transactions.items) {
          if (!isCashTransaction(transaction)) {
            logError(`Invalid cash transaction data received: ${JSON.stringify(transaction)}`);
            throw new Error('Invalid cash transaction data received');
          }
        }
        
        logDebug(`Successfully fetched ${transactions.items.length} cash transactions for account ${params.id}`);
        
        // Format response with pagination information
        const result = {
          items: transactions.items,
          pagination: {
            hasMore: !!transactions.next_cursor,
            nextCursor: transactions.next_cursor
          }
        };
        
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch cash transactions: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    // If we get here, the URI wasn't handled properly
    return {
      error: {
        message: `Unsupported transactions endpoint: ${uri}`,
        code: 400
      }
    };
  });
} 