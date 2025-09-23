/**
 * @file Accounts Resource Handler
 * @version 1.0.0
 * @description Handles Brex accounts resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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

/** Capability registration only */
export function registerAccountsCapabilities(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://accounts{/id}": {
        description: "Brex accounts",
        mimeTypes: ["application/json"],
      }
    }
  });
}

/** Predicate: whether this module should handle the URI */
export function canHandleAccountsUri(uri: string): boolean {
  return uri.startsWith("brex://accounts") &&
         !uri.startsWith("brex://accounts/card") &&
         !uri.startsWith("brex://accounts/cash");
}

/** Pure handler for accounts URIs */
export async function readAccountsUri(uri: string): Promise<any> {
  logDebug(`Reading account resource: ${uri}`);
  const brexClient = getBrexClient();
  const params = accountsTemplate.parse(uri);

  if (!params.id) {
    try {
      logDebug("Fetching all accounts from Brex API");
      const accounts = await brexClient.getAccounts();
      logDebug(`Successfully fetched ${accounts.items.length} accounts`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(accounts.items, null, 2) }]
      };
    } catch (error) {
      logError(`Failed to fetch accounts: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  } else {
    try {
      logDebug(`Fetching account ${params.id} from Brex API`);
      const account = await brexClient.getAccount(params.id);
      if (!isBrexAccount(account)) {
        logError(`Invalid account data received for account ID: ${params.id}`);
        throw new Error('Invalid account data received');
      }
      logDebug(`Successfully fetched account ${params.id}`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(account, null, 2) }]
      };
    } catch (error) {
      logError(`Failed to fetch account ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
