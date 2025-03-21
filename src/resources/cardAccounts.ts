/**
 * @file Card Accounts Resource Handler
 * @version 1.0.0
 * @description Handles Brex card accounts resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { isCardAccount, isStatement } from "../services/brex/transactions-types.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define card accounts resource template
const cardAccountsTemplate = new ResourceTemplate("brex://accounts/card{/id}");
const cardStatementsTemplate = new ResourceTemplate("brex://accounts/card/primary/statements");

/**
 * Registers the card accounts resource handler with the server
 * @param server The MCP server instance
 */
export function registerCardAccountsResource(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://accounts/card{/id}": {
        description: "Brex card accounts",
        mimeTypes: ["application/json"],
      },
      "brex://accounts/card/primary/statements": {
        description: "Brex primary card account statements",
        mimeTypes: ["application/json"],
      }
    }
  });

  // Use the standard approach with setRequestHandler
  server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
    const uri = request.params.uri;
    
    // Check if this handler should process this URI
    if (!uri.startsWith("brex://accounts/card")) {
      return { handled: false }; // Not handled by this handler
    }
    
    logDebug(`Reading card account resource: ${uri}`);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Handle card account primary statements endpoint
    if (uri.includes("primary/statements")) {
      // Extract cursor and limit from query parameters
      const url = new URL(uri);
      const cursor = url.searchParams.get("cursor") || undefined;
      const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit") as string, 10) : undefined;
      
      try {
        logDebug("Fetching primary card account statements from Brex API");
        const statements = await brexClient.getPrimaryCardStatements(cursor, limit);
        
        // Validate statements
        if (!statements.items || !Array.isArray(statements.items)) {
          throw new Error('Invalid statements data received');
        }
        
        for (const statement of statements.items) {
          if (!isStatement(statement)) {
            logError(`Invalid statement data received: ${JSON.stringify(statement)}`);
            throw new Error('Invalid statement data received');
          }
        }
        
        logDebug(`Successfully fetched ${statements.items.length} primary card statements`);
        
        // Format response with pagination information
        const result = {
          items: statements.items,
          pagination: {
            hasMore: !!statements.next_cursor,
            nextCursor: statements.next_cursor
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
        logError(`Failed to fetch primary card statements: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
    
    // Handle regular card accounts endpoint
    const params = cardAccountsTemplate.parse(uri);
    
    if (!params.id) {
      // List all card accounts
      try {
        logDebug("Fetching all card accounts from Brex API");
        const accounts = await brexClient.getCardAccounts();
        
        // Validate accounts
        if (!Array.isArray(accounts)) {
          throw new Error('Invalid card accounts data received');
        }
        
        for (const account of accounts) {
          if (!isCardAccount(account)) {
            logError(`Invalid card account data received: ${JSON.stringify(account)}`);
            throw new Error('Invalid card account data received');
          }
        }
        
        logDebug(`Successfully fetched ${accounts.length} card accounts`);
        
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(accounts, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch card accounts: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      // Get specific card account - Currently not supported by the API
      logError(`Getting specific card account by ID is not supported by the Brex API: ${params.id}`);
      return {
        error: {
          message: "Getting specific card account by ID is not supported by the Brex API",
          code: 400
        }
      };
    }
  });
} 