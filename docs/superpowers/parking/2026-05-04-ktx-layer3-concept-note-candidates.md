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

## Candidate 2 -- KTX game modes index

**Surfaced during:** Pass 1.6 conversation (2026-05-04) when operator noted "KTX absorbed many older mods" and listed CTF, arena, wipeout, race, bloodfest, hoonymode, botmode.

**Scope:** an overview of every game mode KTX supports (~12+), with: how to enable, what the mode does, what cvars / commands are mode-specific, what makes it different from standard match play.

**L1 anchors (will exist post-arc):** UserModes_t enum (15 values), lsType_t enum (9 values), bloodfest_monster_t array (13 monster types), wipeout_spawn_config[], race_score_system_t scoring_systems[], plus mode-specific cvars (k_ctf_*, k_clan_arena_*, etc.) and commands (`race`, `1on1`, `4on4`, `ctf`, etc.).

**Modes inventoried by discovery sweep (Leg A + Leg B):**
- 1on1 / 2on2 / 3on3 / 4on4 / 10on10 (basic team sizes)
- FFA (deathmatch)
- CTF (capture the flag)
- HoonyMode (variant)
- Blitz2v2 / Blitz4v4 (blitz variant)
- 2on2on2 / 3on3on3 / 4on4on4 (three-team variants)
- XonX (generic)
- Clan Arena (lsCA)
- Rocket Arena (lsRA)
- Race
- Wipeout (lsWO)
- Bloodfest (sp_monsters.c)
- Bot mode (frogbot infrastructure)

**Why this matters:** server admins setting up new KTX servers have no central reference for "what modes exist + how do I configure them." Source has the truth but is scattered across `arena.c`, `clan_arena.c`, `race.c`, `sp_monsters.c`, `bot_*.c`, `match.c`, etc.

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
