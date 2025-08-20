/**
 * @file Match Receipt Tool
 * @version 1.0.0
 * @description Implementation of the match_receipt tool for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { registerToolHandler, ToolCallRequest } from "./index.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for match_receipt tool input parameters
 */
interface MatchReceiptParams {
  receipt_name: string;
  receipt_type?: string;
  notify_email?: string;
}

/**
 * Interface for receipt match request
 */
interface ReceiptMatchRequest {
  receipt_name: string;
  receipt_type?: string;
  notify_email?: string;
}

/**
 * Interface for receipt match response
 */
interface ReceiptMatchResponse {
  id: string;
  uri: string;
}

/**
 * Helper function to create a receipt match request
 * @param client The Brex client
 * @param request The receipt match request options
 * @returns Receipt match response with pre-signed URL
 */
async function createReceiptMatch(client: BrexClient, request: ReceiptMatchRequest): Promise<ReceiptMatchResponse> {
  try {
    logDebug(`Creating receipt match request for ${request.receipt_name}`);
    
    // Make API call to Brex to get pre-signed URL
    const response = await client.post('/v1/expenses/card/receipt_match', request);
    
    // Validate the response
    if (!response || !response.id || !response.uri) {
      throw new Error("Invalid response from receipt match request");
    }
    
    return {
      id: response.id,
      uri: response.uri
    };
  } catch (error) {
    logError(`Failed to create receipt match: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Receipt match request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates and processes the match_receipt tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): MatchReceiptParams {
  if (!input) {
    throw new Error("Missing parameters");
  }
  
  if (!input.receipt_name) {
    throw new Error("Missing required parameter: receipt_name");
  }
  
  const params: MatchReceiptParams = {
    receipt_name: input.receipt_name,
    receipt_type: input.receipt_type,
    notify_email: input.notify_email
  };
  
  return params;
}

/**
 * Registers the match_receipt tool with the server
 * @param server The MCP server instance
 */
export function registerMatchReceipt(_server: Server): void {
  registerToolHandler("match_receipt", async (request: ToolCallRequest) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.arguments);
      logDebug(`Creating receipt match for: ${params.receipt_name}`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Create receipt match request to get pre-signed URL
        const matchResult = await createReceiptMatch(brexClient, {
          receipt_name: params.receipt_name,
          receipt_type: params.receipt_type,
          notify_email: params.notify_email
        });
        
        logDebug(`Successfully created receipt match with ID: ${matchResult.id}`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              receipt_id: matchResult.id,
              upload_url: matchResult.uri,
              message: "Receipt match created successfully. Use the provided URL to upload the receipt file.",
              instructions: "1. Use this pre-signed URL with a PUT request to upload your receipt.\n2. The URL expires in 30 minutes.\n3. Once uploaded, Brex will automatically try to match the receipt with existing expenses."
            }, null, 2)
          }]
        };
      } catch (apiError) {
        logError(`Error creating receipt match: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        throw new Error(`Failed to create receipt match: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in match_receipt tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 