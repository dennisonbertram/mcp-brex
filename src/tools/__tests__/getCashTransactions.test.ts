/**
 * Tests for getCashTransactions tool - verifying complete object return without summary logic
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

import { registerGetCashTransactions } from '../getCashTransactions';
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

describe('getCashTransactions', () => {
  let mockBrexClient: jest.Mocked<BrexClient>;
  let mockServer: Server;
  
  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandlers.clear();
    
    // Setup mocked BrexClient
    mockBrexClient = {
      getCashTransactions: jest.fn()
    } as any;
    
    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient);
    
    mockServer = {} as Server;
  });

  describe('Registration', () => {
    it('should register the tool handler correctly', () => {
      registerGetCashTransactions(mockServer);
      expect(registeredHandlers.has('get_cash_transactions')).toBe(true);
    });
  });

  describe('Parameter Validation', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCashTransactions(mockServer);
      handler = registeredHandlers.get('get_cash_transactions')!;
    });

    it('should require account_id parameter', async () => {
      await expect(handler({ params: { arguments: {} } }))
        .rejects.toThrow('Missing required parameter: account_id');
    });

    it('should accept valid parameters', async () => {
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ items: [] });
      
      await expect(handler({
        params: {
          arguments: {
            account_id: 'test_account_123',
            limit: 50,
            cursor: 'cursor_abc',
            posted_at_start: '2025-01-01T00:00:00Z'
          }
        }
      })).resolves.toBeTruthy();
      
      expect(mockBrexClient.getCashTransactions).toHaveBeenCalledWith(
        'test_account_123',
        {
          limit: 50,
          cursor: 'cursor_abc',
          posted_at_start: '2025-01-01T00:00:00.000Z',
          expand: undefined
        }
      );
    });

    it('should validate limit parameter', async () => {
      await expect(handler({
        params: { arguments: { account_id: 'test', limit: 0 } }
      })).rejects.toThrow('Invalid limit');
      
      await expect(handler({
        params: { arguments: { account_id: 'test', limit: 101 } }
      })).rejects.toThrow('Invalid limit');
      
      await expect(handler({
        params: { arguments: { account_id: 'test', limit: 'invalid' } }
      })).rejects.toThrow('Invalid limit');
    });

    it('should NOT accept summary_only parameter', async () => {
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ items: [] });
      
      // The tool should work but ignore summary_only since it's removed
      await handler({
        params: {
          arguments: {
            account_id: 'test_account_123',
            summary_only: true // This should be ignored
          }
        }
      });
      
      // Verify the API was called correctly without summary logic
      expect(mockBrexClient.getCashTransactions).toHaveBeenCalledWith(
        'test_account_123',
        {
          cursor: undefined,
          limit: undefined,
          posted_at_start: undefined,
          expand: undefined
        }
      );
    });

    it('should NOT accept fields parameter', async () => {
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ items: [] });
      
      // The tool should work but ignore fields since it's removed
      await handler({
        params: {
          arguments: {
            account_id: 'test_account_123',
            fields: ['id', 'amount'] // This should be ignored
          }
        }
      });
      
      // Verify the API was called correctly
      expect(mockBrexClient.getCashTransactions).toHaveBeenCalledWith(
        'test_account_123',
        {
          cursor: undefined,
          limit: undefined,
          posted_at_start: undefined,
          expand: undefined
        }
      );
    });
  });

  describe('Complete Object Return', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCashTransactions(mockServer);
      handler = registeredHandlers.get('get_cash_transactions')!;
    });

    it('should return complete transaction objects without any field filtering', async () => {
      const mockTransactions = [
        {
          id: 'tx_001',
          initiated_at_date: '2025-01-15T10:00:00Z',
          posted_at_date: '2025-01-15T10:30:00Z',
          amount: { amount: 1500.50, currency: 'USD' },
          description: 'Wire Transfer',
          type: 'PAYMENT',
          transfer_id: 'transfer_001',
          merchant: { name: 'Tech Corp', category: 'Technology' },
          user: { id: 'user_123', name: 'John Doe' },
          metadata: { reference_id: 'ref_abc', notes: 'Q1 payment' },
          additional_field_1: 'value1',
          additional_field_2: { nested: 'value2' }
        },
        {
          id: 'tx_002',
          initiated_at_date: '2025-01-14T08:00:00Z',
          posted_at_date: '2025-01-14T08:15:00Z',
          amount: { amount: 250.00, currency: 'USD' },
          description: 'ACH Payment',
          type: 'PAYMENT',
          transfer_id: 'transfer_002',
          merchant: { name: 'Office Supplies Inc', category: 'Supplies' },
          user: { id: 'user_456', name: 'Jane Smith' },
          metadata: { reference_id: 'ref_def', notes: 'Monthly subscription' },
          additional_field_1: 'value3',
          additional_field_2: { nested: 'value4' }
        }
      ];
      
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ 
        items: mockTransactions as any,
        next_cursor: 'next_page_cursor'
      });
      
      const result = await handler({
        params: {
          arguments: {
            account_id: 'test_account_123',
            limit: 10
          }
        }
      });
      
      // Parse the result
      const parsedResult = JSON.parse(result.content[0].text);
      
      // Verify complete objects are returned
      expect(parsedResult.transactions).toEqual(mockTransactions);
      expect(parsedResult.transactions[0]).toHaveProperty('id');
      expect(parsedResult.transactions[0]).toHaveProperty('initiated_at_date');
      expect(parsedResult.transactions[0]).toHaveProperty('posted_at_date');
      expect(parsedResult.transactions[0]).toHaveProperty('amount');
      expect(parsedResult.transactions[0]).toHaveProperty('description');
      expect(parsedResult.transactions[0]).toHaveProperty('merchant');
      expect(parsedResult.transactions[0]).toHaveProperty('user');
      expect(parsedResult.transactions[0]).toHaveProperty('metadata');
      expect(parsedResult.transactions[0]).toHaveProperty('additional_field_1');
      expect(parsedResult.transactions[0]).toHaveProperty('additional_field_2');
      
      // Verify metadata
      expect(parsedResult.meta).toEqual({
        count: 2,
        next_cursor: 'next_page_cursor'
      });
      
      // Ensure NO summary_applied field exists
      expect(parsedResult.meta).not.toHaveProperty('summary_applied');
    });

    it('should handle empty transaction list', async () => {
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ 
        items: []
      });
      
      const result = await handler({
        params: {
          arguments: {
            account_id: 'test_account_123'
          }
        }
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      
      expect(parsedResult.transactions).toEqual([]);
      expect(parsedResult.meta).toEqual({
        count: 0,
        next_cursor: undefined
      });
      expect(parsedResult.meta).not.toHaveProperty('summary_applied');
    });

    it('should return large transaction objects completely without summarization', async () => {
      // Create a large transaction object
      const largeTransaction = {
        id: 'tx_large',
        initiated_at_date: '2025-01-20T11:30:00Z',
        posted_at_date: '2025-01-20T12:00:00Z',
        amount: { amount: 50000.00, currency: 'USD' },
        description: 'Large Wire Transfer with extensive details',
        type: 'PAYMENT' as const,
        merchant: {
          name: 'Global Enterprise Corp',
          category: 'Enterprise',
          address: {
            line1: '123 Business Ave',
            line2: 'Suite 500',
            city: 'New York',
            state: 'NY',
            postal_code: '10001',
            country: 'US'
          },
          phone: '+1-555-0123',
          email: 'contact@globalenterprise.com'
        },
        user: {
          id: 'user_999',
          name: 'Executive User',
          email: 'exec@company.com',
          department: 'Finance',
          title: 'CFO'
        },
        metadata: {
          reference_id: 'ref_xyz',
          notes: 'Q4 major transaction with multiple line items and extensive documentation',
          tags: ['important', 'quarterly', 'reviewed'],
          custom_fields: {
            project_code: 'PROJ-2025-001',
            cost_center: 'CC-100',
            approval_chain: ['manager1', 'manager2', 'cfo']
          }
        },
        line_items: Array(20).fill(null).map((_, i) => ({
          item_id: `item_${i}`,
          description: `Line item ${i} with detailed description`,
          amount: 2500.00,
          category: `Category ${i % 5}`
        })),
        attachments: Array(10).fill(null).map((_, i) => ({
          id: `attach_${i}`,
          name: `document_${i}.pdf`,
          size: 1024 * (i + 1),
          uploaded_at: '2025-01-19T10:00:00Z'
        }))
      };
      
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ 
        items: [largeTransaction] as any
      });
      
      const result = await handler({
        params: {
          arguments: {
            account_id: 'test_account_123'
          }
        }
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      
      // Verify the complete large object is returned
      expect(parsedResult.transactions[0]).toEqual(largeTransaction);
      expect(parsedResult.transactions[0].line_items).toHaveLength(20);
      expect(parsedResult.transactions[0].attachments).toHaveLength(10);
      
      // Ensure no summarization occurred
      expect(parsedResult.meta.summary_applied).toBeUndefined();
    });
  });

  describe('Expand Parameter Support', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCashTransactions(mockServer);
      handler = registeredHandlers.get('get_cash_transactions')!;
    });

    it('should support expand parameter for additional data', async () => {
      const mockTransaction = {
        id: 'tx_expanded',
        initiated_at_date: '2025-01-10T09:00:00Z',
        posted_at_date: '2025-01-10T09:30:00Z',
        amount: { amount: 1000, currency: 'USD' },
        description: 'Transaction with expanded data',
        user: {
          id: 'user_001',
          name: 'User Name',
          expanded_details: {
            department: 'Engineering',
            manager: 'Manager Name',
            location: 'San Francisco'
          }
        }
      };
      
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ 
        items: [mockTransaction] as any
      });
      
      await handler({
        params: {
          arguments: {
            account_id: 'test_account_123',
            expand: ['user.expanded_details']
          }
        }
      });
      
      // Verify expand was passed to the client
      expect(mockBrexClient.getCashTransactions).toHaveBeenCalledWith(
        'test_account_123',
        {
          cursor: undefined,
          limit: undefined,
          posted_at_start: undefined,
          expand: ['user.expanded_details']
        }
      );
      
      // Just verify the expand was passed correctly - we tested return values above
    });
  });

  describe('Pagination Support', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCashTransactions(mockServer);
      handler = registeredHandlers.get('get_cash_transactions')!;
    });

    it('should handle pagination correctly', async () => {
      const transactions = Array(5).fill(null).map((_, i) => ({
        id: `tx_${i}`,
        initiated_at_date: `2025-01-${10 + i}T09:00:00Z`,
        posted_at_date: `2025-01-${10 + i}T10:00:00Z`,
        amount: { amount: 100 * i, currency: 'USD' },
        description: `Transaction ${i}`
      }));
      
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ 
        items: transactions as any,
        next_cursor: 'page_2_cursor'
      });
      
      const result = await handler({
        params: {
          arguments: {
            account_id: 'test_account_123',
            limit: 5,
            cursor: 'page_1_cursor'
          }
        }
      });
      
      expect(mockBrexClient.getCashTransactions).toHaveBeenCalledWith(
        'test_account_123',
        {
          limit: 5,
          cursor: 'page_1_cursor',
          posted_at_start: undefined
        }
      );
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.transactions).toHaveLength(5);
      expect(parsedResult.meta.next_cursor).toBe('page_2_cursor');
    });
  });

  describe('Error Handling', () => {
    let handler: HandlerFunction;
    
    beforeEach(() => {
      registerGetCashTransactions(mockServer);
      handler = registeredHandlers.get('get_cash_transactions')!;
    });

    it('should handle API errors gracefully', async () => {
      mockBrexClient.getCashTransactions.mockRejectedValueOnce(
        new Error('API Error: Unauthorized')
      );
      
      await expect(handler({
        params: {
          arguments: {
            account_id: 'test_account_123'
          }
        }
      })).rejects.toThrow('API Error: Unauthorized');
    });

    it('should handle malformed response gracefully', async () => {
      mockBrexClient.getCashTransactions.mockResolvedValueOnce({ 
        items: 'not_an_array' as any // Invalid response
      });
      
      const result = await handler({
        params: {
          arguments: {
            account_id: 'test_account_123'
          }
        }
      });
      
      const parsedResult = JSON.parse(result.content[0].text);
      // Should default to empty array if items is not an array
      expect(parsedResult.transactions).toEqual([]);
      expect(parsedResult.meta.count).toBe(0);
    });
  });
});