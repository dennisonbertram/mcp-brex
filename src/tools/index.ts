/**
 * @file Tools Index
 * @version 1.0.0
 * @description Exports and registers all tools for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerGetTransactions } from "./getTransactions.js";
import { registerGetExpenses } from "./getExpenses.js";
import { registerGetAccountDetails } from "./getAccountDetails.js";
import { registerUploadReceipt } from "./uploadReceipt.js";
import { registerGetAllAccounts } from "./getAllAccounts.js";
import { registerGetAllExpenses } from "./getAllExpenses.js";
import { registerGetAllCardExpenses } from "./getAllCardExpenses.js";
import { logError } from "../utils/logger.js";
import { ExpenseType, ExpenseStatus, ExpensePaymentStatus } from "../services/brex/expenses-types.js";

// Store tool handlers
const toolHandlers = new Map<string, (request: any) => Promise<any>>();

/**
 * Registers all tools with the server
 * @param server The MCP server instance
 */
export function registerTools(server: Server): void {
  // Register tool handlers
  registerGetTransactions(server);
  registerGetExpenses(server);
  registerGetAccountDetails(server);
  registerUploadReceipt(server);
  
  // Register pagination-aware tool handlers
  registerGetAllAccounts(server);
  registerGetAllExpenses(server);
  registerGetAllCardExpenses(server);

  // Register the list tools handler
  registerListToolsHandler(server);
  
  // Register the call tool handler
  registerCallToolHandler(server);
}

/**
 * Registers the handler for listing available tools
 * @param server The MCP server instance
 */
function registerListToolsHandler(server: Server): void {
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
                description: "Status filter for expenses"
              },
              payment_status: {
                type: "string",
                enum: Object.values(ExpensePaymentStatus),
                description: "Payment status filter for expenses"
              },
              limit: {
                type: "number",
                description: "Maximum number of expenses to return (default: 50)"
              }
            }
          }
        },
        {
          name: "get_account_details",
          description: "Get detailed information about a Brex account",
          inputSchema: {
            type: "object",
            properties: {
              accountId: {
                type: "string",
                description: "ID of the Brex account"
              }
            },
            required: ["accountId"]
          }
        },
        {
          name: "upload_receipt",
          description: "Upload a receipt image to match with expenses",
          inputSchema: {
            type: "object",
            properties: {
              receipt_data: {
                type: "string",
                description: "Base64-encoded image data"
              },
              receipt_name: {
                type: "string",
                description: "Name of the receipt file (e.g., 'receipt.jpg')"
              },
              content_type: {
                type: "string",
                description: "MIME type of the receipt (e.g., 'image/jpeg')"
              }
            },
            required: ["receipt_data", "receipt_name", "content_type"]
          }
        },
        // Pagination-aware tools
        {
          name: "get_all_accounts",
          description: "Get all Brex accounts with pagination support",
          inputSchema: {
            type: "object",
            properties: {
              page_size: {
                type: "number",
                description: "Number of items per page (default: 50, max: 100)"
              },
              max_items: {
                type: "number",
                description: "Maximum total number of items to retrieve across all pages"
              },
              status: {
                type: "string",
                enum: ["ACTIVE", "INACTIVE", "CLOSED"],
                description: "Filter accounts by status"
              }
            }
          }
        },
        {
          name: "get_all_expenses",
          description: "Get all Brex expenses with pagination and filtering support",
          inputSchema: {
            type: "object",
            properties: {
              page_size: {
                type: "number",
                description: "Number of items per page (default: 50, max: 100)"
              },
              max_items: {
                type: "number",
                description: "Maximum total number of items to retrieve across all pages"
              },
              expense_type: {
                type: "array",
                items: {
                  type: "string",
                  enum: Object.values(ExpenseType)
                },
                description: "Filter expenses by type"
              },
              status: {
                type: "array",
                items: {
                  type: "string",
                  enum: Object.values(ExpenseStatus)
                },
                description: "Filter expenses by status"
              },
              payment_status: {
                type: "array",
                items: {
                  type: "string",
                  enum: Object.values(ExpensePaymentStatus)
                },
                description: "Filter expenses by payment status"
              },
              start_date: {
                type: "string",
                description: "Filter expenses created on or after this date (ISO format)"
              },
              end_date: {
                type: "string",
                description: "Filter expenses created on or before this date (ISO format)"
              }
            }
          }
        },
        {
          name: "get_all_card_expenses",
          description: "Get all Brex card expenses with pagination and filtering support",
          inputSchema: {
            type: "object",
            properties: {
              page_size: {
                type: "number",
                description: "Number of items per page (default: 50, max: 100)"
              },
              max_items: {
                type: "number",
                description: "Maximum total number of items to retrieve across all pages"
              },
              status: {
                type: "array",
                items: {
                  type: "string",
                  enum: Object.values(ExpenseStatus)
                },
                description: "Filter card expenses by status"
              },
              payment_status: {
                type: "array",
                items: {
                  type: "string",
                  enum: Object.values(ExpensePaymentStatus)
                },
                description: "Filter card expenses by payment status"
              },
              start_date: {
                type: "string",
                description: "Filter card expenses created on or after this date (ISO format)"
              },
              end_date: {
                type: "string",
                description: "Filter card expenses created on or before this date (ISO format)"
              },
              merchant_name: {
                type: "string",
                description: "Filter card expenses by merchant name (partial match)"
              }
            }
          }
        }
      ]
    };
  });
}

/**
 * Registers the handler for calling tools
 * @param server The MCP server instance
 */
function registerCallToolHandler(server: Server): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const handler = toolHandlers.get(request.params.name);
      if (!handler) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }
      return await handler(request);
    } catch (error) {
      logError(error as Error);
      throw error;
    }
  });
}

// Helper function to register a tool handler
export function registerToolHandler(name: string, handler: (request: any) => Promise<any>): void {
  toolHandlers.set(name, handler);
} 