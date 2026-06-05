# Handoff prompt -- generic shape for per-phase drafting terminals

This is the **template** for the per-phase drafter prompts. The operator (or arc-orchestrator) does NOT paste this file directly. Instead, generate a per-phase file `phase-<N>-drafter-prompt.md` by substituting `<PHASE_NUMBER>` / `<PHASE_NAME>` / the phase-specific reads, then launch a fresh `claude` terminal and attach it with `@docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-<N>-drafter-prompt.md` as the first message.

Per-phase prompt files are **file-as-prompt**: their content IS the literal first message; no wrapper, no "open a terminal" preamble, no BEGIN/END markers. The block below (between the horizontal rules) is that content, with placeholders.

---

You are drafting **Phase `<PHASE_NUMBER>` -- `<PHASE_NAME>`** of the QTV + QWFWD Layer 1 extraction arc.

**Arc identity (read this first -- halt if it does not match):** this arc is `2026-06-05-qtv-qwfwd-l1-extraction`. Its scaffold lives at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are adding two QuakeWorld streaming/forwarding tools (Go QTV `qtv`, C QWFWD `qwfwd`) to the qw-oracle Layer 1 pipeline. If the material you are handed talks about KTX/MVDSV describe-fill finding codes (F-D4a, B1-B5, V-pass, D6/D7 batch gates), the KTX Layer-B shape catalog, or `mvdsv-*-ledger-*.md` files as the thing you are editing, you are in the WRONG arc directory -- STOP and tell the operator. (Those are the sibling arc `2026-05-16-ktx-mvdsv-l1-describe-fill`, which this arc only references as See-also anchors.)

This is a structured **planning** task. Your output is one markdown file. You do NOT execute anything -- no migrations, no extractor runs, no `load-version`, no docker. The phase MD you write becomes input to a separate execution session.

**Working directory:** `/home/paradoks/projects/quakeworld`

**Required reading (read all before drafting; do not skip):**

1. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/README.md` -- phase index, read-order.
2. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/decisions.md` -- locked cross-cutting decisions D1-D13. Every phase respects these.
3. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/review-findings.md` -- pre-flight findings; find which touch Phase `<PHASE_NUMBER>` (ownership table at the bottom).
4. `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-template.md` -- the mandatory shape for the MD you produce. Follow section order exactly; include the per-task execution-mode annotation.
5. `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` -- the approved design.
6. The arc seed `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md` -- codebase landscape, operator notes, mother-ledger pattern.

`<PHASE_SPECIFIC_READS>` -- the extractor playbook / validation runbook / mvdsv analog / load-knowledge adapters / sibling-arc describe methodology, as the phase requires. (Filled in per phase.)

**Drafting rules (from decisions.md):**
- ASCII only. No emoji. ASCII hyphen-minus, not em/en-dash (D7).
- Load via `load-version --json`; never invoke or extend `extract-tag.ts` for qtv/qwfwd (D1).
- Schema changes are a NEW migration file (020+); never edit applied `002` (D2).
- No new entity types -- map to cvar/command/cmdline_param/info_key (D5).
- Postgres, not sqlite, in every verification probe (D12).
- The describe pass uses `describe-fill-synthesis` at its spec-locked Opus MAX -- do not re-select model/effort for that synthesis (D8).
- Every task gets an execution-mode annotation (inline vs subagent + model + effort + one-line rationale). Default subagent for code synthesis; inline only for pure-text edits with full content shipped inline.

**Step by step:**

1. Read all required files. Note the findings that touch Phase `<PHASE_NUMBER>`.
2. Run live recon on the real source this phase touches (Read/grep/ls). Do NOT plan from the scaffold's summaries -- verify against the tree. Examples: Phase 0 -> `pg_constraint` names + the 12 `Record<Project>` sites; Phase 1 -> the mvdsv extractor handler shapes + qwfwd registration call-sites + the loader adapter field names; Phase 2 -> the qtv `qvs.Reg`/`cmd.Register` call-sites + a Go AST approach; Phase 3 -> the sibling-arc ledger shape + the two describe seeds + the D6 guard knobs; Phase 4 -> the VALIDATION-RUNBOOK (translate sqlite -> Postgres) + `quality-grid.ts` probe factories.
3. Draft the phase MD at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/phase-<N>-<name>.md`, following `phase-template.md` exactly.
4. Dispatch the verification sub-agent (the brief is at the bottom of `phase-template.md`), `subagent_type=Explore`, Sonnet medium, with absolute paths substituted.
5. Apply the sub-agent's findings. If a finding contradicts `decisions.md`, decisions win -- note the rejection in "Open questions" with a one-line rationale.
6. Halt. Reply to the operator with: the path to the drafted MD; the sub-agent finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions needing operator attention; and a recommendation -- "ready for review" or "needs another pass."

Do NOT proceed to Phase `<PHASE_NUMBER>`+1. Do NOT execute anything. Do NOT modify the live codebase. Drafting is paper-only.

---

## Optional orientation hint (prepend when a redraft is needed)

If a prior draft of this phase came back wrong, prepend one paragraph: "The previous draft of `phase-<N>-*.md` had these issues: <X>, <Y>. Read it at <path>, then redraft from scratch -- do not preserve the old draft's bugs." Use a fresh terminal for the redraft (polluted context is the reason the first draft failed) -- operator memory `feedback_fresh_context_for_execution`.
