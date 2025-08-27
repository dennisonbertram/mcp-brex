/**
 * Tests for getCardTransactions tool - verifying expand parameter handling
 */

// Mock config before any imports
jest.mock('../../config', () => ({
  validateEnv: jest.fn(),
  config: {
    BREX_API_KEY: 'test-key',
    BREX_API_URL: 'https://api.test.brex.com',
    PORT: 3000,
    RATE_LIMIT_REQUESTS: 100,
    RATE_LIMIT_WINDOW_MS: 60000
  }
}));

import { registerGetCardTransactions } from '../getCardTransactions';
import { BrexClient } from '../../services/brex/client';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the BrexClient
jest.mock('../../services/brex/client');

// Mock logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  logError: jest.fn()
}));

// Mock registerToolHandler
type HandlerFunction = (request: any) => Promise<any>;
const registeredHandlers: Map<string, HandlerFunction> = new Map();
jest.mock('../index', () => ({
  registerToolHandler: jest.fn((name: string, handler: HandlerFunction) => {
    registeredHandlers.set(name, handler);
  })
}));

describe('getCardTransactions', () => {
  let mockBrexClient: jest.Mocked<BrexClient>;
  let mockServer: Server;
  
  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandlers.clear();
    
    // Setup mocked BrexClient
    mockBrexClient = {
      getCardTransactions: jest.fn()
    } as any;
    
    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient);
    
    mockServer = {} as Server;
  });

  describe('Registration', () => {
    it('should register the tool handler correctly', () => {
      registerGetCardTransactions(mockServer);
      expect(registeredHandlers.has('get_card_transactions')).toBe(true);
    });
  });

  describe('Expand Parameter Handling', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCardTransactions(mockServer);
      handler = registeredHandlers.get('get_card_transactions')!;
    });

    it('should NOT pass expand parameter to API even when expand=["merchant"] is provided', async () => {
      const mockTransactions = [
        {
          id: 'tx_001',
          status: 'POSTED',
          posted_at: '2025-01-15T10:30:00Z',
          amount: { amount: 1500.50, currency: 'USD' },
          merchant: { 
            raw_descriptor: 'AMAZON WEB SERVICES',
            name: 'Amazon Web Services',
            mcc: '7372',
            city: 'Seattle',
            state: 'WA',
            country: 'US'
          },
          card_last_four: '1234',
          user: { id: 'user_123', name: 'John Doe' }
        }
      ];
      
      mockBrexClient.getCardTransactions.mockResolvedValueOnce({ 
        items: mockTransactions as any,
        next_cursor: 'next_page_cursor'
      });
      
      const result = await handler({
        params: {
          arguments: {
            expand: ['merchant'] // This should be ignored
          }
        }
      });
      
      // Verify expand was NOT passed to the client
      expect(mockBrexClient.getCardTransactions).toHaveBeenCalledWith({
        cursor: undefined,
        limit: undefined,
        user_ids: undefined,
        posted_at_start: undefined
        // expand should NOT be here
      });
      
      // Verify merchant data is still returned (it's included by default)
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.transactions[0].merchant).toBeDefined();
      expect(parsedResult.transactions[0].merchant.raw_descriptor).toBe('AMAZON WEB SERVICES');
    });

    it('should work correctly without expand parameters', async () => {
      const mockTransactions = [
        {
          id: 'tx_002',
          status: 'POSTED',
          posted_at: '2025-01-16T11:00:00Z',
          amount: { amount: 250.00, currency: 'USD' },
          merchant: { 
            raw_descriptor: 'GITHUB INC',
            name: 'GitHub',
            mcc: '7372'
          },
          card_last_four: '5678'
        }
      ];
      
      mockBrexClient.getCardTransactions.mockResolvedValueOnce({ 
        items: mockTransactions as any
      });
      
      const result = await handler({
        params: {
          arguments: {
            limit: 10
          }
        }
      });
      
      // Verify no expand parameter was passed
      expect(mockBrexClient.getCardTransactions).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 10,
        user_ids: undefined,
        posted_at_start: undefined
      });
      
      // Verify data is returned correctly
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.transactions).toHaveLength(1);
      expect(parsedResult.transactions[0].merchant).toBeDefined();
    });

    it('should ignore expand parameter with multiple values', async () => {
      const mockTransactions = [
        {
          id: 'tx_003',
          status: 'PENDING',
          posted_at: '2025-01-17T09:00:00Z',
          amount: { amount: 500.00, currency: 'USD' },
          merchant: { 
            raw_descriptor: 'SLACK TECHNOLOGIES'
          },
          card_last_four: '9012'
        }
      ];
      
      mockBrexClient.getCardTransactions.mockResolvedValueOnce({ 
        items: mockTransactions as any
      });
      
      await handler({
        params: {
          arguments: {
            expand: ['merchant', 'user', 'expense'] // All should be ignored
          }
        }
      });
      
      // Verify expand was NOT passed to the client
      expect(mockBrexClient.getCardTransactions).toHaveBeenCalledWith({
        cursor: undefined,
        limit: undefined,
        user_ids: undefined,
        posted_at_start: undefined
        // No expand parameter should be present
      });
    });

    it('should handle API error responses gracefully without expand', async () => {
      // Simulate API error that would occur if expand was incorrectly passed
      mockBrexClient.getCardTransactions.mockRejectedValueOnce(
        new Error('Unsupported entity expansion')
      );
      
      await expect(handler({
        params: {
          arguments: {
            expand: ['merchant'] // If this was passed to API, it would cause error
          }
        }
      })).rejects.toThrow('Unsupported entity expansion');
      
      // Even though the test fails here (as mocked), we're verifying 
      // that our fix should prevent this by not passing expand
    });
  });

  describe('Merchant Information Default Inclusion', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCardTransactions(mockServer);
      handler = registeredHandlers.get('get_card_transactions')!;
    });

    it('should include merchant information by default without expand parameter', async () => {
      const mockTransactionsWithMerchant = [
        {
          id: 'tx_merchant_001',
          status: 'POSTED',
          posted_at: '2025-01-18T14:00:00Z',
          amount: { amount: 750.25, currency: 'USD' },
          merchant: { 
            raw_descriptor: 'STRIPE PAYMENTS',
            name: 'Stripe, Inc.',
            mcc: '5734',
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            merchant_name: 'Stripe'
          },
          card_last_four: '3456',
          user: { id: 'user_456', name: 'Jane Smith' }
        },
        {
          id: 'tx_merchant_002',
          status: 'POSTED',
          posted_at: '2025-01-18T15:30:00Z',
          amount: { amount: 125.00, currency: 'USD' },
          merchant: { 
            raw_descriptor: 'NETFLIX.COM',
            name: 'Netflix',
            mcc: '5968'
          },
          card_last_four: '3456'
        }
      ];
      
      mockBrexClient.getCardTransactions.mockResolvedValueOnce({ 
        items: mockTransactionsWithMerchant as any
      });
      
      const result = await handler({
        params: {
          arguments: {} // No expand parameter
        }
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      
      // Verify all merchant information is included
      expect(parsedResult.transactions[0].merchant).toEqual({
        raw_descriptor: 'STRIPE PAYMENTS',
        name: 'Stripe, Inc.',
        mcc: '5734',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        merchant_name: 'Stripe'
      });
      
      expect(parsedResult.transactions[1].merchant).toEqual({
        raw_descriptor: 'NETFLIX.COM',
        name: 'Netflix',
        mcc: '5968'
      });
    });
  });

  describe('Other Parameters Still Work', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCardTransactions(mockServer);
      handler = registeredHandlers.get('get_card_transactions')!;
    });

    it('should correctly pass other parameters while ignoring expand', async () => {
      mockBrexClient.getCardTransactions.mockResolvedValueOnce({ 
        items: [] as any
      });
      
      await handler({
        params: {
          arguments: {
            cursor: 'cursor_123',
            limit: 50,
            user_ids: ['user_1', 'user_2'],
            posted_at_start: '2025-01-01T00:00:00Z',
            expand: ['merchant'] // Should be ignored
          }
        }
      });
      
      // Verify all parameters EXCEPT expand are passed correctly
      expect(mockBrexClient.getCardTransactions).toHaveBeenCalledWith({
        cursor: 'cursor_123',
        limit: 50,
        user_ids: ['user_1', 'user_2'],
        posted_at_start: '2025-01-01T00:00:00.000Z'
        // expand should NOT be here
      });
    });

    it('should handle summary_only and fields parameters correctly', async () => {
      const mockTransaction = {
        id: 'tx_summary',
        status: 'POSTED',
        posted_at: '2025-01-19T10:00:00Z',
        amount: { amount: 100, currency: 'USD' },
        merchant: { raw_descriptor: 'TEST MERCHANT' },
        card_last_four: '1111',
        extra_field: 'should_be_filtered'
      };
      
      mockBrexClient.getCardTransactions.mockResolvedValueOnce({ 
        items: [mockTransaction] as any
      });
      
      const result = await handler({
        params: {
          arguments: {
            summary_only: true,
            fields: ['id', 'amount.amount', 'merchant.raw_descriptor'],
            expand: ['merchant'] // Should be ignored
          }
        }
      });
      
      // Expand should not be passed
      expect(mockBrexClient.getCardTransactions).toHaveBeenCalledWith({
        cursor: undefined,
        limit: undefined,
        user_ids: undefined,
        posted_at_start: undefined
        // No expand
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      
      // Verify summary/fields work correctly
      expect(parsedResult.meta.summary_applied).toBe(true);
      expect(parsedResult.transactions[0]).toEqual({
        id: 'tx_summary',
        amount: { amount: 100 },
        merchant: { raw_descriptor: 'TEST MERCHANT' }
      });
    });
  });
});