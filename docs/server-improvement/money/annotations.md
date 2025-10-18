# Money & Units — Safer Outputs

Date: 2025-09-24
Owner: mcp-brex

## Goal
Eliminate cents-vs-dollars mistakes by annotating money fields in all tool responses and providing summaries with clear units.

## Behavior
- The server walks response objects and annotates any `{ amount, currency }` shape with:
  - `amount_cents` (integer)
  - `amount_dollars` (float)
  - `amount_formatted` (localized USD formatting)
- A response-level `meta.summary` is included by default with totals, averages, min/max in both cents and dollars and formatted strings.
- `_field_notes` explains units for downstream consumers (LLMs, humans).

## Controls
- `format_amounts`: `"cents" | "dollars" | "both"` (default: `"both"`)
- `include_formatted`: boolean (default: `true`)
- `include_summary`: boolean (default: `true`)

## Example
Input from API:
```json
{ "purchased_amount": { "amount": 100000, "currency": "USD" } }
```

Output from tools:
```json
{
  "purchased_amount": {
    "amount": 100000,
    "currency": "USD",
    "amount_cents": 100000,
    "amount_dollars": 1000.0,
    "amount_formatted": "$1,000.00"
  }
}
```

## Code
- Utils: `src/utils/money.ts` (`formatMoney`, `annotateAmounts`, `summarizeAmounts`, `defaultFieldNotes`)
- Integrated in tools:
  - `get_expenses`, `get_all_expenses`, `get_all_card_expenses`
  - `get_card_transactions`, `get_cash_transactions`

## Tests
- Unit: `src/utils/__tests__/money.test.ts`
- Tools:
  - `src/tools/__tests__/amount_formatting.test.ts` (single-page expenses)
  - `src/tools/__tests__/get_all_expenses.formatting.test.ts`
  - `src/tools/__tests__/get_all_card_expenses.test.ts`
  - `src/tools/__tests__/get_card_transactions.test.ts`
  - `src/tools/__tests__/get_cash_transactions.test.ts`

## Notes
- Transactions API doesn’t support `posted_at_start` or `expand`; filter client-side by `posted_at` if needed.

