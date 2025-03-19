import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Spawn the MCP server as a child process
  const serverProcess = spawn('node', [
    path.resolve(process.cwd(), 'build/index.js')
  ], {
    stdio: ['pipe', 'pipe', process.stderr],
    env: { ...process.env, LOG_LEVEL: 'DEBUG' }
  });
  
  // Create an MCP client with stdio transport connected to the server
  const transport = new StdioClientTransport(serverProcess.stdin, serverProcess.stdout);
  const client = new Client();
  
  try {
    // Connect to the server
    console.log('Connecting to Brex MCP server...');
    await client.connect(transport);
    
    // Get server info
    console.log('Getting server info...');
    const serverInfo = await client.getInfo();
    console.log('Server Info:', JSON.stringify(serverInfo, null, 2));
    
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
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    console.log('Disconnecting and terminating server...');
    try {
      await client.disconnect();
    } catch (e) {
      console.error('Error disconnecting:', e);
    }
    serverProcess.kill();
  }
}

main().catch(console.error); 