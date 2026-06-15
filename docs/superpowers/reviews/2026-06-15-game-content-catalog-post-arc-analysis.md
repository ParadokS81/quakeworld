# game-content-catalog -- post-arc analysis (2026-06-15)

**Reviewer:** post-arc fresh terminal (did not execute any phase; read the spec
cold and re-derived every claim against the live dev DB + source trees).

**Sources read:**
- Spec: `docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md` (D1-D7 + M1-M5 + P1-P2 + Scope In/Out).
- Scaffold: `docs/superpowers/plans/2026-06-11-game-content-catalog/` -- `decisions.md` (D1-D22 + amendments), `review-findings.md` (F1-F22), the five phase MDs + five executor prompts, `phase-1/2/3-findings.md`.
- Retrospective: `apps/qw-oracle/docs/arc-history.md` top entry (2026-06-14).
- Post-arc handoff: `docs/superpowers/parking/2026-06-14-game-content-catalog-postarc-handoff.md`.
- Live state: `qw-oracle-postgres-dev` (read-only SQL), the two source trees (`research/repos/QuakeC-releases/progs/`, `research/repos/qwcl-original/QW/progs/`, `research/repos/ktx/src/`), the shipped TS/MD/JSON artifacts, `git` tag + log.

**Verification method note:** per the arc-reviewer contract I did NOT run the
arc's own probe/test/loader scripts (citation-gate.ts, quality-grid.ts,
seed-idempotency.ts, verify-gameplay.ts, build-snapshot). Aggregate claims
(citation-gate `1025/0`, F1 `165/165`, verify-gameplay `all PASS`) were verified
the cold way instead: I independently SQL-queried every component count and
sampled 9 citations, reading the cited source line to confirm it plays the ROLE
the row claims (not merely that it contains the value). Where I rely on
arithmetic consistency or structural inspection rather than a re-run, I say so.

---

## Verdict

**The arc shipped clean. Zero MISSING.** Every spec section is DELIVERED or
DELIVERED-DIFFERENT, each divergence documented in `decisions.md` amendments or
the F-ledger and routed. The two DELIVERED-DIFFERENT calls are both honest,
operator-signed execution-time decisions: M4 (the Track-A execution gate was
LIFTED, D16 amendment) and M3's wiki cross-check (fandom is Cloudflare-blocked,
so quakewiki became the sole primary within D15's degrade-gracefully rule). Every
headline count re-derived exactly against the live DB: id1 = 52 entities
(25/15/8/4) / 53 mechanics; ktx = 26 seed overrides (11 entity + 15 mechanic)
disjoint from the 13 bloodfest monsters + 446 extractor mechanics; map_summary_key
24 rows / 20 keys; disjointness anchors 13/27/317/27 intact. All 22 findings
(F1-F22) are resolved, dissolved, or routed; all decision amendments are dated and
reasoned. The orchestrator's "verify the role of a cited line, not just its value"
discipline held in every shipped row I sampled.

Two items the cold read surfaced that the anchored handoff did not fully resolve,
**neither a defect in shipped data**:

1. **A retrospective-prose citation drift** (not a data error): the handoff and
   arc-history both cite `oldone.qc:283` for Shub's 40000 health; the shipped row
   correctly cites the canonical `oldone.qc:312` (`self.health = 40000; // kill by
   telefrag`). Line 283 also assigns 40000 but in the `nopain` pain-handler (the
   invulnerability reset), not the health-stat role. The data is right; the
   narrative prose is value-accurate-but-role-loose -- the F7/F10/F12 class leaking
   into the chronicle rather than the rows.

2. **The F9 carry-forward has no explicit owner as currently written.** The
   handoff asked me to confirm the OPEN "MCP realignment to KTX-era data" HANDOVER
   entry absorbs describe_mode override-surfacing. It does not: that entry's named
   scope is `search_mechanics` kind/mode filtering + the `mode_default_init_array`
   resolver. And the handoff's claim that the SHIPPED `arc-mcp-ktx-realignment-shipped`
   tag "was search_mechanics KTX-kind widening" is wrong -- that tag's message is
   "floor reachability + describe_mode + doc re-truth" (it BUILT describe_mode for
   game_mode + mode_default). So F9 (extending describe_mode to the new override
   rows) is named by neither owner and needs to be written into one.

Details below, then YELLOWs and Arc N+1 prep.

---

## Spec section walkthrough

### Scope: In (5 line items)

Status: **DELIVERED** (all five). Evidence: audit (D4) re-verified 242 cited
values; monsters (D1) = 15 rows; KTX overrides (D2/D3) = 26 rows; maps join keys
(D5) = 24 rows/20 keys; SCHEMA.md ride-along (D7) present at `SCHEMA.md:914`. Each
graded individually below.

### Scope: Out (4 line items)

Status: **DEFERRED** (all four, correctly scoped out). L3 concept notes (Track A),
the coverage map (Track C), engine-tunable cvars, and whole-subsystem KTX content
are all explicit non-goals and none leaked in. The ktx overlay is value-deltas
only (verified: every ktx seed row is a value divergence keyed to an id1 baseline
name, no subsystem logic).

### Spec D1 -- Monsters (id1-sourced ungated stats; KTX deviations as overlay)

Status: **DELIVERED.**
Evidence: live DB has 15 id1 `kind='monster'` rows, gate `{}`, all citing the
acquired v1.06 tree (`/research/repos/QuakeC-releases/progs/`). KTX deviations
shipped as 2 overlay rows (zombie gib-lob speed, shambler LG resistance) + 1 folded
into the rocket row (Phase 3, F20) -- confirming the spec's "if KTX is faithful,
few/zero stat rows" prediction (12/15 byte-faithful).
Notes: the spec's roster estimate was "~15 incl. boss/oldone/fish"; shipped exactly
15. The `monster_oldone` health-vs-prose item the handoff flagged resolves in the
DATA's favor: live row health=40000, `health_source_ref=oldone.qc:312` (the
spawn-time `self.health = 40000; // kill by telefrag`), `source_ref=oldone.qc:291`
(the `void() monster_oldone =` definition) -- both role-correct. `monster_boss`
health=null (Chthon, scripted death). review-findings F17's prose ("boss+oldone
both null") over-simplified; the row and `phase-2-findings.md` table are correct.
The `:283` citation in the handoff + arc-history is the only artifact that is
loose (see YELLOW 5).

### Spec D2 -- KTX override scope (exhaustive value-deltas in four file families)

Status: **DELIVERED.**
Evidence: exhaustive sweep of `weapons.c`/`items.c`/`combat.c` + 15 `sp_*.c`
returned 31 candidates -> 26 SME-gated rows (F19). Two drops verified against the
spec's own predictions: `k_classic_shotgun` (source read showed cosmetic puff
grouping only, damage 4/pellet regardless) and `k_hitboxcheck_bullets` (inside
`#ifdef HITBOXCHECK` dev block). The operator ADDED one delta the sweep missed
(`yawnmode_shotgun_deterministic_spread`) and correctly did NOT surface dmm4 quad
8x (vanilla dm4, id1-native per D4). The drops match community reality (operator
SME gate, D12 surface 2). The spec's floor inventory (yawnmode/midair/instagib/
bloodfest/dmm4/CTF runes/k_dis/...) is all represented in the live rows.

### Spec D3 -- Gate vocabulary (reuse the game_mode catalog tokens)

Status: **DELIVERED** (with an in-scope amendment, D22).
Evidence: live ktx override gates are `{"mode":...}` (yawnmode/midair/instagib/
bloodfest/ctf/ca), `{"dm":4}`, `{"cvar":"k_dis"}`, and `{}` -- all single-key, all
joining the 27-token game_mode catalog by token. The axe `{"dm":4}` worked example
verified role-correct at `weapons.c:124` (`damage = 75;` inside `if (deathmatch >
3)`; the `> 3` range lives in props, the single-key gate is a label). D22 added the
third form `{"cvar":"<name>"}` for cvar-gated deltas with no mode token -- dated,
operator-ratified, reasoned as the same "joinable by an existing catalog word"
principle (not a second vocabulary). Documented in the ktx-gameplay.yaml header and
SCHEMA.md.

### Spec D4 -- Audit (re-verify all + exhaustive gap sweep)

Status: **DELIVERED.**
Evidence: two read-only fan-outs cold-re-derived 242 cited values (232 agree, 14
discrepancies, 0 unresolvable) and swept 17 QC files (115 candidates, 0
needs_new_kind). The 14 discrepancies were the F7/F10 class at scale -- correct
value, role-wrong cited line -- 9 fixed in place + 5 operator-adjudicated. Both
known gap seeds landed role-correct: `splash_falloff_gradient` -> `combat.qc:275`
(`points = damage - points`, the gradient line, NOT the `:273-274` clamp F7
warned about) and `self_splash_half_damage` -> `combat.qc:278` (`points = points *
0.5` under `if (head == attacker)`).
Note on the "~400" estimate: the spec estimated "~400 cited props"; the audit
re-derived 242 cited VALUES across all 37+41 rows (15 groups, 0 nulls). 242 is the
actual citation-bearing count (not every prop carries a source_ref); the audit was
exhaustive over the rows, so this is a high estimate corrected at execution, not
under-coverage.
Note on Tier-2 deferral: the exhaustive sweep surfaced a far larger surface than
the 2 known seeds; the operator accepted Tier 1 (12 rows, mechanics 41->53) and
DEFERRED Tier 2 (~26 map-entity hazard defaults -- door/plat/train crush, traps,
fireballs, telefrag, teleport) as "a different category from the global combat
catalog." This is a designed D12 SME-gate outcome, tracked in
`phase-1-findings.md` section D (not dropped). The sweep itself was exhaustive as
the spec promised; acceptance was scoped. See Arc N+1 prep item 3.

### Spec D5 -- Maps join keys (map_summary_key prop on item rows)

Status: **DELIVERED.**
Evidence: 24 id1 rows carry `map_summary_key`, all on `kind='item'` (D21), spanning
20 distinct keys that exactly match the `maps.item_summary_json` vocabulary {bio
cells ga gl h15 h25 lg mh ng pent quad ra ring rl rockets shells sng spikes ssg
ya}. Ammo small+large collapse to shared keys (24 rows - 20 keys = 4 collapsed
pairs), so a join returns both variants -- the correct answer per D5. 24 of 25
item rows are keyed (backpack carries none). The classname join is untouched. The
coverage probe's invariant (every maps key resolves to >=1 catalog row) holds: the
20 distinct catalog keys ARE the 20 maps keys.

### Spec D6 -- No migration (one loader extension)

Status: **DELIVERED.**
Evidence: no new migration; the loader gained a `monsters` seed section (15
`kind='monster'` rows load correctly) plus the D8 `expected_counts` STOP-gate that
replaced the brittle hardcoded 37/41. All kinds pass the existing CHECKs.

### Spec D7 -- SCHEMA.md carries the conventions

Status: **DELIVERED.**
Evidence: `SCHEMA.md:914` "Gameplay conventions (game-content-catalog arc)"
section covers the three gate forms, the three-layer knob/mode_default/override
model, the two-form citation rule (D7-plan), `map_summary_key` aliasing (D21), and
the `expected_counts` STOP-gate (D8). `VALIDATION-RUNBOOK.md:577` gained a "qw
gameplay validation" section mirroring the per-engine sections. F6 stale count
fixed: `~309` returns nothing, `317` present (F22 ratified -- the executor drained
the MD's self-contradiction toward the twice-stated grep gate, meaning preserved).

### Spec M1 -- Seed-file layout (one YAML per source)

Status: **DELIVERED.**
Evidence: `id1-gameplay.yaml` grew (monsters cluster + audit corrections + Tier-1
mechanics + map_summary_key props; `expected_counts: {52, 53}`); new
`ktx-gameplay.yaml` carries the override layer with its own `gameplay_source: ktx`
block and `expected_counts: {11, 15}` (the seed's own load contribution, correctly
NOT the table total). Loader `monsters` section added.

### Spec M2 -- Workflow shape (extract -> verify -> SME gate -> assemble)

Status: **DELIVERED.**
Evidence (from the findings ledgers, which record honest fan-out counts): Phase 1
audit 15 groups/0 nulls; Phase 2 monsters 15 dispatched/15 returned/0 nulls
(trial-3-then-waves-of-4); Phase 3 combat sweep 3/3 + monster diff 15/15. Per-value
citation enforced at extraction (D11), independent Stage-2 re-derivation,
three SME-gate halts (gap candidates, KTX deltas, wiki mismatches), single inline
assembler per phase (D5). Sonnet + low concurrency + pacing per D10.

### Spec M3 -- Validation regime

Status: **DELIVERED-DIFFERENT** (wiki sub-clause adapted within D15).
Evidence: double-load idempotency probe (both YAMLs), per-(source,kind) F1 grid,
citation gate (two-form D7 resolver), VALIDATION-RUNBOOK qw section, and the F4
verify-gameplay.ts fix (verified structurally: no frozen 37/41 literals,
gameplay_source-aware) all shipped. The DELIVERED-DIFFERENT is the wiki
cross-check: the spec said "fetch from each wiki"; fandom is Cloudflare-bot-blocked
via Jina (F8), so quakewiki.org became the sole primary with fandom degrading to
recorded STUBs. This is explicitly within D15's degrade-gracefully rule and needed
no decision amendment. Result: 13/15 quakewiki matches, 1 mismatch (fish gib is
Scourge-of-Armagon-only -- operator keep-source null), 1 no-data (tarbaby).

### Spec M4 -- Sequencing (execution waits for Track A's first ship)

Status: **DELIVERED-DIFFERENT** (dependency dropped by explicit operator decision).
Evidence: D16 amendment (2026-06-12, operator-signed) LIFTED the execution gate.
Rationale recorded: the D4-exhaustive sweep made note-demand prioritization input
only (never the boundary), and the notes gain a complete L1 instead of backfilling
against gaps. This is the textbook DELIVERED-DIFFERENT: the spec's literal
sequencing constraint was superseded by a dated, reasoned, operator-signed
amendment, not silently skipped.

### Spec M5 -- Surfacing (regenerate snapshot; confirm MCP needs nothing new)

Status: **DELIVERED** for what it scoped (verify, do not build), with F9 as a NAMED
carry-forward.
Evidence: `qw-gameplay.json` regenerated -- 30 monster entries (13 bloodfest + 15
id1 + 2 overlay), 24 map_summary_key occurrences, ktx override content present.
`search_gameplay_entities` already admits `kind=monster` + `gameplay_source` (no
new surface needed). The F9 nuance is real and correctly characterized as a
carry-forward, not a miss: `describe_mode` (read at source) joins only `game_mode`
+ `mode_default` (+ the L3 note + entities activation cvars) and never reads the
override rows. The data-level join works (verified: query by mode token returns
catalog + mode_default + overrides); the TOOL envelope does not. D14 forbade new
MCP surface this arc. See YELLOW 1 for the ownership gap.

### Prereq P1 -- Acquire original Quake v1.06 progs QC

Status: **DELIVERED** (after the F12 bounce-back).
Evidence: tree at `research/repos/QuakeC-releases/`, branch `id1-original`, commit
`85ccafd2652ec550a561849a6a5eb92e62cdc115`, provenance recorded in
`gameplay_sources.id1.notes` (verified in YAML). F12 is the durable lesson: the
executor first cloned `id1-fixes-1.06` (which mutates monster QC); value spot-greps
passed on BOTH branches, so only the orchestrator's branch-semantics read caught
it. The pinned SHA (not the branch name) is the provenance anchor.

### Prereq P2 -- id1 source_root wrinkle

Status: **DELIVERED.**
Evidence: D7 two-form citation rule (default = source_root-relative; leading `/` =
monorepo-root-relative). `gameplay_sources.id1.source_root` stays
`research/repos/qwcl-original/QW/progs/` unchanged; the ~400 existing refs
untouched; new monster rows use the leading-slash form into the v1.06 tree. No
migration, no UPDATE statements. The citation gate strips a leading `/` from
source_root too, legalizing the live ktx row's `/research/repos/ktx/src` form.

---

## Shipped beyond spec

- **F11 fix -- a pre-existing sibling-arc citation defect, repaired here.** 32 ktx
  taxonomy refs (27 death_rule citing `deathtype.h:N`, 5 election_type citing
  `progs.h:N`) were broken since the KTX-onboarding arc -- the files live under
  `include/` while source_root points at `src/`. Phase 3 Task 0 fixed it at the
  extractor emit site (`_handler_gameplay_taxonomies.py:283/:346` -> `../include/`
  source-root-relative form), re-extracted (not SQL-patched), tests 9/9 green, AST
  diff provably ref-only. Recommend: accept as-is; it is the right "repair by
  re-extract" pattern and the citation-gate is now a standing all-sources `0/0`
  regression guard.

- **D22 `{"cvar":"<name>"}` gate form.** A vocabulary extension discovered at Phase
  3 planning (operator-ratified). Recommend: promote into any future
  hardcoded-override arc spec from the start (the three-form gate vocabulary is now
  settled and documented in SCHEMA.md), rather than re-deriving it.

- **`expected_counts` self-describing STOP-gate (D8).** The spec D6 framed the
  loader change as "~10 lines (monsters section)"; the arc additionally replaced
  the hardcoded 37/41 gate with a per-seed `expected_counts` block that travels
  with the data. This is a richer observability primitive than the spec implied and
  is now the tripwire for accidental row loss/dup on every future seed edit.
  Recommend: documented (SCHEMA.md:1000); accept-as-is.

- **Two reusable probes outliving the arc.** `citation-gate.ts` (two-form D7
  resolver) and `seed-idempotency.ts` are arc infrastructure now reused by any
  future seed-YAML load. Recommend: accept-as-is.

- **F21 anchor-probe re-scope.** The `monsters_have_hp_for_kill` probe silently
  encoded a stale assumption (every ktx monster carries the bloodfest `hp_for_kill`
  field); the 2 non-bloodfest overlays exposed it, and it was narrowed to its real
  invariant (`ruleset_gate_json = {"mode":"bloodfest"}`). Same F29 class. Accept.

- **`yawnmode_shotgun_deterministic_spread`.** A delta the automated sweep missed,
  added by operator SME knowledge -- evidence the D12 gate is doing real work, not
  rubber-stamping. Accept.

---

## Open YELLOWs from sign-off

1. **F9 -- describe_mode override surfacing has no explicit owner (INVESTIGATED;
   needs routing decision).** The handoff routed F9 to the OPEN "MCP realignment to
   KTX-era data" HANDOVER entry (line 21) and noted a same-named SHIPPED tag to
   disambiguate. Cold read: (a) the open entry's named scope is `search_mechanics`
   kind/mode filtering + the `mode_default_init_array` resolver + the
   over-promising orientation blob -- it does NOT mention describe_mode override
   surfacing; (b) the SHIPPED `arc-mcp-ktx-realignment-shipped` tag's actual scope
   is "floor reachability + describe_mode + doc re-truth" -- it BUILT describe_mode
   (for game_mode + mode_default), so F9 is an ENHANCEMENT to already-shipped
   behavior, not leftover realignment; the handoff's "that tag was search_mechanics
   widening" characterization is inaccurate. Net: F9 is named by neither owner.
   Recommendation: when the MCP-realignment work is picked up, explicitly add "wire
   describe_mode to include the gameplay_entity_defs overrides + non-mode_default
   gameplay_mechanics override rows (carry the gate token)" to that entry's scope,
   OR file it as a small standalone describe_mode follow-up. It is genuinely
   net-new MCP behavior (D14-forbidden this arc); the data is proven joinable.

2. **F18 -- PROD MCP awaits a deploy (INVESTIGATED; ride a bundled deploy).** The
   served `oracle.slipgate.me` MCP reads its own deployed DB; the 15 id1 monsters +
   26 ktx overrides + map keys are live in dev + in the regenerated snapshot but
   NOT queryable via the connected remote MCP until a deploy. Out of arc scope
   (D14). Recommendation: bundle with the standing QTV+QWFWD "MCP PROD-refresh"
   follow-up -- one deploy clears both.

3. **Tier-2 gap-sweep surface deferred (INVESTIGATED; tracked).** ~26 map-entity
   hazard defaults (door/plat/train crush, traps, fireballs, telefrag, teleport)
   surfaced by the exhaustive sweep, scoped out by the operator as "a different
   category from the global combat catalog." Tracked in `phase-1-findings.md`
   section D. Recommendation: a follow-up arc decides whether per-map mapper-set
   entity defaults belong in the global catalog at all -- see Arc N+1 prep item 3.

4. **qw-maps.json staleness (adjacent, not arc scope).** The slipgate
   `qw-maps.json` is schema v14 / 2026-04-27; Phase 4 correctly reverted its
   timestamp-only regen (no map data changed this arc). Recommendation: a small
   maps-snapshot refresh, independent of this arc.

5. **Retrospective-prose citation drift (NEW this review; data is correct).** The
   handoff and arc-history top entry both state Shub's 40000 health is "correct per
   `oldone.qc:283`"; the canonical line is `oldone.qc:312` (which the shipped row
   correctly cites). Line 283 also reads `self.health = 40000` but in the `nopain`
   pain-handler (invulnerability reset), not the health-stat role. Additionally,
   review-findings F17's prose says "boss+oldone both null" where oldone is 40000.
   No data is wrong. Recommendation: accept-and-note, or a one-line arc-history
   correction (`:283` -> `:312`) if the chronicle is ever touched. Minor; logged so
   a future cold reader is not misled by the `:283` reference.

---

## Recommendations for Arc N+1 prep

Listed in increasing scope. The operator picks what fits the next arc's energy.

1. **Correct the `oldone.qc:283` -> `:312` mention in arc-history (and optionally
   F17's "both null" prose).** Trivial, ~2 minutes, no code. Source: YELLOW 5.
   No dependency. Drop into any next qw-oracle session's doc touch.

2. **Bundle the PROD MCP deploy with the standing QTV+QWFWD refresh.** Small;
   it is an existing deploy path (`deploy` skill / DEPLOYMENT.md). Source: YELLOW 2
   (F18). Makes the id1 monsters + ktx overrides queryable on `oracle.slipgate.me`.
   Dependency: none beyond the deploy window.

3. **Decide + (maybe) wire describe_mode override surfacing into the
   MCP-realignment arc scope.** Small-to-medium. First a 5-minute routing decision
   (add to the open HANDOVER entry vs standalone follow-up), then the actual tool
   change is net-new MCP behavior: extend describe_mode to union the
   gameplay_entity_defs overrides + non-mode_default mechanics override rows by mode
   token. Source: YELLOW 1 (F9). Dependency: belongs naturally with the broader MCP
   realignment (search_mechanics kind/mode filtering) -- do them together so the
   tool surface is realigned once.

4. **Its own arc (or an explicit accept-the-drop): the Tier-2 map-entity hazard
   surface.** ~26 candidates already enumerated with source refs in
   `phase-1-findings.md` section D. The real question is categorical, not
   mechanical: do per-map, mapper-set entity-property defaults (door/plat crush,
   trap damage, telefrag/teleport rules) belong in the global gameplay catalog, or
   are they a distinct "map-entity defaults" dataset? Source: YELLOW 3 (F14).
   Recommend a short brainstorm to settle the category before any extraction; the
   sweep work is already done.

---

## Findings during review (cross-checks)

- **decisions.md amendments fully captured.** D3-amendment (-> D22), D16-amendment
  (execution gate lifted, operator-signed), and D22 itself are all dated, reasoned,
  and outsider-followable. The D9 disjointness and D3 zero-new-wiring caveats carry
  inline code-level commentary (the ktx-gameplay.yaml header documents the
  dual-writer rule with the F3 reasoning). PASS.

- **review-findings.md fully resolved or routed.** All 22 findings (F1-F22) carry a
  resolving decision, an explicit drain (F22 RATIFIED), or a named carry-forward
  (F9, F18). No F-number is silent. PASS.

- **arc-history matches live state.** The single 2026-06-14 entry's every concrete
  claim (52/53, 26 overrides, 30 snapshot monsters, 24 keys, anchors 13/27/317/27,
  the 5 commit SHAs, the F12/F11 narratives) re-derived true against the DB + git.
  The only drift is the `oldone.qc:283` prose citation (YELLOW 5). PASS with that
  one note.

- **Executor prompt augmentations preserved.** All five `phase-N-executor-prompt.md`
  files are committed under the scaffold (not transient in conversation). They
  carry the cross-phase learning (D16 lift, F11/F12/F15 carry-forwards, the
  per-phase live-state confirmations). PASS -- durable for future-arc onboarding.

- **Spec promises all map to a phase MD.** Every D/M/P section traces to a phase MD
  Goal/Outputs (D1->P2, P->P0, D2/D3->P3, D4->P1, D5/D7->P4, M1-M5 distributed).
  No spec promise is unaddressed by any phase. No MISSING candidate. PASS.

- **Git hygiene (D17).** No game-content-catalog data/code/scaffold file is left
  uncommitted; the 10 uncommitted tree files are all sibling-arc (slipgate asset
  bundles, unrelated parking docs) -- exactly the "unrelated uncommitted files is
  normal" state D17 predicted. Ship tag `arc-game-content-catalog-shipped` exists
  with an accurate message. PASS.

---

**The arc shipped clean: all 14 gradeable spec sections DELIVERED (12) or
DELIVERED-DIFFERENT (2, both documented + operator-signed), zero MISSING, zero
DEFERRED-in-disguise. Two review-surfaced items (the F9 ownership gap and the
oldone:283 prose drift) are routing/doc-hygiene follow-ups, not data defects.**
