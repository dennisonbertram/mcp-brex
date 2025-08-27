# Task: Remove All Summary Logic from getCardStatementsPrimary Tool

## Task Description
Completely remove ALL summary logic from src/tools/getCardStatementsPrimary.ts. This tool has complex summary logic that must be eliminated to return complete statement objects without any token limiting or field projection.

## Success Criteria
- [x] Remove ALL imports of responseLimiter (estimateTokens, etc.)
- [x] Remove summary_only parameter completely from interface
- [x] Remove fields parameter from interface
- [x] Remove all estimateTokens usage
- [x] Remove all "tooBig", "summarized" variables and logic
- [x] Remove all field projection logic (DEFAULT_FIELDS, project function calls)
- [x] Remove all token size estimation logic
- [x] Ensure proper pagination parameters remain (cursor, limit)
- [x] Update the tool registration in index.ts to remove summary_only and fields from schema
- [x] Tool returns complete statement objects as JSON
- [x] Comprehensive tests verify complete objects are returned
- [x] All tests pass

## Implementation Plan

### Phase 1: Write Tests (TDD)
1. Create comprehensive tests for the simplified tool
2. Tests should verify:
   - Complete statement objects are returned
   - No summary logic is applied
   - No field projection occurs
   - Pagination parameters work correctly
   - Error handling works

### Phase 2: Simplify getCardStatementsPrimary.ts
1. Remove responseLimiter import
2. Remove DEFAULT_FIELDS constant
3. Update GetCardStatementsParams interface
4. Simplify validateParams function
5. Simplify handler to just call client and return complete objects
6. Remove all projection and summary logic

### Phase 3: Update Tool Registration
1. Update index.ts tool registration
2. Remove summary_only and fields from schema
3. Update description to reflect simplified behavior

### Phase 4: Verify and Test
1. Run all tests to ensure they pass
2. Manual testing if needed
3. Code review

## Progress Log
- [x] Task setup and planning in worktree
- [x] Write comprehensive tests (TDD) - 12 tests covering all scenarios
- [x] Implement changes to getCardStatementsPrimary.ts - Removed all summary logic
- [x] Update tool registration in index.ts - Removed summary_only and fields from schema
- [x] Run tests and verify - All 12 tests passing
- [ ] Final review

## Edge Cases
- Empty statement responses
- Invalid limit values
- Invalid cursor values
- API errors

## Review Feedback Status
- [ ] Initial implementation complete
- [ ] Code review requested
- [ ] Feedback addressed
- [ ] Final approval