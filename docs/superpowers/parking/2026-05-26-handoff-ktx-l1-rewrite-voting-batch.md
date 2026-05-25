# ktx-l1-rewrite -- Voting batch

**Created**: 2026-05-26 (post-Spectator chat shipment + Shape 11 crystallization)
**Category**: Voting (34 entities -- mid-size batch; single-session feasible at sequential dispatch, or split into two sub-batches if context budget tightens)
**Resume mode**: fresh terminal, dispatcher role (you batch + dispatch sub-agents; sub-agents run the `ktx-l1-rewrite` skill via Skill tool)

---

## Where things are right now

**Spectator chat & visibility SHIPPED 2026-05-26** (commits `6b12731b` + `648231fb`): 8/8 cards drafted, 0 parked. **Shape 11 crystallized 2026-05-26** -- "per-bit XOR toggle on shared bitmask state container" with sub-facets 11a (cvar-backed; k_spec_info family) and 11b (serverinfo-backed; fpd qizmo family). Catalog now at 15+ shapes. Both the user-global skill ref (`~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md`) and the in-repo spec doc carry the Shape 11 entry + identification-guide decision tree updates.

**A/B probe DONE 2026-05-25** -- Sonnet xhigh produced comparable depth to Sonnet high on the prior batch; finding: high is sufficient. **NO probe this batch.** All 34 cards dispatch at Sonnet high.

**Cumulative**: 65 of 618 KTX L1 entities drafted (57 Server-config + 8 Spectator chat). Voting (34) takes the cumulative to 99 / 618 = ~16%.

---

## Reads required (in order, before dispatching)

1. **This handoff doc** (you are here).
2. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-25.md`** -- skim 5-8 sections to absorb v2 voice + See-also discipline + cross-card sweep findings + Shape 11a worked examples (k_spec_info / infolock / infospec at the end of the file). Pay attention to the `## Cross-card consistency notes` section near the end + its 2026-05-26 addendum.
3. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md`** -- the 57-card Server-config batch. Spot-skim Shape 7a/7b entries (e.g. `k_vp_admin` cvar side; vote command examples) since this batch's territory is dominated by Shape 7. Also confirms how `k_teamoverlay` was drafted as Shape 7b state-cvar (its command-side `teamoverlay` is in this batch).
4. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** + all 6 `references/` files -- the runtime skill. **Shape 11 is now in `references/shape-catalog.md`** between Shape 10 and "## Tooling-mode prerequisite". Identification-guide decision tree updated in both cvar and command branches.
5. **`docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`** -- spec in sync with SKILL.md. Carries 2026-05-26 amendment note for Shape 11 crystallization. Read for design intent if needed.

---

## Critical rules (don't deviate)

- **You ARE the dispatcher.** Sub-agents run the skill via Skill tool; you pre-fetch inputs + dispatch + verify + report progress.
- **Sequential dispatch only.** Sub-agents append to per-batch files; parallel writes race (prior session lost 14 cvar drafts to this). One Agent call at a time, wait for completion, then next.
- **Sub-agent dispatch shape**: `subagent_type=general-purpose`, `model=sonnet`. Effort dial: high (spec-locked; A/B probe done last batch).
- **Per-batch files (APPEND -- create if missing, do NOT overwrite)**:
  - Drafts: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md` (NEW file for this batch -- prior Spectator-chat file stays separate)
  - Park: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-<batch_date>.md` (only if a card parks)
- **Sub-agent prompt must include explicit Step 1.5 + shape-less verdict reminders** (sub-agents read SKILL.md cold each invocation).
- **NEVER touch `entities.description` in the DB.** Drafts file only. Apply pass is operator-driven, separate phase.
- **NEVER commit between cards.** Single commit at end of batch (after cross-card sweep + HANDOVER update).

---

## Parallelization options (optional; sequential is the safe default)

- **Pre-flight in parallel (safe, recommended for 34 cards)** -- extract all 34 existing_descriptions from the catalog HTML + family-source verification in one or two Bash batches BEFORE the sequential dispatch loop starts. ~30% time savings, no risk. Pattern: for each card, locate the `<pre class="description">` block at its `catalog_line` offset in the HTML; the source map (registration site + read sites) is in the audit-trail just below.
- **Multi-terminal across categories (real 2-3x throughput, operator overhead)** -- run Voting + one other category (e.g. Player communication at 18 entities, or Internal state at 19) in parallel terminals. Catalog amendments propagate via the shared `shape-catalog.md` (cold-read per dispatch), so coherent. Each terminal owns its own batch files (different `batch_date` filenames). NOT for this terminal to manage -- operator-initiated only.
- **Trap to avoid**: per-card sub-agent parallelism within a single batch. Sub-agents append to a shared drafts file; parallel writes race. Already cost us 14 cards last time. Don't.

---

## Discipline carry-forwards from prior batches

### 1. VERIFY file appends every 5-7 cards

Last session lost 14 cvar appends. For 34 cards in this batch, run:

```bash
grep -c "^## <entity_name> " apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md
```

per recently-dispatched card. **Verify after cards 5, 12, 18, 24, 30, 34.** If 0 returned, recover the section from the sub-agent's in-context response BEFORE dispatching more cards.

### 2. Cross-card consistency sweep at end of batch

After all 34 cards drafted, dispatch ONE final sub-agent reading all per-card sections + looking for cross-card issues. Append findings as `## Cross-card consistency notes` section at the END of the drafts file. Dispatch prompt at bottom of this handoff.

### 3. No-forward-references to non-existent L3 concept notes

Standard rule from prior batches. Two cross-batch references that ARE valid (existing L1 entities, not pending notes):
- `nospecs` (Spectator chat batch, Shape 7b) -- pair partner of `k_vp_nospecs` in this batch
- `k_teamoverlay` (Server-config batch, Shape 7b state cvar) -- pair partner of `teamoverlay` in this batch

### 4. Tagging discipline (Shape vs shape-less)

`shape-less` is for entities with NO Layer B shape match (standalone state-printers, command-side levers for parked relationships, leaves of curated families). Shape 7a / 7b / 4 / 11b are Layer B shapes -- tag accordingly. NEVER report "shape-less (Shape X)" -- pick exactly one in both the section header and the final reporting line.

---

## Anchor + batch metadata

- **anchor_version**: `v1.36-1633-g67253dc` (verify at session start with `git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always`; update everywhere if drifted)
- **batch_date**: `<YYYY-MM-DD set at session start>` -- same date used in drafts/park filenames
- **category**: `Voting` (all 34 cards)

---

## 34 cards (pre-fetch table)

| # | entity | type | source_ref | catalog_line |
|---|---|---|---|---|
| 1 | k_no_vote_map | cvar | src/world.c:836 | 17353 |
| 2 | k_privategame_voteable | cvar | src/world.c:1089 | 17384 |
| 3 | k_timetop | cvar | src/world.c:934 | 17415 |
| 4 | k_vp_admin | cvar | src/world.c:824 | 17445 |
| 5 | k_vp_antilag | cvar | src/world.c:835 | 17477 |
| 6 | k_vp_break | cvar | src/world.c:823 | 17507 |
| 7 | k_vp_captain | cvar | src/world.c:825 | 17537 |
| 8 | k_vp_coach | cvar | src/world.c:826 | 17567 |
| 9 | k_vp_coop | cvar | src/world.c:833 | 17597 |
| 10 | k_vp_hookstyle | cvar | src/world.c:834 | 17627 |
| 11 | k_vp_map | cvar | src/world.c:828 | 17657 |
| 12 | k_vp_nospecs | cvar | src/world.c:831 | 17687 |
| 13 | k_vp_pickup | cvar | src/world.c:829 | 17717 |
| 14 | k_vp_privategame | cvar | src/world.c:837 | 17747 |
| 15 | k_vp_rpickup | cvar | src/world.c:830 | 17777 |
| 16 | k_vp_suggestcolor | cvar | src/world.c:827 | 17807 |
| 17 | k_vp_teamoverlay | cvar | src/world.c:832 | 17837 |
| 18 | antilag | command | src/commands.c:722 | 17867 |
| 19 | cm | command | src/commands.c:698 | 17894 |
| 20 | elect | command | src/commands.c:800 | 17923 |
| 21 | hook_classic | command | src/commands.c:919 | 17950 |
| 22 | hook_crhook | command | src/commands.c:920 | 17978 |
| 23 | hook_fast | command | src/commands.c:918 | 18006 |
| 24 | hook_smooth | command | src/commands.c:917 | 18034 |
| 25 | next_map | command | src/commands.c:995 | 18062 |
| 26 | no | command | src/commands.c:802 | 18089 |
| 27 | pickup | command | src/commands.c:754 | 18116 |
| 28 | suggestcolor | command | src/commands.c:805 | 18143 |
| 29 | swapall | command | src/commands.c:925 | 18170 |
| 30 | teamoverlay | command | src/commands.c:1034 | 18197 |
| 31 | votecoop | command | src/commands.c:1041 | 18228 |
| 32 | voteprivate | command | src/commands.c:1060 | 18257 |
| 33 | whovote | command | src/commands.c:716 | 18286 |
| 34 | yes | command | src/commands.c:801 | 18313 |

Use the catalog HTML metadata-strip at `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` to extract each card's `<pre class="description">` content as the `existing_description` input. The lines above point at the `<div class="card" ...>` boundary; the description block starts ~10 lines down inside each card's `<div class="card-body">`.

---

## Family / pattern notes (helps See-also discipline + shape guesses)

### Dominant shape: Shape 7 (cvar threshold + vote command)

Most of this batch's cards pair on Shape 7. Pair map:

- **Shape 7a (election with yes/no approval)** -- starter + universal yes/no:
  - `elect` (admin election starter, `commands.c:800`) <-> threshold cvar `k_vp_admin`. **Universal `yes` + `no` route through election-type dispatcher**; both cards in this batch.
  - `suggestcolor` (color-suggestion election, `commands.c:805`) <-> `k_vp_suggestcolor`. Also routes through yes/no.
  - Captain election (`k_vp_captain`) and coach election (`k_vp_coach`) -- cvars exist in this batch; verify whether starter commands also exist as L1 (typically `captain` / `coach` commands in source; check whether they're in another category or this one).

- **Shape 7b (continuous toggle vote, no time-box, no yes/no)** -- each command IS its own toggle-vote:
  - `antilag` <-> `k_vp_antilag` (state cvar `sv_antilag` -- engine-level, likely no L1 card)
  - `cm` (current map vote -- short for `current_map`) + `next_map` -- BOTH route through `k_vp_map` threshold; `k_no_vote_map` is a Shape 4 gate that disables map voting in matchless mode.
  - `pickup` <-> `k_vp_pickup`; **`k_vp_rpickup` is the threshold for `rpickup` command which is NOT in this batch** (likely in Mode selection or Match flow). Surface in See-also if rpickup is a valid L1 entity.
  - `voteprivate` <-> `k_vp_privategame` (gated by `k_privategame_voteable` = Shape 4 gate; this batch contains both)
  - `votecoop` <-> `k_vp_coop`
  - `teamoverlay` <-> `k_vp_teamoverlay`. **Cross-batch pair**: `k_teamoverlay` state cvar already drafted in Server-config batch (Shape 7b state-cvar side). Pair complete with this batch's `teamoverlay` command + `k_vp_teamoverlay` threshold.
  - `swapall` <-> verify (could be Shape 7a or 7b -- swaps teams, may need time-boxed approval).
  - `k_vp_break` -- threshold for the `break` vote (force-end match). The `break` command itself is likely in Match flow category, NOT this batch. Sub-agent verifies and cross-links.

### Hook family fan-out (canonical-card pattern)

- `hook_classic` (value 3), `hook_crhook` (value 4), `hook_fast` (value 2), `hook_smooth` (value 1) = the 4 values of `k_ctf_hookstyle` (state cvar, NOT in this batch -- likely in Mode-scoped knobs or Gameplay rules).
- **Shape 7b + command-per-value fan-out modifier.** Canonical-card pattern applies: ONE of the 4 carries the full v2 description; the other 3 are short reference cards (Headliner + "see <canonical>" + minimal See-also). `hook_classic` is a reasonable canonical (the original hookstyle); sub-agent may pick differently if source signals otherwise.
- Threshold cvar: `k_vp_hookstyle` (in this batch). State cvar: `k_ctf_hookstyle` (other category -- cross-link in See-also).
- **Dispatch order**: dispatch the canonical first (hook_classic at card 21 in the table order), then the 3 references can point at the locked canonical.

### Standalone

- `whovote` (`commands.c:716`) -- vote-status query (lists who has cast which votes). Likely `shape-less` (standalone state-printer). Verify -- if it just G_sprints a status list with no inter-entity relationship, shape-less is correct.
- `k_timetop` (`world.c:934`) -- player-vote ceiling for time/timeset commands. Shape 3 cvar OR Shape 4 gate (clamps vote outcomes). Verify in source.
- `k_no_vote_map` -- Shape 4 gate (disables map voting + /next_map in matchless mode). Cross-link `cm` + `next_map` (gated commands).
- `k_privategame_voteable` -- Shape 4 gate enabling private-game voting. Cross-link `voteprivate`.

### Cross-batch See-also opportunities

- `k_vp_nospecs` <-> `nospecs` (Spectator chat batch, drafted Shape 7b). Add bidirectional reference.
- `teamoverlay` <-> `k_teamoverlay` (Server-config batch, drafted Shape 7b state cvar). Add bidirectional reference.

### Shape 11b composition candidates (verify in source per card)

Most vote commands flip a state cvar on pass via `cvar_fset`. A few MAY ALSO flip a bit on the `fpd` serverinfo bitmask -- if so, they carry a Shape 7b + Shape 11b composition (primary Shape 7b for the vote mechanic; Shape 11b composition for the fpd-bit-toggle side effect). Likely candidates worth checking: `teamoverlay` (overlay-on-map mechanism may touch fpd), `antilag` (probably NOT -- writes sv_antilag engine cvar directly, no fpd touch). Don't pre-classify; sub-agents verify per card.

---

## Open followups (NOT blocking this batch; capture-only)

- **Spectator chat & visibility apply pass** -- 3 `drafted_with_flag` + 4 cross-card findings (F1, F2, F4 actionable; F3 obsoleted; F5+F6 clean). Same operator phase as Server-config apply pass.
- **Server-config apply pass** -- still pending. Same operator phase.
- **`moreinfo` (Spectator-area, commands.c:932)** -- surfaced during k_spec_info source walk; not in any batch's 8/34 scope yet. Pending future drafting.
- **Shape 11b recast for qizmo q* family** -- `ToggleQLag` / `ToggleQEnemy` / `ToggleQPoint` (commands.c:3686-3736) are Shape 11b candidates currently tagged Shape 10 only (qizmo's curated family). Recast under Shape 11b in a future batch (likely a Spectator-area or Internal-state batch -- check which category they land in).

---

## First three actions

1. **Read this doc + skim the existing drafts file's tail.** Absorb v2 voice + the Shape 11a worked examples + the cross-card sweep + addendum. ~10-15 min.
2. **Read SKILL.md + 6 references/ files.** Confirm Shape 11 entry in `references/shape-catalog.md` (between Shape 10 and "## Tooling-mode prerequisite"). Note the identification-guide decision tree updates for both cvar and command branches. ~10 min.
3. **Pre-fetch + dispatch card 1 (`k_no_vote_map`) at Sonnet high.** Standard dispatch shape; no A/B probe this batch.
   - Read catalog HTML lines ~17353-17383 to extract `<pre class="description">` content
   - Dispatch via Agent tool with `subagent_type=general-purpose`, `model=sonnet`
   - Wait for completion, verify file append, log result, dispatch card 2

**Optional pre-flight optimization**: extract all 34 existing_descriptions + source-verify the family clusters (hook fan-out, vote command shapes, gate cvars) in one parallel Bash pass before starting the dispatch loop. Saves ~30% of total time.

---

## Dispatch prompt template (copy + adapt per card)

```
Use the `ktx-l1-rewrite` skill -- "rewrite the L1 description for <ENTITY>". Skill at `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (Sonnet 4.6 high reasoning, spec-locked). Step 1.5 (behavioral unpacking per consumer) + shape-less verdict amendments are in effect. Shape 11 (per-bit XOR toggle on shared bitmask state container) is now in the catalog -- sub-facets 11a (cvar-backed) and 11b (serverinfo-backed). Shape catalog corrected: `rules` is NOT Shape 10 (it's a mode-aware state-printer).

**Tagging discipline**: `shape-less` is for entities with NO Layer B shape match. Shape 7a / 7b / 4 / 11b ARE Layer B shapes -- tag accordingly. Do NOT report "shape-less (Shape X)" -- pick exactly one in both the section header and the final reporting line.

**No-forward-references rule**: do NOT carry forward See-also pointing at not-yet-written L3 concept notes. Cross-batch references that ARE valid: `nospecs` (Spectator chat batch, Shape 7b), `k_teamoverlay` (Server-config batch, Shape 7b state cvar).

Inputs:

- **entity_name**: `<ENTITY>`
- **entity_type**: `<TYPE>`
- **category**: `Voting`
- **existing_description**:

\`\`\`
<EXISTING_DESCRIPTION>
\`\`\`

- **source_ref**: `<SOURCE_REF>`
- **anchor_version**: `v1.36-1633-g67253dc`
- **catalog_line**: `<CATALOG_LINE>`
- **batch_date**: `<BATCH_DATE>`

KTX source: `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`
Per-batch files (APPEND -- create if missing for this batch_date, do NOT overwrite): `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-{drafts,parked}-<BATCH_DATE>.md` under `/home/paradoks/projects/quakeworld/`

Note (family / pattern context): <see "Family / pattern notes" section in handoff doc + carry the relevant per-card paragraph>

**Return the FULL v2 recast text in your response** + append the per-card section to the drafts file + end with the standard reporting line:
`ktx:<ENTITY>: <VERDICT> -- <shape or trigger> -- <one-line rationale> -- anchor=v1.36-1633-g67253dc`

Do NOT commit. Do NOT touch entities.description in the DB.
```

---

## Cross-card consistency sweep dispatch (after all 34 cards done)

After all 34 per-card dispatches complete AND you've verified all 34 sections are present in the drafts file, dispatch ONE final sweep:

```
Read the 34 per-card sections appended to `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<BATCH_DATE>.md` (the Voting batch).

Look for cross-card consistency issues:

1. **Shared misintuitions**: multiple cards with the same wrong permission framing, default-value assumption, or fallback semantic.
2. **Cross-card factual contradictions**: card A says X about a shared underlying fact, card B says not-X about the same fact (e.g. vote-threshold computation: `max(2, ceil(percent/100 * eligible_voters))` with percentages below 51 clamped to 51).
3. **Companion references mismatching**: card A's See-also references "<other entity>" but the entity isn't in L1, is named differently in source, or is described inconsistently with card B's framing.
4. **Permission flag asymmetry**: CF_BOTH / CF_BOTH_ADMIN / CF_PLAYER | CF_SPC_ADMIN -- verify each card's Permission line matches the source CF_* registration exactly. Definitions in `research/repos/ktx/src/include/g_local.h:647-655`.
5. **Hook family canonical-card discipline**: hook_classic / hook_crhook / hook_fast / hook_smooth should follow the canonical-card pattern (one full description, three short references). Verify the canonical card is consistent + the reference cards correctly point at it.
6. **Cross-batch See-also**: verify k_vp_nospecs cross-links nospecs (Spectator chat batch) + teamoverlay cross-links k_teamoverlay (Server-config batch) bidirectionally.
7. **Shape 7a/7b classification**: each vote command should be cleanly tagged 7a (election with yes/no) or 7b (continuous toggle) -- verify no command got mis-classified.
8. **Shape 11b composition candidates**: if any vote command flips an fpd bit on pass, surface a Shape 7b + Shape 11b composition note (not a verdict change, just a See-also augmentation).

For each finding, append a brief note to a NEW "## Cross-card consistency notes" section at the END of the drafts file. Each note: which cards involved, what's inconsistent, what source says is true, what the apply-pass-author should align.

If no issues found: append "No cross-card issues detected. All sibling references consistent, permission flags match source CF_* registrations, hook family canonical-card pattern correctly applied, cross-batch See-also links valid."

Dispatch shape: subagent_type=general-purpose, model=sonnet, high reasoning (verification task; same effort tier as per-card).

Do NOT commit. Do NOT touch entities.description.
```

---

## When you're done

- **Verify all 34 sections + the cross-card notes section are present** in the drafts file: `grep -c "^## " apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<BATCH_DATE>.md` should equal 35 (34 cards + 1 cross-card sweep section). Adjust expected count by any parked cards (each park moves a section from drafts to park file).
- **Commit a wrap-up**: `git add` the drafts/park files + commit referencing the 34 cards + cross-card sweep findings + any new shapes surfaced (likely 0; Shape 7 is well-trodden).
- **Update HANDOVER.md**: add a SHIPPED Small followup entry mirroring the Spectator chat entry's format. Note the apply-pass alongside the prior two batches' pending apply-passes.
- **Mark this parking doc for deletion**: `git rm docs/superpowers/parking/2026-05-26-handoff-ktx-l1-rewrite-voting-batch.md` as part of the wrap-up commit.
- **Surface any Shape 11b compositions** found (e.g. teamoverlay fpd-bit-toggle if confirmed) -- add to HANDOVER Small followup as future-batch material.

---

## When in doubt

- **The spec governs** per the SKILL.md header. Spec + SKILL.md are in sync (commit `648231fb` carries the Shape 11 amendment).
- **Verify against live KTX source** at `/home/paradoks/projects/quakeworld/research/repos/ktx/src/` -- never trust the existing description's framing without source verification (Step 3 spot-check is the inner enforcement loop).
- **Read 2-3 already-drafted sibling cards** before drafting a card with siblings already done. The Server-config batch has Shape 7a/7b examples; the Spectator chat batch has the Shape 11a worked examples. Voting's Shape 7-dominant territory is well-mapped by the prior batches.
- **If a card surprises the skill**: capture the sub-agent's output verbatim, report to operator, do NOT silently iterate the skill or amendments. The shape catalog is operator-judgment territory. (Shape 11 was crystallized only after operator-driven verification surfaced fpd as the sibling family; sub-agents don't add shapes.)
- **Tagging discipline reminder**: `shape-less` is for entities with NO Layer B shape match. Shape 7a / 7b / 4 / 11b are Layer B shapes. Mutually exclusive. (Watch for drift like "shape-less (Shape X)" -- catch it in sub-agent output before it lands in the drafts file.)
