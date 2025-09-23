# Pre‑Refactor Comprehensive Testing Plan (Implementation‑Ready)

Date: 2025-09-23
Owner: mcp-brex
Goal: Prevent regressions before refactor by adding broad, reliable tests for resources, tools, token‑limiting, and the Brex client. This plan includes code snippets and exact file paths for quick implementation.

## Test Principles
- Mock all HTTP calls. No live Brex API traffic in CI.
- Lock current behavior first (baseline), then refactor with confidence.
- Use small, deterministic fixtures shaped like Brex responses.
- Cover success, edge cases, and error paths.

## Tooling Setup
- Jest + ts‑jest already configured: `jest.config.mjs` and `jest.setup.js`.
- Add HTTP mocking:
  - Command: `npm i -D axios-mock-adapter`
- Optional coverage threshold (update if desired):
  - Edit `jest.config.mjs` to include:
    ```js
    export default {
      // ...existing
      coverageThreshold: {
        global: { lines: 80, branches: 80, functions: 80, statements: 80 },
        './src/utils/**': { lines: 95 },
        './src/services/brex/**': { lines: 90 },
      },
    };
    ```

## Directory Layout
- Tests: `src/**/__tests__/*.test.ts`
- Fixtures: `src/__tests__/fixtures/*.json`

Create folders:
```
mkdir -p src/__tests__/fixtures
mkdir -p src/models/__tests__
mkdir -p src/utils/__tests__
mkdir -p src/services/brex/__tests__
mkdir -p src/resources/__tests__
mkdir -p src/tools/__tests__
mkdir -p e2e
```

## 1) Unit Tests

### 1.1 ResourceTemplate
File: src/models/__tests__/resourceTemplate.test.ts
```ts
import { ResourceTemplate } from '../../models/resourceTemplate.js';

describe('ResourceTemplate', () => {
  it('matches base URI and optional param', () => {
    const t = new ResourceTemplate('brex://accounts{/id}');
    expect(t.match('brex://accounts')).toBe(true);
    expect(t.match('brex://accounts/c123')).toBe(true);
    expect(t.match('brex://accounts/')).toBe(false);
  });

  it('parses params from URI', () => {
    const t = new ResourceTemplate('brex://accounts{/id}');
    expect(t.parse('brex://accounts')).toEqual({});
    expect(t.parse('brex://accounts/acc_1')).toEqual({ id: 'acc_1' });
  });
});
```

### 1.2 Response Limiter
File: src/utils/__tests__/responseLimiter.test.ts
```ts
import { estimateTokens, limitExpensesPayload } from '../../utils/responseLimiter.js';

const makeExpense = (id: string) => ({
  id,
  updated_at: '2025-01-01T00:00:00Z',
  status: 'APPROVED',
  purchased_amount: { amount: 123, currency: 'USD' },
  merchant: { raw_descriptor: 'ACME' },
});

describe('responseLimiter', () => {
  it('estimates tokens ~ bytes/4', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('1234')).toBe(1);
  });

  it('returns full items when under limit', () => {
    const expenses = [makeExpense('e1')];
    const res = limitExpensesPayload(expenses, { hardTokenLimit: 999999 });
    expect(res.summaryApplied).toBe(false);
    expect(res.items[0].id).toBe('e1');
  });

  it('projects when over limit or summaryOnly=true', () => {
    const big = Array.from({ length: 100 }, (_, i) => ({ ...makeExpense(`e${i}`), extra: 'x'.repeat(5000) }));
    const forced = limitExpensesPayload(big, { summaryOnly: true, fields: ['id', 'status'] });
    expect(forced.summaryApplied).toBe(true);
    expect(Object.keys(forced.items[0])).toEqual(['id', 'status']);
  });
});
```

### 1.3 Brex Client Interceptors
File: src/services/brex/__tests__/client.interceptors.test.ts
```ts
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BrexClient } from '../../services/brex/client.js';

describe('BrexClient interceptors', () => {
  beforeEach(() => jest.resetAllMocks());

  it('adds User-Agent on requests', async () => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    const spy = jest.spyOn(axios, 'create').mockReturnValue(instance as any);
    mock.onGet('/v2/users/me').reply((config) => {
      expect(config.headers['User-Agent']).toMatch(/mcp-brex/);
      return [200, { ok: true }];
    });

    const c = new BrexClient();
    const me = await c.getCurrentUser();
    expect(me).toEqual({ ok: true });
    spy.mockRestore();
  });

  it('injects Idempotency-Key on POST/PUT if missing', async () => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    jest.spyOn(axios, 'create').mockReturnValue(instance as any);

    mock.onPost('/v1/expenses/card/receipt_match').reply((config) => {
      expect(config.headers['Idempotency-Key']).toBeDefined();
      return [200, { id: 'upload_1', uri: 'https://s3/...' }];
    });

    const c = new BrexClient();
    const res = await c.createReceiptMatch({ receipt_name: 'r.jpg' });
    expect(res.id).toBe('upload_1');
  });

  it('retries on 429 with Retry-After', async () => {
    jest.useFakeTimers();
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    jest.spyOn(axios, 'create').mockReturnValue(instance as any);

    mock
      .onGet('/v1/expenses')
      .replyOnce(429, {}, { 'Retry-After': '1' })
      .onGet('/v1/expenses')
      .reply(200, { items: [], next_cursor: null });

    const c = new BrexClient();
    const p = c.getExpenses();
    await jest.advanceTimersByTimeAsync(1000);
    const out = await p;
    expect(out.items).toEqual([]);
    jest.useRealTimers();
  });
});
```

## 2) Integration Tests (Mocked HTTP)
Use a minimal mock Server that captures handlers from each module in isolation to avoid cross‑module override. For each resource module, only register that module’s handler on the mock server, then call it directly.

### 2.1 Mock Server Utility
File: src/__tests__/helpers/mockServer.ts
```ts
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ReadResourceRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export class MockServer implements Partial<Server> {
  public handlers = new Map<any, Function>();
  registerCapabilities(_: any) { /* no-op */ }
  setRequestHandler(schema: any, fn: any) {
    this.handlers.set(schema, fn);
  }
  getReadResource() { return this.handlers.get(ReadResourceRequestSchema); }
  getListResources() { return this.handlers.get(ListResourcesRequestSchema); }
  getListTools() { return this.handlers.get(ListToolsRequestSchema); }
  getCallTool() { return this.handlers.get(CallToolRequestSchema); }
}
```

### 2.2 Resources — Expenses Router
File: src/resources/__tests__/router.expenses.test.ts
```ts
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MockServer } from '../../__tests__/helpers/mockServer.js';
import { registerResourcesRouter } from '../../resources/router.js';
import { BrexClient } from '../../services/brex/client.js';

describe('resources/router expenses', () => {
  it('lists expenses with projection when summary_only=true', async () => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    jest.spyOn(axios, 'create').mockReturnValue(instance as any);

    mock.onGet('/v1/expenses').reply(200, {
      items: [
        { id: 'e1', updated_at: '2025-01-01T00:00:00Z', status: 'APPROVED', purchased_amount: { amount: 10, currency: 'USD' }, merchant: { raw_descriptor: 'ACME' } },
      ],
      next_cursor: null,
    });

    const server = new MockServer();
    registerResourcesRouter(server as any);
    const read = server.getReadResource();
    const res = await read({ params: { uri: 'brex://expenses?summary_only=true&fields=id,status' } });
    const body = JSON.parse(res.contents[0].text);
    expect(body[0]).toEqual({ id: 'e1', status: 'APPROVED' });
  });
});
```

### 2.3 Resources — Usage Doc
File: src/resources/__tests__/usage.doc.test.ts
```ts
import { MockServer } from '../../__tests__/helpers/mockServer.js';
import { registerUsageResource } from '../../resources/usage.js';

describe('resources/usage', () => {
  it('returns usage JSON', async () => {
    const server = new MockServer();
    registerUsageResource(server as any);
    const read = server.getReadResource();
    const res = await read({ params: { uri: 'brex://docs/usage' } });
    const doc = JSON.parse(res.contents[0].text);
    expect(doc.title).toMatch(/Usage Guide/);
    expect(Array.isArray(doc.key_principles)).toBe(true);
  });
});
```

### 2.4 Tools — Pagination
File: src/tools/__tests__/get_all_expenses.test.ts
```ts
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MockServer } from '../../__tests__/helpers/mockServer.js';
import { registerTools } from '../../tools/index.js';

describe('tools/get_all_expenses', () => {
  it('pages until max_items and respects page_size', async () => {
    const instance = axios.create();
    const mock = new MockAdapter(instance);
    jest.spyOn(axios, 'create').mockReturnValue(instance as any);

    // Two pages then end
    mock.onGet('/v1/expenses').replyOnce(200, {
      items: Array.from({ length: 2 }).map((_, i) => ({ id: `e${i}` })),
      next_cursor: 'n1'
    });
    mock.onGet('/v1/expenses').replyOnce(200, {
      items: Array.from({ length: 2 }).map((_, i) => ({ id: `e${i+2}` })),
      next_cursor: null
    });

    const server = new MockServer();
    registerTools(server as any);
    const callTool = server.getCallTool();
    const res = await callTool({ params: { name: 'get_all_expenses', arguments: { page_size: 2, max_items: 3 } } });
    const out = JSON.parse(res.content[0].text);
    expect(out.items.length).toBe(3);
  });
});
```

## 3) End‑to‑End (E2E) MCP (Stdio)
Build first (`npm run build`), then spawn `build/index.js` using the MCP client.

File: e2e/server.stdio.test.ts
```ts
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('E2E stdio', () => {
  it('lists resources, prompts, and tools', async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [path.resolve(process.cwd(), 'build/index.js')],
      env: { ...process.env, LOG_LEVEL: 'ERROR', BREX_API_KEY: 'test-key', BREX_API_URL: 'https://example.test' }
    });
    const client = new Client({ name: 'brex-e2e', version: '1.0.0' }, { capabilities: { prompts: {}, resources: {}, tools: {} } });
    await client.connect(transport);

    const resources = await client.listResources();
    expect(Array.isArray(resources.resources)).toBe(true);

    const prompts = await client.listPrompts();
    expect(Array.isArray(prompts.prompts)).toBe(true);

    const tools = await client.listTools();
    expect(Array.isArray(tools.tools)).toBe(true);

    await (transport as any).close?.();
  }, 20000);
});
```

Notes:
- The server currently registers multiple ReadResource handlers; only the last one is effective at runtime. E2E smoke tests should focus on list operations and the usage doc until refactor unifies dispatch.

## Fixtures (Examples)
Create minimal JSON files under `src/__tests__/fixtures/` if you prefer static fixtures over inline literals:

- src/__tests__/fixtures/expenses_list_small.json
```json
{ "items": [ { "id": "e1" }, { "id": "e2" } ], "next_cursor": null }
```

- src/__tests__/fixtures/card_transactions_page1.json
```json
{ "items": [ { "id": "t1", "posted_at_date": "2025-01-01", "amount": { "amount": 1, "currency": "USD" } } ], "next_cursor": "n1" }
```

- src/__tests__/fixtures/card_transactions_page2.json
```json
{ "items": [ { "id": "t2", "posted_at_date": "2025-01-02", "amount": { "amount": 2, "currency": "USD" } } ], "next_cursor": null }
```

## Execution
- Install dev deps: `npm i -D axios-mock-adapter`
- Run tests: `npm test`
- E2E: `npm run build && npm test e2e/server.stdio.test.ts` (or let Jest pick it up)

## Implementation Order
1. Unit tests: ResourceTemplate, responseLimiter.
2. Client tests: headers, idempotency, 429 retry.
3. Integration tests: resources (router, usage), tools pagination.
4. E2E stdio smoke test.
5. Refactor ReadResource into a single dispatcher; keep tests green.

## Risks & Mitigations
- Over‑mocking → Keep fixtures aligned with Brex docs; add edge‑case variants.
- Flaky retry timing → Use `jest.useFakeTimers()` and `advanceTimersByTimeAsync`.
- E2E process leaks → Always close the transport; set generous test timeout.
