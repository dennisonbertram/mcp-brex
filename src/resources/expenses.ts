/**
 * @file Expenses Resource Handler
 * @version 1.0.0
 * @description Handles Brex expenses resource requests
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ResourceTemplate } from "../models/resourceTemplate.js";
import { logDebug, logError } from "../utils/logger.js";
import { BrexClient } from "../services/brex/client.js";
import { isExpense, ListExpensesParams } from "../services/brex/expenses-types.js";
import { parseQueryParams } from "../models/common.js";
import { limitExpensesPayload } from "../utils/responseLimiter.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

// Define expenses resource template
const expensesTemplate = new ResourceTemplate("brex://expenses{/id}");

/** Capability only (optional) */
export function registerExpensesCapabilities(server: Server): void {
  server.registerCapabilities({
    resources: {
      "brex://expenses{/id}": {
        description: "Brex expenses",
        mimeTypes: ["application/json"],
      }
    }
  });
}

export function canHandleExpensesUri(uri: string): boolean {
  return uri.startsWith("brex://expenses") && !uri.includes("/card");
}

export async function readExpensesUri(uri: string): Promise<any> {
  logDebug(`Reading expenses resource: ${uri}`);
  const brexClient = getBrexClient();
  const params = expensesTemplate.parse(uri);
  if (!params.id) {
    try {
      const listParams: ListExpensesParams = { limit: 50, expand: ['merchant', 'budget'] };
      const expenses = await brexClient.getExpenses(listParams);
      const qp = parseQueryParams(uri);
      const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const summaryOnly = qp.summary_only === 'true';
      const limited = limitExpensesPayload(expenses.items as any, { summaryOnly, fields, hardTokenLimit: 24000 });
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(limited.items, null, 2) }] } as any;
    } catch (error) {
      logError(`Failed to fetch expenses: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  } else {
    try {
      const expense = await brexClient.getExpense(params.id, { expand: ['merchant','budget','location','department','receipts.download_uris'], load_custom_fields: true });
      if (!isExpense(expense)) throw new Error('Invalid expense data received');
      const qp = parseQueryParams(uri);
      const fields = qp.fields ? qp.fields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      const summaryOnly = qp.summary_only === 'true';
      const limited = limitExpensesPayload([expense] as any, { summaryOnly, fields, hardTokenLimit: 24000 });
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(limited.items[0] || {}, null, 2) }] } as any;
    } catch (error) {
      logError(`Failed to fetch expense ${params.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
