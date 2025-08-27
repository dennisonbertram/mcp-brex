#!/usr/bin/env node

/**
 * Individual Tool Testing Script for Brex MCP Server
 * 
 * This script tests each MCP tool individually and compares responses
 * with direct API calls when tools fail.
 * 
 * Usage: node test_individual_tools.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs/promises';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logging functions
function log(message, color = colors.reset) {
  console.log(`${color}[${new Date().toISOString()}] ${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: {
    platform: process.platform,
    nodeVersion: process.version,
    hasBrexApiKey: !!process.env.BREX_API_KEY
  },
  tools: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    noResponse: 0
  }
};

// Tool test definitions
const toolTests = [
  // Budget Management Tools
  {
    name: 'get_budgets',
    category: 'Budget Management',
    arguments: { limit: 3, summary_only: true },
    apiEndpoint: '/v2/budgets',
    expectsData: true
  },
  {
    name: 'get_budget',
    category: 'Budget Management', 
    arguments: { budget_id: 'budget_test_123', summary_only: true },
    apiEndpoint: '/v2/budgets/budget_test_123',
    expectsData: true
  },
  {
    name: 'get_spend_limits',
    category: 'Budget Management',
    arguments: { limit: 3, summary_only: true },
    apiEndpoint: '/v2/spend_limits',
    expectsData: true
  },
  {
    name: 'get_spend_limit',
    category: 'Budget Management',
    arguments: { id: 'sl_test_123', summary_only: true },
    apiEndpoint: '/v2/spend_limits/sl_test_123',
    expectsData: true
  },
  {
    name: 'get_budget_programs',
    category: 'Budget Management',
    arguments: { limit: 3, summary_only: true },
    apiEndpoint: '/v1/budget_programs',
    expectsData: true
  },
  {
    name: 'get_budget_program',
    category: 'Budget Management',
    arguments: { id: 'bp_test_123', summary_only: true },
    apiEndpoint: '/v1/budget_programs/bp_test_123',
    expectsData: true
  },

  // Expense Management Tools
  {
    name: 'get_expenses',
    category: 'Expense Management',
    arguments: { limit: 3, summary_only: true, fields: ['id', 'status', 'purchased_amount.amount'] },
    apiEndpoint: '/v1/expenses',
    expectsData: true
  },
  {
    name: 'get_all_expenses',
    category: 'Expense Management',
    arguments: { 
      page_size: 3, 
      max_items: 3, 
      summary_only: true,
      start_date: '2025-08-20T00:00:00Z',
      end_date: '2025-08-26T23:59:59Z'
    },
    apiEndpoint: '/v1/expenses',
    expectsData: true
  },
  {
    name: 'get_expense',
    category: 'Expense Management',
    arguments: { expense_id: 'expense_test_123', summary_only: true },
    apiEndpoint: '/v1/expenses/expense_test_123',
    expectsData: true
  },
  {
    name: 'get_all_card_expenses',
    category: 'Expense Management',
    arguments: { 
      page_size: 3, 
      max_items: 3, 
      summary_only: true,
      start_date: '2025-08-20T00:00:00Z',
      end_date: '2025-08-26T23:59:59Z'
    },
    apiEndpoint: '/v1/expenses/card',
    expectsData: true
  },
  {
    name: 'get_card_expense',
    category: 'Expense Management',
    arguments: { expense_id: 'card_expense_test_123', summary_only: true },
    apiEndpoint: '/v1/expenses/card/card_expense_test_123',
    expectsData: true
  },

  // Transaction & Account Management Tools
  {
    name: 'get_all_accounts',
    category: 'Account Management',
    arguments: { page_size: 3, max_items: 3 },
    apiEndpoint: '/v2/accounts/cash',
    expectsData: true
  },
  {
    name: 'get_account_details',
    category: 'Account Management',
    arguments: { accountId: 'account_test_123' },
    apiEndpoint: '/v2/accounts/cash/account_test_123',
    expectsData: true
  },
  {
    name: 'get_transactions',
    category: 'Transaction Management',
    arguments: { accountId: 'account_test_123', limit: 3 },
    apiEndpoint: '/v2/accounts/cash/account_test_123/statements',
    expectsData: true
  },
  {
    name: 'get_card_transactions',
    category: 'Transaction Management',
    arguments: { 
      limit: 3, 
      posted_at_start: '2025-08-20T00:00:00Z',
      summary_only: true,
      fields: ['id', 'posted_at', 'amount.amount']
    },
    apiEndpoint: '/v2/transactions/card/primary',
    expectsData: true
  },
  {
    name: 'get_cash_transactions',
    category: 'Transaction Management',
    arguments: { 
      account_id: 'cash_account_test_123', 
      limit: 3, 
      summary_only: true 
    },
    apiEndpoint: '/v2/transactions/cash/cash_account_test_123',
    expectsData: true
  },

  // Statement Tools
  {
    name: 'get_card_statements_primary',
    category: 'Statements',
    arguments: { limit: 3, summary_only: true },
    apiEndpoint: '/v2/accounts/card/primary/statements',
    expectsData: true
  },
  {
    name: 'get_cash_account_statements',
    category: 'Statements',
    arguments: { account_id: 'cash_account_test_123', limit: 3, summary_only: true },
    apiEndpoint: '/v2/accounts/cash/cash_account_test_123/statements',
    expectsData: true
  },

  // Write Operation Tools (will likely fail without proper setup)
  {
    name: 'update_expense',
    category: 'Write Operations',
    arguments: { 
      expense_id: 'expense_test_123', 
      memo: 'Test memo from MCP tool testing' 
    },
    apiEndpoint: '/v1/expenses/card/expense_test_123',
    expectsData: false,
    isWrite: true
  },
  {
    name: 'upload_receipt',
    category: 'Write Operations',
    arguments: { 
      receipt_data: 'dGVzdCBkYXRh', // base64 for 'test data'
      receipt_name: 'test_receipt.jpg',
      content_type: 'image/jpeg'
    },
    apiEndpoint: '/v1/expenses/card/receipt_upload',
    expectsData: false,
    isWrite: true
  },
  {
    name: 'match_receipt',
    category: 'Write Operations',
    arguments: { 
      receipt_name: 'test_receipt_match.jpg',
      receipt_type: 'expense',
      notify_email: 'test@example.com'
    },
    apiEndpoint: '/v1/expenses/card/receipt_match',
    expectsData: false,
    isWrite: true
  }
];

/**
 * Test an individual MCP tool
 */
async function testTool(client, toolDef) {
  const result = {
    name: toolDef.name,
    category: toolDef.category,
    arguments: toolDef.arguments,
    status: 'unknown',
    response: null,
    error: null,
    hasData: false,
    responseSize: 0,
    executionTime: 0
  };

  info(`Testing tool: ${toolDef.name}`);
  
  const startTime = Date.now();
  
  try {
    const response = await client.callTool({
      name: toolDef.name,
      arguments: toolDef.arguments
    });
    
    result.executionTime = Date.now() - startTime;
    result.response = response;
    
    // Analyze response
    if (!response || !response.content) {
      result.status = 'no_response';
      warning(`No response from ${toolDef.name}`);
    } else if (response.content && response.content.length > 0) {
      result.status = 'success';
      result.hasData = true;
      result.responseSize = JSON.stringify(response).length;
      
      // Check if response indicates an error
      const responseText = response.content[0]?.text || JSON.stringify(response);
      if (responseText.includes('error') || responseText.includes('Error') || 
          responseText.includes('failed') || responseText.includes('Failed')) {
        result.status = 'error_response';
        result.error = 'Tool returned error response';
        error(`${toolDef.name} returned error response`);
      } else {
        success(`${toolDef.name} completed successfully`);
      }
    } else {
      result.status = 'empty_response';
      warning(`Empty response from ${toolDef.name}`);
    }
    
  } catch (err) {
    result.executionTime = Date.now() - startTime;
    result.status = 'exception';
    result.error = err.message;
    error(`${toolDef.name} threw exception: ${err.message}`);
  }
  
  return result;
}

/**
 * Make a direct API call for comparison
 */
async function testDirectAPI(toolDef) {
  info(`Testing direct API call for ${toolDef.name}: ${toolDef.apiEndpoint}`);
  
  const apiKey = process.env.BREX_API_KEY || 'fake-test-key';
  const baseUrl = process.env.BREX_API_URL || 'https://platform.brexapis.com';
  
  try {
    // Use Node.js native fetch (available in Node 18+)
    const response = await fetch(`${baseUrl}${toolDef.apiEndpoint}`, {
      method: toolDef.isWrite ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      ...(toolDef.isWrite && toolDef.arguments ? { body: JSON.stringify(toolDef.arguments) } : {})
    });
    
    const result = {
      endpoint: toolDef.apiEndpoint,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: null
    };
    
    // Try to get response body
    try {
      const text = await response.text();
      result.body = text || '(empty)';
    } catch (bodyError) {
      result.body = `Error reading body: ${bodyError.message}`;
    }
    
    return result;
    
  } catch (err) {
    return {
      endpoint: toolDef.apiEndpoint,
      error: err.message,
      status: 'network_error'
    };
  }
}

/**
 * Main testing function
 */
async function runToolTests() {
  log('Starting Individual Tool Testing for Brex MCP Server', colors.cyan);
  log('=' * 60, colors.cyan);
  
  // Create MCP client
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'build/index.js')],
    env: { ...process.env, LOG_LEVEL: 'ERROR' } // Reduce noise in logs
  });
  
  const client = new Client(
    { name: 'individual-tool-tester', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );
  
  try {
    // Connect to server
    info('Connecting to MCP server...');
    await client.connect(transport);
    success('Connected to MCP server');
    
    // Test each tool
    testResults.summary.total = toolTests.length;
    
    for (const toolDef of toolTests) {
      log(`\n${'='.repeat(50)}`, colors.magenta);
      log(`Testing: ${toolDef.name} (${toolDef.category})`, colors.magenta);
      log(`Arguments: ${JSON.stringify(toolDef.arguments, null, 2)}`, colors.blue);
      
      // Test the MCP tool
      const toolResult = await testTool(client, toolDef);
      testResults.tools.push({
        ...toolResult,
        apiComparison: null
      });
      
      // Update summary
      if (toolResult.status === 'success') {
        testResults.summary.passed++;
      } else if (toolResult.status === 'no_response' || toolResult.status === 'empty_response') {
        testResults.summary.noResponse++;
      } else {
        testResults.summary.failed++;
      }
      
      // If tool failed or returned no data, test direct API
      if (toolResult.status !== 'success' || !toolResult.hasData) {
        log('Tool failed or returned no data. Testing direct API call...', colors.yellow);
        const apiResult = await testDirectAPI(toolDef);
        
        // Add API comparison to the last tool result
        testResults.tools[testResults.tools.length - 1].apiComparison = apiResult;
        
        // Log API result
        if (apiResult.error) {
          error(`Direct API call failed: ${apiResult.error}`);
        } else {
          info(`Direct API returned ${apiResult.status} ${apiResult.statusText}`);
          if (apiResult.body && apiResult.body !== '(empty)') {
            log(`Response preview: ${apiResult.body.substring(0, 200)}...`);
          }
        }
      }
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (err) {
    error(`Test execution failed: ${err.message}`);
  } finally {
    // Clean up
    try {
      if (typeof transport.close === 'function') {
        await transport.close();
      }
    } catch (e) {
      warning(`Error closing transport: ${e.message}`);
    }
  }
  
  // Generate final report
  await generateReport();
}

/**
 * Generate comprehensive test report
 */
async function generateReport() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('TEST EXECUTION COMPLETE', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  // Console summary
  log(`\nSUMMARY:`, colors.magenta);
  log(`Total tools tested: ${testResults.summary.total}`);
  success(`Passed: ${testResults.summary.passed}`);
  error(`Failed: ${testResults.summary.failed}`);
  warning(`No response: ${testResults.summary.noResponse}`);
  
  // Group results by category
  const byCategory = {};
  for (const result of testResults.tools) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  }
  
  log(`\nRESULTS BY CATEGORY:`, colors.magenta);
  for (const [category, results] of Object.entries(byCategory)) {
    log(`\n${category}:`, colors.blue);
    for (const result of results) {
      const status = result.status === 'success' ? '✅' : 
                    result.status.includes('no_response') || result.status.includes('empty') ? '⚠️' : '❌';
      log(`  ${status} ${result.name} (${result.status})`);
    }
  }
  
  // Save detailed report to file
  const reportContent = JSON.stringify(testResults, null, 2);
  const reportFile = `tool_testing_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  try {
    await fs.writeFile(reportFile, reportContent, 'utf8');
    success(`Detailed report saved to: ${reportFile}`);
  } catch (err) {
    error(`Failed to save report: ${err.message}`);
  }
  
  log(`\nReport generation complete!`, colors.green);
}

// Run the tests
if (import.meta.url === `file://${__filename}`) {
  runToolTests().catch(console.error);
}