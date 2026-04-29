# Cross-extractor Phase 6 ezquake exemptions

**Added:** 2026-04-28. **Status:** (1) and (3) closed 2026-04-29; (2) remains open. Three structural findings the Phase 6 verification layer surfaced in ezquake; out-of-scope for Phase 6 (FTE+QWCL+MVDSV-scoped) but the gate's value is exactly that it surfaces them.

The Phase 6 acceptance criterion #1 ("zero violations across all four projects") is softened in this commit body to "zero violations EXCEPT documented HANDOVER exemptions."

**Verification queries** for each exemption are listed inline so a future drainer can spot-check actual-vs-recorded counts before starting.

### (1) Source_state "misclassification" -- CLOSED 2026-04-29 (intentional design, not a bug)

**Original concern.** 32 HEAD ezquake entities (27 cvar + 4 command + 1 cmdline_param) and 382 all-versions entities marked `entities.source_state='source_backed'` despite having NULL per-version `source_file`. Read at face value, this looks like a contract violation: source_backed should mean "registration found in source," NULL source_file should mean "no registration found."

**Resolution (Phase 4 eyes-on-target, 2026-04-29).** The contradiction is illusory. Entity-level `source_state` is **biographical-by-design** -- it captures "ever was source-backed at some loaded version" -- while per-version `source_file` is current-state. This two-level model is documented in the loader at `apps/qw-oracle/scripts/load-knowledge/load-version.ts:580-585` ("entity-level source_state stays 'source_backed' -- it was real at some loaded version; the per-version story lives on the transition rows") and aligns with the source-truth-dichotomy design (see memory entry `project_qw_oracle_source_truth.md`).

Of 6 spot-checked entities, 5 (`gl_motion_blur`, `scr_weaponstats`, `sv_cpserver`, `auth_timeout`, `gl_inferno`) were legitimately source-backed at v3.0/v3.0.1 with cited `gl_rmain.c`/`sv_main.c` line numbers, then deleted from source at some 3.x version (e.g. `gl_motion_blur` retired at 3.6.0 by upstream commit "MINOR: Remove unused cvars for motion blur"). All 32 have `source_retired_at_version` rows in `source_state_transitions` -- the loader is already tracking the per-version truth correctly. Entity-level state doesn't demote to `source_retired` because the entries remain in help-JSON, so `last_seen_version` keeps advancing and `initial_observation` keeps re-touching them.

The 6th entity (`-nopriority`) is an edge case: source registration exists at `research/repos/ezquake-source/src/sv_sys_win.c:645`, but `sv_sys_win.c` is **present in tree but not referenced by CMakeLists.txt or any cmake/build file** (confirmed 2026-04-29). The extractor walks only compiled TUs, so it correctly returns `ast: null`. Dead-code citation in the upstream tree, not a tooling issue.

**Real follow-up (consumer-side, NOT extractor-side).** Consumers reading `entities.source_state='source_backed'` at HEAD without additionally checking per-version `source_file` (or the `source_state_transitions` log for a preceding `source_retired_at_version` row) will be misled into showing 32 retired entities as currently-active. This is a CONSUMER-side concern (MCP `lookup_entity`, slipgate snapshot, ConfigViewer renders) and is already tracked under "Cross-engine alias scaffolding + slipgate version-awareness" sub-thread #5 (slipgate consumer version-awareness). No new HANDOVER entry needed.

Verification query (preserved for future spot-checks):

```bash
DB=apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT 'cvar' AS type, COUNT(*) FROM entities e JOIN cvar_versions v ON e.id=v.entity_id WHERE e.project='ezquake' AND e.source_state='source_backed' AND v.source_file IS NULL AND v.version='head'
               UNION ALL
               SELECT 'command', COUNT(*) FROM entities e JOIN command_versions v ON e.id=v.entity_id WHERE e.project='ezquake' AND e.source_state='source_backed' AND v.source_file IS NULL AND v.version='head'
               UNION ALL
               SELECT 'cmdline_param', COUNT(*) FROM entities e JOIN cmdline_param_versions v ON e.id=v.entity_id WHERE e.project='ezquake' AND e.source_state='source_backed' AND v.source_file IS NULL AND v.version='head';"
```

A nonzero result here is **expected and correct** going forward; it indicates entities source-retired at HEAD but still observed in help-JSON.

### (2) Legacy cvar_t boolean shape

7 r_bloom_* rows in `research/repos/ezquake-source/src/glc_bloom.c` use 3-field `cvar_t` initializer where the third field is a literal `true` boolean (legacy CVAR_ARCHIVE shape):

```c
cvar_t r_bloom              = { "r_bloom", "0", true };
cvar_t r_bloom_alpha        = { "r_bloom_alpha", "0.5", true };
cvar_t r_bloom_diamond_size = { "r_bloom_diamond_size", "8", true };
cvar_t r_bloom_intensity    = { "r_bloom_intensity", "1", true };
cvar_t r_bloom_darken       = { "r_bloom_darken", "3", true };
cvar_t r_bloom_sample_size  = { "r_bloom_sample_size", "256", true };
cvar_t r_bloom_fast_sample  = { "r_bloom_fast_sample", "0", true };
```

```bash
DB=apps/qw-oracle/data/knowledge.db
sqlite3 "$DB" "SELECT cv.flags_raw, cv.source_file, COUNT(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ezquake' AND cv.version='head' AND cv.flags_raw IN ('true','false') GROUP BY cv.flags_raw, cv.source_file;"
```

Recorded 2026-04-28: 7 rows with `flags_raw='true'`, all from `glc_bloom.c`, zero with `'false'`.

Same structural pattern as QWCL's 1996-vintage `cvar_t` (already carved out of the 3.2.2 contract -- see runbook). Two paths: handler normalization (`true` -> empty / `CVAR_ARCHIVE`) or contract widening. The runbook's candidate-positive-contracts list already captures "QWCL `flags_raw` shape (lowercase boolean field values)" -- the ezquake legacy shape converges with that entry. A single arc could close both QWCL and ezquake legacy shapes together.

### (3) Historical-tag stale shapes -- CLOSED 2026-04-29 (Phase 3 re-walk)

ezquake tags v3.0.x through 3.6.x (14 historical versions) were extracted on 2026-04-25 under pre-Phase-6 handlers and carried stale `flags_raw` shapes (~31,600 rows: ~2,070-2,425 NULL per version + 7 `'true'` per version).

**Resolved 2026-04-29:** Phase 3 of the zero-debt-before-KTX arc re-walked all 14 historical tags under post-Phase-6 + post-Arc-B handlers. The deep-time obligation for ezquake is satisfied. The FTE+QWCL deep-time obligation in the residuals entry above stands separately (FTE has only `build-6698`, QWCL only `2.33` -- multi-version walks for those projects, when scheduled, must extract under post-Phase-6 handlers from the start).

---
