# Fix Card Transactions Expand Parameter Issue

## Task Description
Fix the `get_card_transactions` tool to prevent 400 "Unsupported entity expansion" errors when users pass expand parameters. The Brex API endpoint `/v2/transactions/card/primary` does not support expand parameters but users expect to be able to use expand=["merchant"] like other tools.

## Success Criteria
- [x] get_card_transactions works with expand=["merchant"] (ignores the parameter)
- [x] get_card_transactions works without expand parameters
- [x] Tool returns merchant information in responses (already included by default)
- [x] No 400 errors when expand parameters are provided
- [x] Comprehensive tests verify both scenarios work correctly

## Implementation Plan
1. [x] Research Phase - Examine current implementation and understand the issue
2. [x] Write failing tests for expand parameter handling
3. [x] Implement fix to filter out expand parameters
4. [x] Add explanatory comments
5. [x] Verify all tests pass
6. [x] Manual testing confirmation
7. [x] Final review and verification

## Progress Tracking

### Research Phase
- [x] Review getCardTransactions.ts implementation
- [x] Check how other tools handle expand parameters
- [x] Verify card transaction API behavior

### TDD Implementation
- [x] Write test for expand=["merchant"] scenario
- [x] Write test for no expand parameters scenario
- [x] Write test to verify merchant info is included
- [x] Implement fix
- [x] All tests passing

### Documentation
- [x] Add comments explaining why expand is not supported
- [x] Update any relevant documentation

## Notes
- The card transactions API includes merchant information by default
- We need to silently handle/ignore expand parameters without passing them to the API
- This maintains compatibility with user expectations while avoiding API errors

## Implementation Summary

### Changes Made
1. **Modified getCardTransactions.ts**:
   - Added comments explaining that expand is not supported by the card transactions endpoint
   - Removed expand parameter from the API call to prevent 400 errors
   - Kept expand in the interface for backward compatibility

2. **Created comprehensive tests**:
   - Test verifies expand parameters are not passed to API
   - Test confirms tool works with and without expand parameters
   - Test ensures merchant information is still included in responses

3. **Verification**:
   - All 8 tests pass successfully
   - Build completes without errors
   - Manual verification script confirms the fix is correctly implemented

### Key Insights
- The Brex card transactions API endpoint `/v2/transactions/card/primary` does not support entity expansion
- Merchant information is already included by default in the response
- The fix allows users to pass expand parameters (maintaining API compatibility) while preventing 400 errors