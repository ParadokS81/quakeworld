# QTV + QWFWD -> Layer 1 extraction -- design

**Date:** 2026-06-05
**Status:** approved design, ready for `arc-planner`.
**Captured-from:** `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md` (arc seed, mode S -- trigger fired 2026-06-05).
**Methodology:** re-run of the ktx/mvdsv pipeline (`onboard-extractor` -> `describe-fill-synthesis` -> `validate-extractor`). The only novel build is the Go extractor front-end.

## Goal / end-state

Both QuakeWorld streaming/forwarding tools become first-class Layer 1 citizens, same shape as the engine ports: every tunable knob extracted as a source-backed L1 entity, each carrying a source-verified user/admin-facing description, MCP-queryable. Concept notes are **deferred** to an evidence-based decision after the describe pass. Each phase ships as its own runnable commit.

## Targets (locked)

| Tool | Target repo | Language | Vendored at | Notes |
|---|---|---|---|---|
| **QTV** | `QW-Group/qtv` (Go 1.24) | Go | `apps/slipgate-app/reference/qtv/` | The deployed, canonical QTV (admin ground-truth, 2026-05-31). |
| **QWFWD** | qqshka QWFWD | C | `apps/slipgate-app/reference/qwfwd/` | UDP forwarder/proxy; unrelated C codebase. |

**Not targets:** `qqshka/qtv-go` (Go 1.19 predecessor; its `qtv.cfg` is byte-identical to canonical -- no extraction value). `fteqtv` (C original; **protocol-origin / historical reference only**, document only via concept-note xref if at all). The `hub.quakeworld.nu` web viewer (TS/React frontend -- different concern).

Both targets are **vendored snapshots (no `.git`)**. Version label = each tool's internal version constant (qwfwd `QWFWD_VERSION`, qtv `*version` cvar); snapshot provenance (vendored copy date) recorded in run metadata since there is no git tag to extract against.

## Knob surface (approximate -- the extractor is the source of truth)

Hand-counts below are from exploration agents and are **not** authoritative; the extractor output supersedes them (the scout already found `sys_readstdin`, a real qwfwd knob the first inventory missed).

- **QWFWD:** ~13-14 cvars, ~30 console commands, 2 positional command-line args, serverinfo keys. Idiom: `Cvar_Get("name", default, flags)` + `Cmd_AddCommand`.
- **QTV:** ~41 cvars, ~12 console commands, 0 CLI flags, 0 env vars. Idiom: `qvs.Reg("name","default")` / `qvs.RegEx(...)` + `cmd.Register("name", fn)`.

**All map onto existing L1 entity types** -- `cvar`, `command`, `cmdline_param`, and `info_key` (QWFWD serverinfo keys). **No new entity types; no schema-type invention.**

> Naming note: the L1 project slug `qtv` (the proxy) is distinct from MVDSV's `qtv_*` cvars (the server's built-in stream endpoint). They are different things; the See-also wiring (below) connects them.

## Toolchain (locked)

- **QWFWD -> libclang.** Fresh cross-codebase port on the existing `extractor_lib/` rails (subclass `Visitor`, add `clang_args_qwfwd_for()` in `clang_config.py`, write per-type handlers for the `Cvar_Get`/`Cmd_AddCommand` idioms). Output JSON identical in shape to MVDSV.
- **QTV -> native Go `go/ast`.** A small (~150-line) Go program at `scripts/extractors/qtv/` that walks the registration call-sites and emits the **same** per-type JSON the loader already consumes:
  ```json
  { "<payload_field>": [ { "name": "...", "ast": { "default_value": "...", "source_file": "...", "source_line": 0, "...": "..." } } ] }
  ```
  This is the pipeline's **first non-C extractor** -- precedent-setting. `go/ast` chosen over tree-sitter-go: native AST resolves the literal cvar/command registrations precisely, Go is already a build dep for QTV, and the extractor is a reusable asset for any future Go QW tooling.
- **Both -> same downstream.** Existing loader adapters (`load-cvars.ts`, `load-commands.ts`, `load-cmdline.ts`, `load-info-keys.ts`), idempotent natural-key upserts, the diff/snapshot path. Nothing downstream of the JSON changes.
- **Load path (the arc's one integration unknown -- promoted to the Phase-1 crux).** `extract-tag.ts` is hardwired to `git checkout` + `python3 extract.py`, so it **cannot** drive a vendored no-`.git` snapshot or a Go extractor. Bypass it: run each extractor as a standalone step writing JSON to `scripts/extractors/<project>/output/`, then ingest via the existing `index.ts` subcommand `load-version --project <p> --version <v> --json <path> --commit <sha> [--ordinal <n>]` (drives `loadVersion()` directly -> the entity/`*_versions` machinery; no git, no python). This is an already-canonical entrypoint (same shape as `load-assets`, `load-ktx-modes`), not a workaround. Open Phase-1 detail: what to pass for `--commit` when the vendored copy has no local sha (upstream sha if known, else the version constant).

## Schema change

One additive migration (`db/migrations/020_qtv_qwfwd_projects.sql` -- next number is 020): extend the `project` allow-list from `('ezquake','fte','mvdsv','ktx','qwcl')` to add `'qwfwd'` and `'qtv'`, across the **10 CHECK clauses on 9 tables** in `002_layer1_schema.sql` (8 `project` columns + `cvar_alias_versions`'s `target_project` **and** `mimics_project`). Postgres `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT` per clause. Update `SCHEMA.md`. Widen the `Project` TS union too -- that compiler-forces the ~12 `Record<Project, ...>` sites to be filled (completeness enforced by `tsc`). Mirror any project allow-list in the loader and MCP project filters.

## Describe pass (reuse `describe-fill-synthesis`)

Per-knob keep-vs-synthesize judgment, **source-verified** -- comments are probably right, but the source register-site is ground truth.

- **Seeds:** the two annotated config files -- `qtv/resources/qtv.cfg` (133 lines, ~90% covered) and `qwfwd/resources/example-configs/qwfwd.cfg` (35 lines).
- **GUARD (load-bearing): the C-vs-Go QTV config trap.** nQuake ships a *C-QTV* config (`mvdport`, `admin_password`, `floodprot`, `allow_http`) -- these knobs **do not exist** in the Go QTV (verified: present only in `fteqtv/`). nQuake's QTV config is a **divergence signal to note, never a describe-seed to fold in**. The Go QTV's equivalents are `qtv_password`, `listen_address`, the `fp_*` triplet, `http_*`. (QWFWD has no such split.)
- **Verify-xrefs for the QTV<->MVDSV handshake:** `research/repos/fteqw/fteqtv/source.c` (wire protocol: AUTH PLAIN/MD4/CCITT, SOURCE/SOURCELIST/DEMOLIST, `@`-chaining) and `research/repos/fteqw/specs/hosting.txt` (MVDSV-side enablement: `net_enable_qtv`, `sv_port_tcp`, `qtv_password`, `qtv_maxstreams`).
- **Deployment-default divergences to flag (not adopt):** QTV `maxclients` source=1000 vs nquake template=100; QWFWD `masters` 3 vs nquake's 4 (adds `qwmaster.ocrana.de`). Describe the source default; may note the divergence.

## Verify pass (reuse `validate-extractor`)

Post-ship correctness + reproducibility + no-silent-data-loss pass, same runbook as the C ports.

## Concept notes (deferred -- decide after describe)

Three evidence-based candidates, all See-also-linkable to the **already-shipped** MVDSV `qtv_*` rows (batch 2, commit `66cf40bc`; ledgers under `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_*.md`):

1. **Master-server registration / heartbeat** -- `masters*` across qwfwd+qtv+mvdsv (senders) vs ezquake (querier). *Strong.*
2. **MVD streaming + `parse_delay` ghosting** -- qtv `parse_delay`/`tick_time` <-> mvdsv MVD source <-> ezquake viewer. *Strong.*
3. **`qtv_password` cross-codebase auth matrix** -- PLAIN/MD4/CCITT/SHA3 negotiation; the parking doc's pre-identified payoff; verify-xref already in hand (`fteqtv/source.c`). *Strong.*

Authoring is **not** in this arc's committed scope -- the describe pass produces breadcrumbs, and the if/which decision is made against this list afterward.

## Execution pattern

**Mother-ledger** (operator's pattern, recorded in the parking doc; same as the KTX notes work): a mother terminal owns a living prep+learnings ledger; disposable per-batch workers read it warm, do one batch, and return a tight DELTA the mother appends -- so each batch starts better-calibrated without bloating the mother's context.

## Out of scope

- fteqtv as a primary extraction target (historical/protocol reference only).
- The `hub.quakeworld.nu` web QTV viewer.
- Re-opening the MVDSV `qtv_*` L1 rows -- they are the See-also anchors, not to be re-litigated.
- The pending MVDSV `qtv_password` description trim (related micro-decision, still awaiting operator go -- tracked in the parking doc, separate from this arc).

## Phasing sketch (for `arc-planner` to firm up)

Indicative, not binding -- planner sets the real slices, verification regimes, and per-task execution modes:

- **Phase 0 -- schema + scaffold:** the project-CHECK migration; extractor dir scaffold for both tools.
- **Phase 1 -- QWFWD extractor (libclang port) + vendored load path [tracer bullet]:** handlers + clang config -> JSON -> **establish the git-less `load-version --json` procedure** -> count/smoke. Fires a lean end-to-end slice through the novel load-integration risk using the *lower-risk* extractor, retiring that risk before the Go front-end lands.
- **Phase 2 -- QTV extractor (`go/ast`):** the novel front-end -> same JSON -> reuse Phase-1 load path -> count/smoke. One new variable (the Go walker) on a now-proven load path.
- **Phase 3 -- describe-fill (both):** mother-ledger, batched, source-verified, C/Go guard enforced.
- **Phase 4 -- validate + concept-note decision:** `validate-extractor`; then decide if/which of the 3 candidates to author.

## Related

- Parking seed: `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md`.
- Auxiliary-material sweep (2026-06-05): confirmed QWiki/admin-guides absent; the two config files + `fteqtv/source.c` + `hosting.txt` are the entire external corpus.
- `onboard-extractor` (C-port path, QWFWD), `describe-fill-synthesis`, `validate-extractor` skills.
- Memory: `project_extraction_pipeline_vision`, `reference_asset_loader_extractor_capabilities`, `project_qw_dev_head_not_releases`.
