#!/usr/bin/env node

/**
 * @file Brex MCP Server
 * @version 1.1.0
 * @status STABLE - DO NOT MODIFY WITHOUT TESTS
 * @lastModified 2024-03-19
 * 
 * MCP server implementation for Brex API integration
 * 
 * IMPORTANT:
 * - Add tests for any new functionality
 * - Handle errors appropriately
 * 
 * Functionality:
 * - List Brex accounts as resources
 * - Read account details and transactions
 * - Fetch and manage expenses
 * - Upload and manage receipts
 * - Fetch transactions via tools
 * - Summarize transactions via prompts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerResources } from "./resources/index.js";
import { registerTools } from "./tools/index.js";
import { registerPrompts } from "./prompts/index.js";
import { logError, logInfo, logDebug } from "./utils/logger.js";

// Create the server instance
const server = new Server(
  {
    name: "brex-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// Register all handlers
registerResources(server);
registerTools(server);
registerPrompts(server);

// Start the server
async function main(): Promise<void> {
  try {
    logInfo("===== SERVER STARTUP BEGIN =====");
    logInfo("Starting Brex MCP server...");
    
    // Create transport
    logDebug("Creating StdioServerTransport");
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    logDebug("Connecting server to transport");
    await server.connect(transport);
    
    logInfo("Brex MCP server started successfully");
    logInfo("===== SERVER STARTUP COMPLETE =====");
  } catch (error) {
    logError("===== SERVER STARTUP FAILED =====");
    logError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    logError("Stack trace: " + (error instanceof Error ? error.stack : "Not available"));
    process.exit(1);
  }
}

main();
