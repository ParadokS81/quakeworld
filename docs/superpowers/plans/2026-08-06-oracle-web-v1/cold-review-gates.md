# oracle-web-v1 -- cold adversarial review: GATE ATTACK

**Reviewer shape:** gate attack (brief attack surface #2 + contested rulings).
**Date:** 2026-08-06. Inherits nothing from the planning conversation.
**Method:** for each phase's boundary-verification list, construct the concrete
scenario that PASSES the probe while the guarded capability is broken. Probes
run read-only on this box where a gate literal was testable today (jq gates
against a synthetic broken-but-shaped manifest; the P7a negative grep against
a synthetic forked component; live curl re-checks of the oracle URL state; a
TBD-token census of the plan dir). Contested-ruling verdicts in their own
section.

**Token-notation convention for THIS file:** plan TBD tokens are written with
`N` in place of their digit (e.g. `TBD-PHASE-N-scroll-quirk-retest`) so this
file never matches the B7 token-shape grep. See CR-GATE-1 for why that
convention is load-bearing.

---

## MAJOR findings

### CR-GATE-1 (MAJOR) -- B7, the TBD-token-zero ship gate, is unsatisfiable as written: `coherence-pass.md` lives in the grepped dir and carries six token-shape lines the drain never touches

**Gate:** Phase 6 B7 / Task 5 (`phase-6-ship-pass.md:479-487`): `grep -rn
"TBD-PHASE-[0-9]" docs/superpowers/plans/2026-08-06-oracle-web-v1/` must be
EMPTY, and the doc asserts the tightened pattern was "checker-verified to
catch all 9 real tokens while excluding prose mentions."

**Broken-while-passing is inverted here -- the gate can never pass at all
(the F7(d) failure class recurring one level up).** Census run 2026-08-06:
the dir contains **10** distinct token names in 7 files, and 6 token-shape
matching lines live in `coherence-pass.md` (lines 98, 103, 121, 123, 199,
202 -- CH-2, CH-3, and CH-8 quote real tokens with their digits, as any
faithful review artifact must). `coherence-pass.md` is NOT in Task 5's drain
file list (`phase-6-ship-pass.md:265-269` sanctions phase-1 through phase-6
+ findings + decisions only), so a compliant Task 5 leaves those six lines
and B7 fails forever; draining them means rewriting a committed review
artifact's history. The three cold-review files this round adds (this one
included, hence the N-convention above; the other two reviewers may not have
adopted it) make the collision worse.

**Minimal hardening:** scope B7's grep to the drain set, not the dir:
`grep -rn "TBD-PHASE-[0-9]" <dir>/README.md <dir>/decisions.md
<dir>/review-findings.md <dir>/phase-*.md` -- review artifacts
(`coherence-pass.md`, `REVIEW-BRIEF.md`, `cold-review-*.md`) are history, not
todo state, and are excluded by name. One-line probe edit in Task 5 + B7.

### CR-GATE-2 (MAJOR) -- Phase 2 probe 5(b), the network-down fallback proof, is unexecutable as written: DevTools Offline + hard-reload cannot load the page at all

**Gate:** Phase 2 boundary probe 5(b) (`phase-2-scaffold-hello-production.md:649-656`):
"devtools -> Network -> Offline, hard-reload -- page still renders numbers
from the baked copy, no error surface."

**The instruction cannot produce the expected observation.** DevTools Offline
blocks ALL requests including the document itself; a hard reload (explicitly
specified) bypasses cache, so the operator gets the browser's
ERR_INTERNET_DISCONNECTED page -- there is no page to render baked numbers.
No service worker exists (P5). The operator either answers NO (spurious) or
improvises an unspecified variant -- and the capability the probe guards (the
oracle-down-site-up degradation path, P3's actual scenario: CF Pages serves,
`oracle.slipgate.me` doesn't) goes unverified, because path (a)
(`?data=force-fallback`) exercises only the HTTP-404 branch of the catch,
not the network-error/timeout branch.

**Minimal hardening:** replace (b) with DevTools request blocking: Network
tab -> right-click the manifest request -> "Block request URL" (or block
domain `oracle.slipgate.me`), then reload. The document loads from CF Pages,
the manifest fetch fails at the network layer, the catch takes the baked
path -- exactly P3's degradation case, and `data-manifest-source` reads
`"baked"` as the probe already expects.

### CR-GATE-3 (MAJOR) -- Phase 3 wave ruling "T1-T4 are independent (parallelizable)" is false at the type-dependency and probe level; parallel dispatch invites the exact contract fork the probes cannot see

**Gate:** Phase 3 wave structure (`phase-3-floor1-brain.md:296-298`) + each
task's verification probe.

**The pass-while-broken scenario:** dispatch T2/T3/T4 in parallel per the
ruling. T3's `mesh.ts` must import `BrainLayout` from T2's `layout.ts`
(its function signature is `generateMesh(litShares, layout)` and its probe
imports `DESKTOP_LAYOUT`); T4's `journeys.ts` signatures take
`mesh: MeshGeometry` -- a type DEFINED in T3's `mesh.ts` -- and T4's probe
imports `generateMesh`. The module DAG is T2 <- T3 <- T4. Meanwhile every
task's probe runs `pnpm run check` = whole-tree tsc, so a half-landed
sibling fails an innocent task's probe. The dangerous adaptation: a
parallel T4 agent, unable to import a not-yet-existing `mesh.ts`, defines
`MeshGeometry` locally to make tsc pass -- **its probe then passes with a
forked type**, because the probes grep for exported names and constants,
never for import provenance. Phase 4 later consumes `journeys.ts` believing
one `MeshGeometry` exists. The brief asked "attack the seam anyway": this is
the seam.

**Minimal hardening:** re-state the wave as T1 parallel with the chain
T2 -> T3 -> T4 (sequential); alternatively hoist `MeshGeometry` +
`BrainLayout` into T2 so T3/T4 share one type source and only T2 must land
first. One paragraph edit; no task content changes.

### CR-GATE-4 (MAJOR) -- Phase 4 T5's negative grep (the probe F6 already "fixed") still misses the three most natural fork shapes; demonstrated by execution

**Gate:** Phase 4 Task 5 negative check (`phase-4-floor2-machine-room.md:489-494`):
`grep -cE "0\.073|= 650|['\"]#4aa8ff['\"]|2\.4"` on `Floor2MachineRoom.tsx`
must be 0 -- claimed to catch "a hardcoded speed, flare duration, stroke
color in either quote style, or stroke width"; Recovery repeats the claim
("the Task 5 negative grep catches it").

**Demonstrated pass-while-broken** (run 2026-08-06 against a synthetic
component carrying all four forks):

- `setTimeout(() => rack.classList.remove('land'), 650)` -- the NATURAL call
  shape for the flare timeout (Task 5 step 3's own instruction: "clear after
  LAND_FLARE_MS") -- **evades `= 650`** (there is no `=`).
- `line.setAttribute('stroke', '#4AA8FF')` -- uppercase hex, what color
  pickers and copy-paste from devtools emit -- **evades the case-sensitive
  grep** (no `-i`).
- `const ADV = 73e-3` -- **evades `0\.073`**.

Grep result on the four-fork file: **1 match of 4** -- and that one match was
a CITATION COMMENT containing "2.4", which is simultaneously the
false-positive direction: Phase 3/4 discipline mandates mockup-line citation
comments ("2.4*S per mockup 514" is exactly the sanctioned style), so a
CORRECT implementation with correct comments can FAIL the gate while a forked
implementation passes it.

**Minimal hardening:** `grep -cinE "0\.073|73e-3|\b650\b|#4aa8ff|\b2\.4\b"`
with the instruction "expect 0; inspect any hit -- a mockup-line citation
comment is sanctioned, a code literal is the P7a violation." Negative gates
should over-trigger and be inspected (Phase 6's own minified-identifier
convention, `phase-6-ship-pass.md:726-729`); this one under-triggers.

---

## MINOR findings

### CR-GATE-5 (MINOR) -- Phase 1 probes 4+6 pin gc.stats LABELS but never check the VALUES; a value-label transposition passes all 9 boundary probes

**Gate:** Phase 1 probes 4 and 6 (`phase-1-manifest-pipeline.md:477-503`).
**Demonstrated** (jq run against a synthetic manifest with gc.stats
`[[514,"maps"],[254,"mechanics"],[76,"entity defs"]]` -- the maps and
mechanics counts swapped against their labels): probe 4 returns `true`
(labels byte-pinned in order -- exactly as designed, and exactly blind to
this), probe 6 never queries gc, probes 3/5/7 don't look. The site then
renders "514 maps" on the drill card and "254 mechanics" in the terminal,
and the Phase 4 label-keyed lookup faithfully propagates the transposition.
The same blindness covers `cs.num`: an emitter using raw `count(*)` (45,
violating the OQ2 ruling's filter) passes everything -- probe 6 checks
ef.num, cm.num, one cm bar, cm.threads, cm.solved only.
**Minimal hardening:** two more probe-6 lines: gc mechanics keyed by label
(`jq '.datacenters[] | select(.id=="gc") | .stats[] | select(.[1]=="mechanics") | .[0]'`
vs `select count(*) from gameplay_mechanics`) and cs.num vs the FILTERED
SQL from the number-sources table.

### CR-GATE-6 (MINOR) -- history stub: prepend-on-emit is cadence-blind; a debugging session's re-emits flush the yearly trail while every probe stays green

**Gate:** Phase 1 probe 3 + the history mechanics (`phase-1-manifest-pipeline.md:157-172`).
**Pass-while-broken:** the monthly-cadence assumption lives nowhere in code.
Any repeated `--publish` (Phase 1 execution debugging, a runbook-rider re-run
after a botched harvest) prepends a valid, shape-guard-passing entry per
emit; 12 same-week emits evict a year of monthly trail. Probe 3 validates
entry SHAPE, so every intermediate and final state passes. The capability
guarded ("one year of trail, enough for a growth sparkline") is silently
destroyed by normal operational behavior.
**Minimal hardening:** one guard line in Task 1 step 5 -- if
`prev.generated_at` shares `history[0]`'s (or the new emit's) UTC day,
REPLACE rather than prepend. Same-day re-emits then converge instead of
stacking.

### CR-GATE-7 (MINOR) -- "baked fallback is in the shipped bundle" greps (Phase 2 probe 2, echoed by Phase 3 A3's pattern) match the VALIDATOR literal, not the baked DATA

**Gate:** Phase 2 probe 2 (`phase-2-scaffold-hello-production.md:626-634`).
**Pass-while-broken:** `grep -rc 'brain-manifest-v1' dist/assets/` >= 1 is
satisfied by the `isBrainManifest` validator's pinned string alone, which is
in the bundle unconditionally. Scenario: a build run as `pnpm exec vite
build` (the Task-2 hello path, still documented) skips the bake chain; the
gitignored `src/data/baked-manifest.json` from an earlier build -- arbitrarily
stale -- rides into the bundle; probe 2 passes; probe 5(a) cannot distinguish
(it checks numbers match live, which a stale-but-post-Phase-1 bake also
roughly does at this point in the arc). "Baked at build time is literal"
(the local decision's whole point) is unverified.
**Minimal hardening:** grep the dist for the committed manifest's
`generated_at` VALUE:
`GEN=$(jq -r .generated_at ../qw-oracle/snapshots/brain-manifest.json) && grep -rlq "$GEN" dist/assets/`
-- that string exists only in the data.

### CR-GATE-8 (MINOR) -- the "exactly ONE non-asset request" audits (Phase 2 probe 4, Phase 3 V14, Phase 4 F10) will show TWO requests in phases 2-5: the browser's automatic favicon.ico

**Gate:** the P3/P5 single-call audits.
**Fail-while-working that erodes the gate:** no favicon ships until Phase 6
(its Task 3 adds the data-URI one precisely "to kill the console 404"), so
every earlier Network-tab check shows the manifest PLUS the automatic
`/favicon.ico` request. The operator either answers NO (spurious finding) or
learns to wave through "expected extra requests" -- exactly the erosion that
makes a real second call invisible later.
**Minimal hardening:** either add "(the browser's automatic favicon.ico
request is expected and excluded)" to the three probe texts, or move the
data-URI favicon from Phase 6 Task 3 into Phase 2 Task 2's `index.html`
(one line; kills the ambiguity for the whole arc).

### CR-GATE-9 (MINOR) -- Phase 5's R-op regression set omits V10, the ONLY ritual item that observes half the literals Task 2 refactors; desktop growth docks can vanish and the boundary stays green

**Gate:** Phase 5 R-op (`phase-5-mobile-projection.md:589-597`) + Task 2's
probe (`:336-344`).
**Pass-while-broken:** Task 2 moves `sideAnchor` / `sideSubDy` /
`snapLblFont` / `DOCKS` / `toolReveal` into `BrainLayout`. Its probe checks
`toolReveal !== undefined`, `sideAnchor`, `STEM_LBL.dy` -- but NOT
`DOCKS.length`. R-op re-runs V1/V2/V3/V6/V7/V11 + F1/F3/F6/F7 -- V10
(snapshot-branch hover unification + labels + growth docks) is the only item
that looks at the snapshot-branch label geometry and the docks, and it is
not in the set. Concrete: `DESKTOP_LAYOUT.DOCKS` transcribed as `[]` (a
copy-slip from the portrait column, whose value IS `[]`) removes both docks
from desktop; every automated probe and every R-op item passes; the miss
surfaces only at arc-end side-by-side.
**Minimal hardening:** add `L.DOCKS.length` (expect `2`) to Task 2's probe
line, and add V10 to R-op. (See also the operator-load verdict below -- the
proposed R-op reshape includes this fix.)

### CR-GATE-10 (MINOR) -- Phase 6's no-collision rule (DOM id vs fragment slug) has no probe

**Gate:** the fragment vocabulary's no-collision rule
(`phase-6-ship-pass.md:108-111`) -- normative, unprobed.
**Pass-while-broken:** an implementer gives the MCP gate group `id="mcp"` or
the connect card `id="connect"` (natural anchors); B2 (slug presence) and B3
(URL-blindness) both pass; the native anchor scroll then fights the handler
on exactly those deep links, and S1 covers only 6 of the 16 openers, so the
colliding slug can be one of the ten unchecked.
**Minimal hardening:** one grep added to B2:
`grep -rnE 'id="(engine-facts|discord|concept-notes|game-content|community-history|match-stats|connect|mcp|snapshot-door|slipgate-app|rack-[a-z-]+)"' src/`
-> empty (the two floor sections are ids `brain`/`machine-room`, sanctioned
and not in this alternation).

### CR-GATE-11 (MINOR) -- source-level single-network-call audits (Phase 3 A5, Phase 5 A5, Phase 6 B5) grep only `fetch(`; XHR / WebSocket / EventSource / sendBeacon / external `<img src>` all evade

**Gate:** A5 / B5's third literal.
**Pass-while-broken:** a component adds `new
Image().src = 'https://...'` (a classic tracking-pixel shape) or an
`EventSource` -- zero grep hits, P5 violated at source level. The runtime
Network-tab items (V14/F10/S-implicit) are the real catch, but they sample
moments; a lazy/interaction-triggered request can dodge the sampled moment.
**Minimal hardening:** widen the pattern once, in the Phase 5-amended A5
that Phase 6 B3 inherits:
`fetch(|location.search|matchMedia|XMLHttpRequest|WebSocket|EventSource|sendBeacon|new Image`.
Cheap, over-triggering in the sanctioned inspect-any-hit style.

---

## NOTE findings

### CR-GATE-12 (NOTE) -- Phase 1 probe 5's leak guard is key-level only; a level-4 leak riding a sanctioned key's VALUE passes (demonstrated)

jq run: a manifest with a thread-topic label embedded inside a `notes[]`
string passes probe 5 (`true`) -- the key walk sees only `notes`. The
D3/D7 section claims the probe "enforces this mechanically"; it enforces the
KEY surface mechanically. Acceptable (cs.notes is static emitter config, and
V6 puts the rendered lines in front of the operator) -- but the overclaim
invites citing probe 5 as a total leak gate. Fix: one sentence in the Phase 1
doc scoping the claim to keys.

### CR-GATE-13 (NOTE) -- Phase 2 Task 5's token sanity probe overclaims "proves ... Pages scope"

`GET /accounts/<id>/pages/projects` succeeds with a token holding
Pages:READ; only the deploy itself proves Edit. Consequence is merely a
later, clearer failure -- fix the claim ("proves token validity + account
reach; the deploy is the Edit proof"), not the probe.

### CR-GATE-14 (NOTE) -- Phase 4 probe 3's "no stray deep links" holds only for the ParadokS81/quakeworld domain

The extraction regex enumerates only that repo's URLs; a stray door to any
OTHER host (an MDN link in card copy, a vikpe repo) is invisible to it.
Phase 6 B4/B5 don't close this either (B4 checks a fixed list is LIVE, not
that nothing else exists). Fix if wanted: extract ALL `https?://` literals
from `dist/assets/` and diff against the expected outbound set (5 doors +
manifest URL + endpoint + docs + wiki-if-linked). The C3/F5 operator walks
partially cover; hence NOTE.

### CR-GATE-15 (NOTE) -- Phase 5 A3's dedup gate counts the literal `"pointer: coarse"`; a re-added guard formatted `(pointer:coarse)` (no space) evades while duplicating the rule

Count stays 1, duplicate ships. Fix: `grep -cE "pointer:\s*coarse"` and
expect 1.

### CR-GATE-16 (NOTE) -- Phase 1 probe 6 is TOCTOU-exposed in the failing direction

If the twin receives writes between `--publish` and the probe run (an eval-arc
or Arc A session), the five equality checks fail spuriously. Fail-closed, so
no capability risk -- but the Recovery section should name the remedy
(re-emit + republish, don't explain away) so the mismatch isn't rationalized.
One sentence.

---

## Gates attacked and HELD (no finding)

- **Phase 1 probe 1** (CORS on success AND error): the 404-literal genuinely
  proves `always` took effect -- re-verified live today: the current 404
  carries neither configured header, so the second literal has real teeth.
  Probes 2, 3, 7, 8 (double-cmp), 9 (observation-honest, records a finding on
  HIT rather than asserting CDN doctrine) all held under attack. Probe 3's
  history-entry check does catch the F2 class at the boundary as claimed.
- **Phase 2** probes 1, 3, 6, 7; the bake script's negative check; the Task 3
  fallback's define-errors-out-of-existence totality (every failure branch
  lands in one catch). Probe 5(a)'s real-404-against-real-server design is
  good (and depends correctly on Phase 1's `always` hardening).
- **Phase 3** A1, A4 (determinism twice at boundary), A5's structure (see
  CR-GATE-11 for pattern width only); the V-ritual is strong -- V9 checks P6
  in BOTH directions, V11 ties the DOM counter to observed glyph counts,
  the D-a..D-e sanctioned-deviations preamble prevents rationalized drift.
- **Phase 4** probes 1, 2, 4, 5; F6 (counter-vs-observed again); the C-list's
  EDIT-vs-NO distinction; the `aglowR` id-collision local decision is a real
  bug avoided.
- **Phase 5** A1, A2, A4 (dual-projection determinism vs pre-phase capture),
  A6; the Q-rule matrix covers its outcome space and puts authority on the
  real phone correctly; M10's sanctioned no-flip case is honest.
- **Phase 6** B0 (the CH-4 fix landed), B1, B2, B4 (the F7(a) arc-run caveat
  present), B5, B6, B8; S3 (Back semantics tested as defined), S9
  (composition check included), S11 (the arc's product claim tested for
  real -- the single best gate in the plan).

---

## Contested-ruling verdicts

**1. Hello-Production-first slicing -- UPHELD.** The exposure risk is near
zero: an unlinked `*.pages.dev` URL with no inbound links is effectively
unindexed pre-launch, and nothing on the Phase 2-3 page misleads (the connect
card -- the only surface that could burn a visitor -- ships with the
illustrative marker until the Phase 6 operator gate). Adding `noindex` and
removing it at ship would create a worse failure mode (forgetting the
removal). The CF auth stall is correctly placed: it is flagged as a README
operator-prerequisite BEFORE Phase 2, the stall is designed non-blocking
(Tasks 1-4 + doc-writing proceed), and moving the deploy later would forfeit
the real-URL verification every later phase leans on. The spec itself demands
the scroll-quirk retest on the real deploy; the slicing follows.

**2. Evolve-in-place emitter -- UPHELD.** Never published (public URL 404
re-verified today), appdata dir empty, no repo consumers, and the old shape
survives in git history (`7c9f2db4`) for any forensic need -- provenance is
preserved by the VCS, not by keeping a dead shape alive. The rewrite also
removes two fields the contract forbids; keeping the old script alongside
would be a second staleness surface (P2's exact enemy).

**3. `share` computed emitter-side -- UPHELD.** The critique (presentation
value baked into a data contract) mislabels the value: WHICH count is a
datacenter's headline for the density scale is registry knowledge, not
styling -- the emitter is the only party that knows a future datacenter's
semantics, and D4's promise (new datacenter lights up without site redeploy)
is unmeetable if the site owns the formula. Portability holds because `num`
still rides the manifest; a future generator wanting different density inputs
loses nothing. Edge cases: rounding drift is bounded well inside probe 7's
0.995-1.005 band at launch cardinality; an all-zero degenerate sum yields NaN
shares which probe 7's jq comparison FAILS (NaN compares false) -- caught at
the boundary, not silent. Suggested one-line emitter guard (`if (sum === 0)`
emit shares 0) is hygiene, not a condition of upholding.

**4. History stub (cap 12, prepend-on-emit, monthly assumption) -- UPHELD
with the CR-GATE-6 hardening.** On the dead-weight charge: correct, nothing
in v1 consumes `history` -- but the freight is a few hundred bytes, the D7
growth-trail is spec-named, and adding it later would be a schema-version
bump plus a re-mirror; shipping the stub now is the cheaper branch. The
genuine flaw is cadence-blind prepending (CR-GATE-6): fix with the same-day
replace guard. The shape guard itself (post-F2) is sound.

**5. Fragment vocabulary: replaceState-only -- UPHELD.** For the stated D6
use case (Discord paste), Back-returns-to-Discord is the correct affordance,
and the alternative (pushState per card) manufactures history spam: N opened
cards = N Back presses to escape the page, which is the classic deep-link
anti-pattern. The real cost is Android hardware-Back users expecting
modal-close -- acknowledged, observable at S12, and OQ3 preserves the
pre-Task-1 overrule path with the tradeoff correctly stated. The default is
the right default.

**6. Why-overlay dark via `?dev=why` -- UPHELD.** "Dark" was never
"secret" -- P6's integrity rule forbids presenting fabricated comparison
answers as real captures, and the overlay self-labels against exactly that:
the draftstamp ("draft -- final page shows verbatim captured answers, dated +
model-labeled") ships inside it. A leaked flag URL circulating shows a
stamped draft -- integrity survives disclosure, which is the correct
property (integrity-by-honesty, not integrity-by-obscurity). The draftstamp
is therefore LOAD-BEARING for P6: recommend adding its string to Phase 3
A2's grep list so the honesty device is mechanically pinned in the bundle,
not only ritual-observed (V9). Cheap, and it converts this ruling's premise
into a checked invariant.

**7. D4 "no redesign" vs hand-placed layout (skip+warn) -- UPHELD.** A new
datacenter is by construction an emitter-code event (the registry, queries,
and door config live in the emitter), so a dev session necessarily exists at
the moment a layout entry is needed -- the warn is dev-facing because only
devs create the condition. The alternatives are strictly worse: crash
violates define-errors-out-of-existence; auto-placement violates P1. The
"brain grows" pitch is honored by D4's ACTUAL promise as Phase 3 OQ4 states
it: one layout.ts commit, no redesign. No change required.

**8. Phase 3 T1-T4 parallel wave -- OVERTURNED.** See CR-GATE-3. Independent
at the file-write level, dependent at the type level (T2 <- T3 <- T4), and
mutually interfering at the probe level (`pnpm run check` is whole-tree).
The function-signature independence the checker verified is real but is not
the property parallel dispatch needs. Fix is a wave-structure edit only.

**9. Operator load -- UPHELD as a floor, with a concrete consolidation.**
The raw count (~55 primary items + ~15 re-runs across four sessions) is
heavy but honest: the walks (six stations, four drill cards, seven terminal
cards) ARE the parity floor and cannot be sampled without losing it, and the
ritual structure (Claude stages everything, operator answers YES/NO rows) is
close to the friction minimum for an operator-run floor. Where it converts
into tax is the RE-RUNS -- Phases 5 and 6 re-walk material that mechanical
probes now pin. Safely collapsible, with nothing lost:

- **(a) Phase 5 R-op: 10 items -> 5.** After A4's byte-identical determinism
  diff (which pins mesh geometry mechanically), V1/V3/V6/V11 re-runs are
  redundant with V2 + the automated set. Proposed R-op: **V2, V7, V10, F6,
  F7** -- five items that cover exactly the surfaces Task 2's refactor
  touches. This simultaneously fixes CR-GATE-9 (V10 was the missing item).
- **(b) Phase 6 S12 folds into S1:** run the S1 paste-set once on desktop and
  once on the phone instead of maintaining a separate mobile item -- same
  coverage, one fewer ritual block.
- **(c) Phase 4 C-checklist: rubric, not matrix.** As written, 7 criteria x
  7 cards reads as up to 49 micro-judgments. Restate: one read-through of all
  7 cards against C1-C5 + C7 answered ONCE globally with per-card exceptions
  noted; C6 (the authored `ms` body) stays its own row. Same acceptance
  power, ~15 fewer answers.

Net: ~20 fewer operator answers across the arc, zero unique coverage lost,
one coverage GAP closed. The floor survives.

---

## Verdict

**GO-WITH-FIXES.** No blocker requires re-slicing or re-design; all four
MAJORs are probe-text / wave-structure edits (B7 scope, Phase 2 probe 5(b)
replacement, Phase 3 wave re-statement, Phase 4 negative-grep widening), and
the MINOR/NOTE hardenings are one-to-three-line probe or doc edits. Apply as
a normal finding round, then GO.
