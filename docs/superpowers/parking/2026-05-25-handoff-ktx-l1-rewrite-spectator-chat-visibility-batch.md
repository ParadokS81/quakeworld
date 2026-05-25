# ktx-l1-rewrite -- Spectator chat & visibility batch

**Created**: 2026-05-25 (post-Server-config-shipping + housekeeping)
**Category**: Spectator chat & visibility (8 entities -- small batch, single-session-friendly)
**Resume mode**: fresh terminal, dispatcher role (you batch + dispatch sub-agents; sub-agents run the skill)

---

## Where things are right now

**Server config & network category SHIPPED 2026-05-24** (57/57 cards, commit `abdfc1be`). 18 drafted clean + 11 drafted_with_flag this session; 19+9+1 prior across sub-batches 1+2 = 37 drafted + 20 drafted_with_flag + 1 parked (callalias). ~35% cumulative flag rate caught real factual errors in the upstream synthesis output.

**Spec amendment + catalog correction SHIPPED 2026-05-25** (commit `7a087330`):
- SKILL.md amendments (Step 1.5 behavioral-unpacking + shape-less verdict for standalone state-printers / command-side levers / family leaves) battle-validated at scale, mirrored in spec
- Shape catalog corrected: `rules` removed from Shape 10 examples (now 2 confirmed: qizmo + options); `rules` added to "NOT Shape 10" anti-examples as mode-aware-state-printer lesson
- Sub-agents now read the corrected catalog cold; no risk of propagating the prior `rules`-as-Shape-10 misclassification

**This batch**: 8 cards in the **Spectator chat & visibility** category. Small batch, single-session-friendly. New disciplines apply (see below).

---

## Reads required (in order, before dispatching)

1. **This handoff doc** (you are here).
2. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md`** -- skim 5-10 sections (1612-3110 lines) to absorb the v2 voice + See-also discipline + Effect-bullet shape. The tail sections (downspecs / info / kinfo / kuinfo / mapcycle / sct_hex etc.) are the cleanest examples of the most recent discipline. Pay attention to `drafted_with_flag` entries for the kinds of factual catches the skill is designed to surface.
3. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-2026-05-23.md`** -- 1 parked card (callalias, sui-generis). Reference for what a park entry looks like.
4. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** + all 6 `references/` files -- the runtime skill. Step 1.5 + shape-less verdict baked in. Confirm the `rules`-NOT-Shape-10 entry in `references/shape-catalog.md` (Shape 10 "Distinguish from these neighbors that are NOT Shape 10" section) and the matching NOTE in `references/worked-examples.md` Shape 10 section.
5. **`docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`** -- spec is now in sync with SKILL.md amendments. Read for design intent if needed.

---

## Critical rules (don't deviate)

- **You ARE the dispatcher.** Sub-agents run the skill via Skill tool; you pre-fetch inputs + dispatch + report progress.
- **Sequential dispatch only.** Sub-agents append to per-batch files; parallel writes race. One Agent call at a time, wait for completion, then next.
- **Sub-agent dispatch shape**: `subagent_type=general-purpose`, `model=sonnet`. Spec-locked dial: Sonnet 4.6 high. (See A/B probe below for the optional xhigh comparison on the first 2 cards.)
- **Per-batch files (APPEND -- create if missing, do NOT overwrite)**:
  - Drafts: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md` (NEW file for this batch; the Server-config batch's file stays separate)
  - Park: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-<batch_date>.md` (only if a card parks)
- **Sub-agent prompt must include explicit Step 1.5 + shape-less verdict reminders** (sub-agents read SKILL.md cold each invocation; can't assume they remember).
- **NEVER touch `entities.description` in the DB.** Drafts file only. Apply pass is a separate phase, operator-driven.
- **NEVER commit between cards.** Single commit at end of batch (after cross-card sweep + HANDOVER update).

---

## NEW disciplines from prior session retrospective (Server config & network, 2026-05-24)

### 1. VERIFY file appends every 3-5 cards (CRITICAL -- file-loss recovery lesson)

Prior session lost 14 cvar sub-agent appends mid-batch. The file's state showed only the prior session's content + the LAST sub-batch's commands -- 14 cvar drafts were silently overwritten somewhere between dispatches. Most likely cause: sub-agent Read-then-Write patterns racing or restoring pre-session state.

**Discipline**: after every 3-5 card dispatches, run:

```bash
grep -c "^## <entity_name> " apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md
```

per recently-dispatched card. If 0 returned, the section is missing -- recover from the sub-agent's in-context response BEFORE dispatching more cards and losing the recovery window.

For an 8-card batch, verify after cards 3, 6, and 8. Doesn't add real time; saves a recovery scramble.

### 2. Cross-card consistency sweep at end of batch (NEW pass)

Per-card verification can't catch sibling inconsistency. Prior session: `maxfps` sub-agent caught `k_noframechecks`'s imprecise "after 3 accumulated FPS warnings" wording ONLY because explicitly told to cross-check. Same class of error: shared misintuitions, sibling permission asymmetry, companion-name mismatches.

**Bake into this batch**: after all 8 cards are drafted, dispatch ONE FINAL sub-agent that reads the per-card sections in this batch's drafts file and looks for cross-card issues. Output appended as a `## Cross-card consistency notes` section at the END of the drafts file. Dispatch prompt at the bottom of this handoff.

### 3. Sonnet xhigh vs high A/B probe (optional, cheap probe)

Prior session ran all cards at Sonnet 4.6 high. Higher effort tiers (xhigh, max) may catch a few more edge cases at 2-3x cost -- or may be diminishing returns. **Cheap probe**: dispatch the first 2 cards at Sonnet xhigh; compare flag-quality + recast-depth against the next 6 at high. If meaningful improvement: stay xhigh for the rest. If marginal: revert to high.

Document the A/B finding in a brief operator-facing note in the wrap-up commit message.

### 4. No-forward-references to non-existent L3 concept notes

Two cards in this batch (`k_sayteam_to_spec` + `k_spectalk`) currently cite **"QW team-chat visibility concept note"** in their See-also. **That concept note does NOT exist yet** (it's a pending HANDOVER small followup, sized ~30-45 min, surfaced 2026-05-21). Per `universal-shape-v2.md` discipline ("Never insert `[X -- pending]` forward references into L1 prose"), the recast MUST NOT carry forward this See-also.

Replace with sibling cross-links to other L1 entities in this batch (k_spectalk ↔ k_sayteam_to_spec ↔ silence + k_spec_info / infospec / infolock cluster as relevant).

---

## Anchor + batch metadata

- **anchor_version**: `v1.36-1633-g67253dc` (verify at session start with `git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always`; update everywhere if drifted)
- **batch_date**: `<YYYY-MM-DD>` -- set at session start; same date used in drafts/park filenames
- **category**: `Spectator chat & visibility` (all 8 cards)

---

## 8 cards (pre-fetch table)

| # | entity | type | source_ref | catalog_line |
|---|---|---|---|---|
| 1 | k_ann | cvar | src/world.c:943 | 17100 |
| 2 | k_sayteam_to_spec | cvar | src/world.c:864 | 17131 |
| 3 | k_spec_info | cvar | src/world.c:965 | 17165 |
| 4 | k_spectalk | cvar | src/world.c:860 | 17197 |
| 5 | infolock | command | src/commands.c:930 | 17229 |
| 6 | infospec | command | src/commands.c:931 | 17257 |
| 7 | nospecs | command | src/commands.c:1032 | 17286 |
| 8 | silence | command | src/commands.c:745 | 17314 |

Use the catalog HTML metadata-strip at `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` to extract each card's `<pre class="description">` content as the `existing_description` input. The lines above point at the `<div class="card" ...>` boundary; the description block starts ~10 lines down inside each card's `<div class="card-body">`.

---

## Family / pattern notes (helps See-also discipline + shape guesses)

- **`k_spec_info` + `infospec` + `infolock`** -- cvar with TWO toggle commands, each toggling a different BIT (`infospec` XORs MI_ON = bit 0 = `1<<0`; `infolock` XORs MI_ADM_ONLY = bit 1 = `1<<1`). This is a Shape 1 variant: one cvar, two paired toggles, each handling a distinct bit-flag within the cvar's bitmask. Sub-agent should verify in source whether to tag as Shape 1 composition (each command card tagged Shape 1 against the same cvar) or surface as a candidate new shape (park trigger 1 if no existing shape captures the two-toggles-on-one-bitmask-cvar pattern). The cvar card itself likely Shape 3 + Shape 1 (bitmask state + two paired toggles).
- **`k_spectalk` + `silence`** -- Shape 1 paired toggle. Source confirms: `silence` handler is `ToggleSpecTalk` (`commands.c:3252-3296`) which flips `k_spectalk` via `cvar_fset`. Standard Shape 1. NOTE: `silence` also writes the engine cvar `sv_spectalk` and toggles `fpd` bit 64 during a live match -- those are downstream side effects, surface as Effect bullets on the command card; the Shape 1 tag still applies cleanly.
- **`k_sayteam_to_spec`** -- Shape 3 cvar (no paired command in this batch). Sets policy that controls the engine cvar `sv_sayteam_to_spec` based on match state. 4-value enum (0/1/2/3). Cross-link to `k_spectalk` (related teamsay visibility) and `silence`.
- **`k_ann`** -- Shape 3 cvar (no paired command). Governs spectator join/leave message visibility to players during a live match. Existing description is precise; recast is mostly mechanical v1->v2.
- **`nospecs`** -- Shape 7b vote command. Per audit-trail: handler at `vote.c:999-1034` toggles per-player vote flag (`self->v.nospecs`), calls `vote_check_nospecs` at `vote.c:933-997` which on majority flips `_k_nospecs` (the underlying state cvar -- note the leading underscore prefix; verify whether this is an L1 entity or engine-internal). Threshold cvar: `k_vp_nospecs` (in Voting category, NOT this batch -- but the cvar exists in source; the See-also link is valid because it's an existing L1 entity, not a planned concept note). Sub-agent should cross-link to `k_vp_nospecs` and to the underlying state cvar (if it's in L1).
- **L3 concept note "QW team-chat visibility"** does NOT exist yet (pending HANDOVER small followup). Do NOT carry the forward-reference forward in the recast (see Critical rules + Discipline #4 above). Replace with sibling cross-links.

---

## Open followups (NOT blocking this batch; capture-only)

- **Apply pass for Server config & network's 57 cards** -- operator-driven, deferred until operator picks up. This batch will eventually need its own apply pass too.
- **`teamoverlay` vote command** -- Shape 7b pair partner of `k_teamoverlay` (drafted in prior batch); NOT in this category. Lives in Voting (34 entities, ~next batch after this one).
- **L3 concept note "QW team-chat visibility"** -- pending operator-authored note (sized ~30-45 min). Surfaced 2026-05-21. Sub-agents should NOT inline-write the note; just don't carry the forward-reference forward.
- **HANDOVER one-liner for this batch** -- after you start dispatching, consider adding an "in-flight" entry to HANDOVER.md Active arcs pointing at this doc (mirror the format the prior Server-config in-flight entry had at line 18). Not strictly required for a small 8-card batch; reasonable to skip and just commit the SHIPPED entry at the end.

---

## First three actions

1. **Read this doc + the existing drafts file (skim).** Absorb the v2 voice + the kinds of flags the skill catches. Especially the recent (this-session) sections: tail of `ktx-l1-rewrite-drafts-2026-05-23.md`.
2. **Read SKILL.md + the 6 references/ files.** Refresh on Step 1.5 + shape-less + the 14-shape Layer B catalog. Verify the corrected `rules`-NOT-Shape-10 entry in `references/shape-catalog.md`.
3. **Pre-fetch + dispatch card 1 (`k_ann`)** at Sonnet xhigh (start the A/B probe):
   - Read `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` lines ~17100-17130 to extract the `<pre class="description">` content (this is the `existing_description` input)
   - Dispatch via Agent tool with `subagent_type=general-purpose`, `model=sonnet`. Override the effort dial to xhigh for cards 1+2 (the A/B probe). Cards 3-8 default to high unless the probe favors xhigh.
   - Wait for completion, log brief result, dispatch card 2 (also xhigh).
   - After card 2 completes, briefly compare card-1-xhigh vs card-2-xhigh against the existing Sonnet-high drafts in the prior session's file -- does xhigh produce noticeably deeper Step 1.5 unpacking, sharper flag detection, or better cross-link discipline? If yes: stay xhigh for cards 3-8. If no: revert to high.

---

## Dispatch prompt template (copy + adapt per card)

Use this exact shape, replacing `<ENTITY>`, `<TYPE>`, `<EXISTING_DESCRIPTION>`, `<SOURCE_REF>`, `<CATALOG_LINE>`, `<BATCH_DATE>`, and any card-specific family notes.

```
Use the `ktx-l1-rewrite` skill -- "rewrite the L1 description for <ENTITY>". Skill at `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (Sonnet 4.6 high spec-locked; for THIS card use xhigh effort as part of the A/B probe -- replace 'high' with 'xhigh' on cards 1+2 only). Step 1.5 (behavioral unpacking per consumer) + shape-less verdict amendments are in effect. Shape catalog corrected: `rules` is NOT Shape 10 (it's a mode-aware state-printer); do not classify state-printers as Shape 10 by analogy.

**Tagging discipline**: `shape-less` is for entities with NO Layer B shape match. Shape 3 (cvar-only-with-no-paired-command) IS a Layer B shape -- tag accordingly. Do NOT report "shape-less (Shape 3)" -- pick exactly one in both the section header and the final reporting line.

**No-forward-references rule**: if the existing description's See-also cites "QW team-chat visibility concept note" or any other not-yet-written L3 concept note, do NOT carry that forward in the recast. Replace with sibling cross-links to other L1 entities in this batch (e.g. k_spectalk ↔ k_sayteam_to_spec ↔ silence) or to existing L1 cvars/commands (e.g. k_vp_nospecs for nospecs).

Inputs:

- **entity_name**: `<ENTITY>`
- **entity_type**: `<TYPE>`
- **category**: `Spectator chat & visibility`
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

## Cross-card consistency sweep dispatch (after all 8 cards done)

After all 8 per-card dispatches complete AND you've verified all 8 sections are present in the drafts file, do ONE final dispatch:

```
Read the 8 per-card sections appended to `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<BATCH_DATE>.md` (the Spectator chat & visibility batch -- 8 cards: k_ann, k_sayteam_to_spec, k_spec_info, k_spectalk, infolock, infospec, nospecs, silence).

Look for cross-card consistency issues:

1. **Shared misintuitions**: multiple cards with the same wrong permission framing, same wrong default-value assumption, same wrong fallback semantics. (Last session example: 4 cards carried the same "any in-game player, or an admin spectator" phrasing -- all wrong because CF_BOTH = CF_PLAYER | CF_SPECTATOR with no admin gate.)
2. **Cross-card factual contradictions**: card A says X about a shared underlying fact (e.g. when a behavior fires), card B says not-X about the same fact. (Last session example: maxfps "fourth warning triggers disconnect" is source-true; k_noframechecks "after 3 accumulated FPS warnings" is imprecise about the same source predicate `fIllegalFPSWarnings > 3`.)
3. **Companion references mismatching**: card A's See-also references "<other entity>" but the entity isn't in L1, is named differently in source, or is described inconsistently with card B's framing of the same companion.
4. **Permission flag asymmetry**: CF_BOTH = CF_PLAYER | CF_SPECTATOR (no admin); CF_BOTH_ADMIN = CF_PLR_ADMIN | CF_SPC_ADMIN; CF_PLAYER | CF_SPC_ADMIN = anyone-or-admin-spec. Verify each card's permission line matches the source registration's CF_* flags exactly. Definitions in `research/repos/ktx/src/include/g_local.h:647-655`.
5. **Bitmask-vs-bit clarity (k_spec_info family specifically)**: k_spec_info / infospec / infolock all operate on the same cvar's bits -- check that each card correctly identifies WHICH bit it toggles and what that bit's user-observable effect is. No card should claim a bit that another sibling actually owns.

For each finding, append a brief note to a NEW "## Cross-card consistency notes" section at the END of the drafts file. Each note: which cards involved, what's inconsistent, what source says is true, what the apply-pass-author should align.

If no issues found: append the section with "No cross-card issues detected. All sibling references consistent, permission flags match source CF_* registrations, k_spec_info bit ownership clean."

Dispatch shape: subagent_type=general-purpose, model=sonnet, high reasoning (verification task; same effort tier as per-card unless the A/B probe favored xhigh).

Do NOT commit. Do NOT touch entities.description.
```

---

## When you're done

- **Verify all 8 sections + the cross-card notes section are present** in the drafts file before committing: `grep -c "^## " apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<BATCH_DATE>.md` should equal 9 (8 cards + 1 cross-card sweep section).
- **Commit a wrap-up**: `git add` the drafts/park files + commit with a clear message referencing the 8 cards + the A/B probe result + the cross-card sweep findings.
- **Update HANDOVER.md**: add a SHIPPED Small followup entry mirroring the Server-config-fanout entry's format (commit `abdfc1be`'s HANDOVER treatment). Don't forget to flag the apply-pass for this batch alongside the prior batch's pending apply-pass.
- **Mark this parking doc for deletion**: `git rm docs/superpowers/parking/2026-05-25-handoff-ktx-l1-rewrite-spectator-chat-visibility-batch.md` as part of the wrap-up commit.
- **Flag for operator**: 8 cards drafted in Spectator chat & visibility category, ready for apply-pass review (defer until operator picks up the Server-config apply pass first; same operator phase).
- **Optionally**: if the A/B probe favored xhigh meaningfully, surface a recommendation to update the SKILL.md model dial from "Sonnet high" to "Sonnet xhigh" via a spec amendment. (Operator decision; not auto-apply.)

---

## When in doubt

- **The spec governs** per the SKILL.md header. Spec + SKILL.md are now in sync (commit `7a087330`); both have Step 1.5 + shape-less amendments. If you see drift, SKILL.md wins at runtime.
- **Verify against live KTX source** at `/home/paradoks/projects/quakeworld/research/repos/ktx/src/` -- never trust the existing description's framing without source verification (Step 3 spot-check is the inner enforcement loop).
- **Read 2-3 already-drafted sibling cards** before drafting a new card with siblings already done. The Spectator chat & visibility cluster (infospec/infolock/k_spec_info; silence/k_spectalk) has internal siblings -- maintain consistency across the batch.
- **If a card surprises the skill**: capture the sub-agent's output verbatim, report to operator, do NOT silently iterate the skill or amendments. The shape catalog is operator-judgment territory.
- **Tagging discipline reminder**: `shape-less` is for entities with NO Layer B shape match (standalone state-printers, command-side levers, family leaves). Shape 3 (cvar-only-with-no-paired-command) IS a Layer B shape -- entities matching Shape 3 cleanly are tagged `Shape 3`, NOT `shape-less`. Mutually exclusive. (Prior session saw drift like "shape-less (Shape 3)" -- catch it in sub-agent output before it lands in the drafts file.)
