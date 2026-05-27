# Handoff: KTX user-facing userinfo keys (extractor gap closure)

**Date**: 2026-05-27
**Owner**: fresh terminal (single-session scope, deliverable below)
**Estimated effort**: ~3-5 hours (extractor amendment + cold-synth + v2 recast for ~6-10 entities)

## Why this exists

The 2026-05-22 → 2026-05-27 KTX L1 chunked-mode dispatch arc shipped v2 recasts for all 633 KTX cvar+command entities, but surfaced a downstream gap: the v2 drafts reference user-facing KTX-defined userinfo keys (`kf`, `k_nick`, `postmsg`, `premsg`, `k_sdir`, `k`) in See-also lines and Prerequisites blocks — but those keys are NOT in the entities table.

DB query confirms:

```sql
SELECT name, type FROM entities WHERE project='ktx'
  AND name IN ('kf','postmsg','premsg','k_nick','k_sdir','k');
-- returns 0 rows
```

Source confirms they exist and are actively read by KTX (`src/g_userinfo.c`, `src/commands.c`, `src/client.c`, `src/bot_commands.c`, `src/clan_arena.c`, `src/g_utils.c`):

```
src/g_userinfo.c:65:	{ "kf", info_kf_update },          # actively registered
src/g_userinfo.c:63://    { "k_nick", 0 },                # commented out, but read in commands.c:4002 etc.
src/g_userinfo.c:72://	{ "postmsg", 0 },                # commented out, but read in commands.c:1828
src/g_userinfo.c:73://	{ "premsg", 0 },                 # commented out, but read in commands.c:1822
src/g_userinfo.c:77://	{ "k_sdir", 0 },                 # commented out, but read in commands.c:3389
src/client.c:711:		if (iKey(other, "kf") & KF_SCREEN)
src/client.c:4582:		if (iKey(self, "kf") & KF_SPEED)
src/g_utils.c:2420:	if (iKey(self, "kf") & KF_ON_ENTER)
src/commands.c:3385:		&& (iKey(p, "kf") & KF_KTSOUNDS))
```

These are legitimate user-facing features. Players add lines like `setinfo kf 31` to their `autoexec.cfg` to toggle KTX-specific client behaviors (screen-flash on damage, speed indicator, suppress on-enter messages, accept ksound voice commands). The operator's mental model "the corpus should be complete when this arc ships" surfaced this gap.

## The architectural decision (READ FIRST)

The current KTX info_keys handler at `apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` deliberately filters out non-star keys per its "spec 1.6 producer-only emission rule" (lines 130-132):

```python
if not key_name.startswith("*"):
    return
```

It also explicitly excludes `ezinfokey` / `iKey` READ sites (handler docstring lines 27-32):

```
KTX OUT OF SCOPE FOR THIS HANDLER:
  - ezinfokey / infokey READ sites (91 + 20 occurrences) -- consumer
    contract, not producer-emission. Per spec 1.6.
```

The producer-only rule's reasoning: a userinfo key belongs to the project that PRODUCES (sets) it. The client (ezQuake) sets `kf` via `setinfo`, so under producer-only emission, `kf` belongs to ezQuake's userinfo surface, not KTX's.

The problem: `kf`'s SEMANTICS are KTX-defined. KF_SCREEN, KF_KTSOUNDS, KF_KTPRO, KF_SPEED, KF_ON_ENTER are KTX bitmask constants (`src/include/g_local.h`); the behavioral effects (screen-flash, accept ksounds, etc.) are KTX features. ezQuake doesn't know what those bits mean — it just transports the value the user typed. The user-facing documentation of "what does `setinfo kf 7` do" lives naturally with KTX, not ezQuake.

**This is the design decision the fresh terminal owns**: extend producer-only emission to "producer-OR-consumer-with-codebase-defined-semantics," OR carve out a new "consumer-keys" handler for KTX, OR something else.

Options to consider:

1. **Extend `_handler_info_keys.py`** to also emit consumer-side userinfo keys where KTX has bitmask constants / enum values / semantic interpretation. Signature: any `ezinfokey(self, "<literal>")` OR `iKey(self, "<literal>")` call site where the literal isn't `*`-prefixed AND the read result is compared against a `K_*` / `KF_*` symbolic constant. Adds a new emission type (`consumer_userinfo` or similar) so downstream loaders can distinguish.
2. **New handler `_handler_consumer_userinfo.py`** (cleaner separation): walks `ezinfokey` / `iKey` call sites, emits unique key names with read-context summary. Producer handler stays as-is.
3. **Hybrid**: extend producer handler with operations=`["read"]` tagging on consumer-only keys; deprecate "producer-only emission rule" in favor of "all-sites emission with operation tagging."

Each option has consequences for cross-codebase consistency. MVDSV's userinfo handler (read `apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py` first to see how MVDSV handles this) may already have precedent.

## Prior work to recover

The operator recalls explicitly working on `postmsg` and `premsg` descriptions in a prior session. Confirmed candidate file: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/b4-ledger-specific-value-contradiction.md` (grep returned a hit for those names). Other candidate files surfaced by `grep -rln 'postmsg\|premsg' apps/qw-oracle/curated apps/qw-oracle/docs docs/superpowers`:

- `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md` (Server config & network batch)
- `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-player-communication.md` (final batch — cited as cross-batch dependencies)
- `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog-findings.md` (initial catalog walk)
- `docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`
- Various b6-categorize batch files in the 2026-05-22-ktx-l1-categorize plan

Fresh terminal: grep `b4-ledger-specific-value-contradiction.md` first — that's the highest-probability location for prior cold-synth-equivalent draft content on `postmsg` / `premsg`. If found, reuse as input for the cold-synth pass rather than re-deriving cold.

## Scope (minimum viable; expand if obvious siblings surface)

Entities to surface + describe (confirmed by source grep at HEAD anchor `1.47-2-g67253dc`):

- **`kf`** — KTX feature flags bitmask. Read with `iKey()`. Constants: `KF_SCREEN`, `KF_SPEED`, `KF_ON_ENTER`, `KF_KTSOUNDS`, `KF_KTPRO`, others in `src/include/g_local.h`. User sets via `setinfo kf <bits>`.
- **`k_nick`** — Tournament display nickname. Read with `ezinfokey()` across `commands.c` / `clan_arena.c` / `bot_commands.c`. User sets via `setinfo k_nick "..."`. Shown in lastscores, demo names, frag console contexts in place of `name`.
- **`premsg`** — User-defined prefix string for `say` messages. Read with `ezinfokey()` at `commands.c:1822`. Auto-prepended to every `say`.
- **`postmsg`** — User-defined suffix string for `say` messages. Read with `ezinfokey()` at `commands.c:1828`. Auto-appended to every `say`.
- **`k_sdir`** — Sound pack directory for ksound voice commands. Read with `ezinfokey()` at `commands.c:3389`. Path joined to `ksound1`-`ksound6` resolution.
- **`k`** — Short identifier for chat macros. Read with `ezinfokey()` at `commands.c:2568` and `commands.c:4101`. Acts as a name-abbreviation alternative to `k_nick` for macros like `%k`.

**Sweep instruction**: after closing these 6, run a comprehensive grep across `src/` for all `ezinfokey(` and `iKey(` literal call sites — there may be additional consumer-side keys with KTX semantics worth surfacing. Per the existing handler docstring, ~91 ezinfokey + 20 iKey occurrences exist. Many will collapse to the 6 above + the 7 producer-side star keys; some may be new candidates.

## Workflow (estimated phases)

### Phase 1 — Architectural decision + extractor amendment (~1-2 hours)

1. Read `apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py` to see MVDSV's precedent for handling consumer-side userinfo keys.
2. Read the relevant spec text (`docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md` if present; otherwise check `docs/arc-history.md` for the describe-fill arc's design decisions D-block).
3. Pick option 1/2/3 above. Document choice in a brief decision note (~1 page) at `docs/superpowers/parking/2026-05-27-ktx-userinfo-consumer-handler-design-decision.md`.
4. Implement the handler change. Run KTX extraction (`bun apps/qw-oracle/scripts/load-knowledge/extract-tag.ts --project ktx --version head --force`) and confirm the 6 entities surface as L1 rows.
5. Spot-check the entity rows in DB — verify `name`, `type`, `source_ref`, `description_origin` (should be `null` or `extracted` since cold-synth hasn't run yet).

### Phase 2 — Recover prior draft content (~30 min)

6. Grep the candidate files listed above for any prior cold-synth-quality content on `postmsg` / `premsg` (and incidentally any others). If found, extract verbatim into a working notes file.
7. If nothing usable surfaces, proceed to cold-synth from scratch.

### Phase 3 — Cold-synth pass (~30-60 min)

8. Run `describe-fill-synthesis` (the cold-synth sibling skill at `~/.claude/skills/describe-fill-synthesis/`) once per entity at its locked Opus 4.7 MAX dial. ~6 entities × ~5-10 min each = ~30-60 min.
9. Output gets written to the standard cold-synth ledger format. Each entity should have `description_origin='synthesized'` after the run.

### Phase 4 — v2 recast or sibling template decision (~30-60 min)

10. Eyeball one cold-synth output (probably `kf` since it's the most complex). Does v2 universal shape apply? `kf` is a user-tunable knob (bitmask), so probably yes — Headliner / Effect (per-bit semantics) / Prerequisites (none / default `setinfo` syntax) / Default (0 / unset) / Example (`setinfo kf 31`) / See-also (the bitmask constants + related commands like `ksound1`) all fit.
11. If v2 fits cleanly: dispatch the 6 entities via `ktx-l1-rewrite` skill in single mode or a single chunked-mode batch. Use the existing dispatcher at `~/.claude/skills/ktx-l1-batch-dispatcher/`. **Note**: the dispatcher was amended 2026-05-27 to MANDATORILY pass `model: "sonnet"` and `subagent_type: "general-purpose"` on the Task call — this batch is also a live validation of that amendment (see YELLOW 1 in the post-arc analysis).
12. If v2 doesn't fit (e.g., string-typed keys like `k_nick` / `premsg` / `postmsg` don't need Permission / Match-state / etc.): use a lighter sibling template focused on what users actually do with the key. Author manually in a single sitting; cardinality is too small to justify a new skill.

### Phase 5 — Apply pass + close-out (~15-30 min)

13. Apply the v2 recast (or sibling-template) drafts to `entities.description` directly.
14. Update HANDOVER.md: close the "KTX user-facing userinfo keys" entry; note any See-also amendments needed in already-applied v2 drafts that referenced these names (e.g., `mmode` family in Player communication batch references `kf` for ksound enablement — apply-pass amendment to add the See-also link now that `kf` exists as an entity).
15. Update the post-arc analysis (`docs/superpowers/reviews/2026-05-27-ktx-l1-chunked-mode-dispatch-arc-post-arc-analysis.md`) Section YELLOW 5 with the corrected denominator — KTX L1 user-facing surface now = 633 cvar+command + 6 user-facing userinfo + 7 server-internal star userinfo + 7 match_event = 653 entities, ALL with v2 (or sibling-template) descriptions.

## First three actions for the fresh terminal

1. **Read this handoff fully.** Then read `apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` (lines 1-60 docstring + lines 130-152 the filter logic) and `apps/qw-oracle/scripts/extractors/mvdsv/_handler_info_keys.py` (all) to understand the producer-only convention and how MVDSV handles consumer keys (if at all).
2. **Run the grep recovery pass** for prior `postmsg` / `premsg` description content (`grep -ln 'postmsg\|premsg' docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/*.md`). If `b4-ledger-specific-value-contradiction.md` has draft content, extract it before doing any new synthesis.
3. **Make the architectural decision** (option 1 / 2 / 3 above) and either commit to it or surface to operator for sign-off. The decision shape: "extend producer-only handler" vs "new consumer-only handler" vs "operations-tagged single handler." Pick based on (a) cross-codebase consistency with MVDSV precedent, (b) simplicity / maintenance burden, (c) downstream loader complexity.

## Critical rules (carry forward)

- **Source-truth discipline**: every claim about KTX behavior verified against `research/repos/ktx/src/` at HEAD anchor `1.47-2-g67253dc`. No assertions from KTX README / community wiki text without source verification.
- **Producer-only rule revisit is the scope, not silent override**: if you keep producer-only emission and document why consumer-keys belong elsewhere (e.g., a sibling "KTX-consumed userinfo" handler), that's a legitimate outcome. Don't silently change the rule's intent — surface the decision.
- **v2 universal shape applies where the entity is user-tunable** (per `feedback_l1_description_template`). String-only userinfo (`k_nick` / `premsg` / `postmsg`) may not need full v2 — pick a sibling shape that better fits "user-typed string" semantics. `kf` (bitmask) does fit v2 cleanly.
- **No mocking the dispatcher dial verification**: the userinfo-key batch in Phase 4 step 11 is the live validation of the 2026-05-27 dispatcher SKILL.md amendment. If you dispatch via the per-card skill in single mode (one entity per Task call), explicitly pass `model: "sonnet"` on each invocation and watch the sub-agent's reported model in its first output line. If you use the chunked-mode dispatcher, the same applies at the chunk level.

## When in doubt

- **About the architectural decision**: surface to operator with the trade-offs spelled out. Don't pick option 3 (hybrid) without checking — that's the most invasive change.
- **About v2 vs sibling template**: ask the operator with one worked example of each. Operator's L1-template philosophy memo (`feedback_l1_description_template`) is the canonical reference.
- **About the source grep being non-exhaustive**: surface the entity-count delta if your sweep finds >2 additional consumer keys beyond the 6 above. The operator's mental model is "KTX corpus complete at ~653 entities"; surprises in either direction are worth flagging.

## Out of scope

- log_template (1196 entries) — separate sibling concern, NOT this handoff's deliverable. Auto-labels are sufficient until a downstream parser justifies richer prose.
- Other entity types (match_event, gameplay_taxonomy, gameplay_table, etc.) — covered by other handlers already; not in this scope.
- Cross-codebase generalization of the consumer-key pattern to ezQuake / FTE — let MVDSV's existing precedent or future scoping decide. Don't pre-emptively propagate.
- Apply pass for the 633 cvar+command drafts — separate workstream, runs in parallel.
