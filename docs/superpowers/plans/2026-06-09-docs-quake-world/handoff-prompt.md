# Handoff prompt -- shape template for per-phase drafter prompts

**This file is a TEMPLATE, not a prompt to run.** The operator does not paste this directly. After the slicing locks, arc-planner writes one pre-substituted, self-contained `phase-<N>-drafter-prompt.md` per phase, following the shape below. Those per-phase files are **file-as-prompt**: the operator opens a fresh `claude` terminal and types `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-<N>-drafter-prompt.md` -- the file content IS the first message; no wrapper, no copy-paste markers.

The shape every per-phase prompt follows:

---

## [ARC IDENTIFICATION -- top of every per-phase prompt, verbatim]

```
You are drafting Phase <N> of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). This arc builds the WEBSITE that
auto-projects QW Oracle Layer 1 into a per-codebase browsable reference
(VitePress + Tailwind/daisyUI on Cloudflare Pages).

STOP and re-check which arc you are in if you see any of these -- they belong
to a DIFFERENT, already-shipped arc and mean you opened the wrong prompt:
  - `category_inferred` SQL apply-scripts, `01-mvdsv-antilag-synth.sql`,
    taxonomy tables assigning categories to MVDSV/QTV/QWFWD/QWCL
      -> that is the PRECURSOR `2026-06-09-docs-l1-enrichment` (same date
         prefix, different arc). It enriched the DATA. THIS arc consumes that
         data to build a SITE. Do not re-run enrichment.
  - describe-fill / synthesis of L1 descriptions, F-D4a guards, origin_vocabulary
      -> that is the describe-fill arc. Not this one.
  - Postgres migrations, schema.ts, MCP tool ports
      -> qw-oracle Arc 1 / KTX onboarding. Not this one.
This arc touches `apps/docs-web/` (new) and EXTENDS (does not rewrite)
`apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`.
```

## [TASK FRAME]

```
This is a structured PLANNING task. Your output is a markdown file -- the
Phase <N> MD. You do NOT execute anything (no build-snapshot runs, no pnpm
install, no dev server, no deploy). The phase MD becomes input to a separate
execution session later.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-<N>-<slug>.md
```

## [REQUIRED READS -- numbered, in order]

```
1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (D1-D21, full)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md  (the shape you produce)
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md  (the spec)
6. <phase-specific live-source reads -- substituted per phase, e.g.:
     - Phase 1: apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts (full),
                apps/qw-oracle/SCHEMA.md (entities + the per-type version tables),
                apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts line 683-744
                (the project dispatch + default-version map you extend)
     - Phase 2a/2b: research/repos/slipgate/web/ (vikpe's Tailwind v4 + daisyUI
                theme block to lift), the Phase 1 output JSON shape,
                Context7 for VitePress + Tailwind v4 + daisyUI current docs
     - Phase 4: apps/qw-oracle/curated/ (concept-note related_entities for the
                entity->guide reverse-index, targeting the docs guides portal)
     - Phase 5: the deploy skill, infra patterns for CF Pages>
```

## [DRAFTING RULES -- substituted with the decisions this phase most depends on]

```
- ASCII only. No emoji. ASCII hyphen-minus, not em-dash / en-dash.
- Follow phase-template.md EXACTLY: section order, section names, the required
  per-task Execution-mode column. Don't add or drop sections.
- HARD GATE (Phase 1): do NOT modify build-snapshot's ezquake/qwcl/qw emit
  paths or DEFAULT_OUTPUT_DIR in any way that changes slipgate's consumed files
  (F1/D12). The docs emit is a SEPARATE path writing to a docs-owned dir. Ship a
  slipgate-parity probe in Verification.
- Uniform record shape (D13): emit the SAME record for every type, omit absent
  fields (do not null-fill).
- Per-codebase frozen version (D16): qtv=1.16-dev, qwfwd=1.40-dev, qwcl=2.33,
  the rest=head. NOT head for those three.
- Category source (D17): ezQuake reads AST `groups`; the other 5 read
  `category_inferred`.
- Presentation/logic decoupling (D15) + type-generic renderer (D14): no
  data-fetch or derivation inside .vue files; components are codebase- and
  type-agnostic. (Render phases.)
- Cross-link scope (D19, amended 2026-06-09): cvar->cvar within one codebase;
  entity->guide (docs guides portal, NOT wiki) only where a note anchors the
  entity (no dead links; dormant in v1 -- no notes/portal yet). (Phase 4.)
- If a step ships file content, ship the FULL content, not a sketch. "Engineer
  ports X" is a smell -- inline it or split it.
- Phase MDs have no length cap; don't cut tasks to fit. Split only per the
  template's split-vs-don't guidance; default to not splitting.
```

## [STEP-BY-STEP]

```
Step 1: Read all required files. Note which review-findings apply to Phase <N>.
Step 2: Recon the live codebase (Read/grep/ls; Context7 for library docs).
        Phase-specific recon is substituted in.
Step 3: Draft the phase MD per phase-template.md, with an execution-mode
        annotation + rationale on every task.
Step 4: Dispatch the verification sub-agent (brief in phase-template.md, paths
        filled in for this phase).
Step 5: Apply findings. A finding that contradicts decisions.md is rejected with
        a one-line rationale in "Open questions" (decision wins).
Step 6: Halt. Report to the operator: path to the MD, sub-agent finding counts
        (CRITICAL/SUBSTANTIVE/ADVISORY), open questions needing operator input,
        and a recommendation ("ready for review" / "needs another pass").

Do NOT proceed to phase N+1. Do NOT execute anything. Drafting is paper-only.
```

## [VERIFICATION SUB-AGENT]

Paste the brief from `phase-template.md` ("Verification sub-agent dispatch"), with absolute paths filled in for this phase's MD, `decisions.md`, and `review-findings.md`. `subagent_type=Explore`. It reads and reports under 400 words; it does not modify files.

---

## Recovery: a phase MD comes back wrong

If a drafted phase MD is still buggy after sub-agent verification, do NOT re-prompt the same (now-polluted) terminal. Open a fresh terminal, re-run the same `phase-<N>-drafter-prompt.md`, and prepend a one-paragraph hint: "The previous draft of phase-<N>-*.md had these issues: <X>, <Y>. Read it at <path>, then redraft from scratch; don't preserve the old draft's bugs." (Operator memory `feedback_fresh_context_for_execution.md`.)
