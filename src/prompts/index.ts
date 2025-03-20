/**
 * @file Prompts Index
 * @version 1.0.0
 * @description Exports all prompt handlers for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { summarizeTransactions } from "./summarizeTransactions.js";
import { summarizeExpenses } from "./summarizeExpenses.js";
import { logError } from "../utils/logger.js";

/**
 * Registers all prompts with the server
 * @param server The MCP server instance
 */
export function registerPrompts(server: Server): void {
  // Register the list prompts handler
  registerListPromptsHandler(server);

  // Register the get prompt handler
  registerGetPromptHandler(server);
}

/**
 * Registers the handler for listing available prompts
 * @param server The MCP server instance
 */
function registerListPromptsHandler(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "summarize_transactions",
          description: "Summarize transactions for a Brex account",
        },
        {
          name: "summarize_expenses",
          description: "Summarize expenses by category and status",
        }
      ]
    };
  });
}

/**
 * Registers the handler for getting a specific prompt
 * @param server The MCP server instance
 */
function registerGetPromptHandler(server: Server): void {
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      switch (request.params.name) {
        case "summarize_transactions":
          return await summarizeTransactions();
        case "summarize_expenses":
          return await summarizeExpenses();
        default:
          throw new Error(`Unknown prompt: ${request.params.name}`);
      }
    } catch (error) {
      logError(error as Error);
      throw error;
    }
  });
} 