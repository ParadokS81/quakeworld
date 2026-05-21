# KTX L1 format-unify -- sub-agent brief (LOCKED 2026-05-21)

You are dispatched to rewrite N KTX cvar+command Layer 1 descriptions to the locked D20 template. **You are not re-synthesizing content -- the existing `description_reasoning` carries the trusted audit trail from Session #9. Your job is shape: condense the prose surface, lift the value enum into structured form, add Default/Set-by lines, drop file:line refs + engine-jargon from the user-facing surface.**

## Pre-reads (in order)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` D20 (lines 1233-1311) -- the template + anti-patterns + rationale.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-screening-affirmed-rows.md` -- 11 worked examples in the locked template (`dp` / `dq` / `dr` / `k_prewar` / `k_spectalk` / `k_sayteam_to_spec` / `k_dmm4_gren_mode` / `k_demo_mintime` / `k_exclusive` / `k_admins` / `k_allowvoteadmin`). Read these carefully -- they are your shape anchor.

## The D20 template (verbatim, from decisions.md:1239)

```
<1-line what-it-does>

<value> = <meaning>
<value> = <meaning>

Default: <X>.  [or "Default: X. Recommended: Y." when convention differs]
Set by: <method>.  [server config / admin command '<cmd>' / any-player '<cmd>' / vote / etc.]
See also: <concept-note slug>.  [optional; only when the existing reasoning explicitly synthesises across codebases]
```

**Scalar (non-enum) variant.** Some cvars are numeric ranges or free-form scalars, not discrete enums. For those, the `<value> = <meaning>` enum block becomes a single `Range:` or `Units:` line, e.g.:

```
<1-line what-it-does>

Range: 0 to 100 (seconds).

Default: 30.
Set by: server config.
```

**Boolean variant.** When the cvar is a 0/1 toggle, the two-line enum block is the standard shape (see `dp` / `dq` / `dr` in the anchor ledger). Always use `0 = ...` / `1 = ...`, never `off/on` or `false/true` (matches engine convention).

## Anti-patterns (NEVER in the rewritten description)

- Engine/code jargon: "think handler", "cf_flags", "stuffcmd", "fpd bit 64", "spawn-flag bitmask", etc.
- File:line refs in prose: `world.c:1442-1469`, `combat.c:660-683`, etc.
- Code citation prose: "the function returns true at...", "the registration sets...".
- Source-trace synthesis: "MVDSV's spec-filter records into the MVD dem_multiple bitmask..." -- that belongs in `description_reasoning` or an L3 concept note pointed to via `See also:`.

All of those belong in `description_reasoning` (which YOU DO NOT MODIFY) or an L3 concept note.

## Voting cvars (`k_vp_*`) -- generic-framing hedge

For KTX voting-percentage cvars (`k_vp_map`, `k_vp_captain`, `k_vp_break`, `k_vp_admin`, `k_vp_coach`, `k_vp_pickup`, `k_vp_rpickup`, `k_vp_nospecs`, `k_vp_teamoverlay`, `k_vp_coop`, `k_vp_hookstyle`, `k_vp_antilag`, `k_vp_privategame`, `k_vp_suggestcolor`), **avoid claiming a specific vote-cast command syntax** in the description -- the mechanism varies across cvars in KTX (some are toggle-the-named-command consensus style, e.g. `/break`; others require an explicit approval cmd like `/yes`, e.g. `/captain`). Stick to generic framing like "a captain election" or "a break vote", **not** "(/captain vote)" or "(/break vote)". The cvar value is "percentage of eligible voters required to pass" -- frame around the threshold concept, not the command syntax.

## Your batch

Read your assigned canonical_ids from: `<BATCH_FILE>`

For each canonical_id, pull existing state from Postgres. The recommended pattern is one batched query:

```
ids=$(cat <BATCH_FILE> | tr '\n' ',' | sed 's/,$//' | sed "s/[^,]*/'&'/g")
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -A -F $'\x1f' -t -c \
"SELECT canonical_id, name, type, description, description_reasoning, description_origin, description_verdict, source_ref FROM entities WHERE canonical_id IN ($ids) ORDER BY canonical_id;"
```

The `\x1f` field separator (ASCII unit separator) is used so that newlines + quotes inside descriptions don't break field boundaries. Parse line-by-line, split on `\x1f`.

## Per-row task

For each row in your batch:

1. Read existing `description` (probably verbose, possibly long) + `description_reasoning` (audit trail -- trusted).
2. Synthesise a NEW description per the D20 template, using the reasoning as your source of truth for what the cvar/command actually does.
3. Preserve every factual claim from existing description that is enforce-traced in the reasoning.
4. Strip jargon, file:line refs, code-trace prose, and cross-codebase synthesis from the NEW description.
5. If the existing description is already short + clean (<=250 chars), light-touch: keep the prose, add Default/Set-by lines if missing, normalise the value enum block.
6. If the existing description has cross-codebase synthesis (e.g. KTX cvar + MVDSV engine + ezQuake client), DO NOT inline that in the NEW description -- emit `See also: <slug>` instead. Choose a slug that names the cross-codebase topic (e.g. `qw-team-chat-visibility` for the k_spectalk family). The concept note may not exist yet -- that is fine; the See-also line marks the link for future L3 authoring.

## Output ledger shape

Write your output to: `<LEDGER_FILE>`

Start the file with a brief header:

```markdown
# B5 format-unify ledger -- batch <NN>

**Batch:** <NN> (<count> rows)
**Source prompt:** `b5-format-unify-prompt.md` (locked 2026-05-21)
**Target template:** D20 (decisions.md:1233-1311)
**Anchor exemplars:** `b4-ledger-screening-affirmed-rows.md` (11 rows)

---
```

Then, per row, append:

````markdown
B5-RESULT | <canonical_id> | FORMAT-UNIFIED | rev=1 | from-shape: <one-line> | to-shape: D20-template

### <canonical_id>

- canonical_id: <id>
- prior length: <chars>
- new length: <chars>

- OLD description:
  > <verbatim from DB, prefix each line with `> `>

- NEW description:
  > <your rewrite, D20-template shape, prefix each line with `> `>

---
````

**Do NOT emit `NEW description_reasoning`, `NEW source_ref`, `NEW anchor`, `NEW verdict`, or `NEW description_origin` blocks.** The apply script preserves those columns when no `NEW <field>` block is present in the ledger. The b5 ledgers are description-shape-only.

## Constraints (C4 -- non-negotiable)

- Read-only on the L1 database. No `UPDATE`, no `INSERT`.
- No file writes outside `<LEDGER_FILE>`.
- No content re-synthesis. If you believe the existing reasoning is wrong, HALT that row (see HALT shape below) and continue with the rest.
- The 11 anchor rows in the skip-list (below) must never appear in your batch -- if you see one, HALT that row.

**Skip-list (11 rows already in D20 template -- never rewrite):**

```
ktx:cvar:dp, ktx:cvar:dq, ktx:cvar:dr, ktx:cvar:k_prewar,
ktx:cvar:k_spectalk, ktx:cvar:k_sayteam_to_spec, ktx:cvar:k_dmm4_gren_mode,
ktx:cvar:k_demo_mintime, ktx:cvar:k_exclusive, ktx:cvar:k_admins,
ktx:cvar:k_allowvoteadmin
```

- Length guidance: target 200-500 chars for the NEW description. Going under 200 is fine if the cvar is genuinely simple. Going over 500 is a smell -- re-read your draft for anti-patterns.

## HALT shape

For a row you cannot rewrite cleanly (existing reasoning seems wrong, cross-codebase synthesis depth too high to compress, etc.):

```
B5-RESULT | <canonical_id> | HALT-<reason> | rev=1 | residue: <one-line why>

### <canonical_id> (HALT)
- canonical_id: <id>
- prior length: <chars>
- halt reason: <one-paragraph>
- recommendation: <what the operator should do -- hand-rewrite, defer, or escalate>

---
```

The apply script skips HALT rows automatically.

## When done

1. Self-check: `grep -cE '^B5-RESULT \|' <LEDGER_FILE>` should equal the count of rows in your batch.
2. Report verbatim:

```
B5 BATCH <NN> DONE -- <N> rows
FORMAT-UNIFIED: <n>
HALT: <m>
ledger: <basename of LEDGER_FILE>
notes: <one line -- anything unusual, or "none">
```

No commits. No `git add`. The dispatching session handles git.
