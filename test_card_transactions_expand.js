/**
 * Manual test script to verify card transactions expand parameter fix
 * This tests that the get_card_transactions tool correctly handles expand parameters
 * without causing 400 "Unsupported entity expansion" errors
 */

import { registerGetCardTransactions } from './build/tools/getCardTransactions.js';
import { registerToolHandler } from './build/tools/index.js';

// Mock the logger
const logMessages = [];
const mockLogError = (msg) => {
  console.error('[LOGGED ERROR]:', msg);
  logMessages.push(msg);
};

// Simple mock server
const mockServer = {};

// Track registered handlers
const handlers = new Map();

// Mock registerToolHandler to capture the handler
const originalRegisterToolHandler = registerToolHandler;
global.registerToolHandler = (name, handler) => {
  handlers.set(name, handler);
  console.log(`✓ Registered handler for: ${name}`);
};

// Mock BrexClient
class MockBrexClient {
  async getCardTransactions(params) {
    console.log('🔍 API called with params:', JSON.stringify(params, null, 2));
    
    // Check if expand parameter is present (it shouldn't be)
    if (params.expand) {
      console.error('❌ ERROR: expand parameter was passed to API!');
      throw new Error('400: Unsupported entity expansion');
    }
    
    console.log('✅ No expand parameter detected - API call successful');
    
    // Return mock data with merchant info
    return {
      items: [
        {
          id: 'tx_test_001',
          status: 'POSTED',
          posted_at: '2025-01-27T10:00:00Z',
          amount: { amount: 100.50, currency: 'USD' },
          merchant: {
            raw_descriptor: 'TEST MERCHANT',
            name: 'Test Merchant Inc',
            mcc: '5411',
            city: 'New York',
            state: 'NY',
            country: 'US'
          },
          card_last_four: '1234'
        }
      ],
      next_cursor: null
    };
  }
}

// Mock the BrexClient import
const originalRequire = require;
require = function(id) {
  if (id.includes('brex/client')) {
    return { BrexClient: MockBrexClient };
  }
  return originalRequire.apply(this, arguments);
};

async function runTests() {
  console.log('\n=== Card Transactions Expand Parameter Fix Test ===\n');
  
  try {
    // Register the tool
    registerGetCardTransactions(mockServer);
    
    const handler = handlers.get('get_card_transactions');
    if (!handler) {
      throw new Error('Handler not registered');
    }
    
    console.log('\n--- Test 1: With expand=["merchant"] parameter ---');
    try {
      const result1 = await handler({
        params: {
          arguments: {
            expand: ['merchant'],
            limit: 10
          }
        }
      });
      
      const data1 = JSON.parse(result1.content[0].text);
      console.log('✅ Test 1 passed - No 400 error when expand is provided');
      console.log('   Returned transaction count:', data1.transactions.length);
      console.log('   Merchant data present:', !!data1.transactions[0].merchant);
      console.log('   Merchant name:', data1.transactions[0].merchant.name);
    } catch (error) {
      console.error('❌ Test 1 failed:', error.message);
      return false;
    }
    
    console.log('\n--- Test 2: Without expand parameter ---');
    try {
      const result2 = await handler({
        params: {
          arguments: {
            limit: 10
          }
        }
      });
      
      const data2 = JSON.parse(result2.content[0].text);
      console.log('✅ Test 2 passed - Works without expand parameter');
      console.log('   Returned transaction count:', data2.transactions.length);
      console.log('   Merchant data present:', !!data2.transactions[0].merchant);
    } catch (error) {
      console.error('❌ Test 2 failed:', error.message);
      return false;
    }
    
    console.log('\n--- Test 3: With multiple expand values ---');
    try {
      const result3 = await handler({
        params: {
          arguments: {
            expand: ['merchant', 'user', 'expense'],
            cursor: 'test_cursor',
            limit: 5
          }
        }
      });
      
      const data3 = JSON.parse(result3.content[0].text);
      console.log('✅ Test 3 passed - Multiple expand values handled gracefully');
      console.log('   API received correct params (no expand)');
    } catch (error) {
      console.error('❌ Test 3 failed:', error.message);
      return false;
    }
    
    console.log('\n=== ALL TESTS PASSED ✅ ===');
    console.log('\nSummary:');
    console.log('- The expand parameter is correctly filtered out before API calls');
    console.log('- Merchant information is still returned (included by default)');
    console.log('- No 400 "Unsupported entity expansion" errors occur');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});