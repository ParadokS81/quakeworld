# Handover -- KTX L1 cold synthesis for 15 unaccounted k_fb_* Frogbot cvars

**Date drafted**: 2026-05-27
**Drafted by**: Post-arc evaluation session for the KTX L1 chunked-mode dispatch arc
**For**: fresh terminal running `describe-fill-synthesis` (Opus 4.7 MAX, spec-locked) on 15 entities
**Sized**: ~30-60 min depending on sub-agent fan-out parallelism and persist verification
**Anchor**: `v1.36-1633-g67253dc` (KTX dev-head used by the chunked-mode dispatch arc)

---

## Why this exists (one-paragraph context)

The KTX L1 chunked-mode dispatch arc closed at commit `86b140a5` (2026-05-27) with 14 batches drafting **611 of 633 KTX cvar+command entities under v2 universal shape**. Post-arc gap audit (this terminal's parent session, 2026-05-27) found 16 entities unaccounted: 15 `k_fb_*` Frogbot bloodfest cvars + `k_race_simultaneous`. **All 15 `k_fb_*` cvars have NULL descriptions** — they never went through cold synthesis OR the format-unify D20/D21 pass OR the chunked-mode recast. Likely cause: a mid-arc `d4-extractor-fix-2026-05-26` added these 15 entities the SAME DAY the Frogbot batch dispatched 78 entities; the dispatcher's category snapshot was taken before the extractor-fix landed (sibling task #12 investigates the root cause for MVDSV planning). They are NOT parks-shaped — straightforward bloodfest cvars; they just need step 1 of the two-step pipeline.

`k_race_simultaneous` is **out of scope for this terminal** — it already has a synthesized 365-char description (`origin=synthesized`, `verdict=synthesized`, anchor=`1.47-2-g67253dc`); it only needs the recast pass that a sibling terminal will run later.

---

## The 15 in-scope entities

All `cvar` type, category `Frogbot`, anchor `v1.36-1633-g67253dc`:

| Entity | Source |
|---|---|
| `k_fb_admin_only` | `src/world.c:1061` |
| `k_fb_autoadd_limit` | `src/world.c:1056` |
| `k_fb_auto_delay` | `src/world.c:1058` |
| `k_fb_autoremove_at` | `src/world.c:1057` |
| `k_fb_break_on_death` | `src/world.c:1065` |
| `k_fb_debug` | `src/world.c:1060` |
| `k_fb_easy_skill_mode` | `src/world.c:1068` |
| `k_fb_enabled` | `src/world.c:1054` |
| `k_fb_freeze_prewar` | `src/world.c:1062` |
| `k_fb_health` | `src/world.c:1063` |
| `k_fb_item_pickup_bonus` | `src/world.c:1067` |
| `k_fb_options` | `src/world.c:1055` |
| `k_fb_quad_multiplier` | `src/world.c:1066` |
| `k_fb_skill` | `src/world.c:1059` |
| `k_fb_weapon` | `src/world.c:1064` |

All 15 register in a contiguous block (lines 1054-1068 in `src/world.c`) — likely the bloodfest mode's cvar registration cluster. Family-coherent batch; expect strong cross-card synthesis opportunities (sibling defaults, shared prereq "bloodfest mode active", etc.).

---

## The skill + dial (locked)

**Skill**: `describe-fill-synthesis` (engine-agnostic; project arg = `ktx`).
**Model dial**: Opus 4.7, MAX reasoning. Spec-locked by D7. Do NOT lower per-invocation. The "cheap / fast affirm" Step 3 is the early-exit path WITHIN this single Opus-4.7-MAX invocation when an existing comment already clears the rubric — not a separate cheaper pre-classify model tier.

For NULL-description entities like these 15, Step 3 affirm-path cannot fire (nothing to affirm against). All 15 will run the full synthesis path: source-dive, evidence collection, D6 rubric, D7 evidence re-check, structured record emit.

---

## Workflow

1. **Pre-flight**:
   - Cold-read the skill at `~/.claude/skills/describe-fill-synthesis/SKILL.md` + its `references/` files.
   - Verify the anchor: `git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always` returns `v1.36-1633-g67253dc` (or a later commit if KTX has advanced — operator's call whether to re-anchor).
   - Check current state: `bun apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts --status` reports the in-scope KTX synthesis denominator. The 15 k_fb_* should show as NOT-yet-evaluated.

2. **Sub-agent fan-out** (15 entities; one Opus 4.7 MAX sub-agent per entity):
   - Pattern: parallel fan-out like the prior describe-fill arc. Dispatch all 15 in one wave OR sub-batches of 5-8 if context budget needs it.
   - Each sub-agent runs `/describe-fill-synthesis ktx <entity_name>` with the anchor argument.
   - Each sub-agent returns a structured D6 record (verdict + synthesized description + origin tag + source_ref + provenance trail).

3. **Collect records into JSON**:
   - Aggregate the 15 per-entity records into a single JSON file at `apps/qw-oracle/output/describe-fill/2026-05-27-ktx-fb-followup.json` (or a path the skill specifies; verify against the skill's output_contract).

4. **Dry-run persist**:
   - `bun apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts --persist <file> --dry-run` to confirm the UPDATE shape inside a rolled-back transaction.
   - Inspect the dry-run output; confirm each of the 15 rows shows a sensible description + verdict + anchor.

5. **Persist for real**:
   - `bun apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts --persist <file>` (without `--dry-run`) to commit the descriptions to `entities.description`.

6. **Verify**:
   - `bun apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts --status` should now show 15 fewer NOT-yet-evaluated.
   - Spot-check 2-3 entities via SQL: `SELECT name, description, description_origin, description_verdict, description_anchor_version FROM entities WHERE project='ktx' AND name LIKE 'k_fb_%' ORDER BY name;` — every row should have a non-NULL description, origin/verdict markers, anchor matching what was supplied.

7. **Commit + push**:
   - Commit the JSON output file + any HANDOVER amendments. `git commit -m "describe-fill: cold-synthesize 15 k_fb_* Frogbot cvars (post-arc gap closure)"`. Push.

8. **Append HANDOVER entry** (in the main repo `HANDOVER.md`, in the small-followup section):
   - One-liner: "**ktx-l1-rewrite k_fb_* cold-synth COMPLETED** -- 15 Frogbot bloodfest cvars synthesized via describe-fill-synthesis (Opus 4.7 MAX). Next: recast pass via ktx-l1-batch-dispatcher to apply v2 universal shape (sibling task #11)."

---

## Reads required (cold start)

Read in this order; stop once you have enough context to start fan-out.

1. **This handoff doc** -- you're reading it.
2. **`~/.claude/skills/describe-fill-synthesis/SKILL.md`** + its `references/` files -- the per-knob skill itself.
3. **`apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`** (head comment + `--status` / `--persist` / `--assemble-only` sub-commands) -- the driver script.
4. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-frogbot.md`** -- the Frogbot batch's drafts file, for sibling-cvar context. The 78 already-drafted Frogbot entries (including other `k_fb_*` like `k_fb_*` that DID exist before d4-extractor-fix) give the cross-card synthesis baseline.
5. **`docs/superpowers/parking/2026-05-27-handoff-ktx-l1-arc-evaluation-and-next-steps.md`** -- the parent post-arc handoff (covers full arc context).

Only if needed for deeper context:
- `docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md` -- the recast skill design (sibling skill that processes these AFTER synthesis lands).
- `apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html` -- the catalog HTML, to see the 15 entities in context (currently they render as empty-description cards).

---

## Critical rules

- **Spec-locked at Opus 4.7 MAX.** Do not lower the dial. The cost differential vs the recast skill (Sonnet 4.6 high) is the entire point of running these as two separate passes.
- **One entity per sub-agent invocation.** The skill is fan-out-shaped; do not batch multiple entities into one invocation.
- **Source-truth grounding.** Synthesis must reference actual source lines (`src/world.c:<line>` for registration; read-site lines for behavior). No confabulation.
- **Anchor stamping mandatory.** Every record's `description_anchor_version` must equal the anchor arg. This is how the apply-pass author later verifies the synthesis is current vs KTX dev-head.
- **Do NOT run the recast pass in this terminal.** Recast is a separate skill (`ktx-l1-rewrite` / `ktx-l1-batch-dispatcher`) at a separate dial (Sonnet 4.6 high). It happens in a FRESH terminal after this one completes (sibling task #11).
- **Do NOT touch the other 1 entity** (`k_race_simultaneous`). It already has a synthesized description; it only needs recast. It will be picked up by the sibling recast terminal.
- **If a sub-agent reports an unusual mechanism** (e.g., a `k_fb_*` cvar that doesn't fit the bloodfest-mode pattern, or a cvar with split read/write semantics) — that's a finding worth surfacing. Capture in the structured record's reasoning trail; don't try to force-fit.

---

## Exit criteria

Terminal is done when:

1. All 15 `k_fb_*` cvars have non-NULL `entities.description` populated.
2. Each row carries: `description_origin = 'synthesized'`, `description_verdict = 'synthesized'`, `description_anchor_version = 'v1.36-1633-g67253dc'` (or current anchor if updated), `description_confidence` populated.
3. The output JSON file is committed + pushed.
4. The HANDOVER entry is appended.
5. Spot-check passes for at least 2 of the 15 (description reads sensibly + matches source behavior).

If any sub-agent surfaces a park-shaped finding (cvar genuinely uncategorizable / sui-generis / contradicting source): record the park reason in the record; the apply-pass author handles it manually. Do NOT skip the persist for the other 14 because one is parked.

---

## When in doubt

- **Anchor question** (KTX has advanced past `v1.36-1633-g67253dc`): operator's call. The conservative path is to re-anchor to the current dev-head and stamp all 15 with the new anchor. The faster path is to keep the original anchor (since the dispatcher arc used it) — accept that any post-anchor source changes go unsurfaced until the next L1 refresh.
- **Sub-agent rate-limit / timeout**: the prior describe-fill arc hit CF 1015 at ~10 parallel MCP requests. If parallel fan-out runs into the same wall, fall back to chunks of 5 with brief delay between waves.
- **Description-style consistency**: the 15 are a coherent family. Cross-card synthesis after the fan-out (in this terminal, before persist) catches inconsistencies. The format-unify D20 template lives at `docs/superpowers/plans/2026-05-21-ktx-l1-format-unify.md` if you need the structural reference — but the skill bakes it in.

---

## Recommended terminal start

```bash
cd /home/paradoks/projects/quakeworld
claude
# then:
# @docs/superpowers/parking/2026-05-27-ktx-l1-fb-cold-synthesis-handoff.md
```

Or, if explicit Opus 4.7 MAX is needed for the orchestration layer (the skill locks the per-entity dial; orchestration is operator-config):
- `/effort max` after start
- Then load this handoff.
