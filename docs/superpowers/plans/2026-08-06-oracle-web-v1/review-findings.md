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

**F11 (execution-time, plan defect, corrected in the doc) -- Phase 2 Task 3's
verification probe was unsatisfiable at Task-3 completion.** Surfaced: Phase 2
Task 3 execution 2026-08-06, by the implementer. The probe asserts
`grep -rc "<baked generated_at>" dist/assets/` >= 1, but at Task 3 the only
importer chain is `index.html -> index.tsx -> App.tsx`, and App.tsx is still
Task 2's static placeholder -- so Rollup tree-shakes `src/data/manifest.ts` and
its `baked-manifest.json` import out of the bundle entirely. The grep returns
`0` for a CORRECT implementation. The identical probe at the phase boundary
(after Task 4 wires `loadManifest()` into App.tsx) is correctly scoped; only
the Task-3 copy was wrong. Same defect class as the plan-time gate findings
CR-GATE-1/2/4: a probe whose expected value is unachievable in the state it
runs. **Disposition:** Task 3's probe text amended in the phase doc to defer
the bundle-grep leg to Task 4 / the phase boundary, with the tree-shaking
reason recorded; the assertion itself is NOT weakened, just moved to where it
can be true. Verified independently at orchestration: the real
`bake-manifest.mjs` (copied byte-for-byte into a scratch tree with the relative
SRC layout it expects) exits 1 with the loud message on the old-shape manifest
and writes NO file, and exits 0 producing a byte-identical copy on the v1
manifest -- so the guard is proven on the shipped script, not on a replica of
its logic.

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

**F12 (execution-time, plan defect, corrected at run time) -- Phase 3 Task 10's
deploy one-liner cites the pre-F10 secrets path.** Surfaced: Phase 3 pre-flight
2026-08-06, by the orchestrator. Task 10 says `set -a; . ~/.secrets/cloudflare-pages.env`,
but F10 established during Phase 2 that `~/.secrets/` is an ops-provisioned
READ-ONLY mount and the token actually lives at
`/home/dev/projects/.secrets/cloudflare-pages.env` -- which is what the shipped
`apps/oracle-web/DEPLOYMENT.md` cites (verified live: lines 27/32/53 of that
file name the projects path and explicitly warn "Not `~/.secrets/`"; the token
file exists there, mode 600). The Phase 3 doc was drafted before F10 resolved,
so it inherited the stale default. **Disposition:** Task 10 executes with the
DEPLOYMENT.md path; the phase doc's Task 10 line is the defect, not the
deployment doc. Same class as F11 -- a plan literal that cannot be true in the
state it runs. No weakening: the deploy still runs the same one command, only
the env-file path is corrected.

**F13 (MAJOR, execution-time, plan defect -- amended, port UPHELD) -- Phase 3
Task 3's mesh-population gate `140..156` was unsatisfiable; the comp itself
renders 86 dots.** Surfaced: Phase 3 Task 3 execution 2026-08-06, by the
implementer, as a reported decision conflict rather than a silent probe
relaxation (the brief's STOP duty working as designed). The implementer's port
returned `pts.length = 86` against a probe expecting 140-156, and it declined
to touch `sigma`/`MIN_DIST`/`want`/try-caps to force the number up.

**Adjudicated by re-derivation at orchestration, not by re-reading the plan:**
the mockup's own scatter code (desktop branch, lines 366-433) was copy-pasted
verbatim into a standalone script -- no port, no reinterpretation -- and run
against the comp's own inline shares. It produces `86`, with per-category
counts matching the implementer's exactly (ef 17/32, cm 26/46, cs 7/13, gc
10/19, fill 20/40; every category exhausting `tries = 3000`). The port is
therefore FAITHFUL and is accepted as-is; the plan's range was a plan-time
arithmetic estimate (`6 + up to 110 + 40`) that was never executed.

Root cause is geometric: at `MIN_DIST = 26` the effective 2-sigma cluster area
around a seat is about half the non-overlapping area `want` points require, so
most draws land in the crowded centre and are rejected. The implementer ruled
out RNG degeneracy by substituting `Math.random()` and observing the same
shortfall -- a good instinct, independently confirmed here by the fact that the
mockup's own code shows it. IEEE-754 doubles behave identically in V8-based
browsers and in node/bun, so no environment-specific escape hatch exists: the
comp renders 86 dots in a real browser too.

**Disposition:** dated amendment in the phase doc at both sites that carried the
bad number -- Task 3's probe expectation (now `86`, with the derivation and the
geometric cause recorded) and the Port discipline bullet's "~150 dots" prose
(now labeled a requested-not-placed maximum). No code changed; the assertion was
CORRECTED, not weakened -- an exact value replaces a wrong range, so the probe
is now strictly stronger. Bonus: the comp's inline shares (0.289/0.420/0.118/
0.172, mockup 245-257) are identical to the live manifest's, so ritual item V2's
dot-for-dot parity claim is exactly checkable rather than merely plausible. Also
corrects a stale cross-reference in that probe's prose (it cited ritual item V4,
the hover-spawn item, where it meant V2, the mesh item). Same defect class as
F11/F12: a plan literal that cannot be true in the state it runs.

**F14 (minor, execution-time, routed to Phase 3 Task 9) -- the traveler ceiling
is SEVEN, not six; `MAX_TRAVELERS` must be compared with `>`.** Surfaced: Phase
3 Task 4 boundary verification 2026-08-06, by the orchestrator, while
cross-checking the ported constants against the comp. The contract block
exports `MAX_TRAVELERS = 6` with the comment "spawn refused above this (509)",
which is faithful -- but the mockup's actual guard at line 509 reads
`if (reduced || FXp.length > 6) return;`, so a spawn is refused only once seven
travelers already exist. A natural reading of the constant name invites
`travelers.length >= MAX_TRAVELERS`, which silently caps the field at six and
makes the ambient journey density visibly thinner than the comp.

`journeys.ts` is CORRECT to leave this unenforced -- `spawnTraveler`'s contract
signature takes no travelers array and no `reduced` flag, exactly mirroring the
mockup, where the guard lives in the caller's `spawn()`. So the trap lands
squarely on Task 9, which owns the rAF loop and the spawner. Same off-by-one
class as `MAX_HOPS` (`p.hops > 11`, 12 hops permitted) that the contract block
already calls out by name -- both are invisible in a screenshot and only show
up as "the comp feels busier than ours". **Disposition:** pinned in Task 9's
dispatch brief as an explicit acceptance criterion; verify at the phase
boundary by reading the guard, since ritual item V11 watches cadence rather
than counting simultaneous travelers.

**F15 (MAJOR, execution-time, plan defect -- four probes amended) -- the
per-task bundle greps use `grep -c` against a SINGLE-LINE bundle, so their
expected counts are unreachable.** Surfaced: Phase 3 Task 5 boundary
verification 2026-08-06, by the orchestrator, when a correct implementation
returned `1` against an expected `>= 3`.

`grep -c` counts MATCHING LINES, not occurrences. Vite's production bundle is
minified to a single line with no trailing newline (`wc -l dist/assets/*.js`
-> `0`), so `grep -c <alternation> dist/assets/*.js` returns at most `1` no
matter how many of the alternates are present. Every per-task probe of the
form "grep >= N" for N > 1 is therefore unsatisfiable by construction:
**T5** (>= 3), **T6** (>= 5), **T7** (>= 2), **T8** (>= 4). Verified on T5's
real output -- all three strings ARE present by occurrence count (`ORACLE IS`
x1, `dock here` x2, `aglow` x3) while `grep -c` reported `1`.

Second, subtler defect in the same construct: an alternation count does not
prove each alternate is present. On a multi-line file `grep -c "A\|B\|C" >= 3`
passes on three lines matching `A` alone, with `B` and `C` missing entirely --
exactly the copy-lock regression these probes exist to catch.

**Disposition:** all four probes amended to the per-string loop idiom the
phase's own A2 boundary probe already uses (`for s in ...; do grep -rlq "$s"
... && echo "YES  $s" || echo "NO   $s"; done`), which asserts each string
INDIVIDUALLY. This is strictly STRONGER than what it replaces -- it closes
both the single-line blindness and the alternation loophole -- so the
assertions are corrected and hardened, never weakened. Task 9's probe needs no
change: its bundle leg expects `>= 1` (reachable) and its other leg greps a
multi-line source file. Boundary probe A2 was already written in the correct
idiom and is untouched -- the defect was confined to the per-task copies.

Third instance of the plan-literal-unsatisfiable-in-its-own-state class
(F11 tree-shaking, F13 population range, now this), and the second caught by
running a probe rather than reading it.

**F16 (minor but sharp-edged, execution-time, carried into all remaining Phase
3 briefs) -- boundary probe A5 greps for the LITERAL `location.search`, so
writing that string in a `src/components/` COMMENT fails the audit.** Surfaced:
Phase 3 Task 5 execution 2026-08-06, by the implementer, on itself: its first
draft explained the P4 seam in a comment using the exact string
`location.search` and tripped its own purity grep. Reworded to "no URL
parsing".

A5 is `grep -rn "fetch(\|location.search" src/components/ src/generators/`
expecting zero hits. `fetch(` is call-shaped and hard to write accidentally,
but `location.search` is the natural way to NAME the thing a comment is
promising not to do -- so the most conscientious implementer, documenting the
discipline it is honoring, is the one most likely to fail the probe. The probe
is not wrong (a literal grep is the right blunt instrument for "no URL parsing
in components"); the hazard is that its failure mode reads as a violation when
it is a comment.

**Disposition:** pinned in the T6/T7/T8/T9 dispatch briefs as an explicit
out-of-scope line -- describe the seam as "no URL parsing", never by quoting
the API. No probe change: weakening A5 to exclude comments would cost more than
the hazard is worth, and the workaround is a two-word rewording.

**F17 (advisory, routed to the operator ritual pre-brief) -- station numbers
now format site-side, so the comp's numbers differ from the deploy's by more
than staleness.** Surfaced: Phase 3 Task 5 execution 2026-08-06, by the
implementer. The mockup's `DC.num` is a pre-formatted STRING (`"11,081"`); the
manifest ships a raw integer and the site formats via
`toLocaleString('en-US')` per Port discipline. Most visible instance: `cm`'s
station subs read `messages · 40,219 threads` / `13,134 solved` on the deploy
against the comp's `20,270` / `6,666` -- a 2x gap that looks like a bug at a
glance. This is P2 working as designed (manifest is truth; the comp's inline
values are a 2026-08-05 snapshot), and ritual deviation D-b already sanctions
"numbers differ -- check FORMAT, not values". **Disposition:** D-b amended to
name the `cm` thread/solved figures concretely so the operator meets the number
in the deviations pre-brief rather than discovering it mid-walk and logging a
false V2/V3 mismatch. No code change.

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
