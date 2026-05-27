# Handoff -- ktx-l1-rewrite Race batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-27
**Drafted by**: Internal state ship session (commit `ce21cd43`)
**For**: fresh terminal dispatching the Race ktx-l1-rewrite batch
**Target**: Race category (45 cards -- 16 cvars + 29 commands) -- recommended `chunk_size=9` (5 chunks of 9). chunk_size=8 also acceptable (6 chunks of 8+8+8+8+8+5).
**Sized**: ~90-120 min wall-clock. Largest remaining KTX category. **The SKILL-amendment stress-test batch** -- exercises F1 (mandatory CF-flag extraction; 29 commands = 29 Permission-line derivations) and F3 (manual-flip Shape 1 variant; race subsystem likely has Shape 1 toggles with manual `cvar_fset` patterns).

---

## Where things are

Chunked-mode pattern is **twelve times validated** (12 prior batches shipped):
- Scoring & stats: chunk_size=6 (19 cards)
- Mode selection: chunk_size=7 (28 cards)
- Mode-scoped knobs: chunk_size=8 (66 cards)
- Frogbot: chunk_size=10 (78 cards)
- Admin & permissions: chunk_size=10 (37 cards)
- Demo & spectator: chunk_size=10 (69 cards)
- Match flow: chunk_size=9 (71 cards)
- Gameplay rules: chunk_size=10 (69 cards)
- Internal state: chunk_size=7 (19 cards, 0 parks, 0 halts, 1 flag -- predecessor batch; SKILL-amendment validator)

**Cumulative ktx-l1-rewrite progress**: 12 batches shipped, **550 of 633 KTX L1 entities = ~87% drafted**, **5 entities parked** (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting), **1 entity aborted-to-synthesis** (`k_sready`). Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Categories remaining after Race**: Player communication (18). Race → Player communication finishes KTX L1 100%.

**THE 3 SKILL AMENDMENTS (validated/validating)** -- landed 2026-05-27 after Gameplay rules ship:

1. **`~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md`** -- Shape 1 source signature admits manual-flip variant (`cvar_fset` / `trap_cvar_set_float`). The canonical signature is `cvar_toggle_msg`; the variant covers handlers that flip binary state via `cvar_fset("<cvar>", !cvar("<cvar>"))` or `trap_cvar_set_float`. **NOT YET TESTED IN PRODUCTION** -- Internal state batch had zero Shape 1 toggles. **This batch is the first real F3 validation** -- race subsystem likely has multiple manual-flip toggle pairs (e.g. `race_toggle` may flip `k_race` manually).

2. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** -- Step 1 Commands bullet MANDATES extracting exact `CF_<flags>` value from registration row into Step 1 output AND mapping via the CF-flag-to-wording table in `universal-shape-v2.md`. **PARTIAL VALIDATION** -- Internal state's only command was `cmdslist_dl` (passed cleanly). **This batch is the F1 stress test -- 29 commands × CF-flag extractions**. If F1 misfires here, the apply pass for Race will have systemic Permission mislabel residue.

3. **`~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md`** -- Step 3 sub-agent dispatch documents the batch-date-suffixed `/tmp` filename convention. **FULLY VALIDATED** in Internal state batch (3 chunks, 19 sections, no stale collisions). Preserve the convention here.

**Internal state batch lessons** (commit `ce21cd43`):
- chunk_size=7 sustained for 3 parallel chunks; cleanest batch in the series (1/19 flag = ~5% flag rate).
- 0 parks, 0 halts, 0 sui-generis. Two watch-out entities (`__k_ls` double-underscore outlier, `_k_host` semantic ambiguity) both resolved cleanly as Shape 9b.
- 6 cross-card findings: 1 actionable + 1 catalog-amendment-candidate + 4 informational. Below the 8-13 range; reflects Shape-9b homogeneity (uniform category) rather than category density.
- **F1 catalog-amendment candidate**: `_k_*` underscore-prefix as Shape 9b identification heuristic (17/19 cards). Operator decides whether to amend `shape-catalog.md` Shape 9 identification guide.
- **F3 cross-batch See-also gap**: `k_pow` (Gameplay rules drafts) needs `_k_pow_last` back-link added at apply time.

**THREE SUB-AGENT-DISCIPLINE PROCEDURES** (still mandatory, bake into every chunk prompt):

1. **Verdict-marker internal-consistency check** -- for EVERY entity in your chunk: verify (a) the `<!-- VERDICT: X -->` marker matches the `**Status**: X` line; (b) the marker/Status matches your YAML report's `verdict` field; (c) if verdict is `drafted_with_flag`, Notes contains at least one bullet starting with `FLAG:`; (d) if verdict is `drafted`, Notes contains NO bullet starting with `FLAG:` -- use `Verification:` or plain bullets for clean spot-checks.

2. **`FLAG:` prefix discipline** -- use `FLAG:` ONLY for localized factual contradictions the apply-pass-author must verify before applying. For spot-check reasoning that concluded clean, use `Verification:` or a plain bullet -- DO NOT use `FLAG:` as a "I investigated this" marker.

3. **Draft-vs-verified-content sanity check** -- before emitting your proposed draft, verify EVERY factual claim in Headliner / Effect / Prerequisites / Permission is supported by your Step 1.5 source-verified content or Step 3 spot-check. Watch enumerations line-by-line. **For Permission lines: every Permission line on a command MUST come from CF flag extraction per the F1 amendment, NOT from existing description's prose.**

**Shape catalog state**: 14+ shapes locked. Race likely brings shape variety not seen in Internal state:
- **Shape 1 (cvar + paired toggle command)** -- `k_race` + `race_toggle` is the obvious candidate. Other paired toggles probable. **F3 manual-flip variant is the first real test** -- race subsystem may use `cvar_fset` / `trap_cvar_set_float` instead of `cvar_toggle_msg`.
- **Shape 1c (Shape 1 + mode-precondition)** -- many race commands likely require "race mode active" (`isRACE()`) as a Prerequisites gate. Probable for the `race_set_*` family.
- **Shape 3 (cvar with no paired command)** -- `k_race_match_rounds`, `k_race_pace_*`, `k_race_times_per_port` are likely server-config cvars (Shape 3).
- **Shape 4 (cvar that gates a command)** -- `k_race_match` may gate `race_match`; `k_race_pace_enabled` may gate `race_pacemaker`.
- **Shape 9a (side-channel cvar)** -- `k_race_route_mapname` and `k_race_route_number` may be Shape 9a if set via `race_route_switch` arg-syntax.
- **shape-less** -- pure state-printers (`race_show_lineup`, `race_show_record_details`, `race_show_route`, `race_show_toptimes`) likely shape-less. `race_pacemaker` and `race_chasecam_*` may be shape-less complex one-shots.

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 12 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries. **Especially the Internal state entry (this batch's predecessor)** for: the F1/F3/F13 SKILL amendment validation status (F13 confirmed, F1 partial, F3 dormant); the `_k_*` prefix-as-Shape-9b finding; the `_k_pow_last` ↔ `k_pow` cross-batch See-also gap.
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- 5 procedural detail files.
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-internal-state.md` -- prior batch's `## Cross-card consistency notes` section (F1-F6). F1 (`_k_*` prefix heuristic), F4 (SKILL amendment validation status), F6 (vestigial Shape 9b pattern) are reusable context.
5. Per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (Step 1 CF-flag extraction amendment now load-bearing for 29 commands)
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 1 manual-flip variant section (2026-05-27 amendment)** is load-bearing for this batch; race subsystem likely has manual-flip toggles. Also re-read Shape 1c (mode-precondition) -- many race commands gate on `isRACE()`.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` -- **CF-flag-to-wording table is load-bearing for ALL 29 commands' Permission lines.**
   - `~/.claude/skills/ktx-l1-rewrite/references/worked-examples.md`.
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md` -- watch out for trigger-4 sui-generis candidates in `race_pacemaker` / `race_chasecam_*` / `race_dl_record_demo`.

---

## Critical rules

1. **chunk_size=9 recommended for this batch.** 45 entities → 5 chunks of 9+9+9+9+9 = 45. Clean parallelism, 5 sub-agents. Match flow shipped at chunk_size=9 (71 cards = 8 chunks) without context issues.

2. **/tmp FILENAME CONVENTION** (F13 amendment, confirmed working) -- sub-agent prompts MUST instruct: "Write to `/tmp/chunk_<id>_2026-05-27.md` (batch-date-suffixed). Use the `Write` tool, NOT `Edit`." Dispatcher validates each scratch file's section count + entity-name list BEFORE assembly.

3. **CF FLAG MANDATORY EXTRACTION** (F1 amendment, F1 STRESS TEST THIS BATCH) -- sub-agent prompts MUST instruct: "For each command entity in your chunk (this batch has many -- expect 4-7 commands per chunk), extract the exact `CF_<flags>` value from the registration row in `src/commands.c` into your Step 1 output. Map the CF flag(s) to the Permission line via the table in `universal-shape-v2.md`. Do NOT infer Permission from the existing description's prose. The registration row is authoritative."

4. **MANUAL-FLIP SHAPE 1 VARIANT** (F3 amendment, F3 FIRST REAL TEST) -- sub-agent prompts MUST instruct: "If a paired toggle command flips its cvar via `cvar_fset` or `trap_cvar_set_float` (not `cvar_toggle_msg`), classify as **Shape 1 (functional)** with a one-line Notes entry. Do NOT force to shape-less -- the cvar+command relationship is what Shape 1 captures." **Likely triggered in this batch** -- `race_toggle` may use manual flip; check via grep.

5. **THE THREE SUB-AGENT DISCIPLINES** (above) must remain in every chunk prompt.

6. **Race subsystem source path** -- sub-agents grep BOTH `src/commands.c` / `src/world.c` AND `src/race.c` for handler implementations. Most race command handlers live in `race.c`, not `commands.c`. Make sure the chunk prompts mention this.

7. **`isRACE()` mode-precondition pattern** -- many race commands likely gate on `isRACE()`. This is a Shape 1c / Shape 4 composition signal. Sub-agents should treat the mode gate as a Prerequisites line, NOT a Permission line.

8. **Cross-batch See-also threading from Internal state**:
   - `_k_pow_last`, `_k_last_xonx` -- already drafted; Race-mode game-mode commands may need cross-references back.
   - `k_pow` (Gameplay rules batch) -- cross-batch See-also gap to `_k_pow_last`; the apply-pass-author will fix when applying Gameplay rules drafts; not your concern unless race entities also reference `k_pow`.

9. **Race + Gameplay rules cross-references**:
   - `k_noitems` (Gameplay rules) -- gated to exclude Race mode (`match.c:1608` adds "NoItems on" only if NOT Race).
   - `k_pow` / powerups (Gameplay rules) -- Race mode applies the `race_settings[]` ruleset which forces specific powerup state. Verify via `race.c` handler bodies.
   - The race mode application logic at `race.c:292+` (`apply_race_settings()` / `norace_settings[]`) is the source of truth for "what race mode does to existing rules".

10. **DISPATCHER OVERRIDE on sub-agent file-writes** -- each sub-agent prompt MUST instruct: "DO NOT write per-batch drafts/park files. RETURN YAML report only; write chunk's assembled section content to `/tmp/chunk_<X>_2026-05-27.md` in ONE Write tool call (NOT Edit). Dispatcher assembles atomically at Step 6."

11. **HANDOFF-DOC CLAIMS ARE HYPOTHESES, NOT CONTRACTS** -- if a sub-agent's source check contradicts a handoff-doc claim (e.g. "race_toggle uses manual flip" turns out to be `cvar_toggle_msg`; "race_pacemaker is sui-generis" turns out to be Shape 1c), TRUST SOURCE. Flag in YAML report; cross-card pass surfaces as a finding. Prior batches have done this 6+ times.

12. **Halt-on-novelty likely candidates this batch**:
    - **`race_pacemaker`**: server-side bot-driven pacemaker mechanism. May be sui-generis (trigger 4) if no analog elsewhere in catalog. Watch carefully.
    - **`race_chasecam` / `race_chasecam_view` / `race_chasecam_freelook`**: may be sui-generis spec-side commands. Verify in `race.c`.
    - **`race_dl_record_demo`**: client-side demo-download trigger. May be sibling of `mapslist_dl` / `cmdslist_dl` (shape-less internal mechanism) -- if so, classify shape-less. If the mechanism is unique, trigger 4.
    - **`race_set_falsestart`**: edge mechanism in race-route definition. Verify.

13. **Stage explicit files only**. `git add HANDOVER.md <drafts-file> <park-file-if-any>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.

14. **Commit message format**: `docs(ktx-l1-rewrite): SHIPPED Race category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=9`.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator.

Then read the 5 dispatcher references + per-card references per "Reads required" above.

### Action 2: Pre-fetch the 45 Race entities

```bash
python3 -c "
import re, json, html as htmlmod
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 13885, 15211
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
        'category': 'Race',
        'existing_description': htmlmod.unescape(desc.group(1).strip()) if desc else None,
        'source_ref': src.group(1) if src else None,
        'catalog_line': sl,
        'anchor_version': 'v1.36-1633-g67253dc',
        'batch_date': '2026-05-27',
    })
with open('/tmp/race-entities.json', 'w') as f: json.dump(results, f, indent=2)
print(f'Total: {len(results)}')
"
```

Expected: **45 entities (16 cvars + 29 commands)**. Verify badge mix matches.

**Suggested chunk plan** (5 chunks of 9, family-grouped):

- **Chunk A (9): Core race control + countdown** -- `k_race`, `race_toggle`, `race_ready`, `race_break`, `race_break_all`, `race_cancel`, `race_countdown_up`, `race_countdown_down`, `k_race_countdown`. **Likely Shape 1 + Shape 1c heavy** (`k_race` + `race_toggle` is the master toggle pair; `race_break` / `race_break_all` / `race_cancel` are race-mode commands with mode-precondition).
- **Chunk B (9): Pace / pacemaker family** -- `k_race_pace_enabled`, `k_race_pace_headstart`, `k_race_pace_jumps`, `k_race_pace_legal`, `k_race_pace_resolution`, `k_race_simultaneous`, `race_pacemaker`, `race_simultaneous`, `k_race_autorecord`. **Mix of Shape 3 (cvars) + Shape 4 gates** (`k_race_pace_enabled` likely gates `race_pacemaker`). `race_pacemaker` is a watch-out -- may be sui-generis.
- **Chunk C (9): Route definition (setters)** -- `k_race_route_mapname`, `k_race_route_number`, `race_set_start`, `race_set_finish`, `race_set_checkpoint`, `race_del_checkpoint`, `race_set_falsestart`, `race_set_timeout`, `race_set_weapon_mode`. **Shape 9a candidates** for the `k_race_route_*` cvars (likely set via `race_route_switch` arg-syntax). `race_set_*` commands are mode-precondition + admin-level edits.
- **Chunk D (9): Route + match mode** -- `race_route_switch`, `race_route_clear`, `k_race_match`, `k_race_match_rounds`, `race_match`, `k_race_scoring_system`, `race_scoring`, `k_race_times_per_port`, `k_race_custom_models`. **Mix of Shape 1, Shape 3, Shape 4**.
- **Chunk E (9): Display + chase + demo** -- `race_chasecam`, `race_chasecam_view`, `race_chasecam_freelook`, `race_hide_players`, `race_show_lineup`, `race_show_record_details`, `race_show_route`, `race_show_toptimes`, `race_dl_record_demo`. **Likely shape-less heavy** (state-printers + display commands). `race_chasecam_*` and `race_dl_record_demo` are watch-outs.

Adjust empirically based on the pre-fetched JSON.

### Action 3: Dispatch 5 sub-agents in parallel

Use the Agent tool, `subagent_type=general-purpose`, `model=sonnet`. Each sub-agent prompt follows the chunk-prompt template (see commit `ce21cd43`'s sub-agent prompts for the latest structure -- they include all 3 SKILL amendments + 3 sub-agent disciplines). Each prompt MUST include:
- Skill loading instructions (7 files: SKILL.md + 6 references) -- the amendments are LIVE in those files; sub-agents reading SKILL.md + references will pick them up cold-load.
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE: return YAML, write to `/tmp/chunk_<id>_2026-05-27.md`, use Write not Edit.
- **THE 3 SUB-AGENT DISCIPLINES**
- Cross-batch context briefing (Race is **shape-rich, command-heavy**; F1 stress test on 29 commands; F3 first real test on Shape 1 manual-flip)
- **CF FLAG MANDATORY EXTRACTION** (per F1 amendment -- reinforce in prompt)
- **MANUAL-FLIP SHAPE 1 VARIANT** (per F3 amendment -- reinforce in prompt; ACTIVE for this batch)
- **Race subsystem source path** -- `src/race.c` is the handler location for most race commands
- **`isRACE()` mode-precondition** -- common gate; surface as Prerequisites, not Permission
- Output format spec

After all sub-agents return:
- **Validate each scratch file**: section count = expected entity count; entity-name list matches chunk input list.
- Aggregate verdicts.
- Run marker/Status/YAML consistency scan.
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue). **`race_pacemaker`, `race_chasecam_*`, `race_dl_record_demo` are watch-out entities.**
- Cross-card synthesis (expect **10-15 findings** -- shape-rich category, more commands = more F1 mislabel surface potential).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-race.md` (sub-grouping by family).
- Park file if applicable.
- Append HANDOVER followup entry mirroring the Internal state entry shape.
- Commit per the message format.

---

## Watch-outs for Race

1. **F1 SKILL amendment stress test (29 commands)** -- this is the real test. If sub-agents produce CF-flag-correct Permission lines on all 29 commands, the amendment is shipping-ready. If multiple Permission mislabels surface, the amendment needs refinement (e.g. promote to Step 5 mandatory check, or stronger template language). Track per-command Permission accuracy in the cross-card pass.

2. **F3 manual-flip Shape 1 first real test** -- check via grep BEFORE dispatching whether `race_toggle` flips `k_race` via `cvar_toggle_msg` (canonical) or `cvar_fset` (manual-flip variant). If manual, the F3 amendment must classify it as Shape 1 (functional). Cross-card pass surfaces F3 trigger status.

3. **Race subsystem (`src/race.c`)** -- ~70% of race command handlers live here. Sub-agent prompts must call this out explicitly. The dispatcher pre-flight reads should include a quick `ls /home/paradoks/projects/quakeworld/research/repos/ktx/src/race*.c` to confirm files (probably `race.c` + maybe `race_admin.c` / `race_routes.c` depending on KTX version).

4. **`race_pacemaker` sui-generis check** -- per the existing description: "server-controlled pacemaker bot that runs alongside racers". This is likely a unique mechanism with its own state-machine. Sub-agent should verify the mechanism via source; if no catalog shape matches, park (trigger 4 -- HALT batch). If it's Shape 4 (`k_race_pace_enabled` gate) + shape-less command body, draft normally.

5. **`race_chasecam_*` and `race_hide_players`** -- spectator-side race-display commands. May be Shape 1 toggles, may be shape-less one-shots, may be sui-generis spec-mode commands. Source-verify carefully.

6. **`race_dl_record_demo` shape check** -- per name, server-stuffed client-side download trigger. Likely sibling of `mapslist_dl` / `cmdslist_dl` (shape-less internal mechanism). Verify CF flags (`CF_NOALIAS`?) and self-recursion pattern. If yes -- shape-less, draft normally with `mapslist_dl` See-also. If different mechanism -- careful.

7. **`isRACE()` predicate as Prerequisites pattern** -- many race commands check `isRACE()` at the top of the handler. This is a mode-precondition (Shape 1c pattern's mode-gate). Surface as Prerequisites: "Requires race mode active (k_race must be set)". Cross-card discipline: every race-mode-gated command's Prerequisites line is consistent.

8. **`k_race_pace_enabled` likely Shape 4 gate** -- gates `race_pacemaker` (and possibly `race_set_falsestart`?). Cross-link both ways in See-also.

9. **`k_race_route_*` cvars (Shape 9a candidates)** -- if `race_route_switch` writes `k_race_route_mapname` and `k_race_route_number` via arg-syntax, these are Shape 9a side-channel cvars. Verify via source.

10. **Cross-batch Race-mode interaction with Gameplay rules**:
    - `apply_race_settings()` at `race.c:292+` installs the race ruleset. The `race_settings[]` and `norace_settings[]` arrays carry the cvar values applied.
    - `k_pow` is forced off in Race; `k_noitems` is conceptually "always on" in Race (per `match.c:1608` exclusion).
    - These cross-batch interactions are apply-pass concerns; Race drafts should mention them in See-also when relevant.

11. **Cumulative SKILL-amendment lessons summary** -- the apply-pass-author will tackle 12 batches of drafts in order. By the time they reach Race, they will have seen:
    - 7 batches' worth of F1 Permission mislabel residue (pre-amendment).
    - 0 batches' worth of F1 residue (post-amendment) -- Internal state was the first; Race + Player communication finish the validation arc.
    - The apply pass should be MUCH cleaner for Race + Player communication than for earlier batches.

12. **Largest remaining batch -- prepare for context budget** -- 45 entities at chunk_size=9 = 5 chunks. Each sub-agent processes 9 entities × ~15-20k context = ~135-180k per chunk; Sonnet 4.6's 200k window has plenty of headroom. No concern.

---

## Cross-batch state at end of Internal state ship

- **Cumulative drafted**: 550 / 633 = ~87%
- **Parks**: 5 (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting)
- **Aborted-to-synthesis**: 1 (`k_sready` -- queued for describe-fill-synthesis)
- **Apply pile**: 12 batches' worth of drafts file pending operator apply pass. The apply pass operates per-batch in commit order.
- **Categories remaining**: Race (45, this batch) → Player communication (18) = 63 entities across 2 categories.

---

## Open follow-ups (cross-batch, not for this batch)

These were captured during Internal state ship (commit `ce21cd43`) but are NOT this batch's scope:

1. **F3 `_k_pow_last` ↔ `k_pow` cross-batch See-also fix** -- at apply time, add `_k_pow_last (engine carry-over state-mirror -- seeds first-frame powerup check after map transition)` to `k_pow`'s See-also when applying Gameplay rules drafts.
2. **F1 `_k_*` prefix as Shape 9b identification heuristic** -- operator decides whether to amend `shape-catalog.md` Shape 9 identification guide. 17 instances confirmed in Internal state batch; naming-hint candidate.
3. **F1 SKILL amendment ongoing validation** -- this batch (Race 29 commands) + next batch (Player communication ~10-15 commands estimated) finish the validation arc.
4. **F11 freeze ↔ k_freeze cross-batch See-also fix** (carry-over from Gameplay rules) -- at apply time, add `freeze` to Match flow batch's `k_freeze` See-also.
5. **F2 default-value sweep** -- cumulative across batches now totals ~12 cvars; apply-pass-author audit candidate.
6. **F6 vwep family L3 concept-note** -- queued in concept-note backlog.

---

## When in doubt

- Source over handoff (Rule 11 -- prior batches have overridden handoff hypotheses 6+ times).
- Source over existing description (Step 3 spot-check discipline; flag localized contradictions, park foundational ones).
- Park trigger 1 / 4 → HALT batch and surface to operator (never extend catalog from sub-agent).
- Park trigger 2 / 3 → continue batch; flag in cross-card.
- /tmp file collision → use line-range slicing recovery (F13 precedent) AND flag if it happens (amendment didn't take).

The amendment trio is shipping-ready (F13) or near-ready (F1 partial validated, F3 dormant). This batch validates F1 at scale (29 commands) and F3 in production (Shape 1 manual-flip pattern). Player communication is the cleanup batch that closes KTX L1 at 100%.
