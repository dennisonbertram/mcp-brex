#!/usr/bin/env node

/**
 * Data Volume Simulation Script for Brex MCP Server
 * 
 * Since we can't test with real API data, this script simulates
 * response sizes based on the known response structures and
 * estimates what data volumes would look like with actual data.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Sample data structures based on Brex API documentation
const sampleExpense = {
  id: "expense_12345678901234567890",
  updated_at: "2025-08-26T19:00:00.000Z",
  status: "APPROVED",
  purchased_amount: {
    amount: 15000,
    currency: "USD"
  },
  merchant: {
    raw_descriptor: "UBER TRIP HELP.UBER.COM CA",
    mcc: "4121",
    acceptor_id: "1234567890123456"
  },
  memo: "Business trip transportation",
  budget: {
    id: "budget_12345678901234567890",
    name: "Travel & Transportation",
    limit: {
      amount: 500000,
      currency: "USD"
    }
  },
  card_number: "**** **** **** 1234",
  expense_type: "CARD",
  payment_status: "CLEARED",
  created_at: "2025-08-25T14:30:00.000Z",
  purchased_at: "2025-08-25T14:25:00.000Z",
  receipt_url: "https://s3.amazonaws.com/brex-receipts/receipt_12345.pdf",
  custom_fields: [
    {
      key: "project_code",
      value: "PROJ-2025-001"
    },
    {
      key: "department",
      value: "Engineering"
    }
  ]
};

const sampleTransaction = {
  id: "transaction_12345678901234567890",
  posted_at: "2025-08-26T08:00:00.000Z",
  description: "STRIPE PAYMENT PROCESSING FEE",
  amount: {
    amount: -2500,
    currency: "USD"
  },
  card_number: "**** **** **** 1234",
  merchant: {
    raw_descriptor: "STRIPE PAYMENTS INC",
    mcc: "5734"
  },
  category: "Software",
  status: "SETTLED"
};

const sampleBudget = {
  id: "budget_12345678901234567890",
  name: "Engineering Software Tools",
  description: "Budget for software subscriptions and development tools",
  spend_budget_status: "ACTIVE",
  limit: {
    amount: 1000000,
    currency: "USD"
  },
  current_spend: {
    amount: 450000,
    currency: "USD"
  },
  period: {
    start_date: "2025-08-01T00:00:00.000Z",
    end_date: "2025-08-31T23:59:59.000Z"
  },
  created_at: "2025-08-01T00:00:00.000Z",
  updated_at: "2025-08-26T12:00:00.000Z"
};

// Calculate sizes
const expenseSize = JSON.stringify(sampleExpense).length;
const transactionSize = JSON.stringify(sampleTransaction).length;
const budgetSize = JSON.stringify(sampleBudget).length;

// Simulate response structures
function simulateResponse(itemType, count, summaryOnly = false, fields = null) {
  let items;
  let itemSize;
  
  switch (itemType) {
    case 'expense':
      itemSize = summaryOnly ? expenseSize * 0.3 : expenseSize; // summary_only reduces by ~70%
      items = Array(count).fill(null).map(() => ({})); // placeholder items
      break;
    case 'transaction':
      itemSize = summaryOnly ? transactionSize * 0.4 : transactionSize;
      items = Array(count).fill(null).map(() => ({}));
      break;
    case 'budget':
      itemSize = summaryOnly ? budgetSize * 0.4 : budgetSize;
      items = Array(count).fill(null).map(() => ({}));
      break;
    default:
      itemSize = 500; // generic estimate
      items = Array(count).fill(null).map(() => ({}));
  }
  
  // Apply fields filtering
  if (fields && fields.length > 0) {
    const totalFields = itemType === 'expense' ? 15 : itemType === 'transaction' ? 8 : 10;
    const fieldsRatio = fields.length / totalFields;
    itemSize = Math.round(itemSize * (fieldsRatio + 0.2)); // +0.2 for base structure
  }
  
  const baseResponse = {
    content: [{
      type: "text",
      text: JSON.stringify({
        [`${itemType}s`]: items,
        meta: {
          total_count: count,
          requested_parameters: {},
          summary_applied: summaryOnly
        }
      })
    }]
  };
  
  // Calculate estimated total size
  const baseSize = JSON.stringify(baseResponse).length;
  const estimatedDataSize = itemSize * count;
  
  return {
    estimatedSize: baseSize + estimatedDataSize,
    itemCount: count,
    avgItemSize: itemSize,
    summaryOnly,
    fieldsCount: fields ? fields.length : 'all'
  };
}

async function runDataVolumeSimulation() {
  log('='.repeat(60), colors.cyan);
  log('Brex MCP Server - Data Volume Simulation', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  log('\n📏 SAMPLE DATA SIZES:', colors.blue);
  log(`Full Expense Object: ${formatBytes(expenseSize)}`);
  log(`Full Transaction Object: ${formatBytes(transactionSize)}`);
  log(`Full Budget Object: ${formatBytes(budgetSize)}`);
  
  log('\n🔬 SIMULATED RESPONSE SIZES:', colors.blue);
  
  // Test different scenarios
  const scenarios = [
    // Small requests (should be fine)
    { type: 'expense', count: 5, summaryOnly: true, fields: ['id', 'status', 'purchased_amount.amount'], desc: '5 expenses, summary + key fields' },
    { type: 'expense', count: 10, summaryOnly: true, fields: null, desc: '10 expenses, summary only' },
    
    // Medium requests (potential issues)
    { type: 'expense', count: 50, summaryOnly: true, fields: null, desc: '50 expenses, summary only' },
    { type: 'expense', count: 25, summaryOnly: false, fields: null, desc: '25 expenses, full data' },
    
    // Large requests (likely problematic)
    { type: 'expense', count: 100, summaryOnly: false, fields: null, desc: '100 expenses, full data' },
    { type: 'expense', count: 200, summaryOnly: false, fields: null, desc: '200 expenses, full data' },
    
    // Transaction scenarios
    { type: 'transaction', count: 50, summaryOnly: true, fields: ['id', 'posted_at', 'amount.amount'], desc: '50 transactions, key fields' },
    { type: 'transaction', count: 100, summaryOnly: false, fields: null, desc: '100 transactions, full data' },
    
    // Budget scenarios
    { type: 'budget', count: 20, summaryOnly: false, fields: null, desc: '20 budgets, full data' }
  ];
  
  scenarios.forEach(scenario => {
    const result = simulateResponse(scenario.type, scenario.count, scenario.summaryOnly, scenario.fields);
    let color = colors.green;
    
    if (result.estimatedSize > 1024 * 1024) { // > 1MB
      color = colors.red;
    } else if (result.estimatedSize > 100 * 1024) { // > 100KB
      color = colors.yellow;
    }
    
    log(`  ${scenario.desc}:`, color);
    log(`    Estimated size: ${formatBytes(result.estimatedSize)} (${result.itemCount} items × ${formatBytes(result.avgItemSize)})`, color);
  });
  
  log('\n⚠️  PROBLEMATIC SCENARIOS IDENTIFIED:', colors.red);
  
  const problematicScenarios = [
    'Large date ranges (30+ days) with high transaction volume',
    'Full data requests for 50+ expenses without field filtering',
    'Unrestricted pagination (max_items > 100)',
    'Missing summary_only flag on bulk requests',
    'No field filtering on data-heavy endpoints'
  ];
  
  problematicScenarios.forEach(scenario => {
    log(`  • ${scenario}`, colors.red);
  });
  
  log('\n💡 OPTIMIZATION RECOMMENDATIONS:', colors.green);
  
  const recommendations = [
    'ENFORCE summary_only=true by default for requests > 10 items',
    'LIMIT max_items to 50 for single requests, 200 for paginated requests',
    'REQUIRE field filtering for requests > 25 items',
    'IMPLEMENT response size limits (e.g., 500KB max)',
    'ADD automatic summary mode when response would exceed thresholds',
    'PROVIDE response size warnings to clients',
    'BATCH large requests with window_days parameter'
  ];
  
  recommendations.forEach((rec, index) => {
    log(`  ${index + 1}. ${rec}`, colors.green);
  });
  
  // Test the actual MCP response to see current behavior
  log('\n🧪 TESTING CURRENT MCP BEHAVIOR:', colors.blue);
  await testCurrentBehavior();
}

async function testCurrentBehavior() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'build/index.js')],
    env: { ...process.env, LOG_LEVEL: 'ERROR' }
  });
  
  const client = new Client(
    { name: 'data-simulation-tester', version: '1.0.0' },
    { capabilities: {} }
  );
  
  try {
    await client.connect(transport);
    
    // Test a working tool with extreme parameters
    log('Testing get_all_card_expenses with large parameters...', colors.blue);
    
    const testCases = [
      { page_size: 100, max_items: 500, summary_only: false },
      { page_size: 50, max_items: 200, summary_only: false },
      { page_size: 25, max_items: 100, summary_only: true }
    ];
    
    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const response = await client.callTool({
          name: 'get_all_card_expenses',
          arguments: testCase
        });
        const endTime = Date.now();
        
        const responseSize = JSON.stringify(response).length;
        log(`  ${JSON.stringify(testCase)}:`, colors.green);
        log(`    Response: ${formatBytes(responseSize)} in ${endTime - startTime}ms`, colors.green);
        
        // Check for any size warnings in the response
        const responseText = response?.content?.[0]?.text || '';
        if (responseText.includes('summary_applied')) {
          const parsed = JSON.parse(responseText);
          if (parsed.meta?.summary_applied) {
            log(`    ⚠️  Server auto-applied summary mode`, colors.yellow);
          }
        }
        
      } catch (error) {
        log(`  ${JSON.stringify(testCase)}: ERROR - ${error.message}`, colors.red);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    log(`Failed to test current behavior: ${error.message}`, colors.red);
  } finally {
    try {
      if (typeof transport.close === 'function') {
        await transport.close();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the simulation
if (import.meta.url === `file://${__filename}`) {
  runDataVolumeSimulation().catch(console.error);
}