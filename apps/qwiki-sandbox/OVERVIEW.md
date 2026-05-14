# QWiki Sandbox -- Overview

Living map of the v1-beta substrate + Modes mini-arc tooling. Updated as state changes during the arc.

## Current arc

**`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/`** -- 8-phase arc, 4 substrate phases + 4 Modes-mini-arc phases. See that directory's `README.md` for the phase index and live status table.

Pre-pivot 6-phase plan (clone -> upgrade -> Citizen -> Page Forms -> EQL drain -> showcase) is superseded; preserved in `VISION.md` as ORIGINAL VISION appendix for historical context.

## Substrate state

After Phase 4 ships: the substrate from Phase 3 (three-container nginx + mediawiki:1.43-fpm + mariadb:11.4 stack on Unraid + Citizen v3.16.0 + Page Forms + Semantic MediaWiki 6.0.x + PluggableAuth + OpenIDConnect + Discord OAuth + `wiki-contributor` / `wiki-curator` groups + namespace edit restrictions per D5) PLUS three additional small surfaces: three quality-tag categories (`Category:Needs review` / `Category:Stale` / `Category:Draft` per D18) with descriptions on each page documenting their trigger + curator action, a `Help:URL slug discipline` page documenting the D6 authoring rule for cutover URL preservation, and an end-to-end verification that the Layer 3 harvest path works (a wiki section authored at `Phase 4 harvest probe` was distilled to a concept-note at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md`, ingested via the load-concepts pipeline, and confirmed retrievable through the oracle MCP `search_concepts` tool at `https://oracle.slipgate.me/mcp`). Auto-categorization on save lands in Phase 5 via page-type templates that include `[[Category:Needs review]]`; the slug-validation form hook also lands in Phase 5 alongside the Mode form. v1 beta substrate is complete; the vertical Modes mini-arc (Phases 5-8) is unblocked.

Auth: PluggableAuth + OpenIDConnect against Discord OAuth (manual endpoint config; `openid identify guilds.members.read` scopes). The `wiki-contributor` MW group is auto-assigned on every login based on the user's `@wiki-beta` Discord role membership -- re-checked via `/guilds/<DISCORD_GUILD_ID>/members/<sub>` with `Authorization: Bot <DISCORD_BOT_TOKEN>` (bot-mode per D4 Amendment 2026-05-14, F9 resolution; the wiki-owned `wiki.Quake.World` Discord bot reads role membership server-side rather than via the user's OAuth access token). `wiki-curator` is manually assigned by the operator via `Special:UserRights`. Anonymous read is public; anonymous edit blocked.

Namespace restrictions (D5): `Form` / `Form_talk` / `Template` / `Template_talk` / `Category` / `Category_talk` are `wiki-curator`-only (custom `edit-curator-namespace` right paired with `$wgNamespaceProtection`); `Main` / `Talk` / `File` / `File_talk` / `User` / `User_talk` are `wiki-contributor`-editable; `MediaWiki:` is sysop-only (MW default).

Phase 4 layers the quality-tag categories (`Needs review` / `Stale` / `Draft` per D18) + verifies the Layer 3 harvest path end-to-end against a test page.

## Modes mini-arc state

Phases 5-8 deliver Mode page-type form + curator tool + 27-mode triage + harvest verification. Status tracked in the arc README's phase index.

## Source artifacts on operator's side

- `dumps/qwiki.sql.gz` (87M -> ~710M uncompressed, MariaDB 11.8.6 dump, 96 tables; 94 InnoDB / 2 MyISAM, binary charset). Source of per-domain extract queries.
- `dumps/wiki-images.tar.gz` (6.4G, 50,150 files incl 178 bonus QW demos). Per-domain image migration deferred; Modes may need a few screenshots.
- Local `qwiki-analysis` MariaDB container (operator's WSL Docker) holds the imported dump for inventory queries. Kept alive through the Modes mini-arc.

## Key external dependencies

- **bps** -- founder of QWiki, decision-maker for live-wiki cutover (future arc).
- **ciscon** -- sysadmin of live wiki; source of the dumps.
- **Hooraytio + alice** -- top live-wiki contributors; potential v1-beta invitees.
- **Live wiki** at https://www.quakeworld.nu/wiki/ -- extraction source.

## Decisions log

Cross-cutting decisions live in the arc's `decisions.md` (D1-D26, locked 2026-05-12; D2 amended 2026-05-13 to lock nginx + php-fpm + MariaDB composition + current-stable image versions). No project-internal decisions log; if a phase needs to deviate from a locked decision, the phase MD's "Deviation" section + operator review handles it (per D25).
