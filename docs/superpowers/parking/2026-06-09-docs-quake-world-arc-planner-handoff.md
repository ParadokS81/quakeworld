# Fresh-terminal handoff: arc-planner for docs.quake.world

> Paste into a fresh `claude` terminal in the quakeworld monorepo (main tree). Or tell it: *"Read `docs/superpowers/parking/2026-06-09-docs-quake-world-arc-planner-handoff.md` and follow it."*

The docs.quake.world design brainstorm is complete and drained into a spec. Your job: run **arc-planner** to turn that spec into an executable arc (the six-artifact scaffold + per-phase MDs).

## Invoke first
- `arc-planner`. This is arc-shaped: multi-phase, spec-required, per-phase verification, fresh-terminal execution. Do NOT re-run the brainstorm or relitigate the design -- the spec's decisions are locked.

## Primary input
- **`docs/superpowers/specs/2026-06-09-docs-quake-world-design.md`** -- THE spec. Read fully. It carries 11 locked decisions (D1-D11), a suggested 5-phase breakdown (section 12), and a verified-data appendix (section 13). Lift D1-D11 into `decisions.md` verbatim.

## Required reads (in order)
1. The spec (above).
2. **`docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md`** -- the federation spine: stack (VitePress + Tailwind v4/daisyUI on Cloudflare Pages), hosting, monorepo layout, why docs is Arc 1. Locked architecture; do not reopen.
3. **`apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`** -- the export pipeline Phase 1 extends. **CRITICAL prerequisite/risk:** it currently emits slipgate-shaped JSON for ezquake/qwcl/qw and THROWS for the other projects. Extending it to all 6 codebases for docs MUST preserve the existing slipgate-app consumer (shape parity) -- slipgate reads these exact files. "Don't break slipgate's snapshot consumption" is a hard gate on Phase 1.
4. **`apps/qw-oracle/SCHEMA.md`** -- L1 field reference (entities + per-type version tables); the fields the export projects.
5. **`docs/superpowers/plans/2026-06-09-docs-l1-enrichment/`** -- the SHIPPED precursor. The data Phase 1 exports is ready (6 codebases categorized + described). Do NOT re-plan enrichment.

## Key planning context
- **Precursor shipped 2026-06-09:** L1 is docs-ready for 6 codebases (ezQuake/KTX/MVDSV/QTV/QWFWD/QWCL). FTE deferred (active project, no categories yet; operator may consult Spike).
- **Suggested phasing (spec section 12 -- validate against `references/arc-phase-archetypes.md`, adjust if better cut points exist):**
  1. L1 export pipeline -- extend build-snapshot to all 6 + freeze the per-codebase JSON shape (gate: shape correct + slipgate unbroken).
  2. VitePress scaffold (`apps/docs-web`, pnpm) + ezQuake as the full-model template (browse lists, category filter, inline cards, player type words, source links, version-walk).
  3. Fan-out to the other 5 codebases (graceful degradation per each one's data).
  4. Cross-links + enhancements (cvar->cvar auto-link, entity->wiki reverse-lookup, source links).
  5. Cloudflare Pages deploy + vikpe DNS.
- **Cross-cutting pattern (D11):** graceful degradation -- every field/enhancement renders where data exists, omits cleanly elsewhere. Every phase respects it.
- **Build constraint:** presentation decoupled from data (dumb Vue components take data + render; data-fetch/state/logic in their own modules) so a later swap to infiniti's Solid+daisyUI platform never touches logic. daisyUI tokens now.
- **New subtree:** `apps/docs-web` is its own pnpm-workspaces project (qw-oracle backend stays `npm --no-workspaces`; no conflict). This is NOT slipgate -- the src-tauri rsync constraint does not apply.

## Per-task execution-mode guidance
- Annotate each task subagent-vs-inline + model + effort. Two-axis selection (size x effort); Sonnet medium floor / Opus MAX ceiling. The build-snapshot extension (touches a shared producer, must not break slipgate) warrants more care; VitePress scaffolding + Vue components are lighter.
- Any subagent fan-out: Sonnet + low concurrency + pacing (shared rate limit); report honest counts.

## Operator working preferences
- One question at a time; plain English first; be decisive (recommend, don't poll).
- Output discipline: ASCII only in code/regex; no em/en dashes; no AI-slop voice.
- Momentum over ceremony; operator does NOT touch git -- Claude commits to `main` directly.
- Operator works at the intent level, not the technical-review gate -- arc execution wants an overseer terminal for the technical gate.

## First actions
1. Invoke `arc-planner`.
2. Read the spec + roadmap + `build-snapshot.ts` cold.
3. Validate the 5-phase slicing (verification-regime + context-budget per phase) against the archetypes.
4. Build the six-artifact scaffold; lift D1-D11 into decisions.md; record the build-snapshot/slipgate-parity prerequisite in prerequisites + review-findings.
5. Gate at every phase boundary per the skill.

When in doubt: the spec's decisions are locked, the roadmap's architecture is locked, the precursor's data is shipped. Plan the docs site; do not reopen the design.
