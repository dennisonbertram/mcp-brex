# Task: Remove ALL Summary Logic from getBudgetProgramById Tool

## Task Details
Remove ALL summary logic from src/tools/getBudgetProgramById.ts. This tool still has summary logic that must be eliminated.

## Success Criteria
- [x] Remove ALL imports of responseLimiter (estimateTokens, etc.)
- [x] Remove summary_only parameter completely from interface  
- [x] Remove all estimateTokens usage
- [x] Remove all "tooBig", "summarized" variables and logic
- [x] Remove the project() function entirely
- [x] Remove fields parameter - tools should return complete objects
- [x] Remove all token size estimation logic
- [x] Ensure the tool returns the raw budget program object without any summarization
- [x] Update the tool registration in index.ts to remove summary_only from schema
- [x] Follow the same pattern as the fixed expense tools
- [x] Create comprehensive tests that verify the tool returns complete budget program objects, not summarized ones
- [x] All tests pass
- [x] Code is linted and type-checked

## Implementation Plan
1. Examine current implementation of getBudgetProgramById.ts
2. Write comprehensive tests FIRST (TDD)
3. Remove all summary logic from the tool
4. Update tool registration in index.ts
5. Ensure tests pass
6. Run linting and type checking
7. Get code review

## Progress Tracking
- [x] Tests written
- [x] Implementation complete
- [x] Tests passing
- [x] Linting passes
- [x] Type checking passes
- [ ] Code review completed
- [ ] Task complete

## Progress Log
- Created worktree at: /Users/dennisonbertram/Develop/ModelContextProtocol/.worktrees-mcp-brex/remove-budget-program-summary-logic
- Branch: feature/remove-budget-program-summary-logic