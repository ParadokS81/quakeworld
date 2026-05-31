# describe-fill ledger -- mvdsv `sv_demoCacheSize`

- **project:** mvdsv
- **knob:** `sv_demoCacheSize` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE: `git describe --tags` printed `1.11-53-g18d0362` -- PASS)
- **L1 entity:** `mvdsv:cvar:sv_democachesize`, `source_state=source_backed`, `help_desc=null` (confirmed cold-synth: no existing description to affirm)
- **mechanical_candidate:** none (cold-synth)
- **suspect_pool_member:** FALSE (verified vs Phase-0 C3 pool; not runtime-dead)
- **verdict:** `synthesized` -- origin `synthesized`, confidence `high`
- **C variable / registered name STRING:** the C `cvar_t` symbol is `sv_demoCacheSize`; the registered name string is `"sv_demoCacheSize"` (same letter-case as the L1 entity). Registered default `"0"`, flag `CVAR_ROM`. Declaration at `src/sv_demo.c:35` -- LOCATOR ONLY, not the citation.

---

## Final user-facing `description` (verbatim)

> Sets the size, in kilobytes, of the in-memory buffer the server uses to hold MVD demo data before writing it to disk while recording. A larger buffer lets the server accumulate more demo data in RAM and flush to disk less often; the buffer is only used when memory-cached recording is enabled (sv_demoUseCache). This cvar is read-only at the console and is set only by the -democache command-line parameter at startup; the engine enforces a 16 MB (16384 KB) minimum, so a smaller requested size is raised to that floor.
>
> Default: 0.
> Set by: the -democache <KB> command-line parameter at server startup (read-only at the console).

(One scalar in KB; value-meaning, Default, and Set-by stated. No file:line, no `CVAR_ROM`/`maxcachesize`/`Cvar_SetROM` jargon in the user doc -- all cites are in `description_reasoning` and the table below.)

---

## Per-clause enforce-trace table (D7 / B1)

Every semantic / threshold / polarity / scope / OFF-state / side-effect clause traced to the line that ENFORCES it, verified against that line's code + adjacent comments. WI-1 wide read: grepped the whole `src/` tree for `sv_demoCacheSize`; the ONLY `.value` read is `sv_demo.c:846`.

| # | Clause | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | Value is read and scaled x1024 -> the cvar's unit is KILOBYTES; consumed value is bytes | `src/sv_demo.c:846` | `dst->maxcachesize = 1024 * (int) sv_demoCacheSize.value;` | MATCH -- `*1024` converts the KB cvar to a byte count |
| 2 | The byte count sizes the in-RAM demo write buffer (side-effect: allocation) | `src/sv_demo.c:847` | `dst->cache = (char *) Q_malloc (dst->maxcachesize);` | MATCH -- `maxcachesize` is the malloc size of the cache buffer |
| 3 | "buffers demo data before writing to disk; larger buffer => flushes to disk less often" (side-effect: flush cadence) | `src/sv_demo.c:206`, `src/sv_demo.c:341-343` | `if (d->cacheused + DEMO_FLUSH_CACHE_IF_LESS_THAN_THIS > d->maxcachesize ...)` / `if (d->cacheused + len > d->maxcachesize) { ... fwrite ...; Sys_Printf("DemoWriteDest: cache overflow ...")` | MATCH -- larger `maxcachesize` => the "near-full" flush trigger is reached less often; cache holds more before flush |
| 4 | OFF-state / SCOPE: buffer only used when `sv_demoUseCache` is on; otherwise the cvar is NOT read and cache size is 0 | `src/sv_demo.c:836-841`, `:846` | `if (!(int)sv_demoUseCache.value) { dst->desttype = DEST_FILE; ... dst->maxcachesize = 0; } else { dst->desttype = DEST_BUFFEREDFILE; ... dst->maxcachesize = 1024 * (int) sv_demoCacheSize.value; }` | MATCH -- the `sv_demoCacheSize.value` read lives ONLY in the `else` (cache-enabled) branch; cache-disabled path zeroes maxcachesize and never reads the cvar |
| 5 | POLARITY / Set-by: read-only at console -- a normal config/console/rcon set is a no-op | `src/cvar.c:134-135` | `if (var->flags & CVAR_ROM)` / `return;` | MATCH -- `Cvar_Set` (the path config/console/rcon assignment uses) returns immediately for a CVAR_ROM cvar; flag set at `sv_demo.c:35` `{"sv_demoCacheSize", "0", CVAR_ROM}` |
| 6 | Set-by: the value is written only from the `-democache` command-line argument at startup | `src/sv_demo.c:1862-1869`, `:1877`; `src/cvar.c:168-179` | `p = SV_CommandLineDemoCacheArgument();` ... `size = Q_atoi (COM_Argv(p+1)) * 1024;` ... `Cvar_SetROM(&sv_demoCacheSize, va("%d", size/1024));` ; `Cvar_SetROM` clears CVAR_ROM, calls `Cvar_Set`, restores flag | MATCH -- `-democache <KB>` (`SV_CommandLineDemoCacheArgument` = `COM_CheckParm("-democache")`, `server.h:1108/1116`) is the only writer; `*1024` then `/1024` => the arg and the stored cvar are both in KB |
| 7 | THRESHOLD: engine enforces a 16 MB (16384 KB) minimum; a smaller request is raised to the floor | `src/sv_demo.c:26`, `:1837`, `:1871-1875`, `:1877` | `#define DEMO_CACHE_MIN_SIZE 0x1000000` ; `int p, size = DEMO_CACHE_MIN_SIZE;` ; `if (size < DEMO_CACHE_MIN_SIZE) { Con_Printf("Minimum memory size for demo cache is %dk\n", DEMO_CACHE_MIN_SIZE / 1024); size = DEMO_CACHE_MIN_SIZE; }` ; `Cvar_SetROM(&sv_demoCacheSize, va("%d", size/1024))` | MATCH -- `0x1000000` = 16777216 B = 16384 KB = 16 MB; `size` inits to the floor and is clamped UP to it; the stored cvar (`size/1024`) is therefore always >= 16384 after `MVD_Init` |
| 8 | Default | `src/sv_demo.c:35` (registered literal); runtime override `:1837`,`:1877` | `cvar_t sv_demoCacheSize = {"sv_demoCacheSize", "0", CVAR_ROM};` | MATCH (with caveat) -- the REGISTERED default (WI-2: the cvar_t literal) is `"0"`. NOTE recorded in reasoning: `MVD_Init` overwrites it via `Cvar_SetROM` at startup so the runtime-effective value is always >= 16384 KB; extractor-recorded default `0` is the literal, which is the correct D20 `Default:` per WI-2 |

All clauses TRACED-CLEAN. No clause derives from the knob name, an enum/string, or a config comment without an enforcing read-site.

---

## Rationale

**Why synthesize (not affirm):** cold-synth -- the L1 row has `help_desc=null` and there is no trailing comment on the `cvar_t` literal (`sv_demo.c:35`) and no shipped-config mechanical candidate. Step 3 has nothing to affirm; route to Step 5 synthesis. (D5 amendment: every entity is evaluated; absence of a candidate is not a skip.)

**Why `synthesized` (not hedged/residue):** behavior is fully source-legible at the single read use-site (`sv_demo.c:846`) and its consumers (`:206`, `:341`, `:836-847`), the CVAR_ROM polarity (`cvar.c:134`), the command-line writer (`:1862-1877`), and the minimum clamp (`:26`,`:1871-1875`). No clause is inference-only; no callee was left untraced. Confidence `high`.

**Why `high` confidence:** all 8 clauses map to located, verified enforcing lines incl. adjacent comments (the `DEMO_CACHE_MIN_SIZE` comment at `:25`, the "minimum memory size" `Con_Printf` at `:1873`). Would classify TRACED-CLEAN under a V-pass.

**Default caveat (recorded, not a defect):** the registered default is `0` (cvar_t literal, the WI-2 source of truth, also the extractor-recorded default), so `Default: 0` is correct for the D20 field. But because the cvar is `CVAR_ROM` and `MVD_Init` always calls `Cvar_SetROM` at startup with a value clamped to >= 16384 KB, the runtime-effective value is never actually `0` on a running server. Stating a bare `Default: 0` with no further note would mislead an admin (they would expect 0 bytes of cache), so the `description` body states the 16 MB floor and the startup-override explicitly. This is the honest user-facing read; not a C2 distribution-drift case (no shipped-cfg value involved) -- it is an engine self-override at init.

**Set-by reasoning:** because CVAR_ROM makes any console/config/rcon `Cvar_Set` a no-op (`cvar.c:134-135`), the only admin-facing way to size the cache is the `-democache <KB>` command-line parameter at startup (`SV_CommandLineDemoCacheArgument` -> `COM_CheckParm("-democache")`, `server.h:1108`; consumed `sv_demo.c:1862-1877`). Stated as such; "read-only at the console" makes the no-op observable to the admin who tries `sv_demoCacheSize 5000` and sees no effect.

**D20 surface split:** zero file:line / `CVAR_ROM` / `maxcachesize` / `Cvar_SetROM` / `Q_malloc` jargon in `description`; all cites live here + in `description_reasoning`. Cross-engine: none -- this is a same-codebase server-side recording knob; no `See also: L3` warranted.

---

## D6Record (the ONE json block -- parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoCacheSize",
  "type": "cvar",
  "description": "Sets the size, in kilobytes, of the in-memory buffer the server uses to hold MVD demo data before writing it to disk while recording. A larger buffer lets the server accumulate more demo data in RAM and flush to disk less often; the buffer is only used when memory-cached recording is enabled (sv_demoUseCache). This cvar is read-only at the console and is set only by the -democache command-line parameter at startup; the engine enforces a 16 MB (16384 KB) minimum, so a smaller requested size is raised to that floor.\n\nDefault: 0.\nSet by: the -democache <KB> command-line parameter at server startup (read-only at the console).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth: L1 help_desc=null, no trailing comment, no mechanical candidate -> Step 5. Fully source-legible -> synthesized, high. Clauses: unit=KB + buffer-size read sv_demo.c:846 (`1024 * (int) sv_demoCacheSize.value`); buffer alloc sv_demo.c:847 (Q_malloc maxcachesize); flush-cadence side-effect sv_demo.c:206 + 341-343 (cacheused vs maxcachesize, larger=>fewer flushes); OFF-state/scope sv_demo.c:836-841 (read only in the sv_demoUseCache-enabled else branch; disabled path sets maxcachesize=0, cvar unread); read-only polarity cvar.c:134-135 (CVAR_ROM makes Cvar_Set a no-op; flag at sv_demo.c:35); Set-by=-democache cmdline sv_demo.c:1862-1869 + Cvar_SetROM sv_demo.c:1877 + cvar.c:168-179 (only writer; arg*1024 then /1024 => KB); 16 MB min-clamp sv_demo.c:26 (DEMO_CACHE_MIN_SIZE 0x1000000=16384KB) + 1837 (size inits to floor) + 1871-1875 (clamp up). Registered default '0' per WI-2 (cvar_t literal sv_demo.c:35, = extractor default); CAVEAT: MVD_Init Cvar_SetROM overwrites at startup so runtime value is always >=16384KB -- engine self-override at init, not C2 cfg-drift; description states the floor so a bare Default:0 does not mislead. All 8 clauses traced to enforcing lines incl. adjacent comments -> TRACED-CLEAN. No name/enum/string-only clause. WI-1: only .value read is sv_demo.c:846. source_ref points at that authoritative read use-site.",
  "description_proposed": null
}
```

source_ref (for the dispatching phase to persist on the row): `src/sv_demo.c:846` @ `1.11-53-g18d0362`
