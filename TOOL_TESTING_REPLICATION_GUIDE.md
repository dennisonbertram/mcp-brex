# Tool-by-Tool Testing Replication Guide

## Overview
This guide provides step-by-step instructions for replicating the individual tool testing process for the Brex MCP server from a fresh context. All commands and procedures are documented for complete reproducibility.

---

## Prerequisites

### 1. System Requirements
- **Node.js**: v18+ (tested with v22.16.0)
- **npm**: Latest version
- **curl**: For direct API testing
- **git**: For repository access
- **Terminal/Command Line**: bash-compatible shell

### 2. Repository Setup
```bash
# Clone the repository
git clone <repository-url>
cd mcp-brex

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Verify build succeeded
ls -la build/
```

Expected output: `build/` directory with compiled JavaScript files.

---

## Testing Method 1: Automated Tool Testing Script

### Step 1: Execute the Test Script
```bash
# Run the comprehensive individual tool testing
node test_individual_tools.js
```

### Step 2: Monitor Output
The script provides real-time colored output:
- 🔵 Blue: Informational messages
- ✅ Green: Successful tool calls
- ❌ Red: Failed tool calls  
- ⚠️ Yellow: Warnings and API comparisons
- 🟣 Purple: Section headers

### Step 3: Review Results
The script generates:
1. **Console Output**: Real-time test results with color coding
2. **JSON Report**: `tool_testing_report_<timestamp>.json` with detailed data

### Expected Output Structure
```
Testing: get_budgets (Budget Management)
Arguments: {"limit": 3, "summary_only": true}
ℹ️  Testing tool: get_budgets
❌ get_budgets threw exception: MCP error -32603: Request failed with status code 403
Tool failed or returned no data. Testing direct API call...
ℹ️  Direct API returned 401 Unauthorized
```

---

## Testing Method 2: Manual Tool Testing

### Step 1: Start MCP Server Manually
```bash
# Terminal 1: Start the server
node build/index.js
```

### Step 2: Send JSON-RPC Requests  
```bash
# Terminal 2: Send tool call requests
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call", 
  "params": {
    "name": "get_budgets",
    "arguments": {
      "limit": 3,
      "summary_only": true
    }
  }
}' | node build/index.js
```

### Step 3: Compare with Direct API Calls
```bash
# Test the equivalent Brex API endpoint directly
curl -v -X GET "https://platform.brexapis.com/v2/budgets?limit=3" \
  -H "Authorization: Bearer fake-test-key" \
  -H "Content-Type: application/json"
```

---

## Testing Method 3: Using MCP SDK Client

### Step 1: Create Test Client Script
```javascript
// test_single_tool.js
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testSingleTool(toolName, args) {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'build/index.js')]
  });
  
  const client = new Client(
    { name: 'single-tool-tester', version: '1.0.0' },
    { capabilities: {} }
  );
  
  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: args });
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test specific tool
testSingleTool('get_budgets', { limit: 3, summary_only: true });
```

### Step 2: Run Single Tool Test
```bash
node test_single_tool.js
```

---

## Expected Results by Tool Category

### Budget Management Tools (6 tools)
**Expected Behavior**: All tools should throw MCP exceptions with 403 errors
```
❌ get_budgets (exception)
❌ get_budget (exception)  
❌ get_spend_limits (exception)
❌ get_spend_limit (exception)
❌ get_budget_programs (exception)
❌ get_budget_program (exception)
```

### Expense Management Tools (5 tools)  
**Expected Behavior**: Mixed results - 2 successes, 3 failures
```
❌ get_expenses (exception)
❌ get_all_expenses (exception) 
❌ get_expense (exception)
✅ get_all_card_expenses (success)
✅ get_card_expense (success)
```

### Account Management Tools (2 tools)
**Expected Behavior**: All tools should fail with exceptions
```
❌ get_all_accounts (exception)
❌ get_account_details (exception)
```

### Transaction Management Tools (3 tools)
**Expected Behavior**: All tools should fail with exceptions  
```
❌ get_transactions (exception)
❌ get_card_transactions (exception)
❌ get_cash_transactions (exception)
```

### Statement Tools (2 tools)
**Expected Behavior**: All tools should fail with exceptions
```
❌ get_card_statements_primary (exception)
❌ get_cash_account_statements (exception)
```

### Write Operation Tools (3 tools)
**Expected Behavior**: Mixed results - 1 success, 2 failures
```
❌ update_expense (exception)
✅ upload_receipt (success)
❌ match_receipt (exception)
```

---

## Troubleshooting

### Issue: "Command not found: node"
**Solution**: Install Node.js from nodejs.org or use package manager
```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt install nodejs npm
```

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"
**Solution**: Install dependencies
```bash
npm install
```

### Issue: "build/ directory not found"
**Solution**: Build the TypeScript project
```bash
npm run build
```

### Issue: "Permission denied" 
**Solution**: Make scripts executable
```bash
chmod +x test_individual_tools.js
```

### Issue: Tests hang or timeout
**Solution**: Check if server is already running
```bash
# Kill any existing node processes
pkill -f "node build/index.js"

# Then restart tests
node test_individual_tools.js
```

---

## Analyzing Results

### 1. Check Summary Statistics
Look for the final summary output:
```
SUMMARY:
Total tools tested: 21
✅ Passed: 3
❌ Failed: 18  
⚠️  No response: 0
```

### 2. Review JSON Report  
Open the generated JSON file for detailed analysis:
```bash
# Find the report file
ls -la tool_testing_report_*.json

# View with formatting
cat tool_testing_report_*.json | jq '.'
```

### 3. Compare MCP vs Direct API
For failed tools, compare the MCP error with direct API response:
- MCP Server: Usually returns 403 Forbidden
- Direct API: Usually returns 401 Unauthorized  
- This discrepancy indicates authentication header issues

---

## Key Metrics to Track

1. **Success Rate**: Should be 3/21 (14.3%) without valid API key
2. **Response Times**: Average ~150-200ms for most tools
3. **Error Patterns**: 18 tools throw exceptions, 3 handle gracefully  
4. **API Consistency**: Raw API should return 401, MCP returns 403

---

## Environment Variables for Real Testing

To test with actual Brex API access:

```bash
# Set real credentials
export BREX_API_KEY="your-actual-brex-api-key-here"
export BREX_API_URL="https://platform.brexapis.com"

# Re-run tests with real credentials
node test_individual_tools.js
```

**Expected Changes with Real API Key**:
- More tools should return successful responses
- Response times may vary based on actual data volume
- Error patterns will change from authentication to data-related errors

---

## Validation Checklist

Use this checklist to ensure your replication is successful:

- [ ] Repository cloned and dependencies installed
- [ ] Build process completed without errors
- [ ] Test script runs and completes all 21 tools
- [ ] 3 tools show success status (get_all_card_expenses, get_card_expense, upload_receipt)  
- [ ] 18 tools show exception status
- [ ] Direct API calls return 401 Unauthorized
- [ ] JSON report file is generated
- [ ] Console output shows colored formatting
- [ ] Response times are reasonable (under 1 second per tool)

---

## Files Generated During Testing

After successful replication, you should have:

1. **`test_individual_tools.js`** - Main testing script
2. **`tool_testing_report_<timestamp>.json`** - Detailed JSON results
3. **`INDIVIDUAL_TOOL_TESTING_REPORT.md`** - Human-readable summary
4. **`TOOL_TESTING_REPLICATION_GUIDE.md`** - This guide

---

## Next Steps

After replicating the tests:

1. **Analyze Patterns**: Review which tools succeed vs fail
2. **Compare Error Handling**: Study the difference between successful and failed tools
3. **Test with Real API Key**: If available, test with actual Brex credentials
4. **Contribute Improvements**: Use findings to enhance error handling consistency

This guide ensures complete reproducibility of the tool testing process across different environments and contexts.