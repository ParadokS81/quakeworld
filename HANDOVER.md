# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 179 lines (still over 150 ceiling)](#qw-oracleclaudemd-is-179-lines-still-over-150-ceiling) — improved by Task 1 rewrite, remaining bloat is raw messages schema
- [ConfigViewer compare tab counts are global](#configviewer-compare-tab-counts-are-global) — counts show total across all cvars regardless of active section
- [qw-oracle VISION.md needs active-assistance reframe](#qw-oracle-visionmd-needs-active-assistance-reframe) — current VISION.md talks Oracle Bot / Digest / Time Machine but not the broader constructive-query / version-aware vision
- [Pretty view status-category highlight bug](#pretty-view-status-category-highlight-bug) — Report + Need/Pwr chains never highlight their active `say_team` leaf despite every other chain working; parallel terminal made progress but needs verification
- [Pretty view + StatePanel visual polish](#pretty-view--statepanel-visual-polish) — deferred visual refinement on both the state editor and the pretty-render display; user wants to iterate on the feel tomorrow
- [Alias chain pretty view cosmetic: duplicate `.msg.point` rows](#alias-chain-pretty-view-cosmetic-duplicate-msgpoint-rows) — when an alias is referenced from two parent branches, chain view shows it twice and both highlight if either path fires
- [Player state simulator -- follow-ups](#player-state-simulator----follow-ups) — .loc dropdowns, visual polish, minor carry-overs
- [qw-oracle Discord message deep links](#qw-oracle-discord-message-deep-links) — backfill channel_id + guild_id so MCP output can include clickable Discord URLs per message

---

## qw-oracle/CLAUDE.md is 179 lines (still over 150 ceiling)

**Added:** 2026-04-14, **Updated:** 2026-04-16
**Status:** improved by Task 1 rewrite (192 -> 179), still 29 lines over hard ceiling
**Verification first:** `wc -l /home/paradoks/projects/quakeworld-poc/apps/qw-oracle/CLAUDE.md`. If under 150, resolved.

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`

---

## ConfigViewer compare tab counts are global

**Added:** 2026-04-16
**Status:** open
**Verification first:** open ConfigViewer in compare mode, click Domains > Teamplay > Binds. If the compare bar still shows "All (2748)" etc., the issue persists.

The "All (2748) / Different (331) / Same (191) / Only yours (0) / Only theirs (2112)" counts at the top of ConfigViewer always show the total across ALL cvars, regardless of which section/domain the user is viewing. When viewing Teamplay Binds, seeing "2748" is confusing because that's cvar rows, not teamsay rows. Scoping the counts to the active section requires knowing which section type is active (cvars vs weapon binds vs teamsay vs aliases) and computing counts per type.

Note: the related issue of Domain Teamplay Macros showing fewer items than Settings Macros was resolved in 2026-04-16 session (switched from alias-chain extraction to database-category sourcing).

### Related

- `apps/slipgate-app/src/components/ConfigViewer.tsx` (compareCounts memo)

---

## qw-oracle VISION.md needs active-assistance reframe

**Added:** 2026-04-16
**Status:** pending, next qw-oracle session
**Verification first:** read `apps/qw-oracle/VISION.md` in the poc worktree. If it mentions "active assistance" / "constructive queries" / "version-aware retrieval", this is resolved.

The current VISION.md (light-edited 2026-04-14 to add three-layer block) still frames the project around the original three paths: Oracle Bot, Digest, Time Machine. The 2026-04-15 conversation with ParadokS crystallized a broader vision:

1. **Active assistance, not just retrieval.** The end product is a system that can *construct* configs (weapon priority chains, teamsay macros, hybrid binds) from Layer 3 pattern guides, not just look up cvars. This is a qualitative shift from "smart search" to "domain copilot."
2. **Version-aware retrieval.** Once the AST extractor version-walk ships, every cvar/command carries first_seen_version/last_seen_version. Cross-referencing Layer 2 session dates against those ranges gives temporal relevance filtering: "this advice predates the 3.6 rewrite."
3. **Layer 2 as FAQ signal for Layer 3.** Chat is not primarily a direct answer source — it's a compass for what concept notes to write. Mine the chat for frequent questions, author targeted Layer 3 notes for the top topics, link back into the sessions.
4. **ezquake.com docs conversion pipeline.** The existing curated guides (weapon-scripts.html, scripting.html, etc.) are the natural input for Layer 3. Each page gets adapted into 1-3 concept notes with canonical ID references.

All four points are captured in `project_qw_oracle_product_vision.md` memory, but VISION.md itself (the file other devs would read) does not reflect them yet. Low urgency — the memory carries the knowledge across sessions, and the VISION.md rewrite is best done alongside the presentation prep when the framing is most fresh.

---

## Pretty view status-category highlight bug

**Added:** 2026-04-17
**Status:** parallel terminal landed partial fixes (`d0acbd9` parser-side `strip_quote_wrap()` for ezQuake's lenient unterminated-quote handling, `817a72d` trace memo runs in both Pretty and Raw modes), needs live re-verification
**Verification first:** open ConfigViewer → Teamplay → Binds in Simulator mode. Expand Report (bind `2`) and Need/Pwr (bind `MwheelUp`). If either highlights the active `say_team` leaf under some simulator state (background tint + left border on the row), this is resolved. Expand Safe (F) for the same-state control -- it should always highlight correctly.

Two specific bind chains under the STATUS category (Report and Need/Pwr) never highlighted their active leaf through the pretty-view's `evaluateTeamsay`-driven flow. Every other bind chain worked with the same code path. The 2026-04-17 session tried five fixes (root-body-only feed, preset `$need`, strip outer quotes, `%u` derivation, `$colored_armor` by class) -- none cleared these two chains while all other chains kept working.

A fresh terminal picked up the issue after the handover prompt was written and landed two commits that may have resolved it. The user did not re-verify before wrapping. When returning to this, start with the repro steps above. If still broken, see the standalone handover at `apps/slipgate-app/docs/superpowers/2026-04-17-pretty-view-status-highlight-handover.md` for the full context of what's been tried and which hypotheses remain open.

### Related

- Handover dossier: `apps/slipgate-app/docs/superpowers/2026-04-17-pretty-view-status-highlight-handover.md`
- Parser strip helper: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` (search `strip_quote_wrap`)
- Matching code: `apps/slipgate-app/src/components/AliasChainResolver.tsx` ~lines 193 (trace memo), 232 (activeLeafCommands), 248 (isActive)

---

## Pretty view + StatePanel visual polish

**Added:** 2026-04-17
**Status:** deferred by user to tomorrow's session -- "refactoring the visuals on the state machine" and "improvements we can do to visualizations of the pretty mode, it requires a bit of thinking and playing around to see what feels right"
**Verification first:** ask the user what they landed on before doing anything -- this is intentionally judgment-heavy and needs the user's eye in the loop.

The pretty view and the StatePanel both shipped in their first functional form across 2026-04-17. User has identified that both need visual refinement once real usage surfaces what the display should actually communicate:

- **StatePanel:** v1 is a text-based form with 31 controls across 8 sections. User has a rough HUD-style sketch (weapon ring around a central figure with HP box, armor pips, powerup stack, ammo indicators) but explicitly waited to redesign until real use informed it. Now it has.
- **Pretty view:** the readability wins are there (colors render, $vars substitute, runtime tokens label or simulate) but the typography/spacing/active-leaf affordance is an early cut. Especially the dotted-underline + hover convention for variable/runtime spans deserves a second look once the user tries it against dense teamsay configs.

Both items are creative / iterative -- not the kind of thing to grind through solo. Pair with the user next session.

### Related

- StatePanel: `apps/slipgate-app/src/components/StatePanel.tsx`
- Pretty view CSS: `apps/slipgate-app/src/app.css` (search `sg-span-`)
- Active-leaf tint: `.sg-alias-chain-entry-active` in the same CSS file

---

## Alias chain pretty view cosmetic: duplicate `.msg.point` rows

**Added:** 2026-04-17
**Status:** known cosmetic limitation, not fixing now
**Verification first:** open the Point bind's expanded chain in Pretty mode. If `.msg.point` appears twice as separate rows AND both rows highlight when either parent branch reaches `.msg.point`, this issue still holds.

`resolveAliasChain` flattens the alias tree with only per-body dedup (`seen` set per-call scope). When an alias like `.msg.point` is referenced from two different parent branches (e.g. `__point` else AND `__point_powerup` else), it appears twice in the flat chain array. The active-leaf highlight matches on stripped `entry.command` text, so both duplicates highlight identically whenever either path's leaf fires.

Proper fix requires tracking the parent-path to disambiguate -- a non-trivial change that affects the chain visualization data model. Deferred because the user's reaction was "didn't quite understand... is it because 2 different chains end up with that msg" -- the behaviour is internally consistent, just visually redundant. Not blocking anything.

### Related

- `apps/slipgate-app/src/components/AliasChainResolver.tsx` `resolveAliasChain` + `activeLeafCommands` matching

---

## Player state simulator -- follow-ups

**Added:** 2026-04-17
**Status:** v1 shipped; polish and extension items parked
**Verification first:** `bun test src/lib/simulator` from `apps/slipgate-app/` — expect 92 pass. `src/components/StatePanel.tsx` exists. Right-rail toolbar has `[Keyboard] [State]` buttons on the far left.

The Player State Simulator (PlayerState model + ezQuake `if` evaluator + `evaluateTeamsay` walker + StatePanel UI + persistence) shipped 2026-04-17 across ~25 commits. OVERVIEW.md has the full feature description. This handover item captures deferred polish and extensions that didn't make v1.

### Sub-groups

**1. `.loc`-driven location dropdowns.** Currently all location fields in StatePanel are free-form text inputs. Real utility comes from scanning the user's `qw/locs/` directory, parsing each `.loc` file (plain-text `x y z name` per line), and building `{ map → [location names] }`. Replace the free-form `location` / `mapname` / `lastloc` / `deathloc` / `pointloc` / `tookloc` / `droploc` text inputs with linked dropdowns: map picker filters the location dropdown. Keep a fallback free-form text input on each so users can test unlisted locations or work without loc files. Requires a small Rust-side `.loc` scanner + Tauri command (adjacent to the existing scanner at `src-tauri/src/commands/scanner.rs`). Probably 3-4 tasks worth of work.

**2. Visual polish per the HUD sketch.** User has a rough sketch (weapon ring with 8 weapon circles around the top, central figure with HP box, armor pips RA/YA/GA, powerup stack PENT/QUAD/RING/BIOSUIT, ammo indicators). v1 is text-based on purpose — polish should wait until the pretty-view integration lands and real use patterns surface what the visual actually needs to communicate. Then redesign from an informed position rather than guessing.

**3. Minor carry-overs from v1 code review.**
- `useKeyboardPanelState.ts` error log messages: some use "Failed to X:" prefix, others use "X:" (the new simulator handlers are shorter-form). Cosmetic, 3-min fix. Files `apps/slipgate-app/src/components/useKeyboardPanelState.ts` lines 159/180/186/193/199/205.
- `resolveWeaponName` export from `src/lib/simulator/derivations.ts` is unused externally — safe to un-export (Task 4 implementer exported it unnecessarily during implementation). Minor API-surface cleanup.
- `useKeyboardPanelState.ts` is now ~236 lines. Not a problem but worth an eye if simulator features grow; may be worth extracting a `useSimulatorState` hook in future.

**4. Input behavior polish.** Debouncing, tab order, focus behavior in StatePanel form controls. Surface specific issues when using it in anger.

### Related

- Spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-17-player-state-simulator-design.md`
- Plan: `apps/slipgate-app/docs/superpowers/plans/2026-04-17-player-state-simulator.md`
- OVERVIEW.md has the full feature description and Code landmarks pointers.

---

## qw-oracle Discord message deep links

**Added:** 2026-04-18
**Status:** pending, low effort, high value for bot output
**Verification first:** `sqlite3 /home/paradoks/projects/quakeworld-poc/apps/qw-oracle/data/qw.db "SELECT COUNT(*) FROM messages WHERE platform='discord' AND guild_id IS NULL"`. If 0, schema has been backfilled.

The messages table in `qw-oracle/data/qw.db` has Discord snowflake IDs (message primary key) but `guild_id` is NULL for all 717k Discord messages and `channel_id` is not stored. The Discord export JSON files at `/home/paradoks/projects/quake/quad/exports/` DO contain `channel_id` per message. All messages come from the single Quake.World Discord server.

To generate clickable `https://discord.com/channels/{guild_id}/{channel_id}/{message_id}` links:

1. Backfill `channel_id` from the export JSON into the messages table (or add a channel_name -> channel_id lookup table; there are only 4 channels)
2. Hard-code the Quake.World guild_id as a constant (single server)
3. Add a `discord_url` field to SessionMessage in the MCP tool output for discord-platform messages

IRC messages have no linkable URL -- historical logs only.

### Why it matters

When the oracle's answer is delivered through a Discord bot, linking to the actual community message that informed the answer lets users verify the source and read the surrounding context. Builds trust in the system.

Mirrors the POC-branch HANDOVER entry so main tree sees it too.

---

