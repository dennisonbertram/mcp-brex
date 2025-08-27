#!/usr/bin/env node

/**
 * Data Volume Testing Script for Brex MCP Server
 * 
 * This script specifically tests response sizes and data volumes
 * to identify tools that return excessive data amounts.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs/promises';

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

function log(message, color = colors.reset) {
  console.log(`${color}[${new Date().toISOString()}] ${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDataSizeCategory(bytes) {
  if (bytes < 1024) return 'TINY';
  if (bytes < 10240) return 'SMALL';  // < 10KB
  if (bytes < 102400) return 'MEDIUM'; // < 100KB
  if (bytes < 1048576) return 'LARGE'; // < 1MB
  return 'EXCESSIVE'; // >= 1MB
}

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: {
    hasBrexApiKey: !!process.env.BREX_API_KEY,
    apiKeyLength: process.env.BREX_API_KEY ? process.env.BREX_API_KEY.length : 0
  },
  dataVolumeTests: [],
  summary: {
    totalTests: 0,
    avgResponseSize: 0,
    largestResponse: 0,
    largestTool: '',
    excessiveDataTools: [],
    sizeCategoryCounts: {
      TINY: 0,
      SMALL: 0,
      MEDIUM: 0,
      LARGE: 0,
      EXCESSIVE: 0
    }
  }
};

// Data volume test scenarios
const dataVolumeTests = [
  // Test different limits to see data scaling
  {
    name: 'get_all_card_expenses',
    category: 'Expense Volume Test',
    scenarios: [
      { args: { page_size: 1, max_items: 1, summary_only: true }, expected: 'TINY' },
      { args: { page_size: 5, max_items: 5, summary_only: true }, expected: 'SMALL' },
      { args: { page_size: 10, max_items: 10, summary_only: true }, expected: 'SMALL' },
      { args: { page_size: 50, max_items: 50, summary_only: true }, expected: 'MEDIUM' },
      { args: { page_size: 50, max_items: 50, summary_only: false }, expected: 'LARGE' },
      { args: { page_size: 100, max_items: 100, summary_only: false }, expected: 'EXCESSIVE' }
    ]
  },
  {
    name: 'get_all_expenses',
    category: 'Expense Volume Test',
    scenarios: [
      { args: { page_size: 1, max_items: 1, summary_only: true }, expected: 'TINY' },
      { args: { page_size: 10, max_items: 10, summary_only: true }, expected: 'SMALL' },
      { args: { page_size: 50, max_items: 50, summary_only: false }, expected: 'LARGE' }
    ]
  },
  {
    name: 'get_card_transactions',
    category: 'Transaction Volume Test',
    scenarios: [
      { 
        args: { 
          limit: 5, 
          posted_at_start: '2025-08-25T00:00:00Z',
          summary_only: true,
          fields: ['id', 'posted_at', 'amount.amount']
        }, 
        expected: 'SMALL' 
      },
      {
        args: { 
          limit: 50, 
          posted_at_start: '2025-08-20T00:00:00Z',
          summary_only: false
        }, 
        expected: 'LARGE' 
      }
    ]
  },
  {
    name: 'get_budgets',
    category: 'Budget Volume Test', 
    scenarios: [
      { args: { limit: 5, summary_only: true }, expected: 'SMALL' },
      { args: { limit: 20, summary_only: false }, expected: 'MEDIUM' }
    ]
  },
  // Test fields filtering effectiveness
  {
    name: 'get_all_card_expenses',
    category: 'Fields Filtering Test',
    scenarios: [
      { 
        args: { 
          page_size: 10, 
          max_items: 10, 
          summary_only: true,
          fields: ['id'] 
        }, 
        expected: 'TINY',
        description: 'Minimal fields' 
      },
      { 
        args: { 
          page_size: 10, 
          max_items: 10, 
          summary_only: true,
          fields: ['id', 'status', 'purchased_amount.amount', 'merchant.raw_descriptor']
        }, 
        expected: 'SMALL',
        description: 'Key fields only' 
      },
      { 
        args: { 
          page_size: 10, 
          max_items: 10, 
          summary_only: false
        }, 
        expected: 'LARGE',
        description: 'All fields' 
      }
    ]
  },
  // Test date range impact
  {
    name: 'get_all_card_expenses',
    category: 'Date Range Impact Test',
    scenarios: [
      { 
        args: { 
          page_size: 50, 
          max_items: 50,
          start_date: '2025-08-26T00:00:00Z',
          end_date: '2025-08-26T23:59:59Z',
          summary_only: true
        }, 
        expected: 'SMALL',
        description: '1 day range' 
      },
      { 
        args: { 
          page_size: 50, 
          max_items: 50,
          start_date: '2025-08-20T00:00:00Z', 
          end_date: '2025-08-26T23:59:59Z',
          summary_only: true
        }, 
        expected: 'MEDIUM',
        description: '7 day range' 
      },
      { 
        args: { 
          page_size: 50, 
          max_items: 50,
          start_date: '2025-07-01T00:00:00Z',
          end_date: '2025-08-26T23:59:59Z', 
          summary_only: true
        }, 
        expected: 'LARGE',
        description: '2 month range' 
      }
    ]
  }
];

async function testToolDataVolume(client, toolName, scenario, scenarioIndex) {
  log(`  Scenario ${scenarioIndex + 1}: ${scenario.description || JSON.stringify(scenario.args).substring(0, 60)}...`, colors.blue);
  
  const startTime = Date.now();
  const result = {
    tool: toolName,
    scenario: scenarioIndex + 1,
    description: scenario.description || 'Standard test',
    arguments: scenario.args,
    expected: scenario.expected,
    status: 'unknown',
    responseSize: 0,
    sizeCategory: 'UNKNOWN',
    executionTime: 0,
    error: null,
    hasData: false,
    dataMetrics: {
      itemCount: 0,
      avgItemSize: 0
    }
  };

  try {
    const response = await client.callTool({
      name: toolName,
      arguments: scenario.args
    });
    
    result.executionTime = Date.now() - startTime;
    
    if (response && response.content) {
      const responseText = JSON.stringify(response);
      result.responseSize = Buffer.byteLength(responseText, 'utf8');
      result.sizeCategory = getDataSizeCategory(result.responseSize);
      result.status = 'success';
      result.hasData = true;
      
      // Try to extract item count for metrics
      try {
        const content = response.content[0]?.text || '';
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.card_expenses) {
            result.dataMetrics.itemCount = parsed.card_expenses.length;
          } else if (parsed.expenses) {
            result.dataMetrics.itemCount = parsed.expenses.length;
          } else if (parsed.items) {
            result.dataMetrics.itemCount = parsed.items.length;
          }
          
          if (result.dataMetrics.itemCount > 0) {
            result.dataMetrics.avgItemSize = Math.round(result.responseSize / result.dataMetrics.itemCount);
          }
        }
      } catch (parseError) {
        // Ignore parsing errors, just track overall size
      }
      
      // Log results with appropriate coloring
      const sizeText = formatBytes(result.responseSize);
      let sizeColor = colors.green;
      if (result.sizeCategory === 'LARGE') sizeColor = colors.yellow;
      if (result.sizeCategory === 'EXCESSIVE') sizeColor = colors.red;
      
      log(`    ✅ ${sizeText} (${result.sizeCategory}) - ${result.dataMetrics.itemCount} items`, sizeColor);
      
    } else {
      result.status = 'no_response';
      result.responseSize = 0;
      result.sizeCategory = 'TINY';
      log(`    ⚠️  No response received`, colors.yellow);
    }
    
  } catch (error) {
    result.executionTime = Date.now() - startTime;
    result.status = 'error';
    result.error = error.message;
    result.responseSize = 0;
    result.sizeCategory = 'TINY';
    
    log(`    ❌ Error: ${error.message}`, colors.red);
  }
  
  return result;
}

async function runDataVolumeTests() {
  log('Starting Data Volume Testing for Brex MCP Server', colors.cyan);
  log('=' * 60, colors.cyan);
  
  if (!process.env.BREX_API_KEY) {
    log('WARNING: No BREX_API_KEY found. Tests will likely fail with authentication errors.', colors.yellow);
    log('Set BREX_API_KEY environment variable for realistic testing.', colors.yellow);
  }
  
  // Create MCP client
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'build/index.js')],
    env: { ...process.env, LOG_LEVEL: 'ERROR' }
  });
  
  const client = new Client(
    { name: 'data-volume-tester', version: '1.0.0' },
    { capabilities: { prompts: {}, resources: {}, tools: {} } }
  );
  
  try {
    log('Connecting to MCP server...', colors.blue);
    await client.connect(transport);
    log('Connected successfully', colors.green);
    
    let totalResponseSize = 0;
    let successfulTests = 0;
    
    for (const testGroup of dataVolumeTests) {
      log(`\n${'='.repeat(50)}`, colors.magenta);
      log(`Testing: ${testGroup.name} (${testGroup.category})`, colors.magenta);
      
      for (let i = 0; i < testGroup.scenarios.length; i++) {
        const scenario = testGroup.scenarios[i];
        const result = await testToolDataVolume(client, testGroup.name, scenario, i);
        
        testResults.dataVolumeTests.push(result);
        testResults.summary.totalTests++;
        testResults.summary.sizeCategoryCounts[result.sizeCategory]++;
        
        if (result.status === 'success') {
          totalResponseSize += result.responseSize;
          successfulTests++;
          
          // Track largest response
          if (result.responseSize > testResults.summary.largestResponse) {
            testResults.summary.largestResponse = result.responseSize;
            testResults.summary.largestTool = `${testGroup.name} (scenario ${i + 1})`;
          }
          
          // Track tools with excessive data
          if (result.sizeCategory === 'EXCESSIVE' || result.sizeCategory === 'LARGE') {
            testResults.summary.excessiveDataTools.push({
              tool: testGroup.name,
              scenario: i + 1,
              size: result.responseSize,
              category: result.sizeCategory
            });
          }
        }
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (successfulTests > 0) {
      testResults.summary.avgResponseSize = Math.round(totalResponseSize / successfulTests);
    }
    
  } catch (error) {
    log(`Test execution failed: ${error.message}`, colors.red);
  } finally {
    try {
      if (typeof transport.close === 'function') {
        await transport.close();
      }
    } catch (e) {
      log(`Error closing transport: ${e.message}`, colors.yellow);
    }
  }
  
  await generateDataVolumeReport();
}

async function generateDataVolumeReport() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('DATA VOLUME TEST RESULTS', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  // Console summary
  const summary = testResults.summary;
  log(`\nOVERALL SUMMARY:`, colors.magenta);
  log(`Total tests run: ${summary.totalTests}`);
  log(`Average response size: ${formatBytes(summary.avgResponseSize)}`);
  log(`Largest response: ${formatBytes(summary.largestResponse)} (${summary.largestTool})`);
  
  log(`\nSIZE DISTRIBUTION:`, colors.magenta);
  log(`  TINY (< 1KB): ${summary.sizeCategoryCounts.TINY} tests`);
  log(`  SMALL (1-10KB): ${summary.sizeCategoryCounts.SMALL} tests`);
  log(`  MEDIUM (10-100KB): ${summary.sizeCategoryCounts.MEDIUM} tests`);
  log(`  LARGE (100KB-1MB): ${summary.sizeCategoryCounts.LARGE} tests`, colors.yellow);
  log(`  EXCESSIVE (> 1MB): ${summary.sizeCategoryCounts.EXCESSIVE} tests`, colors.red);
  
  if (summary.excessiveDataTools.length > 0) {
    log(`\n⚠️  TOOLS WITH LARGE RESPONSES:`, colors.red);
    for (const tool of summary.excessiveDataTools) {
      log(`  ${tool.tool} (scenario ${tool.scenario}): ${formatBytes(tool.size)} (${tool.category})`, colors.red);
    }
  }
  
  // Show top 5 largest responses
  const sortedTests = testResults.dataVolumeTests
    .filter(t => t.status === 'success')
    .sort((a, b) => b.responseSize - a.responseSize)
    .slice(0, 5);
  
  if (sortedTests.length > 0) {
    log(`\nTOP 5 LARGEST RESPONSES:`, colors.magenta);
    sortedTests.forEach((test, index) => {
      const color = test.sizeCategory === 'EXCESSIVE' ? colors.red : 
                   test.sizeCategory === 'LARGE' ? colors.yellow : colors.green;
      log(`  ${index + 1}. ${test.tool} - ${formatBytes(test.responseSize)} (${test.dataMetrics.itemCount} items)`, color);
    });
  }
  
  // Performance insights
  log(`\nPERFORMANCE INSIGHTS:`, colors.magenta);
  
  const fieldsFilteringTests = testResults.dataVolumeTests.filter(t => 
    t.tool === 'get_all_card_expenses' && t.description && t.description.includes('fields')
  );
  
  if (fieldsFilteringTests.length >= 2) {
    const minimalFields = fieldsFilteringTests.find(t => t.description === 'Minimal fields');
    const allFields = fieldsFilteringTests.find(t => t.description === 'All fields');
    
    if (minimalFields && allFields && minimalFields.status === 'success' && allFields.status === 'success') {
      const reduction = ((allFields.responseSize - minimalFields.responseSize) / allFields.responseSize * 100).toFixed(1);
      log(`  Fields filtering reduces response size by ~${reduction}%`);
    }
  }
  
  const summaryTests = testResults.dataVolumeTests.filter(t => 
    t.arguments.summary_only !== undefined
  );
  const summaryOnlyTests = summaryTests.filter(t => t.arguments.summary_only === true && t.status === 'success');
  const fullDataTests = summaryTests.filter(t => t.arguments.summary_only === false && t.status === 'success');
  
  if (summaryOnlyTests.length > 0 && fullDataTests.length > 0) {
    const avgSummarySize = summaryOnlyTests.reduce((sum, t) => sum + t.responseSize, 0) / summaryOnlyTests.length;
    const avgFullSize = fullDataTests.reduce((sum, t) => sum + t.responseSize, 0) / fullDataTests.length;
    const reduction = ((avgFullSize - avgSummarySize) / avgFullSize * 100).toFixed(1);
    log(`  summary_only reduces response size by ~${reduction}%`);
  }
  
  // Save detailed report
  const reportContent = JSON.stringify(testResults, null, 2);
  const reportFile = `data_volume_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  try {
    await fs.writeFile(reportFile, reportContent, 'utf8');
    log(`\n✅ Detailed report saved to: ${reportFile}`, colors.green);
  } catch (err) {
    log(`❌ Failed to save report: ${err.message}`, colors.red);
  }
  
  log(`\nData volume testing complete!`, colors.green);
}

// Run the tests
if (import.meta.url === `file://${__filename}`) {
  runDataVolumeTests().catch(console.error);
}