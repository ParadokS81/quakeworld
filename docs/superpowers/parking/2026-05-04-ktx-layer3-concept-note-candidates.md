# KTX onboarding -- Layer 3 concept-note candidates

**Added:** 2026-05-04 (during arc-brainstormer for KTX Layer 1 Onboarding).
**Status:** Capture-only. These are concept-note seeds that emerged during the discovery sweep and the per-sub-question conversations -- not yet authored. Each entry is a future Layer 3 authoring trigger.

**Why this doc exists:** the KTX brainstorm is surfacing knowledge nobody has documented well -- KTX absorbed many older mods (CTF, arena, wipeout, race, bloodfest, hoonymode, blitz) without formal docs to match. GitHub wiki is mostly empty. Source code is the truth, but source comments don't capture community usage patterns. This doc preserves the seeds so they don't disappear between brainstorm and execution.

**Trigger to author each:** post-KTX-Layer-1 ship, when KTX entities are queryable in the MCP. Each candidate has anchor entities listed -- these become L1 citations in the concept-note bodies.

---

## Candidate 1 -- Race mode and self-practice tools

**Surfaced during:** Pass 1.5 spike (2026-05-04) when verifying bot:editor command shape; operator noted trickjump-practice usage.

**Scope:** how QW players practice trickjumps and routes on KTX servers. Two infrastructures provide the primitives:
- KTX race mode (`race.c`) -- first-class commands (`race`, `race_ready`, `race_break`, `race_show_lineup`, etc.), position-file persistence (`POS_FILE_VERSION`), pacemaker / record / playback infrastructure.
- Bot path-editor primitives (`addmarker`, `goto N`, `move`) used unofficially as checkpoint-and-teleport for solo practice. NOT the documented purpose, but a community-known workflow.

**L1 anchors (will exist post-arc):** all `race_*` commands in `command_versions` (project=ktx, scope=NULL). Bot:editor commands (`addmarker:frogbot:editor`, `goto:frogbot:editor`, etc.).

**Community-knowledge breadcrumb:** "you can use bot editor mode to set checkpoints and teleport back -- almost no one knows about this" (operator, 2026-05-04).

---

## Candidate 2 -- KTX game modes index (PER-MODE / PER-MUTATOR shape, refined 2026-05-05)

**Surfaced during:** Pass 1.6 conversation (2026-05-04) when operator noted "KTX absorbed many older mods" and listed CTF, arena, wipeout, race, bloodfest, hoonymode, botmode. **Refined Pass 5 wrap-up (2026-05-05):** operator clarified the L3 shape after Vikpe surfaced the "primitives vs presets" architectural framing -- product framing is "human-wiki entry per mode/mutator answering: what is this, how do I start it, what are the rules?" Concise default; only a few warrant longer treatment.

**Architectural framing** (Vikpe-flagged, operator-confirmed):
- KTX modes/mutators sit on top of a smaller engine-primitive layer (Vikpe's view: coop / ffa / team are the primitives; everything else is preset).
- Pass 5's catalog (27 rows) is the user-facing surface; each row's `props_json.game_type` already encodes which primitive it compiles to. Vikpe's framing is preserved as metadata, not as a separate kind taxonomy.
- The concept-note set REPLACES this single-page index with a per-mode/per-mutator note set. The index can be a top-level concept-note that LISTS the per-mode notes (cross-link hub), or just an OPERATIONS table.

**Concept-note set shape** (one note per catalog row, ~27 notes total):

Each note follows the concise human-wiki shape:
- **What is this?** -- one paragraph.
- **How do I start it?** -- the activation command + cvar + any prereqs.
- **What are the rules?** -- the relevant cvars / mode-default overlays / behavioral specifics, cited to L1 rows.
- **Variations / sub-flags** (where applicable, e.g., FreshTeams' 4 sub-cvars).
- **Wiki cross-references** (where applicable; quakeworld.nu/wiki via `props_json.wiki_ref`).

Most modes need ~1 page max (1on1, 2on2, ffa, ctf, hoonymode, blitz variants, XonX, three-team variants -- the team-size presets are mostly just "N players, time-based, weapons-stay/dont-stay"). A handful warrant more depth:
- **Race** -- waypoints / time-trial / scoring systems / settings / multiplayer-vs-solo.
- **Bloodfest** -- co-op survival / monster waves / boss spawns / how to host.
- **Clan Arena (ca)** -- round-based, no respawn, 9-round series, k_clan_arena_* cvars.
- **Wipeout** -- ca variant with limited respawns per round.
- **CTF** -- hook / runes / team-based spawn / flag mechanics.
- **HoonyMode + Blitz variants** -- single-frag rounds, spawn-toggle mechanic.

Mutators each get their own note (typically very concise except where mechanics warrant explanation):
- **LGC** -- lightning gun challenge mode (wiki ref exists).
- **Instagib** -- one-shot kills, instant gib weapons.
- **Midair** -- rocket-only midair-kill mode.
- **Berzerk** -- quad-for-all in final stretch (mechanic worth explaining; operator surfaced k_btime trigger).
- **Yawnmode** -- "fun mode" (needs source/community research; operator self-flagged unfamiliarity).
- **KillQuad** -- quad-modification mode (source explains; needs a note).
- **FreshTeams** -- handicap weapon-respawn mode + 4 sub-flags.
- **NoSweep** -- dmm1-only weapon-pickup restriction.

**L1 anchors (when extraction lands):** 27 `kind='game_mode'` catalog rows + ~309 `kind='mode_default'` overlay rows + 13 `kind='monster'` (bloodfest) + 3 `kind='score_system'` (race) + the 8 mutator-specific cvars (k_lgcmode, k_instagib, k_midair, k_bzk, k_yawnmode, k_killquad, k_freshteams, k_nosweep). Each concept note cites the catalog row by `canonical_id` + the mode_default rows for "what cvars get set" + supplementary L1 rows for mode-specific content.

**Why this matters (operator framing):** "its basically how we would handle a human readable wiki as well. that a user wants to see 'what kind of modes can i play, oh that looks cool, how do i start that and what are the rules?'" The mode/mutator concept-note set IS the missing KTX user docs. Server admins, new players, and AI-assisted users all benefit. KTX's existing community documentation is poor; this set fills the gap with source-grounded authoritative content.

---

## Candidate 3 -- Chain of command in QuakeWorld

**Surfaced during:** Pass 1.2 + 1.5 discussion (2026-05-04) when explaining how `/ready`, `/4on4`, `cmd wreg` flow client -> MVDSV -> KTX.

**Scope:** how a stringcmd issued in the client console reaches the right handler, given QW's three-layer architecture (client engine + server + game mod). Walks through the actual mechanism for representative commands.

**L1 anchors:** ezQuake commands (none for `ready` -- pass-through), MVDSV commands (none -- routes unrecognized stringcmds to mod), KTX commands (`ready`, `4on4`, `wreg`, `botcmd`, etc.). Also info_keys (`*version`, userinfo cvars `name`/`team`/`topcolor`).

**Worked examples:**
- `/ready` -- client passthrough -> MVDSV unrecognized -> KTX `cmd_t cmds[]` -> `PlayerFastReady` -> `PlayerReady(true)`.
- `cmd wreg [args]` -- KTX command for client-script-driven weapon-priority registration. Latency-tolerance feature for high-ping players.
- `setinfo name foo` -> client userinfo update -> MVDSV stores -> KTX reads via `ezinfokey(p, "name")` at multiple call sites.

**Why this matters:** the multi-layer architecture is fundamental to how QW works but rarely explained outside protocol-spec discussions. A concept note grounds the abstraction with named, citable commands.

---

## Candidate 4 -- Userinfo flow and latency-tolerance features

**Surfaced during:** Pass 1.6 (2026-05-04) when listing the ~33 keys KTX consumes, plus operator's "wreg / latency / high-ping players" framing.

**Scope:** which client-side cvars flow to the server as userinfo, and how server-side mods consume them. Specifically the latency-tolerance pattern: client predeclares preferences (weapon priority via `cmd wreg`, etc.) so the server can act on the client's behalf, eliminating round-trip-time impact on weapon switches.

**L1 anchors:** ezQuake CVAR_USERINFO-flagged cvars (`name`, `team`, `topcolor`, `bottomcolor`, `rate`, `skin`, `gender`, `login`, `w_rank`, etc.) + KTX info_key consumption sites (visible in source via grep, not L1 rows under producer-only convention) + KTX `wreg` command + the client-side bind scripts that drive it.

**Why this matters:** high-ping players in QW have known workarounds; the wreg mechanism is specifically about that. Latency-tolerance is a foundational concept for QW competitive play that has minimal community-curated documentation.

---

## Candidate 5 -- Frogbots in KTX

**Surfaced during:** Pass 1.5 spike (2026-05-04) when investigating bot subcommand dispatch.

**Scope:** what frogbots are, how to enable them on a KTX server, the std vs editor command split, basic path-finding mechanics, the `botcmd` parent dispatch pattern.

**L1 anchors:** `botcmd` command in main cmds[]; std_commands table (39 entries with canonical names like `addbot:frogbot:std`); editor_commands table (25 entries with canonical names like `addmarker:frogbot:editor`); the FB_OPTION_EDITOR_MODE option that flips the dispatch.

**Why this matters:** frogbots are KTX's bundled AI infrastructure. Enabling them via `botcmd enable` and using editor mode for path engineering is barely documented. Server admins curious about enabling AI players have to read source.

---

## Candidate 6 -- KTX server-admin cvar reference (k_* index)

**Surfaced during:** Pass 1.1 + 1.5 discussions when locking the cvar extraction methodology.

**Scope:** the 192 source-registered `k_*` cvars exposed for server-admin configuration, organized by domain (match-flow, ruleset, ctf, clan_arena, race, bloodfest, bot, etc.). This is the operator's "worst case = description corpus" outcome made first-class.

**L1 anchors:** every `cvar_versions` row with project=ktx and name matching `k_*`. Each carries declared description (from RegisterCvarEx default + trailing comment), source_file, source_line.

**Why this matters:** this IS the description corpus discussed in Pass 1.2. A Layer 3 organization layer turns 192 flat rows into a navigable reference. Probably the single highest-leverage concept note for casual server admins.

**Note:** the Bucket-3 indexed families (`k_motd*`, `k_ml_*`) are documented in OUT_OF_SCOPE.md, not as Layer 1 rows. The concept note should still cover them since they're part of the admin-configuration surface.

---

## Candidate 7 -- KTX matchlog (extralog) format

**Surfaced during:** Discovery sweep Leg C (2026-05-04) when inspecting `resources/extralog/ktxlog_0.1.xsd`.

**Scope:** KTX's structured match-event log format -- the XSD-defined schema (7 event types: pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death). What each event type captures, when it fires, what tools consume it (qwhub stats, etc.).

**L1 anchors:** TBD per Pass 4-5 -- if the XSD becomes Layer 1 entities (likely as a new `match_event` type), they become anchors. If it stays as committed-doc reference, the concept note cites the XSD path directly.

**Why this matters:** match-stat consumers (qw-stats project, qwhub) read this format. Document the schema authoritatively in Layer 3 so contributors building stat tools have a reference.

---

## How to use this doc

1. After KTX Layer 1 ships and entities are queryable: walk this doc, pick highest-leverage candidate, author the concept note via `apps/qw-oracle/concept-notes/` following `concept-notes/README.md` template.
2. Each authored note removes its candidate entry from this doc.
3. Cross-link from `apps/qw-oracle/concept-notes/_gap-report.md` if the candidate also fills an ezquake.com docs gap.
4. Sequencing suggestion: candidate 6 first (highest leverage, mechanical extraction-driven), then 2 (game modes index, organizational), then 1/3/4/5 (community-knowledge synthesis).
