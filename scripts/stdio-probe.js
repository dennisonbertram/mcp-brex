import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function writeFrame(child, obj) {
  const body = JSON.stringify(obj);
  const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
  child.stdin.write(header + body);
}

function makeMessage(id, method, params) {
  return { jsonrpc: '2.0', id, method, params };
}

async function run() {
  const serverPath = path.resolve(process.cwd(), 'build/index.js');
  const child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env }
  });

  let buffer = Buffer.alloc(0);
  const responses = [];

  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    // Parse MCP frames: Content-Length: N\r\n\r\n{...}
    while (true) {
      const sep = Buffer.from('\r\n\r\n');
      const idx = buffer.indexOf(sep);
      if (idx === -1) break;
      const headerBuf = buffer.slice(0, idx).toString('utf8');
      const m = headerBuf.match(/Content-Length:\s*(\d+)/i);
      if (!m) {
        // Drop invalid header
        buffer = buffer.slice(idx + sep.length);
        continue;
      }
      const len = parseInt(m[1], 10);
      const start = idx + sep.length;
      if (buffer.length < start + len) break; // wait for full body
      const body = buffer.slice(start, start + len).toString('utf8');
      buffer = buffer.slice(start + len);
      try {
        const json = JSON.parse(body);
        responses.push(json);
        console.log('<<<', JSON.stringify(json));
      } catch {
        console.log('<<< (non-json body head)', body.slice(0, 200));
      }
    }
  });

  // Send initialize
  writeFrame(child, makeMessage(1, 'initialize', {
    clientInfo: { name: 'stdio-probe', version: '1.0.0' },
    capabilities: { prompts: {}, resources: {}, tools: {} }
  }));

  // List resources and tools
  writeFrame(child, makeMessage(2, 'resources/list', {}));
  writeFrame(child, makeMessage(3, 'tools/list', {}));

  // Call get_all_card_expenses with small filter
  writeFrame(child, makeMessage(4, 'tools/call', {
    name: 'get_all_card_expenses',
    arguments: {
      page_size: 3,
      status: ['APPROVED'],
      payment_status: ['CLEARED']
    }
  }));

  // Call get_all_expenses with filter
  writeFrame(child, makeMessage(5, 'tools/call', {
    name: 'get_all_expenses',
    arguments: {
      page_size: 3,
      expense_type: ['CARD'],
      status: ['APPROVED']
    }
  }));

  // Exit after a short delay
  setTimeout(() => {
    try { child.stdin.end(); } catch {}
    try { child.kill(); } catch {}
  }, 5000);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


