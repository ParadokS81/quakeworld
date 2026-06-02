# MVDSV describe-fill -- chunk-7 batch ledger: `version-build-identity`

Workflow chunk-runner batch (run `wf_b606a9bb-702`, 20 agents / ~1.21M tokens). MAIN-owned
gates (F-D6a, HG1/HG2, prose spot-check, persist) recorded here; per-knob ledgers carry the
synthesized record + cold V-pass and point here for the MAIN gate log.

- **anchor:** `1.11-53-g18d0362`
- **shape:** cvar (PROVEN -- not a new shape) -- **14 knobs** (groups of 4 -> 4 synth agents; 14 reals + 2 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `2333be4dd74cfc192414c2d985520c93` (was `51eb3d5d` after chunk 6)
- **synthesized-origin mvdsv rows:** 147 -> **161** (DB-verified; +14). Remaining mvdsv `description IS NULL`: 98 -> **84** (cvar 95 -> 81; command 3 stragglers unchanged).

## Recon (live set == plan)

All 14 `qw[ms]_*` entities `description IS NULL` at start; filter `e.name ~ '^qw[ms]_'`. Exactly matches
the plan's ~14. No divergence -> no operator scope-confirm needed. Two families, declared at
`sv_main.c:3414-3428`, all `Cvar_Register`'d together at `sv_main.c:3589-3605`:

- **`qws_*`** (7) -- "QuakeWorld Server information": `CVAR_ROM` (read-only), seeded at build time from
  compile-time macros (`SERVER_NAME`/`SERVER_FULLNAME`/`SERVER_VERSION`/`QW_PLATFORM_SHORT`/`BUILD_DATE`/
  `SERVER_HOME_URL`; `qws_buildnum` declared `"unknown"`, overwritten with `GIT_COMMIT` at `:3592-3593`).
- **`qwm_*`** (7) -- "QuakeWorld Mod information placeholders": writable (no flags), default empty `""`;
  the running mod fills them.

**Consumer model (recon, exhaustive grep -- folded into `chunk.rules`, synth-only so no V-pass leakage):**
only `qwm_name` has an engine read-site (KTX-detection -> serversideweapon `sv_init.c:424` + spectalk
`sv_broadcast.c:622`); `qws_buildnum` is the lone runtime write. The other 12 have NO engine read -- they
are identity strings exposed via the cvar interface (read by the mod/QC + console), NOT behavior knobs and
NOT dead. The rule block told workers to describe the identity role, not fabricate a "tunes X", and not to
dead-stamp -- which held (zero dead_stamps, zero fabricated behavior).

## HG1 -- canary gate: **PASS** (no re-dispatch, first wave)

2 canaries (1 C-FIX + 1 TRACED-CLEAN control), each ground-truth grepped by MAIN before launch. Canary
fodder = real out-of-set MVDSV cvars on the chunk's central **read-only / settability axis** (the property
that distinguishes `qws_*` from `qwm_*`).

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `sv_paused` (settability inversion: planted "operators set `sv_paused 1` to pause") | C-FIX | C-FIX | `CVAR_ROM` (sv_main.c:174); written ONLY by the engine via `Cvar_SetROM` (sv_init.c:303 reset, sv_user.c:2042 mirrors `sv.paused`) -- a read-only mirror, setting it is a no-op |
| `serverdemo` (verbatim-correct read-only recording-filename -- control) | TRACED-CLEAN | TRACED-CLEAN | `CVAR_ROM\|CVAR_SERVERINFO` (sv_main.c:168); engine `Cvar_SetROM` to demo name (sv_demo.c:858), cleared `""` (sv_demo.c:964/1002) |

The `sv_paused` canary is load-bearing: it tests the exact read-only-vs-settable axis that separates the two
families. Worker caught the CVAR_ROM/engine-mirror contradiction (C-FIX); the control held (no over-flag).

## F-D6a -- source_ref audit: 13/14 clean, 1 tightened

Every returned `source_ref` printed from live source. 13 read/enforce their knob cleanly (12 cite the
declaration line -- correct for an identity cvar, the declaration carries the `CVAR_ROM` flag + seed value;
`qwm_name` cites the behavioral consumer `sv_init.c:424`). 1 tightened:

| knob | synth ref | issue | corrected to |
|---|---|---|---|
| `qws_buildnum` | sv_main.c:3592 | `:3592` is the guard `if (GIT_COMMIT[0]) {` (reads GIT_COMMIT, not the knob); the line that WRITES the knob is `:3593` `qws_buildnum.string = GIT_COMMIT;` | `src/sv_main.c:3593` (reasoning prefix + halt-verdict ref) |

The reasoning body already cited the `:3592-3594` range with the full snippet, so this is a precision tighten
of the bare pointer to the knob-touching line (same class as chunk-4/6 off-by-one fixes; `source_ref` folds
into `description_reasoning`, a DB column).

## HG2 -- cold V-pass flagged 2/14 reals (both C-NEAR-MISS); both confirmed REAL + sibling-swept

Re-grepped each contested clause both directions. **Both confirmed REAL** (zero false positives) -> surgical
MAIN edits at persist (no seeded re-synth -- chunk-1..6 practice).

| knob | V-pass | defect (confirmed) | fix |
|---|---|---|---|
| `qws_version` | C-NEAR-MISS | "advertises which engine build version the server is running" overstates a push channel: `qws_version` has ZERO read-sites and is NOT `CVAR_SERVERINFO`. The actual client-facing version advertisement is the `*version` serverinfo star-key (`sv_main.c:3684`, built from `SERVER_NAME " " SERVER_VERSION`, NOT this cvar). Correct-by-accident on value (shared macro), untraced on mechanism. | "advertises" -> "identifies" |
| `qwm_platform` | C-NEAR-MISS | "(the operating system / architecture the mod was built for)" overstates: `QW_PLATFORM_SHORT` (version.h:26-60) is a single OS letter (`w`/`f`/`o`/`n`/`d`/`l`/`s`/`m`/`u`) selected purely on OS preprocessor macros -- there is NO architecture (x86/arm) dimension. | dropped "/ architecture" |

**Sibling sweep (chunk-4/5 lesson):** the bare "advertises ... the server is running" verb recurred on
`qws_name` and `qws_fullname` (same push-channel overstatement, same `*version`-is-the-real-channel root) ->
swept both to "identifies" too. The `qwm_*` family's "Advertises X ... so the mod's displays can show ..." is
self-qualified by the following clause (mechanism stated = mod display, not engine broadcast), so left as-is.

## Prose spot-check (MAIN; chunk-7 is spot-check, not full operator review)

All 14 reviewed -- concise v2 user-doc shape (what-it-holds + value + Default + Set-by). Lengths 181-506 chars;
the longest (`qwm_name`) earns it with the dual KTX-detection behavior. No bloat, no further concision edits
beyond the two HG2 corrections + sibling sweep.

## Persist + gates

- `synthesize-mvdsv.ts --from-ledger` dry-run: 14 parsed / 14 persisted / **0 errors**.
- LIVE: 14 persisted / 0 errors; committed fingerprint `2333be4dd74cfc192414c2d985520c93`.
- Idempotency re-run: 0 persisted / **14 skipped-terminal** / same fingerprint -> stable, no re-run bug.
- `quality-grid --project mvdsv --family regression`: 116 probes, 115 clean. The 2 anchored describe_fill
  gates (`synthesized_requires_anchor`, `provenance_entry_exists`) + `jsonb_columns_not_strings` + all mvdsv
  F1 floor counts PASS. `origin_vocabulary` RED (1266) is **entirely the ktx `recast_v2` baseline** (633 rows
  x2 predicates) -- unchanged from chunk 6; mvdsv origins are only `source_inline` (991) + `synthesized` (161),
  **0 mvdsv contribution** (DB-verified), exactly as the brief predicts.

## Findings seeded

4 issue-worthy findings appended to `mvdsv-describe-fill-findings.md` (#37-#40), all cites grep-verified
against live mvdsv + ktx source before writing (verify-before-write):
- **#37 cross-mod/L3** -- the `qws_*`/`qwm_*` identity bank's user-facing purpose is realized by KTX's display
  layer (KTX reads `qws_*` for MOTD/version rows, writes all 7 `qwm_*` at init, renders the Build row); engine
  reads only `qwm_name`. L3 concept-note candidate.
- **#38 behavior-quirk** -- `qwm_name` KTX-detection is a case-sensitive substring match on a WRITABLE cvar ->
  spoofable feature-gate for serversideweapon (default ON) + spectalk. [cross-ref #4]
- **#39 behavior-quirk** -- `qws_version` is a no-reader copy; THREE parallel version carriers (the cvar /
  `*version` serverinfo key / legacy `version` cvar), only the latter two are client-facing. (Root of the
  "advertises" near-miss.)
- **#40 dead-suspect** -- `qws_buildnum` reads "unknown" in dev-head/source builds (`GIT_COMMIT=""` version.h:72,
  no build-system `-D`); only release/CI builds carry the commit. Build-variant note (mirrors #34).
