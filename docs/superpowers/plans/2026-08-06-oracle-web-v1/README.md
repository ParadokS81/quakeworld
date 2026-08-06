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

- **Stage:** PHASE 1 SHIPPED (2026-08-06), awaiting operator gate before
  Phase 2. Plan itself is complete: six phase docs, each independently
  checker-verified, coherence pass (CH-1..CH-9), cold adversarial review by
  three fresh-context readers -- all GO-WITH-FIXES, every finding applied.
- **Last action:** Phase 1 executed end to end. `build-brain-manifest.ts`
  rewritten to the v1 contract (T1, session-tier agent); manifest emitted and
  published (T2); CORS + `always` on the nginx `/snapshots/` location (T3);
  harvest-runbook rider (T4). Commits `b6efc54e` (CORS), `91fd38bc` (rider),
  `29a465d7` (emitter + manifest). **9/9 phase-boundary probes green against
  the live public URL**, 6/6 numbers matching live DB queries, `tsc --noEmit`
  clean; history shape-guard and cadence guard both exercised against real
  files rather than asserted. New finding **F9** (Edit tool breaks single-file
  bind mounts) resolved inline -- carries a do-not-revert rule into later
  phases.
- **Live now:** `https://oracle.slipgate.me/snapshots/brain-manifest.json`
  -- 200, `access-control-allow-origin: *` (on 200 AND 404),
  `cache-control: public, max-age=300`, `cf-cache-status: DYNAMIC`.
- **Next action:** operator gate, then arc-run Phase 2.
- **Operator-blocking before Phase 2:** a Cloudflare Pages API token
  (Pages:Edit) -- none exists on this box post-migration; Phase 2 stalls at
  its deploy task without it. See Operator-side prerequisites.

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
