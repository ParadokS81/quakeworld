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

**F4 (minor, resolved in draft) -- nginx `add_header` without `always` skips
non-2xx responses.** Surfaced: Phase 1 checker 2026-08-06 (verified live:
today's 404 carries none of the location's configured headers). The CORS line
would inherit the gap on error states. Disposition: routed back to the drafter
-- `always` on the three `add_header` lines.
