# Brex MCP Server

A Model Context Protocol (MCP) server for the Brex API. Optimized for safe, small, read-only responses with projection and batching.

## Quick Start

1) Install and build
```bash
npm install
npm run build
```

2) Run with stdio (example)
```bash
node build/index.js
```

3) Configure your MCP client to launch this command and pass env vars:
- `BREX_API_KEY` (required)
- `BREX_API_URL` default `https://platform.brexapis.com`

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

Always send parameters under `arguments` (not `input`). Keep payloads small with `summary_only` and `fields`.

Common parameters:
- `summary_only: boolean` — compact projection; server auto-falls back if >24k tokens
- `fields: string[]` — dot-notation projection (e.g., `purchased_amount.amount`)
- Pagination: `page_size` (<=50), `max_items` (<=500 recommended)
- Date batching: `start_date`, `end_date`, `window_days`
- Thresholds: `min_amount`, `max_amount`

Recommended examples:

```json
{
  "name": "get_all_card_expenses",
  "arguments": {
    "page_size": 50,
    "max_items": 200,
    "start_date": "2025-08-01T00:00:00Z",
    "end_date": "2025-08-18T00:00:00Z",
    "window_days": 7,
    "min_amount": 100,
    "summary_only": true,
    "fields": ["id","updated_at","status","purchased_amount.amount","purchased_amount.currency","merchant.raw_descriptor"]
  }
}
```

```json
{
  "name": "get_expenses",
  "arguments": {
    "limit": 5,
    "status": "APPROVED",
    "summary_only": true,
    "fields": ["id","status","purchased_amount.amount","merchant.raw_descriptor"]
  }
}
```

```json
{
  "name": "get_card_transactions",
  "arguments": {
    "limit": 10,
    "posted_at_start": "2025-08-01T00:00:00Z",
    "summary_only": true,
    "fields": ["id","posted_at","amount.amount","amount.currency","merchant.raw_descriptor"]
  }
}
```

Best practices:
- Always include `summary_only: true` and a focused `fields` list.
- Use date ranges and `window_days` for high-volume orgs.
- Keep `page_size <= 50`, prefer small `max_items`.
- Cash endpoints require additional Brex scopes; handle 403s gracefully.

## Publishing

Only `build/`, `README.md`, and `LICENSE` are published.

## License

MIT — see `LICENSE`.
