# ktx-l1-rewrite drafts -- batch 2026-05-27 (Race category, follow-up)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

**Batch shape:** 1 card, 1 chunk. **0 drafted clean + 1 drafted_with_flag + 0 parked.**
Zero halt-on-novelty signals.

**Why this follow-up batch exists:** the original `2026-05-27-race` batch
(45 cards) classified `k_race_simultaneous` + `race_simultaneous` as the
Shape 1 + Shape 1c pair but emitted only the command-side `## race_simultaneous`
top-level header; the cvar half was folded into the command card's body as
commentary instead of receiving its own `##` card. Post-arc audit (see the
amendment to `references/cross-card-checks.md`, "Paired-relationship
pair-integrity") surfaced this as one of two failure modes in the catalog
dispatch arc. This batch ships the missing cvar card so the pair is
complete in L1.

The 45 other Race entities were shipped in `ktx-l1-rewrite-drafts-2026-05-27-race.md`
and are not in scope here. The Pre-flight #5 audit-gate diff (1 entity in
batch vs 46 in DB Race category) was explicitly accepted as a deliberate
follow-up subset.

Anchor: `v1.36-1633-g67253dc`.

---

## k_race_simultaneous (KTX cvar, Race -- Shape 1 + Shape 1c)

<!-- VERDICT: drafted_with_flag -->

- **Status**: drafted_with_flag
- **Source**: src/world.c:922
- **Catalog line**: n/a (cvar; paired command `race_simultaneous` lives at catalog line 15155)
- **Anchor**: v1.36-1633-g67253dc

### Current description

> In race mode, controls whether queued players race individually in turn or all race simultaneously. Race-match mode enables simultaneous racing regardless of this setting.
>
> 0 = queued racers take turns; each player runs the course alone while others wait.
> 1 = all ready players in the queue race the course at the same time.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 1 (cvar+paired toggle) + Shape 1c (mode-precondition: race mode
required to use the toggle command). Canonical pair-mate is the command
`race_simultaneous` (drafted in `ktx-l1-rewrite-drafts-2026-05-27-race.md`,
line 531).

Source signature: `RegisterCvarEx("k_race_simultaneous", "0")` at
world.c:922 with default 0; paired toggle handler `race_simultaneous_toggle`
at race.c:5118 invokes the canonical `cvar_toggle_msg(self,
RACE_SIMULTANEOUS_CVAR, redtext("simultaneous racing"))` (race.c:5130)
after `race_command_checks()` (the isRACE() gate at race.c:5120). The
internal predicate `race_simultaneous()` at race.c:5021-5024 returns
`race_match_mode() || cvar(RACE_SIMULTANEOUS_CVAR)` -- so race-match
mode forces simultaneous racing on regardless of this cvar's value
(user-observable; belongs in Effect).

Two consumer read sites unpacked (Step 1.5):

- `race.c:2077` -- at race start, simultaneous=true makes every readied
  racer in the queue an active racer at once; simultaneous=false uses
  `race_get_from_line()` to admit only the next-in-line racer per turn.
- `race.c:4252` -- in kill-event handling, simultaneous=false lets the
  `kill` command cancel a run at any race status; simultaneous=true
  only cancels once the race is mid-run (`race.status >= raceActive`).
  Behavioral asymmetry on `kill` between turn-based and simultaneous,
  but action-level (not impl-level): both modes ultimately let racers
  abort, just on slightly different schedules. Not surfaced in v2 prose
  (too fine-grained for L1; defer to L3 if a Race concept note is
  ever authored).

### Proposed draft

```
Controls whether queued racers run the course at the same time or one at a time.

0 = racers take turns; each player runs the course alone while others wait in the queue.
1 = all readied racers start simultaneously.

Effect:
  - Race match mode (k_race_match) forces simultaneous racing on regardless of this setting.

Permission:    server config, or 'race_simultaneous' in-game (any player in race mode)
Match-state:   pre-match only (the toggle command is refused once a race run is in progress)
Default:       0 at registration. Activating race mode (k_race 1) applies the built-in race settings bundle which sets this to 1 at runtime -- set k_race_simultaneous explicitly in server.cfg AFTER k_race 1 to override.

Example:
  # server.cfg
  k_race 1
  k_race_simultaneous 0    // turn-based racing; overrides the race-activation default of 1

  # in-game (race mode must already be active)
  race_simultaneous        // toggles between turn-based and simultaneous

See also: race_simultaneous (paired toggle command), k_race_match (match mode -- forces simultaneous on)
```

### Notes

- FLAG: Existing description says "Default: 0" and "Set by: server config
  only." Both are incomplete in load-bearing ways. `RegisterCvarEx` default
  is indeed 0 (world.c:922), but the `race_settings[]` bundle at race.c:308
  sets `k_race_simultaneous 1` and is applied by `apply_race_settings()`
  (race.c:323) whenever race mode activates -- so a server running `k_race 1`
  without an explicit `k_race_simultaneous` line gets simultaneous=1 at
  runtime. The recast Default line names both the registration default and
  the race-settings override so an operator reading the cvar card sees the
  surprise up front.
- FLAG: Existing description omits the paired toggle command from
  Set-by. The cvar IS user-actionable in-game via `race_simultaneous`
  (commands.c:1027, CF_PLAYER). Recast adds it to Permission.
- The internal `race_simultaneous()` function (race.c:5021-5024) is the
  engine-internal predicate; not a user-invokable entity. Not surfaced as
  a separate L1 item; mentioned here for source-trace continuity.
- Bidirectionality apply-pass note: the original `race_simultaneous`
  (command) draft in `ktx-l1-rewrite-drafts-2026-05-27-race.md` (line 531)
  already cross-links back to `k_race_simultaneous (state cvar)` in its
  See-also. Bidirectional linkage is therefore already in place once both
  drafts apply. No amendment to the original race batch is required for
  See-also.
- F3 (manual-flip variant) does NOT apply: handler uses canonical
  `cvar_toggle_msg` (race.c:5130).

---

## Cross-card consistency notes

Cross-card pass found no actionable inconsistencies -- this is a
single-card batch and the paired command's card was reviewed for
See-also bidirectionality (already in place; see Notes above).

Sanity checks performed:

- Pair-integrity (the failure mode this follow-up exists to repair):
  `k_race_simultaneous` now has its own top-level `##` header in this
  drafts file, separate from `race_simultaneous` (which lives in
  `ktx-l1-rewrite-drafts-2026-05-27-race.md`). The dispatcher's
  cross-card-checks reference amendment ("Paired-relationship pair-
  integrity", 2026-05-27) was followed.
- See-also bidirectional: this cvar's draft See-also names
  `race_simultaneous (paired toggle command)`; the command's draft
  See-also (original batch line 564) names `k_race_simultaneous (state
  cvar)`. Bidirectional pair-link is complete.
- Shape-tag formatting consistency: this card uses
  `Shape 1 + Shape 1c` matching the command card's tag in the
  original batch (line 531).
- FLAG-prefix consistency: the two FLAG bullets in Notes carry the
  `FLAG:` prefix, matching the original batch's drafted_with_flag
  cards (e.g. lines 524-525 of the original race batch's
  `k_race_simultaneous` body commentary).
