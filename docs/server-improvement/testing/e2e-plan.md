# E2E Testing Plan (MCP Client)

Goal: Validate end-to-end behavior by spawning the built MCP server and interacting via the official MCP client over stdio. Keep tests hermetic (no live Brex calls) and fast.

## Approach
- Spawn `build/index.js` using `@modelcontextprotocol/sdk` `Client` + `StdioClientTransport`.
- Verify: `listResources`, `readResource(brex://docs/usage)`, `listPrompts`, `listTools`.
- Avoid Brex HTTP calls in E2E: do not read data-heavy resources; leave those to integration tests with axios-mock-adapter.

## References (Context7)
- Client creation and stdio transport:
  - Connect with `Client` and `StdioClientTransport`, then call `listTools` and other methods.

## Example Test (TypeScript)
File: `e2e/server.stdio.test.ts`

```ts
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('E2E stdio', () => {
  it('lists resources, prompts, and tools; reads usage', async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [path.resolve(process.cwd(), 'build/index.js')],
      env: { ...process.env, LOG_LEVEL: 'ERROR', BREX_API_KEY: 'test-key', BREX_API_URL: 'https://example.test' }
    });
    const client = new Client({ name: 'brex-e2e', version: '1.0.0' }, { capabilities: { prompts: {}, resources: {}, tools: {} } });
    await client.connect(transport);

    const resources = await client.listResources();
    expect(Array.isArray(resources.resources)).toBe(true);

    const usage = await client.readResource('brex://docs/usage');
    expect(usage.contents?.[0]?.mimeType).toBe('application/json');

    const prompts = await client.listPrompts();
    expect(Array.isArray(prompts.prompts)).toBe(true);

    const tools = await client.listTools();
    expect(Array.isArray(tools.tools)).toBe(true);

    await (transport as any).close?.();
  }, 20000);
});
```

## Notes
- Keep E2E focused on server wiring. Use integration tests for Brex API interactions.
- Ensure server prints logs only to stderr; stdout must contain only JSON-RPC messages.
- Consider adding a second E2E test later for a small tool call that doesn’t require network (or mock environment), e.g., a documentation resource.

