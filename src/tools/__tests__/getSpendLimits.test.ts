/**
 * @file Tests for getSpendLimits tool
 */

// Set up test environment variables before any imports
process.env.BREX_API_KEY = 'test-api-key';
process.env.BREX_API_URL = 'https://test.brexapis.com';
process.env.PORT = '3000';
process.env.RATE_LIMIT_REQUESTS = '100';
process.env.RATE_LIMIT_WINDOW_MS = '900000';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SpendLimitStatus, PeriodRecurrenceType } from '../../models/budget';

// Mock the modules before importing
jest.mock('../../utils/logger');

// Store tool handlers
type ToolHandler = (request: any) => Promise<any>;
const toolHandlers = new Map<string, ToolHandler>();

// Mock registerToolHandler
jest.mock('../index', () => ({
  registerToolHandler: jest.fn((name: string, handler: ToolHandler) => {
    toolHandlers.set(name, handler);
  })
}));

// Mock BrexClient
const mockGetSpendLimits = jest.fn();
jest.mock('../../services/brex/client', () => ({
  BrexClient: jest.fn(() => ({
    getSpendLimits: mockGetSpendLimits
  }))
}));

// Import the function after mocks are set up
import { registerGetSpendLimits } from '../getSpendLimits';

describe('getSpendLimits', () => {
  let mockServer: Server;

  beforeEach(() => {
    jest.clearAllMocks();
    toolHandlers.clear();
    
    // Create mock server
    mockServer = {} as Server;
    
    // Register the tool
    registerGetSpendLimits(mockServer);
  });

  describe('Complete Object Return', () => {
    it('should return complete spend limit objects without any summarization', async () => {
      // Arrange
      const mockSpendLimits = [
        {
          id: 'sl_123',
          account_id: 'acc_123',
          name: 'Engineering Team Budget',
          status: SpendLimitStatus.ACTIVE,
          amount: {
            amount: 50000,
            currency: 'USD'
          },
          period_recurrence_type: PeriodRecurrenceType.MONTHLY,
          authorization_settings: {},
          updated_at: '2025-08-01T10:00:00Z',
          created_at: '2025-07-01T10:00:00Z',
          parent_budget_id: 'budget_456',
          member_user_id: 'user_1',
          description: 'Monthly budget for engineering team',
          start_date: '2025-07-01',
          end_date: '2025-12-31',
          limit_type: 'SPEND_LIMIT',
          spent_amount: {
            amount: 15000,
            currency: 'USD'
          },
          available_amount: {
            amount: 35000,
            currency: 'USD'
          },
          metadata: {
            department: 'Engineering',
            cost_center: 'CC-001'
          }
        },
        {
          id: 'sl_456',
          account_id: 'acc_123',
          name: 'Marketing Campaign Q3',
          status: SpendLimitStatus.ACTIVE,
          amount: {
            amount: 75000,
            currency: 'USD'
          },
          period_recurrence_type: PeriodRecurrenceType.QUARTERLY,
          authorization_settings: {},
          updated_at: '2025-08-15T14:30:00Z',
          created_at: '2025-07-01T09:00:00Z',
          parent_budget_id: 'budget_789',
          member_user_id: 'user_3',
          description: 'Q3 marketing campaign budget',
          start_date: '2025-07-01',
          end_date: '2025-09-30',
          limit_type: 'SPEND_LIMIT',
          spent_amount: {
            amount: 22500,
            currency: 'USD'
          },
          available_amount: {
            amount: 52500,
            currency: 'USD'
          },
          metadata: {
            department: 'Marketing',
            cost_center: 'CC-002',
            campaign: 'Summer 2025'
          }
        }
      ];

      mockGetSpendLimits.mockResolvedValue({
        items: mockSpendLimits,
        next_cursor: 'cursor_abc',
        has_more: true
      });

      // Get the registered handler
      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act
      const result = await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 10
          }
        }
      });

      // Assert
      expect(mockGetSpendLimits).toHaveBeenCalledWith({
        limit: 10,
        cursor: undefined,
        parent_budget_id: undefined,
        status: undefined,
        member_user_id: undefined
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.spend_limits).toEqual(mockSpendLimits);
      expect(response.spend_limits).toHaveLength(2);
      
      // Verify complete objects are returned with all fields
      expect(response.spend_limits[0]).toHaveProperty('id');
      expect(response.spend_limits[0]).toHaveProperty('name');
      expect(response.spend_limits[0]).toHaveProperty('status');
      expect(response.spend_limits[0]).toHaveProperty('amount');
      expect(response.spend_limits[0]).toHaveProperty('created_at');
      expect(response.spend_limits[0]).toHaveProperty('member_user_id');
      expect(response.spend_limits[0]).toHaveProperty('description');
      expect(response.spend_limits[0]).toHaveProperty('metadata');
      expect(response.spend_limits[0]).toHaveProperty('spent_amount');
      expect(response.spend_limits[0]).toHaveProperty('available_amount');
      
      // Verify no summary_applied flag exists
      expect(response.meta.summary_applied).toBeUndefined();
      expect(response.meta.count).toBe(2);
      expect(response.meta.next_cursor).toBe('cursor_abc');
    });

    it('should handle pagination with cursor parameter', async () => {
      // Arrange
      const mockSpendLimits = [
        {
          id: 'sl_789',
          account_id: 'acc_123',
          name: 'Sales Budget',
          status: SpendLimitStatus.ACTIVE,
          amount: { amount: 100000, currency: 'USD' },
          period_recurrence_type: PeriodRecurrenceType.MONTHLY,
          authorization_settings: {},
          updated_at: '2025-08-20T10:00:00Z'
        }
      ];

      mockGetSpendLimits.mockResolvedValue({
        items: mockSpendLimits,
        next_cursor: 'cursor_xyz',
        has_more: true
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act
      const result = await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 5,
            cursor: 'cursor_123'
          }
        }
      });

      // Assert
      expect(mockGetSpendLimits).toHaveBeenCalledWith({
        limit: 5,
        cursor: 'cursor_123',
        parent_budget_id: undefined,
        status: undefined,
        member_user_id: undefined
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.meta.next_cursor).toBe('cursor_xyz');
    });

    it('should filter by status parameter', async () => {
      // Arrange
      mockGetSpendLimits.mockResolvedValue({
        items: [],
        next_cursor: undefined,
        has_more: false
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act
      await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            status: 'ACTIVE',
            limit: 20
          }
        }
      });

      // Assert
      expect(mockGetSpendLimits).toHaveBeenCalledWith({
        limit: 20,
        cursor: undefined,
        parent_budget_id: undefined,
        status: 'ACTIVE',
        member_user_id: undefined
      });
    });

    it('should filter by parent_budget_id parameter', async () => {
      // Arrange
      mockGetSpendLimits.mockResolvedValue({
        items: [],
        next_cursor: undefined,
        has_more: false
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act
      await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            parent_budget_id: 'budget_123',
            limit: 15
          }
        }
      });

      // Assert
      expect(mockGetSpendLimits).toHaveBeenCalledWith({
        limit: 15,
        cursor: undefined,
        parent_budget_id: 'budget_123',
        status: undefined,
        member_user_id: undefined
      });
    });

    it('should filter by member_user_id parameter', async () => {
      // Arrange
      mockGetSpendLimits.mockResolvedValue({
        items: [],
        next_cursor: undefined,
        has_more: false
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act
      await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            member_user_id: 'user_789',
            limit: 25
          }
        }
      });

      // Assert
      expect(mockGetSpendLimits).toHaveBeenCalledWith({
        limit: 25,
        cursor: undefined,
        parent_budget_id: undefined,
        status: undefined,
        member_user_id: 'user_789'
      });
    });

    it('should handle empty result sets', async () => {
      // Arrange
      mockGetSpendLimits.mockResolvedValue({
        items: [],
        next_cursor: undefined,
        has_more: false
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act
      const result = await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 10
          }
        }
      });

      // Assert
      const response = JSON.parse(result.content[0].text);
      expect(response.spend_limits).toEqual([]);
      expect(response.meta.count).toBe(0);
      expect(response.meta.next_cursor).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockGetSpendLimits.mockRejectedValue(new Error('API Error: Unauthorized'));

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act & Assert
      await expect(toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 10
          }
        }
      })).rejects.toThrow('API Error: Unauthorized');
    });

    it('should validate limit parameter is within bounds', async () => {
      // Arrange
      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act & Assert - limit too high
      await expect(toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 150
          }
        }
      })).rejects.toThrow('Invalid limit');

      // Act & Assert - limit too low
      await expect(toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 0
          }
        }
      })).rejects.toThrow('Invalid limit');
    });

    it('should not accept summary_only parameter', async () => {
      // Arrange
      const mockSpendLimits = [
        {
          id: 'sl_full',
          account_id: 'acc_123',
          name: 'Full Object Test',
          status: SpendLimitStatus.ACTIVE,
          amount: { amount: 10000, currency: 'USD' },
          period_recurrence_type: PeriodRecurrenceType.MONTHLY,
          authorization_settings: {},
          complex_nested_field: {
            level1: {
              level2: {
                level3: 'deep value'
              }
            }
          }
        }
      ];

      mockGetSpendLimits.mockResolvedValue({
        items: mockSpendLimits,
        next_cursor: undefined,
        has_more: false
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act - attempt to pass summary_only (should be ignored)
      const result = await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 10,
            summary_only: true  // This should be ignored
          }
        }
      });

      // Assert - verify complete object is still returned
      const response = JSON.parse(result.content[0].text);
      expect(response.spend_limits[0].complex_nested_field).toBeDefined();
      expect(response.spend_limits[0].complex_nested_field.level1.level2.level3).toBe('deep value');
    });

    it('should not accept fields parameter', async () => {
      // Arrange
      const mockSpendLimits = [
        {
          id: 'sl_full',
          account_id: 'acc_123',
          name: 'Full Object Test',
          status: SpendLimitStatus.ACTIVE,
          amount: { amount: 10000, currency: 'USD' },
          period_recurrence_type: PeriodRecurrenceType.MONTHLY,
          authorization_settings: {},
          description: 'This should be included',
          metadata: { key: 'value' }
        }
      ];

      mockGetSpendLimits.mockResolvedValue({
        items: mockSpendLimits,
        next_cursor: undefined,
        has_more: false
      });

      const toolHandler = toolHandlers.get('get_spend_limits');
      expect(toolHandler).toBeDefined();

      // Act - attempt to pass fields (should be ignored)
      const result = await toolHandler!({
        params: {
          name: 'get_spend_limits',
          arguments: {
            limit: 10,
            fields: ['id', 'name']  // This should be ignored
          }
        }
      });

      // Assert - verify complete object is returned, not just requested fields
      const response = JSON.parse(result.content[0].text);
      expect(response.spend_limits[0].description).toBe('This should be included');
      expect(response.spend_limits[0].metadata).toEqual({ key: 'value' });
    });
  });
});