// Verification harness for the v0.2.0 rewrite. Spawns the MCP server,
// calls each tool against representative inputs, validates response shape.
// Exit code 1 on any failure. Run with: bun run scripts/verify-rewrite.ts

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
const client = new Client({ name: 'verify', version: '0.0.1' }, { capabilities: {} });
await client.connect(transport);

let failed = 0;

function parse(res: unknown): { results: unknown[]; match_quality: string } {
  const content = (res as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  const text = content.find((b) => b.type === 'text')?.text ?? '{}';
  return JSON.parse(text);
}

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`PASS  ${label}`);
  } else {
    console.log(`FAIL  ${label}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

const tools = await client.listTools();
check('listTools returns 4 tools', tools.tools.length === 4, `got ${tools.tools.length}`);

// 1. Case-fold lookup: the original miss (camelCase input, lowercased storage)
const r1 = parse(
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'cl_deadbodyFilter' } }),
);
check('lookup_entity case-fold cl_deadbodyFilter found', r1.results.length === 1 && r1.match_quality !== 'none');
const e1 = r1.results[0] as Record<string, unknown>;
check('  - name normalized to lowercase', e1.name === 'cl_deadbodyfilter');
check('  - has source_state', typeof e1.source_state === 'string');
check('  - has version arc', typeof e1.first_seen_version === 'string' && typeof e1.last_seen_version === 'string');
check('  - has current snapshot object', typeof e1.current === 'object' && e1.current !== null);
check('  - asset_relations is array', Array.isArray(e1.asset_relations));
check('  - linked_concepts is array', Array.isArray(e1.linked_concepts));
check('  - linked to concept:player-skins',
  (e1.linked_concepts as string[]).includes('concept:player-skins'),
  `got ${JSON.stringify(e1.linked_concepts)}`);

// 2. Lookup a command
const r2 = parse(
  await client.callTool({ name: 'lookup_entity', arguments: { name: '+fire_ar' } }),
);
check('lookup_entity command +fire_ar', r2.results.length === 1);
const e2 = r2.results[0] as Record<string, unknown>;
check('  - type === command', e2.type === 'command');
check('  - linked to concept:weapon-scripts',
  (e2.linked_concepts as string[]).includes('concept:weapon-scripts'),
  `got ${JSON.stringify(e2.linked_concepts)}`);

// 3. Lookup a cvar with asset relations expected
const r3 = parse(
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'baseskin' } }),
);
check('lookup_entity baseskin', r3.results.length === 1);
const e3 = r3.results[0] as Record<string, unknown>;
check('  - has asset_relations (skin loader)',
  (e3.asset_relations as unknown[]).length > 0,
  `got ${JSON.stringify(e3.asset_relations)}`);

// 4. search_entities
const r4 = parse(
  await client.callTool({ name: 'search_entities', arguments: { query: 'lightning', limit: 5 } }),
);
check('search_entities lightning', r4.match_quality === 'strong' && r4.results.length > 0);
check('  - all results have current snapshot',
  (r4.results as Record<string, unknown>[]).every((r) => r.current && typeof r.current === 'object'));

// 5. Type filter
const r5 = parse(
  await client.callTool({ name: 'search_entities', arguments: { query: 'team', type: 'macro', limit: 5 } }),
);
check('search_entities type:macro', r5.results.length > 0);
check('  - all results are macros',
  (r5.results as Record<string, unknown>[]).every((r) => r.type === 'macro'));

// 6. get_concept_note - new frontmatter shape
const r6 = parse(
  await client.callTool({ name: 'get_concept_note', arguments: { id: 'concept:weapon-scripts' } }),
);
check('get_concept_note weapon-scripts', r6.results.length === 1);
const note = r6.results[0] as Record<string, unknown>;
check('  - has body', typeof note.body === 'string' && (note.body as string).length > 100);
check('  - has related_entities', Array.isArray(note.related_entities) && (note.related_entities as unknown[]).length > 0);
check('  - has external_refs', Array.isArray(note.external_refs));
check('  - has frontmatter passthrough',
  typeof note.frontmatter === 'object' && (note.frontmatter as Record<string, unknown>).primary_contributors !== undefined);

// 7. search_solved_issues - Layer 2 second-DB connection
const r7 = parse(
  await client.callTool({
    name: 'search_solved_issues',
    arguments: { query: 'rpickup', limit: 1, max_messages_per_session: 3 },
  }),
);
check('search_solved_issues rpickup (Layer 2)', r7.results.length > 0);

// 8. No-match graceful behavior
const r8 = parse(
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'definitely_not_a_cvar_xyz123' } }),
);
check('lookup_entity no-match returns match_quality=none', r8.match_quality === 'none' && r8.results.length === 0);

await client.close();

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURES`}`);
process.exit(failed === 0 ? 0 : 1);
