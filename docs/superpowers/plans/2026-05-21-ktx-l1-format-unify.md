# KTX L1 Format-Unify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all 607 in-scope KTX cvar+command Layer 1 descriptions to the locked D20 template so the user-facing prose is condensed (1-line summary + value enum + Default/Set-by/optional See-also) and source-trace audit prose lives in `description_reasoning` only. After this lands, KTX L1 descriptions are done-done and MVDSV mirrors the workflow.

**Architecture:** Sub-agent fan-out (Sonnet medium) over the 607 rows. Each sub-agent reads `description` + `description_reasoning` from Postgres for its assigned batch and rewrites the description per the D20 template — no content re-synthesis (the audit trail is already trusted from Session #9). Output is a `b5-format-unify-batch-NN.md` ledger in the existing arc plan dir. A new `apply-l1-format-unify.py` (sister to the existing `apply-l1-from-ledgers.py`, glob extended to `b5-format-unify-*.md`) translates ledgers to idempotent UPDATE SQL piped to psql.

**Tech Stack:** Postgres 16 + pgvector (qw_oracle.entities); Python 3 ledger parser (clone of existing apply script); Markdown ledgers; Agent tool sub-dispatches (Sonnet medium per batch).

---

## File Structure

**Create:**
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-prompt.md` — locked sub-agent brief (D20 + 11 anchor few-shot + anti-patterns)
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-calibration.md` — 5-row calibration ledger
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-batch-NN.md` — fan-out ledgers (~31 files, 20 rows each)
- `apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py` — sister apply script with `b5-format-unify-*.md` glob
- `/tmp/ktx-format-unify-inventory.csv` — per-row inventory (canonical_id, type, desc_len, current anchor); ephemeral
- `/tmp/ktx-format-unify-batches/batch-NN.txt` — per-batch canonical_id lists fed to sub-agents; ephemeral

**Modify:**
- `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` — append D21 closing the format-unify follow-up arc
- `HANDOVER.md` — remove the format-unify "Future arcs" entry; either close the parent KTX describe-fill arc line or update its state

**Out of scope (NOT modified):**
- `apps/qw-oracle/scripts/describe-fill/apply-l1-from-ledgers.py` — left untouched; the b4 ledgers stay shipped as-is
- The 10 existing `b4-ledger-*.md` files in the arc plan dir
- The 11 screening-pass anchor rows (already in D20 template — skip-list documented below)

---

## Skip list (11 anchor rows already in D20 template)

These rows are the few-shot exemplars and must NOT be rewritten:

```
ktx:cvar:dp
ktx:cvar:dq
ktx:cvar:dr
ktx:cvar:k_prewar
ktx:cvar:k_spectalk
ktx:cvar:k_sayteam_to_spec
ktx:cvar:k_dmm4_gren_mode
ktx:cvar:k_demo_mintime
ktx:cvar:k_exclusive
ktx:cvar:k_admins
ktx:cvar:k_allowvoteadmin
```

**Scope:** 618 total KTX cvar+command rows minus 11 anchors = **607 rows to rewrite**.

Current length distribution (from DB probe at session start):
- Long (≥501 chars): 195 rows
- Mid (251–500): 359 rows
- Short (≤250): 64 rows

Expected post-rewrite distribution: long bucket drops to <30 rows (legitimately long ones only); mid bucket grows; short bucket grows slightly (some <250 already short and clean).

---

## Phase 1: Inventory + Calibration

### Task 1: Snapshot inventory + identify calibration sample

**Files:**
- Create: `/tmp/ktx-format-unify-inventory.csv`

- [ ] **Step 1.1: Export per-row inventory CSV**

Run:
```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F',' -t -c \
"SELECT canonical_id, type, length(description) AS desc_len, description_anchor_version FROM entities WHERE canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%' ORDER BY canonical_id;" > /tmp/ktx-format-unify-inventory.csv
```
Expected: 618 lines (no header — psql `-t` flag suppresses).

- [ ] **Step 1.2: Verify total + skip-list match**

Run:
```
wc -l /tmp/ktx-format-unify-inventory.csv
grep -c -E '^ktx:cvar:(dp|dq|dr|k_prewar|k_spectalk|k_sayteam_to_spec|k_dmm4_gren_mode|k_demo_mintime|k_exclusive|k_admins|k_allowvoteadmin),' /tmp/ktx-format-unify-inventory.csv
```
Expected: 618 lines total; 11 matches for skip-list.

- [ ] **Step 1.3: Pick 5 calibration rows**

Sample one row from each of these slices (operator may override):

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
"SELECT canonical_id, length(description) AS dl FROM entities
 WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%')
   AND canonical_id NOT IN ('ktx:cvar:dp','ktx:cvar:dq','ktx:cvar:dr','ktx:cvar:k_prewar','ktx:cvar:k_spectalk','ktx:cvar:k_sayteam_to_spec','ktx:cvar:k_dmm4_gren_mode','ktx:cvar:k_demo_mintime','ktx:cvar:k_exclusive','ktx:cvar:k_admins','ktx:cvar:k_allowvoteadmin')
   AND description_anchor_version = '1.47-2-g67253dc'
 ORDER BY random() LIMIT 5;"
```

Picking from the 96-cohort range (anchor `1.47-2-g67253dc` excluding skip-list) keeps calibration on rows whose audit-trail is already V-pass-clean — the rewrite is shape-only, not a re-synthesis.

Record the 5 chosen canonical_ids in this step's checkbox commit message.

### Task 2: Author locked sub-agent prompt

**Files:**
- Create: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-prompt.md`

- [ ] **Step 2.1: Write `b5-format-unify-prompt.md`**

Write file with these exact contents (substitutions: `<BATCH_FILE>` is the batch file path, `<LEDGER_FILE>` is the per-batch ledger path; the dispatching session fills these per sub-agent):

````markdown
# KTX L1 format-unify -- sub-agent brief (LOCKED 2026-05-21)

You are dispatched to rewrite N KTX cvar+command Layer 1 descriptions to the locked D20 template. **You are not re-synthesizing content — the existing `description_reasoning` carries the trusted audit trail from Session #9. Your job is shape: condense the prose surface, lift the value enum into structured form, add Default/Set-by lines, drop file:line refs + engine-jargon from the user-facing surface.**

## Pre-reads (in order)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` D20 (lines 1233–1311) — the template + anti-patterns + rationale.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-screening-affirmed-rows.md` — 11 worked examples in the locked template (`dp` / `dq` / `dr` / `k_prewar` / `k_spectalk` / `k_sayteam_to_spec` / `k_dmm4_gren_mode` / `k_demo_mintime` / `k_exclusive` / `k_admins` / `k_allowvoteadmin`). Read these carefully — they are your shape anchor.

## The D20 template (verbatim, from decisions.md:1239)

```
<1-line what-it-does>

<value> = <meaning>
<value> = <meaning>

Default: <X>.  [or "Default: X. Recommended: Y." when convention differs]
Set by: <method>.  [server config / admin command '<cmd>' / any-player '<cmd>' / vote / etc.]
See also: <concept-note slug>.  [optional; only when the existing reasoning explicitly synthesises across codebases]
```

## Anti-patterns (NEVER in the rewritten description)

- Engine/code jargon: "think handler", "cf_flags", "stuffcmd", "fpd bit 64", "spawn-flag bitmask", etc.
- File:line refs in prose: `world.c:1442-1469`, `combat.c:660-683`, etc.
- Code citation prose: "the function returns true at...", "the registration sets...".
- Source-trace synthesis: "MVDSV's spec-filter records into the MVD dem_multiple bitmask..." — that belongs in `description_reasoning` or an L3 concept note pointed to via `See also:`.

All of those belong in `description_reasoning` (which YOU DO NOT MODIFY) or an L3 concept note.

## Your batch

Read your assigned canonical_ids from: `<BATCH_FILE>`

For each canonical_id, pull existing state from Postgres:

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT canonical_id, name, type, description, description_reasoning, description_origin, description_verdict, source_ref, anchor FROM entities WHERE canonical_id IN (<comma-quoted-ids>);"
```

## Per-row task

For each row in your batch:

1. Read existing `description` (probably verbose, possibly long) + `description_reasoning` (audit trail — trusted).
2. Synthesise a NEW description per the D20 template, using the reasoning as your source of truth for what the cvar/command actually does.
3. Preserve every factual claim from existing description that is enforce-traced in the reasoning.
4. Strip jargon, file:line refs, code-trace prose, and cross-codebase synthesis from the NEW description.
5. If the existing description is already short + clean (≤250 chars), light-touch: keep the prose, add Default/Set-by lines if missing, normalise the value enum block.
6. If the existing description has cross-codebase synthesis (e.g. KTX cvar + MVDSV engine + ezQuake client), DO NOT inline that in the NEW description — emit `See also: <slug>` instead. Choose a slug that names the cross-codebase topic (e.g. `qw-team-chat-visibility` for the k_spectalk family). The concept note may not exist yet — that is fine; the See-also line marks the link for future L3 authoring.

## Output ledger shape

Write your output to: `<LEDGER_FILE>`

Per row, append:

````
B5-RESULT | <canonical_id> | FORMAT-UNIFIED | rev=1 | from-shape: <one-line> | to-shape: D20-template

### <canonical_id>

- canonical_id: <id>
- prior length: <chars>
- new length: <chars>

- OLD description:
  > <verbatim from DB>

- NEW description:
  > <your rewrite, D20-template shape>

- NEW source_ref: <existing source_ref from DB, unchanged>
- NEW anchor: <existing anchor from DB, unchanged>
- NEW verdict: <existing verdict from DB, unchanged>
- NEW description_origin: <existing origin from DB, unchanged>

---
````

**Do NOT touch `description_reasoning`** — apply-l1-format-unify.py skips that column.

## Constraints (C4 -- non-negotiable)

- Read-only on the L1 database. No `UPDATE`, no `INSERT`.
- No file writes outside `<LEDGER_FILE>`.
- No content re-synthesis. If you believe the existing reasoning is wrong, HALT that row (write `(HALT)` after the section header, see HALT shape below) and continue with the rest.
- The 11 anchor rows in the skip-list (above) must never appear in your batch — if you see one, HALT that row.
- Length guidance: target 200–500 chars for the NEW description. Going under 200 is fine if the cvar is genuinely simple. Going over 500 is a smell — re-read your draft for anti-patterns.

## HALT shape

For a row you cannot rewrite cleanly (existing reasoning seems wrong, cross-codebase synthesis depth too high to compress, etc.):

```
B5-RESULT | <canonical_id> | HALT-<reason> | rev=1 | residue: <one-line why>

### <canonical_id> (HALT)
- canonical_id: <id>
- prior length: <chars>
- halt reason: <one-paragraph>
- recommendation: <what the operator should do — hand-rewrite, defer, or escalate>
```

## When done

1. Self-check: `grep -cE '^B5-RESULT \|' <LEDGER_FILE>` should equal the count of rows in your batch.
2. Report verbatim:

```
B5 BATCH <NN> DONE -- <N> rows
FORMAT-UNIFIED: <n>
HALT: <m>
ledger: <basename of LEDGER_FILE>
notes: <one line — anything unusual, or "none">
```

No commits. No `git add`. The dispatching session handles git.
````

This is the LOCKED prompt. The dispatcher fills `<BATCH_FILE>` + `<LEDGER_FILE>` per sub-agent.

- [ ] **Step 2.2: Commit the prompt**

```
git add docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-prompt.md
git commit -m "feat(arc-ktx-format-unify): lock sub-agent prompt for D20 format-unify"
```

### Task 3: Run calibration

**Files:**
- Create: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-calibration.md`
- Create: `/tmp/ktx-format-unify-batches/batch-cal.txt`

- [ ] **Step 3.1: Write calibration batch file**

```
mkdir -p /tmp/ktx-format-unify-batches
cat > /tmp/ktx-format-unify-batches/batch-cal.txt <<'EOF'
<canonical_id 1>
<canonical_id 2>
<canonical_id 3>
<canonical_id 4>
<canonical_id 5>
EOF
```

Substitute the 5 calibration canonical_ids from Step 1.3.

- [ ] **Step 3.2: Dispatch calibration sub-agent**

Spawn ONE Agent (Sonnet medium) with:
- `subagent_type`: general-purpose
- Prompt: pass the entire `b5-format-unify-prompt.md` content, with substitutions:
  - `<BATCH_FILE>` = `/tmp/ktx-format-unify-batches/batch-cal.txt`
  - `<LEDGER_FILE>` = `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-calibration.md`
  - Additional override: this is the CALIBRATION run — write the ledger with header noting "calibration sample, 5 rows" + the chosen canonical_ids before the per-row entries.

Wait for completion. Sub-agent returns the status block.

- [ ] **Step 3.3: Operator reviews calibration ledger**

Operator reads `b5-format-unify-calibration.md` and judges:
- Shape compliance (D20 template structure correct?)
- Anti-pattern compliance (no jargon / file:line / code-trace prose?)
- Length (200–500 char range met?)
- Content fidelity (every claim in NEW description traceable to existing reasoning?)

Decision tree:
- **All 5 clean** → lock prompt as-is, proceed to Phase 2.
- **1–2 with shape issues** → operator hand-edits those 2, identifies the failure mode, adds a clarification note to `b5-format-unify-prompt.md`. Re-run calibration on the same 5 rows once more (max 2 iterations total).
- **3+ with shape issues** → prompt has a structural gap. Iterate the prompt with operator + Claude inline (do not auto-re-dispatch).
- **HALT rows surfaced** → operator decides per-row: hand-rewrite into calibration ledger, or defer to a post-arc tail.

- [ ] **Step 3.4: Commit calibration ledger + any prompt iteration**

```
git add docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-{prompt,calibration}.md
git commit -m "feat(arc-ktx-format-unify): calibration sample (5 rows) -- prompt locked"
```

---

## Phase 2: Fan-out

### Task 4: Build batch files

**Files:**
- Create: `/tmp/ktx-format-unify-batches/batch-01.txt` through `batch-31.txt` (one per ~20-row batch)

- [ ] **Step 4.1: Generate batch lists**

20 rows per batch × 31 batches covers 620 rows (≥607 needed). The skip-list and calibration rows are excluded.

Run:
```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -t -c \
"SELECT canonical_id FROM entities
 WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%')
   AND canonical_id NOT IN ('ktx:cvar:dp','ktx:cvar:dq','ktx:cvar:dr','ktx:cvar:k_prewar','ktx:cvar:k_spectalk','ktx:cvar:k_sayteam_to_spec','ktx:cvar:k_dmm4_gren_mode','ktx:cvar:k_demo_mintime','ktx:cvar:k_exclusive','ktx:cvar:k_admins','ktx:cvar:k_allowvoteadmin')
 ORDER BY length(description) DESC, canonical_id;" > /tmp/ktx-format-unify-batches/all-ids.txt
```

Then strip calibration ids:
```
grep -vxFf <(cat /tmp/ktx-format-unify-batches/batch-cal.txt) /tmp/ktx-format-unify-batches/all-ids.txt > /tmp/ktx-format-unify-batches/in-scope.txt
wc -l /tmp/ktx-format-unify-batches/in-scope.txt   # expect 602 (607 - 5 calibration)
```

Split into 20-row batches:
```
cd /tmp/ktx-format-unify-batches
split -l 20 -d --additional-suffix=.txt --suffix-length=2 in-scope.txt batch-
ls batch-*.txt | wc -l   # expect ~31 batches
```

Sorting by `length(description) DESC` means the early batches (01–10) carry the long bucket — those need real prose trimming. Later batches (20–31) trend toward mid + short — those are lighter reformatting work.

- [ ] **Step 4.2: Sanity-check batch coverage**

```
cat /tmp/ktx-format-unify-batches/batch-*.txt | sort > /tmp/all-batched.txt
sort /tmp/ktx-format-unify-batches/in-scope.txt > /tmp/all-in-scope.txt
diff /tmp/all-batched.txt /tmp/all-in-scope.txt   # expect: no diff
```

### Task 5: Dispatch fan-out waves

**Files:**
- Create: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-batch-01.md` through `batch-NN.md`

- [ ] **Step 5.1: Wave 1 — dispatch batches 01–08 in parallel (long bucket)**

Single message with 8 Agent tool uses. Each Agent:
- `subagent_type`: general-purpose
- `model`: sonnet
- Prompt: entire content of `b5-format-unify-prompt.md` with substitutions:
  - `<BATCH_FILE>` = `/tmp/ktx-format-unify-batches/batch-NN.txt`
  - `<LEDGER_FILE>` = `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-batch-NN.md`

Wait for all 8 to complete. Read their status blocks.

- [ ] **Step 5.2: Wave 1 operator spot-check**

Operator opens 2 random ledger files from wave 1 and reads 5 rows from each. Same judgement criteria as Step 3.3.

Decision:
- **Clean** → proceed to wave 2.
- **Pattern issue affecting most rows** → halt fan-out, iterate prompt, re-dispatch wave 1 only. This is the same iteration budget as calibration; if it fires twice in a row, escalate to operator + Claude inline review.
- **Isolated issues** → mark those rows for hand-fix at apply time (a `b5-format-unify-overrides.md` is a tail).

- [ ] **Step 5.3: Wave 2 — dispatch batches 09–16**

Same shape as Step 5.1, batches 09–16 in parallel.

- [ ] **Step 5.4: Wave 2 spot-check**

Same as Step 5.2.

- [ ] **Step 5.5: Wave 3 — dispatch batches 17–24**

Same shape.

- [ ] **Step 5.6: Wave 3 spot-check**

Same as Step 5.2.

- [ ] **Step 5.7: Wave 4 — dispatch batches 25–31**

Same shape (7 batches; remainder).

- [ ] **Step 5.8: Wave 4 spot-check**

Same as Step 5.2.

- [ ] **Step 5.9: Aggregate halt + override list**

```
grep -lE 'HALT-' docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-batch-*.md
```

For each HALT row: operator decides hand-rewrite (into a `b5-format-unify-overrides.md` ledger) or defer (add a tail to D21 amendment).

- [ ] **Step 5.10: Commit ledgers**

```
git add docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-batch-*.md docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b5-format-unify-overrides.md
git commit -m "feat(arc-ktx-format-unify): fan-out ledgers for 607 KTX descriptions (4 waves, 31 batches)"
```

---

## Phase 3: Apply + verify

### Task 6: Author apply script

**Files:**
- Create: `apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py`

- [ ] **Step 6.1: Clone the existing apply script**

Copy `apply-l1-from-ledgers.py` to `apply-l1-format-unify.py` and edit three things:

1. Module docstring updated for b5 format-unify scope.
2. `LEDGERS = sorted(LEDGER_DIR.glob("b5-format-unify-*.md"))` (was `b4-ledger-*.md`).
3. Section-header regex accepts `### ktx:...` followed by optional `(HALT)` — same shape as existing.
4. `B5-RESULT` line skipped same way `B4-RESULT` lines are skipped (the parser already ignores non-section lines, but verify).
5. Post-apply verification queries updated to target the format-unified state — see Step 8.3.

Specifically, the apply script must:
- NOT touch `description_reasoning` (the ledger doesn't carry a `NEW description_reasoning` field — the parser will fall through to the existing logic that writes `description_reasoning = NULL`, **which is wrong for format-unify**). **Override:** if no `NEW description_reasoning` block is present in the ledger, do NOT write the `description_reasoning` column at all (leave existing value intact).
- Still update `description`, `description_proposed = NULL`, `description_embedding_stale = true`, `updated_at = now()`.
- Leave `description_origin`, `description_verdict`, `description_anchor_version`, `source_ref` unchanged (the b5 ledger echoes them back unchanged, but the safer default is "only write columns that were intentionally changed").

Exact diff vs the parent script:

```python
# Line 24-27 (LEDGER_DIR + LEDGERS glob)
LEDGER_DIR = Path(
    "/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill"
)
LEDGERS = sorted(LEDGER_DIR.glob("b5-format-unify-*.md"))

# Lines 148-167 (emit_update body) — replace "always write reasoning" logic:
def emit_update(row):
    if row.get("halt"):
        return f"-- HALT row, skipping: {row['canonical_id']}"

    if "description" not in row:
        return f"-- ERROR: no NEW description parsed for {row['canonical_id']} (in {row['ledger']})"

    fields = [f"description = {sql_quote(row['description'])}"]

    # FORMAT-UNIFY DIFF: only write description_reasoning if explicitly provided in ledger
    # (b5 ledgers do NOT carry a NEW description_reasoning block; preserve existing reasoning in DB).
    if "reasoning" in row:
        fields.append(f"description_reasoning = {sql_quote(row['reasoning'])}")

    # FORMAT-UNIFY DIFF: skip anchor/verdict/origin overwrites unless explicitly in ledger
    # (b5 ledgers echo these back unchanged but defensive default is no-op).
    if "anchor" in row:
        fields.append(f"description_anchor_version = {sql_quote(row['anchor'])}")
    if "verdict" in row:
        fields.append(f"description_verdict = {sql_quote(row['verdict'])}")
    if "origin" in row:
        fields.append(f"description_origin = {sql_quote(row['origin'])}")
    if "confidence" in row:
        fields.append(f"description_confidence = {sql_quote(row['confidence'])}")

    fields.append("description_proposed = NULL")
    fields.append("description_embedding_stale = true")
    fields.append("updated_at = now()")

    set_clause = ",\n  ".join(fields)
    return (
        f"UPDATE entities SET\n  {set_clause}\n"
        f"WHERE canonical_id = {sql_quote(row['canonical_id'])};"
    )

# Lines 209-212 (post-apply verification comment block) — replace with:
print("-- Post-apply verification queries (manual):")
print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND length(description) >= 501;  -- expect <30")
print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND length(description) BETWEEN 251 AND 500;")
print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND length(description) <= 250;")
print("--   SELECT count(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND description_embedding_stale = true;  -- expect ~607")
```

- [ ] **Step 6.2: Dry-run**

```
python3 apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py 2>&1 | head -60
```
Expected:
- stderr: summary line `-- L1 apply summary:` + per-ledger row counts + `-- TOTAL: N rows` where N ≈ 607 (depending on HALT count).
- stdout: comment header + UPDATE statements + verification-query comments.

Sanity-check:
- No "ERROR: no NEW description parsed" lines in stderr.
- Total roughly matches expectation (607 ± a small HALT count).

- [ ] **Step 6.3: Commit script**

```
git add apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py
git commit -m "feat(qw-oracle/describe-fill): apply-l1-format-unify.py -- b5 ledger applier (preserves description_reasoning)"
```

### Task 7: Apply to DB

- [ ] **Step 7.1: Take a pre-apply snapshot of length distribution**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
"SELECT type, COUNT(*) FILTER (WHERE length(description) >= 501) AS long, COUNT(*) FILTER (WHERE length(description) BETWEEN 251 AND 500) AS mid, COUNT(*) FILTER (WHERE length(description) <= 250) AS short FROM entities WHERE canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%' GROUP BY type ORDER BY type;" > /tmp/ktx-pre-apply-lengths.txt
cat /tmp/ktx-pre-apply-lengths.txt
```

Expected: same shape as the session-start probe (118+77 long, 195+164 mid, 45+19 short).

- [ ] **Step 7.2: Apply**

```
python3 apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py | docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle 2>&1 | tee /tmp/ktx-apply-output.log
```
Expected: single transaction, `COMMIT` at end, `UPDATE 1` per row (total ~607).

- [ ] **Step 7.3: Post-apply length distribution**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
"SELECT type, COUNT(*) FILTER (WHERE length(description) >= 501) AS long, COUNT(*) FILTER (WHERE length(description) BETWEEN 251 AND 500) AS mid, COUNT(*) FILTER (WHERE length(description) <= 250) AS short FROM entities WHERE canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%' GROUP BY type ORDER BY type;"
```
Expected:
- `long` collapses to <30 rows total (some legitimately-long rows survive).
- `mid` grows substantially (most rows land 250–500 chars).
- `short` grows modestly.

If `long` stays high (>50), spot-check a few — they may be genuinely long, or the prompt is leaking jargon back in.

### Task 8: Spot-check + reasoning preservation

- [ ] **Step 8.1: Spot-check 10 random rows for shape**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
"SELECT canonical_id, description FROM entities
 WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%')
   AND canonical_id NOT IN ('ktx:cvar:dp','ktx:cvar:dq','ktx:cvar:dr','ktx:cvar:k_prewar','ktx:cvar:k_spectalk','ktx:cvar:k_sayteam_to_spec','ktx:cvar:k_dmm4_gren_mode','ktx:cvar:k_demo_mintime','ktx:cvar:k_exclusive','ktx:cvar:k_admins','ktx:cvar:k_allowvoteadmin')
 ORDER BY random() LIMIT 10;"
```

Operator eyeball check per row:
- 1-line summary at top.
- Value enum block (where the cvar has discrete values).
- Default line.
- Set-by line.
- No file:line refs, no engine jargon, no code-trace prose.

- [ ] **Step 8.2: Verify reasoning preservation**

The b5 ledgers don't carry `NEW description_reasoning` — the apply script must leave existing reasoning intact. Verify:

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
"SELECT COUNT(*) FILTER (WHERE description_reasoning IS NULL) AS null_reasoning, COUNT(*) FILTER (WHERE description_reasoning IS NOT NULL) AS has_reasoning FROM entities WHERE canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%';"
```
Expected: `has_reasoning` count matches the pre-apply count for those rows. If `null_reasoning` jumped, the apply script is corrupting reasoning — STOP and roll back (transaction was already committed; recovery requires a re-run from the b4 ledgers OR a manual SQL fix per affected row).

- [ ] **Step 8.3: Confirm embedding-stale flag set**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c \
"SELECT COUNT(*) FROM entities WHERE (canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%') AND description_embedding_stale = true;"
```
Expected: ~607 (the 11 anchor rows may also be marked stale from prior runs; the new rewrites all are).

### Task 9: D21 amendment + HANDOVER update + commit + tag

**Files:**
- Modify: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
- Modify: `HANDOVER.md`

- [ ] **Step 9.1: Append D21 to decisions.md**

Add this section after D20 (before the end-of-decisions footer):

```markdown
## D21 -- Format-unify follow-up SHIPPED (2026-05-21 Session #10)

**Decision:** The format-unify follow-up arc named in D20 ("rewrite all 618 KTX cvar+command descriptions to this template") shipped 2026-05-21 in Session #10. All 607 in-scope KTX cvar+command rows now carry D20-template descriptions; the 11 screening-pass anchors were skipped (already in template from Session #9).

**Mechanism:** Sub-agent fan-out (Sonnet medium, ~31 batches × 20 rows) — each sub-agent read existing description + description_reasoning from Postgres and rewrote the description per the D20 template without touching the reasoning (the audit trail from Session #9 remained intact). New apply script `apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py` (sister to `apply-l1-from-ledgers.py`) translated b5 ledgers to UPDATE SQL.

**Output length distribution (post-apply):**
- Long (≥501 chars): <Long> (from 195 pre-apply)
- Mid (251–500): <Mid> (from 359 pre-apply)
- Short (≤250): <Short> (from 64 pre-apply)

Replace `<Long>` / `<Mid>` / `<Short>` with actuals from Step 7.3.

**Closes:** the KTX describe-fill arc (parent of D20). MVDSV describe-fill is queued separately and mirrors this workflow.

**Memory anchor:** `feedback_l1_description_template` continues to be the cross-arc methodology durable beyond this arc; D21 records the shipment event.
```

- [ ] **Step 9.2: Update HANDOVER.md**

In `HANDOVER.md`:
1. Remove the "Format-unify all KTX cvar+command descriptions to new L1 template" line from "### Future arcs (waiting on trigger)".
2. Update the "KTX/MVDSV Layer-1 describe-fill" entry in "### Ongoing arcs": append a "FORMAT-UNIFY SHIPPED 2026-05-21 Session #10" note pointing at this plan file and the D21 amendment.
3. Move the parent "KTX/MVDSV Layer-1 describe-fill" entry from "Ongoing arcs" to a closing retrospective in `apps/qw-oracle/docs/arc-history.md` IF the operator wants to close the KTX side cleanly here (vs. leaving the entry open for MVDSV continuation).

- [ ] **Step 9.3: Final commit**

```
git add docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md HANDOVER.md docs/superpowers/plans/2026-05-21-ktx-l1-format-unify.md
git commit -m "feat(arc-ktx-format-unify): SHIPPED -- 607 KTX descriptions to D20 template + D21 amendment + HANDOVER update"
```

- [ ] **Step 9.4: Tag the ship**

```
git tag -a arc-ktx-format-unify-shipped -m "KTX L1 format-unify shipped -- all 607 in-scope KTX cvar+command descriptions on D20 template"
git push --tags
```

- [ ] **Step 9.5: Push**

```
git push
```

---

## Self-Review

**Spec coverage:**
- D20 template enforcement → Task 2 (locked prompt embeds the template + anti-patterns), Step 8.1 (spot-check).
- 11 anchor skip-list → documented at top + enforced in Step 4.1 batch generation.
- Reasoning preservation → Step 6.1 apply script diff (only writes reasoning when explicitly in ledger) + Step 8.2 verification.
- Anchor / verdict / origin preservation → Step 6.1 apply script diff (defensive defaults).
- 607-row scope → enforced via Step 4.1 batch generation (skip-list + calibration excluded).
- Embedding-stale flag → enforced by apply script (always sets `description_embedding_stale = true`); verified in Step 8.3.
- Arc closure → D21 amendment + HANDOVER update + git tag.

**Placeholder scan:** No "TBD" / "fill in" markers; the only `<…>` substitutions are batch-file/ledger-file paths (per-sub-agent) and the length-actuals in D21 (post-apply substitution).

**Type consistency:**
- Ledger field names match apply-script regex (NEW description / NEW source_ref / NEW anchor / NEW verdict / NEW description_origin) — same shape as the existing b4 ledgers.
- Skip-list canonical_ids appear in 4 places (top-of-plan, Step 1.2, Step 1.3, Step 3.3) — all identical.
- The apply script glob (`b5-format-unify-*.md`) matches the per-sub-agent ledger file convention.

**Risks tracked:**
- Sub-agent injects jargon back into descriptions → caught by Step 5.2/5.4/5.6/5.8 wave spot-checks + Step 8.1 final spot-check.
- Apply script silently nulls description_reasoning → caught by Step 8.2 reasoning-preservation check; mitigation is rollback (re-run b4 ledgers) but that is a recovery scenario, not a planned step.
- HALT row pileup → Step 5.9 aggregates, operator decides per row.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-ktx-l1-format-unify.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Per-task subagent dispatch with review between tasks. Fast iteration; the fan-out waves naturally parallelise across sub-dispatch boundaries.

**2. Inline Execution** — Execute tasks in this session via executing-plans, batch execution with operator checkpoints at every wave gate (Step 3.3, 5.2, 5.4, 5.6, 5.8, 8.1, 8.2). All inline, single conversation.

Which approach?
