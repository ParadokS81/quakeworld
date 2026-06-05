# Phase 3 -- describe-fill (QWFWD + QTV)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). DONE.
> 2. Read `review-findings.md`; identify which findings apply: D6 guard is the load-bearing item for Phase 3; no F-finding owns this phase. DONE.
> 3. Run live recon (Read/grep) on all real source files this phase touches. DONE. See verification sub-agent note in Open questions.
> 4. After drafting, dispatch the verification sub-agent. DONE -- `Agent` tool unavailable in this session; verification performed directly by the drafter. See Open questions for findings.

---

## Preamble -- operator review targets

The two operator review targets for this phase are written here, before the template sections, so they can be read and verified without navigating the full task list.

---

### D6 guard -- how it is made load-bearing

**The operator is reviewing this phase specifically for whether the D6 C-vs-Go QTV guard is load-bearing -- enforced, not merely cited.** This section names the four mechanisms that make it structural rather than advisory, and the apply-mechanism section resolves the integration question from source. Both are written first so the operator can verify the full picture before reading the tasks.

### Mechanism 1 -- Seed exclusion (what the workers MAY read)

The ONLY valid describe seeds for QTV knobs are:

1. `apps/slipgate-app/reference/qtv/resources/qtv.cfg` -- the vendored Go QTV annotated config (133 lines, the Go target's own documentation).
2. The Phase-2 L1 rows in Postgres for `project='qtv'` -- 41 cvars + 12 commands, all sourced from `qvs.Reg`/`qvs.RegEx`/`qvs.Regf`/`cmd.Register` call-sites in the Go source tree.
3. `apps/slipgate-app/reference/qtv/pkg/` -- the Go source tree (the register-site and read use-site oracle).

The nQuake C-QTV config is **explicitly NOT a seed**. It is not fetched, not read, not folded in for any QTV knob. The mother ledger names it as a forbidden source (see Task 1 standing rules). Workers receive no path to it.

The QWFWD seeds are: `apps/slipgate-app/reference/qwfwd/resources/example-configs/qwfwd.cfg` (verified to exist) and the Phase-1 L1 rows for `project='qwfwd'` plus the QWFWD source tree at `apps/slipgate-app/reference/qwfwd/src/`.

### Mechanism 2 -- Per-QTV-knob reject-list (what workers must catch)

Every QTV describe worker brief carries this hard check verbatim:

> **D6 REJECT-LIST (QTV workers only):** if a candidate description is seeded from or mentions any of the following C-only knobs -- `mvdport`, `admin_password`, `floodprot`, `allow_http` -- or any knob NAME absent from the Phase-2 Go L1 row set (41 cvars + 12 commands), REJECT the description and re-source it from the Go register-site.
>
> Go equivalents for orientation (do NOT invent C-knob descriptions; use these Go knobs instead):
> - `mvdport` -> `listen_address` (Go: `http.go`, `qVarFlagInitOnly`)
> - `admin_password` -> `qtv_password` (Go: `downstream_storage.go`)
> - `floodprot` (C command) -> `fp_time`, `fp_limit`, `fp_message` (Go triplet in `downstream_storage.go`)
> - `allow_http` (C) -> `http_enabled`, `http_address` (Go: `http.go`)
>
> These C knobs exist ONLY in `fteqtv/` (D13 scope fence). Presence in a community config does not make them Go QTV knobs.

The reject-list is quoted word-for-word in every QTV batch brief. It is not paraphrased and not left to worker judgment.

### Mechanism 3 -- Mother-ledger standing rule

The D6 guard lives in the mother ledger (Task 1) as a standing rule in its own named section ("D6 GUARD -- C-vs-Go QTV trap"). Every batch brief begins: "Read the mother ledger warm before processing your batch." The guard section is never removed, never collapsed. It is durable: the mother ledger is committed append-only, so the rule survives terminal restarts.

### Mechanism 4 -- Verification probe (phase boundary, YES/NO)

V6 (phase-boundary probe) asserts:

```sql
-- D6 probe: no QTV description references a C-only knob by name.
-- Pass: 0 rows. Each grep target is one of the four C-only knob names.
SELECT canonical_id, description
FROM entities
WHERE project = 'qtv'
  AND (
    description ILIKE '%mvdport%'
    OR description ILIKE '%admin_password%'
    OR description ILIKE '%floodprot%'
    OR description ILIKE '%allow_http%'
  );
```

PASS condition: 0 rows.

```sql
-- D6 probe: every described QTV knob maps to a Go register-site.
-- Covers both cvars (cvar_versions) and commands (command_versions).
-- Pass: 0 rows for each query.
-- Cvars: source_file must be under pkg/
SELECT e.canonical_id, e.description_origin, cv.source_file
FROM entities e
LEFT JOIN cvar_versions cv ON cv.entity_id = e.id
WHERE e.project = 'qtv' AND e.type = 'cvar'
  AND e.description IS NOT NULL
  AND (cv.source_file IS NULL OR cv.source_file NOT LIKE 'pkg/%');
-- Commands: source_file must be under pkg/
SELECT e.canonical_id, e.description_origin, cmv.source_file
FROM entities e
LEFT JOIN command_versions cmv ON cmv.entity_id = e.id
WHERE e.project = 'qtv' AND e.type = 'command'
  AND e.description IS NOT NULL
  AND (cmv.source_file IS NULL OR cmv.source_file NOT LIKE 'pkg/%');
```

PASS condition: 0 rows from both queries. All described QTV entities (cvar and command) have a `source_file` under `pkg/`, confirming the Go register-site is the anchor.

Both probes are YES/NO, Postgres-only (D12), self-contained (no dependency on Phase 4, D11).

---

### Apply mechanism -- how a synthesized description reaches L1

**This is the phase's central integration question resolved from source (the way Phase 1 resolved the load path).**

### The sibling arc's machinery

The sibling arc (`2026-05-16-ktx-mvdsv-l1-describe-fill`) uses two project-scoped persist scripts:

- `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts` -- hardcoded to `project='ktx'` in 10+ places (fingerprint query, status query, applyRecords fallback default, all SQL WHERE clauses).
- `apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts` -- hardcoded to `project='mvdsv'` in 5 logic/SQL occurrences (line 119 `computeFingerprint` WHERE, 279 `applyRecords` fallback default, 368 status banner, 397 `fingerprintCmd` banner, 412 `statusReport` WHERE). Task 2's "substitute all occurrences of `'mvdsv'`" instruction is the governing rule and catches every site regardless of this enumeration.

Neither script is project-agnostic as-is. The MVDSV script was deliberately built as "the mirror of synthesize-ktx.ts's persistence half" (file header comment, line 35-37) with MVDSV hardcoded throughout.

### The owned-row guard (F-D4a)

The guard lives in TWO places and both are already project-agnostic:

1. **`apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts`** -- the `UPDATE entities ... WHERE entities.description_origin IS DISTINCT FROM 'synthesized' AND entities.description_origin IS DISTINCT FROM 'shipped_doc'` clause in all four per-type derivers (lines 150-151, 179-180, 216-217, 245-246, 387-388). This fires on every `load-version` re-run and protects ALL projects, including `qtv` and `qwfwd`, because the guard is a WHERE predicate on the `entities` table with no project filter. A re-load of `qtv` or `qwfwd` after the describe pass will NOT clobber `description_origin='synthesized'` rows. **This guard requires NO changes for this arc.**

2. **`synthesize-mvdsv.ts` `isTerminalOwned()` + `applyRecords()`** -- the `F-D9b clobber-guard` in the persist script itself (lines 133-138, 305-316). This guards the write path from re-running the same persist twice or from a sibling batch overwriting. It is project-aware only via `rec.project ?? 'mvdsv'` -- it respects whatever project the D6Record carries.

### The per-project apply script decision

**Decision: create `synthesize-qtv.ts` and `synthesize-qwfwd.ts` as project-scoped variants**, mirroring `synthesize-mvdsv.ts` with `project='mvdsv'` -> `project='qtv'` / `project='qwfwd'` substituted, and with `IN_SCOPE_TYPES` narrowed appropriately:

- QTV: `['cvar', 'command']` (0 cmdline_param, 0 info_key -- Phase 2 confirmed)
- QWFWD: `['cvar', 'command', 'cmdline_param', 'info_key']` (all four types -- Phase 1 loaded them)

**Why not a generic project-parameterized script:** the MVDSV and KTX scripts exist as project-scoped files and the pattern is established. A parameterized wrapper would need operator buy-in as a refactor (not this arc's scope). The mechanical substitution is 5 lines of change per script; it is the lower-complexity path (Grug principle: complexity is the apex predator).

**Why not reuse `apply-l1-from-ledgers.py`:** that script is regex-scoped to `ktx:` canonical IDs (line 60: `r"^### (ktx:[^\s]+?)(\s*\(HALT\))?\s*$"`) and emits SQL TEXT, which cannot bind JSONB via `tx.json()` (P2 / `F1.jsonb_columns_not_strings`). Not viable without substantial rework.

### The D6Record shape and description_origin token

The `D6Record` interface in `synthesize-mvdsv.ts` (lines 73-87) is the per-knob record contract. `description_origin` carries the exact string token `'synthesized'` (verified: `012_description_origin.sql` line 15; `derive-entity-description.ts` line 46; `quality-grid.ts` `probeDescribeFillOriginVocabulary` line 1019 -- the allowed vocabulary is `{'help_json', 'source_inline', 'inherited', 'synthesized'}`; the probe fails on any out-of-vocabulary value). A NEW origin token would break the `origin_vocabulary` probe. **Use `'synthesized'` verbatim -- no new token.**

The `origin_vocabulary` probe (part i, global guard) already covers `qtv` and `qwfwd` rows because it has no project filter. New rows with `description_origin='synthesized'` on `project='qtv'` and `project='qwfwd'` are in-vocabulary and will NOT trigger the probe.

The `synthesized_requires_anchor` probe is arc-scoped to `project IN ('ktx', 'mvdsv')` -- it will NOT catch a missing anchor on a `qtv`/`qwfwd` row. **This arc must extend the probe** (see Task 3) to cover `project IN ('qtv', 'qwfwd')` as well, or add new sibling probes. This is a substantive gap from the sibling arc.

### How the description reaches L1 end-to-end

```
describe-fill-synthesis skill (Opus MAX, per knob)
  -> per-knob ledger file at docs/superpowers/plans/.../ledger-<knob>.md
     (contains one fenced json block = D6Record)
  -> operator reviews batch ledger
  -> synthesize-qtv.ts --from-ledger '<glob>' --dry-run   (verify)
  -> synthesize-qtv.ts --from-ledger '<glob>'             (apply)
     inside applyRecords():
       - resolves canonical_id via (project, type, name)
       - F-D9b clobber-guard: skips terminal-owned rows
       - UPDATE entities SET description=..., description_origin='synthesized',
         description_anchor_version=..., description_provenance=tx.json(...),
         description_verdict=..., description_confidence=...,
         description_reasoning=..., description_embedding_stale=true
       - computes in-tx fingerprint (idempotency proof)
  -> derive-entity-description.ts F-D4a guard:
       on any future load-version re-run, the WHERE clause
       `AND entities.description_origin IS DISTINCT FROM 'synthesized'`
       excludes the owned rows from re-derivation -- the description is permanent
       until an operator-override re-run explicitly names the knob
```

The apply path is identical for QWFWD (substitute `synthesize-qwfwd.ts`).

---

## Goal

This phase gives every QWFWD knob and every QTV knob a source-verified user/admin-facing description, written against the Go register-site (QTV) or the C registration call-site (QWFWD), stored in L1 with `description_origin='synthesized'`, protected by the F-D4a owned-row guard against re-derivation, and verifiable via the D6 C-vs-Go probe (V6). Deliverables: the mother ledger (Task 1); two project-scoped apply scripts (Task 2); the batched per-knob describe fan-out via the `describe-fill-synthesis` skill (Task 3); the apply step (Task 4); the extended quality-grid probes (Task 5). At phase boundary: every `qtv` and `qwfwd` entity carries a non-null, source-verified `description` with `description_origin='synthesized'`, the D6 probe returns 0 rows, the owned-row guard survives a reload, and the `origin_vocabulary`/`synthesized_requires_anchor` probes (extended to cover qtv/qwfwd) are green.

---

## Inputs from previous phase

Phase 2 outputs (all must be verified before Phase 3 begins):

- Postgres `entities` table has rows for `project='qtv'` (41 cvars + 12 commands) and `project='qwfwd'` (cvar, command, cmdline_param, info_key -- counts per Phase-1 V4 baseline).
- `description` is NULL for all qtv/qwfwd rows (no describe pass has run yet).
- `source_file` for qtv rows is `pkg/qtv/*.go`; for qwfwd rows is `src/*.c`. Both are relative paths as required for the D6 Go-register-site probe (V6).
- `MCP lookup_entity` returns qtv and qwfwd knobs (Phase 1/2 V5 green).
- `bunx tsc --noEmit` exits 0 (Phase 0/1/2 V9 green).
- Phase-2 V9 green: `PROJECT_DEFAULT_SNAPSHOT_VERSION['qtv']='1.16-dev'` and `['qwfwd']='1.40-dev'` both set in `build-snapshot.ts`.
- The four describe seeds exist and are readable:
  - `apps/slipgate-app/reference/qtv/resources/qtv.cfg`
  - `apps/slipgate-app/reference/qwfwd/resources/example-configs/qwfwd.cfg`
  - `apps/slipgate-app/reference/qtv/pkg/` (Go source)
  - `apps/slipgate-app/reference/qwfwd/src/` (C source)
- The verify-xref files exist:
  - `research/repos/fteqw/fteqtv/source.c` (wire protocol)
  - `research/repos/fteqw/specs/hosting.txt` (MVDSV-side enablement)
- The MVDSV See-also ledgers exist:
  - `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_maxstreams.md`
  - `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_password.md`
  - `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_streamport.md`

---

## Files touched

### Created

```
docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/mother-ledger.md
  # living prep+learnings ledger; operator-committed append-only; worker prereq

docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/batch-ledger-qwfwd-<cluster>.md
  # per-batch summary (one per QWFWD batch wave); committed after each wave

docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/batch-ledger-qtv-<cluster>.md
  # per-batch summary (one per QTV batch wave); committed after each wave

docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/ledger-qwfwd-<knob>.md
  # one per QWFWD knob; contains the D6Record JSON block; committed per wave

docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/ledger-qtv-<knob>.md
  # one per QTV knob; contains the D6Record JSON block; committed per wave

apps/qw-oracle/scripts/describe-fill/synthesize-qtv.ts
  # project-scoped apply script for QTV; mirrors synthesize-mvdsv.ts with qtv substituted

apps/qw-oracle/scripts/describe-fill/synthesize-qwfwd.ts
  # project-scoped apply script for QWFWD; mirrors synthesize-mvdsv.ts with qwfwd substituted
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
  # extend synthesized_requires_anchor probe + add qtv/qwfwd to arc-scoped guard
```

### Deleted

```
n/a
```

---

## Tasks

---

### Task 1 -- Create the mother ledger

**Goal:** Establish the durable living prep+learnings file every batch worker reads warm before processing its batch.

**Files:** `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/mother-ledger.md`

**Steps:**

- [ ] Create `mother-ledger.md` in the plan directory with the following sections and initial content. This file is committed append-only; workers append a DELTA at the end of each batch; no section is ever edited in place after initial creation.

```markdown
# Phase 3 describe-fill -- mother ledger (QTV + QWFWD)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction
**Phase:** 3 (describe-fill)
**Anchor versions:** QTV `1.16-dev` (pkg/qtv/qtv.go:29 `qtvRelease`); QWFWD `1.40-dev` (qwfwd.h:118 `QWFWD_VERSION_SHORT`)
**Source roots:**
- QTV: `apps/slipgate-app/reference/qtv/` (Go 1.24, frozen vendored snapshot)
- QWFWD: `apps/slipgate-app/reference/qwfwd/` (C, frozen vendored snapshot)

## How a batch worker reads this

Read this file ONCE at the start of your batch, before reading anything else. It
is your primed context. Do NOT re-derive the standing rules -- they are locked here.
Your batch brief will supply the per-knob facts. Process your batch, then return a
tight DELTA (one paragraph) the mother appends.

## STANDING RULES (every batch worker enforces these)

### SR-1: Seeds are project-scoped; there is no cross-project seed bleed

- QTV seeds ONLY: `qtv.cfg` (Go target config, verified path
  `apps/slipgate-app/reference/qtv/resources/qtv.cfg`) and the Go source tree
  under `apps/slipgate-app/reference/qtv/pkg/`. No other file is a QTV seed.
- QWFWD seeds ONLY: `qwfwd.cfg` (verified path
  `apps/slipgate-app/reference/qwfwd/resources/example-configs/qwfwd.cfg`) and
  the C source tree under `apps/slipgate-app/reference/qwfwd/src/`. No other
  file is a QWFWD seed.

### SR-2 (D6 guard): the C-vs-Go QTV trap -- LOAD-BEARING

nQuake ships a C-QTV config. It is a DIVERGENCE SIGNAL, never a seed. The C-QTV
config registers knobs that DO NOT EXIST in the Go QTV target:

  `mvdport`, `admin_password`, `floodprot`, `allow_http`

These four knobs exist ONLY in `fteqtv/` (a different codebase, D13 scope fence).
They are absent from every `qvs.Reg`/`qvs.RegEx`/`qvs.Regf` call-site in
`apps/slipgate-app/reference/qtv/pkg/`. The Phase-2 L1 row set (41 cvars + 12
commands) does NOT contain them.

**D6 REJECT-LIST (QTV workers only):** if your candidate description mentions or
is seeded from `mvdport`, `admin_password`, `floodprot`, or `allow_http`, REJECT
it and re-source from the Go register-site. The Go equivalents are:

- `mvdport` -> `listen_address` (Go: `http.go`, `qVarFlagInitOnly`)
- `admin_password` -> `qtv_password` (Go: `downstream_storage.go`)
- `floodprot` (C command) -> `fp_time`, `fp_limit`, `fp_message` (Go triplet, `downstream_storage.go`)
- `allow_http` (C) -> `http_enabled`, `http_address` (Go: `http.go`)

QWFWD workers are not affected by this rule (QWFWD has no C-vs-Go split).

### SR-3: Deployment-default divergences -- flag in reasoning, never in description

QTV `maxclients`: Go source default = `1000` (registered `qvs.RegEx` in
`downstream_storage.go`). nQuake template = `100`. Describe the SOURCE default
(`1000`). If the divergence is material to a server operator, note it in
`description_reasoning` only -- never in `description`.

QWFWD `masters`: source default = `3` master servers (verified from
`query.c:697-700`). nQuake adds a 4th (`qwmaster.ocrana.de`). Describe the
source default (3 masters). Same flag-in-reasoning rule.

### SR-4: See-also wiring for QTV<->MVDSV handshake knobs

The following MVDSV rows were shipped in the sibling arc and are the correct
See-also anchors for QTV knobs that touch the MVDSV-QTV auth/streaming handshake:

- `qtv_password` (MVDSV side): ledger at
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_password.md`
- `qtv_maxstreams` (MVDSV side): ledger at
  `docs/.../mvdsv-svdemo-ledger-qtv_maxstreams.md`
- `qtv_streamport` (MVDSV side): ledger at
  `docs/.../mvdsv-svdemo-ledger-qtv_streamport.md`

For the QTV knobs `qtv_password` and related auth knobs: include a `See also:`
reference to the corresponding MVDSV knob in the description (D20 template `See also:` line).
For cross-engine wire protocol context: `research/repos/fteqw/fteqtv/source.c` (AUTH
PLAIN/MD4/CCITT, SOURCE/SOURCELIST/DEMOLIST) and
`research/repos/fteqw/specs/hosting.txt` (MVDSV-side enablement: `net_enable_qtv`,
`sv_port_tcp`, `qtv_password`, `qtv_maxstreams`) are admissible AIDS to locate
use-site context -- source register-site stays ground truth, these are corroboration
only (D6/D7 amendment: research docs are admissible AIDS, not substitute citations).

### SR-5: Concept-note breadcrumbs -- capture, do not author (D9)

Three concept-note candidates are identified (D9; authoring deferred to Phase 4 decision):
1. Master-server registration/heartbeat (`masters*` across qwfwd+qtv+mvdsv senders vs ezquake querier).
2. MVD streaming + `parse_delay` ghosting (qtv `parse_delay`/`tick_time` <-> mvdsv MVD source <-> ezquake viewer).
3. `qtv_password` cross-codebase auth matrix (PLAIN/MD4/CCITT/SHA3 negotiation).

When a knob's description touches one of these candidates, add a `[L3 breadcrumb: <candidate>]`
tag to `description_reasoning`. Do NOT author a concept note. These tags feed Phase 4's decision.

### SR-6: D6Record JSON shape (the per-knob ledger contract)

Each per-knob ledger file contains exactly ONE fenced json block. The
`synthesize-qtv.ts --from-ledger` / `synthesize-qwfwd.ts --from-ledger` scripts
parse this block. Shape (mirrors the D6Record in `synthesize-mvdsv.ts`):

```json
{
  "project": "qtv",
  "knob": "<knob-name>",
  "type": "cvar",
  "description": "...",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "...",
  "description_proposed": null
}
```

For QWFWD: `"project": "qwfwd"` and `"description_anchor_version": "1.40-dev"`.
`description_provenance` is `null` for cold-synth (no shipped-doc multi-source candidate --
operator clarification 2026-05-30 from sibling arc).
`description_origin` MUST be exactly `"synthesized"` (the in-vocabulary token verified
from `012_description_origin.sql`; a different value breaks the `origin_vocabulary` probe).

## BATCH LOG (append one line per batch wave)

<!-- Executor appends one line per wave: [date wave knob-count verdict-summary] -->
```

- [ ] Commit the mother ledger immediately after creation (before any describe workers run). Message: `phase-3 describe-fill: add mother ledger (standing rules + D6 guard)`.

**Execution mode:** `inline` -- the mother ledger is a documentation file; its standing rules are fully specified above; no code synthesis required.

---

### Task 2 -- Create `synthesize-qtv.ts` and `synthesize-qwfwd.ts` (the apply scripts)

**Goal:** Create project-scoped TypeScript apply scripts for QTV and QWFWD, mirroring `synthesize-mvdsv.ts` with the project identifier substituted and `IN_SCOPE_TYPES` narrowed.

**Files:**
- `apps/qw-oracle/scripts/describe-fill/synthesize-qtv.ts`
- `apps/qw-oracle/scripts/describe-fill/synthesize-qwfwd.ts`

**Why these scripts are needed (resolved from source):** `synthesize-mvdsv.ts` hardcodes `project='mvdsv'` in 5 SQL queries and as the `project` fallback in `applyRecords()` (lines 119, 279, 397, 412, plus the `computeFingerprint` query). The `synthesize-ktx.ts` is similarly scoped to `project='ktx'`. The pattern in the sibling arc is one apply script per project. The alternative (`apply-l1-from-ledgers.py`) is scoped to `ktx:` canonical IDs via hardcoded regex (line 60) and emits raw SQL TEXT that cannot bind JSONB with `tx.json()` (P2 failure mode). The TypeScript apply-script is the correct path.

**The `describe-fill-synthesis` skill pre-flight constraint (live recon finding -- CRITICAL):**

`~/.claude/skills/describe-fill-synthesis/SKILL.md` line 102 states: "project is not exactly `ktx` or `mvdsv`" is a hard ABORT condition. The skill as written will ABORT for `project='qtv'` or `project='qwfwd'`. This is the skill's gate that has been locked for the sibling arc. See Open questions Q-SKILL for the resolution choice.

**Steps:**

- [ ] Create `apps/qw-oracle/scripts/describe-fill/synthesize-qtv.ts` by copying `synthesize-mvdsv.ts` and applying the following mechanical substitutions:
  - All occurrences of `'mvdsv'` -> `'qtv'` (in SQL WHERE clauses, fallback defaults, output messages).
  - `IN_SCOPE_TYPES` -> `['cvar', 'command'] as const` (QTV has 0 cmdline_param, 0 info_key -- Phase-2 confirmed).
  - `project='mvdsv'` WHERE clauses -> `project='qtv'` (3 SQL queries: `computeFingerprint`, `statusReport`, `applyRecords` matched lookup).
  - File header comment: update to describe QTV.
  - `--operator-override` logic: unchanged (project-agnostic).
  - The `computeFingerprint` query scope: `WHERE project = 'qtv' AND type IN ${exec(IN_SCOPE_TYPES)}`.
  - The `statusReport` query: `WHERE project = 'qtv' AND type IN ${sql(IN_SCOPE_TYPES)}`.
  - The `applyRecords` entity lookup: `WHERE project = ${project} AND type = ${type} AND name = ${knob}` -- this is already project-agnostic via `rec.project ?? 'mvdsv'`; change the fallback to `rec.project ?? 'qtv'`.
  - The `--from-ledger` glob resolution: unchanged (path is operator-supplied).
  - The `isTerminalOwned()` function: copy verbatim (project-agnostic).
  - The `F-D9b clobber-guard` in `applyRecords()`: copy verbatim (project-agnostic).
  - Add a `--status` banner: `=== --status: QTV describe-fill progress ===`.
  - Add a `--fingerprint` banner: `scope: project='qtv', type IN (cvar,command)`.
  - Do NOT add or remove sub-commands. The interface is `--persist`, `--from-ledger`, `--fingerprint`, `--status`, `--operator-override`.

- [ ] Create `apps/qw-oracle/scripts/describe-fill/synthesize-qwfwd.ts` by applying the same pattern:
  - `'mvdsv'` -> `'qwfwd'` throughout.
  - `IN_SCOPE_TYPES` -> `['cvar', 'command', 'cmdline_param', 'info_key'] as const` (all four types loaded in Phase 1).
  - Fallback project: `rec.project ?? 'qwfwd'`.
  - Banners: `=== --status: QWFWD describe-fill progress ===` and `scope: project='qwfwd', type IN (...)`.

- [ ] Run `bunx tsc --noEmit` from `apps/qw-oracle/` to confirm both new scripts compile.

**Execution mode:** `subagent (Sonnet medium)` -- code synthesis from a clear mechanical substitution spec; 2 files; the judgment is verifying all `'mvdsv'` occurrences are substituted and `IN_SCOPE_TYPES` is correctly narrowed for each project.

---

### Task 3 -- Extend quality-grid probes to cover qtv/qwfwd

**Goal:** Extend the `synthesized_requires_anchor` and `provenance_entry_exists` probes (currently arc-scoped to `project IN ('ktx','mvdsv')`) to include `'qtv'` and `'qwfwd'`, so the C5 honesty guarantees apply to the new projects.

**Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

**Why this is needed (from live recon):** `probeDescribeFillSynthesizedRequiresAnchor` (line 1117) uses `WHERE project IN ('ktx', 'mvdsv')`. Same for `probeDescribeFillProvenanceEntryExists` (line 1164). The `origin_vocabulary` probe part (ii) arc-scoped guard also uses `project IN ('ktx', 'mvdsv')` (line 1057). A `qtv` or `qwfwd` row with `description_origin='synthesized'` and a missing anchor would be invisible to these probes. The C5 honesty guarantee is hollow without the extension.

**The `origin_vocabulary` part (i) GLOBAL guard (line 1014) already covers qtv/qwfwd** -- no project filter, catches out-of-vocabulary origin values. Only the arc-scoped parts need extension.

**Steps:**

- [ ] In `probeDescribeFillSynthesizedRequiresAnchor` (around line 1117): change `project IN ('ktx', 'mvdsv')` to `project IN ('ktx', 'mvdsv', 'qtv', 'qwfwd')` in both SQL queries (the 8-row example query and the count query).
- [ ] In `probeDescribeFillProvenanceEntryExists` (around line 1164): change `project IN ('ktx', 'mvdsv')` to `project IN ('ktx', 'mvdsv', 'qtv', 'qwfwd')` in both SQL queries.
- [ ] In `probeDescribeFillOriginVocabulary` part (ii) arc-scoped guard (around line 1057): change `project IN ('ktx', 'mvdsv')` to `project IN ('ktx', 'mvdsv', 'qtv', 'qwfwd')`. Update the comment above the query to name all four projects.
- [ ] Update the probe descriptions (the `description:` field strings) to mention all four projects.
- [ ] Run `bunx tsc --noEmit` to confirm the edits compile.

**Execution mode:** `subagent (Sonnet medium)` -- mechanical string substitution in 3 probe functions; the judgment is correctly identifying all 6 SQL clauses that need widening and verifying none of the `IN` clause changes introduces a parse error.

---

### Task 4 -- Batched per-knob describe fan-out (QWFWD + QTV)

**Goal:** Dispatch the `describe-fill-synthesis` skill as one sub-agent per knob (up to 4 per agent, batched) for all QWFWD and QTV in-scope entities, source-verified against the respective register-site, producing per-knob ledger files.

**Files:** `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/ledger-{qwfwd,qtv}-<knob>.md` (one per knob), `docs/.../batch-ledger-{qwfwd,qtv}-<cluster>.md` (one per wave)

**Critical pre-flight: the skill pre-flight gate (Q-SKILL)**

Before dispatching workers, the operator MUST confirm the resolution to Q-SKILL (see Open questions). The `describe-fill-synthesis` skill's hard pre-flight gate checks `project is not exactly 'ktx' or 'mvdsv'` (SKILL.md line 102) and ABORTs for other projects. The executor cannot run this task until Q-SKILL is resolved.

**Batch groupings:**

QWFWD (run first; smaller surface; builds calibration before QTV):

| Batch | Cluster | Types | Approximate count |
|---|---|---|---|
| QWFWD-1 | core-cvars | cvar | ~12-14 (per extractor F1 baseline) |
| QWFWD-2 | admin-commands | command | ~15 |
| QWFWD-3 | more-commands | command | ~15 |
| QWFWD-4 | cmdline-and-info | cmdline_param + info_key | ~2 + ~6 |

QTV (run after QWFWD calibration):

| Batch | Cluster | Types | Approximate count |
|---|---|---|---|
| QTV-1 | identity-and-control | cvar (identity/version/control subset) | ~8 |
| QTV-2 | network-and-stream | cvar (network/stream subset) | ~10 |
| QTV-3 | http-and-flood | cvar (http_* + fp_* clusters, D6 guard active) | ~11 |
| QTV-4 | buffers-and-misc | cvar (remaining) | ~12 |
| QTV-5 | commands | command (all 12) | 12 |

Batch counts are approximate -- use `SELECT name, type FROM entities WHERE project='qwfwd' ORDER BY type, name` to get exact counts from Postgres before dispatching (F7: extractor counts are authoritative).

**Per-worker brief template (paste into each sub-agent; fill in <CLUSTER>, <PROJECT>, <ANCHOR>, per-knob facts):**

```
Invoke the `describe-fill-synthesis` skill to load its method + 6 references ONCE,
then apply that full discipline to EACH of your assigned knobs (up to 4) in turn.

CRITICAL: Before step 1, read the Phase-3 mother ledger:
  docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/mother-ledger.md
The standing rules there govern your work. SR-2 (D6 guard) is mandatory for QTV workers.

Shared facts (all knobs): project=<PROJECT> ; anchor=<ANCHOR> ;
mechanical_candidate=none (cold-synth; evaluate anyway per D5 amendment) ;
source root=<SOURCE ROOT>. Do NOT treat nQuake config as a seed (SR-1).

[QTV workers ONLY]: SR-2 D6 REJECT-LIST is in force. If any candidate description
mentions `mvdport`, `admin_password`, `floodprot`, or `allow_http`, REJECT and
re-source from Go register-site. These C-only knobs do not exist in Go QTV.

Per-knob facts (one line per assigned knob):
  knob=<KNOB> ; type=<TYPE> ; decl at <SOURCE_FILE>:<SOURCE_LINE> ;
  extractor default=<DEFAULT> ; flags=<FLAGS_RAW> ; suspect_pool_member=FALSE
  (qtv/qwfwd are frozen vendored snapshots; no C3 runtime-dead pool applies).

Output: write ONE ledger file PER knob at:
  docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/ledger-<PROJECT>-<KNOB>.md
Ledger contains EXACTLY ONE fenced json block = D6Record per SR-6 shape.
description_origin MUST be exactly "synthesized". project MUST be "<PROJECT>".
anchor_version MUST be "<ANCHOR>". description_provenance = null (cold-synth).

[SR-5 breadcrumbs]: if this knob touches master-server registration, MVD streaming,
or qtv_password auth negotiation, add [L3 breadcrumb: <candidate>] to description_reasoning.

[SR-4 See-also]: for QTV knobs related to the MVDSV-QTV handshake (qtv_password,
parse_delay, masters): include See also: the corresponding MVDSV entity name.

Do NOT touch the DB. Do NOT commit. Return only: (a) one-line verdict per knob,
(b) description verbatim, (c) source_ref(s). All reasoning in the ledger files.
```

**Steps:**

- [ ] Run the Postgres query to confirm exact per-type counts for both projects before dispatching:
  ```sql
  SELECT project, type, count(*) FROM entities
  WHERE project IN ('qwfwd','qtv') GROUP BY project, type ORDER BY project, type;
  ```
- [ ] Dispatch QWFWD-1 wave (4 agents x up to 4 knobs = 16 max; use actual cvar count). Wait for all to return.
- [ ] F-D6a grep-verify: independently grep every returned `source_ref` vs live source before trusting it.
- [ ] V-pass for QWFWD-1: dispatch independent cold-context workers (knob + description only, B3 independence), one canary per wave.
- [ ] Process V-pass results: HG1 (canary), HG2 (re-grep both directions), seeded re-synth (B4) for real flags.
- [ ] Commit QWFWD-1 ledger files + batch-ledger. Append BATCH LOG line to mother ledger.
- [ ] Repeat for QWFWD-2, QWFWD-3, QWFWD-4 in sequence.
- [ ] Repeat for QTV-1 through QTV-5, with SR-2 D6 guard in every QTV worker brief.
- [ ] After all waves: run `synthesize-qwfwd.ts --from-ledger '<absolute-glob>/*.md' --dry-run` to confirm all 0 errors before the live apply (Task 5 dry-run gate).
- [ ] After QTV waves: run `synthesize-qtv.ts --from-ledger '<absolute-glob>/*.md' --dry-run` same gate.

**Execution mode:** `subagent (Opus MAX via describe-fill-synthesis skill)` for each synthesis worker; spec-locked D8 dial -- do NOT re-select. The mother orchestrator is a separate session that dispatches workers and processes results (D10 mother-ledger pattern). V-pass workers are `subagent (Opus MAX)` read-only (B3). The mother orchestration + F-D6a grep-verify are `inline` in the orchestrator terminal.

---

### Task 5 -- Apply step + idempotency + probes

**Goal:** Persist all approved ledger records into L1 via the apply scripts; verify idempotency and the F-D4a owned-row guard; run the extended probes.

**Files:** `apps/qw-oracle/scripts/describe-fill/synthesize-qtv.ts`, `apps/qw-oracle/scripts/describe-fill/synthesize-qwfwd.ts`

**Steps:**

- [ ] Apply QWFWD:
  ```bash
  cd apps/qw-oracle
  bun scripts/describe-fill/synthesize-qwfwd.ts \
    --from-ledger '/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/ledger-qwfwd-*.md'
  ```
  Confirm: `persisted=N` (N = all QWFWD knobs), `errors=0`, `skipped-terminal=0`.

- [ ] Apply QTV:
  ```bash
  cd apps/qw-oracle
  bun scripts/describe-fill/synthesize-qtv.ts \
    --from-ledger '/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/ledger-qtv-*.md'
  ```
  Confirm: `persisted=N`, `errors=0`, `skipped-terminal=0`.

- [ ] Idempotency: re-run both `--from-ledger` commands a second time.
  ```bash
  bun scripts/describe-fill/synthesize-qwfwd.ts --from-ledger '<glob>' --fingerprint
  bun scripts/describe-fill/synthesize-qtv.ts --from-ledger '<glob>' --fingerprint
  ```
  Confirm second run shows `skipped-terminal=N` (all rows already terminal-owned); fingerprint unchanged.

- [ ] F-D4a owned-row guard: re-run the QWFWD load-version for any type (e.g. cvars) as a dry-run reload to confirm the derive tail does not overwrite.
  ```bash
  bun scripts/load-knowledge/index.ts load-version \
    --project qwfwd --version 1.40-dev --type cvar \
    --json scripts/extractors/qwfwd/output/qwfwd-variables-ast.json \
    --commit 1.40-dev --ordinal 1 --dry-run
  ```
  Then query: `SELECT count(*) FROM entities WHERE project='qwfwd' AND description_origin='synthesized'` -- must equal the pre-reload count. No synthesized row lost. Repeat for QTV.

- [ ] Run the extended quality-grid probes:
  ```bash
  cd apps/qw-oracle
  bun scripts/load-knowledge/index.ts quality-grid --project qwfwd --family regression
  bun scripts/load-knowledge/index.ts quality-grid --project qtv --family regression
  ```
  Confirm: `F1.describe_fill.origin_vocabulary` PASS, `F1.describe_fill.synthesized_requires_anchor` PASS (now covers qtv/qwfwd per Task 3).

- [ ] Commit: all ledger files, batch ledger files, the updated mother ledger (BATCH LOG appended), both apply scripts, the quality-grid extension, and the per-project status. Message: `phase-3 describe-fill: apply qtv+qwfwd descriptions, extend quality-grid probes`.

**Execution mode:** `inline` -- the apply commands are deterministic invocations of already-written scripts; no reasoning required at this step.

---

## Verification (phase boundary)

All probes use Postgres (D12). None depend on Phase 4 existing (D11).

---

### V1 -- Coverage: every qtv/qwfwd entity has a description

```sql
SELECT project, type, count(*) AS total,
  count(description) AS described,
  count(*) - count(description) AS missing
FROM entities
WHERE project IN ('qtv', 'qwfwd')
GROUP BY project, type
ORDER BY project, type;
```

PASS condition: `missing=0` for all rows. Every entity has a non-null description.
FAIL condition: any `missing > 0`. Identify the knob(s) missing description and dispatch a describe worker for the gap.

---

### V2 -- Origin tag: all descriptions carry the correct owned-track origin

```sql
SELECT project, description_origin, count(*)
FROM entities
WHERE project IN ('qtv', 'qwfwd')
  AND description IS NOT NULL
GROUP BY project, description_origin;
```

PASS condition: only `synthesized` appears as `description_origin` for qtv/qwfwd rows with descriptions. No `null`, no `source_inline`, no out-of-vocabulary value.
FAIL condition: any other origin value. The worker produced a wrong `description_origin` token; fix the ledger and re-apply.

---

### V3 -- Anchor: all synthesized rows have a non-null anchor

```sql
SELECT canonical_id
FROM entities
WHERE project IN ('qtv', 'qwfwd')
  AND description_origin = 'synthesized'
  AND description_anchor_version IS NULL;
```

PASS condition: 0 rows.
FAIL condition: any rows. The worker omitted `description_anchor_version` in the D6Record; fix the ledger and re-apply.

---

### V4 -- origin_vocabulary probe

```bash
cd apps/qw-oracle
bun scripts/load-knowledge/index.ts quality-grid --family regression
```

PASS condition: `F1.describe_fill.origin_vocabulary` PASS.
FAIL condition: FAIL. Check which canonical IDs are flagged; most likely a ledger used a non-vocabulary `description_origin` token. The only valid token for this phase is `synthesized`.

---

### V5 -- synthesized_requires_anchor probe (extended)

After Task 3 extends the probe to cover qtv/qwfwd:

```bash
bun scripts/load-knowledge/index.ts quality-grid --family regression
```

PASS condition: `F1.describe_fill.synthesized_requires_anchor` PASS.
FAIL condition: FAIL. Same root cause as V3; probe now catches it at the regression level.

---

### V6 -- D6 probe: no C-only knob in QTV descriptions; all QTV descriptions anchor to Go source

```sql
-- Probe A: no C-only knob name in QTV descriptions
SELECT canonical_id, description
FROM entities
WHERE project = 'qtv'
  AND (
    description ILIKE '%mvdport%'
    OR description ILIKE '%admin_password%'
    OR description ILIKE '%floodprot%'
    OR description ILIKE '%allow_http%'
  );
```

PASS condition (Probe A): 0 rows.
FAIL condition: any row. A worker seeded from or mentioned a C-only knob. Identify the ledger, correct the description, re-apply.

```sql
-- Probe B: all described QTV entities have a Go source_file anchor.
-- Run both queries (cvar_versions + command_versions); both must return 0 rows.
SELECT e.canonical_id, e.description_origin, cv.source_file
FROM entities e
LEFT JOIN cvar_versions cv ON cv.entity_id = e.id
WHERE e.project = 'qtv' AND e.type = 'cvar'
  AND e.description IS NOT NULL
  AND (cv.source_file IS NULL OR cv.source_file NOT LIKE 'pkg/%');

SELECT e.canonical_id, e.description_origin, cmv.source_file
FROM entities e
LEFT JOIN command_versions cmv ON cmv.entity_id = e.id
WHERE e.project = 'qtv' AND e.type = 'command'
  AND e.description IS NOT NULL
  AND (cmv.source_file IS NULL OR cmv.source_file NOT LIKE 'pkg/%');
```

PASS condition (Probe B): 0 rows from both queries.
FAIL condition: any row. A QTV description was synthesized without anchoring to a Go register-site. Check the ledger's `source_ref` -- it must be a `pkg/qtv/` path.

---

### V7 -- JSONB probe: description_provenance is not a string scalar

```sql
SELECT canonical_id, pg_typeof(description_provenance) AS ptype
FROM entities
WHERE project IN ('qtv', 'qwfwd')
  AND description_provenance IS NOT NULL
  AND pg_typeof(description_provenance)::text = 'text';
```

PASS condition: 0 rows (all provenance values are null or proper JSONB, never a stringified scalar).
FAIL condition: any row. The apply script pre-stringified provenance -- P2 violation. Fix: pass the JS value directly or via `tx.json()`. For cold-synth rows `description_provenance` is NULL, so this probe should return 0 rows in practice.

---

### V8 -- Idempotency: re-apply produces no new writes

Re-run both `--from-ledger` commands a second time (identical args). Then:

```sql
SELECT project, type, count(*) AS described_count
FROM entities
WHERE project IN ('qtv', 'qwfwd')
  AND description_origin = 'synthesized'
GROUP BY project, type
ORDER BY project, type;
```

PASS condition: counts identical to V1 `described` column. The `--from-ledger` summary reports `skipped-terminal=N`, `persisted=0`.
FAIL condition: counts increase. The F-D9b clobber-guard in `applyRecords()` is not working -- investigate `isTerminalOwned()` function.

---

### V9 -- F-D4a: a load-version re-run does not clobber owned descriptions

After the apply step, re-run `load-version` for any QWFWD type (use `--dry-run` if available, else run live and re-check counts):

```sql
-- Before reload, capture counts:
SELECT count(*) FROM entities WHERE project='qwfwd' AND description_origin='synthesized';
-- Re-run: bun scripts/load-knowledge/index.ts load-version --project qwfwd --version 1.40-dev --type cvar --json ... --commit 1.40-dev --ordinal 1
-- After reload, re-check:
SELECT count(*) FROM entities WHERE project='qwfwd' AND description_origin='synthesized';
```

PASS condition: count unchanged before and after the reload.
FAIL condition: count decreases. The F-D4a guard in `derive-entity-description.ts` is not protecting qtv/qwfwd rows. Verify the WHERE clause `AND entities.description_origin IS DISTINCT FROM 'synthesized'` in all four per-type derivers (lines 150, 179, 216, 245 -- the guard is project-agnostic and already covers qtv/qwfwd).

---

### V10 -- MCP smoke: described QTV and QWFWD knobs return descriptions

```
lookup_entity(project="qtv", name="qtv_password")
lookup_entity(project="qwfwd", name="masters")
```

PASS condition: both return rows with non-null `description` field and `description_origin='synthesized'`.
FAIL condition: `null` / no match or description is null. Check V1 (rows must exist and be described).

---

### V11 -- TypeScript compiles clean

```bash
cd apps/qw-oracle && bunx tsc --noEmit
```

PASS condition: exit 0.
FAIL condition: type error. Most likely in the new apply scripts (Task 2) or the probe extension (Task 3). Fix the reported type error.

---

## Outputs to next phase

After Phase 3:

- Every `project='qtv'` entity (41 cvars + 12 commands) has `description IS NOT NULL`, `description_origin='synthesized'`, `description_anchor_version='1.16-dev'`.
- Every `project='qwfwd'` entity (all types) has `description IS NOT NULL`, `description_origin='synthesized'`, `description_anchor_version='1.40-dev'`.
- No QTV description references a C-only knob (`mvdport`/`admin_password`/`floodprot`/`allow_http`) -- V6 Probe A = 0 rows.
- All QTV descriptions anchor to a Go `source_file` under `pkg/` -- V6 Probe B = 0 rows.
- `F1.describe_fill.origin_vocabulary` PASS; `F1.describe_fill.synthesized_requires_anchor` PASS (now extended to qtv/qwfwd).
- `synthesize-qtv.ts` and `synthesize-qwfwd.ts` exist and compile (V11).
- Per-knob ledger files committed, one per knob, each containing one D6Record JSON block.
- Mother ledger committed with BATCH LOG entries.
- Phase 4 receives: per-knob breadcrumb tags in `description_reasoning` for the three concept-note candidates (D9 input); the V1 coverage counts as the F1 baseline supplement for Phase 4; the quality-grid extension (Task 3) already live.

---

## Open questions / deferred items

**Q-SKILL -- describe-fill-synthesis pre-flight gate blocks qtv/qwfwd [OPERATOR DECISION NEEDED]**

The `describe-fill-synthesis` skill (at `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 102) has a hard pre-flight ABORT when `project is not exactly 'ktx' or 'mvdsv'`. This gate was written for the sibling arc's scope. For this arc to dispatch workers, one of the following must be chosen:

Option A: **Extend the skill's pre-flight gate** to allow `qtv` and `qwfwd` as valid projects. Change "is not exactly `ktx` or `mvdsv`" to "is not in `{'ktx', 'mvdsv', 'qtv', 'qwfwd'}`". The skill already states "Engine-agnostic -- the phase supplies the entity; the skill never branches on which engine" (SKILL.md line 12) -- the pre-flight project check is a scope-fence that can be widened without changing the skill's logic. Independent verification (2026-06-05) confirmed the skill has NO project-branching logic beyond this gate, so widening line 102 is the complete FUNCTIONAL fix; for consistency, also update the three documentation references that still name only ktx/mvdsv (SKILL.md frontmatter `description:` line 4, `Inputs` line 53, `Escape hatches` line 354) so a worker reading the skill warm is not confused. This is a shared-tooling (user-global skill) change, so it is the operator's call.

Option B: **Override per-worker**: instruct each worker to skip the pre-flight check by explicitly supplying `project='qtv'` or `project='qwfwd'` as the entity scope and noting that the skill body is engine-agnostic. The check is an arc-scope gate, not a correctness gate.

Option C: **Duplicate the skill** as `describe-fill-synthesis-qtv-qwfwd` with the scope widened. Higher overhead; not recommended.

Default chosen for planning: Option A (widen the skill's scope fence -- lowest friction; the skill body is already engine-agnostic). Operator can override to B.
Who can resolve: operator, before Task 4 begins.

**Q-SKILL-UPDATE recorded as a new finding:** This is added to `review-findings.md` as F8 (see below).

**Q-BATCHING -- QWFWD command count and batch granularity**

The exact QWFWD command count is determined by the Phase-1 extractor F1 baseline (V4 output), not the planning hand-count of ~30. The batch groupings in Task 4 use approximate counts. The executor must query Postgres for exact counts before dispatching and adjust batch sizes accordingly. Per F7: extractor count is authoritative.

Default: query-first, then dispatch. No operator action needed.

**Q-VPASS-NO-C3-POOL -- QTV/QWFWD have no C3 runtime-dead suspect pool**

The sibling arc's C3 suspect pool (runtime-dead detection via running-build diff) does not apply to QTV or QWFWD. Both are frozen vendored snapshots with no live build in this environment. The `describe-fill-synthesis` skill's Step 2 (`suspect_pool_member` check) is always FALSE for every qtv/qwfwd knob -- workers receive `suspect_pool_member=FALSE` in their brief (SR-6 above). No dead-stamp path fires in this arc.

Default: `suspect_pool_member=FALSE` for all knobs. No operator action needed.

**Q-D7-TIER1 -- V-pass for qtv/qwfwd (the B1-B5 protocol)**

The sibling arc's D7 Amendment 2026-05-19 (B1-B5) applies: the B1-strengthened enforce-trace rule is mandatory for every D6 invocation; the V-pass (B3) is the D7 tier-1 gate; seeded re-synth (B4) handles real flags. This arc follows the same protocol. The `references/enforce-trace-discipline.md` (the fifth describe-fill-synthesis reference) governs.

The V-pass oracle for QTV workers is the Go source tree at `apps/slipgate-app/reference/qtv/pkg/`. The V-pass oracle for QWFWD workers is `apps/slipgate-app/reference/qwfwd/src/`. Workers receive the correct source root in their brief. No MVDSV source is referenced in QTV V-passes.

Default: follow B1-B5 as written. No operator action needed.

**F8 (new finding added to review-findings.md -- executor to append):**

> ### F8 -- describe-fill-synthesis skill pre-flight blocks qtv/qwfwd
> **Status:** Flagged for Phase 3. Resolved by Q-SKILL Option A.
> **Evidence:** `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 102 hard-checks `project is not exactly 'ktx' or 'mvdsv'` as an ABORT condition. QTV and QWFWD are not in scope. The skill body is engine-agnostic (line 12); the pre-flight is an arc-scope fence. Resolution: widen the gate (+ the 3 doc lines, see Q-SKILL Option A) before Task 4 dispatch.

---

**Planner independent verification (2026-06-05).** A separate independent fresh-context Explore verifier (the drafter could not spawn one) confirmed against live source:
- The D6 guard is genuinely load-bearing -- all four mechanisms are present and concrete. V6 Probe B (the Go `source_file` anchor under `pkg/`, run on BOTH `cvar_versions` and `command_versions`) is the structural teeth; Probe A (the C-only-name ILIKE scan) is the name-mention backstop. A description silently seeded from C-QTV without naming the four knobs is caught by Probe B (it would lack a Go register-site anchor).
- The `describe-fill-synthesis` skill has NO project-branching logic beyond the line-102 gate and three documentation references (lines 4 / 53 / 354), so Q-SKILL Option A (widen the gate + update those 3 lines) is the COMPLETE functional fix.
- The apply mechanism is source-accurate: `synthesize-mvdsv.ts` hardcodes the project (so per-project `synthesize-qtv.ts` / `synthesize-qwfwd.ts` are required); the `F-D4a` derive guard in `derive-entity-description.ts` is project-agnostic (`IS DISTINCT FROM 'synthesized'`, no project literal) and protects qtv/qwfwd unchanged; `'synthesized'` is the in-vocabulary origin token; the quality-grid probe extension covers the 6 arc-scoped clauses (count confirmed).

Fixes applied post-verification: the `ktv` -> `ktx` typo (Mechanism descriptions + Q-SKILL); the `synthesize-mvdsv.ts` occurrence enumeration; Q-SKILL Option A expanded to name the 3 skill doc lines. Open for operator eyes-on: the D6 guard (this phase's review target) and the Q-SKILL decision (a shared user-global skill change -- the operator's call).

---

## Recovery (if verification fails)

- **V1 shows missing descriptions:** one or more workers halted or the ledger failed to parse. Run `synthesize-qtv.ts --from-ledger '<glob>' --dry-run` to see which knobs are missing (errors=N). Fix the ledger (re-dispatch the worker for that knob), then re-apply.
- **V2 shows wrong origin (e.g., `source_inline`):** a worker affirmed a comment rather than synthesizing. Re-examine: if the comment genuinely clears the D5 rubric AND is already in D20 shape, `source_inline` is correct (rare; operator-reviewed). If not, re-dispatch the worker with an explicit note that the comment does not clear D20 template shape and synthesize is required.
- **V6 Probe A returns rows (C-only knob in QTV description):** identify the canonical_id, open the ledger, find the source of contamination. The worker seeded from the nQuake C-QTV config or inferred from a community resource. Fix the description in the ledger (re-synth the knob from the Go register-site), re-apply via `synthesize-qtv.ts --from-ledger '<single-ledger>' --operator-override <knob>`. Re-run V6 Probe A.
- **V9 count decreases after reload (F-D4a guard missed):** the derive-entity-description.ts guard uses `IS DISTINCT FROM 'synthesized'` (verified lines 150, 179, 216, 245). If these lines are not present (check the live file), the Phase-1 D4 amendment was not applied. This is a Phase-1 regression, not a Phase-3 bug. Re-apply the Phase-1 D4 guard amendment to the four derivers and re-run the load.
- **V11 fails with type errors in synthesize-qtv.ts / synthesize-qwfwd.ts:** most likely `IN_SCOPE_TYPES` type is incompatible with the SQL template literal parameter. Mirror the exact type assertion from synthesize-mvdsv.ts (`as unknown as string[]`).
- **`--from-ledger` glob resolves 0 files:** the glob must be ABSOLUTE. The script resolves it relative to `cwd=apps/qw-oracle`, but the ledger files live at monorepo root `docs/superpowers/plans/...`. Use the full absolute path (sibling arc learnings log B3 entry: "Glob gotcha: `--from-ledger` needs an ABSOLUTE glob").
- **synthesized_requires_anchor probe FAIL after extending to qtv/qwfwd (V5):** a ledger has `description_anchor_version` set to empty string or null JSON. Check the D6Record: `"description_anchor_version": "1.16-dev"` for QTV, `"1.40-dev"` for QWFWD. Fix the ledger, re-apply with `--operator-override`.
