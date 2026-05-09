# QWiki Sandbox -- arc-planning handover

## 2026-05-09 evening: ARC PIVOTED to fresh-build (see new handoff)

After Pass 1 + content analysis, this arc reframed from "modernize the existing wiki in place" to "fresh-build with extract." Reasons:

- Content analysis showed 51% stubs / 63% stale 5+ years / player-page-dominated structure / severed edit attribution
- Operator articulated ecosystem-integration vision (wiki + quake.world + hub + oracle + maps.quake.world + xantom's parsers, with bidirectional citation + auto-population) needing template architecture redesigned from day 1
- "Too broken to fix" instinct + ecosystem framing argued for fresh start over retrofit

**Active entry point for next session:** `docs/superpowers/parking/2026-05-09-qwiki-sandbox-fresh-build-handoff.md`.

**Supporting artifacts:**

- `docs/research/2026-05-09-qwiki-content-analysis.md` -- the data driving the decision
- `docs/superpowers/specs/2026-05-09-qwiki-sandbox-architecture.md` -- Pass 1 close + pivot section
- Memory: `project_qwiki_sandbox_passes.md` -- pass tracker (rewritten for new framing)

The content below is the **original handover** that framed the arc as modernize-in-place. Preserved for historical context. Read the new handoff first.

---

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

The 2026-05-08 evening + 2026-05-09 morning session pivoted hard from Phase B drain workflow design into "modernize QWiki itself." That session produced (a) the qwiki-sandbox project scaffold with full DB dump + image tarball from ciscon, (b) a phase plan sketched in OVERVIEW.md, (c) Discord stakeholder alignment with bps + ciscon, (d) ciscon's tarpit defense insight, and (e) a hook fix as side-quest. **This new session's job: plan the qwiki-sandbox arc properly via arc-classifier → arc-brainstormer → arc-planner.**

This is an ARC-PLANNING session, not implementation. Don't spin up Docker yet.

---

## The pivot in one paragraph

Phase B drain brainstorm uncovered that QWiki's structural messiness (UKCML pattern, inconsistent template usage, MW 1.35 + PHP 7.4 both EOL, AI-bot scraping pressure) is a real blocker downstream. Operator floated "rebuild the wiki" -- over-scoped. Refined to "collaborative compliance": iterate cleanup edits with alice/Hooraytio + leverage existing Page Forms infrastructure. Discord conversation with bps (founder) and ciscon (sysadmin) confirmed both are open to upgrading. ciscon delivered the full DB dump (87M) + image tarball (6.4G with 50K files including 178 demos as bonus). Operator now wants to spin up a local sandbox MediaWiki, modernize it stepwise, and showcase to the team for live-cutover discussion. **The arc: take a clone of QWiki, modernize it through 6 incremental phases, prove the upgrade path, gain stakeholder buy-in.**

---

## What's shipped (committed to main, 2026-05-08 → 2026-05-09)

### Project scaffolding

- `apps/qwiki-sandbox/` -- new project folder
  - `CLAUDE.md` -- project instructions + status
  - `README.md` -- quick-start
  - `VISION.md` -- scope + success criteria + phase plan
  - `OVERVIEW.md` -- living state map
  - `.gitignore` -- excludes `dumps/`
- `apps/qwiki-sandbox/dumps/` -- gitignored
  - `qwiki.sql.gz` (87M) -- MariaDB dump from ciscon, 96 tables incl SMW
  - `wiki-images.tar.gz` (6.4G) -- 50K files including 178 QW demos (.qwz/.qwd/.mvd) as bonus

### Side-quest: hook fix

- `.claude/scripts/upstream-pr-reminder.sh` -- rewrote to validate `tool_input.command` internally before blocking. Was firing on every Bash call; now only fires on actual `gh pr (create|edit)`. Fail-safes for missing jq / malformed input. 8 pipe-tests passing.

### Side-quest: gap-check tool (sister project)

- `apps/qw-oracle/scripts/curate-brands/gap-check.ts` -- reports drift between Phase A pre-fill and operator's curated state. Surfaced 5 silently-dropped members (EQL_Pro, Kombat_Summer_Duel_2, Organ_Grinder_1+2, Ownage_Cup_2). UKCML correctly in `unassigned`, not lost.

---

## Stack inventory (live wiki, observed)

From `Special:Version` 2026-05-08:

| Component | Version | Status |
|---|---|---|
| MediaWiki | 1.35.10 | LTS support ended Dec 2023 |
| PHP | 7.4.33 | EOL Nov 2022 |
| MariaDB | 11.8.6 | Current |
| Active skin | LiquiFlow 1.1 (custom) | Liquipedia-derived |
| Available skins | MonoBook + Vector | (legacy) |
| **Semantic MediaWiki** | 4.1.3 | **Already installed, underused** |
| **Page Forms** | 4.9.4 | **Already installed, underused** |
| External Data | 2.1 | |
| WikiEditor | 0.5.3 | |
| Validator | 2.2.3 | |
| ParserFunctions, Arrays, Variables | various | logic primitives |
| EmbedVideo, MultimediaViewer, PageImages, TextExtracts | | |
| Discord Notifications | 1.1.3 | |

**Missing (modern conveniences):**

- Scribunto (Lua module support)
- VisualEditor
- Cargo (Liquipedia uses this; SMW is the alternative)
- Modern skin (Vector 2022 or Citizen) for dark mode
- TemplateData / TemplateStyles
- DiscussionTools

---

## Stakeholder context

- **bps** -- QWiki founder (per `Site:About`). Engaged. Said "need to ping ciscon for the tech stuff." Decision-maker for live changes.
- **ciscon** -- Sysadmin. Currently keeping it alive. Quote: "i just keep the thing running by fixing things here and there, blocking bots, and recently upgraded mysql so it would stop crashing randomly... as far as the actual software goes, got me." Shipped the DB dump + images. Open to upgrade. His framing: "horribly inefficient... not meant to handle a ton of stuff at once."
- **Hooraytio + alice** -- Top wiki contributors. Operator collaborates with them on cleanup. They'll drive form-driven cleanup if Page Forms work lands.

---

## Phase plan (from OVERVIEW.md, not yet planned in detail)

| # | Phase | Status |
|---|---|---|
| 0 | Scaffolding + dump grab | DONE 2026-05-09 |
| 1 | MW 1.35 clone via Docker; dump import; render verification | pending |
| 2 | Upgrade to MW 1.39 LTS + PHP 8.1 | pending |
| 3 | Citizen skin + VisualEditor + dark mode | pending |
| 4 | Page Forms audit + author missing forms (tournament/brand/player/clan) | pending |
| 5 | EQL cleanup pilot drain on the sandbox | pending |
| 6 | Showcase to bps/ciscon/Hooraytio/alice | pending |

Each phase is a checkpoint. The arc-brainstormer / arc-planner refines these into proper phase MDs with verification regimes.

---

## ciscon's tarpit insight (worth remembering)

When discussing AI-bot scraping load, my advice (rate-limit + Cloudflare + content-negotiation routing) was naive. ciscon's actual playbook: **tarpit > rate-limit > block.**

- Rate-limit: nginx rate-limit is "god-awful," distributed bot hosts make per-IP weak
- Block: bots just go bother someone else, no cost to them
- **Tarpit (his approach):** "the thing that slows them down the most is sleeping before any response when it's obviously a bot request, and then redirecting them to some gigantic file. it also wastes their bandwidth in addition to time, and hopefully whoever hosts the box will get angry with them." Bots actually download the file. Confirmed.

The qwiki-sandbox (phase 1+) doesn't need this -- the sandbox isn't public. But the eventual "live cutover" conversation (phase 6) should explicitly preserve ciscon's tarpit infrastructure rather than replace it.

Captured as memory: `reference_botload_tarpit_pattern.md`.

---

## Critical rules (don't violate)

- **DO NOT spin up Docker / start phase 1 yet.** This session is arc planning. Implementation is the next session.
- **DO NOT change wiki engine.** MediaWiki stays. We're modernizing within the line, not replacing with DokuWiki / BookStack / Wiki.js. Replacing would lose Page Forms / SMW / LiquiFlow / 9 years of template work.
- **DO NOT push edits made on the sandbox back to live wiki without bps + ciscon alignment.** The sandbox is operator's playground. Live cutover is a separate conversation with concrete proposal.
- **DO NOT fork the wiki long-term.** This is a modernization preview, not a parallel canonical wiki.
- **DO NOT extract images tarball into the project tree without strip-prefix handling.** The tarball preserves `mnt/nas-backup/qw3/docker/wiki/images/...`; needs `--strip-components=5` or volume-mount path adjustment when phase 1 starts.
- **Operator memory rules apply:** momentum over ceremony / plain English at decision points / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early.

---

## First three actions

1. **Read this handover (you're reading it).**
2. **Read the project scaffold:**
   - `apps/qwiki-sandbox/CLAUDE.md`
   - `apps/qwiki-sandbox/VISION.md`
   - `apps/qwiki-sandbox/OVERVIEW.md`
3. **Invoke `arc-classifier` skill.** This is genuinely arc-shaped (multi-phase, distinct purpose, ~2-3 weeks of focused work, its own verification regime). Classifier confirms the arc, then routes to `arc-brainstormer` for multi-pass design, then `arc-planner` for the scaffold.

After arc-classifier confirms: invoke `arc-brainstormer`. Likely passes:

- Pass 1: phase-1 mechanics (Docker compose shape, dump import strategy, render verification approach)
- Pass 2: phase 2-3 (MW upgrade choreography, skin + VisualEditor selection)
- Pass 3: phase 4 (Page Forms audit + form authoring strategy for tournament/brand/player/clan)
- Pass 4: phase 5 (cleanup pilot integration with Phase B drain)
- Pass 5: phase 6 (showcase shape; what does "sold" mean to bps + ciscon?)

After arc-brainstormer: invoke `arc-planner` for the 6-artifact scaffold (decisions / review-findings / prerequisites / phase-template / handoff-prompt / README).

---

## Reads required (priority order)

1. **This file (handover).**
2. **`apps/qwiki-sandbox/CLAUDE.md`** -- project framing.
3. **`apps/qwiki-sandbox/VISION.md`** -- success criteria + phase plan.
4. **`apps/qwiki-sandbox/OVERVIEW.md`** -- living state.
5. **`apps/qwiki-sandbox/dumps/`** -- check files exist (87M sql, 6.4G images).
6. **`docs/superpowers/parking/2026-05-09-qwiki-phase-b-brainstorm-pause.md`** -- sister-arc Phase B amendments captured (this session's other output, not arc-blocking but useful context).

If short on time: 1, 2, 3 are mandatory. 4-6 for context.

---

## Operator preferences (carried, in addition to MEMORY.md)

- **Phase 1 first, no shortcuts.** Importing into MW 1.35 first proves dump completeness; jumping to 1.39 upgrade conflates "dump issue" with "upgrade issue." Sequencing matters.
- **Each phase is a checkpoint.** Operator can stop after any phase and still have value. Plan with that property in mind.
- **Showcase is the deliverable, not just data.** Phase 6 is "bps/ciscon/Hooraytio/alice see a credible demo and the live-cutover conversation has a concrete proposal anchored in real demo." Plan the demo shape early.
- **Stakeholder bandwidth matters.** ciscon's review cycle gates the live-side conversation; sandbox cycle is operator-driven.
- **Aligned with `qw-oracle` MCP work.** Cleaner wiki data improves Phase B drain extraction yield. The sandbox will host the EQL cleanup pilot (phase 5).
- **Eventually contributing back is stretch goal, not blocking.** The sandbox's primary job is proving the path; cutover is separate.

---

## When in doubt

- **Tempted to just kick off phase 1 instead of planning** -> resist. arc-classifier first; let the arc skill set do its job.
- **Tempted to over-scope phase 1** -> stay narrow. "Dump imports cleanly into MW 1.35; pages render identically to live wiki" is the only goal. Performance, modern features, dark mode, etc. live in later phases.
- **Tempted to replace MediaWiki with X** -> don't. The whole arc's value depends on staying in the MW line.
- **Tempted to involve bps/ciscon prematurely** -> sandbox runs fine without them. Bring them in for phase 6 demo.
- **Tempted to skip Page Forms phase** -> that's the cleanup-enabling phase. Don't skip; without forms, the EQL cleanup pilot is a wikitext rewrite by hand.

---

## Halt-and-report contract

After arc-classifier + arc-brainstormer + arc-planner:

- 6-artifact arc scaffold landed at `docs/superpowers/plans/<date>-qwiki-sandbox/`
- Phase MDs sketched (full content per arc-planner; phase 1 is the most detailed since it's the next implementation target)
- Halt with structured status: scaffold ready, phase 1 ready for execution in a fresh terminal

Don't execute phase 1 in this session. Hand off cleanly.

---

## Context budget projection

Arc classification: ~5-10k tokens.
Multi-pass brainstorm: ~80-120k (depending on pass count).
Arc planner scaffold: ~30-50k.
Total expected: 120-180k for "classify + brainstorm + plan." Comfortable.

If approaching 250k mid-brainstorm: handoff again -- planning shouldn't exceed 150k.

---

## Reference: this session's loose ends

These are NOT arc-blocking but worth knowing:

1. **5 silent drops in Phase A curation state** (qw-oracle side, not sandbox). Patch via JSON edit when next on Phase B drain. Detail in the Phase B brainstorm pause doc.
2. **3 EQL Season redirect duplicates** in operator's state (long + short titles coexist). Dedup later.
3. **3 QHLAN bucket Duelmania entries** -- judgment call, operator decides.
4. **90 unassigned tournaments** in pre-fill -- normal Phase A inventory; not a gap, just unsorted.

These don't gate this arc; sandbox progresses independently of curate-brands cleanup.
