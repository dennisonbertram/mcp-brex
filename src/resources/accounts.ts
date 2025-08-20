/**
 * @file Accounts Resource Handler
 * @version 1.0.0
 * @description Handles Brex accounts resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { isBrexAccount } from "../services/brex/types.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define account resource template
const accountsTemplate = new ResourceTemplate("brex://accounts{/id}");

/**
 * Registers the accounts resource handler with the server
 * @param server The MCP server instance
 */
export function registerAccountsResource(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://accounts{/id}": {
        description: "Brex accounts",
        mimeTypes: ["application/json"],
      }
    }
  });

  // Use the standard approach with setRequestHandler
  server.setRequestHandler(ReadResourceRequestSchema, async (request, _extra) => {
    const uri = request.params.uri;
    
    // Check if this handler should process this URI
    if (!uri.startsWith("brex://accounts")) {
      return { handled: false }; // Not handled by this handler
    }
    
    logDebug(`Reading account resource: ${uri}`);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Parse parameters from URI
    const params = accountsTemplate.parse(uri);
    
    if (!params.id) {
      // List all accounts
      try {
        logDebug("Fetching all accounts from Brex API");
        const accounts = await brexClient.getAccounts();
        logDebug(`Successfully fetched ${accounts.items.length} accounts`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(accounts.items, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch accounts: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      // Get specific account
      try {
        logDebug(`Fetching account ${params.id} from Brex API`);
        const account = await brexClient.getAccount(params.id);
        
        if (!isBrexAccount(account)) {
          logError(`Invalid account data received for account ID: ${params.id}`);
          throw new Error('Invalid account data received');
        }
        
        logDebug(`Successfully fetched account ${params.id}`);
        return {
          contents: [{
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(account, null, 2)
          }]
        };
      } catch (error) {
        logError(`Failed to fetch account ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  });
} 