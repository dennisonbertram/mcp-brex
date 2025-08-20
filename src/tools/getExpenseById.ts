/**
 * @file Get Expense By ID Tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { limitExpensesPayload } from "../utils/responseLimiter.js";

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetExpenseParams {
  expense_id: string;
  expand?: string[];
  summary_only?: boolean;
  fields?: string[];
}

function validateParams(input: unknown): GetExpenseParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.expense_id) throw new Error("Missing required parameter: expense_id");
  const out: GetExpenseParams = { expense_id: String(raw.expense_id) };
  if (raw.expand !== undefined) out.expand = Array.isArray(raw.expand) ? raw.expand.map(String) : [String(raw.expand)];
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetExpenseById(_server: Server): void {
  registerToolHandler("get_expense", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const expense = await client.getExpense(params.expense_id, { expand: params.expand });
      const { items, summaryApplied } = limitExpensesPayload([expense] as any, {
        summaryOnly: params.summary_only,
        fields: params.fields,
        hardTokenLimit: 24000
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ expense: items[0] || {}, meta: { summary_applied: summaryApplied } }, null, 2)
        }]
      };
    } catch (error) {
      logError(`Error in get_expense: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}


