# describe-fill-synthesis ledger -- mvdsv `extralogname`

- **project:** mvdsv
- **knob:** `extralogname` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:extralogname: synthesized -- engine-written current-extra-MVD-log name, set by easyrecord, not an admin knob -- origin=synthesized ref=src/sv_demo.c:1828 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Holds the path of an extra per-match log file. When the easyrecord command (sv_demoeasyrecord) starts a recording, the server writes a <demo-directory>/<demoname>.xml path into this cvar; an external consumer -- the game mod, e.g. KTX -- then reads that path and writes its match-stats log there. mvdsv itself never reads the value, and does not clear it when recording stops: it keeps the last demo's path until the next easyrecord (the mod clears it at match end).
>
> Default: unset.
> Set by: engine (written by the easyrecord command; mvdsv does not read it).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| engine writes the value when recording starts | src/sv_demo.c:1828 | `Cvar_Set(&extralogname, name4);` (in SV_MVDEasyRecord_f) | MATCH |
| value is the per-demo .xml stats-log path | src/sv_demo.c:1827 | `snprintf(name4, ..., va("%s/%s.xml", sv_demoDir.string, name4));` | MATCH |
| written immediately before recording begins | src/sv_demo.c:1830 | `SV_MVD_Record (SV_InitRecordFile(name2), false);` | MATCH |
| Default 'unset' (registered placeholder) | src/sv_demo.c:56 | `cvar_t extralogname = {"extralogname", "unset"};` | MATCH |
| consumed (not set) by KTX log layer | ktx/src/logs.c:119 | `log_open("%s", cvar_string("extralogname"));` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | File:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | "Holds the filename of the current extra match log" (a path string) | src/sv_demo.c:1827-1828 | `snprintf(name4,...,va("%s/%s.xml", sv_demoDir.string, name4)); Cvar_Set(&extralogname, name4);` | MATCH (holds a `<demoDir>/<name>.xml` path) |
| 2 | "that the server writes alongside an MVD recording" | (no mvdsv site) writer is ktx/src/logs.c:119 | mvdsv: no read of extralogname anywhere. KTX: `log_open("%s", cvar_string("extralogname"));` then writes `<ktxlog>` XML | MISMATCH — mvdsv never reads it and writes no log; the writer is KTX (out of mvdsv scope) |
| 3 | "fills this in automatically when it starts recording (using the easyrecord/auto-record path)" | src/sv_demo.c:1743,1828 vs 1695 | set inside `SV_MVDEasyRecord_f`; generic `SV_MVD_Record_f` (1695) does NOT set it | MATCH — correctly scoped to easyrecord/sv_demoeasyrecord only |
| 4 | "pointing it at the matching .xml stats-log for that demo" | src/sv_demo.c:1827 | `va("%s/%s.xml", sv_demoDir.string, name4)` — demoDir-relative (NOT fs_gamedir-prefixed, unlike the .mvd at 1826), same base name as the demo | MATCH on path geometry; "stats-log" content semantic is enforced only in KTX (logs.c:120-132 emits `<ktxlog>`) |
| 5 | "maintained by the server, not a value you set" | src/sv_demo.c:56; src/cvar.c:134 | decl `{"extralogname","unset"}` has no CVAR_ROM; `Cvar_Set` blocks only `(var->flags & CVAR_ROM)` so a user `set extralogname x` succeeds; written via plain Cvar_Set not Cvar_SetROM | MISMATCH (soft) — cvar is freely writable; "not a value you set" is overstated. Defensible only because mvdsv never reads it, so a manual set is inert in mvdsv |
| 6 | "the recorder overwrites it each time recording begins" | src/sv_demo.c:1828 | `Cvar_Set(&extralogname, name4)` | MATCH — but only for easyrecord (inherits clause-3 scope), not generic record |
| 7 | "Default: unset" | src/sv_demo.c:56 | `cvar_t extralogname = {"extralogname", "unset"};` | MATCH — registered default literal is the string "unset" |
| 8 | "(no recording active)" gloss on the default | src/sv_demo.c:923-1009 (SV_MVDStop) | SV_MVDStop never touches extralogname; only `Cvar_SetROM(&serverdemo,"")` at 1002/964. No mvdsv site ever resets extralogname to "unset". KTX clears it to "" at match.c:2353 | MISMATCH — the value does NOT track recording state in mvdsv: after the first easyrecord it permanently holds the last .xml path even when idle. "unset == no recording active" is contradicted |
| 9 | "Set by: engine (filled in automatically when MVD recording starts)" | src/sv_demo.c:1828 | `Cvar_Set(&extralogname, name4)` in easyrecord | MATCH — engine sets it, via the easyrecord path |

**V-pass notes:** Oracle confirmed mvdsv @ 1.11-53-g18d0362. extralogname has exactly THREE references in the entire mvdsv tree, all in src/sv_demo.c: registration (1.56, default literal "unset"), one write `Cvar_Set(&extralogname, name4)` (1.1828, inside SV_MVDEasyRecord_f only), and Cvar_Register (1.1860). There is NO read of the value anywhere in mvdsv.

Architecture (cross-mod): mvdsv only constructs `<sv_demoDir>/<demoname>.xml` and stuffs it into the cvar during easyrecord. The CONSUMER is KTX, a separate codebase: ktx/src/logs.c:119 `log_open("%s", cvar_string("extralogname"))` then writes a `<ktxlog>` stats XML; ktx/src/match.c:2353 clears it with `cvar_set("extralogname", "")`. So every behavioral verb in the proposed description ("writes", "maintained", "stats-log content") is enforced in KTX, not mvdsv.

Classification = C-FIX (not merely WI2-FIX or C-NEAR-MISS). Two defects cross the contradiction line at mvdsv scope:
1. Clause 8 — the default-state gloss "(no recording active)" is a wrong SEMANTIC vs the code. mvdsv never resets extralogname (SV_MVDStop, 923-1009, never touches it). After the first easyrecord the cvar permanently retains the last demo's .xml path; it does NOT return to "unset" when recording stops, so "unset means no recording active" is false in mvdsv. This is a contradicted clause, the C-FIX trigger.
2. Clause 2 — "the server writes ... extra match log" mis-attributes the writing to mvdsv. mvdsv has no read-site and writes no log; the writer is KTX. flavour-C: the verb was inferred from the cvar/file name, not enforced in scope.
Clause 5 ("not a value you set") is an additional softer overstatement — the cvar is not CVAR_ROM and is freely user-writable (cvar.c:134 only blocks ROM); it's just inert in mvdsv because nothing reads it.

What IS clean: the easyrecord scoping (clauses 3, 6, 9 — only easyrecord/sv_demoeasyrecord sets it; generic record at 1695 does not), the bare registered default "unset" (clause 7), and the path geometry matching the demo name (clause 4, modulo the demoDir-relative vs fs_gamedir-prefixed nuance that the .mvd carries but the .xml does not).

Recommended re-synth direction (for the B4 seed, not applied here): describe extralogname at mvdsv scope as "easyrecord writes a `<sv_demoDir>/<demoname>.xml` path here for an external stats consumer (KTX) to read; mvdsv itself never reads or resets it." Drop the "(no recording active)" default gloss and the "the server writes the log" attribution; keep "Default: unset (registered literal)".

## flags_for_review

- [review/cross-mod-override/vpass] extralogname is a cross-mod handoff cvar: mvdsv (src/sv_demo.c:1828, easyrecord only) WRITES a `<sv_demoDir>/<name>.xml` path into it but never reads it; the CONSUMER and actual log-writer is KTX (ktx/src/logs.c:119 log_open + ktxlog XML emit; ktx/src/match.c:2353 clears it). Any mvdsv-scope description must not attribute the log-writing or the reset behavior to mvdsv.
- [review/contradiction/vpass] mvdsv never resets extralogname. SV_MVDStop (src/sv_demo.c:923-1009) clears serverdemo via Cvar_SetROM but leaves extralogname holding the last easyrecord .xml path indefinitely. The value is therefore stale-after-stop within mvdsv (only KTX clears it). Relevant if any downstream consumer treats a non-empty extralogname as 'recording is live'.
- [fyi/other/vpass] Asymmetry in path construction at src/sv_demo.c:1826-1827: the .mvd path is fs_gamedir-prefixed (`%s/%s/%s.mvd`, fs_gamedir + sv_demoDir + name) but the .xml path stuffed into extralogname is only sv_demoDir-relative (`%s/%s.xml`, sv_demoDir + name) — no fs_gamedir prefix. This means extralogname is a gamedir-relative path while the demo file path is absolute; KTX's log_open must resolve it relative to gamedir. FYI for anyone documenting the exact path semantics.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "extralogname",
  "type": "cvar",
  "description": "Holds the path of an extra per-match log file. When the easyrecord command (sv_demoeasyrecord) starts a recording, the server writes a <demo-directory>/<demoname>.xml path into this cvar; an external consumer -- the game mod, e.g. KTX -- then reads that path and writes its match-stats log there. mvdsv itself never reads the value, and does not clear it when recording stops: it keeps the last demo's path until the next easyrecord (the mod clears it at match end).\n\nDefault: unset.\nSet by: engine (written by the easyrecord command; mvdsv does not read it).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo.c:1828. Pre-existing comment 'no sv_ prefix? WTF!' (sv_demo.c:56) is a dev-aside with zero user meaning -> synthesized. This is NOT an admin knob: it is engine-WRITTEN. Enforcing write-site src/sv_demo.c:1828 `Cvar_Set(&extralogname, name4);` inside SV_MVDEasyRecord_f (the 'easyrecord' command handler, function opens at src/sv_demo.c:1743). name4 is built at src/sv_demo.c:1826-1827 as `<sv_demoDir>/<demoname>.xml` (the per-demo stats log path) immediately before SV_MVD_Record() is called. Registered default 'unset' at src/sv_demo.c:56 (WI-2) -- the placeholder before any recording has run. Described as engine-maintained per the chunk rule and confirmed by the Cvar_Set writer. F-MV1: KTX consumes this value, it does not make it admin-settable -- ktx/src/logs.c:119 `log_open(\"%s\", cvar_string(\"extralogname\"))` reads it to open the match log, and ktx/src/match.c:2353 `cvar_set(\"extralogname\", \"\")` clears it at match end. This reinforces engine/mod-maintained, not an operator setting. No threshold/polarity clauses (it is a name string), so the trace is the writer + the default + the consumer.",
  "description_proposed": null
}
```
