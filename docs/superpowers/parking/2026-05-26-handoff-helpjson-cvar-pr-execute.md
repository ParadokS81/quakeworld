# Handoff: ezQuake cvar help-JSON PR -- ready to execute (post-audit)

**Created:** 2026-05-26 at end of cvar-audit + verifier-fan-out session.
**For:** a fresh terminal, cold, executing the cvar PR.
**Supersedes (cvar parts only):** `docs/superpowers/parking/2026-05-24-handoff-helpjson-cmdline-pass-and-cvar-pr-open.md` -- the cvar PR section of that doc was based on a stale scope-claim; the cmdline-pass section remains valid for future cmdline work.
**Cross-references:** `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` (the LOCKED rubric); `docs/superpowers/parking/2026-05-15-handoff-helpjson-cvar-pass-and-reachability-blindspot.md` (original cvar-pass handoff; mostly superseded).

---

## One-paragraph state

The 2026-05-15 cvar drafts (originally claimed at 124 verdicts) were audited end-to-end against current source HEAD + current `help_variables.json` + a 5-sub-agent parallel verifier pass. After applying operator directives (drop all `sv_*`, drop dead-stubs) and the corrected empty-desc predicate, the real PR scope is **57 entries**. Five prose corrections are locked from the verifier findings. Nine concerns await operator decisions. Sixteen family-sibling pointer descriptions need to be written (template fills, ~10 min). Then standard PR packaging: PR-payload JSON + branch + per-family commits + `gh pr create` + L1 synthesis + slipgate snapshot regen. **Estimated ~90 minutes to ship from a fresh terminal.**

---

## Final scope: 57 entries

| Tier | Count | What it is | Source of prose |
|---|---|---|---|
| 1 -- straight needs_doc/high fills | **34** | Single-cvar, single-sentence fills | Already in drafts file; 5 need corrections (below) |
| 2 -- prose review (med/low confidence) | **3** | `localid`, `scr_scoreboard_login_flagfile`, `cl_voip_demorecord` | Already in drafts file; operator eyeball each |
| 3A -- family-head augmented descriptions | **4** | `hud_score_team_digits`, `_enemy_digits`, `_difference_digits`, `_position_digits` | Already in drafts file (the "Augmented head description" paste-in text) |
| 3A -- sibling pointer descriptions | **16** | 8 `re_trigger_match_2..9` + 8 `hud_score_*_align`/`_colorize` | **Not yet written; see templates section below** |
| **Total prose entries in PR** | **57** | | |

Plus PR-body housekeeping (no new prose; just questions/notes for nano):
- 7 `sv_*` group-43 doc-ghosts to flag for removal (same shape as PR #1128 Q3)
- Optional: 2 `show_velocity_3d_offset_*` dead-stubs question (in-progress feature vs orphan?)

---

## Decisions LOCKED (do not re-litigate)

1. **Drop all `sv_*` entries.** Operator directive: `sv_*` belongs to MVDSV's documentation track, handled after the KTX describe-fill arc completes. Affected 9 entries: `sv_cpserver`, `sv_cullentities`, `sv_demonovis`, `sv_enableprofile`, `sv_ktpro_mode`, `sv_progsname`, `sv_progtype`, `sv_qwfwd_port`, `sv_use_internal_cmd_dl`. ezQuake confirms this with `help.c:774` filter excluding `sv_*` from `dev_help_issues generate`.

2. **Drop `show_velocity_3d_offset_forward` + `_down`.** Registered cvars but zero read sites (dead-stubs). Operator framing: "no one is using them; they have no idea what it is." Optional PR-body question to nano if you want to surface the in-progress feature decision.

3. **Family collapse shape: head + brief sibling pointers** (NOT head-only). The mirror-pair pattern from PR #1128 (`+fire`/`-fire`) establishes this; we apply it to enumeration families here too. Templates below.

4. **`kick_to_ciscon` is dead.** Per the locked 2026-05-15 rubric. The 3 originally-flagged entries in our drafts have all been resolved or dropped (2 dead-stubs out; `sv_progtype` dropped per directive #1).

5. **14 entries dropped: already documented upstream.** PR #1120 (and possibly other PRs) populated descs between 2026-05-15 and today. They appear in the drafts file as `needs_doc/high` but have non-empty `desc` in current `help_variables.json`. List below.

6. **`internal0..9` are out of scope.** Source-side `cvar_t` structs exist at `tp_triggers.c:43-52` but are NEVER `Cvar_Register`-ed (intentional per `cvar.c:135` comment: "variables for internal triggers are not registered intentionally"). Not in `help_variables.json`. Engine-private scratch slots.

7. **HUD-namespace cvars NOT in help_variables.json are out of scope for this PR.** ezQuake's `help.c:774` filter excludes `hud_*` from `dev_help_issues generate`. Adding new `hud_*` entries that aren't already in the file would unilaterally widen the namespace upstream maintainers explicitly narrowed. Wait until they relax the filter.

---

## 14 entries dropped (already documented in upstream HEAD)

These appear in the drafts file with proposed prose but their `desc` field is already filled. Verified 2026-05-26 by reading current `help_variables.json`.

```
cl_bobhead                         current desc starts: "When 1, applies the walking bob..."
cl_pext_serversideweapon           current desc starts: "When 1, requests the MVD PEXT1..."
cl_username                        current desc starts: "Username for server authentication..."
cl_voip_capturingvol               current desc starts: "Volume multiplier applied while capturing..."
cl_www_address                     current desc starts: "Base URL of the central authentication server..."
file_browser_sort_archives         current desc starts: "When disabled (default), archive files..."
mvd_autoadd_items                  current desc starts: "When enabled, automatically registers respawn clocks..."
mvd_sortitems                      current desc starts: "Controls sort order of the MVD item respawn-clock list..."
r_lightmap_lateupload              current desc starts: "Defers lightmap GPU uploads..."
r_lightmap_packbytexture           current desc starts: "Controls how map surfaces are sorted..."
r_tracker                          current desc starts: "Master toggle for the on-screen frag tracker..."
r_tracker_pickups                  current desc starts: "Includes item pickups (weapons, armor, powerups)..."
re_trigger_match_0                 current desc: "Whole matched pattern of the regular expression match."
vid_reload_auto                    current desc starts: "When 1, graphics cvars (resolution, fullscreen...)"
```

**Verification command:** `python3 -c 'import json; hv=json.load(open("help_variables.json"))["vars"]; print(hv["cl_bobhead"].get("desc",""))'` (substitute name).

---

## 5 CORRECTIONS to apply (verifier-caught, source-confirmed)

Apply these edits to the drafts file (`apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries.md`) before generating the PR-payload JSON.

### 1. `scr_damage_scale`

- **Draft says:** *"...values below 0 are treated as 1."*
- **Source truth:** guard condition is `scr_damage_scale.value > 0` at `cl_screen.c:1254`; so value=0 ALSO falls through to 1.0, not only negative values.
- **Fix:** replace "values below 0" with "**values of 0 or below**".

### 2. `hud_ownfrags_timeout`

- **Draft says:** *"...fades out over this duration."*
- **Source truth:** `hud_scores.c:732-733` has `// not implemented yet: scale, color` and `// fixme: add appropriate opengl functions that will add alpha`. The `alpha` is COMPUTED at line 766-767 but NEVER passed to `Draw_SString` at line 774. The banner disappears abruptly at timeout.
- **Fix:** remove "fades out" claim. Replace with "**The banner disappears when this duration elapses** (fade animation is computed but not currently rendered)." Or simpler: just "**The banner disappears after this duration.**"

### 3. `hud_teaminfo_layout`

- **Draft says:** *"...with `$x10/%x11` for column separators."*
- **Source truth:** source default at `hud_teaminfo.c:912` is `"%p%n $x10%l$x11 %a/%H %w"`. Both tokens use `$`, not mixed `$/%`.
- **Fix:** change `$x10/%x11` to **`$x10/$x11`** (or "`$x10` and `$x11`").

### 4. `r_drawworld`

- **Draft says:** *"Disabling skips world draw entirely; used in timedemos and debugging."*
- **Source truth:** the only read site is `if (cl.worldmodel && (!cls.timedemo || r_drawworld.integer))` at `r_brushmodel_surfaces.c:342`. `r_drawworld=0` only matters during timedemo; during normal play `!cls.timedemo` is true and the OR short-circuits, so `r_drawworld` is ignored.
- **Fix:** replace with **"Setting to 0 suppresses world draw during timedemos only; no effect during normal play."** Remove "and debugging" -- no debug gate in source.

### 5. `r_tracker_string_teammate`

- **Draft says:** *"Label shown for the victim role in team-kill tracker lines."*
- **Source truth:** the string appears in BOTH roles. `vx_tracker.c:1017` (`VX_TrackerOddTeamkill` -- you killed a teammate): trailing label on the victim. `vx_tracker.c:1045` (`VX_TrackerOddTeamkilled` -- a teammate killed you): leading label on the killer.
- **Fix:** **"Teammate role label shown in team-kill tracker lines -- appears as either the killer or the victim label depending on which player is the teammate in the event."**

---

## 9 CONCERNS to decide (verifier-flagged; ambiguity worth operator eyeball)

Each entry: what the draft claims, what source actually shows, three options.

### 1. `sb_ignore_proxy`
- **Draft:** *"Space-separated list of proxy addresses (ip:port)..."*
- **Source:** `EX_browser_pathfind.c:234` uses `strstr(sb_ignore_proxy.string, ip_str)` -- free-form substring match, not parsed space-separated.
- **Options:** (a) accept (works in practice for users following the convention); (b) sharpen to "Filter string for proxy addresses; any text containing a proxy's ip:port substring suppresses it"; (c) flag as PR-body question.

### 2. `fs_savegame_home`
- **Draft:** *"...saves to `~/.ezquake/<gamedir>/save/`..."*
- **Source:** `fs.c:766-769` -- on Windows the home path is `~/ezQuake/...` not `~/.ezquake/...`.
- **Options:** (a) accept (Linux user-facing); (b) sharpen to "(`~/.ezquake/<gamedir>/save/` on Linux, `~/ezQuake/<gamedir>/save/` on Windows)"; (c) drop the path example entirely.

### 3. `r_drawhud`
- **Draft:** *"...useful for screenshot tools or compositing pipelines that flush separately."*
- **Source:** code only shows value=2 skips the flush at `cl_screen.c:997-998`; no source comment provides the "useful for" rationale.
- **Options:** (a) accept (reasonable inferred use case); (b) drop the editorial and keep just "value=2 processes HUD elements but skips the GPU flush"; (c) flag as PR-body question.

### 4. `hud_itemsclock_timelimit`
- **Draft:** *"...only item respawns due within this many seconds are listed."*
- **Source:** `mvd_utils.c:766` -- condition is `current->entity || current->clockval - cls.demopackettime < time_limit`. Live-entity items are always shown regardless of timelimit; timelimit only gates pending respawns.
- **Options:** (a) accept (matches user mental model); (b) sharpen to "Look-ahead window for pending respawns; live items on the map are shown regardless"; (c) flag as PR-body question.

### 5. `scr_scoreboard_login_indicator`
- **Draft:** *"Coloured marker string drawn beside logged-in players on the scoreboard."*
- **Source:** `sbar.c:1684-1691` -- if the player has `loginflag` and the flag image loads, draws a country-flag IMAGE from the atlas. The indicator STRING is the fallback when no flag is available.
- **Options:** (a) accept (string IS the fallback path); (b) sharpen to "Indicator string used as fallback when no country-flag image is available for a logged-in player; primary display is the flag-image atlas tile (see `scr_scoreboard_login_flagfile`)"; (c) flag as PR-body question.

### 6. `gl_powerupshells_effect1level`
- **Draft:** *"Opacity of the active-color layer of the first powerup shell pass."*
- **Source:** `glc_aliasmodel.c:569-576` -- `color[R] = (base_level + effect_level) * shell_alpha`. `effect_level` is a per-channel RGB weight, not opacity. `shell_alpha` (set by `gl_powerupshells`) controls actual alpha.
- **Options:** (a) accept (close enough for users); (b) sharpen to "Active-powerup-color contribution weight for the first shell pass (additive RGB level, not alpha; final opacity is `gl_powerupshells`)"; (c) flag as PR-body question.

### 7. `gl_powerupshells_effect2level`
- Same shape as #6. Apply the same decision.

### 8. `cl_mvinset_offset_y`
- **Draft:** *"Pixel offset applied to the multiview inset window along the Y axis. See cl_mvinset_offset_x."*
- **Source:** `r_rmain.c:483-484` -- `offset_x` is ADDED, `offset_y` is SUBTRACTED. In GL Y-up coords, positive `offset_y` shifts the inset down on screen. The "See cl_mvinset_offset_x" cross-reference is technically about the same concept but sign convention is opposite.
- **Options:** (a) accept (axis-equivalent enough); (b) sharpen to "Pixel offset along the Y axis (positive values shift the inset downward on screen). Compare cl_mvinset_offset_x for horizontal positioning"; (c) flag as PR-body question.

### 9. `mvd_info_setup`
- **Draft mentions:** *"...%p powerup..."* in token list.
- **Source:** `mvd_utils.c:1089-1103` -- the entire code block that would populate `mvd_info_powerups` is **commented out**. The `%p` token expands to an empty string at runtime.
- **Options:** (a) accept and note; (b) sharpen to remove `%p` from the live token list and add "(`%p` token exists but currently expands to empty)"; (c) flag as PR-body question.

**Operator workflow recommendation:** walk these 9 one at a time per `feedback_one_question_at_a_time` memory; my recommendation for each is option (b) sharpen, which preserves the existing draft's utility while adding the verified nuance. Option (c) is fine for any where you'd rather have nano confirm.

---

## 16 sibling pointer templates (to write)

Paste-ready prose for each sibling entry. Apply to `help_variables.json` `desc` field.

### `re_trigger_match_2..9` (8 entries)

Head is `re_trigger_match_0` -- already documented upstream as *"Whole matched pattern of the regular expression match."* (Drop the previously-drafted augmented head; existing prose is fine.)

Per sibling -- swap the index:

```
re_trigger_match_2:  "Capture group 2 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
re_trigger_match_3:  (same shape, "Capture group 3...")
re_trigger_match_4:  (same shape, "Capture group 4...")
re_trigger_match_5:  (same shape, "Capture group 5...")
re_trigger_match_6:  (same shape, "Capture group 6...")
re_trigger_match_7:  (same shape, "Capture group 7...")
re_trigger_match_8:  (same shape, "Capture group 8...")
re_trigger_match_9:  (same shape, "Capture group 9...")
```

### `hud_score_team_*` (2 sibling entries)

Augmented head description already in drafts file at `hud_score_team_digits`. Siblings:

```
hud_score_team_align:    "Horizontal alignment of the own-team score readout ('left' | 'center' | 'right'). See hud_score_team_digits."
hud_score_team_colorize: "Colorization mode for the own-team score readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_team_digits."
```

### `hud_score_enemy_*` (2 sibling entries)

```
hud_score_enemy_align:    "Horizontal alignment of the enemy score readout ('left' | 'center' | 'right'). See hud_score_enemy_digits."
hud_score_enemy_colorize: "Colorization mode for the enemy score readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_enemy_digits."
```

### `hud_score_difference_*` (2 sibling entries)

```
hud_score_difference_align:    "Horizontal alignment of the score-difference readout ('left' | 'center' | 'right'). See hud_score_difference_digits."
hud_score_difference_colorize: "Colorization mode for the score-difference readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_difference_digits."
```

### `hud_score_position_*` (2 sibling entries)

```
hud_score_position_align:    "Horizontal alignment of the position-rank readout ('left' | 'center' | 'right'). See hud_score_position_digits."
hud_score_position_colorize: "Colorization mode for the position-rank readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_position_digits."
```

---

## PR-body housekeeping (no new prose)

These are NOT entries to fill -- they're questions/notes for nano in the PR description (same shape as PR #1128's three questions).

### Question 1 (recommended): 7 sv_* group-43 doc-ghosts -- remove from `help_variables.json`?

> These entries have no source backing in `ezquake-source` and appear to be MVDSV-territory mirrors that landed in `help_variables.json` during an old XML->JSON conversion. They were excluded from PR #1120's frozen scope. Recommend removal:
> - `sv_cpserver`
> - `sv_cullentities`
> - `sv_demonovis`
> - `sv_enableprofile`
> - `sv_ktpro_mode`
> - `sv_qwfwd_port`
> - `sv_use_internal_cmd_dl`
>
> Same shape as Q3 of PR #1128 (5 dead command entries).

### Question 2 (optional -- include if operator wants nano signal): 2 dead-stub cvars

> `show_velocity_3d_offset_forward` (default 2.5) and `show_velocity_3d_offset_down` (default 5) are registered cvars in `cl_screen.c:110-111` + `:1110-1111` but have zero read sites at HEAD. In-progress feature placeholders to keep, or orphans to remove? Not documented in this PR pending intent confirmation.

---

## Verifier methodology (reusable for cmdline pass)

This session's verifier fan-out caught 21 of 47 needs_doc/high drafts as needing attention (45% flag rate -- higher than KTX's 25% baseline, attributable to the 10-day-stale drafts predating PR #1120). Reproduce this for the cmdline pass:

**Setup:**
- Drafts file: `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries-cmdline.md`
- Source HEAD: `/home/paradoks/projects/quakeworld/research/repos/ezquake-source/`
- Locked rubric: `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`

**Fan-out shape (worked):**
- 5 parallel sub-agents, Sonnet 4.6, "general-purpose" type
- Each given 7-12 drafts grouped by source file
- Each given the 18-point checklist (factual / style / rubric -- see below)
- Each returns structured findings: VERIFIED | CORRECTION | CONCERN with `file:line` evidence
- Conservative discipline: don't re-draft, only flag

**18-point checklist:**

*Factual (TRACED-CLEAN against source):*
1. `cvar_t <name>` declaration exists at cited source file
2. `Cvar_Register(&<name>)` call exists
3. Default value in prose matches source default
4. On_change handler (if cited) exists and behaves as described
5. Sibling cvars referenced exist with stated case
6. Build gates (`#ifdef X`) correctly applied
7. Constants, format strings, magic numbers verified
8. Read sites exist (otherwise it's a dead-stub, not needs_doc)

*Style (ezQuake terse house):*
9. Single sentence unless multi-sentence is load-bearing
10. Imperative or noun-fragment opening
11. No type-restate
12. ASCII only
13. No CamelCase function names in prose
14. No `file:line` references in description body
15. No engine jargon

*Rubric:*
16. Client/server axis correct
17. Doesn't claim behavior for unread cvars
18. Doesn't claim unverifiable protocol/server behavior

For cmdline pass specifically: substitute "cvar" terminology with "cmdline_param" and adjust factual checks for `CMDLINE_DEF` macro instead of `cvar_t`.

---

## Audit predicate bug (carry-forward lesson)

The 2026-05-15 audit used `name in help_variables.json["vars"]` as the "needs filling" predicate. **Correct predicate:** `name in vars AND vars[name].get("desc", "").strip() == ""`.

The bug allowed already-filled entries to remain in the drafts queue. Surfaced by the verifier sub-agent on 4 entries; the corrected re-audit found 14 of 140 affected (10%). **Apply the corrected predicate as the FIRST audit step in the cmdline pass before doing anything else** -- it shrinks scope cheaply and avoids drafting prose someone else already wrote.

---

## Packaging the PR (after corrections + decisions + pointer writes)

1. **Build PR-payload JSON** at `apps/qw-oracle/docs/upstream-prs/ezquake-help-variables-PR-payload.json`.
   - Clone `/tmp/build-commands-payload.py` from the commands-pass session (still in /tmp; if not, re-derive from `apps/qw-oracle/docs/upstream-prs/ezquake-help-commands-PR-payload.json` shape).
   - Adjust FILLS structure to the 57 cvar entries.
   - Note: cvar JSON entries can carry additional fields (`group-id`, `type`, `values`, `default`) per `help_variables.json` shape -- inspect existing filled entries to learn which fields to emit.

2. **Build PR branch** at `cleanup/help-json-variables-fills` off `upstream/master` in `research/repos/ezquake-source/`.
   - Clone `/tmp/build-commands-commits.py` for the per-commit-group structure.
   - 10-15 commits grouped by semantic family is right at this scale (57 entries).
   - Each commit gets `Assisted-by: Claude:claude-opus-4-7` footer per Linux kernel coding-assistants convention. **No `Signed-off-by:` from AI** -- operator signs the DCO at push time.

3. **Pre-commit discipline:** `git diff --cached --stat` between every `git add` and `git commit` (defensive per `feedback_verify_git_staging` memory; caught a parallel-actor staging mishap during the commands pass).

4. **Open the PR** via `gh pr create`. Title format: `help_variables: document 57 previously-empty variable entries`.
   - Body should include the housekeeping questions (above), the `Side findings` block (the 14 already-documented drops, the 11 entries dropped per directives), and any concern decisions that didn't get sharpened into prose.

5. **L1 synthesis** (qw-oracle side): clone `apps/qw-oracle/scripts/load-knowledge/insert-helpjson-synthesis-commands.py` to `insert-helpjson-synthesis-variables.py`; change type filter from `'command'` to `'cvar'`; change query target from `command_versions` to `cvar_versions`. `deriveCvar` is already F-D4a-guarded from the 2026-05-17 enforce-L1 arc.

6. **Regenerate snapshot** and commit monorepo changes (same 2-commit shape as the commands pass):
   - `feat(qw-oracle): ezquake help-variables synthesis -- PR #<N> + L1 stop-gap`
   - `chore(slipgate-app/data): regen ezquake snapshot (synthesized cvars + drift catch-up)`

7. **Update HANDOVER.md**: mark cvar PR opened. The "ezQuake help-JSON empty-entries audit" entry under "Open items" updates to "cvar pass SHIPPED -- PR #<N> open"; cmdline pass remains the last open sub-pass.

---

## Critical rules (carry-forward)

- **Operator is the technical gate.** Don't outsource judgment on concerns or borderline drafts. (`feedback_operator_not_technical_review_gate`)
- **Verify against source HEAD, not against the drafts.** Sub-agent claims are hypotheses until grep-confirmed. (`feedback_verify_dispatched_terminal_claims`)
- **ASCII only in prose.** (`feedback_output_discipline_sentiment`)
- **One question at a time** when walking the 9 concerns. (`feedback_one_question_at_a_time`)
- **No `Signed-off-by:` from AI**; use `Assisted-by: Claude:claude-opus-4-7`. Operator signs DCO at push.

---

## First three actions on session start

1. **Read this handoff + the locked rubric** (`docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`, specifically the "House style" and "Verdict rubric" sections) + skim the drafts file structure.

2. **Apply the 5 corrections** to the drafts file (in-place edits with the Edit tool; the verifier evidence is in the corrections section above, source `file:line` for each).

3. **Walk the 9 concerns with the operator** one at a time, each presented plain-English with the three options. Recommend option (b) sharpen for each unless operator prefers PR-body question. After concerns are locked, write the 16 sibling pointers (templates above), then proceed to packaging per "Packaging the PR" section.

---

## When in doubt

- This pass exists because help-JSON coverage is genuinely useful for QW players (`feedback_planning_first`). Don't over-engineer; ship the 57 entries that have value, route the rest to their proper homes.
- The arc-wide goal (per operator framing this session): make L1 more accurate AND give players useful documentation. Each "weird layer" exposed (case-folding, dead-stubs, doc-ghosts, namespace filters, MVDSV territory) is a real L1 fact getting locked down. The 140 -> 57 shrinkage is the arc working as designed, not failing.
- Maintainer review latency: PRs #1127 + #1128 have been open 2-3 days with no nano signal. That is normal for ezQuake's solo-volunteer review cadence -- not a bad sign. Don't delay opening the cvar PR waiting for them to engage.

---

## Open dependencies (not in this handoff's scope)

- **Maintainer responses on PRs #1127 + #1128** -- 3 questions awaiting on #1128. When responses come in, may need follow-up commits or PRs; track in HANDOVER small followups.
- **Cmdline pass (56 entries)** -- last sub-pass of the help-JSON empty-entries audit. Apply the corrected empty-desc predicate first, then the verifier methodology described above. Handoff doc at `2026-05-24-handoff-helpjson-cmdline-pass-and-cvar-pr-open.md` (cmdline parts).
- **MVDSV describe-fill arc** -- after KTX describe-fill completes, handles all `sv_*` cvars. ezQuake's `help.c:774` filter aligns with this division of responsibility.
- **L1-extractor follow-ups** -- the cvar pass surfaced no new L1 issues this session beyond the audit-predicate bug noted above. The 26 host.c `Cmd_AddLegacyCommand` shims from the commands pass are still parked at `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`.
