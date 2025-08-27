/**
 * @file Get Expense By ID Tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetExpenseParams {
  expense_id: string;
  expand?: string[];
}

function validateParams(input: unknown): GetExpenseParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.expense_id) throw new Error("Missing required parameter: expense_id");
  const out: GetExpenseParams = { expense_id: String(raw.expense_id) };
  if (raw.expand !== undefined) out.expand = Array.isArray(raw.expand) ? raw.expand.map(String) : [String(raw.expand)];
  return out;
}

export function registerGetExpenseById(_server: Server): void {
  registerToolHandler("get_expense", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const expense = await client.getExpense(params.expense_id, { expand: params.expand });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(expense, null, 2)
        }]
      };
    } catch (error) {
      logError(`Error in get_expense: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}


