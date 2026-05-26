# Handoff -- ktx-l1-rewrite Admin & permissions batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-26
**Drafted by**: Frogbot batch ship session (commit `818b5252`)
**For**: fresh terminal dispatching the next ktx-l1-rewrite batch
**Target**: Admin & permissions category (37 cards) -- recommended chunk_size=10 (3 chunks of 10 + 1 of 7)
**Sized**: ~1-1.5 hours wall-clock (4 parallel sub-agents + cross-card synthesis + commit). Smaller batch than Frogbot but cross-category mix may surface more cross-batch threading questions.

---

## Where things are

The chunked-mode pattern is **quadruply validated**:
- Scoring & stats: chunk_size=6 (initial calibration), 19 cards
- Mode selection: chunk_size=7, 28 cards
- Mode-scoped knobs: chunk_size=8, 66 cards (first halt-on-novelty production exercise -- operator-accepted park)
- Frogbot: chunk_size=10, 78 cards (largest batch to date; held cleanly across 8 chunks; 0 halts; 0 parks)

**Cumulative ktx-l1-rewrite progress**: 7 batches shipped, 288 of 618 entities = ~47% drafted, 3 entities parked (callalias / roundsdown / roundsup -- all queued for apply-pass hand-drafting). Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Frogbot batch lessons** (commit `818b5252`):
- chunk_size=10 sustainable for Shape 8 + tooling-mode-prereq categories where per-card depth is moderate
- 0 novelty halts (shape catalog 14+ shapes covered cleanly)
- 18 cross-card findings (13 actionable + 4 confirmed clean + 1 follow-up)
- F1 audit pattern surfaced a 3rd variant: `CF_BOTH + runtime-gate via k_fb_admin_only` (distinct from prior batches' `CF_PLAYER | CF_SPC_ADMIN` mislabels)
- All 78 Frogbot cards now reference `k_fb_admin_only` in See-also -- which is in THIS batch (Admin & permissions). Drafting it unblocks Frogbot cross-batch See-also threading on apply.

**Shape catalog state**: 14+ shapes locked. Admin & permissions is a CROSS-CATEGORY MIX -- expect 4 distinct shape patterns dominant:
- Shape 3 (set-once admin cvars): `k_admincode`, `k_admins`, `k_allowvoteadmin`, `k_privategame_*`, `k_allowed_free_modes`, `k_free_mode`, etc.
- Shape 4 (gated-command pattern): `admin` gated by `k_admins`; `lockmap` gated by `k_lockmap`; etc.
- "shape-less admin command": pure admin-action commands like `kick`, `mkick`, `force_spec`, `check`, `dumpent`, `lock`, `lockmode`, `dropitem`, `speed`, `socd`, `iplist`, `klist`
- "shape-less list-printer": `commands` (introspective command lister -- classified shape-less per session 3 / shape-catalog Shape 10 disambiguation)
- **Cross-category entities** (primary shape lives elsewhere): `y`/`n` (Shape 7a vote responses for `elect`); `fp`/`fp_spec` (Shape 2 cycle commands paired with `k_fp` in another batch); `hdptoggle` (Shape 1 paired with `k_lock_hdp` in another batch); `qlag`/`qpoint` (Shape 11b siblings for the fpd-bitmask family -- per Spectator chat batch's open follow-up at the time of writing); `ban`/`banip`/`banrem` (CF_REDIRECT to mvdsv).

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 7 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries + the F1 audit followup. Especially the Frogbot entry (this batch's predecessor) and the Spectator chat batch's open follow-up on Shape 11b qizmo siblings (covers `qlag`/`qpoint` in this batch).
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- the 5 procedural detail files (pre-flight, pre-fetch, halt-on-novelty, cross-card-checks, file-formats).
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-frogbot.md` -- prior batch's `## Cross-card consistency notes` section (especially F1 CF_BOTH + runtime-gate pattern, F8 debug nested-dispatch sub-question, F10 k_fbskill_* overwrite-risk pattern -- all relevant to admin-command discipline).
5. Skim the per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 3 + Shape 4 sections load-bearing for admin-cvars; Shape 11b section for qlag/qpoint; Shape 7a section for y/n vote responses; Shape 10 disambiguation for `commands` introspective lister**.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (Permission CF-flag table -- LOAD-BEARING for this batch since many entities are truly admin-only `CF_BOTH_ADMIN` or `CF_PLR_ADMIN`).
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`.

---

## Critical rules

1. **chunk_size=10 for this batch.** 37 entities -> 3 chunks of 10 + 1 of 7. Smaller than the Frogbot batch but maintains calibration continuity. If any chunk hits ~150k context warnings, drop that chunk to chunk_size=8.

2. **PERMISSION DISCIPLINE IS LOAD-BEARING for this batch.** Unlike prior batches where the F1 audit found systematic mislabels, this batch contains MANY legitimately admin-only entities. The CF flag at source dictates the Permission line; do NOT assume all admin-category entities are admin-only. Per-card CF flag check:
   - `CF_BOTH_ADMIN` (= `CF_PLR_ADMIN | CF_SPC_ADMIN`) -> "admin only" (CORRECT framing). Many admin commands here will hit this.
   - `CF_BOTH` (player + spectator, no admin) + RUNTIME admin check inside handler -> two-phase Permission line ("any player or spectator; runtime check refuses non-admins").
   - `CF_PLAYER | CF_SPC_ADMIN` -> "any player or admin spectator" (NOT admin only; the Frogbot/Mode-selection F1 mislabel pattern).
   - `CF_REDIRECT` (ban/banip/banrem) -> handler in mvdsv; describe as "admin command (handler in mvdsv)" with cross-reference to mvdsv source.
   - Sub-agents MUST verify CF flag at registration in `src/commands.c` per entity. Do not pattern-match against the F1 residue from prior batches.

3. **k_fb_admin_only is a LOAD-BEARING cross-batch reference.** This cvar is referenced by ALL 78 Frogbot cards as the runtime admin gate. Its v2 card needs to be drafted with care -- the apply pass will use it to verify cross-batch See-also threading. Source: `RegisterCvarEx(FB_CVAR_ADMIN_ONLY, "0")` at `src/world.c:1061`; constant defined as `"k_fb_admin_only"` at `include/fb_globals.h:405`. 3-tier enum (0=no gate / 1=admin / 2=real_admin); read at `src/bot_commands.c:2392-2406`.

4. **Cross-category entities** (entities whose PRIMARY shape lives in another batch): `y`/`n` (Shape 7a partners of `elect` -- drafted in Voting batch), `fp`/`fp_spec` (Shape 2 partners of `k_fp` -- NOT yet drafted), `hdptoggle` (Shape 1 partner of `k_lock_hdp` -- NOT yet drafted), `qlag`/`qpoint` (Shape 11b siblings of fpd-bitmask family; partial drafted via qizmo in session 3; full Shape 11b composition flagged by Spectator chat batch open follow-up). For these: classify under their primary shape AND make the cross-batch See-also reference clear. If the paired cvar is NOT yet drafted, note as a cross-batch threading dependency in the entity's Notes section.

5. **`commands` is shape-less (introspective command lister)** -- per shape-catalog "Distinguish from these neighbors that are NOT Shape 10" section. Source iterates the command table dynamically with class/permission/match-state filters + optional substring search. Output is per-caller-dynamic. 1-of-1 in KTX; shape-less. DO NOT classify as Shape 10.

6. **`ban`/`banip`/`banrem` CF_REDIRECT semantics**: these registrations route to mvdsv handlers (KTX bounces the command; the actual handler lives in `/home/paradoks/projects/quakeworld/research/repos/mvdsv/src/`). From user POV they are still KTX commands. Verify handler in mvdsv source for the Effect description; cite the mvdsv file:line in Notes.

7. **Halt-on-novelty likely for the qizmo Shape 11b composition**: qlag/qpoint operate on fpd serverinfo bitmask (Shape 11b per Spectator chat F7 follow-up); the partial pattern was identified but Shape 11b application across the qizmo family was deferred. If sub-agents fully classify these under Shape 11b without operator review, surface in halt-on-novelty for explicit operator confirmation. If trigger 1/4 fires elsewhere, halt the batch and return the candidate-shape signature.

8. **DISPATCHER OVERRIDE on sub-agent file-writes** (unchanged). Each sub-agent prompt MUST instruct: "DO NOT write per-batch files; return YAML metadata only; write your chunk's assembled section content to /tmp/<chunk_id>_output.md in one Write call." Dispatcher assembles atomically at Step 6.

9. **Stage explicit files only**. `git add HANDOVER.md <drafts-file> <park-file-if-any>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.

10. **Commit message format**. Use `docs(ktx-l1-rewrite): SHIPPED Admin & permissions category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=10`. Append the suffix for the calibration log.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator whether to advance the anchor across all in-flight batches or wait.

Then read the 5 dispatcher references + per-card references per "Reads required" above.

### Action 2: Pre-fetch the 37 Admin & permissions entities

The catalog HTML is the recommended source (deterministic, no rate-limit):

```bash
python3 -c "
import re, json, html
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 184, 1294
card_pattern = re.compile(r'<div class=\"card\" data-name=\"([^\"]+)\"')
card_starts = []
for i, line in enumerate(lines[start:end], start=start+1):
    m = card_pattern.search(line)
    if m: card_starts.append((m.group(1), i))
card_starts.append(('__END__', end + 1))
results = []
for idx in range(len(card_starts) - 1):
    name, sl = card_starts[idx]
    nsl = card_starts[idx + 1][1]
    ct = ''.join(lines[sl-1:nsl-1])
    badge = re.search(r'<span class=\"badge\">([^<]+)</span>', ct)
    src = re.search(r'source: <code>([^<]+)</code>', ct)
    desc = re.search(r'<pre class=\"description\">(.*?)</pre>', ct, re.DOTALL)
    results.append({
        'entity_name': name,
        'entity_type': badge.group(1) if badge else None,
        'existing_description': html.unescape(desc.group(1).strip()) if desc else None,
        'source_ref': src.group(1) if src else None,
        'catalog_line': sl,
    })
print(json.dumps(results, indent=2))
" > /tmp/admin-permissions-entities.json
wc -l /tmp/admin-permissions-entities.json
```

Expected: 37 entities, 12 cvars + 25 commands. Verified at handoff-draft time.

**Suggested chunk plan** (4 chunks of 10+10+10+7; verify by walking the JSON):

- **Chunk A (10): Core admin cvars** -- `k_admincode`, `k_admins`, `k_allowvoteadmin`, `k_privategame_allow_specs`, `k_privategame_force_reconnect`, `k_allowed_free_modes`, `k_free_mode`, `k_ip_list`, `k_allowklist`, `k_allowtracklist`
- **Chunk B (10): Remaining cvars + admin core commands** -- `k_allowcountchange`, `allow_toggle_practice` (2 remaining cvars) + `admin`, `kick`, `mkick`, `force_spec`, `check`, `commands`, `klist`, `iplist` (8 commands)
- **Chunk C (10): Ban family + map/mode controls + misc admin** -- `ban`, `banip`, `banrem` (CF_REDIRECT to mvdsv) + `lock`, `lockmap`, `lockmode`, `dumpent`, `dropitem`, `speed`, `socd`
- **Chunk D (7): Cross-category entities** (primary shape lives elsewhere) -- `qlag`, `qpoint` (Shape 11b fpd-bitmask siblings -- see Spectator chat batch follow-up), `fp`, `fp_spec` (Shape 2 cycle commands), `hdptoggle` (Shape 1 paired toggle), `y`, `n` (Shape 7a vote responses for `elect`)

Adjust empirically based on actual entity grouping in the JSON. Chunk D is the trickiest -- those entities require cross-batch awareness.

**CROSS-BATCH GAP RESOLVED (2026-05-26)** -- `k_fb_admin_only` plus 14 sibling Frogbot cvars are now live L1 entities. Root cause was in the shared extractor library: `extractor_lib/_source.py::collect_file_macros` walked only depth-1 of the `#include` closure (a documented D4 park). The 15 `k_fb_*` cvars in `world.c` are registered via `RegisterCvarEx(FB_CVAR_*, ...)` where the `FB_CVAR_*` constants are defined in `fb_globals.h`, which is depth-2 from world.c via `g_local.h`. Fix: bumped to depth-N via `tu.get_includes()` (full preprocessor closure, matches what libclang already parsed). Cross-extractor regression check ran clean (+15 KTX cvars, +0/-0 for FTE/MVDSV/QWCL/other-KTX-handlers; one unrelated -1 in ezQuake from upstream rename of `EX_browser_qtvlist.c` -> `EX_qtvlist.c`). Reload + categorize (manual 'Frogbot' assignment, origin `manual|d4-extractor-fix-2026-05-26`) + catalog regen all done; catalog now at `2026-05-26-ktx-l1-catalog.html` (the 2026-05-22 file preserved as immutable snapshot). All 15 cvars: `k_fb_admin_only` / `k_fb_auto_delay` / `k_fb_autoadd_limit` / `k_fb_autoremove_at` / `k_fb_break_on_death` / `k_fb_debug` / `k_fb_easy_skill_mode` / `k_fb_enabled` / `k_fb_freeze_prewar` / `k_fb_health` / `k_fb_item_pickup_bonus` / `k_fb_options` / `k_fb_quad_multiplier` / `k_fb_skill` / `k_fb_weapon`. Net result: Frogbot apply-pass See-also references will resolve correctly. The 15 cvars live in the **Frogbot** category, NOT in this batch's `Admin & permissions` scope -- this batch dispatches with its original 37 entities. A separate future `ktx-l1-rewrite` Frogbot-remediation batch should draft v2 cards for these 15 cvars (no urgency until Frogbot apply pass runs).

### Action 3: Dispatch 4 sub-agents in parallel

Use the Agent tool, subagent_type=`general-purpose`, model=`sonnet`. Each sub-agent prompt follows the chunk-prompt template used in Frogbot (see commit `818b5252` for the structure -- 8 examples to lift from). Each prompt includes:
- Skill loading instructions (7 files: SKILL.md + 6 references)
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE (return YAML, write to /tmp)
- Cross-batch context briefing (THIS BATCH IS DIFFERENT FROM FROGBOT: admin commands are mostly truly admin-only `CF_BOTH_ADMIN` or `CF_PLR_ADMIN`; verify CF flag per entity at source)
- Permission-line discipline reminder (with the full CF flag table)
- Cross-category awareness for Chunk D (y/n/fp/fp_spec/hdptoggle/qlag/qpoint)
- Output format spec

After all sub-agents return:
- Aggregate verdicts.
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue).
- Cross-card synthesis (expect 6-12 findings; smaller batch + heterogeneous shape mix; Permission discipline will be a primary finding axis).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>-admin-permissions.md`.
- Park file if applicable.
- Append HANDOVER followup entry mirroring the Frogbot entry shape.
- Commit per the message format.

---

## Watch-outs for Admin & permissions

1. **Permission CF flag verification per card**. This is the most likely source of cross-card findings. Many entities are legitimately admin-only (`CF_BOTH_ADMIN`); some are `CF_PLR_ADMIN` (player-admin only, rare); a few may be `CF_BOTH` with runtime admin check; some are `CF_REDIRECT`. Each sub-agent must verify per entity at `src/commands.c` registration.

2. **`k_fb_admin_only` cross-batch threading dependency**. All 78 Frogbot cards reference this cvar in See-also. If it's not in this batch's catalog scope, surface as a cross-batch coordination question -- needs drafting somewhere before Frogbot apply pass can verify symmetric back-links. If it IS in scope (verify catalog), draft it carefully and note the 78 Frogbot back-references in its See-also (use a "central cross-link target" annotation).

3. **`ban`/`banip`/`banrem` mvdsv-handler distinction**. These are `CF_REDIRECT` in KTX -- the registration bounces to mvdsv. Each card should: (a) note the redirect in Permission/Set-by; (b) cite the mvdsv handler file:line in the Effect/Notes section; (c) NOT inline-document mvdsv-side ban-list semantics if they're not user-action-relevant.

4. **`y`/`n` are Shape 7a vote-response commands** -- paired with `elect` (drafted in Voting batch). Cross-link to `elect` + `suggestcolor` + all election-type starters. These are not "admin commands" despite living in this category -- they're player-invocable vote-affirm/deny commands (`CF_PLAYER`?).

5. **`fp`/`fp_spec`/`hdptoggle` are paired-toggle commands with their cvars in OTHER batches**. The cvars `k_fp`/`k_fp_spec`/`k_lock_hdp` may or may not be drafted yet (check `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`). If their paired cvars aren't drafted: surface as cross-batch threading dependencies; the command-side card can still draft cleanly under Shape 2/Shape 1 with the paired-cvar See-also pointing at the future-batch entity name.

6. **`qlag`/`qpoint` Shape 11b composition pending**. Per Spectator chat batch open follow-up: qizmo's q* family (qlag/qenemy/qpoint) exists as L1 entities but the Shape 11b recast was deferred. This batch is the moment to apply Shape 11b -- but `qenemy` is NOT in this batch's scope (likely in a different category). So qlag/qpoint get partial Shape 11b application; the missing qenemy is the cross-batch dependency. Sub-agent should: classify under Shape 11b, cross-link to qenemy (future-batch entity name), cross-link to qizmo (Shape 10 help-printer, drafted in session 3).

7. **`commands` is shape-less introspective lister** -- DO NOT classify as Shape 10. Per shape-catalog disambiguation section. The siblings it lists are dynamic (per-caller filtered by class/permission/match-state), not a hardcoded family roster.

8. **Cross-card discipline for admin command family**: with 25 admin commands of varying scope, cross-card synthesis should check:
   - Consistent Headliner format across admin commands ("Admin command that <verb>s <object>")
   - Consistent See-also patterns (link to k_admins / k_admincode as core admin-system entities)
   - Permission asymmetry across ban (CF_REDIRECT) vs admin core (CF_BOTH_ADMIN) vs vote-response y/n (CF_PLAYER?)
   - Halt-on-novelty if any admin command surfaces a sub-pattern not yet in the catalog (e.g. timed-admin commands, undo-able admin commands)

9. **Possible park triggers to watch for**:
   - `socd` (SOCD bot detection?) -- if source is unusual mechanism, may park trigger 4
   - `dumpent` (entity dumper) -- debug/diagnostic command; verify if it's purely state-printer (shape-less) or has side effects
   - `speed` (admin speed mod?) -- verify what it actually does at source
   - `dropitem` (admin force-drop) -- may cross-reference player-side item entities

---

## Skill invocation

```
Skill(
  skill="ktx-l1-batch-dispatcher",
  args="category=\"Admin & permissions\" batch_date=<YYYY-MM-DD> anchor_version=v1.36-1633-g67253dc chunk_size=10"
)
```

Adjust `batch_date` to today.

---

## When in doubt

- **Anchor drift**: abort, ask operator.
- **Novelty trigger 1/4**: halt batch, return candidate-shape signature, ask operator. Admin & permissions has Shape 11b composition pending (qlag/qpoint) + possible unusual mechanisms (socd, dumpent, speed); genuine novelty is plausible.
- **chunk_size=10 hits context exhaustion**: drop the affected chunk to chunk_size=8 and document the threshold in the HANDOVER calibration notes.
- **Permission CF flag verification fails per entity** (e.g. CF flag present but unusual combination): source-verify before assigning Permission line. Don't pattern-match against the F1 audit residue from prior batches -- this category contains many legitimately admin-only entities.
- **`k_fb_admin_only` not in catalog scope**: halt the batch, surface to operator -- this cvar is referenced by all 78 Frogbot cards; needs canonical drafting before Frogbot apply pass.
- **Cross-batch dependency entities (chunk D)**: if paired cvar is not yet drafted, draft the command-side card with the paired-cvar name in See-also; note in card Notes that "paired cvar pending in <future-batch-name>".
- **Cross-card finding seems wrong**: park as a follow-up note in the consistency section rather than asserting -- the cross-card pass is read-across-drafts, not re-verification of source.
- **Anything else unclear**: read the dispatcher SKILL.md "When unsure, halt" rule. Halting + asking is always preferable to force-fitting.

---

## After ship

Update this parking doc -- delete it if the batch shipped cleanly, or amend with calibration findings if chunk_size=10 surfaced new constraints for the smaller-batch case. Add a HANDOVER entry per the dispatcher file-formats.md template.

If chunk_size=10 holds cleanly for this smaller batch (37 vs Frogbot's 78), the next batch can either: (a) stay at chunk_size=10 for consistency (Match flow, Demo & spectator), or (b) try chunk_size=12 for the larger remaining categories (Match flow 71, Demo & spectator 69, Gameplay rules 69). The dispatcher's per-category context-budget profile is now well-validated up to 78 entities at chunk_size=10.

Remaining categories after Admin & permissions (291 entities total across 6 categories): Demo & spectator (69), Gameplay rules (69), Internal state (19), Match flow (71), Player communication (18), Race (45).
