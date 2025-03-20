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
import { logError } from "../utils/logger.js";
import { ExpenseType, ExpenseStatus, ExpensePaymentStatus } from "../services/brex/expenses-types.js";

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
      // Each tool will handle its own invocation
      switch (request.params.name) {
        // Tool handlers will be called from their respective modules
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      logError(error as Error);
      throw error;
    }
  });
} 