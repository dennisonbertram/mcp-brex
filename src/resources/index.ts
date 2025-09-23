/**
 * @file Resources Index
 * @version 1.0.0
 * @description Exports all resource handlers for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerAccountsCapabilities, canHandleAccountsUri, readAccountsUri } from "./accounts.js";
import { registerExpensesResource } from "./expenses.js";
import { registerCardExpensesResource } from "./cardExpenses.js";
import { registerBudgetsResource } from "./budgets.js";
import { registerSpendLimitsResource } from "./spendLimits.js";
import { registerBudgetProgramsResource } from "./budgetPrograms.js";
import { registerCardAccountsResource, canHandleCardAccountsUri, readCardAccountsUri } from "./cardAccounts.js";
import { registerCashAccountsResource } from "./cashAccounts.js";
import { registerTransactionsResource } from "./transactions.js";
import { registerResourcesRouter, canHandleExpensesUri, readExpensesUri, canHandleCardExpensesUri, readCardExpensesUri } from "./router.js";
import { registerUsageResource, canHandleUsageUri, readUsageUri } from "./usage.js";
import { logInfo, logDebug, logError } from "../utils/logger.js";

/**
 * Registers all resource handlers with the server
 * @param server The MCP server instance
 */
export function registerResources(server: Server): void {
  // Enable chained ReadResource handler so multiple modules can coexist
  enableChainedReadResource(server);

  // Central dispatcher (incremental): ordered routes, most specific first
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (canHandleUsageUri(uri)) return await readUsageUri();
    if (canHandleCardExpensesUri(uri)) return await readCardExpensesUri(uri);
    if (canHandleExpensesUri(uri)) return await readExpensesUri(uri);
    if (canHandleCardAccountsUri(uri)) return await readCardAccountsUri(uri);
    if (canHandleAccountsUri(uri)) return await readAccountsUri(uri);
    return { handled: false } as any;
  });
  // Register resource handlers
  // Capabilities for accounts resources
  registerAccountsCapabilities(server);
  registerExpensesResource(server);
  registerCardExpensesResource(server);
  registerBudgetsResource(server);
  registerSpendLimitsResource(server);
  registerBudgetProgramsResource(server);
  registerCardAccountsResource(server);
  registerCashAccountsResource(server);
  registerTransactionsResource(server);
  // Router last to ensure we return proper 'contents' arrays for expenses URIs
  registerResourcesRouter(server);
  registerUsageResource(server);

  // Register the list resources handler
  registerListResourcesHandler(server);
}

/**
 * Registers the handler for listing available resources
 * @param server The MCP server instance
 */
function registerListResourcesHandler(server: Server): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
          uri: "brex://accounts/card",
          mimeType: "application/json",
          name: "Brex Card Accounts",
          description: "List of all Brex card accounts"
        },
        {
          uri: "brex://accounts/cash",
          mimeType: "application/json",
          name: "Brex Cash Accounts",
          description: "List of all Brex cash accounts"
        },
        {
          uri: "brex://accounts/cash/primary",
          mimeType: "application/json",
          name: "Brex Primary Cash Account",
          description: "Brex primary cash account details"
        },
        {
          uri: "brex://transactions/card/primary",
          mimeType: "application/json",
          name: "Brex Card Transactions",
          description: "List of all Brex card transactions"
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
        },
        {
          uri: "brex://budgets",
          mimeType: "application/json",
          name: "Brex Budgets",
          description: "List of all Brex budgets"
        },
        {
          uri: "brex://spend_limits",
          mimeType: "application/json",
          name: "Brex Spend Limits",
          description: "List of all Brex spend limits"
        },
        {
          uri: "brex://budget_programs",
          mimeType: "application/json",
          name: "Brex Budget Programs",
          description: "List of all Brex budget programs"
        },
        {
          uri: "brex://docs/usage",
          mimeType: "application/json",
          name: "Brex MCP Usage Guide",
          description: "Guidelines and examples for using the tools safely and efficiently"
        }
      ];
      
      logDebug(`Responding with ${resources.length} available resources: ${resources.map(r => r.uri).join(', ')}`);
      logInfo("===== LIST RESOURCES END =====");
      
      // Also advertise resource templates so clients can construct parameterized URIs
      const resourceTemplates = [
        {
          uriTemplate: "brex://accounts/{id}",
          name: "brex-account",
          title: "Brex Account by ID",
          description: "Fetch a specific Brex account by ID",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://accounts/card/{id}",
          name: "brex-card-account",
          title: "Brex Card Account by ID",
          description: "Fetch a specific Brex card account by ID (if supported)",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://accounts/cash/{id}",
          name: "brex-cash-account",
          title: "Brex Cash Account by ID",
          description: "Fetch a specific Brex cash account by ID",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://transactions/cash/{id}",
          name: "brex-cash-transactions",
          title: "Cash Account Transactions",
          description: "List transactions for a specific cash account",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://expenses/{id}",
          name: "brex-expense",
          title: "Expense by ID",
          description: "Fetch a specific expense by ID",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://expenses/card/{id}",
          name: "brex-card-expense",
          title: "Card Expense by ID",
          description: "Fetch a specific card expense by ID",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://budgets/{id}",
          name: "brex-budget",
          title: "Budget by ID",
          description: "Fetch a specific budget by ID",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://spend_limits/{id}",
          name: "brex-spend-limit",
          title: "Spend Limit by ID",
          description: "Fetch a specific spend limit by ID",
          mimeType: "application/json"
        },
        {
          uriTemplate: "brex://budget_programs/{id}",
          name: "brex-budget-program",
          title: "Budget Program by ID",
          description: "Fetch a specific budget program by ID",
          mimeType: "application/json"
        }
      ];

      // Return immediately without any async operations
      return { resources, resourceTemplates } as any;
    } catch (error) {
      logError(`Error in ListResourcesRequestSchema handler: ${error instanceof Error ? error.message : String(error)}`);
      logError("Stack trace: " + (error instanceof Error ? error.stack : "Not available"));
      // Still need to return resources even if logging fails
      const resourcesFallback = [
          {
            uri: "brex://accounts",
            mimeType: "application/json",
            name: "Brex Accounts",
            description: "List of all Brex accounts"
          },
          {
            uri: "brex://accounts/card",
            mimeType: "application/json",
            name: "Brex Card Accounts",
            description: "List of all Brex card accounts"
          },
          {
            uri: "brex://accounts/cash",
            mimeType: "application/json",
            name: "Brex Cash Accounts",
            description: "List of all Brex cash accounts"
          },
          {
            uri: "brex://accounts/cash/primary",
            mimeType: "application/json",
            name: "Brex Primary Cash Account",
            description: "Brex primary cash account details"
          },
          {
            uri: "brex://transactions/card/primary",
            mimeType: "application/json",
            name: "Brex Card Transactions",
            description: "List of all Brex card transactions"
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
          },
          {
            uri: "brex://budgets",
            mimeType: "application/json",
            name: "Brex Budgets",
            description: "List of all Brex budgets"
          },
          {
            uri: "brex://spend_limits",
            mimeType: "application/json",
            name: "Brex Spend Limits",
            description: "List of all Brex spend limits"
          },
          {
            uri: "brex://budget_programs",
            mimeType: "application/json",
            name: "Brex Budget Programs",
            description: "List of all Brex budget programs"
          }
        ];

      return {
        resources: resourcesFallback
      };
    }
  });
}

/**
 * Wraps server.setRequestHandler to collect multiple ReadResource handlers
 * and install a single dispatcher that tries each until one returns a proper
 * MCP response (contents or error). Handlers may return { handled: false } to skip.
 */
function enableChainedReadResource(server: Server): void {
  const originalSetHandler = server.setRequestHandler.bind(server);
  const readHandlers: Array<(request: any, extra?: any) => Promise<any>> = [];
  let installed = false;

  // @ts-ignore override method at runtime
  server.setRequestHandler = ((schema: any, handler: any) => {
    if (schema === ReadResourceRequestSchema) {
      readHandlers.push(handler);
      if (!installed) {
        installed = true;
        originalSetHandler(ReadResourceRequestSchema, async (request: any, extra?: any) => {
          for (const h of readHandlers) {
            // Each handler should either return a valid MCP response or { handled: false }
            const result = await h(request, extra);
            const r = result as any;
            if (r && (Array.isArray(r.contents) || r.error)) {
              return r; // handled
            }
            if (r && r.handled === false) {
              continue; // try next
            }
          }
          // Fallback guidance when no handler handled the URI
          const uri = request?.params?.uri ?? "unknown://";
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify({
                error: "Unsupported resource URI",
                guidance: "Use resources listed by list_resources or call tools for dynamic data",
              }, null, 2)
            }]
          } as any;
        });
      }
      return; // do not register individual read handlers directly
    }
    // Non-ReadResource schemas pass-through
    return originalSetHandler(schema, handler);
  }) as any;
}
