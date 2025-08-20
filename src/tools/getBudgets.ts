/**
 * @file Get Budgets Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { SpendBudgetStatus, BudgetListParams } from "../models/budget.js";
import { estimateTokens } from "../utils/responseLimiter.js";

const DEFAULT_FIELDS = [
  "budget_id",
  "name",
  "spend_budget_status",
  "amount.amount",
  "amount.currency",
  "period_recurrence_type",
  "updated_at"
];

function getBrexClient(): BrexClient { return new BrexClient(); }

interface GetBudgetsParams {
  limit?: number;
  cursor?: string;
  parent_budget_id?: string;
  spend_budget_status?: SpendBudgetStatus;
  summary_only?: boolean;
  fields?: string[];
}

function validateParams(input: unknown): GetBudgetsParams {
  const raw = (input || {}) as Record<string, unknown>;
  const out: GetBudgetsParams = {};
  if (raw.limit !== undefined) {
    const n = parseInt(String(raw.limit), 10);
    if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)");
    out.limit = n;
  }
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  if (raw.parent_budget_id !== undefined) out.parent_budget_id = String(raw.parent_budget_id);
  if (raw.spend_budget_status !== undefined) out.spend_budget_status = String(raw.spend_budget_status) as SpendBudgetStatus;
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetBudgets(_server: Server): void {
  registerToolHandler("get_budgets", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const apiParams: BudgetListParams = {
        limit: params.limit,
        cursor: params.cursor,
        parent_budget_id: params.parent_budget_id,
        spend_budget_status: params.spend_budget_status
      };
      const resp = await client.getBudgets(apiParams);
      const items = Array.isArray(resp.items) ? resp.items : [];
      const fields = params.fields && params.fields.length ? params.fields : DEFAULT_FIELDS;
      const tooBig = estimateTokens(JSON.stringify(items)) > 24000;
      const summarized = params.summary_only || tooBig;
      const output = summarized ? items.map((t: any) => project(t, fields)) : items;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            budgets: output,
            meta: { count: output.length, next_cursor: resp.next_cursor || null, summary_applied: summarized }
          }, null, 2)
        }]
      };
    } catch (error) {
      logError(`Error in get_budgets: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}

function project(src: any, fields: string[]): any {
  const out: any = {};
  for (const f of fields) {
    const parts = f.split('.');
    let cur: any = src;
    for (const p of parts) { cur = cur?.[p]; if (cur === undefined) break; }
    if (cur !== undefined) {
      let o: any = out;
      for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = o[parts[i]] ?? {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = cur;
    }
  }
  return out;
}


