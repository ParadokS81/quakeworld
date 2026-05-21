# B4 ledger -- screening-affirmed rows (Session #9 hand-authored, locked L1 template)

**Batch id:** screening-affirmed-rows (11 rows sharpened from V-pass-affirmed source-inline C-comments)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Batch members:** 11 rows (the community-convention-leveraged subset of the 38 V-pass-affirmed cohort)
**Origin:** Session #9 orchestrator, inline hand-authored with operator collaboration. These are V-pass-clean rows where operator domain knowledge sharpened the bare C-comment into a richer user-facing description per the newly-locked L1 template.

## Methodology shift captured here

**The L1 description template** (locked 2026-05-21 Session #9):

```
<1-line what-it-does>

<value> = <meaning>
<value> = <meaning>

Default: <X>.  [or "Default: X. Recommended: Y." -- only when convention differs from default]
Set by: <method>.  [server config only / admin command 'foo' / any-player 'bar' / vote / etc.]
See also: <concept-note slug>.  [optional, only when cross-codebase context exists]
```

**Architectural decisions made in this session:**

- **L1 `description` is codebase-scoped user-facing prose**, ezquake.com / help_commands.json style: condensed, value-enumeration, brief Default + Set-by. The user wants to know what the setting does in their game, not which line of code it came from. Engine and code-trace jargon ("think handler", "cf_flags", "stuffcmd", "fpd bit 64", file:line refs in prose) does NOT belong here.
- **L1 `description_reasoning` is the audit trail**: source-anchored per-clause cites, file:line refs, code-trace evidence. Proves we didn't make up the description; surfaces to LLM on deep-detail queries; remains in DB as L1 data.
- **L3 concept notes carry cross-codebase synthesis**: when behaviour spans multiple codebases (KTX + MVDSV + ezQuake + fteqtv), the L1 description points there via `See also:` rather than inlining the synthesis.
- **MCP surfacing default**: lookup_entity returns description (short user-doc) by default; reasoning surfaces on deep-detail queries; concept-note pointers from `See also:` enable LLM follow-up to `search_concepts` / `get_concept_note`.

**Cohort implication (queued as separate arc):** all 96 just-landed V-pass-flagged rows + the ~543 V-pass-clean longer rows need rewriting to this template. Tracked as Task #1: "Format-unify all KTX cvar+command descriptions to template". Calibrate with the 96-cohort batch first; scale to the V-pass-clean rows after.

## Members

```
ktx:cvar:dp                   (drop backpacks)             -- competitive convention sharpened
ktx:cvar:dq                   (drop quad)                  -- competitive convention sharpened
ktx:cvar:dr                   (drop ring)                  -- competitive convention sharpened
ktx:cvar:k_prewar             (prewar fire/jump policy)    -- value-2 nudge clarified
ktx:cvar:k_spectalk           (spec-to-player chat policy) -- prewar/post-match unmute clarified
ktx:cvar:k_sayteam_to_spec    (spec eavesdrop on teamtalk) -- 4-mode policy + L3 pointer
ktx:cvar:k_dmm4_gren_mode     (precision grenade sub-mode) -- gameplay effect clarified
ktx:cvar:k_demo_mintime       (min duration for demo keep) -- range + fallback clarified
ktx:cvar:k_exclusive          (lock player count)          -- k_attendees gate clarified
ktx:cvar:k_admins             (master admin toggle)        -- gate behaviour clarified
ktx:cvar:k_allowvoteadmin     (admin election toggle)      -- independence from k_admins
```

## C4 (non-negotiable)

- Read-only on the L1 database during ledger authoring. Apply step (via `apps/qw-oracle/scripts/describe-fill/apply-l1-from-ledgers.py`) is separate + operator-gated.
- No file writes outside this LEDGER.
- ELABORATION DISCIPLINE: every authored clause must enforce-trace to source (audited inline by orchestrator + operator).

---

B4-RESULT | ktx:cvar:dp | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "drop backpacks (0 = off, 1 = on)" lacked community-convention context | new: full template with competitive convention (1 in dmm1/3/4) + paired droppack command

### ktx:cvar:dp

- canonical_id: `ktx:cvar:dp`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per operator domain knowledge (competitive convention dmm1/3/4 = 1; paired `droppack` command; live-match gate at `items.c:2681`).

- OLD description:
  > drop backpacks (0 = off, 1 = on)

- NEW description:
  > Toggle for whether dying players drop a backpack containing their ammo and current weapon during a live match.
  >
  > 0 = no backpack drop.
  > 1 = backpack drops on death.
  >
  > Default: 1 (standard in competitive play -- dmm1, dmm3, dmm4 -- where backpack-from-corpse is a core mechanic; may be 0 on clan-arena / wipeout).
  > Set by: server config or 'droppack' command in-game.

- NEW source_ref: `src/items.c:2681` (live-match drop gate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:dq | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "drop quad (0 = off, 1 = on)" lacked community-convention + powerup-mode gate context | new: full template with competitive convention (0 in team play; FFA may be 1)

### ktx:cvar:dq

- canonical_id: `ktx:cvar:dq`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per operator domain knowledge (drop-on-death of powerups uncommon in competitive team play; standalone `k_killquad` is a separate force-drop path).

- OLD description:
  > drop quad (0 = off, 1 = on)

- NEW description:
  > Toggle for whether dying players drop their active quad during a live match.
  >
  > 0 = no quad drop on death.
  > 1 = quad drops on death with its remaining duration preserved.
  >
  > Default: 0 (standard in competitive team play; may be 1 on FFA servers).
  > Set by: server config or 'dropquad' command in-game.

- NEW source_ref: `src/items.c:1974` (DropPowerups IT_QUAD branch)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:dr | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "drop ring (0 = off, 1 = on)" lacked community-convention context | new: full template, same shape as dq

### ktx:cvar:dr

- canonical_id: `ktx:cvar:dr`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per operator domain knowledge (same community context as dq -- 0 in competitive team play; FFA may be 1).

- OLD description:
  > drop ring (0 = off, 1 = on)

- NEW description:
  > Toggle for whether dying players drop their active ring of shadows during a live match.
  >
  > 0 = no ring drop on death.
  > 1 = ring drops on death with its remaining duration preserved.
  >
  > Default: 0 (standard in competitive team play; may be 1 on FFA servers).
  > Set by: server config or 'dropring' command in-game.

- NEW source_ref: `src/items.c:1989` (DropPowerups IT_INVISIBILITY branch)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_prewar | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment had 3-mode description but missed the per-player `self->ready` gate semantics + the value-2 admin nudge rationale | new: full template; the value-2 rationale moves to (future) match-flow concept note rather than L1

### ktx:cvar:k_prewar

- canonical_id: `ktx:cvar:k_prewar`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per operator + source -- value 2 was added as an admin nudge to shorten lobby time by making prewar less fun, encouraging players to type ready faster. That rationale belongs in a future "QW match flow" concept note rather than L1.

- OLD description:
  > prewar setting (0 = prewar fire is disallowed, 1 = prewar fire is allowed, 2 = no fire or jump until ready)

- NEW description:
  > Server policy for fire and jump permissions during the prewar (warm-up) phase before the match goes live.
  >
  > 0 = no fire or jump in prewar.
  > 1 = fire and jump allowed in prewar.
  > 2 = fire and jump require typing 'ready' first (per-player gate).
  >
  > Default: 1. Once the match is live the gate is bypassed regardless of value.
  > Set by: server config or 'prewar' admin command (cycles 0 -> 1 -> 2 -> 0).

- NEW source_ref: `src/weapons.c:2801` (the can_prewar gate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_spectalk | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment was accurate at the cvar level but missed the EndMatch -> sv_spectalk=1 unconditional reset, which is what creates the "specs unmuted in prewar / post-match" practical behaviour | new: full template captures the prewar/post-match unmute as an in-game-visible behaviour without engine jargon

### ktx:cvar:k_spectalk

- canonical_id: `ktx:cvar:k_spectalk`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per operator + source -- the operator's "specs can talk in prewar but muted during match" observation is structurally correct: EndMatch (`match.c:316`) unconditionally resets sv_spectalk=1 at every match end, then match-start (`match.c:1304`) re-applies k_spectalk. So k_spectalk=0 means "muted during live match only" in practice. The fpd bit + sv_spectalk + MVDSV engine routing details go to description_reasoning and the QW team-chat visibility concept note.

- OLD description:
  > spectators can talk to players during game (0 = no, 1 = yes)

- NEW description:
  > Server-wide policy for whether spectators may publicly chat to players during a live match.
  >
  > 0 = specs are muted to players during the live match (they can still chat in prewar / post-match).
  > 1 = specs can chat to players at all times.
  >
  > Default: 0.
  > Set by: server config or 'spectalk' admin command in-game (match-gated for non-admins).
  > See also: QW team-chat visibility concept note.

- NEW source_ref: `src/match.c:1303` (k_spectalk apply at match start) and `src/match.c:316` (EndMatch unconditional reset)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator + cross-codebase MVDSV/fteqtv verification)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_sayteam_to_spec | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment was accurate on the 4 modes but missed the cross-codebase nuance (teambinds vs mm2, $\\ marker, cl_fakename injection, QTV transitivity) | new: tight L1 + concept-note pointer; cross-codebase synthesis to L3

### ktx:cvar:k_sayteam_to_spec

- canonical_id: `ktx:cvar:k_sayteam_to_spec`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined per cross-codebase verification (KTX FixSayTeamToSpecs + MVDSV sv_user.c spec-filter + MVD dem_multiple bitmask + fteqtv relay). The detailed teambind-vs-mm2 + `$\\` marker + cl_fakename + QTV semantics all go to the L3 concept note; L1 stays codebase-scoped.

- OLD description:
  > send say_team to specs (0 = never, 1 = only during game, 2 = only during prewar, 3 = always)

- NEW description:
  > KTX policy controlling the engine cvar 'sv_sayteam_to_spec' based on match state.
  >
  > 0 = specs never see player teambind broadcasts.
  > 1 = specs see teambinds only during a live match.
  > 2 = specs see teambinds only during prewar (inverse of 1).
  > 3 = specs always see teambinds.
  >
  > Default: 0. Recommended: 1 (typical server config).
  > Set by: server config.
  > See also: QW team-chat visibility concept note.

- NEW source_ref: `src/world.c:1442` (FixSayTeamToSpecs)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator + cross-codebase MVDSV/ezQuake/fteqtv verification)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_dmm4_gren_mode | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "0 = default, 1 = only on direct impact" was correct but cryptic and missed the GL-spawn + mutual-exclusion with k_midair/k_instagib | new: full template with in-game effect described in plain QW terms

### ktx:cvar:k_dmm4_gren_mode

- canonical_id: `ktx:cvar:k_dmm4_gren_mode`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per source verification. Initial draft leaked "explosion-on-think handler is replaced with silent removal" jargon -- corrected to plain-QW "grenades that miss silently disappear instead of exploding". Calibration moment for template QA discipline: watch for engine/code jargon in description prose.

- OLD description:
  > grenade explosions (0 = default, 1 = only on direct impact)

- NEW description:
  > Toggle for "grenade mode" in deathmatch 4 -- a sub-mode emphasising precision grenade-launcher play.
  >
  > 0 = standard dmm4 (RL spawn weapon, grenades explode normally with radius damage when the fuse expires).
  > 1 = grenade mode (GL spawn weapon, only direct grenade hits deal damage -- grenades that miss silently disappear instead of exploding).
  >
  > Default: 0. Mutually exclusive with k_midair and k_instagib (enabling either force-clears this).
  > Set by: server config or 'gren_mode' admin command in-game.

- NEW source_ref: `src/weapons.c:1433` (the grenade-explosion suppression gate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9, default-draft accepted by operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_demo_mintime | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "if the game is breaked, save demo if this many seconds has passed" used unfamiliar "breaked" slang and didn't state the range + hardcoded fallback | new: full template clarifies range, fallback, and gameplay framing

### ktx:cvar:k_demo_mintime

- canonical_id: `ktx:cvar:k_demo_mintime`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per source -- bounded 0-3600, value 0 falls back to hardcoded 120 at the use-site. Demo discard happens at match end for any cause of short match (/break, disconnect, abort).

- OLD description:
  > if the game is breaked, save demo if this many seconds has passed

- NEW description:
  > Minimum match duration (in seconds) below which the server discards the recorded demo. Prevents short or aborted matches (ended via /break, early disconnect, or admin abort) from accumulating useless demo files on the server.
  >
  > Range: 0-3600 (clamped). Value 0 falls back to a hardcoded 120 seconds at the use-site.
  >
  > Default: 0 (effective 120 seconds).
  > Set by: server config only.

- NEW source_ref: `src/match.c:2484` (the bounded read + fallback)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_exclusive | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "number of players gets locked on game start" misframed the trigger (it's k_attendees threshold, not game-start) | new: full template with corrected trigger framing + the "reconnect as spectator" UX

### ktx:cvar:k_exclusive

- canonical_id: `ktx:cvar:k_exclusive`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per source -- the lock fires when CountPlayers() >= k_attendees, not "on game start" per se. The UX is "Sorry, server is full / Please reconnect as spectator".

- OLD description:
  > number of players gets locked on game start (0 = no, 1 = yes)

- NEW description:
  > Toggle for exclusive mode -- when enabled, the server stops accepting new player joins once the expected match player count (k_attendees) is reached. Players attempting to join after the lock are told "Sorry, server is full / Please reconnect as spectator".
  >
  > 0 = anyone can join (subject to maxclients).
  > 1 = new player joins are rejected once player count reaches k_attendees (spectator joins still allowed).
  >
  > Default: 0.
  > Set by: server config or 'exclusive' admin command in-game.

- NEW source_ref: `src/client.c:1455` (the join-rejection gate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_admins | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "allow admins on server (0 = no, 1 = yes)" was accurate but didn't convey the master-switch nature (when 0, all admin commands print "NO admins on this server!") | new: full template clarifies the gate behaviour

### ktx:cvar:k_admins

- canonical_id: `ktx:cvar:k_admins`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per source -- when 0, all admin functions bail with "NO admins on this server!" printed. Master switch for the entire admin subsystem.

- OLD description:
  > allow admins on server (0 = no, 1 = yes)

- NEW description:
  > Master toggle for the KTX admin system. When disabled, all admin-related commands print "NO admins on this server!" and bail; admins cannot be designated or take admin actions.
  >
  > 0 = admin system unavailable on the server.
  > 1 = admin system enabled (commands like /admin, /elect, designation of rcon admins, etc. work).
  >
  > Default: 0.
  > Set by: server config only.

- NEW source_ref: `src/admin.c:347` (admin gate; matches at `:489` too)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_allowvoteadmin | TRACED-CLEAN | rev=1 | seed: V-pass-affirmed C-comment "allow admin election (0 = no, 1 = yes)" was accurate but didn't surface the independence from k_admins | new: full template clarifies the /elect path + independence

### ktx:cvar:k_allowvoteadmin

- canonical_id: `ktx:cvar:k_allowvoteadmin`
- prior L1 verdict: `affirmed` (origin=`source_inline`)
- screening note: refined from C-comment per source -- independent of k_admins (which is the master admin toggle). Used in the /elect admin path; rules-printout label "Admin election: allowed/disallowed".

- OLD description:
  > allow admin election (0 = no, 1 = yes)

- NEW description:
  > Toggle for whether players may elect a temporary admin via the /elect vote system. Independent of k_admins (which is the master admin toggle).
  >
  > 0 = admin election is disabled (the election prints "Admin election is not allowed on this server").
  > 1 = players can vote to grant admin status.
  >
  > Default: 0.
  > Set by: server config only.

- NEW source_ref: `src/admin.c:497` (the admin-election gate)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`
- verify route: inline-orchestrator-hand-authored (Session #9 + operator)
- attempts: 1

---

## Batch summary

- **11 rows processed, 11 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** 11 x inline-orchestrator-hand-authored (Session #9 orchestrator + operator collaboration; one row -- k_sayteam_to_spec -- additionally verified cross-codebase against MVDSV / ezQuake / fteqtv sources).
- **Total subagent dispatches:** 0.
- **Per-row attempts avg:** 1.0.
- **Token cost:** part of the Session #9 orchestrator session conversation; no per-row terminal dispatch.

## Out of scope for this ledger

The remaining ~27 V-pass-affirmed rows (frogbot commands + already-short cvars + already-detailed cvars like k_spm_custom_model / k_sready / k_timetop) are not in this ledger. They don't require operator domain input to improve -- they're either already in the target shape or need only mechanical template reformatting. They're folded into the future Format-unify arc (Task #1) along with the 96-cohort + the V-pass-clean longer rows.

## Methodology gains queued for future folds

1. **L1 description template (locked)** -- the structure documented above. Belongs in:
   - `describe-fill-synthesis` skill (the synthesis discipline)
   - `decisions.md` D7 amendment (this arc's authority document)
   - A memory note (`feedback_l1_description_template_style.md` or similar) for future arcs to inherit
2. **L3 concept note: "QW team-chat visibility across the stack"** -- queued as a separate task. Synthesises the cross-codebase findings (KTX k_spectalk + k_sayteam_to_spec; MVDSV sv_user.c spec-filter + `$\\` marker; ezQuake cl_fakename + TP_ShortNick; fteqtv transitive relay; MVD dem_multiple gating).
3. **Template QA discipline: "no engine/code jargon in user-facing description"** -- folds into the describe-fill skill alongside ELABORATION DISCIPLINE. Calibration case: the initial k_dmm4_gren_mode draft leaked "explosion-on-think handler" which was code-speak; operator caught it on review.
