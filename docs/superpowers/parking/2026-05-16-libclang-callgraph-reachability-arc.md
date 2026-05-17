# Arc: libclang call-graph reachability for L1 (source_backed != runtime-live)

**Created:** 2026-05-16. **Shape:** L1-extractor enhancement arc. **Status:** parked, ready for arc-brainstormer/planner. **Predecessor context:** the ezQuake help-JSON reachability blind-spot investigation (handoff `2026-05-15-handoff-helpjson-cvar-pass-and-reachability-blindspot.md`), resolved this session.

## Why this arc exists (empirically established, not assumed)

The qw-oracle L1 libclang extractor records an entity when source declares + registers + reads it. It does NOT check whether the registering function is reachable at runtime. `source_backed` means "registered in code," not "registered in a running build." A cvar/command registered in a function nothing calls (e.g. `sb_qtvlist_url` in `QTVList_Init`, which has zero call sites) is extracted as live and is invisible to the source-only audit pipeline (worker + Opus reviewer both miss it).

This session proved the cheap mitigations are **structurally insufficient**, not just under-tuned:

- A bash/grep "does the enclosing init have callers" heuristic CANNOT work: grep cannot distinguish a call `Foo();` from a prototype `void Foo(void);` -- textually identical. A scaled run misclassified ~55 entities (incl. `version`, `cd`, `rm`, `ls`, `r_speeds`) as dead because every function called as a plain `Foo();` statement read as zero-caller. Anti-pattern recorded: do not retry a grep call-counter.
- Therefore reachability needs a tool that parses call expressions. libclang already builds the AST in the extractor; adding caller->callee edges + BFS from entry is the right durable mechanism. This is the only reliable path and it generalizes to all registration-shaped types (cvar/command/macro) and every version in L1.

## Scope (what this arc delivers; do NOT re-do detection)

**Detection is DONE and trustworthy -- out of scope for this arc.** The runtime-list diff (`cvarlist`/`cmdlist`/`macrolist` from a version-matched build vs L1 at the same commit) reliably produced the candidate pools. Reusable, validated, do not rebuild:
- `/tmp/front1-diff.sh` -- runtime-vs-L1 diff (CRLF/case/locale-corrected; arithmetic closes; sb_qtvlist_url self-check).
- `/tmp/cmdline-liveness.sh` -- cmdline consumer-presence detector (different shape: cmdline is consumed-by-`COM_CheckParm`, not registered; presence-of-consumer == liveness, no reachability needed; do not fold cmdline into the call-graph mechanism).
- Clean candidate pools at HEAD `3f9e724f`: **97 cvar + 74 command** (case-folded, runtime-verified absent). Macros: clean, 0 dead, closed.
- Independently-verified dead set already shipped: `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` (sb_qtvlist_url, gl_outline_scale_world, 8 cmdline ghosts).

**In scope:**
1. libclang call-graph reachability pass in the extractor: per registration site, is the enclosing function reachable from program entry. Output a per-entity `runtime_reachable` signal in L1.
2. Use it to classify the 97/74 pools: genuine-dead (unreachable registrar) vs build-excluded (reachable but platform/`#ifdef`-gated out of the dumped build).
3. Durably close `source_backed != runtime-live` for all future audits and all forks (ezQuake/FTE/QWCL/MVDSV).

## Design constraints (hard-won this session -- carry forward)

- **Per build config.** The extractor already dual-parses client/server (27 conditional macros). A function dead in the client build can be live in the server build. "Dead" = unreachable in EVERY shipped config; reachability must be computed per config and unioned, or server-only code false-accuses.
- **Conservative on function pointers.** Command handlers/on_change are function pointers; the init chain itself is mostly direct calls. Rule: follow direct calls; if a function's address is taken (table/pointer), assume reachable (never false-accuse a live entity). Accept slight under-report; the runtime dump mops residue.
- **Comment-line exclusion.** A commented-out `// Cvar_Register(&x)` is a distinct dead subclass (`gl_outline_scale_world`). Strip `//` and `/* */` before locating registration sites or it reads as a live registration in a called function.
- **Runtime dump is ground truth; static is the generalizable approximation.** Cross-check libclang reachability against the runtime dump we already have. Version pinning is non-negotiable: the build's commit must equal the L1-extracted commit (`version` string embeds it) or the diff is version-noise.

## Known-answer harness (REQUIRED before trusting any scaled run)

Single-axis validation failed this session (probe confirmed the true-zero case but never a true-nonzero, so a broken counter passed). Gates MUST include all three:
- `sb_qtvlist_url` -> GENUINE-DEAD / zero-caller (`QTVList_Init`).
- `gl_outline_scale_world` -> GENUINE-DEAD / commented-register.
- A cvar registered in a known-reachable init (e.g. `cl_bobhead` in `V_Init`) -> BUILD-EXPLAINED / reachable. (This is the gate that was missing and would have auto-rejected the bad run.)

## Relations

- Memory `reference_qw_oracle_extraction_liveness_gap` (updated this session with the runtime-diff method + grep-structural-insufficiency).
- Parking `2026-05-14-l1-extractor-refinement-arc.md`, `2026-05-15-l1-extractor-entity-classification-followups.md` (s_stereo lifecycle precedent).
- The 132-command reverse anomaly = a related but separate L1 completeness gap: HUD commands registered via `Cmd_AddRemCommand(runtime_built_name, ...)` (dynamic name) are invisible to literal extraction. Same theme (static can't see runtime), different mechanism. Capture in the same arc's brainstorm or a sibling.

## First actions for the picking-up terminal

1. Read this doc + the updated `reference_qw_oracle_extraction_liveness_gap` memory + the shipped `ezquake-runtime-dead-entities.md`.
2. Do NOT re-run detection. The pools are clean and banked.
3. Route into arc-brainstormer (libclang reachability is design-shaped, multi-pass): per-config call-graph construction, function-pointer policy, L1 schema for `runtime_reachable`, classification of the 97/74, the dynamic-registration sibling gap.

## Brainstorm Pass 1 -- COMPLETE (2026-05-16)

Design spec (drain target, Passes 1-4): `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`.

**Sub-questions resolved:**

- **SQ1.1 -- arc scope:** LOCKED ghosts-only. The reverse-diff HUD
  variable-name family + `Cmd_AddLegacyCommand` persistence + trailing-comment
  harvester precision are SIBLINGS, banked in
  `2026-05-15-l1-extractor-entity-classification-followups.md`. Rationale:
  opposite user-harm direction, zero shared fix mechanism (call-graph
  reachability vs interprocedural constant propagation); folding in is
  scope-bleed.
- **SQ1.2 -- fork scope:** LOCKED ezQuake-first. Call-graph core is
  engine-general (shared tier, same libclang AST/visitor for all four).
  Validate + ship ezQuake only -- the only fork with a pinned runtime answer
  key. FTE/QWCL/MVDSV = per-fork gated follow-on; residual cost = entry-point
  + config-set + pinned runtime dump + own known-answer gates; uneven (MVDSV
  cheap, QWCL likely expensive, FTE between). "Working + verified ezQuake,
  then a concrete reference to replicate from."

**Carry-forwards (tracks):**

- Passes 2-4 unchanged (call-graph mechanism / L1 schema+provenance /
  application+harness) -- see the design spec.
- CONSTRAINT CORRECTION for Pass 2: this doc's "dual-parses client/server
  (27 conditional macros)" is stale; the extraction memory says 4-variant
  (client/server/win/apple). Verify against live
  `extractor_lib/clang_config.py` in Pass 2; the per-config union must cover
  the real variant set or win/apple-only registrars get false-accused.
- Siblings routed to the feeder doc: HUD dynamic-name family,
  command-direction case-fold harness gap, retracted missed-literal artifact
  (do-not-propagate).

**Pass plan:** unchanged. Pass 1 COMPLETE; Passes 2-4 pending, one per fresh
terminal.

## Brainstorm Pass 1 -- AMENDED (2026-05-16)

SQ1.1 amended on operator decision: NOT ghosts-only. One coherent arc, two
phased separately-gated tracks, zero mechanism blending. New North Star
(operator words): **enforce L1 to show what is actually present and
working** -- today L1 both shows non-working commands (ghosts) and hides
working ones (runtime-built HUD names); bi-directional, same outcome, L1
lies.

- **Track A -- ghost elimination:** libclang call-graph reachability (the
  original scope).
- **Track B -- hidden-command recovery:** model the `HUD_Register` contract
  (pulled in from the sibling feeder doc).
- **Shared foundation:** the command-direction case-fold harness gap is now
  IN scope as a prerequisite for BOTH tracks -- VERIFIED 2026-05-16 it
  inflates the Track-B reverse-diff AND injects >=3 false ghosts
  (`loadfragfile`, `unignoreall`, `unignoreall_team`) into the Track-A
  77-pool.

Still siblings (feeder doc, future L1-extractor arc): `Cmd_AddLegacyCommand`
persistence, trailing-comment harvester precision.

Pass plan grew 4 -> 5 (Track B adds a mechanism pass). Revised plan in the
design spec; Pass 2 opener confirms it. Spec is the source of truth.

## Brainstorm Pass 2 -- COMPLETE (2026-05-16)

Scope: Track A call-graph construction mechanism. Shared foundation (command
case-fold harness) DROPPED -- CLOSED BY MEASUREMENT per the spec's SHIPPED
section (the entity-name case-fidelity mini-arc `8093e42f` made it provably
redundant; pools 77->74 cmd / 97->92 cvar with no harness change). Pass 2
narrowed to Track A only; 5-pass structure otherwise intact. Drain target:
design spec D3-D7.

**Sub-questions resolved:**

- **SQ2.1 -> D3:** conservative never-false-accuse posture as the governing
  rule; root set = per-config program-entry cascade UNION address-taken
  closure. Track-A output is an unseen published verdict
  (`reference_rigor_bar_follows_consumer`); aggressive stance rejected.
- **SQ2.2 -> D4:** reachability propagates through the full subtree
  (address-taken roots fully traversed). Intended: wide over-approximation
  -> small high-confidence genuine-dead core; most of the ~166 pool clears
  as build-excluded.
- **SQ2.3 -> D5:** three-valued per-config state (reachable / unreachable /
  not-compiled); not-compiled != dead is the central trap. Reachable in
  >=1 variant -> build-excluded; unreachable in every compiled variant ->
  genuine-dead core. Only core + commented-register auto-ships;
  build-excluded (incl. conservative residue) human-gated.
- **SQ2.4 -> D6:** integration = Option A, shared passenger on the existing
  single walk (Tier-1 module, one subscription seam, `reachable(entity)`
  contract). Locked properties: purely additive / non-corrupting
  (byte-identical existing output, zero-diff verified, walk recursion
  unchanged, fail-safe by construction) + modular / cleanly toggleable
  (single boolean; off == today's pipeline, no residual cost; on/off seam
  IS D2 per-fork gating). Option B rejected.
- **SQ2.5 -> D7:** scope boundaries. Commented-register is a SEPARATE
  textual feeder (libclang strips comments; not the call-graph) -- the
  genuine-dead list has two independent feeders, Pass 2 owns only the
  reachability feeder. Entity->registrar = enclosing function of the
  already-recorded registration site (non-issue). Signal representation =
  Pass 4 (boundary flagged, not crossed).

**Carry-forwards (tracks):**

- Track B (`HUD_Register` hidden-command recovery) -> **Pass 3** (next; in
  plan; fresh terminal).
- `runtime_reachable` schema / column / provenance + the two-feeder
  provenance distinction (D7) -> **Pass 4** (in plan).
- Runtime-dump cross-check + 3-gate known-answer harness
  (`sb_qtvlist_url` / `gl_outline_scale_world` / `cl_bobhead`) -> **Pass 5**
  (in plan).
- Detection-side dump automation (mailslot POC) -> parked in the spec's
  Carry-forward section; NOT this arc.
- Commented-register textual detector -> named in D7; not new (extractor
  already runs textual passes); covered by Pass 4 provenance + Pass 5
  feeder-b gate. No separate arc.

**Pass plan revision:** Pass 2 narrowed (shared foundation dropped, closed
by measurement); 5-pass structure intact. Pass 3 (Track B) NEXT, fresh
terminal. Resume cold via
`docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc-pass3-handoff.md`.

## Brainstorm Pass 3 -- COMPLETE (2026-05-17)

Scope: Track B mechanism -- model the `HUD_Register` contract so L1 stops
hiding the runtime-built HUD names. Drain target: design spec D8-D11 + D1
amendment. All Track-B line cites re-verified against live source HEAD
`3f9e724f` (the L1-extracted commit; version pin holds) -- no drift.

**Sub-questions resolved:**

- **SQ3.1 -> D8:** emission model = full static `HUD_Register` contract
  (bare `<name>` unconditional; `+hud_<name>`/`-hud_<name>` gated on literal
  `HUD_PLUSMINUS` + non-NULL `show`), every emitted name runtime-dump-gated
  (D3 conservative; never ship a name absent from the dump). The D1 open
  sub-question "are ALL first args literal?" is **RESOLVED BY MEASUREMENT**:
  83/83 call sites literal, 0 non-literal tail -- no constant propagation,
  no Track-A blend.
- **SQ3.2 -> D9:** integration = NEW dedicated `ezquake/_handler_hud.py`
  (project-private 8-handler pattern), purely additive (existing command
  handler emits nothing for the variable-named registration -- banked,
  primary-sourced), inheriting D6's byte-identical-existing-output +
  cleanly-toggleable discipline; on/off seam IS D2 per-fork gating.
- **SQ3.3 -> D10:** drift guard = lightweight 3-anchor known-answer set
  (bare `radar` / `+hud_radar`+`-hud_radar` / literal control `togglehud`
  untouched), NOT speculative change-detection. Pass 3 owns the design;
  Pass 5 owns harness wiring + full-pool dump cross-check.
- **SQ3.4 -> D11:** Track B scope WIDENED to the full `HUD_Register`
  contract -- also the runtime-built `hud_<name>_<subvar>` settings cvars
  (`HUD_CreateVar`, `hud.c:1146`, same hidden-name class, same call site,
  same mechanism, dump-gated identically). Amends D1's Track-B definition.
- **var_alias (param #2):** checked against live `HUD_Register` body --
  registers no command/cvar; not a hidden-name source. Closed, non-finding.

**Carry-forwards (tracks):**

- Unified L1 fidelity schema + provenance, now spanning Track A +
  **three** HUD families (bare commands / `+-` command pairs / `hud_*`
  settings cvars) under one signal model -> **Pass 4** (NEXT; in plan).
- Combined known-answer harness gains the Track-B anchors incl. a cvar
  anchor; full runtime-dump cross-check now spans the HUD command pool
  (~129, banked) PLUS a HUD settings-cvar pool whose hidden count is
  UNMEASURED -> **Pass 5** (in plan). Count deliberately NOT measured now
  (do-not-re-run-detection); safe pre-count under D8 dump-gating.
- AST-confirm 0 non-literal `HUD_Register` first args AND literal
  `HUD_CreateVar` varargs (subvar,value) pairs -> arc-planner/executor
  implementation gate (D8/D11 residual; the textual probe is signal, the
  AST is the instrument).

**Pass plan revision:** 5-pass structure intact. The D11 scope-widen added
NO pass -- absorbed into Pass-3 mechanism scope; re-sizing rides as Pass-4 /
Pass-5 carry-forwards. Pass 3 COMPLETE; Pass 4 (unified schema +
provenance) NEXT, fresh terminal. Resume cold via
`docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-pass4-handoff.md`.

## Brainstorm Pass 4 -- COMPLETE (2026-05-17)

Scope: unified L1 fidelity schema + provenance -- one signal model spanning
Track A's ghost verdict (with the D7.1 two-feeder split) and Track B's
recovered-hidden origin across the three HUD families (D11), no mechanism
blend (D1). Drain target: design spec D12-D16.

**Sub-questions resolved:**

- **SQ4.1 -> D12:** TWO physically separate provenance fields (Track A
  verdict / Track B origin) under ONE shared design language. Near-disjoint
  consumers -> separate fields; D1 no-blend becomes structural (different
  columns cannot co-mingle). Rejected single discriminated container as a
  shallow unifying wrapper.
- **SQ4.2 -> D13:** sparse, PER-VERSION, mechanism-derived (NOT HEAD-dump
  derived -- corrected an opening misframing). Each version's
  passenger runs on its own AST (free per D6/D9). THREE-level coverage
  semantic: no-signal / high-confidence-generalized (every non-HEAD
  version; LLM-usable, not autonomously shippable) / dump-confirmed (HEAD
  + deliberately-pinned releases). Per-fork one-time validation MANDATORY,
  does not transfer across engines; per-version re-confirmation is the
  only optional dump.
- **SQ4.3 -> D14:** shared three-slot spine -- conclusion / evidence /
  dump-confirmation status. Evidence is the trust-bearing slot; slot 3 is
  representation only (Pass 5 owns the cross-check).
- **SQ4.4 -> D15:** Track A arm -- final verdict in conclusion;
  per-build-variant breakdown as FEEDER-TAGGED evidence (D7.1 split made
  structural: call-graph -> per-variant breakdown, commented-register ->
  textual cite). Justified by autonomous-consumer auditability + D13
  level-2 (most versions have only the evidence to stand on).
- **SQ4.5 -> D16:** Track B arm -- LINKED: each recovered HUD name carries
  the HUD element it belongs to (literal `HUD_Register` arg #1). LLM
  answers "how does radar work" as a coherent whole; no string-prefix
  guessing. Resolves the open carry-forward (family marker must be
  LLM-semantic).

**Carry-forwards (tracks):**

- Combined known-answer harness + full runtime-dump cross-check (Track A
  3-gate + Track B anchors incl. cvar anchor) -> **Pass 5** (in plan).
- Pass 5's acceptance gate must implement the D13 three-level consumer
  split: autonomous-ship only level-3 (dump-confirmed); level-2 is
  LLM-usable but never auto-shipped -> **Pass 5** (NEW input from Pass 4).
- Per-fork one-time validation mandatory + does-not-transfer (D13 teeth)
  -> **Pass 5** acceptance contract + future per-fork onboarding
  constraint (sharpens D2).
- AST-confirm 0 non-literal `HUD_Register` first args + literal
  `HUD_CreateVar` varargs pairs (D8/D11 residual) -> arc-planner/executor
  implementation gate (unchanged).
- Field-shape mechanics (D15 evidence sub-fields; D16 element-key emission
  + loader storage) -> arc-planner scaffold (implementation-shaped; the
  Pass-4 exit boundary).
- Open Pass-4 carry-forward "Track-B family marker must be LLM-semantic"
  -> RESOLVED by D16 (Linked). Closed, not loose.

**Pass plan revision:** 5-pass structure intact; no pass added. Pass 4
COMPLETE; Pass 5 (application + dual acceptance gates) NEXT, fresh
terminal. On Pass-5 close the brainstorm EXITS to arc-planner. Resume cold
via
`docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-pass5-handoff.md`.

## Brainstorm Pass 5 -- COMPLETE (2026-05-17) -- BRAINSTORM EXITS

Scope: application + dual acceptance gates -- how the two settled mechanisms
produce L1 output and the acceptance contract that gates it. Drain target:
design spec D17-D22 (+ D11 amendment + siblings + pass table).

**Sub-questions resolved:**

- **SQ5.1 -> D17:** ONE shared acceptance-contract shape (3 stages:
  validate-mechanism / dump-cross-check / route-by-level), instantiated
  per-track (feeder-specific in Track A), D13 three-level state as the
  single shared ship-vs-surface spine. Mirrors D12 at the acceptance layer.
- **SQ5.2 -> D18:** stage 1 = hard / all-or-nothing / loud /
  one-time-per-fork mechanism-validation gate (Track A 3 probes + Track B
  anchors). Any wrong probe -> no signal for that fork, fall back to
  today's pipeline, alert. NOT a per-version output check.
- **SQ5.3 -> D19:** stage 2 = runtime dump is the overriding answer key;
  static proposes, dump disposes, disagreement resolves conservative;
  version-pin sanity proxy a hard sub-gate (broken -> zero level-3 for that
  dump). Level-3 exists only for pinned-dump commits, by design.
- **SQ5.4 -> D20:** Track-A application = two outputs (always-on
  per-version L1 signal over the 74-cmd/92-cvar pool; level-3-only
  feeder-tagged PR-ready delete-list regenerating
  `ezquake-runtime-dead-entities.md`). Build-excluded only in the signal,
  never the delete-list.
- **SQ5.5 -> D21:** Track-B application = recovered HUD **commands** (bare /
  `+hud_` / `-hud_`) as first-class L1 command entities, element-linked
  (D16), dump-gated into D13 levels; nothing withheld. Commands-only
  (cvars struck, see below).
- **SQ5.6 -> D22:** per-fork, per-track onboarding precondition
  (fork-specific harness mandatory + non-transferable; fork-pinned dump for
  level-3, absence -> permanent level-2 not failure; off-by-default toggle
  enforces it; server-only fork -> Track B N/A). Sharpens D2.

**Mid-pass correction (operator-driven spot-check + dispatched audit, both
overseer-re-verified):**

- **D11 cvar half STRUCK.** Premise ("`hud_<name>_<subvar>` cvars are a
  hidden class") REFUTED: `ezquake/_handler_cvars.py` already synthesizes
  them from `HUD_Register` into first-class `source_backed type='cvar'`
  entities (verified 1429 in backup DB; radar 32, clock 18). Track B
  narrowed to commands-only. Implementation guard: new `_handler_hud.py`
  emits commands only (cvar collision on `UNIQUE(project,type,name)`).
  D11 annotation fix: `order` unconditional, `show` gated. Canonical
  `feedback_parking_verified_state_is_hypothesis` catch at Pass 5.

**Carry-forwards (tracks):**

- ezQuake help-JSON documentation-gap arc -> **NEW future arc**, parking
  `docs/superpowers/parking/2026-05-17-ezquake-helpjson-doc-gap-arc.md`;
  sequenced AFTER this arc (genuine dependency). Recorded in spec siblings.
- Pre-existing 1429 `hud_*` cvars carrying the D16 element key -> cheap
  future sibling wire (`_handler_cvars.py` already knows the element);
  flagged, not this arc.
- AST-confirm 0 non-literal `HUD_Register` first args (D8 residual; cvar
  varargs residual now moot -- cvar half struck) -> arc-planner/executor
  implementation gate.
- Field-shape mechanics (D15 evidence sub-fields; D16 element-key emission;
  delete-list format; harness wiring) -> arc-planner scaffold.

**Pass plan revision:** brainstorm COMPLETE. All five passes closed; no
pass added by Pass 5. Remaining unknowns are implementation-shaped.
**EXITED to arc-planner** via
`docs/superpowers/parking/2026-05-17-libclang-callgraph-reachability-arc-planner-handoff.md`.
