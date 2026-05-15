# Fresh-terminal handover: ezQuake help-JSON audit -- cvar pass DONE, resume the OPTIONS DISCUSSION

**Date:** 2026-05-15. **For:** a fresh terminal, cold. **Supersedes:** `2026-05-15-handoff-ezquake-helpjson-userdoc-gap-audit-restart.md` (consumed -- restart done, Phase A done, cvar pass done). **Mode:** the operator wants to **discuss options**, NOT execute. Do not dispatch workers or run the remaining passes on arrival. First action is a conversation.

## One-paragraph state

The restart succeeded. Phase A (foundation) verified clean. The audit-doc rubric was corrected and operator-locked. The full **cvar pass is complete and integrity-verified**: 124/124 verdicts, 0 missing/extra/dupes, Opus-max reviewed (0 DISAGREE). Then an operator spot-check found a **structural blind spot the entire automated pipeline missed** -- and that finding is the reason for this reset and the thing to discuss first. Nothing is committed-as-shipped; the cvar verdicts live in `/tmp`. The command/cmdline/macro passes are NOT started and are BLOCKED on the reachability decision.

## What is DONE and verified (do not re-do)

- **Phase A foundation (SQL-verified, exact to anchors):** ezQuake `source_backed` cvars = 2741; by `entities.description_origin`: `help_json` 2012 / `NULL` 708 / `source_inline` 21 = **729 raw gaps**; **101** are `sv_*` (-> MVDSV scope-filter). Predicate cross-check: JSON-file predicate vs DB-provenance predicate = **0 dangerous-direction disagreement**; the 124-vs-120 delta decomposed entity-by-entity (no unexplained residue). Foundation is clean.
- **Audit-doc rubric corrected + operator-locked** (`docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`, edits committed this session):
  - **No escalation verdict.** `kick_to_ciscon` is dead -- ciscon is QWiki/community, not ezQuake-dev; there is no one to "kick to." "Unclear" => investigate ourselves; worst case low-confidence needs_doc with stated uncertainty.
  - **Three outcomes only:** family_collapse -> no_doc -> needs_doc (first match).
  - **Decision A (locked):** unregistered-in-source + absent-from-help-JSON => no_doc, never family_collapse.
  - **Decision B (locked):** client vs server is a *semantic* call from source context (`#ifdef USE_PR2` / `SERVERONLY` / `pr2_*`/`sv_*` subsystem = server -> no_doc acceptable; rendering/input/HUD/netcode = client -> needs_doc), NOT the name/prefix. Coin-toss => low-confidence needs_doc (operator bias: over-document beats under-document). `trailing_comment` is a HINT for the judgment, never the doc text.
  - **Output contract:** EVERY row carries verdict + confidence + reasoning. no_doc reasoning MUST justify why an empty docs.json is correct.
  - **`sv_*` is a scope pre-filter** (MVDSV's code), not an escalation.
  - The `--10%` drift line was replaced with "reconcile vs live provenance census, 0% residue."
- **Pipeline (proven):** per-source-file Sonnet worker sub-agents (the executor prompt is in the audit doc + was refined to the locked rubric) -> Opus-max reviewer pass (audits every no_doc + every low/medium + family_collapse) -> overseer integrity reconcile (DB/source-scoped: every queue entity has exactly one verdict, 0 dupes, structural sanity, spot-checks vs primary source).
- **cvar pass COMPLETE:** 124/124 verdicted across 24 `/tmp/audit-batch-cvar-*.yaml` files. Distribution: **84 needs_doc** (79 high / 3 med / 2 low) / **28 no_doc** (25 high / 3 med) / **12 family_collapse** (all high). Opus-max reviewer: 0 DISAGREE, 2 CONCERN (operator-decision borderline calls). 97 stale paused-run batch files archived to `/tmp/_paused_run_stale_2026-05-15/` (idempotency clean). Review surface (self-contained HTML): `/tmp/cvar-audit-review.html` and `/mnt/c/Users/Administrator/Downloads/cvar-audit-review.html`; regenerator `/tmp/gen_cvar_html.py` reads the 24 yamls.

## THE OPEN ITEM -- runtime-reachability blind spot (discuss this first)

`sb_qtvlist_url` was verdicted `needs_doc/high`; the Opus-max reviewer **agreed** (not flagged). The operator typed it in their 3.6.9 console -> nothing. Verified against HEAD + the 3.6.9 tag:

- It IS a real cvar in source since ~2010 (`371f9a60 "initial qtv browser functionality"`; L1 `first_seen=v3.0`), present in the 3.6.9 source tag, declared `EX_browser_qtvlist.c:30`, read at `:285`, `Cvar_Register(&sb_qtvlist_url)` at `:583`.
- BUT the only registrar is `QTVList_Init()`, and `QTVList_Init()` has **zero call sites** anywhere in `src/` at HEAD **and** in the 3.6.9 tag. The registration is dead code. The cvar is never registered at runtime. (Two independent confirmations: static grep = no caller; operator console = empty.)
- NOT yet verified: removed-by-regression vs never-wired (git history of the `QTVList_Init` call site not checked). `QTVList_Init` also registers the `observeqtv` command -- testing `observeqtv` in console is a cheap confirmatory cross-check.

**The class:** "registered-in-an-uncalled-function" -> runtime-dead. Distinct from ghost (not in source), commented-out register (`gl_outline_scale_world`), and registered-but-never-read. **The source-only pipeline (worker AND Opus reviewer) structurally cannot see this** -- it verifies presence (declared / Cvar_Register present / read site present), not call-graph reachability of the registration site. AST extraction proves a cvar is *written in the code*, not *reachable in a running build*. "source_backed" in L1 means "registered in code," not "registered at runtime." Correct disposition for `sb_qtvlist_url`: NOT needs_doc, NOT really no_doc -- it's an upstream **code bug** (orphaned feature init), a different channel. Blast radius unknown: other entries among the 84 needs_doc may be stranded the same way.

### Options to discuss (seed for the conversation -- operator decides)

1. **Reachability post-sweep over the 84 needs_doc** before anything ships/fans out: for each, extract the enclosing function of its `Cvar_Register` site, grep that function's call sites, flag every zero-call one. Quantifies the blast radius. (Recommended as the immediate move.)
2. **Add a reachability step to the worker rubric** for the command/cmdline/macro passes (commands are registered in init functions too -- same exposure). Cheap-ish per entity (one grep for the enclosing function name).
3. **L1-extractor enhancement:** make the extractor compute call-graph reachability of registration sites. Durable, benefits all future audits + fixes the "source_backed != runtime-live" L1 semantics gap. Bigger; connects to `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` and the s_stereo lifecycle precedent in `2026-05-15-l1-extractor-entity-classification-followups.md`.
4. **Scope decision:** is "in source but runtime-dead" out of audit scope (route to an upstream-code-bug channel for nano/slime) vs in scope (audit must not emit needs_doc for it)? Affects how 1-3 are framed.

## Other pending decisions (operator has NOT signed off; do not apply unilaterally)

- **Dead-stub sub-rule** (reviewer-proposed, distinct from the reachability item): registered + zero read sites => no_doc/high, UNLESS (a) `system-generated:true` in help-JSON OR (b) a documented sibling's `remarks` names it => needs_doc/low with reasoning stating "registered, never read; documenting self-flagged/expected intent." Would make `gl_outline_scale_world`/`show_velocity_3d_offset_*`/the 2 concerns consistent. Needed before the command pass (registered stubs are common there).
- **2 reviewer CONCERN fixes** (both follow the locked Decision-B bias; recommend apply): `localid` no_doc/med -> **flip to needs_doc/low** (registered + in-JSON + system-generated; a no_doc buries a self-flagged gap). `cl_voip_demorecord` needs_doc/med -> **keep needs_doc, downgrade to low**, reasoning rewritten ("confirmed dead client stub; VoIP-demo recording is server-side `sv_voip_record`; documenting intent per the system-generated flag, not observed behavior").
- **Ghost no_doc reasoning sharpening:** the 7 group-43 server stubs (`sv_cpserver`, `sv_qwfwd_port`, `sv_enableprofile`, `sv_cullentities`, `sv_ktpro_mode`, `sv_demonovis`, `sv_use_internal_cmd_dl`) -- never-source-registered, entered help_variables.json at the XML->JSON conversion (`4d5bfe05`), outside PR #1120's frozen 156-entry scope. Reasoning should say "never-source-registered conversion-era Server-Settings stub, out of #1120 scope," not "removal drift."
- **#1120 follow-up:** the 7 group-43 stubs -> a small upstream `help_variables.json` cleanup PR (not a user-doc deliverable, not classifications.yaml). This is the scoping-blind-spot the parked `docs/superpowers/plans/2026-05-15-help-json-doc-consistency-gate.md` was written to close.

## BLOCKED until the reachability decision

- Command (154) / cmdline (54) / macro (38) passes. Queues exist: `/tmp/cmd-queue.json`, `/tmp/cmdline-queue.json`, `/tmp/macro-queue.json` (regen script `/tmp/regen-help-audit-queues.ts`, byte-identical to the audit doc's authoritative script). These types were never affected by the comment-promotion bug, but they carry the SAME reachability exposure (commands registered in init functions). Do not run them until 1-4 above is decided.

## Reads required (cold start)

- `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` -- THE authoritative rubric (now corrected; read the RESCAN banner + "Verdict rubric" incl. the "Tie-breakers (calibration-locked 2026-05-15)" subsection).
- This handoff (you are here).
- `/tmp/cvar-audit-review.html` -- the 124 verdicts, filterable; or the 24 `/tmp/audit-batch-cvar-*.yaml`.
- Memory: `reference_qw_oracle_extraction_liveness_gap` (the reachability principle), `reference_ezquake_dual_doc_model`, `reference_ezquake_dev_team`, `feedback_verify_dispatched_terminal_claims`.
- `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` -> "Cvar provenance pass" SHIPPED block (foundation history) + the s_stereo lifecycle (liveness precedent).

## Critical rules

- **Verify, don't infer.** This whole workstream exists because dispatched claims were trusted without verification. A worker/reviewer claim is a hypothesis until grep/SQL/source-confirmed; every DB count project-scoped. The reachability blind spot was found exactly because the operator verified against a running build -- keep that discipline.
- The operator is the rubric/verdict gate. Do not apply pending decisions, re-route verdicts, or run passes without explicit sign-off.
- DB: `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`. ezQuake source: `git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source` (HEAD `3f9e724f`). Solo-dev; Claude runs git silently; commit to `main`; no PR/branch ceremony.
- The teamplay_restricted "inversion" remains a CLOSED non-finding -- do not resurrect.

## First three actions (conversation, not execution)

1. Read the audit doc rubric + this handoff + skim `/tmp/cvar-audit-review.html`. Do NOT dispatch anything.
2. Open the options discussion with the operator on the reachability blind spot (the 4 options above) -- that decision gates everything else. Surface (do not pre-apply) the 4 other pending decisions as the same conversation.
3. Only after the operator decides: apply the agreed rubric/verdict changes, run the reachability sweep over the 84, then unblock command/cmdline/macro.

## When in doubt

The question is user-facing documentation coverage, on a clean foundation, with honest verdicts. A clean "we found the blind spot and quantified it before shipping" beats a fast pass that ships needs_doc for cvars that don't exist at runtime. The operator's spot-checks keep finding real things -- treat that as the process working, not friction.
