# describe-fill-synthesis ledger -- qtv `fp_messages`

- **Project:** qtv
- **Knob:** `fp_messages` (cvar) -- registered NAME string `"fp_messages"`; read via `qtv.qvs.Get("fp_messages").Int`.
- **Anchor version:** `1.16-dev` (`pkg/qtv/qtv.go:29` `qtvRelease`).
- **Registration:** `pkg/qtv/downstream_storage.go:209` `qtv.qvs.Reg("fp_messages", "4")` -> default `"4"`, flags `[]` (locator aid only, NOT the citation).
- **Mechanical candidate:** none (cold-synth; no trailing comment at register site; `resources/qtv.cfg` is a HINT only -- SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live; do NOT dead-stamp).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:fp_messages: synthesized -- cold-synth; the message-count threshold of the downstream chat flood protection (how many chat messages within the fp_persecond window trip a silence); clamped 1..10 -- traced to the Go read-site isSayFlood (downstream_client_commands.go:647-648), NOT paraphrased from C floodprot -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:647 anchor=1.16-dev
```

## D6 REJECT-LIST compliance (LOAD-BEARING)

The C-QTV flood model is a single `floodprot` command with its own param shape (fteqtv/, D13 scope fence). The Go model is THREE separate cvars (`fp_messages` / `fp_persecond` / `fp_secondsdead`), all read in `isSayFlood` (`downstream_client_commands.go:621-649`). This description is sourced ENTIRELY from the Go `fp_messages` read-site; no clause is paraphrased from C `floodprot`. The older-doc names `fp_time/fp_limit/fp_message` do NOT exist in Go QTV (`grep` confirms only `fp_messages`/`fp_persecond`/`fp_secondsdead`). Verified: `grep floodprot pkg/` = 0 hits.

## Final description (user-facing, D20 shape)

> Part of this QTV proxy's chat flood protection for downstream viewers. It sets how many chat messages a viewer may send within the time window before being treated as flooding. If a viewer sends this many messages and the oldest of them was within the window (set by fp_persecond), the viewer is silenced for a period (set by fp_secondsdead). Values are limited to the range 1 to 10.
>
> Default: 4.
> Set by: server config.
> See also: fp_persecond, fp_secondsdead.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`fp_messages` / `Get("fp_messages")` / `maxFpCommands` / `isSayFlood` / `floodProtect`) over the whole `pkg/` tree. The cvar is read at exactly one `Get("fp_messages")` call-site (`downstream_client_commands.go:647`), inside the shared flood-check `isSayFlood`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration (locator) | `pkg/qtv/downstream_storage.go:209` | `qtv.qvs.Reg("fp_messages", "4")` -- default `"4"`, no flags |
| Read + clamp | `pkg/qtv/downstream_client_commands.go:647` | `fp_messages := iBound(1, ds.qtv.qvs.Get("fp_messages").Int, maxFpCommands)` -- clamps to `[1, maxFpCommands]` |
| Clamp ceiling | `pkg/qtv/downstream_client_commands.go:609-611` | `const ( maxFpCommands = 10 )` -- upper bound and the ring-buffer size |
| Window advance (count role) | `pkg/qtv/downstream_client_commands.go:646-648` | `fp.cmdTime[idx] = curTime` / `fp.lastCmd = (idx + 1) % fp_messages` -- the say-timestamp ring advances modulo `fp_messages`, so the comparison at `:636` looks back exactly `fp_messages` messages |
| Flood test it feeds | `pkg/qtv/downstream_client_commands.go:623-624,636` | `idx := iBound(0, fp.lastCmd, maxFpCommands-1)` / `sayTime := fp.cmdTime[idx]` / `if sayTime != 0 && curTime-sayTime < fp_persecond*1000` -- `sayTime` is the timestamp from `fp_messages` messages ago; if that span is under the window, it is flood |
| Caller | `pkg/qtv/downstream_client_commands.go:652-659` | `isSayFlood` is invoked by `sayClientCmd` on each downstream `say` / `say_game` chat command |

## D5 rubric check (Step 3)

Cold-synth: register site `downstream_storage.go:209` has no trailing comment; no shipped-doc candidate -> nothing to affirm, but D5-amendment requires full evaluation. Behavior fully source-legible -> SYNTHESIZE. Step 2 N/A (not suspect-pool). Rubric: (1) admin-observable WHAT (the message-count threshold of downstream chat flood protection) -- not WHY; (2) not a name restatement -- spells what it counts and how it interacts with the window and the silence; (3) numeric scalar with a stated range (1..10) and stated unit (chat messages); (4) mechanism only, no recommended value; (5) self-contained without source (the companion cvars are named so the reader can find them). All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| It is part of DOWNSTREAM chat flood protection (semantic + scope) | `pkg/qtv/downstream_client_commands.go:620-622,655` | `// Returns true if 'ds' is flooding chat with say command.` / `func (ds *dStream) isSayFlood()` / (caller) `if flooder, err := ds.isSayFlood(); ...` in `sayClientCmd` | MATCH -- `ds` is a `dStream` (downstream connection); `isSayFlood` runs on each downstream say command; the cvar is read only here. |
| It is the message-COUNT threshold (semantic) | `pkg/qtv/downstream_client_commands.go:646-648` + `:636` | `fp.cmdTime[idx] = curTime` / `fp.lastCmd = (idx + 1) % fp_messages` feeding `if sayTime != 0 && curTime-sayTime < fp_persecond*1000` | MATCH -- `lastCmd` advances `% fp_messages`, so `cmdTime[idx]` read at `:624` holds the timestamp from `fp_messages` say-commands ago; the flood test compares NOW against that timestamp. Thus `fp_messages` is how many messages span the window before a flood can trip. |
| Flood trips only if those messages fall within the window (interaction, polarity) | `pkg/qtv/downstream_client_commands.go:636` | `if sayTime != 0 && curTime-sayTime < fp_persecond*1000 {` | MATCH -- the older message's age must be strictly less than `fp_persecond` seconds (`*1000` ms; `curTime()` is `UnixMilli`, `qtv.go:434-435`) for the flood branch. |
| Flood -> viewer silenced for a period (side-effect, names companion) | `pkg/qtv/downstream_client_commands.go:637-640` | `fp_secondsdead := iBound(1, ds.qtv.qvs.Get("fp_secondsdead").Int, 999999)` / `fp.locked = curTime + 1000*fp_secondsdead` | MATCH -- on flood, `fp.locked` is set `fp_secondsdead` seconds ahead; while `fp.locked > curTime` (`:627`) further says are blocked. (Stated in prose only as "silenced for a period (set by fp_secondsdead)".) |
| Range 1..10 (threshold/clamp) | `pkg/qtv/downstream_client_commands.go:647` + `:609-611` | `iBound(1, ds.qtv.qvs.Get("fp_messages").Int, maxFpCommands)` with `const ( maxFpCommands = 10 )` | MATCH -- `iBound` floors at 1 and caps at `maxFpCommands = 10` (`math.go:24-35`). |
| Default 4 (metadata, WI-2) | `pkg/qtv/downstream_storage.go:209` | `qtv.qvs.Reg("fp_messages", "4")` | MATCH -- registered default literal is `"4"`. No shipped-cfg value substituted (SR-1). |
| Set by server config (metadata, WI-2 access-class) | `pkg/qtv/downstream_storage.go:209` | `qtv.qvs.Reg("fp_messages", "4")` (no flags; `Reg` registers flags `0`) | MATCH -- no serverinfo/init-only/read-only flag; QTV registers no `set` command (`var.go:85-87`), so the value comes from the config file at startup. |

V-pass self-classification of the produced text: **TRACED-CLEAN** -- every material clause maps to a located, verified enforcing line (incl. the function-doc comment at `:620` and the `% fp_messages` window-advance at `:648`). No clause derives only from the knob name, an announce string, an enum name, or a config comment. No clause is paraphrased from C `floodprot` (D6).

## D20 split note

All file:line / Go identifiers (`isSayFlood`, `sayClientCmd`, `fp.cmdTime`, `fp.lastCmd`, `fp.locked`, `maxFpCommands`, `iBound`, `curTime`, `Get(...).Int`, `Reg`) stay OUT of `description` and live in `description_reasoning` + this human table. The `description` prose carries zero file:line and zero engine jargon. "downstream viewers", "chat messages", "silenced", "window" are admin-facing terms. The companion cvars `fp_persecond` / `fp_secondsdead` are named inline (and in `See also:`) because the threshold is meaningless without them -- this is same-codebase cross-reference, not a cross-engine consequence.

## description_provenance

`null` -- cold-synth. Per operator clarification 2026-05-30, `description_provenance` holds retained shipped-doc DATA only; this row has no shipped doc / trailing comment. Grounding is `source_ref` + anchor + the reasoning cites.

## Rationale

Cold-synth from fully-legible use-sites. `fp_messages` is read once, in `isSayFlood` (`downstream_client_commands.go:621-649`), the chat flood-check run on every downstream `say`/`say_game` (caller `sayClientCmd` `:652-659`). The Go flood model is a sliding window over a ring buffer `fp.cmdTime[maxFpCommands]` of say timestamps. `fp_messages` plays the COUNT role: `fp.lastCmd` advances `(idx+1) % fp_messages` (`:648`), so the slot read at `:624` (`sayTime := fp.cmdTime[idx]`) holds the timestamp from `fp_messages` say-commands ago. The flood test `:636` (`curTime-sayTime < fp_persecond*1000`) then asks whether those `fp_messages` messages all arrived within `fp_persecond` seconds; if so, the viewer is silenced for `fp_secondsdead` seconds (`:637-638`, `fp.locked`). Clamped to `[1, maxFpCommands=10]` (`:647`, `:609-611`).

D6 (LOAD-BEARING): the C-QTV `floodprot` is a single command with a different param model (fteqtv/, D13); it is ABSENT from Go QTV (`grep floodprot pkg/` = 0). The older planning-doc names `fp_time/fp_limit/fp_message` also do not exist (the Go triplet is `fp_messages`/`fp_persecond`/`fp_secondsdead`). This description was synthesized strictly from the Go `fp_messages` read-site in `isSayFlood`; the C `floodprot` semantics were NOT paraphrased.

WI-2: registered default literal is `"4"` (`downstream_storage.go:209`). Set-by is server config -- no flags, QTV registers no `set` command (`var.go:85-87`), value from the config file at startup. SR-1: `resources/qtv.cfg` is a hint only.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing assignment/compare/clamp incl. adjacent comments; no clause rests on the cvar name, an enum/string, or a config comment; nothing paraphrased from C. No SR-5 breadcrumb (the flood triplet is not one of the three identified concept-note candidates).

## D6Record

```json
{
  "project": "qtv",
  "knob": "fp_messages",
  "type": "cvar",
  "description": "Part of this QTV proxy's chat flood protection for downstream viewers. It sets how many chat messages a viewer may send within the time window before being treated as flooding. If a viewer sends this many messages and the oldest of them was within the window (set by fp_persecond), the viewer is silenced for a period (set by fp_secondsdead). Values are limited to the range 1 to 10.\n\nDefault: 4.\nSet by: server config.\nSee also: fp_persecond, fp_secondsdead.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment at registration pkg/qtv/downstream_storage.go:209 qtv.qvs.Reg(\"fp_messages\", \"4\"); no shipped-doc candidate -> nothing to affirm; use-site fully source-legible so synthesize). Read once in isSayFlood pkg/qtv/downstream_client_commands.go:621-649 (caller sayClientCmd :652-659, runs on each downstream say/say_game; ds is a dStream = downstream connection). Go flood model = sliding window over ring buffer fp.cmdTime[maxFpCommands] of say timestamps. fp_messages = COUNT role: fp.lastCmd advances (idx+1) % fp_messages (:648), so cmdTime[idx] read at :624 holds the timestamp from fp_messages say-commands ago; flood test :636 (curTime-sayTime < fp_persecond*1000; curTime UnixMilli qtv.go:434-435) asks whether those fp_messages messages arrived within fp_persecond seconds; if so viewer silenced fp_secondsdead seconds (:637-638 fp.locked). Clamp [1, maxFpCommands=10] (:647 + const :609-611; iBound math.go:24-35). D6 (LOAD-BEARING): C-QTV floodprot is a single command, different param model (fteqtv/, D13), ABSENT from Go QTV (grep floodprot pkg/ = 0); older-doc names fp_time/fp_limit/fp_message do NOT exist (Go triplet is fp_messages/fp_persecond/fp_secondsdead); synthesized strictly from Go read-site, C floodprot NOT paraphrased. WI-2: default literal '4' (:209); Set-by server config -- no flags, QTV registers no 'set' command (var.go:85-87), value from config file at startup. SR-1: resources/qtv.cfg is a hint only. V-pass self-classification TRACED-CLEAN; no clause from name/enum/string/comment alone. suspect_pool_member FALSE -> not dead-stamped. provenance=null (cold-synth, operator 2026-05-30). Companion cvars fp_persecond/fp_secondsdead named inline + See-also (same-codebase cross-ref, threshold meaningless without them; not a cross-engine consequence). No SR-5 breadcrumb (flood triplet is not one of the 3 concept-note candidates).",
  "description_proposed": null
}
```
