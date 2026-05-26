# Handoff -- ktx-l1-rewrite Mode selection batch (next chunked-mode dispatch)

**Date drafted**: 2026-05-26
**Drafted by**: Scoring & stats calibration session (commit `aff52dd4`)
**For**: fresh terminal dispatching the next ktx-l1-rewrite batch
**Target**: Mode selection category (28 cards) at chunk_size=7
**Sized**: ~1 hour wall-clock (4 parallel sub-agents + cross-card synthesis + commit)

---

## Where things are

The chunked-mode pattern is **validated**. First-ever chunked dispatch shipped 2026-05-26 on Scoring & stats (19 cards). 65% token reduction vs the prior one-sub-agent-per-entity pattern. 0 novelty halts. 5 real factual flags caught (including a 180-degree timing inversion on `stats` that was live in production L1). Skill discipline scaled cleanly to multi-entity sub-agent context.

**Cumulative ktx-l1-rewrite progress**: 4 batches shipped, 118 of 618 entities = ~19% drafted. Zero applied to L1 yet (apply pass is a separate, operator-gated phase).

**Skills involved** (both amended 2026-05-26 for chunked mode):
- `~/.claude/skills/ktx-l1-batch-dispatcher/` -- this dispatcher skill (you invoke it)
- `~/.claude/skills/ktx-l1-rewrite/` -- per-card skill (sub-agents invoke / read it)

**Shape catalog** is at 14+ shapes (Shape 11 crystallized in the Voting batch). Earn-their-keep discipline holds: skill must park trigger 1/4 novelty rather than extending the catalog.

---

## Reads required (cold start)

Before dispatching, read these in order:

1. `/home/paradoks/projects/quakeworld/HANDOVER.md` -- the 4 prior `ktx-l1-rewrite ... -- apply pass + cross-card findings` entries. Especially the Scoring & stats entry (this batch's calibration retrospective) and the Voting entry (highest flag rate, most cross-card facts).
2. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` -- the 8-step workflow you'll follow. Step 3 is now chunked-mode (default chunk_size=6, 4-8 accepted).
3. `/home/paradoks/.claude/skills/ktx-l1-batch-dispatcher/references/*.md` -- the 5 procedural detail files (pre-flight, pre-fetch, halt-on-novelty, cross-card-checks, file-formats).
4. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-scoring-stats.md` -- the most recent batch as a quality reference. Pay attention to: the Cross-card consistency notes section at the end, the canonical-card pattern application across 5 sub-families, the FLAG annotations on the 5 drafted_with_flag entries.
5. `/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md` (Voting batch) -- the largest prior batch, useful for See-also patterns and the cross-card synthesis style.
6. Skim the per-card skill references (sub-agents read these themselves, but the dispatcher needs them for novelty detection + cross-card synthesis):
   - `~/.claude/skills/ktx-l1-rewrite/references/shape-catalog.md` (14+ shapes)
   - `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md`
   - `~/.claude/skills/ktx-l1-rewrite/references/park-triggers.md`

---

## Critical rules (calibration learnings to apply)

These came out of the Scoring & stats run. Apply them in this batch.

1. **chunk_size=7 for this batch.** 28 entities / 4 chunks of 7. The Scoring & stats run showed chunk_size=6 was the floor, not the ceiling: chunk 1 (6 entities) hit 12.9k/entity; the 4-entity chunks hit ~21k/entity (under-amortized). Larger chunks save more front-matter overhead. 7 is the next step up; 8 is possible if context budget allows.
2. **Halt on trigger 1/4, NOT on triggers 2/3.** Mature catalog means novelty halts are real signals. If a sub-agent surfaces trigger 1 (no-shape-match) or trigger 4 (sui-generis-mechanism), halt the whole batch and return the candidate-shape signature to the operator. Do NOT extend the catalog autonomously.
3. **Cross-card synthesis surfaces real findings.** Pattern from prior batches: 5-12 findings per batch. Don't fabricate to fill a quota, don't skip if findings seem trivial. The Scoring & stats F1 (stats timing inversion) was a 180-degree factual error live in production -- the cross-card pass exists to catch exactly that class of bug.
4. **DISPATCHER OVERRIDE on sub-agent file-writes.** Each sub-agent prompt MUST instruct: "DO NOT write per-batch files; return all section content INLINE in the final YAML report". The dispatcher writes the assembled drafts file atomically at Step 6. This protects against partial drafts files if a sub-agent crashes mid-chunk.
5. **Stage explicit files only.** `git add HANDOVER.md <drafts-file>` -- never `git add -A`. Run `git diff --cached --stat` between add and commit to verify staging (per memory `feedback_verify_git_staging`).
6. **One commit per batch.** Use the dispatcher's commit message format. Append ` -- chunked-mode batch <N>` suffix if useful for the calibration log.

---

## First three actions

### Action 1: Verify anchor + pre-flight gate

```bash
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```

Expected: `v1.36-1633-g67253dc`. If drifted, abort and ask operator whether to advance the anchor across all in-flight batches or wait.

Then read the 5 dispatcher references + 6 per-card references per "Reads required" above.

### Action 2: Pre-fetch the 28 Mode selection entities

The catalog HTML is the recommended source (deterministic, no rate-limit):

```bash
# All 28 entity names already extracted; section is at HTML lines 10206-11010
python3 -c "
import re, json, html
HTML='/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html'
with open(HTML) as f: lines = f.readlines()
start, end = 10205, 11010  # 0-indexed slice for Mode selection section
section_text = ''.join(lines[start:end])
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
" > /tmp/mode-selection-entities.json
wc -l /tmp/mode-selection-entities.json
```

The 28 entities, organized by suggested chunks:

**Chunk 1 (7 -- Deathmatch modes + Bloodfest):**
- `dmm1`, `dmm2`, `dmm3`, `dmm4`, `dmm5` (deathmatch ruleset commands)
- `k_bloodfest` (bloodfest gamemode cvar)
- `berzerk` (berserk mode preset)

**Chunk 2 (7 -- Team-format presets):**
- `2on2on2`, `4on4`, `4on4on4`, `XonX`, `blitz2v2`, `blitz4v4`, `ffa`

**Chunk 3 (7 -- Mode modifiers + CTF/CA family + k_mode):**
- `ctf`, `carena`, `k_clan_arena`, `midair`, `tot`, `totmode`, `k_mode`

**Chunk 4 (7 -- Special modes + family help-printer):**
- `lgcmode`, `hoonymode`, `wipeout`, `coop_nm_pu`, `race`, `fresh`, `gamemodes`

`gamemodes` is the suspected Shape 10 help-printer for this family (it likely markets the mode preset roster). Verify against source.

### Action 3: Dispatch 4 sub-agents in parallel

Use the Agent tool, subagent_type=`general-purpose`, model=`sonnet`. Each sub-agent prompt follows the structure used in the Scoring & stats calibration (see the commit `aff52dd4` of this session for exact prompt shape -- the chunk-prompt template includes: Skill loading instructions / Entity inputs reference to JSON / DISPATCHER OVERRIDE / Output format YAML / Cross-entity discipline).

After all 4 return:
- Aggregate verdicts.
- Halt-on-novelty scan (trigger 1/4 = halt; trigger 2/3 = continue).
- Cross-card synthesis (5-12 findings expected; for a 28-card batch the range skews higher).
- Write assembled drafts file: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-mode-selection.md` (or use the next available date if you're running this on a different day).
- Append HANDOVER followup entry mirroring the Scoring & stats entry shape.
- Commit per the message format.

---

## Watch-outs for Mode selection

1. **Shape 1d composition (preset + cvar + toggle triad)** -- `tot` + `totmode` likely classify as Shape 1d (the canonical example from worked-examples.md). The matching state cvar is `k_tot_mode` which is in a different category (likely Mode-scoped knobs). This batch ships 2 of the 3 entities; cross-link via See-also.
2. **Game-mode preset commands (Shape 3-like)** -- The mode presets (`2on2on2`, `4on4`, `4on4on4`, `XonX`, `blitz2v2`, `blitz4v4`, `ffa`, `dmm1-5`, `berzerk`, etc.) are `DEF(UserMode)` in `commands.c` with `<name>_um_init[]` cvar bundles. Each bundles ~5-15 cvars. Per worked-examples.md: "Plain mode preset; treat as Shape 3-like (the bundle IS the description)." Verify whether canonical-card pattern applies to the family -- they're likely NOT near-identical (each preset has different bundled cvars) so canonical-card may NOT apply. Use See-also cross-links to surface family relationship without collapsing.
3. **`gamemodes` Shape 10 candidate** -- likely the help-printer for the mode-preset family (pattern: pure G_sprint listing N other commands). If source confirms, apply Shape 10 template; if it's a state-printer (mode-aware, prints currently active mode), it's shape-less per the catalog's "Distinguish from these neighbors that are NOT Shape 10" section.
4. **`hoonymode` cross-batch reference** -- the Scoring & stats F4 finding flagged that `k_on_start_f_*` doesn't fire in hoonymode. When drafting `hoonymode` here, surface the absence in See-also or Effect if user-actionable (probably out of scope for this card -- the absence lives on the k_on_start_f_* cards in the prior batch).
5. **`lgcmode` cross-batch reference** -- the Scoring & stats F5 finding flagged that enabling LGC mode forcibly clears `k_dmgfrags`. When drafting `lgcmode` here, surface the `k_dmgfrags` mutual exclusion in Effect or Notes (symmetric cross-link to the prior batch's flag). This is the operator-mentioned cross-batch finding from the Scoring & stats handover.
6. **`carena` + `k_clan_arena` Shape 1 pair** -- likely classic Shape 1 (cvar+toggle). Check for mode-precondition (Shape 1c) -- Clan Arena may require a base mode like duel or team.
7. **`ctf` mode preset** -- likely Shape 3-like preset, but `ctf` also acts as a vote-via-`cm` target sometimes -- verify against source.

---

## Skill invocation

```
Skill(
  skill="ktx-l1-batch-dispatcher",
  args="category=\"Mode selection\" batch_date=2026-05-26 anchor_version=v1.36-1633-g67253dc chunk_size=7"
)
```

(Adjust `batch_date` if this runs on a later day.)

---

## When in doubt

- **Anchor drift**: abort, ask operator.
- **Novelty trigger 1/4**: halt batch, return candidate-shape signature, ask operator.
- **Chunk crashes mid-process**: partial chunk results are lost (no file written on crash); just re-dispatch that single chunk with the same entity list.
- **Cross-card finding seems wrong**: park as a follow-up note in the consistency section rather than asserting -- the cross-card pass is read-across-drafts, not re-verification of source.
- **chunk_size=7 hits context exhaustion**: drop to chunk_size=6 for that chunk and document the threshold in the HANDOVER calibration notes. The Scoring & stats batch showed safe headroom at 6 (max ~89k of 200k cap); 7 is exploratory.
- **Anything else unclear**: read the dispatcher SKILL.md "When unsure, halt" rule. Halting + asking is always preferable to force-fitting.

---

## Cross-batch state-printer family (informational)

The state-printer cross-batch family is now well-established across 2 batches (Server config: `fpslist`, `rules`; Scoring & stats: `scores`, `stats`, `effi`, `laststats`, `lastscores`, `lastscoresktx`). Mode selection has no obvious state-printer overlap, but if you draft `gamemodes` and it turns out to be a mode-state-printer (not a Shape 10 help-printer), consider whether it joins that family by See-also.

---

## After ship

Update this parking doc -- delete it if the batch shipped cleanly, or amend with calibration findings if chunk_size=7 surfaced new constraints. Add a HANDOVER entry per the dispatcher SKILL.md format-formats.md template.

If chunk_size=7 holds at safe context budget, the next batch can try chunk_size=8 (Frogbot 78 / chunks of 10 may be too aggressive; chunks of 8 = ~10 chunks). If 7 hits exhaustion, document the per-category context-budget profile (some categories pull more source than others; Mode selection's `DEF(UserMode)` bundles may be heavier than Scoring & stats' single-file walks).
