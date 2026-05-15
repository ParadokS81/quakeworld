# ezQuake help-JSON empty-entries audit (fire-when-ready)

**Status:** Fire-ready (2026-05-14, calibration mode). Dials locked + completion contract written below. Original catalyst: mushi asking what `sb_ignore_proxy` does in helper channel on 2026-05-14. Investigation showed prior PR #1117 (drift cleanup) and the `ezquake-help-json-coverage-gaps.md` doc both addressed source-vs-JSON mapping but neither asked "are entries that DO point to live source actually documented?"

> **RESCAN REQUIRED before resuming this triage (added 2026-05-15; predicate corrected 2026-05-15).** Every verdict in the four deliverables was computed against **pre-fix L1**. Three corrections landed 2026-05-15 and all 15 ezquake tags were re-walked: cvar source-comment promotion (`2edce42b`), entity-state-retreat (`3be4d576`), F2 ghost scoping (`9a5a0c2d`). Consequence:
> - **CORRECTED predicate (supersedes the earlier "source_inline = documented" rule, which was wrong on two counts).** The 2026-05-15 two-audience review (full landscape in `2026-05-15-l1-extractor-entity-classification-followups.md` -> "Cvar provenance pass") established, primary-sourced: (a) the promoted comment-derived cvars are labeled `description_origin='help_json'`, **not** `source_inline` (the earlier banner assumed `source_inline`; the loader stamps `help_json` because the extractor pre-fills `help_desc`); and (b) per slime (active ezQuake dev), a source `// comment` is **coder rationale, not user documentation** -- 97% of ezQuake cvars that have both a real help-JSON desc and a comment carry *genuinely different* text. **Therefore: "documented" = a genuine help-JSON user-doc surface (`desc`/`remarks`/`values`) is non-empty. A trailing comment -- even when promoted into `help_desc`/`entities.description` -- does NOT make a cvar documented and must NOT suppress the gap flag.** The comment is allowed to *inform* the human's `needs_doc` vs `no_doc` call; it is not itself the documentation.
> - **cvar list does NOT shrink the way the earlier banner claimed.** The "B2 comment-only state is now empty, those are documented" reasoning was the bug. The 24 head-alive promoted cvars (`extralogname`, `mvd_info_setup`, `skill`, `sv_*` block, ...) are still genuine user-doc gaps (or `no_doc` curatorial decisions) -- re-flag them; do not treat the promoted `help_desc` as prose. Net effect vs the original ~808: the genuine-undocumented cvar bucket is **larger**, not smaller, once promotion is excluded.
> - **command / macro / cmdline_param lists are NOT changed by the promotion fix** -- those version tables have no `trailing_comment` column (single help-JSON doc surface by schema design), so their verdicts stand. BUT they must still be recomputed against the retreat-corrected entity set (ghost/`source_retired` membership shifted).
> - **Action:** regenerate the queue from corrected L1 using the CORRECTED predicate above before any further triage. The dominant real bucket survives and grows: >=~808 source_backed ezquake cvars have no genuine help-JSON user-doc -- genuinely undocumented. **The promotion prerequisite is now satisfied: the ezQuake-side comment-promotion was removed and all 15 tags re-walked (commits `dc50b3ef` / `1f0227f5`, 2026-05-15; verification in the home doc's "Cvar provenance pass" SHIPPED block).** L1 is now clean foundation -- the rescan runs directly against it, no upstream-`desc`-empty filtering workaround needed. Comment-derived ezQuake cvar descriptions are now honestly `source_inline`; under the CORRECTED predicate they are user-doc gaps to triage, not "documented".

## Goal

For every ezQuake help-JSON entity (cvar / command / macro / cmdline_param) that is alive in current source HEAD AND has no human-written prose, produce one of four verdicts with evidence:

1. **needs_doc** — entity needs a description; draft one in house style
2. **no_doc** — name + group + family context is self-sufficient; classify so future audits stop flagging
3. **family_collapse** — N siblings can share one description on the family head (e.g., `re_trigger_match_0` covers `_1..9`)
4. **kick_to_ciscon** — meaning genuinely unclear from source, surfaces the question

## Scope

| Type | Source-of-truth | Live in HEAD | Undocumented (after `sv_*` and HUD-family filters) | Notes |
|---|---|---|---|---|
| cvar | `help_variables.json` | 2899 | **128** | HUD-family filter excludes auto-gen positional sub-cvars (`_align_x`, `_color_*`, `_draw`, `_proportional`, `_show`, `_style` etc.) |
| command | `help_commands.json` | 536 | **157** | 12 are `+foo`/`-foo` mirror pairs (one desc covers both) |
| macro | `help_macros.json` | 68 | **38** | smaller surface; many will be `no_doc` (`$ammo`, `$ping` self-evident) |
| cmdline_param | `help_cmdline_params.json` | 72 | **56** | 20 are `-no*` negation flags (mostly self-evident) |
| **Total** | | | **379 raw → ~250 after family collapse** | |

`sv_*` source-file filter: anything in `sv_main.c`, `sv_phys.c`, `sv_demo*.c`, `sv_login*.c`, `sv_sys_*.c` is mvdsv-belonged per operator; ezQuake convention is "client-side gets help-JSON, server-side gets inline comments only" (per `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-coverage-gaps.md`). Convention question is parked there awaiting QW-Group response; don't re-litigate.

## How help entries get created (load-bearing context)

The mechanism is **manual in-engine**: developer-mode command `dev_help_issues generate` walks `cvar_vars` / `cmd_functions` / etc., and creates placeholder entries in `help_*.json` with `"system-generated": true`. This is NOT build-time. Implication: an empty entry means one of three things:

- **system-generated:true present** → developer ran `generate`, placeholder is awaiting prose. Self-flagging gap. (cvar: 65, cmd: 117, macro: 4, cmdline: 15)
- **silent-empty (in JSON, no flag)** → pre-flag-era entry that was manually added without prose, OR `generate` ran before flag was introduced
- **absent from JSON entirely** → developer never ran `generate` after adding the cvar/cmd

All three states need the same triage. `system-generated:true` is just a hint that the dev knows it's incomplete.

Source mechanism: `src/help.c` lines 858-905 (variables), 955-996 (commands).

## House style (for `needs_doc` drafts)

Sampled from well-written entries by sub-agent investigation. Match per entity-type.

### cvars
- **Single sentence** unless side effects/edge cases warrant more
- **Imperative or noun-fragment opening**: "Sets X.", "Controls X.", "Enables X.", "Distance from player.", "Color used for…"
- **No trailing period** when single sentence (matches existing entries — about 60/40 either way actually, optional)
- **Don't restate type** (`type` field already says `boolean`/`integer`/`string`/`enum`)
- **Mention default only if non-obvious** (e.g., "Default value of 0 disables…")
- **Mention units only if non-trivial** (pixels usually skipped; seconds/microseconds called out)
- **Reference siblings** when behavior contrasts: "Unlike `cl_camera_tpp`, you can use the mouse to look around."

Example: `cl_bobhead` → "When enabled, applies weapon-bob motion to the view height instead of the gun model, producing a head-bob camera effect."

### commands
- **Multi-sentence common** (2-5 sentences); often includes `Examples:` block with monospace usage
- **Argument syntax inline**: `command <name|userid>` style
- **Default behavior described**: "Without arguments, displays current state."
- **Side effects enumerated** (e.g., `cfg_reset` lists everything it deletes)

### macros
- **Terse value-substitution descriptions**: "Current health.", "Server IP address.", "Player's last frag location."
- Mention if **teamplay-restricted** (the L1 DB has `teamplay_restricted` flag — propagate to description)

### cmdline_params
- **Imperative** ("Sets X to Y", "Enables X")
- Note **value vs flag** form: `-data <directory>` vs `-nomouse` (no value)
- Mention **system scope** if relevant (Windows-only, SDL2-only — L1 DB has `systems_json`)

## Verdict rubric

For each entity, evaluate in order. First-match wins.

### kick_to_ciscon — flag, don't draft
- Source has `// FIXME` or `// WTF` style comments (e.g., `extralogname` "no sv_ prefix? WTF!")
- Behavior depends on undocumented protocol/server interaction Claude can't verify
- Multiple plausible interpretations from source; picking wrong would mislead users
- Domain knowledge required (e.g., regex semantics in `re_trigger_match_*`, but see family_collapse below)

### family_collapse — one description, N covered

The family_collapse verdict has TWO valid shapes (refined 2026-05-15 post-command-calibration):

**Shape A: Enumeration family** — members differ only by an enumeration index within a uniform set.
- Examples: `re_trigger_match_2..9` (PCRE capture groups), `internal0..9` (scratch buffer slots), `track1..4` (multiview slots), `_r/_g/_b` color channels, `_team1..N` team-indexed entities.
- Lit-test: can a single sentence describe what all N members do interchangeably, with only the index varying?

**Shape B: Mirror-pair family** — exactly 2 members forming a press/release or on/off pair where one is the semantic inverse of the other.
- Examples: `+fire`/`-fire`, `+zoom`/`-zoom`, `+voip`/`-voip`, `+qtv_delay`/`-qtv_delay` (command-pass discoveries 2026-05-15); `-foo`/`-nofoo` for cmdline negation pairs.
- Lit-test: do the two members form a SEMANTICALLY OPPOSITE pair operating on the same target?
- Head: usually the `+` (or "on" / "do") version; augmented head desc enumerates both press and release (or on and off) actions in one paragraph.

ALL must be true for BOTH shapes (conservative — dial locked 2026-05-14):
- Sibling entities share a clear naming pattern
- Family head is already documented OR is trivial to draft (one-sentence noun-fragment covering the pattern)

**False positives that fail BOTH shape tests (do NOT collapse these):**
- `cl_mvinset_*` family: `offset_x`, `offset_y`, `size_x`, `size_y`, `top`, `right` differ by AXIS, DIMENSION, and ROLE (offset vs size vs anchor). Six distinct functions — not enumeration siblings and not a mirror pair.
- Any group where members differ by axis (X vs Y), dimension (width vs height), or distinct parameter (offset vs size vs anchor): emit individual needs_doc rows.

**Output rules (load-bearing — calibration revealed aggregator misalignment):**
- Head IS in the queue (entry exists in help_*.json but `desc` is empty): drafter writes the augmented head desc on the head's row (`name == family_head`); member rows have `proposed_desc: null` and a `family_head` pointer.
- Head is NOT in the queue (already documented in help_*.json with non-empty desc): do NOT write an augmented head desc anywhere. Members get `family_head` pointers only; aggregator must NOT generate an augmented-head paragraph for these families. The existing head description stays untouched.

### no_doc — name+context self-documents
ALL must be true:
- Name follows transparent compound pattern (`<prefix>_<feature>_<axis>`)
- Group context disambiguates (group_name_in_source field)
- No `on_change` handler doing non-trivial work (handler implies hidden behavior)
- Default is the boring default (`0`, `""`, `1` for enable)
- At least 2 well-documented siblings in the same family establish the pattern

Output: classification entry with reason ("transparent compound name in fully-documented family").

### needs_doc — write a draft
Anything else. ANY of these triggers it:
- Acronym / jargon in name (`pext`, `qtv`, `mvinset`, `lgblood`, `pent_666`)
- Name doesn't reveal numeric meaning (`gl_powerupshells_base1level` — what's "base1"?)
- `on_change` handler does non-trivial work (network, IO, state mutation)
- Non-obvious cvar interactions or protocol implications
- Family is mixed — some siblings documented, this one isn't
- Naming hints but doesn't explain (`cl_bobhead` — bob+head implies camera, but always-on? on-walk?)

Output: drafted description + confidence (high / medium / low). Low-confidence drafts get a `kick_to_ciscon` companion question.

## Per-entity evidence stack (what to gather before verdicting)

For each entity, the executor agent gathers:

1. **Source registration line** + 5 lines around (the `cvar_t foo = {"name", "default"}` initializer + neighboring registrations — siblings cluster together by file convention)
2. **Read sites** in source: `grep -n <entity_name> src/*.c` — focus on conditional gates (`if (cvar.integer)`) and value uses, skip the registration itself
3. **on_change handler body** if present — `grep <on_change_fn>` and read the function
4. **2-3 documented siblings** in same source file (for style match + family pattern)
5. **`group_name_in_source`** from L1 DB (categorical context)
6. **`system-generated` flag** (hint that dev knows it's incomplete)
7. **L3 concept-note coverage** (currently 0 cvars; check anyway in case of future state)

Per-entity budget: 5-15 minutes including code-reading.

## Fan-out plan

**Unit: per source-file batch.** Source files cluster related entities by author convention; each agent reads the file once, sees full context, verdicts everything in it consistently.

cvar queue distribution:
- 35 source files contain the 128 cvars
- 17 files have 1 entry each (singleton sweep)
- 17 files have 2-5 entries
- 7 files have 6+ entries (top: `tp_triggers.c` 18, `hud_scores.c` 13, `hud_common.c` 10)

Suggested fan-out for cvars:
- **Agent 1 (singletons sweep):** 17 single-entity files, 17 verdicts
- **Agent 2 (small files):** 17 files × 2-5 entries, ~50 verdicts
- **Agent 3 (HUD cluster):** `hud_*.c` files
- **Agent 4 (tp_triggers):** the 18 entries in tp_triggers.c (high family-collapse opportunity)
- **Agent 5 (renderer cluster):** `r_rmain.c`, `r_aliasmodel.c`
- **Agent 6 (client core):** `cl_main.c`, `cl_screen.c`, `cl_view.c`, `cl_input.c`

Mirror this shape for commands / macros / cmdline_params (smaller surfaces, can be one agent per type).

Total agent count: ~10-12 sub-agents in parallel waves of 4-6.

## Calibration set (3 worked examples)

### Example 1: needs_doc, high confidence

**Entity:** `cl_bobhead`
**Source:** `cl_view.c:49` — `static cvar_t cl_bobhead = { "cl_bobhead", "0" };`
**Read site:** `cl_view.c:957` — `if (cl_bobhead.integer) { height_adjustment += bob; bob = 0; }`
**Family context:** registered alongside `cl_rollspeed`, `cl_rollangle`, `cl_rollalpha`, `v_centermove`, `v_centerspeed` — all view-cvars
**Group:** "View"
**on_change:** none
**Reasoning:** Name compound suggests camera-on-head, source confirms — when on, the bob offset that would normally move the gun model is moved to view height instead.

**Verdict:** `needs_doc` (high)
**Draft:** `When enabled, applies weapon-bob motion to view height instead of the gun model, producing a head-bob camera effect.`

### Example 2: family_collapse

**Entities:** `re_trigger_match_2`, `_3`, `_4`, `_5`, `_6`, `_7`, `_8`, `_9` (8 entries, all `system-generated:true`)
**Source:** `tp_triggers.c:32-41` — `cvar_t re_sub[10] = {{"re_trigger_match_0", "", CVAR_ROM}, ...}`
**Family head:** `re_trigger_match_0` (in JSON with description, NOT in queue)
**Behavior:** All 10 are `CVAR_ROM` cvars populated with regex capture groups when an `re_trigger` fires. `_0` = full match, `_1..9` = capture groups 1-9.

**Verdict:** `family_collapse` — extend `re_trigger_match_0`'s description to cover the family
**Draft for `re_trigger_match_0` desc (replace existing):** `Holds the most recent regex match from a fired re_trigger. _0 contains the full match; _1 through _9 contain capture groups 1-9. All are read-only and updated automatically on trigger fire.`
**Classification entries for _2..9:** classification: `family_member`, family_head: `re_trigger_match_0`, action: `remove_from_help_json` OR `keep_with_pointer_desc`

### Example 3: no_doc

**Entities:** `internal0` through `internal9` (10 entries)
**Source:** `tp_triggers.c:43` — `cvar_t re_subi[10] = {{"internal0"}, ..., {"internal9"}};`
**Family head:** none in JSON; these are scratch register cvars for trigger script use
**Group:** none

**Verdict:** `no_doc` per individual; one shared classification entry suffices
**Classification:** `internal_scratch_register`, reason: `Scratch cvars (internal0..internal9) usable by trigger scripts as intermediate value storage. Not user-facing in the configuration sense.`

(Note: borderline — could also be `family_collapse` with one shared desc on `internal0`. Operator pick.)

## Output channels

**For /goal autonomous mode (calibration run):** executor agents write YAML rows to `/tmp/audit-batch-<source_file>.yaml` only; the orchestrator session writes the aggregate summary doc. PR-diff and classifications-yaml channels are human-gated post-review — operator triggers them after reviewing the summary. The table below shows the full ambition; autonomous-mode populates only the intermediate YAML + summary-doc layer.

For each verdict, write to ONE of:

| Verdict | Output channel | Format |
|---|---|---|
| `needs_doc` (high conf) | PR-ready diff against `help_*.json` | JSON object with new `desc` field, ready to merge |
| `needs_doc` (med/low conf) | Github issue body draft for ciscon | Markdown table: name / current / proposed / question |
| `no_doc` | `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml` append | YAML entry with new classification value (e.g., `self_documenting`, `internal_scratch_register`) |
| `family_collapse` | Both: PR diff for family-head desc + yaml classifications for siblings | Same as above |
| `kick_to_ciscon` | Github issue body draft | Markdown question per entity |

Final aggregate deliverable: one `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries.md` (parallel to `coverage-gaps.md`) summarizing all four channels with counts and ready-to-paste content.

## Pre-flight: regenerate queues from current HEAD

Source state shifts. Before firing, regenerate the four queue JSON files from current Postgres + current source.

```bash
# In apps/qw-oracle/, with Postgres running and ezquake L1 loaded for HEAD
bun /tmp/regen-help-audit-queues.ts
# Produces:
#   /tmp/cvar-queue.json    (128 entries currently)
#   /tmp/cmd-queue.json     (157)
#   /tmp/macro-queue.json   (38)
#   /tmp/cmdline-queue.json (56)
```

Script content (paste into `/tmp/regen-help-audit-queues.ts`, run from `apps/qw-oracle/`):

```ts
import postgres from 'postgres';
import fs from 'fs';

const sql = postgres('postgresql://qworacle:dev@localhost:5432/qw_oracle');
const SRC = '/home/paradoks/projects/quakeworld/research/repos/ezquake-source';

function isDocumented(e: any): boolean {
  if (!e) return false;
  if (e.desc?.trim() || e.description?.trim() || e.remarks?.trim()) return true;
  if (Array.isArray(e.values)    && e.values.some((v:any)    => v?.description?.trim())) return true;
  if (Array.isArray(e.arguments) && e.arguments.some((a:any) => a?.description?.trim())) return true;
  return false;
}

const HUD_FRAMEWORK = /^hud_.*_(draw|proportional|show|style)$/;
const HUD_POSITIONAL = /^hud_.*_(align_x|align_y|align_right|frame|frame_color|frame_thickness|scale|color|color_[a-z0-9_]+|opacity|place|inactive|on|order|big|alpha|enabled?|width|height|x|y|cols|rows|name|item_opacity|text_opacity|notintp|onlytp)$/;

// CVARS
const helpVars = JSON.parse(fs.readFileSync(`${SRC}/help_variables.json`,'utf8')).vars;
const helpVarsByLower: Record<string,{key:string,entry:any}> = {};
for (const [k, v] of Object.entries<any>(helpVars)) helpVarsByLower[k.toLowerCase()] = {key: k, entry: v};

const cvarRows = await sql`
  SELECT e.name, cv.source_file, cv.source_line, cv.flag_names, cv.on_change, cv.default_value, cv.group_name_in_source
  FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id
  JOIN versions v ON v.version=cv.version AND v.project=e.project
  WHERE e.project='ezquake' AND e.type='cvar' AND v.version='head'`;
const cvarQueue = cvarRows
  .filter(r => !/^sv_/.test(r.source_file))
  .filter(r => !(r.name.startsWith('hud_') && (HUD_FRAMEWORK.test(r.name) || HUD_POSITIONAL.test(r.name))))
  .map(r => ({ row: r, j: helpVarsByLower[(r.name as string).toLowerCase()] }))
  .filter(({j}) => !isDocumented(j?.entry))
  .map(({row, j}) => ({
    name: j?.key ?? row.name, type: 'cvar', in_json: !!j?.entry,
    system_generated: !!(j?.entry?.['system-generated']),
    source_file: row.source_file, source_line: row.source_line,
    group: row.group_name_in_source, on_change: row.on_change, default: row.default_value,
  }));
fs.writeFileSync('/tmp/cvar-queue.json', JSON.stringify(cvarQueue, null, 2));
console.log(`cvars:    ${cvarQueue.length}`);

// COMMANDS
const helpCmd = JSON.parse(fs.readFileSync(`${SRC}/help_commands.json`,'utf8'));
const cmdRows = await sql`
  SELECT e.name, cv.source_file, cv.source_line, cv.handler_fn
  FROM entities e JOIN command_versions cv ON cv.entity_id=e.id
  JOIN versions v ON v.version=cv.version AND v.project=e.project
  WHERE e.project='ezquake' AND e.type='command' AND v.version='head'`;
const cmdQueue = cmdRows
  .filter(r => !/^sv_/.test(r.source_file))
  .map(r => ({ row: r, j: helpCmd[r.name] || helpCmd[(r.name as string).toLowerCase()] }))
  .filter(({j}) => !isDocumented(j))
  .map(({row, j}) => ({
    name: row.name, type: 'command', in_json: !!j,
    system_generated: !!(j?.['system-generated']),
    source_file: row.source_file, source_line: row.source_line,
    handler_fn: row.handler_fn, is_plus_minus: /^[+-]/.test(row.name as string),
  }));
fs.writeFileSync('/tmp/cmd-queue.json', JSON.stringify(cmdQueue, null, 2));
console.log(`commands: ${cmdQueue.length}`);

// MACROS
const helpMacro = JSON.parse(fs.readFileSync(`${SRC}/help_macros.json`,'utf8'));
const macroRows = await sql`
  SELECT e.name, cv.source_file, cv.source_line, cv.macro_type, cv.teamplay_restricted, cv.handler_fn
  FROM entities e JOIN macro_versions cv ON cv.entity_id=e.id
  JOIN versions v ON v.version=cv.version AND v.project=e.project
  WHERE e.project='ezquake' AND e.type='macro' AND v.version='head'`;
const macroQueue = macroRows
  .filter(r => !/^sv_/.test(r.source_file))
  .map(r => ({ row: r, j: helpMacro[r.name] || helpMacro[(r.name as string).toLowerCase()] }))
  .filter(({j}) => !isDocumented(j))
  .map(({row, j}) => ({
    name: row.name, type: 'macro', in_json: !!j,
    system_generated: !!(j?.['system-generated']),
    source_file: row.source_file, source_line: row.source_line,
    macro_type: row.macro_type, teamplay_restricted: row.teamplay_restricted, handler_fn: row.handler_fn,
  }));
fs.writeFileSync('/tmp/macro-queue.json', JSON.stringify(macroQueue, null, 2));
console.log(`macros:   ${macroQueue.length}`);

// CMDLINE PARAMS
const helpClp = JSON.parse(fs.readFileSync(`${SRC}/help_cmdline_params.json`,'utf8'));
const clpRows = await sql`
  SELECT e.name, cv.source_file, cv.source_line, cv.arguments, cv.flags_json, cv.systems_json
  FROM entities e JOIN cmdline_param_versions cv ON cv.entity_id=e.id
  JOIN versions v ON v.version=cv.version AND v.project=e.project
  WHERE e.project='ezquake' AND e.type='cmdline_param' AND v.version='head'`;
const clpQueue = clpRows
  .filter(r => !/^sv_/.test(r.source_file))
  .map(r => ({ row: r, j: helpClp[r.name] || helpClp[(r.name as string).toLowerCase()] }))
  .filter(({j}) => !isDocumented(j))
  .map(({row, j}) => ({
    name: row.name, type: 'cmdline_param', in_json: !!j,
    system_generated: !!(j?.['system-generated']),
    source_file: row.source_file, source_line: row.source_line,
    is_negation: /^-no/i.test(row.name as string),
    arguments: row.arguments, flags: row.flags_json, systems: row.systems_json,
  }));
fs.writeFileSync('/tmp/cmdline-queue.json', JSON.stringify(clpQueue, null, 2));
console.log(`cmdline:  ${clpQueue.length}`);

await sql.end();
```

Reference baseline (2026-05-14): 128 cvars / 157 commands / 38 macros / 56 cmdline. If your fresh run differs by more than ~10%, ezQuake source has shifted significantly — re-validate the rubric against current state.

Pre-flight checks:
1. `versions` table has a fresh ezquake `version='head'` row (run loader if stale)
2. `help_*.json` files in `research/repos/ezquake-source/` are at current HEAD (`git pull` if drifted)

## Pre-flight: locked dials (2026-05-14)

1. **Scope (calibration first):** cvars only for the first /goal run. ~128 entries → ~80 after family collapse. If rubric tuning surfaces during the operator's review pass, fix before commands / macros / cmdline runs.
2. **Confidence threshold for auto-draft:** draft prose for every `needs_doc` verdict; med/low confidence get a `confidence` tag for the post-hoc review pass. Maximizes raw material for operator review before ciscon submission.
3. **House style:** terse single-sentence default for cvars (matches existing ezQuake entries). Multi-sentence for commands per the style guide. No upstream-PR-style rationale prose.
4. **Family collapse aggressiveness:** conservative. Only collapse when family head is already documented or is trivial to draft. Edge cases without a documentable head go to per-entry verdicts.
5. **Domain-loaded families (`re_trigger_match_*`, `internal*`, `qwm_*`, `qws_*`):** family_collapse verdict with augmented head desc. See worked example 2.
6. **Output ambition (autonomous mode):** YAML verdicts in `/tmp/audit-batch-*.yaml` + aggregate summary doc at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries.md`. **No autonomous PR-diff staging, no autonomous classifications-yaml appends, no autonomous GitHub-issue creation.** Those are human-gated steps after the operator's review pass.

## Run-naming convention (namespaced batch files)

Each entity-type run writes its batch yamls to `/tmp/audit-batch-<type>-<source_file>.yaml`, where `<type>` is one of `cvar`, `command`, `macro`, `cmdline`. The wave dispatcher's idempotency check globs `/tmp/audit-batch-<type>-*.yaml` for the current entity type — never the bare `/tmp/audit-batch-*.yaml` — so concurrent or sequential runs across types do not collide.

**Why:** source files often register multiple entity types (e.g., `cl_main.c` has both cvars and commands). Without namespacing, the command run would treat the cvar pass's `/tmp/audit-batch-cl_main.c.yaml` as a finished command batch and skip it.

**Existing batches:**
- Cvar pass (2026-05-14): `/tmp/audit-batch-cvar-<source_file>.yaml` (37 files)

**Pre-flight before firing a new entity-type run:** verify no stray `/tmp/audit-batch-*.yaml` files exist without a type prefix. If any are found, rename them with the appropriate type prefix or move them out of `/tmp/`.

## Completion contract (paste-ready for /goal)

Run one /goal per entity type. For the cvar calibration run, paste this as the `/goal` condition:

```
All entries in /tmp/cvar-queue.json have a verdict written to a
/tmp/audit-batch-<source_file>.yaml file (batch-file count equals
distinct source_file count from the queue). The aggregate doc exists
at apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries.md
with verdict counts in the summary that sum to the queue total (allowing
family_collapse rows to cover multiple entries per row). Claude has
printed a WAVE STATUS block at the end of the most recent turn ending
with the line "STATUS_DONE: yes".
```

**Status-block contract** — Claude prints this verbatim at the end of every turn so the Haiku evaluator has a deterministic anchor:

```
WAVE STATUS:
  queue_entries: <N from /tmp/cvar-queue.json>
  distinct_source_files: <M>
  audit_batch_files_present: <K>
  batches_remaining: <M - K>
  aggregate_doc_exists: <true | false>
  aggregate_counts: needs_doc=<A> no_doc=<B> family_collapse=<C> kick_to_ciscon=<D>
STATUS_DONE: <yes | no>
```

`STATUS_DONE: yes` requires `batches_remaining == 0` AND `aggregate_doc_exists == true` AND `A + B + C + D >= queue_entries` (family_collapse rows can cover multiple entries, so >=, not ==).

**Idempotency in the dispatch loop:** before dispatching each wave, list `/tmp/audit-batch-*.yaml` and skip any source_file whose batch yaml already exists. Pull the remaining-batch list fresh each turn rather than relying on in-memory state — prevents re-running finished batches if the goal loop re-fires or context compresses mid-run.

**Wave shape inside each /goal turn:**
1. Read `/tmp/<type>-queue.json` (e.g., `cvar-queue.json`, `cmd-queue.json`, `macro-queue.json`, `cmdline-queue.json`); group by `source_file`.
2. List existing `/tmp/audit-batch-<type>-*.yaml` for the current entity type; subtract from the queue's source-file set to get pending batches.
3. Dispatch 4-6 sub-agents in parallel (one Agent tool call per pending batch up to the wave width), each using the handoff prompt below.
4. After all sub-agents return, write any new yaml files they produced (path: `/tmp/audit-batch-<type>-<source_file>.yaml`).
5. If pending batches remain after this wave, halt the turn and print WAVE STATUS with `STATUS_DONE: no`. /goal will fire the next turn.
6. If no pending batches remain, write the aggregate summary doc by reading all `/tmp/audit-batch-<type>-*.yaml` files for the current entity type (see "Aggregator rules" below), then print WAVE STATUS with `STATUS_DONE: yes`.

Wave width of 4-6 keeps token spend per turn bounded; ~5-8 turns covers cvars.

**Aggregator rules (load-bearing — calibration run revealed a row-selection bug):**

When grouping family_collapse rows for the aggregate doc's family-collapse section:
1. For each distinct `family_head` value, find the row where `name == family_head` AND `proposed_desc` is non-null. Use that row's `proposed_desc` as the augmented head description.
2. If no such row exists (head is already documented in help_*.json and was excluded from the queue), do NOT emit an augmented head description for that family. Output the family group with members listed and the note "Head already documented in help_*.json — existing description stays" — but no `> ` quote block.
3. NEVER pick by alphabetical order or by first-occurrence. The calibration run's `cl_mvinset` and `hud_score_*_digits` families failed under first-occurrence selection.
4. Sanity-check each family group: `family_head` and `family_members` fields must match across all rows in the group; member rows must have `proposed_desc: null`. If checks fail, log to a `/tmp/aggregator-warnings.yaml` file rather than silently merging.

When writing per-source-file groups in the needs_doc high-confidence section, count is sum of rows in that group (family_collapse member rows do not appear in this section; they appear only in the family_collapse section).

## Handoff prompt template (paste-ready for executor agent)

```
You are auditing ezQuake help-JSON empty entries for [entity_type]. Your batch:

[paste source_file batch from queue JSON — 1 to 18 entries]

For each entity, gather evidence:
1. Read source registration line + 5 lines around it
2. Grep `<entity_name>` in `research/repos/ezquake-source/src/` to find read sites
3. If on_change handler is set, read its body
4. Look at 2-3 documented siblings in the same source file for style match
5. Note the group_name_in_source value

Apply the verdict rubric (kick_to_ciscon → family_collapse → no_doc → needs_doc, first match wins).

For needs_doc verdicts, draft a description for EVERY confidence level (high, medium, AND low — never skip the draft because confidence is low; flag confidence in the output instead). Match ezQuake house style:
- Single sentence preferred for cvars; multi-sentence for commands
- Imperative or noun-fragment opening
- Don't restate type
- Mention defaults/units only when non-obvious
- Reference contrasting siblings when behavior overlaps
- Terse default (no upstream-PR-style rationale prose — dial locked 2026-05-14)

Output as YAML rows in the form:

  - name: <entity_name>
    type: cvar  # or command, macro, cmdline_param
    verdict: needs_doc  # or no_doc, family_collapse, kick_to_ciscon
    confidence: high  # or medium, low (only for needs_doc)
    proposed_desc: |
      <draft description, OR null for family_collapse member rows>
    reasoning: |
      <evidence summary, 1-3 lines>
    family_head: <if family_collapse: name of head entity>
    family_members: [list of all member names — same on every row in the group]
    ciscon_question: |
      <if kick_to_ciscon: the specific question>

**Family_collapse row rules (tightened post-calibration 2026-05-14 + 2026-05-15):**
- BEFORE emitting any family_collapse row, apply the shape tests (see parking doc § "family_collapse" for full definitions):
  - **Shape A (enumeration)**: members interchangeable except for an enumeration index (e.g., `_0..9`, `_r/_g/_b`, `track1..4`). Lit-test: can ONE sentence describe all members with only the index varying?
  - **Shape B (mirror-pair)**: exactly 2 members forming a press/release or on/off pair (e.g., `+fire`/`-fire`, `-foo`/`-nofoo`). Lit-test: do the two members form SEMANTICALLY OPPOSITE actions on the same target?
  - If NEITHER shape passes (members differ by axis / dimension / role / distinct parameter), emit individual needs_doc rows instead.
- Family-head row (name == family_head): `proposed_desc` filled with the augmented head description (covering all members for Shape A; both press and release actions for Shape B).
- Member rows (name != family_head but is in family_members): `proposed_desc: null`. The head row's description covers them.
- If the family head is not in the queue (already documented in help_*.json with non-empty desc): emit ONLY member rows with `proposed_desc: null`. Do NOT invent a head row. The aggregator leaves the existing head desc untouched.

Save to `/tmp/audit-batch-<type>-<source_file>.yaml` (the orchestrator will tell you which `<type>` — cvar/command/macro/cmdline — applies for this run).
Do NOT edit help_*.json directly. Do NOT modify the classifications yaml directly.
Aggregation happens in a separate pass per the parking doc's "Aggregator rules".
```

## Why this is parking-doc shaped, not arc-shaped

This is a single project, not a multi-phase implementation arc. The work fans out across files but doesn't have phase boundaries with cross-phase decisions. The arc-skill machinery (decisions / review-findings / handoff-prompt as separate files) would be overkill. One parking doc + one runbook + paste-ready prompt is the right scope.

If this becomes recurring (run after each ezQuake release to catch new empty entries), promote to a skill at `.claude/skills/audit-ezquake-help-gaps/`. Until then, fire-and-forget.

## Carry-forwards / related

- **`apps/qw-oracle/docs/upstream-prs/ezquake-help-json-coverage-gaps.md`** — the 28 server-side cvars with inline comments, parked on QW-Group convention question. This audit explicitly inherits that decision (filter all `sv_*` source files).
- **`apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml`** — existing classification scheme (renamed / retired_pre_walk_floor / never_implemented / aspirational_documentation). Add new values: `self_documenting`, `internal_scratch_register`, `family_member`.
- **PR #1117 (`c9dec3d9`)** — drift cleanup precedent. Style and structure of any upstream PR from this audit should mirror it.
- **`extraction-review` skill** — currently flags doc_only entities as findings. Could extend to flag empty-desc entities the same way once classifications exist.
