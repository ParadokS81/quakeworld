# QWiki sandbox -- Pass 3 handoff (ecosystem map)

**STATUS: CONSUMED 2026-05-11.** Pass 3 ran and locked. Drain landed in `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` Pass 3 section. Pass 4 handoff at `docs/superpowers/parking/2026-05-11-qwiki-sandbox-pass4-handoff.md`. This file is retained as historical entry-point.

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

This is the third arc-brainstormer entry point for the qwiki-sandbox arc, post-double-pivot. Passes 1-2 closed. Pass 3 is the heavy synthesis pass: for every kind of QW knowledge, where across the ecosystem does it most want to live? **This session's job: open and run Pass 3.**

Still arc-planning, not implementation. Don't spin up MW yet.

---

## Where things are

**Plan shape (post-double-pivot, conceptual-first):**
- Pass 1 -- generic wiki frame -- COMPLETE
- Pass 2 -- current QWiki audit -- COMPLETE
- **Pass 3 -- ecosystem map -- THIS SESSION**
- Pass 4 -- wiki's unique role + SHOULD list -- pending
- Pass 5 -- contributor model + freedom-vs-structure -- pending
- Pass 6 -- content strategy: extract / new-build / abandon -- pending
- Architecture passes (namespaces / templates / Page Forms+SMW / ecosystem-integration / discoverability+UX / cutover+deployment) -- downstream of Pass 6.

**Active drain destination:** `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`. Pass 3 drains into a new "Pass 3 -- ecosystem map" section there.

**Old architecture spec** (`2026-05-09-qwiki-sandbox-architecture.md`) is historical -- modernize-in-place reasoning that got pivoted away from. Don't drain into it.

---

## What's locked from Passes 1-2 (don't relitigate)

**Generic wiki form (Pass 1):**
- Wiki form's irreducible offering: prose + crosslinks + edit-in-place + page-as-current-canonical, *under live multi-author maintenance.*
- Failure modes: activation collapse, scope drift, quality-floor collapse, structural mismatch with DB-shaped data.
- Operating points locked: account-gated low-barrier signup (no admin gating); structured-with-narrative-slots default; schema/topic freedom deliberately constrained.

**Current QWiki state (Pass 2):**
- Alive roles: tournament event coordination + archival; map descriptions (depth uneven); file/image hosting (7GB+); InfoboxComplete-tagged subset (444 pages, 70% recently touched).
- Failing-but-attempted: player directory (Hub V2 obsoletes); mode/mechanic/tool descriptions (the central content gap).
- Pass-4-candidate roles: community section (interviews/podcasts/columns; Purity columns are the legacy artifact); history/timeline visualization (LAN events, finals, tech breakthroughs -- currently MISSING).
- Contributor pool: Alice (active later tournaments) / Link (active undisciplined) / Carapace (curator-burnout) / mystery Russian (bulk-dump) / tournament-organizer drive-bys. 2-4 active editors, NOT 30 organic.
- Edit-gate today: admin-approved-by-invitation. Highest-friction. Major contributor to stagnation (Discord pool of 30-50 latent vs 2-4 active).
- Wiki today is human-readable but machine-unreadable. SMW capability installed, property discipline absent (~5% conform).
- **Author-once-harvest-many:** wiki is upstream of oracle/hub/AI services. Don't duplicate authorship in private .md files.
- KTX modes (27 modes, 15 pages, half-bad) = flagship "author at wiki" case.
- Tournament page template named: Description / Rules / Format / Maps / Signups / Results.

---

## Pass 3 scope -- ecosystem map

**Plain-English:** every kind of QW knowledge has a *most natural home*. Wiki is one home. Other ecosystem members are other homes. Pass 3 settles where each kind belongs, where it duplicates, and where there are gaps no one currently owns.

**Ecosystem members to map across:**
- Wiki (this arc; new fresh-build)
- quake.world (community site, in development -- exact scope tbd)
- Hub V2 (`hub.quakeworld.nu` -- match history, tournament data; xantom's project)
- maps.quake.world (xantom's map archive site)
- Oracle (qw-oracle; Layer 1 facts / Layer 2 chat corpus / Layer 3 concept notes)
- Xantom's parsers (demo data extraction, KTX stats)
- Discord (community discussion; chat history feeds oracle Layer 2)
- Forum (qw forum; historical archive)

**Knowledge kinds to map** (seed list -- expect operator to extend):
- Tournament results / brackets / season pages
- Player profiles (current + historical)
- Clan profiles
- Match-level data (demos, ktxstats, frags, results)
- Map info (BSP-derived data + community-narrative)
- Mode descriptions (KTX modes etc.)
- Mechanics / gameplay-physics knowledge
- Engine / client / tool knowledge (cvars, commands, configs)
- History / timeline (LAN events, tech milestones)
- Lore / community memory / inside jokes
- Tutorials / how-tos
- News / announcements
- Long-form columns / interviews / podcasts
- File / image / demo archive

**Candidate sub-questions** (operator can reorder/merge):
- 3.1 -- inventory ecosystem members: what does each own / want to own / shouldn't own?
- 3.2 -- inventory knowledge kinds (catalog).
- 3.3 -- map knowledge-kind to canonical-owner.
- 3.4 -- identify duplications + bridges (where same data wants to live in multiple places, what's the canonical-vs-derived relationship).
- 3.5 -- identify gaps (knowledge nobody currently owns but the ecosystem needs).

Output: ecosystem knowledge map drains into vision spec; feeds Pass 4 (wiki's unique role).

---

## Reads required (priority order)

1. **This file (handoff).**
2. **`docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`** -- Passes 1+2 locked decisions + carry-forwards. Mandatory.
3. **`docs/research/2026-05-09-qwiki-content-analysis.md`** -- the data behind the pivot.
4. **`docs/superpowers/parking/2026-05-09-qwiki-sandbox-fresh-build-handoff.md`** -- prior-session entry point with the second-pivot status block at the top.
5. **`apps/qw-oracle/CLAUDE.md` + `apps/qw-oracle/VISION.md`** -- understand oracle's three-layer model (especially Layer 3 concept-notes -- those are what wiki content harvests into).
6. **Memory: `project_qwiki_sandbox_passes.md`** -- pass tracker with locked principles.

If short on time: 1, 2, 5 are mandatory.

---

## Critical rules (carry-forward + new)

- **Fresh-build is the path. NOT modernize-in-place.** If Pass 3 starts framing the wiki as "upgrade the existing one," you've slipped.
- **The plan is conceptual-first.** If Pass 3 starts naming namespaces / template field lists / specific MW extensions, you've drifted into Pass 4 / architecture territory. Refocus on shape: WHERE knowledge lives, not HOW it gets stored.
- **Author-once-harvest-many is locked.** Wiki is upstream. Don't entertain "let oracle own this content type" unless the operator surfaces a reason to invert.
- **Hub V2 obsoletes the player-directory role.** Don't relitigate.
- **Contributor pool is small.** 2-4 active editors, plus tournament drive-bys. Pass 3 conclusions must be sustainable by that pool.
- **Operator preferences:** momentum over ceremony / plain English at decision points / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early.

---

## First three actions

1. **Read this handoff (you're reading it).**
2. **Read the vision spec** (`docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`). That's where Passes 1+2 live.
3. **Invoke arc-brainstormer.** Confirm the candidate Pass 3 sub-question list above with the operator (or refine), then start 3.1 (ecosystem-member inventory) one question at a time.

---

## When in doubt

- **Tempted to merge Pass 3 with Pass 4 ("let's just decide the wiki's role now")** -> don't. Pass 3 is about the WHOLE ecosystem; Pass 4 synthesizes the wiki's slice from it. Mixing them collapses the synthesis.
- **Tempted to give the wiki the maximalist scope ("everything narrative belongs here")** -> push back. The contributor pool is small. The wiki only gets the slice it can sustain.
- **Tempted to design templates while mapping knowledge kinds** -> halt. Templates are Pass 4+ / architecture territory. Pass 3 is mapping, not designing.
- **Tempted to fully spec Hub V2 / quake.world / xantom's parsers** -> don't. They're peers, not subjects of this arc. Get enough operator-input to know their *scope intent*; don't try to pin their internals.
- **Tempted to start a "Pass 3 minutes" doc** -> not needed. Drain into the vision spec's Pass 3 section directly.

---

## Tooling state at handoff

- **mariadb container `qwiki-analysis`** still running with imported QWiki dump. Useful if Pass 3 needs ad-hoc queries against existing content distribution: `docker exec qwiki-analysis mariadb -uroot -panalyze qwiki -e "..."`. Operator can kill with `docker rm -f qwiki-analysis` when fully done with brainstorm.
- **Image tarball** at `apps/qwiki-sandbox/dumps/wiki-images.tar.gz` (6.4G), unextracted.
- **No fresh MW stack running yet.** Architecture passes downstream will kick that off.

---

## Context budget projection

Pass 3 alone: ~30-50k. Heavy operator-input pass; lots of back-and-forth on each ecosystem member. Single-session aim: complete Pass 3, drain to vision spec, commit, fresh-terminal for Pass 4.
