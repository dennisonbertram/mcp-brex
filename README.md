# Brex MCP Server

A Model Context Protocol (MCP) server for the Brex API. Optimized for safe, small, read-only responses with projection and batching.

## Installation

### Claude Code
```bash
# Install the package
npm install -g mcp-brex

# Add to Claude Code with your API key
claude mcp add brex --env BREX_API_KEY=your_brex_api_key -- npx mcp-brex
```

### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "brex": {
      "command": "npx",
      "args": ["mcp-brex"],
      "env": {
        "BREX_API_KEY": "your_brex_api_key"
      }
    }
  }
}
```

### Manual Setup (Development)
```bash
git clone https://github.com/dennisonbertram/mcp-brex.git
cd mcp-brex
npm install
npm run build
claude mcp add brex --env BREX_API_KEY=your_key -- node build/index.js
```

## Resources

- `brex://expenses` | `brex://expenses/{id}` | `brex://expenses/card` | `brex://expenses/card/{id}`
- `brex://budgets` | `brex://budgets/{id}`
- `brex://spend_limits` | `brex://spend_limits/{id}`
- `brex://budget_programs` | `brex://budget_programs/{id}`
- `brex://transactions/card/primary` | `brex://transactions/cash/{id}`
- `brex://docs/usage` (compact usage guide for agents)

Notes:
- Resources accept `?summary_only=true&fields=id,status,...` to control payload size.
- Expenses resources auto-expand `merchant` and `budget` for readability.

## Tools (read-only unless noted)

- Budgets: `get_budgets`, `get_budget`
- Spend Limits: `get_spend_limits`, `get_spend_limit`
- Budget Programs: `get_budget_programs`, `get_budget_program`
- Expenses (single page): `get_expenses`
- Expenses (paginated): `get_all_expenses`, `get_all_card_expenses`
- Expense by ID: `get_expense`, `get_card_expense`
- Card Statements: `get_card_statements_primary`
- Transactions: `get_card_transactions`, `get_cash_transactions`
- Cash Statements: `get_cash_account_statements`
- Accounts: `get_all_accounts`, `get_account_details`
- Receipts (write): `match_receipt`, `upload_receipt`
- Updates (write): `update_expense`

## How to call tools

Always send parameters under `arguments` (not `input`). Keep payloads small with pagination and filtering.

Common parameters:
- Pagination: `page_size` (<=50), `max_items` (<=200 recommended)  
- Date filtering: `start_date`, `end_date`, `window_days`
- Status filtering: `status` array for expenses/transactions
- Amount filtering: `min_amount`, `max_amount` for expenses
- Merchant filtering: `merchant_name` for expenses
- Expand control: `expand` array to include nested objects (e.g., `["merchant", "budget"]`)

Recommended examples:

```json
{
  "name": "get_all_card_expenses",
  "arguments": {
    "page_size": 10,
    "max_items": 20,
    "start_date": "2025-08-25T00:00:00Z",
    "end_date": "2025-08-26T00:00:00Z",
    "status": ["APPROVED"],
    "min_amount": 100
  }
}
```

```json
{
  "name": "get_expenses",
  "arguments": {
    "limit": 5,
    "status": "APPROVED"
  }
}
```

```json
{
  "name": "get_card_transactions",
  "arguments": {
    "limit": 10,
    "posted_at_start": "2025-08-25T00:00:00Z"
  }
}
```

```json
{
  "name": "get_all_accounts",
  "arguments": {
    "page_size": 10,
    "max_items": 20,
    "status": "ACTIVE"
  }
}
```

```json
{
  "name": "get_transactions",
  "arguments": {
    "accountId": "acc_123456789",
    "limit": 10
  }
}
```

```json
{
  "name": "get_expenses",
  "arguments": {
    "limit": 5,
    "expand": ["merchant", "user"]
  }
}
```

## Pagination and Filtering Best Practices

**IMPORTANT**: Use pagination, filtering, and sorting to control response sizes instead of relying on summaries.

### Key Parameters for Data Control:
- **`page_size: number`** — Items per page (recommended: ≤50)
- **`max_items: number`** — Maximum total items across all pages (recommended: ≤200)
- **`start_date/end_date: string`** — ISO date range filtering
- **`window_days: number`** — Split large date ranges into smaller batches
- **`status: string[]`** — Filter by status (e.g., ["APPROVED", "PENDING"])
- **`min_amount/max_amount: number`** — Amount-based filtering for expenses

### Best Practices:
- **Always use date ranges** for bulk requests to avoid huge responses
- **Use small page sizes** (≤50) and reasonable max_items (≤200)
- **Apply status filters** to get only the data you need
- **Use window_days** (e.g., 7) to batch large date ranges
- **Control nested object expansion** with the `expand` parameter:
  - **Default**: `expand: []` returns lean objects (~500-1000 tokens each)
  - **With expansion**: `expand: ["merchant", "budget"]` returns full objects (~15K+ tokens each)
  - **Available expand options**: `merchant`, `budget`, `user`, `department`, `location`, `receipts`
- **Test with small limits first** before scaling up
- Cash endpoints require additional Brex scopes; handle 403s gracefully

## Publishing

Only `build/`, `README.md`, and `LICENSE` are published.

## License

MIT — see `LICENSE`.
