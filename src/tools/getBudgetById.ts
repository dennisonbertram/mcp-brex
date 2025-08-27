/**
 * @file Get Budget By ID Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient { 
  return new BrexClient(); 
}

interface GetBudgetParams { 
  budget_id: string; 
}

function validateParams(input: unknown): GetBudgetParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.budget_id) throw new Error("Missing required parameter: budget_id");
  return { 
    budget_id: String(raw.budget_id) 
  };
}

export function registerGetBudgetById(_server: Server): void {
  registerToolHandler("get_budget", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const budget = await client.getBudget(params.budget_id);
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ budget }, null, 2) 
        }] 
      };
    } catch (error) {
      logError(`Error in get_budget: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}