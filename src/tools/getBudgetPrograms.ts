/**
 * @file Get Budget Programs Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { BudgetProgramListParams, BudgetProgramStatus } from "../models/budget.js";
import { estimateTokens } from "../utils/responseLimiter.js";

const DEFAULT_FIELDS = [
  "id",
  "name",
  "budget_program_status",
  "updated_at"
];

function getBrexClient(): BrexClient { return new BrexClient(); }

interface GetBudgetProgramsParams {
  limit?: number;
  cursor?: string;
  budget_program_status?: BudgetProgramStatus;
  summary_only?: boolean;
  fields?: string[];
}

function validateParams(input: unknown): GetBudgetProgramsParams {
  const raw = (input || {}) as Record<string, unknown>;
  const out: GetBudgetProgramsParams = {};
  if (raw.limit !== undefined) { const n = parseInt(String(raw.limit), 10); if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)"); out.limit = n; }
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  if (raw.budget_program_status !== undefined) out.budget_program_status = String(raw.budget_program_status) as BudgetProgramStatus;
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetBudgetPrograms(_server: Server): void {
  registerToolHandler("get_budget_programs", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const apiParams: BudgetProgramListParams = {
        limit: params.limit,
        cursor: params.cursor,
        budget_program_status: params.budget_program_status
      };
      const resp = await client.getBudgetPrograms(apiParams);
      const items = Array.isArray(resp.items) ? resp.items : [];
      const fields = params.fields && params.fields.length ? params.fields : DEFAULT_FIELDS;
      const tooBig = estimateTokens(JSON.stringify(items)) > 24000;
      const summarized = params.summary_only || tooBig;
      const output = summarized ? items.map((t: any) => project(t, fields)) : items;
      return { content: [{ type: "text", text: JSON.stringify({ budget_programs: output, meta: { count: output.length, next_cursor: resp.next_cursor || null, summary_applied: summarized } }, null, 2) }] };
    } catch (error) {
      logError(`Error in get_budget_programs: ${error instanceof Error ? error.message : String(error)}`);
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


