# Handover -- KTX L1 v2 universal-shape recast for the 16-entity follow-up

**Date drafted**: 2026-05-27
**Drafted by**: Post-arc evaluation session, after the cold-synth terminal completed at commit `03893334`
**For**: fresh terminal running `ktx-l1-batch-dispatcher` (Sonnet 4.6 high per-card; Opus 4.7 medium dispatcher) on 16 entities across 2 parallel batches
**Sized**: ~30-60 min depending on dispatch parallelism
**Anchor**: `1.47-2-g67253dc` (note: same commit as the prior arc's `v1.36-1633-g67253dc`; the new lightweight `1.47` tag was added between Phase 3 main and now, and matches the form used by the existing 624 KTX records)

---

## Why this exists (one-paragraph context)

The KTX L1 chunked-mode dispatch arc closed 2026-05-27 (`86b140a5`) but post-arc gap audit found 16 entities silently skipped: 15 `k_fb_*` Frogbot bloodfest/ToT cvars + `k_race_simultaneous` (the cvar half of a Shape 1c pair that got folded into `race_simultaneous`'s card body in the original Race batch). The cold-synth terminal (commit `03893334`) closed the synthesis half: all 16 now have synthesized descriptions. This terminal runs the **recast pass** that gives them v2 universal shape (Layer A) cards and Layer B shape classification. After this lands, the arc's 633 in-scope cvar+command entities all have v2 recast drafts.

This is also the **first batch dispatched under the new audit gate** (Pre-flight #5, added 2026-05-27 to `ktx-l1-batch-dispatcher`'s SKILL.md). Verify the gate behaves correctly: it should surface the diff between `entity_pre_fetch` and the DB's full category roster, then accept the explicit subset for a follow-up batch.

---

## Two batches, parallel dispatch

This terminal runs TWO `ktx-l1-batch-dispatcher` invocations in parallel from one MAIN session, per the dispatcher SKILL's "MAIN dispatches 2-3 batches in parallel" pattern. Each is a small, scope-bounded follow-up.

### Batch A — Frogbot follow-up (15 entities)

- **Category arg**: `Frogbot`
- **batch_date**: `2026-05-27-frogbot-followup` (suffixed to avoid collision with the original `2026-05-26-frogbot` batch)
- **anchor_version**: `1.47-2-g67253dc`
- **entity_pre_fetch**: the 15 `k_fb_*` cvars below

| Entity | Synth verdict | Confidence | Note |
|---|---|---|---|
| `k_fb_admin_only` | synthesized | high | Frogbot scope |
| `k_fb_autoadd_limit` | synthesized | high | Frogbot scope |
| `k_fb_auto_delay` | synthesized | high | Frogbot scope |
| `k_fb_autoremove_at` | synthesized | high | Frogbot scope |
| `k_fb_break_on_death` | synthesized | high | **ToT-mode scope (NOT bloodfest)** |
| `k_fb_debug` | **hedged** | **low** | No read use-site at this anchor; only set-to-1 site is commented out; C1 outreach routed |
| `k_fb_easy_skill_mode` | synthesized | high | Frogbot scope |
| `k_fb_enabled` | synthesized | high | Frogbot scope |
| `k_fb_freeze_prewar` | synthesized | high | Frogbot scope |
| `k_fb_health` | synthesized | high | **ToT-mode scope (NOT bloodfest)** |
| `k_fb_item_pickup_bonus` | synthesized | high | **ToT-mode scope (NOT bloodfest)** |
| `k_fb_options` | synthesized | high | Frogbot scope |
| `k_fb_quad_multiplier` | synthesized | high | **ToT-mode scope; universal damage multiplier (not bot-only) — synth's enforce-trace caught this** |
| `k_fb_skill` | synthesized | high | Frogbot scope |
| `k_fb_weapon` | synthesized | high | **ToT-mode scope (NOT bloodfest)** |

**Audit-gate expectation**: pre-flight #5 queries DB for `category_inferred = 'Frogbot'` (returns 93 entities) and diffs against `entity_pre_fetch` (15 entities). Surfaces 78 entities as "in DB but not in batch list." Operator EXPLICITLY accepts the subset (those 78 are drafted in the original 2026-05-26-frogbot batch). Gate proceeds to fan-out.

### Batch B — Race follow-up (1 entity)

- **Category arg**: `Race`
- **batch_date**: `2026-05-27-race-followup`
- **anchor_version**: `1.47-2-g67253dc`
- **entity_pre_fetch**: `[k_race_simultaneous]`

Only one entity: `k_race_simultaneous` (synthesized 2026-05-26 by an earlier pass; the recast pass was missed in the original 2026-05-27 Race batch due to the **Shape 1c pair-collapse bug** — the cvar half got folded into `race_simultaneous`'s card body as commentary, no separate `## k_race_simultaneous` card was emitted).

**Audit-gate expectation**: gate finds the Race category has ~17 entities; operator accepts the 1-entity subset (other 16 drafted in 2026-05-27-race).

**Pair-integrity rule (new 2026-05-27 amendment)**: `k_race_simultaneous` is the cvar half of a Shape 1c pair with `race_simultaneous` (the command, already drafted in the original Race batch). The recast card must:
- Get its OWN top-level `## k_race_simultaneous` header.
- Cross-link to `race_simultaneous` in See-also.
- The original `race_simultaneous` card's body should be amended at apply time to add a See-also pointing back here (back-link bidirectionality — note for apply-pass-author).

---

## Critical handling notes

### k_fb_debug (hedged-verdict)

This card needs special verdict in the recast: the synth confidence is `low` because no read use-site exists at this anchor and the only set-to-1 site is commented out (path-debug toggle was migrated to a per-bot struct field instead). The recast card should:
- Be flagged `drafted_with_flag` with a clear "FLAG: behavior may not match observable runtime — synth confidence=low; C1 outreach pending" annotation.
- Apply-pass-author re-checks after the C1 outreach response lands.
- Do NOT park unless the per-card skill's shape classification fails AND the description is contentless. The synth produced 631 chars of source-traceable content; recast it under universal shape but flag confidence.

### ToT-mode scope cards (5 entries)

`k_fb_break_on_death` / `k_fb_health` / `k_fb_quad_multiplier` / `k_fb_item_pickup_bonus` / `k_fb_weapon` are **NOT Frogbot bloodfest cvars** — they're scoped to ToT (Tribe of Tjernobyl) mode. The category_inferred in the DB is still `Frogbot` (categorization-accuracy follow-up #15 captures this). The recast cards should:
- Accurately describe the entity's scope (Headliner names "ToT mode", not "bloodfest" / "Frogbot AI").
- Prerequisites bullet names the mode-precondition explicitly.
- Don't force-fit the Frogbot family framing where it doesn't fit. The synthesized descriptions already encode the correct scope from source traces.

### k_fb_quad_multiplier specifically

The synth's enforce-trace discipline caught a real subtle issue: `T_Damage` applies the multiplier universally (no `isBot` gate), so it affects ALL attackers in ToT mode, not just bots despite the `k_fb_` prefix. The recast card's Effect bullet must reflect this — do NOT assert "bot-only damage scaling." The synth's description has the right framing; preserve it.

### k_sready is NOT in this batch

`k_sready` was the "1 aborted-to-synthesis" from the original arc. Post-synth state is **inconsistent**: `description_verdict='affirmed'` but `description IS NULL`. This is being investigated separately (task #6); it's not part of this recast batch. The dispatcher's audit gate for `Match flow` category will see k_sready as missing-from-batch — that's expected; explicitly accept and proceed without it.

---

## Workflow

1. **Pre-flight**:
   - Cold-read `~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` + 7 files in `references/` (including the new `pre-fetch.md` and amended `cross-card-checks.md`).
   - Cold-read `~/.claude/skills/ktx-l1-rewrite/SKILL.md` + 6 references files.
   - Verify anchor: `git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --tags` returns `1.47-2-g67253dc` (or current head if KTX has advanced — operator's call).

2. **Skim cross-batch precedent**:
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-frogbot.md` — for the 78 already-drafted Frogbot siblings; ToT mode references; the `botcmd` parent-dispatcher framing.
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-race.md` — for the 45 Race siblings and especially the existing `race_simultaneous` card (lines 531+) that this batch's `k_race_simultaneous` will pair with.

3. **Dispatch Batch A + Batch B in parallel** (one MAIN orchestration):
   - Two `ktx-l1-batch-dispatcher` invocations, one per batch above. Pass `entity_pre_fetch` explicitly with the entity lists. The dispatcher's audit gate (#5) will surface the deliberate-subset diffs; explicitly accept each.

4. **Cross-batch consistency note**: with two parallel batches both in the same date, ensure their output filenames are batch-date-suffixed:
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-frogbot-followup.md`
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-race-followup.md`

5. **Commit + push**:
   - One commit per batch (per dispatcher discipline).
   - Push at end of session (operator pattern: push at natural checkpoints).

6. **Append HANDOVER entry** (in `HANDOVER.md`, small-followups section):
   - One-liner per batch, mirroring the prior 14 batches' format. Note: this closes the chunked-mode dispatch arc's 16-entity gap.

7. **Report back** to the MAIN evaluation session (this terminal's parent context) so the post-arc analysis (#10) can be written with full state.

---

## Reads required (cold start)

1. **This handoff doc** -- reading it now.
2. **`docs/superpowers/parking/2026-05-27-handoff-ktx-l1-arc-evaluation-and-next-steps.md`** -- parent arc context (read in full).
3. **`docs/superpowers/parking/2026-05-27-ktx-l1-fb-cold-synthesis-handoff.md`** -- the sibling synth handover (just read its Outputs / Findings sections; the synth has already completed).
4. **`~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md`** + all 7 references files (including the new `pre-fetch.md` and amended `cross-card-checks.md`).
5. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** + 6 references files.

Only if needed for deeper context:
- `docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md` -- per-card skill design spec.
- `apps/qw-oracle/scripts/list-entities-by-category.ts` -- the new direct-DB enumeration helper used by pre-flight gate #5.

---

## Critical rules

- **Locked dials**: dispatcher Opus 4.7 medium; per-card sub-agents Sonnet 4.6 high. Do NOT override.
- **Audit gate is mandatory**: the new pre-flight #5 runs against DB; explicitly accept the diff (these are follow-up batches by design).
- **Pair-integrity rule**: k_race_simultaneous gets its OWN `##` card. Do NOT fold it into race_simultaneous's body. (That's exactly the bug this follow-up exists to fix.)
- **k_fb_debug verdict-flagging**: this card is `drafted_with_flag` with confidence=low; surface clearly.
- **ToT-mode scope**: 5 cards reflect ToT scoping in Headliner / Prerequisites / Effect bullets, not Frogbot AI bot framing.
- **k_sready is excluded**: this batch is 16 entities, not 17. k_sready stays as its own follow-up (#6).
- **Anchor**: `1.47-2-g67253dc` (the new tag form matching existing records).

---

## Exit criteria

Terminal is done when:

1. Two drafts files exist with the date-suffixed filenames above.
2. Each entity in the 16-entity scope has its own `##` header card.
3. `k_race_simultaneous` has a separate card (pair-integrity rule honored).
4. `k_fb_debug` is `drafted_with_flag` with confidence=low surfaced.
5. ToT-mode scope is reflected in the 5 ToT-scoped cards' content.
6. Both batches committed and pushed.
7. HANDOVER amendments appended.
8. Audit-gate behavior verified (gate surfaced the diff, operator accepted, fan-out proceeded cleanly).

---

## When in doubt

- **If the audit gate's halt-on-mismatch behavior is unclear**: the gate should HALT and report the diff, not silently proceed. If it appears to silently proceed, that's a bug in the amendment worth surfacing back.
- **If k_fb_debug's low-confidence verdict makes the recast feel speculative**: that's OK. Recast under universal shape, FLAG verdict, defer judgment to apply-pass-author. Don't park unless shape classification fails.
- **If the dispatcher proposes folding k_race_simultaneous + race_simultaneous into one card again** (the original bug): refuse. The pair-integrity rule in `cross-card-checks.md` says both halves get separate cards. The dispatcher should pre-flight this; if it doesn't, the rule may need additional enforcement.

---

## Recommended terminal start

```bash
cd /home/paradoks/projects/quakeworld
claude
# then:
# @docs/superpowers/parking/2026-05-27-ktx-l1-followup-recast-handoff.md
```
