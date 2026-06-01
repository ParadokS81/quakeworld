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
  'newest-first' trap). State who may issue it (rcon/admin vs any client). F-MV1: grep ktx/src for an override."
- **cmdline (chunk 6):** "Find where the arg is parsed (COM_CheckParm / Sys_*). Document what the launch flag
  does at startup + whether it takes a value. Single-letter flags (-d/-g/-t/-u) are cryptic -- if the parse
  site does not make the effect legible, hedge + flag rather than guess."

## Cursor (update each chunk)

- **175/347 done; 172 remaining.** Buckets: cvar 95, command 66, cmdline_param 11 (info_key 45/45 DONE).
- Synthesized-origin rows: 73. Last chunk: 2 `physics-movement` (15 cvars). In-scope MVDSV fingerprint now `31ad65f4`.
- Download cluster 4/8 (skins/sounds/demos/pakmaps remain -- fold into chunk 8 or a quick warm-up).
- Chunk-size: chunks 1+2 ran at 10+15, both clean. SCALE UP further (orchestration/canary overhead is per-chunk). Next per plan: chunk 3 commands admin/ban (~14, NEW shape -- handler-locator + comparator trap + F-MV1).

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
