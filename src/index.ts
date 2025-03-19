#!/usr/bin/env node

/**
 * @file Brex MCP Server
 * @version 1.1.0
 * @status STABLE - DO NOT MODIFY WITHOUT TESTS
 * @lastModified 2024-03-19
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
 * - Fetch and manage expenses
 * - Upload and manage receipts
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
import {
  isExpense,
  ListExpensesParams,
  Expense,
  ExpenseType,
  ExpenseStatus,
  ExpensePaymentStatus
} from "./services/brex/expenses-types.js";

// Create custom ResourceTemplate class to handle URI templates
class ResourceTemplate {
  private template: string;
  private regex: RegExp;

  constructor(template: string) {
    this.template = template;
    // Convert {/param} syntax to regex capture groups
    const regexStr = template
      .replace(/\{\/([^}]+)\}/g, '(?:/([^/]+))?')
      .replace(/\//g, '\\/');
    this.regex = new RegExp(`^${regexStr}$`);
  }

  match(uri: string): boolean {
    return this.regex.test(uri);
  }

  parse(uri: string): { [key: string]: string } {
    const match = uri.match(this.regex);
    if (!match) {
      return {};
    }

    // Extract param names from the template
    const paramNames: string[] = [];
    const paramRegex = /\{\/([^}]+)\}/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(this.template)) !== null) {
      paramNames.push(paramMatch[1]);
    }

    // Create result object with param names mapped to captured values
    const result: { [key: string]: string } = {};
    for (let i = 0; i < paramNames.length; i++) {
      if (match[i + 1] !== undefined) {
        result[paramNames[i]] = match[i + 1];
      }
    }
    return result;
  }
}

// Initialize Brex client lazily - only create it when actually needed
let _brexClient: BrexClient | null = null;
function getBrexClient(): BrexClient {
  if (!_brexClient) {
    logInfo("Initializing Brex client for the first time");
    _brexClient = new BrexClient();
  }
  return _brexClient;
}

// Define resource templates
const accountsTemplate = new ResourceTemplate("brex://accounts{/id}");
const expensesTemplate = new ResourceTemplate("brex://expenses{/id}");
const cardExpensesTemplate = new ResourceTemplate("brex://expenses/card{/id}");

const server = new Server(
  {
    name: "brex-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {
        "brex://accounts{/id}": {
          description: "Brex accounts",
          mimeTypes: ["application/json"],
        },
        "brex://expenses{/id}": {
          description: "Brex expenses",
          mimeTypes: ["application/json"],
        },
        "brex://expenses/card{/id}": {
          description: "Brex card expenses",
          mimeTypes: ["application/json"],
        }
      },
      tools: {},
      prompts: {},
    },
  }
);

// List available resources without making API calls
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  try {
    logInfo("===== LIST RESOURCES START =====");
    logDebug("Request to list available Brex resources received");
    
    // Define our resources statically - no API calls
    // Use simple URIs (not templates) for listing
    const resources = [
      {
        uri: "brex://accounts",
        mimeType: "application/json",
        name: "Brex Accounts",
        description: "List of all Brex accounts"
      },
      {
        uri: "brex://expenses",
        mimeType: "application/json",
        name: "Brex Expenses",
        description: "List of all Brex expenses"
      },
      {
        uri: "brex://expenses/card",
        mimeType: "application/json",
        name: "Brex Card Expenses",
        description: "List of all Brex card expenses"
      }
    ];
    
    logDebug(`Responding with ${resources.length} available resources: ${resources.map(r => r.uri).join(', ')}`);
    logInfo("===== LIST RESOURCES END =====");
    
    // Return immediately without any async operations
    return { resources };
  } catch (error) {
    logError(`Error in ListResourcesRequestSchema handler: ${error instanceof Error ? error.message : String(error)}`);
    logError("Stack trace: " + (error instanceof Error ? error.stack : "Not available"));
    // Still need to return resources even if logging fails
    return {
      resources: [
        {
          uri: "brex://accounts",
          mimeType: "application/json",
          name: "Brex Accounts",
          description: "List of all Brex accounts"
        },
        {
          uri: "brex://expenses",
          mimeType: "application/json",
          name: "Brex Expenses",
          description: "List of all Brex expenses"
        },
        {
          uri: "brex://expenses/card",
          mimeType: "application/json",
          name: "Brex Card Expenses",
          description: "List of all Brex card expenses"
        }
      ]
    };
  }
});

// Read resource contents with API calls
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const uri = request.params.uri;
    logDebug(`Reading resource: ${uri}`);
    
    // Get Brex client only when needed
    const brexClient = getBrexClient();
    
    // Handle accounts resources
    if (accountsTemplate.match(uri)) {
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
    }
    
    // Handle expenses resources
    if (expensesTemplate.match(uri)) {
      const params = expensesTemplate.parse(uri);
      
      if (!params.id) {
        // List all expenses
        try {
          logDebug("Fetching all expenses from Brex API");
          const listParams: ListExpensesParams = {
            limit: 50
          };
          const expenses = await brexClient.getExpenses(listParams);
          logDebug(`Successfully fetched ${expenses.items.length} expenses`);
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify(expenses.items, null, 2)
            }]
          };
        } catch (error) {
          logError(`Failed to fetch expenses: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      } else {
        // Get specific expense
        try {
          logDebug(`Fetching expense ${params.id} from Brex API`);
          const expense = await brexClient.getExpense(params.id, { 
            expand: ['merchant', 'location', 'department', 'receipts.download_uris'],
            load_custom_fields: true
          });
          
          if (!isExpense(expense)) {
            logError(`Invalid expense data received for expense ID: ${params.id}`);
            throw new Error('Invalid expense data received');
          }
          
          logDebug(`Successfully fetched expense ${params.id}`);
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify(expense, null, 2)
            }]
          };
        } catch (error) {
          logError(`Failed to fetch expense ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      }
    }
    
    // Handle card expenses resources
    if (cardExpensesTemplate.match(uri)) {
      const params = cardExpensesTemplate.parse(uri);
      
      if (!params.id) {
        // List all card expenses
        try {
          logDebug("Fetching all card expenses from Brex API");
          const listParams: ListExpensesParams = {
            expense_type: [ExpenseType.CARD],
            limit: 50
          };
          const expenses = await brexClient.getCardExpenses(listParams);
          logDebug(`Successfully fetched ${expenses.items.length} card expenses`);
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify(expenses.items, null, 2)
            }]
          };
        } catch (error) {
          logError(`Failed to fetch card expenses: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      } else {
        // Get specific card expense
        try {
          logDebug(`Fetching card expense ${params.id} from Brex API`);
          const expense = await brexClient.getCardExpense(params.id, {
            expand: ['merchant', 'location', 'department', 'receipts.download_uris'],
            load_custom_fields: true
          });
          
          if (!isExpense(expense)) {
            logError(`Invalid card expense data received for expense ID: ${params.id}`);
            throw new Error('Invalid card expense data received');
          }
          
          logDebug(`Successfully fetched card expense ${params.id}`);
          return {
            contents: [{
              uri: uri,
              mimeType: "application/json",
              text: JSON.stringify(expense, null, 2)
            }]
          };
        } catch (error) {
          logError(`Failed to fetch card expense ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      }
    }
    
    logError(`Unsupported resource URI: ${uri}`);
    throw new Error(`Unsupported resource URI: ${uri}`);
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
      },
      {
        name: "get_expenses",
        description: "Get expenses from Brex",
        inputSchema: {
          type: "object",
          properties: {
            expense_type: {
              type: "string",
              enum: Object.values(ExpenseType),
              description: "Type of expenses to retrieve"
            },
            status: {
              type: "string",
              enum: Object.values(ExpenseStatus),
              description: "Filter by expense status"
            },
            limit: {
              type: "number",
              description: "Maximum number of expenses to return (default: 50)"
            }
          }
        }
      },
      {
        name: "upload_receipt",
        description: "Upload a receipt to match with expenses",
        inputSchema: {
          type: "object",
          properties: {
            receipt_name: {
              type: "string",
              description: "Name of the receipt file with extension"
            },
            receipt_data: {
              type: "string",
              description: "Base64 encoded receipt file data"
            },
            content_type: {
              type: "string",
              description: "MIME type of the receipt (e.g., 'application/pdf', 'image/jpeg')"
            }
          },
          required: ["receipt_name", "receipt_data", "content_type"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // Get Brex client only when needed
    const brexClient = getBrexClient();
    
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
      
      case "get_expenses": {
        const expense_type = request.params.arguments?.expense_type as ExpenseType | undefined;
        const status = request.params.arguments?.status as ExpenseStatus | undefined;
        const limit = Number(request.params.arguments?.limit) || 50;
        
        const listParams: ListExpensesParams = { limit };
        
        if (expense_type) {
          listParams.expense_type = [expense_type];
        }
        
        if (status) {
          listParams.status = [status];
        }
        
        const expenses = expense_type === ExpenseType.CARD 
          ? await brexClient.getCardExpenses(listParams)
          : await brexClient.getExpenses(listParams);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(expenses, null, 2)
          }]
        };
      }
      
      case "upload_receipt": {
        const receipt_name = String(request.params.arguments?.receipt_name);
        const receipt_data = String(request.params.arguments?.receipt_data);
        const content_type = String(request.params.arguments?.content_type);
        
        if (!receipt_name || !receipt_data || !content_type) {
          throw new Error('Missing required parameters for receipt upload');
        }
        
        // Create receipt match request
        const uploadResponse = await brexClient.createReceiptMatch({ receipt_name });
        
        // Upload the file
        const fileBuffer = Buffer.from(receipt_data, 'base64');
        await brexClient.uploadFileToS3(uploadResponse.uri, fileBuffer, content_type);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              receipt_id: uploadResponse.id,
              status: "uploaded",
              message: "Receipt uploaded successfully and will be matched with expenses"
            }, null, 2)
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
      },
      {
        name: "summarize_expenses",
        description: "Summarize expenses by category and status",
      }
    ]
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  // Get Brex client only when needed
  const brexClient = getBrexClient();
  
  if (request.params.name === "summarize_transactions") {
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
  } else if (request.params.name === "summarize_expenses") {
    try {
      const expenses = await brexClient.getExpenses({ limit: 50 });
      
      const embeddedResources = expenses.items.map((expense, index) => ({
        type: "resource" as const,
        resource: {
          uri: `brex://expenses/${expense.id}`,
          mimeType: "application/json",
          text: JSON.stringify(expense, null, 2)
        }
      }));

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "Please analyze the following Brex expenses:"
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
              text: "Provide a summary of expenses by category, status, and payment status. Calculate total expenses by category and status."
            }
          }
        ]
      };
    } catch (error) {
      logError(error as Error);
      throw error;
    }
  } else {
    throw new Error("Unknown prompt");
  }
});

// Start the server
async function main() {
  try {
    logInfo("===== SERVER STARTUP BEGIN =====");
    logInfo("Starting Brex MCP server...");
    
    // Create transport
    logDebug("Creating StdioServerTransport");
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    logDebug("Connecting server to transport");
    await server.connect(transport);
    
    logInfo("Brex MCP server started successfully");
    logInfo("===== SERVER STARTUP COMPLETE =====");
  } catch (error) {
    logError("===== SERVER STARTUP FAILED =====");
    logError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    logError("Stack trace: " + (error instanceof Error ? error.stack : "Not available"));
    process.exit(1);
  }
}

main();
