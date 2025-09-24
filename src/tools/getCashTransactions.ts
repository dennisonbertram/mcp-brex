/**
 * @file Get Cash Transactions Tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetCashTransactionsParams {
  account_id: string;
  cursor?: string;
  limit?: number;
}

function validateParams(input: unknown): GetCashTransactionsParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.account_id) throw new Error("Missing required parameter: account_id");
  const out: GetCashTransactionsParams = { account_id: String(raw.account_id) };
  
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  
  if (raw.limit !== undefined) {
    const n = parseInt(String(raw.limit), 10);
    if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)");
    out.limit = n;
  }
  
  // Ignore unsupported parameters silently (posted_at_start, expand)
  
  return out;
}

export function registerGetCashTransactions(_server: Server): void {
  registerToolHandler("get_cash_transactions", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      
      // Call API with all supported parameters
      const resp = await client.getCashTransactions(params.account_id, {
        cursor: params.cursor,
        limit: params.limit
      });
      
      // Return complete transaction objects without any filtering or summarization
      const items = Array.isArray(resp.items) ? resp.items : [];
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            transactions: items,
            meta: {
              count: items.length,
              next_cursor: (resp as any).next_cursor
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      logError(`Error in get_cash_transactions: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}
