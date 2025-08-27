/**
 * @file Tests for getBudgetById tool
 * @description Comprehensive tests to ensure getBudgetById returns complete budget objects without summarization
 */

// Mock the config module first to prevent env validation
jest.mock("../../config/index.js", () => ({
  config: {
    brexApiKey: "test-api-key",
    brexApiUrl: "https://api.test.brex.com",
    port: 3000,
    rateLimitRequests: 100,
    rateLimitWindowMs: 60000
  }
}));

// Mock logger to prevent console output during tests
jest.mock("../../utils/logger.js", () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn()
}));

// Store the registered handler
let registeredHandler: any = null;

// Mock the registerToolHandler function
jest.mock("../index.js", () => ({
  registerToolHandler: jest.fn((name: string, handler: any) => {
    registeredHandler = handler;
  })
}));

// Mock the Brex client
jest.mock("../../services/brex/client.js", () => ({
  BrexClient: jest.fn()
}));

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerGetBudgetById } from "../getBudgetById.js";
import { BrexClient } from "../../services/brex/client.js";

describe("getBudgetById Tool", () => {
  let mockBrexClient: any;
  let mockServer: Server;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandler = null;
    
    // Create a mock Brex client instance
    mockBrexClient = {
      getBudget: jest.fn()
    };

    // Mock the BrexClient constructor to return our mock instance
    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient as any);

    // Create a mock server
    mockServer = {} as any;
    
    // Register the tool which should set registeredHandler
    registerGetBudgetById(mockServer);
  });

  describe("Parameter validation", () => {
    it("should require budget_id parameter", async () => {
      const request = {
        params: {
          arguments: {}
        }
      };

      await expect(registeredHandler(request)).rejects.toThrow("Missing required parameter: budget_id");
    });

    it("should NOT accept summary_only parameter", async () => {
      const mockBudget = {
        budget_id: "budget_123",
        account_id: "account_123",
        name: "Marketing Budget",
        amount: { amount: 10000, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "MONTHLY",
        updated_at: "2024-01-01T00:00:00Z",
        extra_field: "This should be included"
      };

      mockBrexClient.getBudget.mockResolvedValue(mockBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_123",
            summary_only: true  // This parameter should be ignored
          }
        }
      };

      const result = await registeredHandler(request);
      const parsedResult = JSON.parse(result.content[0].text);

      // The result should contain the complete budget object, NOT a summary
      expect(parsedResult.budget).toEqual(mockBudget);
      expect(parsedResult.budget.extra_field).toBe("This should be included");
    });

    it("should NOT accept fields parameter", async () => {
      const mockBudget = {
        budget_id: "budget_123",
        account_id: "account_123",
        name: "Marketing Budget",
        amount: { amount: 10000, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "MONTHLY",
        updated_at: "2024-01-01T00:00:00Z",
        extra_field: "This should be included",
        another_field: "This too"
      };

      mockBrexClient.getBudget.mockResolvedValue(mockBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_123",
            fields: ["budget_id", "name"]  // This parameter should be ignored
          }
        }
      };

      const result = await registeredHandler(request);
      const parsedResult = JSON.parse(result.content[0].text);

      // The result should contain the complete budget object, NOT filtered fields
      expect(parsedResult.budget).toEqual(mockBudget);
      expect(parsedResult.budget.extra_field).toBe("This should be included");
      expect(parsedResult.budget.another_field).toBe("This too");
    });
  });

  describe("Budget retrieval", () => {
    it("should return complete budget object without summarization", async () => {
      const mockBudget = {
        budget_id: "budget_123",
        account_id: "account_123",
        name: "Engineering Budget",
        description: "Budget for engineering department",
        amount: { amount: 50000, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "QUARTERLY",
        period_start: "2024-01-01",
        period_end: "2024-03-31",
        updated_at: "2024-01-01T00:00:00Z",
        created_at: "2023-12-01T00:00:00Z",
        owner_user_id: "user_456",
        members: ["user_789", "user_012"],
        parent_budget_id: "budget_parent_123",
        allocated_amount: { amount: 45000, currency: "USD" },
        available_amount: { amount: 5000, currency: "USD" },
        metadata: {
          cost_center: "ENG-001",
          project: "Platform Development"
        }
      };

      mockBrexClient.getBudget.mockResolvedValue(mockBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_123"
          }
        }
      };

      const result = await registeredHandler(request);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.budget).toEqual(mockBudget);
      
      // Verify all fields are present
      expect(parsedResult.budget.budget_id).toBe("budget_123");
      expect(parsedResult.budget.name).toBe("Engineering Budget");
      expect(parsedResult.budget.description).toBe("Budget for engineering department");
      expect(parsedResult.budget.metadata).toEqual({
        cost_center: "ENG-001",
        project: "Platform Development"
      });
    });

    it("should return very large budget objects without limiting", async () => {
      // Create a large budget object with many fields
      const mockBudget: any = {
        budget_id: "budget_large",
        account_id: "account_large",
        name: "Large Budget with Many Fields",
        description: "This is a very large budget object with many fields to test that no summarization occurs",
        amount: { amount: 1000000, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "ANNUAL"
      };

      // Add many additional fields to make the object large
      for (let i = 0; i < 100; i++) {
        mockBudget[`field_${i}`] = `Value ${i}: ${Array(100).fill('x').join('')}`;
      }

      // Add nested objects
      mockBudget.nested_data = {
        level1: {
          level2: {
            level3: {
              data: Array(50).fill({
                id: "item",
                value: "long_value_here_to_increase_size"
              })
            }
          }
        }
      };

      mockBrexClient.getBudget.mockResolvedValue(mockBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_large"
          }
        }
      };

      const result = await registeredHandler(request);
      const parsedResult = JSON.parse(result.content[0].text);

      // Verify the complete object is returned without summarization
      expect(parsedResult.budget).toEqual(mockBudget);
      expect(parsedResult.budget.field_50).toBeDefined();
      expect(parsedResult.budget.field_99).toBeDefined();
      expect(parsedResult.budget.nested_data.level1.level2.level3.data).toHaveLength(50);
      
      // Ensure no summary_applied flag exists
      expect(parsedResult.meta).toBeUndefined();
    });

    it("should handle null/empty budget gracefully", async () => {
      mockBrexClient.getBudget.mockResolvedValue(null);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_nonexistent"
          }
        }
      };

      const result = await registeredHandler(request);
      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.budget).toBeNull();
    });

    it("should handle API errors appropriately", async () => {
      mockBrexClient.getBudget.mockRejectedValue(new Error("Budget not found"));

      const request = {
        params: {
          arguments: {
            budget_id: "budget_invalid"
          }
        }
      };

      await expect(registeredHandler(request)).rejects.toThrow("Budget not found");
    });
  });

  describe("Response format", () => {
    it("should NOT include meta.summary_applied field", async () => {
      const mockBudget = {
        budget_id: "budget_test",
        account_id: "account_test",
        name: "Test Budget",
        amount: { amount: 5000, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "MONTHLY"
      };

      mockBrexClient.getBudget.mockResolvedValue(mockBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_test"
          }
        }
      };

      const result = await registeredHandler(request);
      const parsedResult = JSON.parse(result.content[0].text);

      // Should not have meta field with summary_applied
      expect(parsedResult.meta).toBeUndefined();
      expect(parsedResult.summary_applied).toBeUndefined();
    });

    it("should return properly formatted JSON response", async () => {
      const mockBudget = {
        budget_id: "budget_format",
        account_id: "account_format",
        name: "Format Test Budget",
        amount: { amount: 1000, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "MONTHLY"
      };

      mockBrexClient.getBudget.mockResolvedValue(mockBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_format"
          }
        }
      };

      const result = await registeredHandler(request);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      
      // Verify the response is valid JSON
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toHaveProperty("budget");
      expect(parsedResult.budget).toEqual(mockBudget);
    });
  });

  describe("No summary logic verification", () => {
    it("should not have any token limiting logic", async () => {
      // Create a budget that would exceed typical token limits
      const hugeBudget: any = {
        budget_id: "budget_huge",
        account_id: "account_huge",
        name: "Huge Budget",
        description: Array(5000).fill("x").join(""), // Very long description
        amount: { amount: 999999, currency: "USD" },
        spend_budget_status: "ACTIVE",
        period_recurrence_type: "ANNUAL"
      };

      // Add thousands of fields
      for (let i = 0; i < 1000; i++) {
        hugeBudget[`field_${i}`] = Array(100).fill("data").join("");
      }

      mockBrexClient.getBudget.mockResolvedValue(hugeBudget);

      const request = {
        params: {
          arguments: {
            budget_id: "budget_huge"
          }
        }
      };

      const result = await registeredHandler(request);
      const parsedResult = JSON.parse(result.content[0].text);

      // Verify the entire object is returned
      expect(parsedResult.budget).toEqual(hugeBudget);
      expect(Object.keys(parsedResult.budget).length).toBeGreaterThan(1000);
    });
  });
});