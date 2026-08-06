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

- **Stage:** planning -- scaffold committed; phase docs drafting in progress
- **Last action:** scaffold created (README + decisions P1-P11 + findings
  preamble); slicing + lane ratified by operator 2026-08-06
- **Next action:** draft phase docs (Phase 1 contract-owner first, then
  waves), checker passes, coherence pass, cold adversarial plan review,
  operator intent review

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
| 1 | `brain-manifest.json` contract + emitter + file served live with CORS from the public snapshots URL | -- | data contract + loader + infra -- automated (live curl probes) |
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
