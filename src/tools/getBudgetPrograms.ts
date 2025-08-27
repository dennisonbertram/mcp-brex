/**
 * @file Get Budget Programs Tool (read-only) - returns complete budget program objects
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";
import { BudgetProgramListParams, BudgetProgramStatus } from "../models/budget.js";

function getBrexClient(): BrexClient { 
  return new BrexClient(); 
}

interface GetBudgetProgramsParams {
  limit?: number;
  cursor?: string;
  budget_program_status?: BudgetProgramStatus;
}

function validateParams(input: unknown): GetBudgetProgramsParams {
  const raw = (input || {}) as Record<string, unknown>;
  const out: GetBudgetProgramsParams = {};
  
  if (raw.limit !== undefined) { 
    const n = parseInt(String(raw.limit), 10); 
    if (isNaN(n) || n <= 0 || n > 100) {
      throw new Error("Invalid limit (1..100)"); 
    }
    out.limit = n; 
  }
  
  if (raw.cursor !== undefined) {
    out.cursor = String(raw.cursor);
  }
  
  if (raw.budget_program_status !== undefined) {
    out.budget_program_status = String(raw.budget_program_status) as BudgetProgramStatus;
  }
  
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
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            budget_programs: items, 
            meta: { 
              count: items.length, 
              next_cursor: resp.next_cursor || null 
            } 
          }, null, 2) 
        }] 
      };
    } catch (error) {
      logError(`Error in get_budget_programs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}