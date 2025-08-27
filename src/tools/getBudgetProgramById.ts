/**
 * @file Get Budget Program By ID Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient { 
  return new BrexClient(); 
}

interface GetBudgetProgramParams { 
  id: string; 
}

function validateParams(input: unknown): GetBudgetProgramParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.id) throw new Error("Missing required parameter: id");
  return { 
    id: String(raw.id) 
  };
}

export function registerGetBudgetProgramById(_server: Server): void {
  registerToolHandler("get_budget_program", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const program = await client.getBudgetProgram(params.id);
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ budget_program: program }, null, 2) 
        }] 
      };
    } catch (error) {
      logError(`Error in get_budget_program: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}