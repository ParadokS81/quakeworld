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

## 4. Durable pinned HEAD runtime dump + detection assets -- ACTION REQUIRED (gates the acceptance phase)

**This is the one real operator-side prerequisite. It does NOT block the
mechanism phases; it blocks the acceptance phase (D18/D19 answer key).**

State verified 2026-05-17:
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
| 4 durable pinned dump + proxy | **ACTION REQUIRED** | acceptance phase ONLY |
| 5 external API/secret | n/a | -- |

Phases 1-2 (mechanism) start cold against items 1-2. Item 4 is the
orchestrator's gate before the acceptance phase.
