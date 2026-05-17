# Review findings -- brainstorm-residual + correction + risk ledger

**This is NOT a prior-plan defect audit.** This arc has no prior monolithic
plan. The brainstorm (Passes 1-5) was thorough and is closed. This file is
the watch-list a phase drafter consults: corrections the spec prose got wrong
that drafters must apply, implementation residuals the brainstorm explicitly
deferred to arc-planner/executor (each owned by a named phase), and risks to
defend against. New risks found during phase drafting append here with the
next sequential suffix and a phase tag.

Severity legend: **F** = confirmed correction (spec/prose is wrong; apply the
fix). **R** = implementation residual (brainstorm-deferred; the owning phase
must resolve it). **W** = risk / watch-list (defend against it).

---

## F -- confirmed corrections (apply these; do not propagate the wrong form)

### F1 -- D11 prose mislabels `order` as gated

**Correction:** The original D11 body says the structural subvar `order` is
"(gated)". Live `hud.c:1241-1360` (audit-verified,
`docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`
section 3) shows `order` is **UNCONDITIONAL** (bare block 1241-1246 scoping a
local buffer, NOT an `if`); `show` is the gated subvar (`if (show)` 1265).
Both existing handlers emit `order` unconditionally (correct). The handler
code is right; only the spec prose annotation is wrong.

**Impact on this arc:** LOW -- the cvar half is struck (D11 amended), so the
structural subvar gating does not drive any code this arc writes. Recorded so
a Track-B drafter reading the spec body is not misled into thinking the
command contract has an analogous mislabel. The command-half gating
(`+hud_`/`-hud_` on `HUD_PLUSMINUS` + non-NULL `show`) is independently
correct in D8.

**Resolved by:** decisions.md D11 amendment (prose-correction bullet).

### F2 -- parking-doc candidate-pool numbers are STALE

**Correction:** `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
Scope section says "97 cvar + 74 command" and "~166 pool" and "132-command
reverse anomaly". These are PRE-mini-arc figures. The spec's SHIPPED section
(re-measured 2026-05-16 on the shipped DB after entity-name case-fidelity
mini-arc `8093e42f`, verified not inferred) is the source of truth:
**74 commands + 92 cvars** banked HEAD pool; Track-B reverse-diff
**~129 genuine hidden commands** (132 -> 129; the case trio was the only
case noise, NOT the bulk).

**Action for every drafter:** use 74 / 92 / 129. Never quote the parking
Scope numbers. Re-verify against the live DB at execution (X8 / W2).

**Resolved by:** decisions.md X7; this finding.

### F3 -- parking-doc variant count is STALE

**Correction:** The parking doc says the extractor "dual-parses
client/server (27 conditional macros)". The spec D3 corrects this to **4
build variants: client / server / win / apple**, verified live in
`extractor_lib/clang_config.py` (`clang_args_for` / `_server_for` /
`_win_for` / `_apple_for`). The per-config union (D5) MUST cover all 4 or
win/apple-only registrars get false-accused (a D3 violation).

**Action for the Track-A drafter:** recon `clang_config.py` live; confirm the
4-variant set before the root-set/union logic is load-bearing.

**Resolved by:** decisions.md D3 implication; this finding.

---

## R -- implementation residuals (brainstorm-deferred; owning phase resolves)

### R1 -- AST-confirm 0 non-literal `HUD_Register` first args

The "83 sites, 100% literal first arg, 0 non-literal tail" finding (D8) is
from a textual tokenizing probe, not the libclang AST instrument. Before the
literal-only assumption is load-bearing in `_handler_hud.py`, the
implementation must confirm 0 non-literal `HUD_Register` first args via the
extractor's actual AST.

**Owned by:** Track-B mechanism phase. **Default if a non-literal is found:**
STOP -- this contradicts D8; surface to operator (do not silently
constant-propagate; that would blend toward Track A's mechanism, violating
D1).

### R2 -- D15 evidence sub-field decomposition + D12 field shape

Exact variant identifiers (the 4 config names as stored), the
conservative-residue flag encoding (D5 address-taken residue must be visible
in the breakdown), and the evidence column-vs-JSONB decomposition for the two
separate provenance fields (D12) are implementation-shaped.

**Owned by:** schema + loader phase. **Constraint:** two physically separate
nullable fields, no `kind` discriminator (D12); feeder tag is structural
(D15).

### R3 -- D16 element-key emission + loader storage shape

How `_handler_hud.py` emits the HUD element key (the literal `HUD_Register`
arg #1) and how the loader stores it so the LLM is told
`radar`/`+hud_radar`/`-hud_radar` group to `radar`.

**Owned by:** Track-B mechanism phase (emit) + schema + loader phase (store).

### R4 -- delete-list format = regenerate the shipped artifact's exact shape

The autonomous delete-list (D20 output 2) regenerates
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`. The
exact artifact shape (sections, feeder tagging per entry, the existing
sb_qtvlist_url/gl_outline_scale_world/cmdline-ghost layout) must be read from
the live in-repo file and matched byte-shape.

**Owned by:** application phase. **Constraint:** build-excluded bucket NEVER
in the delete-list (D20); each entry feeder-tagged (D7.1/D15).

### R5 -- combined known-answer harness wiring

Composing Track A's 3 probes + Track B's 3 anchors into the one
hard/all-or-nothing/loud one-time-per-fork gate (D18), reading the
feeder/family tags, with the LOUD failure path that falls the fork back to
today's pipeline.

**Owned by:** acceptance phase. **Constraint:** composition of probes the
mechanism phases already shipped (X2) -- NOT new validation logic invented
here.

### R6 -- version-pin sanity-proxy implementation (D19 hard sub-gate)

The `sb_qtvlist_url`-style known-live leak check that gates level-3: broken
pin -> ZERO level-3 stamps for that dump, everything falls to level-2.

**Owned by:** acceptance phase. **Reuse:** the proxy already exists in the
banked detection scripts (W1) -- locate and reuse, do not reinvent.

### R7 -- cvar-collision guard on the new `_handler_hud.py`

The new handler emits COMMANDS ONLY. If it ever synthesizes a `hud_*` cvar it
collides with `ezquake/_handler_cvars.py:288-351` (wired `:384/:413/
:481-482`) on `entities UNIQUE(project,type,name)`.

**Owned by:** Track-B mechanism phase. **Verification:** the phase ships a
probe asserting `_handler_hud.py` emits zero `type='cvar'` entities (the D10
anchor-3 additivity gate extended).

---

## W -- risks / watch-list (defend against these)

### W1 -- `/tmp/` volatility of the banked detection assets

The parking doc references `/tmp/front1-diff.sh`,
`/tmp/cmdline-liveness.sh`, and ephemeral candidate pools. `/tmp` does not
survive a reboot. The ONLY durable in-repo artifact is
`apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`. The
acceptance phase needs the pinned HEAD runtime dump + the version-pin proxy
script as its answer key (D18/D19).

**Mitigation:** prerequisites.md Task 0 -- locate the banked dump + detection
scripts; if only in `/tmp`, relocate into a durable repo path BEFORE the
acceptance phase. Surface to operator at scaffold review.

### W2 -- spec-verified numbers are hypotheses until re-checked live

X8 / `feedback_parking_verified_state_is_hypothesis`. The spec marks its
pool numbers "measured, verified not inferred" -- that raises, not lowers,
the bar for the executing terminal to re-run the sanity gate against the live
DB and re-verify line cites against live source before they are load-bearing.
Every phase MD's "Recon facts (verified)" sub-block records the re-check.

### W3 -- the zero-diff non-corruption bar must be a real check

X3. "Existing output unchanged" asserted in prose is not acceptable. Both
mechanism phases ship the actual before/after diff command (toggle off vs
prior HEAD emitted JSON) and its empty result as a phase-boundary probe.

### W4 -- regime-collision temptation in the mechanism phases

The biggest slicing risk: a drafter verifying the Track-A phase via "the L1
column shows genuine-dead" (schema phase not built yet) or the Track-B phase
via "the combined harness passes" (acceptance phase not built yet). Both are
collisions. X2 forbids it: mechanism phases verify against the mechanism's
OWN output (the `reachable()` query / the handler JSON) with their OWN probes.

---

## Phase ownership of findings / residuals

Phase roles map to locked phase numbers once slicing is operator-gated
(README phase index). Roles: **A** = Track-A mechanism; **B** = Track-B
mechanism; **S** = unified schema + loader; **ACC** = acceptance contract;
**APP** = application outputs.

| Item | Owning phase role | Resolution |
|---|---|---|
| F1 (order/show prose) | B (awareness only) | decisions.md D11 amendment; no code impact |
| F2 (stale pool numbers) | A, B, ACC, APP | use 74/92/129; re-verify live (X8) |
| F3 (stale variant count) | A | recon `clang_config.py`; 4 variants |
| R1 (AST-confirm literal) | B | AST probe before literal-only is load-bearing |
| R2 (D15/D12 field shape) | S | two separate fields; feeder tag structural |
| R3 (D16 element key) | B (emit) + S (store) | element-grouped provenance |
| R4 (delete-list shape) | APP | regenerate the in-repo artifact byte-shape |
| R5 (harness wiring) | ACC | compose mechanism-phase probes (X2) |
| R6 (version-pin proxy) | ACC | reuse banked proxy (W1) |
| R7 (cvar-collision guard) | B | zero-`type=cvar` emission probe |
| W1 (/tmp volatility) | prerequisites + ACC | relocate dump/scripts durable |
| W2 (verified=hypothesis) | all | Recon-facts sub-block per phase |
| W3 (zero-diff real check) | A, B | shipped diff command + empty result |
| W4 (regime collision) | A, B | verify on mechanism's own output (X2) |
