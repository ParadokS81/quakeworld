---
name: guide-rewrite
description: Use this skill when converting ezquake.com/docs guide pages into qw-oracle Layer 3 concept notes at apps/qw-oracle/curated/concept-notes/. Triggers on "guide rewrite", "rewrite guide", "layer 3 rewrite", "convert ezquake.com docs page", "import guide", "path 2 authoring", or whenever the user names a specific ezquake.com/docs page (weapon-scripts, teamplay-communication, scripting, multiview, HUD, crosshairs, particles, server-browser, message-filtering, voice-support, video-capture, frag-tracker, player-skins, charsets, fakeshaft, independent-physics, textures, macros, triggers, command-line-parameters). ALSO triggers on "work on the guides", "tackle the docs", "next guide", "layer 3 foundation work", or anytime the user is picking through ezquake.com/docs taxonomy. The skill guides entity verification against Layer 1, coverage-gap detection against current head source, cross-engine checks, breadcrumb capture for the gap-report (contributor onboarding kit for ezquake.com), and commit-ready output.
---

# guide-rewrite

One ezquake.com/docs guide per invocation. Produces a Layer 3 concept note in `apps/qw-oracle/curated/concept-notes/` plus gap-report entries for eventual upstream-PR work back to ezquake.com.

The eleven phases are numbered for the procedural checklist style. Phases 2-6 are mechanical (Sonnet-suitable subagent tasks); phases 1, 7, 7.5, 8-10 are judgment (stay in main Opus session). **Phase 7.5 (operator consult) is a gate — Phase 8 authoring does not begin until operator answers land. See OPERATIONS.md §7 entry "All-datasets-verified gate before drafting" for the rationale.**

## Inputs

Ask the user for any missing value:
- **guide** — the ezquake.com/docs page name (e.g. `weapon-scripts`, `teamplay-communication`, `settings/hud`). Confirm the file exists at `research/repos/ezquake-docs/docs/docs/<page>.md`.

Enforce monorepo root: `pwd` should end in `quakeworld` or a worktree of it. If not, tell the user to cd there.

## Context files to load at start

Always read before beginning phase 1:
- `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` — stewardship playbook. Has the Path 1 vs Path 2 criteria, lifecycle handling, attribution norms, feedback-loop protocol.
- `apps/qw-oracle/curated/concept-notes/README.md` — entry template with frontmatter schema and four recognized shapes.

These two documents govern the work. Refer back to them when classifying the guide (phase 7) and composing the note (phase 8). The skill does not duplicate their content.

Supporting context:
- Worked example: `references/worked-example.md` — the weapon-scripts.md test case walkthrough, illustrating each phase's output shape.

---

## Phase 1 — Intake (main session)

1. Confirm the guide name with the user. Validate the file exists:
   ```bash
   test -f research/repos/ezquake-docs/docs/docs/<page>.md && echo ok
   ```
2. Read the guide's full content.
3. List existing notes in `apps/qw-oracle/curated/concept-notes/` and check whether the topic is already covered. If a note exists with overlapping scope, this is a **revision path** — treat the existing note as the baseline, merge findings rather than creating a new file. If nothing overlaps, this is a **fresh rewrite path**.
4. Note the guide's last-content-edit date from git: `git -C research/repos/ezquake-docs log -1 --format=%ad --date=short -- docs/docs/<page>.md`. Pages last edited <= 2022-11-21 are presumed stale by default.

Output: user-confirmed guide name, path classification (revision vs fresh), guide's stale-date context.

## Phase 2 — Entity extraction (Sonnet subagent)

Spawn a Sonnet subagent with the guide body as input. Extract mentions of:
- **cvars** — look for lowercase snake_case identifiers like `cl_*`, `r_*`, `gl_*`, `scr_*`, `hud_*`, `sv_*`, backticks or code fences surrounding a bare word.
- **commands** — similar format; also `+name` / `-name` toggle pairs; `weapon`, `impulse`, `bind`, `alias` common verbs.
- **macros** — `$name` references inside script examples.
- **keynames** — `KEY_X`, `aux1`..`aux32`, mouse buttons.

Return a categorized list:
```
cvars: [cl_weaponpreselect, cl_weaponhide, ...]
commands: [weapon, impulse, +attack, ...]
macros: [bestweapon, bestammo]
keynames: [mouse1, q]
```

Deduplicate. Preserve form (a guide saying `fire` gets recorded as `fire`, not silently normalized to `+fire`).

## Phase 3 — Layer 1 verification (Sonnet subagent)

For each entity, query ezQuake Layer 1 at head:
```bash
sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name, type, first_seen_version, source_state FROM entities WHERE project='ezquake' AND name='<name>';"
```

Classify each:
- **exists_in_layer1** — exact name match + correct type.
- **exists_but_different_form** — guide name not found; a related form is (e.g., guide says `fire`, Layer 1 has `+fire` and `-fire`). Record the actual Layer 1 names.
- **not_in_layer1** — neither the exact name nor any obvious variant.

Keep `+name` / `-name` toggle pairs together when reporting — they are typically bound as pairs in real usage.

**`source_state` is load-bearing.** Layer 1's `source_state` column has values `source_backed | doc_only | source_retired | dynamically_registered`. Every entity row in this phase's output — both for input entities AND for any broader-scan related-entity results — must carry its `source_state`. A `doc_only` row indicates drift between help-JSON and source (either extractor miss or upstream help-JSON stale; see HANDOVER.md `Layer 1 doc_only audit`). Never promote a `doc_only` row to a coverage-gap recommendation in phase 5 without first confirming the underlying entity actually exists in current source via phase 4 grep. Dropping `source_state` from output tables is how `cl_weaponforgetondeath` got silently promoted to a coverage-gap set during the weapon-scripts calibration run — don't repeat the mistake.

Output: per-entity record with classification + Layer 1 details + `source_state`. Broader-scan related-entity tables must also carry `source_state` per row.

## Phase 4 — Source corroboration (Sonnet subagent, conditional)

Run only for `not_in_layer1` and `exists_but_different_form` cases from phase 3.

For each case, grep the ezQuake source:
```bash
grep -rn "\"<name>\"" research/repos/ezquake-source/src/ | head -10
grep -rn "Cmd_AddCommand.*\"<name>\"" research/repos/ezquake-source/src/
grep -rn "Cvar_Register.*<name>" research/repos/ezquake-source/src/
```

Distinguish three outcomes:
- **(a) Layer 1 extraction gap** — source has the entity, Layer 1 doesn't. Rare. Flag for separate investigation; not a blocker for this rewrite (record the Layer 1 gap as a handover item).
- **(b) Guide error** — neither source nor Layer 1 has the entity as described. The guide is wrong (or the name is a colloquialism, a user-defined alias, or misremembering). Record the correction intent for phase 8.
- **(c) Cross-engine confusion** — not in ezQuake but suspected in FTE/MVDSV/KTX. Mark for phase 6.

## Phase 5 — Coverage gap detection (Sonnet subagent)

Identify current head entities in the guide's topic area that the guide does NOT mention. Strategy varies by topic:

- **Command-centric guides** (weapon-scripts, scripting, teamplay) — inspect the relevant source file(s) from the guide's domain (`src/cl_input.c`, `src/cl_cmd.c`, etc.) for `Cmd_AddCommand` registrations in the topic area; cross-reference against Layer 1 to get the full command list; diff against the guide's mentioned commands.
- **Cvar-centric guides** (graphics, crosshairs, particles) — query Layer 1 for cvars matching a naming prefix (`gl_`, `scr_crosshair*`, etc.); diff against guide mentions.
- **Feature-walkthrough guides** (multiview, voice-support, video-capture) — search source for topic-specific registration sites; diff against guide mentions.

For each missing entity, record:
- name + type
- Layer 1 `first_seen_version` — **query `cvar_versions.version` (the per-version history table), NOT `entities.first_seen_version`**. The entity-row column has known drift on some cvars where it reports `head` while the cvar_versions table shows the entity back to 3.6.1. See `HANDOVER.md` § "Layer 1 cvar_versions vs entities first_seen_version drift" for the lookup pattern.
- Layer 1 `source_state` (**required** — filter `doc_only` rows out of the coverage-gap set unless phase 4 grep confirms the entity is currently in source)
- **Layer 1 `help_desc` AND `help_remarks` from `cvar_versions`, both verbatim** (NOT paraphrased; quote the exact help-text). The `help_remarks` field carries load-bearing operational caveats — *"Has no effect if particle shaft is enabled,"* *"QTV/MVD only, KTX 1.38+ only,"* *"Has no effect if X is blank"* — which entirely change a cvar's effective scope. Pulling only `help_desc` produces wrong-but-plausible note content. Both fields, every time.
  - SQL pattern: `SELECT cv.help_desc, cv.help_remarks FROM cvar_versions cv WHERE cv.entity_id = (SELECT id FROM entities WHERE project='ezquake' AND name='<cvar>') ORDER BY cv.version DESC LIMIT 1;`
- suggested upstream placement (which section of the existing guide page it could slot into)

Output: list of coverage-gap entries ready for phase 9 gap-report capture. Any entity flagged `source_state=doc_only` that can't be confirmed in current source via phase 4 is NOT a coverage-gap candidate — it's either a `removed-but-help-stale` finding or a `never-registered phantom` and belongs in the HANDOVER `Layer 1 doc_only audit` lane, not in the guide's gap report.

### Phase 5b — Ruleset restriction scan (required when any cvar/command in the entity set could plausibly be ruleset-affected)

The ezQuake ruleset system enforces restrictions across SIX distinct mechanisms. A scan that only checks one or two will produce false-negatives on the rest. ALL SIX must be checked for every entity in scope before classification.

**The six mechanisms:**

1. **`disabled_cvars[]` arrays in `src/rulesets.c`.** Per-ruleset tables that force CVAR_ROM lock + a fixed value. Grep: `grep -n "disabled_cvars" research/repos/ezquake-source/src/rulesets.c`.
2. **`CVAR_RULESET_MIN | CVAR_RULESET_MAX` flags at cvar declaration.** Permanent value clamps baked into the cvar declaration itself; enforced unconditionally regardless of active ruleset. Format: `cvar_t name = { "name", "default", CVAR_RULESET_MAX | CVAR_RULESET_MIN, NULL, MIN, MAX, STEP };`. Grep: `grep -n "CVAR_RULESET_MIN\|CVAR_RULESET_MAX" research/repos/ezquake-source/src/`.
3. **`Rulesets_OnChange_*` handlers.** Per-cvar callbacks that may reject value changes, broadcast new values via `say`, or apply context-dependent transforms. Grep: `grep -n "Rulesets_OnChange" research/repos/ezquake-source/src/rulesets.c`.
4. **Behavior gates — `Rulesets_RestrictX()` checks at read sites.** The cvar value is left alone but the code path that reads it short-circuits when a ruleset is active. The cvar is "settable but inert." Examples: `Rulesets_RestrictParticles()`, `Rulesets_RestrictPlay()`, `Rulesets_RestrictTriggers()`. Grep: `grep -rn "Rulesets_Restrict" research/repos/ezquake-source/src/`.
5. **Hard-coded clamps in cvar read sites.** `bound(MIN, cvar.value, MAX)` calls or `if (Rulesets_...) val = X` overrides applied at the place the cvar value is read by render/update code. Grep per cvar: `grep -rn "<cvarname>\.value\|<cvarname>\.integer\|<cvarname>\.string" research/repos/ezquake-source/src/`.
6. **CVAR flag-based restrictions at declaration.** Flags like `CVAR_SEMICHEAT`, `CVAR_LATCH`, `CVAR_ROM` set permanently at declaration time (separate from ruleset-activated flags).

**Output schema for the ruleset scan** — one row per (entity, ruleset) pair:

| entity | mechanism 1 | mechanism 2 | mechanism 3 | mechanism 4 | mechanism 5 | mechanism 6 | per-ruleset verdict (smackdown / qcon / thunderdome / mtfl / smackdrive / default) |

The per-ruleset verdict resolves to one of: **locked** (Tier 1 — CVAR_ROM, can't change), **clamped** (Tier 3 — value forced into a range), **behavior-gated** (Tier 2 — settable but inert/silently overridden), **free** (no restriction).

**Critical:** do NOT claim "free" for any cvar without verifying ALL SIX mechanisms come up empty. The 2026-04-25 lightning-gun-customization session shipped a draft that recommended `r_shaftalpha 0.6` for competitive play because the ruleset scan only checked mechanism 1 (disabled_cvars[]) and missed mechanism 4 (the behavior gate at `cl_tent.c:881` that nullifies r_shaftalpha under smackdown). All six, every time.

**Available rulesets in ezQuake** (from `src/rulesets.c`): `default`, `smackdown`, `qcon`, `thunderdome`, `mtfl`, `smackdrive`. There is NO `ktx` ruleset in the client — KTX is the server-side mod that activates client rulesets, not a ruleset itself.

This phase's output feeds Phase 5 coverage-gap recording (each gap entity carries its per-ruleset verdict) AND Phase 7.5 operator consult (operator confirms or refutes the scan's findings, especially for post-3.6.6 head-only additions which may not yet have ruleset audit).

## Phase 6 — Cross-engine check (Sonnet subagent, conditional)

Run when:
- The guide explicitly mentions or implies cross-engine applicability ("this works in FTE too", "in any QW client").
- Phase 4 identified cross-engine-suspicion cases.
- The topic is historically cross-engine (teamsays, HUD, multiview, server-browser).

For each relevant entity/concept, grep other engine sources:
```bash
grep -rn "<entity>" research/repos/fte-source/ 2>/dev/null | head -5
grep -rn "<entity>" research/repos/mvdsv-source/ 2>/dev/null | head -5
grep -rn "<entity>" research/repos/ktx-source/ 2>/dev/null | head -5
```

Classify:
- **cross_engine_covered** — entity exists with matching semantics in other engine(s). Note which.
- **cross_engine_tbd_pending_phase_2d_2e** — the entity MAY exist in other engines but the skill is not Layer 1 for those engines; full verification defers to when Phase 2d (FTE) / 2e (MVDSV+KTX) extractors land. Record the finding as a hold-for-later marker.
- **cross_engine_not_applicable** — concept is ezQuake-specific (engine-internal, ezQuake UI, ezQuake-specific feature).

Output: per-entity cross-engine classification + scope recommendation for phase 8 frontmatter (`scope` field + `engines_covered` list).

### Phase 6b — userinfo/serverinfo hub-note cross-check (conditional)

Run when the feature you are documenting reads or writes any **userinfo/serverinfo key** -- tells: the guide mentions `setinfo`/`fullinfo`, the entity set includes `CVAR_USERINFO` cvars (`name`, `rate`, `team`, `skin`, `kf`, ...), or the source greps hit `ezinfokey(`/`iKey(`/`Info_SetStar(`/`Info_ValueForKey(`.

`qw-userinfo-serverinfo-protocol.md` is the **hub note**: it owns the cross-codebase "how userinfo works" story (client publishes -> mvdsv stores/guards/stamps -> KTX reads). Your feature note is a **spoke**: it owns its vertical and leans on the hub for the plumbing. So:

1. **Read the hub note's "key families" section.** If your feature uses a key that is missing from the family map, add it there (or flag it for addition) -- the hub is meant to inventory every userinfo/serverinfo key by family.
2. **Cross-link, do not duplicate.** Your note's `See also` references the hub for the mechanics; do not re-explain the `*`-key rule, the setinfo path, or the engine-key-vs-mod-key split -- point at the hub. The hub, in turn, names your feature as the owner of that key's vertical.
3. **Route by who owns the meaning** (the hub's discipline): a client-cvar key borrows ezQuake's description; a server-stamped `*`-key is mvdsv's; a KTX gameplay code is KTX's. Document the owner, not the consumer.

---

## Phase 7 — Classification and path decision (main session)

Given findings from phases 2-6, classify the guide:

| Classification | Criteria | Path | Effort |
|---|---|---|---|
| `accurate` | All phase-3 entities `exists_in_layer1` with correct semantics; phase-5 surfaces zero or near-zero coverage gaps; no stale framing | Path 1 (light-edit mirror) | low |
| `minor-updates` | Small number of coverage gaps; one or two entity-form mismatches; framing largely current | Path 1 (light-edit mirror with noted additions) | low-medium |
| `substantial-rewrite` | Significant coverage gaps; framing dated; multiple entity errors; guide omits a whole sub-area of current practice | Path 2 (rewrite, guide as source material) | medium-high |
| `stale-beyond-repair` | Most of the guide describes features that no longer exist; rewriting is authoring a new doc with the old title | Path 2 (effectively new authoring; cite old guide briefly) | high |

**Default path is Path 2** per OPERATIONS.md §2. Path 1 applies only when the guide genuinely describes present-day mechanisms without substantial omissions — rare given the 6-years-single-maintainer reality of ezquake.com/docs.

**Also output: R-label assignment for the note.** From the role map in `docs/superpowers/specs/2026-04-24-layer3-role-map.md`:
- **R1** Why-it-exists context (history, lineage)
- **R2** Feature-family workflow narrative (cvar/command family ordered as a journey)
- **R3** Pattern library (reusable script/config shape with worked examples)
- **R4** Convention specs (file format / naming grammar)
- **R5** Infrastructure / tool-builder synthesis (source-archaeology)
- **R6** Player how-to (short task prose)
- **R7** Opinionated community best-practice (normative recommendations)

Notes typically blend 2-3 R labels (e.g. weapon-scripts = R3+R1+R7; lightning-gun-customization = R2+R7). Record the labels — they drive Phase 7.5 question selection.

Record the classification + path decision + R labels + one-paragraph rationale. Share with user before phase 7.5.

## Phase 7.5 — Operator consult (main session, GATE)

**Phase 8 authoring does not begin until operator answers land.** This is a gate, not a courtesy. Driven by the 2026-04-25 lesson captured in OPERATIONS.md §7 entry "All-datasets-verified gate before drafting": speculative drafts based on source-only data have produced wrong recipes (recommending ruleset-prohibited cvars for competitive play) and wrong scope (framing too narrow, missing community-recognized umbrella).

The consult is **focused, not open-ended**. Present a compact data summary in front of the operator and ask role-keyed questions. Operator answers in 1-3 turns; authoring begins.

### Required for every consult

Present the operator with:
- Entity set found (count + categories: cvars, commands, assets).
- Coverage gaps surfaced (what the upstream guide misses).
- Per-ruleset verdict from Phase 5b (locked / clamped / behavior-gated / free for each entity, especially smackdown).
- Cross-engine verdict (single-engine / cross-engine / TBD).
- Proposed note title + section list + R-label guess.

### Role-keyed question template

Ask only the questions matching the note's R labels. Skip the others.

**For R7-flavored notes (opinionated recipes, "most players use X"):**
- What's your actual current configuration in this domain? (Provide cvar names + values verbatim.)
- What do you observe as majority community practice — same as your config, or different?
- Any known-wrong configurations a newcomer would arrive at from upstream docs that should get explicitly called out?
- Field-verified restrictions the source scan might have missed? (Especially for post-3.6.6 head-only additions — the scan may not catch restrictions that haven't been formally encoded yet.)
- Any silent-override gotchas? (Cvars that smackdown / qcon nullifies without notification.)

**For R2-flavored notes (feature-family workflow):**
- Does the proposed section ordering match how players actually mentally walk through this feature?
- Is the umbrella-scope right? (`fakeshaft` vs `lightning-gun-customization` was this question.)
- Any community-recognized aliases for the topic? (LG / lightning gun / shaft → all three should be discoverable.)

**For R3-flavored notes (pattern library):**
- Is the proposed pattern the canonical form, or are there community variants worth listing?
- Any common misuses or anti-patterns of this shape worth calling out?

**For R1-flavored notes (history):**
- Pre-vikpe-era authors / forum threads / Discord context that should surface in attribution?
- Is the historical arc framed correctly, or is there a pivot moment the source-archaeology missed?

**For R4-flavored notes (convention specs):**
- Usually no consult needed — grammar is grammar. Skip unless operator has format extensions or community variants to surface.

**For R5-flavored notes (infrastructure synthesis):**
- Generally Path-2 authored from source-archaeology. Light consult on attribution + threat-model framing is enough.

**For R6-flavored notes (short how-to):**
- Is the procedure step-correct? Ground-truth verification.

### What to do with operator answers

- **Recipe / configuration values:** quote verbatim in the note's Summary section. Cite operator as SME in `primary_contributors`.
- **Scope correction:** if operator widens or narrows scope, may require a Phase 5/6 scope-extension subagent run (cheap to loop). Do that loop before authoring; don't draft on stale data.
- **Field-verified restrictions:** if operator names a restriction the scan didn't find, either run a focused verification subagent OR flag in the note as "operator-flagged, verification pending" with explicit caveat. Don't claim restrictions the source scan can't ground.
- **Gotchas / silent overrides:** preserve as named findings in the relevant section. These are exactly the player-value content the upstream guides omit.

### When to skip Phase 7.5

Only valid skip cases:
- Pure R4 convention spec where operator has no format extensions to add.
- Pure R5 infrastructure note authored entirely from source archaeology with no recipe/recommendation content.
- Re-import of a Path-1 mirror where the upstream is being light-edited and operator has nothing to add.

Default: run the consult. The cost of asking is low; the cost of a speculative draft is operator turns + rewrite churn.

## Phase 8 — Authoring (main session)

**Pre-condition: Phase 7.5 consult complete.** Do not enter authoring with open consult questions. If operator answers are partial, surface the gaps and request them rather than drafting on assumptions.

Draft the Layer 3 note using `apps/qw-oracle/curated/concept-notes/README.md` template.

Required frontmatter (full schema in README.md; most common fields below):

```yaml
---
title: "<short human title>"
slug: <matches filename stem>
topic: <asset-lifecycle | classifier-metadata | domain-guide | security-policy | ...>
status: draft
authored_by: qw-oracle     # for Path 2; community for Path 1
source_url: https://ezquake.com/docs/<page>
imported_from: <commit sha of upstream guide file>
last_imported_at: <YYYY-MM-DD today>
upstream_status: gap-candidate | upstream-pending | imported | authored
upstream_target: <ezquake.com page slug to offer back, usually same page>
primary_contributors:
  - "@vikpe"
  - "@<pre-vikpe-era feature author if identifiable from Layer 1 blame>"
related_entities:
  - ezquake:cvar:<name>
  - ezquake:command:<name>
  - ezquake:commit:<sha>
scope: engine-specific    # or universal | cross-engine — from phase 6
engines_covered: [ezquake]    # add fte when phase 6 confirms it
last_updated: <YYYY-MM-DD today>
---
```

Body shape: one of the four in README.md (narrative/history, taxonomy/classifier, domain walkthrough, policy+iteration story). If none fit, propose a fifth shape (e.g., tutorial/how-to) and document the rationale inline in a References section note.

Body sections follow README.md: `## Summary`, `## <topic-specific 2-4 sections>`, `## Consumer implications`, `## References`, `## Related concept notes`.

**References section must include:**
- Upstream guide citation: `Source guide: https://ezquake.com/docs/<page> (imported <date>, commit <sha>)`
- Pre-vikpe era attribution where identifiable: `Original <feature> implementation: commit <sha>, <author handle or name>, <year>` (trace via Layer 1 blame — see `source_overrides` table).
- Hold-for-later markers from phase 6: `Cross-engine coverage (FTE/MVDSV/KTX): TBD pending Phase 2d/2e Layer 1 extraction. See HANDOVER.md § Phase 2d-2h.`
- Layer 1 gaps (from phase 4 case a) if any: `Note: entity <name> appears in source but is missing from Layer 1 at head; investigate extractor coverage.`

## Phase 9 — Breadcrumb capture (main session)

Produce three outputs:

**(a) Gap-report entries.** Append to `apps/qw-oracle/curated/concept-notes/_gap-report.md` (create with a `# Gap report` header if it doesn't exist). For each coverage gap from phase 5, an entry:

```markdown
### <entity-name> (<type>)

- **Oracle Layer 1 first_seen:** <version>
- **Current desc:** <Layer 1 desc or "system-generated, empty">
- **Upstream page:** <ezquake.com/docs/<page>>
- **Suggested placement:** <which section of the upstream page>
- **Notes:** <one-line context>
```

**(b) Hold-for-later markers.** Already written into the note's References section during phase 8. Confirm they are there.

**(c) OPERATIONS.md learning candidates.** Review what this session revealed that is not yet in OPERATIONS.md. Candidates:
- A new note shape encountered.
- A new frontmatter field need.
- A new attribution edge case.
- A new failure mode in the workflow.

If any, propose edits to the appropriate OPERATIONS.md section (usually §6 feedback-loop protocol or §7 open questions) and show the user for approval. Do not edit OPERATIONS.md without approval. Per OPERATIONS.md §6: wait for the second instance before adding a feature-level rule; one data point is a heads-up, not a pattern yet.

## Phase 10 — Review and commit (main session)

Show the user:
1. The drafted Layer 3 note (full content).
2. The gap-report additions.
3. Any proposed OPERATIONS.md edits.

Accept user feedback; iterate once if needed. When approved, commit:

```bash
git add apps/qw-oracle/curated/concept-notes/<slug>.md apps/qw-oracle/curated/concept-notes/_gap-report.md [apps/qw-oracle/curated/concept-notes/OPERATIONS.md]
git commit -m "$(cat <<'EOF'
docs(qw-oracle): <slug> — Path <1|2> <mirror|rewrite> from ezquake.com/docs/<page>

<one-paragraph describing key findings: classification, notable coverage gaps,
cross-engine status, attribution chain>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Push when user confirms (do not auto-push).

---

## Side-effect routing

| Output | Destination |
|---|---|
| Primary Layer 3 note | `apps/qw-oracle/curated/concept-notes/<slug>.md` |
| Gap-report entries | `apps/qw-oracle/curated/concept-notes/_gap-report.md` (append-only, grows over time) |
| OPERATIONS.md learning proposal | `apps/qw-oracle/curated/concept-notes/OPERATIONS.md` (only with user approval) |
| Entity-verification findings for the note | Inline in the note's `## References` section |
| Layer 1 extraction gap (phase 4 case a) | `HANDOVER.md` entry, not in-note |

## Delegation split

| Phase | Model | Why |
|---|---|---|
| 1 Intake | Opus (main) | Judgment on revision vs fresh path; file presence checks |
| 2 Entity extraction | Sonnet subagent | Mechanical regex over prose |
| 3 Layer 1 verification | Sonnet subagent | Mechanical SQL queries |
| 4 Source corroboration | Sonnet subagent | Mechanical grep + pattern matching |
| 5 Coverage gap detection | Sonnet subagent | Mechanical scan against Layer 1 + source |
| 6 Cross-engine check | Sonnet subagent | Mechanical grep across other engines |
| 7 Classification | Opus (main) | Judgment call on path decision + R-label assignment |
| 7.5 Operator consult | Opus (main) | Gate; role-keyed questions; recipe + scope + restriction validation |
| 8 Authoring | Opus (main) | Synthesis, tone, structure — only after consult complete |
| 9 Breadcrumb capture | Opus (main) | Judgment on OPERATIONS.md learnings |
| 10 Review + commit | Opus (main) | User interaction |

Spawn Sonnet subagents with the Agent tool using `subagent_type: "general-purpose"` and `model: "sonnet"`. Phases 2-6 can partially parallelize; phases 3 and 4 depend on phase 2's output so run sequentially. Phases 5 and 6 can run in parallel after phases 3-4 complete.

## Common pitfalls

- **Don't normalize entity names in phase 2.** If the guide says `fire`, record `fire`. Phase 3/4 are what distinguish guide-said-X from Layer-1-has-Y.
- **Don't skip phase 6 when cross-engine is implied.** Guides written for the QW community often assume cross-engine applicability without stating it. Err on the side of running the check.
- **Don't edit OPERATIONS.md without user approval.** Phase 9 proposes, does not commit. One data point is not a pattern.
- **Don't invent frontmatter fields** beyond README.md's schema without adding them to README.md first and capturing the rationale in OPERATIONS.md §3.
- **Don't treat Path 1 as default.** OPERATIONS.md §2 is explicit: Path 2 is the default given ezquake.com/docs staleness. Path 1 should be a deliberate judgment call, not an automatic path.
- **Don't write the gap-report as a PR queue.** OPERATIONS.md §7: gap-report is a **contributor onboarding kit**. Each entry must have enough context for someone else to write the missing upstream page from it.
- **Don't draft without operator consult on R7-flavored notes.** Phase 7.5 is a gate. Speculative recipes based on source-only data have produced wrong recommendations (recommending ruleset-prohibited cvars for competitive play). Ask before drafting.
- **Don't claim "free under all rulesets" without all six restriction mechanisms checked.** Phase 5b enumerates them: `disabled_cvars[]`, `CVAR_RULESET_MIN | CVAR_RULESET_MAX`, `Rulesets_OnChange_*`, behavior gates (`Rulesets_RestrictX()`), read-site clamps, declaration flags. Surface-scanning the first one that matches produces false negatives — this is exactly the failure mode that produced the 2026-04-25 lightning-gun-customization rewrite cycle.
- **Don't paraphrase Layer 1 `desc` field.** Quote verbatim. The help-text wording is authoritative; downstream LLMs benefit from the exact source phrasing rather than a paraphrase that may shade meaning.

## Escape hatches

- If the user interrupts mid-workflow, save what you have and ask whether to resume or abandon. Partial work (e.g., phases 1-5 complete) can be picked up in a later session from the workspace notes.
- If a phase's subagent returns empty or nonsense, re-run with a more specific prompt before escalating. Sonnet can be picky about prompt shape for grep tasks.
- If the guide turns out to be `settings/*.md` (auto-gen Vue component, ignore bucket per Workstream C audit), stop the skill and tell the user the page is not a Layer 3 candidate — the concept is already covered by Layer 1.
- If the user names a guide outside the Workstream C mirror set (e.g., `commands`, `structure`, `upgrading`), note the classification from the audit and ask whether to proceed regardless.
