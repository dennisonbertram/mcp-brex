import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export type StartedClient = {
  client: Client;
  transport: StdioClientTransport;
  stop: () => Promise<void>;
};

export async function startServerClient(extraEnv?: Record<string, string | undefined>): Promise<StartedClient> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'build/index.js')],
    env: { ...process.env, LOG_LEVEL: 'ERROR', BREX_API_KEY: 'test-key', BREX_API_URL: 'https://example.test', ...extraEnv },
  });
  const client = new Client({ name: 'brex-e2e', version: '1.0.0' }, { capabilities: { prompts: {}, resources: {}, tools: {} } });
  await client.connect(transport);
  return {
    client,
    transport,
    stop: async () => { await (transport as any).close?.(); },
  };
}

