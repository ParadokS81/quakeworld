# MVDSV describe-fill -- cross-chunk findings & issues report

**Purpose.** A cumulative, append-only log of *issue-worthy* discoveries surfaced while
documenting MVDSV knobs: suspected upstream bugs, security notes, cross-mod (KTX) couplings
worth a Layer-3 concept note, perf/behavior quirks, and runtime-dead suspects. Routine
enforce-trace notes stay in the per-knob ledgers -- only **actionable** findings land here.
By campaign end this is the consolidated list to mine for upstream PRs and L3 notes.

**How it gets filled.** Synthesis / V-pass agents emit observations via `flags_for_review`
(kinds: `suspected-bug` / `contradiction` / `runtime-dead-suspect` / `hidden-family` /
`cross-mod-override` / `other`; severities: `fyi` / `review` / `blocker`). The workflow runtime
has no filesystem, so agents cannot write this file directly -- their flags reach it through the
**chunk orchestrator (MAIN)**, which curates the issue-worthy flags each chunk and appends rows
here. A directly-dispatched agent that *does* have fs access may append a row itself. Never delete
rows; update **Status** (`open` / `triaged` / `filed-PR` / `wont-fix` / `moved-to-L3`) in place.

**Categories.** `upstream-bug` (code defect/smell in mvdsv or ktx) - `security` -
`cross-mod/L3` (KTX consumes an mvdsv knob -> L3 concept-note candidate) - `perf` -
`behavior-quirk` - `dead-suspect` (registered but possibly unreachable; F-C3b territory).

> All line numbers are anchored to mvdsv `1.11-53-g18d0362` (and ktx at its pinned checkout).
> Re-verify before acting -- a finding is a hypothesis until re-grepped at the time you act on it.

## Findings

| # | Chunk | Knob | Location | Category | Sev | Observation | Status |
|---|-------|------|----------|----------|-----|-------------|--------|
| 1 | c3-dead-network | `sv_www_address` | mvdsv `central.c:694` | upstream-bug | low | Vestigial no-op self-assignment: `if (this->request_id && !strcmp(this->request_id, "upload")) { this = this; }` in the web-response handler -- looks like a leftover debug-breakpoint stub. Harmless but dead code; candidate for an upstream cleanup PR. | open |
| 2 | c3-dead-network | `sv_www_authkey` | mvdsv `central.c:343-344` | security | low | The authKey is sent as a plaintext curl form field (`CURLFORM_COPYCONTENTS`) on *every* outbound request, including the unauthenticated periodic check-in. No TLS/obfuscation at this layer; relies entirely on the configured URL being https. | open |
| 3 | c3-dead-network | `sv_www_address` | ktx `stats.c:554`, `race.c:3286,4980` | cross-mod/L3 | -- | KTX gates match-statistics and race-record uploads on `!strnull(sv_www_address)`. The mvdsv cvar is the on-switch for a KTX feature -> L3 concept note on QW central-server / web integration (which mvdsv core knob lights up which mod behavior). | open |
| 4 | c3-dead-network | `sv_broadcast_enabled` | mvdsv `sv_broadcast.c:620-622` | cross-mod/L3 | -- | KTX `k_spectalk` widens broadcast visibility: when `qwm_name` contains "KTX" and `k_spectalk` is set, mid-game players (not only spectators) see incoming broadcasts. -> L3 note on cross-server broadcast behavior. | open |
| 5 | c3-dead-network | `sv_broadcast_sender_validation_enabled` | mvdsv `sv_broadcast.c:537-541` | perf | low | Every accepted inbound `broadcast` connectionless packet triggers a `server_list_lock`-held linear scan of the known-server list (sender validation). Possible amplification surface under spoofed broadcast floods; worth a glance if broadcast is widely enabled. | open |
| 6 | c3-dead-network | `sv_www_checkin_period` | mvdsv `central.c:738-740` | behavior-quirk | low | `last_checkin_time` is reset to `curtime` on every tick where `server_busy` is true (the `else if`), so the idle check-in clock effectively restarts whenever the server is busy. Possibly intentional ("check in 60s after going idle"); flagged for behavior review, not a description defect. | open |
| 7 | c3-dead-network | `sys_nostdout` (canary) | mvdsv `sv_sys_win.c` (`#ifdef _CONSOLE`) | dead-suspect | low | Observed while canary-testing (not yet a synthesized knob): `sys_nostdout` is declared/enforced only in the dedicated-server sys layers and the Windows print paths are gated by `#ifdef _CONSOLE`; in a non-`_CONSOLE` Windows build it may be inert. Re-verify when `sys_nostdout` is synthesized in a later chunk. | open |
| 8 | physics-movement | `sv_airaccelerate` | mvdsv `sv_phys.c:1129` (bridge) / `pmove.c:534` | upstream-bug | med | Registered (default 10) and copied to `movevars.airaccelerate`, but has **no pmove consumer** -- server-side air acceleration uses `movevars.accelerate` (= `sv_accelerate`) at `pmove.c:534`. The only readers of `movevars.airaccelerate` are the client serverdata broadcast (`sv_user.c:454`) and the MVD demo (`sv_demo.c:1297`). Net: setting `sv_airaccelerate` changes only what the client/demo is told, NOT server-authoritative air movement. Confirm whether client-prediction-only-by-design (matches QW's historical client physics) or a latent quirk. | open |
| 9 | physics-movement | `sv_maxspeed` / `sv_gravity` | mvdsv `sv_user.c:451`, `sv_user.c:458` | upstream-bug | low | Two in-source FIXMEs (`// FIXME: this does't work, Tonik?`): the `svc_playerinfo` writes send the global `movevars.maxspeed` / `movevars.entgravity` instead of the per-client values (`sv_client->maxspeed` / `->entgravity`, commented out). Per-player maxspeed/gravity overrides (e.g. KTX haste) are not transmitted to client prediction. | open |
| 10 | physics-movement | `sv_safestrafe` | mvdsv `server.h:396`, `sv_user.c:3591,3601` | upstream-bug | low | Struct field `client_t.safestrafe.pending_direction` is written at `sv_user.c:3591` and `:3601` but **never read** anywhere in the tree -- vestigial or incomplete safestrafe logic. Does not affect the documented behavior (other fields drive it). | open |
| 11 | physics-movement | `sv_maxspeed` | ktx `client.c:1844`, `ctf.c:750/840`, `runes.c:197`; engine `sv_user.c:889` | cross-mod/L3 | -- | KTX implements haste (CTF grapple / haste rune) by writing the QC entity `maxspeed` field; the engine honors it via `fofs_maxspeed` at `sv_user.c:889` (`sv_client->maxspeed = fofs_maxspeed ? EdictFieldFloat(...) : sv_maxspeed.value`). F-MV1 case (a): per-entity override path, the engine cvar still governs the default. -> L3 note on QW speed/haste. | open |
| 12 | physics-movement | `sv_nailhack` | mvdsv `sv_ents.c:44` | doc-nuance | low | Counterintuitive name+default: `sv_nailhack` default is **1**, and `1` **disables** the compact nail-packet encoding (`if ((int)sv_nailhack.value) return false;` skips `SV_AddNailUpdate`). The name reads as "enable a hack" but the default turns the bandwidth optimization OFF. Captured correctly in the L1 description; flagged so downstream readers aren't surprised. | open |
| 13 | physics-movement | (physics cvars, general) | -- | cross-mod/L3 | -- | Operator guidance to capture as L3: standard competitive QuakeWorld locks server physics (`sv_gravity` 800, `sv_accelerate` 10, `sv_friction` 4, `sv_maxspeed` 320, `sv_stopspeed` 100, ...) to fixed values; changing them yields a **non-standard** server with altered movement feel. The knobs exist for custom modes/experiments, but normal play should leave them at defaults. -> L3 concept-note candidate on QW server physics tuning. | open |
