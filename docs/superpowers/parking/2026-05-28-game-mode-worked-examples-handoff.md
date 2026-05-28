# Handoff: KTX game-mode concept-note worked examples (killquad + wipeout)

**Date:** 2026-05-28
**Owner:** fresh terminal (single-session execution; output is 2 concept notes)
**Estimated effort:** 2-3 hours (driven by wipeout's wiki-harvest complexity, not killquad)

## Why this exists

The main session locked in 4 methodology reference docs for KTX game-mode concept notes (committed today: `2d06395d` / `65ced7b4` / `2172b026` / `01a158d1`). All four live at `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/`.

Next step is to validate the methodology against 2 worked examples before building the `game-mode-curate` skill itself. The worked examples stress-test the schema + section structure + triage decision tree across two ends of the methodology surface:

- **killquad** -- `l3-upstream` + `kind: mutation`. Zero wiki content. Cleanest test of "is L1 self-sufficient enough to draft a credible note from source alone." Smaller section set (6).
- **wipeout** -- `hybrid` + `kind: standalone`. Medium wiki content (~3500 chars at `Wipeout.json`). Tests both the harvest path AND the full 9-section player-first template. Larger.

Output is two concept-note .md files written to `apps/qw-oracle/curated/concept-notes/` (location decision below), plus a structured report back to the orchestrator session capturing what the methodology docs got right / wrong / missing.

This phase does NOT:
- Draft any other modes
- Build the `game-mode-curate` skill itself
- Modify the methodology docs (surface findings instead -- the orchestrator backports them)
- Wire up wiki rendering or MCP tooling for these notes

## Reads required (cold)

Read in this order before drafting anything. Do not start drafting from memory or guesswork.

1. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/mode-vs-mutation-classification.md`** -- confirms killquad is mutation, wipeout is standalone; provides source-signal evidence; lists open content questions.
2. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/concept-note-frontmatter-schema.md`** -- field-by-field schema with worked examples (berzerk mutation, wipeout standalone -- yes, the schema doc already has a worked frontmatter for wipeout you can adapt rather than draft from scratch). Use the schema's worked examples as your template; do not invent new fields.
3. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/concept-note-section-structure.md`** -- per-kind section sets, mandatory vs optional, length bands, anti-patterns. Standalone modes get 9 sections (5 mandatory + 4 optional); mutations get 6 sections.
4. **`apps/qw-oracle/curated/concept-notes/_methodology/game-modes/triage-rules.md`** -- decision tree for `wiki_status`. killquad is L3-upstream (no wiki page); wipeout is hybrid OR wiki-upstream depending on mechanical-accuracy check.
5. **`apps/qw-oracle/curated/concept-notes/CLAUDE.md` + `README.md`** -- existing concept-note conventions (frontmatter universals like `topic` / `status` / `related_entities`). The game-mode schema extends this convention; the fresh terminal should write notes that pass existing convention as well as the new game-mode schema.
6. **`apps/qw-oracle/CLAUDE.md`** -- Layer 1 / Layer 3 framing, MCP contract, schema discipline.
7. **`apps/qw-oracle/SCHEMA.md`** -- entities + gameplay_mechanics + cvar_versions table shapes (for the SQL queries you'll run during pre-flight).

## Pre-flight queries (run before drafting)

Run these against the local dev Postgres (`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`):

**For killquad (mutation):**
```sql
-- 1. The mode entity
SELECT name, source_ref, props_json FROM gameplay_mechanics
WHERE kind='game_mode' AND name='killquad';

-- 2. The activation cvar L1 entry
SELECT name, description, source_ref FROM entities
WHERE project='ktx' AND name_fold='k_killquad';

-- 3. Source use-sites: search KTX source for k_killquad uses (this anchors the "what it does" prose)
-- Run shell: grep -rn "k_killquad" /home/paradoks/projects/quakeworld/research/repos/ktx/src/
```

**For wipeout (standalone):**
```sql
-- 1. The mode entity
SELECT name, source_ref, props_json FROM gameplay_mechanics
WHERE kind='game_mode' AND name='wipeout';

-- 2. The wipeout_um_init mode_default rows (these are the Configuration table data)
SELECT name, value_text, source_ref, notes FROM gameplay_mechanics
WHERE kind='mode_default'
  AND props_json->>'initstring_array' = 'wipeout_um_init'
ORDER BY name;

-- 3. The common_um_init baseline (these are inherited)
SELECT COUNT(*) FROM gameplay_mechanics
WHERE kind='mode_default'
  AND props_json->>'initstring_array' = 'common_um_init';

-- 4. The mode_cmd table entry context (commands.c:4551)
-- Shell: sed -n '4530,4560p' /home/paradoks/projects/quakeworld/research/repos/ktx/src/commands.c
```

Read the wiki page `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Wipeout.json` -- the `wikitext` field. Score it against `triage-rules.md` Dimension 2 (mechanical accuracy) by walking every cvar / command / version claim against L1 / source.

## File location decision (confirm with operator before writing)

Existing concept-notes are flat at `apps/qw-oracle/curated/concept-notes/`. With 25+ game-mode notes coming, a subdir keeps the index manageable.

Two options:
- **A.** Write to `apps/qw-oracle/curated/concept-notes/<slug>.md` (flat -- matches current convention)
- **B.** Write to `apps/qw-oracle/curated/concept-notes/game-modes/<slug>.md` (subdir -- matches `_methodology/game-modes/` structure)

Recommendation: B (subdir). Parallels the methodology layout; helps when fan-out reaches 25 notes. But the orchestrator may prefer A for now if MCP `get_concept_note` doesn't support subdirs yet -- check `apps/qw-oracle/scripts/load-concepts/` to confirm. If unsure, write to subdir and flag if the loader rejects subdirs.

## Drafting workflow per mode

For each mode (do killquad first -- simpler -- then wipeout):

1. **Pre-flight** -- run the SQL + shell commands above. Record what you see.
2. **Wiki + research read** (wipeout only -- killquad has no wiki):
   - Read `Wipeout.json` wikitext in full
   - Skim `research/repos/dusty-ktx/` for commits or notes (Dusty is the wipeout author per wiki)
   - Skim `research/repos/ktx/` commit log for "wipeout" mentions
3. **Triage decision** -- record `wiki_status`. For killquad: definitely `l3-upstream` (no page). For wipeout: walk the decision tree -- likely `hybrid` (wiki has gameplay + maps, drift unclear without verification).
4. **Frontmatter** -- populate per `concept-note-frontmatter-schema.md`. Use the schema doc's worked examples (wipeout standalone + berzerk mutation are right there) as templates. Don't invent fields.
5. **Sections** -- draft each mandatory section per `concept-note-section-structure.md`. Embrace short; don't pad. For wipeout, anchor every cvar / command claim to L1; mark unverified harvested claims with `<!-- verify: ... -->` HTML comments.
6. **Configuration section** -- for wipeout, the cvar table is auto-projected from `gameplay_mechanics WHERE initstring_array = 'wipeout_um_init'`. The note prose includes a placeholder like `<!-- configuration table auto-projected from gameplay_mechanics WHERE initstring_array = 'wipeout_um_init' -->` rather than hand-pasting cvar values (per open question 1 in `concept-note-section-structure.md`).
7. **See also** -- typed `related_modes` per the frontmatter schema. Anchor to other L1 entities you can verify exist.
8. **Self-review** -- read your draft as if you were a player browsing, then as if you were a server admin. Both reading paths should work top-down for the standalone and feel coherent.
9. **Write to disk** -- the path you chose under "File location decision."

## Discipline anchors

- **Source-truth before synthesis.** Verify every cvar / command name in your draft exists in L1 before referencing it (`SELECT name FROM entities WHERE project='ktx' AND name_fold='<lower>';`). The wiki page may name cvars that have since been renamed or removed.
- **Mechanical content takes precedence.** Don't let narrative prose drift from source. If wiki says "the cvar is `k_wipeout_X`" and L1 says no such cvar exists, flag the wiki claim as drifted; do not propagate.
- **Plain English at decision points** -- when you hit ambiguity, surface a 1-sentence statement of the choice and what each option implies. Don't fire option menus without context.
- **Verify drafter-subagent claims** -- if you dispatch a sub-agent for source reading, treat its claims as hypotheses; spot-check 2-3 against the actual source file before pasting them into the note.
- **Embrace short sections.** A mutation's Server-setup section may be one sentence. That's correct. Don't pad to look balanced.

## Halt-and-report rules

Halt the drafting and report back to the orchestrator session if any of the following:

- **Classification mismatch.** killquad or wipeout shows source signals that contradict the classification doc's verdict (e.g., killquad turns out to have a `killquad_um_init` array, making it a standalone not a mutation). Surface the signals; do not silently re-classify.
- **Frontmatter field genuinely missing from schema.** The schema doc is supposed to cover everything; if you find a real field that's needed, surface it as a methodology-doc gap rather than inventing.
- **Wiki content materially contradicts L1.** Many false positives possible (wiki refers to an older version). Worth surfacing: "wiki says X cvar exists with Y behavior; L1 has no such entity OR L1 has it with Z behavior." Operator decides whether the wiki claim was a typo, a rename, or actual drift.
- **Section length feels wrong** -- if a section is much longer than the band in `concept-note-section-structure.md` even after compression, that's a signal the section structure may need a split or a sub-section convention. Don't truncate to fit; surface.
- **Triage decision uncertain.** Default to `hybrid` per the doc; report which dimension's score was unclear.

## Out of scope for this session

- Drafting any of the other 25 modes (only killquad + wipeout)
- Modifying the 4 methodology docs (surface findings; orchestrator backports)
- Building the `game-mode-curate` skill (downstream)
- Wiki page rendering (downstream)
- Configuration-table auto-projection plumbing (downstream; for now the section is a placeholder comment)
- Drafting a family-aggregator page (XonX family etc.) -- deferred to v2 per the section-structure doc

## Return-to-orchestrator report shape

When done (or halted), report back to the main session with this structure:

```
Worked examples -- status: <COMPLETE | HALTED | PARTIAL>

killquad:
  Triage decision:    <l3-upstream | wiki-upstream | hybrid> -- <1-sentence reasoning>
  Frontmatter:        <fully populated | partial -- list missing fields>
  Sections drafted:   <list with word counts: Lead Nw | What it does Nw | ... >
  L1 anchors:         <count of related_entities | count verified vs L1>
  Open items:         <list>
  File at:            <path>

wipeout:
  Triage decision:    <l3-upstream | wiki-upstream | hybrid> -- <1-sentence reasoning>
  Wiki harvest:       <full | partial -- which sections came from wiki>
  Source-truth conflicts found: <list any wiki-vs-L1 mismatches you saw>
  Frontmatter:        <fully populated | partial>
  Sections drafted:   <list with word counts>
  L1 anchors:         <count + verified ratio>
  Research-folder yield: <what you found in dusty-ktx / ktx commit log>
  Open items:         <list>
  File at:            <path>

Cross-cutting methodology feedback:
  Gaps in mode-vs-mutation-classification.md:  <list>
  Gaps in concept-note-frontmatter-schema.md:  <list>
  Gaps in concept-note-section-structure.md:   <list>
  Gaps in triage-rules.md:                      <list>
  (Nothing missing = note that explicitly)

Time spent: <hours>
```

The orchestrator session will read the report, decide on methodology-doc backports, and either kick off the skill build or queue another worked example (likely a variant like blitz2v2 to test that 3rd kind).

## When in doubt

- **File location**: subdir `game-modes/`, flag if the loader rejects
- **Triage decision unclear**: default `hybrid`
- **Section length unclear**: embrace short; do not pad
- **Frontmatter field unclear**: consult schema doc worked examples; do not invent
- **Mode kind unclear**: it's killquad=mutation and wipeout=standalone per the classification doc; do not override without HIGH-confidence contrary source signals
- **Wiki claim vs L1 conflict**: flag, do not silently choose one; surface to operator
