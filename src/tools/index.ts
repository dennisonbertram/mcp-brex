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
export const toolHandlers = new Map<string, (request: ToolCallRequest) => Promise<unknown>>();

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
 * Tool schemas with parameter definitions for all tools
 */
const toolSchemas: Record<string, { description: string; inputSchema: any }> = {
  get_expenses: {
    description: "Retrieve a paginated list of expenses with optional filters for status, type, and amount. Supports expansion of related objects like merchant and budget details. Returns expenses with automatic money annotation (cents, dollars, formatted).",
    inputSchema: {
      type: "object",
      properties: {
        expense_type: {
          type: "string",
          enum: Object.values(ExpenseType),
          description: "Type of expenses to retrieve (CARD, CASH, BILLPAY, REIMBURSEMENT, CLAWBACK, UNSET)"
        },
        status: {
          type: "string",
          enum: Object.values(ExpenseStatus),
          description: "Filter by expense approval status (DRAFT, SUBMITTED, APPROVED, OUT_OF_POLICY, VOID, CANCELED, SPLIT, SETTLED)"
        },
        payment_status: {
          type: "string",
          enum: Object.values(ExpensePaymentStatus),
          description: "Filter by payment processing status (NOT_STARTED, PROCESSING, CANCELED, DECLINED, CLEARED, REFUNDING, REFUNDED, CASH_ADVANCE, CREDITED, AWAITING_PAYMENT, SCHEDULED)"
        },
        limit: {
          type: "number",
          description: "Maximum number of expenses to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        },
        expand: {
          type: "array",
          items: {
            type: "string",
            enum: ["merchant", "budget", "user", "department", "location", "receipts"]
          },
          description: "Related objects to include in response. Default: [] for minimal size"
        }
      },
      additionalProperties: true
    }
  },
  get_all_expenses: {
    description: "Fetch all expenses across multiple pages with automatic pagination handling. Supports date range filtering, amount filtering, status filtering, and merchant search. Returns aggregated results with summary statistics. Use window_days to batch large date ranges.",
    inputSchema: {
      type: "object",
      properties: {
        page_size: {
          type: "number",
          description: "Number of items per page (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
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
          description: "Filter expenses created on or after this date (ISO format: YYYY-MM-DD)"
        },
        end_date: {
          type: "string",
          description: "Filter expenses created on or before this date (ISO format: YYYY-MM-DD)"
        },
        window_days: {
          type: "number",
          description: "Optional batching window in days to split large date ranges"
        },
        min_amount: {
          type: "number",
          description: "Client-side minimum purchased_amount.amount filter (in cents)"
        },
        max_amount: {
          type: "number",
          description: "Client-side maximum purchased_amount.amount filter (in cents)"
        },
        expand: {
          type: "array",
          items: {
            type: "string",
            enum: ["merchant", "budget", "user", "department", "location", "receipts"]
          },
          description: "Fields to expand (e.g., merchant, receipts)"
        }
      },
      additionalProperties: true
    }
  },
  get_all_card_expenses: {
    description: "Fetch all card expenses across multiple pages (similar to get_all_expenses but card-specific endpoint). Supports pagination, date filtering, merchant search, and amount filters. Returns complete expense objects with money annotation and summaries.",
    inputSchema: {
      type: "object",
      properties: {
        page_size: {
          type: "number",
          description: "Number of items per page (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
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
          description: "Filter card expenses created on or after this date (ISO format: YYYY-MM-DD)"
        },
        end_date: {
          type: "string",
          description: "Filter card expenses created on or before this date (ISO format: YYYY-MM-DD)"
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
          description: "Client-side minimum purchased_amount.amount filter (in cents)"
        },
        max_amount: {
          type: "number",
          description: "Client-side maximum purchased_amount.amount filter (in cents)"
        },
        expand: {
          type: "array",
          items: {
            type: "string",
            enum: ["merchant", "budget", "user", "department", "location", "receipts"]
          },
          description: "Fields to expand (e.g., merchant, receipts)"
        }
      },
      additionalProperties: true
    }
  },
  get_expense: {
    description: "Retrieve a single expense by its unique ID. Supports expansion of nested objects (merchant, budget, user, department, location, receipts). Returns complete expense details with money annotation.",
    inputSchema: {
      type: "object",
      properties: {
        expense_id: {
          type: "string",
          description: "Unique expense identifier"
        },
        expand: {
          type: "array",
          items: {
            type: "string",
            enum: ["merchant", "budget", "user", "department", "location", "receipts"]
          },
          description: "Related objects to include in response"
        }
      },
      required: ["expense_id"],
      additionalProperties: true
    }
  },
  get_card_expense: {
    description: "Retrieve a single card expense by its unique ID. Supports expansion of nested objects. Returns complete card expense details with money annotation. (Deprecated - use get_expense instead)",
    inputSchema: {
      type: "object",
      properties: {
        expense_id: {
          type: "string",
          description: "Unique card expense identifier"
        },
        expand: {
          type: "array",
          items: {
            type: "string",
            enum: ["merchant", "budget", "user", "department", "location", "receipts"]
          },
          description: "Related objects to include in response"
        }
      },
      required: ["expense_id"],
      additionalProperties: true
    }
  },
  get_budgets: {
    description: "List budget allocations with spending limits and current status. Supports filtering by parent budget and status. Returns paginated budget list with amount details (amount, period, recurrence, limit type).",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of budgets to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        },
        parent_budget_id: {
          type: "string",
          description: "Filter by parent budget ID"
        },
        spend_budget_status: {
          type: "string",
          enum: ["ACTIVE", "ARCHIVED", "DRAFT"],
          description: "Filter by budget status"
        }
      },
      additionalProperties: true
    }
  },
  get_budget: {
    description: "Retrieve a single budget by its unique ID. Returns complete budget details including spending limits, period configuration, and current status.",
    inputSchema: {
      type: "object",
      properties: {
        budget_id: {
          type: "string",
          description: "Unique budget identifier"
        }
      },
      required: ["budget_id"],
      additionalProperties: true
    }
  },
  get_spend_limits: {
    description: "List spend limit policies with authorization settings and spending controls. Supports filtering by member user and pagination. Returns detailed limit configurations including base limits, buffer percentages, and merchant category controls.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of spend limits to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        },
        member_user_id: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Filter by member user IDs"
        },
        parent_budget_id: {
          type: "string",
          description: "Filter by parent budget ID"
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "ARCHIVED"],
          description: "Filter by spend limit status"
        }
      },
      additionalProperties: true
    }
  },
  get_spend_limit: {
    description: "Retrieve a single spend limit by its unique ID. Returns complete spend limit configuration including authorization settings, period recurrence, merchant controls, and current balance.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Unique spend limit identifier"
        }
      },
      required: ["id"],
      additionalProperties: true
    }
  },
  get_budget_programs: {
    description: "List budget program configurations that define automated budget assignment rules. Supports filtering by status and pagination. Returns program details including budget blueprints and employee filters.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of budget programs to return (default: 50)",
          minimum: 1
        },
        budget_program_status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE"],
          description: "Filter by budget program status"
        }
      },
      additionalProperties: true
    }
  },
  get_budget_program: {
    description: "Retrieve a single budget program by its unique ID. Returns complete program configuration including budget blueprints, employee filters, and automation settings.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Unique budget program identifier"
        }
      },
      required: ["id"],
      additionalProperties: true
    }
  },
  get_card_transactions: {
    description: "List settled transactions for all card accounts (primary card endpoint). Supports pagination and user filtering. NOTE: Does not support posted_at_start or expand parameters - filter client-side by posted_at_date if needed. Returns transactions with money annotation.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        },
        user_ids: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Optional filter by user IDs"
        }
      },
      additionalProperties: true
    }
  },
  get_cash_transactions: {
    description: "List settled transactions for a specific cash account. Requires cash account scopes. Supports pagination. NOTE: Does not support posted_at_start or expand parameters - filter client-side by posted_at_date if needed. Returns transactions with money annotation.",
    inputSchema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "Cash account identifier"
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        }
      },
      required: ["account_id"],
      additionalProperties: true
    }
  },
  get_transactions: {
    description: "Retrieve transactions for a specific Brex account by account ID. Legacy endpoint for general transaction retrieval. Returns transaction list with money annotation.",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID of the Brex account"
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 50)",
          minimum: 1
        }
      },
      required: ["accountId"],
      additionalProperties: true
    }
  },
  get_all_accounts: {
    description: "Fetch all Brex accounts (card and cash) with automatic pagination. Supports status filtering. Returns account details including balances, type, currency, and status. Includes money annotation on balance fields.",
    inputSchema: {
      type: "object",
      properties: {
        page_size: {
          type: "number",
          description: "Number of items per page (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
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
      },
      additionalProperties: true
    }
  },
  get_account_details: {
    description: "Retrieve detailed information for a specific Brex account by account ID. Returns complete account details including current balance, available balance, type, currency, and status.",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description: "ID of the Brex account"
        }
      },
      required: ["accountId"],
      additionalProperties: true
    }
  },
  get_card_statements_primary: {
    description: "List all finalized statements for the primary card account. Supports cursor-based pagination. Returns complete statement objects with period dates, balances, and payment information.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of statements to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        }
      },
      additionalProperties: true
    }
  },
  get_cash_account_statements: {
    description: "List finalized statements for a specific cash account by account ID. Requires cash account scopes. Supports cursor-based pagination. Returns complete statement objects with period details and transaction summaries.",
    inputSchema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "Cash account identifier"
        },
        cursor: {
          type: "string",
          description: "Pagination cursor from previous response"
        },
        limit: {
          type: "number",
          description: "Maximum number of statements to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        }
      },
      required: ["account_id"],
      additionalProperties: true
    }
  },
  upload_receipt: {
    description: "Upload a receipt image (base64-encoded) to a specific card expense. Creates a pre-signed S3 URL, uploads the receipt, and associates it with the expense. Returns upload confirmation. NOTE: This is a write operation.",
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
          description: "MIME type of the receipt (e.g., 'image/jpeg', 'image/png', 'application/pdf')"
        }
      },
      required: ["receipt_data", "receipt_name", "content_type"],
      additionalProperties: true
    }
  },
  match_receipt: {
    description: "Create a pre-signed S3 URL for uploading a receipt that will be automatically matched with existing expenses. Returns upload URL and receipt matching details. Receipt matching expires after 30 minutes. NOTE: This is a write operation.",
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
      required: ["receipt_name"],
      additionalProperties: true
    }
  },
  update_expense: {
    description: "Update metadata for an existing card expense (memo, category, budget, department, location, custom fields). Returns updated expense object. NOTE: This is a write operation - use cautiously.",
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
      required: ["expense_id"],
      additionalProperties: true
    }
  }
};

/**
 * Registers the handler for listing available tools
 * @param server The MCP server instance
 */
function registerListToolsHandler(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Use specific schemas for each tool to enable proper discoverability
    const names = Array.from(toolHandlers.keys());
    return {
      tools: names.map((n) => {
        const schema = toolSchemas[n];
        if (schema) {
          return {
            name: n,
            description: schema.description,
            inputSchema: schema.inputSchema,
          };
        }
        // Fallback for any tool without a schema (shouldn't happen)
        return {
          name: n,
          description: `Tool: ${n}`,
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: true,
          },
        };
      }),
    } as any;
    /* return {
      tools: [
        {
          name: "get_budgets",
          description: "List budgets (read-only). Example: {\"limit\":10}",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              cursor: { type: "string" },
              parent_budget_id: { type: "string" },
              spend_budget_status: { type: "string", enum: ["ACTIVE","ARCHIVED","DRAFT"] }
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
          description: "List spend limits (read-only). Example: {\"limit\":10,\"status\":\"ACTIVE\"}",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              cursor: { type: "string" },
              parent_budget_id: { type: "string" },
              status: { type: "string", enum: ["ACTIVE","ARCHIVED"] },
              member_user_id: { type: "string" }
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
          description: "List budget programs (read-only). Returns complete budget program objects. Example: {\"limit\":10,\"budget_program_status\":\"ACTIVE\"}",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number" },
              cursor: { type: "string" },
              budget_program_status: { type: "string", enum: ["ACTIVE","INACTIVE"] }
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
          description: "Get a single expense by ID. Returns the complete expense object. Example: {\"expense_id\":\"expense_123\",\"expand\":[\"merchant\"]}",
          inputSchema: {
            type: "object",
            properties: {
              expense_id: { type: "string", description: "Expense ID" },
              expand: { type: "array", items: { type: "string" } }
            },
            required: ["expense_id"]
          }
        },
        {
          name: "get_card_expense",
          description: "Get a single card expense by ID. Returns the complete card expense object. Example: {\"expense_id\":\"expense_123\",\"expand\":[\"merchant\"]}",
          inputSchema: {
            type: "object",
            properties: {
              expense_id: { type: "string", description: "Card expense ID" },
              expand: { type: "array", items: { type: "string" } }
            },
            required: ["expense_id"]
          }
        },
        {
          name: "get_card_statements_primary",
          description: "Get complete statements for the primary card account. Returns full statement objects. Example: {\"limit\":10}",
          inputSchema: {
            type: "object",
            properties: {
              cursor: { type: "string" },
              limit: { type: "number" }
            }
          }
        },
        {
          name: "get_cash_transactions",
          description: "LIST: Cash transactions (requires cash scopes). Example: {\"account_id\":\"cash_acc_123\",\"limit\":10}. Returns complete transaction objects. Note: posted_at_start and expand are not supported by the API.",
          inputSchema: {
            type: "object",
            properties: {
              account_id: { type: "string", description: "Cash account ID" },
              cursor: { type: "string", description: "Pagination cursor" },
              limit: { type: "number", description: "Items per page (1-100)" }
            },
            required: ["account_id"]
          }
        },
        {
          name: "get_card_transactions",
          description: "LIST: Primary card transactions. Returns complete transaction objects. Note: posted_at_start and expand are not supported by the API.",
          inputSchema: {
            type: "object",
            properties: {
              cursor: { type: "string", description: "Pagination cursor" },
              limit: { type: "number", description: "Items per page (default 50)" },
              user_ids: { type: "array", items: { type: "string" }, description: "Optional filter by user IDs" }
            }
          }
        },
        {
          name: "get_cash_account_statements",
          description: "Get cash account statements by account ID. Returns complete statement objects. Example: {\"account_id\":\"cash_acc_123\",\"limit\":5}",
          inputSchema: {
            type: "object",
            properties: {
              account_id: { type: "string", description: "Cash account ID" },
              cursor: { type: "string", description: "Pagination cursor" },
              limit: { type: "number", description: "Items per page (default 50, max 100)" }
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
          description: "LIST (single page): Expenses with optional filters. Returns complete expense objects with cents+dollars+formatted fields and summary by default.",
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
              expand: {
                type: "array",
                items: { type: "string" },
                description: "Fields to expand (e.g., merchant, receipts)"
              },
              
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
          description: "LIST: Paginated expenses with filters. Returns complete expense objects with cents+dollars+formatted fields and summary by default.",
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
              expand: {
                type: "array",
                items: { type: "string" },
                description: "Fields to expand (e.g., merchant, receipts)"
              },
              
              }
            }
          }
        },
        {
          name: "get_all_card_expenses",
          description: "LIST: Paginated card expenses (no expense_type needed). Returns complete card expense objects with cents+dollars+formatted fields and summary by default.",
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
              expand: {
                type: "array",
                items: { type: "string" },
                description: "Fields to expand (e.g., merchant, receipts)"
              },
              
              }
            }
          }
        }
      ]
    }; */
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
