/**
 * @file Tests for getBudgets tool without summary logic
 */

import { jest } from '@jest/globals';
import { SpendBudgetStatus, PeriodRecurrenceType, LimitType } from '../../models/budget.js';

// Set up environment variables before imports
process.env.BREX_API_KEY = 'test-api-key';
process.env.BREX_API_URL = 'https://api.brex.com';
process.env.PORT = '3000';
process.env.RATE_LIMIT_REQUESTS = '100';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

// Mock modules
jest.mock('../../utils/logger.js', () => ({
  logError: jest.fn()
}));

describe('getBudgets tool', () => {
  let mockGetBudgets: jest.Mock;
  let registerGetBudgets: any;
  let BrexClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create mock for getBudgets method
    mockGetBudgets = jest.fn();
    
    // Mock the BrexClient module
    jest.unstable_mockModule('../../services/brex/client.js', () => ({
      BrexClient: jest.fn().mockImplementation(() => ({
        getBudgets: mockGetBudgets
      }))
    }));

    // Import after mocking
    const clientModule = await import('../../services/brex/client.js');
    BrexClient = clientModule.BrexClient;
    
    const toolModule = await import('../getBudgets.js');
    registerGetBudgets = toolModule.registerGetBudgets;
  });

  it('should return complete budget objects without any summary logic', async () => {
    const mockBudgets = [
      {
        budget_id: 'budget_1',
        account_id: 'account_123',
        name: 'Marketing Budget',
        description: 'Q1 Marketing expenses',
        amount: { amount: 50000, currency: 'USD' },
        spend_budget_status: SpendBudgetStatus.ACTIVE,
        period_recurrence_type: PeriodRecurrenceType.MONTHLY,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        owner_user_ids: ['user_123'],
        creator_user_id: 'user_123',
        limit_type: LimitType.HARD,
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        parent_budget_id: 'parent_budget_1'
      },
      {
        budget_id: 'budget_2',
        account_id: 'account_123',
        name: 'Engineering Budget',
        description: 'Engineering team expenses',
        amount: { amount: 100000, currency: 'USD' },
        spend_budget_status: SpendBudgetStatus.ACTIVE,
        period_recurrence_type: PeriodRecurrenceType.QUARTERLY,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-20T00:00:00Z',
        owner_user_ids: ['user_234'],
        creator_user_id: 'user_234',
        limit_type: LimitType.SOFT,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      }
    ];

    mockGetBudgets.mockResolvedValue({
      items: mockBudgets,
      next_cursor: 'next_page_cursor',
      has_more: true
    });

    // Register the tool and get the handler
    const handlers = new Map();
    const mockServer = {
      setRequestHandler: jest.fn()
    };
    
    // Mock registerToolHandler to capture the handler
    jest.unstable_mockModule('../index.js', () => ({
      registerToolHandler: (name: string, handler: any) => {
        handlers.set(name, handler);
      }
    }));
    
    // Re-import after mocking registerToolHandler
    const { registerGetBudgets: register } = await import('../getBudgets.js');
    register(mockServer as any);
    
    const handler = handlers.get('get_budgets');
    expect(handler).toBeDefined();
    
    const result = await handler!({
      params: { arguments: {} }
    });

    // Verify the API was called correctly
    expect(mockGetBudgets).toHaveBeenCalledWith({
      limit: undefined,
      cursor: undefined,
      parent_budget_id: undefined,
      spend_budget_status: undefined
    });

    // Parse the result to check structure
    const response = JSON.parse(result.content[0].text);
    
    // Verify complete budget objects are returned
    expect(response.budgets).toEqual(mockBudgets);
    expect(response.budgets.length).toBe(2);
    
    // Verify all fields are present in the first budget
    const firstBudget = response.budgets[0];
    expect(firstBudget.budget_id).toBe('budget_1');
    expect(firstBudget.account_id).toBe('account_123');
    expect(firstBudget.name).toBe('Marketing Budget');
    expect(firstBudget.description).toBe('Q1 Marketing expenses');
    expect(firstBudget.amount).toEqual({ amount: 50000, currency: 'USD' });
    expect(firstBudget.spend_budget_status).toBe(SpendBudgetStatus.ACTIVE);
    expect(firstBudget.period_recurrence_type).toBe(PeriodRecurrenceType.MONTHLY);
    
    // Verify metadata
    expect(response.meta).toEqual({
      count: 2,
      next_cursor: 'next_page_cursor'
    });
  });

  it('should handle pagination parameters correctly', async () => {
    mockGetBudgets.mockResolvedValue({
      items: [],
      has_more: false
    });

    const handlers = new Map();
    const mockServer = { setRequestHandler: jest.fn() };
    
    jest.unstable_mockModule('../index.js', () => ({
      registerToolHandler: (name: string, handler: any) => {
        handlers.set(name, handler);
      }
    }));
    
    const { registerGetBudgets: register } = await import('../getBudgets.js');
    register(mockServer as any);
    
    const handler = handlers.get('get_budgets');
    
    await handler!({
      params: {
        arguments: {
          limit: 20,
          cursor: 'previous_cursor'
        }
      }
    });

    expect(mockGetBudgets).toHaveBeenCalledWith({
      limit: 20,
      cursor: 'previous_cursor',
      parent_budget_id: undefined,
      spend_budget_status: undefined
    });
  });

  it('should validate limit parameter', async () => {
    const handlers = new Map();
    const mockServer = { setRequestHandler: jest.fn() };
    
    jest.unstable_mockModule('../index.js', () => ({
      registerToolHandler: (name: string, handler: any) => {
        handlers.set(name, handler);
      }
    }));
    
    const { registerGetBudgets: register } = await import('../getBudgets.js');
    register(mockServer as any);
    
    const handler = handlers.get('get_budgets');
    
    // Test invalid limit (too high)
    await expect(handler!({
      params: {
        arguments: {
          limit: 101
        }
      }
    })).rejects.toThrow('Invalid limit (1..100)');

    // Test invalid limit (zero)
    await expect(handler!({
      params: {
        arguments: {
          limit: 0
        }
      }
    })).rejects.toThrow('Invalid limit (1..100)');

    // Test invalid limit (negative)
    await expect(handler!({
      params: {
        arguments: {
          limit: -1
        }
      }
    })).rejects.toThrow('Invalid limit (1..100)');
  });

  it('should handle empty results', async () => {
    mockGetBudgets.mockResolvedValue({
      items: [],
      has_more: false
    });

    const handlers = new Map();
    const mockServer = { setRequestHandler: jest.fn() };
    
    jest.unstable_mockModule('../index.js', () => ({
      registerToolHandler: (name: string, handler: any) => {
        handlers.set(name, handler);
      }
    }));
    
    const { registerGetBudgets: register } = await import('../getBudgets.js');
    register(mockServer as any);
    
    const handler = handlers.get('get_budgets');
    
    const result = await handler!({
      params: { arguments: {} }
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.budgets).toEqual([]);
    expect(response.meta).toEqual({
      count: 0,
      next_cursor: null
    });
  });

  it('should not accept summary_only or fields parameters', async () => {
    mockGetBudgets.mockResolvedValue({
      items: [{ 
        budget_id: 'test', 
        account_id: 'account_123',
        name: 'Test Budget', 
        amount: { amount: 1000, currency: 'USD' },
        spend_budget_status: SpendBudgetStatus.ACTIVE,
        period_recurrence_type: PeriodRecurrenceType.MONTHLY
      }],
      has_more: false
    });

    const handlers = new Map();
    const mockServer = { setRequestHandler: jest.fn() };
    
    jest.unstable_mockModule('../index.js', () => ({
      registerToolHandler: (name: string, handler: any) => {
        handlers.set(name, handler);
      }
    }));
    
    const { registerGetBudgets: register } = await import('../getBudgets.js');
    register(mockServer as any);
    
    const handler = handlers.get('get_budgets');
    
    // Test that summary_only and fields are ignored
    const result = await handler!({
      params: {
        arguments: {
          summary_only: true, // This should be ignored
          fields: ['budget_id', 'name'] // This should be ignored
        } as any
      }
    });

    // Verify API was called without summary logic parameters
    expect(mockGetBudgets).toHaveBeenCalledWith({
      limit: undefined,
      cursor: undefined,
      parent_budget_id: undefined,
      spend_budget_status: undefined
    });

    const response = JSON.parse(result.content[0].text);
    // Should return complete object
    expect(response.budgets[0]).toEqual({ 
      budget_id: 'test',
      account_id: 'account_123',
      name: 'Test Budget', 
      amount: { amount: 1000, currency: 'USD' },
      spend_budget_status: SpendBudgetStatus.ACTIVE,
      period_recurrence_type: PeriodRecurrenceType.MONTHLY
    });
  });
});