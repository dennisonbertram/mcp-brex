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
import { registerMatchReceipt } from "./matchReceipt.js";
import { registerUpdateExpense } from "./updateExpense.js";
import { registerGetAllAccounts } from "./getAllAccounts.js";
import { registerGetAllExpenses } from "./getAllExpenses.js";
import { registerGetAllCardExpenses } from "./getAllCardExpenses.js";
import { registerGetCardTransactions } from "./getCardTransactions.js";
import { registerGetCashAccountStatements } from "./getCashAccountStatements.js";
import { registerGetExpenseById } from "./getExpenseById.js";
import { registerGetCardExpenseById } from "./getCardExpenseById.js";
import { registerGetCardStatementsPrimary } from "./getCardStatementsPrimary.js";
import { registerGetCashTransactions } from "./getCashTransactions.js";
import { registerGetBudgets } from "./getBudgets.js";
import { registerGetBudgetById } from "./getBudgetById.js";
import { registerGetSpendLimits } from "./getSpendLimits.js";
import { registerGetSpendLimitById } from "./getSpendLimitById.js";
import { registerGetBudgetPrograms } from "./getBudgetPrograms.js";
import { registerGetBudgetProgramById } from "./getBudgetProgramById.js";
import { logError } from "../utils/logger.js";
import { ExpenseType, ExpenseStatus, ExpensePaymentStatus } from "../services/brex/expenses-types.js";

// Minimal request shape passed to individual tool handlers
export type ToolCallRequest = { params: { name?: string; arguments?: Record<string, unknown> } };

// Store tool handlers
const toolHandlers = new Map<string, (request: ToolCallRequest) => Promise<unknown>>();

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
  registerMatchReceipt(server);
  registerUpdateExpense(server);
  
  // Register pagination-aware tool handlers
  registerGetAllAccounts(server);
  registerGetAllExpenses(server);
  registerGetAllCardExpenses(server);
  registerGetCardTransactions(server);
  registerGetCashAccountStatements(server);
  registerGetExpenseById(server);
  registerGetCardExpenseById(server);
  registerGetCardStatementsPrimary(server);
  registerGetCashTransactions(server);
  // Read-only budget domain
  registerGetBudgets(server);
  registerGetBudgetById(server);
  registerGetSpendLimits(server);
  registerGetSpendLimitById(server);
  registerGetBudgetPrograms(server);
  registerGetBudgetProgramById(server);

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
          name: "get_budgets",
          description: "List budgets (read-only). Example: {\"limit\":10,\"summary_only\":true}",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              cursor: { type: "string" },
              parent_budget_id: { type: "string" },
              spend_budget_status: { type: "string", enum: ["ACTIVE","ARCHIVED","DRAFT"] },
              summary_only: { type: "boolean" },
              fields: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "get_budget",
          description: "Get a budget by ID (read-only). Returns the complete budget object. Example: {\"budget_id\":\"budget_123\"}",
          inputSchema: {
            type: "object",
            properties: {
              budget_id: { type: "string", description: "The ID of the budget to retrieve" }
            },
            required: ["budget_id"]
          }
        },
        {
          name: "get_spend_limits",
          description: "List spend limits (read-only). Example: {\"limit\":10,\"status\":\"ACTIVE\",\"summary_only\":true}",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              cursor: { type: "string" },
              parent_budget_id: { type: "string" },
              status: { type: "string", enum: ["ACTIVE","ARCHIVED"] },
              member_user_id: { type: "string" },
              summary_only: { type: "boolean" },
              fields: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "get_spend_limit",
          description: "Get a spend limit by ID (read-only). Example: {\"id\":\"sl_123\"}",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" }
            },
            required: ["id"]
          }
        },
        {
          name: "get_budget_programs",
          description: "List budget programs (read-only). Example: {\"limit\":10,\"budget_program_status\":\"ACTIVE\",\"summary_only\":true}",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              cursor: { type: "string" },
              budget_program_status: { type: "string", enum: ["ACTIVE","INACTIVE"] },
              summary_only: { type: "boolean" },
              fields: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "get_budget_program",
          description: "Get a budget program by ID (read-only). Example: {\"id\":\"bp_123\"}",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string" }
            },
            required: ["id"]
          }
        },
        {
          name: "get_expense",
          description: "Get a single expense by ID. Example: {\"expense_id\":\"expense_123\",\"summary_only\":true,\"fields\":[\"id\",\"status\",\"merchant.raw_descriptor\"]}. Notes: Always include summary_only:true and a small fields list to minimize payload.",
          inputSchema: {
            type: "object",
            properties: {
              expense_id: { type: "string", description: "Expense ID" },
              expand: { type: "array", items: { type: "string" } },
              summary_only: { type: "boolean" },
              fields: { type: "array", items: { type: "string" } }
            },
            required: ["expense_id"]
          }
        },
        {
          name: "get_card_expense",
          description: "Get a single card expense by ID. Example: {\"expense_id\":\"expense_123\",\"summary_only\":true,\"fields\":[\"id\",\"status\",\"merchant.raw_descriptor\"]}. Notes: Always include summary_only:true and fields.",
          inputSchema: {
            type: "object",
            properties: {
              expense_id: { type: "string", description: "Card expense ID" },
              expand: { type: "array", items: { type: "string" } },
              summary_only: { type: "boolean" },
              fields: { type: "array", items: { type: "string" } }
            },
            required: ["expense_id"]
          }
        },
        {
          name: "get_card_statements_primary",
          description: "Get statements for the primary card account. Example: {\"limit\":5,\"summary_only\":true,\"fields\":[\"id\",\"period_start\",\"total_amount.amount\"]}",
          inputSchema: {
            type: "object",
            properties: {
              cursor: { type: "string" },
              limit: { type: "number" },
              summary_only: { type: "boolean" },
              fields: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "get_cash_transactions",
          description: "LIST: Cash transactions (requires cash scopes). Example: {\"account_id\":\"cash_acc_123\",\"limit\":10}. Returns complete transaction objects.",
          inputSchema: {
            type: "object",
            properties: {
              account_id: { type: "string", description: "Cash account ID" },
              cursor: { type: "string", description: "Pagination cursor" },
              limit: { type: "number", description: "Items per page (1-100)" },
              posted_at_start: { type: "string", description: "ISO timestamp to start from" },
              expand: { type: "array", items: { type: "string" }, description: "Fields to expand" }
            },
            required: ["account_id"]
          }
        },
        {
          name: "get_card_transactions",
          description: "LIST: Primary card transactions. Example: {\"limit\":10,\"posted_at_start\":\"2025-08-01T00:00:00Z\",\"summary_only\":true}. Notes: Always set limit<=50, include posted_at_start for recent window, and use fields to keep payload small.",
          inputSchema: {
            type: "object",
            properties: {
              cursor: { type: "string", description: "Pagination cursor" },
              limit: { type: "number", description: "Items per page (default 50)" },
              user_ids: { type: "array", items: { type: "string" }, description: "Optional filter by user IDs" },
              posted_at_start: { type: "string", description: "ISO timestamp to start from" },
              expand: { type: "array", items: { type: "string" }, description: "Fields to expand" },
              summary_only: { type: "boolean", description: "Return summary fields only" },
              fields: { type: "array", items: { type: "string" }, description: "Projection fields (dot-notation)" }
            }
          }
        },
        {
          name: "get_cash_account_statements",
          description: "Get cash account statements by account ID. Example: {\"account_id\":\"cash_acc_123\",\"limit\":5,\"summary_only\":true}",
          inputSchema: {
            type: "object",
            properties: {
              account_id: { type: "string", description: "Cash account ID" },
              cursor: { type: "string", description: "Pagination cursor" },
              limit: { type: "number", description: "Items per page (default 50)" },
              summary_only: { type: "boolean", description: "Return summary fields only" },
              fields: { type: "array", items: { type: "string" }, description: "Projection fields (dot-notation)" }
            },
            required: ["account_id"]
          }
        },
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
          description: "LIST (single page): Expenses with optional filters. Example: {\"limit\":5,\"status\":\"APPROVED\",\"summary_only\":true}. Notes: Prefer small limit (<=10) and always include summary_only/fields. For larger sets, use get_all_expenses with date windows.",
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
              },
              summary_only: {
                type: "boolean",
                description: "Return summary fields only to reduce payload size"
              },
              fields: {
                type: "array",
                items: { type: "string" },
                description: "Optional list of fields to include (dot-notation)"
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
        {
          name: "match_receipt",
          description: "Create a pre-signed URL for uploading a receipt that will be automatically matched with existing expenses",
          inputSchema: {
            type: "object",
            properties: {
              receipt_name: {
                type: "string",
                description: "Name of the receipt file (e.g., 'receipt.jpg')"
              },
              receipt_type: {
                type: "string",
                description: "Type of the receipt (optional)"
              },
              notify_email: {
                type: "string",
                description: "Email address to notify after matching (optional)"
              }
            },
            required: ["receipt_name"]
          }
        },
        {
          name: "update_expense",
          description: "Update an existing card expense",
          inputSchema: {
            type: "object",
            properties: {
              expense_id: {
                type: "string",
                description: "ID of the expense to update"
              },
              memo: {
                type: "string",
                description: "Memo text to attach to the expense (optional)"
              },
              category: {
                type: "string",
                description: "Category of the expense (optional)"
              },
              budget_id: {
                type: "string",
                description: "ID of the budget to associate with the expense (optional)"
              },
              department_id: {
                type: "string",
                description: "ID of the department to associate with the expense (optional)"
              },
              location_id: {
                type: "string",
                description: "ID of the location to associate with the expense (optional)"
              },
              custom_fields: {
                type: "array",
                description: "Custom fields to update (optional)",
                items: {
                  type: "object",
                  properties: {
                    key: {
                      type: "string",
                      description: "Key of the custom field"
                    },
                    value: {
                      type: "object",
                      description: "Value of the custom field"
                    }
                  }
                }
              }
            },
            required: ["expense_id"]
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
          description: "LIST: Paginated expenses with filters. Example: {\"page_size\":5,\"max_items\":5,\"status\":[\"APPROVED\"],\"summary_only\":true,\"window_days\":7,\"min_amount\":100}",
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
              },
              window_days: {
                type: "number",
                description: "Optional batching window in days to split large date ranges"
              },
              min_amount: {
                type: "number",
                description: "Client-side minimum purchased_amount.amount filter"
              },
              max_amount: {
                type: "number",
                description: "Client-side maximum purchased_amount.amount filter"
              },
              summary_only: {
                type: "boolean",
                description: "Return summary fields only to reduce payload size"
              },
              fields: {
                type: "array",
                items: { type: "string" },
                description: "Optional list of fields to include (dot-notation)"
              }
            }
          }
        },
        {
          name: "get_all_card_expenses",
          description: "LIST: Paginated card expenses (no expense_type needed). Example: {\"page_size\":5,\"max_items\":5,\"summary_only\":true,\"window_days\":7,\"min_amount\":100}",
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
              },
              window_days: {
                type: "number",
                description: "Optional batching window in days to split large date ranges"
              },
              min_amount: {
                type: "number",
                description: "Client-side minimum purchased_amount.amount filter"
              },
              max_amount: {
                type: "number",
                description: "Client-side maximum purchased_amount.amount filter"
              },
              summary_only: {
                type: "boolean",
                description: "Return summary fields only to reduce payload size"
              },
              fields: {
                type: "array",
                items: { type: "string" },
                description: "Optional list of fields to include (dot-notation)"
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
      const result = await handler(request as unknown as ToolCallRequest);
      return result as any;
    } catch (error) {
      logError(error as Error);
      throw error;
    }
  });
}

// Helper function to register a tool handler
export function registerToolHandler(name: string, handler: (request: ToolCallRequest) => Promise<unknown>): void {
  toolHandlers.set(name, handler);
} 