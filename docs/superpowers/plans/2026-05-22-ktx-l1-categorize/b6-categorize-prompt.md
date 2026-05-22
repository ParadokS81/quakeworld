# KTX L1 categorize -- sub-agent brief (LOCKED 2026-05-22, v1)

You are dispatched to assign ONE category to each of N KTX cvars/commands. **You are not authoring or modifying descriptions -- the D20 prose is locked. Your job is taxonomic: read the existing description + reasoning + source location, pick the best category from the locked list.**

## Pre-reads (in order)

1. `docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md` -- sections "Strawman category list" + "Categorization pipeline / Step 2".
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` D20 (lines 1233-1311) -- the description template you'll be reading.

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

- **Admin & permissions** -- admin role, designation, rcon, ban management, permission tiers (k_allow*).
- **Voting** -- k_vp_* family, vote thresholds, vote-allowed flags.
- **Match flow** -- prewar, ready, restart, breaks, timers, match-state transitions.
- **Gameplay rules** -- weapon balance, item respawn, damage tuning that applies across all modes.
- **Mode selection** -- *commands* an admin runs to switch the active mode: `clan_arena`, `wipeout`, `midair`, `dmm <N>`, `instagib`, `bloodfest`, `lgc`.
- **Mode-scoped knobs** -- *cvars* whose effect is scoped to one specific mode (k_dmm4_*, k_ca*, k_wp*, k_lgc*, k_666*, k_midair*, k_bf*, k_instagib*).
- **Frogbot** -- bot skill, behavior, waypoints (k_fb*, k_fbskill_*, fb commands).
- **Race** -- race mode cvars + commands (k_race*, race*).
- **Demo & spectator** -- recording, replay, spec controls, qtv broadcast policy.
- **Spectator chat & visibility** -- k_spectalk, k_sayteam_to_spec, spec-chat policy.
- **Scoring & stats** -- frag rules, stat tracking, end-of-match data.
- **Server config & network** -- rates, slots, hostname, MOTD, broadcast intervals, sv_* server-side.
- **Internal state** -- `_k_*` engine internals, set only by KTX itself, never by config.

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

(For commands, the join is `LEFT JOIN command_versions cm ON cm.entity_id=e.id AND e.type='command'` -- use whichever applies; or run two queries.)

## Per-row task

For each row in your batch:

1. Read existing `description` (D20-shape prose -- already audited) + `description_reasoning` (audit trail -- file:line cites, code refs) + name + source_file.
2. Match against the locked category list using the disambiguation guide.
3. Emit ONE category, verbatim from the locked list.
4. If genuinely no listed category fits, emit a `NEW CATEGORY NEEDED` flag with a proposed name + one-sentence justification. Do NOT invent a category and put it in `NEW category_inferred:` -- only the locked list values are valid in that field.
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

- reasoning: <1-2 sentences explaining the choice -- cite the description's role / source_file / key keywords from reasoning>

---
```

For a row that needs a NEW CATEGORY:

```
B6-RESULT | <canonical_id> | NEW-CATEGORY-NEEDED | proposed=<name> | rev=1

### <canonical_id> (NEW CATEGORY NEEDED)
- canonical_id: <id>
- proposed category: <name>
- justification: <one paragraph -- what's the role, why none of the locked 13 fit>
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
- No invention of category names in `NEW category_inferred:` -- use only the 13 locked values verbatim.
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
notes: <one line -- anything unusual, or "none">
```

No commits. No `git add`. The dispatching session handles git.
