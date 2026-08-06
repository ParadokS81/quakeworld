# oracle-web-v1 -- cold adversarial plan review brief

Date: 2026-08-06. Written by the planning orchestrator BEFORE the cold review
runs. The reviewers inherit nothing from the planning conversation; this brief
is their aim. The plan under review: `README.md`, `decisions.md` (P1-P11),
`review-findings.md` (F1-F7), `phase-1-*.md` .. `phase-6-*.md`,
`coherence-pass.md` (CH-1..CH-9, all DRIFT/NOTE fixes applied before this
review dispatched). Spec: `docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md`
(+ two 2026-08-06 amendment blocks). Comp:
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7).

## Where NOT to bother (already checked hard; re-walking is budget waste)

- Mockup line-citation accuracy: three independent checkers enumerated ~95,
  ~78, and 27/27 citations respectively; zero value mismatches across all
  three. Do not re-verify citations one by one.
- npm registry version pins (Phase 2): re-verified by an independent checker
  same-day, including peer ranges.
- GitHub door URLs, MCP endpoint posture (200/no-auth/serverInfo), footer
  target live-status: each reproduced by at least two independent agents.
- Field-name conformance diffs (manifest contract vs each consumer doc):
  run twice, both directions, clean.

## The orchestrator's error record this run (attack the same classes)

1. I asserted "no probe changes expected" when requesting the gc.stats
   label-pin amendment -- WRONG; the probes checked shape only, and the
   drafter had to override me. Class: probe-coverage assumptions made
   without re-deriving what the probe actually tests.
2. I invented a finding number ("F7") in a checker brief for an item that
   was never in the ledger; a later drafter chased it. Class: phantom
   cross-references injected by the orchestrator between artifacts.
3. The README originally framed Phase 1's emitter as a green-field decision;
   a committed emitter already existed (F1). Class: stale premises from the
   planning conversation surviving into scaffold text.
4. Historically (per the skill's own record), EVERY orchestrator error class
   that survives this regime is a world-facing claim -- browser policy,
   platform API behavior, CDN semantics -- written in confident normative
   voice. Assume mine are in there too.

## Contested rulings -- attack these WITH their reasoning, don't nod

- **Hello-Production-first slicing** (deploy a skeleton in Phase 2 before
  any visuals). Reasoning: the spec demands the scroll-quirk retest happen
  "on the real deploy"; early deploy makes every later phase publicly
  verifiable; CF Pages deploys are cheap. Attack: does an early public URL
  create any exposure/confusion risk (indexed half-built page, operator
  sharing it early)? Is the CF auth stall (no token on the box) placed at
  the right phase?
- **Evolve-in-place emitter** (rewrite the committed 2026-08-05
  `build-brain-manifest.ts` to the new contract). Reasoning: never
  published, no consumers, working --publish/history mechanics. Attack: any
  hidden consumer or provenance value in the old shape?
- **`share` computed emitter-side** (ln(1+num)/Σ baked into the manifest).
  Reasoning: new datacenter lights up without a site redeploy (D4).
  Attack: does baking a PRESENTATION value into the data contract violate
  the dumb-component/portability discipline it claims to serve? What
  happens when a share sum drifts from 1.0 or a datacenter count is 0?
- **History stub: cap 12, prepend-on-emit, monthly cadence assumption.**
  Attack: emit-twice-in-a-day semantics; what consumes history in v1 at all
  (is it dead weight shipped on faith)?
- **Fragment vocabulary: replaceState-only, zero history entries** (Back
  leaves the page). Default chosen for paste-shareability without
  Back-button clutter. Attack: is that actually the right default for
  Discord-paste deep links (D6's stated use case)?
- **Why-overlay dark via `?dev=why`** (P6). Attack: the flag ships in the
  public bundle -- is "dark" honest if any visitor can find it in source?
  Does P6's integrity rule survive a leaked flag URL circulating?
- **D4 "no redesign" vs hand-placed layout** (a new datacenter requires a
  hand-authored layout.ts entry; manifest-only datacenters are skipped with
  a warn). Attack: is skip+warn the right failure mode on a surface whose
  whole pitch is "the brain grows"?
- **Phase 3 T1-T4 parallel wave.** Verified independent at the
  function-signature level. Attack the seam anyway: shared constants file?
  CSS ordering assumptions?
- **Operator load.** The rituals total: Phase 3 (14 V + 5 A), Phase 4
  (10 F + 7 C + 6 probes), Phase 5 (11 M + R re-runs), Phase 6 (8 B + 12 S
  + Lighthouse). Attack: is this a realistic amount of operator-run
  verification for a solo operator, or does the plan quietly convert
  "operator-run floor" into an operator tax that will get skipped? What is
  safely collapsible without losing the floor?

## Attack surface (three reader shapes)

1. **Chain re-walk (fresh eyes):** re-derive the Outputs->Inputs mirror
   chain end to end WITHOUT reading coherence-pass.md first (read it after,
   diff your findings against CH-1..9 -- anything you find that it didn't is
   the yield). Include the two Phase 1 amendment blast radii and the
   README/ledger/phase-doc triangle.
2. **Gate attack:** for each phase's boundary-verification list, construct
   per gate item the concrete scenario that PASSES the probe while the
   capability is broken. Drafter-authored gates drift toward the case that
   works; find the case that doesn't.
3. **Spec-coverage + world-facing sweep:** walk spec D1-D7 + both amendment
   blocks line by line against the six phases' Ships/Tasks -- anything the
   spec demands that NO phase ships is a MISSING finding. Then enumerate
   every world-facing claim in the plan (CF Pages/edge-cache semantics for
   the manifest fetch + Cache-Control 300 interplay, wrangler-v3-on-Node-22,
   pnpm-10 esbuild build-script blocking, SolidJS remount/rAF/ref timing,
   mobile scroll/touch/matchMedia-rotation, GitHub URL stability) and
   verdict each: probe-covered / citation-covered / naked.

## Response format

One committed file per reviewer:
`cold-review-<chain|gates|spec>.md` in this plan dir. Findings numbered
CR-<shape>-<n> with severity MAJOR (plan ships something wrong/broken) /
MINOR (friction, ambiguity) / NOTE, each with evidence quoted file:line and
a proposed minimal fix. End with a verdict line: GO / GO-WITH-FIXES /
NO-GO (+ blockers). The orchestrator applies the response as a normal
finding round -- fix, then GO.
