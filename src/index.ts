#!/usr/bin/env node

/**
 * @file Brex MCP Server
 * @version 1.0.0
 * @status STABLE - DO NOT MODIFY WITHOUT TESTS
 * @lastModified 2024-02-14
 * 
 * MCP server implementation for Brex API integration
 * 
 * IMPORTANT:
 * - Add tests for any new functionality
 * - Handle errors appropriately
 * 
 * Functionality:
 * - List Brex accounts as resources
 * - Read account details and transactions
 * - Fetch transactions via tools
 * - Summarize transactions via prompts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BrexClient } from "./services/brex/client.js";
import { logError, logInfo, logDebug } from "./utils/logger.js";
import { isBrexAccount, isBrexTransaction } from "./services/brex/types.js";

// Initialize Brex client
const brexClient = new BrexClient();

const server = new Server(
  {
    name: "brex-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {
        "brex://accounts": {
          description: "Brex accounts",
          mimeTypes: ["application/json"],
        }
      },
      tools: {},
      prompts: {},
    },
  }
);

// List available resources without making API calls
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logDebug("Listing available Brex resources");
  return {
    resources: [{
      uri: "brex://accounts",
      mimeType: "application/json",
      name: "Brex Accounts",
      description: "List of all Brex accounts"
    }]
  };
});

// Read resource contents with API calls
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const uri = request.params.uri;
    logDebug(`Reading resource: ${uri}`);
    
    if (uri === "brex://accounts") {
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
    }
    
    const match = uri.match(/^brex:\/\/accounts\/(.+)$/);
    if (!match) {
      logError(`Invalid URI format: ${uri}`);
      throw new Error(`Invalid URI format: ${uri}`);
    }
    
    const id = match[1];
    try {
      logDebug(`Fetching account ${id} from Brex API`);
      const account = await brexClient.getAccount(id);
      
      if (!isBrexAccount(account)) {
        logError(`Invalid account data received for account ID: ${id}`);
        throw new Error('Invalid account data received');
      }
      
      logDebug(`Successfully fetched account ${id}`);
      return {
        contents: [{
          uri: uri,
          mimeType: "application/json",
          text: JSON.stringify(account, null, 2)
        }]
      };
    } catch (error) {
      logError(`Failed to fetch account ${id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  } catch (error) {
    logError(`Error processing resource request: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_transactions",
        description: "Get transactions for a Brex account",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "ID of the Brex account"
            },
            limit: {
              type: "number",
              description: "Maximum number of transactions to return (default: 50)"
            }
          },
          required: ["accountId"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_transactions": {
        const accountId = String(request.params.arguments?.accountId);
        const limit = Number(request.params.arguments?.limit) || 50;

        const transactions = await brexClient.getTransactions(accountId, undefined, limit);
        
        if (!transactions.items.every(isBrexTransaction)) {
          throw new Error('Invalid transaction data received');
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(transactions, null, 2)
          }]
        };
      }

      default:
        throw new Error("Unknown tool");
    }
  } catch (error) {
    logError(error as Error);
    throw error;
  }
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "summarize_transactions",
        description: "Summarize transactions for a Brex account",
      }
    ]
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "summarize_transactions") {
    throw new Error("Unknown prompt");
  }

  try {
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
    logError(error as Error);
    throw error;
  }
});

// Start the server
async function main() {
  try {
    logInfo("Starting Brex MCP server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logInfo("Brex MCP server started successfully");
  } catch (error) {
    logError(error as Error);
    process.exit(1);
  }
}

main();
