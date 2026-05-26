# KTX map-voting + match-break mechanism map

**Created**: 2026-05-26 (cross-batch pre-flight investigation, per `docs/superpowers/parking/2026-05-26-handoff-cross-batch-map-mechanism-preflight.md`)
**Anchor**: `v1.36-1633-g67253dc` (re-verified at investigation start)
**Trigger**: Finding 5 in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md` -- `cm`/`votemap` framing pending cross-batch verification at Voting batch ship.

## Purpose

Cross-batch reference for future ktx-l1-rewrite batches drafting cards in the map-voting + match-break mechanism. Captures source-verified semantics so future batches drafting the 5 not-yet-drafted partner entities (`votemap`, `mapslist_dl`, `k_lockmap`, `lockmap`, `break`, `forcebreak`) can use accurate framings without re-investigating.

Established at end-of-Voting-batch when the 4 cards shipped (`cm`, `k_no_vote_map`, `k_vp_map`, `next_map`) carrying an "alias by list index" framing inherited from the existing L1 description -- a framing that's an implementation-level leak (Action-level v2 discipline) and not what users invoke. Finding 5 in the Voting drafts file refines those 4 cards' framings using this doc's verified semantics.

## Entity inventory (10 entities, 3+ categories spanned)

| Entity | Type | Category | Status | Shape | Handler | Source |
|---|---|---|---|---|---|---|
| `cm` | command | Voting (SHIPPED 2026-05-26) | drafted | Shape 7b | `SelectMap` -> `DoSelectMap` | `commands.c:698`, `maps.c:477` |
| `k_no_vote_map` | cvar | Voting (SHIPPED 2026-05-26) | drafted | Shape 4 gate | (no handler -- gate-read only) | read at `maps.c:408`, `match.c:3021` |
| `k_vp_map` | cvar | Voting (SHIPPED 2026-05-26) | drafted | Shape 7b threshold | -- | read by `get_votes_req(OV_MAP, ...)` |
| `next_map` | command | Voting (SHIPPED 2026-05-26) | drafted | Shape 7b (CF_MATCHLESS_ONLY alias of `break`) | `PlayerBreak` | `commands.c:995`, `match.c:2970` |
| `votemap` | command | Match flow (PENDING) | NOT DRAFTED | Shape 7b | `VoteMap` -> `VoteMapSpecific` -> `DoSelectMap` | `commands.c:701`, `maps.c:503` |
| `mapslist_dl` | command | (unknown PENDING) | NOT DRAFTED | shape-less (connect-time download) | `mapslist_dl` | `commands.c:699`, `maps.c:244` |
| `k_lockmap` | cvar | (unknown PENDING) | NOT DRAFTED | Shape 1 + Shape 4 composition | (paired with `lockmap`; gates `DoSelectMap`) | `world.c:845` registration; read at `maps.c:434`, `world.c:112`; written at `admin.c:862,876` |
| `lockmap` | command | (likely Administration or future) | NOT DRAFTED | Shape 1 paired toggle | `ToggleMapLock` | `commands.c:756`, `admin.c:849` |
| `break` | command | Match flow (PENDING) | NOT DRAFTED | Shape 7b (with pre-match countdown-stop + mode-conditional facets) | `PlayerBreak` | `commands.c:709`, `match.c:2970` |
| `forcebreak` | command | (likely Administration or future) | NOT DRAFTED | shape-less (admin one-shot override) | `AdminForceBreak` | `commands.c:752`, `admin.c:708` |

## User-facing flow

### Map voting

Players see and use map-name commands:
- `/dm3` (or any `/<mapname>` from the server's `mapslist[]`) -- auto-aliased at connect time
- `/votemap dm3` -- explicit syntax (modern clients can type this directly)
- `/maps` -- print the available map list (handler `ShowMaps` at `maps.c:519`; prints "Vote for maps by typing the mapname")

Under the hood:
- Modern clients (CF_PARAMS-capable): auto-alias resolves to `cmd votemap <mapname>` (stuffed at `maps.c:296`, often batched via the `ktx_am4` / `ktx_am8` helper aliases from `StuffMaps` at `maps.c:337-353`).
- Legacy clients: auto-alias resolves to `cmd cm <index>` (stuffed at `maps.c:313`).
- Both paths feed `DoSelectMap(iMap)` at `maps.c:392`.

`DoSelectMap` is the canonical Shape 7b vote-cast body:
- cooldown check (`15s` matchless / `7s` non-matchless)
- matchless gate: refuses if `k_no_vote_map` set; refuses outside countdown phase (`match_in_progress != 2` exits silently)
- non-matchless gate: refuses if `match_in_progress`
- non-admin-spectator gate (`self->ct == ctSpec && !is_adm(self)`)
- `k_lockmap` gate: refuses non-admins with "MAP IS LOCKED!"
- self-revote no-op ("--- your vote is still good ---")
- sets per-player vote flag `self->v.map = iMap`; stores `k_lastvotedmap`
- broadcasts "suggests map" / "agrees on" / "would rather play on" based on tally state
- calls `vote_check_map()` at `vote.c:597` -> OV_MAP tally

OV_MAP tally uses `vote_get_maps()` at `vote.c:534` -- admin tie-break for equally-nominated maps (NOT admin veto; OV_MAP is absent from `is_admins_vote()` per Voting batch finding).

**Per-user effect**: typing `/dm3` casts (or withdraws) a vote to play dm3. Vote stays open until threshold (k_vp_map % of eligible voters).

### Match-end / next-map vote

`break` (CF_BOTH | CF_MATCHLESS) and `next_map` (CF_PLAYER | CF_MATCHLESS_ONLY) share the `PlayerBreak` handler at `match.c:2970`. The CF_* flag does the gating:
- `break` is always available (CF_BOTH | CF_MATCHLESS = players + specs + matchless).
- `next_map` is CF_MATCHLESS_ONLY = available only between matches.

Inside the shared handler:
- Race mode (non-match): redirects to `r_changestatus(2)` (race break) -- NOT a vote-cast.
- Spectator path: refuses unless `k_auto_xonx` is set + non-matchless; otherwise clears `self->ready` ("lost desire to play").
- Pre-match: clears `self->ready`, broadcasts "is not ready".
- Countdown phase (`match_in_progress == 1`): stops countdown via `StopTimer(1)`; anyone who is ready can stop it.
- Live match (`match_in_progress == 2`): Shape 7b vote-toggle on `self->v.brk`.
  - On set: broadcasts `k_matchLess ? "votes for next map" : "votes for stopping the match"`
  - On withdraw (already set): broadcasts "withdraws his vote"
  - Calls `vote_check_break()` -> OV_BREAK tally.

OV_BREAK has NO admin veto in `is_admins_vote()`. Admin override is the SEPARATE `forcebreak` command (intentional architectural split per Voting batch finding).

**Per-user effect**: in a live match, typing `/break` casts (or withdraws) a vote to end the match early. In matchless mode, typing `/next_map` casts (or withdraws) a vote to advance to the picked map.

### Admin one-shot paths (no vote channel)

- `/forcebreak` (CF_BOTH_ADMIN, handler `AdminForceBreak` at `admin.c:708`):
  - Non-player admin + pre-match: clears `k_force`, sets `serverinfo status Standby`.
  - Non-player admin + countdown: clears `k_force` + `StopTimer(1)`.
  - Live match: restores `sv_maxspeed` from `k_oldmaxspeed` if set, broadcasts "<player> forces a break!", calls `EndMatch(0)`.
- `/forcemap <mapname>` (CF_BOTH_ADMIN | CF_PARAMS, handler `AdminForceMap` at `admin.c:742`): immediate `changelevel(map)` without vote. Refuses during non-matchless live match with "Match currently in progress. Use break or forcebreak to terminate."
- `/lockmap` (CF_BOTH_ADMIN, handler `ToggleMapLock` at `admin.c:849`): Shape 1 paired toggle for `k_lockmap`. Flips 0<->1, broadcasts "<player> locks map" (pre-match) or private "Map locked" (mid-match).

## Internal alias-targets (CF_NOALIAS -- not directly user-invokable)

| Entity | Purpose | How it's invoked |
|---|---|---|
| `cm <index>` | Legacy-client vote-cast by list index. Same Shape 7b vote channel as `votemap`; both feed `DoSelectMap`. | Stuffed alias `<mapname> cmd cm <index>` from `mapslist_dl` (legacy branch, `maps.c:313`). Triggered when a CF_PARAMS-incapable client types `/dm3`. |
| `mapslist_dl <from>` | Connect-time paginated stuffing of map-name aliases. Self-recursive across frames. | Triggered by `StuffMaps(p)` at `maps.c:337` on player connect (or via `StuffMaps` re-call after map change). Self-recurses via stuffed `cmd mapslist_dl <next>` to paginate. |
| `cmdslist_dl <from>` | Sibling of `mapslist_dl` for the commands list (`commands.c:700`). Not investigated in this pre-flight -- tangential to map-voting. | Same dispatch model. |

## Cross-batch gating cvars (already drafted in Voting batch)

| Cvar | Role | Read site | Status |
|---|---|---|---|
| `k_no_vote_map` | Matchless-mode gate. Refuses `DoSelectMap` (`maps.c:408`) AND `PlayerBreak` (`match.c:3021`) when set + matchless. Multi-consumer gate. | `maps.c:408`, `match.c:3021` | drafted (Voting batch) |
| `k_vp_map` | Vote threshold percentage for OV_MAP tally (governs `votemap` + `cm`; does NOT govern `next_map` -- next_map uses OV_BREAK). | read in `get_votes_req(OV_MAP, ...)` | drafted (Voting batch) |
| `k_vp_break` | Vote threshold percentage for OV_BREAK tally (governs `break` AND `next_map`). | read in `get_votes_req(OV_BREAK, ...)` | drafted (Voting batch) |

## Auto-alias mechanism (`maps.c`)

`StuffMaps(p)` at `maps.c:337` is the connect-time bootstrap:
- For CF_PARAMS-capable clients (modern, e.g. ezQuake recent builds): stuffs `alias ktx_am4 "..."` and `alias ktx_am8 "..."` -- batch-alias-makers that build 4 or 8 `tempalias <name> cmd votemap <name>` aliases at once.
- Then stuffs `cmd mapslist_dl 0` -- kickoff for the alias-stuffing loop.

The `mapslist_dl` handler then paginates through `mapslist[]`:
- Modern clients: per 8-batch uses `ktx_am8`; per 4-batch uses `ktx_am4`; remainder uses single `alias <mapname> "cmd votemap <mapname>"` (line 296).
- Legacy clients: one alias at a time, `alias <mapname> cmd cm <index>` (line 313).
- Self-recursive: stuffs `cmd mapslist_dl <next>` to continue beyond per-frame budget.
- Skipped if userinfo `nomaps > 0` (opt-out) or `STUFF_MAPS` flag already set.

**Outcome**: every map in `mapslist[]` becomes a typeable `/<mapname>` alias. The user types `/dm3`; their client expands to `cmd votemap dm3` (modern) or `cmd cm 3` (legacy). Both feed `DoSelectMap` -> OV_MAP.

## Per-entity verified semantics (5 PENDING entities to draft in future batches)

### `votemap`
- **Registration**: `commands.c:701`, `{ "votemap", VoteMap, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_VOTEMAP }`.
- **Handler**: `VoteMap` at `maps.c:503` -- thin wrapper: parses arg as mapname, calls `VoteMapSpecific` at `maps.c:486` -> looks up index via `GetMapNum` -> calls `DoSelectMap(map_num)`.
- **Shape**: **Shape 7b vote-cast** (continuous toggle vote, no time-box). Pairs with `k_vp_map` (threshold cvar). Per-player vote flag `self->v.map`. OV_MAP channel.
- **Foundational finding**: votemap IS a vote-cast like cm. The existing L1 description "switch to a named map IMMEDIATELY" is **WRONG** -- a source-vs-description framing contradiction. Apply-pass-author MUST flag this on draft (drafted_with_flag); the entire entity framing in the existing description is the error class, not a localized value.
- **Permission**: CF_BOTH = "any player or admin spectator" surface; non-admin-spectator gate at `maps.c:424` matches cm's permission framing.
- **Match-state**: matchless mode "during countdown phase"; non-matchless "pre-match only".
- **Prerequisites** (from `DoSelectMap`):
  - Matchless gate: `k_no_vote_map` must be 0
  - Lock gate: `k_lockmap` must be 0 (or invoker must be admin)
  - Cooldown: 15s matchless / 7s non-matchless since last vote
- **See-also**: `cm` (internal peer; same `DoSelectMap`), `mapslist_dl` (stuffs the auto-aliases), `maps` (lists available), `k_vp_map` (threshold), `k_no_vote_map`, `k_lockmap`, `next_map` (related matchless map-advance via OV_BREAK).

### `mapslist_dl`
- **Registration**: `commands.c:699`, `{ "mapslist_dl", mapslist_dl, 0, CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS | CF_CONNECTION_FLOOD, CD_MAPSLIST_DL }`.
- **Handler**: `mapslist_dl` at `maps.c:244`.
- **Shape**: **shape-less** -- internal command-side mechanism for the connect-time map-alias download. No paired cvar, no inter-entity vote relationship; the only sibling is `cmdslist_dl`.
- **Mechanism**: paginated stuffing of map-name aliases at connect time. Branches on `isSupport_Params(self)`:
  - Modern clients: stuffs `alias <mapname> "cmd votemap <mapname>"` (line 296) -- batched 4-8 via `ktx_am4` / `ktx_am8`
  - Legacy clients: stuffs `alias <mapname> cmd cm <index>` (line 313) -- one at a time
- **Permission**: CF_BOTH | CF_NOALIAS -- internal command, reachable only as `cmd mapslist_dl <N>` (server-stuffed at connect + self-recursive continuation). Direct console invocation blocked.
- **Match-state**: any time (fires whenever `StuffMaps` is called; typically on connect or post-map-change re-init).
- **Prerequisites**: userinfo `nomaps == 0` (opt-out at non-zero; default opt-in); `STUFF_MAPS` flag not already set on self.
- **See-also**: `votemap` (modern auto-alias target), `cm` (legacy auto-alias target), `cmdslist_dl` (sibling); StuffMaps mechanism head is internal, not an L1 entity.

### `k_lockmap`
- **Registration**: `world.c:845`, `RegisterCvar("k_lockmap")`.
- **Shape**: **Shape 1 + Shape 4 composition** -- paired toggle command (`lockmap`) flips 0<->1 (Shape 1); the cvar gates `DoSelectMap` against non-admins at `maps.c:434` (Shape 4).
- **Default**: 0 (RegisterCvar default).
- **Effect (Shape 4 primary)**: when set, refuses non-admin map-vote attempts with "MAP IS LOCKED!" -- gates ALL map-vote routes (votemap, cm, auto-aliased map-name shortcuts).
- **Effect (subsidiary)**: at `world.c:112` (`CheckDefMap`), `k_lockmap` suppresses the empty-server auto-reload-to-default-map mechanism (revert to `k_defmap` is skipped if lockmap is set). Worth a Notes mention; not the primary framing.
- **Write sites**: `admin.c:862, 876` via `cvar_fset` from `ToggleMapLock` (the `lockmap` command).
- **Permission**: server config or via `lockmap` admin command in-game.
- **Match-state**: any time (no `match_in_progress` early-return in ToggleMapLock).
- **See-also**: `lockmap` (paired toggle), `votemap` (gated), `cm` (gated). Auto-aliased map shortcuts gate through the same `DoSelectMap` path.

### `lockmap`
- **Registration**: `commands.c:756`, `{ "lockmap", ToggleMapLock, 0, CF_BOTH_ADMIN, CD_LOCKMAP }`.
- **Handler**: `ToggleMapLock` at `admin.c:849`.
- **Shape**: **Shape 1** -- paired toggle command for `k_lockmap`. No mode-precondition (not Shape 1c).
- **Permission**: CF_BOTH_ADMIN = admin only (players + spectators).
- **Match-state**: any time. Broadcast wording differs by phase (`G_bprint` pre-match vs `G_sprint` mid-match).
- **Effect**: flips `k_lockmap` 0<->1. Broadcasts "<player> locks map" / "<player> unlocks map" pre-match; private "Map locked" / "Map unlocked" mid-match.
- **See-also**: `k_lockmap` (paired cvar).

### `break`
- **Registration**: `commands.c:709`, `{ "break", PlayerBreak, 0, CF_BOTH | CF_MATCHLESS, CD_BREAK }`.
- **Handler**: `PlayerBreak` at `match.c:2970` (shared with `next_map`).
- **Shape**: **Shape 7b vote-cast** (continuous toggle, OV_BREAK channel, pairs with `k_vp_break` threshold). Per-player vote flag `self->v.brk`.
- **Mode-conditional facets** (the handler is heavily branched):
  - Race mode (non-match-mode): redirects to `r_changestatus(2)` (race break) -- NOT a vote-cast.
  - Spectator path: refuses unless `k_auto_xonx` + non-matchless; otherwise clears `self->ready` ("lost desire to play").
  - Pre-match (`!match_in_progress` after early gates): clears `self->ready`, broadcasts "is not ready".
  - Countdown phase (`match_in_progress == 1`): stops countdown via `StopTimer(1)`; not a vote, just an immediate stop (any ready player can do this).
  - Live match (`match_in_progress == 2`): Shape 7b vote-toggle on `self->v.brk`; broadcasts "votes for stopping the match" (or "votes for next map" if matchless); calls `vote_check_break()` -> OV_BREAK tally.
- **Permission**: CF_BOTH = "any player or spectator" surface; handler-internal spectator gate (`k_auto_xonx` + non-matchless required for specs).
- **Match-state**: any time (handler branches by `match_in_progress`).
- **See-also**: `next_map` (matchless-only sibling, same handler + channel), `forcebreak` (admin one-shot override), `k_vp_break` (vote threshold).

### `forcebreak`
- **Registration**: `commands.c:752`, `{ "forcebreak", AdminForceBreak, 0, CF_BOTH_ADMIN, CD_FORCEBREAK }`.
- **Handler**: `AdminForceBreak` at `admin.c:708`.
- **Shape**: **shape-less** -- admin one-shot end-match command. NOT a vote-cast (does not toggle self->v.brk, does not feed OV_BREAK). Architecturally the override path that's intentionally separate from `break`'s vote channel (since OV_BREAK has no `is_admins_vote()` arm).
- **Permission**: CF_BOTH_ADMIN = admin only.
- **Match-state**: any time (handler branches by `match_in_progress` + player/spec class).
- **Mechanism**:
  - Non-player admin + pre-match: clears `k_force`, sets `serverinfo status Standby` (no broadcast).
  - Non-admin OR no match in progress: silent no-op.
  - Non-player admin + countdown (`match_in_progress == 1`): clears `k_force` + `StopTimer(1)`.
  - Live match: restores `sv_maxspeed` from `k_oldmaxspeed` if set, broadcasts "<player> forces a break!", calls `EndMatch(0)`.
- **See-also**: `break` (vote-cast peer), `forcemap` (sibling admin one-shot for map change), `forcestart` (sibling admin one-shot for match start).

## See-also matrix (bidirectional cross-links for future drafts)

| Entity | Should See-also | Why |
|---|---|---|
| `cm` | `votemap` (user-facing peer; shared `DoSelectMap`), `mapslist_dl` (stuffs auto-aliases), `k_vp_map`, `k_no_vote_map`, `k_lockmap` | shared mechanism + gating |
| `votemap` | `cm` (internal peer), `mapslist_dl` (stuffs auto-aliases), `maps` (lists available), `k_vp_map`, `k_no_vote_map`, `k_lockmap`, `next_map` (matchless map-advance) | primary user-facing card; comprehensive cross-links |
| `mapslist_dl` | `votemap`, `cm`, `cmdslist_dl` (sibling) | mechanism-anchored |
| `k_lockmap` | `lockmap` (paired toggle), `votemap`, `cm` | Shape 1 pair + Shape 4 gate |
| `lockmap` | `k_lockmap` (paired cvar) | Shape 1 pair |
| `next_map` | `break` (live-match sibling; same handler + channel), `forcebreak` (admin override), `k_vp_break`, `k_no_vote_map` | shared handler/channel + gating |
| `break` | `next_map` (matchless-only sibling), `forcebreak` (admin override), `k_vp_break` | mechanism family |
| `forcebreak` | `break` (vote-cast peer), `forcemap` (sibling admin one-shot), `forcestart` (sibling admin one-shot) | admin command family |
| `k_no_vote_map` | `votemap`, `cm`, `next_map`, `break` (gated in matchless), `k_vp_map` | Shape 4 gate with multi-consumer |
| `k_vp_map` | `votemap` (primary user-facing pair), `cm` (internal pair), `k_no_vote_map`. Cross-link `next_map` only as name-related; the channel is OV_BREAK, not OV_MAP. | k_vp_* threshold + channel distinction |

**Critical caveat**: `next_map` does NOT share the OV_MAP threshold. It uses OV_BREAK. The Voting-batch's `k_vp_map` draft cross-links to `next_map` per existing description; the channel-share is OV_BREAK. Apply-pass should clarify this distinction on the `k_vp_map` card (cross-link is name-relational, not threshold-shared).

## Action-level vs implementation-level discipline (per v2 universal shape)

For the Voting-batch cards (`cm` + `k_no_vote_map` + `k_vp_map` + `next_map`) and the 5 pending entities:

- **Action-level (correct framing)**: The user types a map name (or `/votemap <name>`, or `/next_map`, or `/break`, or admin `/forcebreak` / `/lockmap` / `/forcemap <name>`). They don't track:
  - Which alias route (`votemap` vs `cm`) is active for their client
  - Whether their client has CF_PARAMS support
  - What the index of a given mapname is in `mapslist[]`
  - That `cm` is separately registered as a command
- **Implementation-level (must NOT leak into L1)**:
  - "Cast vote by list index" (cm's existing description) -- the index is implementation, not user action.
  - "Switch to a named map IMMEDIATELY" (votemap's existing description) -- the immediate-switch framing is WRONG; mechanism is vote-cast.
  - "Internal alias-target" technical jargon -- recast under user-facing framing; reserve a brief Permission-line note for cm + mapslist_dl ("internal command; reachable only as `cmd <name>` from stuffed aliases").

## Open questions deferred to future batches

- `cmdslist_dl` (`commands.c:700`) -- sibling of `mapslist_dl` for the commands list. To draft alongside `mapslist_dl`, likely as a parallel shape-less internal mechanism.
- `maps` (handler `ShowMaps` at `maps.c:519`) -- user-facing map-list state-printer. To draft as shape-less state-printer.
- `forcemap`, `forcestart` -- admin one-shot family; siblings of `forcebreak`. Likely Match flow or Administration batch.
- Which batch will host `lockmap` (and consequently `k_lockmap`'s draft)? -- not yet assigned.

## When to use this doc

Future ktx-l1-rewrite batches drafting any of the 10 entities listed above MUST consult this doc for:
- Verified shape classification (avoid the "votemap is immediate-switch" mistake the existing description carries).
- Bidirectional See-also matrix (so cross-links land in both directions on the same ship).
- User-flow vs implementation-level distinctions (Action-level v2 discipline).
- Per-entity flagged-correction guidance (so `drafted_with_flag` verdicts surface the right factual corrections to the apply-pass author).

This doc remains the source-truth reference until superseded by per-batch drafts files for these 5 pending entities. After all 5 are drafted, this doc can either be archived (linked from the post-draft handoff) or retained as a permanent mechanism-map reference.
