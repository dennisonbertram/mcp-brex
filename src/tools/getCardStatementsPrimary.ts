/**
 * @file Get Card Statements (Primary) Tool - Returns complete statement objects without summarization
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetCardStatementsParams {
  cursor?: string;
  limit?: number;
}

function validateParams(input: unknown): GetCardStatementsParams {
  const raw = (input || {}) as Record<string, unknown>;
  const out: GetCardStatementsParams = {};
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  if (raw.limit !== undefined) {
    const n = parseInt(String(raw.limit), 10);
    if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)");
    out.limit = n;
  }
  return out;
}

export function registerGetCardStatementsPrimary(_server: Server): void {
  registerToolHandler("get_card_statements_primary", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const resp = await client.getPrimaryCardStatements(params.cursor, params.limit);
      const items = Array.isArray(resp.items) ? resp.items : [];
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            statements: items,
            meta: {
              count: items.length,
              next_cursor: (resp as any).next_cursor || null
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      logError(`Error in get_card_statements_primary: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}


