# Handoff -- ktx-l1-rewrite Player communication batch (**FINAL KTX L1 batch -- finishes catalog at 100%**)

**Date drafted**: 2026-05-27
**Drafted by**: Race ship session (commit `b428e6dd`)
**For**: fresh terminal dispatching the Player communication ktx-l1-rewrite batch
**Target**: Player communication category (18 cards -- **all commands, zero cvars**) -- recommended `chunk_size=9` (2 chunks of 9). chunk_size=6 also viable (3 chunks of 6).
**Sized**: ~45-60 min wall-clock. Smallest remaining KTX category but **densely Shape-6 / Shape-7-canonical-card-pattern heavy** -- this batch carries the canonical worked-examples for mmode (Shape 6) and ksound1-6 (Shape 7 fan-out + canonical-card pattern). **The F1-amendment final validation batch** + the dormant-or-confirm-dormant decision point for F3.

---

## Where things are

Chunked-mode pattern is **thirteen times validated** (13 prior batches shipped):
- Scoring & stats: chunk_size=6 (19 cards)
- Mode selection: chunk_size=7 (28 cards)
- Mode-scoped knobs: chunk_size=8 (66 cards)
- Frogbot: chunk_size=10 (78 cards)
- Admin & permissions: chunk_size=10 (37 cards)
- Demo & spectator: chunk_size=10 (69 cards)
- Match flow: chunk_size=9 (71 cards)
- Gameplay rules: chunk_size=10 (69 cards)
- Internal state: chunk_size=7 (19 cards)
- Race: chunk_size=9 (45 cards, 31 drafted_clean + 14 flagged + 0 parked -- predecessor batch; F1 amendment stress-test PASSED, F3 dormant for top-level Shape 1, F13 confirmed working)

**Cumulative ktx-l1-rewrite progress**: 13 batches shipped, **595 of 633 KTX L1 entities = ~94% drafted**, **5 entities parked** (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting), **1 entity aborted-to-synthesis** (`k_sready`). Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Categories remaining after Player communication: 0.** This batch finishes KTX L1 at 100%.

**THE 3 SKILL AMENDMENTS (post-Race status)** -- landed 2026-05-27 after Gameplay rules ship:

1. **`~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` (F3)** -- Shape 1 source signature admits manual-flip variant (`cvar_fset` / `trap_cvar_set_float`). **DORMANT in Race** (all 3 Shape 1 paired toggles in Race used canonical `cvar_toggle_msg`). **Dormant in Internal state** (no Shape 1 toggles in batch). **EXPECTED DORMANT in Player communication** (zero cvars in batch, so zero Shape 1 cvar+toggle pairs at all). If F3 also dormant here -- which is the strongly expected outcome since this batch has no cvars -- **shelve F3 until MVDSV / QWFWD / QTV forks** per the Internal state batch's deferral (`HANDOVER.md` line 39 (iv)).

2. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md` (F1)** -- Step 1 Commands bullet MANDATES extracting exact `CF_<flags>` value from registration row into Step 1 output AND mapping via the CF-flag-to-wording table in `universal-shape-v2.md`. **SHIPPING-READY after Race** (~34% catch rate across 29 commands; 10 Permission mislabels caught + 1 silent correction). **Player communication is the final validation**: 18 commands across mixed CF flag groups (`CF_PLAYER`, `CF_PLAYER|CF_MATCHLESS`, `CF_BOTH|CF_MATCHLESS|CF_PARAMS`, `CF_PLAYER|CF_PARAMS|CF_MATCHLESS`, `CF_BOTH|CF_MATCHLESS`). Expect 3-7 F1 catches at the current rate.

3. **`~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` (F13)** -- Step 3 sub-agent dispatch documents the batch-date-suffixed `/tmp` filename convention. **FULLY VALIDATED** in Internal state (3 chunks) AND Race (5 chunks, 0 stale collisions). Preserve the convention here.

**Race batch lessons** (commit `b428e6dd`):
- chunk_size=9 sustained for 5 parallel chunks; no halt-on-novelty signals across 45 entities.
- 3 of 5 sub-agents omitted the `<!-- VERDICT: -->` markers (chunks C/D/E); 1 sub-agent had a Status-line drift on race_del_checkpoint (Status said `drafted` but YAML + FLAG: bullet both said `drafted_with_flag`). **Dispatcher caught all 4 via marker/Status consistency scan + cross-check against YAML verdicts; injected markers + fixed drift.** Marker omission is a recurring sub-agent compliance gap -- consider tightening the prompt template OR doing the Status-line-driven inject as a standard dispatcher step (which is the practical workaround that's been working).
- Rule 11 (source over handoff) caught 3 dispatcher-hypothesis corrections in Race: race_toggle ≠ k_race toggle; r_clear_route ≠ route cvar writer; k_race_countdown ≠ mid-run adjustable. Discipline continues to validate -- handoff-doc claims are HYPOTHESES, not contracts.
- F1 catch rate `~`34% in Race is the highest of any batch; F1 amendment is shipping-ready.
- F8 paired-numeric-adjuster pattern surfaced (k_race_countdown + race_countdown_up/down) -- catalog-amendment candidate if pattern recurs in future codebases.

**THREE SUB-AGENT-DISCIPLINE PROCEDURES** (still mandatory, bake into every chunk prompt):

1. **Verdict-marker internal-consistency check** -- for EVERY entity in your chunk: verify (a) the `<!-- VERDICT: X -->` marker matches the `**Status**: X` line; (b) the marker/Status matches your YAML report's `verdict` field; (c) if verdict is `drafted_with_flag`, Notes contains at least one bullet starting with `FLAG:`; (d) if verdict is `drafted`, Notes contains NO bullet starting with `FLAG:` -- use `Verification:` or plain bullets for clean spot-checks.

2. **`FLAG:` prefix discipline** -- use `FLAG:` ONLY for localized factual contradictions the apply-pass-author must verify before applying. For spot-check reasoning that concluded clean, use `Verification:` or a plain bullet -- DO NOT use `FLAG:` as a "I investigated this" marker.

3. **Draft-vs-verified-content sanity check** -- before emitting your proposed draft, verify EVERY factual claim in Headliner / Effect / Prerequisites / Permission is supported by your Step 1.5 source-verified content or Step 3 spot-check. Watch enumerations line-by-line. **For Permission lines: every Permission line on a command MUST come from CF flag extraction per the F1 amendment, NOT from existing description's prose.**

**Shape catalog state**: 14+ shapes locked. Player communication is **shape-rich-narrow** -- only a few shapes apply but the ones that do are canonical:
- **Shape 6 (stateful + one-shot pair)** -- canonical worked-example IS mmode + s-p/s-r/s-m/s-l/s-t (see `worked-examples.md` Shape 6 section). **This batch carries the canonical Shape 6 cards**. `multi` (commands.c:939) is likely a Shape 6 stateful sibling for the multi-recipient mode that mmode dispatches to (need source verification via g_cmd.c:828-1130).
- **Shape 7 fan-out + canonical-card pattern** -- ksound1-6 are 6 near-identical siblings all using `DEF(TeamSay)` with arg values 1-6 (commands.c:770-775). **Canonical-card pattern target per worked-examples.md and shape-catalog.md** -- one canonical card (ksound1) + 5 reference cards (ksound2-6). The previous canonical-card pattern applied this batch: Demo & spectator (40 cards consolidated), Match flow (6 cards consolidated). Cumulative across chunked-mode era: 46 / 208 = ~22%.
- **shape-less** -- killer, victim, newcomer (separate handlers per command, prose-wrap message commands), tpmsg (teamplay-message wrapper), report (state-printer reporting player's own status to teammates).

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 13 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries. **Especially the Race entry (this batch's predecessor)** for: F1 amendment validation outcome (~34% catch rate, shipping-ready); F3 dormant in top-level Shape 1; F13 confirmed working; Rule 11 corrections (3 caught); F8 paired-numeric-adjuster candidate shape; sub-agent VERDICT-marker omission gap (3 of 5 sub-agents in Race).
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- 5 procedural detail files.
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-race.md` -- the predecessor batch's `## Cross-card consistency notes` section (F1-F12). F1 (F1 amendment validation), F2 (F3 dormant + sub-action manual-flip signal), F11 (Rule 11 corrections), F12 (See-also bidirectional spot-check) are reusable context.
5. Per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (Step 1 CF-flag extraction amendment is load-bearing for 18 commands)
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 6 section + Shape 7 canonical-card pattern + Shape 7b fan-out modifier** are load-bearing for this batch.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` -- **CF-flag-to-wording table is load-bearing for ALL 18 commands' Permission lines.**
   - `~/.claude/skills/ktx-l1-rewrite/references/worked-examples.md` -- **Shape 6 worked example IS mmode + s-* family (this batch's entities)**; Shape 7 fan-out + canonical-card pattern reference.
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md` -- park triggers + drafts-file format.

---

## Critical rules

1. **chunk_size=9 recommended for this batch.** 18 entities → 2 chunks of 9+9 = 18. Clean parallelism, 2 sub-agents. chunk_size=6 (3 chunks of 6+6+6) is also viable if family-grouping favors it. Pick whichever respects family boundaries cleanly.

2. **/tmp FILENAME CONVENTION** (F13 amendment, confirmed working in Internal state + Race) -- sub-agent prompts MUST instruct: "Write to `/tmp/chunk_<id>_2026-05-27.md` (batch-date-suffixed). Use the `Write` tool, NOT `Edit`." Dispatcher validates each scratch file's section count + entity-name list BEFORE assembly.

3. **CF FLAG MANDATORY EXTRACTION** (F1 amendment, Race-validated at ~34% catch rate) -- sub-agent prompts MUST instruct: "For each command entity in your chunk (this batch is 100% commands -- expect 9 per chunk), extract the exact `CF_<flags>` value from the registration row in `src/commands.c` into your Step 1 output. Map the CF flag(s) to the Permission line via the table in `universal-shape-v2.md`. Do NOT infer Permission from the existing description's prose. The registration row is authoritative."

4. **MANUAL-FLIP SHAPE 1 VARIANT** (F3 amendment) -- **expected dormant**: this batch has zero cvars, so zero Shape 1 cvar+toggle pairs. Include the standard F3 instruction in chunk prompts for consistency but expect zero triggers. **If still dormant after this batch, shelve F3 until MVDSV / QWFWD / QTV forks.**

5. **THE THREE SUB-AGENT DISCIPLINES** (above) must remain in every chunk prompt.

6. **MARKER INJECTION FALLBACK** -- Race observed 3 of 5 sub-agents omitting the `<!-- VERDICT: -->` markers. Dispatcher recovered via Status-line cross-check + automated marker injection (see Race dispatch transcript). **Bake the marker instruction more prominently in chunk prompts this batch** -- consider promoting from "Lead each section with `<!-- VERDICT: ... -->`" to a dedicated bullet under sub-agent discipline 1 ("MUST emit VERDICT comment immediately before each `## <entity>` header"). If sub-agents still omit, fall back to dispatcher-side injection (Race recipe works).

7. **Source paths** -- sub-agents grep:
   - `src/commands.c` for command registration rows (all 18 entities) AND for the TeamSay handler at commands.c:3377 + report handler at commands.c:2562 + killer/victim/newcomer handlers at commands.c:1792-1810
   - `src/g_cmd.c` for mmode (g_cmd.c:1092), multi (g_cmd.c:828), and the multi_do helper (g_cmd.c:845) -- the Shape 6 stateful side mechanism
   - `src/teamplay.c` for TeamplayMessage (teamplay.c:1687) -- tpmsg handler
   - `src/g_userinfo.c` for the `kf` userinfo handler (g_userinfo.c:65) -- referenced by ksound1-6 via `iKey(p, "kf") & KF_KTSOUNDS` (commands.c:3385)

8. **Cross-batch See-also threading**:
   - **ksound1-6 → `kf` userinfo key + `KF_KTSOUNDS` bit** -- `kf` is in Server config & network batch (drafted 2026-05-23). Cross-batch reference is necessary; the `kf` card was drafted with the bitmask documented.
   - **mmode + s-* + multi → engine `messagemode 1/2/3` disambiguation** -- the Shape 6 worked example explicitly calls out this naming-collision disambiguation. Surface as a "Not to be confused with engine messagemode 1/2/3" paragraph in mmode's Headliner per the Shape 6 canonical pattern.
   - **silence (Spectator chat & visibility batch 2026-05-25)** -- if any Player communication card references the per-spectator-mute or server-wide-spec-talk gate, See-also to `silence` (already drafted as Shape 1 + Shape 11b per the prior batch).
   - **Per the Race batch's F12 finding**: do a bidirectional See-also spot-check across in-batch sibling pairs (ksound family, s-* family, mmode↔s-*, multi↔mmode, killer↔victim, etc.) -- 22 of 25 pairs were symmetric in Race; aim for the same discipline.

9. **CANONICAL-CARD PATTERN for ksound1-6** (load-bearing this batch) -- per `worked-examples.md` Shape 7 fan-out section: ONE canonical card (ksound1) carries the full v2 description; the other 5 (ksound2-6) are short reference cards pointing at it with per-sibling delta only (sound index 2/3/4/5/6). **Apply the pattern; do not draft 6 near-identical full cards**. The chunk prompt MUST instruct this explicitly to prevent 5 cards of 95%-duplicate content.

10. **Shape 6 worked example IS this batch's mmode + s-* family** -- the worked-examples.md draft for mmode is already a v2 draft (in the findings file). **Sub-agents should follow that draft's pattern**: stateful-side card (mmode) lists recipient modes as scannable block + names the consumer (`say` via ClientSay); one-shot-side cards (s-p, s-r, s-m, s-l, s-t) are minimal Headliners pointing at mmode + sibling one-shots. `multi` is likely a Shape 6 stateful sibling for the multi-recipient mode (source-verify via g_cmd.c:828 and g_cmd.c:845 multi_do helper).

11. **HANDOFF-DOC CLAIMS ARE HYPOTHESES, NOT CONTRACTS** -- if a sub-agent's source check contradicts a handoff-doc claim (e.g. "multi is a Shape 6 stateful sibling" turns out to be a one-shot for the multi-mode; "report is shape-less state-printer" turns out to write a cvar or have an unusual mechanism), TRUST SOURCE. Flag in YAML report; cross-card pass surfaces as a finding. Race had 3 such Rule-11 catches; the discipline continues.

12. **Halt-on-novelty likely candidates this batch**:
    - **`multi`**: registered separately from mmode (commands.c:939) but the handler at g_cmd.c:828 is a wrapper around `multi_do()` (g_cmd.c:845) which is ALSO called from mmode's handler when mmode's first arg is "multi". The mechanism may be a Shape 6 stateful sibling OR a syntactic alias. Source-verify carefully. If neither shape-less nor Shape 6 fits, possible trigger 1 or 4 -- HALT.
    - **`report`**: `ReportMe` at commands.c:2562 (in commands.c, not weapons.c despite the forward declaration there). Likely a Shape-less state-printer (reports the player's own state to teammates -- weapon/ammo/powerups). Verify mechanism; if it has an unusual side-effect or different shape, watch carefully.
    - **`tpmsg`**: `TeamplayMessage` at teamplay.c:1687. CF_PLAYER | CF_PARAMS | CF_MATCHLESS. Likely a wrapper for chat substitutions / teamplay-flavored say. Verify the handler doesn't have a novel mechanism.
    - **`newcomer`**: separate handler (`SendNewcomerMsg` at commands.c:1802). The only `CF_BOTH` one of killer/victim/newcomer (`CF_BOTH | CF_MATCHLESS` -- spectators CAN run it). The CF asymmetry between killer/victim (CF_PLAYER) and newcomer (CF_BOTH) is worth a one-line note.

13. **Stage explicit files only**. `git add HANDOVER.md <drafts-file>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.

14. **Commit message format**: `docs(ktx-l1-rewrite): SHIPPED Player communication category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=9`. **Add a footer paragraph noting this is the FINAL KTX L1 batch and the catalog is now at 100%.**

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator.

Then read the 5 dispatcher references + per-card references per "Reads required" above.

### Action 2: Pre-fetch the 18 Player communication entities

**Pre-fetched already by the Race ship session** at `/tmp/player-communication-entities.json` (18 entities, all commands, zero cvars). If the file exists and is intact (18 entities, category = "Player communication"), skip the pre-fetch. If `/tmp` has been wiped (reboot between sessions), regenerate:

```bash
python3 -c "
import re, json, html as htmlmod
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-26-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 13377, 13885
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
        'category': 'Player communication',
        'existing_description': htmlmod.unescape(desc.group(1).strip()) if desc else None,
        'source_ref': src.group(1) if src else None,
        'catalog_line': sl,
        'anchor_version': 'v1.36-1633-g67253dc',
        'batch_date': '2026-05-27',
    })
with open('/tmp/player-communication-entities.json', 'w') as f: json.dump(results, f, indent=2)
print(f'Total: {len(results)}')
"
```

Expected: **18 entities (all commands, zero cvars)**.

**Pre-verified CF flag distribution** (from Race-session source recon at commands.c:746-1052):

| Entity | CF flags | Permission per universal-shape-v2.md table |
|---|---|---|
| ksound1-6 (6 cards) | `CF_PLAYER` alone | "any player (spectators excluded)" |
| killer | `CF_PLAYER \| CF_MATCHLESS` | "any player (spectators excluded)" + matchless |
| victim | `CF_PLAYER \| CF_MATCHLESS` | "any player (spectators excluded)" + matchless |
| newcomer | `CF_BOTH \| CF_MATCHLESS` | "any player or spectator" + matchless |
| s-p, s-l, s-r, s-t, s-m (5 cards) | `CF_BOTH \| CF_MATCHLESS \| CF_PARAMS` | "any player or spectator" + matchless |
| mmode | `CF_BOTH \| CF_MATCHLESS \| CF_PARAMS` | "any player or spectator" + matchless |
| multi | `CF_BOTH \| CF_MATCHLESS \| CF_PARAMS` | "any player or spectator" + matchless |
| tpmsg | `CF_PLAYER \| CF_PARAMS \| CF_MATCHLESS` | "any player (spectators excluded)" + matchless |
| report | `CF_PLAYER` | "any player (spectators excluded)" |

**Suggested chunk plan** (2 chunks of 9, family-grouped):

- **Chunk A (9): Shape 6 family + tpmsg + report** -- `mmode`, `multi`, `s-p`, `s-r`, `s-m`, `s-l`, `s-t`, `tpmsg`, `report`. **Shape 6 stateful + one-shot pair + multi-recipient sibling**; tpmsg is shape-less teamplay-message wrapper; report is shape-less state-printer. Canonical worked-example for Shape 6 is centered on this chunk.
- **Chunk B (9): Shape 7 fan-out + message commands** -- `ksound1`, `ksound2`, `ksound3`, `ksound4`, `ksound5`, `ksound6`, `killer`, `victim`, `newcomer`. **Shape 7 fan-out with canonical-card pattern MANDATORY** for ksound1-6 (one canonical card + 5 reference cards). killer/victim/newcomer are shape-less separate-handler message commands.

Adjust empirically based on the pre-fetched JSON if any surprises surface.

### Action 3: Dispatch 2 sub-agents in parallel

Use the Agent tool, `subagent_type=general-purpose`, `model=sonnet`. Each sub-agent prompt follows the chunk-prompt template (see commit `b428e6dd`'s sub-agent prompts for the latest structure -- they include all 3 SKILL amendments + 3 sub-agent disciplines). Each prompt MUST include:
- Skill loading instructions (7 files: SKILL.md + 6 references) -- the amendments are LIVE in those files
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE: return YAML, write to `/tmp/chunk_<id>_2026-05-27.md`, use Write not Edit.
- **THE 3 SUB-AGENT DISCIPLINES**
- **MARKER-EMISSION DIRECTIVE PROMOTED** (Race lesson: 3 of 5 sub-agents omitted markers): bake `<!-- VERDICT: ... -->` emission into Discipline 1 as a MUST, not just an F13 sub-bullet.
- Cross-batch context briefing (Player communication is **18 commands, 0 cvars; Shape 6 + Shape 7 canonical-card-pattern heavy**; F1 final validation; F3 expected dormant)
- **CF FLAG MANDATORY EXTRACTION** (per F1 amendment) + the pre-verified CF flag table for chunk's entities
- **CANONICAL-CARD PATTERN MANDATORY for ksound1-6** (per worked-examples.md Shape 7 + canonical-card pattern)
- **Shape 6 worked-example IS mmode + s-* family** (sub-agents follow worked-examples.md Shape 6 draft pattern)
- Source paths: commands.c + g_cmd.c (mmode/multi) + teamplay.c (tpmsg) + g_userinfo.c (kf reference for ksound1-6 See-also)
- Cross-batch See-also targets: kf userinfo key (Server config & network 2026-05-23), engine messagemode disambiguation (mmode Headliner), silence (Spectator chat & visibility 2026-05-25 if relevant)
- Output format spec

After both sub-agents return:
- **Validate each scratch file**: section count = expected entity count; entity-name list matches chunk input list.
- Aggregate verdicts.
- Run marker/Status/YAML consistency scan (Race recipe: cross-check Status against YAML verdicts, inject missing markers via dispatcher-side Python if needed).
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue). **`multi`, `report`, `tpmsg`, `newcomer` are watch-out entities.**
- Cross-card synthesis (expect **6-10 findings** -- smaller batch, but Shape 6 + Shape 7 canonical-card discipline + cross-batch See-also threading produce concentrated synthesis surface).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-player-communication.md` (sub-grouping by family).
- No park file expected (Player communication mechanisms all map cleanly to existing shapes).
- Append HANDOVER followup entry mirroring the Race entry shape (with **FINAL BATCH milestone footer**).
- Commit per the message format + add **catalog-100%-complete** footer paragraph.

---

## Watch-outs for Player communication

1. **F1 SKILL amendment final validation (18 commands)** -- this is the closing test. Expect 3-7 F1 catches at the current ~34% rate. If catch rate holds, F1 ships permanently. If catch rate drops to near zero (existing descriptions all happen to be CF-correct), document as "F1 validated; some categories have lower mislabel density than others; amendment still shipping-ready."

2. **F3 expected dormant** -- zero cvars in this batch means zero Shape 1 cvar+toggle pairs. If still dormant, shelve F3 per the Internal state batch's deferral. The amendment text stays in `shape-catalog.md` for future fork use (MVDSV / QWFWD / QTV).

3. **Shape 6 canonical worked-example IS this batch's mmode + s-* family** -- the worked-examples.md Shape 6 section has a full v2 draft for mmode that sub-agents should follow as the template. mmode card includes:
   - "Not to be confused with engine messagemode 1/2/3" disambiguation in Headliner (load-bearing).
   - Recipient modes (off, player, team, multi, name, rcon) as scannable block.
   - Effect describes state-set (sets `*mm`/`*mp`/`*mt`/`*mu`/`*ml` userinfo keys) + names consumer (`ClientSay` reads `*mm` to route subsequent `say` messages).
   - See-also: one-shot counterparts (s-p, s-r, s-m, s-l, s-t), consumer command (`say`), nearby disambiguation (engine `messagemode 1/2/3`).

4. **Canonical-card pattern for ksound1-6 is MANDATORY** -- per worked-examples.md Shape 7 fan-out modifier + canonical-card pattern. Layout:
   - ksound1 = CANONICAL card (full v2 description: Effect / Prerequisites / Permission / Example / See-also). Notes identifies as canonical for ksound family.
   - ksound2-6 = REFERENCE cards (Headliner only: "Plays the ksound N sound to your teammates (kf=N). See ksound1 for the full ksound-channel behavior. This command sends sound index N instead of 1."). Plus minimal See-also pointing at canonical + sibling ksounds.
   - **Sub-agent that drafts 6 full v2 ksound cards is violating canonical-card discipline** -- chunk prompt MUST instruct this explicitly.

5. **`multi` shape decision** -- registered separately from mmode (commands.c:939). Handler at g_cmd.c:828. The `multi_do()` helper at g_cmd.c:845 is also called from mmode when mmode's first arg is "multi" (`from_mmode=true`). Sub-agent decisions:
   - If `multi` is a syntactic alias for `mmode multi` (just calls multi_do(0, false)) → classify as Shape 6 stateful sibling (sets `*mu` userinfo key for multi-recipient mode).
   - If `multi` has its own distinct mechanism → source-verify and classify accordingly.

6. **`tpmsg` shape decision** -- handler `TeamplayMessage` at teamplay.c:1687. Likely a teamplay-message wrapper that processes macro chars (`%a`, `%l`, `%h`, etc.) and sends a teamsay. CF_PLAYER | CF_PARAMS | CF_MATCHLESS. Classify as shape-less prose-wrap command unless source shows otherwise.

7. **`report` shape decision** -- handler `ReportMe` at commands.c:2562 (in commands.c despite forward declaration at weapons.c:28). Likely a Shape-less state-printer reporting player's own weapon/ammo/powerup state to teammates. Verify the mechanism; if it has cvar-write side-effects or is more than a state-printer, surface in Notes.

8. **`newcomer` CF asymmetry vs killer/victim** -- newcomer is `CF_BOTH | CF_MATCHLESS` (spectators CAN run it); killer/victim are `CF_PLAYER | CF_MATCHLESS` (spectators excluded). One-line note in newcomer's card explaining why the asymmetry exists (likely because newcomer is a server-announcement-style command spectators can also invoke, while killer/victim refer to per-player events that require an in-match player perspective).

9. **Cross-batch See-also threading**:
   - ksound1-6 → `kf` userinfo key (Server config & network 2026-05-23 -- the cvar bit `KF_KTSOUNDS` gates whether ksound* affects teammates). Cross-batch reference is necessary.
   - mmode + s-* + multi → engine `messagemode 1/2/3` disambiguation in Headliner (not an L1 entity; mechanism label only).
   - If any card references `silence` (Spectator chat & visibility 2026-05-25, Shape 1 + Shape 11b) -- cross-batch See-also.

10. **Cumulative SKILL-amendment lessons summary** -- the apply-pass-author will tackle 13 batches of drafts in order. By the time they reach Player communication, they will have seen:
    - F1 mislabel residue in 7 pre-amendment batches.
    - F1-correct in Internal state (1 command), Race (29 commands), Player communication (18 commands) = 3 post-amendment batches.
    - The apply pass for Player communication should be ~clean for Permission lines if F1 catch rate holds.

11. **Final-batch context** -- after this ships, KTX L1 = 100% drafted (595 + 18 = 613 of 633; remaining 20 = 5 parks + 1 aborted-to-synthesis + 14 entities in some category-not-walked-yet OR... actually 633 - 595 - 18 - 5 - 1 = 14; this gap is worth verifying after the Player communication ship). The apply-pass + parks-hand-draft + synthesis-pile are the remaining workstreams; the chunked-mode dispatch arc CLOSES with this batch.

---

## Cross-batch state at end of Race ship

- **Cumulative drafted**: 595 / 633 = ~94%
- **Parks**: 5 (callalias / roundsdown / roundsup / y / n -- all queued for apply-pass hand-drafting)
- **Aborted-to-synthesis**: 1 (`k_sready` -- queued for describe-fill-synthesis)
- **Apply pile**: 13 batches' worth of drafts file pending operator apply pass. The apply pass operates per-batch in commit order.
- **Categories remaining**: Player communication (18, THIS batch) → done. 14 entities of 633 are unaccounted in my running tally; the operator may want to audit the catalog HTML index for any missed category buckets after this batch ships.

---

## Open follow-ups (cross-batch, not for this batch)

These were captured during Race ship (commit `b428e6dd`) but are NOT this batch's scope:

1. **F1 SKILL amendment shipping decision** -- Player communication is the final validation; if catch rate holds, no further amendment needed.
2. **F3 manual-flip Shape 1 amendment** -- if Player communication also dormant (expected), shelve until MVDSV / QWFWD / QTV forks per Internal state batch's deferral.
3. **F8 paired-numeric-adjuster shape candidate** (from Race) -- track if pattern recurs in future codebases.
4. **F9 pacemaker family L3 concept-note** (from Race) -- apply-pass / operator-side authoring follow-up.
5. **F10 cross-batch See-also k_race ↔ `race`** (from Race) -- apply Mode selection drafts before/with Race drafts.
6. **F3 cross-batch See-also `_k_pow_last` ↔ `k_pow`** (from Internal state) -- apply-pass-author adds back-link.
7. **F1 `_k_*` prefix as Shape 9b identification heuristic** (from Internal state) -- operator decides whether to amend `shape-catalog.md` Shape 9 identification guide.
8. **VERDICT-marker omission gap** (from Race) -- consider promoting marker emission to a primary sub-agent discipline OR baking dispatcher-side injection as a standard post-chunk step.
9. **F11 freeze ↔ k_freeze cross-batch See-also fix** (from Gameplay rules) -- apply-pass-author adds `freeze` to Match flow's `k_freeze` See-also at apply time.
10. **F2 default-value sweep** -- cumulative across batches now totals ~17 cvars across 6 batches; apply-pass-author one-time audit candidate.
11. **vwep family L3 concept-note** (from Gameplay rules) -- queued in concept-note backlog.
12. **633-vs-running-tally gap audit** -- after this batch ships and total reaches 613, verify the 20-entity gap is fully accounted for (5 parks + 1 aborted + 14 ???).

---

## When in doubt

- Source over handoff (Rule 11 -- Race caught 3 corrections; Demo & spectator F5/F8 + Match flow F7/F8 + Gameplay rules F4/F5 + Internal state F4 + Race F11 all reinforce the discipline).
- Source over existing description (Step 3 spot-check discipline; flag localized contradictions, park foundational ones).
- Park trigger 1 / 4 → HALT batch and surface to operator (never extend catalog from sub-agent).
- Park trigger 2 / 3 → continue batch; flag in cross-card.
- /tmp file collision → batch-date-suffixed filenames prevent this (F13 confirmed working in Race + Internal state).
- VERDICT-marker omission → dispatcher-side Status-line-driven injection (Race recipe works; bake into post-chunk validation step).

**This is the closing batch.** Shape coverage is concentrated (Shape 6 + Shape 7 canonical-card-pattern + shape-less), the F1 amendment is shipping-ready, F3 is expected dormant, and the catalog finishes at 100% on commit. After this batch lands, the chunked-mode dispatch arc for KTX L1 closes -- the operator's queue narrows to apply-pass + 5 hand-drafted parks + 1 describe-fill-synthesis entity (k_sready) + the open-follow-ups list above.
