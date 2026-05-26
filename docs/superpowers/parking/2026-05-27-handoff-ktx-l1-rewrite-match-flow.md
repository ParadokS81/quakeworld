# Handoff -- ktx-l1-rewrite Match flow batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-27
**Drafted by**: Demo & spectator ship session (commit `c7c49ce3` + cleanup `51b73119`)
**For**: fresh terminal dispatching the Match flow ktx-l1-rewrite batch
**Target**: Match flow category (71 cards) -- recommended `chunk_size=9` (8 balanced chunks: 7 of 9 + 1 of 8). chunk_size=10 would force a wasteful 1-entity tail chunk; chunk_size=9 distributes evenly.
**Sized**: ~1.5-2 hours wall-clock. Lower canonical-card concentration than the prior batch (Demo & spectator was 40-of-69 canonical-card; this batch has at most ~6 in the time fan-out). Expect more per-card depth on average.

---

## Where things are

Chunked-mode pattern is **sextuply validated** (8 prior batches shipped):
- Scoring & stats: chunk_size=6 (19 cards)
- Mode selection: chunk_size=7 (28 cards)
- Mode-scoped knobs: chunk_size=8 (66 cards, first production halt-on-novelty)
- Frogbot: chunk_size=10 (78 cards)
- Admin & permissions: chunk_size=10 (37 cards, second production halt-on-novelty -- operator-accepted park)
- Demo & spectator: chunk_size=10 (69 cards, 0 parks, 0 novelty halts) -- predecessor batch

**Cumulative ktx-l1-rewrite progress**: 9 batches shipped, **392 of 633 KTX L1 entities = ~62% drafted**, **5 entities parked** (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting). Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Demo & spectator batch lessons** (commit `c7c49ce3`):
- chunk_size=10 sustained for 7 parallel chunks; no context exhaustion
- 0 parks, 0 novelty halts -- cleanest batch in the series
- Largest canonical-card application to date: 40 of 69 entities under fav1_add + 1fav_go canonicals; F11-style rejection (clamp/formula divergence) did NOT fire (slot-keyed family behaviorally uniform)
- Two handoff-hypothesis OVERRIDES via source-truth: `_k_nospecs` is a vote-result state container (not Shape 9b engine state-mirror as predecessor handoff guessed); trex family is internal movement-capture (not sui-generis as predecessor handoff guessed). **Handoff Rule 7 ("HYPOTHESES not contracts; trust source over handoff") worked as intended -- this handoff inherits the same discipline.**
- F1 audit (Permission mislabel pattern) -- 5th consecutive batch. NEW direction in this batch: `demomark` UNDER-states scope ("any player" but CF_BOTH). Prior batches' direction was OVER-state ("Admin command" with CF_PLAYER variants).
- 13 cross-card findings total: 8 actionable + 5 confirmed clean.

**THREE NEW SUB-AGENT-DISCIPLINE PROCEDURES** (locked-in for this batch's chunk prompts; bake into every chunk prompt template -- DO NOT skip):

1. **Verdict-marker internal-consistency check** -- Demo & spectator surfaced 2 cards (`1fav_go`, `next_pow`) where the sub-agent's YAML report, output marker, Status field, and Notes FLAG-presence diverged. Dispatcher had to repair markers. Sub-agent prompts must include a final-pass checklist: "before emitting your YAML report + writing /tmp output, verify that for EVERY entity in your chunk: (a) the `<!-- VERDICT: X -->` marker matches the `**Status**: X` line; (b) the marker/Status matches your YAML report's `verdict` field; (c) if verdict is `drafted_with_flag`, Notes contains at least one bullet starting with `FLAG:`; (d) if verdict is `drafted`, Notes contains NO bullet starting with `FLAG:` -- only `Verification:` or plain reasoning bullets."

2. **`FLAG:` prefix discipline** -- `next_pow` in Demo & spectator misused `FLAG:` as a structural reasoning marker (the note concluded "no flag needed" but kept the `FLAG:` prefix). The prefix is RESERVED for actionable factual-contradiction flags only. Sub-agent prompts must include: "Use `FLAG:` ONLY when the existing description (or your proposed draft) contradicts source on a localized factual point that the apply-pass-author must verify before applying. For spot-check reasoning that concluded clean (no contradiction), use `Verification:` or a plain bullet -- DO NOT use `FLAG:` as a 'I investigated this' marker."

3. **Draft-vs-verified-content sanity check (NEW class of bug -- watch-out, not full SKILL amendment yet)** -- `next_pow` in Demo & spectator had its proposed-draft Headliner + Effect bullet enumerate 3 powerups, while the same card's Notes verified source includes 4 (radsuit too). The draft regressed against the sub-agent's own verification. Per-card SKILL.md amendment deferred (battle-test risk on a 71-card batch); for now, sub-agent prompts must include: "Before emitting your proposed draft for entity E, verify that EVERY factual claim in the draft's Effect / Headliner / Prerequisites / Permission lines is supported by your Step 1.5 source-verified content or your Step 3 spot-check. If your draft drops, adds, or changes a factual claim relative to your verified content, EITHER fix the draft OR flag with `FLAG: draft-vs-verification-mismatch -- <what diverged>`. The most insidious version: dropping a value from an enumeration list (e.g. `next_pow` lost 'suit') -- check enumerations line-by-line."

**Shape catalog state**: 14+ shapes locked. Match flow is dominated by:
- Shape 3 (set-once cvars) -- match-state control cvars (k_count, k_exttime, k_overtime, k_prewar, k_idletime, k_freeze, etc.) likely 20-ish
- Shape 1 (cvar+paired toggle) -- toggleready, toggletracklist, toggleklist likely; check for paired cvars
- Shape 7a (election) -- captain + coach (cross-batch with k_vp_captain + k_vp_coach in Voting batch)
- Shape 7b (continuous toggle vote) -- rpickup + votemap (cross-batch with k_vp_rpickup, k_vp_map in Voting batch); break + forcebreak (cross-batch with k_vp_break)
- Shape 10 (curated-family help-printer) -- `options` is the head; markets ~16 match-setting commands across multiple categories (time/frags/dm/tp/drop*/spawn/speed/etc.); MANY of its siblings are in THIS batch (time5..time30 + fragsup/fragsdown + dm + sh_speed + pickspawn). **Options' Shape 10 sibling roster must be source-verified during options' draft -- the roster lives on the help-printer card.**
- Shape composition: 1c (mode-precondition) candidates: practice, prewar, ra_break — these may require specific match-states/modes
- **Canonical-card opportunity**: `time5`/`time10`/`time15`/`time20`/`time25`/`time30` -- 6-sibling fan-out of timelimit-setter commands. SOURCE-VERIFY behavioral identity at registration before applying canonical-card; pick `time10` or `time15` as canonical based on which is "default match length" convention. Per Demo & spectator's F5 finding, canonical-card application at scale is well-tested. **Apply Frogbot F11 / Demo F5 precedent: source-verify behavioral identity before classifying as canonical+reference. If the 6 time commands differ by anything beyond the integer value passed to a setter (e.g. different gating, different broadcast), draft as separate full cards.**
- **Mode-team-size presets**: `1on1`/`2on2`/`3on3`/`3on3on3`/`10on10` -- 5-sibling fan-out of usermode presets (likely DEF(UserMode) with X-on-X bundle). Per the Mode selection batch's F2 finding, mode preset commands stay shape-less (the bundle IS the description); these may benefit from a separate canonical-card application IF the bundles are identical-modulo-team-size. Source-verify.
- **Position commands**: `pos_angles`/`pos_move`/`pos_origin`/`pos_save`/`pos_show` -- 5-sibling pos_* family. Likely shape-less command actions OR Shape 6-like (stateful + multiple-action pair). Source-verify; canonical-card pattern only if near-identical.
- **Ready family**: `ready`/`slowready`/`toggleready`/`agree` -- 4 ready-state commands. Source-verify; likely Shape 1 (cvar+toggle on `k_sready`?) or shape-less or composition. `toggleready` is the toggle pattern; `agree` may be a Shape 7-ish (vote-readiness?) — source-verify carefully.

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 9 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries + the F1 audit followup + Frogbot remediation followup. **Especially the Demo & spectator entry (this batch's predecessor) at line 36** for: the 3 new sub-agent disciplines (verdict-consistency / FLAG: prefix / draft-vs-Notes sanity check); the F11 cross-batch See-also threading examples; the F8 `_k_nospecs` source-override precedent.
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- 5 procedural detail files.
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-demo-spectator.md` -- prior batch's `## Cross-card consistency notes` section (F1-F13). F1 (CF_BOTH under-state on demomark), F5 (canonical-card pattern at scale), F8 (`_k_nospecs` vote-result reclass), F10 (trex internal not sui-generis), F11 (cross-batch See-also threading) are all reusable context.
5. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md` -- the Voting batch's drafts for `break` / `forcebreak` / `rpickup` / `votemap` / `captain` / `coach` cross-references (this batch will reference these from the command side).
6. Per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 10 disambiguation for `options` family roster; Shape 7a/7b for captain/coach/rpickup/votemap/break; canonical-card pattern section for time*/pos_* families**.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (Permission CF-flag table -- expect F1 audit findings continuing).
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`.

---

## Critical rules

1. **chunk_size=9 recommended for this batch.** 71 entities → 7 chunks of 9 + 1 chunk of 8 = 71. chunk_size=10 would force a wasteful 1-entity tail chunk (front-matter overhead doesn't amortize for 1 card). If any chunk hits ~150k context warnings, drop that chunk to chunk_size=7.

2. **THE THREE NEW SUB-AGENT DISCIPLINES (Where things are #1-3 above)** must be baked into every chunk prompt's "After processing all entities" section + Cross-batch context briefing. Do NOT skip. The Demo & spectator batch needed mid-stream marker repairs because sub-agents emitted inconsistent verdict markers; this batch's chunk prompts should make consistency a final-pass checklist item.

3. **PERMISSION DISCIPLINE -- F1 audit continues at 5 batches and counting.** Verify CF flag per entity at registration in `src/commands.c`. The Permission-line CF-flag table in `universal-shape-v2.md` is load-bearing; do NOT pattern-match against "Admin command" prose in existing descriptions. Specifically watch for:
   - `CF_PLAYER` alone -- any player (spectators excluded)
   - `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator (NOT admin-only)
   - `CF_BOTH` (= `CF_PLAYER | CF_SPECTATOR`) -- any player or spectator (Demo's `demomark` case)
   - `CF_BOTH_ADMIN` -- admin only
   - `CF_SPECTATOR` alone -- any spectator
   - Match flow's `forcestart`, `forcebreak`, `forcebreak` likely admin-required; `ready`/`agree`/`toggleready` likely any-player; cross-batch threaded commands (captain/coach/rpickup/votemap/break) inherit shapes from Voting batch.

4. **Cross-batch threading dependencies** (the apply-pass-author resolves at apply time; sub-agents draft with paired-entity names in See-also):
   - `break` / `forcebreak` -- cross-batch with `k_vp_break` (Voting batch 2026-05-26 Shape 7b); See-also threading both directions.
   - `rpickup` -- cross-batch with `k_vp_rpickup` (Voting batch); rpickup also gates `swapall` (Voting note: rpickup percentage shared with swapall per `vote.c:252-253`).
   - `votemap` -- cross-batch with `k_vp_map` (Voting batch); shared with `cm` + `next_map` per multi-consumer pattern.
   - `captain` -- cross-batch with `k_vp_captain` (Voting batch Shape 7a election).
   - `coach` -- cross-batch with `k_vp_coach` (Voting batch Shape 7a election).
   - `toggletracklist` -- cross-batch with `k_allowtracklist` (Admin & permissions batch Shape 1 paired toggle).
   - `pause` -- cross-batch with `k_pause_without_matchtag` (THIS batch -- internal pair).
   - `options` (Shape 10 head) -- cross-references ~16 match-setting commands across categories; the sibling list lives ON options' card. Source-verify the hardcoded roster at the options handler in `src/commands.c`.

5. **`options` Shape 10 roster discipline**: per the Demo & spectator F5-equivalent precedent and the Scoring & stats batch findings, options' Shape 10 sibling list is HARDCODED in its `G_sprint` call. The roster needs source-verified inline enumeration in the Effect block. Many of options' siblings are drafted in THIS batch (time5..time30, fragsup, fragsdown, dm, sh_speed, pickspawn) -- ensure each sibling's See-also points BACK at options. Bidirectional cross-link discipline (per the Shape 10 companion-side rule).

6. **Canonical-card pattern candidates to source-verify**:
   - `time5` / `time10` / `time15` / `time20` / `time25` / `time30` -- 6-sibling timelimit-setter family. Canonical: `time10` or `time15` (whichever is the "default match length" convention -- if both are equally weighted, pick `time10`). Source-verify at registration: all 6 likely use a single DEF or handler that reads command name to derive value, OR 6 separate registrations all calling the same setter. If behaviorally uniform (only the value differs), canonical-card pattern applies. If any has a gate, broadcast, or side-effect difference, draft each as a full card.
   - `1on1` / `2on2` / `3on3` / `3on3on3` / `10on10` -- 5-sibling mode-team-size preset family. Per Mode selection batch's F2: mode presets stay shape-less (bundle IS the description). Canonical-card pattern applies ONLY if the team-size presets share an identical bundle modulo team-count constant (likely YES for the 1on1/2on2/3on3 base, but `3on3on3` might be 3-team-FFA variant -- source-verify).
   - `pos_angles` / `pos_move` / `pos_origin` / `pos_save` / `pos_show` -- 5-sibling pos_* family. Source-verify -- these likely have meaningfully different behaviors (set angles vs set origin vs print state) and may NOT qualify for canonical-card. Per the Frogbot F11 precedent + Demo F5 mandate: source-verify behavioral identity before classifying.

7. **`dm` is a dual-purpose state/setter command** (per the Shape catalog's "Distinguish from these neighbors that are NOT Shape 10" section). With args = mode setter; without args = state display. NOT pure Shape 10. Classify as shape-less (dual-purpose state/setter pattern). Same disambiguation as Admin & permissions batch's `commands` (introspective lister).

8. **DISPATCHER OVERRIDE on sub-agent file-writes** (unchanged). Each sub-agent prompt MUST instruct: "DO NOT write per-batch files; return YAML metadata only; write your chunk's assembled section content to `/tmp/chunk_<X>_output.md` in one Write call." Dispatcher assembles atomically at Step 6.

9. **HANDOFF-DOC CLAIMS ARE HYPOTHESES, NOT CONTRACTS** (Rule 7 from prior handoff, reinforced after Demo & spectator's two source-overrides). If a sub-agent's source check contradicts a handoff-doc claim (e.g. "this is Shape 3" turns out to be Shape 4 with a gate; "near-identical sibling" turns out to have a behavior diff), TRUST SOURCE. Flag in YAML report; cross-card pass surfaces as a finding. The Demo & spectator batch had this work twice (`_k_nospecs`, trex family) -- the discipline is load-bearing.

10. **Halt-on-novelty likely candidates this batch**:
    - **Shape 7-composition novelty**: the elect/ready/agree/captain/coach/rpickup commands all have voting-style threshold + ballot mechanics, but `ready`/`slowready` may be different (synchronization-only with no threshold cvar?). If the ready/agree mechanism is genuinely sui-generis from elect-vote patterns, trigger 1 or 4 may fire.
    - **Match-state composition novelty**: cvars like `k_lockmode` (lock mode bitmask?) or `k_freeze` (freeze-state cvar) may surface novel shapes if they have unusual composition with other cvars. Halt on novelty if so.
    - **fix-3 watchout**: any chunk with an enumeration in Effect (time fan-out values, pos_* state list, options sibling roster) -- the sub-agent MUST verify enumerations line-by-line against source. The `next_pow` regression class.

11. **Stage explicit files only**. `git add HANDOVER.md <drafts-file> <park-file-if-any>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.

12. **Commit message format**: `docs(ktx-l1-rewrite): SHIPPED Match flow category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=9`.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator.

Then read the 5 dispatcher references + per-card references per "Reads required" above.

### Action 2: Pre-fetch the 71 Match flow entities

```bash
python3 -c "
import re, json, html
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 8508, 10575
card_pattern = re.compile(r'<div class=\"card\" data-name=\"([^\"]+)\"')
card_starts = []
for i, line in enumerate(lines[start-1:end-1], start=start):
    m = card_pattern.search(line)
    if m: card_starts.append((m.group(1), i))
card_starts.append(('__END__', end))
results = []
for idx in range(len(card_starts) - 1):
    name, sl = card_starts[idx]
    nsl = card_starts[idx + 1][1]
    ct = ''.join(lines[sl-1:nsl-1])
    badge = re.search(r'<span class=\"badge\">([^<]+)</span>', ct)
    src = re.search(r'source: <code>([^<]+)</code>', ct)
    desc = re.search(r'<pre class=\"description\">(.*?)</pre>', ct, re.DOTALL)
    results.append({'entity_name': name, 'entity_type': badge.group(1) if badge else None, 'existing_description': html.unescape(desc.group(1).strip()) if desc else None, 'source_ref': src.group(1) if src else None, 'catalog_line': sl})
with open('/tmp/match-flow-entities.json', 'w') as f: json.dump(results, f, indent=2)
print(f'Total: {len(results)}')
"
```

Expected: 71 entities, ~20 cvars + ~51 commands. **Verified at handoff-draft time.**

**Suggested chunk plan** (8 chunks of 9-8; canonical-card guidance embedded):

- **Chunk A (9): match-control cvars (set 1)** -- `k_auto_xonx`, `k_count`, `k_exclusive`, `k_exttime`, `k_freeze`, `k_idletime`, `k_membercount`, `k_overtime`, `k_prewar`. Mostly Shape 3 set-once cvars; verify any with paired toggle commands (likely none).
- **Chunk B (9): lock + matchless + sready cvars** -- `k_lockmap`, `k_lockmax`, `k_lockmin`, `k_lockmode`, `k_matchless`, `k_matchless_countdown`, `k_matchless_max_idle_time`, `k_pause_without_matchtag`, `k_sready`. Mostly Shape 3; `k_pause_without_matchtag` is THIS batch's internal pair with `pause` command (Chunk C). `k_lockmode` may be bitmask (Shape 11a candidate if it has per-bit toggle commands -- likely not).
- **Chunk C (9): private + practice + overtime + match-control** -- `k_privategame`, `k_privategame_default`, `srv_practice_mode`, `practice`, `lock_practice`, `prewar`, `overtime`, `overtimeup`, `pause`. Mixed cvars + commands. `k_privategame` likely Shape 7b (cross-batch with `voteprivate` from Voting); `practice` / `prewar` may be mode-state commands (Shape 1c or shape-less).
- **Chunk D (9): match-control commands + ready family** -- `break`, `forcebreak`, `ra_break`, `forcestart`, `latejoin`, `agree`, `ready`, `slowready`, `toggleready`. Mix of cross-batch threaded (`break`/`forcebreak` with `k_vp_break`; `latejoin` with `k_vp_latejoin` via election type if present) + ready-state commands. `toggleready` likely Shape 1 paired with `k_sready` (Chunk B).
- **Chunk E (9): time fan-out + timedown/up paired** -- `time5`, `time10`, `time15`, `time20`, `time25`, `time30`, `timedown`, `timeup`, `timedown1`. **CANONICAL-CARD MANDATE**: `time10` or `time15` is canonical for the time5..time30 family (6 entities). Other 5 are reference cards. Source-verify behavioral identity at registration (likely all set `timelimit` to the corresponding integer value). `timedown`/`timeup`/`timedown1` may be a separate Shape 1c pair (timer control during pre-match countdown).
- **Chunk F (9): mixed -- timeup1 + score + dm + status + options** -- `timeup1`, `fragsup`, `fragsdown`, `dm`, `list`, `who`, `whonot`, `options`, `sh_speed`. `dm` = shape-less dual-purpose (per Rule 7). `options` = Shape 10 with hardcoded roster (must source-verify the sibling list at handler). `list`/`who`/`whonot` likely shape-less state-printers. `sh_speed` may be Shape 1 (paired with k_sh_speed?) — verify.
- **Chunk G (9): mode-team-size presets + pos_* commands (set 1)** -- `1on1`, `2on2`, `3on3`, `3on3on3`, `10on10`, `pos_angles`, `pos_move`, `pos_origin`, `pos_save`. **CANONICAL-CARD CANDIDATE** for 1on1/2on2/3on3/10on10 IF bundles share identical structure modulo team-count constant (source-verify; `3on3on3` may be 3-team-FFA variant and NOT qualify for canonical-card collapse). Per Mode selection batch's F2: presets stay shape-less regardless. pos_* family: source-verify behavioral identity (likely meaningful differences; canonical-card probably NOT applicable -- per Frogbot F11 precedent).
- **Chunk H (8): pos_show + remaining + cross-batch threaded** -- `pos_show`, `pickspawn`, `captain`, `coach`, `votemap`, `rpickup`, `toggleklist`, `toggletracklist`. **All cross-batch threaded**: captain/coach with k_vp_captain/k_vp_coach (Voting batch Shape 7a); votemap with k_vp_map (Voting); rpickup with k_vp_rpickup (Voting); toggleklist (may be Shape 1 with k_allowklist? -- verify); toggletracklist with k_allowtracklist (Admin & permissions batch Shape 1). Pickspawn likely shape-less command action. **pos_show** completes the pos_* family from Chunk G.

Adjust empirically based on the pre-fetched JSON. The chunk plan is a suggestion; the dispatcher's own pre-fetch + skim can re-balance.

### Action 3: Dispatch 8 sub-agents in parallel

Use the Agent tool, `subagent_type=general-purpose`, `model=sonnet`. Each sub-agent prompt follows the chunk-prompt template (see commit `c7c49ce3`'s sub-agent prompts for the latest structure -- they incorporate the 3 new disciplines). Each prompt includes:
- Skill loading instructions (7 files: SKILL.md + 6 references)
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE (return YAML, write to /tmp)
- **THE 3 NEW SUB-AGENT DISCIPLINES** (verdict consistency / FLAG: prefix / draft-vs-Notes sanity check -- verbatim from Where things are #1-3 above)
- Cross-batch context briefing (THIS BATCH: options Shape 10 roster discipline; time fan-out canonical-card mandate; mode-team-size canonical-card candidate; cross-batch threading for break/captain/coach/rpickup/votemap/toggletracklist; F1 audit continues with all CF flag variants)
- Permission-line discipline reminder (with the full CF flag table)
- **For chunk E: explicit time fan-out canonical-card mandate** -- time10 or time15 canonical for time5..time30.
- **For chunk G: explicit conditional canonical-card** -- mode-team-size IF source-verified identical-modulo-team-count.
- Output format spec

After all sub-agents return:
- Aggregate verdicts.
- **Run a marker/Status/YAML consistency scan** before assembly (regression-test the Demo & spectator findings -- chunk prompts should prevent these but verify).
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue).
- Cross-card synthesis (expect 10-15 findings; F1 audit residue expected on multiple commands; options Shape 10 sibling-list cross-reference is the dominant cross-card thread).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-match-flow.md` (sub-grouping by sub-category like Demo & spectator did is recommended).
- Park file if applicable.
- Append HANDOVER followup entry mirroring the Demo & spectator entry shape.
- Commit per the message format.

---

## Watch-outs for Match flow

1. **`options` Shape 10 sibling-roster source-verification**. Per the Scoring & stats batch's finding: options markets 16 match-setting commands across multiple categories. The hardcoded roster lives in the options handler's `G_sprint` call. The recast must enumerate the roster inline in Effect. Several of options' siblings are in THIS batch (time5..time30 = 6; fragsup/fragsdown = 2; dm = 1; sh_speed = 1; pickspawn = 1 = 11 of 16 siblings here); the remaining 5 are in other categories (likely tp/drop*/speed -- find via source). Bidirectional See-also: each sibling's card references options as their family-head.

2. **Time fan-out canonical-card application** (Chunk E). The 6 time-N commands (time5..time30) are the most likely canonical-card candidate this batch. **Source-verify behavioral identity at registration** -- check if all 6 register through a single DEF that derives the value from command name, OR 6 separate registrations all calling the same setter with different constants. If behavioral identity holds, apply canonical-card (time10 or time15 canonical; 5 reference cards). If any has a unique gate / broadcast / side effect, draft as separate cards. **Demo & spectator's F5 precedent: source-verify before applying.**

3. **Mode-team-size canonical-card candidate** (Chunk G). 1on1/2on2/3on3/10on10 may share an identical bundle structure modulo team-count constant. `3on3on3` is likely a 3-team-FFA variant (different from 1on1's 1v1 or 3on3's 3v3 team-deathmatch); source-verify whether it qualifies. Per Mode selection batch's F2: mode presets stay shape-less regardless of canonical-card -- the bundle IS the description.

4. **Position commands NOT a canonical-card application** (Chunk G/H). pos_angles/pos_move/pos_origin/pos_save/pos_show likely have meaningfully different behaviors (set angles vs set origin vs print state). Per Frogbot F11 precedent: source-verify behavioral identity before canonical-card. Probably draft each as full cards with cross-references.

5. **Ready / agree composition** (Chunk D). `ready` / `slowready` / `toggleready` / `agree` -- 4 ready-state commands. Source-verify the relationship: `toggleready` likely Shape 1 paired with `k_sready` (Chunk B); `ready` may be a direct-set variant (Shape 5 escape); `slowready` may be a confirm-delay variant; `agree` may be a Shape 7a-ish (multi-player vote/threshold) or just a synonym. If the mechanism is novel (not Shape 1/Shape 7/Shape 6), trigger 1 may fire -- halt and surface candidate-shape signature.

6. **Cross-batch threading is dense** (Chunks D + H). 7-8 commands in this batch reference entities from prior batches (Voting, Admin & permissions). See-also wiring matters; verify each cross-reference's existence in prior drafts files. Per Demo & spectator's F11: apply-pass-author validates at apply-time, but sub-agents should still ground each See-also in the prior batch's drafts file.

7. **`forcebreak` / `ra_break` are admin-override variants of `break`** (Chunk D). Likely Shape composition: each gates differently (forcebreak = CF_BOTH_ADMIN; break = CF_BOTH with vote mechanism; ra_break = race-mode specific variant). Source-verify each. May surface a NEW Shape composition (admin-override of vote) but more likely fits within existing Shape 4 + Shape 7b composition.

8. **Match-state cvars may surface a new shape** (Chunks A-C). `k_lockmode` (bitmask?), `k_matchless` (master matchless toggle), `k_freeze` (freeze-state) -- if any have unusual composition (multiple consumers, side-channel writes, novel state-mirror pattern), trigger 1 or 4 may fire. The handoff Rule 9 discipline: TRUST SOURCE over the handoff's "Shape 3" hypothesis.

9. **`pickspawn` shape-less likely** (Chunk H). Pick-a-spawnpoint command; standalone state-changer. Source-verify; shape-less is the default classification.

10. **Possible park triggers to watch for**:
    - **Ready family novel-shape temptation**: if ready/slowready/agree have a synchronization-based mechanism without threshold/election, trigger 1 may fire. Halt and surface to operator -- canonical-card pattern would NOT handle a non-vote synchronization mechanism (that's the operator's call to extend the catalog).
    - **Pos_* family if sui-generis**: if the position commands have unusual mechanisms (e.g. side-channel cvar writes to `_k_pos*` engine-state-mirror cvars), trigger 4 may fire. Source-verify carefully.

---

## Skill invocation

```
Skill(
  skill="ktx-l1-batch-dispatcher",
  args="category=\"Match flow\" batch_date=<YYYY-MM-DD> anchor_version=v1.36-1633-g67253dc chunk_size=9"
)
```

Adjust `batch_date` to today.

---

## When in doubt

- **Anchor drift**: abort, ask operator.
- **Novelty trigger 1/4**: halt batch, return candidate-shape signature, ask operator. The ready/agree family is the most likely false-trigger source if it's just shape-less; surface the source pattern for operator review.
- **chunk_size=9 hits context exhaustion on any chunk**: drop that chunk to chunk_size=7 and document the threshold.
- **Canonical-card application unclear** (time fan-out has per-N behavioral differences): treat as separate cards per Frogbot F11 / Demo F5 precedent. Don't force canonical-card if siblings differ.
- **Cross-batch threading dependency entities**: draft with paired-entity name in See-also; note in card Notes that the paired cvar lives in `<prior-batch-name>`. Apply-pass-author validates symmetric wiring.
- **Cross-card finding seems wrong**: park as a follow-up note in the consistency section rather than asserting -- the cross-card pass is read-across-drafts, not re-verification of source.
- **Marker / Status / YAML inconsistency from a sub-agent** (per Demo & spectator's 1fav_go + next_pow precedent): repair the marker BEFORE assembly. Surface in cross-card findings as a sub-agent-discipline observation (whether the 3 new disciplines prevented similar bugs).
- **Anything else unclear**: read the dispatcher SKILL.md "When unsure, halt" rule. Halting + asking is always preferable to force-fitting.

---

## After ship

Delete this parking doc if the batch shipped cleanly (operator-accepted park counts as clean per the Mode-scoped knobs + Admin & permissions precedent). Append a HANDOVER entry per the dispatcher file-formats.md template.

If chunk_size=9 holds cleanly on 71 entities, the next batch can stay at chunk_size=9 for Race (45 entities, 5 chunks) OR drop to chunk_size=10 for Gameplay rules (69 entities, 7 chunks) if those categories show similar density.

**If the 3 new sub-agent disciplines (verdict consistency / FLAG: prefix / draft-vs-Notes sanity check) prevent the Demo & spectator-class bugs cleanly, propose a `~/.claude/skills/ktx-l1-rewrite/SKILL.md` Step 5 amendment for the draft-vs-verified-content sanity check** (this is the deeper per-card SKILL change that was deferred from Demo & spectator; battle-test on this batch first).

Remaining categories after Match flow (151 entities total across 4 categories): Gameplay rules (69), Internal state (19), Player communication (18), Race (45).
