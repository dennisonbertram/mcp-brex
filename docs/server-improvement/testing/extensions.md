# Testing Extensions — Money Annotation Coverage

Date: 2025-09-24
Owner: mcp-brex

Added tests to lock in money annotation + summary behavior across tools:

- `src/tools/__tests__/get_all_expenses.formatting.test.ts` — paginated expenses annotated + summarized
- `src/tools/__tests__/get_all_card_expenses.test.ts` — paginated card expenses annotated + summarized
- `src/tools/__tests__/get_card_transactions.test.ts` — card transactions annotated + summarized; ignores unsupported params
- `src/tools/__tests__/get_cash_transactions.test.ts` — cash transactions annotated + summarized; ignores unsupported params

Rationale:
- Prevent cents-vs-dollars errors by asserting presence and correctness of `amount_dollars`, `amount_formatted`, and `meta.summary`.
- Verify transaction endpoints do not break if `posted_at_start` or `expand` are passed (ignored by server and client).

Run:
- `npm test`
