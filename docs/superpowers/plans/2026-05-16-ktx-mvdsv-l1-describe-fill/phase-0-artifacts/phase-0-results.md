# Phase 0 results -- KTX/MVDSV L1 describe-fill

One-page summary the Phase 1/3/4 drafters read. All artifacts re-derive by
re-running the committed scripts at the recorded commits.

## Which path ran

**Full self-built reproducible C3 oracle ran. fallback fired: no.**

`cmake` 3.28.3 was present (gcc 13.3.0 / make 4.3 / git 2.43 / bun 1.3.11
/ python3 3.12.3 all present; ninja absent but optional). Both engines
built clean via plain native CMake; the local `mvdsv +gamedir ktx` server
stood up and self-dumped. The documented date-proximate fallback was NOT
needed.

## Task 1 -- free win (MVDSV command help_desc)

Already shipped (verified live): MVDSV `command` `help_desc` populated
**0 -> 28** of 108. Non-MVDSV command help_desc unchanged (ezquake 4867,
fte 378, qwcl 0) -- no cross-project regression. The MVDSV command
synthesis tail is now 80 (Phase 4).

## Task 2 -- fetched build commits (reproducible-oracle provenance)

| Engine | Pinned dev-head commit (40-char) | Commit date | Old (stale) commit |
|---|---|---|---|
| ktx   | `67253dc9ab4f643f1e6523a923a41caab9ea587f` | 2026-05-16 18:53:43 +00 | `da73e06` (2026-03-03) |
| mvdsv | `18d036218004f31cf701bb5060448012652de6d1` | 2026-04-07 15:14:55 +00 | `f816d28` (2026-01-04) |

`versions.commit_sha` for ktx/head and mvdsv/head now equal these pinned
SHAs (verified, NOT da73e06/f816d28). Built artifacts: ktx `qwprogs.so`
(CMake C, BOT_SUPPORT ON), mvdsv `mvdsv` (CMake C). Runtime fixture:
`apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/selfbuilt-devhead-2026-05-17.log`
(728/728 cvars, 104/104 commands), saved ALONGSIDE the retained
`ciscon-1.20-dev-2026-04-27.log` (secondary cross-check, not replaced).

## Re-baselined denominators (old vs new, per engine x type)

Re-derived from the fresh DB after the same-commit re-extract. The
describe-fill scope is unchanged across the dev-head advance (ktx +~2.5
months of commits, mvdsv +~3 months) -- correct by C1, NOT a regression.
The >50%-entity-drop guard did NOT trip on any type; `--force` was NOT
used anywhere.

| Engine | Type | Old (pre-Phase-0) | New (post-re-extract) | Delta |
|---|---|---|---|---|
| ktx   | cvar          | 260 | 260 | 0 |
| ktx   | command       | 358 | 358 | 0 |
| ktx   | info_key      | 7   | 7   | 0 |
| ktx   | log_template  | 1195 | 1196 | +1 |
| ktx   | match_event   | 7   | 7   | 0 |
| mvdsv | cvar          | 183 | 183 | 0 |
| mvdsv | command       | 108 | 108 | 0 |
| mvdsv | cmdline_param | 11  | 11  | 0 |
| mvdsv | info_key      | 45  | 45  | 0 |
| mvdsv | log_template  | 691 | 691 | 0 |
| mvdsv | protocol_message | 105 | 105 | 0 |
| mvdsv | qc_builtin    | 93  | 93  | 0 |

The four describe-fill buckets (cvar / command / cmdline_param / info_key)
are byte-stable across the re-baseline for both engines (only `log_template`
moved, +1 on ktx, far inside the guard). Phase 1/2/3/4 recon against the
POST-re-extract baseline (these new numbers), not the stale ones.

## F-D4a 7-row survival evidence (empirical idempotency)

The unguarded shared derive tail was NOT yet guarded at Phase 0 (the
Phase-1-spine owned-row guard is paper). The F-D4a SAFETY pre-check
established the only owned-track-class rows in ktx/mvdsv are 7 KTX
`match_event` rows (D1-EXCLUDED bucket; `deriveMatchEvent` always re-emits
`synthesized` idempotently -- NOT the F-D4a hazard). No cvar/command/
cmdline_param/info_key row carried `synthesized`/`shipped_doc` (would have
been the hazard -> HALT). The re-extract was therefore safe to run.

BEFORE the re-extract (verbatim):

```
 project |    type     |     name      | description_origin
---------+-------------+---------------+--------------------
 ktx     | match_event | damage        | synthesized
 ktx     | match_event | death         | synthesized
 ktx     | match_event | drop_backpack | synthesized
 ktx     | match_event | drop_powerup  | synthesized
 ktx     | match_event | pick_backpack | synthesized
 ktx     | match_event | pick_mapitem  | synthesized
 ktx     | match_event | pick_powerup  | synthesized
(7 rows)
```

AFTER the re-extract (verbatim) -- byte-identical, all 7 survived,
still `synthesized`:

```
 project |    type     |     name      | description_origin
---------+-------------+---------------+--------------------
 ktx     | match_event | damage        | synthesized
 ktx     | match_event | death         | synthesized
 ktx     | match_event | drop_backpack | synthesized
 ktx     | match_event | drop_powerup  | synthesized
 ktx     | match_event | pick_backpack | synthesized
 ktx     | match_event | pick_mapitem  | synthesized
 ktx     | match_event | pick_powerup  | synthesized
(7 rows)
```

Empirical evidence the same-commit re-extract is idempotent on the
owned-track-class rows present today (P3/C4).

## C3 suspect pool (summary; full pool in c3-suspect-pool.md)

Build-pinned, no date-pinning hedge (the build alignment is structural).
The genuine suspect pool is 3 legs; the **ktx/command leg is NON-DIAGNOSTIC
and excluded** (Executor correction 2026-05-17 -- see c3-suspect-pool.md +
review-findings F-C3c):

| Section | Disposition | Note |
|---|---|---|
| ktx / cvar    | 0 suspects (valid) | `cvarlist` enumerates KTX cvars via `Cvar_Register`; none source-backed-but-dump-absent |
| ktx / command | NON-DIAGNOSTIC (excluded; NOT 357 suspects) | `mvdsv cmdlist` is structurally blind to KTX mod-path `cmd_t cmds[]` commands; the raw 357 are LIVE core commands (`1on1`/`2on2`/`ready`/`yes`/`+scores`...), zero liveness signal. Phase 3 MUST NOT dead-stamp KTX commands from this. Distinct from F-C3b (no valid suspects to classify, not classification-deferred) |
| mvdsv / cvar  | 5 suspects (valid) | `sv_login_web`, `sv_www_address`, `sv_www_authkey`, `sv_www_checkin_period`, `sys_sleep` (no-curl build surface) |
| mvdsv / command | 4 suspects (valid) | `localcommand`, `sv_web_get`, `sv_web_post`, `sv_web_postfile` (no-curl build surface) |

Genuine pool = 0 + 5 + 4 = 9, all MVDSV. A SUSPECT POOL, never a verdict.
Detect + route only; genuine-dead vs build-excluded classification of the 9
is the parked libclang call-graph arc (F-C3b STILL STANDS). C1: no suspect
importance-cut.

## Phase 4 sizing note

ezquake.com shape: see Task 3 (`ezquake-com-shape.md`). [Placeholder --
Task 3 is the ezquake.com SHAPE quantification; this results doc records
the Task 1 + Task 2 outputs that re-baseline the MVDSV cvar roster Task 3
cross-matches against.]
