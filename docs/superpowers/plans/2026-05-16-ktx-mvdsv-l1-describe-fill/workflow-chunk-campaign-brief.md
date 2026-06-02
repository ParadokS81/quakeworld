# MVDSV describe-fill -- WORKFLOW chunk-campaign brief

**Read this file = you are primed.** Durable save-game for the *workflow* orchestrator
(distinct from the hand-orchestration `mvdsv-describe-fill-orchestrator-brief.md`, which
stays valid for manual batches). The arc filled 150/347 knobs by hand; this brief drives
the remaining **197 via programmatic Workflow chunks** -- one risk-ordered chunk per run,
with a learn-and-fix loop between chunks. Proven end-to-end on the `allow_download*` pilot
(commit `6514b869`).

## How to spawn (fresh terminal)

> You are the MVDSV describe-fill WORKFLOW orchestrator. Read
> `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/workflow-chunk-campaign-brief.md`
> and run the next chunk per it. Session at `/effort max`. Do NOT synthesize inline -- the
> Workflow runner dispatches the agents. Recon, gate, persist, and improve the brief; then HALT.

Fresh terminal each chunk (or every few): the runner's AGENTS are context-isolated, but a
lean orchestrator keeps recon/judgment sharp and turns cheap. Re-instantiate from this brief.

## Your role -- programmatic orchestrator

The **Workflow runner** (`describe-fill-chunk-runner.js`) owns the parallel JUDGMENT:
synthesis (<=4 knobs/agent) -> independent cold V-pass (1/knob) + planted canaries -> HG1
canary gate -> aggregated `flags_for_review`. **You (MAIN)** own everything around it: recon,
F-D6a, HG2, the operator prose-gate, and ALL DB/git writes. You never synthesize inline.

## The per-chunk loop

0. **Anchor gate.** `git -C research/repos/mvdsv describe --tags` MUST be `1.11-53-g18d0362`.
1. **Recon (one query).** Pull the chunk's knobs from the DB (`docker exec qw-oracle-postgres-dev
   psql -U qworacle -d qw_oracle`):
   `SELECT e.name, e.type, cv.source_file||':'||cv.source_line AS reg, cv.default_value AS dflt
    FROM entities e LEFT JOIN cvar_versions cv ON cv.entity_id=e.id
    WHERE e.project='mvdsv' AND e.description IS NULL AND <chunk filter> ORDER BY e.type,e.name;`
   (commands use `command_versions`; cmdline_params have no default.) **If the live set differs
   from the plan, confirm scope with the operator before fanning out.**
2. **Canaries (you establish ground truth from source).** Pick 1 canary per ~6 V-pass workers.
   Take a real sibling row, INVERT one clause (polarity/default) -> groundTruth `C-FIX`; OR plant a
   correct row -> groundTruth `TRACED-CLEAN` (a control, catches over-flagging). Grep the enforcing
   line yourself first -- a wrong canary is a broken gate. Canary knob must NOT be in the synth set.
3. **Build args + run.** Assemble the config object (shape below) and launch:
   `Workflow({ scriptPath: ".../describe-fill-chunk-runner.js", args: <config> })`.
   args lands as a string sometimes -- the runner JSON.parses defensively, so just pass the object.
4. **On completion -- F-D6a (yours).** Grep every returned `source_ref` vs live source; confirm it
   exists and reads the knob. A fabricated line is a shipped lie. (One bash loop over the refs.)
5. **HG1 + HG2.** Runner reports `canaryAllPass`. If a canary failed even after the runner's one
   sharpened re-dispatch -> halt + escalate. HG2: re-grep >=1 V-pass clause BOTH directions yourself
   (a V-pass flag can be a false-positive -- pilot caught one). Real C-FIX survivors -> seeded re-synth.
6. **Prose-gate (operator, early chunks).** Show the operator JUST the descriptions, compact. Bar:
   short, what-it-does + values + Default + Set-by, no bloat. Apply concision edits to the ledgers;
   if a pattern repeats, tighten the chunk rules for next time. Chunks 1-3 reviewed; then spot-check.
7. **Emit + persist.** `node describe-fill-emit-ledgers.cjs <result.output> <cluster>` -> per-knob
   ledgers. **Curate the chunk's issue-worthy flags** (suspected-bug / security / cross-mod-L3 /
   perf / behavior-quirk / dead-suspect -- NOT routine trace notes) and append one row per finding to
   `mvdsv-describe-fill-findings.md` (verify each cited file:line against live source first -- a
   fabricated finding-line is as bad as a fabricated description). Then from `apps/qw-oracle/`:
   `bun scripts/describe-fill/synthesize-mvdsv.ts --from-ledger '<plandir>/mvdsv-<cluster>-ledger-*.md' --dry-run`
   (0 errors) -> live -> re-run (idempotency: skipped-terminal = N, stable fingerprint) ->
   `bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression`
   (the 3 describe_fill gates + jsonb PASS; `origin_vocabulary` RED is the unchanged KTX baseline --
   verify 0 mvdsv contribution: mvdsv origins = source_inline + synthesized only).
8. **Improve + commit.** Append a learnings line below + update the cursor. Commit ONLY this chunk's
   files -- ledgers, the DB-touch, the updated `mvdsv-describe-fill-findings.md`, and this brief
   (`git diff --cached --stat` between add and commit). Push. Then HALT.

### args config shape (step 3)
```
{ anchor:"1.11-53-g18d0362",
  mvdsvRoot:"/home/paradoks/projects/quakeworld/research/repos/mvdsv",
  ktxRoot:"/home/paradoks/projects/quakeworld/research/repos/ktx",
  skillDir:"/home/paradoks/.claude/skills/describe-fill-synthesis",
  researchDocs:["<abs path to relevant doc-landscape file>", ...],   // locating aids, optional
  chunk:{ name:"<cluster-slug>", shape:"cvar|command|cmdline_param", rules:"<paste the shape rule block>" },
  knobs:[{knob,type,reg,dflt,suspect}, ...],
  canaries:[{knob,type,description,groundTruth}, ...] }
```

## Evidence base + discipline (baked into the runner prompts)

mvdsv source = ground truth (the only citation). ktx source = F-MV1 override check. Research
landscape docs = locating aids ONLY. Existing L1/docs are NOT a citation -- never parrot them;
synthesize fresh from code. Source not legible -> hedge / residue / `flags_for_review`, never guess.

## Chunk plan (risk front-loaded; size grows as confidence grows)

| # | Chunk | Shape | ~N | Why first/last |
|---|-------|-------|----|----|
| 1 | C3 dead/hidden + network-callout cvars (`sv_www_*`, `sv_getrealip`, `download_map_url`, `sys_sleep/simulation/extrasleep`, `sv_broadcast_*`) | cvar | ~10 | highest discovery risk; proves `dead_stamped` + `flags_for_review` on a PROVEN shape (isolates discovery-risk from shape-risk) |
| 2 | Physics/movement (`sv_accelerate/airaccelerate/friction/gravity/maxspeed/maxvelocity/stopspeed/water*`, `sv_safestrafe/speedcheck/nailhack`, `sv_max/minpitch`) | cvar | ~15 | F-MV1 at scale (KTX overrides?) |
| 3 | Commands: admin/ban (`addip/removeip/listip/writeip`, `vip_*`, `penalty*`, `cuff`, `mute`, `acc_*`) | command | ~14 | NEW shape -- hardens the command prompt (handler-locator + comparator trap + F-MV1) |
| 4 | Commands: server-control + logging (`map/devmap/restart/quit/load/save/exec/status/check_maps/path/heartbeat`, `log*`, `*fraglogfile`, `master_rcon_password`, `nslookup`, `chmod`, `snap*`, `updatebroadcasts`) | command | ~26 | command shape proven -> flow |
| 5 | Commands: script/cvar-meta + cheats + web (`set/toggle/if/inc/unalias*/cvardump/cvarlist/cmdlist/vminfo/profile/*_print/mod/script/give/noclip/sv_lastscores/sv_usercmdtrace`, `sv_web_get/post/postfile`, `localcommand`) | command | ~26 | includes C3 command-side (`sv_web_*`, `localcommand`) |
| 6 | cmdline params (`-port/-game/-ip/-basedir/+gamedir/-d/-g/-t/-u/-no*`) | cmdline_param | 11 | NEW shape, small; cryptic single-letters = discovery risk |
| 7 | Version/build cvars (`qwm_*`, `qws_*`) | cvar | ~14 | low risk, likely affirm-heavy; big confident chunk |
| 8 | Behavioral/networking/spectator/voip cvars (remainder: limits, `deathmatch/teamplay/fraglimit/timelimit/pausable`, `sv_voip*`, spectator, etc.) | cvar | ~55 | proven shape; biggest, lightest-touch; SPLIT if needed |

**Exclusion:** `sv_antilag*` is OUT (brief D10 cross-fork dual, handled separately) -- skip wherever they fall.
Counts re-derive from `--status` each chunk; the table is the route, not the truth.

## Per-shape rule blocks (paste into `chunk.rules`)

- **C3 dead/hidden (chunk 1):** "Suspected runtime-dead / network-callout knobs. Find the READ
  use-site; if the value is registered but NEVER reached by the running server path (no live consumer),
  emit `dead_stamped` per c3-dead-stamp-and-residue.md and raise a `runtime-dead-suspect` flag -- do NOT
  invent a confident 'tunes X'. If behavior IS legible, synthesize normally. When unsure dead-vs-live, flag it."
- **Physics (chunk 2):** "F-MV1 is load-bearing here: grep ktx/src for an override of this movement cvar
  (the pm_airstep precedent -- KTX can replace engine movement). Document the LIVE behavior; if KTX overrides,
  raise a `cross-mod-override` flag and describe what actually governs play."
- **Commands (chunks 3-5):** "Locate the handler FUNCTION (the cmd_t/command registration -> its Cmd_*_f),
  then the enforcing logic, which may live in another file (comparator/list/format helpers -- the demo/qtv
  'newest-first' trap). State who may issue it (rcon/admin vs any client). ACCESS-CLASS (proven chunk 3):
  client stringcmds dispatch ONLY through ucmds[] (sv_user.c:3299) + QC progs; SV_ExecuteUserCommand
  (sv_user.c:3399) prints 'Bad user command' on no match -- NO fall-through to console commands, so a
  Cmd_AddCommand-only registration = admin-only (verify the command is not ALSO in ucmds[] before claiming
  dual-access, e.g. sv_demoinfo / 'cmd demoinfo'). Include a WORKED EXAMPLE with real values for any
  non-trivial-arg command (operator ask, v2 'show usage' shape); skip no-arg commands. If a command takes an
  address/range, verify the PARSER before documenting syntax -- QW has NO CIDR/'/mask'; StringToFilter derives
  the mask from zero octets (ANY 0 octet is a wildcard), so never write a '[/mask]' form (chunk-3 cold V-pass
  caught that hallucination on vip_addip AND vip_removeip). F-MV1: grep ktx/src for an override.
  NORMAL-RCON BLOCKLIST (chunk-4 HG2): commands rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line are blocked on the regular `rcon_password` tier (sv_main.c:1754-1764 -> bad_cmd -> do_cmd=false); only the LOCAL CONSOLE and the `master_rcon_password` tier (validated sv_main.c:1701, unfiltered) reach them. For any command in that list the Set-by line must say 'server console + master rcon only', NOT a bare 'server console / rcon'. Per-knob cold V-pass cannot see this sibling-shared gate -- when ONE sibling flags an access-class near-miss, sweep ALL siblings in the chunk for the same overstated Set-by."
- **cmdline (chunk 6):** "Find where the arg is parsed (COM_CheckParm / Sys_*). Document what the launch flag
  does at startup + whether it takes a value. Single-letter flags (-d/-g/-t/-u) are cryptic -- if the parse
  site does not make the effect legible, hedge + flag rather than guess."

## Cursor (update each chunk)

- **316/347 done; 31 remaining.** Buckets: cvar 28 (incl. 2 `sv_antilag*` OUT/D10 -> 26 fillable), command 3 (stragglers only), cmdline_param 0 -- DONE (info_key 45/45 DONE).
- Synthesized-origin rows: 214 (DB-verified). Last chunk: **8b** `networking-rate-download-logging` (27 cvars). In-scope MVDSV fingerprint now `daa50516`.
- Download cluster **8/8 DONE** (skins/sounds/demos/pakmaps filled in chunk 8b).
- Command bucket DONE except 3 stragglers (verify-and-sweep at chunk 8/cleanup): `say` (SV_ConSay_f), `floodprotmsg` (SV_Floodprotmsg_f), `svadmin` (SV_Admin_f).
- Chunk-size: chunks 1..7 ran at 10+15+14+25+24+11+14, all clean (chunks 3+5+6+7 HG1-clean on the FIRST wave; chunk 4 needed one re-dispatch). SCALE if confident. **Chunk 8 IN PROGRESS** -- 79 in-scope NULL cvars (81 minus 2 `sv_antilag*` OUT/D10) split **26/27/26 + a 3-command tail** (say/floodprotmsg/svadmin). **8a + 8b DONE** (gameplay-limits 26 + networking-rate-download-logging 27; fps b64a5ca2 -> daa50516; HG1-clean first wave both; +14 findings #41-#54; download cluster now 8/8). NEXT: **8c `spectator-voip-mod-system`** (26: spectator/voip/mod-extensions/progs-debug/demo-hooks/admin), then the 3-command tail (say/floodprotmsg/svadmin). Buckets + canary pool + 8b/8c rule-block facts staged in `chunk8-orchestration-scratch.md`. cvar evidence base (no cmdline rule block; cmdline_param bucket DONE).

## Learnings log (append one line per chunk)

- [pilot allow_download*, 4 cvars] Workflow maps onto the orchestrator loop; canary HG1 = deterministic
  JS assertion (can't be skipped). Agents handled TRAP2 (cited enforcing `sv_user.c`, not `sv_main.c`).
  MAX quality held on a clean single-function cvar cluster -- UNPROVEN on gnarlier shapes (the chunk plan
  de-risks shape-by-shape). `flags_for_review` added after the pilot V-pass surfaced 2 refinements only in
  free-text notes. args can arrive as a string -> runner parses defensively. No per-agent effort knob in the
  Workflow API (model only) -> run the session at `/effort max`; the canary is the safety net if effort sags.
- [chunk 1 c3-dead-network, 10 cvars] All 10 synthesized high-conf, ZERO dead_stamps. The 4 C3 suspect-pool
  members (sv_www_*, sys_sleep) are build/platform-excluded (curl `#ifdef` / Windows-only), NOT genuine-dead
  -> document-as-live per the F-C3b deferral; `suspect=FALSE` + Phase-0 liveness context folded into
  `chunk.rules` was the right call (workers traced central.c wiring, no mis-stamp). The cold V-pass caught 3
  REAL over-claims -- KTX-vs-engine attribution (sv_www_address stats/race is a KTX consumer, not engine
  behavior), VIP-not-admin (sv_getrealip has no IP-keyed admin table), spectator-too-narrow (sv_broadcast_enabled
  also shows to all players when the receiver has no game) -- all source-confirmed in HG2 + edited before persist.
  Canary worked: wave-1 mis-classified one, sharpened re-dispatch fixed it. BUT the old runner re-ran ALL 12 reals
  on that single miss (~2x chunk cost) -> TUNED to re-run only the failed canary, escalate to HG1 halt on a
  persistent miss (operator: canary is an honesty trip-wire, not worth doubling budget). Added the cross-chunk
  `mvdsv-describe-fill-findings.md` (operator ask) -- 7 issues seeded incl an upstream-bug candidate
  (`central.c:694` `this=this` stub) + a plaintext-authkey security note; step 7 now auto-feeds it each chunk.
- [chunk 2 physics-movement, 15 cvars] All synthesized; canary clean on the FIRST wave (0 re-dispatch -- the
  blast-radius fix held). Big TRAP-2 win: movement cvars enforce through the `movevars` struct
  (sv_phys.c:1124 global + sv_user.c:3789 per-client -> pmove.c), NOT at registration; the chunk rule naming
  that bridge + pmove.c paid off. Flavour-C trap caught + HEDGED: sv_airaccelerate is registered + bridged +
  broadcast to clients/demos but has NO server pmove consumer -- server air-accel uses sv_accelerate; setting
  sv_airaccelerate changes only what clients/demos are told. 3 V-pass near-misses (sv_accelerate implied
  ground-only but also drives air; sv_wateraccelerate 'is sv_maxspeed' -> real swim cap is 0.7x; sv_safestrafe
  off-by-one on a direct flip) all source-confirmed + edited. OPERATOR prose-gate added 2 more: sv_stopspeed
  massaged (it is the low-speed *finish* floor, NOT the braking rate -- that is sv_friction) + sv_friction<->
  sv_stopspeed cross-links. LESSON: counterintuitively-named knobs (stopspeed / nailhack / airaccelerate) need
  explicit disambiguation from the naive reading -- worth a synth-prompt nudge if it recurs. Findings +6: 2
  in-source FIXMEs (sv_user.c:451/458), sv_safestrafe.pending_direction written-never-read, KTX haste via
  sv_maxspeed (L3), sv_nailhack inverted-name-default, physics-leave-at-defaults (L3).
- [chunk 3 admin-ban, 14 commands] NEW command shape held at MAX; all 14 synthesized high-conf. HG1 clean on
  the FIRST wave (0 re-dispatch). 3 source-grounded canaries -- `stop` (effect-inversion: claimed delete when
  SV_MVDStop(0) saves), `qtv_status` (access-class inversion: claimed client-issuable), `record` (TRACED-CLEAN
  control) -- all classified correctly; the access-class canary proved workers verify the NO-client-path NEGATIVE,
  not just effects. The recon-derived access-class model folded into chunk.rules was load-bearing: SV_ExecuteUserCommand
  (sv_user.c:3399) has NO fall-through from client stringcmds to console commands, so Cmd_AddCommand-only = admin-only;
  workers stated who-may-issue correctly for all 14 (no over/under-claim). Cold V-pass caught 3 REAL defects:
  vip_addip AND vip_removeip both FABRICATED a `<ip>[/mask]` CIDR syntax (StringToFilter has no slash parse; the mask
  is octet-zero-derived) -- two independent workers converging is the strongest C-FIX signal yet; vip_addip also
  over-generalized the level clause (engine keeps the HIGHEST level + forwards the number to the mod via *VIP, not
  'boolean-only' -- the defect lived in sv_user.c, a different file than registration, exactly the callee-follow the
  discipline mandates); addip C-NEAR-MISS on 'safe' scope (protects vs ban/banip, NOT addip-ban's type-agnostic
  overwrite) + 'trailing 0' vs 'any 0 octet' wildcard. All HG2-source-confirmed + MAIN-edited before persist (no
  re-synth dispatch needed -- surgical edits, chunk-1/2 practice). OPERATOR prose-gate (last full one) added worked
  examples chunk-wide (v2 'show usage') and caught that my `203.0.113.0` example contradicted the any-0-octet rule
  (matches 203.x.113.x, not 203.0.113.x -- two zeros) -> fixed to `198.51.100.0`; also flagged that 'permanent until
  restart' implied auto-persist (bans are memory-only; writeip + exec, never auto-loaded -- engine comment sv_main.c:1988).
  Findings +5: vip_addip no-zero-guard (`vip_addip 0` = everyone-VIP, upstream-bug med), SV_SavePenaltyFilter guards on
  MAX_IPFILTERS(1024) but penfilters[] is MAX_PENFILTERS(512) -> OOB at 512+ penalties (upstream-bug med), mute chat-block
  bypassed when a mod consumes `say` (cross-mod/L3 med), filterban allow-list inversion (behavior-quirk), penaltyremove
  re-index gotcha (behavior-quirk). LESSON folded into the command rule block for chunks 4-5: (a) the no-fall-through
  access-class fact is now stated so workers don't re-derive it; (b) WORKED EXAMPLE for non-trivial-arg commands; (c)
  verify address/range PARSERS before documenting syntax -- QW has no CIDR, octet-zero wildcards only.
- [chunk 4 server-control-logging, 25 commands] Command shape held at MAX, scaled 14->25 (6 synth groups of 4 + 1; 30 V-pass + 5 canaries). HG1 clean after ONE sharpened re-dispatch (blast-radius fix held -- only the failed canary re-ran). 5 canaries all correct: stop/cuff/removeip/record C-FIX caught + mute TRACED-CLEAN control held; the `record` access-class canary ('cmd record' from a client) drew a [blocker/contradiction] -- the no-client-path negative re-verified. F-D6a 24/25 clean; status/sv_status mis-cited the BLANK line sv_ccmds.c:1194 (real status print :1195) -- off-by-one fixed at persist. Cold V-pass caught 7 real defects: save+load both FABRICATED 'or cooperative' (coop save refused at sv_save.c:102, forced off at load sv_init.c:314-324 -- NetQuake-lineage inheritance, two workers converging = strong signal); `path` called the .pak '(N)' a 'search-entry count' when it is the open-file-HANDLE count (vfs_pak.c:188 references-1) + an unenforced '(read-only)'; snap/snapall over-claimed a client-side 'screenshot-taken' notice with NO server read-site (only the refusal broadcast is server-side); chmod WI2 + logrcon C-NEAR-MISS both access-class. BIG HG2 catch the per-knob cold V-pass STRUCTURALLY cannot see: the normal-rcon command blocklist (sv_main.c:1754-1764) blocks chmod AND every log* (via `!strncasecmp(tstr,"log",3)`) on the `rcon_password` tier -- only console + `master_rcon_password` reach them; logrcon's worker caught it (C-NEAR-MISS) but the other 4 log workers passed TRACED-CLEAN with the SAME overstated 'server console / rcon' Set-by. MAIN swept + tightened all 6 (two-tier branch HG2-confirmed: master sv_main.c:1701 / normal :1708). All 14 edits surgical (no re-synth dispatch -- chunk-1/2/3 practice). Findings +4: logtelnet dead (NO `SV_Write_Log(TELNET_LOG,...)` caller tree-wide -> file opens but is never written, always empty -- L1 row hedged), the rcon blocklist itself (behavior-quirk, now in the Set-by lines) + its `break`-after-first-non-empty-token vs 'check *all* tokens' comment mismatch (upstream low, likely benign with semicolons disabled), updatebroadcasts wrong-mutex unlock on the broadcast_in_progress path (sv_broadcast.c:382 unlocks servers_update_lock though :373 held broadcast_lock -- upstream med). LESSON (folded into the Commands rule block): per-knob cold V-pass cannot see sibling-shared gates (a chunk-wide blocklist/table); HG2 must sweep for them, and one sibling's access-class near-miss = sweep ALL siblings. 3 stragglers (say/floodprotmsg/svadmin) deferred to chunk 8/cleanup.
- [chunk 5 script-meta-cheats-web, 24 commands] Command shape held at MAX (24 in 6 synth groups; 24+5 V-pass). HG1 clean on the FIRST wave (0 re-dispatch) -- 5 canaries all correct incl. the load-bearing `god` access-class UNDER-claim ("players cannot invoke" a client cheat -> C-FIX), the INVERSE of chunk-4's over-claims: proves workers verify the client-CAN-issue positive as rigorously as the no-client negative. `nslookup` TRACED-CLEAN control held (no over-flag). F-D6a 24/24 (several refs at the handler-fn head; precise lines live in the per-knob enforce-trace tables). Cold V-pass flagged 8/24 -- ALL confirmed REAL in HG2 (ZERO false-positives this chunk), 10 surgical MAIN edits, no seeded re-synth: (1) vminfo "instruction count" is really `instructionCount*4` LABELED "table length" (a byte size, vm.c:1589); (2) script's "cannot run from outside the server dir" is FALSE -- a single leading `../` bypasses the strstr('..') guard because the code advances the pointer for the check (sv_main.c:2844) then re-fetches the original arg (:2853) -> path-traversal carve-out (security finding); (3) sv_lastscores "newest first" INVERTED (ascending comparator sv_main.c:4192 + ascending print loop -> newest LAST) AND "0=all" false (`<=0`->MAXDEMOS 10) -- BOTH parroted the engine's own buggy usage string (sv_demo_misc.c:980); the demo/qtv newest-first + flavour-C traps the rule block warned about, two blockers; (4) sv_web_get example mis-attributed race/results (ZERO callers; KTX uses post/postfile) + all three sv_web_* request_id args are inert (the "match the reply" semantics is comment-inferred from a stale central.c:50 comment whose only consumer is the dead `this=this` branch at :694); (5) mod's player-attribution fires on source-address match (rcon-from-a-player's-machine), not a client-run `mod` (not in ucmds[], no fall-through); (6) noclip named the internal `sv_allow_cheats` qbool instead of the operator-settable `sv_cheats` cvar (sv_ccmds.c:25-26). SIBLING-SWEEP held (chunk-4 lesson): `if`/`localcommand` both carry "console + master rcon only" (blocklist), `give` named `sv_cheats` correctly -- noclip was the lone diverger. cvardump/cvarlist are byte-identical aliases (shared Cvar_CvarList_f) -> cross-linked + wildcard clause aligned (consistency edit, not V-pass-flagged). META-LESSON: the verify-before-write rule (step 7) caught a V-pass OVER-claim at finding-write time -- it asserted `vmprofile` is the live profiler, but VM_VmProfile_f (vm.c:1518) is defined-but-never-registered/called (dead); grepping the cite before writing the finding stopped a fabricated finding-line (a V-pass note is a hypothesis too, not just the description). Findings +9 (#23-#31): script path-traversal (security med), sv_web GET/POST identity + sv_web_get unused + request_id-inert/CURL-build (dead-suspect, cross-ref #1), sv_lastscores usage-string lie (upstream) + KTX lastscores shadow (cross-mod/L3), cache_* dead subsystem (dead-suspect), localcommand system() "REMOVE ME" scaffolding (security), profile QVM no-op + dead PR1 reg (behavior). Quality-grid: 2 anchored describe_fill gates + jsonb + all mvdsv counts PASS; `origin_vocabulary` RED (1266) is PURELY ktx `recast_v2` (633 rows x2 predicates), 0 mvdsv contribution confirmed (mvdsv origins = source_inline 991 + synthesized 136 only). Commands bucket now DONE bar 3 stragglers; next is chunk 6 cmdline params (NEW shape, 11).
- [chunk 6 cmdline-params, 11 params] NEW cmdline_param shape held at MAX; all 11 synthesized high-conf (`-noerrormsgbox` medium -- build-variant). HG1 clean on the FIRST wave (0 re-dispatch) -- both source-grounded canaries correct: `-nohwtimer` C-FIX (polarity inversion -- planted "enables the hardware timer" vs the `!COM_CheckParm` at sv_sys_win.c:437 where PRESENT *disables* it) + `-heapsize` TRACED-CLEAN control (no over-flag). CANARY-FODDER TECHNIQUE (reusable when all entities are in-scope): the canary knobs were REAL-but-unextracted cmdline params (mvdsv source carries ~12 more `COM_CheckParm` flags than the 11 entities) -- verifiable in-oracle yet guaranteed not in the synth set. Augmented the cmdline rule block (recon-surfaced, synth-only -> no V-pass leakage): VALUE-VS-FLAG (the `COM_Argv(p+1)` consumer decides value-vs-bool, the cmdline TRAP-2), PLATFORM/BUILD-GUARD (sv_sys_unix.c=Unix / sv_sys_win.c=Windows / fs.c+net.c=both; `#ifndef SERVERONLY`/`#if 0` = excluded -> dead-suspect+hedge), POLARITY-FROM-CODE (quote the `!`, never infer from a negative name) -- all three paid off (workers nailed `-nopriority`/`-noerrormsgbox` negative-name polarity + the per-OS `-d` split). Cold V-pass flagged 3/11, ALL confirmed REAL in HG2: `-u`+`-t` C-FIX (both INVERTED the timing -- "After the server has started up" but chroot/setuid run in SV_System_Init at sv_sys_unix.c:774, BEFORE Host_Init at :775 which is the real startup: NET_Init/server.cfg/SV_Map; `-u` also fabricated a "bind a privileged port as root then drop" rationale -- impossible since the setuid precedes the bind AND QW's default 27500 is non-privileged); `-noerrormsgbox` C-NEAR-MISS (flavour-C -- "written to the log and console instead of pop-up" wrongly couples logging to the flag; the log write sv_sys_win.c:414-416 is OUTSIDE the flag's `#else` and fires regardless). All fixed by surgical MAIN edits (chunk-1..5 practice; no re-synth dispatch). F-D6a CAUGHT a consistent +10 line-drift in the `-u` synth citations (765/763/761-762 -> real 755/755/751-752; the 765 source_ref pointed at `*/`/`int main`) + `-port` source_ref at a BLANK line 1411 (real `atoi` at :1409) + `-t` at the value-read :743 vs the enforcing `chroot` :744 -- all corrected (source_ref folds into description_reasoning, a DB column, so a drifted cite is a shipped lie). META-LESSON (chunk-5 verify-before-write repeats): the `-port` V-pass OVER-claimed an OOB "reads adjacent memory" read; grepping `COM_Argv` (common.c:836 bounds-checks -> returns "") at finding-write refuted it -> finding written as benign. Findings +5 (#32-#36): -port/-ip off-by-one (benign, low), -game/+gamedir rejected-path `*gamedir` serverinfo divergence (med, FIXME-flagged), Windows `_CONSOLE` build-variant inertness of -noerrormsgbox/-d (dead-suspect), -tcpport(`#if 0`)/-clientport(`#ifndef SERVERONLY`) dead (dead-suspect), -basedir quakeparms comment-rot (low). Quality-grid: 2 anchored describe_fill gates + provenance + jsonb + all mvdsv counts PASS; `origin_vocabulary` RED (1266) PURELY ktx recast_v2 (633x2), 0 mvdsv contribution confirmed (mvdsv origins = source_inline 991 + synthesized 147). cmdline_param bucket DONE (0 remaining); next is chunk 7 version/build cvars (qwm_*/qws_*, ~14).
- [chunk 7 version-build-identity, 14 cvars] PROVEN cvar shape held at MAX; all 14 synthesized high-conf -- the predicted low-risk/affirm-heavy chunk. HG1 clean on the FIRST wave (0 re-dispatch): canaries `sv_paused` C-FIX (settability inversion -- planted "set `sv_paused 1` to pause" vs the real CVAR_ROM + engine-only `Cvar_SetROM` mirror of `sv.paused`) + `serverdemo` TRACED-CLEAN control held. Canary-fodder technique reused on a NEW axis: real out-of-set cvars chosen on the chunk's central read-only/settability property (the thing that splits `qws_*` from `qwm_*`). RECON folded a CONSUMER MODEL into chunk.rules (synth-only -> no V-pass leakage) that paid off: an exhaustive grep proved only `qwm_name` has an engine read-site (KTX-detection -> serversideweapon sv_init.c:424 + spectalk sv_broadcast.c:622) and `qws_buildnum` the lone runtime write -- the other 12 have NO engine reader. The rule "describe the identity role, do NOT fabricate a 'tunes X', do NOT dead-stamp (these are exposed-by-design, not dead)" held: ZERO dead_stamps, ZERO fabricated behavior despite 12/14 having no consumer. This is the chunk-1 F-C3b document-as-live discipline applied to the no-engine-reader (vs build-excluded) flavour. Cold V-pass flagged 2/14, BOTH confirmed REAL in HG2: `qws_version` C-NEAR-MISS ("advertises ... the server is running" overstates a push channel -- the cvar has zero read-sites and no CVAR_SERVERINFO; the real client-facing version channel is the `*version` serverinfo star-key sv_main.c:3684, built from the SERVER_VERSION macro, NOT the cvar) and `qwm_platform` C-NEAR-MISS ("operating system / architecture" -- QW_PLATFORM_SHORT version.h:26-60 is an OS-letter only, no arch dimension). SIBLING-SWEEP (chunk-4/5 lesson): the bare "advertises" overstatement recurred on `qws_name` + `qws_fullname` (same root -- none of the qws_* are the advertise channel) -> swept all three to "identifies"; the `qwm_*` "Advertises X ... so the mod's displays can show" is self-qualified by the next clause (mechanism = mod display, not engine broadcast), so left as-is. All surgical MAIN edits (no re-synth dispatch -- chunk-1..6 practice). F-D6a 13/14 clean (12 cite the declaration line -- correct for an identity cvar carrying the CVAR_ROM flag + seed; `qwm_name` cites its consumer); `qws_buildnum` source_ref tightened :3592 (the `if (GIT_COMMIT[0])` guard) -> :3593 (the `qws_buildnum.string = GIT_COMMIT` assignment that actually touches the knob). Quality-grid: 2 anchored describe_fill gates + jsonb + all mvdsv counts PASS; `origin_vocabulary` RED (1266) unchanged ktx recast_v2 (633x2), 0 mvdsv contribution (origins source_inline 991 + synthesized 161). +14 synthesized (147->161); cvar NULL 95->81. Findings +4 (#37-#40): qws_*/qwm_* identity-bank cross-mod-L3 (KTX is the display consumer -- reads qws_* for MOTD/Name/Version/Build, writes all 7 qwm_* at init), qwm_name spoofable case-sensitive substring KTX-gate (serversideweapon default-ON + spectalk), qws_version three-parallel-carriers (cvar / `*version` / legacy `version`), qws_buildnum "unknown" at dev-head (GIT_COMMIT="" version.h:72). META: the 36 flags were mostly ROUTINE cross-mod/no-consumer trace notes (one fyi per identity cvar); only 4 were issue-worthy -- and the cross-mod KTX consumer reads for #37 were grep-verified against the KTX tree before writing (verify-before-write).
- [chunk 8a gameplay-limits, 26 cvars] PROVEN cvar shape held at MAX, scaled to 26 (7 synth groups + 30 V-pass); HG1 clean on the FIRST wave (0 re-dispatch). Canary technique: cold V-pass is THEME-BLIND (each worker sees one knob+desc only), so prior-chunk OUT-of-set cvars are reusable fodder -- 3 C-FIX (sv_maxspeed "minimum"-inversion, sv_gravity "fall-slower"-inversion, allow_download_models polarity) + 1 control (allow_download_maps); the sv_maxspeed worker traced pmove.c:450 to refute the plant ([blocker]), the strongest catch yet. F-MV1 PREDICTION HELD: deathmatch/fraglimit/teamplay/timelimit are engine-STORED / mod-ENFORCED -- fraglimit has ZERO engine `.value` read, KTX ends the match (combat.c:325-336); the rule block's "describe standard meaning, attribute enforcement to the mod, flag cross-mod-override, route specifics to See also:L3" produced clean synth + finding #41 with NO fabricated engine enforcement. Read-only-mirror rule held: sv_paused/serverdemo + halflifebsp/sv_bspversion/registered/sv_serveme_fix/sv_mod_extensions all correctly "Set by: engine (read-only)" (CVAR_ROM no-reader / no-writer). Cold V-pass flagged 5/26, ALL real (zero FP), ALL surgical edits (no seeded re-synth -- C-NEAR-MISS not C-FIX): maxspectators OFF-state needs the VIP carve-out (at 0 the vip branch sv_main.c:1204 still admits via maxvip_spectators); sv_pr2references "64-bit modules" -> 64-bit NATIVE only (SV_Error gated VMI_NATIVE+idx64; QVM/KTX fine at 0); sv_progsname extension is gated on sv_progtype not content-detected; teamplay FFA "team chat as normal" is VOICE-only (engine routes voice sv_user.c:2888; TEXT say_team is mod-owned via PR_ClientSay short-circuit); vm_rtChecks is x86-JIT-only + read at compile/load not live. F-D6a 25/26 clean, 1 tighten (watervis cvar.c:157 GENERIC serializer -> sv_main.c:167 registration -- the knob-touching line; chunk-7 qws_buildnum class). META verify-before-write: nearly edited sv_progtype's CORRECT "-progtype" Set-by away -- the V-pass "dead macro" fyi was the inactive `#else` (non-SERVERONLY) branch; `#ifdef SERVERONLY` defines COM_CheckParm("-progtype") at server.h:1109, invoked pr2_exec.c:56 -> -progtype IS live; grep refuted the flag before the edit. +26 synthesized (161->187); cvar NULL 81->55. +8 findings (#41-#48: match-rule cvars engine-stored/mod-enforced L3, registered/sv_mod_extensions no-engine-reader cross-mod, sv_pr2references mod-owned-native-only, sv_serveme_fix CVAR_ROM-no-writer permanently-on, sv_csqc_progname download-exempt hardcodes csprogs.dat, vm_rtChecks dead forceDataMask, sv_paused partially-stale bitfield comment). fp b64a5ca2; idempotency stable (26 skipped-terminal); quality-grid green (origin_vocabulary RED = unchanged ktx recast_v2 baseline, 0 mvdsv).
- [chunk 8b networking-rate-download-logging, 27 cvars] PROVEN cvar shape, scaled to 27; HG1 clean FIRST wave (4 canaries; allow_download master-polarity C-FIX is on-axis for the download set). HEAVIER V-pass yield than 8a: 2 C-FIX + 7 C-NEAR-MISS, ALL 9 confirmed REAL (zero FP). Both C-FIX were SINGLE-CLAUSE flavour-C OFF-state/scope over-claims -> surgical MAIN edits (re-synth stays reserved for fundamentally-broken descriptions, not one-clause corrections): sv_idlesleep "0 = busy-loops while idle" is WRONG (the dedicated loop ALWAYS does a NET_Sleep/select() ~10ms wait regardless; sv_idlesleep is ADDITIONAL sleep stacked on top); sv_local_addr "on the public interface" is WRONG (it is the OS-local/hostname address, usually LAN/RFC1918 behind NAT -- sv_serverip is the public override, cross-linked). 7 C-NEAR-MISS surgical: allow_download_skins client-side "default skin" clause dropped, allow_download_pakmaps "only has in pak" -> "opened from pak" (gate keys on the opened handle's searchpath), qconsole_log_say "players' say" -> "say and say_team" (gate also covers console say + QTV chat), sv_maxping "checked once" -> pass-cached-only (rejected client re-checked), sv_maxuploadsize "remote/discarded" -> rcon-snap-scope + partial-file-left-on-disk, sv_serverip warning wording (detected-IP-looks-wrong not could-not-determine), sys_command_line empty-case (argv[0] always present -> never empty). Download TRAP2 held (per-type gate sv_user.c:1468-1556 behind master allow_download + techlogin). telnet_log_level correctly HEDGED (dead telnet log -- working OnChange/threshold but NO SV_Write_Log(TELNET_LOG) caller; reinforces #19). F-D6a 25/27 literal + 5 ref fixes (sv_maxping :185 local-alias -> :182 knob-read; 4 missing src/ prefix normalized). META: the 9 V-pass catches were DESCRIPTION defects, DISTINCT from the issue-worthy engine flags; cross-mod surfaced KTX OWNS sv_maxrate (clamps <=500000 + writes back, ktx world.c:1560/1749) and READS sv_local_addr for stats/race/frag upload identity. TOOLING: patch the result JSON via a Write-to-file node script, NOT `node -e '...'`, when OLD match strings contain apostrophes (server's/players') -- the shell single-quote wrapper breaks on them. +27 synthesized (187->214); cvar NULL 55->28; download cluster 8/8 DONE. +6 findings (#49-#54: sv_maxrate KTX-overwrite L3, sv_local_addr KTX-reads L3, sys_command_line launch-line info-disclosure, sv_maxuploadsize partial-file litter, telnet_log_level dead, net_chan.c:245 dead fatal_error write). fp daa50516; idempotency stable (27 skipped-terminal); quality-grid green.
