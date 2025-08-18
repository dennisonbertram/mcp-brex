import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Create an MCP client that spawns the server process via stdio transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'build/index.js')],
    env: { ...process.env, LOG_LEVEL: 'DEBUG' }
  });
  const client = new Client(
    { name: 'brex-mcp-client-test', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );
  
  try {
    // Connect to the server
    console.log('Connecting to Brex MCP server...');
    await client.connect(transport);
    
    // List resources
    console.log('\nListing resources...');
    const resources = await client.listResources();
    console.log('Resources:', JSON.stringify(resources, null, 2));
    
    // Try to read the card expenses resource
    console.log('\nReading card expenses resource...');
    try {
      const cardExpenses = await client.readResource('brex://expenses/card');
      console.log('Card Expenses:', JSON.stringify(cardExpenses, null, 2));
    } catch (error) {
      console.error('Error reading card expenses:', error.message);
    }
    
    // List tools
    console.log('\nListing tools...');
    try {
      const tools = await client.listTools();
      console.log('Tools:', JSON.stringify(tools, null, 2));
    } catch (error) {
      console.error('Error listing tools:', error.message);
    }

    // Call tools to validate filtering & pagination
    // Build a tight date range to reduce result sizes
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    console.log('\nCalling get_all_expenses ...');
    try {
      const res = await client.callTool({
        name: 'get_all_expenses',
        arguments: { page_size: 5, max_items: 5, status: ['APPROVED'], payment_status: ['CLEARED'], start_date: startIso, end_date: endIso }
      });
      console.log('get_all_expenses result:', JSON.stringify(res, null, 2));
    } catch (error) {
      console.error('Error calling get_all_expenses:', error.message);
    }

    console.log('\nCalling get_all_card_expenses ...');
    try {
      const res2 = await client.callTool({
        name: 'get_all_card_expenses',
        arguments: { page_size: 5, max_items: 5, status: ['APPROVED'], payment_status: ['CLEARED'], start_date: startIso, end_date: endIso }
      });
      console.log('get_all_card_expenses result:', JSON.stringify(res2, null, 2));
    } catch (error) {
      console.error('Error calling get_all_card_expenses:', error.message);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up (best-effort)
    console.log('Terminating server transport...');
    try {
      if (typeof transport.close === 'function') {
        await transport.close();
      }
    } catch (e) {
      console.error('Error closing transport:', e);
    }
  }
}

main().catch(console.error); 