---
name: describe-fill-synthesis
description: |
  Use this skill to evaluate one KTX / MVDSV / QTV / QWFWD configurable knob (cvar /
  command / cmdline param / info_key) and either affirm its existing
  comment as an owned user-doc description or synthesize a new one from
  code use-sites. Triggers on "/describe-fill-synthesis <project> <knob>",
  "describe-fill <knob>", "synthesize the description for <knob>", "run
  the D6 synthesis skill on <knob>", "keep-vs-synthesize <knob>", or any
  per-knob describe-fill judgment dispatched by a KTX/MVDSV describe-fill
  phase. One knob per invocation; designed for sub-agent fan-out. Engine-
  agnostic -- the phase supplies the entity; the skill never branches on
  which engine. Synthesis runs at Opus 4.7 MAX (spec-locked, D7).
---

# describe-fill-synthesis

One configurable knob per invocation. Produces a structured evaluation
record (verdict, owned description, origin tag, `source_ref` file:line +
anchor, retained provenance, verdict/confidence/reasoning trail). Built
for fan-out: a KTX/MVDSV describe-fill phase (Phase 3 KTX, Phase 4 MVDSV)
dispatches one sub-agent per in-scope knob over this skill as the unit.

This is the D6 guardrailed synthesis discipline. It hard-codes the
D5-amended rubric, read-site grounding, the evidence requirement, the
hard confabulation guard, the C3 dead-stamp sibling, the research-docs
amendment, and the D8 bot/judgment sibling. Precedence: where this skill
and `decisions.md` differ, `decisions.md` governs; where `decisions.md`
and the spec differ, the spec governs; a dated amendment always governs
the pre-amendment text it mirrors.

## Model dial (LOCKED -- not a per-invocation choice)

This skill's synthesis pass runs at **Opus 4.7, MAX reasoning**. The dial
is spec-locked by D7; the skill DECLARES it. It is NOT selectable per
invocation and is NOT lowerable. "cheap" / "fast affirm" (Step 3) is the
early-exit path WITHIN this single Opus-4.7-MAX invocation when a comment
already clears the rubric -- NOT a separate cheaper pre-classify model
tier (D7 clarification 2026-05-17). A low-reasoning first pass is
spec-rejected false economy. Every step below runs in this one context.

## Trigger phrases

- `/describe-fill-synthesis <project> <knob>`
- "describe-fill <knob>"
- "synthesize the description for <knob>"
- "run the D6 synthesis skill on <knob>"
- "keep-vs-synthesize <knob>"

## Inputs

- **project** -- required. `ktx`, `mvdsv`, `qtv`, or `qwfwd`. Scopes source reads + the
  `source_ref` only; never selects a different rule path.
- **knob** -- required. The exact entity name (cvar / command /
  cmdline_param / info_key) as it exists in Layer 1.
- **anchor_version** -- required. The project's dev-head (KTX/MVDSV) or
  frozen-snapshot (QTV/QWFWD) version/commit the synthesis is authored
  against. Stamped on every `synthesized` row.
- **mechanical_candidate** -- optional. The Phase 2/4 harvested candidate
  + provenance, if any. Absence is normal and is NOT a skip (D5
  amendment: every entity is evaluated).
- **suspect_pool_member** -- optional boolean. TRUE if Phase 0's C3
  runtime-dead diff placed this knob in the suspect pool. The skill
  CONSUMES this flag; it does NOT build the pool.

## Context files to load at start

Read all six before Step 1 (the fifth added by `decisions.md` D7
Amendment 2026-05-19 / B1; the sixth, D20, added 2026-05-30); they govern
the work and the skill does not restate them:

- `references/d5-rubric.md` -- full D5-amended quality-bar rubric + worked
  keep-vs-synthesize examples (the keep-vs-synthesize judgment).
- `references/evidence-and-citation.md` -- the existing `source_ref`
  mechanism (the `cvar_versions` / `command_versions`
  `source_file`+`source_line` pair, indexed `idx_cvar_versions_source`),
  the migration-014 verdict-trail columns, the hard confabulation guard.
  No new citation format is ever invented (P3, D6).
- `references/c3-dead-stamp-and-residue.md` -- the C3 dead-stamp template
  + the C1 residue / community-outreach routing recipe.
- `references/subagent-brief-template.md` -- the per-knob brief shape
  (read by the fan-out dispatcher, not the per-knob run).
- `references/enforce-trace-discipline.md` -- D7 Amendment 2026-05-19
  (B1): the MANDATORY per-clause enforcement-trace rule (every
  semantic/threshold/polarity/scope/OFF-state clause traced to its
  enforcing line incl. adjacent comments), the r42 anti-shortcut, WI-1
  strengthened / WI-2 / PROC-1, the V-pass classification enum, the
  seeded-re-synth (B4) rule. Governs Step 1, Step 5, and the
  Verification-discipline section.
- `references/d20-description-template.md` -- D20 (locked Session #9,
  2026-05-21): the condensed ezquake.com-style SHAPE of the user-facing
  `description` (the `<what> / <value>=<meaning> / Default: / Set by: /
  See also:` template), the hard split that all file:line / code-jargon
  cites go in `description_reasoning` NOT `description`, and the
  cross-engine `See also: L3` policy. Governs Step 3, Step 5, Step 6.

---

## Hard pre-flight gate

ABORT (produce no record) and report the reason if ANY holds:

1. `project` is not one of `ktx`, `mvdsv`, `qtv`, `qwfwd` (rules are
   engine-agnostic; these four are the supported scope).
2. `knob` does not resolve to a live Layer 1 entity for `project`.
   Synthesis fills an existing row; it never creates entities (D9).
3. `anchor_version` is absent (a `synthesized` row with no anchor is a C5
   `synthesized_requires_anchor` failure by construction).
4. The six `references/` files are not all present (load-bearing; the
   skill is non-functional without them).

If none hold, proceed to Step 1.

---

## Workflow (per knob; all steps run in the locked Opus-4.7-MAX context)

### Step 1 -- Locate the read use-sites (NOT the name)

Read-site grounding: the synthesis input is the code USE-SITES, never the
knob name. Grep the `project` source for where the value is READ (not
just registered): `<knob>.value` / `.string` / `.integer` reads, the
branches gated on it, the behavior it changes. The research landscape
docs (`docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`) are
admissible AIDS to locate use-sites and corroborate (D6/D7 amendment) --
source stays ground truth; they are NOT a substitute citation.

**Output:** the read use-sites as `source_file:source_line`, plus one
sentence per site on the observable admin-facing behavior it controls.

**In-step rule -- name-only synthesis is FORBIDDEN.** If you have only
the name and no read use-site exhibits the behavior, you may NOT infer
meaning from the name. Go to Step 4 -- hedge/residue, not synthesis.

### Step 2 -- C3 suspect-pool check

If `suspect_pool_member` is TRUE the knob is registered in source but was
absent from the same-version running-build dump. It does NOT get a
confident "tunes X" description: emit the C3 truthful dead-stamp (exact
wording in `references/c3-dead-stamp-and-residue.md`) and route to the C1
outreach track. Skip Steps 3 and 5; verdict `dead_stamped`. The skill
only ENCODES this; Phase 0 produced the pool.

### Step 3 -- Evaluate the existing comment against the D5 rubric

This IS the keep-vs-synthesize classify, hard-coded inside this
Opus-4.7-MAX skill (D7 clarification; not a separate model). EVERY knob
is evaluated, with or without a comment. The trailing comment (and any
`mechanical_candidate`) is ONE INPUT, never a "documented/done" verdict
(D5 amendment supersedes the original "clears the bar -> kept as-is"
phrasing). Grade against the full rubric in `references/d5-rubric.md`:

- Reads as a genuine user description (WHAT in admin-observable terms;
  not a name restatement; units/enums spelled out; mechanism only, no
  opinion; self-contained) AND already reads in the D20 template shape
  (`references/d20-description-template.md`) -> adopt it verbatim; origin
  stays `source_inline` (affirmed-by-evaluation, NOT skipped -- the
  fast-affirm early exit, still inside the Opus-MAX invocation). Verdict
  `affirmed`. NOTE (operator decision 2026-05-30): a serviceable one-liner
  that clears the rubric but is NOT already in the D20 template shape does
  NOT affirm -- it routes to Step 5 synthesize (full synthesis; there is no
  cheaper affirm-and-reshape lane). Verbatim-affirm is therefore rare;
  most engine comments are dev-WHY or sub-template and synthesize.
- Dev-rationale / tautological / cryptic / opinion-laced / weak / absent
  -> Step 5 (synthesize).

**D8 sibling (in-step rule):** a bot-skill / judgment-tier knob (e.g.
`k_fbskill_*`) is NOT special-cased out. Its AI use-sites are
source-legible; it gets a mechanism-only description ("controls the bot's
RL accuracy weighting; higher = more accurate") and counts as COMPLETE
L1. The recommended-value / tuning advice routes OUT to an L3 candidate;
its absence is NOT an L1 gap. Run it through Step 5 like any other knob.

**Output:** verdict, the graded rationale, and -- if `affirmed` -- the
adopted text.

### Step 4 -- Hard confabulation guard

Reached from Step 1 (no legible use-site) or any point where behavior is
not source-legible. Do NOT guess and do NOT infer from the name. Either
(a) write a HEDGED description stating ONLY what IS source-legible and
explicitly marking the unknown (verdict `hedged`), or (b) route to the C1
residue / community-outreach track (verdict `residue_routed`). Recipe in
`references/c3-dead-stamp-and-residue.md`. NEVER fabricate behavior.

### Step 5 -- Synthesize from the read use-sites

Write the owned description STRICTLY from the Step 1 read use-sites: WHAT
the knob does in admin-observable terms (not WHY the code does it), not a
name restatement, units/enums spelled out, mechanism only (no
recommended value, no opinion), self-contained without reading source.
Conform to every rubric clause in `references/d5-rubric.md`. Author it in
the LOCKED D20 template shape (`references/d20-description-template.md`):
the condensed `<what> / <value>=<meaning> / Default: / Set by: / See also:`
form, NO engine/code jargon and NO file:line refs in `description` -- every
enforce-trace cite goes in `description_reasoning`, never the user doc;
cross-engine consequences route to `See also: L3` unless action-changing.

**Enforce-trace (MANDATORY, D7 Amendment 2026-05-19 / B1 -- full method
in `references/enforce-trace-discipline.md`):** for EVERY semantic /
threshold / polarity / scope / OFF-state / side-effect clause you write,
locate the source line that ENFORCES it and verify the clause against
that line's actual code INCLUDING adjacent comments. A clause derivable
only from the knob name, an announce/redtext string, an enum name, or a
config comment -- with no enforcing read-site -- is FORBIDDEN: hedge it
(Step 4) or drop it, never assert it. A cited, consistent-looking line is
NOT sufficient (the r42 lesson): the citation must be the line that
enforces the specific assertion (exact threshold, polarity, scope,
restore-set, OFF-state). Produce only text that would classify
TRACED-CLEAN. When invoked as a seeded re-synth (B4), the V-pass finding
is a mandatory anchor input but does NOT narrow scope -- run the full
per-clause trace, not a one-sentence patch.

**Evidence requirement (in-step rule, load-bearing):** the row carries a
`source_ref` of `source_file:source_line` PLUS `anchor_version`, reusing
the EXISTING citation mechanism (the `cvar_versions`/`command_versions`
`source_file`+`source_line` pair, indexed `idx_cvar_versions_source`) --
NO new citation format (P3, D6). The `source_ref` points at the
authoritative read use-site that exhibits the described behavior. Origin
`synthesized`. Detail in `references/evidence-and-citation.md`.

### Step 6 -- Emit the structured record

Emit ONE record (the consuming phase persists it; this skill does not
write the DB and does not commit). Fields map to the migration-014
description-provenance family (full detail in
`references/evidence-and-citation.md`): `description` (in the D20 template
shape -- `references/d20-description-template.md`; user-doc only, no
file:line / jargon), `description_origin` (`source_inline` affirmed /
`synthesized`),
`source_ref` (`source_file:source_line`), `description_anchor_version`
(anchor for synthesized; NULL if affirmed), `description_provenance`
(per-file provenance as a JS value, NEVER pre-stringified -- P2),
`description_verdict`, `description_confidence`,
`description_reasoning` (the grading + grounding rationale + the per-clause
enforce-trace file:line cites that D20 keeps OUT of `description`, STORED
not just logged -- D11; include any C2 conflict note), `description_proposed`
(the text the D7 reviewer re-checks). Hand the record to the dispatching
phase; it does NOT auto-commit -- the D7 two-tier gate (separate task /
separate invocation) re-checks every `synthesized` row before commit.

---

## Verdict enum

Exactly one per knob:

- **affirmed** -- comment cleared the D5 rubric; adopted verbatim; origin
  `source_inline`; no anchor.
- **synthesized** -- own description from read use-sites; origin
  `synthesized`; `source_ref` + anchor. Includes D8 bot/judgment
  mechanism-only descriptions -- COMPLETE, not degraded.
- **dead_stamped** -- C3 suspect-pool member; truthful dead-stamp;
  routed to the C1 outreach track; no confident behavior claim.
- **hedged** -- partially source-legible; states only the legible part,
  marks the unknown; C1-routed.
- **residue_routed** -- not source-legible even at Opus-MAX; routed to
  the C1 community-outreach track; tracked, never dropped (C1).

## Flag-gated output branch

| Verdict | description_origin | source_ref + anchor | C1-outreach route |
|---|---|---|---|
| affirmed | `source_inline` | none (NULL anchor) | no |
| synthesized | `synthesized` | required (both) | no |
| dead_stamped | `synthesized` (dead-stamp text) | registration-site ref; anchor set | YES |
| hedged | `synthesized` | required on the legible part | YES |
| residue_routed | `synthesized` (placeholder) | registration-site ref; anchor set | YES |

Every verdict produces a row. C1 is non-negotiable: not-source-legible
residue is TRACKED and routed, never silently dropped.

## Output locations

| Artifact | Destination | When |
|---|---|---|
| Structured per-knob record | returned to the dispatching phase in-context; the phase persists it | always |
| C1 outreach-track entry | the phase's residue ledger (phase-owned) | dead_stamped / hedged / residue_routed |
| L3 tuning-advice candidate | routed OUT to the L3 line (phase-owned) | D8 bot/judgment knobs |

The skill writes no DB, no files, no commit. It produces a record; the
phase persists it; the D7 gate (separate task) re-checks it pre-commit.

## Sub-agent fan-out

Phase 3 / Phase 4 dispatch one sub-agent per in-scope knob, each running
THIS skill at Opus 4.7 MAX (the dial is locked here, not chosen by the
dispatcher). The per-knob brief MUST carry the >=6 non-inferential
elements specified verbatim in `references/subagent-brief-template.md`.
The dispatcher does not delegate the rubric judgment; it delegates the
per-knob application of it.

---

## Reporting / halt contract

Final line of every invocation:

```
<project>:<knob>: <VERDICT> -- <one-line rationale> -- origin=<tag> ref=<source_file:source_line|none> anchor=<version|none>
```

Example: `ktx:sb_qtvlist_url: dead_stamped -- suspect-pool; registered
not running-reachable; C1 routed -- origin=synthesized
ref=src/sv_sysinfo.c:88 anchor=1.47-dev-<sha>`

Do not commit. The orchestrating executor handles staging and commit.

## Verification discipline

Before naming any `source_file`, `source_line`, knob name, or version:
verify it against the live `project` source (grep / Read the C file).
Per D7 Amendment 2026-05-19 / B1 (`references/enforce-trace-discipline.md`):
a cited read use-site that merely LOOKS consistent is NOT a pass -- you
must locate the line that ENFORCES each clause and verify the clause's
specific assertion (exact threshold, polarity, scope, restore-set,
OFF-state) against that line's code AND adjacent comments; if deciding a
clause needs a callee, read the callee. The D7 reviewer (V-pass)
re-checks exactly this per-clause; catching a mismatch here is cheaper.
Mark every unverified or partially-legible claim explicitly (verdict
`hedged`); never let "likely"/"probably" slip into prose that otherwise
reads as fact. Do not explain away an expected-vs-observed gap -- hedge
or route it.

## Common pitfalls (each is a restatement of a named rule above)

These are the failure modes; each is fully specified by the cited rule:
synthesizing from the name (Step 1 in-step rule); treating a trailing
comment as "done" (Step 3, D5 amendment); inventing a citation format
(Step 5 evidence rule, P3/D6); a confident description for a suspect-pool
knob (Step 2, C3); degrading or skipping bot/judgment knobs (Step 3 D8
sibling); dropping not-legible residue (Step 4 + the flag-gated branch,
C1); lowering the model dial (Model dial section, D7); treating research
docs as the citation (Step 1, D6/D7 amendment); pre-stringifying
`description_provenance` (Step 6, P2); promoting dev-WHY into the
user-doc text (Step 3 -- affirm only on genuine user-WHAT); leaking the
enforce-trace -- file:line refs, function names, or engine jargon -- into
the user-facing `description` instead of `description_reasoning` (Step 5 /
Step 6, D20).

## Escape hatches

- `mechanical_candidate` and the trailing comment CONFLICT: do not
  silently pick. Source is tiebreaker (D10): synthesize from the read
  use-sites, record the conflict in `description_reasoning` for the D7
  operator tail (C2: clear conflicts surfaced, never auto-resolved).
- Live entity but every read-use-site grep is empty AND not in the
  suspect pool: treat as Step 4 (not source-legible) -- hedge or
  residue-route. Do NOT assume dead (that C3 classification is the parked
  arc's, not this skill's).
- Invoked without `project`, `knob`, or `anchor_version`: do not guess --
  ask. The pre-flight gate enforces this.
- A dispatched knob out of arc scope (not a KTX/MVDSV/QTV/QWFWD
  cvar/command/cmdline_param/info_key): decline, report the abort reason,
  do not improvise.

## When unsure, ask

If the invocation is ambiguous (no project, no anchor, or an
unresolvable knob), ask the operator / dispatching phase rather than
guessing. The cost of asking is one turn; the cost of a confabulated L1
description is a shipped lie. This skill's entire purpose is to refuse to
guess -- when in doubt, hedge, route to C1, or ask.
