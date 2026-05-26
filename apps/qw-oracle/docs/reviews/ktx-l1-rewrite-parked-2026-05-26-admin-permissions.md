# ktx-l1-rewrite parked entities -- batch 2026-05-26 (Admin & permissions)

Entities the skill could not confidently recast under the current shape catalog.
Each entry names the park trigger and the source signature observed. Operator
review at batch ship time accepted these parks (kick-walkthrough session-response
pattern is novel; 1-of-1 evidence does not earn a new catalog shape per the
earn-their-keep discipline).

Apply-pass-author may hand-author v2 cards for these entities using Layer A
(universal shape) only, with `shape-less` in the Layer B slot, when the apply
pass runs.

Anchor: v1.36-1633-g67253dc

---
## n (KTX command, Admin & permissions -- PARKED)

- **Source**: src/commands.c:797
- **Anchor**: v1.36-1633-g67253dc
- **Park trigger**: 1 -- no-shape-match (relational)

### What the skill saw

- Registration: `{ "n", DontKick, 0, CF_BOTH_ADMIN, CD_N }` at commands.c:797. CD_N = "don't kick".
- Handler `DontKick` at admin.c:286: gates on `self->k_kicking != 0`; if gate passes, calls `NextClient()` (skips current prompt, advances to next client without kicking).
- Same kick-walkthrough session mechanism as `y` -- same inter-entity relationships, same parent-session-state dependency.
- Same no-shape-match analysis as `y`: the session-response-command pattern is not in the catalog.

### Suggested manual investigation

- Same as `y` -- verify whether the kick-session pattern (parent-command-initiated per-entity-state + response commands) appears elsewhere. If yes, crystallize a new shape covering both `y`/`kick`/`n` and any analogous trio.
- Existing description for `n` is factually correct. Hand-recast under v2 Layer A (shape-less) is feasible.
- Dispatcher brief error: same correction applies -- `n` is a kick-walkthrough command, not a vote-response command.
---
## y (KTX command, Admin & permissions -- PARKED)

- **Source**: src/commands.c:796
- **Anchor**: v1.36-1633-g67253dc
- **Park trigger**: 1 -- no-shape-match (relational)

### What the skill saw

- Registration: `{ "y", YesKick, 0, CF_BOTH_ADMIN, CD_Y }` at commands.c:796. CD_Y = "yes kick".
- Handler `YesKick` at admin.c:264: gates on `self->k_kicking != 0` (admin must be in an active kick-walkthrough session); if gate passes, calls `DoKick(self->k_playertokick, self)` then advances to next client via `NextClient()`.
- Kick-mode session initiated by `kick` (no-arg) command at commands.c:794: sets `self->k_kicking = g_globalvars.time` + prompts first client. Auto-expires after 60 seconds (KickThink in admin.c:28).
- `n` (DontKick, admin.c:286) is the paired skip-and-advance command.
- The dispatcher brief classified `y`/`n` as Shape 7a vote responses. This is INCORRECT. The vote-response commands are `yes` and `no` at commands.c:801-802 (handlers VoteYes/VoteNo, CF_PLAYER | CF_MATCHLESS). `y`/`n` are entirely separate kick-walkthrough commands.
- `y` has inter-entity relationships: it only works within a `kick`-mode session (dependent on `kick` no-arg); it pairs with `n` (the skip counterpart); both are admin-only.
- No cataloged shape covers "session-response commands gated by parent-command-initiated per-entity state": Shape 6 is userinfo-key stateful pairs; Shape 8 is dispatch-table subcommands; Shape 1/7/11 are all cvar or vote patterns. The kick-session-response pattern is not in the catalog.

### Suggested manual investigation

- The `y`/`n` pair could earn a new shape ("session-response commands") if `kick` no-arg + `y`/`n` is confirmed as a recurring pattern elsewhere in KTX or in MVDSV. Check MVDSV for similar interactive-session command sets before crystallizing.
- The existing description for `y` is factually correct; a hand-recast under v2 universal shape (Layer A only, shape-less Layer B) is feasible. Operator can apply manually if no blocking concern.
- Dispatcher brief erroneously listed these as Shape 7a. Correct the source-routing table: `y`/`n` are kick-walkthrough commands; `yes`/`no` are vote-response commands.
