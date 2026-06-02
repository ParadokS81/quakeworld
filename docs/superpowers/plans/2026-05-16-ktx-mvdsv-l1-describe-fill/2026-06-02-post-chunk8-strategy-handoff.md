# Handoff — MVDSV describe-fill post-chunk-8: STRATEGY conversation

**Spin up a fresh terminal with this prompt. This is a STRATEGY conversation, not execution.** The
MVDSV describe-fill NULL-fill is done; the job now is to decide the next arc direction WITH the operator
(harvest vs expand-to-dusty vs finish-MVDSV), then route to the right skill. Do not start executing
before the operator picks a direction.

## Where things are (verified 2026-06-02)

- **MVDSV Layer-1 describe-fill NULL-fill is COMPLETE.** 345/347 in-scope entities have descriptions; the
  only 2 blanks are `sv_antilag` + `sv_antilag_projectiles` (parked on the D10 cross-fork track). 243 rows
  carry the full synthesis verdict-trail. Committed + pushed (commits `50101a56` / `5305e774` / `8855a70b`
  / `f14e9972`); in-scope fingerprint `5e94a76983ed72c28be135eef609e838`.
- **The Workflow feature was the experiment (chunks 1-8 via `describe-fill-chunk-runner.js`) — verdict: it
  works.** Two-pass per knob (Opus-MAX writer in groups of <=4, then an independent cold Opus-MAX verifier),
  HG1 planted-canary honesty gate, MAIN-owned F-D6a/HG2/persist. Chunk 8 (82 knobs across 4 runs): every run
  HG1-clean first wave; the cold verifier flagged 22 real defects (incl. 7 flat contradictions like a flipped
  polarity), **zero false positives**. One known blind spot: the verifier checks descriptions against the CODE
  at the pinned commit, not runtime, and cannot see build-gates (`#ifdef`) — build-conditional/unused features
  need human domain signal (the voip catch this session).
- **61 findings logged**, all `open` + untriaged, in `mvdsv-describe-fill-findings.md`: 19 upstream-bug,
  4 security, 14 cross-mod/L3, 12 dead-suspect, 10 behavior-quirk, 1 perf, 1 doc-nuance. This is the
  concentrated output of the arc — the thing to harvest.
- **Rigor gap (known):** ~102 MVDSV entities have descriptions that PREDATE the V-pass standard (35 cvar +
  22 command + all 45 info_key carry a description but `description_verdict IS NULL`) — early hand-fills,
  serviceable but not enforce-traced. Lowest-urgency.

## The open decision (what to talk through with the operator)

1. **HARVEST the 61 findings.** Two sub-tracks: (a) **upstream PRs** for the ~23 bug/security findings —
   lead with memory-safety: `penfilters[]` buffer overflow (#15), `sv_mod_msg_file` OOB read from a pattern
   file (#59); then `script` path-traversal (#23), `localcommand` author-flagged `system()` "REMOVE ME"
   (#30), `vip_addip 0` = everyone-VIP (#14), `sv_specprint` checks the wrong player (#55). Operator signs
   the DCO (`Assisted-by: Claude:<model>`, NOT Co-Authored-By — upstream convention, see CLAUDE.md). (b)
   **L3 concept notes** from the 14 cross-mod/L3 findings (match-rule cvars engine-stored/mod-enforced #41,
   VIP #57, bandwidth #49, identity bank #37, lastscores #56) — the oracle's real product value.
2. **EXPAND to the dusty forks.** `research/repos/dusty-mvdsv` (`0.35-195-g16add64`) + `research/repos/dusty-ktx`
   (`v1.40-848-g6f35a239`) — largely similar to mvdsv/ktx but with DIFFERENT antilag + other features.
   Fork-onboarding via the **`onboard-extractor`** skill (fork-subclass path, NOT a fresh port — they
   subclass the parent handlers), then describe-fill only the DIVERGENT entities. The Workflow chunk-runner +
   `describe-fill-synthesis` machinery is reusable as-is. **Strategic thread:** antilag is exactly where dusty
   diverges, and the D10 antilag track (below) is the same subject — so D10 antilag + dusty antilag are
   plausibly ONE combined investigation.
3. **FINISH MVDSV.** D10 `sv_antilag*` (the 2 remaining cvars — a cross-fork dual, entangled with dusty's
   antilag) + the 102 rigor-catchup rows (esp. the 45 info_keys at 0 verdicts).

## Trade-offs (bring these to the operator; recommend, don't poll)

- **Harvest** banks value already gathered; highest community value (real defects in software people run);
  discrete, operator-signable units. Cost: context-switch away from the extraction machinery.
- **Dusty** reuses the proven machinery while it's warm and widens coverage; but defers the harvest, and
  the antilag divergence is the gnarly part. The dusty-antilag ↔ D10-antilag entanglement is the interesting
  angle: one combined antilag arc across mvdsv + the forks.
- **Suggested opener:** a cheap **findings triage** first (10 min — rank the 61 open rows: which bugs are
  PR-ready vs need a second look, which findings cluster into which L3 note). That turns the backlog into a
  plan regardless of which big direction wins. Then recommend harvest-PRs (if banking bugs) or the
  combined dusty+antilag arc (if keeping the machinery warm).

## Reads required (cold-start order)

1. This file.
2. `workflow-chunk-campaign-brief.md` — the arc's durable record (cursor + per-chunk learnings log; chunks
   1-8). The "Learnings log" is the methodology memory.
3. `mvdsv-describe-fill-findings.md` — the 61-finding backlog (the harvest target).
4. `HANDOVER.md` Active-arcs entry for this arc + the MCP-realignment entry (line ~22 — the MCP must be
   re-truthed to serve the new MVDSV L1 layer, same as the KTX caveat).
5. Memories: [[project_extraction_pipeline_vision]], [[project_qw_oracle_product_vision]],
   [[reference_asset_loader_extractor_capabilities]], the describe-fill verification-discipline cluster.

## Critical rules

- The chunk-runner + `describe-fill-synthesis` skill are PROVEN (anchor-pinned, two-pass, canary-gated).
  Reuse, don't reinvent. The runner script + brief are at this plan dir.
- Dusty repos are **FORKS** (subclass the parent handlers) — `onboard-extractor` has the fork-vs-port branch.
- Findings are **hypotheses until re-verified** — grep every cited file:line against live source before
  acting on a finding (verify-before-write; some findings cross-reference each other).
- A parallel session has been committing KTX game-mode work to `main` — different topic, but expect
  interleaved commits; stage only your own files.

## First actions

1. Read the brief + findings + this handoff (cold).
2. Optionally run the findings triage (rank the 61).
3. Lay out the 3 options + trade-offs to the operator; recommend.
4. Once decided: route to `onboard-extractor` (dusty), a PR-prep flow (harvest), or the D10 antilag track —
   and if dusty+antilag, scope them as one arc.

## When in doubt

The arc's detailed state is the brief; the harvest is the findings doc; the MCP must be re-truthed before
the new MVDSV L1 is fully consumable (HANDOVER MCP-realignment entry). Ask the operator on direction —
this is their call (PR engagement vs coverage expansion vs polish).
