# MVDSV describe-fill -- chunk-8a batch ledger: `gameplay-limits`

Workflow chunk-runner batch (run `wf_30dd1136-ae4` / task `wi7r8gyx7`, 37 agents / ~2.30M tokens).
First of the chunk-8 sub-chunk split (8a/8b/8c + 3-command tail). MAIN-owned gates (F-D6a, HG1/HG2,
prose spot-check, persist) recorded here; per-knob ledgers carry the synthesized record + cold V-pass.

- **anchor:** `1.11-53-g18d0362`
- **shape:** cvar (PROVEN) -- **26 knobs** (7 synth groups of <=4; 26 reals + 4 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `b64a5ca2d0209f74c87991b64cd4ea29` (was `2333be4d` after chunk 7)
- **synthesized-origin mvdsv rows:** 161 -> **187** (DB-verified; +26). cvar `description IS NULL`: 81 -> **55** (the 2 `sv_antilag*` are OUT/D10; in-scope cvar remainder 79 -> 53 for 8b+8c).
- **verdicts:** 24 synthesized + 2 hedged (`registered`, `sv_mod_extensions` -- both no-engine-reader, CVAR_ROM).

## Recon (live set == plan)

26 of the 79 in-scope NULL cvars, themed "gameplay-limits": match rules (deathmatch/teamplay/fraglimit/
timelimit/pausable/sv_paused), player/spectator limits (maxclients/maxspectators/maxvip_spectators/
sv_forcespec_onfull/sv_reconnectlimit -> NOTE sv_reconnectlimit moved to 8b), world/map (watervis/
halflifebsp/registered/sv_bspversion/sv_phs/sv_mapcheck), progs+VM (sv_progsname/sv_progtype/sv_csqc_progname/
sv_pr2references/vm_rtChecks/sv_mod_extensions/sv_serveme_fix), protocol/cheat (sv_cheats/sv_bigcoords/
sv_extlimits). Rule block emphasized F-MV1 (mod-governed match cvars), read-only mirrors (sv_paused/serverdemo),
and engine-vs-mod attribution.

## HG1 -- canary gate: **PASS** (no re-dispatch, first wave)

4 canaries (3 C-FIX + 1 TRACED-CLEAN control), each ground-truthed by MAIN before launch. Cold V-pass is
theme-blind, so prior-chunk out-of-set physics/download cvars are fair fodder.

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `sv_maxspeed` (planted "minimum speed floor; does not cap top speed") | C-FIX | C-FIX | wish-speed CAP at `pmove.c:450/476/507` ("clamp to server defined max speed") -- it is a MAXIMUM |
| `sv_gravity` (planted "higher = fall more slowly") | C-FIX | C-FIX | `sv_phys.c:379` `velocity[2] -= scale * movevars.gravity * sv_frametime` -- higher = falls faster |
| `allow_download_models` (planted "0 = allow, 1 = block") | C-FIX | C-FIX | `sv_user.c:1470` `allow_dl = allow_download_models.value` -- value IS the allow flag (1=allow) |
| `allow_download_maps` (verbatim-correct "1 allow / 0 block, default 1" -- control) | TRACED-CLEAN | TRACED-CLEAN | `sv_user.c:1474`, default "1" (sv_main.c:110) |

The `sv_maxspeed` worker drew a [blocker/contradiction] and traced `pmove.c:450` to refute the planted
inversion -- strongest signal. Control held (no over-flag).

## F-D6a -- source_ref audit: 25/26 clean, 1 tightened

Every returned `source_ref` printed from live source; each reads/sets its knob. 1 tightened:

| knob | synth ref | issue | corrected to |
|---|---|---|---|
| `watervis` | src/cvar.c:157 | `cvar.c:157` is the GENERIC `if (var->flags & CVAR_SERVERINFO)` serializer -- knob-agnostic, not a watervis read | `src/sv_main.c:167` (the `watervis` registration carrying CVAR_SERVERINFO) |

watervis has no specific reader (serverinfo-only); the reasoning body already cited both sv_main.c:167 +
the cvar.c:131/157 serializer, so this is a precision tighten of the bare pointer (chunk-7 qws_buildnum class).
The registration-site refs for `fraglimit`/`registered`/`sv_mod_extensions` are correct -- those knobs have no
read use-site at all (documented).

## HG2 -- cold V-pass flagged 5/26 reals (all C-NEAR-MISS); all confirmed REAL + surgically edited

Re-grepped each contested clause both directions. **All 5 confirmed REAL** (zero false positives) -> surgical
MAIN edits at persist (no seeded re-synth -- chunk-1..7 practice; C-NEAR-MISS, not C-FIX).

| knob | defect (confirmed) | fix |
|---|---|---|
| `maxspectators` | OFF-state too broad: at maxspectators=0 the `if(vip)` branch (sv_main.c:1204) still admits VIPs via `maxvip_spectators` (a different cvar) | "no one can connect as a spectator" -> "blocks regular spectators, but VIPs can still connect using reserved VIP slots" |
| `sv_pr2references` | "required for 64-bit game modules" over-generalizes: the mandatory-references SV_Error (pr2_exec.c:603-606) is gated `type==VMI_NATIVE` + `#ifdef idx64`; QVM mods (KTX) run fine at 0 | narrowed to "64-bit native (.so/.dll) modules; QVM mods such as KTX do not need it" |
| `sv_progsname` | "appends the appropriate extension for the module type it finds" implies content auto-detect; the extension is gated on the separate `sv_progtype` cvar in fixed fallback order | "extension ... determined by the sv_progtype setting" |
| `teamplay` | FFA "treats team chat as a normal game" holds for VOICE only (sv_user.c:2888 promotes team-voice to all); TEXT say_team in FFA reaches only the sayer AND text is normally mod-handled (PR_ClientSay short-circuit sv_user.c:1837; KTX owns say) | split to voice (engine routes) vs text (mod owns); "route team voice + label demos" |
| `vm_rtChecks` | scope+timing: governs ONLY the x86 JIT backend (interpreter checks unconditionally); bits read at progs COMPILE/load, not a live toggle | added "applies to the JIT-compiled VM ... read when game code is loaded -> next map; interpreter builds always check" |

**Verify-before-write catch:** the V-pass left an fyi flag implying `sv_progtype`'s "-progtype command-line
parameter" Set-by was a dead macro. Grep refuted it: `#ifdef SERVERONLY` (active in mvdsv) defines
`SV_CommandLineProgTypeArgument()` = `COM_CheckParm("-progtype")` (server.h:1109), invoked at pr2_exec.c:56 to
set sv_progtype. The dead macro is the inactive `#else` (non-SERVERONLY) branch. -progtype IS live -> NO edit
(a correct clause was nearly edited away).

## Prose spot-check (MAIN; chunk-8 is spot-check, not full operator review)

All 26 reviewed -- concise v2 user-doc shape (what-it-does + values + Default + Set-by). Lengths 222-674 chars;
the longer ones (sv_forcespec_onfull, teamplay, vm_rtChecks, maxvip_spectators) earn it with enumerated values.
F-MV1 cvars correctly attribute enforcement to the mod with `See also: L3`. read-only mirrors (sv_paused,
halflifebsp, sv_bspversion, registered, sv_serveme_fix, sv_mod_extensions) correctly say "Set by: engine
(read-only)". No bloat; the 5 HG2 edits were the only changes.

## Persist + gates

- `synthesize-mvdsv.ts --from-ledger` dry-run: 26 parsed / 26 persisted / **0 errors**.
- LIVE: 26 persisted / 0 errors; committed fingerprint `b64a5ca2d0209f74c87991b64cd4ea29`.
- Idempotency re-run: 0 persisted / **26 skipped-terminal** / same fingerprint -> stable, no re-run bug.
- `quality-grid --project mvdsv --family regression`: 116 probes, 115 clean. The 2 anchored describe_fill gates
  (`synthesized_requires_anchor`, `provenance_entry_exists`) + `jsonb_columns_not_strings` + all mvdsv F1 floor
  counts PASS. `origin_vocabulary` RED (1266 = 633x2) is **entirely the ktx `recast_v2` baseline** -- unchanged;
  mvdsv origins are only `source_inline` (991) + `synthesized` (187), **0 mvdsv contribution** (DB-verified).

## Findings seeded

8 issue-worthy findings appended to `mvdsv-describe-fill-findings.md` (#41-#48), all cites grep-verified against
live mvdsv + ktx source before writing (verify-before-write):
- **#41 cross-mod/L3** -- the 4 match-rule cvars (deathmatch/fraglimit/teamplay/timelimit) are engine-stored / KTX-enforced (F-MV1 consolidated; the 8a prediction held).
- **#42 dead-suspect/cross-mod** -- `registered` has no engine reader (shareware gate commented out); off-tree QC is the only consumer.
- **#43 cross-mod/L3** -- `sv_mod_extensions` is a no-reader capability advertisement; KTX reads it (g_main.c:509); the mvdsv<->KTX extension handshake.
- **#44 behavior-quirk** -- `sv_pr2references` is admin-settable in name only (reset each game-load; native-only, inert for QVM/KTX).
- **#45 behavior-quirk** -- `sv_serveme_fix` is CVAR_ROM with no writer -> permanently on, admin can never disable.
- **#46 upstream-bug** -- `sv_csqc_progname` download auto-allow hardcodes "csprogs.dat", ignoring the cvar (renamed csprogs not auto-downloadable).
- **#47 upstream-bug/dead-suspect** -- `vm_rtChecks`'s `forceDataMask` is declared+read but never assigned (dead always-false JIT branch).
- **#48 behavior-quirk** -- `sv_paused`'s `server.h:725` bitfield comment is partially stale (bit 1 used by KTX `&1`; bits 2/3 no consumer).
