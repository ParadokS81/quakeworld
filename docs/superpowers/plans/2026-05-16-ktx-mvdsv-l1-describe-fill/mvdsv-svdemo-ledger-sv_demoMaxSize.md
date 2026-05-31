# describe-fill-synthesis ledger -- mvdsv `sv_demoMaxSize`

- **project:** mvdsv
- **knob:** `sv_demoMaxSize` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C .../research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **registered name string:** `"sv_demoMaxSize"` (matches L1 entity name exactly; the C `cvar_t` variable is also `sv_demoMaxSize` -- no letter-case divergence; verified `src/sv_demo.c:43`)
- **registered default:** `"20480"` (matches extractor-recorded default `20480`)
- **mechanical_candidate:** none -- cold-synth (no trailing comment, no shipped-config candidate).
- **suspect_pool_member:** FALSE (verified vs Phase-0 C3 pool; not runtime-dead)
- **verdict:** `synthesized` -- fully source-legible; every clause enforce-traced TRACED-CLEAN; high confidence

## Halt verdict

```
mvdsv:sv_demoMaxSize: synthesized -- cold-synth; read-site caps each in-progress demo file at value*1024 bytes (value in KB) and stops that recording once exceeded; QTV streams exempt; 0 disables; every clause enforce-traced TRACED-CLEAN; not suspect-pool -- origin=synthesized ref=src/sv_demo.c:196 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a maximum size for each demo the server records to disk. As a
> recording grows, once its size passes the limit the server stops writing
> that demo and closes it. Live QTV streams are not affected by this limit --
> only demos saved to file.
>
> The value is in kilobytes (KB) -- e.g. 20480 = 20 MB.
> 0 = no limit (a recording is never stopped for size).
>
> Default: 20480.
> Set by: server config.

## Per-clause enforce-trace table

| Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Caps each individual demo recording written to disk (per file destination, not the whole directory) | `src/sv_demo.c:196` | `d->totalsize > ((unsigned int)sv_demoMaxSize.value * 1024)` | MATCH -- the check is inside `for (d = demo.dest; d; d = d->nextdest)` (`:190`) and compares the per-destination accumulator `d->totalsize` against the cap; each file dest is judged independently |
| `d->totalsize` is the running byte count of what has been written to that destination | `src/sv_demo.c:325` (field decl `src/server.h:493`) | `d->totalsize += len;` (in `DemoWriteDest`); `unsigned int totalsize;` | MATCH -- `totalsize` is incremented by `len` bytes on every write to the destination, so it is a cumulative byte counter |
| Value is in kilobytes (KB); 20480 = 20 MB | `src/sv_demo.c:196`, `src/sv_demo.c:265` | `d->totalsize > ((unsigned int)sv_demoMaxSize.value * 1024)`; `Sys_Printf("DestFlush: sv_demoMaxSize = %dKiB trigger for dest\n", ...)` | MATCH -- `totalsize` is bytes; the cvar is multiplied by 1024 to reach a byte budget, so the cvar unit is KB. The engine's own trigger message prints the value with the `KiB` suffix. Cross-check: default 20480 KB x 1024 = 20971520 B = exactly 20 MB |
| Once over the limit, the server stops writing that demo and closes it | `src/sv_demo.c:263-267`, `src/sv_demo.c:269-275`, `src/sv_demo.c:322-323` | `if (total_size_check) { Sys_Printf(...KiB trigger...); d->error = true; }`; then `while (d->nextdest && d->nextdest->error) { ... DestClose(t, false); }`; and in `DemoWriteDest`: `if (d->error) return 0;` | MATCH -- tripping the check sets `d->error = true`; a true `error` flag both halts further writes (`DemoWriteDest` returns 0 without writing) and causes the destination to be unlinked + `DestClose`d (which `fclose`s the file and frees the dest). Net observable: that recording stops and its file is finalized |
| Live QTV streams are exempt -- only file demos are limited | `src/sv_demo.c:194` (+ comments `:192`, `:262`) | `d->desttype != DEST_STREAM &&` | MATCH -- `total_size_check` requires the destination is not a stream; the two adjacent comments state it verbatim: "stream dests are not limited" (`:192`) and "Keep in mind that stream dests are not limited by this check." (`:262`) |
| 0 = no limit (a recording is never stopped for size) | `src/sv_demo.c:195` | `(unsigned int)sv_demoMaxSize.value &&` | MATCH -- the value itself is a conjunct of `total_size_check`; when it is 0 the whole check is false for every destination, so the cap is never enforced (no recording is stopped for size) |
| Default: 20480 | `src/sv_demo.c:43` | `cvar_t  sv_demoMaxSize      = {"sv_demoMaxSize",    "20480"};` | MATCH -- registered literal default `"20480"` (WI-2: registered default, not a shipped-cfg value) |
| Set by: server config | `src/sv_demo.c:43` + `src/sv_demo.c:1846` | decl `cvar_t sv_demoMaxSize = {"sv_demoMaxSize", "20480"};` (flag field absent -- no `CVAR_SERVERINFO`, no `CVAR_ROM`, no `OnChange` callback) + `Cvar_Register (&sv_demoMaxSize);` | MATCH -- plain server cvar registered with no flags and no command/vote/serverinfo/OnChange dispatch path; settable only via server config / console. Contrast sibling `sv_demoCacheSize` (line 35, `CVAR_ROM`) and `sv_demoDir` (line 38, `OnChange`) -- this one carries neither |

## Use-site inventory (WI-1 wide read)

Whole-tree grep over `src/` for `demoMaxSize` / `demo_max_size` / `sv_demoMaxSize` (case-insensitive) returned every use-site on the literal `sv_demoMaxSize`; no aliased/macro reference exists:

- `src/server.h:994` -- `extern cvar_t sv_demoMaxSize;` (declaration, not a read)
- `src/sv_demo.c:43` -- registration literal (default `"20480"`; locator aid, NOT the citation per the brief)
- `src/sv_demo.c:1846` -- `Cvar_Register (&sv_demoMaxSize);` (registration, not a read)
- `src/sv_demo.c:195` -- `(unsigned int)sv_demoMaxSize.value &&` -- OFF-state conjunct of `total_size_check` (inside `DestFlush`)
- `src/sv_demo.c:196` -- `d->totalsize > ((unsigned int)sv_demoMaxSize.value * 1024)` -- THE authoritative threshold read-site; the `source_ref`
- `src/sv_demo.c:265` -- `Sys_Printf("DestFlush: sv_demoMaxSize = %dKiB trigger for dest\n", (int)sv_demoMaxSize.value)` -- the trigger message (corroborates the KiB unit in the engine's own words; the enforcement is the surrounding `if (total_size_check)` branch)

Single functional cluster: `DestFlush` (`src/sv_demo.c:165+`). `total_size_check` is computed once per destination at `:193-197` (stream-exemption AND non-zero-value AND over-budget), then consumed twice -- as one of the flush triggers for buffered-file dests (`:206`) and as the stop-and-error gate (`:263`). Supporting reads: `DemoWriteDest` (`:318`) accumulates `d->totalsize` (`:325`) and short-circuits on `d->error` (`:322`); `DestClose` (`:138`) tears the destination down. No name-only inference: the cap, the KB unit, the per-file scope, the stream exemption, the stop-and-close behavior, and the OFF-state all come from the gated branches and adjacent comments, not the knob name.

## Rubric grading (D5, all five clauses)

1. WHAT in admin-observable terms -- yes: it caps each on-disk demo's size and stops/closes the recording once it is exceeded; streams are exempt. Not WHY.
2. Not a name restatement -- yes: the name says "max size"; the description spells out the observable consequences (per-recording cap, the recording stops and is finalized at the cap, streams exempt, the KB unit), not just "the maximum size."
3. Units/enums spelled out -- yes: the value is KB (with the 20480 = 20 MB worked example), and 0 = no limit is stated explicitly.
4. Mechanism only, no opinion / recommended value -- yes: no "set this to N on busy servers" advice; no recommended value.
5. Self-contained without source -- yes: an admin understands the cap, the unit, the per-file scope, the stream exemption, the OFF-state, and the stop-and-close outcome without reading C.

## D20 QA self-check

1. Admin who never saw C code understands it? YES.
2. Zero file:line / function names / engine jargon in `description`? YES -- no `DestFlush`, no `d->totalsize`, no `DEST_STREAM`, no `d->error`, no file:line. ("QTV stream" and "demo recorded to disk" are user-facing server concepts, not code jargon.)
3. Values/units spelled out, Default + Set-by present? YES (KB unit + 20 MB example + 0=no-limit; Default 20480; Set by server config).
4. Cross-engine detail routed to `See also:` unless action-changing? N/A -- this is a server-only recording-size cvar; the only cross-component note is the QTV-stream exemption, which IS action-changing (an admin must know streams are not capped by it, so it stays as one compact inline clause). No `See also:` slug needed (no concept note exists).
5. Every clause enforce-traced (B1), cites in reasoning? YES (table above; cites stored in `description_reasoning`).

## Notes / conflicts

- No C2 conflict (no mechanical candidate, no trailing comment to differ from; source is the sole input).
- `description_provenance` = `null`: cold-synth; per operator clarification 2026-05-30, `description_provenance` holds retained shipped-doc DATA only. This row's grounding is `source_ref` + anchor + the reasoning cites.
- `source_ref` = `src/sv_demo.c:196` -- the authoritative read use-site that exhibits the cap (the threshold comparison), NOT the registration site (per the evidence rule: cite the read use-site, not the registration unless that is where the behavior is read).
- Per-file vs directory scope: this is the per-recording cap; the sibling `sv_demoMaxDirSize` caps the whole demo folder. Distinct knobs, distinct enforcement paths (`DestFlush` here vs `SV_DirSizeCheck` there). The description is careful to say "each demo," not "the demo directory."
- The KiB-vs-KB wording: the engine's trigger message uses `KiB` (binary, *1024) and the multiply is `* 1024`, so KiB is technically exact. The user-doc says "kilobytes (KB)" for community readability (matching the sibling `sv_demoMaxDirSize` ledger's KB wording and the ezquake.com convention); the 20480 = 20 MB worked example is computed on the true *1024 basis, so no numeric drift is introduced.
- Confidence `high`: the threshold, the byte accumulator, the KB unit (cross-checked by the `KiB` trigger message and the 20 MB default), the stream exemption (with two confirming comments), the OFF-state conjunct, the stop-and-close side-effect chain, and both registration metadata clauses are all directly traced. No hedged clause; nothing left to name-inference.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoMaxSize",
  "type": "cvar",
  "description": "Sets a maximum size for each demo the server records to disk. As a recording grows, once its size passes the limit the server stops writing that demo and closes it. Live QTV streams are not affected by this limit -- only demos saved to file.\n\nThe value is in kilobytes (KB) -- e.g. 20480 = 20 MB.\n0 = no limit (a recording is never stopped for size).\n\nDefault: 20480.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment, no mechanical candidate) from the read use-sites in DestFlush (src/sv_demo.c:165+). Enforce-trace per clause: per-recording cap -> src/sv_demo.c:196 d->totalsize > sv_demoMaxSize.value*1024, evaluated per file destination inside the for-each-dest loop src/sv_demo.c:190; totalsize is a per-dest byte accumulator -> src/sv_demo.c:325 d->totalsize += len (field unsigned int src/server.h:493); KB unit -> cvar*1024 gives a byte budget so cvar=KB, corroborated by the engine trigger message src/sv_demo.c:265 printing %dKiB, cross-check 20480 KB x1024 = 20971520 B = 20 MB; stop-and-close side-effect -> src/sv_demo.c:263-267 sets d->error=true on trip, which halts writes src/sv_demo.c:322-323 (DemoWriteDest returns 0 when d->error) and tears the dest down src/sv_demo.c:269-275 DestClose (fclose+free); QTV stream exemption -> src/sv_demo.c:194 desttype != DEST_STREAM, confirmed by adjacent comments :192 and :262 'stream dests are not limited'; OFF-state 0=no limit -> src/sv_demo.c:195 the value is itself a conjunct of total_size_check so 0 disables the cap for all dests; Default 20480 -> registered literal src/sv_demo.c:43 (WI-2 registered default, not shipped-cfg); Set-by server config -> src/sv_demo.c:43 flag field absent (no CVAR_SERVERINFO/CVAR_ROM/OnChange, unlike CVAR_ROM sibling sv_demoCacheSize line 35 and OnChange sibling sv_demoDir line 38) + Cvar_Register src/sv_demo.c:1846. All clauses MATCH (TRACED-CLEAN). source_ref=src/sv_demo.c:196 (authoritative threshold read-site, not the registration). Distinct from sibling sv_demoMaxDirSize (directory cap via SV_DirSizeCheck); this is the per-file cap. suspect_pool_member FALSE. No recommended values (L3). No mechanical candidate/trailing comment -> no C2 conflict. Verdict synthesized, confidence high.",
  "description_proposed": null
}
```
