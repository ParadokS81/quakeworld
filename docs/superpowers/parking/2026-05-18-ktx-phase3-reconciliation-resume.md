# KTX Phase-3 POST-FLEET RECONCILIATION resume (2026-05-18)

> **!!! READ THIS FIRST. The cat-1 volume fan-out (Task 2) is COMPLETE:
> `--status` == 624 evaluated / 0 remaining, zero-fabrication held. The
> post-fleet reconciliation terminal drained the 59-cvar slice-3 tail
> and built the operator review surface. What remains is GATED ON THE
> OPERATOR'S MANUAL SCAN of the review page (Task 5 / D7 tier-2 -- the
> human gate). Do NOT auto-run Task 3 / Task 4 / the phase boundary
> before the operator reports a scan verdict -- a grave-error finding
> changes everything. The live DB cursor wins over any doc;
> re-verify, do not trust blind. !!!**

Supersedes the fleet/reconciliation pointer in
`docs/superpowers/parking/2026-05-18-ktx-cat1-fleet-handoff.md` and the
`2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md` banner.
The phase MD + `decisions.md` (incl. the 2026-05-18 amendments below) +
`review-findings.md` + the phase-3 executor prompt still govern.

## Where things are (live-verified 2026-05-18; RE-VERIFY, do not trust blind)

- **Arc:** `2026-05-16-ktx-mvdsv-l1-describe-fill`, Phase 3.
- **Cursor:** `bun scripts/describe-fill/synthesize-ktx.ts --status`
  (from `apps/qw-oracle`) == **624 evaluated / 0 remaining**
  (command 358/0, cvar 259/0, info_key 7/0). "Fan-out complete."
- **Global fingerprint** (post-batch-12, single-terminal):
  `--fingerprint` == `911fca197de2e980ab3f8a6db18f1321`. If a fresh
  terminal sees a different fp with 0 remaining, something else mutated
  ktx rows -- investigate before any further write.
- **k_short_gib** terminal row intact: origin/verdict `synthesized`,
  anchor `1.47-2-g67253dc`, `updated_at` `2026-05-17` (the Phase-3 fan
  correctly excluded it; untouched this session).
- **ktx clone** pinned `67253dc9` == `1.47-2-g67253dc` == anchor
  (read-only; never checkout/pull/fetch).
- **Verdict mix (in-scope 624, DB-confirmed):** 583 synthesized + 4
  hedged (origin synthesized) + 38 affirmed (origin source_inline,
  null anchor). Every in-scope synthesized row carries >=1 source
  citation (0 missing; min 1 / max 9 / avg 4 provenance entries).

## What shipped this session (the post-fleet reconciliation terminal)

1. **59-cvar slice-3 tail drained** (batches 07-12; the overnight 4-lane
   fleet drained the other 369 of the 488 pool). Every batch: Opus-4.7-MAX
   D6 synthesis sub-agent (writes records file; dispatcher never ingests
   prose) -> F-D6a c1 shape / c2 independent re-grep of EVERY cited line
   at `67253dc9` / c3 2-sample prose tripwire -> `--persist --dry-run`
   == `--persist` -> single-terminal global-fp-delta + per-knob
   verdict-bearing == N. **Zero fabrication held every batch; c2 PASS
   every batch (no dispatcher self-patch ever needed -- the sharpened
   cvar-line requirement (d) fixed the drift at source).** Records:
   `output/describe-fill/phase3-records-slice3-batch{07..12}.json`
   (gitignored, idempotent, re-runnable).
2. **Operator review surface built** (Task-5 surface, operator-directed
   enhancement -- see decisions.md amendment A2):
   `apps/qw-oracle/scripts/describe-fill/review-views.ts` (NEW, tracked,
   pure read-only DB projection, ASCII-only, idempotent) emits
   `output/describe-fill/ktx-review-views.html` (gitignored artifact).
   Two views: **Catalog** (all 625 rows once, 15 functional buckets,
   hedged + comment-vs-source-conflict rows visually flagged) and
   **By-Mode** (per-mode knobs split Signature vs shared Baseline;
   standalone vs mutator -- the cross-arc lens for the halted
   game-mode-semantics arc). Independently verified: 625 each once,
   ASCII-clean, idempotent (md5 `91c9df38cca89e2d3f1c9ad631b661e8`),
   contract emitter `serialize-audit-review.ts` UNMODIFIED, DB untouched.
   A scan copy was placed at
   `C:\Users\Administrator\Downloads\ktx-review-views.html`.
3. **B accounting GREEN** (Task-4 substance, scoped correctly): 624
   in-scope all settled (358 cmd + 259 cvar + 7 info_key), 0 in-scope
   synthesized rows missing a citation, 0 duplicate canonical_ids,
   k_short_gib intact. (Two false alarms during the session -- a
   non-ASCII grep that was a shell pipe-exit bug; a "7 missing
   citations" that was an unscoped query catching `match_event` rows
   from a different pipeline. Both were the dispatcher's ad-hoc check
   scripts, not the data; the underlying work verified clean.)

## Decisions ratified by the operator this session (recorded in decisions.md as 2026-05-18 amendments)

- **A1 -- D7 tier-1 automated re-check DEFERRED pending the manual
  scan.** Operator decision: do NOT run the independent Opus-4.7-MAX
  per-row evidence re-check (Task 3; ~594 synthesized rows ~= a SECOND
  overnight fleet) UNLESS the operator's manual grouped scan (Task 5)
  surfaces grave errors. Rationale: F-D6a already proved citation
  integrity (every cited line byte-exact at `67253dc9`); the operator's
  grouped scan IS the spec-locked human correctness gate (D7 tier-2 /
  D18). This is an amendment to D7 (which locks tier-1 as load-bearing /
  every-row). **If the scan finds grave errors -> tier-1 (the fleet) OR
  targeted re-synthesis returns.** If the scan is clean -> tier-1 is
  formally retired for KTX, recorded.
- **A2 -- Task-5 review surface enhanced.** Operator directed a
  two-view grouped page (Catalog + By-Mode, signature-vs-baseline)
  instead of the plain alphabetical Phase-1 emitter output. Kept
  emit-from-record / regenerable (D11/D15 preserved); the Phase-1
  `serialize-audit-review.ts` is left UNMODIFIED as the separate
  contract emitter.
- **A3 -- dispatcher self-patch of raw_comment authorized** (executor
  process layer, not a decisions.md/spec change). Applied-as-available
  for the tail; **never triggered** -- the sharpened cvar-line
  requirement (d) prevented the drift at source. Carry-forward: fold
  the cvar-line (d) sharpening into the canonical per-knob brief for
  any future fleet run (validates slice-3 STATUS carry-forward #1:
  field-name `raw_comment` was a trap, not an impossible bar).

## Findings tracked (do NOT lose -- act on at the right step)

- **batch-09 affirm-vs-synthesize inconsistency.** 5 knobs with
  D5-clearing shipped_doc candidates were emitted `synthesized` (not
  `affirmed`) on "the skill emits only source_inline/synthesized"
  reasoning, whereas batch-03/07 (and lanes 1/2/4) DID affirm from
  shipped-config comments. Slice-4 STATUS flagged the same
  "elaborated affirm vs should-be-synthesized" pattern (k_motd_time,
  k_spm_custom_model, k_timetop). Arc-wide normalization is a D7
  tier-1 job IF A1 is reinstated; otherwise it is operator-tail
  (Task 5) judgment. NOT a volume defect (zero-fab held; shipped text
  retained in provenance).
- **D7 operator-tail docket (the contested rows the scan must hit).**
  Surfaced by the 4 lanes + the tail, recorded in
  `description_reasoning`, NOT auto-resolved: k_demoname_date,
  k_disallow_weapons, k_exclusive (value-drift), k_free_mode,
  k_highspeed, k_instagib, k_overtime, k_pow_pickup, k_spw,
  k_use_matchless_dir, timing_players_action, _k_last_cycle_map
  (comment-drift), spawn666time, spawn_show, votemap, k_ann,
  allow_toggle_practice, k_classic_shotgun, k_cmd_fp_dontkick,
  k_ctf_hookstyle + the 4 hedged rows + the affirmed-cohort spot
  sample. Full per-lane docket lives in
  `apps/qw-oracle/output/describe-fill/fleet/slice-{1,2,3,4}-STATUS.md`.
- **Task 3 = a SECOND FLEET (scope correction).** The prior resume
  handoff's one-liner "build + run the D7 tier-1 gate() -- still a
  STUB" undersells it. Building `gate()` (the stub in
  `synthesize-ktx.ts:1279`, wired to `--gate`) is bounded code; RUNNING
  tier-1 is ~594 independent Opus-4.7-MAX re-checks (D7-locked, not
  lowerable) ~= the overnight Task-2 fleet. If A1 is reinstated, plan
  it as a fleet, not a wire-and-run.
- **Functional-bucket soft spot.** review-views.ts buckets are a
  deterministic keyword ruleset (review aid; rigor bar = human-gated /
  approximate by design -- per-row data is exact regardless of bucket).
  "Spectator & view" (106) is likely over-broad; retune the rules in
  review-views.ts + regenerate if the operator finds the bucketing
  noisy (cheap, idempotent).

## What's left (post-scan, gated on the operator's scan verdict)

**If the scan is clean:**
1. Formalize Task 4 per the phase MD: add
   `probeDescribeFillSynthesizedRequiresSourceRef` to
   `scripts/load-knowledge/quality-grid.ts` as
   `F1.describe_fill.synthesized_requires_source_ref` (family
   `regression`); add the `--twice` full-cycle idempotency harness +
   the coverage/residue run report in `synthesize-ktx.ts`. Execution
   mode: `subagent (Sonnet 4.7 medium)` per the phase MD.
2. Run the phase-boundary automated block (the copy-paste psql checks
   in phase-3-ktx-source-synthesis.md "Verification (phase boundary)"):
   coverage == M per bucket, `--twice` IDENTICAL=YES, k_short_gib
   intact, every synthesized row carries a gate verdict (NOTE: with A1
   deferred, "gate verdict" == the D6 verdict already present; record
   the deferral as the answer to check 4, do not silently fail it),
   C3 suspects (none for KTX -- F-C3c).
3. Phase boundary: the verbatim F-D4a owned-row re-derive-safe
   fingerprint pair + structured halt. **Do NOT proceed to Phase 4.
   Do NOT re-run the holistic gate.**

**If the scan finds grave errors:** targeted re-synthesis via the
corrected pipeline path (C4 -- never a hand `UPDATE`; a systemic D6
error means fix the skill and re-fan), and/or reinstate A1 (the tier-1
fleet, scoped as a fleet per the finding above).

## First actions (next terminal -- AFTER the operator reports a scan verdict)

1. Invoke `arc-executor`. Tiered re-verify:
   (a) git-immutable: `git -C /home/paradoks/projects/quakeworld log
   --oneline <this-commit>..HEAD -- docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`
   + `git status --porcelain` over that dir. Empty -> trust distilled
   rules. (b) live-mutable: `--status` == 624/0; `--fingerprint` ==
   `911fca197de2e980ab3f8a6db18f1321` (or investigate); base commits
   `546610a2/54b27d0f/c8a17cd3/2fd1421e` exist; F-D4a guard `IS
   DISTINCT FROM` live; ktx clone HEAD `67253dc9`.
2. Read the operator's scan verdict. Route per "What's left" above
   (clean -> Task 4 + phase boundary; grave errors -> re-synth/reinstate
   A1).
3. Read this doc + the 4 slice-STATUS files + decisions.md 2026-05-18
   amendments + the phase-3 MD Task 3/4/5 + phase-boundary sections
   before executing.

## When in doubt

The phase MD + decisions.md (incl. 2026-05-18 amendments A1/A2/A3) +
review-findings.md + the phase-3 executor prompt are the contract; this
doc is the verified-state shortcut. Live DB cursor wins over any doc.
The operator's manual scan is the spec-locked human gate -- nothing
post-scan runs until the operator reports a verdict. Zero-fabrication
remained the held bar across all 624; do not relax it on any re-synth.
