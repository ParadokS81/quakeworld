// Smoke test for the qw-oracle MCP server. Starts the server as a subprocess,
// calls each tool with representative arguments, prints the JSON responses.
// Run with: bun run scripts/test-call.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '..', 'src', 'index.ts');

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', serverPath],
});

const client = new Client({ name: 'test-call', version: '0.0.1' }, { capabilities: {} });
await client.connect(transport);

const tools = await client.listTools();
console.log('tools:', tools.tools.map((t) => t.name));

function printResponse(label: string, res: unknown) {
  console.log(`\n${label}:`);
  const content = (res as { content?: Array<unknown> }).content ?? [];
  for (const block of content) {
    const b = block as { type: string; text?: string };
    if (b.type === 'text' && b.text) console.log(b.text);
  }
}

// --- lookup_entity ---
printResponse(
  'lookup_entity(cl_bob)',
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'cl_bob' } }),
);

printResponse(
  'lookup_entity(rpickup)',
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'rpickup' } }),
);

// --- search_solved_issues ---
printResponse(
  'search_solved_issues(rpickup, limit=2, max_messages=6)',
  await client.callTool({
    name: 'search_solved_issues',
    arguments: { query: 'rpickup', limit: 2, max_messages_per_session: 6 },
  }),
);

await client.close();
