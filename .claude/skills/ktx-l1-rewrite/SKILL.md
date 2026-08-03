---
name: ktx-l1-rewrite
description: |
  Use this skill to recast one KTX L1 entity's existing description under the v2
  universal shape (Layer A) and classify it under the Layer B KTX shape catalog
  (14+ shapes). Triggers on "/ktx-l1-rewrite <entity>", "rewrite the L1
  description for <entity>", "recast <entity> under v2 shape", "ktx l1 rewrite",
  "apply the v2 template to <entity>", or any per-card sub-agent dispatch from
  the catalog-wide template-application arc. One entity per invocation; designed
  for sub-agent fan-out. Sonnet 4.6 high reasoning (locked). The skill MUST park
  entities it cannot confidently classify rather than guessing -- never
  force-fit a shape onto a 1-of-1 mechanism. Sibling to
  describe-fill-synthesis (which handles cold synthesis from raw comments);
  ktx-l1-rewrite is the recast cousin for entities that already have meaningful
  descriptions. Engine-scoped to KTX; future MVDSV/QWFWD/QTV variants fork the
  skill per codebase.
---

# ktx-l1-rewrite

One KTX L1 entity per invocation. Produces a structured record (verdict +
proposed v2 description + shape classification + reasoning) and writes a
per-card section to either the drafts or park file. Built for sub-agent
fan-out from the catalog-wide template-application arc.

This is the recast skill. Sibling `describe-fill-synthesis` handles cold
synthesis from source; ktx-l1-rewrite handles recast of an existing
description under the v2 universal shape (Layer A) + Layer B KTX shape
catalog. Cheaper job, cheaper dial, faster per card.

Where this skill and the design spec at
`/home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`
differ, the spec governs.

## Model dial (LOCKED -- not a per-invocation choice)

Runs at **Sonnet 4.6, high reasoning**. Spec-locked; declares "this is
sufficient." Pattern-classify + template-fill + spot-check fits Sonnet high;
the cost differential vs `describe-fill-synthesis` (Opus MAX) is the entire
point of this skill existing separately. Dispatcher-level escalation
(re-running the parked pile at Opus) is operator-level, not skill-level.

## Trigger phrases

- `/ktx-l1-rewrite <entity>`
- "rewrite the L1 description for `<entity>`"
- "recast `<entity>` under v2 shape"
- "apply the v2 template to `<entity>`"
- per-card dispatch from the catalog-wide template-application arc

## Inputs

The dispatcher pre-fetches all of these from L1 + the catalog HTML and passes
them in. The skill does not query L1; it consumes the inputs.

- **entity_name** -- required. Exact L1 entity (e.g. `k_fallbunny`, `fallbunny`).
- **entity_type** -- required. `cvar` | `command` | `cmdline_param` | `info_key`.
- **category** -- required. KTX category (e.g. `gameplay`, `Administration & Access`).
- **existing_description** -- required. Current L1 description text.
- **source_ref** -- required. Current `source_file:source_line` from L1.
- **anchor_version** -- required. KTX dev-head commit the recast is anchored against.
- **catalog_line** -- required. Line in the rendered HTML catalog (for cross-link).
- **batch_date** -- required. `YYYY-MM-DD` passed by the dispatcher so all sub-agents in a batch append to the same drafts/park file pair.

## Invocation modes

Two modes; the workflow is identical in both:

- **Single mode** (default): one entity per invocation; inputs above are scalars; Step 6 emits one record + one reporting line.
- **Chunked mode**: when invoked with a list of entity-input objects (each matching the scalar input shape above), the skill processes them sequentially in the same context. The 6 reference files load ONCE; the per-entity workflow runs N times. Step 6 emits a list of N records (one per input entity, in order) and N reporting lines. The dispatcher controls chunk size (typically 5-8).

In chunked mode, each entity gets its own full pass through Steps 1-6 -- no cross-entity reuse of source greps, shape classifications, or spot-check work. If entity K is shape-less but entity K+1 looks similar, the K+1 classification must still be derived from scratch via Step 2. Do not let earlier entities' verdicts bias later ones.

Park triggers mid-chunk do NOT abort the chunk. If entity K hits trigger 1 or 4 (novelty), record the park and continue processing entities K+1 through N. The dispatcher decides whether to halt the whole batch from the aggregate digest.

## Context files to load at start

Read all 6 before Step 1. They are self-contained for sub-agent contexts
(auto-loaded memory does not transfer to sub-agents -- the skill cannot rely
on `[[reference-...]]` resolution at runtime).

- `references/shape-catalog.md` -- Layer B 14+ KTX shapes + identification
  guide + canonical-card pattern + command-per-value fan-out modifier +
  tooling-mode prerequisite.
- `references/universal-shape-v2.md` -- Layer A v2 shape (Headliner / Effect /
  Prerequisites / Permission / Match-state / Default / Example / See-also);
  action-level not impl-level; user-actionable prereqs; subsequent-invocation
  toggle; anti-patterns.
- `references/layer-architecture.md` -- two-layer model; L1 vs L3 division;
  L1-as-graph-node; See-also discipline.
- `references/entity-categories.md` -- three-bucket model (`k_*` cvars /
  userinfo keys / commands); the `k_sdir` false-positive trap.
- `references/worked-examples.md` -- one ground-truth card per shape from the
  catalog walk (sessions 1-3) with the v2 recast pattern + skill signals.
- `references/park-triggers.md` -- 4 park trigger types with disambiguation +
  park-file entry format + drafts-file entry format + park-vs-flag distinction.

## Hard pre-flight gate

ABORT (produce no record, emit the abort line, halt) if ANY hold:

1. `entity_name` does not resolve to a live Layer 1 KTX entity. Recast
   consumes L1; it never creates entities.
2. `existing_description` is trivial -- under 100 chars OR no behavior clause
   (only a Set-by line, only a bare label, or pure boilerplate). Aborts with
   reason `needs-synthesis`; the card routes to `describe-fill-synthesis`
   separately.
3. `anchor_version` is absent. A recast without an anchor cannot be stamped
   against a commit.
4. Any `references/` file fails to load. The skill is non-functional without
   the full template stack.

Abort line format:

```
ktx:<entity>: ABORTED -- <reason> -- anchor=<version|none>
```

If none of the gate conditions hold, proceed to Step 1.

## Workflow (per card; all in the locked Sonnet 4.6-high context)

### Step 1 -- Read registration + key read use-sites

Grep KTX source for the entity registration site + 1-2 key read sites.
KTX source root: `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`.
For mvdsv-redirected commands (the ban family, etc.), also
`/home/paradoks/projects/quakeworld/research/repos/mvdsv/src/`.

- **Cvars:** `RegisterCvar("<entity>")` in `world.c` + read sites
  (`<entity>.value`, `<entity>.string`, `cvar("<entity>")`) + any write sites
  (`cvar_toggle_msg`, `cvar_fset`, `cvar_set`).
- **Commands:** registration row in `src/commands.c` (`{ "name", handler, arg,
  CF_<flags>, CD_<name> }`) + the handler body in the named file.
  **MANDATORY**: extract the exact `CF_<flags>` value from the registration
  row into your Step 1 output (e.g. "CF flags: `CF_PLAYER | CF_SPC_ADMIN`")
  AND map it to the Permission line via the CF-flag-to-wording table in
  `references/universal-shape-v2.md`. Do NOT infer Permission from the
  existing description's prose ("admin command", "any player", etc.) --
  inferred Permission lines are the F1 audit pattern that has surfaced in
  7+ consecutive batches. The registration row is authoritative; the
  existing prose is hypothesis. Added 2026-05-27 after F1 7th-batch
  threshold (Gameplay rules).
- **Userinfo keys:** handler row in `src/g_userinfo.c` + the `ezinfokey(self,
  "<key>")` / `iKey(self, "<key>")` read sites.
- **cmdline params:** `COM_CheckParm("-<entity>")` / `COM_CheckParm("+<entity>")`
  sites.

**Output:** source `file:line` inventory list + one brief site-purpose
label per site (e.g. "bot routing lookup at `maps/<stem>.bot`", "race
route lookup at `race/routes/<stem>.route`"). Step 1.5 takes this
inventory and unpacks the behavioral consequences.

### Step 1.5 -- Behavioral unpacking per consumer

For EACH read use-site listed in Step 1, ask: "what user-observable
behavior does this site create that isn't already covered in
`existing_description`?"

Not a mechanical label ("bot routing files", "race route files"). A
behavioral note ("variant stem propagates into the next map's startup
via `set_nextmap`, so a forcemap-set variant stays active across
end-of-match transitions without re-issuing forcemap").

If a use-site is in a non-handler engine function (e.g. `set_nextmap`,
`GetCustomEntityMapsForDirectory`, or anything in `maps.c` / `client.c`
that is NOT a `Cmd_AddCommand` handler), Read that function -- don't
stop at "this site uses the cvar"; unpack what the function does with
the value.

Specifically watch for:

- **Stickiness / transition propagation** -- does the cvar persist
  across map changes, nextmap chains, or `samelevel` loops?
- **Validation or rejection paths** -- does another user-facing command
  refuse based on this cvar's value or absence?
- **Pre-conditions** -- startup scans, file-existence checks, or
  registration paths that determine which values are usable.
- **Surprise-bearing defaults** -- implicit fallbacks the user wouldn't
  predict from the cvar name alone.

ANY behavior surfaced here that isn't already in `existing_description`
MUST appear in the v2 Effect / Prerequisites bullets in Step 5. This
step's job is converting Step 1's site inventory into Step 5 content;
skipping it leaves the recast at the existing description's depth.

### Step 2 -- Classify Layer B shape

Walk the shape catalog identification guide in `references/shape-catalog.md`.
Shapes are facets, not exclusive buckets -- an entity can have multiple shape
facets at once (Shape 7 + Shape 4 + Shape 1c composition is common).

**Output:** shape ID (or composition like "Shape 7a election + Shape 4 admin
gate"), OR the literal token `shape-less` with a one-line rationale (see
"Shape-less is a valid outcome" below), plus the reasoning trail.

**Shape-less is a valid outcome.** The Layer B catalog captures shapes of
*relationships* between entities (cvar+toggle, cvar+cycle, election-with-yes/
no, side-channel cvar, curated-family help-printer, etc.). Entities that
carry no inter-entity relationship are correctly classified `shape-less`.
Three common cases:

- **Pure standalone state-printer** -- e.g. `about`, `status1`, `fpslist`.
  No cvar pairing, no sibling family, no election/gate/side-channel role.
- **Command-side lever for a Shape X relationship** -- e.g. `forcemap` is
  the lever for the Shape 9a side-channel relationship that lives on
  `k_entityfile`. The shape tag lives on the cvar; the command is the knob.
  Cross-link in See-also; the command card itself is `shape-less`.
- **Leaf of a Shape X family** -- e.g. `qenemy` is one of the 3 members the
  Shape 10 `qizmo` help-printer enumerates. The shape tag lives on the
  family-head card; leaves are `shape-less`.

In all three cases: continue to Step 3 with `shape-less` as the Layer B
slot value. Park triggers 1 and 2 below apply ONLY when the entity HAS
inter-entity relationships but the catalog doesn't yet capture them.

**Park trigger 1 -- no-shape-match (relational).** The entity HAS inter-
entity relationships (paired cvar+command, election, gating cvar+gated
command, sibling family with shared behavior, etc.) but no cataloged shape
captures the pattern. Park to surface a candidate Shape N for operator
review. Do NOT confuse with shape-less standalone/lever/leaf entities --
those draft.

**Park trigger 2 -- conflicting-shape-match.** Multiple shapes match with
strong evidence in conflicting ways and the skill cannot adjudicate which is
primary. Park.

### Step 3 -- Spot-check existing description vs source

Parse `existing_description` into atomic claims (default value, side effects,
prerequisites, scope, OFF-state, permission, match-state). For each claim,
verify the Step-1 read use-sites support it.

**Park trigger 3 -- source-vs-description-contradiction.** The existing
description has a foundational contradiction with source the skill cannot
adjudicate -- the framing of the entity itself is wrong (e.g. an entity
described as a vote-toggle that source treats as a recipient-state setter),
not a single value mismatch. Park.

**Localized contradictions:** verdict `drafted_with_flag`. Recast proceeds;
flag in Notes for the apply-pass-author. Examples: wrong default value;
missing prerequisite; outdated permission string. The recast text reflects
source-truth; the flag tells the operator "review the change before applying."

**No contradictions:** continue to Step 4.

### Step 4 -- Sui-generis check (final park gate)

Even if a shape sort-of-fits, ask: is this entity's mechanism CLEARLY unusual?
The catalog's earn-their-keep discipline forbids creating new shapes on 1-of-1
evidence -- the skill cannot escalate; it parks.

**Park trigger 4 -- sui-generis-mechanism.** Unusual mechanism, doesn't
pattern-match anything in the catalog. The `callalias` case from session 3 is
the canonical example -- compile-time alias bound to a hardcoded function
table, no analog elsewhere in KTX.

If the entity passes: continue to Step 5.

### Step 5 -- Apply v2 universal shape

Fill the v2 template (Headliner / Effect / Prerequisites / Permission /
Match-state / Default / Example / See-also) from source-verified content.

Discipline rules (full detail in `references/universal-shape-v2.md`):

- **Action-level, not implementation-level.** What changes the user's action
  plan, not how the engine implements it.
- **Prerequisites must be user-actionable or surprise-bearing.**
  Logically-implied refusals (e.g. "you are not already an admin" on `elect`)
  are noise.
- **Subsequent-invocation toggle.** Some commands behave differently on a
  second invocation by the same caller (`elect` aborts your own pending
  election). Surface as a labeled Effect bullet.
- **No engine/code jargon.** Plain QW terms; no `cf_flags`, `stuffcmd`,
  `think handler`, file:line refs, or function-name prose in the description
  surface.
- **Example over prose.** Pedagogically-tuned examples make the mechanism
  self-evident; cut narrative when the example carries it. Cluster
  configuration calls in invocation order; punctuation placement (e.g. the
  comma in `postmsg`) reveals structure.
- **See-also at most 4-5.** Order by relationship strength: pair > prereq >
  sibling > exclusive > concept. If more than 5, the entity is begging for a
  concept note (don't inline-write the note; track it as a follow-up).
- **Canonical-card pattern** for N near-identical siblings (Shape 7 fan-out;
  ksound1-6 family; hook family). Centralize on one card; the other N-1 are
  short reference cards pointing at it.
- **No forward references to non-existent L3 concept notes.** Don't insert
  `[concept-name -- pending]` placeholders. Track planned notes elsewhere.

### Step 6 -- Emit record + write to per-batch file

Emit one structured record per entity, returned in-context (the dispatcher
persists it for the apply pass). In chunked mode, emit a list of records in
input order. Skill ALSO writes the per-card section to the appropriate
per-batch file (single mode only; in chunked mode under dispatcher control,
sub-agents return content via the override and do not write files):

- **Drafts file** (verdicts `drafted` / `drafted_with_flag`):
  `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-<batch_date>.md`
- **Park file** (verdict `parked`):
  `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-<batch_date>.md`

If the file does not exist yet for this batch_date, create it with a brief
header (`# ktx-l1-rewrite drafts -- batch <YYYY-MM-DD>`) before appending the
first card section. If it exists, append the new section at the end.

File path is relative to the quakeworld repo root:
`/home/paradoks/projects/quakeworld/`. Full file format detail in
`references/park-triggers.md`.

## Verdict enum

Exactly one per card:

- **drafted** -- clean recast, no contradictions, Layer B slot filled with
  either a shape ID/composition OR `shape-less` (with rationale). Goes to
  drafts file. The v2 universal shape (Layer A) applies fully in both cases
  -- shape-less only means no Layer B relationship to tag.
- **drafted_with_flag** -- recast done, localized factual contradiction with
  source flagged in Notes. Goes to drafts file. The apply-pass-author reviews
  the factual change before applying.
- **parked** -- one of 4 park triggers fired. Goes to park file. Apply
  blocked; operator decides manual investigation path.

## Reporting line

Final line of every invocation (one per entity in chunked mode, in input order):

```
ktx:<entity>: <VERDICT> -- <shape or trigger> -- <one-line rationale> -- anchor=<version>
```

Examples:

- `ktx:k_fallbunny: drafted -- Shape 1 cvar+toggle -- recast under v2 with paired-toggle cross-link -- anchor=1.47-dev-abc123`
- `ktx:mmode: drafted_with_flag -- Shape 6 stateful+one-shot -- recast under v2; flagged existing "multi editor" framing -- source treats this as recipient-state setter, not edit mode -- anchor=1.47-dev-abc123`
- `ktx:callalias: parked -- trigger 4 sui-generis -- compile-time alias bound to hardcoded function table, no shape match -- anchor=1.47-dev-abc123`

Do not commit. The dispatcher handles staging and commit.

## Sub-agent fan-out

The dispatcher (the catalog-wide template-application arc -- separate future
build) batches cards by category, pre-fetches input fields from L1 + the
catalog HTML, dispatches one sub-agent per card running this skill at the
locked dial. Skill returns the structured record + writes to the per-batch
files. Apply-pass-author reads the drafts file in a separate apply phase
(post-dispatcher).

## Verification discipline

Before naming any `source_file`, `source_line`, or behavior claim: verify it
against live KTX source (grep / Read the C file). The Step-3 spot-check is the
inner enforcement loop; the Step-1 read use-sites are the ground truth. Mark
every claim the skill cannot verify explicitly in Notes; never let "likely" /
"probably" slip into prose that otherwise reads as fact.

For the recast text itself, every Effect / Prerequisites / Match-state /
Default clause must trace to a read use-site or the entity's registration row.
A clause derivable only from the entity name or the existing description text
(with no enforcing source citation) is FORBIDDEN -- park or flag, never assert.

## Common pitfalls

Each is a restatement of a named rule above:

- **Force-fitting a shape on 1-of-1 evidence** -- earn-their-keep discipline:
  park, don't guess (Step 4, trigger 4).
- **Treating the existing description as ground truth** -- source is
  authoritative (Step 3; foundational contradiction -> park, localized ->
  flag).
- **Promoting implementation detail into L1** -- action-level rule (Step 5;
  see `references/universal-shape-v2.md`).
- **Inserting forward references to L3 concept notes that don't exist** --
  See-also discipline (`references/universal-shape-v2.md`).
- **Duplicating value enums across cvar + command sides** -- value enum lives
  on the cvar card, never the command card, for Shape 1/1c/1d/2 pairs (see
  `references/shape-catalog.md`).
- **Synthesizing from cold** -- thin / empty descriptions abort to
  `describe-fill-synthesis` at the pre-flight gate, not this skill.
- **Skipping the spot-check** -- the `mmode` editor-framing error class of
  bug is exactly what Step 3 catches. Don't trust the existing description's
  framing without source verification.
- **Mechanical site labels instead of behavioral unpacking** -- "race
  route files" or "bot routing files" are inventory labels (Step 1
  output); "variant stem propagates into nextmap via `set_nextmap` so
  a forcemap-set variant carries over end-of-match" is behavioral
  unpacking (Step 1.5 output). Site labels miss user-surprise prereqs
  and stickiness behaviors; the v2 Effect / Prerequisites under-deliver.
  Step 1.5 is the unpacking pass; don't skip it.
- **Force-parking standalone / lever / leaf entities** -- pure state-
  printers (e.g. `about`, `status1`), command-side levers for Shape X cvars
  (e.g. `forcemap` for `k_entityfile`), and leaves of Shape X families
  (e.g. `qenemy` under the Shape 10 `qizmo` head) are `shape-less` by
  design -- the Layer B catalog is relational, and these entities have
  no own inter-entity relationship to tag. Park trigger 1 applies ONLY to
  entities WITH relationships that don't match any cataloged shape. Use
  the literal token `shape-less` in the Layer B slot + a one-line
  rationale; do not invent variants ("no Layer B tag", "no shape", "v2
  universal only", etc.).

## Escape hatches

- **Shape composition unclear.** If multiple shapes match but the skill is
  unsure of the primary, list all in the reasoning trail and park (trigger 2).
  The operator extends the catalog if a sibling surfaces.
- **Source contradicts existing description on a foundational point** (entity
  framing wrong, not a localized value). Park (trigger 3). Different from a
  localized factual fix; the latter is `drafted_with_flag`.
- **Entity is not source-legible** (registration site found, no usable read
  use-sites). Treat as a thin description and abort to
  `describe-fill-synthesis` (the synthesis skill's hedge/residue track is
  better suited).
- **Invoked without `entity_name`, `existing_description`, or
  `anchor_version`** -- do not guess. Abort. The dispatcher should pre-fetch
  all inputs; an invocation missing inputs is a dispatcher bug.

## When unsure, park

If the invocation is ambiguous in any of the 4 trigger conditions, park. The
cost of parking is one entry in the per-batch park file; the cost of a
force-fitted L1 description is a shipped lie. This skill's purpose includes
refusing to guess -- when in doubt, park.
