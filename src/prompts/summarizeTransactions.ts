/**
 * @file Summarize Transactions Prompt
 * @version 1.0.0
 * @description Implementation of the summarize_transactions prompt for the Brex MCP server
 */

import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Implements the summarize_transactions prompt
 * @returns The prompt messages for summarizing transactions
 */
export async function summarizeTransactions() {
  try {
    const brexClient = getBrexClient();
    const accounts = await brexClient.getAccounts();
    
    const embeddedResources = accounts.items.map(account => ({
      type: "resource" as const,
      resource: {
        uri: `brex://accounts/${account.id}`,
        mimeType: "application/json",
        text: JSON.stringify(account, null, 2)
      }
    }));

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Please analyze the following Brex accounts:"
          }
        },
        ...embeddedResources.map(resource => ({
          role: "user" as const,
          content: resource
        })),
        {
          role: "user",
          content: {
            type: "text",
            text: "Provide a summary of the accounts, including total balances by currency and account status."
          }
        }
      ]
    };
  } catch (error) {
    logError(`Error in summarize_transactions prompt: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
} 