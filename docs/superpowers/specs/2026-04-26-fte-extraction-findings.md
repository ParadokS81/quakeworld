# FTE Layer 1 Extraction -- Phase 2d-core Findings

**Date:** 2026-04-26
**Snapshot:** `build-6698` at SHA `3584377302cda4bd1b6950b126d147451895a1da`
**Status:** Phase 2d-core COMPLETE; Phase 2d-bundle (asset extraction) PENDING next session
**Design spec:** `docs/superpowers/specs/2026-04-26-fte-layer1-extraction-design.md`
**Playbook:** `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

---

## Counts that landed

| Type | Spec estimate | Actual | Delta |
|---|---|---|---|
| Total entities | -- | 3208 | -- |
| Cvars (total) | 2700-3000 | 2482 | -8% (under low end) |
| -- engine cvars | 2200-2500 | 1397 | -37% (well under) |
| -- plugin:ezhud cvars | 400-500 | 1085 | +117% (well over) |
| Commands | 600-800 | 556 | -7% (just under) |
| Macros | 50-100 | 67 | within range |
| Cmdline params | 150-250 | 103 | -31% |

**Why engine cvars ran low.** FTE relies heavily on dynamic registration (`Cvar_Get` / `Cvar_FindOrGet`) where ezQuake uses static `cvar_t` declarations. Dynamic registrations are outside static AST reach. Pass 1 (runtime cvarlist diff) quantified the gap -- see "Pass 1 -- runtime cvarlist diff (closed)" below.

**Why plugin:ezhud ran high.** HUD_Register synthesis produces 9 standard subcvars + 1 order cvar + N custom params per HUD element. 74 elements in `hud_common.c` yielded 1085 rows. The spec estimate (400-500) did not account for the per-element custom-param tables fully.

---

## Source-root distribution

| source_root | Count | Pct |
|---|---|---|
| engine | 1397 | 56% of cvars |
| plugin:ezhud | 1085 | 44% of cvars |

Commands, macros, and cmdline_params are engine-only (no plugin registration in ezhud for these types).

Pass 3 verified: zero NULL source_root rows; zero engine rows with a source_file path under `plugins/`; zero plugin:ezhud rows with a source_file path outside `plugins/ezhud/`. Five spot-check rows confirmed correct source attribution.

---

## Pattern catalog vs. ezQuake and QWCL

### Patterns shared with ezQuake / QWCL

| Pattern | Description | FTE notes |
|---|---|---|
| P1 -- cvar_t struct-init | Base-case `cvar_t name = {"name", "default", flags}` | FTE delivers this via CVARD/CVARFD/CVARAFD/CVARAD macro expansion; libclang resolves to the same struct-init shape post-expansion |
| P5 -- legacy alias | `Cmd_AddCommandOld(old_name, handler)` or equivalent alias API | FTE does not actually use this API in practice; the handler covers it speculatively at zero cost |
| P7 -- platform-guarded code | Multi-variant parse with platform-specific `#define` injection | 4 variants: client / server / win / client_vk |

### Patterns specific to FTE

**Macro families.** CVARD/CVARFD/CVARAFD/CVARAD are FTE's registration primitives. ezQuake uses literal `cvar_t` struct declarations. The key insight from the design prototype: libclang's `PARSE_DETAILED_PROCESSING_RECORD` flag expands these macros and presents the resolved INIT_LIST_EXPR to the cursor walker. The handler reads fields by index (0=name, 1=default, 2=description, 3=flags) from the post-expansion cursor -- same indexing as a literal struct. No special macro parser needed.

**Command APIs.** FTE uses `Cmd_AddCommand` / `Cmd_AddCommandD` / `Cmd_AddCommandAD`. The D-suffix variants carry a description arg; the AD-suffix variants carry both alias and description. `Cmd_AddCommandOld` is present in the API but not called in the engine or ezhud code (0 registrations in practice).

**Macro APIs.** `Cmd_AddMacro` (name + handler) and `Cmd_AddMacroD` (name + handler + description). Important: `Cmd_AddMacroD` is a `#define` that drops the description argument before libclang sees it. The handler recovers descriptions via a source-text regex pass over the raw `.c` file -- same recovery technique the ezQuake handler uses for similar preprocessor-obscured descriptions.

**Plugin source-root concept.** First engine port to introduce source-root partitioning. The extractor driver iterates over:

```python
SOURCE_ROOTS = [
    ("engine",       FTE_REPO / "engine"),
    ("plugin:ezhud", FTE_REPO / "plugins/ezhud"),
]
```

Each emitted row carries `source_root`. The schema v11 migration added the `source_root TEXT` column to `cvar_versions`, `command_versions`, `macro_versions`. Future plugins are one line in `SOURCE_ROOTS` plus a handler run confirmation.

**HUD_Register synthesis (plugin:ezhud).** `HUD_Register(element_name, ...)` in `hud_common.c` creates HUD elements. The handler synthesizes 9 standard subcvars per element (align_x, align_y, show, size, style, scale, color, alpha, pos) plus 1 order cvar, plus N custom params read from the `ezhud-hud-elements.yaml` seed. 74 elements x ~14 cvars average = 1085 rows. ezQuake has an equivalent mechanism; FTE's ezhud plugin replicates it.

**cvarfuncs->GetNVFDG v-table cvars.** 16 cvars in ezhud registered via a v-table pointer call (`cvarfuncs->GetNVFDG(...)`). The handler detects this call pattern and emits rows tagged `source_root: "plugin:ezhud"`.

**Variants matrix (4 variants vs. ezQuake's 4).** FTE uses the same 4-variant architecture that landed during ezQuake's doc_only audit (commit `a099231`). FTE variants:

| Variant | Defines |
|---|---|
| client | `-DHAVE_CLIENT -DGLQUAKE -DNQPROT -DCSQC_DAT -DRTLIGHTS -DMVD_RECORDING -DMULTITHREAD -DSUPPORT_ICE -DPLUGINS` |
| server | `-DHAVE_SERVER -DSERVERONLY -DNQPROT -DMVD_RECORDING -DQUAKESTATS` |
| win | client defines + `-D_WIN32 -DWIN32` |
| client_vk | client defines minus `-DGLQUAKE`, plus `-DVKQUAKE` |

Game-type defines (`HEXEN2`, `Q2CLIENT`, `Q2SERVER`, `Q3CLIENT`, `Q3BSPS`, `Q2BSPS`, `VM_Q1`) deliberately undefined -- Q1+QW scope only.

Apple variant excluded: verified 0 cvar declarations behind `__APPLE__` or `MACOSX` guards in the FTE source tree (as confirmed in design brainstorm 2026-04-26). No Apple variant needed.

---

## Validation results

| Pass | Status | Notes |
|---|---|---|
| Pass 1 -- runtime cvarlist diff | **PASS** | Completed against FTE build-6698 via qconsole.log streaming (logfile 1 + cvarlist * -d). 2482 DB cvars vs 2549 runtime. 2435 common (95.5%). 114 runtime-only all explained -- see "Pass 1 closed" section below. Zero genuine extractor gaps. |
| Pass 2 -- field-accuracy audit | PASS 20/20 | After fixing flags-inflation bug (commit `f094587`). Spot-checked name, default_value, flags_raw, description, source_file, source_line for 20 random source_backed cvars against literal source |
| Pass 3 -- source_root sanity | PASS | Zero NULL source_root; zero engine/plugin path crossover; 5 spot-check rows clean |
| Pass 4 -- quality grid | PASS 21/21 | 11 regression probes + 10 anomaly probes registered in quality-grid.ts (commit `76fae47`) |

---

## Bug discovered and fixed during integration

### Inflated flag_names arrays (60/2379 cvars; fixed before final load)

**Symptom.** During Pass 2 field-accuracy audit, ~60 cvars showed 8-12 flag tokens in `flag_names` where the source declaration had 1-3. Example: a cvar with `CVAR_SAVE` in source showing `["CVAR_SAVE", "CVAR_CHEAT", "CVAR_READONLY", "CVAR_SERVERINFO", ...]`.

**Root cause.** `fields[3]` in the post-macro-expanded INIT_LIST_EXPR cursor (the flags field) has a zero-length source extent after CVARD-family macro expansion -- libclang discards the original source location of the flags argument when the macro expansion collapses the call. Calling `.get_tokens()` on a zero-extent cursor returns tokens from the surrounding Translation Unit context rather than from the flags field itself. For source files that `#include "cvar.h"` early in their include chain, this caused the token stream to include the `#define CVAR_SAVE`, `#define CVAR_CHEAT`, etc. definition tokens from the header -- inflating the flag list with all cvar flag definitions visible to that TU.

**Fix** (commit `f094587`). Instead of tokenizing `fields[3]` directly, tokenize the parent `VAR_DECL` cursor (which always has a correct full-line source extent) and filter to tokens whose start offset falls within that VAR_DECL extent. The flags field tokens are a subset of the VAR_DECL token stream, and the extent filter removes the ambient TU context noise. After fix: 0 entries with more than 5 flags in the output. Single anomaly probe `F2.fte.no_inflated_flags` in quality-grid.ts guards against regression.

**Why this is FTE-specific (not ezQuake-specific).** ezQuake registers cvars via literal `cvar_t` struct declarations -- the flags field has a real source location because it is not inside a macro arg. FTE's CVARD macro collapses the declaration into a single macro call, and the macro-expansion cursor's field extents can be zero-length. Any future engine that uses registration macros (MVDSV, if it follows a similar pattern) should be audited for the same failure mode before accepting Pass 2.

### Pattern 3: nested cvar_t in container struct/array (commits `274eb16` + `2e65839`)

**Symptom.** Pass 1 runtime diff (post-fix of flags-inflation) showed 217 runtime-only cvars -- far more than expected. On investigation, entire families of engine cvars were absent from the DB: `log_name[LOG_TYPES]`, view-slot v3-v5 arrays, master-server tagged-union tables, joystick-axis tables.

**Root cause.** The initial cvar handler only detected top-level `cvar_t name = CVAR(...)` declarations where a VAR_DECL directly held a `cvar_t` INIT_LIST_EXPR. FTE heavily uses nested patterns:

- Arrays of `cvar_t`: `cvar_t log_name[LOG_TYPES] = { CVARFC(...), CVARFC(...), ... }` -- each element is a `cvar_t` INIT_LIST_EXPR inside an outer INIT_LIST_EXPR.
- Arrays of container structs: `{ .cvar=CVAR("v5_x", ...), .cvar=CVAR("v5_y", ...) }` view-slot definitions where `cvar_t` is a field of the container type.
- Master-server tagged-union arrays: `cvar_t` fields inside multi-level struct literals.
- Joystick-axis tables: similar array-of-struct pattern.

In all cases, the `cvar_t` INIT_LIST_EXPR exists in the AST but the handler's top-level-only walk never visited it.

**Fix.** Walk recursively from each VAR_DECL. At any INIT_LIST_EXPR node, check whether libclang's resolved type for that cursor is exactly `cvar_t`. If yes, extract it as a cvar row regardless of nesting depth. Single-line heuristic; works for all 4 nesting patterns above. Recovered 103 cvars (engine count 1294 -> 1397). Post-fix Pass 1 residual dropped from 217 to 114.

---

## Implementation commits

| Commit | Artifact |
|---|---|
| `e95a0f3` | Schema v11 migration -- `source_root TEXT` column |
| `b468278` | clang_config.py widened for FTE variants |
| `b2e5f24` | Driver scaffold |
| `3157efc` | cvars handler |
| `74179c4` | commands handler |
| `b0f8c14` | macros handler |
| `bb8e482` | cmdline handler |
| `bbf8c2e` | ezhud handler |
| `62b8ba3` | loader passthroughs |
| `c521c63` | ast outputs + first head load |
| `f094587` | flags-inflation fix |
| `76fae47` | quality grid registration |
| `46625a1` | prototype cleanup (cvars.ts + cvars-check.py retired) |
| `274eb16` | Pattern 3 fix -- recursive nested cvar_t detection |
| `2e65839` | Pattern 3 fix -- loader reload after recovery |

---

## Pass 1 -- runtime cvarlist diff (closed)

**Procedure.** Operator ran FTE build-6698 (Linux), enabled `logfile 1`, executed `cvarlist * -d` in console, transferred `qconsole.log` to WSL. Processing: stripped FTE color codes (`^[0-9]` and `&c`-prefix variants), stripped CRLF, case-folded to lowercase, filtered to identifier-only lines. DB side: pulled `SELECT name FROM entities WHERE project='fte' AND type='cvar'` and case-folded.

**Pre-fix gap (before Pattern 3).** 2379 DB cvars vs 2549 runtime cvars. Runtime-only: 217. After Pattern 3 fix (+103 cvars): DB grew to 2482 cvars.

**Post-fix diff.**

| Bucket | Count |
|---|---|
| Runtime cvars (case-folded) | 2549 |
| DB cvars | 2482 |
| Common | 2435 |
| Match rate | 95.5% |
| Runtime-only residual | 114 |
| DB-only | 47 |

DB-only 47 are expected: VK-variant cvars not loaded in GL runtime + server cvars not registered in client runtime.

**Residual 114 categorized (all out-of-scope or fundamentally unreachable):**

| Bucket | Count | Explanation |
|---|---|---|
| Non-ezhud plugin cvars | ~26 | IRC, XMPP, Jabber, ODE physics, addon system. Out of scope -- only ezhud is in the allowlist per locked Phase 2d-core decision. |
| Cvar_Get / Cvar_FindOrGet dynamic | ~27 | Runtime-only registration triggered by user exec files or specific game-state transitions. Fundamentally unreachable by static AST analysis. |
| Runtime-synthesized names | ~56 | `gl_ext_GL_*` (GL extension probe results), `addon[N]` (numbered addon slots), `music_playlist_sampleposition[N]` (per-track), `physics_ode_*` (ODE feature config). Names constructed at runtime via sprintf/snprintf -- no source literal exists. |
| Win-SDK-blocked function bodies | ~5 | Same wall as ezQuake `-nopriority` deferred case. Recovery = stub-headers solve; deferred until MVDSV/FTE makes it worth doing uniformly. |

**Conclusion.** All 114 runtime-only cvars are explained. Zero are genuine extractor gaps under locked Phase 2d-core scope. Pass 1 PASSES. Quality grid 21/21 PASS for all 3 projects (ezquake, qwcl, fte).

---

## Pass 1 (CLOSED) -- steps reference

Pass 1 required a live FTE instance to dump `cvarlist`. The operator ran this; steps are preserved here as a reference for future engine ports.

**Steps used:**

1. Boot FTE (Linux or Windows build, same `build-6698` tag if possible; any recent build acceptable since we expect near-zero drift at head).
2. Open console. Run `cvarlist`. Run `cmdlist`. Run `condump runtime-fte.log`.
3. Transfer `runtime-fte.log` to the WSL machine at e.g. `/tmp/runtime-fte.log`.
4. Strip color codes (`^[0-9]`, FTE `&c`-prefix variants) and CRLF; case-fold to lowercase; filter to identifier-only lines.
5. Pull DB names:
   ```bash
   sqlite3 apps/qw-oracle/data/knowledge.db \
     "SELECT name FROM entities WHERE project='fte' AND type='cvar'" | sort -u > /tmp/db-fte-cvars.txt
   sqlite3 apps/qw-oracle/data/knowledge.db \
     "SELECT name FROM entities WHERE project='fte' AND type='command'" | sort -u > /tmp/db-fte-commands.txt
   ```
6. Diff:
   ```bash
   comm -23 <(sort /tmp/runtime-fte-cvars.txt) /tmp/db-fte-cvars.txt   # runtime-only (extractor gaps)
   comm -13 <(sort /tmp/runtime-fte-cvars.txt) /tmp/db-fte-cvars.txt   # DB-only (variant-specific or dynamic)
   ```
7. Categorize runtime-only entries:
   - Q2/Q3/H2-gated: grep source for `#ifdef Q2CLIENT` / `#ifdef HEXEN2` around the declaration -- expected exclusion under Q1+QW scope
   - Plugin-resident: check whether the running FTE instance has plugins loaded beyond ezhud -- log as "future-plugin-candidate"
   - Dynamic (`Cvar_Get` / `Cvar_FindOrGet`): grep source for the registration call -- document the absence as expected
   - Genuine extractor gap: drive to zero; each survivor becomes a tracked finding in HANDOVER

**Actual outcome.** The -37% engine shortfall vs. spec estimate was confirmed as expected: dynamic registration (`Cvar_Get`/`Cvar_FindOrGet`, ~27 cvars) + runtime-synthesized names (~56 cvars) + non-ezhud plugins (~26 cvars) + Win-SDK-blocked function bodies (~5 cvars) account for all 114 residual. Zero genuine extractor gaps.

---

## Known absences and limitations

**Dynamic registrations.** `Cvar_Get(name, default, flags)` and `Cvar_FindOrGet(name, default, flags)` create cvars at runtime from string arguments that may be variables or computed values. Static AST extraction cannot see them. This is the primary explanation for the engine cvar shortfall. Same fundamental limit as ezQuake's `Cvar_Create`.

**CSQC/QuakeC cvars.** A user-loaded mod can register cvars via QuakeC's `registercvar` builtin. Out of scope entirely.

**Windows SDK-dependent code.** Same wall ezQuake hit for `-nopriority`. FTE's `engine/client/sys_win.c` and `engine/gl/gl_videowin.c` likely have call sites inside function bodies that reference Win32 SDK or DirectX headers Linux libclang cannot find. The recovery path (stub headers under `research/repos/fteqw/win-sdk-stubs/`) is documented in the design spec. If FTE, MVDSV, or the ezQuake `-nopriority` case applies enough pressure, the stub-headers solve is the right single-shot fix for all three.

**Phase 2d-bundle (asset extraction).** The `_handler_assets.py` extractor, seed YAMLs (categories, extensions, path-rules, cvar-bindings), and `load-assets.ts` passthrough are not yet written. The design spec covers their architecture under "Phase 2d-bundle." Asset bundle is a separate session, sequenced after core to keep diagnosis clean.

---

## Lessons for future engine ports (MVDSV, KTX, QWFWD)

These observations generalize from FTE Phase 2d-core. Read before starting a new engine port.

**1. Check for zero-extent macro-expansion fields before shipping Pass 2.** If the engine uses registration macros (not literal struct declarations), run a diagnostic before the first Pass 2 audit: count cvars with more than 5 flags. Nonzero count means the flags field has zero-extent and you are pulling ambient TU tokens. Fix is to tokenize the parent VAR_DECL and filter by offset. Commit `f094587` is the reference implementation.

**2. Scope decisions settle the "complex multi-game engine" problem.** FTE looks exotic but is structurally the same as ezQuake once you resolve the preprocessor scope (which game profile, which renderers, which platforms). Make these decisions explicit and locked before writing a single handler. The design spec documents FTE's locked decisions; MVDSV's equivalent should be the same format.

**3. Dynamic registration is the dominant gap source for FTE-lineage engines.** `Cvar_Get`-style APIs create cvars from runtime values. Static extraction cannot reach them. Document the gap explicitly so future sessions do not mistake it for extractor bugs. Pass 1 is the right instrument to measure the gap size.

**4. Plugin source-roots are additive, not architectural changes.** Adding a plugin is one line in `SOURCE_ROOTS` plus confirming the plugin's registration patterns match existing handlers. The `source_root` column on version tables carries the provenance. No schema change needed for future plugins.

**5. HUD_Register synthesis is prolific.** If MVDSV or KTX have a similar bulk-registration pattern (a single call producing N cvars per element), estimate counts from the element table size, not from naive "cvars per file" projections. 74 elements x ~15 cvars = 1085 -- the spec estimate of 400-500 was off by 2x.

**6. Macro-recovered descriptions require a source-text fallback.** `Cmd_AddMacroD` in FTE is a `#define` that drops the description before libclang sees it. The description is in the source text but not in the AST. The recovery technique (source-text regex on the raw `.c` file) is implemented in `_handler_macros.py` and is the reference for any similar case in MVDSV/KTX.

---

## What's next

**Phase 2d-bundle (next FTE session).** Asset extraction for FTE: `_handler_assets.py` + seed YAMLs + `load-assets.ts` passthrough. Seed YAMLs are ~90% reuse from the ezQuake asset bundle (same file categories, overlapping extensions). Path-rules and cvar-bindings are authored fresh. The design spec covers architecture and Pass 4 validation criteria.

**Phase 2e (MVDSV + KTX).** Next engine ports after FTE bundle. MVDSV is a C server; should follow the same extractor playbook. KTX is a QuakeC mod -- requires a `tree-sitter`-based QuakeC parser spike (separate from the libclang pipeline). Separate HANDOVER entry tracks these.

**Quarterly cadence.** Re-run `extract.py` against the FTE master branch every ~3 months (or after major Spoike commits / ezhud updates). The loader's idempotency contract means re-running against the same SHA is safe. A new SHA produces a new version row with delta tracking via `diff` and `enrich` CLIs.

---

## Cross-references

- Design spec: `docs/superpowers/specs/2026-04-26-fte-layer1-extraction-design.md`
- Extractor driver: `apps/qw-oracle/scripts/extractors/fte/extract.py`
- Per-entity handlers: `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py`, `_handler_commands.py`, `_handler_macros.py`, `_handler_cmdline.py`, `_handler_ezhud.py`
- AST outputs: `apps/qw-oracle/scripts/extractors/fte/output/` (6 JSON files)
- Oracle loaders: `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts`, `load-commands.ts`, `load-macros.ts`
- Schema: `apps/qw-oracle/SCHEMA.md` (v11)
- Quality grid: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`
- HANDOVER entry: "Phase 2d-2h: remaining QW knowledge rollout"
- Predecessor findings: `docs/superpowers/specs/2026-04-24-layer1-doc-only-audit-findings.md` (covers ezQuake doc_only audit + 4-variant architecture)
- Extractor playbook: `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
