/**
 * @file Resources Index
 * @version 1.0.0
 * @description Exports all resource handlers for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ReadResourceRequestSchema, ListResourcesRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerAccountsResource } from "./accounts.js";
import { registerExpensesResource } from "./expenses.js";
import { registerCardExpensesResource } from "./cardExpenses.js";
import { registerBudgetsResource } from "./budgets.js";
import { registerSpendLimitsResource } from "./spendLimits.js";
import { registerBudgetProgramsResource } from "./budgetPrograms.js";
import { logInfo, logDebug, logError } from "../utils/logger.js";

/**
 * Registers all resource handlers with the server
 * @param server The MCP server instance
 */
export function registerResources(server: Server): void {
  // Register resource handlers
  registerAccountsResource(server);
  registerExpensesResource(server);
  registerCardExpensesResource(server);
  registerBudgetsResource(server);
  registerSpendLimitsResource(server);
  registerBudgetProgramsResource(server);

  // Register the list resources handler
  registerListResourcesHandler(server);
}

/**
 * Registers the handler for listing available resources
 * @param server The MCP server instance
 */
function registerListResourcesHandler(server: Server): void {
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
        ]
      };
    }
  });
} 