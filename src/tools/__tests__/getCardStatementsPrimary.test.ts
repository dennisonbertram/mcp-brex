/**
 * @file Tests for getCardStatementsPrimary tool without summary logic
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerGetCardStatementsPrimary } from "../getCardStatementsPrimary.js";
import { BrexClient } from "../../services/brex/client.js";
import { toolHandlers } from "../index.js";

// Mock the config to avoid environment variable validation
jest.mock("../../config/index.js", () => ({
  validateEnv: jest.fn(),
  config: {
    api: {
      baseURL: "https://api.example.com",
      key: "test-key"
    },
    server: {
      port: 3000
    },
    rateLimit: {
      requests: 100,
      windowMs: 60000
    }
  },
  getConfig: jest.fn(() => ({
    api: {
      baseURL: "https://api.example.com",
      key: "test-key"
    },
    server: {
      port: 3000
    },
    rateLimit: {
      requests: 100,
      windowMs: 60000
    }
  }))
}));

// Mock the Brex client
jest.mock("../../services/brex/client.js");

// Mock logger to prevent console output during tests
jest.mock("../../utils/logger.js", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

describe("getCardStatementsPrimary", () => {
  let mockServer: Server;
  let mockBrexClient: jest.Mocked<BrexClient>;

  // Sample complete statement objects (not summarized)
  // These include both the required fields per the type definition
  // and additional fields that the actual API might return
  const sampleStatements = [
    {
      id: "stmt_001",
      period: {
        start_date: "2024-01-01",
        end_date: "2024-01-31"
      },
      start_balance: {
        amount: 0,
        currency: "USD"
      },
      end_balance: {
        amount: 15000,
        currency: "USD"
      },
      // Additional fields that might be returned by the API
      total_amount: {
        amount: 15000,
        currency: "USD"
      },
      payment_due_date: "2024-02-15",
      status: "OPEN",
      card_account_id: "card_acc_123",
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
      transactions_count: 45,
      additional_field_1: "value1",
      additional_field_2: "value2",
      nested_object: {
        inner_field: "inner_value",
        another_field: 123
      }
    },
    {
      id: "stmt_002",
      period: {
        start_date: "2024-02-01",
        end_date: "2024-02-29"
      },
      start_balance: {
        amount: 0,
        currency: "USD"
      },
      end_balance: {
        amount: 22500,
        currency: "USD"
      },
      // Additional fields that might be returned by the API
      total_amount: {
        amount: 22500,
        currency: "USD"
      },
      payment_due_date: "2024-03-15",
      status: "OPEN",
      card_account_id: "card_acc_123",
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
      transactions_count: 62,
      additional_field_1: "value3",
      additional_field_2: "value4",
      nested_object: {
        inner_field: "inner_value2",
        another_field: 456
      }
    }
  ];

  beforeEach(() => {
    // Clear all handlers before each test
    toolHandlers.clear();

    // Create mock server
    mockServer = {} as Server;

    // Create mock Brex client
    mockBrexClient = {
      getPrimaryCardStatements: jest.fn(),
    } as unknown as jest.Mocked<BrexClient>;

    // Mock the BrexClient constructor
    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient);

    // Register the tool
    registerGetCardStatementsPrimary(mockServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Object Returns", () => {
    it("should return complete statement objects without any field projection", async () => {
      // Arrange
      const mockResponse = {
        items: sampleStatements,
        next_cursor: "next_page_cursor"
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {}
        }
      } as any);

      // Assert
      expect(mockBrexClient.getPrimaryCardStatements).toHaveBeenCalledWith(undefined, undefined);
      
      const content = JSON.parse((result as any).content[0].text);
      
      // Verify complete objects are returned
      expect(content.statements).toHaveLength(2);
      expect(content.statements[0]).toEqual(sampleStatements[0]);
      expect(content.statements[1]).toEqual(sampleStatements[1]);
      
      // Verify ALL fields are present (not just DEFAULT_FIELDS)
      expect(content.statements[0].additional_field_1).toBe("value1");
      expect(content.statements[0].additional_field_2).toBe("value2");
      expect(content.statements[0].nested_object).toEqual({
        inner_field: "inner_value",
        another_field: 123
      });
      
      // Verify metadata
      expect(content.meta).toEqual({
        count: 2,
        next_cursor: "next_page_cursor"
      });
      
      // Verify NO summary_applied field exists
      expect(content.meta.summary_applied).toBeUndefined();
    });

    it("should NOT accept summary_only parameter", async () => {
      // Arrange
      const mockResponse = {
        items: sampleStatements,
        next_cursor: undefined
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            summary_only: true // This parameter should be ignored
          }
        }
      } as any);

      // Assert
      const content = JSON.parse((result as any).content[0].text);
      
      // Verify complete objects are still returned despite summary_only
      expect(content.statements[0]).toEqual(sampleStatements[0]);
      expect(content.statements[1]).toEqual(sampleStatements[1]);
      
      // Verify no summary was applied
      expect(content.meta.summary_applied).toBeUndefined();
    });

    it("should NOT accept fields parameter", async () => {
      // Arrange
      const mockResponse = {
        items: sampleStatements,
        next_cursor: undefined
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            fields: ["id", "total_amount"] // This parameter should be ignored
          }
        }
      } as any);

      // Assert
      const content = JSON.parse((result as any).content[0].text);
      
      // Verify complete objects are returned, not just requested fields
      expect(content.statements[0]).toEqual(sampleStatements[0]);
      expect(content.statements[0].period).toBeDefined();
      expect(content.statements[0].additional_field_1).toBeDefined();
      expect(content.statements[0].nested_object).toBeDefined();
    });
  });

  describe("Pagination Parameters", () => {
    it("should handle limit parameter correctly", async () => {
      // Arrange
      const mockResponse = {
        items: [sampleStatements[0]],
        next_cursor: "cursor_123"
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            limit: 10
          }
        }
      } as any);

      // Assert
      expect(mockBrexClient.getPrimaryCardStatements).toHaveBeenCalledWith(undefined, 10);
      
      const content = JSON.parse((result as any).content[0].text);
      expect(content.statements).toHaveLength(1);
      expect(content.meta.count).toBe(1);
      expect(content.meta.next_cursor).toBe("cursor_123");
    });

    it("should handle cursor parameter correctly", async () => {
      // Arrange
      const mockResponse = {
        items: sampleStatements,
        next_cursor: "next_cursor_456"
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            cursor: "prev_cursor_123"
          }
        }
      } as any);

      // Assert
      expect(mockBrexClient.getPrimaryCardStatements).toHaveBeenCalledWith("prev_cursor_123", undefined);
      
      const content = JSON.parse((result as any).content[0].text);
      expect(content.meta.next_cursor).toBe("next_cursor_456");
    });

    it("should handle both cursor and limit parameters", async () => {
      // Arrange
      const mockResponse = {
        items: sampleStatements,
        next_cursor: undefined
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            cursor: "cursor_abc",
            limit: 25
          }
        }
      } as any);

      // Assert
      expect(mockBrexClient.getPrimaryCardStatements).toHaveBeenCalledWith("cursor_abc", 25);
      
      const content = JSON.parse((result as any).content[0].text);
      expect(content.statements).toHaveLength(2);
      expect(content.meta.next_cursor).toBeNull();
    });

    it("should validate limit is within valid range", async () => {
      // Arrange
      const handler = toolHandlers.get("get_card_statements_primary")!;

      // Act & Assert - Test invalid limit (too high)
      await expect(handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            limit: 101
          }
        }
      } as any)).rejects.toThrow("Invalid limit");

      // Test invalid limit (too low)
      await expect(handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            limit: 0
          }
        }
      } as any)).rejects.toThrow("Invalid limit");

      // Test invalid limit (negative)
      await expect(handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            limit: -5
          }
        }
      } as any)).rejects.toThrow("Invalid limit");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty statements array", async () => {
      // Arrange
      const mockResponse = {
        items: [],
        next_cursor: undefined
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {}
        }
      } as any);

      // Assert
      const content = JSON.parse((result as any).content[0].text);
      expect(content.statements).toEqual([]);
      expect(content.meta.count).toBe(0);
      expect(content.meta.next_cursor).toBeNull();
    });

    it("should handle non-array items response", async () => {
      // Arrange
      const mockResponse = {
        items: null as any,
        next_cursor: undefined
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {}
        }
      } as any);

      // Assert
      const content = JSON.parse((result as any).content[0].text);
      expect(content.statements).toEqual([]);
      expect(content.meta.count).toBe(0);
    });

    it("should handle missing next_cursor in response", async () => {
      // Arrange
      const mockResponse = {
        items: sampleStatements
        // next_cursor is missing
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {}
        }
      } as any);

      // Assert
      const content = JSON.parse((result as any).content[0].text);
      expect(content.meta.next_cursor).toBeNull();
    });

    it("should handle API errors gracefully", async () => {
      // Arrange
      const errorMessage = "API Error: Unauthorized";
      mockBrexClient.getPrimaryCardStatements.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      const handler = toolHandlers.get("get_card_statements_primary")!;
      await expect(handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {}
        }
      } as any)).rejects.toThrow(errorMessage);
    });
  });

  describe("Large Data Handling", () => {
    it("should return large statement objects without token limiting", async () => {
      // Create a large statement object with many fields
      const largeStatement = {
        id: "stmt_large",
        period: {
          start_date: "2024-01-01",
          end_date: "2024-01-31"
        },
        start_balance: { amount: 0, currency: "USD" },
        end_balance: { amount: 999999, currency: "USD" },
        total_amount: { amount: 999999, currency: "USD" },
        payment_due_date: "2024-02-15",
        status: "OPEN",
        card_account_id: "card_acc_123",
        created_at: "2024-02-01T00:00:00Z",
        updated_at: "2024-02-01T00:00:00Z",
        transactions_count: 500,
        // Add many additional fields to simulate large object
        ...Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`extra_field_${i}`, `value_${i}`])
        ),
        large_array: Array.from({ length: 50 }, (_, i) => ({
          item_id: `item_${i}`,
          item_value: `value_${i}`,
          nested_data: {
            field_a: `data_a_${i}`,
            field_b: `data_b_${i}`,
            field_c: `data_c_${i}`
          }
        }))
      };

      // Create many statements to simulate large response
      const manyStatements = Array.from({ length: 50 }, (_, i) => ({
        ...largeStatement,
        id: `stmt_${i}`,
        transactions_count: 100 + i
      }));

      const mockResponse = {
        items: manyStatements,
        next_cursor: "cursor_for_more"
      };
      mockBrexClient.getPrimaryCardStatements.mockResolvedValue(mockResponse);

      // Act
      const handler = toolHandlers.get("get_card_statements_primary")!;
      const result = await handler({
        method: "tools/call",
        params: {
          name: "get_card_statements_primary",
          arguments: {
            limit: 50
          }
        }
      } as any);

      // Assert
      const content = JSON.parse((result as any).content[0].text);
      
      // Verify all statements are returned
      expect(content.statements).toHaveLength(50);
      
      // Verify complete objects with all fields
      expect(content.statements[0]).toEqual(manyStatements[0]);
      expect(content.statements[0].extra_field_99).toBe("value_99");
      expect(content.statements[0].large_array).toHaveLength(50);
      
      // Verify no summarization occurred
      expect(content.meta.summary_applied).toBeUndefined();
    });
  });
});