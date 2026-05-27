# Handoff -- ktx-l1-rewrite Internal state batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-27
**Drafted by**: Gameplay rules ship session (commit `6700d9e4` + three SKILL amendments)
**For**: fresh terminal dispatching the Internal state ktx-l1-rewrite batch
**Target**: Internal state category (19 cards) -- recommended `chunk_size=7` (3 chunks: 7+6+6). chunk_size=6 also acceptable (3 chunks of 7+6+6 with size 6 cap also yields 3 chunks).
**Sized**: ~45-60 min wall-clock. Smallest remaining KTX category. Designed as the **SKILL-amendment validator batch** -- exercises the 3 SKILL edits landed 2026-05-27 (F13 /tmp collision fix / F3 Shape 1 manual-flip variant / F1 mandatory CF-flag extraction) before tackling the larger Race (45) and Player communication (18) batches.

---

## Where things are

Chunked-mode pattern is **eleven times validated** (11 prior batches shipped):
- Scoring & stats: chunk_size=6 (19 cards) -- direct size precedent for Internal state.
- Mode selection: chunk_size=7 (28 cards)
- Mode-scoped knobs: chunk_size=8 (66 cards, first production halt-on-novelty)
- Frogbot: chunk_size=10 (78 cards)
- Admin & permissions: chunk_size=10 (37 cards, second production halt-on-novelty -- operator-accepted park)
- Demo & spectator: chunk_size=10 (69 cards, 0 parks, 0 novelty halts)
- Match flow: chunk_size=9 (71 cards, 1 abort-to-synthesis on `k_sready`)
- Gameplay rules: chunk_size=10 (69 cards, 0 parks, 0 halts) -- predecessor batch

**Cumulative ktx-l1-rewrite progress**: 11 batches shipped, **531 of 633 KTX L1 entities = ~84% drafted**, **5 entities parked** (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting), **1 entity aborted-to-synthesis** (`k_sready`). Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Categories remaining after Internal state**: Race (45) + Player communication (18) = 63 entities across 2 categories. Internal state → Race → Player communication is the recommended order (small → large → small for finish).

**THREE SKILL AMENDMENTS LANDED 2026-05-27** (per the post-Gameplay-rules brain-dump; next batch is the first to validate them in production):

1. **`~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md`** -- Shape 1 source signature expanded to admit the **manual-flip variant** (`cvar_fset` / `trap_cvar_set_float`). The canonical signature is `cvar_toggle_msg`; the variant covers handlers that flip binary state via `cvar_fset("<cvar>", !cvar("<cvar>"))` or `trap_cvar_set_float`. Classify as **Shape 1 (functional)** with a one-line Notes entry. Confirmed instances: `teleteam` ↔ `k_tp_tele_death` (Gameplay rules); `tkfjump`/`tkrjump` ↔ `k_disallow_kfjump`/`k_disallow_krjump` (Gameplay rules); `hdptoggle` ↔ `k_lock_hdp` (Admin & permissions). **Do NOT force manual-flip toggles to shape-less** -- the cvar+command relationship is what Shape 1 captures.

2. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** -- Step 1 Commands bullet now **MANDATES** extracting the exact `CF_<flags>` value from the registration row into Step 1 output AND mapping via the CF-flag-to-wording table in `universal-shape-v2.md`. Do NOT infer Permission from existing description's prose. Authoritative source is the registration row; existing prose is hypothesis. This is the F1 7-batch-threshold amendment -- the systematic Permission mislabel pattern is meant to stop here.

3. **`~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md`** -- Step 3 sub-agent dispatch now documents the **batch-date-suffixed `/tmp` filename convention**: `/tmp/chunk_<chunk_id>_<batch_date>.md`. Sub-agents MUST use `Write` (clobber semantics), NOT `Edit`. Dispatcher MUST validate each scratch file's section count + entity-name list before assembly. This is the F13 fix from Gameplay rules (chunks B+C inherited stale `/tmp` content from prior batches; dispatcher recovered via line-range slicing, but only because section-count smell test fired -- amendment removes the near-miss path).

**Gameplay rules batch lessons** (commit `6700d9e4`):
- chunk_size=10 sustained for 7 parallel chunks; no context exhaustion.
- 0 parks, 0 novelty halts -- cleanest large batch in the series despite ~46% flag rate (dominated by F1 + F4 framing errors that the recasts correctly fix).
- 15 cross-card findings total: 12 actionable + 1 confirmed clean + 2 informational. Above the recent 8-13 range; reflects category density (Shape 1 toggle-pair concentration + cross-batch interplay with powerup family + visible-weapons composition).
- 3 structural findings (F1 7th batch / F3 cross-chunk Shape 1 disagreement / F13 /tmp collision) drove the 3 SKILL amendments above. **First batch where dispatcher infrastructure (not card content) was the dominant finding source** -- next batch is meant to be the validation that the amendments worked.

**THREE SUB-AGENT-DISCIPLINE PROCEDURES** (still mandatory, bake into every chunk prompt):

1. **Verdict-marker internal-consistency check** -- for EVERY entity in your chunk: verify (a) the `<!-- VERDICT: X -->` marker matches the `**Status**: X` line; (b) the marker/Status matches your YAML report's `verdict` field; (c) if verdict is `drafted_with_flag`, Notes contains at least one bullet starting with `FLAG:`; (d) if verdict is `drafted`, Notes contains NO bullet starting with `FLAG:` -- use `Verification:` or plain bullets for clean spot-checks.

2. **`FLAG:` prefix discipline** -- use `FLAG:` ONLY for localized factual contradictions the apply-pass-author must verify before applying. For spot-check reasoning that concluded clean, use `Verification:` or a plain bullet -- DO NOT use `FLAG:` as a "I investigated this" marker.

3. **Draft-vs-verified-content sanity check** -- before emitting your proposed draft, verify EVERY factual claim in Headliner / Effect / Prerequisites / Permission is supported by your Step 1.5 source-verified content or Step 3 spot-check. Watch enumerations line-by-line.

**Shape catalog state**: 14+ shapes locked. Internal state is dominated by:
- **Shape 9b (engine-only state-mirror cvar)** -- `k_hoonymode_prevmap` / `k_hoonymode_prevspawns` are the CANONICAL examples per `worked-examples.md`. Many `_k_*` prefixed cvars are likely Shape 9b too (engine bookkeeping for captain/coach/team/score state across map transitions and match phases).
- **Shape 9a (side-channel cvar)** -- possible but less likely; check for any `_k_*` cvar that has a user-syntax write path.
- **shape-less internal command** -- `cmdslist_dl` is likely sibling of `mapslist_dl` (covered in `ktx-map-voting-mechanism-map.md`). Connect-time download mechanism; CF_NOALIAS internal command.

**The `_k_*` underscore-prefix naming convention** is a strong signal for engine-managed state. The prefix isn't documented anywhere in the catalog yet -- worth surfacing as a finding if all 16 `_k_*` cvars in this batch turn out to be Shape 9b. If so, a catalog amendment may be earned ("the `_k_` prefix convention denotes engine-internal state-mirrors, not user-set knobs").

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 11 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries. **Especially the Gameplay rules entry (this batch's predecessor) at line ~38** for: the F1 SKILL amendment context (now baked in), the F3 cross-chunk Shape 1 disagreement (manual-flip Shape 1 now catalog-documented), the F13 /tmp collision recovery (now prevented by batch-date suffix).
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow. **Read the Step 3 amendment for /tmp filename convention + dispatcher-side validation.**
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- 5 procedural detail files.
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-gameplay-rules.md` -- prior batch's `## Cross-card consistency notes` section (F1-F15). F1 (CF flag mislabel + SKILL amendment), F3 (manual-flip Shape 1), F4 (foundational framing errors), F13 (/tmp collision recovery) are all reusable context for this batch.
5. Per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (Step 1 CF-flag extraction amendment now mandatory)
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 9a + Shape 9b sections especially** (`k_entityfile` and `k_hoonymode_prevmap` are the canonical examples for this batch's content). Also the manual-flip Shape 1 variant.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` -- Permission CF-flag table (load-bearing for the 7th-batch F1 amendment).
   - `~/.claude/skills/ktx-l1-rewrite/references/worked-examples.md` -- Shape 9b template for `k_hoonymode_prev*` lift.
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`.

---

## Critical rules

1. **chunk_size=7 recommended for this batch.** 19 entities → 3 chunks of 7+6+6 = 19. chunk_size=6 also acceptable (3 chunks of 7+6+6 — minor rebalance). Either way, 3 parallel sub-agents.

2. **/tmp FILENAME CONVENTION (new -- F13 amendment)** -- sub-agent prompts MUST instruct: "Write to `/tmp/chunk_<id>_2026-05-27.md` (batch-date-suffixed). Use the `Write` tool, NOT `Edit`. If the file exists from a prior run (it should NOT for this batch_date but defensive), OVERWRITE cleanly -- do not preserve stale content." Dispatcher validates each scratch file's section count + entity-name list matches the chunk's input list BEFORE assembly.

3. **CF FLAG MANDATORY EXTRACTION (new -- F1 amendment)** -- sub-agent prompts MUST instruct: "For each command entity in your chunk, extract the exact `CF_<flags>` value from the registration row in `src/commands.c` into your Step 1 output. Map the CF flag(s) to the Permission line via the table in `universal-shape-v2.md`. Do NOT infer Permission from the existing description's prose. The registration row is authoritative."

4. **MANUAL-FLIP SHAPE 1 VARIANT (new -- F3 amendment)** -- sub-agent prompts MUST instruct: "If a paired toggle command flips its cvar via `cvar_fset` or `trap_cvar_set_float` (not `cvar_toggle_msg`), classify as **Shape 1 (functional)** with a one-line Notes entry. Do NOT force to shape-less -- the cvar+command relationship is what Shape 1 captures." Likely NOT triggered in this batch (most `_k_*` cvars have no paired toggle command), but bake into prompt for consistency.

5. **THE THREE SUB-AGENT DISCIPLINES** (Where things are above) must remain in every chunk prompt: verdict-marker consistency / FLAG: prefix discipline / draft-vs-verified content sanity check.

6. **Shape 9b template lift mandate** -- for `k_hoonymode_prevmap` and `k_hoonymode_prevspawns` specifically, lift the v2 recast pattern from `worked-examples.md` Shape 9b section. These are the catalog's canonical examples; lift directly. Likely similar for many `_k_*` cvars -- if behaviorally uniform (engine writes on state-transition, engine reads on restore), apply Shape 9b consistently.

7. **`_k_*` underscore-prefix family observation** -- if all 16 `_k_*` entities turn out to be Shape 9b engine-state-mirrors, surface as a **cross-card finding** AND as a candidate catalog amendment ("the `_k_` prefix convention denotes engine-managed internal state"). Earn-their-keep discipline: don't promote the convention to a shape; document it as a naming hint that LEADS to Shape 9b classification.

8. **Cross-batch threading dependencies** (the apply-pass-author resolves at apply time; sub-agents draft with paired-entity names in See-also):
   - `_k_captteam1` / `_k_captteam2` / `_k_captcolor1` / `_k_captcolor2` -- captain election state. Cross-batch See-also to `captain` (Match flow batch, drafted 2026-05-27).
   - `_k_coachteam1` / `_k_coachteam2` -- coach election state. Cross-batch See-also to `coach` (Match flow batch).
   - `_k_team1` / `_k_team2` / `_k_team3` -- team-name state. Cross-batch See-also to teamplay commands (likely Player communication batch -- next-batch).
   - `_k_last_xonx` -- last team-size preset state. Cross-batch See-also to `1on1` / `2on2` / `3on3` / `3on3on3` / `10on10` (Match flow batch).
   - `_k_lastmap` / `_k_last_cycle_map` -- map-transition state. Cross-batch See-also to `forcemap` / `changelevel` / `votemap` (Voting + Match flow batches).
   - `_k_pow_last` -- last powerup-state state. Cross-batch See-also to `k_pow` (Gameplay rules batch, drafted 2026-05-27).
   - `k_hoonymode_prevmap` / `k_hoonymode_prevspawns` -- hoonymode persistence. Worked-examples Shape 9b reference card.
   - `cmdslist_dl` -- sibling of `mapslist_dl` per `ktx-map-voting-mechanism-map.md`. Internal connect-time download command; CF_NOALIAS.
   - `_k_host` / `_k_worldspawns` / `__k_ls` -- engine bookkeeping; source-verify the consumer for Step 1.5 behavioral unpacking.

9. **DISPATCHER OVERRIDE on sub-agent file-writes** (updated per F13) -- each sub-agent prompt MUST instruct: "DO NOT write per-batch drafts/park files. RETURN YAML report only; write chunk's assembled section content to `/tmp/chunk_<X>_2026-05-27.md` in ONE Write tool call (NOT Edit). Dispatcher assembles atomically at Step 6."

10. **HANDOFF-DOC CLAIMS ARE HYPOTHESES, NOT CONTRACTS** (Rule 7 from prior handoffs, reinforced). If a sub-agent's source check contradicts a handoff-doc claim (e.g. "this is Shape 9b" turns out to be Shape 9a with a side-channel write path; "_k_team1 is engine-only" turns out to have a user-syntax write path), TRUST SOURCE. Flag in YAML report; cross-card pass surfaces as a finding. Prior batches had this work 5+ times across recent batches.

11. **Halt-on-novelty likely candidates this batch**:
   - **`cmdslist_dl`**: per the map-voting mechanism map, sibling of `mapslist_dl`. Shape is likely shape-less (internal connect-time download), but verify. If sui-generis, trigger 4 halt.
   - **`__k_ls`** (double-underscore prefix!): the only entity in this batch with `__k_` prefix. May be sui-generis (trigger 4) if no analog exists in catalog. Source-verify carefully.
   - **`_k_host`**: name suggests a host-id mirror, but verify -- could be sui-generis. Engine internals only.

12. **Stage explicit files only**. `git add HANDOVER.md <drafts-file> <park-file-if-any>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.

13. **Commit message format**: `docs(ktx-l1-rewrite): SHIPPED Internal state category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=7`.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator.

Then read the 5 dispatcher references + per-card references per "Reads required" above. **Especially the Step 3 amendment in `~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` and the Step 1 Commands amendment in `~/.claude/skills/ktx-l1-rewrite/SKILL.md`.**

### Action 2: Pre-fetch the 19 Internal state entities

```bash
python3 -c "
import re, json, html as htmlmod
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 7963, 8508
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
    results.append({
        'entity_name': name,
        'entity_type': badge.group(1) if badge else None,
        'category': 'Internal state',
        'existing_description': htmlmod.unescape(desc.group(1).strip()) if desc else None,
        'source_ref': src.group(1) if src else None,
        'catalog_line': sl,
        'anchor_version': 'v1.36-1633-g67253dc',
        'batch_date': '2026-05-27',
    })
with open('/tmp/internal-state-entities.json', 'w') as f: json.dump(results, f, indent=2)
print(f'Total: {len(results)}')
"
```

Expected: 19 entities, ~16-18 cvars + 1-3 commands (`cmdslist_dl` is the only obvious command; some `_k_*` could turn out to be userinfo keys -- verify badge field).

**Suggested chunk plan** (3 chunks of 7+6+6, canonical-card lift guidance embedded):

- **Chunk A (7): Captain + coach + team state** -- `_k_captcolor1`, `_k_captcolor2`, `_k_captteam1`, `_k_captteam2`, `_k_coachteam1`, `_k_coachteam2`, `_k_team1`. **All likely Shape 9b** (engine writes on election outcome / team change; reads on restore or display). Cross-batch See-also to `captain`/`coach` (Match flow batch). `_k_team1` may differ -- source-verify whether teamplay name-storage or full engine-state-mirror.
- **Chunk B (6): Remaining team state + hoonymode + worldspawns** -- `_k_team2`, `_k_team3`, `k_hoonymode_prevmap`, `k_hoonymode_prevspawns`, `_k_worldspawns`, `__k_ls`. **`k_hoonymode_prev*` are CANONICAL Shape 9b** (lift from worked-examples.md). `_k_worldspawns` and `__k_ls` need source verification -- `__k_ls` double-underscore prefix is novel; possible trigger-4 candidate if sui-generis.
- **Chunk C (6): Match-transition state + cmdslist_dl** -- `_k_host`, `_k_last_cycle_map`, `_k_lastmap`, `_k_last_xonx`, `_k_pow_last`, `cmdslist_dl`. Mix of Shape 9b state-mirrors + 1 internal command. `cmdslist_dl` likely shape-less internal-mechanism (sibling of `mapslist_dl`). `_k_pow_last` cross-batch See-also to `k_pow` (Gameplay rules batch).

Adjust empirically based on the pre-fetched JSON badges (cvar vs command vs userinfo). The chunk plan is a suggestion; the dispatcher's own pre-fetch + skim can re-balance.

### Action 3: Dispatch 3 sub-agents in parallel

Use the Agent tool, `subagent_type=general-purpose`, `model=sonnet`. Each sub-agent prompt follows the chunk-prompt template (see commit `6700d9e4`'s sub-agent prompts for the latest structure -- they bake in the 3 disciplines but DO NOT YET include the 3 SKILL amendments since amendments landed AFTER the dispatch). Each prompt MUST include:
- Skill loading instructions (7 files: SKILL.md + 6 references) -- the amendments are NOW LIVE in those files; sub-agents reading SKILL.md + references will pick them up cold-load.
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE updated: return YAML, write to `/tmp/chunk_<id>_2026-05-27.md` (batch-date-suffixed!), use Write not Edit.
- **THE 3 SUB-AGENT DISCIPLINES** (verdict consistency / FLAG: prefix / draft-vs-Notes sanity check)
- Cross-batch context briefing (THIS BATCH: Shape 9b heavy; `_k_*` prefix observation; cross-batch threading for captain/coach/team commands; hoonymode canonical lift)
- **CF FLAG MANDATORY EXTRACTION** (per the F1 amendment -- sub-agents may be reading the new SKILL.md but reinforce in prompt to be safe)
- **MANUAL-FLIP SHAPE 1 VARIANT** (per F3 amendment -- bake into prompt for consistency though unlikely to trigger in this batch)
- Output format spec

After all sub-agents return:
- **Validate each scratch file**: section count = expected entity count; entity-name list matches chunk input list. If mismatch, surface and recover.
- Aggregate verdicts.
- Run marker/Status/YAML consistency scan (regression-test the Demo & spectator + Match flow + Gameplay rules findings).
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue). **`__k_ls` and `_k_host` are the watch-out entities.**
- Cross-card synthesis (expect 4-7 findings; smaller batch → fewer findings; **`_k_*` prefix observation likely the dominant finding**).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-internal-state.md` (sub-grouping by family like prior batches is recommended).
- Park file if applicable.
- Append HANDOVER followup entry mirroring the Gameplay rules entry shape.
- Commit per the message format.

---

## Watch-outs for Internal state

1. **`__k_ls` double-underscore prefix** -- the only `__k_*` entity in any batch so far. Naming suggests something distinct from the `_k_*` family. Source-verify carefully. If sui-generis (no analog in catalog), trigger 4 halt. If it's just an outlier naming convention but mechanism is Shape 9b, draft normally with a Notes mention of the unusual prefix.

2. **`_k_host` semantic ambiguity** -- name suggests "host" (server-host identity) but verify the consumer. Could be (a) engine-set state-mirror for the host's identity (Shape 9b), (b) gating cvar for host-only features (Shape 3), (c) something unique. Source-verify before classifying.

3. **`cmdslist_dl` shape-less internal command** -- sibling of `mapslist_dl` per the map-voting mechanism map. Verify shape-less classification + paired See-also to `mapslist_dl`. NOT a halt candidate (mechanism is cataloged via `mapslist_dl`'s precedent).

4. **`_k_pow_last` cross-batch See-also discipline** -- THIS BATCH ships `_k_pow_last`; Gameplay rules batch (predecessor, just shipped) ships `k_pow`. `_k_pow_last`'s See-also should reference `k_pow`. Match flow batch's `k_pow` draft already exists; verify it includes `_k_pow_last` in See-also (if not, surface as cross-batch apply-pass finding).

5. **`_k_*` prefix as catalog-amendment candidate** -- if all 16 `_k_*` entities classify as Shape 9b cleanly, surface as a finding: "the `_k_*` underscore-prefix convention denotes engine-internal state-mirrors". Don't add a new shape; document the naming convention as a Shape 9b identification heuristic. Earn-their-keep: a naming convention isn't a new shape, just a pre-classification hint.

6. **Shape 9b template lift mandate** -- the `k_hoonymode_prev*` family has explicit v2 templates in `worked-examples.md`. Lift the recast pattern directly. Same goes for `k_entityfile` (Shape 9a) -- if any `_k_*` cvar has a user-syntax write path (`changelevel <map>#<variant>` style), it's Shape 9a; otherwise Shape 9b.

7. **Validation of the 3 SKILL amendments** -- this batch is the first to test them in production. If the amendments work as intended:
   - F1: zero (or near-zero) Permission mislabel residue. Most `_k_*` are cvars with `server config only` or `engine internal only` permission lines -- not many command-side CF flag opportunities.
   - F3: any manual-flip Shape 1 patterns (unlikely in this Shape 9b-heavy batch) are correctly classified.
   - F13: scratch files use `/tmp/chunk_<id>_2026-05-27.md` filenames; no stale-content collisions.
   If any of these fail or surface unexpected issues, **surface as a F-entry in cross-card** and consider further SKILL refinement before Race (45) batch.

8. **Smallest remaining batch -- no rush** -- 19 entities is below the chunked-mode size where front-matter overhead dominates. If the batch reveals SKILL amendment issues, the cost of iterating is low. Use this batch deliberately as the amendment validator; Race (45) is the bigger investment.

---

## Cross-batch state at end of Gameplay rules ship

- **Cumulative drafted**: 531 / 633 = ~84%
- **Parks**: 5 (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting)
- **Aborted-to-synthesis**: 1 (`k_sready` -- queued for describe-fill-synthesis)
- **Apply pile**: 11 batches' worth of drafts file pending operator apply pass (Server config / Spectator chat / Voting / Mode selection / Mode-scoped knobs / Scoring & stats / Frogbot / Admin & permissions / Demo & spectator / Match flow / Gameplay rules). The apply pass operates per-batch in commit order.
- **Categories remaining**: Internal state (19, this batch) → Race (45) → Player communication (18) = 82 entities across 3 categories.

---

## Open follow-ups (cross-batch, not for this batch)

These were captured during Gameplay rules ship (commit `6700d9e4`) but are NOT this batch's scope:

1. **F11 freeze ↔ k_freeze cross-batch See-also fix** -- at apply time, add `freeze` to Match flow batch's `k_freeze` See-also (couldn't be done at Match flow draft time; `freeze` wasn't in any batch then).
2. **F2 default-value sweep** -- cumulative bare-`RegisterCvar` zero-init pattern across 5+ batches now totals ~12 cvars. Apply-pass-author one-time audit candidate across all KTX cvars.
3. **F6 vwep family L3 concept-note** -- queued in concept-note backlog; not a batch concern.
4. **F12 OctaPower/dmm4 follow-up** -- apply-pass-author investigates before applying `k_bzk`/`k_btime` drafts.

---

## When in doubt

- Source over handoff (Rule 7 -- prior batches have overridden handoff hypotheses 5+ times).
- Source over existing description (Step 3 spot-check discipline; flag localized contradictions, park foundational ones).
- Park trigger 1 / 4 → HALT batch and surface to operator (never extend catalog from sub-agent).
- Park trigger 2 / 3 → continue batch; flag in cross-card.
- /tmp file collision → recover via line-range slicing (F13 precedent) AND flag as cross-card if it happens (amendment didn't take).

The amendments are the action items from Gameplay rules ship. This batch validates them. Race (45) will be the load-bearing test once amendments are battle-confirmed.
