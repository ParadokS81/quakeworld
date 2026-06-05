You are drafting **Phase 1 -- QWFWD extractor + vendored load path (the tracer bullet)** of the QTV + QWFWD Layer 1 extraction arc.

**Arc identity (read first -- halt if it does not match):** this arc is `2026-06-05-qtv-qwfwd-l1-extraction`. Scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are adding two QuakeWorld streaming/forwarding tools (Go QTV `qtv`, C QWFWD `qwfwd`) to the qw-oracle Layer 1 pipeline. THIS phase is QWFWD only (the C target). If your material talks about KTX/MVDSV describe-fill codes (F-D4a, B1-B5, V-pass, D6/D7), the KTX Layer-B shape catalog, or QTV's Go `qvs.Reg`/`cmd.Register` as the thing you are extracting here, you are in the wrong phase/arc -- STOP and tell the operator. (QTV is Phase 2; the ktx/mvdsv arc is a sibling you only reference.)

This is a structured **planning** task. Output is one markdown file. You do NOT execute anything -- no extractor runs, no `load-version`, no migrations, no MCP server start. The phase MD becomes input to a separate execution session.

**Working directory:** `/home/paradoks/projects/quakeworld`

**What makes this phase special -- the load-bearing point the MD must nail:** this is the arc's tracer bullet. Its job is to prove the **vendored, git-less `load-version --json` procedure works end-to-end** using the lower-risk libclang extractor, so Phase 2 (the novel Go front-end) can reuse a proven load path. The MD must make the full chain explicit and individually verifiable -- do NOT collapse it to "then load the JSON." The chain is: QWFWD source -> libclang handlers -> per-type JSON in `scripts/extractors/qwfwd/output/` -> `load-version --json` (NOT extract-tag, D1) -> rows in Postgres -> an MCP smoke query returns a known knob -> re-load is idempotent (no new rows) -> re-extract is reproducible (empty diff). Each link gets its own verification probe (D11). And the load procedure must be written up as a **reusable recipe** that Phase 2 inherits verbatim.

**Required reading (all before drafting):**

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- especially D1 (load-version, not extract-tag), D4 (version label + `--commit` fallback), D5 (no new types; the four payload fields), D7 (ASCII), D11 (self-contained YES/NO probes), D12 (Postgres).
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md` -- F2, F5, F6, F7 are yours.
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-template.md` -- the mandatory shape; annotate each task's execution mode.
5. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-0-schema-plumbing.md` -- your INPUT phase. Note its Outputs (schema accepts qwfwd; `versions` row is created on first `load-version`; `PROJECT_DEFAULT_SNAPSHOT_VERSION[qwfwd]` is a provisional `'head'` you must update; `--ordinal` is required on first load -- Q4).
6. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the approved design.

**Phase-1-specific live recon (verify against the tree; do not plan from summaries):**

- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- the canonical C-port onboarding steps.
- `apps/qw-oracle/scripts/extractors/mvdsv/` -- the CLOSEST analog. Inventory every file + role; this is the structure to mirror (driver `extract.py`, per-type `_handler_*.py`, `output/`). Read the handler that matches Cvar registrations and the one that matches Cmd_AddCommand.
- `apps/qw-oracle/scripts/extractors/extractor_lib/` -- the shared rails: `_visitor.py` (base Visitor + the setup/start_file/visit_cursor/end_file/finalize contract), `clang_config.py` (where `clang_args_qwfwd_for()` goes + how existing `clang_args_<project>_for` are shaped), `_source.py`, `_cvar_shared.py`, `_resolve.py`.
- `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts`, `load-commands.ts`, `load-cmdline-params.ts`, `load-info-keys.ts` -- the EXACT JSON contract each emitted file must satisfy: top-level payload field (`vars` / `commands` / `params` / `info_keys`) + the per-entity `{name, ast:{...}}` shape + which `ast` sub-fields each adapter reads. Your handlers must emit exactly these.
- `apps/qw-oracle/scripts/load-knowledge/load-version.ts` + `index.ts` -- the `load-version --json --project --version --commit --ordinal` CLI; how `loadVersion` calls `upsertVersion` to create the `versions` row; the `resolveOrdinal` behavior (Q4).
- `apps/slipgate-app/reference/qwfwd/` -- the C target. Recon: the `Cvar_Get` / `Cvar_Register` registration call-sites in `src/` AND the `cvar.c` implementation/pass-through that must be EXCLUDED (F6 -- the handler keys on string-literal-name + default registration sites, not the cvar subsystem itself); `Cmd_AddCommand` sites; the two positional command-line args; any serverinfo (`info_key`) surface; the `QWFWD_VERSION` constant for the version label (D4); `CMakeLists.txt` for include paths / `-D` defines feeding `clang_args_qwfwd_for()`.
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` -- for the reproducibility + count-reconciliation discipline (translate any sqlite examples to Postgres -- D12/F3).

**Phase 1 scope (what this phase delivers):**

1. **Scaffold `scripts/extractors/qwfwd/`** mirroring the mvdsv layout: `extract.py` driver + per-type handlers (`_handler_cvars.py`, `_handler_commands.py`, `_handler_cmdline.py`, `_handler_info_keys.py` as the surface requires) + `output/`.
2. **`clang_args_qwfwd_for()` in `extractor_lib/clang_config.py`** -- include paths + `-D` defines derived from the qwfwd build system (CMakeLists). Add platform variants only if registration sites sit behind platform `#ifdef`s.
3. **Handlers** matching the QWFWD idioms, emitting the four per-type JSON shapes EXACTLY as the loader adapters expect (D5). Exclude the `cvar.c` machinery (F6). Counts are whatever the extractor finds; the design's hand-counts are not a gate (F7).
4. **The reusable vendored load procedure**: `load-version --json` per type with `--project qwfwd --version <QWFWD_VERSION> --commit <upstream-sha-or-version-constant per D4/F5> --ordinal 1`. Write this as a labeled, copy-pasteable recipe block; Phase 2 will reuse it with qtv substituted.
5. **Update `PROJECT_DEFAULT_SNAPSHOT_VERSION[qwfwd]`** in `build-snapshot.ts` from the provisional `'head'` to the real QWFWD version label (Phase 0 Q1 carry-forward).
6. **Record per-type entity counts** (the baseline Phase 4 will pin as F1 floor probes).

**Verification (phase boundary) -- Postgres, YES/NO, self-contained:**
- Reproducibility: re-run `extract.py`; `git diff --stat` on `scripts/extractors/qwfwd/output/` is empty.
- Count reconciliation: each JSON `_stats.count` equals `SELECT count(*) FROM entities WHERE project='qwfwd' AND type='<t>'`.
- **End-to-end MCP smoke (the proof the load path works):** start/query the MCP server's `lookup_entity` for a known qwfwd knob (e.g. the `masters_query` cvar, or a known command) and confirm the row comes back. This exercises source -> extractor -> JSON -> load-version -> Postgres -> MCP in one probe.
- Idempotency: re-run the `load-version` calls; entity counts identical, no new rows, no errors.
- `bunx tsc --noEmit` green (the build-snapshot edit compiles).

**Drafting rules:** ASCII only (D7). `load-version --json`, never extract-tag, for qwfwd (D1). Postgres in every probe (D12). No new entity types (D5). Every task gets an execution-mode annotation; extractor handler authoring + clang config are subagent (code synthesis -- Sonnet medium or MAX per the handler's complexity), the build-snapshot one-line edit is inline.

**Step by step:**
1. Read all required + recon files. Note F2/F5/F6/F7 and Phase 0's Outputs.
2. Run live recon (mvdsv handler shapes; the four loader adapter contracts; qwfwd registration call-sites + the cvar.c exclusion; QWFWD_VERSION; CMakeLists include/defines).
3. Draft `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-1-qwfwd-extractor.md` per `phase-template.md`. Make the end-to-end chain explicit with a probe per link; write the load recipe as reusable.
4. **Verification sub-agent:** the `Agent` tool for spawning a nested sub-agent is NOT available to you in this session. So perform the verification brief (bottom of `phase-template.md`) YOURSELF by reading/grepping live source against your draft, and say so in your report. (The planner will run an INDEPENDENT fresh-context verifier on your draft afterward -- do your own pass thoroughly regardless.)
5. Apply your findings. If one contradicts `decisions.md`, decisions win -- note the rejection in "Open questions" with a one-line rationale.
6. Halt. Reply with: the drafted MD path; your self-verification finding counts (CRITICAL/SUBSTANTIVE/ADVISORY); open questions needing operator attention; and a recommendation (ready for review / needs another pass). Call out explicitly whether the MD proves the load-version path end-to-end (the operator will be checking exactly this).

Do NOT proceed to Phase 2. Do NOT execute anything. Drafting is paper-only.
