/**
 * @file Tests for getBudgetPrograms tool - verifies complete object returns without summarization
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerGetBudgetPrograms } from "./getBudgetPrograms.js";
import { BrexClient } from "../services/brex/client.js";
import { BudgetProgramsResponse } from "../models/budget.js";

// Mock the Brex client
jest.mock("../services/brex/client.js");

// Mock logger to prevent console output during tests
jest.mock("../utils/logger.js", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn()
}));

describe("getBudgetPrograms", () => {
  let mockServer: Server;
  let mockBrexClient: jest.Mocked<BrexClient>;
  let toolHandler: (request: any) => Promise<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock server
    mockServer = {
      setRequestHandler: jest.fn()
    } as any;

    // Create mock Brex client
    mockBrexClient = {
      getBudgetPrograms: jest.fn()
    } as any;

    (BrexClient as jest.MockedClass<typeof BrexClient>).mockImplementation(() => mockBrexClient);

    // Capture the tool handler directly by mocking registerToolHandler
    const handlers: Record<string, any> = {};
    jest.doMock("./index.js", () => ({
      registerToolHandler: (name: string, handler: any) => {
        handlers[name] = handler;
        if (name === "get_budget_programs") {
          toolHandler = handler;
        }
      }
    }));

    registerGetBudgetPrograms(mockServer);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("complete object returns", () => {
    it("should return complete budget program objects without any summarization", async () => {
      const mockBudgetPrograms = [
        {
          id: "bp_001",
          name: "Engineering Budget",
          budget_program_status: "ACTIVE",
          description: "Budget for engineering team",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
          budget_limit: {
            amount: 50000,
            currency: "USD"
          },
          spend_limit: {
            amount: 45000,
            currency: "USD"
          },
          employee_count: 25,
          owner: {
            id: "user_123",
            email: "owner@company.com",
            name: "Budget Owner"
          },
          department: "Engineering",
          tags: ["tech", "r&d", "quarterly"],
          custom_fields: {
            cost_center: "CC-1001",
            project_code: "PROJ-2024-01"
          }
        },
        {
          id: "bp_002",
          name: "Marketing Budget",
          budget_program_status: "ACTIVE",
          description: "Budget for marketing campaigns",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-16T00:00:00Z",
          budget_limit: {
            amount: 75000,
            currency: "USD"
          },
          spend_limit: {
            amount: 70000,
            currency: "USD"
          },
          employee_count: 15,
          owner: {
            id: "user_456",
            email: "marketing@company.com",
            name: "Marketing Lead"
          },
          department: "Marketing",
          tags: ["campaigns", "quarterly", "growth"],
          custom_fields: {
            cost_center: "CC-2001",
            campaign_id: "MKT-Q1-2024"
          }
        }
      ];

      const mockResponse: BudgetProgramsResponse = {
        items: mockBudgetPrograms,
        next_cursor: "cursor_abc123"
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {
            limit: 10
          }
        }
      };

      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);

      // Verify complete objects are returned
      expect(result.budget_programs).toHaveLength(2);
      expect(result.budget_programs[0]).toEqual(mockBudgetPrograms[0]);
      expect(result.budget_programs[1]).toEqual(mockBudgetPrograms[1]);
      
      // Verify all fields are present - checking first budget program
      expect(result.budget_programs[0].id).toBe("bp_001");
      expect(result.budget_programs[0].name).toBe("Engineering Budget");
      expect(result.budget_programs[0].description).toBe("Budget for engineering team");
      expect(result.budget_programs[0].budget_limit).toEqual({ amount: 50000, currency: "USD" });
      expect(result.budget_programs[0].owner).toEqual({
        id: "user_123",
        email: "owner@company.com",
        name: "Budget Owner"
      });
      expect(result.budget_programs[0].tags).toEqual(["tech", "r&d", "quarterly"]);
      expect(result.budget_programs[0].custom_fields).toEqual({
        cost_center: "CC-1001",
        project_code: "PROJ-2024-01"
      });

      // Verify NO summary_applied field exists
      expect(result.meta.summary_applied).toBeUndefined();
    });

    it("should return complete objects even with large datasets", async () => {
      // Create a large budget program object with many nested fields
      const largeBudgetProgram = {
        id: "bp_large",
        name: "Large Department Budget",
        budget_program_status: "ACTIVE",
        description: "A very detailed budget program with extensive nested data structures",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-20T00:00:00Z",
        budget_limit: { amount: 1000000, currency: "USD" },
        spend_limit: { amount: 950000, currency: "USD" },
        employee_count: 500,
        owner: {
          id: "owner_001",
          email: "cfo@company.com",
          name: "Chief Financial Officer",
          department: "Finance",
          phone: "+1-555-0100",
          title: "CFO"
        },
        department: "Operations",
        tags: Array(50).fill(0).map((_, i) => `tag_${i}`),
        custom_fields: Object.fromEntries(
          Array(100).fill(0).map((_, i) => [`field_${i}`, `value_${i}`])
        ),
        spending_restrictions: {
          categories: Array(30).fill(0).map((_, i) => ({
            id: `cat_${i}`,
            name: `Category ${i}`,
            limit: 10000 + i * 100,
            spent: 5000 + i * 50
          })),
          vendor_restrictions: Array(20).fill(0).map((_, i) => ({
            vendor_id: `vendor_${i}`,
            vendor_name: `Vendor ${i}`,
            max_transaction: 5000,
            requires_approval: i % 2 === 0
          }))
        },
        audit_log: Array(100).fill(0).map((_, i) => ({
          timestamp: new Date(2024, 0, i + 1).toISOString(),
          action: `Action ${i}`,
          user: `user_${i}`,
          details: `Detailed description of action ${i} with additional context`
        }))
      };

      // Create 50 such large objects
      const manyLargeBudgetPrograms = Array(50).fill(0).map((_, i) => ({
        ...largeBudgetProgram,
        id: `bp_large_${i}`,
        name: `Large Department Budget ${i}`
      }));

      const mockResponse: BudgetProgramsResponse = {
        items: manyLargeBudgetPrograms,
        next_cursor: "cursor_large_dataset"
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {
            limit: 50
          }
        }
      };

      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);

      // Verify all 50 complete objects are returned
      expect(result.budget_programs).toHaveLength(50);
      
      // Verify first object has all fields intact
      expect(result.budget_programs[0]).toEqual(manyLargeBudgetPrograms[0]);
      expect(result.budget_programs[0].tags).toHaveLength(50);
      expect(Object.keys(result.budget_programs[0].custom_fields)).toHaveLength(100);
      expect(result.budget_programs[0].spending_restrictions.categories).toHaveLength(30);
      expect(result.budget_programs[0].audit_log).toHaveLength(100);

      // Verify last object is also complete
      expect(result.budget_programs[49]).toEqual(manyLargeBudgetPrograms[49]);
    });
  });

  describe("pagination", () => {
    it("should support pagination with limit and cursor", async () => {
      const mockBudgetPrograms = [
        { id: "bp_001", name: "Budget 1", budget_program_status: "ACTIVE" },
        { id: "bp_002", name: "Budget 2", budget_program_status: "ACTIVE" }
      ];

      const mockResponse: BudgetProgramsResponse = {
        items: mockBudgetPrograms,
        next_cursor: "next_page_cursor"
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {
            limit: 2,
            cursor: "previous_cursor"
          }
        }
      };

      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);

      // Verify pagination parameters were passed correctly
      expect(mockBrexClient.getBudgetPrograms).toHaveBeenCalledWith({
        limit: 2,
        cursor: "previous_cursor"
      });

      // Verify response includes next cursor
      expect(result.meta.next_cursor).toBe("next_page_cursor");
      expect(result.meta.count).toBe(2);
    });

    it("should handle no next cursor", async () => {
      const mockResponse: BudgetProgramsResponse = {
        items: [{ id: "bp_001", name: "Budget 1", budget_program_status: "ACTIVE" }],
        next_cursor: undefined
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {
            limit: 10
          }
        }
      };

      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);

      expect(result.meta.next_cursor).toBeNull();
    });
  });

  describe("filtering", () => {
    it("should filter by budget_program_status", async () => {
      const mockResponse: BudgetProgramsResponse = {
        items: [
          { id: "bp_001", name: "Inactive Budget", budget_program_status: "INACTIVE" }
        ]
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {
            budget_program_status: "INACTIVE"
          }
        }
      };

      const response = await toolHandler(request);
      
      // Verify the API was called with correct status filter
      expect(mockBrexClient.getBudgetPrograms).toHaveBeenCalledWith({
        budget_program_status: "INACTIVE"
      });

      const result = JSON.parse(response.content[0].text);
      expect(result.budget_programs[0].budget_program_status).toBe("INACTIVE");
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      const error = new Error("API connection failed");
      mockBrexClient.getBudgetPrograms.mockRejectedValue(error);

      const request = {
        params: {
          arguments: {}
        }
      };

      await expect(toolHandler(request)).rejects.toThrow("API connection failed");
    });

    it("should handle invalid limit parameter", async () => {
      const request = {
        params: {
          arguments: {
            limit: 150 // exceeds max of 100
          }
        }
      };

      await expect(toolHandler(request)).rejects.toThrow("Invalid limit");
    });

    it("should handle empty response", async () => {
      const mockResponse: BudgetProgramsResponse = {
        items: []
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {}
        }
      };

      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);

      expect(result.budget_programs).toEqual([]);
      expect(result.meta.count).toBe(0);
    });

    it("should handle non-array items response", async () => {
      const mockResponse: any = {
        items: null // Malformed response
      };

      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);

      const request = {
        params: {
          arguments: {}
        }
      };

      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);

      expect(result.budget_programs).toEqual([]);
      expect(result.meta.count).toBe(0);
    });
  });

  describe("parameter validation", () => {
    it("should reject fields parameter if provided", async () => {
      const request = {
        params: {
          arguments: {
            fields: ["id", "name"] // This parameter should not exist
          }
        }
      };

      // After implementation, fields parameter should be ignored or cause error
      // For now we expect it to be ignored
      const mockResponse: BudgetProgramsResponse = {
        items: [{ id: "bp_001", name: "Budget", budget_program_status: "ACTIVE", extra: "data" }]
      };
      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);
      
      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);
      
      // Should return complete object, not filtered
      expect(result.budget_programs[0].extra).toBe("data");
    });

    it("should reject summary_only parameter if provided", async () => {
      const request = {
        params: {
          arguments: {
            summary_only: true // This parameter should not exist
          }
        }
      };

      // After implementation, summary_only should be ignored
      const mockResponse: BudgetProgramsResponse = {
        items: [{ 
          id: "bp_001", 
          name: "Budget", 
          budget_program_status: "ACTIVE",
          description: "Full description",
          extra_field: "extra_value"
        }]
      };
      mockBrexClient.getBudgetPrograms.mockResolvedValue(mockResponse);
      
      const response = await toolHandler(request);
      const result = JSON.parse(response.content[0].text);
      
      // Should return complete object regardless of summary_only
      expect(result.budget_programs[0].description).toBe("Full description");
      expect(result.budget_programs[0].extra_field).toBe("extra_value");
    });
  });
});