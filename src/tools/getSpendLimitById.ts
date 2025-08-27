/**
 * @file Get Spend Limit By ID Tool (read-only)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

function getBrexClient(): BrexClient { 
  return new BrexClient(); 
}

interface GetSpendLimitParams { 
  id: string; 
}

function validateParams(input: unknown): GetSpendLimitParams {
  const raw = (input || {}) as Record<string, unknown>;
  if (!raw.id) {
    throw new Error("Missing required parameter: id");
  }
  return { 
    id: String(raw.id) 
  };
}

export function registerGetSpendLimitById(_server: Server): void {
  registerToolHandler("get_spend_limit", async (request: ToolCallRequest) => {
    try {
      const params = validateParams(request.params.arguments);
      const client = getBrexClient();
      const spendLimit = await client.getSpendLimit(params.id);
      
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({ 
            spend_limit: spendLimit 
          }, null, 2) 
        }] 
      };
    } catch (error) {
      logError(`Error in get_spend_limit: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
}