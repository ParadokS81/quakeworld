# Handoff -- KTX L1 chunked-mode arc evaluation + next-steps scoping

**Date drafted**: 2026-05-27
**Drafted by**: Player communication ship session (commit `86b140a5` -- the FINAL chunked-mode batch)
**For**: fresh terminal evaluating the KTX L1 chunked-mode dispatch arc + scoping the two forward paths (visualization + MVDSV)
**Sized**: 60-120 min depending on how deep the operator wants the manual walk-through. The automated checks alone are ~20-30 min; manual sampling is ~30-60 min on top.

---

## What just shipped (one-paragraph summary)

KTX L1 chunked-mode dispatch arc CLOSED at commit `86b140a5`. **14 batches shipped 2026-05-22 -> 2026-05-27**, drafting **613 of 633 KTX L1 entities under v2 universal shape (~97%)**. Three SKILL amendments validated and shipping-ready during the arc: **F1 mandatory CF-flag extraction** (28-34% catch rate across post-amendment batches; permanent SKILL.md fixture); **F13 batch-date-suffix /tmp filenames** (validated across 10 chunks; permanent fixture); **F3 manual-flip Shape 1 variant** (DORMANT in KTX; SHELVED until MVDSV/QWFWD/QTV forks). Promoted-Discipline-1 VERDICT-marker emission validated in the final batch. The chunked-mode dispatch arc is the major work; remaining KTX L1 workstreams are operator-driven (apply pass + 5 parks + 1 synthesis + 14-entity gap audit).

---

## The 20-entity gap explained

The operator's question after seeing 613/633 was "what are those 20, and are they waiting for MVDSV?" Answer: **none are MVDSV-blocked**. All 20 are KTX L1 work in different workstreams that the chunked-mode dispatcher couldn't handle.

| Bucket | Count | Reason | Workstream |
|---|---|---|---|
| Parks | 5 | Skill refused to guess (trigger 1 no-shape-match or trigger 4 sui-generis) | Hand-drafting by operator -- separate workstream |
| Aborted-to-synthesis | 1 | Existing description too thin (under 100 chars or boilerplate) | `describe-fill-synthesis` skill (Opus 4.7 MAX dial) |
| Unaccounted (likely userinfo keys) | 14 | Never appeared in any of 14 batches' input lists | 14-entity gap audit needed; then likely a follow-up batch |

**Parks** (5): `callalias` (trigger 4 sui-generis -- compile-time alias bound to hardcoded function table) / `roundsdown` / `roundsup` / `y` / `n` (the universal yes/no commands -- park trigger details in the relevant batches' parked files OR in the HANDOVER entries).

**Aborted-to-synthesis** (1): `k_sready` -- existing description was too thin for ktx-l1-rewrite's recast pre-flight gate (the skill's job is to recast EXISTING content; cold synthesis is the sibling `describe-fill-synthesis` skill's job).

**Unaccounted** (14): During this batch's cross-card pass (F5 finding), the dispatcher confirmed via grep across all 13 prior drafts files that `kf`, `premsg`, `postmsg`, `k_sdir`, `k_nick`, `k` are NOT drafted anywhere -- they were referenced in this batch's See-also (ksound1 -> kf; killer/victim/newcomer -> premsg/postmsg; report/tpmsg -> k_nick/k) but the targets don't exist as recast drafts yet. The handoff for this batch claimed kf was drafted 2026-05-23, which was Rule-11-WRONG. These 6 userinfo keys are likely 6 of the 14; the remaining 8 may be additional userinfo keys, cmdline params, or category-not-walked entities. Audit the catalog HTML index to enumerate.

---

## Reads required (cold start)

Read in this order. Stop once you have enough context to start the automated checks; come back for more if manual sampling needs deeper background.

1. **`/home/paradoks/projects/quakeworld/HANDOVER.md`** -- the 14 ktx-l1-rewrite small-followup entries (Server config & network through Player communication). Each one is a load-bearing per-batch summary with verdict counts, cross-card findings (F1..F15 per batch), and open follow-ups. The Player communication entry (most recent, line ~41) is the FINAL-BATCH summary.
2. **`/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-player-communication.md`** -- the final batch's drafts file. 18 entities + 10 cross-card findings. Most-complete example of the discipline.
3. **`/home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`** -- the original skill design spec. Use this to understand the WHY behind the layer architecture / shape catalog / earn-their-keep discipline.
4. **`/home/paradoks/.claude/skills/ktx-l1-rewrite/SKILL.md`** + the 6 references in `~/.claude/skills/ktx-l1-rewrite/references/` -- the per-card skill that the dispatcher fanned out. Shape catalog (14+ shapes), v2 universal shape (Layer A), park triggers, worked examples.
5. **`/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md`** -- the dispatcher skill, KTX-scoped. The MVDSV fork would mirror this structure.
6. **`/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/`** -- list all 14 `ktx-l1-rewrite-drafts-*.md` files (skim only). The cumulative arc lives here.
7. **`/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html`** -- the EXISTING catalog HTML (renders `entities.description` as-is, pre-recast). This is the visualization you'll be replacing in path 1.

If you need older context: `apps/qw-oracle/docs/arc-history.md` has the qw-oracle ship log. The KTX L1 work shows up there.

---

## The two forward paths (operator's framing)

The operator described two forward paths after evaluation:

### Path 1 -- Visualization (browse the new L1 like the old)

Build a new browsable HTML catalog reflecting the v2 drafts (or post-apply state). The existing catalog at `apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html` is rendered from `entities.description` -- pre-recast content. The new visualization needs to show post-recast content.

**Decision point inside path 1**: render from drafts files (before apply) OR from `entities.description` after apply pass. The latter is the source-of-truth read; the former requires parsing the drafts files and is throwaway work. Strongly recommend the operator drains the apply queue first, then renders from DB.

**Sizing**: 1-3 sessions. The rendering pipeline likely already exists for the existing catalog HTML (check `apps/qw-oracle/scripts/` for catalog generators); the work is updating it to render v2 sections (Headliner / Effect / Prerequisites / Permission / Match-state / Default / Example / See-also) cleanly, plus add new affordances (cross-batch See-also links resolved, FLAG indicators, shape-tag badges).

### Path 2 -- MVDSV fork (do the same arc for MVDSV)

Fork the skill stack for MVDSV (`mvdsv-l1-rewrite` + `mvdsv-l1-batch-dispatcher`); do the MVDSV catalog walk; build the MVDSV shape catalog (Layer B is per-codebase per `layer-architecture.md`); ship MVDSV L1 batches.

**Lessons from KTX to bake into MVDSV**:
- F1 amendment baked in from day 1 (mandatory CF-flag extraction); start the catalog with the CF-flag table populated.
- F13 batch-date-suffix /tmp filenames baked in from day 1.
- Promoted-Discipline-1 VERDICT-marker emission baked in from day 1.
- Canonical-card pattern for fan-outs (KTX showed ~23% consolidation rate -- expect similar in MVDSV).
- Halt-on-novelty discipline (trigger 1 or 4 = HALT batch; trigger 2 or 3 = continue with flag/park).
- 14-entity gap audit pattern -- ensure the catalog walk covers userinfo keys, cmdline params, etc. before dispatching batches (avoid the same 14-entity unaccounted surprise).

**Sizing**: 10-20 sessions. MVDSV is a larger codebase than KTX (sv_*.c, etc.); the shape catalog may have different shapes (admin-restricted server commands, console-only cvars); the walk-and-batch arc could span weeks at a steady pace.

### Sequencing recommendation (the dispatcher's read)

**Operator-driven workstreams come first** (these gate visualization):
1. Apply pass for the 14 batches' drafts (operator audits + applies clean drafts to `entities.description`; ~14 sessions worth depending on flag density per batch).
2. Hand-draft the 5 parks (callalias / roundsdown / roundsup / y / n; ~1 session).
3. Synthesize `k_sready` via `describe-fill-synthesis` skill (~1 session).
4. Audit the 14-entity gap (~1 session of catalog HTML walking).
5. If gap audit confirms userinfo-key pile: dispatch a follow-up `ktx-l1-rewrite` batch for those 14 entities (~1 session).

**Then path 1 (visualization)** becomes the natural completion artifact -- shows the finished KTX L1 catalog as users will see it.

**Path 2 (MVDSV)** can start IN PARALLEL with the operator-driven workstreams above -- the MVDSV catalog walk is independent of KTX apply work. But: MVDSV skill fork should wait until KTX visualization is up so the operator can see the v2 shape in action and use it as the reference for what MVDSV's output should look like.

**Recommended sequence for the operator** (lowest-friction):
1. This evaluation session (1 session)
2. Operator-driven workstreams 1-5 above (~16-20 sessions, but each is bounded -- can interleave with other work)
3. Path 1 visualization (1-3 sessions)
4. Path 2 MVDSV fork + walk + first batches (10-20 sessions over weeks)

If the operator has limited bandwidth for the apply pass and wants forward momentum, an alternative: start path 2's catalog walk + shape catalog work IN PARALLEL with whatever apply-pass cadence is sustainable. Visualization stays gated on apply completion.

---

## Three concrete actions for this evaluation session

### Action 1: Cumulative tally validation (automated)

Verify the running totals are consistent across the 14 drafts files. Expected: **613 drafted (incl. drafted_with_flag) + 5 parked + 1 aborted = 619**, plus 14 unaccounted = 633.

```bash
cd /home/paradoks/projects/quakeworld
echo "=== drafted (incl. drafted_with_flag) count per batch ==="
for f in apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md; do
  count=$(grep -c '^- \*\*Status\*\*: drafted' "$f")
  echo "$(basename "$f"): $count"
done
echo "=== TOTAL ==="
total=0
for f in apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md; do
  count=$(grep -c '^- \*\*Status\*\*: drafted' "$f")
  total=$((total + count))
done
echo "Total drafted (any verdict): $total"
echo ""
echo "=== parked files (5 entities expected total) ==="
ls apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-*.md 2>&1 || echo "(no parked files)"
```

If the total is 613: tally is clean. If not: investigate the discrepancy (could be a forgotten batch, a duplicate entry, or a count off-by-one).

### Action 2: Cross-batch See-also integrity check (automated)

Sample 10-20 cards across the 14 batches and verify their See-also references either (a) exist as drafted entities in some batch OR (b) exist in the live `entities` table (un-recast but present). The F5 finding from Player communication caught 6 userinfo-key references that have NO drafted counterpart -- the audit should surface similar gaps.

Approach:
1. Build a list of all drafted entity names: `grep -h '^## ' apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md | sed -E 's/^## ([^ (]+).*/\1/' | sort -u` -> save as `/tmp/drafted_entities.txt`.
2. Build a list of all See-also referenced entity names: parse the See-also lines from each draft. (Trickier; may need a small script.)
3. Diff: which See-also references are NOT in the drafted list? Those need to be checked against the live `entities` table (via MCP `lookup_entity` or direct SQL).

Operator may want to defer this to the 14-entity gap audit workstream (action 5 in the sequencing above) and just spot-check 5-10 references for now.

### Action 3: Manual walk-through with operator (interactive)

Pick 5-10 representative entities across categories and walk through their v2 drafts with the operator. Goal: gut-check the discipline held up across 14 batches' worth of work.

Suggested sampling:
- **Shape 1 cvar+toggle**: `k_fallbunny` (or another from Gameplay rules)
- **Shape 6 stateful**: `mmode` (Player communication, today's batch)
- **Shape 7b vote-toggle**: `antilag` (Voting batch)
- **Shape 9b engine-only**: `_k_pow_last` (Internal state batch)
- **Shape 10 help-printer**: `qizmo` (Server config & network batch)
- **Shape 11a bitmask**: `k_spec_info` + `infospec` / `infolock` (Demo & spectator batch)
- **Shape-less prose-wrap**: `killer` (Player communication, today's batch)
- **Canonical-card fan-out**: `ksound1` canonical + `ksound2` reference (Player communication)
- A `drafted_with_flag` entry: `multi` (today's batch) or any from earlier batches
- A park (if accessible): `callalias` park entry

For each: show the operator the existing description + the v2 draft + the cross-card findings that touched it. Ask: does the draft read well? Does it match what you'd expect a KTX server admin / mod player to want to know? Any silent errors?

This is the highest-value evaluation activity -- automated checks catch structural issues; manual walk-through catches "the prose doesn't quite feel right" issues that the F1-F15 catches don't surface.

---

## Evaluation playbook (when manual walk-through finds issues)

If a draft is wrong / unclear / missing something:

- **Localized factual error** (wrong default, missing prereq, outdated permission): record as an apply-pass amendment. Operator fixes at apply time.
- **Foundational framing error** (entity described as wrong kind of thing): the recast is unsound. Re-park the entity for re-research, OR re-dispatch the per-card skill with corrected handoff context.
- **Shape misclassification**: ditto. Operator picks: amend the catalog (earn-their-keep test: 2-3 instances + load-bearing differentiation) OR re-classify the entity.
- **Style / prose issues** (verbose, generic, "AI-slop"): operator notes for the apply pass; hand-edit at apply time.

Don't try to fix everything in this session. Surface findings -> note them -> let the operator decide whether to re-dispatch or fix at apply time.

---

## Open questions for the operator

These are decisions only the operator can make; surface them and let the operator answer:

1. **Apply-pass cadence**: how do you want to drain the 14 batches' apply queue? One batch per session? Multiple per session? Or in priority order (e.g. Player communication FIRST because it's freshest and you'll catch your mistakes; OR Server config & network FIRST because it's the foundation everything else references)?

2. **14-entity gap audit timing**: do you want the audit done as part of this evaluation session (a follow-up batch dispatch -- straightforward if it's just userinfo keys), OR deferred to a separate session?

3. **Visualization pipeline**: does an HTML generator already exist that we can update, OR is path 1 building from scratch? (Check `apps/qw-oracle/scripts/` -- there's likely a catalog generator for the existing `2026-05-26-ktx-l1-catalog.html`.)

4. **MVDSV start date**: do you want to start the MVDSV catalog walk IN PARALLEL with KTX apply work, or sequence them? Parallel is faster but adds context-switch cost.

5. **Concept-note backlog**: the arc surfaced 3+ L3 concept-note candidates (vwep family / pacemaker family / KTX private messaging system). Do you want to author these as part of finishing KTX, or defer to a separate "L3 concept-notes for KTX" arc?

---

## When in doubt

- The chunked-mode dispatch arc is COMPLETE. Don't re-dispatch unless a finding from manual walk-through demands it.
- Apply pass is OPERATOR-DRIVEN -- don't auto-apply drafts to `entities.description`. The skill explicitly leaves this to operator judgment.
- For path 2 (MVDSV), the dispatcher pattern is forkable but the SHAPE CATALOG is per-codebase -- don't carry KTX shapes over wholesale. Walk MVDSV first; let shapes earn their place per `earn-their-keep` discipline.
- For path 1 (visualization), the source-of-truth read is `entities.description` (post-apply), NOT the drafts files. Drafts files are intermediate.
- If automated checks find a tally discrepancy, that's a real bug; investigate before scoping forward paths.

---

## Recommended terminal start

```bash
cd /home/paradoks/projects/quakeworld
claude
# then:
# @docs/superpowers/parking/2026-05-27-handoff-ktx-l1-arc-evaluation-and-next-steps.md
```

Or, if the operator wants Opus 4.7 MAX explicitly for deeper analysis:
- `/effort max` after start
- Then load the handoff.
