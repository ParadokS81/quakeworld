# B4 ledger -- engine-boundary-untraceable batch (LEAN v2, B5)

**Batch id:** `engine-boundary-untraceable` (B4 Pass 2 -- Batch B5)
**Oracle tag:** `1.47-2-g67253dc` (commit `67253dc9ab4f643f1e6523a923a41caab9ea587f`)
**Member count:** 5 rows
**Triage plan section:** `b4-unique-rows-triage-plan.md` -> Batch B5 (size 5, STRONG)
**Authority:** `decisions.md` D7 Amendment 2026-05-19 (B4) -- the seeded
re-synth contract. B5 Stage-2 change-report ledger per row.
**Prompt:** `b4-unique-rows-pass2-template.md` (BATCH_ID=5).

## Lean v2 shape note

Single-terminal inline work: source-of-truth understanding inline (Step 4
shared-root V-pass + cross-checks), per-row inline authoring under
enforce-trace + callee-follow (Step 5), ONE blind sample-verify subagent
on the most-load-bearing row (Step 6), inline self-check on the
remaining 4. No per-row Opus synth fan-out; no DB writes; all output
lands in this LEDGER + `/tmp/b4-engine-boundary-untraceable/` scratch.

## Members

```
ktx:command:info             # C-NEAR-MISS, batch-04, info-userinfo
ktx:command:kinfo            # C-NEAR-MISS, batch-09, kinfo-userinfo
ktx:command:qlag             # C-NEAR-MISS, batch-04, fpd-qizmo-lag-bit
ktx:cvar:k_allow_vwep        # C-NEAR-MISS, batch-01, vwep-master-gate
ktx:cvar:k_spm_color_rgba    # C-NEAR-MISS, batch-05, spawn-marker-tint
```

## Step 4 -- shared-root V-pass evidence

**Hypothesis (STRONG, per triage plan B5):** Each row's V-pass-flagged
clause asserts an effect enforced OUTSIDE the KTX (qwprogs.so) source
tree. The KTX side carries either a `trap_*` syscall, a serverinfo
bit-flip, or a hardcoded constant; the actual enforcement / semantics
live in the engine binary (MVDSV), in an external client-side tool
(QiZmo proxy), or in a now-dead extension check that has been replaced
by a hardcoded value.

Decomposes into three sub-shapes (each row hits exactly one):

- **alpha (engine-trap delegation):** KTX makes a `trap_*` syscall;
  the engine implements the asserted semantic. Rows: `info`, `kinfo`,
  `k_spm_color_rgba`.
- **beta (external-tool enforcement):** KTX writes a serverinfo bit;
  an external client-side proxy (QiZmo) reads it and enforces. Row:
  `qlag`.
- **gamma (dead extension check):** KTX hardcodes a constant where a
  runtime extension check used to live; the prose qualifier refers to
  a check that no longer exists at runtime. Row: `k_allow_vwep`.

**Falsifiable claim V-passed (cross-row pillar, covers `info` +
`kinfo`):** *"There is no KTX-side conditional testing value-empty
before calling `trap_SetUserInfo`; the empty->remove behavior is
engine-side."*

Evidence:

- `src/g_userinfo.c:115-118` (cmdinfo argc==3 branch):
  `if (argc == 3) { SetUserInfo(self, arg_1, arg_2, 0); return; }` --
  unconditional; no test on `arg_2` contents.
- `src/g_utils.c:2747-2750` (SetUserInfo wrapper):
  `void SetUserInfo(gedict_t *p, const char *varname, const char *value, int flags) { trap_SetUserInfo(NUM_FOR_EDICT(p), varname, value, flags); }` --
  pure pass-through; no value inspection. Comment at `:2745`: `// WARNING: this trap uses Cmd_TokenizeString() in server, so use with care.`
- `src/g_syscalls.c:459-462` (trap_SetUserInfo trampoline):
  `intptr_t trap_SetUserInfo(...) { return syscall(G_SETUSERINFO, edn, (intptr_t) varname, (intptr_t) value, flags); }` --
  pure syscall trampoline into the engine binary.
- Tree-wide grep `SetUserInfo` across `/tmp/ktx-src-67253dc9/src/`:
  every other call site (`g_cmd.c:887/888/982/985/1063/1147/1178/1179/1191/1192/1208/1238/1248`, `clan_arena.c:331/593/594/625/626/1437/1438/1444/1445/1451/1452`, `g_userinfo.c:226`) supplies an explicit non-empty value (`*ml/*mm/*mu/*mp/*mt/*is/team/topcolor/bottomcolor`); none gate on value-empty. The empty->remove decision exists nowhere in the KTX source.

**Cross-check 1 (beta sub-shape, `qlag`):** *"KTX's only reads of
`fpd & 8` are display/announce strings; no KTX code path applies a
client restriction on this bit."*

- `src/commands.c:3686-3700` (`ToggleQLag` handler): reads fpd
  (`:3688`), bails if match in progress (`:3690-3693`), flips bit 8
  (`:3695`), broadcasts new serverinfo (`:3697`), announces via
  `G_bprint(2, ...)` (`:3699-3700`). No restriction logic.
- `src/match.c:2120-2130` (settings dump): `if (i & 8) strlcat(buf, " lag", sizeof(buf));` followed by `G_bprint(2, "QiZmo:%s disabled\n", redtext(buf));` -- print only.
- `src/commands.c:2017-2020` (settings summary): `i = iKey(world, "fpd"); G_sprint(self, 2, "%s: %s\n", redtext("QiZmo lag"), OnOff(i & 8));` -- per-caller status line only.
- `src/commands.c:1585-1591` (`ShowQizmo` help): describes qlag as
  the "lagsettings" command in the qizmo command family -- corroborates
  the QiZmo-proxy framing.
- Tree-wide grep `fpd & 8` / `iKey.*fpd` returns only the toggle
  handler + the two status-print sites above. No KTX code reads
  `fpd & 8` to refuse or alter any client action.

**Cross-check 2 (gamma sub-shape, `k_allow_vwep`):** *"`vw_available`
is hardcoded to 1; the `checkextension("ZQ_VWEP")` runtime test does
not execute."*

- `src/world.c:354-356`:
  ```
  // FIXME: checkextension in mvdsv?
  // vw_available = checkextension("ZQ_VWEP");
  vw_available = 1;
  ```
- Tree-wide grep `vw_available\s*=`: only the hardcoded `= 1` at
  `world.c:356`. No other write site. The "ZQ_VWEP extension available"
  qualifier in the original description refers to a runtime check that
  is commented out.

**Verdict:** Shared root holds. Authoring under sub-shapes alpha/beta/gamma
proceeds. Each row's V-pass UNTRACEABLE clause is hedged by making the
engine/external boundary explicit, OR by dropping the dead-check
qualifier where appropriate.

---

## Results

B4-RESULT | ktx:command:info | TRACED-CLEAN | rev=1 | seed-clause: "if the value is empty, removes that userinfo key" (engine-side, no KTX enforcing line) | new-clause: "forwards the (key, value) pair to the engine via trap_SetUserInfo; empty-value handling is whatever the engine's userinfo trap implements -- KTX makes the call unconditionally"

### ktx:command:info

- canonical_id: `ktx:command:info`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "if the value is empty, removes that userinfo key"
    -> UNTRACEABLE at `src/g_userinfo.c:115-118` (`if (argc == 3) { SetUserInfo(self, arg_1, arg_2, 0); return; }` is unconditional; no KTX branch tests value-empty). Callee `SetUserInfo` at `src/g_utils.c:2747-2750` is a pure pass-through to `trap_SetUserInfo` (`src/g_syscalls.c:459-462`, pure syscall). The empty->remove decision executes engine-side (MVDSV), not in KTX. Adjacent comment `src/g_userinfo.c:117 // set/remove particular key` hinted the clause but is not an enforcing line.
  - Seed scratch: `/tmp/b4-engine-boundary-untraceable/seed_ktx_command_info.md`.

- OLD description:
  > Userinfo helper (KTPRO-compatibility alias of kinfo). With no arguments (or more than three) it stuffs "cmd setinfo" back to the client so all settable keys are listed. With one key argument it prints that userinfo key's current value (key = "value"). With a key and a value it sets or, if the value is empty, removes that userinfo key for the issuing client.

- NEW description:
  > KTPRO-compatibility alias of `kinfo`; both command names dispatch the same `cmdinfo` handler. Userinfo helper for the issuing client. With no arguments (or more than three) it stuffs `cmd setinfo` back to the client, which the client interprets by listing its settable userinfo keys. With one key argument it prints that userinfo key's current value as `key <k> = "<v>"`. With a key and a value it forwards the (key, value) pair to the engine via `trap_SetUserInfo` to update the client's own userinfo; empty-value handling (whether an empty value clears the key) is what the engine's userinfo trap implements -- KTX makes the call unconditionally and does not branch on the value contents.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. KTPRO-alias confirmed at `src/commands.c:942-943` (// `{ saved for ktpro compatibility` + `{ "info", cmdinfo, ... | CF_NOALIAS, CD_NODESC }`) + handler comment `src/g_userinfo.c:29 // ktpro like 'cmd info' compatibility` (info and kinfo at `:940` both dispatch `cmdinfo`). Three-argc dispatch traced in `cmdinfo` at `src/g_userinfo.c:86-122`: argc==1 || argc>3 -> stuffcmd "cmd setinfo" at `:99-104`; argc==2 -> `G_sprint(self, 2, "key %s = \"%s\"\n", arg_1, ezinfokey(self, arg_1))` at `:106-111`; argc==3 -> `SetUserInfo(self, arg_1, arg_2, 0)` at `:115-118`. Empty-removes engine-boundary hedged per Step-4 cross-row V-pass: `SetUserInfo` wrapper at `src/g_utils.c:2747-2750` is a one-line forward to `trap_SetUserInfo`; the trap at `src/g_syscalls.c:459-462` is a pure syscall trampoline (G_SETUSERINFO). No KTX-side value-empty branch exists tree-wide.

- NEW source_ref: `src/g_userinfo.c:86` (cmdinfo handler entry -- authoritative behavior site)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "KTPRO-compatibility alias of `kinfo`; both command names dispatch the same `cmdinfo` handler" -> `src/commands.c:940` (`kinfo` -> cmdinfo), `:942-943` (`// { saved for ktpro compatibility` + `info` -> cmdinfo), `src/g_userinfo.c:29` (`// ktpro like 'cmd info' compatibility`)
  - "Userinfo helper for the issuing client" -> `src/g_userinfo.c:86,99,109,118` (handler operates on `self` only)
  - "With no arguments (or more than three) it stuffs `cmd setinfo` back to the client" -> `src/g_userinfo.c:99-104` `if ((argc == 1) || (argc > 3)) { stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd setinfo\n"); return; }`
  - "which the client interprets by listing its settable userinfo keys" -> engine/client-side convention; framed as client-interpreted, not KTX-enforced (boundary explicit)
  - "With one key argument it prints that userinfo key's current value as `key <k> = \"<v>\"`" -> `src/g_userinfo.c:106-111` `G_sprint(self, 2, "key %s = \"%s\"\n", arg_1, ezinfokey(self, arg_1))`
  - "With a key and a value it forwards the (key, value) pair to the engine via `trap_SetUserInfo`" -> `src/g_userinfo.c:115-118` `SetUserInfo(self, arg_1, arg_2, 0)` + callee `src/g_utils.c:2747-2750` `trap_SetUserInfo(NUM_FOR_EDICT(p), varname, value, flags)` (callee-follow)
  - "to update the client's own userinfo" -> trap target `NUM_FOR_EDICT(self)` (`src/g_utils.c:2749`)
  - "empty-value handling ... what the engine's userinfo trap implements -- KTX makes the call unconditionally and does not branch on the value contents" -> Step-4 cross-row V-pass: `src/g_userinfo.c:115-118` (no value test), `src/g_utils.c:2749` (pure pass-through), `src/g_syscalls.c:459-462` (pure syscall trampoline)

- verify route: inline-self-check (engine-boundary cross-row V-passed at Step 4; this row shares the same trap with kinfo)
- verify verdict: TRACED-CLEAN (8 clauses; engine-boundary clause explicitly hedged, all others MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:kinfo | TRACED-CLEAN | rev=1 | seed-clause: "an empty value removes the key" (engine-side, no KTX enforcing line) | new-clause: "forwards the (key, value) pair to the engine via trap_SetUserInfo; empty-value handling is what the engine's userinfo trap implements -- KTX makes the call unconditionally"

### ktx:command:kinfo

- canonical_id: `ktx:command:kinfo`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "an empty value removes the key" -> UNTRACEABLE; same callee chain as `info` (kinfo and info both dispatch `cmdinfo`). KTX has no enforcing line; only the adjacent comment `src/g_userinfo.c:117 // set/remove particular key`.
  - Seed scratch: `/tmp/b4-engine-boundary-untraceable/seed_ktx_command_kinfo.md`.

- OLD description:
  > Inspects or sets the calling client's own mod-side userinfo keys. With no arguments (or more than two) it asks the client to list all its setinfo keys. With one argument it prints the value of that single userinfo key ("key <k> = "<v>""). With two arguments it sets that userinfo key to the given value (an empty value removes the key). Available to players and spectators, usable outside a match.

- NEW description:
  > Inspects or sets the calling client's own mod-side userinfo keys. With no arguments (or more than two) it stuffs `cmd setinfo` back to the client, which the client interprets by listing its setinfo keys. With one argument it prints the value of that single userinfo key as `key <k> = "<v>"`. With two arguments it forwards the (key, value) pair to the engine via `trap_SetUserInfo` to update the client's own userinfo; empty-value handling (whether an empty value clears the key) is what the engine's userinfo trap implements -- KTX makes the call unconditionally and does not branch on the value contents. Available to players and spectators, usable outside a match.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. kinfo and info share the same handler `cmdinfo` (`src/commands.c:940 kinfo -> cmdinfo`; same fn at `src/g_userinfo.c:86`). Three-argc dispatch identical to `info`: argc==1 || argc>3 stuffcmd `:99-104`; argc==2 G_sprint `:106-111`; argc==3 `SetUserInfo(self, arg_1, arg_2, 0)` `:115-118`. Empty-removes engine-boundary hedged per Step-4 cross-row V-pass (same trap chain `SetUserInfo` -> `trap_SetUserInfo` -> syscall). Access class: registration `src/commands.c:940` `CF_BOTH | CF_MATCHLESS | CF_PARAMS` -- CF_BOTH = CF_PLAYER | CF_SPECTATOR (`include/g_local.h:649`); CF_MATCHLESS allows the command outside a live match (dispatch gate `src/commands.c:1076-1083`). No CF_PLR_ADMIN / CF_SPC_ADMIN -> dispatch at `src/commands.c:1088-1117` admits any player and any spectator without admin check.

- NEW source_ref: `src/g_userinfo.c:86` (cmdinfo handler entry -- shared with info)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Inspects or sets the calling client's own mod-side userinfo keys" -> `src/g_userinfo.c:86,99,109,118` (all branches operate on `self`)
  - "With no arguments (or more than two) it stuffs `cmd setinfo` back to the client, which the client interprets by listing its setinfo keys" -> `src/g_userinfo.c:99-104` stuffcmd_flags + STUFFCMD_IGNOREINDEMO; client-side interpretation framed explicitly
  - "With one argument it prints the value of that single userinfo key as `key <k> = \"<v>\"`" -> `src/g_userinfo.c:106-111` `G_sprint(self, 2, "key %s = \"%s\"\n", arg_1, ezinfokey(self, arg_1))`
  - "With two arguments it forwards the (key, value) pair to the engine via `trap_SetUserInfo`" -> `src/g_userinfo.c:115-118` + callee `src/g_utils.c:2749` `trap_SetUserInfo(NUM_FOR_EDICT(p), varname, value, flags)` (callee-follow)
  - "to update the client's own userinfo" -> trap target `NUM_FOR_EDICT(self)` (issuing client)
  - "empty-value handling ... KTX makes the call unconditionally and does not branch on the value contents" -> Step-4 cross-row V-pass (same evidence as info)
  - "Available to players and spectators" -> `src/commands.c:940` `CF_BOTH` (= CF_PLAYER | CF_SPECTATOR per `include/g_local.h:649`); dispatch `src/commands.c:1088-1117` admits both classes (no CF_PLR_ADMIN / CF_SPC_ADMIN gate fires)
  - "usable outside a match" -> `src/commands.c:940` `CF_MATCHLESS` flag (= 1<<4 per `include/g_local.h:653`); dispatch gate `src/commands.c:1076` passes `k_matchLess && CF_MATCHLESS`

- verify route: inline-self-check (engine-boundary cross-row V-passed at Step 4; CF_BOTH + CF_MATCHLESS access-class verified at definition site)
- verify verdict: TRACED-CLEAN (8 clauses; engine-boundary clause explicitly hedged, all others MATCH)
- attempts: 1

---

B4-RESULT | ktx:command:qlag | TRACED-CLEAN | rev=1 | seed-clause: "When the bit is set, clients are restricted from using the QiZmo proxy's lag-related settings" (UNTRACEABLE; restriction is enforced by external QiZmo proxy, not by KTX) | new-clause: "the fpd key is a server-wide bitmask read by the QiZmo proxy; setting bit 8 signals QiZmo to disable its lag-related settings (the restriction is enforced by QiZmo, not by KTX -- KTX only writes the bit and announces the change)"

### ktx:command:qlag

- canonical_id: `ktx:command:qlag`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "When the bit is set, clients are restricted from using the QiZmo proxy's lag-related settings" -> UNTRACEABLE; the only KTX reads of `fpd & 8` are announce/summary/status STRINGS (`src/commands.c:3699-3700` toggle announce, `src/commands.c:2019` settings summary, `src/match.c:2125` qizmo-disabled status print). No KTX code path restricts client lag-settings on the bit; the actual restriction is enforced by the external QiZmo proxy / client, outside KTX source. The clause was inferred from the announce/redtext string + FPD domain knowledge.
  - Seed scratch: `/tmp/b4-engine-boundary-untraceable/seed_ktx_command_qlag.md`.

- OLD description:
  > Toggles the FPD "lag settings" restriction on or off by flipping bit 8 (value 8) of the server's fpd serverinfo key and re-broadcasting it. When the bit is set, clients are restricted from using the QiZmo proxy's lag-related settings; the result is announced to all players as "QiZmo lag settings in effect" or "not in effect". Has no effect while a match is in progress.

- NEW description:
  > Toggles bit 8 (value 8) of the server's `fpd` serverinfo key and rebroadcasts the new value via `serverinfo fpd`. The `fpd` key is a server-wide bitmask read by the QiZmo proxy; setting bit 8 signals QiZmo to disable its lag-related settings (the restriction is enforced by QiZmo on the client side, not by KTX -- KTX only writes the bit and announces the change). The result is announced to all players as `QiZmo lag settings in effect` or `not in effect`. Has no effect while a match is in progress.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Handler `ToggleQLag` at `src/commands.c:3686-3701`: reads fpd via `iKey(world, "fpd")` (`:3688`); bails if `match_in_progress` (`:3690-3693`); flips bit 8 via `fpd ^= 8` (`:3695`); rebroadcasts via `localcmd("serverinfo fpd %d\n", fpd)` (`:3697`); announces via `G_bprint(2, "%s %s\n", redtext("QiZmo lag settings"), ((fpd & 8) ? "in effect" : "not in effect"))` (`:3699-3700`, level 2 = all players). External-tool boundary hedged per Step-4 cross-check: the only KTX reads of `fpd & 8` tree-wide are STATUS-only sites -- the toggle's own announce (`:3699-3700`), the per-caller settings summary at `src/commands.c:2017-2020` `G_sprint(self, 2, "%s: %s\n", redtext("QiZmo lag"), OnOff(i & 8))`, and the disabled-features summary at `src/match.c:2120-2130` (`if (i & 8) strlcat(buf, " lag", sizeof(buf)); ... G_bprint(2, "QiZmo:%s disabled\n", redtext(buf))`). No KTX code path branches on `fpd & 8` to refuse, alter, or restrict any client action. The QiZmo-proxy framing is corroborated by `ShowQizmo` help at `src/commands.c:1585-1591` which lists qlag as the "lagsettings" command in the qizmo command family.

- NEW source_ref: `src/commands.c:3686` (ToggleQLag handler entry)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Toggles bit 8 (value 8) of the server's `fpd` serverinfo key" -> `src/commands.c:3688` `int fpd = iKey(world, "fpd");` + `:3695` `fpd ^= 8;`
  - "rebroadcasts the new value via `serverinfo fpd`" -> `src/commands.c:3697` `localcmd("serverinfo fpd %d\n", fpd);`
  - "The `fpd` key is a server-wide bitmask read by the QiZmo proxy" -> qizmo-family help `src/commands.c:1585-1591` (`ShowQizmo` lists qlag as "lagsettings"); status sites at `src/commands.c:2017-2020` + `src/match.c:2120-2130` confirm bit 8 is the QiZmo-lag bit
  - "setting bit 8 signals QiZmo to disable its lag-related settings" -> announce string `src/commands.c:3699-3700` (`"QiZmo lag settings" ... "in effect" / "not in effect"`); status-summary text `src/match.c:2125` (`" lag"` appended to disabled-features buf)
  - "the restriction is enforced by QiZmo on the client side, not by KTX -- KTX only writes the bit and announces the change" -> Step-4 cross-check 1: tree-wide grep confirms only status-print readers of `fpd & 8` in KTX; no enforcing branch
  - "The result is announced to all players as `QiZmo lag settings in effect` or `not in effect`" -> `src/commands.c:3699-3700` `G_bprint(2, "%s %s\n", redtext("QiZmo lag settings"), ((fpd & 8) ? "in effect" : "not in effect"))` (G_bprint level 2 = all players)
  - "Has no effect while a match is in progress" -> `src/commands.c:3690-3693` `if (match_in_progress) { return; }` (handler-internal guard)

- verify route: sample-verify (subagent: Opus 4.7 MAX, blind)
- verify verdict: TRACED-CLEAN (8 clauses; 5 MATCH + 3 ENGINE-BOUNDARY-HEDGED-OK; per-clause table at `/tmp/b4-engine-boundary-untraceable/sample_verify_ktx_command_qlag.md`)
- verifier note: rationale verbatim -- "Every clause maps to enforcing lines in ToggleQLag (commands.c:3686-3701); the engine-boundary hedge correctly scopes bit-8 semantics to QiZmo since tree-wide grep shows no KTX code gates on fpd & 8 (all three reads are status prints)."
- attempts: 1

---

B4-RESULT | ktx:cvar:k_allow_vwep | TRACED-CLEAN | rev=1 | seed-clause: "(and the ZQ_VWEP extension available)" qualifier (UNTRACEABLE; vw_available is hardcoded to 1, the checkextension call is commented out) | new-clause: dropped the dead-extension qualifier; precache now framed as gated on k_allow_vwep alone

### ktx:cvar:k_allow_vwep

- canonical_id: `ktx:cvar:k_allow_vwep`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "With it on (and the ZQ_VWEP extension available), the server precaches the visible-weapon models" -> the precache IS gated on `cvar("k_allow_vwep") && vw_available` (correct), BUT the "ZQ_VWEP extension available" qualifier has NO enforcing line: `src/world.c:355 // vw_available = checkextension("ZQ_VWEP");` is commented out, `src/world.c:356 vw_available = 1;` is the ONLY assignment in the tree, so no runtime ZQ_VWEP availability test exists. The qualifier is name/comment inference; code is less conditional than prose implies.
  - Seed scratch: `/tmp/b4-engine-boundary-untraceable/seed_ktx_cvar_k_allow_vwep.md`.

- OLD description:
  > Server-side master enable for visible weapons (vwep): when set, other players' currently-held weapon is shown as a model on their character instead of every player appearing to carry the same weapon. 0 = off, 1 = on (default 0). This is the master gate; the related k_vwep toggle only takes effect while this is on, and when this is off the in-game vwep toggle command is a no-op. With it on (and the ZQ_VWEP extension available), the server also precaches the visible-weapon player and weapon models.

- NEW description:
  > Server-side master enable for visible weapons (vwep): when set, other players' currently-held weapon is shown as a model on their character instead of every player appearing to carry the same weapon. 0 = off, 1 = on (default 0). This is the master gate; the related `k_vwep` toggle only takes effect while this is on, and when this is off the in-game `vwep` toggle command is a no-op. When set, the server also precaches the visible-weapon player and weapon models on map load.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Master AND gate at `src/world.c:378` `vw_enabled = vw_available && cvar("k_allow_vwep") && cvar("k_vwep")` (identical expr at `src/match.c:1633`, `src/commands.c:8598`); `vw_enabled` drives per-weapon `vw_index` at `src/weapons.c:1813 if (vw_enabled) { self->vw_index = 1; }` (per-weapon `vw_index` 2/3/.. ; `src/player.c:1182` `vw_index` 9). Registered default at `src/world.c:874` `RegisterCvarEx("k_allow_vwep", "0")` -- "0" exactly. `vwep` cmd no-op at `src/commands.c:8592` `if (!vw_available || !cvar("k_allow_vwep")) { return; }`. Precache: `src/world.c:358-381` inside `SP_worldspawn` (the per-map spawn handler at `src/world.c:182+`) gates the `trap_precache_vwep_model(...)` block on `cvar("k_allow_vwep") && vw_available`. Step-4 cross-check 2: `vw_available = 1` is hardcoded at `src/world.c:356`; the `checkextension("ZQ_VWEP")` call is commented out at `:355` and there is no other write site tree-wide, so the runtime extension qualifier has no enforcing line. Dropped the dead qualifier; the effective runtime gate is `k_allow_vwep` alone (with `vw_available` invariantly 1).

- NEW source_ref: `src/world.c:378` (vw_enabled master AND gate -- authoritative behavior site; preserved from prior synth)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Server-side master enable for visible weapons (vwep)" -> `src/world.c:378` `vw_enabled = vw_available && cvar("k_allow_vwep") && cvar("k_vwep")` (master AND chain)
  - "when set, other players' currently-held weapon is shown as a model on their character" -> `src/weapons.c:1813` `if (vw_enabled) { self->vw_index = 1; }` + per-weapon `vw_index` writes at `src/weapons.c` weapon-bind sites
  - "instead of every player appearing to carry the same weapon" -> logical inverse of `:1813` (without vw_enabled, per-weapon `vw_index` is not set)
  - "0 = off, 1 = on (default 0)" -> `src/world.c:874` `RegisterCvarEx("k_allow_vwep", "0")` (registered default exactly "0")
  - "This is the master gate; the related `k_vwep` toggle only takes effect while this is on" -> `src/world.c:378` AND chain (k_vwep is the third operand of the AND; if k_allow_vwep is 0 the chain short-circuits regardless of k_vwep)
  - "when this is off the in-game `vwep` toggle command is a no-op" -> `src/commands.c:8592` `if (!vw_available || !cvar("k_allow_vwep")) { return; }` (ToggleVwep early-return)
  - "When set, the server also precaches the visible-weapon player and weapon models" -> `src/world.c:358-381` `if (cvar("k_allow_vwep") && vw_available) { trap_precache_vwep_model("progs/vwplayer.mdl"); ... }`
  - "on map load" -> precache block is inside `SP_worldspawn` (`src/world.c:182+`), the per-map spawn handler invoked when the engine spawns the world entity for a map

- verify route: inline-self-check (gamma sub-shape; dead-extension cross-check V-passed at Step 4)
- verify verdict: TRACED-CLEAN (8 clauses; dead qualifier dropped, all retained clauses MATCH)
- attempts: 1

---

B4-RESULT | ktx:cvar:k_spm_color_rgba | TRACED-CLEAN | rev=1 | seed-clause: "1.0 = unmodified" (UNTRACEABLE; engine colormod-field convention, no KTX branch enforces identity-at-1.0) | new-clause: "forwarded opaquely to the engine's colormod extended-field (per engine convention, 1.0 leaves the channel unmodified)"

### ktx:cvar:k_spm_color_rgba

- canonical_id: `ktx:cvar:k_spm_color_rgba`
- prior L1 verdict: `synthesized` (origin=`synthesized`)
- V-pass finding (seed):
  - C-NEAR-MISS: "1.0 = unmodified" -> UNTRACEABLE; `ExtFieldSetColorMod` at `src/g_syscalls_extra.c:61-73` forwards rgb opaquely via `trap_SetExtFieldPtr(ed, field_ref_colormod, (void*)&rgb, ...)`. No KTX branch/comparison makes "1.0 = identity"; the convention is engine-side (colormod-field convention), not enforced in this tree. Correct-by-convention + consistent with registered default `"1.0 1.0 1.0 1.0"` (`src/world.c:885`) but no enforcing read-site = flavour-C minor parenthetical, not C-FIX.
  - Seed scratch: `/tmp/b4-engine-boundary-untraceable/seed_ktx_cvar_k_spm_color_rgba.md`.

- OLD description:
  > Color and opacity tint applied to spawn-point marker entities. The value is a space-separated string of floats: the first three are the red, green and blue color-mod components (each clamped to a minimum of 0.0, 1.0 = unmodified) and an optional fourth is the alpha (transparency) of the marker. At least three components must be supplied for the tint to take effect; with fewer than three the markers render untinted.

- NEW description:
  > Color and opacity tint applied to spawn-point marker entities. The value is a space-separated string of floats: the first three are the red, green and blue color-mod components, each clamped to a minimum of 0.0 and forwarded opaquely to the engine's `colormod` extended-field (per engine convention, 1.0 leaves the channel unmodified). An optional fourth value is the alpha (transparency) of the marker. At least three components must be supplied for the tint to take effect; with fewer than three the markers render untinted.

- NEW description_reasoning (compact):
  > Per-clause enforce-trace at oracle 1.47-2-g67253dc. Spawn-point marker setup at `src/items.c:2927-2951` inside `Spawn_OnePoint`: marker entity declared at `:2927-2928` (`p->netname = "Spawn Point"; p->classname = "spawnpoint"`). Cvar read at `:2933` `cvar_string("k_spm_color_rgba")` -> tokenize at `:2935` `trap_CmdTokenize(color_tint)` (whitespace split per `trap_CmdTokenize` semantics). At-least-three gate at `:2937` `if (nargs >= 3) { ... }`. Per-channel clamp at `:2942-2946` (`r = max(0.0f, atof(argument))` for argv 0/1/2). Apply at `:2947` `ExtFieldSetColorMod(p, r, g, b)`. Optional alpha at `:2949-2951` `if (nargs == 4) { ... ExtFieldSetAlpha(p, atof(argument)); }`. Engine boundary: `ExtFieldSetColorMod` at `src/g_syscalls_extra.c:61-73` is a pure forwarder -- `trap_SetExtFieldPtr(ed, field_ref_colormod, (void*)&rgb, ...)`; the field name `"colormod"` is set up at `src/g_syscalls_extra.c:65/73`. No KTX branch tests rgb against 1.0; the "1.0 = identity" identity is engine convention for the colormod field. Hedged accordingly. Registered default `"1.0 1.0 1.0 1.0"` at `src/world.c:885` `RegisterCvarEx("k_spm_color_rgba", "1.0 1.0 1.0 1.0")` (consistent with the engine-convention identity).

- NEW source_ref: `src/items.c:2933` (cvar_string read site -- authoritative behavior site; preserved from prior synth)
- NEW anchor: `1.47-2-g67253dc`
- NEW verdict: `synthesized`
- NEW description_origin: `synthesized`

- per-clause cites (inline list):
  - "Color and opacity tint applied to spawn-point marker entities" -> `src/items.c:2927-2928` (`p->netname = "Spawn Point"; p->classname = "spawnpoint"`) + `:2947` apply via `ExtFieldSetColorMod`
  - "The value is a space-separated string of floats" -> `src/items.c:2933,2935` `cvar_string("k_spm_color_rgba")` + `trap_CmdTokenize(color_tint)`
  - "the first three are the red, green and blue color-mod components" -> `src/items.c:2941-2947` argv 0/1/2 -> r/g/b -> `ExtFieldSetColorMod(p, r, g, b)`
  - "each clamped to a minimum of 0.0" -> `src/items.c:2942-2946` `r = max(0.0f, atof(argument))` (g/b likewise)
  - "forwarded opaquely to the engine's `colormod` extended-field" -> `src/g_syscalls_extra.c:61-73` `ExtFieldSetColorMod` body forwards via `trap_SetExtFieldPtr(ed, field_ref_colormod, ...)` (field ref name `"colormod"`)
  - "per engine convention, 1.0 leaves the channel unmodified" -> ENGINE-BOUNDARY (explicit hedge; KTX has no branch enforcing identity-at-1.0; consistent with registered default `"1.0 1.0 1.0 1.0"` at `src/world.c:885`)
  - "An optional fourth value is the alpha (transparency) of the marker" -> `src/items.c:2949-2951` `if (nargs == 4) { ... ExtFieldSetAlpha(p, atof(argument)); }` (alpha bound [0..1] at `src/g_syscalls_extra.c:17` -- not elaborated in user-text)
  - "At least three components must be supplied for the tint to take effect" -> `src/items.c:2937` `if (nargs >= 3) {` gates the whole colormod+alpha block
  - "with fewer than three the markers render untinted" -> logical inverse of `:2937` (block is skipped if nargs < 3; spawnpoint entity remains without colormod/alpha)

- verify route: inline-self-check (alpha sub-shape -- engine colormod-field convention; cross-checked at Step 4 via `trap_SetExtFieldPtr` opaque forwarding)
- verify verdict: TRACED-CLEAN (9 clauses; engine-convention clause explicitly hedged, all others MATCH)
- attempts: 1

---

## Cluster summary

- **5 rows processed, 5 converged TRACED-CLEAN.** 0 HALT.
- **Verify routes:** sample-verify 1 (`qlag`, dispatched Opus 4.7 MAX subagent, read-only, blind) + inline-self-check 4 (`info`, `kinfo`, `k_allow_vwep`, `k_spm_color_rgba` -- terminal-applied enforce-trace per clause with callee-follow on `SetUserInfo` -> `trap_SetUserInfo`).
- **Total synth dispatches:** 0 (lean v2: inline authoring replaces per-row Opus synth fan-out).
- **Total verify dispatches:** 1 (lean v2: ONE blind sample on the most-load-bearing engine-boundary row; inline self-check on the other 4).
- **Sampled row:** `ktx:command:qlag` (the beta sub-shape; the external-tool enforcement clause was the most load-bearing -- the verifier had to confirm tree-wide that NO KTX code path enforces a restriction on `fpd & 8`, only status prints).
- **Sampled verifier verdict:** TRACED-CLEAN (8 clauses; 5 MATCH + 3 ENGINE-BOUNDARY-HEDGED-OK; per-clause table at `/tmp/b4-engine-boundary-untraceable/sample_verify_ktx_command_qlag.md`).
- **Per-row attempts avg:** 1.0.

### Methodology gains captured

1. **Cluster-shared root V-passed inline.** Step 4 chased 1 primary falsifiable claim ("no KTX-side empty-test before `trap_SetUserInfo`") plus two cross-checks (qlag's tree-wide `fpd & 8` absence-of-enforcement; k_allow_vwep's hardcoded `vw_available = 1`). All three held. The triage hypothesis ("engine binary enforcement") refined into three sub-shapes -- alpha (engine-trap delegation), beta (external-tool enforcement), gamma (dead extension check) -- that were verified inline without per-row Opus synth dispatch. The STRONG-confidence triage tag was accurate.

2. **Engine-boundary hedge as a TRACED-CLEAN-eligible pattern.** The verifier accepted "engine-boundary-hedged-ok" as a valid TRACED-CLEAN classification when (a) the hedge accurately scopes the boundary, (b) tree-wide grep confirms KTX has no enforcing line, and (c) the hedged actor's role matches source evidence (e.g., the `ShowQizmo` help corroborates QiZmo as the consumer of the fpd bit). This expands the V-pass classification space: a clause asserting external-system behavior is acceptable IF the prose makes the boundary visible.

3. **Sample-verify confirms cluster shape at 1/5 cost.** The blind subagent re-ran enforce-trace on `qlag` -- the most load-bearing row (external-tool enforcement requires tree-wide negative evidence) -- and returned TRACED-CLEAN at rev=1. No re-dispatch. The 4 other rows reuse the same alpha/beta/gamma classification framework verified inline, so the sample-verify of the most-stressed shape validates the cluster.

### Token-cost observation (lean v2, B5 batch)

- Pre-reads (5 docs including decisions.md B4 slice + the prior calibration ledger): ~25k input.
- Inline source-oracle understanding + per-row authoring (5 rows): ~30k input/output mixed.
- Sample-verify subagent (qlag only): 50,730 total tokens (12 tool uses, 62.8s) per the subagent's own usage report.
- Sub-agent count: 1.
- Total terminal-side + subagent: ~85-100k input range, in line with the B5 STRONG-confidence projection (70-100k from the template's cost expectations).

