/**
 * @file Get Spend Limits Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { SpendLimitListParams, SpendLimitStatus } from "../models/budget.js";

function getBrexClient(): BrexClient { return new BrexClient(); }

interface GetSpendLimitsParams {
  limit?: number;
  cursor?: string;
  parent_budget_id?: string;
  status?: SpendLimitStatus;
  member_user_id?: string;
}

function validateParams(input: unknown): GetSpendLimitsParams {
  const raw = (input || {}) as Record<string, unknown>;
  const out: GetSpendLimitsParams = {};
  if (raw.limit !== undefined) { const n = parseInt(String(raw.limit), 10); if (isNaN(n) || n <= 0 || n > 100) throw new Error("Invalid limit (1..100)"); out.limit = n; }
  if (raw.cursor !== undefined) out.cursor = String(raw.cursor);
  if (raw.parent_budget_id !== undefined) out.parent_budget_id = String(raw.parent_budget_id);
  if (raw.status !== undefined) out.status = String(raw.status) as SpendLimitStatus;
  if (raw.member_user_id !== undefined) out.member_user_id = String(raw.member_user_id);
  return out;
}

export function registerGetSpendLimits(_server: Server): void {
  registerToolHandler("get_spend_limits", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const apiParams: SpendLimitListParams = {
        limit: params.limit,
        cursor: params.cursor,
        parent_budget_id: params.parent_budget_id,
        status: params.status,
        member_user_id: params.member_user_id
      };
      const resp = await client.getSpendLimits(apiParams);
      const items = Array.isArray(resp.items) ? resp.items : [];
      return { content: [{ type: "text", text: JSON.stringify({ spend_limits: items, meta: { count: items.length, next_cursor: resp.next_cursor } }, null, 2) }] };
    } catch (error) {
      logError(`Error in get_spend_limits: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}