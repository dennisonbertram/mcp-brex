/**
 * @file Upload Receipt Tool
 * @version 1.0.0
 * @description Implementation of the upload_receipt tool for the Brex MCP server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrexClient } from "../services/brex/client.js";
import { logDebug, logError } from "../utils/logger.js";
import { registerToolHandler } from "./index.js";

// Get Brex client
function getBrexClient(): BrexClient {
  return new BrexClient();
}

/**
 * Interface for upload_receipt tool input parameters
 */
interface UploadReceiptParams {
  receipt_data: string;
  receipt_name: string;
  content_type: string;
}

/**
 * Validates and processes the upload_receipt tool parameters
 * @param input The raw input parameters from the tool call
 * @returns Validated parameters
 */
function validateParams(input: any): UploadReceiptParams {
  if (!input) {
    throw new Error("Missing parameters");
  }
  
  if (!input.receipt_data) {
    throw new Error("Missing required parameter: receipt_data");
  }
  
  if (!input.receipt_name) {
    throw new Error("Missing required parameter: receipt_name");
  }
  
  if (!input.content_type) {
    throw new Error("Missing required parameter: content_type");
  }
  
  // Validate content type
  const validContentTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];
  
  if (!validContentTypes.includes(input.content_type.toLowerCase())) {
    throw new Error(`Invalid content type. Must be one of: ${validContentTypes.join(', ')}`);
  }
  
  // Validate base64 data
  try {
    const buffer = Buffer.from(input.receipt_data, 'base64');
    if (buffer.length === 0) {
      throw new Error("Receipt data is empty");
    }
  } catch (error) {
    throw new Error("Invalid base64 receipt data");
  }
  
  return {
    receipt_data: input.receipt_data,
    receipt_name: input.receipt_name,
    content_type: input.content_type.toLowerCase()
  };
}

/**
 * Registers the upload_receipt tool with the server
 * @param server The MCP server instance
 */
export function registerUploadReceipt(server: Server): void {
  registerToolHandler("upload_receipt", async (request) => {
    try {
      // Validate parameters
      const params = validateParams(request.params.input);
      logDebug(`Uploading receipt: ${params.receipt_name} (${params.content_type})`);
      
      // Get Brex client
      const brexClient = getBrexClient();
      
      try {
        // Upload receipt to Brex
        const uploadResult = await brexClient.uploadReceipt({
          file: Buffer.from(params.receipt_data, 'base64'),
          filename: params.receipt_name,
          contentType: params.content_type
        });
        
        if (!uploadResult || !uploadResult.id) {
          throw new Error("Invalid response from receipt upload");
        }
        
        logDebug(`Successfully uploaded receipt with ID: ${uploadResult.id}`);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "success",
              receipt_id: uploadResult.id,
              filename: params.receipt_name,
              content_type: params.content_type
            }, null, 2)
          }]
        };
      } catch (apiError) {
        logError(`Error uploading receipt to Brex API: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        throw new Error(`Failed to upload receipt: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (error) {
      logError(`Error in upload_receipt tool: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
} 