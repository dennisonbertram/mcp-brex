# MCP Server for Brex API Implementation Plan

## Phase 1: Core Setup and Authentication (Week 1-2)

### 1. Project Setup
- [x] Initialize TypeScript project with necessary dependencies
- [x] Set up project structure
- [x] Configure TypeScript and linting
- [x] Set up environment variable handling for Brex API tokens
- [x] Create authentication utility for Brex API token management

### 2. Core MCP Server Implementation
- [x] Implement base MCP server with stdio/HTTP transport layers
- [x] Set up error handling and logging infrastructure
- [x] Implement rate limiting for Brex API (1,000 requests/60s)
- [ ] Add basic health check endpoint

**Completed Items Details:**
- Project initialized with TypeScript, ESLint, and necessary dependencies
- Directory structure created with `src/services/brex`, `src/utils`, and `src/config`
- Environment variables configured for Brex API keys and server settings
- MCP logger integrated for consistent logging
- Brex API client implemented with authentication and rate limiting
- Base MCP server implemented with stdio transport
- Type definitions and guards created for Brex API responses
- Fixed Brex API client to use v2 endpoints after discovering API changes

## Phase 2: Resource Implementation (Week 3-4)

### 1. Transaction Resources
- [x] Implement transaction fetching functionality
  - Updated to use Brex `/v2/accounts/cash/{id}/statements` API
  - Added pagination handling
  - Implemented type validation
  - Added fallback mechanisms for endpoint changes
- [ ] Add caching layer
- [ ] Implement transaction filtering

### 2. Account Resources
- [x] Implement account listing functionality
  - Connected to Brex v2 cash accounts API (`/v2/accounts/cash`)
  - Formatted response according to MCP schema
  - Implemented proper error handling
- [x] Implement account details endpoint
  - Added type validation
  - Implemented error handling
  - Added fallback mechanisms for retrieving specific accounts

### 3. Team Resources
- [x] Implement current user endpoint
  - Connected to `/v2/users/me` API
  - Added proper error handling
- [ ] Implement `users://list` endpoint
- [ ] Implement `departments://list` endpoint
- [ ] Implement `locations://list` endpoint

## Phase 3: Expenses API Implementation (Week 5-6)

### 1. Expenses Core Setup
- [x] Add expense type definitions from Swagger schema
- [x] Create expense models and interfaces
- [x] Set up expense API endpoints in the client
- [x] Implement error handling specific to expenses
- [x] Make expense validation more permissive to avoid invalid expense data errors

### 2. Expenses Resources
- [x] Implement `brex://expenses/list` endpoint
  - Connect to Brex `/v1/expenses` API
  - Add pagination and filtering
  - Handle response formatting
- [x] Implement `brex://expenses/{id}` endpoint
  - Connect to Brex `/v1/expenses/{id}` API
  - Add error handling for not found
- [x] Implement `brex://expenses/card/list` endpoint
  - Connect to Brex `/v1/expenses/card` API
  - Add pagination and filtering
  - Handle response formatting
- [x] Implement `brex://expenses/card/{id}` endpoint
  - Connect to Brex `/v1/expenses/card/{id}` API
  - Add error handling for not found

### 3. Receipt Management
- [x] Implement `brex://expenses/card/receipt_match` endpoint
  - Connect to Brex `/v1/expenses/card/receipt_match` API
  - Add tool for receipt matching
- [x] Implement `brex://expenses/card/{id}/receipt_upload` endpoint
  - Connect to Brex `/v1/expenses/card/{expense_id}/receipt_upload` API
  - Add tool for receipt upload

## Phase 4: Budget and Expense Resources (Week 7-8)

### 1. Budget Resources
- [ ] Implement `brex://budgets` resource handler
  - Connect to Brex `/v2/budgets` API
  - Add pagination support
  - Support filtering by cursor and limit
- [ ] Implement `brex://budgets/{id}` resource handler
  - Connect to GET `/v2/budgets/{id}` API
  - Add error handling for not found

### 2. Spend Limits Resources
- [ ] Implement `brex://spend_limits` resource handler
  - Connect to Brex `/v2/spend_limits` API
  - Add pagination and filtering support
  - Handle response formatting
- [ ] Implement `brex://spend_limits/{id}` resource handler
  - Connect to GET `/v2/spend_limits/{id}` API
  - Add proper error handling

### 3. Budget Programs Resources
- [ ] Implement `brex://budget_programs` resource handler
  - Connect to Brex `/v1/budget_programs` API
  - Add pagination support
  - Support filtering by cursor and limit
- [ ] Implement `brex://budget_programs/{id}` resource handler
  - Connect to GET `/v1/budget_programs/{id}` API
  - Add error handling for not found

### 4. Budget Management Tools
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

### 5. Spend Limit Tools
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

### 6. Budget Program Tools
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

## Phase 5: Receipt Management and Enhanced Expense Features (Week 9-10)

### 1. Enhanced Receipt Management
- [x] Implement improved `brex://expenses/receipt-match` tool
  - Connect to POST `/v1/expenses/receipt_match` API
  - Add support for automatic matching
- [x] Implement batch receipt processing capabilities
  - Add support for uploading multiple receipts
  - Create a queue system for handling large uploads
  - Implement receipt status tracking

### 2. Expense Management Enhancements
- [x] Implement `brex://expenses/card/{id}/update` tool
  - Connect to PUT `/v1/expenses/card/{expense_id}` API
  - Add memo update support
  - Add support for updating categories, budget, etc.
- [ ] Implement bulk expense operations
  - Support batch updates of expenses
  - Add reporting capabilities for expense summaries
  - Implement export functionality for expense data

## Phase 6: Transaction and Account Resources (Week 13-14)

### 1. Card Account Resources
- [ ] Implement `brex://accounts/card/list` endpoint
  - Connect to GET `/v2/accounts/card` API
  - Retrieve and format all card accounts
  - Add proper error handling and response validation
- [ ] Implement `brex://accounts/card/primary/statements` endpoint
  - Connect to GET `/v2/accounts/card/primary/statements` API
  - Add pagination support with cursor and limit parameters
  - Implement caching for frequently accessed statements
  
### 2. Cash Account Resources
- [ ] Implement `brex://accounts/cash/list` endpoint
  - Connect to GET `/v2/accounts/cash` API
  - Add pagination support
  - Handle response formatting
- [ ] Implement `brex://accounts/cash/primary` endpoint
  - Connect to GET `/v2/accounts/cash/primary` API
  - Add proper error handling
  - Implement caching for improved performance
- [ ] Implement `brex://accounts/cash/{id}` endpoint
  - Connect to GET `/v2/accounts/cash/{id}` API
  - Add validation for ID parameter
  - Ensure proper error handling for non-existent accounts
- [ ] Implement `brex://accounts/cash/{id}/statements` endpoint
  - Connect to GET `/v2/accounts/cash/{id}/statements` API
  - Add pagination support with cursor and limit parameters
  - Implement caching for frequently accessed statements
  
### 3. Transaction Resources
- [ ] Implement `brex://transactions/card/primary` endpoint
  - Connect to GET `/v2/transactions/card/primary` API
  - Add support for all query parameters:
    - cursor and limit for pagination
    - user_ids for filtering by user
    - posted_at_start for date filtering
    - expand[] for expanding expense_id information
  - Add proper response validation and error handling
- [ ] Implement `brex://transactions/cash/{id}` endpoint
  - Connect to GET `/v2/transactions/cash/{id}` API
  - Add support for query parameters:
    - cursor and limit for pagination
    - posted_at_start for date filtering
  - Add validation for ID parameter
  - Ensure proper error handling

## Phase 7: Optimization and Documentation (Week 15-16)

### 1. Performance Optimization
- [ ] Implement intelligent caching strategy
  - Add Redis caching for frequently accessed resources
  - Implement cache invalidation strategy
  - Add cache headers to responses
- [ ] Add request batching where possible
  - Group related expenses/transactions
  - Implement parallel fetching
- [ ] Optimize response payload size
  - Add compression
  - Implement field filtering

### 2. Documentation and Examples
- [ ] Update API documentation
  - Document all endpoints with examples
  - Add authentication instructions
  - Include error handling guide
- [ ] Create usage examples
  - Add example queries for each resource type
  - Provide sample code for common operations
  - Include Postman collection for testing

## MCP SDK Compatibility Analysis

### 1. Resource Compatibility
The following Resource-type endpoints align well with MCP SDK requirements:
- `brex://expenses/list` (GET `/v1/expenses`)
- `brex://expenses/card/list` (GET `/v1/expenses/card`)
- `brex://accounts/card/list` (GET `/v2/accounts/card`)
- `brex://accounts/cash/list` (GET `/v2/accounts/cash`)
- `brex://transactions/card/primary` (GET `/v2/transactions/card/primary`)
- `brex://transactions/cash/{id}` (GET `/v2/transactions/cash/{id}`)
- `budgets://list` (GET `/v2/budgets`)

These resources can be implemented as standard MCP Resources using ResourceTemplate:
```typescript
server.resource(
  "expenses",
  new ResourceTemplate("brex://expenses/list", { list: "Expenses List" }),
  async (uri) => ({
    contents: [{ uri: uri.href, text: "Expense data..." }]
  })
);
```

### 2. Tool Compatibility
The following Tool-type endpoints are well-suited for the MCP SDK tool functionality:
- `brex://expenses/card/receipt_match` (POST `/v1/expenses/card/receipt_match`)
- `brex://expenses/card/{id}/receipt_upload` (POST `/v1/expenses/card/{expense_id}/receipt_upload`)
- `brex://spend-limits/create` (POST `/v1/budgets`)
- `brex://spend-limits/{id}/update` (PUT `/v1/budgets/{id}`)
- `brex://vendors/create` (POST `/v1/vendors`)
- `brex://vendors/{id}/update` (PUT `/v1/vendors/{id}`)

These can be implemented as MCP Tools using zod schema validation:
```typescript
server.tool(
  "upload-receipt",
  { 
    expense_id: z.string(),
    receipt_file: z.string() 
  },
  async ({ expense_id, receipt_file }) => {
    // Implementation
    return { content: [{ type: "text", text: "Receipt uploaded" }] };
  }
);
```

### 3. Incompatibility Issues

#### 3.1 Binary File Handling
**Issue**: The MCP SDK doesn't have native support for uploading binary files in tools, which affects:
- Receipt upload endpoints
- Document attachment endpoints

**Solution**: 
- Implement a two-step process: first generate a signed URL, then provide instructions for direct upload
- Consider Base64 encoding for small files as an alternative

#### 3.2 Pagination Handling
**Issue**: Brex uses cursor-based pagination, while MCP Resources don't have built-in pagination handling.

**Solution**:
- Implement custom pagination using query parameters in resource URIs
- Create dedicated pagination resources (e.g., `brex://expenses/list?cursor=xyz`)
- Document pagination approach for clients

#### 3.3 Response Structure Normalization
**Issue**: Brex API responses need to be transformed to match MCP's expected format.

**Solution**:
- Create transformation layers to normalize responses
- Implement consistent error handling across all endpoints
- Add response validation to ensure MCP compatibility

### 4. Implementation Recommendations

1. **Resource naming strategy**: Standardize on `brex://` prefix for Brex-specific resources and match endpoint naming to Brex API where possible.

2. **Error handling**: Map Brex API errors (401, 403, 404) to appropriate MCP error responses.

3. **Authentication flow**: Implement token refresh and validation consistent with both Brex and MCP requirements.

4. **Documentation**: Create clear examples showing how each Brex endpoint maps to MCP primitives.

5. **Testing**: Develop comprehensive tests ensuring compatibility between Brex responses and MCP expected formats.

## Resource Schema Implementation Details

### Transaction Resource Schema
```typescript
interface Transaction {
  id: string;
  amount: Money;
  date: string;
  description: string;
  merchant?: string;
  category?: string;
  status: 'PENDING' | 'POSTED';
  type: 'DEBIT' | 'CREDIT';
}
```

### Account Resource Schema
```typescript
interface Account {
  id: string;
  name: string;
  current_balance: Money;
  available_balance: Money;
  routing_number?: string;
  primary: boolean;
}
```

### Expense Resource Schema
```typescript
interface Expense {
  id: string;
  memo?: string;
  original_amount?: Money;
  billing_amount?: Money;
  purchased_at?: string;
  updated_at: string;
  category?: string;
  merchant_id?: string;
  merchant?: Merchant;
  location_id?: string;
  department_id?: string;
  status?: ExpenseStatus;
  payment_status?: ExpensePaymentStatus;
  expense_type?: ExpenseType;
  receipts?: Receipt[];
  user_id?: string;
}

interface Merchant {
  raw_descriptor: string;
  mcc: string;
  country: string;
}

type ExpenseStatus = 
  'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'OUT_OF_POLICY' | 
  'VOID' | 'CANCELED' | 'SPLIT' | 'SETTLED';

type ExpensePaymentStatus = 
  'NOT_STARTED' | 'PROCESSING' | 'CANCELED' | 'DECLINED' | 
  'CLEARED' | 'REFUNDING' | 'REFUNDED' | 'CASH_ADVANCE' | 
  'CREDITED' | 'AWAITING_PAYMENT' | 'SCHEDULED';
```

### Budget Resource Schema
```typescript
interface Budget {
  id: string;
  name: string;
  amount: Money;
  period: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  spent: Money;
  remaining: Money;
}
```

## Testing Checklist

For each resource endpoint:
- [ ] Test successful data retrieval
- [ ] Test error handling
- [ ] Test rate limiting
- [ ] Test caching
- [ ] Test pagination
- [ ] Test data format compliance
- [ ] Test authentication failures

## Security Checklist

- [x] Verify no PAN or CVV exposure
- [x] Ensure proper token handling
- [x] Verify rate limiting effectiveness
- [x] Check error message information exposure
- [x] Test authentication edge cases
- [ ] Verify proper HTTPS usage
- [x] Check logging for sensitive data

## Deployment Checklist

- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring
- [ ] Set up alerting
- [ ] Create backup strategy
- [ ] Document deployment process
- [ ] Create rollback procedures
- [ ] Test scaling capabilities

## Next Steps
1. Implement health check endpoint
2. Add caching layer for accounts and transactions
3. Write integration tests for existing functionality
4. Implement expenses API integration
5. Complete team resources implementation
6. Implement budget and spend limits resources and tools (see detailed plan in `documentation/budget_implementation_plan.md`)

## Brex Budget API Integration Plan

For a detailed implementation plan for the Brex Budget API, please refer to the dedicated document at `documentation/budget_implementation_plan.md`, which outlines:

- Resource URI structure for budget endpoints
- Implementation phases for budget resources and tools
- Technical implementation details including code patterns
- Data models for budgets, spend limits, and budget programs
- Error handling and pagination strategies

The Budget API endpoints that will be implemented include:

### Budget Endpoints (v2)
- **GET /v2/budgets**
  - **MCP Resource URI**: `brex://budgets`
  - **Description**: Retrieves all budgets with pagination
  - **Implementation Priority**: High

- **GET /v2/budgets/{id}**
  - **MCP Resource URI**: `brex://budgets/{id}`
  - **Description**: Retrieves a specific budget by ID
  - **Implementation Priority**: High

- **POST /v2/budgets**
  - **MCP Tool Name**: `create_budget`
  - **Description**: Creates a new budget
  - **Implementation Priority**: Medium

- **PUT /v2/budgets/{id}**
  - **MCP Tool Name**: `update_budget`
  - **Description**: Updates an existing budget
  - **Implementation Priority**: Medium

- **POST /v2/budgets/{id}/archive**
  - **MCP Tool Name**: `archive_budget`
  - **Description**: Archives an existing budget
  - **Implementation Priority**: Low

### Spend Limits Endpoints (v2)
- **GET /v2/spend_limits**
  - **MCP Resource URI**: `brex://spend_limits`
  - **Description**: Retrieves all spend limits with pagination
  - **Implementation Priority**: High

- **GET /v2/spend_limits/{id}**
  - **MCP Resource URI**: `brex://spend_limits/{id}`
  - **Description**: Retrieves a specific spend limit by ID
  - **Implementation Priority**: High

- **POST /v2/spend_limits**
  - **MCP Tool Name**: `create_spend_limit`
  - **Description**: Creates a new spend limit
  - **Implementation Priority**: Medium

- **PUT /v2/spend_limits/{id}**
  - **MCP Tool Name**: `update_spend_limit`
  - **Description**: Updates an existing spend limit
  - **Implementation Priority**: Medium

- **POST /v2/spend_limits/{id}/archive**
  - **MCP Tool Name**: `archive_spend_limit`
  - **Description**: Archives an existing spend limit
  - **Implementation Priority**: Low

### Budget Programs Endpoints (v1)
- **GET /v1/budget_programs**
  - **MCP Resource URI**: `brex://budget_programs`
  - **Description**: Retrieves all budget programs with pagination
  - **Implementation Priority**: Medium

- **GET /v1/budget_programs/{id}**
  - **MCP Resource URI**: `brex://budget_programs/{id}`
  - **Description**: Retrieves a specific budget program by ID
  - **Implementation Priority**: Medium

- **POST /v1/budget_programs**
  - **MCP Tool Name**: `create_budget_program`
  - **Description**: Creates a new budget program
  - **Implementation Priority**: Low

- **PUT /v1/budget_programs/{id}**
  - **MCP Tool Name**: `update_budget_program`
  - **Description**: Updates an existing budget program
  - **Implementation Priority**: Low

- **DELETE /v1/budget_programs/{id}**
  - **MCP Tool Name**: `delete_budget_program`
  - **Description**: Deletes an existing budget program
  - **Implementation Priority**: Low

## Brex Expenses API Integration Plan

Based on the analysis of the expenses-swagger.json file, the following endpoints can be integrated into the MCP server:

### 1. List Expenses Endpoints

#### GET /v1/expenses
- **MCP Resource URI**: `brex://expenses{/id}`
- **Description**: Retrieves a list of all expenses or a specific expense by ID
- **Features**:
  - Pagination support via cursor and limit parameters
  - Extensive filtering options (user_id, budget_id, expense_type, status, etc.)
  - Date range filtering (purchased_at_start/end, updated_at_start/end)
  - Expandable fields for additional details (merchant, location, department, etc.)
  - Custom fields support
- **Implementation Priority**: High (core functionality)

#### GET /v1/expenses/card
- **MCP Resource URI**: `brex://expenses/card{/id}`
- **Description**: Retrieves a list of card expenses or a specific card expense by ID
- **Features**:
  - Similar filtering capabilities as general expenses endpoint
  - Card-specific expense details
  - Pagination support
  - Expandable fields
- **Implementation Priority**: High (core functionality)

#### GET /v1/expenses/{id}
- **MCP Resource URI**: `brex://expenses/{id}`
- **Description**: Retrieves a specific expense by ID
- **Features**:
  - Detailed expense information
  - Expandable fields for related data
  - Custom fields support
- **Implementation Priority**: High (core functionality)

#### GET /v1/expenses/card/{expense_id}
- **MCP Resource URI**: `brex://expenses/card/{id}`
- **Description**: Retrieves a specific card expense by ID
- **Features**:
  - Detailed card expense information
  - Expandable fields for related data
  - Custom fields support
- **Implementation Priority**: High (core functionality)

### 2. Receipt Management Endpoints

#### POST /v1/expenses/card/receipt_match
- **MCP Tool Name**: `match_receipt`
- **Description**: Creates a pre-signed S3 URL for uploading a receipt that will be automatically matched with existing expenses
- **Features**:
  - Receipt upload via pre-signed URL
  - Automatic matching with transactions
  - Email notification upon completion
- **Implementation Priority**: Medium

#### POST /v1/expenses/card/{expense_id}/receipt_upload
- **MCP Tool Name**: `upload_receipt`
- **Description**: Creates a pre-signed S3 URL for uploading a receipt directly to a specific expense
- **Features**:
  - Direct receipt attachment to specific expense
  - Pre-signed URL with 30-minute validity
- **Implementation Priority**: Medium

### 3. Expense Management Endpoints

#### PUT /v1/expenses/card/{expense_id}
- **MCP Tool Name**: `update_expense`
- **Description**: Updates an existing card expense (memo and other fields)
- **Features**:
  - Update expense details
  - Admin and bookkeeper-specific permissions
- **Implementation Priority**: Medium

### 4. Implementation Considerations

#### Receipt Upload Implementation
For receipt upload endpoints, which require file upload capabilities, we recommend the following approach:
1. Create MCP tools that generate pre-signed URLs for receipt uploads
2. Return the pre-signed URL to the client along with instructions on how to use it
3. Provide a webhook or callback mechanism for upload status notification

#### Expandable Fields
The Brex API supports expandable fields for additional details. MCP implementation should:
1. Support expansion via query parameters in the resource URI
2. Implement field expansion logic in the resource handlers
3. Document the available expansion options for each resource

#### Pagination Strategy
For list endpoints that return potentially large datasets:
1. Implement cursor-based pagination support in MCP resources
2. Return pagination metadata in the response
3. Support limit parameter to control page size
4. Provide pagination examples in documentation

#### User Permissions
The Brex API has different permission levels for regular users vs. admin/bookkeepers:
1. Implement permission checking in resource handlers
2. Return appropriate error responses for unauthorized access
3. Document permission requirements for each endpoint

### 5. Integration Roadmap

1. **Phase 1 (Week 1-2)**
   - Implement core expense list endpoints (GET /v1/expenses, GET /v1/expenses/card)
   - Add basic filtering support
   - Implement single expense retrieval endpoints

2. **Phase 2 (Week 3-4)**
   - Implement advanced filtering options
   - Add pagination support
   - Implement expandable fields functionality

3. **Phase 3 (Week 5-6)**
   - Implement receipt upload tools
   - Add receipt management capabilities
   - Implement expense update functionality

4. **Phase 4 (Week 7-8)**
   - Add custom fields support
   - Improve error handling and validation
   - Optimize performance with caching

5. **Testing and Documentation (Week 9-10)**
   - Comprehensive testing of all endpoints
   - Write detailed documentation with examples
   - Create integration guides for clients