# Handoff: KTX L1 apply-pass strategy session

**Date**: 2026-05-27
**Owner**: fresh terminal (single-session scope, deliverable is a runbook or skill spec, not the apply itself)
**Estimated effort**: 1-2 hours

## Why this exists

The KTX L1 chunked-mode dispatch arc shipped 2026-05-27. It produced 633 v2-shape recast drafts for the KTX cvar + command corpus, distributed across 18 batch files at `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`. Per the post-arc analysis split: ~430 "drafted_clean" + ~200 "drafted_with_flag".

- **drafted_clean** -- per-card sub-agent generated a draft with no concerns; apply text directly to `entities.description` and move on.
- **drafted_with_flag** -- per-card sub-agent generated a draft AND surfaced one or more flag-bullets noting source-truth concerns (wrong default, mislabeled permission, dangling See-also, foundational framing fix, etc.). The flags were a deliberate output of the per-card skill -- they're real factual catches against source-truth, not stylistic nits. They need operator-in-the-loop resolution before the draft text lands in the DB.

The drafts are NOT yet in the DB. Live entity descriptions for those 633 entities are mostly the older pre-rewrite text. Closing the apply pass = "KTX has its first real corpus-wide L1 documentation."

A sibling sub-arc shipped same-day (the 6 user-facing userinfo keys at `kf`, `k_nick`, `k`, `k_sdir`, `postmsg`, `premsg`) -- those got applied directly in their close-out because 6 entities is small enough to author and apply inline. The 633-card pile is too large for that pattern; needs structure.

Post-arc analysis Recommendation #2 is the apply pass; Recommendation #6 is the deferred open question of whether to build a small skill/runbook for it OR do it operator-driven. **Your session's job is to decide.**

## Your job (single session)

Brainstorm the apply-pass approach with the operator. Output: a clear plan the operator signs off on, plus EITHER a small skill spec OR a runbook (depending on what's decided). Do NOT execute the apply pass in this session -- that's downstream work.

## Key questions to resolve

1. **Granularity.** Per-card review with operator at every flag? Per-batch sign-off (Claude batch-applies the clean drafts in a file, pauses at each flag)? Bulk-apply with retroactive review? Pick what fits operator pace.

2. **Tooling.** Operator-driven (Claude reads draft + applies in conversation), small read-draft-write-DB skill, or full apply-pass dispatcher? Cheapest answer that gets the work shipped reliably.

3. **Flag-resolution shape.** What's the operator's role in flag resolution -- confirm the flagged concern, propose the amendment, just choose accept/amend/park? Names should be short and the loop should be tight.

4. **Sequence / interleave.** Apply pass is the 633 cvar+command drafts. There's a separate sweep-triage workstream (~38 info_key entities surfaced by the 2026-05-27 userinfo arc, currently with stub auto-descriptions). Same workstream or separate? Cold-synth needed for the sweep first; the cvar+command apply doesn't have that prerequisite.

5. **Verification gate.** After apply, what confirms it landed correctly? Lexical search works immediately (`description_tsv` is a generated column from `description`); semantic embeddings need a Voyage refresh on the `description_embedding_stale=TRUE` rows. Where's the "done" line for each batch and for the whole pass?

## Reads required (cold)

1. `docs/superpowers/reviews/2026-05-27-ktx-l1-chunked-mode-dispatch-arc-post-arc-analysis.md` -- read Sections YELLOW 2, YELLOW 7, and Recommendations #2 + #6 in particular.
2. `apps/qw-oracle/docs/arc-history.md` -- top entries cover the chunked-mode dispatch arc + the 2026-05-27 userinfo sibling arc.
3. `HANDOVER.md` -- "Ongoing arcs" section (catalog walk, KTX visual review) + "Small followups" (the ~38-entity sweep triage entry, the apply-pass tooling deferred question).
4. `apps/qw-oracle/docs/reviews/` -- list all `ktx-l1-rewrite-drafts-*.md` files (`ls` count). Spot-read ONE batch with high clean count and ONE batch with many flags to ground the brainstorm in actual content. Good candidates: the 2026-05-23 server-config batch (clean-heavy) vs the 2026-05-27-frogbot-followup batch (flag-heavy per HANDOVER's mention).
5. `~/.claude/skills/ktx-l1-rewrite/SKILL.md` -- the per-card skill that produced the drafts. Tells you what the flag categories look like (Permission-line corrections, default-value contradictions, missing prereqs, See-also asymmetry, etc.).
6. DB shape:
   ```sql
   SELECT description_origin, COUNT(*)
   FROM entities WHERE project='ktx'
   GROUP BY description_origin;
   ```
   Tells you the current coverage by origin (`synthesized` / `source_inline` / NULL / etc.). The deltas vs the 633 draft count are what the apply pass closes.

## Discipline anchors (from operator memory)

- **Plain English at decision points** ([[feedback_plain_english_at_decision_points]]) -- sign-offs lead with plain English; specs/SQL go to a drained spec, not into the decision conversation.
- **One question at a time** ([[feedback_one_question_at_a_time]]) -- interactive scoping is one question per turn; don't fire 4-option menus until the operator is aligned on premise.
- **Source-truth discipline** ([[feedback_no_inference]] + [[feedback_source_comments_are_hypotheses]]) -- when a flag claims "default should be X, source says Y," verify the source claim before accepting either side. Comments in source are hypotheses; live consumers are truth.
- **Verify drafter-subagent claims** ([[feedback_verify_dispatched_terminal_claims]]) -- the per-card sub-agents' drafts and flags are hypotheses; spot-check a sample against live source before designing the apply flow that trusts them.
- **HANDOVER / arc-history claims decay** ([[feedback_handover_claims_decay]]) -- the "~200 flagged" count in the post-arc analysis was point-in-time. Re-derive the actual clean-vs-flag split from a live file walk before scoping. `grep -c 'drafted_with_flag' apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md` gets you started.
- **Best tool wins, no overkill filter** ([[feedback_best_tool_no_overkill]]) -- if the brainstorm reveals a small skill saves real time, build it; don't pre-reject on "but it's just an apply pass."
- **Skill size discipline** ([[feedback_skill_size_lean_skill_md]]) -- if a skill is the answer, keep SKILL.md under ~300 lines; externalize per-flag-category guidance to `references/`.

## Deliverable

One of:

**(a) Runbook** (operator-driven apply pass, no new tooling) -- a short markdown at `docs/superpowers/parking/2026-05-28-ktx-l1-apply-pass-runbook.md` (or the date you land on) describing:
   - The per-session loop (read drafts file N -> classify each entry clean/flag -> for flags, operator decides accept/amend/park -> write to DB).
   - The per-card UPDATE shape (which fields land: `description`, `description_origin='applied'` or similar, `description_anchor_version`, `description_embedding_stale=TRUE`).
   - Estimated per-session output rate (e.g. "30 clean cards + 10 flag-resolutions per session").
   - Total estimated sessions to drain 633 cards.

**(b) Small skill spec** (light tooling around the apply loop) -- a spec at `docs/superpowers/specs/2026-05-28-ktx-l1-apply-pass-skill-design.md` covering:
   - Skill-vs-runbook trade-offs (why the brainstorm picked the skill).
   - The skill's three to five primitives (read-batch, render-card, apply-to-DB, resolve-flag, advance-pointer).
   - Flag-category taxonomy and how the skill prompts the operator per category.
   - Arc plan if multi-session execution is expected (use `arc-planner` if it surfaces as arc-shaped).

Pick based on what the brainstorm reveals about the per-card review rate the operator wants and how mechanical the flag resolution looks after sampling.

## First three actions

1. **Read this handoff fully + the reads above in cold.** No anchored expectations from prior sessions.
2. **Surface the actual numbers before the brainstorm.** Run the file walk + DB query above and report: how many draft files, how many drafted_clean vs drafted_with_flag entries actually exist, how many entities currently have synthesized descriptions vs would-get-overwritten descriptions. Ground the conversation in current facts, not the post-arc analysis's point-in-time numbers.
3. **Open the brainstorm with the operator.** Lead with Question 1 (granularity) -- the others flow from it. One question per turn per `feedback_one_question_at_a_time`.

## When in doubt

- **Skill vs runbook**: lean runbook unless the brainstorm reveals concrete tooling wins (e.g. flag-resolution has predictable categories that map cleanly to canned operator prompts and would save many turns). Operator is unlikely to want skill-building overhead for a one-time apply pass.
- **Per-card vs batch granularity**: lean per-card if the flag rate is high (operator needs to be in the loop for each); batch if the clean rate is high (let clean drafts flow, pause at flags).
- **Wider sweep interleave**: lean SEPARATE workstream unless the brainstorm reveals it's cheaper to interleave (e.g. the cold-synth for the 38 fan-outs in parallel while the apply pass drains the 633). Sweep needs cold-synth first; apply pass doesn't.

## Out of scope for this session

- Doing the actual apply work. That's a downstream execution session.
- Designing the cold-synth pipeline for the ~38 sweep entities (separate sub-arc; tracked in HANDOVER Small followups).
- MVDSV / QWFWD / QTV planning (post-arc analysis Recommendation #5; blocked on YELLOW 1 dispatcher dial-discipline resolution per that doc).
- Building the apply skill/runbook itself end-to-end -- the deliverable is the DESIGN (runbook spec or skill spec), not the implementation.
