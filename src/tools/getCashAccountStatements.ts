/**
 * @file Get Cash Account Statements Tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { estimateTokens } from "../utils/responseLimiter.js";

const DEFAULT_STMT_FIELDS = [
  "id",
  "period_start",
  "period_end",
  "opening_balance.amount",
  "opening_balance.currency",
  "closing_balance.amount",
  "closing_balance.currency"
];

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetCashAccountStatementsParams {
  account_id: string;
  cursor?: string;
  limit?: number;
  summary_only?: boolean;
  fields?: string[];
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
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetCashAccountStatements(_server: Server): void {
  registerToolHandler("get_cash_account_statements", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const resp = await client.getCashAccountStatements(params.account_id, params.cursor, params.limit);

      const items = Array.isArray(resp.items) ? resp.items : [];
      const projectionFields = params.fields && params.fields.length ? params.fields : DEFAULT_STMT_FIELDS;
      const payloadText = JSON.stringify(items);
      const tooBig = estimateTokens(payloadText) > 24000;
      const summarized = params.summary_only || tooBig;
      const outputItems = summarized
        ? items.map((t: any) => {
            const out: any = {};
            projectionFields.forEach((p) => {
              const parts = p.split('.');
              let cur: any = t;
              for (const part of parts) {
                cur = cur?.[part];
                if (cur === undefined) break;
              }
              if (cur !== undefined) {
                let o: any = out;
                for (let i = 0; i < parts.length - 1; i++) {
                  o[parts[i]] = o[parts[i]] ?? {};
                  o = o[parts[i]];
                }
                o[parts[parts.length - 1]] = cur;
              }
            });
            return out;
          })
        : items;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            statements: outputItems,
            meta: {
              count: outputItems.length,
              next_cursor: (resp as any).next_cursor || null,
              summary_applied: summarized
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


