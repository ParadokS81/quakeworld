You are drafting **Phase 3 -- describe-fill (QWFWD + QTV)** of the QTV + QWFWD Layer 1 extraction arc.

**Arc identity (read first -- halt if it does not match):** this arc is `2026-06-05-qtv-qwfwd-l1-extraction`. Scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. Phases 0-2 are approved (schema/plumbing; QWFWD libclang extractor; QTV Go extractor) -- both projects' knobs are now L1 rows in Postgres. THIS phase gives every knob a source-verified user/admin-facing description via the `describe-fill-synthesis` skill, under the operator's mother-ledger execution pattern. You are NOT re-extracting and NOT re-opening the MVDSV `qtv_*` rows (they are See-also anchors only -- D13).

This is a structured **planning** task. Output is one markdown file. You do NOT execute anything -- no synthesis runs, no DB writes, no skill invocations. The phase MD becomes input to a separate execution session.

**Working directory:** `/home/paradoks/projects/quakeworld`

**The load-bearing requirement of this phase (the operator is reviewing exactly this): the D6 C-vs-Go QTV guard must be ENFORCED in the MD, not merely cited.** D6 says: nQuake ships a *C-QTV* config (`mvdport`, `admin_password`, `floodprot`, `allow_http`) whose knobs DO NOT EXIST in the Go QTV target; that config is a divergence signal to note, never a describe-seed to fold in. Make the guard active and checkable. Concretely the MD MUST:
1. **Seed exclusion:** name the ONLY valid QTV describe seeds -- the vendored Go target's own `apps/slipgate-app/reference/qtv/resources/qtv.cfg` plus the Go register-sites (the Phase-2 L1 rows). The nQuake C-QTV config is explicitly NOT a seed and must not be fetched or folded in.
2. **Reject-list guard, per QTV knob:** every QTV describe worker's brief carries a hard check -- if a candidate description is seeded from or mentions `mvdport` / `admin_password` / `floodprot` / `allow_http` (or any knob absent from the Go L1 row set), REJECT it and re-source from the Go register-site. State the Go equivalents (`qtv_password`, `listen_address`, the `fp_*` triplet, `http_*`) so a worker can map a C-config hint to the correct Go knob instead of inventing the C one.
3. **Mother-ledger standing rule:** the guard lives in the mother ledger as a standing rule every disposable batch worker reads warm before its batch (not re-derived per worker).
4. **Verification probe:** a phase-boundary probe that asserts no QTV description references a C-only knob, and every described QTV knob maps to a Go register-site (`source_file` under the qtv tree). YES/NO.

**Required reading (all before drafting):**

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md`
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- D6 (the guard, load-bearing), D8 (describe-fill-synthesis is spec-locked Opus MAX, one knob per worker -- do NOT re-select model/effort), D9 (concept notes deferred -- this phase produces breadcrumbs, not notes), D10 (mother-ledger), D7 (ASCII), D11 (YES/NO probes), D12 (Postgres).
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md`.
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-template.md` -- mandatory shape; annotate each task's execution mode.
5. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-1-qwfwd-extractor.md` + `phase-2-qtv-extractor.md` -- the knob inventories now in L1 (the describe targets), the entity types per project, the version labels.
6. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the describe-pass section (seeds, the C-vs-Go guard, the verify-xrefs, the deployment-default divergences to flag-not-adopt).

**Phase-3-specific live recon (verify against the tree; do not plan from summaries):**

- The `describe-fill-synthesis` skill (read its SKILL.md under the skills dir) -- its per-knob contract, inputs, the ledger/output shape it produces (header / halt verdict / final description / per-clause enforce-trace / rationale / D6Record JSON), and the fact that it produces a ledger and does NOT write the DB itself.
- The sibling arc `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/` -- the describe methodology you are mirroring: the per-knob ledger shape, the batch/mother-ledger flow, the D7 two-tier approval gate, and crucially **the apply mechanism** (how a synthesized description actually reaches L1). Find the synthesize/apply script (e.g. `synthesize-mvdsv.ts` / a generic applier) and the **owned-row guard** (F-D4a; `derive-entity-description.ts`) that stops the derive-on-reload tail from clobbering an owned description. Determine whether that apply path + guard are project-agnostic (work for qtv/qwfwd as-is) or need a qtv/qwfwd variant. This is the phase's central integration question -- resolve it from source, the way Phase 1 resolved the load path.
- `description_origin` / `description_provenance` fields -- the synthesized-prose origin value and how the origin vocabulary is guarded (a NEW origin value breaks the origin_vocabulary probe; use the established 'synthesized' value -- confirm the exact token in source).
- Seeds: `apps/slipgate-app/reference/qtv/resources/qtv.cfg` (Go target config) and `apps/slipgate-app/reference/qwfwd/resources/example-configs/qwfwd.cfg`.
- Verify-xrefs (for the QTV<->MVDSV handshake knobs): `research/repos/fteqw/fteqtv/source.c` (wire protocol) and `research/repos/fteqw/specs/hosting.txt` (MVDSV-side enablement).
- See-also anchors: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_*.md` -- the shipped MVDSV `qtv_*` rows the new descriptions should See-also-link.

**Phase 3 scope (what this phase delivers):**

1. **The mother-ledger setup (D10):** the living prep+learnings ledger file in the plan dir; the standing rules every batch worker reads warm (including the D6 guard); the DELTA-append loop. Define the ledger shape and the batch-worker brief.
2. **Batched per-knob describe (D8):** group the QWFWD knobs (cvars / commands / cmdline / info_keys) and the QTV knobs (cvars / commands) into batches; dispatch one `describe-fill-synthesis` worker per knob at the skill's spec-locked Opus MAX. Each worker source-verifies against the register-site (the config/comment is a hint; the source is ground truth), produces a per-knob ledger, and returns a tight DELTA the mother appends.
3. **The apply step:** the operator-gated path that writes the approved descriptions into L1 with `description_origin='synthesized'` and provenance, and the owned-row guard that protects them on reload (per the recon above; reuse the sibling arc's machinery if project-agnostic, else specify the qtv/qwfwd variant).
4. **The D6 guard** woven through (seed exclusion + reject-list + standing rule + probe), as specified above.
5. **Deployment-default divergences flagged not adopted:** QTV `maxclients` source=1000 vs nquake=100; QWFWD `masters` source=3 vs nquake=4. Describe the source default; the divergence may go in reasoning, never in the description.
6. **See-also wiring** to the shipped MVDSV `qtv_*` rows.
7. **Breadcrumbs for Phase 4's concept-note decision** (D9) -- capture, do not author notes.

**Verification (phase boundary) -- Postgres, YES/NO, self-contained:** coverage (every qwfwd/qtv knob has an owned, source-verified description); the **D6 probe** (no QTV description references a C-only knob; every QTV described knob maps to a Go `source_file`); description_origin uses the established 'synthesized' value (origin_vocabulary probe green); the owned-row guard holds across a reload (a re-load does not clobber owned descriptions); provenance/jsonb probes green; D7-style batch approval recorded.

**Drafting rules:** ASCII only (D7). describe-fill-synthesis stays at its spec-locked Opus MAX, one knob per worker -- do NOT re-select (D8). No concept-note authoring (D9). Postgres in every probe (D12). The describe workers + the mother orchestration are subagent; any pure-doc edits are inline. Annotate every task's execution mode.

**Step by step:**
1. Read all required + recon files. Internalize D6/D8/D10 and the sibling arc's apply mechanism.
2. Run live recon (the describe-fill-synthesis skill contract; the sibling arc's ledger shape + apply script + owned-row guard; the description_origin token; the seeds + xrefs; the See-also anchors).
3. Draft `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-3-describe-fill.md` per `phase-template.md`. Make the D6 guard concrete and checkable (the four mechanisms above). Make the apply mechanism explicit (reuse vs variant, with the owned-row guard). If the QWFWD-vs-QTV surface argues for a 3a/3b split, surface it in Open questions but default to one phase.
4. **Verification sub-agent:** the `Agent` tool for nested sub-agents is NOT available to you. Perform the verification brief (bottom of `phase-template.md`) yourself by reading/grepping live source against your draft, and say so. (The planner will run an INDEPENDENT verifier afterward and the operator will eyes-on the D6 guard specifically -- do your own pass thoroughly regardless.)
5. Apply your findings; decisions win over conflicts (note rejections in "Open questions").
6. Halt. Reply with: the MD path; your self-verification counts (CRITICAL/SUBSTANTIVE/ADVISORY); open questions; an EXPLICIT statement of how the D6 guard is made load-bearing (the four mechanisms) and how the apply mechanism reaches L1; and a recommendation.

Do NOT proceed to Phase 4. Do NOT execute anything. Drafting is paper-only.
