# Detection answer-key -- enforce-L1-runtime-truth arc

Durable home for the ezQuake runtime detection artifacts the
`2026-05-17-enforce-l1-runtime-truth` arc depends on. Relocated here
2026-05-17 (prerequisites.md Task 0 / review-findings W1) from volatile
locations so a game relaunch or `/tmp` wipe cannot destroy the answer key.

**This is the Phase-4 (acceptance contract) answer key (D19).** It is NOT
needed by Phases 1-3 (the mechanism phases self-validate on their own output
-- X2). The Phase-4 drafter finalizes the canonical path and the operator
confirms provenance at that boundary; this directory is the secured-but-
provisional home until then.

## Files

| File | What it is | Origin (banked verbatim) |
|---|---|---|
| `entities-runtime-dump-3f9e724f.txt` | The runtime answer key: one concatenated ezQuake console capture (`cmdlist` + `cvarlist` + `macrolist`) from a build compiled at ezquake-source HEAD `3f9e724f`. | `/mnt/c/Games/QuakeWorld/QuakeWorld/qw/matches/entities.log` (Windows ezQuake install). Renamed on copy ONLY to escape `apps/qw-oracle/.gitignore:10 *.log` (it is a permanent answer key, not a transient log) and to carry the commit pin in the name. Byte-identical to source (`cmp` clean). |
| `front1-diff.sh` | Front 1: L1-source-extracted MINUS runtime-dump -> the CANDIDATE pool (genuine-dead + `#ifdef`/platform-excluded). Contains the R6 version-pin sanity proxy (see below). | `/tmp/front1-diff.sh`, verbatim. |
| `cmdline-liveness.sh` | Front 2: cmdline_param liveness by source-consumer presence (`COM_CheckParm` / generated enum id). NOT part of the call-graph mechanism -- do not fold it in (decisions.md prerequisites note). | `/tmp/cmdline-liveness.sh`, verbatim. |

## The dump's internal contract (verified 2026-05-17)

`front1-diff.sh` reads `entities.log` by HARDCODED line ranges. The captured
file's structure was verified to match exactly:

| Section | Lines | Tail marker |
|---|---|---|
| `cmdlist`  | 7-564     | `557/557 commands`   |
| `cvarlist` | 571-3272  | `2700/2700 variables`|
| `macrolist`| 3276-3344 | (`$ammo $armor ...`) |

Total 3350 lines, CRLF (Windows-written). **The CRLF is part of the faithful
capture -- do NOT normalize it.** `front1-diff.sh` strips `\r` itself
(`norm()`); normalizing the stored file would silently alter the answer key.

The 74-command / 92-cvar banked candidate pools (F2-authoritative) are the
DIFF PRODUCT (L1-source MINUS these 557/2700 runtime names), not raw dump
counts -- no contradiction with F2.

## Version-pin provenance (R6)

The dump SELF-CERTIFIES its commit. The `version`-command OUTPUT in the
post-macrolist tail (line ~3347) reads `ezQuake 3.7.0-dev 8084~3f9e724fa`
-- the `~3f9e724fa` token is an EXACT prefix of `oracle_meta
ezquake:source_repo_commit` (`3f9e724fa608e516040f02b9557808ff3efda53e`).
This is the PRIMARY version-pin sub-gate (review-findings F7), implemented
in `version-pin-proxy.sh`. The earlier README claim ("the dump carries NO
embedded version banner") was wrong: the `version` token at cmdlist line 545
is just the command NAME in the listing; its OUTPUT appears at line 3347,
outside all three `front1-diff.sh` extraction ranges (7-564 / 571-3272 /
3276-3344), which is why it never polluted the 74/92/129 candidate pools.

The **SANITY GATE in `front1-diff.sh` lines 33-36** (`sb_qtvlist_url` MUST
appear in the cvar candidate pool; no known-live cvar may leak in) is KEPT
as a secondary heuristic corroborator in `version-pin-proxy.sh`. These legs
are cvar-only and are reused verbatim-in-substance (R6: reuse, not reinvent).

`front1-diff.sh` remains byte-immutable -- the SHA leg lives ONLY in
`version-pin-proxy.sh`. Re-running `version-pin-proxy.sh` against the live
DB is the X8 / W2 discipline and is a **Phase-4-boundary action** -- the
orchestrator secured the artifact and the operator blesses provenance here.

## Path-portability (Phase-4 / R6)

Both `.sh` files contain hardcoded paths (`F=/mnt/c/Games/...entities.log`,
`/tmp/rt-*.txt`, `SRC=/home/paradoks/...ezquake-source`). They are banked
AS-IS. Adapting them to read the in-repo dump is the Phase-4 drafter/
executor's job (R6: reuse the banked proxy, do NOT reinvent it). The
orchestrator deliberately did not rewrite them -- that would pre-empt a
Phase-4 decision and risk perturbing a verified answer key.
