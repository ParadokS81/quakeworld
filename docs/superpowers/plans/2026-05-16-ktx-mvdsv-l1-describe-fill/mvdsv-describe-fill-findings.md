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
