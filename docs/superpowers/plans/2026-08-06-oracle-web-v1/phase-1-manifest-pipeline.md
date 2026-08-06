# Phase 1 -- manifest pipeline (contract owner)

**Arc:** oracle-web-v1. **Ledger:** `decisions.md` P1-P11 (this phase owns P2's
contract). **Spec:** `docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md`
D3/D4/D5/D7 + 2026-08-06 amendments. **Shape seed:** the mockup's inline `DC`
block (`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html:244-265`,
labeled "brain-manifest.json, 2026-08-05").

## Goal

Lock `brain-manifest.json`'s field shapes as the arc's one data contract (P2),
rewrite the existing emitter to conform (all numbers derived from the live dev
DB at emit time), land the emitted file in
`/mnt/user/appdata/qw-oracle/snapshots/`, add the CORS line to the snapshots
nginx location (`always`-hardening its header set in the same touch), reload
nginx, and append the one-line publish rider
to the harvest runbook. The phase ends with the manifest fetchable cross-origin
at `https://oracle.slipgate.me/snapshots/brain-manifest.json` -- CORS header
present, Cache-Control `public, max-age=300`, every number matching a live DB
query -- and a committed repo copy at `apps/qw-oracle/snapshots/brain-manifest.json`
ready to serve as Phase 2's baked-fallback source.

## Local decision -- emitter home: evolve the existing standalone script (not build-snapshot)

**Decision:** the emitter is `apps/qw-oracle/scripts/build-brain-manifest.ts`
-- which ALREADY EXISTS (committed `7c9f2db4`, 2026-08-05, pre-mockup-lock).
This phase rewrites its output shape to the P2/P8-conformant contract below;
`scripts/load-knowledge/build-snapshot.ts` is not touched.

**Why standalone:** build-snapshot's in-file consumer pattern (the docs export)
paid off because that consumer shares `loadEnrichment` / `readExtractorAst` /
`writeJson` and per-project versioning. The brain manifest shares none of that:
it is cross-project, cross-layer (L1 + L2 + L3 + game content), pure aggregate
counts, no enrichment, no extractor ASTs, and rides the monthly harvest ritual
rather than the extract-tag cadence. The existing standalone script already
carries the right mechanics (history stub, `--out`, `--publish` copy to
appdata) -- verified by reading it 2026-08-06.

**Why the shape rewrite is safe:** the committed manifest was emitted once
(2026-08-05, `history: []`), was never published (`curl` of the public URL
returns 404 today, snapshots appdata dir is empty), and repo-wide grep finds no
consumer besides the emitter itself. Nothing depends on the old
registry/regions shape. The rewrite also drops two fields the old shape leaked
that the contract forbids or the site never consumes: `recent_solved_labels`
(thread topic labels -- level-4-adjacent content) and per-note `summary` rows.

## The contract -- brain-manifest v1 field shapes (normative)

Phases 2-6 never invent fields; a needed-but-missing field is a finding routed
back here as a dated amendment (P2). The canonical machine-readable statement
is the exported `BrainManifest` interface in
`apps/qw-oracle/scripts/build-brain-manifest.ts`; this section is the normative
prose. Field names follow the mockup `DC` seed exactly (`name` / `num` / `sub`
/ `lit` / `share` / `stationSubs` / `bars` / `stats` / `notes` / `teaser` /
`door`) so the Phase 3 port maps 1:1, with two typed cleanups recorded under
Open questions: raw numbers instead of pre-formatted strings, and a structured
`door` object instead of an HTML string. One field pair extends the seed by
dated amendment (`threads` / `solved`, 2026-08-06 -- see the amendment block
at the end of this section).

### Envelope

```ts
interface BrainManifest {
  schema_version: 'brain-manifest-v1'; // string, build-snapshot style ('snapshot-v1' / 'docs-snapshot-v1'); bump on breaking shape change
  generated_at: string;                // ISO 8601, emit time
  oracle_commit: string;               // git rev-parse HEAD of the monorepo, 'unknown' on failure (buildMeta pattern, build-snapshot.ts:649-662)
  source: 'twin' | 'prod';             // derived from DATABASE_URL host (contains 'qw-oracle-postgres-dev' -> 'twin'); wrong-DB self-report
  datacenters: Datacenter[];           // OPEN REGISTRY (D4): render code keys by id, never by position or a hardcoded list
  history: HistoryEntry[];             // growth-trail stub (D7), newest first, capped at 12
}
```

Envelope rationale: `schema_version` + `generated_at` + `oracle_commit` mirror
the established snapshot-meta convention so debugging traces a manifest back to
the exact emitter commit; `source` exists because the cockpit can only reach
the twin (prod DB is off devnet by design) -- the field makes a
wrong-DB-or-stale-parity situation visible in the artifact itself instead of
requiring forensics.

### Datacenter (lit)

```ts
interface LitDatacenter {
  id: string;            // stable registry key. Launch set: 'ef' | 'cm' | 'cs' | 'gc'.
                         // The mockup keys its layout tables (station geometry, seat
                         // indices, column assignment, root queues) by these ids
                         // (mockup lines 399-405, 596-603, 913, 995); the contract
                         // keeps them so the port maps without an id-translation shim.
  name: string;          // P8 display name, uppercase: ENGINE FACTS / DISCORD /
                         // CONCEPT NOTES / GAME CONTENT
  lit: true;
  num: number;           // headline count, RAW integer -- site formats (toLocaleString)
  sub: string;           // drill-card sub-line; emitter-composed, embedded counts
                         // en-US formatted (e.g. "messages · 40,219 threads · 13,134 solved")
  stationSubs: string[]; // station reveal lines (1-2 entries; long subs pre-split per
                         // the P8 addendum label pattern)
  share: number;         // scaffold-density share, 3 decimals -- see formula below
  threads?: number;      // raw topic-thread count (cm only at launch) -- MCP-card
                         // "community threads" figure; also embedded formatted in sub
                         // (2026-08-06 amendment, see below)
  solved?: number;       // raw solved-thread count (cm only at launch); also embedded
                         // formatted in sub/stationSubs (2026-08-06 amendment)
  bars?: Array<[string, number]>;  // region breakdown rows (label, raw count), count-desc.
                                   // ef: per-codebase entities; cm: per-channel messages.
  stats?: Array<[number, string]>; // stat tiles (raw value, label). gc only at launch.
                         // gc's three labels are BYTE-PINNED contract literals, in
                         // this order: "maps", "mechanics", "entity defs" --
                         // consumers may key by them (2026-08-06 amendment, F6)
  notes?: string[];      // named inventory highlight lines (curated groupings, no
                         // numbers embedded). cs only at launch.
  door: Door;            // level-4 exit descriptor (D3)
}
```

### Datacenter (dormant)

```ts
interface DormantDatacenter {
  id: string;            // launch set: 'ch' | 'ms'
  name: string;          // COMMUNITY HISTORY / MATCH STATS (P8)
  lit: false;
  teaser: string;        // spec-D5 dormant copy, static emitter config -- honest
                         // inspiration, never a promise (P9)
}
```

`num` / `sub` / `share` are OMITTED on dormant entries (never null-filled).
The mockup's `"—"` / `"dormant"` / `0` are presentation defaults the site
supplies on the `lit: false` branch -- verified against the mockup's render
code, which reads `dc.num` only when `dc.lit` (mockup lines 654-657, 672) and
skips seat allocation entirely for unlit entries (line 418).

### Door

```ts
type Door =
  | { kind: 'site';  label: string; code: string; href: string }
      // rendered "<label> → <code>", link to href.
      // ef launch value: label "browse the full reference", code
      // "docs.quake.world", href per Open question 4.
  | { kind: 'agent'; call: string };
      // rendered "ask your agent → <call>".
      // cm: 'search_solved_issues("…")' · cs: 'get_concept_note("…")'
      // · gc: 'lookup_map("dm3")'
```

### History stub (D7 growth trails)

```ts
interface HistoryEntry {
  generated_at: string;              // the prior emit's timestamp
  nums: Record<string, number>;      // headline num per LIT datacenter id at that emit
}
```

Mechanics (carried over from the existing emitter, adapted to the new field
names): on each emit, if the default output file
(`apps/qw-oracle/snapshots/brain-manifest.json`, the committed copy) exists and
parses, prepend `{ generated_at: prev.generated_at, nums: { id: num, ... } }`
to `prev.history` and cap the array at 12 entries -- at the monthly harvest
cadence that is one year of trail, enough for a growth sparkline, small enough
to never bloat the file. A bare try/catch is NOT sufficient at the boundary:
the committed 2026-08-05 old-shape emit is VALID JSON (`built_at`, `glow`,
headline objects, no `.num`), so it parses cleanly and an unguarded adapt
would emit a contract-violating `{ "nums": {} }` history entry with no
`generated_at`. The emitter must therefore SHAPE-GUARD before trusting `prev`:
only carry history forward when `prev.schema_version === 'brain-manifest-v1'`
AND `typeof prev.generated_at === 'string'`; any other previous file
(unparseable OR old-shape) starts history fresh at `[]`. The only existing
file is that old-shape emit with `history: []`, so nothing real is lost --
verified 2026-08-06. Cadence guard: the prepend is SKIPPED when
`prev.generated_at` falls on the same UTC calendar day as the current emit --
otherwise a burst of debug re-emits floods the 12-slot trail with same-day
entries and evicts a year of monthly history; the guard keeps at most the
last emit of each prior day. Note: the stub has no v1 UI consumer BY DESIGN
-- spec D7 mandates the growth-trail stub as a forward surface; v1 ships the
data, a later arc draws the sparkline.

### Scaffold-density `share` -- emitter computes it

Formula, reverse-verified against the mockup's published values on 2026-08-06:

    share_i = ln(1 + num_i) / SUM over lit datacenters of ln(1 + num_j)

With the mockup's 2026-08-05 numbers (cm 741128 / ef 11081 / gc 254 / cs 44)
this reproduces the mockup's shares exactly at 3 decimals: cm .420 / ef .289 /
gc .172 / cs .118 (`python3 -c` check run at drafting time). Emit rounded to 3
decimals. Default ruling (Open question 1): the EMITTER computes `share`; the
site consumes it as data. Load-bearing reason under D4/P3: which count is "the"
headline for the log-scale is registry knowledge -- keeping the formula
emitter-side means a newly attached datacenter arrives with its density share
and the static site needs no redeploy.

### What NEVER rides the manifest (D3/D7 hard rule)

No level-4 artifacts: no thread contents or topic labels, no concept-note
bodies or summaries, no per-entity rows, no participant lists. The manifest
carries counts, emitter-composed display strings, curated highlight LINES,
teasers, and door descriptors -- nothing an agent-door or docs-door would
otherwise serve. The phase-boundary key-set probe below enforces this
mechanically.

### Number sources -- SQL per field, with drafting-time baseline

Every query below was RUN read-only on 2026-08-06 against the dev twin via
`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc "<sql>"`.
**The values are a drafting-time baseline, expected to drift** -- the emitter
derives them fresh at every emit; never copy them into code. (Drift is already
live: the 2026-08-05 mockup says 20,270 threads / 6,666 solved / 44 notes; one
day later the thread and solved counts have doubled via the L2 backfill.)

| Manifest field | SQL | Value 2026-08-06 (baseline, will drift) |
|---|---|---|
| `ef.num` | `select count(*) from entities` | 11081 |
| `ef` codebase count (in `sub`) | `select count(distinct project) from entities` | 7 |
| `ef.bars` | `select project, count(*) from entities group by project order by count(*) desc` | ezquake 4192, fte 3279, ktx 1892, mvdsv 1236, qwcl 380, qtv 52, qwfwd 50 |
| `cm.num` | `select count(*) from messages` | 741128 |
| `cm.threads` (raw field; also formatted into `sub`/`stationSubs`) | `select count(*) from chat_threads` | 40219 |
| `cm.solved` (raw field; also formatted into `sub`/`stationSubs`) | `select count(*) from chat_threads where resolution_status = 'solved'` | 13134 |
| `cm.bars` | `select channel_name, count(*) from messages group by channel_name order by count(*) desc` | #quakeworld 399080, #dev-corner 211602, #helpdesk 109008, #antilag 21438 |
| `cs.num` | `select count(*) from concepts where summary is not null and summary <> ''` | 44 (raw table count is 45; the delta is `test-qwiki-harvest-probe`, an empty-summary harvest-probe breadcrumb -- see Open question 2) |
| `gc.num` + `gc.stats` maps | `select count(*) from maps` | 254 |
| `gc.stats` mechanics | `select count(*) from gameplay_mechanics` | 514 |
| `gc.stats` entity defs | `select count(*) from gameplay_entity_defs` | 76 |

Static emitter config (no DB derivation, no embedded counts): `cs.notes`
highlight lines, `ch`/`ms` teasers (spec-D5 copy; the "18,000+" figure in the
`ms` teaser is qw-stats territory, not in this DB, and stays static copy),
door descriptors, and the fixed parts of `sub`/`stationSubs` strings.

### Amendment -- 2026-08-06: raw `threads` / `solved` fields on `cm` (surfaced by Phase 3 T8)

**What changed:** the `cm` datacenter gains two optional raw-integer fields,
`threads` and `solved`, populated from the queries already in the
number-sources table (`chat_threads` count / solved-status count; baseline
40,219 / 13,134). The contract body above shows the final post-amendment
shape.

**Why:** the mockup's MCP card (line ~272) renders "-- 20,270 community
threads" as a RAW numeric figure, and floor-1 station subs surface the solved
count -- but v1-as-first-drafted carried thread/solved numbers only inside
emitter-composed display strings (`sub` / `stationSubs`), and `cm.num` is the
MESSAGE count. Phase 3's dumb components must not parse display strings back
into numbers; per P2 the missing fields route back here as an amendment
rather than being invented downstream.

**Shape ruling:** named optional fields on `LitDatacenter` (the established
per-datacenter variant pattern: `bars?` / `stats?` / `notes?`), NOT a generic
`counts?: Record<string, number>` -- dynamic keys would poison the closed-
key-set leak probe the same way `history[].nums` did, and typed names keep
"hit dot, see what you can do" working in the Phase 2 mirror. Additive only:
no existing field changed meaning, so Phase 2's field references stay valid.

**Sibling amendment, same date (surfaced by Phase 4 checker; findings-ledger
entry F6):** the three
`gc.stats` label strings are BYTE-PINNED emitter config -- exactly `"maps"`,
`"mechanics"`, `"entity defs"`, in that order. Consumers (Phase 4 terminal
copy interpolation) may key rows by these literals; any wording change
("entity definitions") is a contract change requiring a dated amendment here,
never a silent emitter edit. Blast radius: the `stats` comment in the TS
block, plus a label-pin conjunct added to probe 4 -- coverage was re-checked
and the existing probes verified only stats SHAPE, not the pinned literals,
so the byte-pin gets its own mechanical check (the number-sources table
already names the three labels verbatim; unchanged).

**Blast radius walked (all updated in place):** TS contract block; probe 4
(cm now type-checked for numeric `threads`/`solved`); probe 5 allowlist
(+`threads`, +`solved`); probe 6 (two new number-vs-DB spot checks); the
number-sources table rows renamed from display-string-only to field rows;
Task 1 step 2; Outputs-to-next-phase MCP-card claim corrected. Probe 3
unchanged (envelope-scope; per-datacenter typing lives in probe 4). Dormant
shape untouched (the new fields are optional and lit-only at launch).

## Inputs from previous phase

Phase 1 is the arc's first phase; these are verified starting facts (all
probed 2026-08-06 at drafting time):

- **nginx `/snapshots/` location exists** with `alias /var/oracle/snapshots/`,
  `Cache-Control "public, max-age=300"`, in BOTH copies -- repo
  `apps/qw-oracle/deploy/nginx.conf` and deployed
  `/mnt/user/appdata/qw-oracle/nginx.conf` -- and `diff` of the two exits 0
  (identical). The deployed copy is bind-mounted ro into the container at
  `/etc/nginx/conf.d/default.conf` (compose line 74).
- **Snapshots dir writable and empty**: `ls -ld /mnt/user/appdata/qw-oracle/snapshots/`
  -> `drwxr-xr-x dev users`, zero files. Mounted ro into the nginx container at
  `/var/oracle/snapshots` (compose line 75).
- **Public URL live**: `curl -si https://oracle.slipgate.me/health` -> 200 `ok`;
  `curl -si https://oracle.slipgate.me/snapshots/brain-manifest.json` -> 404
  (expected: dir empty). Observed `cf-cache-status: DYNAMIC` on both.
- **nginx container reachable through the deploy proxy**:
  `docker exec qw-oracle-nginx nginx -t` -> "syntax is ok / test is successful"
  (run at drafting time; proves exec + a valid current config).
- **Dev DB reachable, schema as expected**: all baseline queries above returned
  sane values via `qw-oracle-postgres-dev`. `apps/qw-oracle/.env` carries
  `DATABASE_URL` pointing at `qw-oracle-postgres-dev:5432` (host checked, secret
  not read).
- **Toolchain**: `bun 1.3.11` on PATH (mise shim), `jq` at `/usr/bin/jq`.
- **Prod parity**: prod == twin as of the 2026-08-06 L2 ship (commit
  `067e9d17`, parity 13/13) -- the old emitter's "do not publish until parity"
  gate is satisfied.
- **Existing emitter**: `apps/qw-oracle/scripts/build-brain-manifest.ts`
  (commit `7c9f2db4`), old shape, no external consumers (repo-wide grep), old
  emit at `apps/qw-oracle/snapshots/brain-manifest.json` has `history: []`.

## Files touched

**Created:**
- `/mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json` (published copy; not in git)

**Modified:**
- `apps/qw-oracle/scripts/build-brain-manifest.ts` (contract-conformant rewrite)
- `apps/qw-oracle/snapshots/brain-manifest.json` (regenerated; the committed fallback source)
- `apps/qw-oracle/deploy/nginx.conf` (CORS line + `always` on the `/snapshots/` location's add_header set)
- `/mnt/user/appdata/qw-oracle/nginx.conf` (same edit; deployed copy, not in git -- keep byte-identical to the repo copy)
- `apps/qw-oracle/scripts/load-chat/HARVEST-RUNBOOK.md` (one-line rider; Arc A owns this file per P10 -- minimal touch)

**Deleted:** none.

## Tasks

### Task 1 -- Lock the contract in code: rewrite the emitter · `agent (session-tier, high)` -- ARC CONTRACT OWNER

**Goal:** `build-brain-manifest.ts` emits exactly the shape above; the exported
`BrainManifest` interface IS the contract's machine-readable form.

**Files:** `apps/qw-oracle/scripts/build-brain-manifest.ts` (rewrite in place).

**Steps:**
1. Keep the existing script's skeleton and conventions (top-of-file design
   comment, `shared/db.ts` import, top-level await, `--out` / `--publish`
   argv handling, `HISTORY_CAP = 12`, `closeDb()` at exit).
2. Replace the output assembly with the contract shape: envelope
   (`schema_version: 'brain-manifest-v1'`, `generated_at`, `oracle_commit` via
   the buildMeta `git rev-parse` pattern, `source` from a
   `DATABASE_URL.includes('qw-oracle-postgres-dev') ? 'twin' : 'prod'` check),
   four lit datacenters (`ef`, `cm`, `cs`, `gc`) + two dormant (`ch`, `ms`)
   with P8 names, per the SQL table above -- including the 2026-08-06
   amendment's raw `threads` / `solved` fields on `cm`. Drop the old shape's
   `regions` / `recent_solved_labels` / per-note summary rows / cvar-category
   query entirely.
3. Compose `sub` / `stationSubs` strings emitter-side with
   `n.toLocaleString('en-US')` for embedded counts; emit `num` and all
   `bars`/`stats` values as raw integers.
4. Compute `share` with the ln(1+num) formula over lit datacenters, rounded to
   3 decimals.
5. History stub: read previous default-OUT file inside try/catch, then
   SHAPE-GUARD before adapting -- trust `prev` only when
   `prev.schema_version === 'brain-manifest-v1' && typeof prev.generated_at === 'string'`;
   otherwise start history at `[]`. (The committed old-shape file is valid
   JSON and slips through a bare try/catch, yielding a contract-violating
   `{ "nums": {} }` entry -- checker-verified.) When the guard passes,
   prepend `{ generated_at, nums }`, cap 12 -- UNLESS `prev.generated_at`
   is on the same UTC calendar day as the current emit (compare the ISO
   strings' first 10 chars): then keep `prev.history` unchanged, so debug
   re-emits never evict the monthly trail (cadence guard, cold-review
   CR-GATE).
6. `--publish` copies to `/mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json`;
   write to a temp name in the same directory and rename over the target so a
   concurrent nginx read never sees a torn file (same-filesystem rename;
   confirm the temp name is not served, e.g. `.brain-manifest.json.tmp`).
7. Export the `BrainManifest` / `Datacenter` / `Door` / `HistoryEntry` types.

**Verification probe (no repo write -- emit to scratchpad):**

    cd /home/dev/projects/quakeworld/apps/qw-oracle && bun scripts/build-brain-manifest.ts --out /tmp/claude-99/-home-dev-projects-quakeworld/8d100210-25c5-4bdc-affc-384e027e7860/scratchpad/brain-manifest-check.json
    jq -r '.schema_version, .source, ([.datacenters[].id] | join(","))' /tmp/claude-99/-home-dev-projects-quakeworld/8d100210-25c5-4bdc-affc-384e027e7860/scratchpad/brain-manifest-check.json

Expect `brain-manifest-v1` / `twin` / `ef,cm,cs,gc,ch,ms`, plus spot-check two
numbers against the SQL table above (run the psql literals, compare).

### Task 2 -- Emit + land the manifest · `inline`

**WRITE-GRANT:** may write exactly two files --
`apps/qw-oracle/snapshots/brain-manifest.json` (repo) and
`/mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json` (appdata). Nothing
else in appdata.

**Steps:**

    cd /home/dev/projects/quakeworld/apps/qw-oracle && bun scripts/build-brain-manifest.ts --publish

(cwd matters: the default `--out` is relative and Bun loads `.env` --
`DATABASE_URL` -- from the working directory; the 2026-08-05 emit ran exactly
this way.) Then commit the emitter rewrite + regenerated manifest together.

**Verification probe:**

    cmp /home/dev/projects/quakeworld/apps/qw-oracle/snapshots/brain-manifest.json /mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json && echo IDENTICAL

### Task 3 -- CORS line on the snapshots location + reload · `inline`

**WRITE-GRANT:** may edit exactly `apps/qw-oracle/deploy/nginx.conf` and
`/mnt/user/appdata/qw-oracle/nginx.conf` (one added line each, keeping them
byte-identical), and may run `docker exec qw-oracle-nginx nginx -t` /
`docker exec qw-oracle-nginx nginx -s reload`.

**Steps:**
1. In BOTH copies, inside the `location /snapshots/` block, replace the two
   existing `add_header` lines with these three (matching the file's
   two-space indent):

       add_header Cache-Control "public, max-age=300" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header Access-Control-Allow-Origin "*" always;

   Wildcard, not a pinned origin: the manifest is public read-only data with
   no credentials, and the consumer origin changes across the arc (CF Pages
   preview URL now, `oracle.quake.world` later). `always` on all three
   because without it nginx adds headers only to 2xx/3xx responses
   (nginx docs, ngx_http_headers_module `add_header`:
   "regardless of the response code" requires the `always` parameter) --
   verified live 2026-08-06: today's 404 on this location carries neither
   configured header. Without `always`, a future error state would drop the
   CORS header and surface to the browser fetch as an opaque network error
   instead of an inspectable HTTP failure.
2. Edit the deployed copy IN PLACE (Edit tool). Do NOT use `sed -i` or
   move-and-replace: the file is a single-file bind mount, and a
   rename-style replacement gives it a new inode the running container will
   never see.
3. Confirm the container sees the edit, validate, reload:

       docker exec qw-oracle-nginx grep -n "Access-Control-Allow-Origin" /etc/nginx/conf.d/default.conf
       docker exec qw-oracle-nginx nginx -t
       docker exec qw-oracle-nginx nginx -s reload

4. Commit the repo copy.

**Verification probe:**

    curl -sI -H "Origin: https://example.pages.dev" https://oracle.slipgate.me/snapshots/brain-manifest.json | grep -i access-control-allow-origin

Expect `access-control-allow-origin: *`.

### Task 4 -- Harvest-runbook rider · `inline`

**WRITE-GRANT:** may edit exactly one sentence in
`apps/qw-oracle/scripts/load-chat/HARVEST-RUNBOOK.md`.

Arc A owns this file (P10); this is the arc's single contact with that surface.
Extend the ritual-closing line (line 53 at drafting time) from:

    Then: retrieval-probe a thread from the NEW window, update `backfill-ledger.md`, commit.

to:

    Then: retrieval-probe a thread from the NEW window, update `backfill-ledger.md`, commit --
    and republish the brain manifest: `bun scripts/build-brain-manifest.ts --publish` (public
    numbers at oracle.slipgate.me/snapshots/ refresh within the 5-minute cache).

Commit separately with a message naming the rider (e.g. "docs(oracle-web):
harvest-runbook rider -- publish brain-manifest as the ritual's final step
(Arc B Phase 1 handoff per P10)") so Arc A's next session sees the touch in
`git log` of its own file.

**Verification probe:** `git -C /home/dev/projects/quakeworld log --oneline -1 -- apps/qw-oracle/scripts/load-chat/HARVEST-RUNBOOK.md` shows the rider commit; the file diff is <= 3 lines.

## Phase-boundary verification

All probes runnable as written. Run 1-8 in order; every one must print its
expected value / YES.

1. **CORS header on the public URL -- on success AND on error states**
   (the second literal proves `always` took effect):

       curl -sI -H "Origin: https://example.pages.dev" https://oracle.slipgate.me/snapshots/brain-manifest.json | grep -i access-control-allow-origin
       curl -sI -H "Origin: https://example.pages.dev" https://oracle.slipgate.me/snapshots/no-such-file.json | grep -i access-control-allow-origin

   Expect: `access-control-allow-origin: *` from BOTH (the second is a 404) -- YES/NO.

2. **Cache-Control + content type:**

       curl -sI https://oracle.slipgate.me/snapshots/brain-manifest.json | grep -iE "cache-control|content-type"

   Expect: `cache-control: public, max-age=300` and `content-type: application/json` -- YES/NO.

3. **Envelope + registry shape + history-entry validity** (last value guards
   the MAJOR-1 failure class: every history entry must carry a string
   `generated_at` and an all-numeric `nums` object; vacuously true on the
   first emit's empty history):

       curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.schema_version, .source, ([.datacenters[].id] | join(",")), (.history | type), (all(.history[]; (.generated_at | type == "string") and (.nums | type == "object") and ([.nums[]] | all(type == "number"))))'

   Expect: `brain-manifest-v1` / `twin` / `ef,cm,cs,gc,ch,ms` / `array` / `true` -- YES/NO.

4. **Per-datacenter shape (lit fields present, dormant teasers present, cm's
   amendment fields numeric, gc's stat labels byte-pinned):**

       curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -e '([.datacenters[] | select(.lit) | (.num != null and .sub != null and .stationSubs != null and .share != null and .door != null)] | all) and ([.datacenters[] | select(.lit | not) | .teaser != null] | all) and ([.datacenters[] | select(.id=="cm") | (.threads | type == "number") and (.solved | type == "number")] | all) and ([.datacenters[] | select(.id=="gc") | [.stats[][1]] == ["maps","mechanics","entity defs"]] | all)' && echo YES

   Expect: `true` + `YES` -- YES/NO.

5. **Closed key set (level-4 leak guard).** `history[].nums` is a
   `Record<datacenter-id, number>` whose KEYS are data, not schema -- they
   must be stripped before the key walk or the probe false-positives on
   every manifest with a real history entry (i.e. from the second emit
   onward). Hence the leading `del`; `nums` itself is validated by probe 3:

       curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -e 'del(.history[].nums) | ([.. | objects | keys[]] | unique) - ["bars","call","code","datacenters","door","generated_at","history","href","id","kind","label","lit","name","notes","num","oracle_commit","schema_version","share","solved","source","stationSubs","stats","sub","teaser","threads"] | length == 0' && echo YES

   Expect: `true` + `YES` (no key outside the contract -- in particular no
   `content`, `summary`, `topic_label`, `participants`) -- YES/NO.

6. **Numbers match the live DB (six spot checks; fourth and fifth are the
   2026-08-06 amendment fields, sixth is a [value,label] PAIR check --
   probe 4 pins the gc labels but only this catches a value-label
   transposition, e.g. 514 riding "maps"):**

       test "$(curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.id=="ef") | .num')" = "$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc 'select count(*) from entities')" && echo YES
       test "$(curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.id=="cm") | .num')" = "$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc 'select count(*) from messages')" && echo YES
       test "$(curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.id=="cm") | .bars[0][1]')" = "$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc "select count(*) from messages where channel_name='#quakeworld'")" && echo YES
       test "$(curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.id=="cm") | .threads')" = "$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc 'select count(*) from chat_threads')" && echo YES
       test "$(curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.id=="cm") | .solved')" = "$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc "select count(*) from chat_threads where resolution_status = 'solved'")" && echo YES
       test "$(curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -r '.datacenters[] | select(.id=="gc") | .stats[] | select(.[1]=="mechanics") | .[0]')" = "$(docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -Atc 'select count(*) from gameplay_mechanics')" && echo YES

   Expect: six YES -- YES/NO.

7. **Shares sum to ~1 over lit datacenters:**

       curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | jq -e '([.datacenters[] | select(.lit) | .share] | add) as $s | $s > 0.995 and $s < 1.005' && echo YES

   Expect: `true` + `YES` -- YES/NO.

8. **Repo copy == published copy == public URL** (fallback-source integrity):

       cmp /home/dev/projects/quakeworld/apps/qw-oracle/snapshots/brain-manifest.json /mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json && echo IDENTICAL
       curl -s https://oracle.slipgate.me/snapshots/brain-manifest.json | cmp - /mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json && echo IDENTICAL

   Expect: two IDENTICAL -- YES/NO. (`curl` does not cache; if the second cmp
   fails see Recovery: CF cache.)

9. **On-deploy probe -- CF edge does not cache the manifest** (world-facing
   claim deliberately NOT asserted from docs: verified by observation instead):

       curl -sI https://oracle.slipgate.me/snapshots/brain-manifest.json | grep -i cf-cache-status

   Expect: `cf-cache-status: DYNAMIC` (observed on this host's routes at
   drafting time). If HIT/EXPIRED/REVALIDATED appears, Cloudflare is edge-caching
   `.json` on this zone -- record a finding; freshness would then depend on CF's
   TTL, not only nginx's max-age=300.

## Outputs to next phase

Phase 2 may rely on:

- **The contract**: this doc's field shapes + the exported `BrainManifest`
  interface in `apps/qw-oracle/scripts/build-brain-manifest.ts`. Phase 2
  mirrors the types into `apps/oracle-web` (its own subtree; mechanism is
  Phase 2's call -- `TBD-PHASE-2-type-mirroring`), never reshapes them.
- **The live URL**: `https://oracle.slipgate.me/snapshots/brain-manifest.json`,
  CORS `*`, Cache-Control max-age=300, application/json.
- **The baked-fallback source path**: the committed repo copy at
  `apps/qw-oracle/snapshots/brain-manifest.json`, guaranteed byte-identical to
  the published copy at each publish (probe 8).
- **Refresh mechanics**: republish = the harvest-runbook rider's one command;
  no site deploy involved (P3). The MCP-card numbers Phase 3 needs ride as
  raw fields per the 2026-08-06 amendment: thread count = `cm.threads`,
  solved count = `cm.solved`, note count = `cs.num`. Message count stays
  `cm.num`.

## Open questions

1. **`share`: emitter-computed vs site-derived.** Default: emitter computes
   and emits (formula above); reason: the headline-selection is registry
   knowledge and a new datacenter must not require a site redeploy (D4/P3).
   The site also receives `num`, so a future generator wanting raw counts
   loses nothing. Overrule: operator (contract amendment); a Phase 3
   implementer who needs different density inputs routes a finding here.
2. **Concept-note count filter.** Default: `summary is not null and summary <> ''`
   (44 today) -- excludes the `test-qwiki-harvest-probe` breadcrumb row and
   matches the mockup's published 44 (the spec-D5 "45" is the raw table
   count). Overrule: operator -- who may instead prefer deleting the probe row
   from the twin (a DB write outside this phase's grant, and a prod-parity
   question).
3. **`cs.notes` highlight lines: static curated config vs DB-derived.**
   Default: static config in the emitter (the groupings are editorial, contain
   no counts, and drift only when notes are added -- the operator curates the
   lines at that point). Overrule: operator.
4. **`ef` door `href` while docs.quake.world DNS is pending.** Probed
   2026-08-06: `https://docs.quake.world/` does not resolve;
   `https://quakeworld-docs.pages.dev/` returns 200. Default: `code` displays
   `docs.quake.world` (mockup copy), `href` points at
   `https://quakeworld-docs.pages.dev/` until DNS lands (then: one emitter
   constant + re-emit, no site change). Overrule: operator.
5. **Structured `door` object instead of the mockup's HTML string.** Default:
   structured (`kind`-discriminated) -- markup belongs to the site, not a
   cross-origin data file. This is the one deliberate deviation from the DC
   seed's field VALUES (names kept). Overrule: operator; Phase 3 renders the
   two `kind` templates.
6. **CORS `*` vs pinned origins.** Default: `*` (public, read-only,
   credential-less; consumer origin changes across the arc). Overrule:
   operator.

## Recovery

- **`nginx -t` fails after the edit:** the running config is untouched (the
  edit only exists on disk until reload). Revert: `git -C
  /home/dev/projects/quakeworld checkout -- apps/qw-oracle/deploy/nginx.conf`,
  re-apply the same revert by hand to `/mnt/user/appdata/qw-oracle/nginx.conf`
  (keep copies identical), re-run `nginx -t`. Diagnose the line against the
  file's existing `add_header` syntax before retrying.
- **Container does not see the edited conf** (probe in Task 3 step 3 finds no
  match): the single-file bind mount lost its inode to a rename-style edit.
  Restore the file content in place; if the container still shows stale
  content, `docker compose -f /mnt/user/appdata/qw-oracle/docker-compose.prod.yml up -d --force-recreate nginx`
  is NOT the first resort -- prefer `docker restart qw-oracle-nginx` (own
  container, allowed) which re-resolves the bind mount.
- **Public URL serves stale/404 after publish:** wait out the 5-minute
  Cache-Control window first (browser-side; `curl` is unaffected). If `curl`
  still mismatches the appdata file, check probe 9 -- a `cf-cache-status` of
  HIT means CF edge-caching; the dev plane has no CF dashboard, so a purge is
  an operator action (or letterbox). A persistent 404 with the file present
  means the nginx alias dir mount -- verify with
  `docker exec qw-oracle-nginx ls /var/oracle/snapshots/`.
- **Emitter ran against the wrong DB:** the envelope self-reports --
  `jq -r .source` on the emitted file must read `twin` on the cockpit. A
  missing `DATABASE_URL` fails hard (`shared/db.ts` throws); prod is
  unreachable from the cockpit by design, so `prod` appearing in `source` from
  a cockpit emit is itself a finding.
- **Twin outgrows prod between harvests** (published brain > public MCP): the
  rider runs at the ritual's end, after Arc A's prod-ship step; if a mid-cycle
  twin experiment inflates counts, do NOT `--publish` until the twin is
  re-seeded or parity restored -- re-emit from the last committed repo copy is
  not possible (numbers come from the DB), so simply skip publishing and the
  public file stays at its last-good state.
- **History corrupted / shape-confused:** graceful degradation is NOT
  automatic -- it holds only for previous files the Task-1 shape guard
  rejects (unparseable, or failing the `schema_version` +
  `generated_at`-string check), which restart history at `[]`. A guard bug
  that lets a wrong shape through emits invalid entries instead (the
  old-shape file parses as valid JSON -- that is exactly the trap); probe 3's
  history-entry check catches it at the boundary. Remedy: fix the guard,
  re-emit, republish. As a last resort, deleting the committed
  `apps/qw-oracle/snapshots/brain-manifest.json` before an emit resets
  history cleanly; growth trails restart and no other consumer depends on
  history depth.
