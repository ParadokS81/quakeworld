# Handoff -- ktx-l1-rewrite Mode-scoped knobs batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-26
**Drafted by**: Mode selection batch ship session (commits `828b0e03` Mode selection + `6e3064f3` F1 audit correction)
**For**: fresh terminal dispatching the next ktx-l1-rewrite batch
**Target**: Mode-scoped knobs category (66 cards) -- recommended chunk_size=8 (8 chunks of 8 + 1 chunk of 2, or 9 chunks of ~7-8)
**Sized**: ~2 hours wall-clock (8-9 parallel sub-agents + cross-card synthesis + commit). Larger than prior batches; cross-card synthesis pass will be denser (12-18 findings expected) due to high cross-batch coupling.

---

## Where things are

The chunked-mode pattern is **doubly validated**. Mode selection batch shipped chunk_size=7 cleanly 2026-05-26; no context-exhaustion warnings, no novelty halts. Next calibration target: **chunk_size=8** (the 66-entity Mode-scoped knobs category is the natural calibration vehicle).

**Cumulative ktx-l1-rewrite progress**: 5 batches shipped, 146 of 618 entities = ~24% drafted. Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**F1 audit correction landed 2026-05-26 (commit `6e3064f3`)**. The Mode selection batch's F1 cross-card finding (`Admin command` mislabeling pattern across CF_PLAYER | CF_SPC_ADMIN entities) triggered:
- Rear-view audit: 1 silent miss (`dmgfrags` in Scoring & stats batch) + 1 mixed case (`silence` in Spectator chat batch) -- both captured in HANDOVER.md as apply-pass corrections.
- Forward-fix: catalog Shape 1 command-side prose + universal-shape-v2.md Permission discipline both updated in `~/.claude/skills/ktx-l1-rewrite/references/`. Future Shape 1 batches inherit the corrected CF-flag-to-wording mapping. The next session's sub-agents read the updated references at skill-load time -- no extra action needed.

**Source-confirmed CF flag semantics** (`include/g_local.h:647-658`):
- `CF_PLAYER` (bit 0) = "command valid for players" (any player). NOT player-admin.
- `CF_SPECTATOR` (bit 1) = "command valid for specs".
- `CF_PLR_ADMIN` (bit 2) = "client is player, this command requires admin rights" (rare).
- `CF_SPC_ADMIN` (bit 3) = "client is spectator, this command requires admin rights".
- `CF_BOTH = CF_PLAYER | CF_SPECTATOR` (any player or spectator).
- `CF_BOTH_ADMIN = CF_PLR_ADMIN | CF_SPC_ADMIN` (truly admin-only).
- `CF_PLAYER | CF_SPC_ADMIN` = "any player or admin spectator" (NOT admin-only).

**Shape catalog state**: 14+ shapes locked. No new shapes expected for Mode-scoped knobs (cvar-heavy category; mostly Shape 1c / Shape 3 / Shape 1d completion). If a sub-agent surfaces trigger 1/4 novelty, halt the batch and report.

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 5 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries + the F1 audit followup. Especially the Mode selection entry (this batch's predecessor) and the F1 audit (catalog Permission-line discipline).
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- the 5 procedural detail files (pre-flight, pre-fetch, halt-on-novelty, cross-card-checks, file-formats).
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-mode-selection.md` -- the Mode selection batch (this batch's strongest cross-link target). Pay attention to: the Shape 1d triad references (tot / totmode -- this batch ships `k_tot_mode`), the Shape 1c cvar-half references (midair / totmode / lgcmode / fresh -- this batch ships the cvar halves), the Cross-card consistency notes section (especially F1 + F3).
5. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md` (Voting batch) -- this batch ships `k_ctf_hookstyle` which is the state cvar for the Shape 7b hook fan-out (`hook_smooth` / `hook_fast` / `hook_classic` / `hook_crhook`). Cross-link symmetrically.
6. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-scoring-stats.md` -- reference for the canonical-card pattern; this batch's `k_freshteams_*` family (~13 cards) likely uses it.
7. Skim the per-card skill references (sub-agents read these themselves, but the dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` (14+ shapes; Shape 1 command-side prose was corrected 2026-05-26)
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (Permission section has new CF-flag-to-wording table)
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`

---

## Critical rules (calibration + audit learnings to apply)

These came out of the Mode selection run + F1 audit. Apply them in this batch.

1. **chunk_size=8 for this batch.** 66 entities suggests 8 chunks of 8 + 1 chunk of 2 (or 9 chunks of ~7-8). The Mode selection run showed chunk_size=7 held cleanly with no context warnings; 8 is the next calibration step. If any chunk hits ~150k context usage warnings, drop that chunk to chunk_size=7 and document.
2. **Permission-line discipline (NEW, from F1 audit)**. The corrected Shape 1 command-side prose lives in `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` (Shape 1 section) + `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (Permission section -- CF-flag-to-wording table). Sub-agents read these on skill-load. Verify: any drafted_with_flag entries with Permission corrections in this batch should reference the updated discipline, not the prior "Admin command" framing.
3. **Halt on trigger 1/4, NOT on triggers 2/3.** Same as prior batches. Mature catalog means novelty halts are real signals. If a sub-agent surfaces trigger 1 (no-shape-match) or trigger 4 (sui-generis-mechanism), halt the whole batch and return the candidate-shape signature to the operator. Do NOT extend the catalog autonomously.
4. **Cross-card synthesis pass will be DENSER** (12-18 findings expected vs the 5-12 typical range). High cross-batch coupling to Mode selection (Shape 1c cvar halves, Shape 1d triad completion) + Voting (`k_ctf_hookstyle` state cvar) + Scoring & stats (`k_dmgfrags` cross-link) means the See-also threading + bidirectional checks will be a major portion of the pass.
5. **DISPATCHER OVERRIDE on sub-agent file-writes** (unchanged). Each sub-agent prompt MUST instruct: "DO NOT write per-batch files; return all section content INLINE in the final YAML report". The dispatcher writes the assembled drafts file atomically at Step 6.
6. **Stage explicit files only**. `git add HANDOVER.md <drafts-file>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit to verify staging.
7. **One commit per batch.** Use the dispatcher's commit message format. Append ` -- chunked-mode chunk_size=8` suffix for the calibration log.
8. **Apply-pass corrections from F1 audit** (informational -- these are operator concerns, not dispatcher concerns): `dmgfrags` in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-scoring-stats.md` needs Permission line + Headliner fix at apply-pass; `silence` in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-25.md` needs Headliner reframe. Don't re-draft these cards here; just be aware they're queued.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator whether to advance the anchor across all in-flight batches or wait.

Then read the 5 dispatcher references + 7 per-card references (NOTE: shape-catalog.md + universal-shape-v2.md have 2026-05-26 corrections) per "Reads required" above.

### Action 2: Pre-fetch the 66 Mode-scoped knobs entities

The catalog HTML is the recommended source (deterministic, no rate-limit):

```bash
# Mode-scoped knobs section is at HTML lines 11011-13014 (slice 11010-13014)
python3 -c "
import re, json, html
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 11010, 13014
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
" > /tmp/mode-scoped-knobs-entities.json
wc -l /tmp/mode-scoped-knobs-entities.json
```

The 66 entities organized by suggested sub-families (chunk these together for cross-card coherence):

**Sub-family A: CTF rune system (~7)** -- canonical-card pattern likely applies to the 4 `k_ctf_rune_power_*` siblings
- `k_ctf_runes`, `k_ctf_rune_bounce`, `k_ctf_rune_power_hst`, `k_ctf_rune_power_res`, `k_ctf_rune_power_rgn`, `k_ctf_rune_power_str`, `norunes`

**Sub-family B: CTF gameplay knobs (~10)** -- mixed shapes; some Shape 1, some Shape 3
- `k_ctf_based_spawn`, `ctfbasedspawn`, `k_ctf_custom_models`, `k_ctf_ga`, `k_ctf_hook`, `k_ctf_hookstyle`, `k_ctf_hurt_items`, `mctf`, `nohook`, `noweapon`

**Sub-family C: Freshteams main + sub-knobs (~17)** -- BIG family; likely 2-3 sub-chunks. Canonical-card pattern likely applies to the 4 `k_freshteams_pack_*` + 6 `k_freshteams_sweep_*_ammo` clusters.
- Main: `k_freshteams`, `freshguns`, `freshpacks`, `freshtime`, `k_freshteams_weapon_time`, `k_freshteams_fast_ammo`, `k_freshteams_limit_packs`, `k_freshteams_limit_sweep_ammo`
- Pack ammo (4): `k_freshteams_pack_cells`, `k_freshteams_pack_nails`, `k_freshteams_pack_rockets`, `k_freshteams_pack_shells`
- Sweep ammo (6): `k_freshteams_sweep_gl_ammo`, `k_freshteams_sweep_lg_ammo`, `k_freshteams_sweep_ng_ammo`, `k_freshteams_sweep_rl_ammo`, `k_freshteams_sweep_sng_ammo`, `k_freshteams_sweep_ssg_ammo`

**Sub-family D: Mode-modifier cvars + their toggles (~13)** -- Shape 1c cvar halves + paired Shape 1c command halves
- `k_midair`, `k_midair_minheight`, `midair_minheight` -- midair family
- `k_instagib`, `instagib`, `instagib_coilgun_kickback`, `k_instagib_custom_models` -- instagib family
- `k_lgcmode` -- lgcmode cvar (toggle command in Mode selection batch)
- `k_tot_mode` -- ToT state cvar (Shape 1d triad completion; tot + totmode in Mode selection batch)
- `k_rocketarena`, `arena` -- rocket arena family
- `k_yawnmode` -- yawn mode (Shape 3 most likely)

**Sub-family E: Hoonymode + Clan Arena rounds (~6)**
- `k_hoonymode`, `k_hoonyrounds`, `roundsdown`, `roundsup` -- hoonymode rounds
- `k_clan_arena_rounds`, `k_clan_arena_max_respawns` -- CA rounds (referenced by carena + wipeout in Mode selection)

**Sub-family F: DMM4 modifiers (~5)**
- `dmm4_invinc_time`, `k_dmm4_gren_mode`, `gren_mode`, `spawn666time`, `k_disallow_weapons`

**Sub-family G: Misc gameplay knobs (~8)**
- `k_cg_kb`, `k_nosweep`, `k_teleport_cap`, `teleportcap`, `ra_pos`, `noga`, `no_gl`, `no_lg`

That's ~66 entities. Sub-family chunking (preferred):
- Chunk 1 (8): Sub-family A (CTF rune system, 7) + `noweapon` from B (= 8)
- Chunk 2 (8): Sub-family B remaining 9 minus `noweapon` = 8 (`k_ctf_based_spawn`, `ctfbasedspawn`, `k_ctf_custom_models`, `k_ctf_ga`, `k_ctf_hook`, `k_ctf_hookstyle`, `k_ctf_hurt_items`, `mctf`)
- Chunk 3 (8): Freshteams main 8
- Chunk 4 (6 or paired-with-3): Freshteams pack ammo 4 + 4 others (consider folding into a sweep chunk)
- Chunk 5 (6): Freshteams sweep ammo 6
- Chunk 6 (8): Sub-family D part 1 -- midair family + instagib family = 7, plus `nohook` from B if not yet placed = 8
- Chunk 7 (5): Sub-family D part 2 -- `k_lgcmode`, `k_tot_mode`, `k_rocketarena`, `arena`, `k_yawnmode`
- Chunk 8 (6): Sub-family E -- hoonymode + CA rounds
- Chunk 9 (5+8): Sub-families F + G

Adjust sizes empirically. Don't blindly arithmetic-divide; family coherence matters more.

### Action 3: Dispatch 8-9 sub-agents in parallel (or in 2 waves if context budget concern)

Use the Agent tool, subagent_type=`general-purpose`, model=`sonnet`. Each sub-agent prompt follows the chunk-prompt template used in Mode selection (see commits `828b0e03` for the structure -- Skill loading / Entity inputs reference / DISPATCHER OVERRIDE / Output format YAML / Cross-entity discipline).

If 8-9 parallel sub-agents feels risky for the dispatcher's own context budget, dispatch in 2 waves of 4-5 each.

After all sub-agents return:
- Aggregate verdicts.
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue).
- Cross-card synthesis (12-18 findings expected for 66 cards with high cross-batch coupling).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>-mode-scoped-knobs.md`.
- Append HANDOVER followup entry mirroring the Mode selection entry shape.
- Commit per the message format.

---

## Watch-outs for Mode-scoped knobs

1. **Shape 1d triad completion via `k_tot_mode`** -- the Mode selection batch shipped `tot` + `totmode` and flagged in F3 that the state cvar `k_tot_mode` lives in this category. When drafting `k_tot_mode`, complete the triad: See-also must reference both `tot` (preset half) and `totmode` (toggle half). Pattern: "Whether ToT mode is currently active. Set by the `tot` preset bundle or toggled by `totmode`."

2. **Shape 1c cvar halves complete with their toggle halves from Mode selection batch** -- `k_midair` (cvar) + `midair` (toggle from Mode selection); `k_instagib` (cvar) + `instagib` (toggle in THIS batch as it appears in the entity list); `k_lgcmode` (cvar) + `lgcmode` (toggle from Mode selection); `k_rocketarena` (cvar) + `arena` (toggle in THIS batch); `k_freshteams` (cvar) + `fresh` (toggle from Mode selection). Standard Shape 1c cvar-side: value enum (0/1), Default, Prerequisites = base mode (dmm4 / dmm1 / etc), Permission "server config, or via '<cmd>' in-game" (NOT "admin command" per F1 audit), Example, See-also -> paired toggle + base mode.

3. **`k_ctf_hookstyle` is the state cvar for the Shape 7b hook fan-out from Voting batch** -- `hook_smooth` / `hook_fast` / `hook_classic` / `hook_crhook` were all drafted in the Voting batch (2026-05-26 commit). The state cvar holds the enum value (1-4) that maps to which hook style is active. See-also must reference all 4 vote commands + the threshold cvar `k_vp_hookstyle`. Cross-batch synthesis: the Voting batch's canonical-card discipline made `hook_smooth` canonical and the other 3 reference cards; this card pulls them all together.

4. **`k_dmgfrags` cross-batch link** -- already shipped in Scoring & stats batch (with the F1-audit-flagged Permission correction queued). If this batch ships `k_dmgfrags` again (it shouldn't; verify against `/tmp/mode-scoped-knobs-entities.json` first), defer. Otherwise just cross-link in See-also.

5. **Freshteams family canonical-card pattern** -- the `k_freshteams_pack_*` (4 siblings) and `k_freshteams_sweep_*_ammo` (6 siblings) clusters are near-identical sibling families. Canonical-card pattern should apply: one canonical card with full description + N-1 reference cards. Verify per cluster (cells/nails/rockets/shells may have meaningful differences if ammo limits differ; ditto for sweep ammos).

6. **`k_clan_arena_rounds` + `k_clan_arena_max_respawns` cross-batch links** -- referenced by `carena` (Mode selection) and `wipeout` (Mode selection) bundles. Cross-link in See-also; the cvars likely Shape 3 (set-once in config, no paired toggle).

7. **`arena` toggle as Shape 1c canonical example** -- per shape-catalog.md, `arena` is the canonical Shape 1c example (mode-precondition = duel/1on1). When drafting `arena` here, refer to the canonical example pattern; cross-link to `k_rocketarena` (cvar) and the prerequisite mode.

8. **`gren_mode` + `k_dmm4_gren_mode` likely Shape 1c pair** -- DMM4-only grenade mode modifier. Same pattern as midair/instagib/lgcmode/tot Shape 1c family. Verify against source.

9. **DMM4 modifier mutual exclusions** -- midair, instagib, LGC, ToT, dmm4_gren_mode all require dmm4 AND are mutually exclusive with each other (per Mode selection batch findings -- enabling one forces others off). The cvar-side cards should surface this mutual-exclusion network in See-also (or defer to an L3 concept note follow-up if too dense).

10. **Permission discipline (NEW, F1 audit)** -- ALL toggle commands in this batch (`arena`, `freshguns`, `freshpacks`, `freshtime`, `gren_mode`, `instagib`, `instagib_coilgun_kickback`, `mctf`, `midair_minheight`, `nohook`, `no_gl`, `no_lg`, `noga`, `norunes`, `noweapon`, `ra_pos`, `roundsdown`, `roundsup`, `spawn666time`, `teleportcap`) must use the corrected Permission discipline (CF-flag-to-wording table in universal-shape-v2.md). Do NOT use "Admin command" framing unless source flag is `CF_BOTH_ADMIN`. Verify each command's CF flag at source before assigning Permission line.

---

## Skill invocation

```
Skill(
  skill="ktx-l1-batch-dispatcher",
  args="category=\"Mode-scoped knobs\" batch_date=<YYYY-MM-DD> anchor_version=v1.36-1633-g67253dc chunk_size=8"
)
```

Adjust `batch_date` to today.

---

## When in doubt

- **Anchor drift**: abort, ask operator.
- **Novelty trigger 1/4**: halt batch, return candidate-shape signature, ask operator. Mode-scoped knobs is cvar-heavy; most entities should fit Shape 1/1c/1d/3. Genuine novelty is unlikely but possible (e.g. ra_pos / spawn666time may have unusual mechanisms).
- **Chunk crashes mid-process**: partial chunk results are lost (no file written on crash); just re-dispatch that single chunk with the same entity list.
- **chunk_size=8 hits context exhaustion**: drop the affected chunk to chunk_size=7 and document the threshold in the HANDOVER calibration notes.
- **Cross-card finding seems wrong**: park as a follow-up note in the consistency section rather than asserting -- the cross-card pass is read-across-drafts, not re-verification of source.
- **Permission line uncertainty**: grep the source CF flag (`grep -E '^\s*\{\s*"<cmd>"' /home/paradoks/projects/quakeworld/research/repos/ktx/src/commands.c`) and apply the universal-shape-v2.md CF-flag-to-wording table. NO "Admin command" framing for CF_PLAYER|CF_SPC_ADMIN.
- **Anything else unclear**: read the dispatcher SKILL.md "When unsure, halt" rule. Halting + asking is always preferable to force-fitting.

---

## Cross-batch state-printer family (informational)

The state-printer cross-batch family is well-established (Server config: `fpslist`, `rules`; Scoring & stats: `scores`, `stats`, `effi`, `laststats`, `lastscores`, `lastscoresktx`). Mode-scoped knobs is unlikely to add state-printers (cvar-heavy category) but if any sub-family surfaces a help-printer pattern (Shape 10) or state-printer, cross-link symmetrically.

---

## After ship

Update this parking doc -- delete it if the batch shipped cleanly, or amend with calibration findings if chunk_size=8 surfaced new constraints. Add a HANDOVER entry per the dispatcher file-formats.md template.

If chunk_size=8 holds at safe context budget across all chunks, the next batch can consider chunk_size=10 for the Frogbot 78-entity category (Shape 8 subcommand dispatcher pattern; ~8 chunks of 10 is the calibration target). If 8 hits exhaustion in any chunk, document the per-category context-budget profile (Mode-scoped knobs may pull more source than Mode selection due to consumer-side reads across multiple .c files for each modifier).

---

## Optional: revisit `dmgfrags` + `silence` mid-batch?

The F1 audit corrections for prior batches are operator-driven apply-pass concerns -- NOT this dispatcher's job. Don't re-draft those cards. Just be aware they're queued and visible in HANDOVER.md.

If, while dispatching Mode-scoped knobs, a sub-agent surfaces NEW cards that should cross-link to `k_dmgfrags` (in Scoring & stats batch) or `k_spectalk` (in Spectator chat batch), surface in See-also with the corrected framing -- the apply-pass-author handles the prior-batch corrections separately.
