# describe-fill-synthesis ledger -- qtv `fp_secondsdead`

- **Project:** qtv
- **Knob:** `fp_secondsdead` (cvar) -- registered NAME string `"fp_secondsdead"`; read via `qtv.qvs.Get("fp_secondsdead").Int`.
- **Anchor version:** `1.16-dev` (`pkg/qtv/qtv.go:29` `qtvRelease`).
- **Registration:** `pkg/qtv/downstream_storage.go:211` `qtv.qvs.Reg("fp_secondsdead", "2")` -> default `"2"`, flags `[]` (locator aid only, NOT the citation).
- **Mechanical candidate:** none (cold-synth; no trailing comment at register site; `resources/qtv.cfg` is a HINT only -- SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live; do NOT dead-stamp).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:fp_secondsdead: synthesized -- cold-synth; the SILENCE DURATION (in seconds) of the downstream chat flood protection -- how long a viewer judged to be flooding is blocked from chatting; clamped 1..999999 -- traced to the Go read-site isSayFlood (downstream_client_commands.go:637-638), NOT paraphrased from C floodprot -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:638 anchor=1.16-dev
```

## D6 REJECT-LIST compliance (LOAD-BEARING)

The C-QTV flood model is a single `floodprot` command (fteqtv/, D13 scope fence). The Go model is THREE cvars, all read in `isSayFlood` (`downstream_client_commands.go:621-649`). This description is sourced ENTIRELY from the Go `fp_secondsdead` read-site (the lock-duration assignment); no clause is paraphrased from C `floodprot`. The older-doc name `fp_message` (singular) does NOT exist in Go QTV. Verified: `grep floodprot pkg/` = 0 hits.

## Final description (user-facing, D20 shape)

> Part of this QTV proxy's chat flood protection for downstream viewers. It sets how many seconds a viewer who has been judged to be flooding chat is silenced -- during that time the viewer's chat messages are blocked and they are told how many seconds remain. The countdown begins at the moment flooding is detected (set by fp_messages and fp_persecond). Values are limited to the range 1 to 999999 seconds.
>
> Default: 2.
> Set by: server config.
> See also: fp_messages, fp_persecond.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`fp_secondsdead` / `Get("fp_secondsdead")` / `fp.locked` / `isSayFlood`) over the whole `pkg/` tree. The cvar is read at exactly one `Get("fp_secondsdead")` call-site (`downstream_client_commands.go:637`), inside the shared flood-check `isSayFlood`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration (locator) | `pkg/qtv/downstream_storage.go:211` | `qtv.qvs.Reg("fp_secondsdead", "2")` -- default `"2"`, no flags |
| Read + clamp | `pkg/qtv/downstream_client_commands.go:637` | `fp_secondsdead := uint64(iBound(1, ds.qtv.qvs.Get("fp_secondsdead").Int, 999999))` -- clamps to `[1, 999999]` |
| Lock assignment (the SILENCE-DURATION role) | `pkg/qtv/downstream_client_commands.go:638` | `fp.locked = curTime + 1000*fp_secondsdead` -- on flood, the lock expiry is set `fp_secondsdead` seconds ahead (`*1000` ms; `curTime()` is `UnixMilli`) |
| Detection trigger (when the countdown starts) | `pkg/qtv/downstream_client_commands.go:635-636` | the lock is set only inside the window-hit branch (`if sayTime != 0 && curTime-sayTime < fp_persecond*1000`) -- i.e. when `fp_messages`/`fp_persecond` judge a flood |
| Lock enforcement (while silenced) | `pkg/qtv/downstream_client_commands.go:627-632` | `if fp.locked > curTime { seconds := (fp.locked - curTime) / 1000; ... "You can't talk for %v more seconds" ... return true }` -- while locked, says are blocked and remaining seconds are reported |
| Flood-time notice | `pkg/qtv/downstream_client_commands.go:640` | `ds.svcPrintf(printChat, "FloodProt: You can't talk for %v more seconds\n", fp_secondsdead)` -- the viewer is told the silence length at the moment of detection |
| Caller | `pkg/qtv/downstream_client_commands.go:652-659` | `isSayFlood` is invoked by `sayClientCmd` on each downstream `say` / `say_game` chat command |

## D5 rubric check (Step 3)

Cold-synth: register site `downstream_storage.go:211` has no trailing comment; no shipped-doc candidate -> nothing to affirm, but D5-amendment requires full evaluation. Behavior fully source-legible -> SYNTHESIZE. Step 2 N/A (not suspect-pool). Rubric: (1) admin-observable WHAT (the silence duration of downstream chat flood protection) -- not WHY; (2) not a name restatement -- spells what "dead" means here (chat silenced) and when the countdown starts; (3) numeric scalar with stated UNIT (seconds) and range (1..999999); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| It is part of DOWNSTREAM chat flood protection (semantic + scope) | `pkg/qtv/downstream_client_commands.go:620-622,655` | `// Returns true if 'ds' is flooding chat with say command.` / `func (ds *dStream) isSayFlood()` / (caller) `if flooder, err := ds.isSayFlood(); ...` | MATCH -- `ds` is a `dStream` (downstream); runs on each downstream say command. |
| It is the SILENCE DURATION in seconds (semantic) | `pkg/qtv/downstream_client_commands.go:638` + `pkg/qtv/qtv.go:434-435` | `fp.locked = curTime + 1000*fp_secondsdead` ; `func curTime() uint64 { return uint64(time.Now().UnixMilli()) }` | MATCH -- `fp.locked` (a `UnixMilli` instant) is set `1000*fp_secondsdead` ms ahead, i.e. `fp_secondsdead` seconds into the future; that instant is the silence expiry. |
| During silence, chat is blocked and remaining seconds reported (side-effect) | `pkg/qtv/downstream_client_commands.go:627-632` | `if fp.locked > curTime { seconds := (fp.locked - curTime) / 1000 ... "You can't talk for %v more seconds\n" ... return true, nil }` | MATCH -- while `fp.locked > curTime`, `isSayFlood` returns true (the say is dropped by `sayClientCmd` `:655-658`) and the remaining seconds are printed. |
| Countdown starts at flood detection, governed by fp_messages/fp_persecond (interaction) | `pkg/qtv/downstream_client_commands.go:635-638` | `if sayTime != 0 && curTime-sayTime < fp_persecond*1000 { fp_secondsdead := ...; fp.locked = curTime + 1000*fp_secondsdead` | MATCH -- the lock is assigned only inside the window-hit branch, which is gated by `fp_messages` (via `sayTime`) and `fp_persecond` (the window); so the countdown begins exactly when those two judge a flood. |
| Viewer told the silence length at detection (side-effect) | `pkg/qtv/downstream_client_commands.go:640` | `ds.svcPrintf(printChat, "FloodProt: You can't talk for %v more seconds\n", fp_secondsdead)` | MATCH -- `fp_secondsdead` is printed to the viewer when the flood is first detected. |
| Range 1..999999 (threshold/clamp) | `pkg/qtv/downstream_client_commands.go:637` | `uint64(iBound(1, ds.qtv.qvs.Get("fp_secondsdead").Int, 999999))` | MATCH -- `iBound` floors at 1, caps at 999999 (`math.go:24-35`). |
| Default 2 (metadata, WI-2) | `pkg/qtv/downstream_storage.go:211` | `qtv.qvs.Reg("fp_secondsdead", "2")` | MATCH -- registered default literal is `"2"`. No shipped-cfg value substituted (SR-1). |
| Set by server config (metadata, WI-2 access-class) | `pkg/qtv/downstream_storage.go:211` | `qtv.qvs.Reg("fp_secondsdead", "2")` (no flags) | MATCH -- no serverinfo/init-only/read-only flag; QTV registers no `set` command (`var.go:85-87`), value from the config file at startup. |

V-pass self-classification of the produced text: **TRACED-CLEAN** -- every material clause maps to a located, verified enforcing line (incl. the `*1000`-vs-`UnixMilli` units confirmation and the lock-enforcement print at `:627-632`). No clause derives only from the knob name, an announce string, an enum name, or a config comment. No clause is paraphrased from C `floodprot` (D6). NOTE: the user-visible string "You can't talk for %v more seconds" corroborates but is NOT the basis of the duration clause -- the duration is traced to the `fp.locked` assignment arithmetic, not to the string (announce-string-only inference is forbidden).

## D20 split note

All file:line / Go identifiers (`isSayFlood`, `sayClientCmd`, `fp.locked`, `svcPrintf`, `curTime`, `UnixMilli`, `iBound`, `Get(...).Int`, `Reg`) stay OUT of `description` and live in `description_reasoning` + this human table. The `description` prose carries zero file:line and zero engine jargon. The companion cvars `fp_messages` / `fp_persecond` are named inline (and in `See also:`) -- same-codebase cross-reference; the silence duration only makes sense alongside what triggers it.

## description_provenance

`null` -- cold-synth. Per operator clarification 2026-05-30, `description_provenance` holds retained shipped-doc DATA only; this row has no shipped doc / trailing comment. Grounding is `source_ref` + anchor + the reasoning cites.

## Rationale

Cold-synth from fully-legible use-sites. `fp_secondsdead` is read once, in `isSayFlood` (`downstream_client_commands.go:621-649`), the chat flood-check run on every downstream `say`/`say_game`. Its role is the SILENCE DURATION: at `:638`, `fp.locked = curTime + 1000*fp_secondsdead`. Since `curTime()` is `time.Now().UnixMilli()` (`qtv.go:434-435`), `fp.locked` is set `fp_secondsdead` seconds into the future, and that instant is the silence expiry. The assignment happens only inside the window-hit branch (`:635-636`), so the countdown begins exactly when `fp_messages`/`fp_persecond` judge a flood. While the lock holds (`:627-632`, `fp.locked > curTime`), `isSayFlood` returns true so the say is dropped (`sayClientCmd` `:655-658`) and the viewer is shown the remaining seconds; at detection the viewer is also told the full silence length (`:640`). Clamped `[1, 999999]` (`:637`).

D6 (LOAD-BEARING): the C-QTV `floodprot` is a single command with a different param model (fteqtv/, D13); ABSENT from Go QTV (`grep floodprot pkg/` = 0). The older-doc name `fp_message` (singular) does not exist. This description was synthesized strictly from the Go `fp.locked` assignment; the C `floodprot` semantics were NOT paraphrased. The on-screen "You can't talk for ... seconds" strings corroborate but are not the basis of the duration clause (announce-string-only inference is forbidden -- the duration is traced to the arithmetic).

WI-2: registered default literal is `"2"` (`downstream_storage.go:211`). Set-by is server config -- no flags, QTV registers no `set` command (`var.go:85-87`), value from the config file at startup. SR-1: `resources/qtv.cfg` is a hint only.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing assignment/compare/clamp incl. the units arithmetic; no clause rests on the cvar name, the announce string, an enum, or a config comment; nothing paraphrased from C. No SR-5 breadcrumb (the flood triplet is not one of the three concept-note candidates).

## D6Record

```json
{
  "project": "qtv",
  "knob": "fp_secondsdead",
  "type": "cvar",
  "description": "Part of this QTV proxy's chat flood protection for downstream viewers. It sets how many seconds a viewer who has been judged to be flooding chat is silenced -- during that time the viewer's chat messages are blocked and they are told how many seconds remain. The countdown begins at the moment flooding is detected (set by fp_messages and fp_persecond). Values are limited to the range 1 to 999999 seconds.\n\nDefault: 2.\nSet by: server config.\nSee also: fp_messages, fp_persecond.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment at registration pkg/qtv/downstream_storage.go:211 qtv.qvs.Reg(\"fp_secondsdead\", \"2\"); no shipped-doc candidate -> nothing to affirm; use-site fully source-legible so synthesize). Read once in isSayFlood pkg/qtv/downstream_client_commands.go:621-649 (caller sayClientCmd :652-659, runs on each downstream say/say_game; ds is a dStream = downstream). Role = SILENCE DURATION: at :638 fp.locked = curTime + 1000*fp_secondsdead; curTime() = time.Now().UnixMilli() (qtv.go:434-435), so fp.locked is set fp_secondsdead seconds ahead = the silence expiry. Assigned only inside the window-hit branch (:635-636), so countdown begins exactly when fp_messages/fp_persecond judge a flood. While locked (:627-632 fp.locked > curTime) isSayFlood returns true so the say is dropped (sayClientCmd :655-658) and remaining seconds shown; at detection the viewer is told the full length (:640 'FloodProt: You can't talk for %v more seconds'). Clamp [1, 999999] (:637; iBound math.go:24-35). D6 (LOAD-BEARING): C-QTV floodprot is a single command, different param model (fteqtv/, D13), ABSENT from Go QTV (grep floodprot pkg/ = 0); older-doc name fp_message (singular) does NOT exist; synthesized strictly from Go fp.locked assignment, C floodprot NOT paraphrased. The on-screen 'You can't talk for ... seconds' strings corroborate but are NOT the basis of the duration clause (announce-string-only inference forbidden; duration traced to the arithmetic). WI-2: default literal '2' (:211); Set-by server config -- no flags, QTV registers no 'set' command (var.go:85-87), value from config file at startup. SR-1: resources/qtv.cfg is a hint only. V-pass self-classification TRACED-CLEAN; no clause from name/enum/string/comment alone. suspect_pool_member FALSE -> not dead-stamped. provenance=null (cold-synth, operator 2026-05-30). Companion cvars fp_messages/fp_persecond named inline + See-also (same-codebase cross-ref). No SR-5 breadcrumb (flood triplet is not one of the 3 concept-note candidates).",
  "description_proposed": null
}
```
