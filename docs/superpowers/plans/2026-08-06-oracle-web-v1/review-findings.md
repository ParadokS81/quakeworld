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
-- `always` on the three `add_header` lines.
