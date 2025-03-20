## Phase 3: Convert List Operations to Tools

The Brex API requires pagination to fetch complete datasets. Converting list operations from resources to tools will improve handling of pagination and filtering.

### Tasks:

1. **Convert List Operations to Tools**:
   - `get_all_accounts` - Tool that handles pagination to get all accounts
   - `get_all_expenses` - Tool that handles pagination with filtering options
   - `get_all_card_expenses` - Tool specifically for card expenses

2. **Add Pagination Options to Tools**:
   - Parameters for controlling page size
   - Optional limit to total number of items
   - Filter options that work across paginated results

3. **Maintain Individual Resource Endpoints**:
   - Keep specific entity fetch operations as resources (e.g., `brex://accounts/{id}`)
   - Tools will handle bulk data retrieval with pagination 