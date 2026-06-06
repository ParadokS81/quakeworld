# describe-fill-synthesis ledger -- qtv `fp_persecond`

- **Project:** qtv
- **Knob:** `fp_persecond` (cvar) -- registered NAME string `"fp_persecond"`; read via `qtv.qvs.Get("fp_persecond").Int`.
- **Anchor version:** `1.16-dev` (`pkg/qtv/qtv.go:29` `qtvRelease`).
- **Registration:** `pkg/qtv/downstream_storage.go:210` `qtv.qvs.Reg("fp_persecond", "2")` -> default `"2"`, flags `[]` (locator aid only, NOT the citation).
- **Mechanical candidate:** none (cold-synth; no trailing comment at register site; `resources/qtv.cfg` is a HINT only -- SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live; do NOT dead-stamp).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:fp_persecond: synthesized -- cold-synth; the TIME WINDOW (in seconds, despite the name) of the downstream chat flood protection -- if fp_messages messages arrive within this many seconds the viewer is silenced; clamped 1..999999 -- traced to the Go read-site isSayFlood (downstream_client_commands.go:635-636), NOT paraphrased from C floodprot -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:636 anchor=1.16-dev
```

## D6 REJECT-LIST compliance (LOAD-BEARING -- NAME-SEMANTICS TRAP)

The C-QTV flood model is a single `floodprot` command (fteqtv/, D13 scope fence). The Go model is THREE cvars, all read in `isSayFlood` (`downstream_client_commands.go:621-649`). CRITICAL: the name `fp_persecond` strongly suggests a "messages per second" RATE, but the enforce-trace shows it is used as a **time window in seconds** (`fp_persecond*1000` ms at `:636`). The description states the TRACED semantics (a seconds window), NOT the name-implied rate. This is exactly the C-vs-Go semantics leak the rule guards against. No clause is paraphrased from C `floodprot`; the older-doc name `fp_limit` does NOT exist in Go QTV. Verified: `grep floodprot pkg/` = 0 hits.

## Final description (user-facing, D20 shape)

> Part of this QTV proxy's chat flood protection for downstream viewers. Despite its name, it sets a time window in seconds, not a per-second rate: if a viewer sends fp_messages chat messages and the oldest of them arrived less than this many seconds ago, the viewer is treated as flooding and is silenced for a period (set by fp_secondsdead). A larger value makes flood protection stricter (the same burst of messages counts as flooding over a longer span); a smaller value makes it more lenient. Values are limited to the range 1 to 999999 seconds.
>
> Default: 2.
> Set by: server config.
> See also: fp_messages, fp_secondsdead.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`fp_persecond` / `Get("fp_persecond")` / `isSayFlood`) over the whole `pkg/` tree. The cvar is read at exactly one `Get("fp_persecond")` call-site (`downstream_client_commands.go:635`), inside the shared flood-check `isSayFlood`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration (locator) | `pkg/qtv/downstream_storage.go:210` | `qtv.qvs.Reg("fp_persecond", "2")` -- default `"2"`, no flags |
| Read + clamp | `pkg/qtv/downstream_client_commands.go:635` | `fp_persecond := uint64(iBound(1, ds.qtv.qvs.Get("fp_persecond").Int, 999999))` -- clamps to `[1, 999999]` |
| Window comparison (the WINDOW role) | `pkg/qtv/downstream_client_commands.go:636` | `if sayTime != 0 && curTime-sayTime < fp_persecond*1000 {` -- `fp_persecond*1000` is a millisecond span; `curTime()` is `UnixMilli`, so this is a window in SECONDS |
| What `sayTime` is | `pkg/qtv/downstream_client_commands.go:623-624,648` | `idx := iBound(0, fp.lastCmd, maxFpCommands-1)` / `sayTime := fp.cmdTime[idx]` with `fp.lastCmd = (idx+1) % fp_messages` -- `sayTime` is the timestamp from `fp_messages` say-commands ago |
| Flood consequence | `pkg/qtv/downstream_client_commands.go:637-640` | inside the window-hit branch, the viewer is locked for `fp_secondsdead` seconds |
| Caller | `pkg/qtv/downstream_client_commands.go:652-659` | `isSayFlood` is invoked by `sayClientCmd` on each downstream `say` / `say_game` chat command |

## D5 rubric check (Step 3)

Cold-synth: register site `downstream_storage.go:210` has no trailing comment; no shipped-doc candidate -> nothing to affirm, but D5-amendment requires full evaluation. Behavior fully source-legible -> SYNTHESIZE. Step 2 N/A (not suspect-pool). Rubric: (1) admin-observable WHAT (the time window of downstream chat flood protection) -- not WHY; (2) not a name restatement -- and in fact actively CORRECTS the name's wrong implication; (3) numeric scalar with stated UNIT (seconds, explicitly distinguished from a rate) and range (1..999999), plus the direction of larger/smaller; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| It is part of DOWNSTREAM chat flood protection (semantic + scope) | `pkg/qtv/downstream_client_commands.go:620-622,655` | `// Returns true if 'ds' is flooding chat with say command.` / `func (ds *dStream) isSayFlood()` / (caller) `if flooder, err := ds.isSayFlood(); ...` | MATCH -- `ds` is a `dStream` (downstream); runs on each downstream say command. |
| It is a TIME WINDOW in SECONDS, not a per-second rate (semantic -- name-trap correction) | `pkg/qtv/downstream_client_commands.go:636` + `pkg/qtv/qtv.go:434-435` | `if sayTime != 0 && curTime-sayTime < fp_persecond*1000 {` ; `func curTime() uint64 { return uint64(time.Now().UnixMilli()) }` | MATCH -- `curTime-sayTime` is a millisecond duration; comparing it against `fp_persecond*1000` means `fp_persecond` is the window length in seconds. There is no division by a count anywhere, so it is NOT a rate. |
| Flood trips when the message `fp_messages` ago arrived within the window (interaction, polarity) | `pkg/qtv/downstream_client_commands.go:623-624,648,636` | `sayTime := fp.cmdTime[idx]` (idx tracks `fp.lastCmd`, advanced `(idx+1) % fp_messages`) compared `< fp_persecond*1000` | MATCH -- `sayTime` is the timestamp from `fp_messages` messages ago; if that span is under the window, the viewer sent `fp_messages` messages too fast. |
| Viewer silenced for a period on flood (side-effect, names companion) | `pkg/qtv/downstream_client_commands.go:637-640` | `fp_secondsdead := iBound(1, ds.qtv.qvs.Get("fp_secondsdead").Int, 999999)` / `fp.locked = curTime + 1000*fp_secondsdead` | MATCH -- the window-hit branch sets `fp.locked` `fp_secondsdead` seconds ahead. (Prose: "silenced for a period (set by fp_secondsdead)".) |
| Larger = stricter, smaller = more lenient (direction/polarity) | `pkg/qtv/downstream_client_commands.go:636` | `curTime-sayTime < fp_persecond*1000` | MATCH -- a larger `fp_persecond` makes the `< window` test true for a wider range of spans, so the same burst counts as flooding over a longer span (stricter); smaller is the converse. Derived directly from the inequality. |
| Range 1..999999 (threshold/clamp) | `pkg/qtv/downstream_client_commands.go:635` | `uint64(iBound(1, ds.qtv.qvs.Get("fp_persecond").Int, 999999))` | MATCH -- `iBound` floors at 1, caps at 999999 (`math.go:24-35`). |
| Default 2 (metadata, WI-2) | `pkg/qtv/downstream_storage.go:210` | `qtv.qvs.Reg("fp_persecond", "2")` | MATCH -- registered default literal is `"2"`. No shipped-cfg value substituted (SR-1). |
| Set by server config (metadata, WI-2 access-class) | `pkg/qtv/downstream_storage.go:210` | `qtv.qvs.Reg("fp_persecond", "2")` (no flags) | MATCH -- no serverinfo/init-only/read-only flag; QTV registers no `set` command (`var.go:85-87`), value from the config file at startup. |

V-pass self-classification of the produced text: **TRACED-CLEAN** -- every material clause maps to a located, verified enforcing line. The load-bearing clause (it is a SECONDS WINDOW, not a rate) is traced to the `*1000`-vs-`UnixMilli` arithmetic at `:636` + `qtv.go:434`, NOT inferred from the name. No clause is paraphrased from C `floodprot` (D6).

## D20 split note

All file:line / Go identifiers (`isSayFlood`, `sayClientCmd`, `fp.cmdTime`, `fp.lastCmd`, `fp.locked`, `curTime`, `UnixMilli`, `iBound`, `Get(...).Int`, `Reg`) stay OUT of `description` and live in `description_reasoning` + this human table. The `description` prose carries zero file:line and zero engine jargon. The companion cvars `fp_messages` / `fp_secondsdead` are named inline (and in `See also:`) -- same-codebase cross-reference, the window is meaningless without the count and the silence duration. The phrase "despite its name" is an admin-facing clarification of observable behavior, not a code-trace leak.

## description_provenance

`null` -- cold-synth. Per operator clarification 2026-05-30, `description_provenance` holds retained shipped-doc DATA only; this row has no shipped doc / trailing comment. Grounding is `source_ref` + anchor + the reasoning cites.

## Rationale

Cold-synth from fully-legible use-sites. `fp_persecond` is read once, in `isSayFlood` (`downstream_client_commands.go:621-649`), the chat flood-check run on every downstream `say`/`say_game`. Its role is the WINDOW: at `:636`, `curTime-sayTime < fp_persecond*1000`. Because `curTime()` returns `time.Now().UnixMilli()` (`qtv.go:434-435`), `curTime-sayTime` is a millisecond duration, so `fp_persecond*1000` makes `fp_persecond` a window length in SECONDS. The name "per second" is misleading -- there is no per-count division anywhere; it is not a rate. `sayTime` is the timestamp from `fp_messages` messages ago (the ring `fp.cmdTime[]` advanced `% fp_messages` at `:648`), so the test means "did the last `fp_messages` messages arrive within `fp_persecond` seconds." If so, the viewer is silenced for `fp_secondsdead` seconds (`:637-638`). Direction: a larger `fp_persecond` widens the span over which a given burst counts as flooding (stricter); smaller is more lenient -- read straight off the `<` inequality. Clamped `[1, 999999]` (`:635`).

D6 (LOAD-BEARING, name-semantics trap): the C-QTV `floodprot` is a single command with a different param model (fteqtv/, D13); ABSENT from Go QTV (`grep floodprot pkg/` = 0). The older-doc name `fp_limit` does not exist. This description was synthesized strictly from the Go read-site arithmetic; the name's rate implication and the C `floodprot` semantics were both rejected in favor of the traced seconds-window meaning.

WI-2: registered default literal is `"2"` (`downstream_storage.go:210`). Set-by is server config -- no flags, QTV registers no `set` command (`var.go:85-87`), value from the config file at startup. SR-1: `resources/qtv.cfg` is a hint only.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing compare/clamp incl. the units arithmetic; the name was actively corrected by the trace; nothing paraphrased from C. No SR-5 breadcrumb (the flood triplet is not one of the three concept-note candidates).

## D6Record

```json
{
  "project": "qtv",
  "knob": "fp_persecond",
  "type": "cvar",
  "description": "Part of this QTV proxy's chat flood protection for downstream viewers. Despite its name, it sets a time window in seconds, not a per-second rate: if a viewer sends fp_messages chat messages and the oldest of them arrived less than this many seconds ago, the viewer is treated as flooding and is silenced for a period (set by fp_secondsdead). A larger value makes flood protection stricter (the same burst of messages counts as flooding over a longer span); a smaller value makes it more lenient. Values are limited to the range 1 to 999999 seconds.\n\nDefault: 2.\nSet by: server config.\nSee also: fp_messages, fp_secondsdead.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment at registration pkg/qtv/downstream_storage.go:210 qtv.qvs.Reg(\"fp_persecond\", \"2\"); no shipped-doc candidate -> nothing to affirm; use-site fully source-legible so synthesize). Read once in isSayFlood pkg/qtv/downstream_client_commands.go:621-649 (caller sayClientCmd :652-659, runs on each downstream say/say_game; ds is a dStream = downstream). NAME-SEMANTICS TRAP (D6 load-bearing): role is the WINDOW, not a rate -- at :636 curTime-sayTime < fp_persecond*1000; curTime() = time.Now().UnixMilli() (qtv.go:434-435), so curTime-sayTime is a ms duration and fp_persecond*1000 makes fp_persecond a window in SECONDS; there is NO per-count division anywhere, so 'per second' in the name is misleading -> described as a seconds window per the trace, not the name. sayTime is the timestamp from fp_messages messages ago (ring fp.cmdTime[] advanced % fp_messages :648), so the test = 'did the last fp_messages messages arrive within fp_persecond seconds'; if so viewer silenced fp_secondsdead seconds (:637-638 fp.locked). Direction: larger fp_persecond widens the span over which a burst counts as flooding (stricter), smaller is lenient -- read off the < inequality. Clamp [1, 999999] (:635; iBound math.go:24-35). D6: C-QTV floodprot is a single command, different param model (fteqtv/, D13), ABSENT from Go QTV (grep floodprot pkg/ = 0); older-doc name fp_limit does NOT exist; synthesized strictly from Go read-site arithmetic, both the name's rate implication and C floodprot semantics rejected for the traced seconds-window meaning. WI-2: default literal '2' (:210); Set-by server config -- no flags, QTV registers no 'set' command (var.go:85-87), value from config file at startup. SR-1: resources/qtv.cfg is a hint only. V-pass self-classification TRACED-CLEAN; load-bearing seconds-window clause traced to *1000-vs-UnixMilli arithmetic, not the name. suspect_pool_member FALSE -> not dead-stamped. provenance=null (cold-synth, operator 2026-05-30). Companion cvars fp_messages/fp_secondsdead named inline + See-also (same-codebase cross-ref). No SR-5 breadcrumb (flood triplet is not one of the 3 concept-note candidates).",
  "description_proposed": null
}
```
