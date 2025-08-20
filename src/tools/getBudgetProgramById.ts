/**
 * @file Get Budget Program By ID Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { estimateTokens } from "../utils/responseLimiter.js";

const DEFAULT_FIELDS = [
  "id",
  "name",
  "budget_program_status",
  "updated_at"
];

function getBrexClient(): BrexClient { return new BrexClient(); }

interface GetBudgetProgramParams { id: string; summary_only?: boolean; fields?: string[]; }

function validateParams(input: unknown): GetBudgetProgramParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.id) throw new Error("Missing required parameter: id");
  const out: GetBudgetProgramParams = { id: String(raw.id) };
  if (raw.summary_only !== undefined) out.summary_only = Boolean(raw.summary_only);
  if (raw.fields !== undefined) out.fields = Array.isArray(raw.fields) ? raw.fields.map(String) : [String(raw.fields)];
  return out;
}

export function registerGetBudgetProgramById(_server: Server): void {
  registerToolHandler("get_budget_program", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const program = await client.getBudgetProgram(params.id);
      const fields = params.fields && params.fields.length ? params.fields : DEFAULT_FIELDS;
      const tooBig = estimateTokens(JSON.stringify(program)) > 24000;
      const summarized = params.summary_only || tooBig;
      const output = summarized ? project(program, fields) : program;
      return { content: [{ type: "text", text: JSON.stringify({ budget_program: output, meta: { summary_applied: summarized } }, null, 2) }] };
    } catch (error) {
      logError(`Error in get_budget_program: ${error instanceof Error ? error.message : String(error)}`);
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


