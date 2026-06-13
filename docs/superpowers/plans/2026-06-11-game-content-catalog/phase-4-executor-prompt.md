You are EXECUTING Phase 4 of the game-content-catalog completion arc
(2026-06-11) -- the FINAL phase. Invoke the `arc-executor` skill first; this
prompt is your phase-execution input.

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer (id1
audit + monsters + KTX overlay + join keys). You are in the WRONG arc if you
see yourself working on: L3 concept notes / weapon-pair notes (demand-driven-l3),
VitePress or apps/docs-web (docs.quake.world), match_event/log_template
extraction (KTX onboarding), or Postgres migration SQL (qw-oracle Arc 1). If
the task in front of you looks like one of those, HALT and tell the operator.

This is an EXECUTION session of FULLY-LOCKED CONTENT: every task is `inline`
(D19) -- no fan-out, no subagent, no Workflow, no synthesis. You apply the
MD's locked YAML/TS/doc edits, run loads/probes, present the doc-walk to the
operator, and commit. Do NOT redraft the phase MD or relitigate decisions.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-4-joinkeys-docs.md
   -- THE phase plan. Tasks 1 (map_summary_key props) -> 2 (SCHEMA.md) -> 3
   (RUNBOOK) -> 4 (verify-gameplay.ts) -> 5 (snapshot + MCP spot checks) -> 6
   (closeout). Its Verification section (11 checks) is your exit gate.
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- all 22; D5, D7, D8, D13, D14, D16 (incl. 2026-06-12 amendment), D17,
   D18, D19, D20, D21, D22 bind this phase directly.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- this phase owns F4 (verify-gameplay), F5 (citation-form doc text), F6
   (SCHEMA.md count drift). F18 context (snapshot/deploy).
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-findings.md
   -- the audit ledger, IF you need to re-baseline a verify-gameplay pin (you
   will NOT -- see augmentation 3).
5. Operator memories: feedback_no_subagents_for_mechanical_edits (this whole
   phase is the inline case -- honor it), feedback_verify_git_staging,
   feedback_idempotency_before_staleness.

ORCHESTRATOR AUGMENTATIONS (2026-06-13, post-Phase-3 boundary; every claim
below LIVE-VERIFIED by the orchestrator before writing this):

1. EXECUTION GATE: LIFTED (D16 amendment). Recount discipline stands:
   re-read the LIVE id1 item cluster before Task 1 (the MD says so).
2. ALL FOUR prior phases shipped + boundary-verified. Live catalog:
   id1 = 52 entities (25 items, 15 monsters, 8 weapons, 4 projectiles) /
   53 mechanics; ktx = 11 override entities + 15 override mechanics (seed) on
   top of the extractor's 13 bloodfest monsters + taxonomies. expected_counts:
   id1 {52, 53}, ktx {11, 15}. Phase 4 adds PROPS only -- counts MUST stay put.
3. verify-gameplay.ts pins -- NO RE-BASELINE NEEDED (orchestrator checked all
   six against the live id1 DB today): lava=client.qc:825, gib_threshold=
   player.qc:598, telefrag=triggers.qc:334, exit_level_kill=client.qc:230,
   trigger_hurt=triggers.qc:548, rocket_launcher source_ref=weapons.qc:385
   damage=110 splash=120. Every literal in the MD's locked verify-gameplay.ts
   already matches live -- Phase 1's audit moved NONE of them. Apply the
   locked file as-is; CONFIRM the six against live (one SELECT) but expect
   zero changes. Still run the script yourself and paste output.
4. Task 1 mapping -- LIVE-CONFIRMED EXACT MATCH. The 20 live
   maps.item_summary_json keys are exactly {bio cells ga gl h15 h25 lg mh ng
   pent quad ra ring rl rockets shells sng spikes ssg ya} (all lowercase) and
   the 25 live id1 item row names exactly match the locked table (incl.
   nails_small/large->spikes, biosuit->bio, the pickup_* weapon rows, the
   cells/shells/rockets small+large pairs, backpack->no key). No Track-A
   rename landed. Apply the 24-row mapping as locked; the coverage + shape
   probes (24 keyed / 20 distinct) should pass first try.
5. SCHEMA.md anchors LIVE-CONFIRMED: `~309` appears at TWO spots -- :530
   (v14 gameplay_mechanics bullet, inside a longer parenthetical) and :881
   (KTX onboarding Migration C). Fix BOTH per the MD's Task 2. The RA/YA/GA
   uppercase key list is at :496 exactly as the MD quotes. After your edits,
   `grep -n "~309" SCHEMA.md` must return nothing.
6. HANDOVER:43 is a BUNDLED line (two clauses): the `verify-rewrite.ts`
   env-propagation half (NOT this arc -- KEEP) + the `verify-gameplay.ts`
   stale-counts half (this arc / F4 -- STRIP). Apply the MD's Task 6 from->to
   replacement. NOTE for grepping: the live text is "`verify-gameplay.ts`
   asserts stale hardcoded counts" with a BACKTICK after `.ts` -- match on
   "asserts stale hardcoded counts" to find it. Do NOT remove the
   verify-rewrite half.
7. GIT SCOPE TRAP (D17) -- the slipgate data dir
   apps/slipgate-app/src/lib/config/data/ currently holds TWO LIVE
   sibling-arc uncommitted files: ezquake-asset-bundle.json and
   fte-asset-bundle.json. Your Task 5 regenerates qw-gameplay.json INTO that
   same dir. Stage ONLY qw-gameplay.json from there -- NEVER `git add -A`,
   never `git add` the dir. Revert qw-maps.json (build-snapshot rewrites its
   timestamp only): git checkout -- apps/slipgate-app/src/lib/config/data/qw-maps.json.
   The full Phase 4 git scope is EXACTLY six paths: id1-gameplay.yaml,
   SCHEMA.md, VALIDATION-RUNBOOK.md, serve/mcp/scripts/verify-gameplay.ts,
   apps/slipgate-app/src/lib/config/data/qw-gameplay.json, HANDOVER.md.
   `git diff --cached --stat` between add and commit; fresh commit, no amend.
8. F18 (carry-forward, not yours to resolve): the session's connected
   qw-oracle MCP is REMOTE PROD -- it does NOT see the dev DB. Run Task 5's
   "MCP spot checks" against the dev-DB code path / SQL (the way Phase 2
   verified its roster), NOT the connected remote MCP. The prod deploy is an
   arc-reviewer carry-forward, out of this phase's scope (D14).
9. API params LIVE-CONFIRMED present: searchGameplayEntities has `has_splash`;
   searchMechanics has `gameplay_source` + `limit`; the `build-snapshot
   --project <p>` dispatcher subcommand exists. The locked verify-gameplay.ts
   and Task 5 regen will compile/run as written.
10. Findings: review-findings.md is at F21. This phase's F4/F5/F6 are resolved
    by the locked doc/code edits (no new F-numbers expected). If something
    genuinely new surfaces, append at F22+. The doc-walk is an OPERATOR floor
    (boundary check 10) -- present the two new doc sections (SCHEMA.md
    "Gameplay conventions" + RUNBOOK "qw gameplay validation") for the
    operator to read and confirm before you call the phase DONE.
11. ORCHESTRATOR-OWNED CLOSEOUT (NOT yours -- Task 6 says so explicitly): the
    HANDOVER "Active arcs" entry move to SHIPPED (:24), the arc-history.md
    entry, the `arc-game-content-catalog-shipped` git tag, and the post-arc
    handoff to arc-reviewer are the ORCHESTRATOR's job after your boundary
    verification. You edit ONLY the HANDOVER:43 small-followups clause (Task
    6 step), nothing else in HANDOVER. Do NOT write arc-history; do NOT tag.

Process discipline (held all 4 prior phases): gates run against the FINAL
tree state, in YOUR main thread, immediately before the halt -- never
inherited from an earlier task, never relayed. Paste actual outputs.

HALT-AND-REPORT SHAPE (end your session with exactly this):

- STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Task records: Task 1 (keyed_rows/distinct_keys + coverage-probe result);
  Task 4 (the six-pin live confirmation + verify-gameplay.ts output);
  Task 5 (the three snapshot greps + three MCP/SQL spot-check results).
- Operator doc-walk: confirm you presented both doc sections and the
  operator's accuracy verdict (or note it as pending if the operator
  deferred).
- Phase boundary verification: each of the MD's 11 checks with the ACTUAL
  command output pasted (the two Task 1 SQLs, both seed loads, citation-gate
  all-sources, both seed-idempotency, both F1 grids, verify-gameplay.ts,
  typecheck, the three snapshot greps, the three MCP spot checks, the doc
  walk, git diff --cached --stat = exactly six paths).
- Commit made (SHA + message). One commit; props+docs+verify+snapshot+HANDOVER
  is the coherent unit (or split docs from data if you prefer -- your call,
  but keep qw-maps.json reverted and the two asset-bundles unstaged either way).
- New findings appended (F-numbers + one-line each), if any.
- Open questions for the orchestrator/operator, if any.

Do NOT write arc-history.md, do NOT tag, do NOT move the HANDOVER active-arc
entry, do NOT touch describe-mode.ts or any MCP tool code (F9 deferred; D14).
After you halt DONE, the orchestrator runs the final boundary verification,
handles the closeout rituals, and routes a fresh terminal to arc-reviewer.
