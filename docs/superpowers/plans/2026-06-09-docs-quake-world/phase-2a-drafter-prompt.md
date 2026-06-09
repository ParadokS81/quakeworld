You are drafting Phase 2a of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). This arc builds the WEBSITE that
auto-projects QW Oracle Layer 1 into a per-codebase browsable reference. Phase
2a is the VitePress SCAFFOLD: stand up `apps/docs-web` (pnpm + Tailwind v4 +
daisyUI tokens), the data-loading module skeleton, and routing -- the "site
boots" checkpoint. The ezQuake rendering is Phase 2b, not here.

STOP and re-check your arc if you see Postgres migrations, `category_inferred`
apply-scripts, or describe-fill synthesis -- those are sibling/precursor arcs.
This arc touches `apps/docs-web/` (new) and consumes the docs JSON Phase 1 wrote.

This is a structured PLANNING task. Output is the Phase 2a MD. You do NOT
execute anything (no pnpm install, no dev server). Drafting is paper-only.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-2a-scaffold.md

REQUIRED READING:
1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (full; D10, D15, D20 are central here)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md   (section 9: stack/build/deploy)
6. docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md   (the "stack (LOCKED)" section -- Tailwind v4 + daisyUI v5, where vikpe's theme lives)
7. research/repos/slipgate/web/   (vikpe's monorepo: pnpm-workspace.yaml catalog has tailwindcss ^4.2.2 / daisyui ^5.5.19; the theme block lives in web/apps/website/src/styles/main.css via @plugin "daisyui" + @plugin "daisyui/theme" -- this is the token source to lift)
8. The Phase 1 output JSON in apps/docs-web/data/ (the shape Phase 2b will consume; 2a sets up the loader that reads it)

DECISIONS THIS PHASE MUST HONOR:
- D10/D20: VitePress (Vite + Vue) + Tailwind v4 + daisyUI tokens, in
  apps/docs-web as its OWN pnpm-workspaces subtree (qw-oracle stays
  npm --no-workspaces; no conflict). No src-tauri rsync constraint (this is not
  slipgate). Use pnpm + corepack.
- D15: set up the module structure so presentation and logic are separable from
  day one -- a `data/` or `lib/` module layer (plain TS: loaders, derivation,
  filter/search) distinct from the `.vue` component layer. The scaffold should
  make "logic in a component" the awkward path, not the easy one.
- Adopt vikpe's daisyUI theme tokens for federation cohesion (palette match).
  Tokens only for v1; do not build a design system.

RECON (use Context7 for current library docs -- do NOT rely on memory for
Tailwind v4 / daisyUI / VitePress setup, the v4 setup differs from v3):
- Pull current VitePress + Tailwind v4 integration docs (Tailwind v4 uses the
  Vite plugin + CSS-first @import, no tailwind.config.js by default).
- Pull daisyUI v5 install-as-Tailwind-plugin docs (@plugin "daisyui").
- Read research/repos/slipgate/web/ to lift the exact theme block.

DELIVERABLE / runnable state at boundary: `pnpm --dir apps/docs-web run dev`
boots; a landing page renders with daisyUI tokens visibly applied; the
data-loading module can read one Phase-1 JSON file; routing skeleton exists for
per-codebase / per-type pages (even if the pages are stubs).

EXECUTION-MODE GUIDANCE:
- The scaffold integration (getting VitePress + Tailwind v4 + daisyUI to
  cooperate -- known to have setup gotchas): `subagent (Sonnet MAX)`.
- Individual config files / the theme-token lift / a stub page: `subagent
  (Sonnet medium)` or `inline` if full content is shipped.

DRAFTING RULES: ASCII only; follow phase-template.md exactly (per-task
Execution-mode column required); ship full file content for any inlined file;
no length cap.

STEP-BY-STEP:
1. Read required files. Note applicable findings.
2. Recon via Context7 (VitePress + Tailwind v4 + daisyUI) and research/repos/slipgate/web/.
3. Draft phase-2a-scaffold.md per the template, execution mode on every task.
4. Dispatch the verification sub-agent (phase-template.md brief, paths filled in;
   subagent_type=Explore). Note: the sub-agent's schema/SQL checks are mostly
   n/a for this phase; its decoupling check (D15) and file-path checks DO apply.
5. Apply findings (decision wins on conflict).
6. Halt. Report MD path, finding counts, open questions, recommendation.

Do NOT proceed to Phase 2b. Do NOT execute anything.
