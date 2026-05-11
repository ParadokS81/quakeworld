# Slipgate Managed Mode -- Fresh-Eyes Design Review Handoff

> **For:** a reviewer (general-purpose agent or operator + fresh Claude session) who has NOT participated in any of the 6 brainstorm passes that produced this design. The review is meant to catch what the brainstorm sessions missed: load-bearing-but-unverified assumptions, missed user-flows, internal contradictions, ambiguous behavior, and integration points that aren't spelled out.
>
> **Context:** The Slipgate Managed Mode design is the largest and most coupled piece of architecture work in this monorepo. Six brainstorm passes ran across ~3 weeks (2026-04-28 to 2026-05-11), settling substrate / manifest schema / classifier / watcher / launch UX / catalog data shape. The cumulative design spec has never been read straight through with cold eyes. Before five+ implementation arcs lock in, the operator wants a fresh-eyes critical pass.

---

## Open this in a fresh terminal

This review is structurally a fresh-context job. A terminal that participated in any of the 6 brainstorm passes has anchored expectations and cannot deliver an honest cold read. Open a new Claude Code session in `/home/paradoks/projects/quakeworld/`. Do not load prior session memory beyond what's in this prompt and the linked docs.

---

## Reads required (in this order)

1. **Review-prep doc** -- `docs/superpowers/specs/2026-05-11-slipgate-managed-mode-review-prep.md`. Frames the review's scope, lists the load-bearing decisions to scrutinize hardest, and lists the deliberately-deferred carry-forwards so you don't waste time flagging them as "missing." **Read this first.**
2. **Vision spec** -- `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`. Product positioning, two-mode framing, end-to-end scenarios.
3. **Architecture spec** -- `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`. The main artifact, ~1850 lines. Has a reading guide at the top -- follow it.
4. **Roadmap** -- `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`. Eight implementation arcs (A-H) with V1 vs V1+ scope and dependency graph.

Optional context (do NOT use as authoritative; the architecture spec body is the source of truth):
- Pass 3 minutes: `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`
- Pass 4 minutes: `docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass4-ratifications.md`
- Pass 5 minutes: `docs/superpowers/specs/2026-05-05-slipgate-managed-mode-pass5-ratifications.md`
- Pass 6 minutes: `docs/superpowers/specs/2026-05-11-slipgate-managed-mode-pass6-ratifications.md`

---

## What to do (scope + non-scope)

### IN scope

You are looking for things the brainstorm missed or underspecified. Specifically:

1. **Missed user-flows that break load-bearing decisions.** The review-prep doc lists ~16 load-bearing decisions. For each, walk a few realistic user scenarios and ask: does the decision hold? Examples: a user with their Quake on an exFAT external drive (breaks the single-volume hardlink invariant); a user running FTE who profile-switches 20 times an hour (Class 3 fallback timing); a user with two slipgate installs on different machines pointing at the same data-root (single-process invariant).

2. **Load-bearing-but-unverified assumptions.** The review-prep doc flags items 2, 3, 9, 10, 14, 15 as especially worth verifying. For each: is the assumption actually true under all V1-supported engines and asset types, or is there a hidden case? (Example: per-role materialization mode is verified for ezQuake's `cfg_save` truncate-write; **NOT verified for FTE / QWFWD / mvdsv** -- worth a subagent spike if the reviewer thinks it matters.)

3. **Internal contradictions.** Despite the hygiene pass, things may slip through. If you find Section A says X and Section B says ~X, surface it.

4. **Ambiguous behavior.** Cases where the spec doesn't clearly specify what slipgate does. Examples: what happens when a user deletes a file in `<data-root>` directly via OS file manager? what happens if the lockfile exists but no slipgate process is running (stale lock)? what happens during materialization if the user's disk fills up halfway through?

5. **Concepts where the user mental model diverges from the design model.** "Hard-fork-with-drift-detection" is a good example of a place where users might expect "fork = live link to parent." Are there other places where the design's behavior would surprise a typical QW community user?

6. **Integration points between subsystems that aren't spelled out.** The architecture has many subsystems (watcher / classifier / materializer / capture-swap pipeline / hub / library / backup). Where do they interact, and is the contract spelled out? Examples: how does the watcher's Stage 1 `.pending-swap.json` interact with materialization's atomic-swap? when GC runs, what's its contract with active in-flight downloads?

7. **Open carry-forwards that should NOT have been deferred.** The review-prep doc lists deferred items; if you spot one that is actually load-bearing for V1 (i.e., V1 doesn't work without it), surface that.

### NOT in scope

1. **Implementation details.** "Should this use postgres-js or pg?" "Test setup: TRUNCATE-and-rebuild or per-suite DB?" These belong to arc-planner, not design review.

2. **Relitigating locked decisions.** If a decision is locked, your job is to find cases where it breaks -- not to re-propose the alternative that was already weighed and rejected. (Example: don't propose "what if bundles WEREN'T manifests"; do propose "here's a real bundle use case where the manifest primitive doesn't fit cleanly.")

3. **Style / prose / formatting.** The hygiene pass already covered this. Focus on substance.

4. **Deferred carry-forwards as "missing."** The review-prep doc lists what's V1+ on purpose. Don't flag those.

5. **Critique of the brainstorm process itself.** The operator chose 6 passes; the result is what you're reviewing. Critique the design output, not the process that produced it.

---

## Output format

Produce a structured findings doc at `docs/superpowers/specs/2026-05-11-slipgate-managed-mode-review-findings.md`. Shape:

```markdown
# Slipgate Managed Mode -- Design Review Findings

> Captured YYYY-MM-DD by [reviewer]. Cold-eyes review of the architecture spec post-Pass-6.

## Summary
[2-3 sentence overview: how coherent is the design? are there major risks or is it largely solid?]

## Critical findings (must address before arc-planner)
[Items where the design is broken or load-bearing assumptions don't hold. Each entry includes: finding, why it matters, suggested resolution path (re-brainstorm pass / spike / spec amendment / etc.)]

## Important findings (worth addressing before V1 ships, but not blocking arc-planner)
[Ambiguities, missed flows, integration gaps that arc-planner can work around but should be surfaced.]

## Worth a closer look (load-bearing-but-unverified)
[Assumptions that look right but haven't been empirically verified. Each entry suggests how to verify -- subagent spike, source-walk, etc.]

## Spec navigation / clarity (low priority)
[Places where the spec is hard to follow even after the reading guide; suggestions for clarification.]

## Surprises / things that worked well
[A reviewer's positive observations -- where the design is unusually elegant or where a tradeoff was made well. Useful signal for the operator.]
```

For each finding, give file:line references where possible. Keep findings specific and actionable (not "the spec is unclear about X" but "section Y line Z says X but doesn't specify what happens if Z' -- proposed clarification: ...").

---

## Suggested model + dispatch pattern

**Single-reviewer mode (default):**
- One general-purpose agent in a fresh terminal.
- Model: Opus MAX recommended for thoroughness (this is a 1850-line spec + 3 supporting docs; depth matters).
- Time: expect 30-60 minutes of agent work.

**Two-reviewer mode (optional, for higher rigor):**
- Two reviewers dispatched in parallel, different temperatures or different models (e.g., one Opus + one Sonnet).
- Each writes their own findings doc; operator + Claude reconcile findings into one consolidated doc.
- Worth the extra cost if the operator wants to maximize signal -- different models genuinely catch different things.

**For the reviewer, prompt shape:**

```
You are doing a cold-eyes design review of the Slipgate Managed Mode architecture.

Read in this order:
1. /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-11-slipgate-managed-mode-review-handoff.md (this doc; sets scope)
2. The "Reads required" list in that handoff doc.

Follow the handoff doc's scope, output format, and findings shape exactly.

Begin by writing a one-paragraph "intent statement" to the operator: what you'll focus on hardest, what you'll skim, and what your initial impression of the design is after reading the review-prep doc. Then start the deep read.

Report findings doc location when done.
```

---

## After the review

The operator + Claude (in a fresh session) read the findings doc together. For each finding:

- **Critical:** decide whether to amend the spec, run a Pass 7 mini-brainstorm, run a verification spike, or carry the risk into arc-planner with eyes open. Document the decision.
- **Important:** decide whether to amend the spec now or carry into arc-planner.
- **Worth a closer look:** dispatch verification spikes (subagent source-walks, test sketches, etc.) for the most load-bearing.
- **Spec clarity:** apply minor amendments.
- **Surprises / positive:** record for retrospective; no action needed.

If the findings surface load-bearing risks the brainstorm missed, run a Pass 7 mini-brainstorm to settle them before arc-planner.

If the findings are largely "small clarifications + a few load-bearing-but-unverified items worth spiking," proceed to arc-planner for Arc A with the spike findings folded in.

---

## When in doubt

Lean toward over-flagging rather than under-flagging. The cost of a flagged false-alarm is one operator review-and-dismiss cycle (~30 seconds). The cost of a missed load-bearing flaw is potentially weeks of implementation rework. Asymmetric.

But: don't pad the findings doc with trivia. Each finding should be specific enough that a future reader (operator or arc-planner) can act on it.

If you encounter a place where you genuinely cannot tell if something is a finding or a non-issue, surface it as a question in the findings doc rather than guessing. Better to ask than to either flag a non-issue or miss a real one.
