# Phase 0 -- prerequisites + loader foundation

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full) and `review-findings.md` (this phase owns F1, F2).
> 2. Read spec sections: "The reframe", D1, D6, "Prerequisites (P1/P2)", M1, M3.
> 3. Read the live source: `load-gameplay.ts`, `index.ts:557-582`, `id1-gameplay.yaml:1-30`. Verified 2026-06-11 -- file shapes below match the tree, not the prompt's claims.
> 4. After drafting, dispatch the verification sub-agent before declaring ready for review.

## Goal

Lay the foundation every later data phase stands on: acquire the original Quake v1.06 QuakeC source tree (so Phase 2 has a citable id1 monster baseline), teach the gameplay loader a `monsters` seed section (so id1 monster rows and the KTX monster overlay can load at all), replace the hardcoded `37/41` count STOP-gate with a self-describing per-seed `expected_counts` gate (finding F2 -- the hardcoded gate would brick every load this arc performs), and ship the two reusable validation probes (citation gate + seed double-load) that Phases 1-4 run at their boundaries (finding F1 -- `idempotency.ts` is extract-tag-scoped and cannot cover seed loads). No data rows are added or changed in this phase; the id1 catalog stays at its live count. **Runnable state at boundary:** the loader accepts all five seed sections (weapons / projectiles / items / monsters / mechanics); the unchanged id1 YAML loads green twice under the reworked gate; `load-knowledge -- citation-gate` and `load-knowledge -- seed-idempotency` run as dispatcher subcommands; `bun test` for the loader is green against `qw_oracle_test`.

## Inputs from previous phase

Phase 0 is first; its inputs are the operator-side items in `prerequisites.md`:

- **Execution gate (hard):** the first Track-A weapon-pair concept notes have shipped (spec M4 / plan D16). Drafting this MD does not wait; execution does.
- Postgres dev container `qw-oracle-postgres-dev` (pgvector/pgvector:pg16) running. Loads target `qw_oracle`; the loader test targets `qw_oracle_test` (same container).
- `apps/qw-oracle/data/pak-cache/` present (the runtime arbiter for Phase 2 fidelity disputes; not exercised in Phase 0 -- confirm-only).

## Files touched

### Created

- `apps/qw-oracle/scripts/load-knowledge/citation-gate.ts` -- reusable citation resolver (every `source_ref` / `*_source_ref` resolves under the D7 two-form rule) + CLI subcommand. Run by every later phase's boundary verification (D13).
- `apps/qw-oracle/scripts/load-knowledge/seed-idempotency.ts` -- reusable seed double-load probe (load twice; identical counts + ordered-row content hash) + CLI subcommand. The seed-namespace analogue of `idempotency.ts`, which is extract-tag-scoped and excludes the `qw` namespace (F1).
- `apps/qw-oracle/scripts/load-knowledge/load-gameplay.test.ts` -- bun integration test against `qw_oracle_test`: the new `monsters` section loads as `kind='monster'` entity rows, and the `expected_counts` gate fires on mismatch. Makes Phase 0 self-verifying instead of waiting for Phase 2 (regime-collision rule).
- `research/repos/<v106-dir>/` -- the acquired Quake v1.06 QuakeC tree (gitignored reading-room; NOT part of this arc's git commit -- see Task 1).

### Modified

- `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts` -- `SeedFile` gains `monsters?` + required `expected_counts`, `mechanics` becomes optional; `LoadGameplayResult` gains `declared`; `ENTITY_KIND_BY_LIST` + the entity loop gain `monsters -> monster`; mechanics loop gains the `?? {}` guard; new exported pure gate `expectedCountsMismatch`.
- `apps/qw-oracle/scripts/load-knowledge/index.ts` -- `runLoadGameplay` drops the hardcoded `37/41` constants for the seed-declared gate (F2); two new dispatcher subcommands + thin wrappers (`citation-gate`, `seed-idempotency`); header + usage text updated.
- `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` -- top-level `expected_counts` block (D8); v1.06 provenance prose APPENDED to `gameplay_source.notes` (not replacing the existing prose -- P1 / D7).

### Deleted

- The hardcoded `const expectedEntities = 37; const expectedMechanics = 41;` block and its inline mismatch check in `index.ts:573-581` -- replaced by the seed-declared gate (F2 / D8). This is a replacement, not a silent removal.

## Tasks

### Task 1 -- Acquire the original Quake v1.06 QuakeC source

- **Goal:** Land the 1996 id1 single-player QuakeC tree in `research/repos/` so Phase 2 can cite monster stats; record provenance durably.
- **Files:** `research/repos/<v106-dir>/` (created, gitignored); `research/repos/README.md` (table row -- gitignored, local-only).
- **Execution mode:** `inline` -- mechanical acquisition + provenance record; criteria fully locked below; no code synthesis. If no candidate cleanly meets the criteria, HALT and surface the candidates to the operator (do not guess a tree).
- **Steps:**
  - [ ] Identify a mirror meeting ALL criteria: (1) the ORIGINAL 1996 QuakeC source release (commonly "v1.06 progs"), NOT the 2021 rerelease QC (rerelease values differ -- spec D1); (2) flat per-monster `.qc` files in the historical progs layout (the rerelease reorganizes the source); (3) contains `soldier.qc`, `demon.qc`, `shambler.qc`, `ogre.qc` and peers (`knight.qc`, `dog.qc`, `zombie.qc`, `wizard.qc`, `hknight.qc`, `fish.qc`, `enforcer.qc`, `tarbaby.qc`, `boss.qc`/`oldone.qc`). Note: `research/repos/qwcl-original/` is id-Software/Quake but its `QW/progs/` has the QW gamecode with single-player stripped (spec D1) -- it is NOT the monster source; a separate tree is required.
  - [ ] `git clone --depth 1 <url> research/repos/<v106-dir>` (shallow; reading-room convention).
  - [ ] Record the chosen mirror URL, the cloned commit SHA (`git -C research/repos/<v106-dir> rev-parse HEAD`), and the acquisition date. These three tokens fill the provenance prose in Task 2.
  - [ ] Spot-verify the release is correct: `grep -n "health = 600" research/repos/<v106-dir>/shambler.qc` and `grep -n "health = 200" research/repos/<v106-dir>/ogre.qc` (spec D1 values). Both must hit. If either misses, this is the wrong tree -- discard and try another candidate.
  - [ ] Add a row to `research/repos/README.md` per its "Adding a new repo" convention (directory, upstream URL, one-line purpose naming this arc's Phase 2 monster task).
- **Verification:** both spot-verify greps return a line; the tree contains the named monster `.qc` files (`ls research/repos/<v106-dir>/*.qc`). PASS condition: shambler 600 + ogre 200 both present. FAIL condition: either absent -> wrong release, re-acquire.

### Task 2 -- id1-gameplay.yaml: expected_counts block + v1.06 provenance append

- **Goal:** Give the seed a self-declared count gate and record the v1.06 provenance on the id1 source row.
- **Files:** `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`.
- **Execution mode:** `inline` -- the YAML assembler is always inline (D5/D19); content fully locked below (provenance tokens come from Task 1).
- **Steps:**
  - [ ] Append the v1.06 provenance paragraph to the existing `gameplay_source.notes` folded scalar (do NOT replace the engine-constants prose -- P1). The block below ALREADY re-includes the original engine-constants paragraph, so applying it as an Edit (old `notes` value -> this block) IS the append; the net result must keep BOTH paragraphs. Fill `<DIR>/<URL>/<SHA>/<DATE>` from Task 1:

    ```yaml
      notes: >
        Engine-side constants (sv_maxspeed=320, friction=4, accelerate=10,
        stopspeed=100, edgefriction=2) live in the cvars table once each engine's
        extraction picks them up; not loaded into gameplay_mechanics.

        Monster stat rows (kind=monster) cite the original Quake v1.06 QuakeC
        source release, acquired at /research/repos/<DIR>/ (mirror <URL>,
        commit <SHA>, acquired <DATE>). The 1.06 release is the competitive-QW
        monster baseline; the 2021 rerelease QC differs and is NOT used.
        Spot-verified at acquisition: shambler.qc health=600, ogre.qc
        health=200 (spec D1). Monster refs use the leading-slash citation form
        (plan D7); the id1 source_root below stays QW/progs/ unchanged.
    ```
  - [ ] Insert the count gate block as a NEW top-level key, after the `gameplay_source:` block and before `# Cluster 1: weapons`:

    ```yaml
    # Count STOP-gate (plan D8, finding F2): the loader validates each load
    # against these self-declared totals and STOPs on mismatch. Bump them IN
    # THE SAME COMMIT that adds or removes rows -- the load failing on a stale
    # count is the intended tripwire, not a bug. Values are the LIVE row counts
    # of this file at load time. 37/41 was the 2026-04-27 baseline; Track-A
    # backfills (D16) may have raised them since -- recount, do not assume.
    expected_counts:
      entities: 37
      mechanics: 41
    ```
  - [ ] RECOUNT before trusting 37/41 (D16): count entity rows (every `- name:` under `weapons` + `projectiles` + `items` + `monsters`) and mechanic rows (every `- name:` across all eight `mechanics` sublists) in the CURRENT file. Set `entities`/`mechanics` to those live counts. At drafting the baseline is 37/41; if a Track-A backfill added cited rows, the live count is higher and that higher number is correct.
- **Verification:** `bun run load-knowledge -- load-gameplay` (defaults to id1-gameplay.yaml, dev DB) reports `total entities=<N> mechanics=<M>` with no STOP line, where N/M equal the `expected_counts` you wrote. ORDERING: run this check AFTER Task 3 lands -- until then the OLD hardcoded 37/41 gate is live, and if Track-A backfills raised the counts it STOPs spuriously (the check belongs to the new gate, not the old one). PASS: clean load, exit 0. FAIL: a STOP line -> the declared count does not match the file; recount.

### Task 3 -- Loader extension (`monsters`) + count STOP-gate rework

- **Goal:** Add the `monsters` seed section and replace the hardcoded count gate with the seed-declared one.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts`, `apps/qw-oracle/scripts/load-knowledge/index.ts` (runLoadGameplay region only; dispatcher wiring is Task 6).
- **Execution mode:** `inline` -- fully-locked TS diffs; deterministic edits to known code (D19).
- **Steps:**
  - [ ] **load-gameplay.ts, `SeedFile`** -- add `monsters?` after `items` and required `expected_counts` after `mechanics`:

    ```ts
    export interface SeedFile {
      gameplay_source: GameplaySourceRow;
      weapons: EntityDefRow[];
      projectiles: EntityDefRow[];
      items: EntityDefRow[];
      // id1 monster stat rows (Phase 2) + ktx monster overlay (Phase 3). Loaded
      // into gameplay_entity_defs as kind='monster' (CHECK added by migration
      // 011). Optional: the id1 baseline carried no monster rows pre-arc.
      monsters?: EntityDefRow[];
      // Optional since the Phase 3 ktx overlay may be entity-only. The loader
      // tolerates absence (?? {} guard below) -- entity lists already do via
      // ?? []; mechanics throwing on absence was an inconsistency, not a gate
      // (planner amendment 2026-06-11; was Open question 1).
      mechanics?: {
        constants: MechanicRow[];
        env_hazards: MechanicRow[];
        player_stats: MechanicRow[];
        powerup_behaviors: MechanicRow[];
        armor_models: MechanicRow[];
        death_rules: MechanicRow[];
        spawn_rules: MechanicRow[];
        dm_mode_rules: MechanicRow[];
      };
      // Count STOP-gate (plan D8 / finding F2): every seed declares its own
      // load totals; the loader echoes them and the CLI/test STOP on mismatch.
      // The gate travels with the data so each phase bumps counts beside rows.
      expected_counts: { entities: number; mechanics: number };
    }
    ```
  - [ ] **load-gameplay.ts, `LoadGameplayResult`** -- add `declared`:

    ```ts
    export interface LoadGameplayResult {
      inserted: { entities: number; mechanics: number };
      updated: { entities: number; mechanics: number };
      total: { entities: number; mechanics: number };
      // Echoed from seed.expected_counts so the CLI / test can run the D8 gate
      // without re-parsing the YAML.
      declared: { entities: number; mechanics: number };
    }
    ```
  - [ ] **load-gameplay.ts, `ENTITY_KIND_BY_LIST`** -- widen the type and add `monsters`:

    ```ts
    const ENTITY_KIND_BY_LIST: Record<'weapons' | 'projectiles' | 'items' | 'monsters', 'item' | 'weapon' | 'projectile' | 'monster'> = {
      weapons: 'weapon',
      projectiles: 'projectile',
      items: 'item',
      monsters: 'monster',
    };
    ```
  - [ ] **load-gameplay.ts, top of `loadGameplayFromArray`** -- guard + `declared` init. Replace the current `const result: LoadGameplayResult = { ... };` initializer with:

    ```ts
    export async function loadGameplayFromArray(sql: postgres.Sql, seed: SeedFile): Promise<LoadGameplayResult> {
      // D8: a seed with no declared count has no STOP-gate. Refuse rather than
      // load blind -- a missing/garbled block is almost always an editing slip.
      if (!seed.expected_counts ||
          typeof seed.expected_counts.entities !== 'number' ||
          typeof seed.expected_counts.mechanics !== 'number') {
        throw new Error('load-gameplay: seed is missing a valid expected_counts {entities, mechanics} block (plan D8).');
      }
      const result: LoadGameplayResult = {
        inserted: { entities: 0, mechanics: 0 },
        updated: { entities: 0, mechanics: 0 },
        total: { entities: 0, mechanics: 0 },
        declared: { entities: seed.expected_counts.entities, mechanics: seed.expected_counts.mechanics },
      };
    ```
  - [ ] **load-gameplay.ts, entity loop** -- add `'monsters'` to the iterated list (the existing `seed[listName] ?? []` already tolerates the absent list):

    ```ts
    for (const listName of ['weapons', 'projectiles', 'items', 'monsters'] as const) {
    ```
  - [ ] **load-gameplay.ts, mechanics loop** -- tolerate an absent `mechanics` key (entity-only seeds, e.g. a Phase 3 ktx overlay with no mechanic deltas). One-line change to the `rows` lookup inside the mechanics `for` loop:

    ```ts
        const rows = ((seed.mechanics ?? {}) as Record<string, MechanicRow[]>)[listName] ?? [];
    ```
  - [ ] **load-gameplay.ts** -- add the pure gate, immediately after `loadGameplayFromFile`:

    ```ts
    /**
     * D8 count STOP-gate. Pure predicate so the CLI (process.exitCode) and the
     * bun test (expect) share one rule. Returns a human-readable message when the
     * loaded totals diverge from the seed's self-declared expected_counts, else
     * null (errors-out-of-existence: null means "no mismatch, proceed").
     */
    export function expectedCountsMismatch(result: LoadGameplayResult): string | null {
      const { total, declared } = result;
      if (total.entities !== declared.entities || total.mechanics !== declared.mechanics) {
        return `row-count mismatch. Expected entities=${declared.entities} mechanics=${declared.mechanics}. ` +
          `Got entities=${total.entities} mechanics=${total.mechanics}. Investigate the YAML before re-running.`;
      }
      return null;
    }
    ```
  - [ ] **index.ts, `runLoadGameplay`** -- replace the import line + the hardcoded gate (lines ~566-581) with the seed-declared gate. The friendly count line stays; the `37/41` constants and their inline check are deleted:

    ```ts
      const yamlPath = values.yaml ?? join(__dirname, '..', 'extractors', 'qw', 'seeds', 'id1-gameplay.yaml');
      const { loadGameplayFromFile, expectedCountsMismatch } = await import('./load-gameplay.js');
      const r = await loadGameplayFromFile(sql, yamlPath);
      console.log(
        `load-gameplay: entities inserted=${r.inserted.entities} updated=${r.updated.entities} total=${r.total.entities}; ` +
        `mechanics inserted=${r.inserted.mechanics} updated=${r.updated.mechanics} total=${r.total.mechanics}`,
      );

      // D8 (finding F2): validate against the seed's OWN declared counts. The
      // old hardcoded 37/41 would brick every load this arc performs and would
      // mis-validate ktx-gameplay.yaml against id1 numbers.
      const mismatch = expectedCountsMismatch(r);
      if (mismatch) {
        console.error(`load-gameplay: STOP - ${mismatch}`);
        process.exitCode = 1;
      }
    ```
- **Verification:** `bun run typecheck` (in `apps/qw-oracle`) exits 0. PASS: no tsc errors. FAIL: any tsc error names the file/line to fix.

### Task 4 -- citation-gate.ts probe

- **Goal:** A reusable probe that resolves every gameplay `source_ref` / `*_source_ref` under the D7 two-form rule and reports unresolved refs.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/citation-gate.ts` (created).
- **Execution mode:** `subagent (Sonnet medium)` -- genuine code synthesis (DB read, path resolution, file/line checks); the contract below is fully specified so the subagent fills mechanism, not design.
- **Contract (lock this; the subagent implements to it):**
  - Exports `checkCitations(sql: postgres.Sql, opts?: { source?: string }): Promise<{ scanned: number; unresolved: { gameplay_source_id: string; kind: string; name: string; ref: string; reason: string }[] }>` (reusable core, injectable sql) AND `runCitationGateCli(args: string[]): Promise<void>` (thin CLI; imports `sql` from `./db.js`; parses `--source <id1|ktx>` / `--json` / `--help`; prints a summary; `process.exitCode = 1` when `unresolved.length > 0`). Mirror the `idempotency.ts` CLI conventions (env-var DATABASE_URL, exit 0 PASS / non-zero FAIL). Include an `import.meta.main` guard so the file is runnable standalone for self-verification.
  - **Scan:** all rows of `gameplay_entity_defs` and `gameplay_mechanics` (optionally filtered to one `gameplay_source_id` via `--source`). Per row collect candidate refs = the `source_ref` column + every LEAF STRING anywhere in `props_json` (walk nested objects/arrays recursively) that matches the ref shape below. Collection is shape-gated, NOT key-gated: the live YAML carries citations under keys the `/_source_ref$/` convention misses (`refire_source_ref_player_frames` array at id1-gameplay.yaml:99, `squish_assigners` + `damage_sites` arrays, `teledeath_obit_source_refs` + `sources` maps -- planner amendment 2026-06-11; D13 promises EVERY citation resolves). `props_json` is JSONB -> read the decoded JS object; never stringify (D12).
  - **Ref shape:** a leaf string matching `/^[^:\s]+\.(qc|c|h):\d+(-\d+)?$/` (`<path>.<ext>:<line>` or `:<lineStart>-<lineEnd>`). path = everything before the last `:`; line = the number after (use the upper bound for a range). The extension anchor keeps prose props (`cap_rule`, `mechanic`, ...) out of the candidate set. Additionally, key-gated malformedness: a value under a key matching `/_source_refs?$/` that is a string NOT matching the ref shape is `unresolved` with reason `malformed` -- do not silently skip a botched citation. Non-ref strings under other keys are simply not citations (no flag).
  - **Two-form resolution (D7):** load `SELECT id, source_root FROM gameplay_sources` into a map. For each ref: if the ref path starts with `/`, resolve `join(monorepoRoot, refPath.slice(1))` (repo-root-relative, source_root ignored). Otherwise resolve `join(monorepoRoot, sourceRoot.replace(/^\//, ''), refPath)` (source_root-relative; strip a leading `/` from source_root too -- this legalizes ktx's `/research/repos/ktx/src` and id1's `research/repos/qwcl-original/QW/progs/` alike).
  - **monorepoRoot:** four levels up from the module dir (`apps/qw-oracle/scripts/load-knowledge` -> repo root). Compute via `join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')`; self-verify by confirming a known id1 ref resolves (see below).
  - **Checks:** `reason='missing'` if the resolved file does not exist; `reason='line out of range'` if the line number exceeds the file's line count; otherwise resolved.
- **Steps:**
  - [ ] Implement to the contract.
  - [ ] Self-verify: `cd apps/qw-oracle && bun run typecheck` clean; then `bun scripts/load-knowledge/citation-gate.ts` against the dev DB and confirm `unresolved.length === 0` on the current baseline (the ~400 id1 refs resolve under `research/repos/qwcl-original/QW/progs/`; ktx refs resolve under `research/repos/ktx/src`). Report the `scanned` total. If any baseline ref is unresolved, STOP and report it (it is a real data finding, not a probe bug -- record it for the executor to escalate).
- **Verification:** `bun scripts/load-knowledge/citation-gate.ts` exits 0 with `unresolved=0`. PASS: 0 unresolved across the live baseline. FAIL: any unresolved ref (the list IS the work queue).

### Task 5 -- seed-idempotency.ts probe

- **Goal:** A reusable probe that loads a seed YAML twice and asserts identical counts + identical ordered-row content hash (the seed-namespace analogue of `idempotency.ts`, which excludes the `qw` namespace -- F1).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/seed-idempotency.ts` (created).
- **Execution mode:** `subagent (Sonnet medium)` -- genuine synthesis (load orchestration, deterministic row dump, hashing); contract below is fully specified.
- **Contract (lock this):**
  - Exports `checkSeedIdempotency(sql: postgres.Sql, yamlPath: string): Promise<{ pass: boolean; first: { entities: number; mechanics: number }; second: { entities: number; mechanics: number }; hashFirst: string; hashSecond: string }>` (reusable core, injectable sql) AND `runSeedIdempotencyCli(args: string[]): Promise<void>` (thin CLI; `sql` from `./db.js`; parses `--yaml <path>` (required) / `--json` / `--help`; `process.exitCode = 1` when `pass === false`). Mirror `idempotency.ts` conventions; include an `import.meta.main` guard.
  - **Algorithm:** read the seed's `gameplay_source.id` from the YAML. Load via `loadGameplayFromFile` (capture `total`). Dump an ordered snapshot of that source's rows; hash it (sha256 via `node:crypto`). Load again (capture `total`); re-dump; re-hash. `pass = (first.entities===second.entities && first.mechanics===second.mechanics && hashFirst===hashSecond)`.
  - **Ordered dump:** `SELECT` from `gameplay_entity_defs` then `gameplay_mechanics` WHERE `gameplay_source_id = <seed id>`, including the persistent columns (entity: kind, name, classname, damage, splash_damage, splash_radius, refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds, ruleset_gate_json, source_ref, props_json, notes; mechanic: kind, name, value_numeric, value_text, ruleset_gate_json, source_ref, props_json, notes), `ORDER BY kind, name, ruleset_gate_json::text`. Serialize each row deterministically (e.g. `JSON.stringify` with sorted keys, or rely on the fixed SELECT column order) before hashing. Verify the column list against the live tables before locking.
  - The probe loads into whatever DB `sql` targets; as a CLI it loads into the dev DB, which is idempotent and already holds id1 -- acceptable.
- **Steps:**
  - [ ] Implement to the contract.
  - [ ] Self-verify: `bun run typecheck` clean; then `bun scripts/load-knowledge/seed-idempotency.ts --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml` against the dev DB -> `pass=true`, counts equal across both loads.
- **Verification:** the probe exits 0 with `pass=true` on the unchanged id1 seed. PASS: identical counts + identical hash. FAIL: any divergence (suspect a re-run idempotency bug before staleness -- `feedback_idempotency_before_staleness`).

### Task 6 -- Wire both probes into the dispatcher

- **Goal:** Expose the probes as `load-knowledge` subcommands.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/index.ts`.
- **Execution mode:** `inline` -- mechanical wiring, fully-locked content (D19). Runs AFTER Tasks 4 + 5 so the dynamic-import targets exist and tsc stays green.
- **Steps:**
  - [ ] Add two dispatcher lines after the `migration-probes` line (index.ts:47):

    ```ts
      if (subcommand === 'citation-gate')             { await runCitationGateCli(rest); return; }
      if (subcommand === 'seed-idempotency')          { await runSeedIdempotencyCli(rest); return; }
    ```
  - [ ] Add two thin wrappers next to `runIdempotencyCli` (mirror its shape exactly):

    ```ts
    async function runCitationGateCli(args: string[]): Promise<void> {
      const { runCitationGateCli: run } = await import('./citation-gate.js');
      await run(args);
    }

    async function runSeedIdempotencyCli(args: string[]): Promise<void> {
      const { runSeedIdempotencyCli: run } = await import('./seed-idempotency.js');
      await run(args);
    }
    ```
  - [ ] Extend the subcommand list in the header comment (it sits on index.ts:7) with `citation-gate, seed-idempotency`, and add to the `usageAndExit` block:

    ```
      citation-gate    [--source <id1|ktx>] [--json]
      seed-idempotency --yaml <path> [--json]
    ```
- **Verification:** `bun run typecheck` clean; `bun run load-knowledge -- citation-gate` and `bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml` both dispatch (no "unknown subcommand"). PASS: both run and exit 0. FAIL: usage printed -> the dispatcher line is wrong.

### Task 7 -- bun test: monsters section + expected_counts gate

- **Goal:** Self-contained integration test proving the `monsters` section loads as `kind='monster'` and the `expected_counts` gate works -- so Phase 0 verifies without Phase 2's data.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/load-gameplay.test.ts` (created).
- **Execution mode:** `subagent (Sonnet medium)` -- test authoring against a live DB; contract below locks the shape (the loader API it exercises is locked by Task 3).
- **Contract (lock this; pattern copied from `load-maps.test.ts` + `quality-grid.test.ts`):**
  - Header: `import { describe, it, expect, beforeEach, afterAll } from 'bun:test';` + `import postgres from 'postgres';` + `import { runMigrations } from '../../db/migrate.js';` + `import { loadGameplayFromArray, expectedCountsMismatch, type SeedFile } from './load-gameplay.js';`.
  - Read `DATABASE_URL`; throw if unset; **refuse to run unless the URL includes `qw_oracle_test`** (copy the guard verbatim from `load-maps.test.ts:10-17`). `const sql = postgres(url, { onnotice: () => {} });`.
  - `beforeEach`: `await runMigrations(sql);` then `await sql\`TRUNCATE gameplay_sources, gameplay_entity_defs, gameplay_mechanics RESTART IDENTITY CASCADE\`;` (verified against migration 002: `gameplay_entity_defs` and `gameplay_mechanics` both FK into `gameplay_sources`, so CASCADE over this set is correct. NOTE: `load-maps.test.ts` truncates only `maps` -- copy its `qw_oracle_test` GUARD verbatim, NOT its single-table TRUNCATE). `afterAll`: `await sql.end();`.
  - **Fixture:** a `SeedFile` literal with `gameplay_source.id='testsrc'`, a `monsters` list of two rows (e.g. `shambler` with `props: { health: 600, health_source_ref: '/research/repos/x/shambler.qc:1' }`, `ogre` health 200), one `weapons` row, empty `projectiles`/`items`, a `mechanics` block with all eight sublists (one row in one of them, rest `[]`), and `expected_counts` matching the fixture's true totals.
  - **Assertions:** (1) `loadGameplayFromArray(sql, fixture)` resolves; a `SELECT kind, name FROM gameplay_entity_defs WHERE gameplay_source_id='testsrc' AND kind='monster'` returns both monsters with health in `props_json`. (2) `expectedCountsMismatch(result)` returns `null` for the matching fixture. (3) a fixture variant with deliberately-wrong `expected_counts` makes `expectedCountsMismatch(result)` return a non-null message (and `loadGameplayFromArray` with a MISSING `expected_counts` throws -- optional extra). (4) double-load: loading the fixture twice yields equal `total` (idempotency). (5) a fixture variant with NO `mechanics` key (entity-only, `expected_counts.mechanics: 0`) loads cleanly with `total.mechanics === 0` -- proves the `?? {}` guard (Task 3).
  - ASCII only; comments explain WHY (D18).
- **Steps:**
  - [ ] Implement to the contract.
  - [ ] Self-verify: `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test scripts/load-knowledge/load-gameplay.test.ts` -> all green.
- **Verification:** the test file passes. PASS: all `it` blocks green. FAIL: the failing assertion names the gap.

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each ends with PASS/FAIL.

1. **Typecheck.** `bun run typecheck`
   PASS: exit 0, no errors. FAIL: any tsc error.
2. **Loader test (qw_oracle_test).** `bun run test` (sets `DATABASE_URL` to `qw_oracle_test`), or targeted: `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test bun test scripts/load-knowledge/load-gameplay.test.ts`
   PASS: all tests green (monsters load as `kind='monster'`; gate fires on mismatch). FAIL: any red test.
3. **Unchanged id1 loads green under the new gate (dev DB).** `bun run load-knowledge -- load-gameplay`
   PASS: reports `total entities=<N> mechanics=<M>` equal to the `expected_counts` you wrote in Task 2, NO `STOP` line, exit 0. FAIL: a `STOP` line -> declared count != live file count (recount per D16).
4. **Seed double-load idempotent (dev DB).** `bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml`
   PASS: `pass=true`, identical counts + hash across both loads. FAIL: any divergence (suspect idempotency before staleness).
5. **Citation gate green on the current baseline (dev DB).** `bun run load-knowledge -- citation-gate`
   PASS: `unresolved=0` (reports ~400+ refs scanned across id1 + ktx). FAIL: any unresolved ref -> escalate as a finding (not Phase 0's edit, but report it).
6. **v1.06 tree acquired + spot-verified.** `grep -n "health = 600" research/repos/<v106-dir>/shambler.qc` and `grep -n "health = 200" research/repos/<v106-dir>/ogre.qc`
   PASS: both return a line. FAIL: wrong release -> re-acquire (Task 1).
7. **Git scope (D17).** `git add` names ONLY: `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts`, `index.ts`, `citation-gate.ts`, `seed-idempotency.ts`, `load-gameplay.test.ts`, and `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`. `research/repos/` is gitignored -> never staged. `git diff --cached --stat` shows exactly those six paths. PASS: only arc files staged. FAIL: any sibling-arc or `-A` staging.

## Outputs to next phase

- The loader accepts a `monsters` seed section (`kind='monster'`), so Phase 2 can load id1 monster rows and Phase 3 the ktx monster overlay.
- The count STOP-gate is per-seed (`expected_counts`); every later phase bumps its file's block in the same commit as the row change (D8 tripwire).
- `load-knowledge -- citation-gate` and `load-knowledge -- seed-idempotency` exist as subcommands; Phases 1-4 call them at their boundaries (D13).
- `loadGameplayFromArray` + `expectedCountsMismatch` are unit-tested against `qw_oracle_test`; the test-DB harness pattern is established for later phases.
- The Quake v1.06 QuakeC tree is in `research/repos/<v106-dir>/` with provenance recorded on id1's `gameplay_source.notes`; Phase 2 cites it via the leading-slash form (D7).

## Open questions / deferred items

- **Q: ktx-gameplay.yaml may omit the `mechanics:` key entirely (entity-only overlay).** RESOLVED in this phase (planner amendment 2026-06-11): Task 3 now ships the `seed.mechanics ?? {}` guard and `SeedFile.mechanics` is optional; Task 7 assertion (5) proves it. Phase 3 no longer carries a tripwire. (Original deferral kept for the audit trail: the pre-amendment draft left the loader throwing on absent `mechanics` and pushed an empty-block convention onto Phase 3 -- defining the error out of existence in the region Task 3 already edits was cheaper.)
- **Q: which v1.06 mirror.** Locked by criteria (Task 1), not by URL (mirrors rot; cannot verify a live URL at drafting). **Default:** the executor picks the first candidate meeting all criteria and passing the spot-verify greps; if none cleanly match, HALT to operator. **Who can resolve:** executor, else operator.
- **Q: `expected_counts` made REQUIRED (loader throws if absent).** Stricter than D8's literal "carries a block" -- the throw is the intended tripwire against a seed that forgets it. Not a deviation (D8 says every seed carries it). All seeds this arc touches will declare it. **Who can resolve:** n/a (rationale noted; flag only if a verifier reads it as a conflict -- decisions win).
- **Q: citation gate scans all sources, not just id1.** Chosen so Phases 3-4 reuse it unchanged; PASS = 0 unresolved regardless of source. If a live ktx ref is unresolved on the baseline, that surfaces as a finding at execution (report, do not silently scope it out). **Who can resolve:** executor reports; operator/Phase 3 if it is a real ktx data bug.

## Recovery (if verification fails)

- **tsc fails:** the error names the file/line; the diffs in Task 3/6 are exact -- re-check the edit against the block shown.
- **load-gameplay STOPs at the boundary:** the live id1-gameplay.yaml row count != `expected_counts`. Most likely a Track-A backfill added cited rows since drafting (D16) -- recount the file and set `expected_counts` to the live numbers (do not force-pass). If counts look right but it still STOPs, suspect a double-load / re-run idempotency bug before staleness (`feedback_idempotency_before_staleness`).
- **citation gate reports unresolved refs:** the unresolved list is the work queue. A baseline (id1/ktx) ref that does not resolve is a real data finding -- record it with the row + ref, surface to the operator; it is NOT introduced by Phase 0's edits.
- **bun test red:** check the test DB is reachable and migrated (`runMigrations` in `beforeEach` applies migration 011's `monster` CHECK); check the `qw_oracle_test` guard did not abort; the failing assertion names the gap.
- **v1.06 spot-verify miss:** wrong release (likely the 2021 rerelease or a partial tree). Discard `research/repos/<v106-dir>/` and re-acquire from another candidate meeting the Task 1 criteria.
- **Unanticipated failure:** route to operator with the command, the output, and the task it blocks.
