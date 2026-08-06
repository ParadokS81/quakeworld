# oracle-web-v1 -- findings ledger

Numbered findings surfaced during planning, review, and execution. Each
finding gets a track (fix now / route to phase N / route to HANDOVER /
amendment); none are silently dropped. Format: **F<n> -- <title>** /
surfaced-when / evidence / disposition.

**F1 -- a brain-manifest emitter already exists.** Surfaced: Phase 1 drafting
2026-08-06. `apps/qw-oracle/scripts/build-brain-manifest.ts` was committed
`7c9f2db4` on 2026-08-05 (previous session, pre-mockup-lock shape: `built_at`,
`glow:'lit'`, old registry fields; working `--out`/`--publish`/history
mechanics; never published -- public URL 404s, appdata snapshots dir empty, no
repo consumers). Disposition: Phase 1 reframed from green-field
extend-vs-standalone to REWRITE-IN-PLACE of this script; README Phase 1 row
truthed up. `build-snapshot.ts` stays untouched (zero shared helpers).

**F2 (MAJOR, resolved in draft) -- history-stub old-shape adapt produced a
malformed entry.** Surfaced: Phase 1 checker 2026-08-06. The committed
old-shape manifest is valid JSON, so the drafted bare try/catch would NOT
start history fresh; repro showed a contract-violating `{"nums":{}}` entry
shipping on the first emit, uncaught by all 9 boundary probes. Disposition:
routed back to the drafter -- explicit schema_version/generated_at shape guard
before trusting `prev`; probe 3 strengthened.

**F3 (MAJOR, resolved in draft) -- closed-key-set leak-guard probe
false-positived on `history[].nums` dynamic keys.** Surfaced: Phase 1 checker
2026-08-06. The jq `.. | objects | keys[]` walk treats datacenter-id map keys
as leaked field names; probe passes on first emit, fails permanently from the
second -- poisoning the mechanical level-4 leak guard. Disposition: routed back
to the drafter -- `del(.history[].nums)` before the walk.

**F5 (contract amendment) -- manifest lacked raw thread/solved counts for the
MCP card.** Surfaced: Phase 3 drafting 2026-08-06. The mockup's MCP card
renders a raw thread count ("20,270 community threads") but the Phase 1
contract carried thread/solved numbers only inside emitter-composed display
strings (`cm.num` = messages). Disposition: dated additive amendment to the
Phase 1 contract (raw thread + solved fields on `cm`), full blast-radius
re-derive (TS block, probe allowlists, emitter mapping, baseline, outputs
claim); Phase 3 T8 gates one copy line on it.

**F6 (MAJOR, resolved in draft) -- Phase 4's P7a probe under-covered the
imported pulse constants.** Surfaced: Phase 4 checker 2026-08-06. Task 5's
grep checked 3 of 5 constants and missed hardcoded `2.4` / double-quoted
color forks, while Recovery claimed the probe caught exactly that violation
class. Disposition: probe extended to all 5 constants + widened negative
alternation; tasks also renumbered backward-only (T3/T4 swap) and the
gc.stats label-pin routed to Phase 1 (see the label-pin amendment rider).

**F7 (MAJOR x4, resolved in draft) -- Phase 6 checker round.** Surfaced
2026-08-06: (a) B4 asserted "all green" including the manifest URL, which is
404 until Phase 1 executes -- corrected to an arc-run-time caveat; (b)
wave-structure misnamed the T1->T3 shared file; (c) T1/T2 were declared
parallel while both editing App.tsx (lost-update race) -- T2 now sequenced
after T1; (d) the TBD-zero gate was unsatisfiable as written (its own probe
text matched the grep) -- pattern tightened to the token shape
`TBD-PHASE-[0-9]`, all 10 live tokens enumerated by name.

**F4 (minor, resolved in draft) -- nginx `add_header` without `always` skips
non-2xx responses.** Surfaced: Phase 1 checker 2026-08-06 (verified live:
today's 404 carries none of the location's configured headers). The CORS line
would inherit the gap on error states. Disposition: routed back to the drafter
-- `always` on the three `add_header` lines. (Entry sits out of numeric order
in this file for history's sake -- it was appended after F5-F7 during a
parallel round; noted by cold review CR-CHAIN-2, left in place rather than
silently reordering a ledger.)

**F10 (execution-time, resolved inline -- amends Phase 2 Open question 4) --
`~/.secrets/` is READ-ONLY to the dev plane, so the planned token path was
unwritable.** Surfaced: Phase 2 Task 5 auth setup 2026-08-06. The phase doc
defaulted to `~/.secrets/cloudflare-pages.env` (matching the existing
`~/.secrets/*.env` pattern), but that directory is an ops-provisioned ro mount
(`shfs ... (ro,nosuid,...)`); the operator's write failed with "Read-only file
system". Nothing in `dotfiles/` provides a secret-paste helper (searched
`~/dotfiles`, `~/bin`, `~/.local/bin`, `.claude/scripts/`) -- provisioning INTO
`~/.secrets` is an ops letterbox action, which would have stalled the phase on
a round-trip. **Resolved:** token stored at
`/home/dev/projects/.secrets/cloudflare-pages.env`, mode 600 in a 700 dir --
dev-writable, array-backed so it survives container recreates (same mount class
as `~/projects`), and outside every git repo (`/home/dev/projects` is not a
repo -- verified). Validated read-only via the CF API before any deploy:
`success: true`, token `active`, and it enumerates the account's Pages projects
(sees `quakeworld-docs`, confirming the right account). **Phase 2's DEPLOYMENT.md
and the `deploy` one-liner must cite THIS path, not `~/.secrets/`.**
Optional follow-up, not blocking: a letter to ops to provision the canonical
`~/.secrets/cloudflare-pages.env` and migrate.

**F9 (MAJOR, execution-time, resolved inline) -- the Edit tool ALSO breaks a
single-file bind mount.** Surfaced: Phase 1 Task 3 execution 2026-08-06. The
task doc said "Edit the deployed copy IN PLACE (Edit tool). Do NOT use `sed -i`
or move-and-replace" -- but Edit writes via temp-file + rename too, so
`/mnt/user/appdata/qw-oracle/nginx.conf` got a NEW inode and the running
container's `/etc/nginx/conf.d/default.conf` went to `Stale file handle`
(`nginx -t` failed with it; the host file was correct all along). No outage:
nginx serves from its in-memory config, so `/health` stayed 200 throughout --
the breakage only blocks the NEXT reload, which is precisely the trap, since a
`-s reload` would then have been the visible failure. Recovery was the one the
doc predicted: `docker restart qw-oracle-nginx` re-resolved the mount; config
test successful, CORS line visible in-container, health 200. Disposition:
resolved inline. **Do-not-revert rule for any later phase touching a
single-file bind mount: use a truncate-in-place write (`cat > file`,
`tee`), never Edit / `sed -i` / move-and-replace.** Repo-side copies are
unaffected (no mount). Carried forward to Phase 2+ briefs.

**F8 (cold adversarial review, 2026-08-06) -- three fresh-context readers,
all GO-WITH-FIXES, every finding applied.** Reports committed as
`cold-review-chain.md`, `cold-review-gates.md`, `cold-review-spec.md`; aim
recorded in `REVIEW-BRIEF.md`. The findings that changed the plan:

- **CR-GATE-1 (MAJOR)** the TBD-zero ship gate was STILL unsatisfiable after
  F7(d) -- `coherence-pass.md` now sits in the grepped dir quoting real token
  shapes. Fixed by scoping the grep to the drain set (README + decisions +
  findings + six phase docs), excluding review artifacts by design.
- **CR-GATE-2 (MAJOR)** Phase 2's "devtools Offline + hard reload" fallback
  probe is unexecutable -- no service worker means Offline blocks the
  DOCUMENT, so the operator sees a browser error page and the fallback path
  goes unverified. Replaced with request-blocking on the manifest URL.
- **CR-GATE-3 (MAJOR)** Phase 3's "T1-T4 parallel wave" OVERTURNED: the
  generator modules form an import chain (T2->T3->T4) and every probe runs
  whole-tree tsc, so a parallel agent facing a missing type is invited to
  fork it locally -- invisible to name-grepping probes. Wave restructured;
  the KEEP ruling's grounds re-derived without that leg.
- **CR-GATE-4 (MAJOR)** Phase 4's P7a negative grep -- the one F6 had just
  "fixed" -- caught 1 of 4 natural fork shapes when executed against a
  synthetic forked file (`setTimeout(cb, 650)`, `#4AA8FF`, `73e-3` all
  evaded). Hardened, and re-labeled a tripwire rather than a proof.
- **CR-SPEC-1 (MAJOR)** spec D1 demands the quickstart say what to do when
  the oracle does NOT know (`redirect_to_human`); no phase shipped it. Homed
  in Phase 3 Task 8 step 2b as additive-beyond-comp (deviation D-j), sourced
  from the live tool at `serve/mcp/src/index.ts:194` + the behavior contract
  at `orientation.ts:23`.
- **CR-SPEC-4 (MAJOR)** Phase 5's raw-ternary remount is the weaker form for
  the disposal path a leaked rAF loop rides on; switched to `<Show>` with a
  docs citation, and M10 became a multi-rotation check keyed on the
  leaked-loop signature (spawn cadence multiplying).
- **CR-SPEC-5 (MAJOR)** the ChatGPT Developer-Mode connect steps were
  uncited AND untested. Now cited to OpenAI's own docs (which confirm
  streamable-HTTP + No-Authentication are supported, so the posture holds)
  with per-client honesty labeling in Task 4 and explicit S11 scope honesty.
- **CR-SPEC-2 / CR-SPEC-3 / CR-CHAIN-1..3 (minor)** docs-web front-page link
  ownerless -> HANDOVER rider; history stub has no v1 consumer -> recorded
  as by-design forward surface; a phantom `F-E` citation inside a TS comment
  block bound for shipped source -> corrected to F6; ledger ordering (this
  note); stale README status block -> truthed.
- **Operator-load consolidation (upheld as a floor, cut in bookkeeping):**
  Phase 4's content review became a per-card rubric (7 answers, not 49);
  Phase 5's R-op went 10 -> 6 items chosen by what the refactor actually
  moves (closing the V10 gap the review found); Phase 6's mobile item folded
  into S1. Eight of nine contested rulings were UPHELD on their merits.
