# Brex MCP Server — Review and Next Steps

Date: 2025-09-23
Owner: mcp-brex

## Overview
This document summarizes the current state of the Brex MCP server, key findings from a code review, and prioritized next steps to improve correctness, MCP compliance, and reliability.

## Current State (High‑Level)
- Transport: stdio via `@modelcontextprotocol/sdk` — correct and stable.
- Capabilities: resources, tools, prompts enabled. Logging now advertised.
- Resources: Multiple modules register `ReadResource` handlers independently.
- Tools: Broad coverage for expenses, budgets, accounts, statements, receipts.
- Prompts: Two prompts provided, embed resources appropriately.
- Token limits: Implemented via `summary_only` and projection (`limitExpensesPayload`).
- Brex Client: Centralized axios client with interceptors and structured logging.

## Key Findings
1) ReadResource handler override (critical)
- Multiple `setRequestHandler(ReadResourceRequestSchema, ...)` calls across files cause later registrations to override earlier ones (TS SDK keeps the last handler). Returning `{ handled: false }` is not part of the MCP ReadResource schema and will not chain.
- Impact: Only the last‑registered `ReadResource` handler effectively runs; others are ignored.

2) Resource templates not advertised
- The server did not publish parameterized URIs (`resourceTemplates`) to clients. These help clients construct URIs with path parameters.

3) Config friction
- Previously required env vars (e.g., `PORT`, rate limits) are unnecessary for a stdio MCP server and could block startup. Simplify to just `BREX_API_KEY` and an optional base URL.

4) Brex client resilience
- Prior to changes, no default Idempotency‑Key header for writes and no backoff for 429 responses. These can cause duplication or fragile error handling.

5) Token limit mitigation
- The `summary_only` and `fields` projection is in place and aligned with the documented token‑limit issue. Consider applying the same pattern to other large resources (budgets, spend limits, programs) as a defensive measure.

## Changes Applied (Lightweight, Safe)
- Config defaults: `BREX_API_URL` defaults to `https://platform.brexapis.com`; only `BREX_API_KEY` is required (src/config/index.ts).
- Resource templates: Added `resourceTemplates` to `list_resources` response (src/resources/index.ts).
- Client resilience: Added `Idempotency-Key` header for POST/PUT if missing, `User-Agent`, and simple 429 retry/backoff via `Retry-After` (src/services/brex/client.ts).
- Capabilities: Added `logging: {}` (src/index.ts).
- Packaging: Exposed bin entry so `npx mcp-brex` works (package.json).

## Next Steps (Prioritized)
1) Unify ReadResource dispatch (P0)
- Create a single ReadResource handler in `src/resources/index.ts` that routes by URI prefix/template.
- Refactor per‑module readers to pure helpers (no direct `setRequestHandler`).
- Keep existing behavior/URIs intact to avoid breaking changes.

2) Expand projection/limiting coverage (P1)
- Apply `estimateTokens` + projection to other large list endpoints (budgets, spend limits, programs) for consistent safety.

3) Strengthen testing prior to refactor (P0)
- Add unit + integration + e2e tests (see testing plan) to lock in behavior and prevent regressions.

4) Improve retry strategy (P2)
- Extend backoff to certain 5xx responses (with jitter), keep retry bounds tight.

5) Optional: Progress/cancellation (P3)
- For long pagination tools, consider MCP progress where supported by the host.

## Validation Instructions
- Build: `npm run build`
- Scripted smoke test: `node scripts/test-brex-mcp.js` (uses stdio client)
- Jest tests (after adding plan’s tests): `npm test`

## Notable Files
- Server entry: src/index.ts
- Resources: src/resources/**
- Router: src/resources/router.ts
- Tools: src/tools/**
- Brex client: src/services/brex/client.ts
- Token limiter: src/utils/responseLimiter.ts
- Config: src/config/index.ts
- Test script: scripts/test-brex-mcp.js

