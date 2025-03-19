import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Spawn the MCP server
const serverProcess = spawn('node', [
  path.resolve(process.cwd(), 'build/index.js')
], {
  stdio: ['pipe', 'pipe', process.stderr],
  env: { ...process.env, LOG_LEVEL: 'DEBUG' }
});

// Set up listeners for the server's output
serverProcess.stdout.on('data', (data) => {
  console.log(`\nServer Output: ${data}`);
  try {
    // Try to parse the output as JSON
    const jsonData = JSON.parse(data);
    
    // If this is a response to reading card expenses, pretty print it
    if (jsonData.id === '2') {
      console.log('Card Expenses Response:');
      if (jsonData.result && jsonData.result.contents) {
        const content = jsonData.result.contents[0];
        console.log(`URI: ${content.uri}`);
        console.log(`MIME Type: ${content.mimeType}`);
        // Parse the text content to JSON for better readability
        try {
          const contentJson = JSON.parse(content.text);
          console.log('Content:');
          if (Array.isArray(contentJson)) {
            console.log(`${contentJson.length} expenses found`);
            if (contentJson.length > 0) {
              console.log('First expense:');
              console.log(JSON.stringify(contentJson[0], null, 2));
            }
          } else {
            console.log(JSON.stringify(contentJson, null, 2));
          }
        } catch (e) {
          console.log('Raw Content: ', content.text);
        }
      } else if (jsonData.error) {
        console.log('Error Response:', jsonData.error);
      }
    } else {
      // For other responses, just show the full JSON
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
    }
  } catch (e) {
    // Not valid JSON, just log as-is
    console.log('Not valid JSON output');
  }
});

// Test sequence
let testStep = 0;

// Send a sequence of requests
const runTests = () => {
  testStep++;
  
  switch (testStep) {
    case 1:
      console.log('\n=== Step 1: Listing Available Resources ===');
      const listRequest = {
        jsonrpc: '2.0',
        id: '1',
        method: 'resources/list',
        params: {}
      };
      serverProcess.stdin.write(JSON.stringify(listRequest) + '\n');
      setTimeout(runTests, 3000);
      break;
      
    case 2:
      console.log('\n=== Step 2: Reading Card Expenses Resource ===');
      const readRequest = {
        jsonrpc: '2.0',
        id: '2',
        method: 'resources/read',
        params: {
          uri: 'brex://expenses/card'
        }
      };
      serverProcess.stdin.write(JSON.stringify(readRequest) + '\n');
      setTimeout(runTests, 10000);
      break;
      
    case 3:
      console.log('\n=== Tests Completed Successfully ===');
      serverProcess.kill();
      process.exit(0);
      break;
  }
};

// Start the test sequence after a short delay to allow the server to initialize
setTimeout(runTests, 2000); 