# ktx-l1-rewrite skill design

**Status:** Designed 2026-05-23. **Amended 2026-05-23** (Step 1.5 + shape-less verdict; battle-test validated). **SHIPPED at scale 2026-05-24**: Server config & network category, 57/57 cards drafted (37 drafted + 20 drafted_with_flag + 1 parked callalias); ~35% flag rate caught real factual errors in upstream synthesis output. **Amended 2026-05-26** (Shape 11 crystallized -- per-bit XOR toggle on shared bitmask state container, 11a cvar-backed / 11b serverinfo-backed; surfaced when the Spectator chat & visibility batch parked the k_spec_info family and verification found fpd/qizmo as a structural sibling).

**One-liner:** Per-card sub-agent fan-out skill that takes one KTX L1 entity's existing description + source ref + anchor version, classifies it under the Layer B shape catalog (14+ KTX shapes), recasts under the v2 universal shape (Layer A), and emits a structured record. Sibling to `describe-fill-synthesis`; cheaper job (recast + light verification, not full synthesis), Sonnet 4.6 high locked.

## Motivation

The KTX L1 catalog has ~13,000+ entities. Templates locked across catalog-walk sessions 1–3 (2026-05-22 → 2026-05-23):

- **Layer A** — v2 universal shape (Headliner / Effect / Prerequisites / Permission / Match-state / Default / Example / See-also). See [[feedback-l1-description-template]].
- **Layer B** — KTX-specific shape catalog at 15+ shapes (1 / 1c / 1d / 2 / 3 / 4 / 4b / 5 / 6 / 7-7a-7b / 8 / 9-9a-9b / 10 / 11-11a-11b) + canonical-card pattern + command-per-value fan-out modifier + tooling-mode prerequisite. See [[reference-ktx-cvar-command-pairing]].
- **Earn-their-keep discipline** — don't lock new shapes on 1-of-1 evidence; flag as candidate, gather siblings, then promote.

48 cards walked + drafted by hand across the three sessions, with one ground-truth card per shape now available as a few-shot reference. Fanning out across the remaining ~13,000 entities mechanically requires a skill. This is that skill.

Sibling skill `describe-fill-synthesis` already handles the "cold synthesis" case (no/raw-comment description, full source dive at Opus MAX). This skill handles the recast case: descriptions exist but are pre-v2-template or carry factual drift; the job is form-application + spot-check, not re-derivation.

## Inputs (per invocation — dispatcher pre-fetches all)

| Field | Source |
|---|---|
| `entity_name` | Exact L1 entity (e.g. `k_fallbunny`, `fallbunny`) |
| `entity_type` | `cvar` \| `command` \| `cmdline_param` \| `info_key` |
| `category` | KTX category (e.g. `gameplay`, `Administration & Access`) |
| `existing_description` | Current L1 text being recast |
| `source_ref` | Current `source_file:source_line` from L1 |
| `anchor_version` | KTX dev-head commit the recast is anchored against |
| `catalog_line` | Line in the rendered HTML catalog (for cross-link) |

## Pre-flight gate (abort if any fail)

1. `entity_name` resolves to a live Layer 1 KTX entity (no entity creation; consumes L1, never extends).
2. `existing_description` is non-trivial — ≥100 chars OR contains both a Set-by clause and a behavior clause. Pure boilerplate → abort with reason `needs-synthesis`; that card routes to `describe-fill-synthesis` separately.
3. `anchor_version` present (no anchor → cannot stamp the recast against a commit).
4. All 6 `references/` files load.

If any fail: produce no record, emit abort line, halt.

## Workflow (all in the locked Sonnet 4.6-high context)

### Step 1 — Read registration + key read use-sites
Grep KTX source for the entity registration site + 1–2 key read sites (`<entity>.value`, `<entity>.string`, `Cmd_AddCommand(...)`, gating branches). Output: `source_file:source_line` list + one brief site-purpose label per site (e.g. "bot routing lookup at `maps/<stem>.bot`"). Step 1.5 unpacks these labels into behavioral consequences.

### Step 1.5 — Behavioral unpacking per consumer (amendment 2026-05-23)

For each read use-site listed in Step 1, ask: "what user-observable behavior does this site create that isn't already covered in `existing_description`?"

Not a mechanical site label ("bot routing files") — a behavioral note ("variant stem propagates into the next map's startup via `set_nextmap`, so a forcemap-set variant stays active across end-of-match transitions without re-issuing forcemap").

If a use-site is in a non-handler engine function (e.g. `set_nextmap`, `GetCustomEntityMapsForDirectory`, or anything in `maps.c` / `client.c` that is NOT a `Cmd_AddCommand` handler), Read that function — don't stop at "this site uses the cvar"; unpack what the function does with the value.

Specifically watch for:
- **Stickiness / transition propagation** — does the cvar persist across map changes, nextmap chains, or `samelevel` loops?
- **Validation or rejection paths** — does another user-facing command refuse based on this cvar's value or absence?
- **Pre-conditions** — startup scans, file-existence checks, or registration paths that determine which values are usable.
- **Surprise-bearing defaults** — implicit fallbacks the user wouldn't predict from the cvar name alone.

ANY behavior surfaced here that isn't already in `existing_description` MUST appear in the v2 Effect / Prerequisites bullets in Step 5. This step's job is converting Step 1's site inventory into Step 5 content; skipping it leaves the recast at the existing description's depth.

(Added after battle-test validated that mechanical site labels from Step 1 were leaving surprise-bearing behaviors unsurfaced. Closed the depth gap on ~30%+ of cards across the Server-config-fanout pass.)

### Step 2 — Classify Layer B shape
Match against `references/shape-catalog.md`. Output: shape ID (e.g. "Shape 1c paired toggle with mode-precondition"), OR the literal token `shape-less` with a one-line rationale (see below), plus reasoning trail.

**Shape-less is a valid Layer B outcome** (amendment 2026-05-23). The catalog captures shapes of *relationships* between entities. Entities that carry no inter-entity relationship are correctly classified `shape-less`. Three common cases:
- **Pure standalone state-printer** — e.g. `about`, `status1`, `fpslist`. No cvar pairing, no sibling family, no election/gate/side-channel role.
- **Command-side lever for a Shape X relationship** — e.g. `forcemap` is the lever for the Shape 9a side-channel relationship that lives on `k_entityfile`. The shape tag lives on the cvar; the command is the knob. Cross-link in See-also; the command card itself is `shape-less`.
- **Leaf of a Shape X family** — e.g. `qenemy` is one of the 3 members the Shape 10 `qizmo` help-printer enumerates. The shape tag lives on the family-head card; leaves are `shape-less`.

In all three cases: continue to Step 3 with `shape-less` as the Layer B slot value. Park triggers 1 and 2 below apply ONLY when the entity HAS inter-entity relationships but the catalog doesn't yet capture them.

**Park trigger 1 — no-shape-match (relational):** the entity HAS inter-entity relationships (paired cvar+command, election, gating cvar+gated command, sibling family with shared behavior, etc.) but no cataloged shape captures the pattern. Park to surface a candidate Shape N for operator review. Do NOT confuse with shape-less standalone/lever/leaf entities — those draft.
**Park trigger 2 — conflicting-shape-match:** multiple shapes match with strong evidence in conflicting ways; the skill cannot adjudicate which is primary.

### Step 3 — Spot-check existing description vs source
Parse `existing_description` into atomic claims (default value, side effects, prerequisites, scope, OFF-state). For each claim, verify the read use-sites support it.

**Park trigger 3 — source-vs-description-contradiction:** the existing description carries a foundational contradiction the skill cannot adjudicate (e.g. the framing of the entity itself is wrong, not a single value).
**Localized contradiction → `drafted_with_flag`** (recast proceeds; flag in Notes for the apply-pass-author).
**No contradiction → continue.**

### Step 4 — Sui-generis check (final park gate)
Even if a shape sort-of-fits, if the mechanism is clearly unusual (the `callalias` case from session 3), park rather than force-fit. The catalog's earn-their-keep discipline forbids creating new shapes on 1-of-1 evidence — the skill cannot escalate; it parks.

**Park trigger 4 — sui-generis-mechanism:** unusual mechanism, doesn't pattern-match anything in the catalog.

### Step 5 — Apply v2 universal shape
Fill the v2 template (Headliner / Effect / Prerequisites / Permission / Match-state / Default / Example / See-also) from source-verified content. Action-level not implementation-level. Prerequisites must be user-actionable or surprise-bearing.

### Step 6 — Emit record + write to per-batch file
Structured record returned in-context for the dispatcher. Skill writes the per-card section to:
- **Drafts file** (verdicts `drafted` / `drafted_with_flag`): `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-YYYY-MM-DD.md`
- **Park file** (verdict `parked`): `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-YYYY-MM-DD.md`

Per-batch files (the dispatcher passes `YYYY-MM-DD` to all sub-agents in a batch so they append to the same pair).

## Verdict enum

- `drafted` — clean recast, no contradictions. Layer B slot filled with either a shape ID/composition OR `shape-less` (with rationale per Step 2 amendment). Goes to drafts file. The v2 universal shape (Layer A) applies fully in both cases — `shape-less` only means no Layer B relationship to tag.
- `drafted_with_flag` — recast done, localized factual contradiction with source flagged in Notes. Apply-pass-author reviews the factual change before applying.
- `parked` — one of 4 park triggers fired. Goes to park file. Apply blocked; operator decides manual investigation path.

## Output formats

### Drafts file entry (mirrors findings-file shape)

```
## entity_name (KTX <type>, <category> -- <shape>)
- **Status**: drafted | drafted_with_flag
- **Source**: <file:line>
- **Catalog line**: <line>
- **Anchor**: <version>
### Current description
> <existing>
### Shape classification
<shape ID or `shape-less`> + reasoning trail
### Proposed draft
\`\`\`
<v2 text>
\`\`\`
### Notes
- <bullets; factual contradiction flags called out explicitly>
```

### Park file entry

```
## entity_name (KTX <type>, <category>)
- **Source**: <file:line>
- **Anchor**: <version>
- **Park trigger**: <1 of 4 trigger names>
### What the skill saw
- <observation bullets>
### Suggested manual investigation
- <next-step bullets>
```

### Reporting line (final line of every invocation)

```
ktx:<entity>: <VERDICT> -- <shape or trigger> -- <one-line rationale> -- anchor=<version>
```

Example: `ktx:k_fallbunny: drafted -- Shape 1 cvar+toggle -- recast under v2 with paired-toggle cross-link -- anchor=1.47-dev-abc123`

## Reference files (6, loaded at pre-flight)

The references/ directory is self-contained so sub-agents work without auto-loaded memory (auto-load is a parent-terminal feature; sub-agents start cold).

| File | Content | Mirrors memory key |
|---|---|---|
| `references/shape-catalog.md` | Layer B 14+ shapes + identification guide + canonical-card pattern + command-per-value fan-out + tooling-mode prereq | [[reference-ktx-cvar-command-pairing]] |
| `references/universal-shape-v2.md` | Layer A v2 universal shape (Headliner/Effect/Prereqs/Permission/Match-state/Default/Example/See-also); action-level not impl-level; user-actionable prereqs; subsequent-invocation toggle | [[feedback-l1-description-template]] |
| `references/layer-architecture.md` | Two-layer model (Layer A universal + Layer B per-codebase); L1 vs L3 division; L1-as-graph-node; replicable across mod codebases | [[feedback-mod-l1-documentation-architecture]] |
| `references/entity-categories.md` | Three-bucket model (`k_*` cvars / userinfo keys / commands); `k_sdir` false-positive trap | [[reference-ktx-entity-categories]] |
| `references/worked-examples.md` | One ground-truth card per shape from the findings file (shapes 1 / 1c / 1d / 2 / 3 / 4 / 4b / 6 / 7a / 7b / 8 / 9a / 9b / 10 + sui-generis `callalias` + mixed-family `k_spm_*`) | drawn from `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog-findings.md` |
| `references/park-triggers.md` | 4 trigger types with disambiguation guidance; park-file entry format; distinction between park (shape gap) vs flag (factual fix queue) | distilled from spec |

## Model dial

**Sonnet 4.6 high, locked.** Spec-locked like `describe-fill-synthesis`'s Opus MAX — calibrated to job cost, not selectable per invocation. The job is pattern-classify + template-fill + spot-check; Sonnet high fits. Opus MAX would lock out the cost differential that's the point of having this skill separate from `describe-fill-synthesis`. Dispatcher-level escalation (probe → triage → re-run parked pile at Opus) is the operator-level pattern; the skill's per-card dial stays locked at Sonnet high.

## Sub-agent fan-out

Dispatcher (the catalog-wide template-application arc — separate future build) batches cards by category, pre-fetches input fields from L1, dispatches one sub-agent per card running this skill at the locked dial. Skill returns record + writes to per-batch files. Apply-pass-author reads drafts file in a separate apply phase (post-dispatcher).

The skill itself does not orchestrate; it processes one card per invocation. Same fan-out shape as `describe-fill-synthesis`.

## Battle-test gate (before any fan-out)

Run skill against the 3 ground-truth cards from session 3:

- `k_entityfile` — expected: `drafted`, Shape 9a side-channel cvar
- `qizmo` — expected: `drafted`, Shape 10 curated-family help-printer
- `callalias` — expected: `parked`, trigger 4 (sui-generis-mechanism)

Pass criteria:
1. Verdicts match expectations on all 3.
2. Recast text for `k_entityfile` + `qizmo` approximates the human drafts in the findings file (semantic alignment, not byte-identical).
3. `callalias` park entry surfaces the same reasoning the human walk surfaced.
4. The rest of the Server config & network category (~30 cards) processes cleanly — most should `draft`, some may `park`, the parked pile should make sense.

If pass → fan out across remaining catalog categories. If fail → diagnose, adjust shape-catalog / spot-check workflow / pre-flight gate, re-test.

## Engine-genericity

This skill is KTX-locked. Skill name: `ktx-l1-rewrite`.

Future siblings: `mvdsv-l1-rewrite`, `qwfwd-l1-rewrite`, `qtv-l1-rewrite` — forked per codebase with codebase-specific shape catalogs in `references/shape-catalog.md`. Layer A (v2 universal shape) stays engine-agnostic across forks; Layer B catalog is codebase-specific. Forking (vs parameterizing) keeps each skill's references/ tight and avoids conditional logic.

## Build sequence

1. **Templates locked** — DONE sessions 1–3 (2026-05-22 → 2026-05-23).
2. **Design spec** — this document (DONE 2026-05-23).
3. **Scaffold skill via `skill-creator`** — produce SKILL.md + 6 references/ files at `~/.claude/skills/ktx-l1-rewrite/`.
4. **Battle-test** — Server config & network category against the 3 ground-truth cards.
5. **Fan-out** — dispatch across remaining KTX catalog (the catalog-wide template-application arc; separate future build).

## What this skill explicitly does NOT do

- **Touch L1 DB** — never writes to `entities.description`. Drafts stay parked until the operator runs an apply pass (separate phase).
- **Create entities** — pre-flight aborts if `entity_name` is not a live L1 entity.
- **Propose new shapes** — earn-their-keep discipline is human-judgment work. The skill parks 1-of-1s; the operator extends the catalog when sibling patterns surface.
- **Synthesize from cold** — descriptions with no/raw-comment content route to `describe-fill-synthesis` via the `needs-synthesis` pre-flight abort.
- **Adjudicate foundational source-vs-description contradictions** — those park (trigger 3); localized contradictions get flagged on a `drafted_with_flag` verdict.
- **Apply drafts** — drafts go to a per-batch drafts file; the apply pass is the operator's call, separately.

## Open questions deferred to post-build

- Dispatcher design for the catalog-wide template-application arc — separate brainstorm + arc plan.
- Apply-pass design (reading drafts file → writing to `entities.description`) — separate skill or runbook, TBD.
- Cross-codebase fork timing — wait for KTX catalog to fully ship before forking to MVDSV/QWFWD/QTV.
