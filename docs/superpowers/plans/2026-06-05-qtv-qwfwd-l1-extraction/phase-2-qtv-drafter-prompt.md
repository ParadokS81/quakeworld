You are drafting **Phase 2 -- QTV Go extractor (`go/ast`)** of the QTV + QWFWD Layer 1 extraction arc.

**Arc identity (read first -- halt if it does not match):** this arc is `2026-06-05-qtv-qwfwd-l1-extraction`. Scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. THIS phase is QTV only (the Go target: `QW-Group/qtv`, slug `qtv`, vendored at `apps/slipgate-app/reference/qtv/`). If your material is about the C QWFWD target, the KTX/MVDSV describe-fill arc, or libclang handlers, you are in the wrong phase -- STOP. QWFWD was Phase 1 (already approved); you REUSE its load path, you do not rebuild it.

This is a structured **planning** task. Output is one markdown file. You do NOT execute anything -- no `go run`, no `load-version`, no migrations, no MCP server. The phase MD becomes input to a separate execution session.

**Working directory:** `/home/paradoks/projects/quakeworld`

**What makes this phase special:** QTV is the pipeline's FIRST non-C, non-Python extractor -- a native Go `go/ast` program (~150 lines) that walks the Go registration call-sites and emits the SAME per-type JSON the loader already consumes. Two things must be unmistakable in the MD: (1) the Go extractor's JSON output is byte-for-byte the same CONTRACT as the C extractors (so the existing `load-cvars.ts` / `load-commands.ts` adapters ingest it unchanged), and (2) it loads via the **reusable `load-version --json` recipe Phase 1 already proved** (D1: NOT extract-tag -- extract-tag is Python+git and cannot drive a Go, no-`.git` target). You inherit Phase 1's load path; you do not reinvent it.

**Convention discipline (this phase has no operator eyes-on -- the planner is the gate, so get conventions right):**
- **Source-truth fidelity.** cvar/command names + defaults come from the literal arguments of the registration call-sites. Invent nothing. If an argument is not a string literal (computed name), recon whether macro/const resolution recovers it (mirror the QWFWD `prx` lesson -- do not drop a real knob on an importance judgment; per F7 the extractor reports the truth).
- **Plain names.** Entity names are the literal registered strings -- no brackets, no invented prefixes (the Phase-1 `port`/`ip` lesson).
- **Determinism.** The Go program MUST sort output by name so re-runs produce an identical file (the reproducibility probe depends on it).

**Required reading (all before drafting):**

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- D1 (load-version recipe, not extract-tag), D4 (version label + `--commit` fallback), D5 (no new types; payload fields), D7 (ASCII), D11 (self-contained probes), D12 (Postgres).
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md` -- F2, F5, F7 are yours.
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-template.md` -- mandatory shape; annotate each task's execution mode.
5. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-1-qwfwd-extractor.md` -- your TEMPLATE for the load path and verification shape. Task 7 is the reusable load recipe (substitute `qtv`, the QTV version label, `qtv-*-ast.json`). The V1-V9 verification chain is the shape to mirror. The JSON `ast` field contracts (cvars, commands) are the SAME -- reuse them.
6. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the approved design (QTV idiom: `qvs.Reg`/`qvs.RegEx` + `cmd.Register`; ~41 cvars, ~12 commands, 0 CLI flags, 0 env vars).

**Phase-2-specific live recon (verify against the tree):**

- `apps/slipgate-app/reference/qtv/` -- the Go target. Recon: every `qvs.Reg(...)` and `qvs.RegEx(...)` call-site (cvars; likely `pkg/qtv/var.go` + others) and every `cmd.Register(...)` call-site (commands; `pkg/qtv/cmd.go` + others). Determine the EXACT signatures: `qvs.Reg(name, default)` -- how many args, what is each? `qvs.RegEx(...)` -- does it carry flags / an on-change callback / bounds? `cmd.Register(name, fn)` -- name + handler. These signatures decide which `ast` fields you can populate. Also find the QTV version string (the `*version` cvar / build constant, e.g. in `pkg/qtv/`); confirm QTV has 0 cmdline_param and 0 info_key surface (the spec says 0 CLI flags / 0 env vars -- VERIFY against source; if a serverinfo/userinfo surface exists, treat it like QWFWD's info_keys).
- `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts` + `load-commands.ts` -- the EXACT JSON contract your Go program must emit: payload fields `vars` / `commands`, and the per-entity `{name, ast:{...}}` with the `ast` sub-fields each adapter reads. Match them exactly (a missing/renamed field silently drops data). Map Go-source facts to these fields; set fields QTV does not have to `null` (e.g. if `qvs.Reg` has no flags, `flags_raw`/`flag_names` are null; if no on-change, `on_change` is null).
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- for the output-contract conventions + the `_stats` block shape (source_total / count / coverage counts), which your Go `finalize` equivalent should emit.
- Phase 1's `output/` filenames convention (`qwfwd-variables-ast.json`, `qwfwd-commands-ast.json`) -- mirror as `qtv-variables-ast.json`, `qtv-commands-ast.json`.

**Phase 2 scope (what this phase delivers):**

1. **The Go extractor program** at `scripts/extractors/qtv/` (e.g. `extract.go`, stdlib-only so it runs via `go run` with no module compile against qtv). It uses `go/parser` + `go/ast` + `go/token` (FileSet for source_file/source_line) to walk the qtv source `.go` files, find `CallExpr` nodes for `qvs.Reg` / `qvs.RegEx` (-> cvar rows) and `cmd.Register` (-> command rows), extract the literal string name + default + any flags/handler, and emit `qtv-variables-ast.json` + `qtv-commands-ast.json` in the established contract. Sort by name; emit `_stats`. Decide and document the invocation (`go run extract.go --src <qtv-path> --out <dir>` or similar) -- this is the Go analog of Phase 1's `extract.py` run; it is run standalone, NOT via extract-tag (D1).
2. **The load step**: reuse Phase 1's Task-7 recipe with `qtv` substituted -- `load-version --json --project qtv --version <QTV-version> --type cvar|command --commit <D4 fallback> --ordinal 1` for each type. Only the types QTV actually has (cvar, command -- confirm no others).
3. **Update `PROJECT_DEFAULT_SNAPSHOT_VERSION[qtv]`** in `build-snapshot.ts` from the provisional `'head'` to the real QTV version label (the remaining Phase 0 Q1 carry-forward; Phase 1 already did qwfwd).
4. **Record per-type entity counts** (the Phase 4 F1 baseline for qtv).

**Verification (phase boundary) -- mirror Phase 1's V-chain, Postgres, self-contained:** extractor `go run` produces output -> payload field names correct -> `load-version` runs clean -> Postgres rows present (counts match `_stats`) -> MCP `lookup_entity` returns a known qtv cvar (pick one verified to exist in source) -> versions row exists -> idempotent re-load -> reproducible re-extract (`git diff --stat` on output empty) -> `bunx tsc --noEmit` green.

**Drafting rules:** ASCII only (D7). Reuse the proven `load-version --json` recipe (D1); never extract-tag. Postgres in every probe (D12). No new entity types (D5). Every task gets an execution-mode annotation (the Go-program authoring is subagent code synthesis; the build-snapshot one-liner is inline).

**Step by step:**
1. Read all required + recon files. Note F2/F5/F7 and reuse Phase 1's load recipe + contract.
2. Run live recon (the `qvs.Reg`/`qvs.RegEx`/`cmd.Register` signatures + call-sites; the QTV version string; confirm the 2-type surface; the loader contracts).
3. Draft `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-2-qtv-extractor.md` per `phase-template.md`. Make the JSON contract reuse explicit (point at the exact adapter-read fields) and the load recipe a Phase-1 reuse.
4. **Verification sub-agent:** the `Agent` tool for nested sub-agents is NOT available to you. Perform the verification brief (bottom of `phase-template.md`) yourself by reading/grepping live source against your draft, and say so. (The planner will run an INDEPENDENT verifier afterward AND apply convention scrutiny -- do your own pass thoroughly regardless.)
5. Apply your findings; decisions win over any conflicting finding (note rejection in "Open questions").
6. Halt. Reply with: the MD path; your self-verification counts (CRITICAL/SUBSTANTIVE/ADVISORY); open questions; explicit confirmation that the Go extractor emits the SAME JSON contract the C adapters read and loads via the Phase-1 recipe; and a recommendation.

Do NOT proceed to Phase 3. Do NOT execute anything. Drafting is paper-only.
