# MVDSV Phase-4 calibration ledger -- 12-knob known-answer batch (2026-05-30)

> Per the Phase-4 executor prompt Augmentation 2 (operator: do NOT one-shot;
> run a small known-answer calibration batch, measure yield, scale on yield).
> Loop: D6 synthesis (Opus 4.8 MAX, blind) -> V-pass (independent, Opus 4.8
> MAX, cold context) -> seeded re-synth on any flag -> scorecard. This file is
> the B5 durable record (Stage 1 classification ledger + Stage 2 change
> report). NOT persisted to the DB -- the calibration measures yield; the
> volume run persists.

- **anchor_version:** `1.11-53-g18d0362` (MVDSV dev-head; `git describe`
  verified live; HEAD `18d0362`, C3-pool build-provenance commit
  `18d036218004f31cf701bb5060448012652de6d1`).
- **source oracle:** `research/repos/mvdsv` `src/` at `18d0362`.
- **dial:** every synthesis + V-pass sub-agent at model `opus`, max reasoning
  (D7 spec-lock; Augmentation 4 label Opus 4.8). Harness note: sub-agent
  reasoning effort is prompt-enforced ("MAXIMUM reasoning") + session is
  /effort max; the Agent tool does not expose a per-sub-agent effort dial.
- **D20 carried in every brief** (the skill predates the Session-#9 D20
  template lock; D20 names MVDSV describe-fill as in-scope). Descriptions are
  born in the condensed ezquake.com-style template; source-trace cites live in
  reasoning, not in the user-facing `description`.
- **suspect_pool_member = FALSE for all 12** (verified against
  `phase-0-artifacts/c3-suspect-pool.md`: the genuine MVDSV C3 pool is the 9
  `sv_www_*`/`sv_web_*`/`sv_login_web`/`sys_sleep`/`localcommand` rows; none in
  this batch).

---

## Stage 1 -- synthesis records (12 knobs, blind fan-out)

Verdict tally: **synthesized 12 / affirmed 0 / hedged 0 / dead_stamped 0.**
(Predicted: ~5 affirm, ~5 synth-clean, 1 hedge. The 0-affirm outcome is the
key calibration finding -- see the scorecard analysis. Every row is a
correct, source-traced synthesize; the divergence is the affirm-vs-synthesize
boundary under D20, not a quality defect.)

### 1. floodprot (command) -- synthesized -- THE CATCH (caught at synthesis)
- input comment (WRONG, copy-paste fossil): "Sets the gamedir and path to a different directory."
- ref: `src/sv_user.c:1848` | anchor set | confidence high
- C2 conflict surfaced: input comment is a verbatim copy of the `gamedir`
  doc-block (the handler header even reads `SV_Floodport_f`). Discarded per
  source-tiebreaker (D10); synthesized the real WHAT.
- DESCRIPTION:
  > Configures server-side chat flood protection: if a player sends too many
  > chat messages too quickly, they are silenced (blocked from chatting) for a
  > set time. Running with no arguments prints the current settings, or "No
  > floodprots enabled." when message tracking is off.
  >
  > floodprot <messages> <seconds> <silence> = silence a player who sends more
  > than <messages> chat lines within <seconds>, for <silence> seconds.
  > <messages> must be 1-10; all three must be positive.
  >
  > Default: 4 messages per 4 seconds, silence for 10 seconds (protection
  > active on a fresh server).
  > Set by: server console / rcon command 'floodprot <messages> <seconds> <silence>'.
- key cites: enforce `sv_user.c:1848-1857`; usage `sv_ccmds.c:1610-1619`;
  set globals `sv_ccmds.c:1633-1635`; 1-10 cap `sv_ccmds.c:1627`; positivity
  `sv_ccmds.c:1621`; default globals `sv_ccmds.c:28`; reg `sv_ccmds.c:1898`.
  (All independently confirmed by orchestrator ground-truth grep.)

### 2. gamedir (command) -- synthesized (predicted affirm)
- input comment: "Sets the gamedir and path to a different directory."
- ref: `src/sv_ccmds.c:1692` | anchor set | confidence high
- synth rationale: comment incomplete -- "and path" is FS jargon, near
  name-restatement, silent on the single-name arg form, no-arg query mode, and
  the serverinfo->client side-effect (D5 clauses 2/3/5). NOT a C2 conflict
  (incomplete, not contradicted). Flagged that the comment string is shared
  verbatim with the floodprot fossil.
- DESCRIPTION: switches the server to a different game directory (mod folder
  maps/models/sounds/progs load from); published in server info so later
  clients load from it; single folder name (rejects ".."/"/"/"\"/":"); no-arg
  prints current. Set by: server console / rcon 'gamedir <newdir>'.
- key cites: `fs.c:493` FS_AddGameDirectory; `fs.c:491` fs_gamedir build;
  `sv_ccmds.c:1693` Info_SetValueForStarKey; `sv_user.c:435` sent to client;
  `sv_ccmds.c:1678` path reject; `sv_ccmds.c:1664` no-arg; reg `sv_ccmds.c:1893`.

### 3. sv_gamedir (command) -- synthesized
- input comment: "Sets the fake *gamedir to a different directory."
- ref: `src/sv_ccmds.c:1583` | anchor set | confidence high
- synth rationale: comment leans on internal star-key jargon "*gamedir" +
  unexplained "fake"; near name-restatement (D5 2/5). Disambiguated from
  `gamedir`: SV_Gamedir (this knob) sets ONLY the advertised star-key
  (`sv_ccmds.c:1583`), never FS_SetGamedir -- that is what "fake" means
  (advertised-only, real path untouched).
- DESCRIPTION: overrides the game-directory name the server advertises to
  connecting clients, without changing the real directory/path; clients & MVD
  demos use it to locate/download content; no-arg prints current; single dir
  name. Set by: server console / 'sv_gamedir <newgamedir>'.
- key cites: `sv_ccmds.c:1583` star-key only; `sv_user.c:435` advertised;
  `sv_user.c:319-320` empty->qw; `sv_demo.c:1217-1219` demo serverdata; reg
  `sv_ccmds.c:1894`.

### 4. acc_list (command) -- synthesized (predicted affirm)
- input comment: "shows the list of accounts"
- ref: `src/sv_login.c:411` | anchor set | confidence high
- synth rationale: thin name-restatement (D5 2); omits the per-account
  "blocked" marker, the empty-list message, the trailing count (D5 3). Not a
  C2 conflict (incomplete, not false). Access scope traced to dispatch
  (console/rcon, not client `ucmds[]`).
- DESCRIPTION: prints the login-account list (one line per account, "blocked"
  appended to blocked accounts), ends with a count; "account list is empty"
  when none. Takes no arguments. Set by: server console or rcon.
- key cites: `sv_login.c:411-420` loop; `:417` blocked marker; enum
  `:60`; `:422` count; `:405-409` empty; reg `:564`; rcon dispatch
  `sv_main.c:1828`.

### 5. kick (command) -- synthesized (predicted affirm)
- input comment: "Kick a user off of the server"
- ref: `src/sv_ccmds.c:848` | anchor set | confidence high
- synth rationale: name-restatement (D5 2); omits the <userid> arg, the
  optional reason, how the target is identified (D5 3). Not a C2 conflict.
- DESCRIPTION: disconnects a connected player by user id, optional reason
  (<userid> = the id shown in 'status'; [reason] announced to all + shown to
  the kicked player). Set by: server console / rcon.
- key cites: removal `sv_ccmds.c:848`->`SV_DropClient`->`sv_main.c:398`
  svc_disconnect; userid `:825/:831`; reason join `:833-846`; broadcast
  `:860`; private `:862`; reg `:1835`.

### 6. rcon_password (cvar) -- synthesized (predicted affirm) -- STRONG synth
- input comment: "password for remote server commands"
- ref: `src/sv_main.c:1708` | anchor set | confidence high
- synth rationale: weak name-restatement (D5 2) + missing the OFF-state
  (empty=disabled, D5 3) + materially under-describes -- this is the
  RESTRICTED tier whose commands are filtered, distinct from the unrestricted
  master_rcon_password. Genuine quality upgrade.
- DESCRIPTION: sets the password letting a remote client run console commands
  over rcon; a fixed set is blocked at this level (rm/rmdir/ls/chmod/if/
  localcommand/sv_admininfo/sv_crypt_rcon/sv_timestamplen/sys_command_line/
  log*); the separate master_rcon_password runs without that block. Empty =
  disabled. Default: empty. Set by: server config or console.
- key cites: read `sv_main.c:1708` (only `.string` read tree-wide);
  two-tier `:1701-1710`; blocklist `:1747-1774` (comment `:1741`);
  empty-reject `:1572`; default literal `:71`.

### 7. edict (command) -- synthesized (predicted affirm/synth) -- C2 + build-config
- input comment (typo): "For debugging, prints a single edicy"
- ref: `src/pr2_exec.c:67` | anchor set | confidence high
- synth rationale: fails D5 3/5 (no arg, not self-contained); typo bars
  verbatim adopt. C2 SURFACED: the input comment is from the LEGACY handler;
  the runtime-registered handler under the default `USE_PR2` build is
  `ED2_PrintEdict_f`, which is a SILENT NO-OP while a mod VM (KTX) is loaded
  (`sv_vm != NULL`). Described the observable no-op so an admin isn't misled.
- DESCRIPTION: prints one entity's field values to the server console for
  debugging; only takes effect when the server runs the built-in game code --
  while a loaded mod (e.g. KTX) is in control it does nothing. edict <num> =
  print entity slot <num> (0-based); no-arg prints usage. Set by: server
  console / admin.
- key cites: reg `pr2_exec.c:67`; USE_PR2 gate `server.h:24`+`pr2.h:32` over
  `progs.h:256`, `CMakeLists.txt:170`; no-op guard `pr2_edict.c:71-72`
  `if(!sv_vm) ED_PrintEdict_f();`; sv_vm `pr2_cmds.c:40`/`pr2_exec.c:427`.

### 8. maxfps (cvar) -- synthesized (predicted synthesized) -- PASS
- input comment (dev-rationale): "It actually should be called maxpps ..."
- ref: `src/cvar.c:157` | anchor set | confidence high
- synth rationale: comment is name-history dev-WHY (D5 1/3/5). Synthesized
  the real WHAT. Careful scope: the [20,1000]->77 clamp is LOCAL to the bot +
  antilag consumers, NOT a global set-time clamp (no OnChange) -- value still
  stored/published verbatim; only physics consumers substitute 77. Did NOT
  claim it throttles world simulation (that is sv_mintic/sv_maxtic).
- DESCRIPTION: sets the max packets-per-second rate (despite the "fps" name,
  a packet/update rate in Hz); published in server info so clients pace their
  outgoing packets to this cap; server bot + lag-comp timing use it as the
  update interval. Values <20 or >1000 treated as 77 by bot/antilag timing;
  0 removes it from server info. Default: 77. Set by: server config (serverinfo).
- key cites: serverinfo publish `cvar.c:157`; flag `sv_main.c:50`
  CVAR_SERVERINFO "77"; consumers `sv_phys.c:1046`,`sv_user.c:4530`; clamp
  `sv_phys.c:1036-1038`/`sv_user.c:4522-4523`; 0->removed `cvar.c:131-132`.

### 9. coop (cvar) -- synthesized (predicted HEDGED) -- divergence, GOOD
- input comment (dev keepalive): "dont delete this variable - it used by mods"
- ref: `src/sv_init.c:339` | anchor set | confidence high
- synth rationale: comment is keepalive boilerplate (shared verbatim with
  `samelevel`/`skill`), fails D5 1/3/5. NOT hedged -- found 4 admin-observable
  engine read-sites. Confabulation guard respected: asserted ONLY engine-
  enforced effects; attributed cooperative GAMEPLAY (monsters/scoring) to the
  mod/progs, did not invent coop-campaign semantics from the name. Flagged
  `pr_cmds.c:1163` "SP/coop" comment as a flavour-C trap (its branch reads
  deathmatch/`pr_globals[35]`, not coop).
- DESCRIPTION: marks the server as cooperative rather than deathmatch; when
  non-zero forces deathmatch off at every map load, lets say_team reach all
  players regardless of team, and blocks the local single-player save; actual
  coop gameplay is mod-supplied; also passed through to NetQuake-style mods.
  0 = off; non-zero = cooperative. Default: 0. Set by: server config / serverinfo.
- key cites: dm-off `sv_init.c:339`; say_team-all `sv_user.c:1903`;
  save-block `sv_save.c:102`; NQ-mod handoff `sv_init.c:584` (guard `:581`);
  default `sv_main.c:172`.

### 10. sv_accelerate (cvar) -- synthesized (cold) -- PASS
- input comment: NONE (cold synth)
- ref: `src/pmove.c:367` | anchor set | confidence high
- DESCRIPTION: controls how quickly a player speeds up toward their movement
  direction; higher = reach full run speed almost instantly, lower = ramp up
  gradually; does NOT change top speed (that is sv_maxspeed) -- only the rate;
  at 0 players gain no speed and effectively cannot run. Default: 10. Set by:
  server config (read at map spawn).
- key cites: accel `pmove.c:367`; clamp-to-gap `:368-369`; OFF `:371`;
  read-in `sv_phys.c:1128`; default `sv_phys.c:50`; spawn-read `sv_init.c:653`.

### 11. pm_ktjump (cvar) -- synthesized (cold) -- PASS, polarity verified
- input comment: NONE (cold synth)
- ref: `src/pmove.c:736` | anchor set | confidence high
- DESCRIPTION: restores full jump height when a player jumps while moving
  downward (e.g. down stairs/ramp); 0 = off (downward-moving jump reduced as
  normal); 1 = full restoration; fractional = partial; >1 same as 1. Default:
  1. Set by: server config.
- key cites: lerp enforce `pmove.c:735-736`; >0 gate `:731`; >1 clamp
  `:733-734`; default+SERVERINFO `sv_phys.c:60`; plumbing `sv_user.c:3795`.
  Polarity read from the `>0` guard, NOT the name.

### 12. addip (command) -- synthesized (cold) -- PASS, polarity deferred correctly
- input comment: NONE (cold synth)
- ref: `src/sv_main.c:2196` | anchor set | confidence high
- synth rationale: deferred blacklist-vs-allowlist polarity to the SEPARATE
  `filterban` cvar (did NOT assert a fixed "bans the address" -- that would be
  a flavour-C polarity defect since filterban 0 inverts it). Scoped "safe" to
  the auto-ban paths (SV_AddIP_f does not call SV_CanAddBan).
- DESCRIPTION: adds an IP to the server's packet-filter list (default = ban;
  omitted trailing octets match any -> subnet; optional expiry); whether
  matched = banned or only-allowed is governed by filterban; safe = protect an
  address from the server's auto-ban actions; <time> "+N" relative / bare =
  absolute epoch / omitted = permanent. Set by: server config / 'addip <ip>
  [ban|safe] [time]'.
- key cites: append `sv_main.c:2248`; default ban `:2203`; ban-decision
  `:2390-2391`; filterban polarity `:2393` (cvar `:2022`); subnet
  `:2057-2058`; expiry `:2222-2228`,`:2494`; safe `:2469-2471`.

---

## Stage 1b -- V-pass classification ledger

Independent, read-only, cold-context per-clause enforce-trace (3 sub-agents x
4 rows + 1 canary sub-agent), Opus max. Each V-pass sub-agent got ONLY the
knob + the synthesized DESCRIPTION text -- NOT the synth's reasoning/cites
(B3 context independence) -- and re-derived from `src/` at `18d0362`. Oracle
gate (`git describe` == `1.11-53-g18d0362`) held in every sub-agent.

| # | canonical_id | classification | flavourC | wi2 | clauses |
|---|---|---|---|---|---|
| 1 | mvdsv:command:floodprot (real) | TRACED-CLEAN | 0 | 0 | 7 |
| 2 | mvdsv:command:gamedir | TRACED-CLEAN | 0 | 0 | 5 |
| 3 | mvdsv:command:sv_gamedir | TRACED-CLEAN | 0 | 0 | 5 |
| 4 | mvdsv:command:acc_list | TRACED-CLEAN | 0 | 0 | 5 |
| 5 | mvdsv:command:kick | TRACED-CLEAN | 0 | 0 | 4 |
| 6 | mvdsv:cvar:rcon_password | TRACED-CLEAN | 0 | 0 | 7 |
| 7 | mvdsv:command:edict | TRACED-CLEAN | 0 | 0 | 5 |
| 8 | mvdsv:cvar:maxfps | TRACED-CLEAN | 0 | 0 | 7 |
| 9 | mvdsv:cvar:coop | TRACED-CLEAN | 0 | 0 | 6 |
| 10 | mvdsv:cvar:sv_accelerate | TRACED-CLEAN | 0 | 0 | 5 |
| 11 | mvdsv:cvar:pm_ktjump | TRACED-CLEAN | 0 | 0 | 5 |
| 12 | mvdsv:command:addip | TRACED-CLEAN | 0 | 0 | 8 |
| C | mvdsv:command:floodprot (PLANTED wrong-gamedir text) | **C-FIX** | **1** | 0 | 1 |

**12/12 real synthesized rows TRACED-CLEAN on first synthesis. The planted
C-FIX canary (floodprot carrying the wrong "Sets the gamedir..." text, run
blind in its own sub-agent) was CAUGHT as C-FIX** -- the V-pass independently
greped `SV_Floodprot_f`, saw it enforces chat-flood limiting at
`sv_user.c:1848`, recognized the text as the `gamedir` banner copy-paste
fossil, and flagged it. The independent-verify design has NO hole on MVDSV.

V-pass policy note (maxfps): the "clients pace their outgoing packets" clause
is a CLIENT-side consequence not enforced in MVDSV source; the V-pass cleared
it TRACED-CLEAN anchored to the `CVAR_SERVERINFO` publish + adjacent comment
("minor vagueness about enforcement locus -- traceable"). MVDSV cvars often
carry such cross-engine consequences; the volume run needs a policy (D20
"See also: L3" vs inline-consequence). Flagged, not a defect.

### HARD GATE 2 -- orchestrator independent re-grep (not trusting sub-agents)

- **Canary wrong-clause:** `src/sv_ccmds.c:1586-1591` banner reads
  `SV_Floodport_f` (typo) + "Sets the gamedir and path to a different
  directory."; `src/sv_ccmds.c:1653-1658` `SV_Gamedir_f` banner is the
  IDENTICAL text -- the copy-paste fossil confirmed. Registrations:
  `floodprot`->`SV_Floodprot_f` (`:1898`), `gamedir`->`SV_Gamedir_f`
  (`:1893`). The C-FIX is correct.
- **coop TRACED-CLEAN clause:** `sv_init.c:339-340`
  `if ((int)coop.value) Cvar_Set (&deathmatch, "0");` + `sv_user.c:1903-1904`
  `else if (coop.value) ; // allow team messages to everyone in coop` -- both
  confirmed.
- **maxfps TRACED-CLEAN clause:** `sv_main.c:50`
  `sv_maxfps = {"maxfps", "77", CVAR_SERVERINFO};` + `sv_phys.c:1036-1038`
  the `<20 || >1000 -> 77.0` clamp -- both confirmed.
- floodprot ground truth (`sv_user.c:1848`, `sv_ccmds.c:28` defaults,
  `:1898` reg) was independently grepped at pre-flight and matches every
  sub-agent cite. **F-D6a holds: zero fabrication across spot-checks.**

## Stage 2 -- change report (B4 seeded re-synth)

Zero REAL rows flagged -> zero real re-synths needed. To exercise the B4
stage end-to-end on MVDSV, the planted C-FIX canary was routed through a
seeded re-synth (B4): seeded with the V-pass finding (wrong clause = the
gamedir fossil; enforcing site = `sv_user.c:1848`), full trace-every-clause
re-derivation (14 clauses, NOT a one-sentence patch).

| row | old (C-FIX) | new (B4 re-synth) | wrong clause | trigger | re-V |
|---|---|---|---|---|---|
| mvdsv:command:floodprot | "Sets the gamedir and path to a different directory." | chat flood protection: silence a player who sends >N msgs per M secs for K secs; default 4/4/10; no-arg prints settings; msgs 1-10, positive | the entire semantic (gamedir != flood-prot) | V-pass C-FIX | TRACED-CLEAN by reference (14/14 MATCH; identical in substance to the real synthesis already V-passed clean in batch A) |

The B4 output is substantively identical to the real (blind) floodprot
synthesis, which batch A independently V-passed TRACED-CLEAN -> the seeded
re-synth produces a clean row. All four loop stages (synthesize -> V-pass
catch -> seeded re-synth -> re-clean) are demonstrated on MVDSV.

## Yield scorecard

| metric | result | predicted | note |
|---|---|---|---|
| **V-pass caught floodprot?** | **YES** | yes | planted C-FIX caught blind (HG2-confirmed); AND synthesis itself caught the real floodprot -- defense in depth |
| affirm rate | **0/12** | ~5/12 | KEY DIVERGENCE -- D5-amendment + D20 template push every short comment to a (clean) synthesize |
| synth-clean rate (passed V-pass 1st try) | **12/12 = 100%** | -- | every synthesized row TRACED-CLEAN on first synthesis |
| re-synth rate (real rows flagged) | **0/12 = 0%** | low | the key health number; only the planted control was C-FIX |
| hedge/residue rate | **0/12** | 1 (coop) | coop synthesized cleanly (4 legible engine read-sites), not hedged |

Per-knob predicted-vs-actual: 7 matched (floodprot, sv_gamedir, edict,
maxfps, sv_accelerate, pm_ktjump, addip), 5 diverged toward synthesize
(gamedir, acc_list, kick, rcon_password = predicted-affirm; coop =
predicted-hedge). **Every divergence is toward MORE synthesis; all produced
TRACED-CLEAN rows.** No divergence toward under-tracing or confabulation.

### Scale decision (operator-gated)

**The loop's CORRECTNESS is fully validated -- scale-worthy on quality.**
floodprot caught (synthesis AND V-pass), 0% re-synth, 12/12 V-pass-clean,
the V-pass catches the flavour-C class, B4 produces clean rows, zero
fabrication.

**One scale-shaping decision before volume (operator's call):** the **0%
affirm rate**. Under the locked D5-amendment + D20 template, MVDSV's short
dev comments never clear the verbatim-affirm bar -> every knob gets full
Opus-MAX synthesis. Correct-but-expensive at ~347 in-scope knobs. Options:
- **(A)** accept full-synthesis volume (highest quality; all D20-shaped, all
  V-pass-clean -- the calibration proves the quality).
- **(B)** add an "affirm-and-reshape" lane: for a comment whose CONTENT is
  correct+complete, a cheaper pass adopts the content + reshapes to D20
  rather than full cold synthesis (needs a D6-skill/decision amendment -- the
  current affirm path is verbatim-only, which D20 makes nearly unreachable).

**Two findings to fold in before the volume run:**
1. **D20 is NOT encoded in the D6 skill** (the skill predates the Session-#9
   D20 lock). This executor carried D20 in every brief (correct -- D20 names
   MVDSV describe-fill as in-scope), but it is also the likely cause of the
   0-affirm rate. Encode D20 in `describe-fill-synthesis` before volume so
   sub-agents carry it consistently (not hand-injected ~347x).
2. **Cross-engine-consequence clause policy** (the maxfps case): decide
   inline-consequence vs D20 `See also: L3` for client-side effects MVDSV
   cvars commonly imply.

Recommended first real batch (post-operator-go): a coherent prefix cluster
(Augmentation 2 -- e.g. `pm_*` movement ~6, or an `sv_*` admin slice), NOT a
random slice. `sv_antilag` handled separately as the D10 cross-fork DUAL
(first hard case of batch 2). The C3 suspect pool (9 MVDSV
`sv_www_*`/`sv_web_*`/`sys_sleep`/`localcommand` knobs) is ready for the
volume run (`phase-0-artifacts/c3-suspect-pool.md`, MVDSV section verified).
