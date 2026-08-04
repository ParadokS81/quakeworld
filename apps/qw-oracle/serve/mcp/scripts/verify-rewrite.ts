// Verification harness for the v0.2.0 rewrite. Spawns the MCP server,
// calls each tool against representative inputs, validates response shape.
// Exit code 1 on any failure. Run with: bun run scripts/verify-rewrite.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '..', 'src', 'index.ts');

// Env preflight. The server deliberately degrades to lexical-only search when
// VOYAGE_API_KEY is absent (resilience against Voyage outages) -- but this
// harness ASSERTS search quality, so a missing key here produces phantom
// match_quality failures instead of an env error (2026-08-04: cost two
// debugging rounds when a keyless run mimicked a retrieval regression).
for (const v of ['DATABASE_URL', 'VOYAGE_API_KEY']) {
  if (!process.env[v]) {
    console.error(`FATAL  ${v} is not set -- source apps/qw-oracle/.env before running (semantic-search checks require the real query-embedding path).`);
    process.exit(2);
  }
}

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', serverPath],
  // StdioClientTransport does NOT inherit the parent process's full env by
  // default -- it merges the SDK's curated safe-inherit allowlist
  // (getDefaultEnvironment(), which excludes app-specific vars like
  // DATABASE_URL) with whatever `env` is passed here. Without this, the
  // spawned server throws at shared/db.ts ("DATABASE_URL is not set").
  env: process.env as Record<string, string>,
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
// Tool count per API_CONTRACTS.md "Tool catalog (current 13)" -- was 12 when
// this literal was written; describe_mode/search_concepts/redirect_to_human
// landed since (stale-literal drift, Phase 3 wave B).
check('listTools returns 13 tools', tools.tools.length === 13, `got ${tools.tools.length}`);

// 1. Case-fold lookup: the original miss (camelCase input, lowercased storage).
// Scoped to project=ezquake because the same cvar name now exists in fte too
// (multi-project loading post-Phase 2d-bundle).
const r1 = parse(
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'cl_deadbodyFilter', project: 'ezquake' } }),
);
check('lookup_entity case-fold cl_deadbodyFilter found', r1.results.length === 1 && r1.match_quality !== 'none');
const e1 = r1.results[0] as Record<string, unknown>;
// API_CONTRACTS.md Query contract: "Any-case in, source-case out" (migration
// 013 name_fold match key). name is NOT lowercased -- it is returned in the
// engine's own source capitalization, which for this cvar is mixed-case.
// This literal asserted the pre-013 lowercased behavior (stale, Phase 3 wave B).
check('  - name returned in source capitalization', e1.name === 'cl_deadbodyFilter', `got ${e1.name}`);
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

// 3. Lookup a cvar with asset relations expected. Scoped to project=ezquake
// because baseskin also exists in qwcl + fte after multi-project loading.
const r3 = parse(
  await client.callTool({ name: 'lookup_entity', arguments: { name: 'baseskin', project: 'ezquake' } }),
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

// 9. info_key cross-scope smoke (added 2026-04-28, schema v16). The entities
// canonical name carries `<bare>:<scope>` so the same key registered in
// multiple scopes survives the UNIQUE(project, type, name) constraint.
// `*z_ext` registers as both serverinfo (SV_InitLocal) and userinfo
// (SVC_DirectConnect) -- looking up the bare name with type=info_key must
// return both rows via the prefix-match fallback.
{
  const r = parse(
    await client.callTool({
      name: 'lookup_entity',
      arguments: { name: '*z_ext', type: 'info_key', project: 'mvdsv' },
    }),
  );
  check('info_key cross-scope: *z_ext returns 2 rows', r.results.length === 2,
    `got ${r.results.length}`);
  const scopes = (r.results as Record<string, unknown>[])
    .map(e => (e.name as string).split(':')[1])
    .sort();
  check('  - scopes are serverinfo + userinfo',
    JSON.stringify(scopes) === JSON.stringify(['serverinfo', 'userinfo']),
    `got ${JSON.stringify(scopes)}`);
}

// 10. Game-mechanics tools (added 2026-04-27, schema v14).
{
  const r = await client.callTool({ name: 'lookup_gameplay_entity', arguments: { name: 'rocket_launcher' } });
  const text = (r.content as Array<{ type: string; text: string }>)[0].text;
  const parsed = JSON.parse(text);
  check('dispatcher: lookup_gameplay_entity rocket_launcher', parsed.match_quality === 'strong' && parsed.results[0]?.damage === 110);
}
{
  const r = await client.callTool({ name: 'lookup_mechanic', arguments: { name: 'lava' } });
  const parsed = JSON.parse((r.content as Array<{ type: string; text: string }>)[0].text);
  check('dispatcher: lookup_mechanic lava', parsed.match_quality === 'strong' && parsed.results[0]?.kind === 'env_hazard');
}
{
  const r = await client.callTool({ name: 'search_gameplay_entities', arguments: { kind: 'weapon', has_splash: true } });
  const parsed = JSON.parse((r.content as Array<{ type: string; text: string }>)[0].text);
  check('dispatcher: search_gameplay_entities splash weapons = 2', parsed.results.length === 2);
}
{
  const r = await client.callTool({ name: 'search_mechanics', arguments: { kind: 'env_hazard' } });
  const parsed = JSON.parse((r.content as Array<{ type: string; text: string }>)[0].text);
  // 9 = 7 id1 + 2 ktx (ca's fall_damage/drowning suppression, added by the
  // KTX onboarding arc). Was 7 (id1-only) when this literal was written.
  check('dispatcher: search_mechanics env_hazard = 9', parsed.results.length === 9, `got ${parsed.results.length}`);
}

await client.close();

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILURES`}`);
process.exit(failed === 0 ? 0 : 1);
