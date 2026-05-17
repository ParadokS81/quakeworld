# Prerequisites -- operator-side Task 0

What must exist before phases start. Most are already satisfied in this WSL
environment (verified during scaffold authoring 2026-05-17); confirm at
execution start. ONE item is a genuine operator-side action and it gates the
ACCEPTANCE phase (not the mechanism phases) -- read W1 / item 4 first.

Verification timestamps below are from scaffold authoring; the executing
terminal re-confirms (X8 -- "verified" is a hypothesis until re-checked).

---

## 1. libclang + python3-clang extractor toolchain -- SATISFIED, confirm

The qw-oracle libclang extractor already runs the 4-variant ezQuake parse
(`reference_libclang_ezquake_extraction`). Both passengers are zero-residual
observers on the parse that ALREADY happens (D6/D9) -- nothing new to install.

**Confirm at execution start:** the ezQuake extractor runs end-to-end and
emits its current entity JSON (this is also the X3 zero-diff baseline). If it
does not run, STOP -- the arc cannot proceed and this is not a phase concern.

## 2. ezquake-source pinned at HEAD `3f9e724f` -- SATISFIED, confirm

`research/repos/ezquake-source` is at
`3f9e724fa608e516040f02b9557808ff3efda53e` (verified 2026-05-17:
`git -C research/repos/ezquake-source log -1` -- PR #1120 help-json-drift
cleanup). This is the L1-extracted commit and the spec's validation pin.

**Confirm at execution start:** the checkout still equals the L1-extracted
commit. If it has moved, the dump-vs-L1 cross-check (D19) is version-noise --
STOP and re-pin or re-extract with the operator (X8 / W2). Do NOT proceed on
a moved pin.

## 3. Postgres dev container -- SATISFIED, confirm

`qw-oracle-postgres-dev` is up and healthy (verified 2026-05-17:
`docker ps` -- "Up 13 days (healthy)"). qw-oracle is Postgres post-Arc-1; the
schema migration, loader, and the F1 quality-grid / SQL verification probes
all run against it
(`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle ...`).

**Confirm before the schema + loader phase:** container running. Not needed
for the two mechanism phases (they verify on extractor JSON, not the DB).

## 4. Durable pinned HEAD runtime dump + detection assets -- SECURED 2026-05-17 (Phase-4 proxy-confirms provenance)

**This is the one real operator-side prerequisite. It does NOT block the
mechanism phases; it blocks the acceptance phase (D18/D19 answer key).**

> **UPDATE 2026-05-17 (orchestrator, operator-instructed -- Task 0 done).**
> The dump was located (it was never lost -- it lives in the Windows ezQuake
> install, outside the repo and outside `/tmp`, which is why the initial
> in-repo/`/tmp` search missed it) and the matched triple is now SECURED
> durable in-repo at `apps/qw-oracle/data/detection/`:
> - `entities-runtime-dump-3f9e724f.txt` -- byte-identical (`cmp` clean) copy
>   of `/mnt/c/Games/QuakeWorld/QuakeWorld/qw/matches/entities.log`; renamed
>   ONLY to escape `apps/qw-oracle/.gitignore:10 *.log` (verified trackable).
>   3350 lines, CRLF preserved; cmdlist 7-564 / cvarlist 571-3272 / macrolist
>   3276-3344 (verified). 557 runtime cmds / 2700 runtime cvars.
> - `front1-diff.sh`, `cmdline-liveness.sh` -- banked verbatim (R6
>   reuse-not-reinvent; their hardcoded `/mnt/c` + `/tmp` paths are NOT
>   rewritten -- Phase-4 owns path-portability).
> - `apps/qw-oracle/data/detection/README.md` -- lineage + the line-range
>   contract + the R6 proxy location + provenance status, for a cold Phase-4
>   read.
>
> **Remaining for Phase 4 (NOT closed here):** (a) the R6 version-pin
> sanity-proxy (the SANITY GATE in `front1-diff.sh:33-36`) is RE-RUN against
> the live DB at the Phase-4 boundary (X8/W2) -- it was deliberately NOT
> re-run at relocation time; (b) the operator blesses provenance (they ran
> the `3f9e724f` build); (c) the Phase-4 drafter proposes the canonical path
> + wiring. The original Task-0 narrative below is preserved as the record
> of the path.

State verified 2026-05-17 (original; superseded by the UPDATE above):
- Durable, in-repo: `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`
  (the already-shipped dead set; the application phase regenerates this --
  review-findings R4).
- Present but VOLATILE (`/tmp`, lost on reboot -- review-findings W1):
  `/tmp/front1-diff.sh` (runtime-vs-L1 diff, version-pin self-check),
  `/tmp/cmdline-liveness.sh` (cmdline consumer-presence; NOT part of the
  call-graph mechanism -- do not fold it in).
- UNCONFIRMED location: the pinned HEAD `cmdlist` / `cvarlist` runtime dump
  itself (the Track-A/Track-B answer key). The banked 74-cmd / 92-cvar pools
  were derived from it; the dump artifact's durable path is not established.

**Task 0 (operator-side, before the acceptance phase fires):** locate the
pinned HEAD `3f9e724f` runtime dump; relocate it together with
`front1-diff.sh` and the version-pin sanity-proxy logic into a durable
in-repo path (suggested neighborhood: alongside the shipped artifact under
`apps/qw-oracle/docs/upstream-prs/` or a dedicated
`apps/qw-oracle/data/detection/` -- the acceptance-phase drafter proposes the
exact path; the operator confirms the dump exists and is the `3f9e724f`
capture). If the dump cannot be recovered, it must be re-captured at the
pinned commit before the acceptance phase -- detection capture itself is
out of scope (X7) but HAVING the banked dump is a precondition.

The mechanism phases (Track A, Track B) self-validate against their own
output (X2) and do NOT need the dump -- they can start while item 4 is still
open. The arc-orchestrator must ensure item 4 is closed before dispatching
the acceptance phase.

## 5. No external API / secret -- N/A

This arc touches no embeddings, no Voyage, no third-party API. No `.env`
keys, accounts, or network access required.

---

## Summary for the orchestrator

| Item | State | Blocks |
|---|---|---|
| 1 libclang extractor runs | satisfied, confirm | all phases (not a phase concern) |
| 2 ezquake-source pin `3f9e724f` | satisfied, confirm | Track A/B load-bearing; acceptance cross-check |
| 3 Postgres dev container | satisfied, confirm | schema+loader phase onward |
| 4 durable pinned dump + proxy | SECURED in-repo 2026-05-17; Phase-4 re-runs R6 proxy + operator blesses provenance | acceptance phase ONLY |
| 5 external API/secret | n/a | -- |

Phases 1-2 (mechanism) start cold against items 1-2. Item 4 is the
orchestrator's gate before the acceptance phase.
