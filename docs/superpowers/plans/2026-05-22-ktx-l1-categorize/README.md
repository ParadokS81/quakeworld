# KTX L1 Categorization + Audit Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page HTML audit catalog at `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` rendering all 618 KTX L1 cvar+command entities with collapsible function-based category groups. Underpinning data: new `category_inferred` column on `cvar_versions`/`command_versions` populated via LLM sub-agent fan-out (Sonnet medium), mirroring the format-unify pattern.

**Architecture:** Five sequential phases — schema migration → sub-agent calibration → fan-out → apply → HTML generator. Schema persists across MVDSV mirror later; generator script is project-flag-driven (`--project ktx|mvdsv`). Categorization stored in DB as structured signal for three downstream consumers (oracle MCP, audit HTML, future docs surfaces).

**Tech Stack:** PostgreSQL 16 (migration + columns); Python 3 ledger applier (clone of `apply-l1-format-unify.py`); Sonnet medium sub-agents (via Agent tool dispatch); Bun + TypeScript + postgres-js (HTML generator); vanilla HTML/CSS/JS (output).

**Spec:** `docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md`

---

## File Structure

**Create:**
- `apps/qw-oracle/db/migrations/<NNN>_l1_inferred_category.sql` — schema migration (ordinal derived at execution time)
- `apps/qw-oracle/scripts/describe-fill/apply-l1-category.py` — ledger applier (clone of `apply-l1-format-unify.py`)
- `apps/qw-oracle/scripts/build-l1-audit-catalog.ts` — Bun/TS HTML generator
- `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-prompt.md` — locked sub-agent brief
- `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-calibration.md` — 30-row calibration ledger (sub-agent output)
- `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-batch-NN.md` — ~30 fan-out ledgers (sub-agent outputs)
- `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-overrides.md` — operator-edited fixups for HALT rows
- `/tmp/ktx-categorize-inventory.csv` — per-row inventory (ephemeral)
- `/tmp/ktx-categorize-batches/batch-NN.txt` — per-batch canonical_id lists (ephemeral)
- `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` — the audit catalog itself (regenerable artifact)

**Modify:**
- `apps/qw-oracle/SCHEMA.md` — document the new columns
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` — F1 probe additions

**Out of scope (NOT modified):**
- `apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py` — untouched; b5 ledgers stay shipped
- `apps/qw-oracle/scripts/describe-fill/apply-l1-from-ledgers.py` — untouched
- Existing `b5-format-unify-*` ledgers in the describe-fill arc plan dir
- ezQuake entities (`group_name_in_source` is the source-truth signal for ezQuake; no LLM pass)

---

## Strawman category list (locked during Phase 2 calibration)

1. **Admin & permissions**
2. **Voting**
3. **Match flow**
4. **Gameplay rules**
5. **Mode selection**
6. **Mode-scoped knobs**
7. **Frogbot**
8. **Race**
9. **Demo & spectator**
10. **Spectator chat & visibility**
11. **Scoring & stats**
12. **Server config & network**
13. **Internal state**

---

## Phase 1: Schema migration + apply-script clone + F1 probes

### Task 1: Author the schema migration SQL

**Files:**
- Create: `apps/qw-oracle/db/migrations/<NNN>_l1_inferred_category.sql`

- [ ] **Step 1.1: Derive the next migration ordinal**

Run:
```
ls /home/paradoks/projects/quakeworld/apps/qw-oracle/db/migrations/ | grep -E '^[0-9]{3}_' | sort | tail -1
```
Take the leading 3-digit ordinal, add 1, zero-pad to 3 digits (e.g. `015` → `016`). Record the chosen ordinal in this step's commit message. If a sibling arc has added a migration since this plan was drafted, the ordinal advances accordingly.

- [ ] **Step 1.2: Write the migration SQL file**

Substitute the chosen ordinal for `<NNN>` in the filename. Write to `apps/qw-oracle/db/migrations/<NNN>_l1_inferred_category.sql`:

```sql
-- <NNN>_l1_inferred_category.sql
-- Add LLM-derived category signal to cvar_versions + command_versions.
-- KTX, MVDSV, QWCL have no source-truth grouping mechanism (unlike ezQuake's
-- Cvar_SetCurrentGroup -> group_name_in_source). This column carries an
-- LLM-derived function-based category per entity, paired with a provenance
-- sibling that records {model}|{prompt_version} so the signal can be
-- distinguished from source-truth groups and re-derived per pass.
--
-- Spec: docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md
-- Plan: docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md

ALTER TABLE cvar_versions
  ADD COLUMN category_inferred TEXT,
  ADD COLUMN category_inferred_origin TEXT;

ALTER TABLE command_versions
  ADD COLUMN category_inferred TEXT,
  ADD COLUMN category_inferred_origin TEXT;
```

- [ ] **Step 1.3: Apply the migration**

Run from monorepo root:
```
cd apps/qw-oracle && bun db/migrate.ts
```
Expected stdout: `Applied <NNN>_l1_inferred_category.sql` (and no errors).

- [ ] **Step 1.4: Verify the columns exist**

Run:
```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND column_name IN ('category_inferred','category_inferred_origin')
ORDER BY table_name, column_name;
"
```
Expected: 4 rows — both columns on both `cvar_versions` and `command_versions`, all `is_nullable = YES`.

- [ ] **Step 1.5: Commit the migration**

```
git add apps/qw-oracle/db/migrations/<NNN>_l1_inferred_category.sql
git commit -m "feat(qw-oracle/schema): migration <NNN> -- category_inferred + provenance sibling on cvar/command versions"
```

### Task 2: Update SCHEMA.md

**Files:**
- Modify: `apps/qw-oracle/SCHEMA.md`

- [ ] **Step 2.1: Add column documentation to SCHEMA.md**

Open `apps/qw-oracle/SCHEMA.md`. Locate the per-table section for `cvar_versions` (search for `## cvar_versions` or equivalent header). Add to its column list:

```markdown
- `category_inferred TEXT` — LLM-derived function-based category (e.g. "Admin & permissions", "Voting"). NULL for ezQuake (which uses source-truth `group_name_in_source`); populated for KTX (and later MVDSV / QWCL) via the b6-categorize fan-out.
- `category_inferred_origin TEXT` — provenance sibling for `category_inferred`. Format: `{model}|{prompt_version}`, e.g. `claude-sonnet-4-6|b6-categorize-v1`. NULL iff `category_inferred` is NULL.
```

Repeat the same two-line block in the per-table section for `command_versions`.

- [ ] **Step 2.2: Commit the SCHEMA.md update**

```
git add apps/qw-oracle/SCHEMA.md
git commit -m "docs(qw-oracle/schema): document category_inferred + provenance sibling"
```

### Task 3: Add F1 probes for the new columns

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`

- [ ] **Step 3.1: Add provenance-integrity probe**

Open `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`. Locate the existing `F1.runtime_fidelity_shape` probe definition (search for `runtime_fidelity_shape`). After it, add a sibling probe:

```typescript
{
  id: 'F1.category_inferred_provenance_integrity',
  description: 'Every category_inferred has a matching category_inferred_origin (and vice versa).',
  scope: 'all',
  sql: `
    SELECT count(*) AS violations
    FROM (
      SELECT id FROM cvar_versions
      WHERE (category_inferred IS NULL) <> (category_inferred_origin IS NULL)
      UNION ALL
      SELECT id FROM command_versions
      WHERE (category_inferred IS NULL) <> (category_inferred_origin IS NULL)
    ) t;
  `,
  expectedShape: { violations: 0 },
},
```

- [ ] **Step 3.2: Verify the probe runs clean**

Run:
```
cd apps/qw-oracle && bun scripts/load-knowledge/quality-grid.ts --project ktx --probe F1.category_inferred_provenance_integrity
```
Expected: `PASS` (zero violations — all columns currently NULL, so the XOR check trivially passes).

- [ ] **Step 3.3: Commit the F1 probe**

```
git add apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
git commit -m "feat(qw-oracle/F1): provenance-integrity probe for category_inferred columns"
```

### Task 4: Clone apply-l1-format-unify.py → apply-l1-category.py

**Files:**
- Create: `apps/qw-oracle/scripts/describe-fill/apply-l1-category.py`

- [ ] **Step 4.1: Copy the parent script**

Run:
```
cp /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py \
   /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/describe-fill/apply-l1-category.py
```

- [ ] **Step 4.2: Edit the docstring + ledger glob**

Edit `apply-l1-category.py`. Replace the module docstring at the top to reference categorization scope. Change the `LEDGERS` glob line:

```python
LEDGER_DIR = Path(
    "/home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-22-ktx-l1-categorize"
)
LEDGERS = sorted(LEDGER_DIR.glob("b6-categorize-*.md"))
```

- [ ] **Step 4.3: Edit the ledger field-parser regexes**

The parent script parses ledger fields like `NEW description:`, `NEW source_ref:`, etc. Replace these with the categorize ledger field set. The parser should now recognize:

```
NEW category_inferred: <value>
NEW category_inferred_origin: <value>
```

Search for the existing `NEW description:` regex block and add (alongside, not replacing) the two category field parsers. The script will write whichever columns are present in the ledger.

- [ ] **Step 4.4: Edit `emit_update` to write category columns**

Locate `def emit_update(row)`. Replace its body with:

```python
def emit_update(row):
    if row.get("halt"):
        return f"-- HALT row, skipping: {row['canonical_id']}"

    if "category_inferred" not in row:
        return f"-- ERROR: no NEW category_inferred parsed for {row['canonical_id']} (in {row['ledger']})"

    if "category_inferred_origin" not in row:
        return f"-- ERROR: no NEW category_inferred_origin parsed for {row['canonical_id']} (in {row['ledger']})"

    fields = [
        f"category_inferred = {sql_quote(row['category_inferred'])}",
        f"category_inferred_origin = {sql_quote(row['category_inferred_origin'])}",
    ]
    fields.append("updated_at = now()")
    set_clause = ",\n  ".join(fields)

    # Categorize columns live on cvar_versions / command_versions, not entities.
    # Look up the type via canonical_id prefix to pick the right table.
    table = "cvar_versions" if row["canonical_id"].startswith("ktx:cvar:") else "command_versions"

    return (
        f"UPDATE {table} SET\n  {set_clause}\n"
        f"WHERE entity_id = (SELECT id FROM entities WHERE canonical_id = {sql_quote(row['canonical_id'])});"
    )
```

- [ ] **Step 4.5: Edit the post-apply verification-comment block**

Locate the `print("-- Post-apply verification queries...")` block at the bottom of the script. Replace its bullet contents with:

```python
print("-- Post-apply verification queries (manual):")
print("--   SELECT count(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx' AND cv.category_inferred IS NULL;  -- expect 0")
print("--   SELECT count(*) FROM command_versions cm JOIN entities e ON cm.entity_id=e.id WHERE e.project='ktx' AND cm.category_inferred IS NULL;  -- expect 0")
print("--   SELECT category_inferred, count(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx' GROUP BY category_inferred ORDER BY 2 DESC;")
```

- [ ] **Step 4.6: Smoke-test the script (no ledgers yet)**

Run:
```
python3 /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/describe-fill/apply-l1-category.py 2>&1 | head -20
```
Expected: empty UPDATE list (no ledgers yet) and the verification-comment header. No Python tracebacks.

- [ ] **Step 4.7: Commit the apply script**

```
git add apps/qw-oracle/scripts/describe-fill/apply-l1-category.py
git commit -m "feat(qw-oracle/describe-fill): apply-l1-category.py -- b6 ledger applier (writes category_inferred + provenance)"
```

---

## Phase 2: Sub-agent prompt + calibration

### Task 5: Author the locked sub-agent prompt

**Files:**
- Create: `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-prompt.md`

- [ ] **Step 5.1: Write the prompt file**

Write `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-prompt.md` with these exact contents (substitutions: `<BATCH_FILE>` is the batch file path, `<LEDGER_FILE>` is the per-batch ledger path; the dispatching session fills these per sub-agent):

````markdown
# KTX L1 categorize -- sub-agent brief (LOCKED 2026-05-22, v1)

You are dispatched to assign ONE category to each of N KTX cvars/commands. **You are not authoring or modifying descriptions — the D20 prose is locked. Your job is taxonomic: read the existing description + reasoning + source location, pick the best category from the locked list.**

## Pre-reads (in order)

1. `docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md` — sections "Strawman category list" + "Categorization pipeline / Step 2".
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` D20 (lines 1233–1311) — the description template you'll be reading.

## The locked category list (v1)

```
1. Admin & permissions
2. Voting
3. Match flow
4. Gameplay rules
5. Mode selection
6. Mode-scoped knobs
7. Frogbot
8. Race
9. Demo & spectator
10. Spectator chat & visibility
11. Scoring & stats
12. Server config & network
13. Internal state
```

Pick EXACTLY ONE. Use the verbatim string above (including ampersand and capitalization).

## Category disambiguation guide

- **Admin & permissions** — admin role, designation, rcon, ban management, permission tiers (k_allow*).
- **Voting** — k_vp_* family, vote thresholds, vote-allowed flags.
- **Match flow** — prewar, ready, restart, breaks, timers, match-state transitions.
- **Gameplay rules** — weapon balance, item respawn, damage tuning that applies across all modes.
- **Mode selection** — *commands* an admin runs to switch the active mode: `clan_arena`, `wipeout`, `midair`, `dmm <N>`, `instagib`, `bloodfest`, `lgc`.
- **Mode-scoped knobs** — *cvars* whose effect is scoped to one specific mode (k_dmm4_*, k_ca*, k_wp*, k_lgc*, k_666*, k_midair*, k_bf*, k_instagib*).
- **Frogbot** — bot skill, behavior, waypoints (k_fb*, k_fbskill_*, fb commands).
- **Race** — race mode cvars + commands (k_race*, race*).
- **Demo & spectator** — recording, replay, spec controls, qtv broadcast policy.
- **Spectator chat & visibility** — k_spectalk, k_sayteam_to_spec, spec-chat policy.
- **Scoring & stats** — frag rules, stat tracking, end-of-match data.
- **Server config & network** — rates, slots, hostname, MOTD, broadcast intervals, sv_* server-side.
- **Internal state** — `_k_*` engine internals, set only by KTX itself, never by config.

## Your batch

Read your assigned canonical_ids from: `<BATCH_FILE>`

For each canonical_id, pull existing state from Postgres:

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT e.canonical_id, e.name, e.type, e.description, e.description_reasoning,
        cv.source_file, cv.source_line
 FROM entities e
 LEFT JOIN cvar_versions cv ON cv.entity_id=e.id AND e.type='cvar'
 WHERE e.canonical_id IN (<comma-quoted-ids>);"
```

(For commands, the join is `LEFT JOIN command_versions cm ON cm.entity_id=e.id AND e.type='command'` — use whichever applies; or run two queries.)

## Per-row task

For each row in your batch:

1. Read existing `description` (D20-shape prose — already audited) + `description_reasoning` (audit trail — file:line cites, code refs) + name + source_file.
2. Match against the locked category list using the disambiguation guide.
3. Emit ONE category, verbatim from the locked list.
4. If genuinely no listed category fits, emit a `NEW CATEGORY NEEDED` flag with a proposed name + one-sentence justification. Do NOT invent a category and put it in `NEW category_inferred:` — only the locked list values are valid in that field.
5. If the entity is genuinely uncategorizable (malformed name, broken data, unclear role), HALT with a one-sentence residue.

## Output ledger shape

Write your output to: `<LEDGER_FILE>`

Per row, append:

```
B6-RESULT | <canonical_id> | CATEGORIZED | category=<locked-value> | confidence=<HIGH|MED|LOW>

### <canonical_id>

- canonical_id: <id>
- name: <name>
- type: cvar | command

- NEW category_inferred: <locked-category-value-verbatim>
- NEW category_inferred_origin: claude-sonnet-4-6|b6-categorize-v1

- reasoning: <1-2 sentences explaining the choice — cite the description's role / source_file / key keywords from reasoning>

---
```

For a row that needs a NEW CATEGORY:

```
B6-RESULT | <canonical_id> | NEW-CATEGORY-NEEDED | proposed=<name> | rev=1

### <canonical_id> (NEW CATEGORY NEEDED)
- canonical_id: <id>
- proposed category: <name>
- justification: <one paragraph — what's the role, why none of the locked 13 fit>
```

For a HALT row:

```
B6-RESULT | <canonical_id> | HALT-<reason> | residue: <one-line>

### <canonical_id> (HALT)
- canonical_id: <id>
- halt reason: <one-paragraph>
- recommendation: <hand-assign / defer / escalate>
```

## Constraints (non-negotiable)

- Read-only on the L1 database. No UPDATE, no INSERT.
- No file writes outside `<LEDGER_FILE>`.
- No invention of category names in `NEW category_inferred:` — use only the 13 locked values verbatim.
- Use `NEW CATEGORY NEEDED` to flag misfits; let the operator decide if the list expands.

## When done

1. Self-check: `grep -cE '^B6-RESULT \|' <LEDGER_FILE>` should equal the count of rows in your batch.
2. Report verbatim:

```
B6 BATCH <NN> DONE -- <N> rows
CATEGORIZED: <n>
NEW-CATEGORY-NEEDED: <m>
HALT: <k>
ledger: <basename of LEDGER_FILE>
notes: <one line — anything unusual, or "none">
```

No commits. No `git add`. The dispatching session handles git.
````

- [ ] **Step 5.2: Commit the prompt**

```
git add docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-prompt.md
git commit -m "feat(arc-ktx-categorize): lock sub-agent prompt v1 for b6 categorization fan-out"
```

### Task 6: Pick the 30 calibration entities

**Files:**
- Create: `/tmp/ktx-categorize-batches/batch-cal.txt`

- [ ] **Step 6.1: Sample 30 canonical_ids spanning the strawman categories**

Run:
```
mkdir -p /tmp/ktx-categorize-batches
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -t -c "
WITH ktx AS (
  SELECT canonical_id, type, name FROM entities
  WHERE canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%'
)
(SELECT canonical_id FROM ktx WHERE name LIKE 'k_vp_%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE 'k_fbskill_%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE 'k_race%' OR name LIKE 'race%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE '\\_k\\_%' ESCAPE '\\\\' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE 'k_admin%' OR name LIKE 'admin%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE 'k_dmm%' OR name LIKE 'k_ca%' OR name LIKE 'k_wp%' OR name LIKE 'k_midair%' OR name LIKE 'k_bf%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE 'k_demo%' OR name LIKE 'demo%' OR name LIKE 'qtv%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name LIKE 'k_match%' OR name LIKE 'k_prewar%' OR name LIKE 'k_ready%' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE name NOT LIKE 'k_%' AND name NOT LIKE '\\_k%' ESCAPE '\\\\' ORDER BY random() LIMIT 3)
UNION ALL (SELECT canonical_id FROM ktx WHERE canonical_id IN ('ktx:cvar:dp','ktx:cvar:k_spectalk','ktx:cvar:k_sayteam_to_spec'))
;" > /tmp/ktx-categorize-batches/batch-cal.txt
wc -l /tmp/ktx-categorize-batches/batch-cal.txt
```
Expected: ~30 lines (3 of each of 9 family + 3 anchors = 30, with possible duplicates collapsed by the planner — dedupe in step 6.2).

- [ ] **Step 6.2: Dedupe**

Run:
```
sort -u /tmp/ktx-categorize-batches/batch-cal.txt -o /tmp/ktx-categorize-batches/batch-cal.txt
wc -l /tmp/ktx-categorize-batches/batch-cal.txt
```
If count <25 after dedup, re-run Step 6.1 (random sampling will pull different IDs). Target: 25-32 unique entities.

- [ ] **Step 6.3: Eyeball the calibration set**

Run:
```
cat /tmp/ktx-categorize-batches/batch-cal.txt
```
Verify coverage spans cvars + commands + anchors + various prefix families. If clearly uneven, augment by hand.

### Task 7: Dispatch the calibration sub-agent

- [ ] **Step 7.1: Spawn ONE Agent (Sonnet medium) with the locked prompt**

Use the Agent tool. `subagent_type`: `general-purpose`. `model`: `sonnet`. Prompt: entire content of `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-prompt.md` with substitutions:
- `<BATCH_FILE>` = `/tmp/ktx-categorize-batches/batch-cal.txt`
- `<LEDGER_FILE>` = `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-calibration.md`
- Additional override at the top of the prompt: "This is the CALIBRATION run. Write the ledger with header noting 'calibration sample, ~30 rows' + the canonical_ids before the per-row entries."

Wait for completion. Sub-agent returns the status block.

### Task 8: Operator reviews calibration; lock category list

- [ ] **Step 8.1: Read the calibration ledger top-to-bottom**

```
less /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-calibration.md
```

Per row, judge:
- Is the chosen category correct given the description / reasoning / source_file?
- Are any NEW-CATEGORY-NEEDED flags surfacing? Does the proposed category belong on the locked list, or fold into an existing one?
- Are any HALTs justifiable, or did the sub-agent give up too easily?

- [ ] **Step 8.2: Lock the category list**

Decision tree:
- **All clean (no NEW-CATEGORY-NEEDED, no HALTs, all categorizations defensible)** → category list LOCKED at v1. Proceed to fan-out.
- **NEW-CATEGORY-NEEDED surfaces a real gap** → operator decides: fold into existing category OR amend the locked list. If amend, update `b6-categorize-prompt.md` (bump prompt version to v2 in the origin tag), re-run calibration on the same 30.
- **Repeated misclassifications** → operator fixes by hand in `b6-categorize-overrides.md`; if pattern emerges, iterate the prompt's disambiguation guide. Re-run calibration if iteration was material.

Lock event: append a "Category list LOCKED at v1, <date>" line at the top of the calibration ledger.

- [ ] **Step 8.3: Commit the calibration ledger + any prompt iteration**

```
git add docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-{prompt,calibration}.md
git commit -m "feat(arc-ktx-categorize): calibration sample (~30 rows) -- category list LOCKED"
```

---

## Phase 3: Fan-out

### Task 9: Generate per-batch ID lists

- [ ] **Step 9.1: Export the in-scope canonical_ids (excluding calibration)**

Run:
```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -t -c \
"SELECT canonical_id FROM entities
 WHERE canonical_id LIKE 'ktx:cvar:%' OR canonical_id LIKE 'ktx:command:%'
 ORDER BY type, name;" > /tmp/ktx-categorize-batches/all-ids.txt
```

- [ ] **Step 9.2: Strip the calibration IDs**

Run:
```
grep -vxFf /tmp/ktx-categorize-batches/batch-cal.txt /tmp/ktx-categorize-batches/all-ids.txt > /tmp/ktx-categorize-batches/in-scope.txt
wc -l /tmp/ktx-categorize-batches/in-scope.txt
```
Expected: ~590 (618 total - ~28 calibration).

- [ ] **Step 9.3: Split into 20-row batches**

Run:
```
cd /tmp/ktx-categorize-batches && \
split -l 20 -d --additional-suffix=.txt --suffix-length=2 in-scope.txt batch- && \
ls batch-[0-9][0-9].txt | wc -l
```
Expected: ~30 batches.

- [ ] **Step 9.4: Sanity-check coverage**

```
cat /tmp/ktx-categorize-batches/batch-[0-9][0-9].txt | sort > /tmp/all-batched.txt
sort /tmp/ktx-categorize-batches/in-scope.txt > /tmp/all-in-scope.txt
diff /tmp/all-batched.txt /tmp/all-in-scope.txt
```
Expected: no diff.

### Task 10: Wave 1 — dispatch batches 01-08 in parallel

- [ ] **Step 10.1: Dispatch 8 Agents in a single message**

Send ONE message with 8 Agent tool uses. Each Agent:
- `subagent_type`: `general-purpose`
- `model`: `sonnet`
- Prompt: entire content of `b6-categorize-prompt.md` with substitutions:
  - `<BATCH_FILE>` = `/tmp/ktx-categorize-batches/batch-NN.txt` (NN = 01..08)
  - `<LEDGER_FILE>` = `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-batch-NN.md`

Wait for all 8 to complete. Read their 8 status blocks.

- [ ] **Step 10.2: Wave 1 spot-check**

Open 2 random ledger files from wave 1, read 5 rows from each. Same judgement criteria as Step 8.1.

Decision:
- **Clean** → proceed to wave 2.
- **Pattern issue affecting most rows** → halt fan-out, iterate prompt, re-dispatch wave 1 only.
- **Isolated issues** → mark for hand-fix at apply time (`b6-categorize-overrides.md`).

### Task 11: Wave 2 — dispatch batches 09-16

- [ ] **Step 11.1: Same shape as Task 10.1, batches 09-16.**

- [ ] **Step 11.2: Wave 2 spot-check — same shape as Step 10.2.**

### Task 12: Wave 3 — dispatch batches 17-24

- [ ] **Step 12.1: Same shape as Task 10.1, batches 17-24.**

- [ ] **Step 12.2: Wave 3 spot-check — same shape as Step 10.2.**

### Task 13: Wave 4 — dispatch remaining batches

- [ ] **Step 13.1: Same shape as Task 10.1, batches 25 through final (typically 25-30).**

- [ ] **Step 13.2: Wave 4 spot-check — same shape as Step 10.2.**

### Task 14: Aggregate HALTs + NEW-CATEGORY-NEEDED rows

- [ ] **Step 14.1: Surface HALT rows**

Run:
```
grep -lE 'HALT-' docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-batch-*.md
```
For each HALT row: operator decides hand-assign (into `b6-categorize-overrides.md`) or defer (track as a known unfilled row; the apply step's coverage guard will refuse to mark it complete).

- [ ] **Step 14.2: Surface NEW-CATEGORY-NEEDED rows**

Run:
```
grep -lE 'NEW-CATEGORY-NEEDED' docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-batch-*.md
```
For each: operator decides fold-into-existing (update the ledger directly to use the existing category) or amend-locked-list (rare — would require a re-run of all batches against the new list; avoid unless genuinely warranted).

- [ ] **Step 14.3: Create the overrides ledger if needed**

If any HALTs or NEW-CATEGORY-NEEDED rows need hand-fixes, write `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-overrides.md` with hand-authored entries in the same ledger shape as the batches.

- [ ] **Step 14.4: Commit all ledgers**

```
git add docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-batch-*.md
git add docs/superpowers/plans/2026-05-22-ktx-l1-categorize/b6-categorize-overrides.md  # if exists
git commit -m "feat(arc-ktx-categorize): fan-out ledgers for ~590 KTX entities (4 waves) + overrides"
```

---

## Phase 4: Apply + verify

### Task 15: Apply the categorize ledgers

- [ ] **Step 15.1: Take a pre-apply count**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "
SELECT
  count(*) FILTER (WHERE category_inferred IS NULL) AS null_count,
  count(*) FILTER (WHERE category_inferred IS NOT NULL) AS has_count
FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id
WHERE e.project='ktx';
"
```
Expected: `null_count = 260`, `has_count = 0` (no categorization yet). Repeat for commands (260 cvar + ~358 cmd = 618 total; adjust if KTX counts have drifted).

- [ ] **Step 15.2: Dry-run apply**

```
python3 /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/describe-fill/apply-l1-category.py 2>&1 | head -80
```
Expected:
- stderr: per-ledger row counts + `-- TOTAL: <N> rows` where N ≈ 618.
- stdout: `UPDATE cvar_versions SET ...` / `UPDATE command_versions SET ...` lines.
- No `ERROR:` lines.

- [ ] **Step 15.3: Apply to DB**

```
python3 /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/describe-fill/apply-l1-category.py | \
  docker exec -i qw-oracle-postgres-dev psql -1 -U qworacle -d qw_oracle 2>&1 | tee /tmp/ktx-categorize-apply.log
```
Expected: single transaction, ~618 UPDATEs total, ends with `COMMIT`.

- [ ] **Step 15.4: Verify coverage (100% required)**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "
SELECT
  'cvar' AS t, count(*) FILTER (WHERE cv.category_inferred IS NULL) AS null_count
  FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx'
UNION ALL
SELECT
  'command' AS t, count(*) FILTER (WHERE cm.category_inferred IS NULL) AS null_count
  FROM command_versions cm JOIN entities e ON cm.entity_id=e.id WHERE e.project='ktx'
;
"
```
Expected: `null_count = 0` for both rows.

If non-zero: do NOT proceed. Identify the missing canonical_ids:
```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "
(SELECT e.canonical_id FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx' AND cv.category_inferred IS NULL)
UNION ALL
(SELECT e.canonical_id FROM command_versions cm JOIN entities e ON cm.entity_id=e.id WHERE e.project='ktx' AND cm.category_inferred IS NULL);
"
```
Hand-categorize the missing rows in `b6-categorize-overrides.md`, re-run Step 15.2-15.4.

- [ ] **Step 15.5: Verify provenance-integrity probe still passes**

```
cd apps/qw-oracle && bun scripts/load-knowledge/quality-grid.ts --project ktx --probe F1.category_inferred_provenance_integrity
```
Expected: `PASS`.

- [ ] **Step 15.6: Verify category distribution**

```
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "
SELECT cv.category_inferred, count(*) AS n
FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='ktx'
GROUP BY cv.category_inferred ORDER BY n DESC;
"
```
Eyeball: counts roughly match operator's intuition (e.g. Mode-scoped knobs and Frogbot are likely the largest groups; Spectator chat & visibility is small). No category with zero entries. No NULL row.

### Task 16: Commit the apply

- [ ] **Step 16.1: Commit**

```
git add /tmp/ktx-categorize-apply.log  # if you want the log in-repo — usually no; check before adding
git commit --allow-empty -m "feat(arc-ktx-categorize): apply category_inferred to 618 KTX entities (100% coverage)"
```
(The `--allow-empty` is in case all the prior commits cover all file changes — the apply itself only touches the DB.)

---

## Phase 5: HTML generator

### Task 17: Scaffold the generator + data fetch

**Files:**
- Create: `apps/qw-oracle/scripts/build-l1-audit-catalog.ts`

- [ ] **Step 17.1: Create the script skeleton**

Write `apps/qw-oracle/scripts/build-l1-audit-catalog.ts`:

```typescript
#!/usr/bin/env bun
/**
 * build-l1-audit-catalog.ts -- single-page HTML catalog for L1 cvar+command entities.
 *
 * CLI:
 *   bun apps/qw-oracle/scripts/build-l1-audit-catalog.ts --project ktx [--output PATH]
 *
 * Reads DB rows for the named project, groups by category_inferred, emits a
 * self-contained HTML file with collapsible groups + entity cards + filter box.
 *
 * Spec: docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md
 */

import postgres from "postgres";
import { writeFileSync } from "fs";

interface EntityRow {
  canonical_id: string;
  name: string;
  type: "cvar" | "command";
  description: string | null;
  description_reasoning: string | null;
  description_verdict: string | null;
  description_origin: string | null;
  description_confidence: string | null;
  description_anchor_version: string | null;
  source_file: string | null;
  source_line: number | null;
  category_inferred: string;
  category_inferred_origin: string;
}

function parseArgs(argv: string[]): { project: string; output: string } {
  let project = "ktx";
  let output = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--project") project = argv[i + 1];
    if (argv[i] === "--output") output = argv[i + 1];
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!output) {
    output = `apps/qw-oracle/docs/reviews/${today}-${project}-l1-catalog.html`;
  }
  return { project, output };
}

async function fetchEntities(sql: postgres.Sql, project: string): Promise<EntityRow[]> {
  const cvars = await sql<EntityRow[]>`
    SELECT
      e.canonical_id, e.name, e.type::text AS type,
      e.description, e.description_reasoning,
      e.description_verdict, e.description_origin, e.description_confidence,
      e.description_anchor_version,
      cv.source_file, cv.source_line,
      cv.category_inferred, cv.category_inferred_origin
    FROM entities e
    JOIN cvar_versions cv ON cv.entity_id = e.id
    WHERE e.project = ${project} AND e.type = 'cvar'
    ORDER BY cv.category_inferred NULLS LAST, e.name
  `;
  const commands = await sql<EntityRow[]>`
    SELECT
      e.canonical_id, e.name, e.type::text AS type,
      e.description, e.description_reasoning,
      e.description_verdict, e.description_origin, e.description_confidence,
      e.description_anchor_version,
      cm.source_file, cm.source_line,
      cm.category_inferred, cm.category_inferred_origin
    FROM entities e
    JOIN command_versions cm ON cm.entity_id = e.id
    WHERE e.project = ${project} AND e.type = 'command'
    ORDER BY cm.category_inferred NULLS LAST, e.name
  `;
  return [...cvars, ...commands];
}

async function main() {
  const { project, output } = parseArgs(process.argv.slice(2));
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL env var required");
    process.exit(1);
  }
  const sql = postgres(dbUrl);
  try {
    const rows = await fetchEntities(sql, project);
    console.error(`Fetched ${rows.length} entities for project=${project}`);

    // Coverage guard (spec requires 100%)
    const uncategorized = rows.filter((r) => !r.category_inferred);
    if (uncategorized.length > 0) {
      console.error(`ERROR: ${uncategorized.length} entities lack category_inferred:`);
      for (const r of uncategorized.slice(0, 20)) console.error(`  ${r.canonical_id}`);
      if (uncategorized.length > 20) console.error(`  ... and ${uncategorized.length - 20} more`);
      console.error("Refusing to emit HTML. Fix categorization first (see plan README Step 15.4).");
      process.exit(2);
    }

    const html = renderHtml(rows, project);
    writeFileSync(output, html);
    console.error(`Wrote ${output}`);
  } finally {
    await sql.end();
  }
}

function renderHtml(rows: EntityRow[], project: string): string {
  // Stub — filled in Task 18.
  return `<!DOCTYPE html><title>${project} L1 catalog</title><p>${rows.length} entities</p>`;
}

if (import.meta.main) main();
```

- [ ] **Step 17.2: TypeScript check**

```
cd apps/qw-oracle && bunx tsc --noEmit scripts/build-l1-audit-catalog.ts
```
Expected: no errors.

- [ ] **Step 17.3: Smoke-run the skeleton**

```
cd apps/qw-oracle && bun scripts/build-l1-audit-catalog.ts --project ktx --output /tmp/test-catalog.html
```
Expected stderr: `Fetched 618 entities for project=ktx` + `Wrote /tmp/test-catalog.html`. Exit code 0. /tmp/test-catalog.html contains the stub HTML.

- [ ] **Step 17.4: Commit the skeleton**

```
git add apps/qw-oracle/scripts/build-l1-audit-catalog.ts
git commit -m "feat(qw-oracle): build-l1-audit-catalog.ts scaffold -- data fetch + coverage guard"
```

### Task 18: Replace `renderHtml` with the real renderer

- [ ] **Step 18.1: Replace `renderHtml` with the full implementation**

In `apps/qw-oracle/scripts/build-l1-audit-catalog.ts`, replace the stub `renderHtml` function with the full renderer. Below is the complete replacement (do not delete other parts of the file).

```typescript
function escapeHtml(s: string | null): string {
  if (s === null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstPara(desc: string | null): string {
  if (!desc) return "";
  const idx = desc.indexOf("\n\n");
  return idx === -1 ? desc.trim() : desc.slice(0, idx).trim();
}

function buildBadges(r: EntityRow): string {
  const badges: string[] = [];
  badges.push(`<span class="badge">${r.type}</span>`);
  const len = (r.description ?? "").length;
  badges.push(`<span class="badge">${len}c</span>`);
  if (r.description_reasoning === null) badges.push(`<span class="badge badge-anchor">anchor</span>`);
  if ((r.description ?? "").includes("See also:")) badges.push(`<span class="badge badge-seealso">See also</span>`);
  return badges.join(" ");
}

function renderCard(r: EntityRow): string {
  const desc = escapeHtml(r.description);
  const firstP = escapeHtml(firstPara(r.description));
  const reasoning = r.description_reasoning
    ? escapeHtml(r.description_reasoning)
    : "(anchor row -- no reasoning; D20 template authored by hand)";
  const sourceRef = r.source_file ? `${r.source_file}:${r.source_line}` : "(none)";
  return `
<div class="card" data-name="${escapeHtml(r.name)}" data-first="${escapeHtml(firstPara(r.description).toLowerCase())}">
  <div class="card-header" onclick="toggleCard(this)">
    <span class="chevron">▸</span>
    <code class="entity-name">${escapeHtml(r.name)}</code>
    <span class="badges">${buildBadges(r)}</span>
    <div class="first-para">${firstP}</div>
  </div>
  <div class="card-body" hidden>
    <pre class="description">${desc}</pre>
    <div class="metadata-strip">
      <span>verdict: <code>${escapeHtml(r.description_verdict)}</code></span>
      <span>origin: <code>${escapeHtml(r.description_origin)}</code></span>
      <span>confidence: <code>${escapeHtml(r.description_confidence)}</code></span>
      <span>anchor: <code>${escapeHtml(r.description_anchor_version)}</code></span>
      <span>source: <code>${escapeHtml(sourceRef)}</code></span>
    </div>
    <div class="audit-trail">
      <div class="audit-label">audit trail (description_reasoning)</div>
      <div class="audit-body">${reasoning}</div>
    </div>
  </div>
</div>`;
}

function renderGroup(category: string, entities: EntityRow[]): string {
  const cards = entities.map(renderCard).join("\n");
  return `
<section class="group" data-category="${escapeHtml(category)}">
  <header class="group-header" onclick="toggleGroup(this)">
    <span class="chevron">▸</span>
    <span class="group-name">${escapeHtml(category)}</span>
    <span class="group-count">${entities.length} entities</span>
  </header>
  <div class="group-body" hidden>${cards}</div>
</section>`;
}

function renderHtml(rows: EntityRow[], project: string): string {
  const byCategory = new Map<string, EntityRow[]>();
  for (const r of rows) {
    const c = r.category_inferred;
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(r);
  }
  const categories = Array.from(byCategory.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const anchorVersion = rows.find((r) => r.description_anchor_version)?.description_anchor_version ?? "(unknown)";
  const generatedAt = new Date().toISOString();
  const toc = categories
    .map(([c, ents]) => `<li><a href="#cat-${escapeHtml(c).replace(/\s+/g, "-")}">${escapeHtml(c)}</a> <span class="toc-count">${ents.length}</span></li>`)
    .join("\n");
  const sections = categories.map(([c, ents]) => `<a id="cat-${escapeHtml(c).replace(/\s+/g, "-")}"></a>${renderGroup(c, ents)}`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(project)} L1 audit catalog</title>
<style>
${INLINE_CSS}
</style>
</head>
<body>
<header class="top-bar">
  <h1>${escapeHtml(project.toUpperCase())} L1 audit catalog</h1>
  <div class="meta">${rows.length} entities &middot; anchor ${escapeHtml(anchorVersion)} &middot; generated ${generatedAt}</div>
  <input type="text" id="filter" placeholder="filter by name or first paragraph..." oninput="applyFilter()">
</header>
<aside class="toc"><ul>${toc}</ul></aside>
<main class="main">${sections}</main>
<script>${INLINE_JS}</script>
</body>
</html>`;
}

const INLINE_CSS = `
/* placeholder -- replaced in Task 19 */
body { background: #1a1a1a; color: #ddd; font-family: ui-sans-serif, system-ui; margin: 0; }
`;

const INLINE_JS = `
/* placeholder -- replaced in Task 20 */
function toggleCard(el) { const b = el.parentElement.querySelector('.card-body'); b.hidden = !b.hidden; el.querySelector('.chevron').textContent = b.hidden ? '▸' : '▾'; }
function toggleGroup(el) { const b = el.parentElement.querySelector('.group-body'); b.hidden = !b.hidden; el.querySelector('.chevron').textContent = b.hidden ? '▸' : '▾'; }
function applyFilter() { /* placeholder */ }
`;
```

- [ ] **Step 18.2: TypeScript check**

```
cd apps/qw-oracle && bunx tsc --noEmit scripts/build-l1-audit-catalog.ts
```
Expected: no errors.

- [ ] **Step 18.3: Run + visual smoke-check**

```
cd apps/qw-oracle && bun scripts/build-l1-audit-catalog.ts --project ktx --output /tmp/test-catalog.html
```
Open `/tmp/test-catalog.html` in a browser. Verify:
- Top bar shows entity count + anchor SHA + timestamp.
- TOC lists all categories with counts.
- Click a TOC link → page scrolls to that category section.
- Click a group header → group expands, shows cards (cards still collapsed).
- Click a card → card expands, shows full description + metadata strip + audit trail.

- [ ] **Step 18.4: Commit the renderer**

```
git add apps/qw-oracle/scripts/build-l1-audit-catalog.ts
git commit -m "feat(qw-oracle): build-l1-audit-catalog.ts -- full renderer (HTML structure + group/card markup)"
```

### Task 19: Replace `INLINE_CSS` placeholder with the real stylesheet

- [ ] **Step 19.1: Replace `INLINE_CSS` with the spec-defined styling**

In `apps/qw-oracle/scripts/build-l1-audit-catalog.ts`, replace the `INLINE_CSS` constant with:

```typescript
const INLINE_CSS = `
* { box-sizing: border-box; }
body {
  background: #1a1a1a;
  color: #ddd;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  margin: 0;
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr;
  min-height: 100vh;
}
.top-bar {
  grid-column: 1 / 3;
  background: #1f1f1f;
  border-bottom: 1px solid #333;
  padding: 12px 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.top-bar h1 { margin: 0 0 4px; font-size: 18px; color: #ffb454; font-weight: 600; }
.top-bar .meta { font-size: 11px; color: #888; margin-bottom: 8px; }
.top-bar #filter {
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #444;
  color: #ddd;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.toc {
  position: sticky;
  top: 96px;
  align-self: start;
  background: #1a1a1a;
  border-right: 1px solid #333;
  padding: 12px 16px;
  height: calc(100vh - 96px);
  overflow-y: auto;
}
.toc ul { list-style: none; padding: 0; margin: 0; }
.toc li { margin-bottom: 4px; font-size: 12px; }
.toc a { color: #bbb; text-decoration: none; }
.toc a:hover { color: #ffb454; }
.toc .toc-count { color: #777; font-size: 10px; margin-left: 4px; }
.main { padding: 16px 20px; }
.group {
  border: 1px solid #444;
  border-radius: 6px;
  margin-bottom: 10px;
  background: #1a1a1a;
}
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
}
.group-header .chevron { color: #888; margin-right: 8px; }
.group-header .group-name { color: #ffb454; font-weight: 600; flex: 1; }
.group-header .group-count { font-size: 11px; color: #888; }
.group-body { padding: 8px 10px 10px; }
.card {
  border: 1px solid #333;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #1a1a1a;
}
.card-header { cursor: pointer; }
.card-header .chevron { color: #888; margin-right: 6px; }
.entity-name { color: #9cdcfe; font-weight: 600; font-family: ui-monospace, monospace; }
.badges { font-size: 10px; color: #777; margin-left: 8px; }
.badge { display: inline-block; padding: 1px 6px; border: 1px solid #333; border-radius: 3px; margin-right: 4px; }
.badge-anchor { color: #ffb454; border-color: #5a4a2a; }
.badge-seealso { color: #9cdcfe; border-color: #2a4a5a; }
.first-para { font-size: 12px; color: #bbb; line-height: 1.45; margin: 4px 0 0 18px; }
.card-body { margin: 8px 0 0 18px; border-top: 1px dashed #333; padding-top: 8px; }
.description {
  font-family: ui-sans-serif, system-ui, sans-serif;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.5;
  color: #ddd;
  margin: 0 0 10px;
}
.metadata-strip {
  font-size: 11px;
  color: #888;
  border-top: 1px dashed #333;
  padding-top: 8px;
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.metadata-strip code { color: #bbb; }
.audit-trail { border-top: 1px dashed #333; padding-top: 8px; }
.audit-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #777;
  margin-bottom: 4px;
}
.audit-body {
  font-size: 11px;
  line-height: 1.45;
  color: #aaa;
  font-style: italic;
}
.card.hidden, .group.hidden { display: none; }
`;
```

- [ ] **Step 19.2: TypeScript check + visual re-run**

```
cd apps/qw-oracle && bunx tsc --noEmit scripts/build-l1-audit-catalog.ts
cd apps/qw-oracle && bun scripts/build-l1-audit-catalog.ts --project ktx --output /tmp/test-catalog.html
```
Open `/tmp/test-catalog.html`. Verify it now looks like the brainstorm mockup — dark theme, amber accents, mono entity names in light blue, TOC on the left, scrolling main column, group/card collapse works.

- [ ] **Step 19.3: Commit**

```
git add apps/qw-oracle/scripts/build-l1-audit-catalog.ts
git commit -m "feat(qw-oracle): build-l1-audit-catalog.ts -- dark theme styling"
```

### Task 20: Replace `INLINE_JS` placeholder with the real filter + collapse logic

- [ ] **Step 20.1: Replace `INLINE_JS` with the real JS**

In `apps/qw-oracle/scripts/build-l1-audit-catalog.ts`, replace the `INLINE_JS` constant with:

```typescript
const INLINE_JS = `
function toggleCard(el) {
  const body = el.parentElement.querySelector('.card-body');
  body.hidden = !body.hidden;
  el.querySelector('.chevron').textContent = body.hidden ? '▸' : '▾';
}
function toggleGroup(el) {
  const body = el.parentElement.querySelector('.group-body');
  body.hidden = !body.hidden;
  el.querySelector('.chevron').textContent = body.hidden ? '▸' : '▾';
}
function applyFilter() {
  const q = (document.getElementById('filter').value || '').toLowerCase().trim();
  const groups = document.querySelectorAll('.group');
  groups.forEach(function(g) {
    const cards = g.querySelectorAll('.card');
    let visibleCount = 0;
    cards.forEach(function(c) {
      const name = (c.getAttribute('data-name') || '').toLowerCase();
      const first = c.getAttribute('data-first') || '';
      const match = !q || name.indexOf(q) !== -1 || first.indexOf(q) !== -1;
      c.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });
    g.classList.toggle('hidden', visibleCount === 0 && q.length > 0);
    // Update group count badge
    const countEl = g.querySelector('.group-count');
    if (countEl) {
      const total = cards.length;
      countEl.textContent = q && visibleCount < total ? (visibleCount + ' / ' + total + ' entities') : (total + ' entities');
    }
  });
  // Auto-expand groups when filtering (so matches are visible)
  if (q.length > 0) {
    document.querySelectorAll('.group').forEach(function(g) {
      const body = g.querySelector('.group-body');
      const chev = g.querySelector('.group-header .chevron');
      if (!g.classList.contains('hidden') && body.hidden) {
        body.hidden = false;
        chev.textContent = '▾';
      }
    });
  }
}
`;
```

- [ ] **Step 20.2: TypeScript check + visual re-run**

```
cd apps/qw-oracle && bunx tsc --noEmit scripts/build-l1-audit-catalog.ts
cd apps/qw-oracle && bun scripts/build-l1-audit-catalog.ts --project ktx --output /tmp/test-catalog.html
```
Open `/tmp/test-catalog.html`. Verify:
- Type "admin" into filter → groups + cards with "admin" in name or first paragraph stay visible; non-matching cards hide.
- Filter clears → all entities visible again.
- Group counts update to "X / Y entities" while filtering.

- [ ] **Step 20.3: Commit**

```
git add apps/qw-oracle/scripts/build-l1-audit-catalog.ts
git commit -m "feat(qw-oracle): build-l1-audit-catalog.ts -- filter + collapse JS"
```

### Task 21: Final render + operator review + ship

- [ ] **Step 21.1: Generate the final artifact at the canonical path**

```
cd /home/paradoks/projects/quakeworld
bun apps/qw-oracle/scripts/build-l1-audit-catalog.ts --project ktx
```
Expected: writes `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` (or whatever today's date is at execution time).

- [ ] **Step 21.2: Operator opens + reviews**

Open the file in a browser. Operator scans through categories, verifies the prose renders cleanly, eyeballs that the categorization makes sense. Iterate on visual polish if surprises emerge (any iteration touches `build-l1-audit-catalog.ts` and re-runs Step 21.1).

- [ ] **Step 21.3: Commit the artifact**

```
git add apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html
git commit -m "feat(arc-ktx-categorize): SHIPPED -- KTX L1 audit catalog HTML at apps/qw-oracle/docs/reviews/"
```

- [ ] **Step 21.4: Tag the ship**

```
git tag -a arc-ktx-categorize-shipped -m "KTX L1 categorization + audit visualization shipped -- category_inferred populated for all 618 entities; HTML catalog at apps/qw-oracle/docs/reviews/"
```

- [ ] **Step 21.5: Push**

```
git push && git push --tags
```

---

## Self-Review

**Spec coverage (each spec section maps to one or more tasks):**

- Page anatomy (top bar + sticky TOC + main column) → Tasks 18, 19, 20.
- Per-row card collapsed/expanded states → Tasks 18 (renderCard), 19 (CSS), 20 (toggleCard).
- Two-tier collapse → Tasks 18, 20.
- Schema migration (`category_inferred` + `_origin`) → Tasks 1, 2.
- F1 probe (provenance integrity) → Task 3.
- Sub-agent prompt + calibration → Tasks 5, 6, 7, 8.
- Fan-out (4 waves) → Tasks 10-13.
- Apply script (clone of format-unify) → Task 4.
- HTML generator (data fetch + render + style + JS + coverage guard) → Tasks 17-20.
- Coverage guard (errors out on NULL) → Task 17.1 (the guard logic itself).
- Visual style → Task 19 (full CSS).
- Output path + dated naming → Task 17.1 (default output computation) + Task 21.1.
- Idempotent regenerate → byte-identity via deterministic SQL ORDER BY + deterministic ISO timestamp (note: the timestamp in the header changes each run; if byte-identity is required, freeze timestamp from an arg or git-derived value — deferred polish).

**Placeholder scan:** Migration ordinal `<NNN>` is intentionally derived at execution time (Step 1.1). Output filename embeds today's date at runtime. No "TBD" / "TODO" left in the plan.

**Type consistency:**
- `category_inferred` + `category_inferred_origin` column names used consistently across schema (Task 1), apply script (Task 4), F1 probe (Task 3), HTML generator (Task 17).
- Ledger field `NEW category_inferred:` matches what the apply-script regex parses (Task 4.3).
- `EntityRow` interface in the TS generator matches the SQL SELECT columns (Task 17.1).

**Risks tracked:**
- HALT row pileup → Task 14.1 surfaces them; coverage guard at Task 15.4 refuses to ship without them resolved.
- Sub-agent invents a category → prompt's "Constraints (non-negotiable)" section forbids it; NEW-CATEGORY-NEEDED is the structured escape valve (Task 14.2).
- Apply script writes wrong table → Task 4.4 routes by canonical_id prefix; verification at Step 15.6 surfaces mis-routing as a missing category.
- Timestamp churn breaks byte-identity → noted in self-review, deferred polish.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/README.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Per-task subagent dispatch with review between tasks. Fast iteration; the fan-out waves naturally parallelise across sub-dispatch boundaries.

**2. Inline Execution** — Execute tasks in this session via executing-plans, batch execution with operator checkpoints at every wave gate (Step 8.1, 10.2, 11.2, 12.2, 13.2, 15.4, 21.2). All inline, single conversation.

Which approach?
