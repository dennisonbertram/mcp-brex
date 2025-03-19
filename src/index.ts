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
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BrexClient } from "./services/brex/client.js";
import { logError, logInfo } from "./utils/logger.js";
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
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// List Brex accounts as resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const accounts = await brexClient.getAccounts();
    return {
      resources: accounts.items.map(account => ({
        uri: `brex://accounts/${account.id}`,
        mimeType: "application/json",
        name: account.name,
        description: `Brex ${account.type} Account: ${account.name} (${account.currency})`
      }))
    };
  } catch (error) {
    logError(error as Error);
    throw error;
  }
});

// Read account details or transactions
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const url = new URL(request.params.uri);
    const [resourceType, id] = url.pathname.replace(/^\//, '').split('/');

    if (resourceType === 'accounts') {
      const account = await brexClient.getAccount(id);
      if (!isBrexAccount(account)) {
        throw new Error('Invalid account data received');
      }

      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(account, null, 2)
        }]
      };
    }

    throw new Error(`Unknown resource type: ${resourceType}`);
  } catch (error) {
    logError(error as Error);
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
