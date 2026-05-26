# Handoff -- ktx-l1-rewrite Frogbot batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-26
**Drafted by**: Mode-scoped knobs batch ship session (commit `75b9f1fc`)
**For**: fresh terminal dispatching the next ktx-l1-rewrite batch
**Target**: Frogbot category (78 cards) -- recommended chunk_size=10 (8 chunks of 10, or 7 of 10 + 1 of 8)
**Sized**: ~2-2.5 hours wall-clock (8 parallel sub-agents + cross-card synthesis + commit). Largest batch yet; Shape 8 parent-dispatcher pattern dominates so per-card depth is moderate but breadth is wide.

---

## Where things are

The chunked-mode pattern is **triply validated**. Mode-scoped knobs batch shipped chunk_size=8 cleanly 2026-05-26 across 9 parallel chunks (sizes 6-8); no context-exhaustion warnings, halt-on-novelty exercised cleanly with operator-accepted park (roundsdown / roundsup). Next calibration target: **chunk_size=10** (the 78-entity Frogbot category is the natural calibration vehicle).

**Cumulative ktx-l1-rewrite progress**: 6 batches shipped, 210 of 618 entities = ~34% drafted, 3 entities parked (callalias / roundsdown / roundsup -- all queued for apply-pass hand-drafting). Zero applied to L1 yet (apply pass is a separate, operator-gated phase; the operator's plan is to ship ALL batches before running the apply pass).

**Halt-on-novelty was exercised for the first time in production 2026-05-26 (Mode-scoped knobs batch)**:
- Sub-agent parked `roundsdown` + `roundsup` under trigger 1 (no-shape-match).
- Dispatcher halted per skill discipline.
- Operator chose **ship-and-park override** since 1-of-1 evidence doesn't earn a new shape entry (earn-their-keep test).
- Both entries went to the park file; apply-pass will hand-draft them as shape-less command-side levers for `k_hoonyrounds`.
- This established the precedent: trigger-1/4 halts surface to operator; operator decides extend-catalog vs accept-park vs investigate. Frogbot may surface more trigger-1/4 if the Shape 8 dispatcher pattern has variants not yet cataloged.

**Shape catalog state**: 14+ shapes locked. Frogbot is the Shape 8 (parent-dispatcher with subcommand args) flagship category -- per shape-catalog.md, `botcmd` routes to ~40 subcommands across two tables (`std_commands[]` at `src/bot_commands.c:2315`, `editor_commands[]` at `src/bot_commands.c:2332`). Subcommands are L1 entities named `<subcommand>:frogbot:<scope>` (e.g. `addbot:frogbot:std`, `addmarker:frogbot:editor`).

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 6 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries + the F1 audit followup. Especially the Mode-scoped knobs entry (this batch's predecessor) and the Mode selection F1 audit (catalog Permission-line discipline).
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow.
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- the 5 procedural detail files (pre-flight, pre-fetch, halt-on-novelty, cross-card-checks, file-formats).
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-mode-scoped-knobs.md` -- prior batch's `## Cross-card consistency notes` section (especially F1 Permission-line pattern, F7 Shape 8/11 disambiguation, F16 halt-on-novelty precedent).
5. Skim the per-card skill references (sub-agents read these themselves, but dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` -- **Shape 8 section is load-bearing for this batch**. Note the tooling-mode prerequisite at end of file.
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` (Permission CF-flag table).
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`.

---

## Critical rules

1. **chunk_size=10 for this batch.** 78 entities → 8 chunks of 10 (or 7 of 10 + 1 of 8). The prior batch held chunk_size=8 cleanly across 9 chunks; 10 is the next calibration step. If any chunk hits ~150k context usage warnings, drop that chunk to chunk_size=8 and document.
2. **Shape 8 entity-naming discipline**. Subcommands are namespaced `<sub>:frogbot:<scope>` (e.g. `addbot:frogbot:std`). The user-facing invocation is `botcmd <subcommand>`. Sub-agents must use the namespaced ID as `entity_name` AND describe the user-facing invocation in the Headliner. The parent dispatcher (`botcmd`) gets its own L1 card describing the dispatcher's role + admin gate + how to discover subcommands.
3. **Tooling-mode prerequisite (Shape 8 modifier)** -- editor-only subcommands use the hide-when-inactive pattern (not in the dispatcher's help output unless editor mode is active). Surface as a labeled Prerequisites bullet: "X mode must be active -- otherwise the parent dispatcher hides this subcommand entirely (not just refused with a message; literally not in the menu)."
4. **Admin gating density expected to be HIGH**. `k_fb_adminonly` is the per-dispatcher gate (mention on each subcommand card but don't duplicate the cvar's full behavior). Many Frogbot subcommands may legitimately be admin-only via `CF_BOTH_ADMIN`; verify per-command CF flag at source before applying Permission line. Don't pattern-match against the F1 audit's residue from prior batches -- those were `CF_PLAYER | CF_SPC_ADMIN` mislabeled as admin; legitimate `CF_BOTH_ADMIN` should still get "admin only" framing.
5. **Halt-on-novelty likely**. Frogbot may surface variants of Shape 8 (e.g. nested dispatchers, multi-arg subcommands with per-arg dispatch). If trigger 1/4 fires, halt the batch and return the candidate-shape signature. Operator decides extend-catalog vs accept-park.
6. **DISPATCHER OVERRIDE on sub-agent file-writes** (unchanged). Each sub-agent prompt MUST instruct: "DO NOT write per-batch files; return YAML metadata only; write your chunk's assembled section content to /tmp/<chunk_id>_output.md in one Write call." Dispatcher assembles atomically at Step 6.
7. **Stage explicit files only**. `git add HANDOVER.md <drafts-file> <park-file-if-any>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit.
8. **Commit message format**. Use `docs(ktx-l1-rewrite): SHIPPED Frogbot category (N cards, M drafted_clean + K flagged + P parked) -- chunked-mode chunk_size=10`. Append the suffix for the calibration log.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator whether to advance the anchor across all in-flight batches or wait.

Then read the 5 dispatcher references + per-card references per "Reads required" above.

### Action 2: Pre-fetch the 78 Frogbot entities

The catalog HTML is the recommended source (deterministic, no rate-limit):

```bash
python3 -c "
import re, json, html
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 3228, 5502
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
" > /tmp/frogbot-entities.json
wc -l /tmp/frogbot-entities.json
```

Suggested sub-family chunking (78 entities → 8 chunks; verify by walking the JSON):

- **Chunk A (10): Parent dispatcher + std subcommand workflow** -- `botcmd` (dispatcher) + 9 core `:frogbot:std` subcommands (`addbot`, `removebot`, etc.)
- **Chunk B (10): std subcommands -- bot tuning** -- skill / personality / team subcommands in `:frogbot:std` scope
- **Chunk C (10): std subcommands -- map + waypoint workflow** (`:frogbot:std` map-related)
- **Chunk D (10): editor subcommands -- waypoint editing** (`:frogbot:editor` add/remove markers, paths)
- **Chunk E (10): editor subcommands -- waypoint verification + save** (`:frogbot:editor` save/load/test)
- **Chunk F (10): Frogbot cvars -- k_fb_* tuning** (admin-config cvars)
- **Chunk G (10): Frogbot cvars -- skill/behavior tuning** (k_fb_* behavior cvars)
- **Chunk H (8): Frogbot legacy/misc** (any remaining)

Adjust empirically based on actual entity grouping in the JSON. Family coherence matters more than strict arithmetic.

### Action 3: Dispatch 8 sub-agents in parallel

Use the Agent tool, subagent_type=`general-purpose`, model=`sonnet`. Each sub-agent prompt follows the chunk-prompt template used in Mode-scoped knobs (see commit `75b9f1fc` for the structure). Each prompt includes:
- Skill loading instructions (7 files)
- Entity inputs path (JSON file per chunk)
- DISPATCHER OVERRIDE (return YAML, write to /tmp)
- Cross-batch context briefing (Shape 8 discipline + cross-link expectations to prior batches)
- Permission-line discipline reminder
- Output format spec

After all sub-agents return:
- Aggregate verdicts.
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue).
- Cross-card synthesis (expect 8-15 findings; Frogbot category is more internally-coherent than Mode-scoped knobs but Shape 8 + tooling-mode interactions may surface new patterns).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>-frogbot.md`.
- Park file if applicable.
- Append HANDOVER followup entry mirroring the Mode-scoped knobs entry shape.
- Commit per the message format.

---

## Watch-outs for Frogbot

1. **Parent-dispatcher card (`botcmd`)**: gets its own L1 card describing the dispatcher's role + the admin gate (`k_fb_adminonly`) + how to discover subcommands. List subcommands by category (std / editor) -- pointer to each subcommand's L1 card. Don't try to inline-document all 40+ subcommands on the parent card.

2. **Editor-mode tooling-prereq**: editor-scope subcommands have the hide-when-inactive surfacing pattern (not in dispatcher help unless editor mode active). Surface in Prerequisites with the explicit "literally not in the menu" framing per shape-catalog.md.

3. **Namespaced entity IDs**: `addbot:frogbot:std` vs user-facing `botcmd addbot`. The L1 ID is metadata; the Headliner names the user-facing invocation. Don't conflate.

4. **k_fb_adminonly gate inheritance**: each subcommand card mentions the admin gate but doesn't duplicate the cvar's full value-by-value behavior (that lives on `k_fb_adminonly` card itself).

5. **Legitimate `CF_BOTH_ADMIN` entities**: Frogbot likely has many true admin-only commands (bot add/remove, waypoint save). Don't pattern-match the F1 audit residue from prior batches; verify each command's CF flag at source. `CF_BOTH_ADMIN` → "admin only" framing is correct.

6. **Cross-batch references**: `k_fb_*` cvars may be referenced by other categories (Match flow, Internal state). Cross-link by name where applicable; bidirectional sweep happens when those batches ship.

7. **Cross-card discipline at Shape 8 scale**: with ~40 subcommand entities in two scope-groups, cross-card synthesis should check:
   - Consistent Headliner format across siblings (`<verb> the <noun>` for std; same for editor).
   - Consistent See-also patterns (parent dispatcher + 2-3 closest workflow siblings).
   - Permission asymmetry across scope-groups (std vs editor may have different admin requirements).

8. **Halt-on-novelty likely**: Frogbot may surface Shape 8 variants the catalog doesn't capture (e.g. nested dispatchers, multi-arg subcommand with per-arg type dispatch). If a sub-agent surfaces trigger 1/4, halt and report. Don't extend the catalog autonomously.

---

## Skill invocation

```
Skill(
  skill="ktx-l1-batch-dispatcher",
  args="category=\"Frogbot\" batch_date=<YYYY-MM-DD> anchor_version=v1.36-1633-g67253dc chunk_size=10"
)
```

Adjust `batch_date` to today.

---

## When in doubt

- **Anchor drift**: abort, ask operator.
- **Novelty trigger 1/4**: halt batch, return candidate-shape signature, ask operator. Frogbot is Shape 8 flagship; genuine novelty is plausible (e.g. dispatcher variants the catalog doesn't yet cover).
- **chunk_size=10 hits context exhaustion**: drop the affected chunk to chunk_size=8 and document the threshold in the HANDOVER calibration notes.
- **Permission asymmetry across editor vs std subcommands**: source-verify the CF flag at each command's registration before assigning Permission line. Don't assume editor commands are admin-only without checking.
- **Cross-card finding seems wrong**: park as a follow-up note in the consistency section rather than asserting -- the cross-card pass is read-across-drafts, not re-verification of source.
- **Anything else unclear**: read the dispatcher SKILL.md "When unsure, halt" rule. Halting + asking is always preferable to force-fitting.

---

## After ship

Update this parking doc -- delete it if the batch shipped cleanly, or amend with calibration findings if chunk_size=10 surfaced new constraints. Add a HANDOVER entry per the dispatcher file-formats.md template.

If chunk_size=10 holds at safe context budget across all chunks, the next batch can consider chunk_size=12 for Match flow (71 entities) or Demo & spectator (69). If 10 hits exhaustion in any chunk, document the per-category context-budget profile.

Remaining categories after Frogbot (406 entities total across 7 categories): Admin & permissions (37), Demo & spectator (69), Gameplay rules (69), Internal state (19), Match flow (71), Player communication (18), Race (45).
