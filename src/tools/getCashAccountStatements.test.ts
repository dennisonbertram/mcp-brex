/**
 * @file Tests for getCashAccountStatements tool without summary logic
 */

import { registerGetCashAccountStatements } from './getCashAccountStatements';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BrexClient } from '../services/brex/client';

// Set environment variables before imports
process.env.BREX_API_KEY = 'test_key';
process.env.BREX_API_URL = 'https://api.test.brex.com';
process.env.PORT = '3000';
process.env.RATE_LIMIT_REQUESTS = '10';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

// Mock dependencies
jest.mock('../services/brex/client');
jest.mock('../utils/logger');
jest.mock('../config', () => ({
  config: {
    brexApiKey: 'test_key',
    brexApiUrl: 'https://api.test.brex.com',
    port: 3000,
    rateLimitRequests: 10,
    rateLimitWindowMs: 60000
  }
}));

// Create mock server
const createMockServer = (): Server => ({
  setRequestHandler: jest.fn(),
} as unknown as Server);

// Mock tool registration
const mockToolHandlers = new Map<string, any>();
jest.mock('./index', () => ({
  registerToolHandler: jest.fn((name: string, handler: any) => {
    mockToolHandlers.set(name, handler);
  }),
  ToolCallRequest: jest.fn()
}));

describe('getCashAccountStatements', () => {
  let mockBrexClient: jest.Mocked<BrexClient>;
  let mockServer: Server;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToolHandlers.clear();
    
    mockBrexClient = {
      getCashAccountStatements: jest.fn()
    } as any;
    
    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient);
    
    mockServer = createMockServer();
    
    // Register the tool
    registerGetCashAccountStatements(mockServer);
  });

  describe('Tool Registration', () => {
    it('should register the tool handler', () => {
      expect(mockToolHandlers.has('get_cash_account_statements')).toBe(true);
    });
  });

  describe('Complete Object Return', () => {
    it('should return complete statement objects without any summarization', async () => {
      const mockStatements = [
        {
          id: 'stmt_001',
          period: {
            start_date: '2024-01-01',
            end_date: '2024-01-31'
          },
          start_balance: { amount: 10000.00, currency: 'USD' },
          end_balance: { amount: 15000.00, currency: 'USD' },
          extra_transactions: [
            { id: 'txn_001', amount: '1000.00', description: 'Payment received' },
            { id: 'txn_002', amount: '2000.00', description: 'Invoice payment' },
            { id: 'txn_003', amount: '2000.00', description: 'Client payment' }
          ],
          total_debits: '0.00',
          total_credits: '5000.00',
          account_details: {
            account_name: 'Main Operating Account',
            account_number: '****1234',
            routing_number: '123456789'
          },
          metadata: {
            created_at: '2024-02-01T00:00:00Z',
            updated_at: '2024-02-01T00:00:00Z'
          }
        },
        {
          id: 'stmt_002',
          period: {
            start_date: '2024-02-01',
            end_date: '2024-02-29'
          },
          start_balance: { amount: 15000.00, currency: 'USD' },
          end_balance: { amount: 22000.00, currency: 'USD' },
          extra_transactions: [
            { id: 'txn_004', amount: '3000.00', description: 'Sales revenue' },
            { id: 'txn_005', amount: '4000.00', description: 'Service payment' }
          ],
          total_debits: '0.00',
          total_credits: '7000.00',
          account_details: {
            account_name: 'Main Operating Account',
            account_number: '****1234',
            routing_number: '123456789'
          },
          metadata: {
            created_at: '2024-03-01T00:00:00Z',
            updated_at: '2024-03-01T00:00:00Z'
          }
        }
      ];

      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: mockStatements as any,
        next_cursor: 'cursor_123'
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_123'
          }
        }
      });

      const parsedResult = JSON.parse(result.content[0].text);
      
      // Verify complete objects are returned
      expect(parsedResult.statements).toEqual(mockStatements);
      expect(parsedResult.statements[0]).toHaveProperty('extra_transactions');
      expect(parsedResult.statements[0]).toHaveProperty('account_details');
      expect(parsedResult.statements[0]).toHaveProperty('metadata');
      expect(parsedResult.statements[0].extra_transactions).toHaveLength(3);
      expect(parsedResult.statements[1].extra_transactions).toHaveLength(2);
      
      // Verify no summary fields in meta
      expect(parsedResult.meta.summary_applied).toBeUndefined();
    });

    it('should never apply summary even with large data sets', async () => {
      // Create a large dataset with many statements
      const largeStatements = Array(100).fill(null).map((_, index) => ({
        id: `stmt_${index.toString().padStart(3, '0')}`,
        period: {
          start_date: `2024-${String((index % 12) + 1).padStart(2, '0')}-01`,
          end_date: `2024-${String((index % 12) + 1).padStart(2, '0')}-31`
        },
        start_balance: { amount: 10000 + index * 1000, currency: 'USD' },
        end_balance: { amount: 15000 + index * 1000, currency: 'USD' },
        extra_transactions: Array(50).fill(null).map((_, txnIndex) => ({
          id: `txn_${index}_${txnIndex}`,
          amount: `${100 + txnIndex * 10}.00`,
          description: `Transaction ${txnIndex} for statement ${index}`,
          date: `2024-${String((index % 12) + 1).padStart(2, '0')}-${String(txnIndex + 1).padStart(2, '0')}`,
          category: `Category ${txnIndex % 5}`,
          merchant: `Merchant ${txnIndex}`,
          additional_data: {
            field1: `Value ${txnIndex}`,
            field2: `Data ${txnIndex}`,
            field3: `Info ${txnIndex}`
          }
        })),
        total_debits: '5000.00',
        total_credits: '10000.00',
        account_details: {
          account_name: 'Main Operating Account',
          account_number: '****1234',
          routing_number: '123456789',
          bank_name: 'Example Bank',
          swift_code: 'EXAMUS33'
        },
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          generated_by: 'system',
          version: '1.0'
        },
        additional_fields: {
          field_a: 'Long text content that adds to the payload size',
          field_b: 'Additional metadata that increases response size',
          field_c: Array(10).fill('Extra data to make response larger').join(' ')
        }
      }));

      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: largeStatements as any,
        next_cursor: 'cursor_next'
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_large'
          }
        }
      });

      const parsedResult = JSON.parse(result.content[0].text);
      
      // All statements should be returned completely
      expect(parsedResult.statements).toHaveLength(100);
      expect(parsedResult.statements[0].extra_transactions).toHaveLength(50);
      expect(parsedResult.statements[99].extra_transactions).toHaveLength(50);
      expect(parsedResult.statements[50]).toHaveProperty('additional_fields');
      expect(parsedResult.meta.summary_applied).toBeUndefined();
    });
  });

  describe('Parameter Handling', () => {
    it('should accept and use pagination parameters correctly', async () => {
      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: [],
        next_cursor: undefined
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_456',
            cursor: 'cursor_abc',
            limit: 25
          }
        }
      });

      expect(mockBrexClient.getCashAccountStatements).toHaveBeenCalledWith(
        'cash_acc_456',
        'cursor_abc',
        25
      );
    });

    it('should handle default parameters when not provided', async () => {
      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: [],
        next_cursor: undefined
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_789'
          }
        }
      });

      expect(mockBrexClient.getCashAccountStatements).toHaveBeenCalledWith(
        'cash_acc_789',
        undefined,
        undefined
      );
    });

    it('should reject summary_only parameter if provided', async () => {
      const handler = mockToolHandlers.get('get_cash_account_statements');
      
      // The tool should not accept summary_only anymore
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_test',
            summary_only: true  // This should be ignored/not exist
          }
        }
      });

      // summary_only should not affect the output
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.meta.summary_applied).toBeUndefined();
    });

    it('should reject fields parameter if provided', async () => {
      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: [{
          id: 'stmt_full',
          period: {
            start_date: '2024-01-01',
            end_date: '2024-01-31'
          },
          start_balance: { amount: 1000.00, currency: 'USD' },
          end_balance: { amount: 2000.00, currency: 'USD' },
          extra_transactions: [{ id: 'txn_1', amount: '1000.00' }],
          extra_field: 'should_be_included'
        }] as any,
        next_cursor: undefined
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_fields',
            fields: ['id', 'period_start']  // This should be ignored/not exist
          }
        }
      });

      // All fields should be returned, not just selected ones
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.statements[0]).toHaveProperty('extra_field');
      expect(parsedResult.statements[0]).toHaveProperty('extra_transactions');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when account_id is missing', async () => {
      const handler = mockToolHandlers.get('get_cash_account_statements');
      
      await expect(handler({
        params: {
          arguments: {}
        }
      })).rejects.toThrow('Missing required parameter: account_id');
    });

    it('should handle API errors correctly', async () => {
      mockBrexClient.getCashAccountStatements.mockRejectedValue(
        new Error('API Error: Unauthorized')
      );

      const handler = mockToolHandlers.get('get_cash_account_statements');
      
      await expect(handler({
        params: {
          arguments: {
            account_id: 'cash_acc_error'
          }
        }
      })).rejects.toThrow('API Error: Unauthorized');
    });

    it('should validate limit parameter', async () => {
      const handler = mockToolHandlers.get('get_cash_account_statements');
      
      await expect(handler({
        params: {
          arguments: {
            account_id: 'cash_acc_limit',
            limit: 150  // exceeds max
          }
        }
      })).rejects.toThrow('Invalid limit');

      await expect(handler({
        params: {
          arguments: {
            account_id: 'cash_acc_limit',
            limit: 0  // too small
          }
        }
      })).rejects.toThrow('Invalid limit');

      await expect(handler({
        params: {
          arguments: {
            account_id: 'cash_acc_limit',
            limit: 'invalid'  // not a number
          }
        }
      })).rejects.toThrow('Invalid limit');
    });
  });

  describe('Response Format', () => {
    it('should return response in expected format', async () => {
      const mockStatements = [{
        id: 'stmt_format',
        period: {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        start_balance: { amount: 1000.00, currency: 'USD' },
        end_balance: { amount: 2000.00, currency: 'USD' }
      }];

      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: mockStatements as any,
        next_cursor: 'next_page'
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_format'
          }
        }
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toHaveProperty('statements');
      expect(parsedResult).toHaveProperty('meta');
      expect(parsedResult.meta).toHaveProperty('count', 1);
      expect(parsedResult.meta).toHaveProperty('next_cursor', 'next_page');
      expect(parsedResult.meta).not.toHaveProperty('summary_applied');
    });

    it('should handle empty results correctly', async () => {
      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: [],
        next_cursor: undefined
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_empty'
          }
        }
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.statements).toEqual([]);
      expect(parsedResult.meta.count).toBe(0);
      expect(parsedResult.meta.next_cursor).toBeUndefined();
    });

    it('should handle null/undefined items array', async () => {
      mockBrexClient.getCashAccountStatements.mockResolvedValue({
        items: undefined as any,
        next_cursor: undefined
      });

      const handler = mockToolHandlers.get('get_cash_account_statements');
      const result = await handler({
        params: {
          arguments: {
            account_id: 'cash_acc_null'
          }
        }
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.statements).toEqual([]);
      expect(parsedResult.meta.count).toBe(0);
    });
  });
});