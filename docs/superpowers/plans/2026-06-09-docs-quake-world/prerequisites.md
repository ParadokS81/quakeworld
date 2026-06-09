# Prerequisites -- Task 0 (operator-driven, before kicking off phases)

One-shot manual steps the agentic loop cannot do. Most of this arc's setup IS doable by the loop (scaffolding the project, running build-snapshot, booting the dev server, building) -- so this list is short. Check items off as done.

---

## Local-dev environment (required before Phase 1)

- [ ] **Node.js LTS + pnpm via corepack.** docs-web is a pnpm-workspaces project (D20). Test: `node --version` (>= 20) and `corepack enable && pnpm --version` both succeed in WSL. (Bun stays the runtime for qw-oracle / build-snapshot; this adds Node+pnpm for docs-web only -- the two coexist.)
- [ ] **qw_oracle Postgres up and populated.** build-snapshot reads the live DB. Test: `cd apps/qw-oracle && bun -e "import postgres from 'postgres'; const s=postgres(process.env.DATABASE_URL ?? 'postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle'); console.log(await s\`select count(*) from entities\`); await s.end()"` returns a non-zero count. (Post-precursor the DB is already loaded for all 6 codebases.)
- [ ] **Extractor AST output present for ezQuake.** build-snapshot reads `apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-variables-ast.json` and `ezquake-commands-ast.json` for the `groups` taxonomy (F4). Test: both files exist. (They do today -- slipgate's ezquake emit already uses them.)
- [ ] **Record the slipgate-parity baseline** (the F1 hard-gate probe needs a before-image). Capture hashes of the files slipgate consumes, BEFORE any Phase 1 change:

  ```bash
  cd apps/slipgate-app/src/lib/config/data
  sha256sum ezquake-variables.json ezquake-commands.json ezquake-macros.json \
    ezquake-cmdline-params.json ezquake-asset-bundle.json \
    qwcl-variables.json qwcl-variables-meta.json qw-maps.json qw-gameplay.json
  ```

  Paste the output into Phase 1's MD (or here) so the parity probe can assert these are unchanged after the docs emit lands:
  ```
  <paste sha256sums here>
  ```

  Note: a few of these (`ezquake-asset-bundle.json`, the fte/ezquake asset bundles) show as already-modified in the working tree at arc start -- that is unrelated prior work, not Phase 1. The parity baseline is "whatever they are at Phase 1 START," and the gate is "Phase 1 does not change them."

---

## Production / deploy prerequisites (required before the deploy phase)

These can wait until the deploy phase starts. Listed here so the operator knows what is coming.

- [ ] **Cloudflare account with Pages access.** The same account family used for the Unraid tunnel / scheduler.quake.world is fine.
- [ ] **vikpe DNS coordination.** vikpe controls `quake.world` DNS. The deploy phase needs vikpe to point `docs.quake.world` (CNAME) at the Cloudflare Pages deployment -- the `scheduler.quake.world` pattern. Ping vikpe before the deploy phase so DNS is not the long pole. **This is the one true external dependency in the arc.**
- [ ] **CF Pages project name decided.** Default: `docs-quake-world`. Operator can override.

---

## Decision deferrals (operator clarifies on demand, not now)

The phase drafters may ask about these. Pre-decide to short-circuit; otherwise the phase MD surfaces them as Open Questions with the default chosen.

- [ ] **docs export output directory.** Default: `apps/docs-web/data/`. (D12 -- must NOT be slipgate's data dir.)
- [ ] **daisyUI theme source.** Default: lift vikpe's Tailwind v4 + daisyUI theme block from `research/repos/slipgate/web/` (the roadmap-endorsed source). Alternative: copy the slipgate-app theme. Either way, tokens only for v1 (D10).
- [ ] **friendly_type + category derivation site.** Default: in the frontend data module, not the export (D13 implication -- keeps the export a faithful L1 projection, keeps derivation in the swappable-frontend logic layer per D15). Operator can move it into the export if they prefer the data pre-derived.

---

## What this list deliberately does NOT include

- Anything the agentic loop does: scaffolding docs-web, running `build-snapshot`, running the dev server, building the site, running probes.
- Anything created by the phases themselves (the export emitter, Vue components, VitePress config, CF Pages config).
- Cleanup / rollback. Each phase lands a commit; `git revert` is the path. No bespoke rollback infra.

---

## Sign-off

When the "Local-dev environment" boxes are checked, Phase 1 can start.
When the deploy boxes are checked (especially vikpe DNS), the deploy phase can proceed.
If a prerequisite blocks a phase mid-flight, the phase pauses at that task and waits.
