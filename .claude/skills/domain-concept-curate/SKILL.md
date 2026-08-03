---
name: domain-concept-curate
description: Use this skill to author one player-help L3 concept note for a demand-ranked domain from the `demand-driven-l3-concept-authoring` arc taxonomy. Triggers on "domain-concept-curate <domain>", "curate domain <name>", "author concept note for <domain>", "draft player-help note for <domain>", "next domain slice", or per-domain sub-agent dispatch from the arc orchestrator. One domain per invocation. Walks pre-flight / demand-corpus check (with optional upstream triage) / source-truth verification / ruleset-restriction scan / cross-engine + userinfo-hub check / operator-consult gate / draft / acceptance gate / write. HALTS on classification uncertainty, L1-GAP, or open operator-consult questions. Does NOT extend `guide-rewrite` -- that skill's doc-conversion spine assumes a pre-existing ezquake.com page; ~10 of this arc's domains have no upstream page (D9). Modeled on `game-mode-curate`: synthesize-from-facts, per-claim source-line citation in commit body, externalized contracts, HALT/PROCEED rubric.
---

# domain-concept-curate

Author one player-help L3 concept note from the demand-ranked taxonomy. One domain per invocation. Designed for sub-agent fan-out across the ~16-17-domain corpus.

## Scope

- **Input**: one domain key from the arc's locked taxonomy (e.g. `weapon-scripts`, `hud-customization`, `spectator-mode`). Must match a Tier-1 or Tier-2 entry in the `demand-driven-l3-concept-authoring` arc's taxonomy.
- **Output**: one concept note `.md` at `apps/qw-oracle/curated/concept-notes/<slug>.md` (flat layout -- the loader scans `curated/concept-notes/*.md` non-recursively per D13).
- **Engine**: cross-engine player-help (D6). Notes are domain-scoped, not engine-scoped. Engine deltas are progressive disclosure within a single note.

NOT in scope:
- Server-admin / hosting domains (separate future arc, different audience).
- Domains outside the locked taxonomy (D1 -- no domain invention).
- Multiple domains in one invocation.
- Modifying existing concept notes mid-arc (surface findings; orchestrator backports).

## Cross-arc contracts (read ALL FOUR before drafting)

1. **`contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md`** -- THE structural authority. Three surfaces; guides = L3 rendered deterministically. Encodes: typed 3-part `related_entities`, per-method support annotation (prose for now), audience-delineated sections, asset references, named-by-domain discipline. The renderer reads EXACTLY this shape; pulling structure to authoring-time keeps render-time mechanical.

2. **`apps/qw-oracle/curated/concept-notes/README.md`** -- frontmatter schema, recognized shapes, voice/length tiers, progressive-disclosure rule, R7 authority-grounding rule. Apply directly; do not draft from a memorized schema.

3. **`apps/qw-oracle/curated/concept-notes/OPERATIONS.md`** -- stewardship playbook: lifecycle, feeding paths, attribution norms, feedback loop.

4. **`docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/decisions.md`** (repo root, NOT under `apps/qw-oracle/`) -- all cross-cutting decisions. D5/D6/D7/D8/D9/D13 are frequently load-bearing.

**Voice exemplar (mandatory before drafting):**

- `apps/qw-oracle/curated/concept-notes/weapon-scripts.md` -- THE voice calibration point. Named-by-domain, audience sections, per-method support annotation, typed 3-part `related_entities`, `best_practices_reviewed` frontmatter, progressive-disclosure opener, R7-grounded recommendations citing labeled authority. Match this voice.

## The HALT/PROCEED rubric

### HALT (return without writing the `.md` file) if:

1. **Classification uncertainty** -- domain key does not cleanly map to the locked taxonomy; overlap with an existing note is ambiguous; operator decision needed.
2. **L1-GAP** -- a core entity the domain needs is absent from both L1 AND source grep. The note cannot name it without confabulating.
3. **Open operator-consult questions** -- R7-flavored or R2-scoped notes need operator answers before the recommendation/best-practice layer is authored. Phase 6 is the gate; do not draft on open questions.

### PROCEED-WITH-FLAG (write the `.md`, surface in report) if:

- A section reads padded; substance was cut to keep it honest.
- An entity was found in source but is absent from L1 (extraction gap -- flag for handover).
- Pending `related_entities` refs where the entity exists in source but L1 doesn't have it yet.
- A body section has a PARTIAL ruleset verdict (five mechanisms checked, one inconclusive).

## Invariant rules (encode per invocation, never skip)

### Anti-confab rule (A) -- verbatim

> Grounding discipline: never name a cvar, command, or other entity that is not present in a tool result you received in this conversation. If the exact name is not in the returned grounding, say the corpus does not surface it and offer to redirect -- do not reconstruct a plausible name from training data. A plausible-but-wrong name ('cl_showfps' for the real 'show_fps', or a non-existent 'scr_showframetime') is exactly the failure this prevents.

**Verification query (cheap check before naming anything):**
```sql
SELECT name, type, source_state FROM entities
WHERE project = '<engine>' AND name = '<name>';
-- empty? Do NOT write the name. Flag it for operator.
```

### F5 3-part-ref rule

A cross-link edge MUST be a **3-part** `<project>:<kind>:<id>` ref. The loader's `partitionRefs` classifies a 4-part ref (e.g. `mvdsv:info_key:w_rank:userinfo`) as EXTERNAL -- kept in frontmatter JSONB but NOT written to `concept_entities`, so it produces NO resolvable cross-link edge. Use the 3-part form for any ref you need as an entity edge; 4-part refs survive only as frontmatter metadata. Also: a 3-part ref whose `kind` in {commit, pr, extension} is likewise not an entity edge (kept as external artifact ref only).

**Correct:** `ezquake:cvar:cl_weaponhide` (3-part, kind=cvar) -- becomes a `concept_entities` edge.
**Not an edge:** `mvdsv:info_key:w_rank:userinfo` (4-part) -- stored in frontmatter JSONB only.
**Not an edge:** `ezquake:commit:7c328aa4` (3-part, kind=commit) -- stored in frontmatter JSONB only.

### Source-truth discipline

Verify every cvar/command named in the note before it appears in prose. `source_state` is load-bearing:
- `source_backed` -- confirmed in current source. Use freely.
- `doc_only` -- in help-JSON but absent from source. Verify via grep before naming; may be an extraction gap or stale help entry.
- `source_retired` -- removed from current source. Name only in historical context; do not recommend.
- `dynamically_registered` -- runtime-registered. Requires runtime verification; treat as confirmed if the MCP returns it.

### Per-claim citation in commit body

The `.md` file is reader-facing prose -- no citation-dense audit tables, no HTML comment triage blocks. The audit trail (every specific number, entity existence check, ruleset verdict, triage reasoning) lives in the **commit message body** (game-mode-curate convention). Operator/orchestrator may spot-check commit bodies; drafter-honesty applies.

---

## 9-step workflow

### Step 1. Pre-flight

Resolve domain key -> note slug + taxonomy metadata:

```sql
-- Confirm the domain is in the taxonomy; load related L1 anchors
SELECT name, type, source_state, description
FROM entities
WHERE project IN ('ezquake', 'fte', 'ktx', 'mvdsv', 'qwcl')
  AND name ILIKE '%<domain-keyword>%'
ORDER BY project, name
LIMIT 30;
```

Also load representative L2 demand threads (the cluster JSON at `apps/qw-oracle/scripts/calibration/faq-gate/faq-clusters.json` maps domain -> threadIds). Load 2-3 threads to scope what the note must answer.

**HALT on classification uncertainty** -- if the domain key doesn't cleanly map, or there's a live note with overlapping scope that wasn't in the existing-notes index, surface the conflict and stop.

### Step 2. Demand-corpus check + optional upstream triage

Read 2-3 representative L2 demand threads to understand the actual player questions. This scopes the note's coverage: what must the note answer to move these threads from PARTIAL -> NAILED?

**Optional upstream-source triage (two sources, same discipline).** Both are *input, not spine* (D9 -- this is NOT guide-rewrite's intake). Triage each the way you triage the L2 corpus: mine substance, verify before naming, impose our editorial line.

1. **ezquake.com/docs** -- IF a page exists at `research/repos/ezquake-docs/docs/docs/<page>.md`:
   - Does it cover the domain? Is it stale?

2. **QWiki** -- the extracted community wiki at `apps/qwiki-sandbox/dumps/wiki-pages/` (9,184 flat `.wikitext` files, gitignored). Grep for pages relevant to the domain:
   ```bash
   grep -ril '<domain-keyword>' apps/qwiki-sandbox/dumps/wiki-pages/ | head -20
   ```
   Then triage each hit:
   - **MINE rich pages** -- substantial walk-throughs carry real player-help substance worth synthesizing (e.g. `Qwrookie.wikitext` ~122 lines, `NQuake.wikitext` ~128 lines, `Howto_customise_mouse_polling_rate.wikitext`).
   - **SKIP stubs** -- many pages are near-empty section headers (e.g. `FPS.wikitext` is 8 lines); a stub is noise, not a source.
   - **Verify before naming** -- every cvar/command the wiki names still goes through Step 3 source-truth verification. The wiki is community-authored, dated, and confabulates; Anti-confab rule (A) applies to wiki-sourced entities exactly as to any other.
   - **Apply OUR editorial line** -- decision-first, opinionated single path (Step 7). Do NOT inherit the wiki's option sprawl: QWiki pages tend to the "wall of 30 sliders" anti-pattern (every knob co-listed at equal weight). Mine the substance; impose our decision-first structure on top.
   - **3-part `related_entities` refs** (F5 rule) for anything the wiki surfaces that earns an edge.

**Most domains have no upstream ezquake.com page, and many have only a QWiki stub** -- both triage blocks are conditional. Do not manufacture a triage decision when there is no substantive page to triage.

### Step 3. Source-truth verification (LIFT from guide-rewrite P3)

For every cvar/command that will appear in the draft, verify it in L1 before writing:

```sql
SELECT name, type, first_seen_version, source_state
FROM entities
WHERE project = '<engine>' AND name = '<name>';
```

Classify each:
- **exists_in_l1** -- exact name match + correct type + `source_backed`. Use freely.
- **exists_doc_only** -- in L1 but `source_state = 'doc_only'`. Grep source before naming:
  ```bash
  grep -rn '"<name>"' research/repos/<engine>-source/src/ | head -10
  ```
- **not_in_l1** -- neither exact name nor obvious variant. Grep source to distinguish:
  - **(a) L1 extraction gap** -- source has it, L1 doesn't. Flag for handover; not a blocker if the entity is real.
  - **(b) Guide/training-data error** -- neither source nor L1. Do NOT name this entity.
  - **(c) Cross-engine** -- not in this engine but in another. Mark for Step 5.

**HALT on L1-GAP** -- a core entity the domain needs is absent from L1 AND source. The note cannot name it without confabulating. Surface the gap and stop.

### Step 4. Ruleset-restriction scan (LIFT from guide-rewrite P5b)

When any entity in scope could plausibly be ruleset-affected, run the six-mechanism scan. Do NOT claim "free under all rulesets" without checking ALL SIX:

1. **`disabled_cvars[]`** in `src/rulesets.c` -- CVAR_ROM lock + forced value.
2. **`CVAR_RULESET_MIN | CVAR_RULESET_MAX`** flags at cvar declaration -- permanent value clamps.
3. **`Rulesets_OnChange_*`** handlers -- per-cvar callbacks; may reject changes or broadcast.
4. **Behavior gates** -- `Rulesets_RestrictX()` checks at read sites; cvar settable but inert.
5. **Hard-coded clamps** at cvar read sites -- `bound(MIN, cvar.value, MAX)` or `if (Rulesets_...) val = X`.
6. **CVAR flag-based restrictions** at declaration -- `CVAR_SEMICHEAT`, `CVAR_LATCH`, `CVAR_ROM`.

Per-ruleset verdict: **locked** (CVAR_ROM) / **clamped** (range-forced) / **behavior-gated** (settable but inert) / **free** (no restriction found across all six).

Available rulesets: `default`, `smackdown`, `qcon`, `thunderdome`, `mtfl`, `smackdrive`. There is NO `ktx` ruleset in the client -- KTX activates client rulesets, it is not itself one.

### Step 4b. Mode-gating scan (run alongside the ruleset scan)

A domain is not "what entities exist" -- it is "what mode/state determines which entities apply." Before drafting, find any cvar/setting that GATES which other options in the domain are even live. The note MUST surface that gate: a reader who tunes a gated cvar while the wrong mode is active sees nothing happen, and that "it doesn't work" confusion is a large share of the demand threads. Tells:

- **A mode toggle that switches the whole subsystem.** `scr_newhud` (`0` old status bar / `1` new customizable HUD) decides which family does anything -- the `hud_*` element cvars apply only under the new HUD, the `scr_sbar_*` cvars only under the old. The engine often annotates this itself: `scr_sbar_drawitems`'s help reads *"This variable applies for old HUD <= 'scr_newhud 0'."*
- **A capability flag that turns a family on/off.** `cl_independentphysics` gates whether `cl_physfps` does anything.
- **Legality gates** -- a ruleset that locks a cvar (already covered by Step 4; the legality gate is one kind of mode gate).

For each gate, record: the gating entity, its values, and which downstream options each value makes live vs inert. **The gate you find here becomes the lead decision in the draft (Step 7 decision-first rule) and a line in the consult presentation (Step 6) -- the two rules are coupled.** A note that lists entities without naming the gate that selects between them is the failure this scan prevents: see `dryrun-fps-display.md`, which co-listed the `show_fps` overlay and the `fps` HUD element without surfacing that the active HUD mode decides which one a player should reach for.

### Step 5. Cross-engine + userinfo-hub check (LIFT from guide-rewrite P6 + P6b)

**Per-method support (P6):** for each method/feature in the domain, verify support across engines:
```bash
grep -rn "<entity>" research/repos/fte-source/ 2>/dev/null | head -5
grep -rn "<entity>" research/repos/mvdsv-source/ 2>/dev/null | head -5
grep -rn "<entity>" research/repos/ktx-source/ 2>/dev/null | head -5
```

Record support as: **cross_engine_covered** (confirmed) / **engine_specific** (verified absent in others) / **tbd** (deferred pending further L1 extraction).

Prose convention (weapon-scripts style): baseline once ("Works in ezQuake and FTE."), then per-engine deltas tagged inline ("FTE accepts `cl_weaponhide_axe` as a compat-alias for `cl_weaponhide_preference`."). Do NOT annotate every entity as "ezQuake-specific" unless verified absent elsewhere.

**Userinfo/serverinfo hub (P6b):** IF the feature reads/writes any userinfo/serverinfo key (tells: `setinfo`/`fullinfo` mentions, `CVAR_USERINFO` cvars, `ezinfokey(`/`Info_ValueForKey(` in source):
- Cross-link `qw-userinfo-serverinfo-protocol.md` as the hub; do NOT duplicate the plumbing mechanics.
- Your note is a spoke: it owns its vertical and leans on the hub for how userinfo works.

### Step 6. Operator-consult gate (LIFT from guide-rewrite P7.5 -- GATE)

**Step 7 authoring does not begin until operator answers land.** This gate exists because the recommendation/best-practice layer (R7) needs operator SME input -- a source-only draft has produced wrong recipes before (D8).

**When to gate:** mandatory for R7-flavored (opinionated recipes, "most players use X") and R2-scoped (feature-family umbrella scope) notes. Optional for pure R4 (format specs), R5 (source archaeology), R6 (factual how-to).

**Present to operator:**
- Entity set (count + categories).
- Any L1-GAPped entities found in source (extraction-gap candidates).
- Per-ruleset verdict summary (locked/clamped/behavior-gated/free for key entities, especially smackdown).
- Cross-engine verdict (single-engine / cross-engine / TBD per method).
- Mode-gating verdict (from Step 4b): the gating entity + its values, and the lead decision the note will open with.
- Proposed title + section list + R-label guess.

**Ask only role-keyed questions** (from guide-rewrite P7.5 template) matching the note's R labels -- not open-ended. One compact turn, not a dialogue.

**HALT until operator answers land** -- do not draft on open questions.

### Step 7. Draft

Synthesize from L1 + source + operator answers into the note architecture per the cross-arc contract (D6). Discipline rules:

**Frontmatter (required fields):**
```yaml
---
title: <short human title>
slug: <domain-slug matching filename stem>
topic: domain-guide      # for player-help notes; security-policy etc. for others
status: draft
authored_by: qw-oracle   # all arc-authored notes
upstream_status: gap-candidate | authored   # gap-candidate if an ezquake.com page would host it
upstream_target: <page slug> | new-page | none-today
primary_contributors:
  - "@handle"            # upstream code authors the note documents
related_entities:
  - ezquake:cvar:<name>   # 3-part refs ONLY (F5 rule)
  - ezquake:command:<name>
  - fte:cvar:<name>       # when cross-engine coverage confirmed
best_practices_reviewed: YYYY-MM-DD   # D8: dated trigger for recommendation-layer re-review
last_updated: YYYY-MM-DD
---
```

**Discipline rules:**

- **Named by domain, never by engine** -- one note, cross-codebase.
- **Lead selector -- the note's opening is chosen by domain shape (refined 2026-06-11, note #2 network):** the first screen puts the reader's answer first, never a mental model they must wade through. Three cases:
  1. **Mode-gate present** (Step 4b found a toggle that switches the subsystem) -> LEAD with the gate decision ("new HUD or old status bar?"); the gated families follow as progressive disclosure. `hud-configuration.md` is the exemplar.
  2. **No gate, objective best-practice exists** -> LEAD with the recommendation ITSELF (`rate 50000`, play wired) as a terse rec / command-list; the mental model, mechanism, or "which layer is your problem" framework is progressive-disclosure DEPTH, never the lead. `network-connection.md` is the exemplar. (Anti-pattern caught on note #2: a "which layer?" framework lead made the reader work before reaching the answer.)
  3. **No gate, genuinely preferential** (no engine-optimal or community-consensus ground -- much of HUD styling, colors, message routing) -> nail the objective gate/mechanism, then say plainly "this is preference" and show the knobs, optionally a credited example config (operator SME / hedged community knowledge, labeled per R7). An honest "this is preference" beats a fabricated "most players use X."
  In all three: present the ONE recommended path prominently and relegate alternatives to progressive disclosure; never co-list many equal options at equal weight (the wiki "wall of 30 sliders" anti-pattern). Every recommendation is grounded per R7/D7 (engine-optimal form or community consensus), never taste. Exemplars: `weapon-scripts.md` (three-method decision table, quickfire led) and `network-connection.md` (rec-first command-lists).
- **Voice tier by domain objectivity (refined 2026-06-11):** objective/factual domains (network, demos, display) -> terse recommendations + command-list examples, mechanism/research as progressive-disclosure depth. Judgment/subjective domains (weapon-scripts, skins) -> longer explanatory prose. Match voice to how much the domain is fact vs. taste (pairs with the README voice/length tiers).
- **Audience-delineated sections** -- each section is player / admin / both. Powers the read-time audience lens.
- **Per-method support annotation** -- baseline written once per method, engine deltas tagged inline. Prose now per weapon-scripts convention; structured engine matrix deferred to rust-client onboarding.
- **Typed 3-part `related_entities`** -- F5 rule enforced. No 4-part refs as entity edges.
- **`best_practices_reviewed`** frontmatter -- D8 requirement.
- **Progressive disclosure** for notes over ~80 lines -- first two sections must be readable standalone.
- **R7 authority grounding** -- every recommendation grounds in: engine mechanics (cite file:line), community consensus (cite message-ID or PR), operator SME (credit in `primary_contributors`), or hedged community knowledge (labeled explicitly). Bare assertion is disallowed.
- **Anti-confab rule (A)** -- every named entity traces to an L1 row you received in this conversation.
- **Own-your-layer-and-link** -- if a primitive is owned by another guide (`qw-userinfo-serverinfo-protocol`, `weapon-scripts`, etc.), cross-link it; do not restate the mechanism.
- **Asset references** where visual surfaces apply (notes stay text / MCP-friendly; the renderer embeds).

**Body sections** per README.md:
```
## Summary                     -- 2-4 sentences elevator; standalone short-answer for MCP default
## <topic-specific sections>   -- 2-4 sections, vary by shape
## Consumer implications       -- what a downstream tool can do with this
## References                  -- commits, file:line, cross-doc pointers, testimony cites
## Related concept notes       -- sibling links and forward references
```

**No HTML triage comments.** No citation-dense audit tables in the body. Reader-facing prose only.

### Step 8. Gate (Phase-0 acceptance runner)

Run the per-domain acceptance harness on the note's domain. The note must move its representative threads dig/PARTIAL -> platter/NAILED AND introduce zero hard confabulations.

**Runner invocation (D12 amendment -- tracked at `apps/qw-oracle/scripts/calibration/faq-gate/`):**

```bash
# Stage 1: retrieve grounding bundle for domain
bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain <key>

# Stage 2: executor dispatches the Workflow answer subagent
#   (the faq-answer-workflow.js Workflow script; invoked by the executor)

# Stage 3: confabulation check
bun scripts/calibration/faq-gate/faq-gate-confab.ts --domain <key>
```

Gate criteria: zero confabulated entities + representative threads upgrade from dig/PARTIAL -> platter/NAILED.

**Operator prose review** (D4) is the SECOND gate -- not automatable. Neither gate alone ships a note.

**HALT if the harness is not yet built** (Phase-0 deliverable) -- surface to operator rather than skipping.

### Step 9. Write + commit

Write to `apps/qw-oracle/curated/concept-notes/<slug>.md`. The `.md` carries frontmatter + reader-facing prose only.

Run `bun run load-concepts` (from `apps/qw-oracle/`) to verify the note loads clean. Confirm:
- Loader reports `loaded <N>` (your note is included), `skipped 0` for your file, `warnings 0`.
- No JSONB errors (D13 -- JSONB via `tx.json`, never pre-stringified).

Commit body carries the audit trail. Shape:

```
docs(qw-oracle): <slug> concept note (<domain>, <triage>)

<1-2 sentence summary of what this domain note covers>

Domain:                 <taxonomy domain key>
Triage:                 <l3-upstream | wiki-upstream | hybrid | authored-here>
L1 anchors:             <count> related_entities (all 3-part, verified in DB)
Sections:               <list>
Upstream-source triage: <"none -- no upstream page" | "page at X: <verdict>">
Cross-engine coverage:  <summary per method>
Ruleset verdict:        <verdict for key entities, or "not applicable -- player config cvars">

Source verifications (every named entity, specific number, ruleset verdict in body prose):
  - <claim>: <source_file>:<line>
  - <claim>: entities table, project='<engine>', name='<name>'
  - ...

Operator consult:       <skipped (R4/R5/R6 no-consult case) | "operator answers received: <summary>">
Gate result:            <not-run (Phase-0 deliverable pending) | NAILED + 0 confab>
Methodology feedback:   <gaps surfaced, or "none">

Co-Authored-By: Claude <model-id> <noreply@anthropic.com>
```

If any upstream source (ezquake.com page) was used, follow upstream-PR attribution discipline: do NOT add `Signed-off-by` (operator signs/certifies DCO). Use `Assisted-by: Claude:<model-id>` for AI attribution on PR commits.

---

## Discipline anchors

- **Source-truth before synthesis.** Every entity checked in L1 before it appears in prose.
- **Specific numbers require source-anchor.** HP / timing values / default values come from handler functions or verified L1 rows, not extrapolation.
- **Drafter-honesty in commit-body verifications.** If the commit message body lists "Source verifications: ...", each entry must be a real verification you performed. Self-attestation without the check is grounds for rejection.
- **No editorial scope-creep.** Player sections are for players; admin sections are for admins. Don't add cross-note editorializing (e.g., don't mention an unrelated note's limitation inside another note's Hosting section).
- **Reader-facing prose, not citation-dense audit prose.** The note is what an LLM oracle relays to a player, what a wiki page renders. It reads like expert wiki prose.
- **Prose grep is as important as frontmatter audit.** After correcting a claim, grep the whole file for related claims that may repeat the same error.
- **Family stem-sweep before drafting (refined 2026-06-11, note #3).** When an entity shares a visible stem with siblings (`match_auto_*` -> also `match_format_*` / `match_name_*`; `sb_*`; `cl_c2s*`; `sv_antilag*`), grep the stem in source AND L1 to surface the whole family before drafting -- a cvar family is documented as a unit, and the demand threads plus a single-entity source-walk routinely miss siblings (caught on note #3: the naming/folder family surfaced only via operator SME). The stem is the unit of coverage, not the one cvar the thread happened to name.

## Return-to-operator report shape

```
domain-concept-curate <domain> -- status: <DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED>

Domain:                 <taxonomy key>
Slug:                   <filename stem>
L1 anchors:             <count verified / count declared -- mismatches listed>
Upstream triage:        <"none" | verdict>
Ruleset scan:           <"run -- all free" | "run -- <entity> clamped under <ruleset>" | "not applicable">
Mode-gating scan:       <"gate: <entity> (<values>) -> lead decision" | "no gate -- flat domain">
Cross-engine coverage:  <per method>
Sections drafted:       <list with word counts>
Total body lines:       <N>
Gate result:            <not-run | NAILED + 0-confab>
Pending refs:           <entities in source but absent from L1>
Open items:             <list>
File at:                apps/qw-oracle/curated/concept-notes/<slug>.md
Commit SHA:             <sha if committed; else "not committed">

Methodology feedback:
  Contract gaps:        <list or "none">
  Voice gaps:           <list or "none">
```
