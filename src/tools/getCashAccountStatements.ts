/**
 * @file Get Cash Account Statements Tool - Returns complete cash account statement objects
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetCashAccountStatementsParams {
  account_id: string;
  cursor?: string;
  limit?: number;
}

function validateParams(input: unknown): GetCashAccountStatementsParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.account_id) throw new Error("Missing required parameter: account_id");
  const out: GetCashAccountStatementsParams = { account_id: String(raw.account_id) };
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  if (raw.limit !== undefined) {
    const n = parseInt(String(raw.limit), 10);
    if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)");
    out.limit = n;
  }
  return out;
}

export function registerGetCashAccountStatements(_server: Server): void {
  registerToolHandler("get_cash_account_statements", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const resp = await client.getCashAccountStatements(params.account_id, params.cursor, params.limit);

      // Return complete objects without any summarization
      const items = Array.isArray(resp?.items) ? resp.items : [];

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            statements: items,
            meta: {
              count: items.length,
              next_cursor: resp?.next_cursor || undefined
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      logError(`Error in get_cash_account_statements: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}