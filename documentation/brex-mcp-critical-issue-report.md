# Brex MCP Server - Critical Token Limit Issue
## Development Team Technical Brief

**Date**: 2025-08-18  
**Priority**: CRITICAL - Blocking Production Deployment  
**Status**: UNRESOLVED

---

## Executive Summary

The Brex MCP server expense endpoints are generating responses that exceed the 25,000 token limit imposed by the MCP protocol, making them completely unusable. Even when requesting a single expense record with maximum filtering, responses consistently exceed 25,629+ tokens.

**Business Impact**: All expense-related financial operations are blocked, preventing CEO dashboard functionality and financial reporting workflows.

---

## Technical Problem Analysis

### Core Issue
Individual expense records from the Brex API contain extremely verbose nested data structures that, when serialized to JSON, exceed the MCP response token limit.

### Constraint Specifications
- **MCP Token Limit**: 25,000 tokens maximum per response
- **Current Response Size**: 25,629-29,852 tokens for single expense
- **Overage**: 2.5-19% above limit consistently

### Affected Endpoints
| Endpoint | Parameters Tested | Token Response | Status |
|----------|-------------------|----------------|--------|
| `get_expenses` | `limit: 1` | 25,629 tokens | ❌ FAILED |
| `get_expenses` | `limit: 1, expense_type: CARD, status: APPROVED` | 25,629 tokens | ❌ FAILED |
| `get_all_expenses` | `page_size: 1, max_items: 1, start_date: 2025-08-18` | 29,850 tokens | ❌ FAILED |
| `get_all_card_expenses` | `page_size: 1, max_items: 1` | 29,852 tokens | ❌ FAILED |
| `get_all_card_expenses` | `page_size: 1, max_items: 1, start_date: 2025-08-18, end_date: 2025-08-18` | 29,852 tokens | ❌ FAILED |

### Working Endpoints (Baseline)
| Endpoint | Parameters | Token Response | Status |
|----------|------------|----------------|--------|
| `get_all_accounts` | `page_size: 1, max_items: 1` | <1,000 tokens | ✅ WORKING |

---

## Root Cause Analysis

### Primary Issues Identified

#### 1. Excessive Nested Data Structures
- Expense objects likely include complete nested objects for:
  - Receipt attachments and metadata
  - Approval workflow history
  - User profile information
  - Merchant details
  - Transaction metadata
  - Audit trails

#### 2. Ineffective Filtering Implementation
- Current filtering parameters (`limit`, `page_size`, `max_items`) are not reducing response payload
- Date range filtering (`start_date`, `end_date`) has no impact on response size
- Status and type filters do not minimize data structure depth

#### 3. No Field Selection Capability
- API returns all fields regardless of client needs
- No mechanism to request summary-only or essential-fields-only responses
- Missing projection/field selection parameters

#### 4. Inadequate Response Size Monitoring
- No pre-response validation to check token count
- No fallback mechanisms when responses exceed limits
- No response compression or optimization

---

## Technical Requirements for Resolution

### Immediate Actions Required

#### 1. Implement Field Selection Parameters
```typescript
// Add to all expense endpoints
interface ExpenseQueryParams {
  fields?: string[];  // e.g., ['id', 'amount', 'date', 'status']
  summary_only?: boolean;
  include_nested?: boolean;
}
```

#### 2. Response Size Validation
```typescript
// Add pre-response validation
function validateResponseSize(data: any): boolean {
  const tokenCount = JSON.stringify(data).length / 4; // Rough token estimation
  if (tokenCount > 24000) { // Safety margin
    throw new Error(`Response too large: ${tokenCount} tokens`);
  }
  return true;
}
```

#### 3. Create Lightweight Summary Endpoints
```typescript
// New endpoint for expense summaries
interface ExpenseSummary {
  id: string;
  amount: number;
  date: string;
  status: string;
  merchant_name?: string;
  category?: string;
}
```

#### 4. Implement Response Compression
- Remove null/empty fields from responses
- Compress nested object references to IDs only
- Strip unnecessary metadata from production responses

### Data Structure Optimization

#### Current Problematic Structure (Estimated)
```json
{
  "expense": {
    "id": "exp_123",
    "amount": 100.00,
    "receipts": [
      {
        "id": "receipt_456",
        "file_data": "base64_encoded_image...", // MASSIVE
        "metadata": { /* extensive object */ },
        "processing_history": [ /* verbose array */ ]
      }
    ],
    "approval_flow": {
      "steps": [ /* detailed workflow history */ ],
      "approvers": [ /* complete user profiles */ ]
    },
    "merchant": { /* complete merchant object */ },
    "transaction_details": { /* extensive metadata */ },
    "audit_trail": [ /* comprehensive history */ ]
  }
}
```

#### Proposed Optimized Structure
```json
{
  "expense": {
    "id": "exp_123",
    "amount": 100.00,
    "date": "2025-08-18",
    "status": "APPROVED",
    "merchant_name": "Coffee Shop",
    "category": "Meals",
    "receipt_ids": ["receipt_456"], // Reference only
    "approver_id": "user_789" // Reference only
  }
}
```

---

## Development Roadmap

### Phase 1: Emergency Fix (1-2 Days)
1. **Add summary-only parameter** to all expense endpoints
2. **Implement basic field selection** (id, amount, date, status only)
3. **Add response size validation** with clear error messages
4. **Deploy and test** with minimal viable response structure

### Phase 2: Enhanced Filtering (3-5 Days)
1. **Implement comprehensive field selection**
2. **Add response compression logic**
3. **Create dedicated summary endpoints**
4. **Optimize nested object handling**

### Phase 3: Production Optimization (1 Week)
1. **Performance testing** with large datasets
2. **Response caching implementation**
3. **Advanced filtering capabilities**
4. **Comprehensive documentation update**

---

## Testing Protocol for Validation

### Test Cases to Validate Fix
```bash
# Test 1: Basic expense retrieval
get_expenses(limit: 1, summary_only: true)
# Expected: <5,000 tokens

# Test 2: Field selection
get_expenses(limit: 5, fields: ['id', 'amount', 'status'])
# Expected: <10,000 tokens

# Test 3: Date range filtering
get_all_card_expenses(start_date: '2025-08-01', end_date: '2025-08-31', summary_only: true)
# Expected: <20,000 tokens

# Test 4: Pagination stress test
get_all_expenses(page_size: 10, summary_only: true)
# Expected: <24,000 tokens
```

### Success Criteria
- ✅ All expense endpoints return <20,000 tokens (safety margin)
- ✅ Field selection reduces response size proportionally
- ✅ Summary mode returns essential data only
- ✅ Pagination works without token limit violations
- ✅ No regression in account-level endpoints

---

## Risk Assessment

### High Risk Issues
- **Data Loss**: Aggressive optimization could remove needed fields
- **Breaking Changes**: Existing integrations may expect full data structures
- **Performance Impact**: Field selection logic could slow response times

### Mitigation Strategies
- **Backward Compatibility**: Keep full-detail endpoints with warnings
- **Staged Deployment**: Test with non-production data first
- **Monitoring**: Implement response size tracking in production

---

## Developer Notes

### Key Files Likely Requiring Changes
- MCP server expense endpoint handlers
- Brex API response transformation logic
- Response serialization/compression utilities
- Endpoint parameter validation

### Testing Environment Requirements
- Access to Brex API with test data
- MCP protocol testing framework
- Token counting utilities
- Performance benchmarking tools

### Documentation Requirements
- Updated API endpoint documentation
- Parameter usage examples
- Migration guide for existing integrations
- Performance optimization best practices

---

**Next Steps**: Assign to development team with HIGH priority flag. This issue blocks all expense-related functionality and must be resolved before production deployment.