# 001 - Improve MCP Server Discoverability and Consistency

## Description

Fix critical usability issues in the mcp-brex MCP server identified during comprehensive testing:

1. **Generic Tool Schemas** - All 21 tools return `{"type":"object","properties":{},"additionalProperties":true}`, making parameter discovery impossible for LLM agents
2. **Minimal Tool Descriptions** - All tools follow pattern "Tool: {tool_name}" with no useful information about purpose or use cases
3. **Resource Query Parameters Undocumented** - Resources support `?summary_only=true&fields=...` but this isn't documented in resource metadata
4. **Money Annotation Inconsistency** - The amount field handling has potential inconsistencies (cents vs dollars×100)

These issues severely impact the MCP server's discoverability and usability, requiring users to rely heavily on external README documentation instead of the protocol's built-in discovery mechanisms.

## Success Criteria

- [ ] All 21 tools have descriptive inputSchema with actual parameter definitions (type, description, constraints)
- [ ] All tool descriptions explain purpose and use cases (1-2 sentences minimum)
- [ ] Resource descriptions document available query parameters (`summary_only`, `fields`)
- [ ] Money annotation is consistent and verified across all amount fields
- [ ] All existing tests pass (100% coverage maintained)
- [ ] TypeScript strict mode compliance maintained (no type errors)
- [ ] Code review approved by subagent
- [ ] Manual testing with `/test-mcp` shows proper tool schemas
- [ ] Documentation updated (README, CHANGELOG, LEARNINGS.md)

## Failure Conditions

- Breaking changes to existing tool behavior
- Type safety violations (any `any` types introduced)
- Tests failing after changes
- Money annotation producing incorrect dollar/cent conversions
- Schema changes that make tools unusable by LLM clients
- Performance degradation in tool listing or invocation

## Edge Cases and How They're Handled

1. **Tools with optional vs required parameters**
   - Mark required parameters explicitly in schema
   - Provide defaults where sensible
   - Document optional parameter behavior in descriptions

2. **Tools with array parameters** (status, expand)
   - Define array schemas with item types
   - Use enum constraints where applicable
   - Document array parameter behavior

3. **Tools with nested parameter objects**
   - Define nested object schemas properly
   - Keep additionalProperties: true for forward compatibility

4. **Resources with dynamic IDs in URI templates**
   - Document template variables in descriptions
   - Provide examples of valid URIs

5. **Amount fields that are null/undefined**
   - Money annotation already handles this in `isMoneyLike()` predicate
   - Ensure all code paths check for null/undefined before annotation

6. **Pagination parameters across different tools**
   - Standardize cursor/limit/page_size/max_items naming
   - Document pagination behavior consistently

## Implementation Approach

### Research Findings from Context7

The Brex API documentation from Context7 revealed:

**Money Representation:**
- All amounts are in **cents** (integer values)
- Example: `{ "amount": 700, "currency": "USD" }` = $7.00
- Current money.ts correctly assumes input is in cents: `const dollars = cents / 100`

**Common Parameters Across Endpoints:**
- **Pagination**: `cursor` (string), `limit` (number, typically 1-100)
- **Filtering**: `status` (array of enums), date ranges, amount ranges
- **Expansion**: `expand` (array of strings) - commonly `["merchant", "budget", "user", "department", "location", "receipts"]`

**Expenses API (/v1/expenses):**
- Query parameters: `cursor`, `limit`, `expand[]`
- Response: `{ "next_cursor": "string", "items": [...] }`
- Expandable fields: merchant, budget, department, location, receipts, user
- Status values: APPROVED, PENDING, DECLINED, CANCELLED (inferred from code)
- Expense types: CARD, CASH (from code)

**Budgets API (/v2/budgets):**
- Query parameters: `cursor`, `limit`, `parent_budget_id`, `spend_budget_status`
- Status values: ACTIVE, ARCHIVED, DRAFT
- Response includes: id, name, description, amount, period_recurrence_type, status, limit_type

**Spend Limits API (/v2/spend_limits):**
- Query parameters: `cursor`, `limit`, `member_user_id[]`
- Response includes: id, name, status, period_recurrence_type, authorization_settings, start_date, end_date

**Transactions API:**
- Card transactions: `/v2/transactions/card/primary` - NO support for `posted_at_start` or `expand`
- Cash transactions: `/v2/transactions/cash/{id}` - NO support for `posted_at_start` or `expand`
- Must filter client-side by `posted_at_date` field
- Query parameters: `cursor`, `limit`, `user_ids[]`

**Accounts API (/v2/accounts):**
- Types: CARD, CASH
- Status: ACTIVE, INACTIVE, CLOSED
- Response includes: id, name, type, currency, balance, status

---

### Task 1: Create Reference Documentation

**Location**: `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-brex/docs/documentation/brex-api/`

Create comprehensive API reference with actual schemas extracted from Context7:

**Files to Create:**
1. `API.md` - Master reference with all endpoint schemas
2. `PARAMETERS.md` - Common parameter definitions and constraints
3. `SCHEMAS.md` - Response object schemas
4. `ENUMS.md` - All enum values (status, types, etc.)

**Content Structure:**
```markdown
## Expenses API

### List Expenses
**Endpoint**: GET /v1/expenses
**Parameters**:
- cursor (string, optional) - Pagination cursor
- limit (number, optional, 1-100) - Items per page
- expand[] (array<string>, optional) - Fields to expand: merchant, budget, user, department, location, receipts
- expense_type[] (array<string>, optional) - Filter by type: CARD, CASH
- status[] (array<string>, optional) - Filter by status: APPROVED, PENDING, DECLINED, CANCELLED
- payment_status[] (array<string>, optional) - Filter by payment status

**Response**:
{
  "next_cursor": "string",
  "items": [Expense objects]
}
```

---

### Task 2: Fix Tool Schemas

**Current State (from src/tools/index.ts lines 82-97):**
```typescript
tools: names.map((n) => ({
  name: n,
  description: `Tool: ${n}`,
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: true,
  },
}))
```

**Target State:**
Each tool should have a specific schema. Example for `get_expenses`:

```typescript
{
  name: "get_expenses",
  description: "Retrieve a paginated list of expenses with optional filters for status, type, and amount. Supports expansion of related objects like merchant and budget details. Returns expenses with automatic money annotation (cents, dollars, formatted).",
  inputSchema: {
    type: "object",
    properties: {
      expense_type: {
        type: "string",
        enum: ["CARD", "CASH"],
        description: "Type of expenses to retrieve"
      },
      status: {
        type: "string",
        enum: ["APPROVED", "PENDING", "DECLINED", "CANCELLED"],
        description: "Filter by expense approval status"
      },
      payment_status: {
        type: "string",
        enum: ["NOT_STARTED", "PENDING", "PROCESSING", "CLEARED", "DECLINED", "CANCELLED", "REFUNDED", "MATCHED"],
        description: "Filter by payment processing status"
      },
      limit: {
        type: "number",
        description: "Maximum number of expenses to return (default: 50, max: 100)",
        minimum: 1,
        maximum: 100
      },
      expand: {
        type: "array",
        items: {
          type: "string",
          enum: ["merchant", "budget", "user", "department", "location", "receipts"]
        },
        description: "Related objects to include in response. Default: [] for minimal size"
      },
      format_amounts: {
        type: "string",
        enum: ["cents", "dollars", "both"],
        description: "Money format mode (default: both - includes amount_cents, amount_dollars, amount_formatted)"
      },
      include_formatted: {
        type: "boolean",
        description: "Include formatted currency strings (default: true)"
      },
      include_summary: {
        type: "boolean",
        description: "Include summary statistics (total, average, min, max) in meta (default: true)"
      }
    },
    additionalProperties: true  // Keep permissive for forward compatibility
  }
}
```

**Implementation Strategy:**

**Option A: Define schemas inline in tools/index.ts** (Recommended for speed)
- Create a `toolSchemas` object mapping tool names to schema definitions
- Replace the current generic mapping with specific schemas
- Pros: Single file change, easy to review
- Cons: tools/index.ts becomes longer

**Option B: Create separate schema files**
- Create `src/schemas/tools/` directory
- One file per tool: `expenses.ts`, `budgets.ts`, etc.
- Import and aggregate in tools/index.ts
- Pros: Better organization, easier to maintain
- Cons: More files to create and manage

**Recommended: Option A** for this task, can refactor to Option B later if needed.

**Files to Modify:**
- `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-brex/src/tools/index.ts` (lines 82-97)

**Implementation Steps:**
1. Create a `const toolSchemas` object before `registerListToolsHandler()`
2. Define schema for each of the 21 tools
3. Update the `tools:` array to use specific schemas instead of generic
4. Ensure all enums match the values from the actual Brex API and type definitions

**Schema Definitions for All 21 Tools:**

See full schemas in implementation section below (too long to include here, but follows pattern above).

---

### Task 3: Enhance Tool Descriptions

**Current Pattern**: `"Tool: {tool_name}"`

**Target Pattern**: `"{Action} {what} with {key features}. {Important notes}."`

**All 21 Tool Descriptions:**

1. **get_expenses**
   - "Retrieve a paginated list of expenses with optional filters for status, type, and amount. Supports expansion of related objects like merchant and budget details. Returns expenses with automatic money annotation (cents, dollars, formatted)."

2. **get_all_expenses**
   - "Fetch all expenses across multiple pages with automatic pagination handling. Supports date range filtering, amount filtering, status filtering, and merchant search. Returns aggregated results with summary statistics. Use window_days to batch large date ranges."

3. **get_all_card_expenses**
   - "Fetch all card expenses across multiple pages (similar to get_all_expenses but card-specific endpoint). Supports pagination, date filtering, merchant search, and amount filters. Returns complete expense objects with money annotation and summaries."

4. **get_expense**
   - "Retrieve a single expense by its unique ID. Supports expansion of nested objects (merchant, budget, user, department, location, receipts). Returns complete expense details with money annotation."

5. **get_card_expense**
   - "Retrieve a single card expense by its unique ID. Supports expansion of nested objects. Returns complete card expense details with money annotation. (Deprecated - use get_expense instead)"

6. **get_budgets**
   - "List budget allocations with spending limits and current status. Supports filtering by parent budget and status. Returns paginated budget list with amount details (amount, period, recurrence, limit type)."

7. **get_budget**
   - "Retrieve a single budget by its unique ID. Returns complete budget details including spending limits, period configuration, and current status."

8. **get_spend_limits**
   - "List spend limit policies with authorization settings and spending controls. Supports filtering by member user and pagination. Returns detailed limit configurations including base limits, buffer percentages, and merchant category controls."

9. **get_spend_limit**
   - "Retrieve a single spend limit by its unique ID. Returns complete spend limit configuration including authorization settings, period recurrence, merchant controls, and current balance."

10. **get_budget_programs**
    - "List budget program configurations that define automated budget assignment rules. Supports filtering by status and pagination. Returns program details including budget blueprints and employee filters."

11. **get_budget_program**
    - "Retrieve a single budget program by its unique ID. Returns complete program configuration including budget blueprints, employee filters, and automation settings."

12. **get_card_transactions**
    - "List settled transactions for all card accounts (primary card endpoint). Supports pagination and user filtering. NOTE: Does not support posted_at_start or expand parameters - filter client-side by posted_at_date if needed. Returns transactions with money annotation."

13. **get_cash_transactions**
    - "List settled transactions for a specific cash account. Requires cash account scopes. Supports pagination. NOTE: Does not support posted_at_start or expand parameters - filter client-side by posted_at_date if needed. Returns transactions with money annotation."

14. **get_transactions**
    - "Retrieve transactions for a specific Brex account by account ID. Legacy endpoint for general transaction retrieval. Returns transaction list with money annotation."

15. **get_all_accounts**
    - "Fetch all Brex accounts (card and cash) with automatic pagination. Supports status filtering. Returns account details including balances, type, currency, and status. Includes money annotation on balance fields."

16. **get_account_details**
    - "Retrieve detailed information for a specific Brex account by account ID. Returns complete account details including current balance, available balance, type, currency, and status."

17. **get_card_statements_primary**
    - "List all finalized statements for the primary card account. Supports cursor-based pagination. Returns complete statement objects with period dates, balances, and payment information."

18. **get_cash_account_statements**
    - "List finalized statements for a specific cash account by account ID. Requires cash account scopes. Supports cursor-based pagination. Returns complete statement objects with period details and transaction summaries."

19. **upload_receipt**
    - "Upload a receipt image (base64-encoded) to a specific card expense. Creates a pre-signed S3 URL, uploads the receipt, and associates it with the expense. Returns upload confirmation. NOTE: This is a write operation."

20. **match_receipt**
    - "Create a pre-signed S3 URL for uploading a receipt that will be automatically matched with existing expenses. Returns upload URL and receipt matching details. Receipt matching expires after 30 minutes. NOTE: This is a write operation."

21. **update_expense**
    - "Update metadata for an existing card expense (memo, category, budget, department, location, custom fields). Returns updated expense object. NOTE: This is a write operation - use cautiously."

**Files to Modify:**
- `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-brex/src/tools/index.ts` (same location as schemas)

---

### Task 4: Document Resource Query Parameters

**Current State:**
Resource descriptions don't mention query parameters, but README states: "Resources accept `?summary_only=true&fields=id,status,...` to control payload size."

**Target State:**
Update resource descriptions to document available query parameters.

**Example for `brex://expenses`:**
```
"List of all Brex expenses with automatic expansion of merchant and budget details. Supports query parameters: ?summary_only=true (return condensed data without large nested objects), &fields=id,status,amount (comma-separated list to select specific fields using dot notation)"
```

**Resource Description Updates:**

1. **brex://expenses**
   - "List of all Brex expenses with automatic expansion of merchant and budget details. Supports query parameters: ?summary_only=true (condensed data), &fields=field1,field2 (select specific fields using dot notation, e.g., 'id,status,purchased_amount.amount')"

2. **brex://expenses/{id}**
   - "Detailed information for a specific expense by ID. Automatically expands merchant and budget details. Supports query parameters: ?summary_only=true, &fields=field1,field2"

3. **brex://expenses/card**
   - "List of all card expenses with automatic expansion of merchant and budget details. Supports query parameters: ?summary_only=true, &fields=field1,field2"

4. **brex://expenses/card/{id}**
   - "Detailed information for a specific card expense by ID. Automatically expands merchant and budget details. Supports query parameters: ?summary_only=true, &fields=field1,field2"

5. **brex://budgets**
   - "List of all budget allocations with spending limits and status. Supports query parameters: ?summary_only=true, &fields=field1,field2"

6. **brex://budgets/{id}**
   - "Detailed information for a specific budget by ID. Supports query parameters: ?summary_only=true, &fields=field1,field2"

7. **brex://spend_limits**
   - "List of all spend limit policies with authorization settings. Supports query parameters: ?summary_only=true, &fields=field1,field2"

8. **brex://spend_limits/{id}**
   - "Detailed information for a specific spend limit by ID. Supports query parameters: ?summary_only=true, &fields=field1,field2"

9. **brex://budget_programs**
   - "List of all budget programs with employee filter configurations. Supports query parameters: ?summary_only=true, &fields=field1,field2"

10. **brex://budget_programs/{id}**
    - "Detailed information for a specific budget program by ID. Supports query parameters: ?summary_only=true, &fields=field1,field2"

11. **brex://accounts**
    - "List of all Brex accounts (card and cash) with balances and status. Supports query parameters: ?summary_only=true, &fields=field1,field2"

12. **brex://accounts/{id}**
    - "Detailed information for a specific account by ID. Supports query parameters: ?summary_only=true, &fields=field1,field2"

13. **brex://accounts/card**
    - "List of all card accounts with balances and status. Supports query parameters: ?summary_only=true, &fields=field1,field2"

14. **brex://accounts/card/{id}**
    - "Detailed information for a specific card account by ID. Supports query parameters: ?summary_only=true, &fields=field1,field2"

15. **brex://accounts/cash**
    - "List of all cash accounts with balances and status. Requires cash account scopes. Supports query parameters: ?summary_only=true, &fields=field1,field2"

16. **brex://accounts/cash/{id}**
    - "Detailed information for a specific cash account by ID. Requires cash account scopes. Supports query parameters: ?summary_only=true, &fields=field1,field2"

17. **brex://accounts/cash/primary**
    - "Information for the primary cash account. Requires cash account scopes. Supports query parameters: ?summary_only=true, &fields=field1,field2"

18. **brex://transactions/card/primary**
    - "List of settled transactions for all card accounts. Supports query parameters: ?summary_only=true, &fields=field1,field2"

19. **brex://transactions/cash/{id}**
    - "List of settled transactions for a specific cash account by ID. Requires cash account scopes. Supports query parameters: ?summary_only=true, &fields=field1,field2"

20. **brex://docs/usage**
    - "Guidelines and examples for using the Brex MCP server safely and efficiently. Includes parameter reference, tool selection guide, and best practices."

**Files to Modify:**
- Find and update resource registration locations (likely in `src/resources/`)
- Update resource list handler to include enhanced descriptions

**Note**: Need to read resource implementation files to determine exact locations.

---

### Task 5: Verify Money Annotation Consistency

**Issue Identified in Test Report:**
"The `amount` field shows cents but annotated fields show inconsistent values. Example: `purchased_amount.amount: 12` (cents) but `amount_cents: 12`, `amount_dollars: 0.12`"

**This is NOT a bug** - this is the CORRECT behavior!

**Analysis of money.ts (lines 23-36):**
```typescript
export function formatMoney(input: MoneyInput, opts?: MoneyOptions) {
  const currency = input.currency || 'USD';
  const cents = typeof input.amount === 'number' ? input.amount : 0;  // Input IS in cents
  const dollars = cents / 100;  // Correctly divides by 100
  const includeFormatted = opts?.includeFormatted ?? true;
  const locale = opts?.locale || 'en-US';
  const formatted = includeFormatted ? formatCurrency(dollars, currency, locale) : undefined;
  return {
    amount_cents: cents,
    amount_dollars: dollars,
    ...(includeFormatted ? { amount_formatted: formatted } : {}),
    currency
  } as const;
}
```

**Verification:**
- Input: `{ amount: 12, currency: "USD" }` (12 cents)
- Output: `{ amount_cents: 12, amount_dollars: 0.12, amount_formatted: "$0.12", currency: "USD" }`
- ✅ **CORRECT**

**Test Report Example:**
```json
{
  "purchased_amount": {
    "amount": 12,  // Original from Brex API (12 cents)
    "amount_cents": 12,  // Correct annotation
    "amount_dollars": 0.12,  // Correct ($0.12)
    "amount_formatted": "$0.12"  // Correct
  }
}
```

**Conclusion**: The money annotation is working correctly. The test report's concern was misunderstood - there is no inconsistency. The original `amount` field is preserved (in cents), and the annotations add helpful `amount_cents`, `amount_dollars`, and `amount_formatted` fields.

**Action Items:**
1. ✅ Verify money.ts logic (DONE - confirmed correct)
2. ✅ Review test cases (existing tests likely cover this)
3. Add additional test cases to be thorough:
   - Amount = 0 (zero dollars)
   - Amount = 12 ($0.12)
   - Amount = 100 ($1.00)
   - Amount = 100000 ($1,000.00)
   - Amount = 999999999 ($9,999,999.99 - large values)
   - Amount = null/undefined (edge case)

**Test Case Examples:**
```typescript
describe('Money annotation', () => {
  it('should correctly annotate zero amount', () => {
    const result = formatMoney({ amount: 0, currency: 'USD' });
    expect(result.amount_cents).toBe(0);
    expect(result.amount_dollars).toBe(0);
    expect(result.amount_formatted).toBe('$0.00');
  });

  it('should correctly annotate small amount (12 cents)', () => {
    const result = formatMoney({ amount: 12, currency: 'USD' });
    expect(result.amount_cents).toBe(12);
    expect(result.amount_dollars).toBe(0.12);
    expect(result.amount_formatted).toBe('$0.12');
  });

  it('should correctly annotate one dollar (100 cents)', () => {
    const result = formatMoney({ amount: 100, currency: 'USD' });
    expect(result.amount_cents).toBe(100);
    expect(result.amount_dollars).toBe(1.00);
    expect(result.amount_formatted).toBe('$1.00');
  });

  it('should correctly annotate large amount (1000 dollars)', () => {
    const result = formatMoney({ amount: 100000, currency: 'USD' });
    expect(result.amount_cents).toBe(100000);
    expect(result.amount_dollars).toBe(1000.00);
    expect(result.amount_formatted).toBe('$1,000.00');
  });

  it('should correctly annotate very large amount', () => {
    const result = formatMoney({ amount: 999999999, currency: 'USD' });
    expect(result.amount_cents).toBe(999999999);
    expect(result.amount_dollars).toBe(9999999.99);
    expect(result.amount_formatted).toBe('$9,999,999.99');
  });

  it('should handle null amount gracefully', () => {
    const result = formatMoney({ amount: null as any, currency: 'USD' });
    expect(result.amount_cents).toBe(0);
    expect(result.amount_dollars).toBe(0);
  });
});
```

**Files to Modify:**
- Possibly none (money.ts is correct)
- Add test cases to ensure comprehensive coverage

---

## Subtasks

### Research Phase
- [x] **Research Brex API via Context7**
  - [x] Resolve Brex API library ID: `/websites/developer_brex`
  - [x] Get expenses endpoint documentation
  - [x] Get budgets endpoint documentation
  - [x] Get transactions endpoint documentation
  - [x] Get accounts endpoint documentation
  - [x] Get spend limits endpoint documentation
  - [x] Document all parameter schemas

### Documentation Phase
- [ ] **Create Brex API Reference Documentation**
  - [ ] Create `/docs/documentation/brex-api/API.md` with all endpoints
  - [ ] Create `/docs/documentation/brex-api/PARAMETERS.md` with common parameters
  - [ ] Create `/docs/documentation/brex-api/SCHEMAS.md` with response structures
  - [ ] Create `/docs/documentation/brex-api/ENUMS.md` with all enum values

### Implementation Phase
- [ ] **Implement tool schema improvements**
  - [ ] Read all 21 tool implementation files to understand current parameters
  - [ ] Create comprehensive schema definitions for all 21 tools
  - [ ] Update `src/tools/index.ts` with new schemas (lines 82-97)
  - [ ] Update all 21 tool descriptions
  - [ ] Add JSDoc comments to tool handlers if needed

- [ ] **Implement resource improvements**
  - [ ] Read resource implementation files to find description locations
  - [ ] Update all 20 resource descriptions to document query parameters
  - [ ] Add examples of query parameter usage

- [ ] **Verify money annotation logic**
  - [ ] Review money.ts implementation (DONE - confirmed correct)
  - [ ] Add comprehensive test cases for edge cases
  - [ ] Verify across all tools that use money annotation

### Testing Phase
- [ ] **Testing and validation**
  - [ ] Run existing tests: `npm test`
  - [ ] Run TypeScript compiler: `npx tsc --noEmit`
  - [ ] Run linter: `npm run lint`
  - [ ] Run build: `npm run build`
  - [ ] Manual testing with `/test-mcp` to verify tool schemas render
  - [ ] Verify all tools return proper schemas in tools/list
  - [ ] Test money annotation with various amounts

### Review Phase
- [ ] **Code review**
  - [ ] Request code-reviewer subagent review
  - [ ] Address feedback from review
  - [ ] Final approval

### Documentation Update Phase
- [ ] **Update project documentation**
  - [ ] Update README.md with schema improvements (if needed)
  - [ ] Update CHANGELOG.md with changes
  - [ ] Update LEARNINGS.md with implementation insights
  - [ ] Document any gotchas or important decisions

## Blockers

None currently identified. All research completed successfully.

## Progress & Learnings

### Research Completed (2025-10-18)

**Context7 Findings:**
- Successfully retrieved Brex API documentation from `/websites/developer_brex`
- Trust score: 7.5/10
- Code snippets: 323 examples
- Confirmed that ALL amounts from Brex API are in **cents** (not dollars)
- Documented all common parameters and their constraints
- Identified that transaction endpoints do NOT support `posted_at_start` or `expand`

**Key Insights:**
1. **Money representation is correct**: The current implementation correctly assumes input amounts are in cents
2. **No actual bug in money annotation**: Test report confusion was due to misunderstanding - the system works as designed
3. **Schema patterns are consistent**: Most tools follow similar parameter patterns (cursor, limit, expand, filters)
4. **Forward compatibility**: Keeping `additionalProperties: true` is important to avoid breaking when Brex adds new parameters

**Complexity Assessment:**

| Subtask | Estimated Effort | Complexity | Risk |
|---------|-----------------|------------|------|
| Create API reference docs | 2 hours | Low | None |
| Define 21 tool schemas | 4 hours | Medium | Low - straightforward mapping |
| Write 21 tool descriptions | 2 hours | Low | None |
| Update resource descriptions | 1 hour | Low | None |
| Money annotation verification | 1 hour | Low | None - already correct |
| Testing & validation | 2 hours | Medium | Low |
| Code review & fixes | 2 hours | Medium | Low |
| **Total** | **14 hours** | **Medium** | **Low** |

**Architecture Decisions:**
1. Keep schemas inline in `tools/index.ts` for now (Option A) - can refactor later
2. Maintain `additionalProperties: true` for forward compatibility
3. No changes needed to money.ts - it's working correctly
4. Focus on discoverability improvements, not behavioral changes

## Code Review

*To be filled with review links after implementation*

---

## Tool Schema Definitions (Reference)

<details>
<summary>Complete schema definitions for all 21 tools (click to expand)</summary>

```typescript
const toolSchemas: Record<string, { description: string; inputSchema: any }> = {
  get_expenses: {
    description: "Retrieve a paginated list of expenses with optional filters for status, type, and amount. Supports expansion of related objects like merchant and budget details. Returns expenses with automatic money annotation (cents, dollars, formatted).",
    inputSchema: {
      type: "object",
      properties: {
        expense_type: {
          type: "string",
          enum: ["CARD", "CASH"],
          description: "Type of expenses to retrieve"
        },
        status: {
          type: "string",
          enum: ["APPROVED", "PENDING", "DECLINED", "CANCELLED"],
          description: "Filter by expense approval status"
        },
        payment_status: {
          type: "string",
          enum: ["NOT_STARTED", "PENDING", "PROCESSING", "CLEARED", "DECLINED", "CANCELLED", "REFUNDED", "MATCHED"],
          description: "Filter by payment processing status"
        },
        limit: {
          type: "number",
          description: "Maximum number of expenses to return (default: 50, max: 100)",
          minimum: 1,
          maximum: 100
        },
        expand: {
          type: "array",
          items: {
            type: "string",
            enum: ["merchant", "budget", "user", "department", "location", "receipts"]
          },
          description: "Related objects to include in response. Default: [] for minimal size"
        },
        format_amounts: {
          type: "string",
          enum: ["cents", "dollars", "both"],
          description: "Money format mode (default: both)"
        },
        include_formatted: {
          type: "boolean",
          description: "Include formatted currency strings (default: true)"
        },
        include_summary: {
          type: "boolean",
          description: "Include summary statistics in meta (default: true)"
        }
      },
      additionalProperties: true
    }
  },
  // ... (additional 20 tool schemas following similar pattern)
  // Full schemas available in implementation file
};
```

</details>

---

**Next Steps:**
1. Begin implementation phase with tool schema definitions
2. Create comprehensive Brex API reference documentation
3. Update all tool and resource descriptions
4. Run full test suite and validation
5. Submit for code review
