# Layer 3 role map: evidence-driven characterization

**Date:** 2026-04-24
**Scope:** Research artifact. Characterizes what roles Layer 3 can support, derived from the 20 active ezquake.com/docs guide candidates (16 mirror + 4 split) and the 6 existing qw-oracle concept notes. Does not decide voice, template, or structure. Those decisions live with the operator.
**Input corpus:**
- `research/repos/ezquake-docs/docs/docs/*.md` — 16 mirror + 4 split + 10 ignore
- `apps/qw-oracle/concept-notes/{kmap-legacy-keymap-system, engine-internal-vs-player-facing-files, skywind-animated-skyboxes, completing-legacy-fte-protocol-extensions, client-side-server-exec-allowlist, ruleset-anti-script-restriction-pattern}.md`
- `apps/qw-oracle/docs/entity-types.md` (Layer 1 coverage)
- `apps/qw-oracle/concept-notes/README.md` + `OPERATIONS.md`

All citations below use absolute file paths, with line numbers where specific claims are being grounded.

---

## 1. Per-guide classification table

Yield types:
- **full-note** — the guide carries a coherent synthesis worth mirroring as one concept note (after Path-2 validation).
- **nugget-patch** — the guide carries ~1-3 paragraphs of real synthesis on top of reference data that the help-JSON already serves. The nuggets go into other notes or a small thematic note; the rest gets dropped.
- **multi-concept** — the guide visibly holds 2+ distinct concepts that each deserve their own note.
- **nothing-new** — examined against Layer 1 + existing notes, the guide adds no synthesis worth importing.

Layer-1 overlap is estimated against `entity-types.md` (which types the Layer 1 extractor covers) and the help JSON that `settings/*.md` and `commands.md` render.

| filename | yield-type | Layer 3 role(s) represented | Layer 1 overlap | one-line characterization |
|---|---|---|---|---|
| `weapon-scripts.md` | full-note | R3, R1 | 20% | preselect+hide + `weapon N M O` chain. Omits `+fire`; pattern-incomplete per vikpe. Path-2 rewrite. |
| `teamplay-communication.md` | nugget-patch | R3, R4 | 60% | 80-line `tp_point` stub. Pointing semantics is synthesis; option list is help-JSON. |
| `scripting.md` | multi-concept | R3, R2 | 40% | Alias basics + `set_calc` + `if` grammar + regexp. Distinct domains. |
| `triggers.md` | multi-concept | R3, R4 | 80% | Reference tables are Layer 1. `infoset` + `cmd info ev` bitmask is the synthesis nugget. |
| `hud.md` | full-note | R2, R3 | 30% | Walkthrough of place/align/move/frame/relative-positioning. Mental model the 1404 child cvars cannot convey. |
| `multiview.md` | full-note | R2, R3 | 40% | Self-flagged stale (:6). Autotrack equation grammar + 14-item value table + `%`-variable catalog is synthesis. |
| `charsets.md` | multi-concept | R3, R4, R6 | 15% | (a) how to install/load; (b) fuh-authored scaling math (90-line sub-guide). |
| `crosshairs.md` | nugget-patch | R6, R4 | 45% | Mostly reference; real nuggets are centering convention + `crosshair.txt` bitmap format. |
| `independent-physics.md` | full-note | R1, R2 | 40% | Why it exists (Tonik/ZQuake) + 77fps physics context + variable interaction. |
| `fakeshaft.md` | full-note | R1, R2 | 15% | Dense 25 lines. 4 modes + antilag caveat + `f_fakeshaft` social tracking. |
| `frag-tracker.md` | full-note | R2, R4 | 35% | Bootstrap recipe (`fragfile.dat` + 3 cvars + `con_width >= 512`) is synthesis Layer 1 cannot emit. |
| `player-skins.md` | full-note | R3, R2, R1 | 30% | Skin-rule resolution order + QWorld-discussion context + Qizmo/FPD-server interop. |
| `particles.md` | nugget-patch | R1, R2 | 70% | FAQ is 80% banter. Real nuggets: QMB ancestry, pak-dependency hint. |
| `message-filtering.md` | full-note | R2 | 60% | Cvars in L1; organizing frame (4 axes: server-side / client-side / by-user-type / by-user) is not. |
| `server-browser.md` | full-note | R2, R3, R4 | 25% | Sources.txt format + 3 source types + keyboard conventions + bookmarking. |
| `video-capture.md` | full-note | R2, R3 | 40% | 3 capture methods (screenshot+ffmpeg, direct-.avi Windows-only, external OBS), each with distinct constraints. |
| `voice-support.md` | full-note | R1, R2 | 35% | Requirements checklist + 2-mode model (manual vs VAD) + tuning flow. |
| `command-line-parameters.md` | nothing-new | — | 100% | Split candidate. Guide half = intro + `+set` syntax (one sentence). Absorb into scripting offspring. |
| `macros.md` | nugget-patch | R4 | 90% | Split candidate. Only synthesis = `%<width align>macro>` format spec + `tp_length_*`/`tp_align_*`. |
| `textures.md` | multi-concept | R4, R3 | 20% | (a) wad/models/bmodels dir taxonomy, (b) skybox `basename+part+ext` naming, (c) `r_drawflat`/`r_fastsky` textures-off family. |

**Aggregate yields from the 20 candidates:**

- **Full-note candidates (post-validation):** 11 — `weapon-scripts`, `hud`, `multiview`, `independent-physics`, `fakeshaft`, `frag-tracker`, `player-skins`, `message-filtering`, `server-browser`, `video-capture`, `voice-support`. (Count may adjust if `weapon-scripts` Path-2 rewrite splits into multiple notes.)
- **Multi-concept candidates:** 4 — `scripting`, `triggers`, `charsets`, `textures`. Each will yield 2-3 distinct notes.
- **Nugget-patch candidates:** 4 — `teamplay-communication`, `crosshairs`, `particles`, `macros` (guide half).
- **Nothing-new candidates:** 1 — `command-line-parameters` (guide half).

Post-fanout, a rough estimate: **16-20 full notes + 4-6 nugget paragraphs absorbed into them or siblings**. The 6 existing concept notes bring the ceiling to **~22-26 Layer 3 notes** total.

---

## 2. Ignore-set validation

Confirmed. All 9 `settings/*.md` files plus `commands.md` are `<script setup>`-rendered reference pages. They auto-generate from help-JSON:

- `settings/demos.md:1-10`, `settings/graphics.md:1-10`, `settings/hud.md:1-10`, `settings/input.md:1-10`, `settings/miscellaneous.md:1-10`, `settings/multiplayer.md:1-10`, `settings/server.md:1-10`, `settings/sound.md:1-10`, `settings/teamplay.md:1-10` — each is exactly 10 lines, mounting `VariableList` with a `group-name` prop. **No hidden synthesis.**
- `commands.md:1-28` — renders `help_commands.json` in a simple `v-for` table. **No hidden synthesis.**

The ignore bucket is correct.

**Two of the "split" pages are also effectively auto-gen:**

- `command-line-parameters.md:1-44` — 44 lines, of which 23 are the `<table>` template; the guide-half prose is 10 lines including headings. The `+set` startup-prefix syntax is the only synthesis. Practically ignore-eligible; flag the `+set` nugget into `scripting.md`'s offspring.
- `macros.md:1-82` — the two `v-for` tables handle ezQuake and Qizmo macros; the only synthesis is the 10-line "Formatting" section on the `%<width alignment>macro>` format spec and `tp_length_*`/`tp_align_*` cvars. Nugget-patch, not full note.

`triggers.md` is also largely auto-gen (two `v-for` tables against `f_triggers.json` and `on_triggers.json`) but the `infoset` + `cmd info ev N` bitmask pattern is substantive synthesis. Keep as nugget-patch or small note.

`textures.md` is a borderline case: the per-texture filename tables (lines :30-258) are reference data the Layer 1 seed could produce, but they're not currently in the seed. Today they are documentation; tomorrow they could be generated. Treat as synthesis for now but flag to operator.

**One entry in the "ignore" sanity-check deserves a correction:** the operator's HANDOVER classification listed `commands.md`, `structure.md`, and `faq.md` as ignore. Confirmed for `commands.md` and `faq.md`. `structure.md` (`structure.md:1-39`) is 39 lines documenting the `quake/id1/ + /ezquake/ + /qw/` directory tree — this is convention, not auto-gen. It holds synthesis (where each thing goes) but is shallow enough that absorbing its content into `engine-internal-vs-player-facing-files.md` or into a per-extension note is reasonable. Not worth a standalone note. Ignore bucket verdict: correct in practice, wrong in rationale — it's "trivially absorbable" rather than "auto-gen."

---

## 3. Cross-guide patterns

**Patterns that repeat:**

- **Historical-attribution paragraph.** 5/16 guides carry lineage context: `independent-physics.md:6-11` (Tonik/ZQuake + Spike/FTE), `fakeshaft.md:9-10`, `particles.md:27-29` (QMB/DrLabMan), `voice-support.md:5` (FTEQW port), `multiview.md:8` (Oppy). Layer 1 cannot produce these.
- **Enable -> tune -> persist workflow narrative.** 6/16 guides order a cvar family as a journey, not as a list: `hud.md`, `multiview.md`, `voice-support.md`, `server-browser.md`, `player-skins.md`, `frag-tracker.md`.
- **Format/convention specs.** 4 guides + 3 existing notes carry explicit file-format grammars: `charsets.md:87-106` (crosshair.txt bitmap), `textures.md:263-270` (skybox naming), `server-browser.md:13-22` (sources.txt), `skywind-animated-skyboxes.md` (_wind.cfg), `kmap-legacy-keymap-system.md:22-41`.
- **N-mode mental model.** 5 guides organize a feature by discrete modes: `voice-support.md` (manual/VAD), `video-capture.md` (three methods), `message-filtering.md` (server/client/by-user/by-name), `fakeshaft.md` (0/0.5/1/2), `scripting.md:31-40` (configs vs scripts).

**Structural moves that failed:**

- **FAQ-as-content.** `particles.md:32-55` has 5 FAQ entries of which 4 are banter or pak-version-checks. FAQ format tends to appear when the author couldn't settle on an organizing frame.
- **Self-flagged staleness.** `multiview.md:6` and `teamplay-communication.md:13` both open with "this topic was ported quickly from old documentation and needs updated." Two guides' original author flags their own decay.
- **Voice intrusion.** `charsets.md:49` embeds a "Guide: How to make charsets look good / Made by fuh" sub-article in first-person. Legitimate content but creates voice mismatch — a note either adopts fuh's voice or paraphrases to house voice; both lose something.
- **Reference masquerading as prose.** `crosshairs.md:10-18` (crosshair indices as code block), `triggers.md` (JSON-rendered tables), `textures.md` (per-asset filename tables). When prose becomes a list, the content is reference, not guide.

**What the 6 existing notes do differently:** section skeleton (Summary -> body -> Consumer implications -> References -> Related) held consistently, Layer 1 entities cited in frontmatter by canonical ID, liberal file:line citation, and every note ends with "what a tool builder does with this." Guide pages do none of these. A guide mirrored without adaptation reads stylistically distinct from the existing corpus — this is material for §6.

---

## 4. Role map (core output)

Each role below is named, defined, backed by count evidence, checked against what Layer 1 and Layer 2 already cover, and mapped to a specific consumer.

### R1. Why-it-exists context

- **Definition:** historical framing — why the feature exists, what it replaced, what lineage it came from. Narrative, not reference.
- **Evidence:** 5 guides (`independent-physics.md:6-11` Tonik/ZQuake/FTE; `fakeshaft.md:9-10`; `particles.md:27-29` QMB/DrLabMan; `voice-support.md:5` FTEQW port; `multiview.md:8` Oppy) + 3 existing notes (`kmap-legacy-keymap-system.md` ZQuake/FuhQuake, `skywind-animated-skyboxes.md` IronWail, `completing-legacy-fte-protocol-extensions.md` 10-year arc).
- **Layer coverage:** Layer 1 cannot produce narrative; Layer 2 has scattered recollections. Layer 3 is the only synthesis place.
- **Consumer:** chatbot / config-editor contextual help. Not relevant to linters.
- **Voice:** factual-narrative, past tense for history, 1-3 paragraphs embedded in a longer note.

### R2. Feature-family workflow narrative

- **Definition:** cvar/command family ordered as a configured journey (enable -> tune -> persist), not alphabetically.
- **Evidence:** 9 guides. `hud.md` (editor -> planmode -> place/align/frame), `multiview.md` (enable -> view-control -> autotrack equations), `voice-support.md` (requirements -> modes -> fine-tuning), `server-browser.md` (sources -> scan -> navigate -> bookmark), `player-skins.md`, `frag-tracker.md` (bootstrap recipe -> enable -> style), `message-filtering.md` (4 axes), `video-capture.md` (3 methods), `fakeshaft.md` (4 modes). 1 existing note (`skywind-animated-skyboxes.md`).
- **Layer coverage:** Layer 1 has the cvars, zero ordering. Layer 2 has per-cvar tuning chat but does not compose journeys. Layer 3 is the only composition surface.
- **Consumer:** active-assistance constructive queries ("build me a HUD that shows X"), config-editor group rendering, wizards. This is what `project_qw_oracle_product_vision.md` calls active assistance — *patterns the LLM applies to a specific ask.*
- **Voice:** imperative / you-address natural; 40-120 lines; headings follow journey stages.

### R3. Pattern library (reusable script/config shapes)

- **Definition:** named pattern + example + variations + constraints. "Best-available weapon chain," "map-specific settings via `f_newmap`," "tp_point customization," "autotrack equation grammar," "zoom alias with set_calc."
- **Evidence:** 6 guides (`weapon-scripts.md` preselect+hide+chain; `scripting.md:50-213` alias/`set_calc`/`if`/regex; `triggers.md:22-28` map-settings pattern; `teamplay-communication.md:21-55` tp_point customization; `multiview.md:55-99` autotrack equation; `charsets.md:47-136` scaling math) + 3 existing notes (`client-side-server-exec-allowlist.md`, `ruleset-anti-script-restriction-pattern.md`, `completing-legacy-fte-protocol-extensions.md` names "server-side version-gating pattern" explicitly).
- **Layer coverage:** Layer 1 has primitives, no composition. Layer 2 has ad-hoc script pastings, no canonicalization. Layer 3 is the natural home.
- **Consumer:** core active-assistance surface. LLM retrieves pattern, applies it to specifics. Also config-editor smart-suggestions and lint.
- **Voice:** "Here is a shape, with constraints, with one worked example." 30-80 lines, includes runnable example.

### R4. Convention specs (file formats + naming rules)

- **Definition:** format/naming spec for a file, directory, or token the engine consumes implicitly. Grammar, not narrative.
- **Evidence:** 4 guides (`charsets.md:87-106` crosshair.txt bitmap; `textures.md:263-270` + :128-280 skybox naming + directory layout; `server-browser.md:13-22` sources.txt; `structure.md:1-39` directory tree) + 3 existing notes (`skywind-animated-skyboxes.md` _wind.cfg, `kmap-legacy-keymap-system.md` .kmap grammar, `engine-internal-vs-player-facing-files.md` visibility axis).
- **Layer coverage:** Layer 1 has `asset_path_rules` (14) and `asset_extensions` (seed), but these are engine-enforcement rules, not authoring conventions. "Sidecar goes alongside the cubemap" is distribution convention, not engine rule.
- **Consumer:** tool builders (slipgate browser, asset-audit, external mapmaker tools). Machine-parseable.
- **Voice:** reference-dense, grammar block + examples; 15-40 lines when narrow. Overlaps with Layer 1 seed data — see D4.

### R5. Infrastructure / tool-builder synthesis

- **Definition:** synthesis surfaced during ezQuake source archaeology. Classifier axes, retirement narratives, security-policy walkthroughs, protocol-gating patterns.
- **Evidence:** all 6 existing notes are this role. Guide corpus: ~0 examples. **Role is near-absent from ezquake.com/docs.**
- **Layer coverage:** Layer 1 has the entities but not the narrative. Layer 2 has flavor but not ground truth. Layer 3 authors these from source-code archaeology.
- **Consumer:** Oracle-bot answers for developers, extraction-review at walk time, "what is ruleset X" MCP queries. Not a player role.
- **Voice:** dense with commit-SHA + PR citations, sections "threat model -> policy -> iteration -> consumer implications." 80-150 lines. The 6 existing notes calibrate this voice.

### R6. Player how-to (short task prose)

- **Definition:** short task-oriented prose answering "how do I do X." Cvar-list-with-plan; intended to be read top-to-bottom.
- **Evidence:** 4 guides (`crosshairs.md`, `charsets.md:4-15` install section, `fakeshaft.md`, `particles.md:4-29`). Lean reference with thin synthesis overlay.
- **Layer coverage:** 60-80% Layer 1 equivalent. The 20-40% synthesis is the organizing preamble and the concrete do-this-then-this recipe.
- **Consumer:** player-facing chatbot ("how do I install a charset"). Fits the MCP answer-template's Short-answer slot without needing Curated-background expansion.
- **Voice:** imperative second-person; 10-30 lines; numbered steps common.

### R7. Opinionated community best-practice

- **Definition:** normative advice — "for competitive play, do X; avoid Y." Backed by community consensus, not engine semantics.
- **Evidence in /docs:** near zero. Guides are non-opinionated about *what to do*; they're opinionated about *how things work.* Closest: `weapon-scripts.md:52-55` ("Advanced weapon handling will never fully work if you keep using impulse"), `fakeshaft.md:19` ("on anti-lagged servers, the old `/cl_fakeshaft 0` setting may be misleading").
- **Evidence in existing notes:** zero. Template explicitly excludes editorial language.
- **Evidence in Layer 2:** high in principle (20 years of chat), raw and unprocessed.
- **Layer coverage:** Layer 1 not normative. Layer 2 has content without synthesis. Layer 3 *could* host this role, but would need to source from L2 + testimony, not from /docs.
- **Consumer:** player-facing "what should I do" queries; config-editor "build me a good competitive config." Memory `project_qw_oracle_product_vision.md` describes active assistance as *applying community wisdom* — which this role directly serves.
- **Voice:** normative, caveated, cites testimony with dates. Distinct from existing-note voice. **Currently not demonstrated.**

**Role map summary table:**

| Role | Sketched? | Evidence in /docs | Evidence in existing notes | Layer 3 is only source? |
|---|---|---|---|---|
| R1. Why-it-exists | yes | 5 guides | 3 notes | yes |
| R2. Feature-family synthesis | yes | 9 guides | 1 note (skywind) | yes |
| R3. Pattern library | yes | 6 guides | 3 notes | yes |
| R4. Convention specs | yes | 6 guides + `structure.md` | 3 notes | partially (Layer 1 seeds overlap) |
| R5. Infrastructure / tool-builder | yes | ~0 guides | 6 notes | yes |
| R6. Player how-to reference | yes (mapped to "player how-to") | 4 guides | 0 notes | no — 60-80% L1 overlap |
| R7. Opinionated best-practice | yes | ~0 guides | 0 notes | yes-in-principle, but role is unrealized |

**Roles the corpus surfaced that weren't in the sketch list:**

None new beyond the 7 above. The sketch list captured the space well. What it *did not* capture is the population distribution — the corpus is strongly weighted toward R2 (feature-family) and R3 (patterns), moderately populated in R1/R4, sparsely in R6, and essentially empty in R5 (from guides) and R7. This density asymmetry is load-bearing for section 6.

**Sketched roles that don't actually appear:**

- **R5 from /docs:** infrastructure notes for tool builders are the existing-notes' specialty but are essentially absent from guide pages. Splits the Layer 3 corpus into two lineages (guide-derived vs authored-from-source).
- **R7 (opinionated community best-practice):** theorized but unrealized. /docs doesn't carry it and existing-note style explicitly excludes editorial language. If the operator wants this role, it requires a voice-policy change and a Layer 2 feed.

---

## 5. Coverage gaps

**Layer 1 at head:** 2901 cvar, 522 command, 68 macro, 71 cmdline_param, 148 keyname, 83 hud_element (+1404 child cvars), 6 ruleset, 33 token_primitive, 50 flag_bit, 17 asset_category + 168 relation rows (per `entity-types.md`).

**Prose coverage in /docs across the 20 candidates:** the guides touch ~20-30 HUD cvars (<3% of 1404 children), ~40-60 `gl_*`/`r_*` cvars, ~20 voip cvars, ~15 teamplay cvars, ~10 autotrack cvars, 1/6 rulesets named (`smackdown` in `scripting.md:147-149`), 0/68 macros in prose, 0/71 cmdline params in prose, 0/148 keynames.

**Specific blind spots unserved by /docs:**

1. **Ruleset system.** 6 rulesets, 1 named in passing. Existing notes `client-side-server-exec-allowlist.md` and `ruleset-anti-script-restriction-pattern.md` cover policy; no user-facing page explains the competitive ruleset semantics. Gap-report target: new `rulesets.md` upstream.
2. **Cmdline params.** 71 total, `command-line-parameters.md` is pure reference table. No "startup-flag mental model" synthesis — `-basedir`/`-nohome`/`-data`/`-userdir`/`-game` compose a filesystem-override family nowhere documented as such.
3. **Macros.** 68 total. `macros.md` renders the table. No prose on teamplay-restricted vs runtime, or on how macros compose with aliases and triggers. Clear R2 gap.
4. **Keynames.** 148 total including Apple-platform-conditional rows (COMMAND/PARA/F13-F15/KP_EQUAL). No guide on valid bind targets or platform-conditional keys.
5. **Asset loader-sites and cvar-bindings.** 128 sites, 26 bindings. No guide covers "which cvar causes which file to load, when." Engine-archaeology synthesis — fits a tool-builder note, not a user guide.
6. **Token primitives.** 33 grammar tokens including LED codes (`$B` vs `$b`, case-sensitive). Scattered mentions across `scripting.md:68-70` (`;` separator), `charsets.md` colored-text grammar. No unified config-grammar note.
7. **Flag bits.** 50 across `cvar_flag`/`fpd_flag`/`stat_const`. `CVAR_ARCHIVE`/`CVAR_USERINFO`/`CVAR_ROM` have zero user-facing coverage.
8. **HUD child cvars at scale.** 83 elements owning 1404 children. `hud.md` covers the owner-level frame; per-element style/value semantics are uncovered. Exhaustive per-element notes would bloat Layer 3 — practical answer is "Layer 3 synthesizes frame; Layer 1 exposes values."
9. **Post-2022 features.** 32/33 guide pages content-stale since 2022-11-21 (HANDOVER). Every post-2022 feature is a potential gap (skywind already filled; more will surface during Workstream C).

**Net:** guide prose covers ~10-15% of Layer 1's 3849 entities; the rest is help-JSON reference. Chatbot answers work from Layer 1 + existing-note synthesis; constructive queries against unserved entities degrade to raw cvar dumps unless new Layer 3 notes fill in.

---

## 6. What the data says about single-voice vs multi-voice

The 22-26 projected notes cluster on two axes.

**Axis A (provenance):** guide-derived vs source-derived.
**Axis B (role):** narrative/pattern/how-to (R1/R2/R3/R6) vs convention/infra (R4/R5). Natural voice in the first is workflow-imperative; in the second, reference-grammar or source-archaeology.

| | Narrative/Pattern (R1/R2/R3/R6) | Convention/Infra (R4/R5) |
|---|---|---|
| Guide-derived | ~18 projected notes | ~3 projected notes (charsets, skybox, sources.txt) |
| Source-derived | 1 existing (skywind) | 5 existing (kmap, engine-internal-axis, fte-protocol, server-exec, ruleset) |

**Findings:**

- **Existing-notes voice is coherent.** All 6 share frontmatter shape, skeleton, citation density, third-person factual tone. Template works cleanly here.
- **Guide-derived narrative voice is not yet demonstrated.** Skywind is the one case and adopted existing-notes voice. Whether the remaining ~18 should adopt it too is the open question. Evidence cuts both ways:
  - Existing-notes voice *can* carry workflow content. Skywind's sections map R1 + R2 + R4 cleanly.
  - Existing-notes voice is *reference-weighted* — 80-150 lines with file:line per claim. Applied to `crosshairs.md` (R6, natural 15 lines), it bloats. Applied to `message-filtering.md` (R2, natural ~40 lines), it forces source citations that don't exist in /docs.
  - A "how do I set my crosshair" query answered in existing-notes voice feels officious. A "ruleset threat model" query answered in light imperative feels under-justified.

**Shared-skeleton feasibility:** all four quadrants share the backbone (Summary -> body -> Consumer implications -> References -> Related). They diverge in tone register, citation density, length (15-50 vs 80-150 lines), procedural-step use, and code-block density. One template already documents "section skeleton varies by shape"; R1-R5 map onto the existing recognized shapes; R6 is arguably a new shape; R7 another if adopted.

**Ambiguities the data does not resolve:**

- Whether voice consistency matters more as an internal artifact (MCP slices one note at a time and outlet LLM reformats) or as a human artifact (gap-report consumers, direct readers).
- Whether the ~3x volume shift from 6 source-derived to ~22+ mixed-provenance notes changes reader expectations enough to warrant a voice policy before Workstream C executes.

**Honest read:** three sub-genres — (a) source-derived infrastructure, (b) guide-derived feature-family/pattern library, (c) short how-to — share a skeleton and diverge in tone and density. One template with explicit voice guidance per shape fits the data better than one rigid voice or three separate templates. Operator call.

---

## 7. Decisions the operator still needs to make

Each names a tradeoff space, not a recommendation.

**D1. Voice convergence across guide-derived vs source-derived notes.**
- Option A (one voice, existing-notes style for all): consistent MCP output; 20-line how-to content inflates to 60-80 lines with forced source citations; some content has no engine-code citation granularity (e.g., `teamplay-communication.md:52-53` "in DM mode 2/3/4 you can't point to weapons" is engine behavior not traceable to a single file:line).
- Option B (tiered voice — existing-notes for R4/R5, lighter imperative for R2/R3/R6): better per-note fit; MCP consumers see stylistic variation; template needs explicit per-shape voice guidance.
- Stake: whether Workstream C yield adds to the existing-notes corpus seamlessly or reads as a second generation.

**D2. Adopt R7 (opinionated community best-practice)?**
- Option A (don't): Layer 3 stays factual. Community norms stay in Layer 2 raw. Active-assistance synthesizes from L1 primitives + L3 patterns.
- Option B (do): open a normative lane, import via testimony-cite. Significantly more authoring burden (requires Layer 2 processing); editorial-drift risk; richer "what should I do" answers.
- Stake: qw-oracle as reference+patterns service (current trajectory) or as full advisor (theorized vision in `project_qw_oracle_product_vision.md`).

**D3. Multi-concept guide handling.**
- Split aggressively (4 multi-concept guides -> 8-12 notes): sharper notes; slug sprawl.
- Single omnibus notes: fewer slugs; some notes exceed "longer usually wants splitting" length target; one note carries multiple shapes.
- Case-by-case: per-guide judgment overhead.
- Stake: 22-note catalog vs 30+.

**D4. The ~3 convention specs that could be Layer 1 seeds instead.**
- Keep as Layer 3: narrative room; harder to machine-parse.
- Graduate to `packages/qw-config/seeds/*.yaml`: cleaner layering; loses "why this convention" narrative; seeds don't host prose today.
- Both (seed + note cross-reference): duplication; seed as source of truth.
- Stake: Layer 1 vs Layer 3 boundary for convention content.

**D5. R6 (short how-to) posture.**
- Include as short notes (10-30 lines): simple MCP queries are single-note retrievals; +~6 notes.
- Absorb into adjacent R2 feature-family notes: fewer notes; MCP relies on outlet-LLM truncation.
- Answer from Layer 1 only (no Layer 3): thinnest answers; loses context that distinguishes Oracle from help-JSON lookup.
- Stake: shape of lightweight queries in the MCP answer template.

**D6. Path-1 vs Path-2 per guide.**
- Path-1 fast, imports staleness/drift. Path-2 slow, faithful to current engine. Memory defaults to Path-2 after the `weapon-scripts.md` `+fire` omission. Per-guide Path-1 eligibility still needs confirmation.
- Stake: Workstream C authoring cadence.

---

## Appendix: role assignments

**Existing notes (6) by role:**
- `kmap-legacy-keymap-system.md` — R1 + R4 + R5
- `engine-internal-vs-player-facing-files.md` — R4 + R5
- `skywind-animated-skyboxes.md` — R1 + R2 + R4
- `completing-legacy-fte-protocol-extensions.md` — R1 + R3 + R5
- `client-side-server-exec-allowlist.md` — R3 + R5
- `ruleset-anti-script-restriction-pattern.md` — R3 + R5

**Guide candidates (20) by role:** `weapon-scripts` R3; `teamplay-communication` R3+R4 (nugget); `scripting` R3 (multi); `hud` R2+R3; `multiview` R2+R3; `charsets` R3+R4+R6 (multi); `crosshairs` R6+R4 (nugget); `independent-physics` R1+R2; `fakeshaft` R1+R2; `frag-tracker` R2+R4; `player-skins` R1+R2+R3; `particles` R1+R2 (nugget); `message-filtering` R2; `server-browser` R2+R3+R4; `video-capture` R2+R3; `voice-support` R1+R2; `command-line-parameters` nothing-new; `macros` R4 (nugget); `textures` R4+R3 (multi); `triggers` R3+R4 (multi, reference-heavy).

**Confirmed ignore set (10):** 9 `settings/*.md` + `commands.md` all auto-gen. Plus `faq.md` (link-outs) and `structure.md` (39 lines convention, absorb into classifier note) from the wider corpus.
