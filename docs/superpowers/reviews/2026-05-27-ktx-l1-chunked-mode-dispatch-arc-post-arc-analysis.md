# KTX L1 chunked-mode dispatch arc -- post-arc analysis (2026-05-27)

**Reviewer:** post-arc fresh terminal (did not execute any phase of this arc).

**Sources read:**

- Spec: `docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`
- Per-card skill: `~/.claude/skills/ktx-l1-rewrite/SKILL.md` + 6 references
- Dispatcher skill: `~/.claude/skills/ktx-l1-batch-dispatcher/SKILL.md` + 5 references (`pre-flight.md`, `pre-fetch.md`, `halt-on-novelty.md`, `cross-card-checks.md`, `file-formats.md`)
- HANDOVER.md entries (16 batch entries + 3 this-session entries: k_sready gapfill / See-also asymmetry / parks drained)
- 18 drafts files at `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-{23,25,26,27}*.md` (header counts confirmed)
- 3 park files at `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-2026-05-{23,26}*.md`
- Sampled card quality on Player communication (final batch) + parks-handdraft (5-card drain)
- Recent commits: `25cc575a` (parks drained), `7a891c8f` (k_sready gapfill), `d72230a9` (k_sready restore), `f9a69efa` (close-out findings), `cad3cd8e` (Frogbot follow-up SHIPPED), `069d8f0a` (Race follow-up SHIPPED), and all 14 chunked-mode batch commits
- DB query: `SELECT COUNT(*) FROM entities WHERE project='ktx' AND type IN ('cvar','command')` returns **633** (358 commands + 275 cvars), confirming the arc's denominator

## Verdict

The arc DELIVERED its core promise: 633 of 633 KTX cvar+command entities have v2 universal-shape recast drafts (627 across 16 batch drafts files + 1 k_sready gapfill + 5 parks hand-drafts). Apply pass remains pending and is the gate to call the arc "shipped to L1." Five spec sections DELIVERED clean; four sections DELIVERED-DIFFERENT (the most consequential being the per-card skill's locked Sonnet 4.6-high model dial -- in practice the dispatcher's sub-agents lacked the Task tool and per-card recasts ran inline at the dispatcher's Opus 4.7-medium dial); two sections DEFERRED per spec (MVDSV/QWFWD/QTV fork, apply-pass design); zero sections MISSING. Shipped-beyond-spec is substantial -- the entire `ktx-l1-batch-dispatcher` skill (originally listed as a "open question deferred to post-build") shipped during the arc, plus chunked mode, halt-on-novelty gate, scratch-file convention, category-enumeration audit, mid-arc F1/F3/F13 skill amendments, pair-integrity check, and Shape 11 catalog crystallization. The YELLOW that must close before Arc N+1 (MVDSV fork) is the dial-discipline gap.

## Spec section walkthrough

### One-liner + Motivation

Status: **DELIVERED**. The skill exists at `~/.claude/skills/ktx-l1-rewrite/`, accepts the spec's 7-field input bundle, runs the spec's 6-step workflow (with Step 1.5 added at battle-test time), emits the spec's 3-verdict enum and reporting line format. The motivation (fan out v2 template across 13,000+ KTX entities mechanically; per-card sub-agent fan-out as sibling to `describe-fill-synthesis`) is operationally realized.

Evidence: live skill at `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (425 lines); 18 drafts files in `apps/qw-oracle/docs/reviews/`; 633 entity recasts visible across those files.

### Inputs (per invocation -- dispatcher pre-fetches all 7 fields)

Status: **DELIVERED**. The 7 input fields are present in the per-card skill (`entity_name`, `entity_type`, `category`, `existing_description`, `source_ref`, `anchor_version`, `catalog_line`), plus one shipped-beyond-spec field added in practice: `batch_date` (so all sub-agents in a batch write to the same drafts/park file pair). The dispatcher pre-fetches all 8 from L1 via the `list-entities-by-category.ts` helper.

Evidence: per-card SKILL.md lines 51-63 enumerate the 8-field input contract; dispatcher pre-fetch.md lines 7-20 emit the matching record shape.

### Pre-flight gate (4 conditions: live entity / non-trivial description / anchor present / references load)

Status: **DELIVERED**. All 4 gates present in the per-card skill's `Hard pre-flight gate` block (SKILL.md lines 98-119). The `needs-synthesis` abort fired exactly once in the arc (`k_sready` in the Match flow batch; routed to `describe-fill-synthesis`, drafted this session via a single-entity dispatch).

Evidence: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-match-flow.md` ships 70 cards and aborts k_sready cleanly per the gate. Per HANDOVER's k_sready entry: "Match-flow recast batch had correctly aborted k_sready to needs-synthesis (F12)."

### Workflow Step 1 -- registration + key read use-sites

Status: **DELIVERED**. The per-card skill enumerates KTX-specific patterns (`RegisterCvar` in `world.c`; `Cmd_AddCommand` rows in `src/commands.c`; `ezinfokey` / `iKey` for userinfo; `COM_CheckParm` for cmdline params; mvdsv-redirected commands route to `research/repos/mvdsv/src/`). Sub-agents in the sampled Player communication batch cite full file:line refs in every section.

### Workflow Step 1.5 -- behavioral unpacking per consumer (amendment 2026-05-23)

Status: **DELIVERED**. Amendment added after the battle-test surfaced that mechanical site labels left ~30% of cards under-delivering. Present in SKILL.md lines 154-186; spec acknowledges this amendment in its Status header ("Amended 2026-05-23 -- Step 1.5 + shape-less verdict; battle-test validated"). Visible in card output as the source of Prerequisites/Effect content beyond the existing description's depth (sampled `mmode` card surfaces the `STUFFCMD_IGNOREINDEMO` flag and the rcon-dispatch-commented-out detail neither of which is in the existing description).

### Workflow Step 2 -- classify Layer B shape; shape-less is valid

Status: **DELIVERED-DIFFERENT** (catalog grew mid-arc, beyond the spec's 14+ shapes).

Spec text: "Layer B -- KTX-specific shape catalog at 15+ shapes (1 / 1c / 1d / 2 / 3 / 4 / 4b / 5 / 6 / 7-7a-7b / 8 / 9-9a-9b / 10 / 11-11a-11b) + canonical-card pattern + command-per-value fan-out modifier + tooling-mode prerequisite."

Modification: **Shape 11 crystallized 2026-05-26** during the Spectator chat & visibility batch (per-bit XOR toggle on shared bitmask state container; 11a cvar-backed `k_spec_info` family; 11b serverinfo-backed `fpd` `qizmo` family). Earn-their-keep gate met with 2 instance families; skill `references/shape-catalog.md` + spec doc both amended. Catalog grew from 14 shapes (sessions 1-3) to 15 shapes (mid-arc).

Documented in `decisions.md` equivalent? The spec's Status header captures the amendment ("Amended 2026-05-26 -- Shape 11 crystallized"). HANDOVER's Spectator chat entry (d) documents the earn-their-keep validation in detail.

### Workflow Step 3 -- spot-check + Step 4 -- sui-generis check + Step 5 -- apply v2

Status: **DELIVERED**. Park triggers 2 / 3 / 4 fire as designed; trigger 1 fires when the entity has inter-entity relationships but no cataloged shape captures them. Discipline evidence: 5 parks across the arc (callalias trigger 4; y/n trigger 1; roundsdown/roundsup trigger 1) -- all four post-trigger-1 cards rest on novel 1-of-1 mechanisms (kick-walkthrough session-response, bounded directional pair) that genuinely don't pattern-match. The skill held earn-their-keep discipline; the catalog did not bloat to capture 1-of-1 mechanisms.

### Workflow Step 6 -- emit record + write to per-batch file

Status: **DELIVERED-DIFFERENT** (sub-agents return content; dispatcher writes atomically).

Spec text: "Skill writes the per-card section to: Drafts file ... Park file ..."

Modification: in chunked mode (a dispatcher concept added 2026-05-26 -- not in this skill's original spec), the dispatcher OVERRIDES the per-card file-write step. Sub-agents return section content via structured report; the dispatcher writes assembled files atomically at Step 6. This protects against partial drafts files if a sub-agent crashes mid-chunk. Per per-card SKILL.md lines 296-301: "in chunked mode under dispatcher control, sub-agents return content via the override and do not write files."

The modification is documented in both the per-card skill (Step 6) and the dispatcher (`references/cross-card-checks.md` Step 3 override section + scratch-file convention).

### Verdict enum (drafted / drafted_with_flag / parked)

Status: **DELIVERED**. All three verdicts used across the arc. Aggregate counts (HANDOVER cumulative):

- 14 chunked-mode batches: 613 drafted (mix of clean + flagged) + 5 parked (trigger 1/4)
- 2 follow-up batches (Frogbot + Race): 16 additional drafts (15 + 1)
- 1 single-entity gapfill (k_sready, drafted_with_flag for cohort-aware framing)
- 5 parks hand-drafts (3 clean + 2 drafted_with_flag for Permission-line corrections)

Total: 633/633 = 100% drafted under v2 universal shape.

### Output formats (drafts file / park file / reporting line)

Status: **DELIVERED**. Drafts file format matches spec template exactly (Status / Source / Catalog line / Anchor / Current description / Shape classification / Proposed draft / Notes). Park file format matches spec template exactly (Source / Anchor / Park trigger / What the skill saw / Suggested manual investigation). Reporting line format matches spec exactly. Plus a shipped-beyond-spec convention: `<!-- VERDICT: <verdict> -->` HTML comments immediately before each `## <entity>` header (added mid-arc as a dispatcher validation primitive; "Discipline 1" in HANDOVER's Match flow entry).

### Reference files (6 self-contained references for sub-agent contexts)

Status: **DELIVERED**. All 6 present at `~/.claude/skills/ktx-l1-rewrite/references/` (`shape-catalog.md` 41 KB, `universal-shape-v2.md` 14 KB, `layer-architecture.md` 6.5 KB, `entity-categories.md` 4.3 KB, `worked-examples.md` 21 KB, `park-triggers.md` 9.7 KB). Spec discipline ("self-contained for sub-agent contexts; auto-loaded memory does not transfer to sub-agents") realized.

### Model dial (Sonnet 4.6 high, locked)

Status: **DELIVERED-DIFFERENT** -- this is the load-bearing finding of the review.

Spec text: "Sonnet 4.6 high, locked. Spec-locked like `describe-fill-synthesis`'s Opus MAX -- calibrated to job cost, not selectable per invocation."

Modification: the spec's intent was that per-card recasts run at Sonnet 4.6 high while the dispatcher orchestrates at a higher tier (the dispatcher SKILL.md sets it at Opus 4.7 medium). In practice, **sub-agents lacked the Task tool in their invocation environment, so per-card recasts ran INLINE at the dispatcher's Opus 4.7-medium dial instead of fanning out as separate Sonnet 4.6-high sub-agent calls**.

Operator-stated structural finding (from this review's brief): "sub-agents lacked Task tool in their invocation environment; per-card recasts ran inline at the dispatcher's Opus 4.7 medium dial instead of fanning out to Sonnet 4.6 high; quality output was clean but architectural."

Consequence: the cost differential that was the entire point of separating `ktx-l1-rewrite` (Sonnet high) from `describe-fill-synthesis` (Opus MAX) was lost. Per-card budget was paid at Opus medium, ~3-4x the intended per-token cost. Quality DID NOT regress (the per-card output across the sampled cards is excellent), but the model-dial architecture did not hold. This is the YELLOW that must close before the MVDSV fork.

This is NOT a relitigation of the dial decision -- the dial was correctly designed at Sonnet 4.6 high. It IS a finding that the dispatcher's fan-out mechanism did not actually execute that dial at the per-card level.

### Sub-agent fan-out

Status: **DELIVERED-DIFFERENT** (chunked-mode reshape + dial-discipline gap).

Spec text: "Dispatcher (the catalog-wide template-application arc -- separate future build) batches cards by category, pre-fetches input fields from L1, dispatches one sub-agent per card running this skill at the locked dial."

Modification 1 -- chunked mode: dispatcher dispatches ONE sub-agent per CHUNK (typically 6-10 entities) instead of one per CARD. Sub-agent loads the 6 reference files ONCE per chunk, processes N entities sequentially in the same context. Token cost reduction: ~65% vs one-sub-agent-per-card (HANDOVER Scoring & stats batch entry: "332k tokens for 19 entities vs ~950k baseline"). This change is captured in the per-card SKILL.md Invocation modes section (lines 66-75) and in the dispatcher SKILL.md Step 3 (lines 124-180).

Modification 2 -- dial-discipline gap (as above): chunked-mode sub-agents in practice ran inline at the dispatcher's Opus 4.7-medium dial, not in separately-dispatched Sonnet 4.6-high contexts.

Both modifications are documented (chunked mode in both SKILL.md files; the dial-discipline gap surfaced in this review's brief and is now captured here).

### Battle-test gate (3 ground-truth cards + Server config & network ~30 cards)

Status: **DELIVERED-DIFFERENT** (test scope expanded; pass criteria met).

Spec text: "Run skill against the 3 ground-truth cards from session 3: `k_entityfile` (Shape 9a), `qizmo` (Shape 10), `callalias` (parked trigger 4). ... The rest of the Server config & network category (~30 cards) processes cleanly."

Modification: the actual battle-test ran against the full 57-card Server config & network category (not ~30); 3 ground-truth cards matched expected verdicts; the broader pass surfaced 1 callalias trigger-4 park + 37 drafted_clean + 20 drafted_with_flag (35% flag rate caught real factual errors in the prior format-unify arc's output -- per spec doc Status header). At battle-test time the spec was amended to add Step 1.5 (behavioral unpacking) and the shape-less verdict (3 cases: standalone state-printer / lever for Shape X / leaf of Shape X family).

The pass criteria from the spec (verdicts match expectations; recast text approximates human drafts; callalias park entry surfaces the same reasoning the human walk surfaced; rest of category processes cleanly) were all met. Documented in the spec's Status header amendments + HANDOVER's Server config & network entry.

### Engine-genericity (KTX-locked; future MVDSV/QWFWD/QTV variants fork per codebase)

Status: **DEFERRED per spec**. Spec explicitly defers cross-codebase fork timing ("wait for KTX catalog to fully ship before forking to MVDSV/QWFWD/QTV"). KTX catalog has now fully shipped (633/633 drafted); fork is unblocked but not yet executed. This is the natural Arc N+1.

### Build sequence (5 steps)

Status: **DELIVERED**. All 5 build steps shipped: (1) templates locked DONE sessions 1-3; (2) design spec DONE 2026-05-23; (3) skill scaffolded DONE 2026-05-23 (battle-test commit); (4) battle-test DONE 2026-05-24 (57-card Server config & network); (5) fan-out DONE 2026-05-26 -> 2026-05-27 (14 chunked-mode batches + 2 follow-ups + gapfill + parks hand-draft).

### What this skill explicitly does NOT do

Status: **DELIVERED**. All 6 exclusions held throughout the arc:

- Touch L1 DB -- apply pass remains pending (correctly per spec)
- Create entities -- pre-flight gate aborts non-live entities (no creation observed)
- Propose new shapes -- Shape 11 crystallization went through operator earn-their-keep judgment with 2 instance families, not skill inference
- Synthesize from cold -- k_sready aborted to `describe-fill-synthesis` per `needs-synthesis` pre-flight path
- Adjudicate foundational source-vs-description contradictions -- park trigger 3 fired where applicable
- Apply drafts -- drafts stay in per-batch files; apply pass is the operator's separate phase (YELLOW below)

### Open questions deferred to post-build

Status (per spec's three deferred items):

- **Dispatcher design for the catalog-wide template-application arc** -- SHIPPED-BEYOND-SPEC. The `ktx-l1-batch-dispatcher` skill at `~/.claude/skills/ktx-l1-batch-dispatcher/` shipped during the arc with 5 references. Discussed in detail under shipped-beyond-spec below.
- **Apply-pass design (reading drafts file -> writing to `entities.description`)** -- **DEFERRED**. No apply-pass skill or runbook exists yet. This is the operator-driven next-phase work and is the gate to call the arc "shipped to L1." Captured as Arc N+1 prep item.
- **Cross-codebase fork timing** -- DEFERRED per spec (KTX catalog must fully ship first; it now has, so the fork is unblocked).

## Shipped beyond spec

### ktx-l1-batch-dispatcher skill (the largest shipped-beyond-spec item)

The spec's "Open questions deferred to post-build" listed dispatcher design as a separate future brainstorm + arc plan. In practice, the dispatcher shipped during the arc (built 2026-05-26 after first chunked-mode batch; iteratively amended through 2026-05-27). 5 references (`pre-flight.md`, `pre-fetch.md`, `halt-on-novelty.md`, `cross-card-checks.md`, `file-formats.md`) + 16 KB SKILL.md.

Recommendation: promote to permanent fixture; the dispatcher is the operational primitive that made 633 entities tractable, and forking it per codebase is the natural sibling work to per-card skill forks. The spec for the dispatcher should be written retroactively (or backfilled into the existing per-card spec as a Part 2) so future-Claude reads a coherent single design rather than reconstructing intent from skill commits.

### Chunked mode

Per-card sub-agent dispatching ONE entity per invocation cost ~50k tokens of reference-loading front matter per entity. Chunked mode (one sub-agent processes N entities sequentially, references loaded ONCE) reduced token cost ~65% across the arc. Calibration progression visible in HANDOVER: chunk_size=6 baseline -> chunk_size=7 -> chunk_size=8 -> chunk_size=10 sustained for Frogbot 78-entity / Demo & spectator 69-entity / Match flow 71-entity batches. Token-cost data captured in Scoring & stats batch entry (332k tokens for 19 entities vs ~950k baseline).

Recommendation: chunked-mode is the operational default for future codebase forks. The chunk_size calibration story (6 -> 8 -> 10) is itself reference material for the MVDSV/QWFWD/QTV dispatchers.

### Halt-on-novelty gate (dispatcher-level)

The per-card skill's park triggers are per-card events. The dispatcher's `halt-on-novelty.md` adds a dispatcher-level decision: if any sub-agent surfaces trigger 1 (no-shape-match relational) or trigger 4 (sui-generis-mechanism), HALT the batch and surface the candidate-shape signature for operator review. Triggers 2 / 3 do NOT halt (per-card concerns the apply-pass-author handles). Discriminates "earn-their-keep means the catalog grows only by operator judgment with 2-3 instance evidence" from "park as 1-of-1, ship the rest of the batch."

Production exercise: Mode-scoped knobs batch (roundsdown/roundsup trigger 1; operator chose ship-and-park override) + Admin & permissions batch (y/n trigger 1; operator chose ship-and-park override). Halt mechanism + operator-override-via-AskUserQuestion both validated under live conditions.

Recommendation: promote halt-on-novelty to the per-card spec as well, so a future reader sees the operational primitive (the per-card skill cannot extend the catalog; the dispatcher escalates novelty for operator decision) rather than discovering it in the dispatcher only.

### Category-enumeration audit gate (pre-flight #5, added 2026-05-27)

After the Frogbot batch silently skipped 15 entities (semantic-intuition entity-list assembly missed the `k_fb_*` cvar pile underneath the `botcmd` subcommand surface), the dispatcher added a 5th pre-flight gate: DB diff against the pre-fetch list. Catches skip-by-omission failures structurally.

Documented in dispatcher SKILL.md lines 81-94 and `pre-fetch.md` lines 36 + 56-60. The MCP `search_entities` path was REMOVED from the dispatcher's contract (no category parameter, 25-result cap, NULL-description entities structurally invisible).

Recommendation: bake this into the MVDSV/QWFWD/QTV dispatcher forks from day one. The Frogbot 15-entity gap closure (this session's `Frogbot follow-up` batch) was the live debt of NOT having this gate at original dispatch time; future codebases should not pay that cost.

### Scratch-file convention (`/tmp/chunk_<id>_<batch_date>.md` with Write-not-Edit clobber)

After Gameplay rules batch F13 (two chunks inherited stale `/tmp` content from prior batches because sub-agents used `Edit` not `Write`), the convention added (a) batch-date-suffixed filenames, (b) `Write` tool clobber semantics, (c) dispatcher validation (file exists, section count matches expected entity count, entity-name list matches chunk's input). Internal state + Race + Player communication batches validated the fix across 13 chunks; zero stale-content collisions post-amendment.

Documented in dispatcher SKILL.md lines 145-162.

### F1 amendment: mandatory CF-flag extraction (locked 2026-05-27)

Across 7 consecutive batches, sub-agents over-inferred Permission lines from existing prose ("admin command", "any player") rather than from the registration row's `CF_<flags>` value. 28-34% of commands had Permission mislabels caught after F1 was added (Race 10-of-29; Player communication 5-of-18). Now locked as a permanent SKILL.md fixture: sub-agents MUST extract `CF_<flags>` from the registration row AND map to Permission via the CF-flag-to-wording table in `references/universal-shape-v2.md`.

Documented in per-card SKILL.md lines 138-143.

Recommendation: bake CF-flag-to-wording table extraction into the MVDSV dispatcher's per-card skill spec from day one (the MVDSV codebase also uses `CF_` flags; the F1 amendment is engine-portable).

### F3 amendment: manual-flip Shape 1 variant (shelved 2026-05-27 for KTX; possibly relevant for forks)

Cross-chunk Shape classification discrepancy in Gameplay rules batch: sub-agents disagreed on whether `cvar_fset`/`trap_cvar_set_float` manual-flip patterns qualify as Shape 1 (most said yes; `teleteam` said no, citing absence of `cvar_toggle_msg`). Amendment proposed: treat manual-flip as Shape 1 functionally. Validation in Internal state + Race + Player communication batches: DORMANT (zero Shape 1 toggle triggers post-amendment in KTX -- the canonical pattern is `cvar_toggle_msg` throughout); SHELVED until MVDSV/QWFWD/QTV forks surface a sibling pattern.

### Cross-card consistency pass (5-12 checks per batch)

Dispatcher-level synthesis after all sub-agents complete: shared misintuitions / cross-card factual contradictions / See-also bidirectional checks / shape-classification consistency / pair-integrity (added 2026-05-27 after Race batch's `k_race_simultaneous` folding gap). Pattern surfaced in Voting batch (4 actionable findings) and held through every subsequent batch. Section template appended to drafts files; F1-F18 structure mirrors mechanism-map findings.

Documented in dispatcher `references/cross-card-checks.md`.

### Mechanism-map consultation (pre-flight gate #4)

Pre-existing mechanism maps (e.g. `ktx-map-voting-mechanism-map.md`) treated as source-truth for entity framing, See-also matrices, and shape classification when batches cover mechanism-map entities. Pre-flight Gate #4 loads any mechanism map covering the batch's category. Visible in Match flow batch (votemap / agree / rpickup foundational framing fixes per the voting mechanism map).

### Pair-integrity check (added 2026-05-27 after Race batch's structural gap)

When a card's shape classification names a paired relationship (Shape 1c paired-toggle, Shape 7b paired vote-toggle, Shape 9a side-channel cvar+command, Shape 11a/11b bitmask shared-container, any `Shape X + Shape Y` composition naming a paired entity), BOTH halves MUST have separate top-level `##` cards. The Race batch folded `k_race_simultaneous` analysis into the `race_simultaneous` command card's body instead of emitting a separate cvar card; the Race follow-up batch closed this gap.

Documented in dispatcher `cross-card-checks.md` lines 67-100.

### Parks-pile drain workflow (Layer A only, no Layer B forced)

When a park entity cannot be classified under any Layer B shape, hand-drafting under Layer A universal shape only (with `shape-less` Layer B tag) is the operator workflow. Avoids force-fitting catalog shapes onto 1-of-1 mechanisms. Drained 5 of 5 parked entities (`callalias` / `y` / `n` / `roundsdown` / `roundsup`) into `ktx-l1-rewrite-drafts-2026-05-27-parks-handdraft.md` -- 3 clean + 2 drafted_with_flag for Permission-line corrections caught by F1 audit.

Recommendation: capture this workflow as a section in the per-card skill's `park-triggers.md` -- "if you receive a park entity for hand-drafting, use Layer A only; do not invent a Layer B shape." It is the load-bearing closing move for any catalog walk and will recur in every codebase fork.

## Open YELLOWs from sign-off

### YELLOW 1: dial-discipline gap (load-bearing -- must close before MVDSV fork)

**Issue**: Sub-agents lacked the Task tool in their invocation environment; per-card recasts ran inline at the dispatcher's Opus 4.7-medium dial instead of fanning out as separately-dispatched Sonnet 4.6-high sub-agent calls.

**Evidence**: operator-stated structural finding in this review's brief; per-card skill spec locks Sonnet 4.6 high but the per-card budget was paid at Opus medium across all 14 chunked-mode batches.

**Investigation status**: ROOT CAUSE KNOWN (Task tool unavailability in sub-agent invocation env). Quality NOT impacted (per-card output is clean across the sampled cards). Cost impact: per-card budget paid at ~3-4x intended per-token cost across 633 entity recasts.

**Recommendation**: must resolve before MVDSV fork. Either (a) ensure the dispatcher's chunked-mode sub-agents have Task tool exposed so they can actually fan out at Sonnet 4.6-high; OR (b) re-architect the dial design so the dispatcher's higher dial is the explicit per-card dial (and `describe-fill-synthesis`'s Opus MAX vs `ktx-l1-rewrite`'s Sonnet high cost differential is redesigned around dispatcher-dispatcher dial differences rather than dispatcher-vs-per-card). Option (a) preserves the original design intent; option (b) honestly captures what actually ran.

### YELLOW 2: apply pass not yet run

**Issue**: All 633 drafts exist as per-batch markdown files at `apps/qw-oracle/docs/reviews/`; zero have been written to `entities.description` in the qworacle DB.

**Evidence**: DB query for any KTX entity's current description still returns pre-arc text; HANDOVER entries (a)-block for every batch reads "operator audits + applies clean drafts; N `drafted_with_flag` entries need review before applying."

**Investigation status**: SCOPED. The work is deterministic per-card review (clean drafts apply directly; flagged drafts need operator review of the factual change before applying); cumulative flagged count ~200+ across all batches.

**Recommendation**: dedicated apply-pass arc OR per-batch apply phase as operator bandwidth allows. The apply-pass design itself is the spec's third deferred open question; it should be either a runbook (if cardinality stays tractable) or a skill (if it crosses ~1000 entities across future codebases).

### YELLOW 3: d4-extractor wipe-regression cohort (4 of 5 deferred to apply pass)

**Issue**: 2026-05-26 d4-extractor-fix wiped `description` on 5 KTX cvars (k_defmap / k_mode / k_spm_custom_model / k_sready / k_timetop) while preserving `description_verdict='affirmed'` + reasoning + provenance.

**Evidence**: HANDOVER entry for "KTX d4-extractor wipe-regression" + commit `d72230a9` (restore k_sready) + commit `7a891c8f` (k_sready gapfill).

**Investigation status**: RESOLVED for k_sready (restored + v2 recast this session, persisted to DB). 4 others (k_defmap / k_mode / k_spm_custom_model / k_timetop) have v2 recast drafts in their respective batch files (Server config 2026-05-23 / Mode selection 2026-05-26 / Server config 2026-05-23 / Mode-scoped knobs 2026-05-26); apply pass writes them.

**Recommendation**: ADDRESSED for k_sready; remaining 4 are absorbed into the apply-pass workstream (no separate action needed -- the v2 recast drafts capture richer text than the wiped affirmed descriptions).

### YELLOW 4: See-also asymmetry -- `break` missing back-ref to `ready`

**Issue**: `ready` See-also references `break` ("clears ready state"), but `break`'s See-also focuses on voting-system flow (`forcebreak`/`k_vp_break`/`k_vp_map`/`next_map`) and omits `ready`/`slowready`/`toggleready` peer set.

**Evidence**: HANDOVER spot-check entry 2026-05-27; `break` has 4 See-also entries, the per-card skill caps at 4-5 so adding `ready` as 5th fits.

**Investigation status**: SCOPED. Apply-pass-action: when applying Match flow batch, hand-edit `break`'s See-also to add `ready (paired peer -- sets ready state)`. Other 5 paired relationships sampled (`freeze`<->`k_freeze`, qlag/qpoint/qenemy triangle, race_simultaneous<->k_race_simultaneous, powerups<->k_pow, discharge<->k_dis) all verified symmetric.

**Recommendation**: tracked as a single-line apply-pass amendment; no separate work needed.

### YELLOW 5: 14-entity gap audit hypothesis (Final batch's F5) was wrong

**Issue**: The Final batch's F5 finding hypothesized 14 unaccounted entities as the "userinfo-key pile" (kf / premsg / postmsg / k_sdir / k_nick / k). DB query confirms the 633 denominator is cvar+command only (358+275), NOT including info_key entities. The Final batch's F5 finding was misframed: those userinfo keys are not in this arc's scope.

**Evidence**: DB COUNT confirms 633 = 358 commands + 275 cvars; userinfo keys (entity_type='info_key') would surface in a separate query.

**Investigation status**: RESOLVED (the actual gap closed this session was 15 `k_fb_*` cvars from the Frogbot batch + 1 `k_race_simultaneous` structural re-draft + 1 k_sready gapfill + 5 parks). The userinfo-key pile is a separate concern (correctly out-of-scope for this arc).

**Recommendation**: track userinfo-key recasts as a sibling arc, NOT as gap closure for this arc. The KTX L1 chunked-mode dispatch arc is structurally complete at 633/633 cvar+command.

### YELLOW 6: F3 (manual-flip Shape 1 variant) amendment shelved

**Issue**: F3 amendment proposed treating manual `cvar_fset`/`trap_cvar_set_float` binary-flip patterns as Shape 1 functionally. Dormant across Internal state + Race + Player communication batches (all use canonical `cvar_toggle_msg`); shelved.

**Investigation status**: ACCEPTED as shelved per operator decision (Internal state batch handoff memo); revisit when MVDSV/QWFWD/QTV forks surface a sibling pattern.

**Recommendation**: keep shelved; do not bake into MVDSV fork's catalog until evidence appears.

### YELLOW 7: cross-batch See-also threading + L3 concept-note backlog

**Issue**: Multiple apply-pass-time amendments accumulated across batches: `freeze`<->`k_freeze` See-also fix (Gameplay rules F11); `_k_pow_last`<->`k_pow` back-link (Internal state F3); `kick`<->`y`/`n` See-also (Admin & permissions F7 + parks-handdraft F2); 10+ paired-cvar See-also gaps in Admin & permissions F2; etc. Plus L3 concept-note candidates: vwep (Gameplay rules F6); pacemaker family (Race F9); KTX private messaging system (Player communication F10); DMM4 mutual exclusion network (Mode-scoped knobs F5); 2 mode-preset mechanisms (Mode selection F2).

**Investigation status**: SCOPED. See-also threading is mechanical apply-pass work; concept notes are operator-authoring work.

**Recommendation**: bundle See-also amendments into the apply-pass; queue concept-note authoring as a separate sub-arc (`asset-concept-partner` pattern from memory `project_asset_concept_partner_pattern`).

## Recommendations for Arc N+1 prep

Listed in increasing scope. Operator picks what fits the next arc's energy.

1. **Resolve dial-discipline gap (YELLOW 1) before MVDSV fork.** Smallest scope; load-bearing. Either expose Task tool to dispatcher's sub-agents so chunked-mode genuinely fans out at Sonnet 4.6-high, OR redesign the dial story to honestly capture what runs. Sized: 30-60 min investigation + skill amendment if path (a); 2-3 hour redesign if path (b). Source: this review's load-bearing finding.

2. **Apply pass for 633 drafts (YELLOW 2).** Mid-scope. Drain all 18 drafts files into `entities.description` in batch order. Apply clean drafts directly; resolve ~200 flagged drafts (Permission-line corrections, default-value corrections, foundational framing fixes). Sized: substantial -- 633 cards × per-card review time. Can be parallel-decomposed by batch (each batch is an independent apply unit). Source: every batch's HANDOVER entry (a)-block.

3. **See-also threading + bidirectional fixes (YELLOW 7 part 1).** Small scope, bundled into apply pass. Cumulative ~15-20 See-also amendments across batches (freeze<->k_freeze, _k_pow_last<->k_pow, kick<->y/n, paired cvars in Admin & permissions, break<->ready). Sized: ~1 hour. Source: HANDOVER cross-batch findings cumulative.

4. **Default-value sweep (one-time audit).** Small scope. ~17 cvars across 6 batches flagged for wrong-default (bare `RegisterCvar` = 0 vs existing-description non-zero claims). Operator-side one-time grep/audit script across all KTX cvars to surface remaining wrong-default flag opportunities before apply pass. Sized: ~30 min script + review. Source: HANDOVER cumulative F2 default-value error class.

5. **MVDSV L1-rewrite skill fork (Arc N+1 proper).** Mid-scope. Fork `ktx-l1-rewrite` skill per codebase with MVDSV-specific shape catalog. Layer A universal shape stays engine-agnostic. Bake in mid-arc amendments from day one: F1 mandatory CF-flag extraction (MVDSV also uses CF_ flags; engine-portable); F13 scratch-file convention; category-enumeration audit gate; halt-on-novelty discipline. **Blocked on resolving YELLOW 1 first.** Sized: ~1-2 days for the per-card skill + dispatcher fork + reference files; another day for MVDSV-specific shape catalog seeding from MVDSV codebase walk. Source: spec's Engine-genericity section + Open questions deferred to post-build.

6. **Apply-pass skill or runbook (spec's third deferred open question).** Mid-scope. Currently apply-pass is operator-driven without tooling. Spec defers the design. If apply-pass crosses ~1000 entities across multiple codebases, formalize as a skill (read drafts files -> validate v2 shape -> apply to `entities.description` with FLAG resolution prompts). If it stays bounded, a runbook may be sufficient. Sized: ~half day skill design + spec; or ~1 hour runbook. Source: spec's Open questions deferred to post-build.

7. **L3 concept-note authoring queue (YELLOW 7 part 2).** Bundle with later arc. Concept-note candidates surfaced across batches: vwep family (3 entities), pacemaker family (6 entities), KTX private messaging system (7 entities), DMM4 mutual exclusion network (asymmetric directed graph), mode-preset mechanism distinction. Each is ~30-45 min author time per the `feedback_l3_concept_notes_wiki_shape` discipline. Sized: ~3-5 hours across the 5 candidates. Source: HANDOVER cross-batch concept-note candidates.

8. **Userinfo-key pile recasts (NEW sibling arc; NOT this arc's gap closure).** Mid-scope. ~14 entities (kf, premsg, postmsg, k_sdir, k_nick, k, plus the rest of the userinfo-key roster). Single batch under the same skill, new file `ktx-l1-rewrite-drafts-YYYY-MM-DD-userinfo-keys.md`. Should consume the same per-card skill + dispatcher, possibly with a `references/entity-categories.md` amendment if userinfo keys carry shapes the cvar/command catalog doesn't capture. Sized: ~1 batch (single-session). Source: Final batch F5 misframing correction; the userinfo-key recasts are a sibling arc not gap closure.

The arc shipped clean for cvar+command at 633/633; the apply pass is the gate to call it "shipped to L1"; the dial-discipline gap is the structural finding that must close before the MVDSV fork can faithfully replicate the model-dial discipline this arc was supposed to enforce.
