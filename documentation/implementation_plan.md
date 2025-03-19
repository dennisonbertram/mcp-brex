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
- [ ] Add expense type definitions from Swagger schema
- [ ] Create expense models and interfaces
- [ ] Set up expense API endpoints in the client
- [ ] Implement error handling specific to expenses

### 2. Expenses Resources
- [ ] Implement `brex://expenses/list` endpoint
  - Connect to Brex `/v1/expenses` API
  - Add pagination and filtering
  - Handle response formatting
- [ ] Implement `brex://expenses/{id}` endpoint
  - Add proper error handling
  - Implement response caching

### 3. Card Expenses Resources
- [ ] Implement `brex://expenses/card/list` endpoint
  - Connect to Brex `/v1/expenses/card` API
  - Add pagination and filtering
  - Handle response formatting
- [ ] Implement `brex://expenses/card/{id}` endpoint
  - Add proper error handling
  - Implement response caching

### 4. Receipt Management
- [ ] Implement `brex://expenses/card/receipt_match` endpoint
  - Connect to Brex `/v1/expenses/card/receipt_match` API
  - Handle file upload process
- [ ] Implement `brex://expenses/card/{id}/receipt_upload` endpoint
  - Connect to Brex `/v1/expenses/card/{expense_id}/receipt_upload` API
  - Handle file upload process

## Brex API v2 Migration Notes

### API Changes Discovered
- The Brex API has undergone significant changes in its endpoint structure
- The v1 endpoints for accounts and transactions are no longer available
- New endpoints use a more resource-specific structure (e.g., `/v2/accounts/cash`)

### Implementation Updates
- Updated client to use the v2 endpoints
- Added user information endpoint through `/v2/users/me`
- Implemented fallback mechanisms for when direct endpoints are not available
- Added improved error handling for API-specific errors (401, 404)
- Updated logging to include more detailed debug information

### Type Updates
- Account schema now matches the v2 API response format
- Transaction data is now accessed through statements endpoint

## Phase 4: Budget and Expense Resources (Week 7-8)

### 1. Budget Resources
- [ ] Implement `budgets://list` endpoint
  - Connect to Brex `/v2/budgets` API
  - Add pagination support
- [ ] Implement `budgets://{id}` endpoint
  - Add proper error handling for non-existent budgets
  - Implement caching for frequently accessed budgets

## Phase 5: Optimization and Documentation (Week 9-10)

### 1. Performance Optimization
- [ ] Implement intelligent caching strategy
- [ ] Add request batching where possible
- [ ] Optimize payload sizes

### 2. Documentation and Testing
- [x] Add API type documentation
- [ ] Write integration tests
- [ ] Create deployment documentation
- [ ] Add monitoring setup instructions

### 3. Security Review
- [x] Implement secure token handling
- [x] Verify no sensitive data exposure
- [x] Implement rate limiting
- [x] Implement error handling
- [x] Improve authentication error handling

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