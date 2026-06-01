# describe-fill batch ledger -- mvdsv `allow_download*` (download cvars, 4 of 8)

**Shipped 2026-06-01.** First **workflow-orchestrated** batch (Claude Code `Workflow`
tool pilot); the rest of the arc to date was hand-orchestrated from a clean-orchestrator
terminal. Synthesized + independently V-pass-verified 4 of the 8 `allow_download*` server
cvars; persisted to L1, idempotency + probes green.

## Scope

- **Shipped (4):** `allow_download`, `allow_download_maps`, `allow_download_models`,
  `allow_download_other`. All cold-synth (description was NULL); all `synthesized` /
  TRACED-CLEAN / high confidence. Per-knob ledgers: `mvdsv-download-ledger-<knob>.md`
  (one fenced D6Record each).
- **Deferred (4):** `allow_download_demos`, `allow_download_pakmaps`,
  `allow_download_skins`, `allow_download_sounds` -- same `Cmd_Download_f` if/else-if
  ladder (`src/sv_user.c:1457-1481`), trivial follow-on. `allow_download_skins` was used
  as this batch's V-pass canary, so it was deliberately not synthesized.

## Harness (pilot)

Workflow script `mvdsv-describe-fill-pilot`: 1 synthesis worker (4 knobs, model `opus`)
-> independent cold V-pass (5 workers = 4 real + 1 planted canary; each given knob +
description only). MAIN session did recon, F-D6a, HG2, and all persistence. Cost: **6
agents, ~313k subagent tokens, ~3.5 min** wall-clock.

Synthesis workers loaded the `describe-fill-synthesis` method by READING the SKILL.md + 6
references (deterministic; does NOT depend on Skill-tool invocation inside a workflow
agent). Quality matched the hand-orchestrated Opus-MAX baseline -- every record cited the
ENFORCING read-site in `sv_user.c` and flagged the `sv_main.c` registration as
"LOCATOR only (TRAP2)", i.e. handled the cross-file trap that the demo/qtv batch hit.

## Gates (all green)

- **F-D6a (fabrication):** all 4 source_refs (`sv_user.c:1459/1470/1474/1478`) verified
  vs live source; zero fabrication.
- **HG1 (canary):** planted inverted-polarity `allow_download_skins` row correctly flagged
  C-FIX (ground truth C-FIX), first try, no redispatch -- cold V-pass not rubber-stamping.
- **HG2 (re-grep both directions):** V-pass completeness nuances (pakmaps sibling gate;
  no-slash upstream deny) re-checked vs source, confirmed accurate; rows correctly held
  TRACED-CLEAN (the nuances are completeness notes, not contradictions).
- **Persist:** `--from-ledger` 4 persisted / 0 errors. **Idempotency:** re-run skipped 4
  as terminal-owned, fingerprint stable `09a0dedfa59e71191d09f0575cc3c1f9`.
- **Probes:** `jsonb_columns_not_strings`, `describe_fill.synthesized_requires_anchor`,
  `describe_fill.provenance_entry_exists` PASS. `describe_fill.origin_vocabulary` RED =
  unchanged pre-existing KTX `recast_v2` baseline (1266); **0 mvdsv contribution**
  (verified directly: mvdsv evaluated origins = `source_inline` 991 + `synthesized` 48 only).

## Refinements applied (operator-approved, post-V-pass)

- `allow_download_maps`: added `allow_download_pakmaps` to See-also (V-pass-surfaced
  sibling gate at `src/sv_user.c:1556`).
- `allow_download_other`: tightened "any other file type the server is asked for" ->
  "any other file located in a subdirectory on the server" (slash-less names are denied
  upstream at `src/sv_user.c:1465-1466` before reaching the catch-all else).

## Cursor

44 -> **48 / 347** evaluated. cvar bucket +4. Download cluster 4/8 done.
(NB: the orchestrator brief still reads 44 -- left as the sibling terminal committed it;
stage-0 `--status` reconciles. This batch ledger is the accurate record.)

## Learnings (workflow pilot -- adoption is the operator's open decision)

- The Workflow tool maps cleanly onto the orchestrator brief's dispatch-and-verify loop.
  The HG1 canary becomes a **deterministic JS assertion** -- stronger than manual because
  it cannot be forgotten or skipped.
- The independent V-pass surfaced two real refinements, but only in free-text `notes`. A
  structured `flags_for_review` field on the agent schema would surface those (and any
  off-scope discoveries / curveballs / suspected engine bugs) automatically instead of
  relying on a human reading prose. **RECOMMENDED before any wider workflow run.**
- Per-agent reasoning EFFORT is not settable via the Workflow `agent()` API (only model).
  MAX-grade quality held on this clean single-function cluster; UNPROVEN on gnarlier knobs
  -- the canary is the safety net there.
- Natural division that worked: workflow owns the parallel judgment (synthesis + cold
  V-pass + canary gate); MAIN owns recon, F-D6a, HG2, and all DB/git writes.
