# Handoff -- ktx-l1-rewrite Demo & spectator batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-26
**Drafted by**: Admin & permissions ship session (commit `59c1bd1b` + cleanup `95305166`)
**For**: fresh terminal dispatching the Demo & spectator ktx-l1-rewrite batch
**Target**: Demo & spectator category (69 cards) -- recommended chunk_size=10 (7 chunks: 6 of 10 + 1 of 9)
**Sized**: ~1.5-2 hours wall-clock (7 parallel sub-agents + cross-card synthesis + commit). The fav family canonical-card pattern compresses ~40 of the 69 cards into reference-card form -- per-card depth is low for those; chunk_size=10 holds comfortably.

---

## Where things are

Chunked-mode pattern is **quintuply validated**:
- Scoring & stats: chunk_size=6 (19 cards)
- Mode selection: chunk_size=7 (28 cards)
- Mode-scoped knobs: chunk_size=8 (66 cards, first production halt-on-novelty)
- Frogbot: chunk_size=10 (78 cards)
- Admin & permissions: chunk_size=10 (37 cards, second production halt-on-novelty -- operator-accepted park)

**Cumulative ktx-l1-rewrite progress**: 8 batches shipped, **323 of 633 KTX L1 entities = ~51% drafted**, **5 entities parked** (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting). Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Admin & permissions batch lessons** (commit `59c1bd1b`):
- chunk_size=10 sustained for smaller mixed-category batches (37 entities)
- 2nd production halt-on-novelty fired (y/n kick-walkthrough); operator-accepted-park path validated
- F1 audit pattern surfaced a NEW variant: `CF_PLAYER` alone (no spectator-admin path) on `speed` + `socd` -- complements prior `CF_PLAYER | CF_SPC_ADMIN` and Frogbot's `CF_BOTH + runtime k_fb_admin_only` variants. F1 audit is now load-bearing across 4+ batches.
- **CRITICAL LESSON FOR THIS HANDOFF**: the prior handoff doc misclassified `y`/`n` as Shape 7a vote responses (an inference from category context). Source check showed they're `YesKick`/`DontKick` kick-walkthrough commands; `yes`/`no` are the actual vote responders. Lesson captured in memory at `feedback_verify_primary_sources_before_synthesis.md` incident #2: synthesis docs that route N parallel sub-agents must source-verify every cross-category claim at file:line, not infer from category context.

**Shape catalog state**: 14+ shapes locked. Demo & spectator is dominated by a **massive command-fan-out family** (favN_add x 20 + Nfav_go x 20 = 40 of 69 entities) -- prime canonical-card-pattern territory. Other shape patterns to expect:
- Shape 3 (set-once demo recording cvars): `k_demo_mintime`, `demo_scoreslength`, `demo_skip_ktffa_record`, `demo_tmp_record`, `k_demoname_date`, `k_demotxt_format`, `k_keepspectalkindemos`
- Shape 4 / 4b gated commands: `tracklist` gated by `k_allowtracklist` (drafted in Admin & permissions this batch -- cross-batch threading dependency)
- Shape 11a Shape composition consumer: `moreinfo` is the per-recipient filter level cycler gated on `k_spec_info` MI_ON bit (per shape-catalog Shape 11a). `k_spec_info` is in another category (Spectator chat & visibility, drafted 2026-05-25); cross-batch threading.
- shape-less commands: `cam` (usage tutorial per Shape 10 disambiguation), `demomark`, `dlist`, `dinfo`, `trx_play/rec/stop`, `autotrack`/`autotrackktx`, `auto_pow`, `next_best`, `next_pow`
- Possible Shape 9b engine state-mirror: `_k_nospecs` (underscore prefix is a strong signal)
- Possible novel shape: the `fav` family itself. **Most likely outcome**: canonical-card pattern applied (fav1_add canonical + 19 ref cards; 1fav_go canonical + 19 ref cards). Shape catalog has the canonical-card pattern documented under Shape 7 but it generalizes to any near-identical-sibling family. If sub-agents try to crystallize a new Shape for "slot-keyed action-command fan-out," **halt-on-novelty** and surface to operator -- earn-their-keep says 1-of-1 (this is the only fav-style family in KTX) doesn't earn a new shape.

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 8 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries + the F1 audit followup + Frogbot remediation followup. Especially the Admin & permissions entry (this batch's predecessor) for the latest F1 variant + the y/n source-routing lesson.
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- 5 procedural detail files.
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-admin-permissions.md` -- prior batch's `## Cross-card consistency notes` section. F1 (CF_PLAYER variant), F2 (cross-batch threading), F3 (v1-shape artifacts), F7 (kick-walkthrough park rationale) are all reusable context.
5. Skim per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 11a section for moreinfo; Shape 10 disambiguation for cam; canonical-card pattern section is load-bearing for the fav family**.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (Permission CF-flag table -- expect F1 audit findings).
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`.

---

## Critical rules

1. **chunk_size=10 for this batch.** 69 entities -> 6 chunks of 10 + 1 of 9 = 7 chunks. If any chunk hits ~150k context warnings, drop that chunk to chunk_size=8.

2. **Canonical-card pattern is the load-bearing efficiency lever.** The fav family has 40 near-identical entities (20 `favN_add` + 20 `Nfav_go`). Pre-designate the canonical cards in EACH sub-agent's brief so they don't independently re-derive:
   - `fav1_add` is canonical for the `favN_add` family (N=2..20 are reference cards).
   - `1fav_go` is canonical for the `Nfav_go` family (N=2..20 are reference cards).
   - Reference card format per `shape-catalog.md` canonical-card pattern section: Headliner only ("Saves your current position to favorite slot N. See `fav1_add` for full mechanism. This command operates on slot N."), See-also pointing at canonical + paired `Nfav_go` for the same N.
   - Sub-agents in chunks containing reference cards MUST follow this guidance; don't allow re-derivation.

3. **PERMISSION DISCIPLINE -- F1 audit continues.** Verify CF flag per entity at registration in `src/commands.c`. The corrected Permission-line CF-flag table in `universal-shape-v2.md` is load-bearing; do NOT pattern-match against "Admin command" prose in existing descriptions. Specifically watch for: `CF_PLAYER` alone (any player, spectators excluded -- the new variant from Admin & permissions batch), `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator -- the recurring mislabel), `CF_BOTH_ADMIN` (legitimate admin-only).

4. **Cross-batch threading dependencies to watch for** (the apply-pass-author resolves at apply time; sub-agents draft with paired-entity names in See-also):
   - `tracklist` <-> `k_allowtracklist` (drafted in THIS handoff's predecessor batch, Admin & permissions, as Shape 1 paired with `toggletracklist`).
   - `moreinfo` <-> `k_spec_info` MI_ON bit (drafted in Spectator chat & visibility batch 2026-05-25 / re-drafted 2026-05-26 after Shape 11 crystallization).
   - `tracklist`/`moreinfo` etc. may need cross-references to entities in Spectator chat / Voting / Server config batches.

5. **`cam` is shape-less (usage tutorial)** -- per shape-catalog "Distinguish from these neighbors that are NOT Shape 10" section: "Usage tutorial (cam / ShowCamHelp): explains keybindings / controls, not a sibling list. Different content shape." DO NOT classify as Shape 10. Same discipline as Admin & permissions batch's `commands` (introspective lister, shape-less) -- catalog disambiguation working.

6. **`_k_nospecs` underscore prefix is a strong Shape 9b (engine state-mirror) signal**. Verify by grepping for `cvar_set("_k_nospecs", ...)` in non-handler engine functions. If yes, Shape 9b applies. If sub-agent finds it's user-actionable (Shape 9a) or normal (Shape 3), classify accordingly.

7. **CRITICAL HANDOFF-WRITING DISCIPLINE (lesson from Admin & permissions y/n misclassification):** when describing each entity's expected shape in this handoff doc, I (the handoff writer) source-verified each cross-category claim. Sub-agents should still source-verify per Step 1 source-grep -- the handoff doc's shape suggestions are HYPOTHESES, not contracts. If a sub-agent's source check contradicts a handoff-doc claim, **trust source over handoff** and flag the discrepancy in the sub-agent's report (the Admin & permissions y/n case is the canonical example -- chunk D sub-agent's source-correction prevented a 7-card wrong-classification ship).

8. **DISPATCHER OVERRIDE on sub-agent file-writes** (unchanged). Each sub-agent prompt MUST instruct: "DO NOT write per-batch files; return YAML metadata only; write your chunk's assembled section content to `/tmp/<chunk_id>_output.md` in one Write call." Dispatcher assembles atomically at Step 6.

9. **Halt-on-novelty likely candidates this batch**:
   - **fav-family novel-shape temptation**: sub-agent may want to crystallize a new "slot-keyed action fan-out" shape. Apply canonical-card pattern instead; halt only if a sub-agent reports source patterns that genuinely don't fit canonical-card.
   - **trx_* family**: trex (replay tool integration?) commands. If source mechanism is genuinely sui-generis (e.g. compile-time binding to an external tool), trigger 4 may fire. Halt and surface to operator if novel.

10. **Stage explicit files only**. `git add HANDOVER.md <drafts-file> <park-file-if-any>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.

11. **Commit message format**: `docs(ktx-l1-rewrite): SHIPPED Demo & spectator category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=10`.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator.

Then read the 5 dispatcher references + per-card references per "Reads required" above.

### Action 2: Pre-fetch the 69 Demo & spectator entities

```bash
python3 -c "
import re, json, html
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 1294, 3229
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
with open('/tmp/demo-spectator-entities.json', 'w') as f: json.dump(results, f, indent=2)
print(f'Total: {len(results)}')
"
```

Expected: 69 entities, 10 cvars + 59 commands. **Verified at handoff-draft time**.

**Suggested chunk plan** (7 chunks; canonical-card guidance embedded):

- **Chunk A (10): demo + spec config cvars + state-mirror** -- `_k_nospecs`, `allow_spec_wizard`, `demo_scoreslength`, `demo_skip_ktffa_record`, `demo_tmp_record`, `k_demo_mintime`, `k_demoname_date`, `k_demotxt_format`, `k_keepspectalkindemos`, `k_no_wizard_animation`. Mostly Shape 3 set-once cvars; `_k_nospecs` candidate Shape 9b.
- **Chunk B (10): fav_add canonical + part 1** -- `fav_add`, `fav_del`, `fav_all_del`, `fav_next`, `fav_show`, `fav1_add` (CANONICAL for favN_add family), `fav2_add`, `fav3_add`, `fav4_add`, `fav5_add` (reference cards pointing at fav1_add). Sub-agent applies canonical pattern.
- **Chunk C (10): fav_add reference cards** -- `fav6_add` through `fav15_add` (all reference cards under fav1_add canonical).
- **Chunk D (10): fav_add tail + Nfav_go canonical start** -- `fav16_add`, `fav17_add`, `fav18_add`, `fav19_add`, `fav20_add` (5 reference) + `1fav_go` (CANONICAL for Nfav_go family) + `2fav_go`, `3fav_go`, `4fav_go`, `5fav_go` (4 reference).
- **Chunk E (10): Nfav_go middle** -- `6fav_go` through `15fav_go` (all reference under 1fav_go canonical).
- **Chunk F (10): Nfav_go tail + spec automation** -- `16fav_go` through `20fav_go` (5 reference) + `autotrack`, `autotrackktx`, `auto_pow`, `next_best`, `next_pow` (5 commands -- track-mode automation, likely shape-less or Shape 1).
- **Chunk G (9): demo navigation + cross-batch threaded + trex** -- `cam` (shape-less per Shape 10 disambiguation), `dlist`, `dinfo`, `demomark`, `tracklist` (cross-batch with k_allowtracklist), `moreinfo` (Shape 11a consumer of k_spec_info), `trx_play`, `trx_rec`, `trx_stop`.

Adjust empirically based on the pre-fetched JSON.

### Action 3: Dispatch 7 sub-agents in parallel

Use the Agent tool, `subagent_type=general-purpose`, `model=sonnet`. Each sub-agent prompt follows the chunk-prompt template (see commit `59c1bd1b`'s sub-agent prompts for the latest structure). Each prompt includes:
- Skill loading instructions (7 files: SKILL.md + 6 references)
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE (return YAML, write to /tmp)
- Cross-batch context briefing (THIS BATCH: fav family canonical-card mandate; tracklist + moreinfo cross-batch threading; F1 audit continues with the new CF_PLAYER-alone variant; `cam` shape-less per disambiguation)
- Permission-line discipline reminder (with the full CF flag table)
- **For chunks B-F: explicit canonical-card mandate** -- fav1_add canonical for favN_add family; 1fav_go canonical for Nfav_go family.
- Output format spec

After all sub-agents return:
- Aggregate verdicts.
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue).
- Cross-card synthesis (expect 8-12 findings; fav-family canonical-pattern application is the dominant cross-card thread; F1 audit residue expected on autotrack/auto_pow/etc.).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-demo-spectator.md`.
- Park file if applicable.
- Append HANDOVER followup entry mirroring the Admin & permissions entry shape.
- Commit per the message format.

---

## Watch-outs for Demo & spectator

1. **Canonical-card discipline holds at scale**. This batch is the largest canonical-card application yet (40 of 69 entities). Cross-card synthesis should explicitly verify the canonical card carries the full description while all 19 reference cards point at it. Past batches applied canonical-card to 4-6 entities; 40 is a step up.

2. **`moreinfo` Shape 11a partial application**. `k_spec_info` (Shape 11a bitmask, MI_ON + MI_ADM_ONLY bits) was drafted in Spectator chat & visibility batch 2026-05-25 / 2026-05-26. `moreinfo` is the consumer-side per-recipient filter level cycler gated on MI_ON. The Shape 11a documentation lives on `k_spec_info`'s card; `moreinfo`'s card is the command-side lever for the MI_ON consumer behavior. Cross-reference both ways; verify symmetric See-also when apply-pass runs.

3. **`tracklist` cross-batch with Admin & permissions**. `k_allowtracklist` was drafted as Shape 1 in Admin & permissions (paired with `toggletracklist` toggle command, CF_BOTH | CF_MATCHLESS at commands.c:843). `tracklist` is the command this cvar gates. Add `k_allowtracklist` + `toggletracklist` to See-also; cross-batch threading.

4. **`cam` is the usage-tutorial form-factor**, NOT Shape 10 curated-family help-printer. The catalog disambiguation explicitly names it. The Admin & permissions batch's `commands` was a parallel disambiguation case (introspective lister, shape-less). Same discipline: classify shape-less; don't be tempted to fan it out as Shape 10.

5. **`_k_nospecs` underscore prefix**. Single underscore prefix at L1 entity name suggests engine-only state. Verify against world.c registration + grep for `cvar_set("_k_nospecs", ...)` in non-handler functions. Likely Shape 9b (engine state-mirror); if so, no Effect on user actions, just engine bookkeeping.

6. **`trx_play`/`trx_rec`/`trx_stop` family**. Three "trex" (replay tool?) commands. Unknown semantics from name alone. If source mechanism is genuinely sui-generis (compile-time binding to external tool, or stdcmd routing similar to ban/banip/banrem CF_REDIRECT), trigger 4 may fire. If a normal trio with internal state, may fit Shape 6 (stateful + one-shot pair) or shape-less. Source-verify each.

7. **`autotrack`/`autotrackktx` distinction**. Two near-similar names; likely different behaviors. Don't apply canonical-card pattern blindly -- verify they're actually near-identical before classifying as canonical+reference. The Frogbot batch's F11 (`aim_pitch_*`/`aim_yaw_*` rejected from canonical) is the precedent: source-verify clamps/formulas/scope before applying canonical-card discipline.

8. **`demomark`, `dlist`, `dinfo`**. Demo navigation commands. Likely shape-less command actions. Verify behavior at source; may have cross-references to demo recording cvars in Chunk A.

9. **Possible park triggers to watch for**:
   - **fav family novel-shape temptation**: sub-agent may want to crystallize "slot-keyed action fan-out" as a new Shape. Don't -- earn-their-keep says canonical-card pattern handles it. If sub-agent reports trigger 1 for fav-family, surface to operator and recommend re-classification as canonical-card under existing discipline.
   - **`_k_nospecs` if not actually Shape 9b**: if the cvar is read but never written by engine code (just a normal cvar with underscore prefix as naming convention), classify Shape 3. If written by engine in a non-handler function, Shape 9b.
   - **trx_* if sui-generis**: if the trex integration is unusual (e.g. compile-time-bound function table like `callalias`), trigger 4 may fire. Park trio together (mirror y/n parking pattern).

---

## Skill invocation

```
Skill(
  skill="ktx-l1-batch-dispatcher",
  args="category=\"Demo & spectator\" batch_date=<YYYY-MM-DD> anchor_version=v1.36-1633-g67253dc chunk_size=10"
)
```

Adjust `batch_date` to today.

---

## When in doubt

- **Anchor drift**: abort, ask operator.
- **Novelty trigger 1/4**: halt batch, return candidate-shape signature, ask operator. The fav-family canonical-card temptation is the most likely false-trigger source; remind operator that canonical-card pattern handles N-sibling fan-outs without a new shape.
- **chunk_size=10 hits context exhaustion on any chunk**: drop that chunk to chunk_size=8 and document the threshold.
- **Canonical-card application unclear** (siblings have meaningful behavioral differences): treat as separate cards per Frogbot F11 precedent. Don't force canonical-card if siblings differ in scope / formula / consumer.
- **Cross-batch threading dependency entities** (tracklist / moreinfo): draft with paired-entity name in See-also; note in card Notes that the paired cvar lives in `<prior-batch-name>`.
- **Cross-card finding seems wrong**: park as a follow-up note in the consistency section rather than asserting -- the cross-card pass is read-across-drafts, not re-verification of source.
- **Anything else unclear**: read the dispatcher SKILL.md "When unsure, halt" rule. Halting + asking is always preferable to force-fitting.

---

## After ship

Delete this parking doc if the batch shipped cleanly (operator-accepted park counts as clean per the Mode-scoped knobs + Admin & permissions precedent). Append a HANDOVER entry per the dispatcher file-formats.md template.

If chunk_size=10 holds cleanly on 69 entities with the canonical-card mandate, the next batch can stay at chunk_size=10 for Match flow (71) or Gameplay rules (69), or try chunk_size=12 if those categories show low per-card density.

Remaining categories after Demo & spectator (222 entities total across 5 categories): Gameplay rules (69), Internal state (19), Match flow (71), Player communication (18), Race (45).
