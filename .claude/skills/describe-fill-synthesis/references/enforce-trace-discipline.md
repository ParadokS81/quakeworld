# enforce-trace discipline (D7 amendment B1, 2026-05-19)

Load-bearing. Governs Step 1, Step 5, and the Verification-discipline
section of SKILL.md for EVERY invocation -- first-pass synthesis AND
re-synth, both engines. Authority: `decisions.md` D7 Amendment 2026-05-19
(B1). This file is the full method; SKILL.md carries only the pointers.

## Why this exists (the flavour-C finding)

A description can be confident, well-written, internally consistent, cite
a real source line, and still be WRONG -- because a semantic / threshold /
polarity / scope / OFF-state / side-effect clause was inferred from the
knob name, an announce/redtext string, an enum name, or a config comment,
and the code that actually ENFORCES that clause was never traced. This
class ("flavour-C") is invisible at output-inspection: nothing in the
text signals it; only an independent per-clause enforcement trace finds
it. A 2026-05-19 random-fleet probe measured ~14% of the un-reviewed
confident KTX fleet carrying such a clause (~7% flatly wrong). The remedy
is not a per-row patch -- it is this discipline, applied to every clause
of every row.

## The core rule

For EVERY semantic / threshold / polarity / scope / OFF-state /
side-effect clause in the description you produce or check:

1. Locate the source line that ENFORCES that specific clause (the branch,
   comparison, assignment, or call that makes the clause true at
   runtime). Not a line that mentions the knob -- the line that enforces
   the assertion. **If the clause is mediated by a function call, follow
   the call chain into the callee.** The line in the caller that invokes
   the helper is NOT the enforcing line unless the gating logic the
   clause asserts lives in the caller itself. A caller that gates on
   conditions DIFFERENT from the asserted clause is the wrong line, even
   when the synth's reasoning names the callee explicitly. Stopping at
   the caller is the structural sibling of the r42 anti-shortcut.
2. Verify the clause against that line's ACTUAL code AND its adjacent
   comments (a comment two lines away can invert the meaning -- e.g.
   "speed is zeroed and not restored").
3. If no enforcing line exists for a clause, that clause is FORBIDDEN:
   remove it, hedge it, or route to residue. Never assert it.

A clause that could only have come from the knob NAME, an
announce/redtext string, an enum NAME, or a config comment -- with no
enforcing read-site cited -- is a flavour-C defect even if it happens to
be true.

## The r42 anti-shortcut (this is the whole point)

A cited, consistent-LOOKING line is NOT a pass. The original failure mode
that this rule defeats: a worker cites a line that is real and plausibly
related, declares the clause confirmed, and never checks that the line
enforces the SPECIFIC assertion (the exact threshold value, the
direction/polarity, the scope condition, the restore-set, the OFF-state
behavior). "The cited site looks right" is the disease. "I found the
line that enforces this exact clause and the clause matches its code and
adjacent comments" is the bar. If deciding a clause needs a callee or a
helper, read the callee.

## WI-1 (wide read, strengthened)

- Grep the WHOLE source tree for EVERY use-site of the knob: registration
  AND every read (`cvar("X")`, `cvar(MACRO)`, any global the value is
  loaded into) AND every branch gated on it. Do not stop at the first or
  the cited site.
- Any reasoning of the form "grouped with X / not at a single site /
  lives in a callee we did not trace" is a DEFECT SIGNAL, not a hedge --
  trace it anyway and expect a possible inversion (the highest-severity
  walk defects were exactly these).
- Then apply the core rule to every clause.

## WI-2 (metadata precision)

- A "Default <X>" claim must be verified against the REGISTERED default:
  grep `RegisterCvar` / `RegisterCvarEx` for the cvar. A bare
  `RegisterCvar("x")` or `RegisterCvarEx("x", "")` means default 0/empty,
  NOT any value found in a shipped .cfg. A shipped-cfg value is a C2
  distribution-drift datum, never the registered default.
- An "admin" / "player" / "spectator" access-class claim must be verified
  against the command-table `CF_` flag AND the handler's actual access
  check -- never inferred from the command name. (`CF_MATCHLESS` is
  additive "also valid in matchless mode", NOT "only when no live match"
  -- the autotrack example below.)

## PROC-1 (fact vs judgment)

- Call a clause/row clean ONLY when it reduces to a checkable fact
  confirmed at its enforcing line.
- The moment the residual is a JUDGMENT (is the framing misleading,
  affirm-vs-synthesize, a D10/presentation policy call), surface it --
  never absorb a judgment into a CLEAN because the underlying facts
  checked out.

## The verification (V-pass) classification enum

When this discipline is run as a read-only V-pass over an
already-synthesized row, the row gets exactly one:

- **TRACED-CLEAN** -- every material clause maps to a located, verified
  enforcing line (incl. adjacent comments). Still-true minor vagueness
  that was traceable is acceptable.
- **C-NEAR-MISS** -- essentially correct, but >=1 clause is only
  name/enum/string/comment inference (no enforcing line, or the real
  code is narrower / more conditional than implied). flavour-C-positive.
- **C-FIX** -- >=1 clause is WRONG vs its enforcing line. flavour-C
  defect.
- **WI2-FIX** -- core behavior fine, a metadata clause (default /
  access-class) wrong. Reported separately; not counted as flavour-C.

A first-pass synthesis must produce text that would classify
TRACED-CLEAN: if any clause cannot be enforcement-traced, hedge or route
it (Step 4) rather than assert it.

## Canonical worked cases (from the 2026-05-19 probe)

- **autotrack -- C-FIX.** Synthesized clause: "allowed only outside a
  live match." Inferred from the `CF_MATCHLESS` flag NAME. The enforcing
  site (DoCommand dispatch) makes `CF_MATCHLESS` ADDITIVE permission
  ("also valid in matchless mode"); a command with `CF_MATCHLESS` but not
  `CF_MATCHLESS_ONLY` is dispatchable during a live match, and no
  `match_in_progress` guard exists in the autotrack path. The clause is
  flatly wrong and was invisible at output-inspection. Lesson: an
  access/scope clause from a flag NAME must be traced to the dispatch
  code that interprets the flag.

- **k_teamoverlay -- C-NEAR-MISS.** Synthesized clause: "not in duel."
  True (isDuel is mode-exclusive with the stream's team/ctf/coop gate)
  but NEVER enforced on the feature -- the only `!isDuel()` is on a
  settings-SUMMARY display string, an unrelated site. Lesson: a
  correct-by-accident scope clause with no enforcing read-site on the
  feature itself is still a flavour-C near-miss; trace it or drop it.

- **dropquad / DropPowerup -- callee-follow (verifier false-negative
  recovered via HG2 adjudication).** B4 dead-CF_SPC_ADMIN cluster,
  dropquad rev=3 (2026-05-20). Synthesized clause: "the match to be
  live" gates the drop. The caller `DropPowerups` plural
  (items.c:1972-1996) gates on `dq`/`k_pow_q`/`Get_Powerups`/`k_berzerk`
  -- NOT on match state. The callee `DropPowerup` singular
  (items.c:1869+) carries the live-match gate at items.c:1874:
  `if ((timeleft <= 0) || (match_in_progress != 2)) return;`. A blind
  verifier checked only the caller, did not follow into the callee
  even though the synth's reasoning named the callee explicitly, and
  classified the clause UNTRACEABLE -> C-NEAR-MISS. The orchestrator
  HG2 re-grep followed the callee, located items.c:1874, and
  adjudicated TRACED-CLEAN. Lesson: a clause whose effect is mediated
  by a function call must enforce-trace to the callee's gating logic,
  not the caller's. If the synth's reasoning names a callee site
  explicitly, the verifier MUST read the callee before classifying.

## Seeded re-synth (B4) -- when invoked to correct a flagged row

A V-pass-flagged row that routes back here for re-synth is NOT a
one-sentence patch and NOT a blind re-derivation:

- Run the FULL discipline from Step 1 (the failure was under-tracing; the
  fix is more tracing, never an edit of the offending sentence alone).
- The V-pass finding (the specific wrong clause + the enforcing file:line
  the V-pass located) is a MANDATORY seed input: it anchors the
  re-derivation and guarantees the known-wrong clause is addressed, but
  it does not narrow scope -- every other clause is still fully traced
  (a row flagged on one clause may carry a second untraced clause).
- Seeding makes this a closed, anchored re-derivation, NOT a blind
  second synthesis (a blind second synthesis re-asks the open question
  and re-inherits flavour-C). Emit a normal D6 record; it will be
  re-verified through the V-pass.

## Record contract (B5)

V-pass output is machine-collatable per the V-pass / re-synth subagent
brief (`subagent-brief-template.md`): per row, the classification + a
per-clause table (clause | enforcing file:line | verbatim snippet |
MATCH / MISMATCH / UNTRACEABLE) + a one-line rationale. Stage-1 ledger
(what was found) and Stage-2 change report (old -> new + trigger + the
re-synth + re-V result) reconstruct from it without hand-merging. D11
governs: provenance STORED, not just logged.
