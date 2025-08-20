/**
 * @file Get Cash Transactions Tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { estimateTokens } from "../utils/responseLimiter.js";

const DEFAULT_FIELDS = [
  "id",
  "posted_at",
  "amount.amount",
  "amount.currency",
  "description"
];

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetCashTransactionsParams {
  account_id: string;
  cursor?: string;
  limit?: number;
  posted_at_start?: string;
  summary_only?: boolean;
  fields?: string[];
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
  if (raw.posted_at_start !== undefined) out.posted_at_start = new Date(String(raw.posted_at_start)).toISOString();
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetCashTransactions(_server: Server): void {
  registerToolHandler("get_cash_transactions", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const resp = await client.getCashTransactions(params.account_id, {
        cursor: params.cursor,
        limit: params.limit,
        posted_at_start: params.posted_at_start
      });
      const items = Array.isArray(resp.items) ? resp.items : [];
      const projectionFields = params.fields && params.fields.length ? params.fields : DEFAULT_FIELDS;
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
            transactions: outputItems,
            meta: {
              count: outputItems.length,
              next_cursor: (resp as any).next_cursor || null,
              summary_applied: summarized
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


