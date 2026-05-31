# QTV / QWFWD documentation -- arc capture

**Captured:** 2026-05-31 by arc-classifier mode S (shelved -- "park" = defer).
**Status:** shelved (awaiting trigger).
**Trigger to start:** operator-initiated -- when QW streaming/proxy infra is wanted in the oracle (natural follow-on to the MVDSV describe-fill arc, or when the QTV viewer/hub work needs an authoritative config reference). No hard dependency; can start any time after the Go-toolchain decision below is made.

> Captured warm during the MVDSV `sv_demo*`/qtv describe-fill batch-2 conversation (2026-05-31). The landscape below was established from source + a server-admin ground-truth check, so the future brainstorm does NOT need to re-derive it.

## Why this is arc-shaped

- **Spec required (the pivotal one):** the QTV that's actually deployed is **Go**, and the existing L1 extractor pipeline is libclang (C) + tree-sitter (KTX) -- there is **no Go path**. A toolchain decision must precede any plan.
- **Cross-cutting decisions:** which QTV implementation is the target; Go-extractor vs hand-curated-L3; whether QWFWD is a separate C onboarding; the See-also/provenance wiring back to the MVDSV `qtv_*` rows.
- **Multi-phase + multi-terminal:** onboarding a codebase to L1 is the established extractor -> fill -> concept-note progression (cf. `onboard-extractor`), each phase its own runnable commit.

## Scope sketch

Document the QuakeWorld streaming/forwarding infrastructure for the oracle so an admin (or the slipgate config tooling) can look up what QTV/QWFWD knobs do, the same way the engine cvars are covered. End-state: QTV (and/or QWFWD) config surface in L1 and/or an L3 concept-note, See-also-linked from the MVDSV `qtv_streamport`/`qtv_maxstreams`/`qtv_password` rows shipped in describe-fill batch 2. The MVDSV side (the server's built-in stream SOURCE endpoint) is already done; the uncovered piece is the **proxy** (QTV) and the **forwarder** (QWFWD).

The codebase landscape (established this session, from source):

| repo | what | language | status |
|---|---|---|---|
| `fte-team/fteqw` -> `fteqtv/` | the ORIGINAL QTV (Spike); where the QTV protocol was born. NOT FTE-client-only -- speaks ezQuake + NQ protocols. | C | obscure; a server admin running most servers "didn't even know it existed". Last touched 2026-01 (warning fixes). |
| `qqshka/qtv-go` | qqshka's Go rewrite of original QTV. | Go (1.19) | the original "qtv-go". |
| `QW-Group/qtv` | community-org continuation of qtv-go (`main.go` byte-identical, Go 1.24, +1 file). | Go (1.24) | **the deployed, canonical one** -- this is what "everyone uses". |
| `qqshka` QWFWD | a QW server FORWARDER/proxy (UDP routing; not QTV). Orig. Chris Faherty, adopted by qqshka. Shares qtv-go's release infra. | C | separate concern; C -> fits the libclang pipeline. |

So it is really **2 codebases**: the C original (fteqtv, unused) and the Go rewrite (qqshka/qtv-go -> QW-Group/qtv, deployed). QWFWD is a third, unrelated C codebase.

## Open questions for the brainstorm

- **Target:** `QW-Group/qtv` (Go, deployed) or `fteqtv` (C, fits the pipeline but unused)? Documenting the used one means Go.
- **Go-toolchain:** if Go, build a Go L1 extractor (`go/ast` is clean for pulling config knobs; or tree-sitter-go) -- what's the lift, and does it unlock other Go QW tooling worth the investment? Or hand-curate the QTV config at L3 (concept-note) instead of pipeline-extracting?
- **QWFWD:** onboard via the existing libclang pipeline (`onboard-extractor`)? Fork-vs-port: `main.c` shows Chris Faherty original + qqshka adoption -> likely a cross-codebase port (fresh handlers extending Visitor), not a fork of an existing project tree.
- **Surface size:** does the QTV/QWFWD config surface justify full L1 extraction, or is it small enough for a hand-authored concept-note + the MVDSV `qtv_*` See-also?
- **Cross-codebase auth matrix (the `qtv_password` payoff):** MVDSV-source accepts plaintext/CCITT/MD4/SHA3-512; fteqtv negotiates PLAIN/MD4/SHA1 (CCITT disabled, no SHA3). What does `qtv-go` actually negotiate? That matrix is the L3 concept-note content that the MVDSV `qtv_password` row's See-also would point at.

## What is NOT in scope

- **fteqtv as a primary target** -- it's the obscure original; document only as protocol-origin/historical reference, if at all.
- **The hub.quakeworld.nu web QTV viewer** (`qtv`/`qtv-popout` in that repo) -- that's a TS/React frontend stream player, a different concern.
- **Re-opening the MVDSV `qtv_*` L1 rows** -- shipped in batch 2 (commit `66cf40bc`); they are the See-also anchors, not to be re-litigated.

## Operator notes

- **Ground-truth (Discord, 2026-05-31):** server admin "oddjob" (runs most of the servers): *"everyone uses qtv-go now. fteqtv i didn't even know existed."* This outranks any source-recency inference -- `QW-Group/qtv` (Go) is the deployed target.
- **Pending micro-decision (not blocking this arc):** the MVDSV `qtv_password` L1 row lists the specific auth methods (CCITT/MD4/SHA3-512). Recommended trim to "...as the shared secret for challenge-based authentication" (method names -> `description_reasoning`/L3), via `synthesize-mvdsv.ts --operator-override qtv_password`. Still awaiting operator go.
- **Recommended EXECUTION pattern (operator's idea, 2026-05-31):** run note/extraction batches as a "mother" terminal that owns a living prep+learnings ledger, with disposable per-batch workers (sub-agents or branched terminals) that read the ledger warm, do one batch, and return a tight DELTA the mother appends -- so each batch starts better-calibrated without bloating the mother's context. (Same pattern the operator is applying to the KTX notes work.) Generalizes the describe-fill calibration-ledger -> batch-ledger progression.

## Related

- MVDSV `sv_demo*`/qtv describe-fill batch 2 -- commit `66cf40bc`; ledgers in `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_*.md`. The See-also anchors.
- `onboard-extractor` skill -- the C-codebase onboarding path (QWFWD fits; Go QTV does not).
- `project_extraction_pipeline_vision` memory -- the four-project ship; QTV/QWFWD would extend it (and force the Go-extractor question).
- The MVDSV describe-fill arc (`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`) -- this arc is a downstream sibling.
