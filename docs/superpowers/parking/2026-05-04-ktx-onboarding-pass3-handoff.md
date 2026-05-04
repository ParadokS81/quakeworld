# KTX Onboarding -- Pass 3 handoff (fresh terminal)

**For:** the next arc-brainstormer session that opens Pass 3 (Schema impact for first-class types).
**Trigger to use this:** operator opens a fresh terminal and pastes this prompt, OR an arc-brainstormer-skill watcher hands off here from Pass 2 close.
**Date:** 2026-05-04.

---

## Where things are

The KTX Layer 1 Onboarding arc is brainstorming via the arc-brainstormer skill. Pass 1 (extraction methodology + 4 first-class entity types) closed 2026-05-04. Pass 2 (prod-MCP update lifecycle, generalised beyond KTX into the canonical Layer 1 update procedure) closed 2026-05-04 with full drain into a sibling spec.

**Pass plan (5 passes total):**
- Pass 1 -- CLOSED. Locked the extraction methodology + the 4 first-class entity types (cvar / command / info_key / log_template).
- Pass 2 -- CLOSED. Locked the prod-MCP update lifecycle. Drain at `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`.
- **Pass 3 -- NEXT. This handoff opens it.** Schema impact for first-class types. Light pass.
- Pass 4 -- pending. Gameplay-content scope + shape decision (5 enum taxonomies + 10 struct-array tables + 7 XSD match-event types).
- Pass 5 -- pending. Per-category gameplay-content design.

**Pass 3 scope (from arc-brainstormer original framing):**

Pass 1 closed all four first-class entity types' extraction approaches. Pass 3 consolidates the schema deltas across them and verifies nothing else needs changing. Per Pass 1 close summary, the deltas are:

1. `entities.project` CHECK -- already includes `'ktx'` in `002_layer1_schema.sql` (verified during Pass 2). No widening needed.
2. `log_template_versions.channel` CHECK -- widen to admit `'logfile'` for KTX's `log_printf` channel.
3. (Possibly) handler-introduced columns -- TBD per Pass 3 review.

Sub-question piles to settle:
- **Migration filename + content.** Probably `db/migrations/008_ktx_log_template_channel.sql` (or wherever it lands in lex order alongside any other KTX-related migrations). Pure ALTER TABLE ... DROP CONSTRAINT + ADD CONSTRAINT pattern.
- **Are there any new columns the four first-class handlers need?** Per Pass 1 design, no -- canonical names use the existing Pattern 14 `<bare>:<scope>` suffix shape (already in `entities.canonical_id`); per-table dedup uses existing `_seen_in_file` machinery. Verify by walking the Pass 1 decisions against the current schema.
- **Verify Pass 1's "no new tables" claim against any auxiliary needs** (per-row source citation, multi-site dedup beyond what `all_call_sites_json` already supports, etc.).
- **Schema version bump.** SCHEMA.md should be updated to reflect the migration. Current is v18 per `apps/qw-oracle/CLAUDE.md`; KTX likely takes v19.

This pass is **light** per the original pass plan. Most decisions are mechanical "verify the deltas Pass 1 implied are sufficient." If verification surfaces new schema needs, surface them as Pass 3 sub-questions; otherwise the pass closes quickly.

**Drain destination for Pass 3:** the existing KTX onboarding spec at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`. New "Pass 3" section under the existing Pass 1 / Pass 2 markers.

---

## Reads required

Mandatory before opening Pass 3:

1. **`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`** -- the Pass 1-closed spec. Pass 3 reads back the Pass 1 schema-delta accumulation and verifies it.

2. **`apps/qw-oracle/db/migrations/002_layer1_schema.sql`** -- the foundational schema. Verify the `entities.project` CHECK already includes `'ktx'`. Verify the `log_template_versions` table shape and current `channel` CHECK values.

3. **`apps/qw-oracle/db/migrations/`** -- full directory. Check the latest migration number to predict the next filename.

4. **`apps/qw-oracle/SCHEMA.md`** -- current schema documentation. Pass 3's drain includes updating this.

5. **`apps/qw-oracle/CLAUDE.md`** -- always-on rules (append-only migrations, JSONB binding, regression guards).

Optional but useful:
- The Pass 2 spec at `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md` (sub-question 2.4 explains how the migration flows to prod -- relevant for the operator's mental model).

---

## Critical rules

- **ASCII only** in all output (operator preference -- em dash / smart quotes forbidden in code + shared docs).
- **Plain English first; technical chain second.**
- **One sub-question per topic during the pass body.**
- **Be decisive.** Recommend, don't poll.
- **Verification first.** Verify against current schema state before naming a delta. The Pass 1 close summary's deltas are claims, not facts -- re-verify against the live schema.
- **Pass 3 is light.** If the verification step surfaces nothing surprising, the pass closes quickly. Don't manufacture sub-questions to fill space.

---

## First three actions

1. Read the five docs in the Reads-required list. In parallel.
2. State the pass-3 scope plainly to the operator: "Starting Pass 3 -- Schema impact for first-class types. Drain destination is the KTX onboarding spec. Light pass; verifying Pass 1's schema-delta claims against current schema state and locking the migration filename + content."
3. Verify the two named deltas: (a) `entities.project` CHECK already includes `'ktx'` (grep `002_layer1_schema.sql`); (b) `log_template_versions.channel` CHECK current values + what the widening looks like. Then open with sub-question 3.1 -- "Does the verification confirm no other deltas? If yes, lock the migration content; if no, surface the surprise."

---

## When in doubt

Ask the operator. The pass scope is bounded; if a sub-question genuinely outgrows it, surface it as a Pass 3 -> Pass 4 carry-forward rather than absorbing it into Pass 3.

---

## Tracking

Pass 2 close updated the operator's task tracking. Open task list at Pass 2 close:

| ID | Task | Status |
|---|---|---|
| 1 | Pass 2 -- prod-MCP update lifecycle | COMPLETED |

Pass 3 should claim a fresh TaskCreate as it opens.
