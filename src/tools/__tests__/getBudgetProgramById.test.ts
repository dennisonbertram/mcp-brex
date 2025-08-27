/**
 * @file Tests for getBudgetProgramById tool
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerGetBudgetProgramById } from "../getBudgetProgramById.js";
import { BrexClient } from "../../services/brex/client.js";

// Mock Brex client
jest.mock("../../services/brex/client.js");

// Mock tool registration
const mockHandlers = new Map<string, any>();
jest.mock("../index.js", () => ({
  registerToolHandler: (name: string, handler: any): void => {
    mockHandlers.set(name, handler);
  },
  ToolCallRequest: jest.fn()
}));

describe("getBudgetProgramById", () => {
  let mockBrexClient: jest.Mocked<BrexClient>;
  let mockServer: Server;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlers.clear();
    
    mockBrexClient = {
      getBudgetProgram: jest.fn()
    } as any;
    
    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient);
    mockServer = {} as Server;
  });

  it("should register the get_budget_program tool handler", () => {
    registerGetBudgetProgramById(mockServer);
    expect(mockHandlers.has("get_budget_program")).toBe(true);
  });

  it("should return complete budget program object without any summarization", async () => {
    const mockBudgetProgram = {
      id: "bp_123",
      name: "Engineering Budget",
      budget_program_status: "ACTIVE",
      updated_at: "2024-01-15T10:30:00Z",
      description: "Budget for engineering department",
      amount: {
        amount: 50000,
        currency: "USD"
      },
      period_type: "MONTHLY",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      owner_user_id: "user_456",
      budget_limits: [
        {
          limit_type: "HARD",
          amount: {
            amount: 50000,
            currency: "USD"
          },
          limit_scope: "INDIVIDUAL"
        }
      ],
      employee_filter: {
        type: "DEPARTMENT",
        department_ids: ["dept_789"]
      },
      spending_restrictions: {
        allowed_categories: ["SOFTWARE", "TRAVEL", "OFFICE_SUPPLIES"],
        blocked_vendors: ["vendor_abc"],
        max_transaction_amount: {
          amount: 5000,
          currency: "USD"
        }
      },
      metadata: {
        cost_center: "ENG-001",
        project_code: "PROJ-2024",
        custom_field_1: "value1",
        custom_field_2: "value2"
      },
      created_at: "2024-01-01T00:00:00Z",
      created_by: "admin_user",
      last_modified_by: "admin_user",
      current_period_spent: {
        amount: 12500,
        currency: "USD"
      },
      current_period_balance: {
        amount: 37500,
        currency: "USD"
      }
    };

    mockBrexClient.getBudgetProgram.mockResolvedValue(mockBudgetProgram as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    const result = await handler({
      params: {
        arguments: { id: "bp_123" }
      }
    });

    expect(mockBrexClient.getBudgetProgram).toHaveBeenCalledWith("bp_123");
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    
    const parsedResult = JSON.parse(result.content[0].text);
    
    // Verify the complete object is returned
    expect(parsedResult.budget_program).toEqual(mockBudgetProgram);
    
    // Verify no summary metadata is included
    expect(parsedResult.meta).toBeUndefined();
    
    // Verify all fields are present
    expect(parsedResult.budget_program.id).toBe("bp_123");
    expect(parsedResult.budget_program.name).toBe("Engineering Budget");
    expect(parsedResult.budget_program.description).toBe("Budget for engineering department");
    expect(parsedResult.budget_program.amount).toEqual({ amount: 50000, currency: "USD" });
    expect(parsedResult.budget_program.budget_limits).toHaveLength(1);
    expect(parsedResult.budget_program.employee_filter).toBeDefined();
    expect(parsedResult.budget_program.spending_restrictions).toBeDefined();
    expect(parsedResult.budget_program.metadata).toBeDefined();
    expect(parsedResult.budget_program.current_period_spent).toBeDefined();
    expect(parsedResult.budget_program.current_period_balance).toBeDefined();
  });

  it("should handle large budget program objects without summarization", async () => {
    // Create a very large budget program object
    const largeBudgetProgram = {
      id: "bp_large",
      name: "Large Budget Program",
      budget_program_status: "ACTIVE",
      updated_at: "2024-01-15T10:30:00Z",
      description: "A".repeat(10000), // Very long description
      budget_limits: Array(100).fill(null).map((_, i) => ({
        limit_type: "HARD",
        amount: { amount: 1000 + i, currency: "USD" },
        limit_scope: "INDIVIDUAL"
      })),
      employee_filter: {
        type: "USERS",
        user_ids: Array(500).fill(null).map((_, i) => `user_${i}`)
      },
      spending_restrictions: {
        allowed_categories: Array(50).fill(null).map((_, i) => `CATEGORY_${i}`),
        blocked_vendors: Array(200).fill(null).map((_, i) => `vendor_${i}`)
      },
      metadata: Object.fromEntries(
        Array(100).fill(null).map((_, i) => [`field_${i}`, `value_${i}`])
      )
    };

    mockBrexClient.getBudgetProgram.mockResolvedValue(largeBudgetProgram as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    const result = await handler({
      params: {
        arguments: { id: "bp_large" }
      }
    });

    const parsedResult = JSON.parse(result.content[0].text);
    
    // Verify complete object is returned even when large
    expect(parsedResult.budget_program).toEqual(largeBudgetProgram);
    expect(parsedResult.budget_program.description.length).toBe(10000);
    expect(parsedResult.budget_program.budget_limits).toHaveLength(100);
    expect(parsedResult.budget_program.employee_filter.user_ids).toHaveLength(500);
    expect(parsedResult.budget_program.spending_restrictions.blocked_vendors).toHaveLength(200);
    expect(Object.keys(parsedResult.budget_program.metadata)).toHaveLength(100);
    
    // No summary should be applied
    expect(parsedResult.meta).toBeUndefined();
  });

  it("should not accept summary_only parameter", async () => {
    const mockBudgetProgram = {
      id: "bp_123",
      name: "Test Budget",
      budget_program_status: "ACTIVE",
      updated_at: "2024-01-15T10:30:00Z"
    };

    mockBrexClient.getBudgetProgram.mockResolvedValue(mockBudgetProgram as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    // Try to pass summary_only - it should be ignored
    const result = await handler({
      params: {
        arguments: { 
          id: "bp_123",
          summary_only: true  // This should be ignored
        }
      }
    });

    const parsedResult = JSON.parse(result.content[0].text);
    
    // Full object should still be returned
    expect(parsedResult.budget_program).toEqual(mockBudgetProgram);
    expect(parsedResult.meta).toBeUndefined();
  });

  it("should not accept fields parameter", async () => {
    const mockBudgetProgram = {
      id: "bp_123",
      name: "Test Budget",
      budget_program_status: "ACTIVE",
      updated_at: "2024-01-15T10:30:00Z",
      description: "Full budget program object",
      amount: { amount: 10000, currency: "USD" }
    };

    mockBrexClient.getBudgetProgram.mockResolvedValue(mockBudgetProgram as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    // Try to pass fields - it should be ignored
    const result = await handler({
      params: {
        arguments: { 
          id: "bp_123",
          fields: ["id", "name"]  // This should be ignored
        }
      }
    });

    const parsedResult = JSON.parse(result.content[0].text);
    
    // Full object should be returned, not just id and name
    expect(parsedResult.budget_program).toEqual(mockBudgetProgram);
    expect(parsedResult.budget_program.description).toBe("Full budget program object");
    expect(parsedResult.budget_program.amount).toBeDefined();
  });

  it("should throw error if id parameter is missing", async () => {
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    await expect(handler({
      params: {
        arguments: {}
      }
    })).rejects.toThrow("Missing required parameter: id");
  });

  it("should handle API errors gracefully", async () => {
    mockBrexClient.getBudgetProgram.mockRejectedValue(new Error("API Error"));
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    await expect(handler({
      params: {
        arguments: { id: "bp_123" }
      }
    })).rejects.toThrow("API Error");
    
    expect(mockBrexClient.getBudgetProgram).toHaveBeenCalledWith("bp_123");
  });

  it("should handle null or undefined budget program response", async () => {
    mockBrexClient.getBudgetProgram.mockResolvedValue(null as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    const result = await handler({
      params: {
        arguments: { id: "bp_nonexistent" }
      }
    });

    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.budget_program).toBeNull();
  });

  it("should handle empty budget program object", async () => {
    mockBrexClient.getBudgetProgram.mockResolvedValue({} as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    const result = await handler({
      params: {
        arguments: { id: "bp_empty" }
      }
    });

    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.budget_program).toEqual({});
  });

  it("should preserve nested object structures without modification", async () => {
    const complexBudgetProgram = {
      id: "bp_complex",
      name: "Complex Budget",
      nested: {
        level1: {
          level2: {
            level3: {
              deep_value: "preserved",
              array: [1, 2, 3],
              object: { key: "value" }
            }
          }
        }
      },
      arrays: {
        simple: [1, 2, 3],
        objects: [
          { id: 1, name: "first" },
          { id: 2, name: "second" }
        ],
        nested_arrays: [[1, 2], [3, 4], [5, 6]]
      }
    };

    mockBrexClient.getBudgetProgram.mockResolvedValue(complexBudgetProgram as any);
    
    registerGetBudgetProgramById(mockServer);
    const handler = mockHandlers.get("get_budget_program");
    
    const result = await handler({
      params: {
        arguments: { id: "bp_complex" }
      }
    });

    const parsedResult = JSON.parse(result.content[0].text);
    expect(parsedResult.budget_program).toEqual(complexBudgetProgram);
    expect(parsedResult.budget_program.nested.level1.level2.level3.deep_value).toBe("preserved");
    expect(parsedResult.budget_program.arrays.nested_arrays).toEqual([[1, 2], [3, 4], [5, 6]]);
  });
});