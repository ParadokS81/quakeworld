# oracle-web-v1 -- arc plan (full arc)

**Date:** 2026-08-06. **Weight class:** full arc (standalone spec, 6 phases,
public-facing ship; cold adversarial plan review + arc-end cold review).
**Spec:** `docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` (D1-D7 +
2026-08-06 amendments). **Comp:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7,
mockup-of-record). **Parent:**
`docs/superpowers/parking/2026-08-04-oracle-web-direction.md` (Arc B).
**Ledger:** `decisions.md` (P1-P11). **Findings:** `review-findings.md`.

## Where we are right now

- **Stage:** PHASES 1-2 SHIPPED (2026-08-06). The site is deployed and serving
  live oracle numbers. Next up: Phase 3 (Floor 1 brain port).
- **Phase 1** (manifest pipeline): emitter rewritten to the v1 contract,
  manifest published, nginx CORS + `always`, runbook rider. Commits
  `b6efc54e` / `91fd38bc` / `29a465d7`. **9/9 boundary probes green on the
  live URL**, 6/6 numbers matching live DB queries; history shape-guard and
  cadence guard exercised against real files rather than asserted.
- **Phase 2** (scaffold + Hello Production): `apps/oracle-web` subtree
  (SolidJS + Vite + Tailwind v4/daisyUI `oracle` theme), the fetch/validate/
  baked-fallback data shell, two-floor skeleton on real numbers, CF Pages
  deploy, `DEPLOYMENT.md`. Commits `8e78f6a3` (subtree) / `67defd51`,
  `29386f13` (findings) / DEPLOYMENT.md. Automated probes 1-3 green; the
  deployed JS is **byte-identical** to local `dist/`. Operator-run probes:
  live numbers CONFIRMED by screenshot, **fallback CONFIRMED** (console shows
  the real 404 -> catch -> baked chain with numbers still rendering).
- **Live now:**
  - Data: `https://oracle.slipgate.me/snapshots/brain-manifest.json` -- 200,
    CORS `*` on 200 AND 404, `max-age=300`, `cf-cache-status: DYNAMIC`.
  - Site: `https://qw-oracle-web.pages.dev/` -- CF Pages project
    `qw-oracle-web`, production branch `main`, one-command redeploy per
    `apps/oracle-web/DEPLOYMENT.md`.
- **Execution findings so far:** F9 (Edit tool breaks single-file bind mounts
  -- do-not-revert rule for later phases), F10 (`~/.secrets` is ro to dev; CF
  token homed at `/home/dev/projects/.secrets/`, now also a `secret-drop`
  registry entry), F11 (Phase 2 Task 3's bundle-grep probe was unsatisfiable
  before Task 4 wired the import -- relocated, not weakened).
- **Next action:** arc-run Phase 3 (Floor 1 brain port -- mesh/stations/
  traces/journeys, drill cards, connect card, why-overlay dark).
- **Operator-side prerequisites: NONE outstanding.** The CF Pages token is in
  place and validated (rotated 2026-08-06 after a transcript exposure).

## Lane

**Main checkout** (`/home/dev/projects/quakeworld`, branch `main`) -- per
decisions P10. Concurrent arcs: oracle-eval-simulation in worktree
`/home/dev/projects/quakeworld-eval` (disjoint files); Arc A L2 finish-out
(contact surface = Phase 1 runbook rider only).

## Operator-side prerequisites

- [ ] **CF Pages auth (needed by Phase 2):** a Cloudflare Pages deploy from
  the cockpit against the operator's personal account. docs-web precedent:
  `apps/docs-web/DEPLOYMENT.md`. If no valid `CLOUDFLARE_API_TOKEN` is on
  this box, Phase 2 stalls at its deploy task until the operator provides
  one (Pages:Edit scope) -- probed at drafting time, see Phase 2 doc.
- [ ] Nothing else. The nginx CORS line, snapshots dir, and DB access are
  all inside the dev lane (verified 2026-08-06: `/snapshots/` location
  exists in `/mnt/user/appdata/qw-oracle/nginx.conf`, `snapshots/` dir
  rw-mounted).

## Sequencing

| Phase | Ships | Depends on | Archetype / verification floor |
|---|---|---|---|
| 1 | `brain-manifest.json` contract + emitter (rewrite of the pre-existing `build-brain-manifest.ts` -- F1) + file served live with CORS from the public snapshots URL | -- | data contract + loader + infra -- automated (live curl probes) |
| 2 | `apps/oracle-web` scaffold deployed to CF Pages, rendering live manifest numbers; baked fallback proven | 1 | infra + Hello Production -- operator-run floor (public URL) |
| 3 | Floor 1 (brain) ported: mesh/stations/traces/journeys, drill cards, connect card, why-overlay (dark) | 2 | UI port -- operator-run visual parity vs comp + automated build/interaction probes |
| 4 | Floor 2 (machine room) ported + terminal topic content (6-10 cards, repo doors) | 3 | UI port + content authoring -- operator-run (copy review) |
| 5 | Portrait/mobile projection + real-deploy scroll-quirk retest | 3, 4 | UI -- operator-run on a real phone |
| 6 | Ship pass: URL fragments, footer doors, a11y/reduced-motion/perf sweep, final copy | 5 | polish + ship -- operator-run |

Slicing rationale: Hello-Production-first (deploy pipeline live from Phase 2
so every subsequent phase verifies on the real URL -- the spec itself demands
the scroll-quirk retest happen there), then vertical through the page floor
by floor. Phase 1 is the arc's single contract owner (P2).

## Phase docs

- `phase-1-manifest-pipeline.md`
- `phase-2-scaffold-hello-production.md`
- `phase-3-floor1-brain.md`
- `phase-4-floor2-machine-room.md`
- `phase-5-mobile-projection.md`
- `phase-6-ship-pass.md`

## Arc-end review

Full arc: cold subagent spec-vs-shipped walkthrough (arc-run owns mechanics)
+ operator walkthrough of the live URL.
