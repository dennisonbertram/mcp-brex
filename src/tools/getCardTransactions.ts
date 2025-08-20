/**
 * @file Get Card Transactions Tool
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { estimateTokens } from "../utils/responseLimiter.js";

// Minimal projection for transactions (reuse limiter infra for consistency)
const DEFAULT_TX_FIELDS = [
  "id",
  "status",
  "posted_at",
  "amount.amount",
  "amount.currency",
  "merchant.raw_descriptor",
  "card_last_four"
];

function getBrexClient(): BrexClient {
  return new BrexClient();
}

interface GetCardTransactionsParams {
  cursor?: string;
  limit?: number;
  user_ids?: string[];
  posted_at_start?: string;
  expand?: string[];
  summary_only?: boolean;
  fields?: string[];
}

function validateParams(input: unknown): GetCardTransactionsParams {
  const raw = (input || {}) as Record<string, unknown>;
  const out: GetCardTransactionsParams = {};
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  if (raw.limit !== undefined) {
    const n = parseInt(String(raw.limit), 10);
    if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)");
    out.limit = n;
  }
  if (raw.user_ids !== undefined) out.user_ids = Array.isArray(raw.user_ids) ? raw.user_ids.map(String) : [String(raw.user_ids)];
  if (raw.posted_at_start !== undefined) out.posted_at_start = new Date(String(raw.posted_at_start)).toISOString();
  if (raw.expand !== undefined) out.expand = Array.isArray(raw.expand) ? raw.expand.map(String) : [String(raw.expand)];
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetCardTransactions(_server: Server): void {
  registerToolHandler("get_card_transactions", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();

      const resp = await client.getCardTransactions({
        cursor: params.cursor,
        limit: params.limit,
        user_ids: params.user_ids,
        posted_at_start: params.posted_at_start,
        expand: params.expand
      });

      const items = Array.isArray(resp.items) ? resp.items : [];
      // Project via limiter infra (wrap items into Expense type-compatible projection path names kept simple)
      const projectionFields = params.fields && params.fields.length ? params.fields : DEFAULT_TX_FIELDS;
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
      logError(`Error in get_card_transactions: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}


