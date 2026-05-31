# describe-fill-synthesis ledger -- mvdsv `sv_demoUseCache`

- **project:** mvdsv
- **knob:** `sv_demoUseCache` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git describe --tags` == `1.11-53-g18d0362`)
- **registered name string:** `"sv_demoUseCache"` (matches L1 entity name exactly; verified `src/sv_demo.c:34`)
- **registered default:** `"0"` (matches extractor-recorded default)
- **mechanical_candidate:** none -- cold-synth (no trailing comment, no shipped-config candidate)
- **suspect_pool_member:** FALSE (not runtime-dead)
- **verdict:** `synthesized` -- fully source-legible; every clause enforce-traced; high confidence

## Halt verdict

```
mvdsv:sv_demoUseCache: synthesized -- cold-synth, single read-site gates memory-cache vs direct-to-disk demo writing; every clause enforce-traced TRACED-CLEAN; not suspect-pool -- origin=synthesized ref=src/sv_demo.c:836 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server buffers a recording in memory before writing
> it to disk, instead of writing straight to the demo file. When enabled,
> demo data is collected in a memory cache and flushed to the file
> periodically; when off, every demo packet is written directly to disk as
> it is recorded.
>
> 0 = write the demo straight to disk (no memory cache).
> 1 (or any non-zero value) = buffer the demo in memory, flushing to disk
> in batches.
>
> Default: 0.
> Set by: server config.

## Per-clause enforce-trace table

| Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| OFF state (value 0) -> demo written straight to disk, no memory cache | `src/sv_demo.c:836-840` | `if (!(int)sv_demoUseCache.value) { dst->desttype = DEST_FILE; dst->file = file; dst->maxcachesize = 0; }` | MATCH |
| `DEST_FILE` = direct write to the file (no cache) | `src/sv_demo.c:329-330` | `case DEST_FILE: ret = (int)fwrite(data, 1, len, d->file);` | MATCH -- writes each packet straight to `d->file`, no intermediate buffer |
| ON state (non-zero) -> buffer demo in a memory cache | `src/sv_demo.c:843-847` | `else { dst->desttype = DEST_BUFFEREDFILE; dst->file = file; dst->maxcachesize = 1024 * (int) sv_demoCacheSize.value; dst->cache = (char *) Q_malloc (dst->maxcachesize); }` | MATCH -- non-zero takes the else branch, allocates a memory cache |
| `DEST_BUFFEREDFILE` = data accumulates in the cache, not written immediately | `src/sv_demo.c:339-348` | `case DEST_BUFFEREDFILE: //these write to a cache, which is flushed later ... memcpy(d->cache + d->cacheused, data, len); d->cacheused += len;` | MATCH -- writes accumulate into `d->cache`; the adjacent comment confirms "flushed later" |
| Cache is flushed to disk periodically/in batches | `src/sv_demo.c:205-217` | `case DEST_BUFFEREDFILE: if (d->cacheused + DEMO_FLUSH_CACHE_IF_LESS_THAN_THIS > d->maxcachesize || complete || total_size_check) { len = (int)fwrite(d->cache, 1, d->cacheused, d->file); ... fflush(d->file); d->cacheused = 0; }` | MATCH -- the cache is `fwrite`-flushed to the file when near-full, on completion, or on size check; "in batches / periodically" is the admin-observable framing of this |
| Polarity (admin sees "memory" vs "disk") | `src/sv_demo.c:856-857` | `SV_BroadcastPrintf (PRINT_CHAT, "Server starts recording (%s):\n%s\n", (dst->desttype == DEST_BUFFEREDFILE) ? "memory" : "disk", s+1);` | MATCH -- the engine itself frames non-zero as "memory" and zero as "disk" to clients, corroborating the user-observable polarity |
| Default: 0 | `src/sv_demo.c:34` | `cvar_t  sv_demoUseCache     = {"sv_demoUseCache",   "0"};` | MATCH -- registered literal default is `"0"` (WI-2: registered default, not a shipped-cfg value) |
| Set by: server config | `src/sv_demo.c:34` + `src/sv_demo.c:1844` | decl `cvar_t sv_demoUseCache = {"sv_demoUseCache", "0"};` (flag field empty -- no `CVAR_SERVERINFO`, no `CVAR_ROM`, no `OnChange`); registered `Cvar_Register (&sv_demoUseCache);` | MATCH -- plain server cvar, set via server config; no command/vote/serverinfo dispatch path. Contrast sibling `sv_demoCacheSize` at line 35 which carries `CVAR_ROM` -- this one does not |

## Use-site inventory (WI-1 wide read)

Whole-tree grep for `demousecache` (case-insensitive) over `src/`:

- `src/server.h:986` -- `extern cvar_t sv_demoUseCache;` (declaration, not a read)
- `src/sv_demo.c:34` -- registration literal (default `"0"`; NOT the citation per the brief)
- `src/sv_demo.c:836` -- `if (!(int)sv_demoUseCache.value)` -- THE single read use-site; the authoritative `source_ref`
- `src/sv_demo.c:1844` -- `Cvar_Register (&sv_demoUseCache);` (registration, not a read)

One read use-site only. It gates the `desttype` (`DEST_FILE` vs `DEST_BUFFEREDFILE`) of every demo destination created by `SV_InitRecordFile`, which in turn determines whether `DemoWriteDest` writes straight to the file or accumulates into a memory cache flushed by `DestFlush`. No name-only inference: the behavior is read entirely from the gated branch + the two `desttype` consumers.

## Rubric grading (D5, all five clauses)

1. WHAT in admin-observable terms -- yes: "buffer in memory before writing to disk vs write straight to disk." Not WHY.
2. Not a name restatement -- yes: the name says "use cache"; the description spells out what caching observably means (memory buffer, batched flush) rather than re-spelling "use cache."
3. Units/enums spelled out -- yes: 0 = direct-to-disk; non-zero = memory-buffered. Boolean-style enum, both states given.
4. Mechanism only, no opinion / recommended value -- yes: no "set this to N on busy servers" advice. (The buffer-size knob `sv_demoCacheSize` and any tuning guidance are L3, not asserted here.)
5. Self-contained without source -- yes: an admin understands both states without reading C.

## D20 QA self-check

1. Admin who never saw C code understands it? YES.
2. Zero file:line / function names / engine jargon in `description`? YES -- no `DEST_*`, no `maxcachesize`, no `sv_demoCacheSize`, no file:line. ("memory cache" / "disk" are plain-English, mirroring the engine's own broadcast wording.)
3. Values/units spelled out, Default + Set-by present? YES.
4. Cross-engine detail routed to `See also:` unless action-changing? N/A -- no cross-codebase consequence (server-only write path). The `sv_demoCacheSize` coupling (buffer size = `1024 * sv_demoCacheSize.value`, a `CVAR_ROM` sibling) is same-codebase mechanism detail, NOT action-changing for the enable/disable decision -> kept in reasoning, not inlined, no `See also:` needed.
5. Every clause enforce-traced (B1), cites in reasoning? YES (table above; cites in `description_reasoning`).

## Notes / conflicts

- No C2 conflict (no mechanical candidate, no trailing comment to differ from).
- `description_provenance` = `null`: cold-synth; per operator clarification 2026-05-30, provenance holds retained shipped-doc DATA only. This row's grounding is `source_ref` + anchor + the reasoning cites.
- Confidence `high`: single, unambiguous read-site; both branches traced to their `desttype` consumers; default + set-by verified at registration. No hedged clause.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoUseCache",
  "type": "cvar",
  "description": "Controls whether the server buffers a recording in memory before writing it to disk, instead of writing straight to the demo file. When enabled, demo data is collected in a memory cache and flushed to the file periodically; when off, every demo packet is written directly to disk as it is recorded.\n\n0 = write the demo straight to disk (no memory cache).\n1 (or any non-zero value) = buffer the demo in memory, flushing to disk in batches.\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from the single read use-site src/sv_demo.c:836 (if (!(int)sv_demoUseCache.value)) in SV_InitRecordFile. Enforce-trace per clause: OFF-state/direct-to-disk -> src/sv_demo.c:836-840 (value 0 -> DEST_FILE, maxcachesize=0) + src/sv_demo.c:329-330 (DEST_FILE fwrite straight to d->file); ON-state/memory-buffer -> src/sv_demo.c:843-847 (non-zero else -> DEST_BUFFEREDFILE, Q_malloc cache sized 1024*sv_demoCacheSize.value) + src/sv_demo.c:339-348 (DEST_BUFFEREDFILE memcpy into d->cache, comment 'flushed later'); batched-flush -> src/sv_demo.c:205-217 (DestFlush fwrites d->cache to d->file when near-full/complete/size-check, resets cacheused); polarity corroborated by broadcast src/sv_demo.c:856-857 ('memory' if DEST_BUFFEREDFILE else 'disk'); Default 0 -> registered literal src/sv_demo.c:34 (WI-2 registered default, not shipped-cfg); Set-by server config -> src/sv_demo.c:34 flag field empty (no CVAR_SERVERINFO/CVAR_ROM/OnChange, unlike CVAR_ROM sibling sv_demoCacheSize line 35) + Cvar_Register src/sv_demo.c:1844. All clauses MATCH (TRACED-CLEAN). suspect_pool_member FALSE. sv_demoCacheSize buffer-size coupling kept out of user-doc (same-codebase mechanism, not action-changing). No mechanical candidate/trailing comment -> no C2 conflict. Verdict synthesized, confidence high.",
  "description_proposed": null
}
```
