# Brex Budget API Implementation Plan

This document outlines the plan for implementing the Brex Budget API endpoints in the MCP server, following the same pattern used for the Expenses API implementation.

## Overview

The Brex Budget API allows managing budgets, spend limits, and budget programs. This implementation will focus on providing a consistent interface for these resources through:

1. **Resource handlers** for GET operations
2. **Tool handlers** for POST, PUT, and DELETE operations

## Resource URI Structure

| API Endpoint | MCP Resource URI |
|--------------|------------------|
| GET /v2/budgets | `brex://budgets{/id}` |
| GET /v2/spend_limits | `brex://spend_limits{/id}` |
| GET /v1/budget_programs | `brex://budget_programs{/id}` |

## Implementation Phases

### Phase 1: Core Budget Resources

#### 1. Budget Resource Implementation
- [ ] Implement `brex://budgets` resource handler
  - Connect to GET `/v2/budgets` API
  - Add pagination support
  - Support filtering by cursor and limit
- [ ] Implement `brex://budgets/{id}` resource handler
  - Connect to GET `/v2/budgets/{id}` API
  - Add error handling for not found

#### 2. Spend Limits Resource Implementation
- [ ] Implement `brex://spend_limits` resource handler
  - Connect to GET `/v2/spend_limits` API
  - Add pagination support
  - Support filtering by cursor, limit, and member_user_id
- [ ] Implement `brex://spend_limits/{id}` resource handler
  - Connect to GET `/v2/spend_limits/{id}` API
  - Add error handling for not found

#### 3. Budget Programs Resource Implementation
- [ ] Implement `brex://budget_programs` resource handler
  - Connect to GET `/v1/budget_programs` API
  - Add pagination support
  - Support filtering by cursor and limit
- [ ] Implement `brex://budget_programs/{id}` resource handler
  - Connect to GET `/v1/budget_programs/{id}` API
  - Add error handling for not found

### Phase 2: Budget Management Tools

#### 1. Budget Tools
- [ ] Implement `create_budget` tool
  - Connect to POST `/v2/budgets` API
  - Add validation for required fields 
  - Handle response formatting
- [ ] Implement `update_budget` tool
  - Connect to PUT `/v2/budgets/{id}` API
  - Add validation for required fields
  - Handle error cases
- [ ] Implement `archive_budget` tool
  - Connect to POST `/v2/budgets/{id}/archive` API
  - Add confirmation mechanism
  - Handle error cases

#### 2. Spend Limit Tools
- [ ] Implement `create_spend_limit` tool
  - Connect to POST `/v2/spend_limits` API
  - Add validation for required fields
  - Handle authorization settings
- [ ] Implement `update_spend_limit` tool
  - Connect to PUT `/v2/spend_limits/{id}` API
  - Support partial updates
  - Handle error cases
- [ ] Implement `archive_spend_limit` tool
  - Connect to POST `/v2/spend_limits/{id}/archive` API
  - Add confirmation mechanism
  - Handle error cases

#### 3. Budget Program Tools
- [ ] Implement `create_budget_program` tool
  - Connect to POST `/v1/budget_programs` API
  - Support employee filtering and budget blueprints
  - Handle response formatting
- [ ] Implement `update_budget_program` tool
  - Connect to PUT `/v1/budget_programs/{id}` API
  - Support partial updates including blueprint management
  - Handle error cases
- [ ] Implement `delete_budget_program` tool
  - Connect to DELETE `/v1/budget_programs/{id}` API
  - Add confirmation mechanism
  - Handle error cases

## Technical Implementation Details

### 1. Resource Handler Pattern

For each resource (budgets, spend_limits, budget_programs), we'll implement:

```typescript
// Resource template
const budgetsTemplate = new ResourceTemplate("brex://budgets{/id}");

// Request handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request;
  
  // Check if we can handle this URI
  if (!uri.startsWith("brex://budgets")) {
    return { handled: false };
  }
  
  // Extract ID if present
  const match = budgetsTemplate.match(uri);
  const id = match?.id;
  
  try {
    if (id) {
      // Get single budget
      const budget = await brexClient.getBudget(id);
      return { 
        handled: true,
        resource: budget 
      };
    } else {
      // List budgets with pagination
      const params = parseQueryParams(uri);
      const budgets = await brexClient.getBudgets(params);
      return { 
        handled: true,
        resource: budgets
      };
    }
  } catch (error) {
    // Handle errors
    logError(`Error fetching budget data: ${error}`);
    throw error;
  }
});
```

### 2. Tool Handler Pattern

For each action tool (create, update, archive), we'll implement:

```typescript
// Tool handler registration
registerToolHandler("create_budget", async (request) => {
  try {
    // Validate parameters
    const params = validateParams(request.params.input);
    
    // Get Brex client
    const brexClient = getBrexClient();
    
    // Create budget
    const result = await brexClient.createBudget(params);
    
    // Return response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "success",
          budget_id: result.budget_id,
          message: "Budget created successfully"
        }, null, 2)
      }]
    };
  } catch (error) {
    // Handle errors
    logError(`Error in create_budget tool: ${error}`);
    throw error;
  }
});
```

### 3. Client Method Extensions

We'll extend the BrexClient class with methods for the budget API:

```typescript
// Get budgets (with pagination)
async getBudgets(params?: BudgetListParams): Promise<BudgetsResponse> {
  try {
    return await this.get('/v2/budgets', params);
  } catch (error) {
    // Handle specific errors
    throw error;
  }
}

// Get single budget
async getBudget(budgetId: string): Promise<Budget> {
  try {
    return await this.get(`/v2/budgets/${budgetId}`);
  } catch (error) {
    // Handle specific errors
    throw error;
  }
}

// Create budget
async createBudget(data: CreateBudgetRequest): Promise<Budget> {
  try {
    return await this.post('/v2/budgets', data);
  } catch (error) {
    // Handle specific errors
    throw error;
  }
}

// Similar methods for other operations
```

## Implementation Schedule

1. **Week 1**: Implement Budget and Spend Limit resource handlers
2. **Week 2**: Implement Budget Program resource handlers
3. **Week 3**: Implement Budget and Spend Limit tools
4. **Week 4**: Implement Budget Program tools

## Data Models

Key data models will include:

```typescript
// Budget model
interface Budget {
  budget_id: string;
  account_id: string;
  name: string;
  description?: string;
  parent_budget_id?: string;
  owner_user_ids?: string[];
  period_recurrence_type: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  amount: Money;
  spend_budget_status: SpendBudgetStatus;
  limit_type?: LimitType;
}

// Spend Limit model
interface SpendLimit {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  parent_budget_id?: string;
  status: SpendLimitStatus;
  period_recurrence_type: PeriodRecurrenceType;
  start_date?: string;
  end_date?: string;
  authorization_settings: AuthorizationSettings;
  // Additional fields...
}

// Budget Program model
interface BudgetProgram {
  id: string;
  name: string;
  description?: string;
  budget_blueprints: BudgetBlueprint[];
  existing_budget_ids?: string[];
  employee_filter?: EmployeeFilter;
  budget_program_status: BudgetProgramStatus;
  creator_user_id: string;
  created_at: string;
  updated_at: string;
}
```

## Pagination Approach

For listing endpoints that return potentially large datasets:
1. Use cursor-based pagination support
2. Return pagination metadata in the response
3. Support limit parameter to control page size

## Error Handling Strategy

1. Use specific error types for different API errors
2. Implement proper error logging
3. Return meaningful error messages to clients
4. Handle authentication errors consistently 