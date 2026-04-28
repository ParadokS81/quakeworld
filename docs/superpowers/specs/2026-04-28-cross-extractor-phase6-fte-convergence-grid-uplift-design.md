# Cross-Extractor Phase 6: FTE Convergence + Grid Uplift

**Date:** 2026-04-28
**Status:** spec -- pending implementation plan
**Predecessor arcs:**
- `docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md` (audit; surfaced 17 drain-in-arc + 4 drain-now)
- `docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md` (Phases 0-5 of the lift work)
- `docs/superpowers/reviews/2026-04-28-{ezquake,fte,qwcl}-validation.md` (Mode B per-project validations; surfaced this arc's findings)

**Predecessor commits:** `5791701` -> `f1e611d` (lift arc Phases 0-5) + `9326f61` -> `e7f1f34` (Mode B validation reports + first synthesis).

**Memory anchors:**
- `feedback_lift_consumer_adoption_sweep.md` -- the structural lens for this arc.
- `feedback_inference_not_evidence.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_lift_candidates_closure_equivalence.md` -- the chain this arc extends.

---

## 1. Framing

This arc hardens a defense-in-depth gap surfaced by the three Mode B validations (2026-04-28). The structural concern:

> **A shared-lib lift completes only when (1) every consumer code path actually invokes the lifted helper, AND (2) the verification layer can detect the case where it doesn't.** Phase 2 of the prior arc satisfied (1) for the obvious code paths but not alternate ones (ezhud merge path, FTE commands token-walk, FTE macros + ezscript also carrying private copies), and the runbook's Section 3.2 verification wasn't shaped to catch the difference. This arc hardens both -- handler fix and runbook fix are independent obligations, not redundant.

**The three layers Phase 6 hardens:**

1. **Handler layer** -- ezhud `flags_raw: None` bypass (1085 actual wrong rows from `plugins/ezhud/*.c`: 1080 from `hud_common.c`, 4 from `hud_editor.c`, 1 from `ezquakeisms.c`) + FTE `_concat_string_literals` token-walk bypass (latent unescape gap across cvars, commands, macros, ezhud, ezscript handlers -- five private copies, not the three Mode B initially flagged).
2. **Verification layer** -- Runbook Section 3.2 `flags_raw IN ('0', 'CVAR_NONE')` check missed `IS NULL` (the failure shape that actually happened) and has no positive contract.
3. **Grid layer** -- Two distinct gaps:
   - (a) The **universal mechanical floor** (entity_type x {count, source_state}) doesn't exist today; this arc introduces it across all four projects.
   - (b) **Per-project anchor** coverage is uneven: mvdsv 22, fte 11, ezquake 6, qwcl 0; this arc adds anchors for Mode B's load-bearing invariants.

**Out of scope (HANDOVER):**
- S-02 -- D.1.8 lifecycle hooks gap (FTE commands/macros/cmdline + MVDSV commands lack `enter_function`/`exit_function`). Already tracked.
- Broader positive-contract coverage for `handler_fn`, `default_value` C-escape interpretation, `info_key` / `qc_builtin` canonical names -- listed in Section 3.2 "candidate positive contracts" for future runbook expansion.

**Success condition (gate at end of Phase 3):** the positive contract for `flags_raw` runs clean across all four projects (zero violations); the lift convergence is structural (zero private `_concat_string_literals` copies, zero `flags_raw IS NULL` rows for source_backed cvars, QWCL emits canonical ` | `); the quality grid has both a universal floor across all four projects and per-project anchors for Mode B's load-bearing invariants.

---

## 2. Components

### 2.1 Lift home

`apps/qw-oracle/scripts/extractors/extractor_lib/_source.py` (already exists from prior arc commit `64e32e3`; hosts `read_extent`, `strip_quotes`, `literal_string`). Phase 6 extends this file.

### 2.2 New helpers in `_source.py`

```python
def _strip_and_concat(tokens: list[str]) -> tuple[Optional[list[str]], bool]:
    """Strip outer quotes from string-literal tokens and collect inner bodies.

    Returns (parts, all_literal):
      parts       -- list of inner string bodies (post-quote-strip,
                     pre-escape-interpretation), or None if a non-string-literal
                     terminator (NULL, (((, ((void) was hit OR no parts collected.
      all_literal -- True if every input token was a string literal; False if any
                     non-literal-and-non-terminator token surfaced.

    Caller decides whether to abort emission, fall back, or skip.
    """

def concat_string_literals(tokens: list[str]) -> Optional[str]:
    """Canonical source-truth concatenation. Applies unescape_c_string.

    Composes _strip_and_concat with unescape_c_string. Use for cvar names,
    descriptions, default values, command names, macro names -- anything
    whose contract is "preserve source-truth meaning of escapes."
    """

def concat_string_literals_compact(tokens: list[str]) -> Optional[str]:
    """Description-compaction concatenation. Replaces \\n / \\t with space,
    \\" with ". Use for description-domain fields where newlines should
    collapse for single-line display (HUD_Register descriptions, ezscript
    description args).
    """
```

`concat_string_literals` imports `unescape_c_string` from `extractor_lib._cvar_shared` (the canonical post-v17 escape-interpretation helper).

### 2.3 Five private FTE copies deleted (verified locations)

| File | Line | Today's policy | Phase 6 routing |
|---|---:|---|---|
| `fte/_handler_cvars.py` | 100 | quotes only | **canonical** for all four call sites (name, alias, desc, default) |
| `fte/_handler_commands.py` | 50 | quotes only | **canonical** for both call sites (name, desc) |
| `fte/_handler_macros.py` | 70 | quotes only | **canonical** for both call sites (name, desc) |
| `fte/_handler_ezhud.py` | 76 | quotes + `\n->space, \t->space, \"->"` | **mixed**: see audit table |
| `fte/_handler_ezscript.py` | 41 | quotes + `\n->space, \t->space, \"->"` | **mixed**: see audit table |

### 2.4 Per-handler routing audit (the contract)

Without this audit table the executing terminal would guess and the Phase 1 contract wouldn't catch description-domain violations (the runbook contract gates on `flags_raw` only, not description fields).

| Handler | Call site / field | Variant | Escape risk |
|---|---|---|---|
| `_handler_cvars.py` | field 0 (cvar name) | canonical | verified-by-inspection: cvar names cannot carry `\X` (C identifier-shaped at registration) |
| `_handler_cvars.py` | field 7 (alias) | canonical | verified-by-inspection: aliases follow same identifier rule |
| `_handler_cvars.py` | field 9 (description) | canonical | may carry escapes today: descriptions are free-form C string literals |
| `_handler_cvars.py` | field 10 (default) | canonical | may carry escapes today: this is the F-FTE-01 latent gap target |
| `_handler_commands.py` | arg 0 (cmd name) | canonical | verified-by-inspection: command names are identifier-shaped |
| `_handler_commands.py` | desc arg | canonical | may carry escapes today |
| `_handler_macros.py` | macro name | canonical | verified-by-inspection: identifier-shaped |
| `_handler_macros.py` | desc arg | canonical | may carry escapes today |
| `_handler_ezhud.py` | HUD_Register element name (arg 0) | canonical | verified-by-inspection: identifier-shaped |
| `_handler_ezhud.py` | HUD_Register description (arg 2) | **compact** | description-domain newline collapse intentional |
| `_handler_ezhud.py` | HUD_Register default args (args 7-15, 17+) | canonical | may carry escapes; today values like `"0"`, `"1"`, `"&c69f%T..."` |
| `_handler_ezhud.py` | GetNVFDG name (arg 0) | canonical | verified-by-inspection: identifier-shaped |
| `_handler_ezhud.py` | GetNVFDG default (arg 1) | canonical | may carry escapes |
| `_handler_ezhud.py` | GetNVFDG description (arg 3) | **compact** | description-domain |
| `_handler_ezscript.py` | description args | **compact** | description-domain |
| `_handler_ezscript.py` | value/default args | canonical | may carry escapes |

**Surface widening acknowledged:** S-01b's surface is wider than Mode B's initial inventory (5 private copies, not 3). The lift covers all five; the runbook's positive contract gates only on `flags_raw`. Macros + commands fields (`handler_fn`, descriptions, `default_value` C-escape interpretation, `info_key` / `qc_builtin` canonical name shape) carry no positive contract today; broader positive-contract coverage is candidate work for a future arc, listed in Section 3.2's "candidate positive contracts" list. **Phase 6 scope doesn't expand -- the residual is documented, not missed.**

### 2.5 Other handler/loader modifications (verified locations)

| File | Line | Change |
|---|---:|---|
| `fte/_handler_ezhud.py` | 200 | `"flags_raw": None,` -> `"flags_raw": normalize_flags_raw(None),` (yields `""`) |
| `qwcl/_handler_cvars.py` | 113 | `", ".join(flags_raw_parts)` -> `" | ".join(flags_raw_parts)` (canonical cross-project separator) |

### 2.6 Verification layer

`apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` Section 3.2 splits:

- **3.2.1 Regression bar (minimal patch).** Existing query gains `OR flags_raw IS NULL`. Catches the IS-NULL shape that escaped this time.
- **3.2.2 Positive contract.** For `source_state = 'source_backed'` cvars: `flags_raw` MUST be non-NULL AND (`''` (empty, the post-v17 sentinel) OR match `/^[A-Z0-9_]+( \| [A-Z0-9_]+)*$/`). Output: same shape as existing 3.2 stderr (table-formatted), with per-project + per-source-root breakdown columns when violations fire -- "FTE has 1085 violations in plugin:ezhud" is what makes the finding actionable.
- Section 3.2 footer captures the **candidate positive contracts** list for future runbook expansion: `default_value` C-escape interpretation, `info_key` canonical name shape, `qc_builtin` canonical name shape (post-v18), `handler_fn` shape, description fields.

### 2.7 Grid uplift

`apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` gains:

- **Universal floor (58 probes exactly):** entity_type x {count, source_state} for every entity type each project loads. Per-project breakdown: ezquake +22 (11 entity types x 2), fte +16 (8 types x 2), mvdsv +14 (7 types x 2), qwcl +6 (3 types x 2). Cross-walk is NOT in the floor -- per-project anchor only (mvdsv has scope/channel/table distributions; FTE has engine vs plugin source-root split; ezquake + qwcl have no natural cross-walk dimension).
- **Per-project anchors (exactly 4):**
  - ezquake `gl_lightmode` ping-pong as F1 equality (currently F2 informational).
  - ezquake `doc_only=194` as F1 equality.
  - QWCL all-source-backed invariant: `WHERE source_state != 'source_backed' AND project='qwcl'` returns 0.
  - FTE engine vs `plugin:ezhud` count split as F1 equality.
- Any fifth-or-later anchor candidate goes to HANDOVER (cheap to add later when the invariant actually surfaces).
- **Seed-value pattern:** live-query pattern with hardcoded expected constants in `quality-grid.ts`. Constants set from a one-time pre-Phase-3 `sqlite3 "$DB" "SELECT type, COUNT(*) FROM entities WHERE project=? GROUP BY type"` pass per project. Capture per-project tabular output as a comment block in `quality-grid.ts` near the new probe definitions (audit trail for the magic constants -- future reader reconstructs seed values without a DB query; audit reader verifies seed values match loaded DB at commit time).

### 2.8 No schema migration

The lift convergence emits new-shape rows; the loader's `INSERT OR REPLACE` upsert path overwrites existing per-version rows in place. No backfill needed because no project has historical versions carrying the wrong shape -- FTE is single-version (`build-6698`), QWCL is single-version (`2.33`). A future FTE deep-time walk pre-Phase-6 would need a re-extract pass with post-Phase-6 handlers; that's a deep-time-walk concern, not a Phase-6 concern.

---

## 3. Data flow

### Phase 1 (verification-first, one commit)

```
[runbook 3.2.1 + 3.2.2 written together]
      v
[execute 3.2.2 against current DB]
      v
[baseline violations captured in commit body]
    fte plugin:ezhud -> 1085 source_backed rows with flags_raw IS NULL
    qwcl 2.33       -> N source_backed rows with flags_raw containing ', '
                       (measured by:
                          SELECT COUNT(*) FROM cvar_versions cv
                          JOIN entities e ON cv.entity_id=e.id
                          WHERE e.project='qwcl' AND e.source_state='source_backed'
                            AND cv.flags_raw LIKE '%, %';)
      v
[QWCL widen-or-normalize decision made WITH the N in front of operator]
[unattended-path default: normalize (W3 as written) -- convergence theme,
 fewer special-cases in contract, no QWCL deep-time history. Operator
 can override at PR review.]
```

### Phase 2 (handler convergence, three commits)

```
W1: ezhud handler line 200 fix (1085 rows recovered)
      v python3 fte/extract.py
      v extract-tag --project fte --version build-6698
      v re-run 3.2.2 contract
      v expected: FTE plugin:ezhud violations drop from 1085 to 0
      v commit body captures evidence

W2: lift to _source.py + delete 5 private copies + adopt per audit table
      v python3 fte/extract.py
      v git diff --stat fte/output/   (expected: empty)
      v re-run 3.2.2 contract
      v expected: still zero post-W1
      v commit body captures byte-stable diff proof

W3: QWCL `, ` -> ` | ` join
      v python3 qwcl/extract.py
      v extract-tag --project qwcl --version 2.33
      v re-run 3.2.2 contract
      v expected: QWCL violations drop from N to 0
      v end-of-Phase-2 evidence: zero violations across all four projects
```

**W2 byte-stable diff scope (narrow claim):**
- FTE JSON outputs: zero diff expected (no current FTE value carries an escape, so canonical-form lift produces byte-identical output to pre-lift token-walk).
- QWCL outputs: unchanged (QWCL has no `_concat_string_literals` copies; W3 is the QWCL-side change).
- MVDSV + ezquake outputs: unchanged (not affected by W2).

### Phase 3 (grid uplift, two commits)

```
W5: floor probes (58 across four projects)
      v npm run quality-grid -- --project ezquake (then fte, mvdsv, qwcl)
      v all PASS at equality with current loaded counts
      v commit captures the new probe inventory + per-project seed comment block

W6: per-project anchors (exactly 4)
      v npm run quality-grid for each project
      v all anchor probes PASS
```

Within Phase 3: W5 (floor) before W6 (anchors). Floor establishes equality counts as contract; anchors layer domain-specific invariants on top without conflicting with floor count adjustments.

---

## 4. Error handling + verification

### Per-commit verification gates

| Commit | Pre-commit gate |
|---|---|
| Phase 1 (W4a + W4b) | runbook 3.2.1 + 3.2.2 SQL queries execute cleanly against current DB; baseline violation table captured in commit message body |
| W1 (ezhud) | `python3 fte/extract.py` clean; `extract-tag --project fte --version build-6698` clean; `sqlite3 "$DB" "SELECT COUNT(*) FROM cvar_versions cv JOIN entities e ON cv.entity_id=e.id WHERE e.project='fte' AND cv.flags_raw IS NULL AND e.source_state='source_backed'"` returns `0`; `git diff --stat fte/output/` shows only the 1085 rows getting `flags_raw: ""` |
| W2 (lift + adopt) | all 5 private copies deleted (`grep -c "^def _concat_string_literals" fte/_handler_*.py` returns 0); `python3 fte/extract.py` clean; `git diff --stat fte/output/` empty; 3.2.2 contract still zero violations |
| W3 (QWCL normalize) | `python3 qwcl/extract.py` clean; `extract-tag --project qwcl --version 2.33` clean; 3.2.2 contract zero violations across all four projects (Phase 2 end gate) |
| W5 (floor probes) | `npm run quality-grid -- --project <p>` PASS for all four projects across all new probes |
| W6 (anchors) | `npm run quality-grid -- --project <p>` PASS for all anchor probes |

### Failure paths

- **W1 contract returns non-zero** -> ezhud fix incomplete; investigate which sub-handler bypassed the `normalize_flags_raw` route (ezhud has both `_handle_hud_register` and `_handle_getnvfdg`; the line 200 fix is on the synthesized-row code path that both call into).
- **W2 byte-diff non-empty** -> **PAUSE Phase 6, log finding, decide drain-in-arc or split into parallel arc.** Three sub-cases:
  - (a) Pre-lift `_concat_string_literals` was emitting raw escapes (silent data loss the positive contract didn't catch -- contract is `flags_raw`, not `default_value` / descriptions). Same defense-in-depth gap; likely drain-in-arc.
  - (b) Lift bug -- `concat_string_literals` doesn't compose cleanly with `unescape_c_string` for some token shape; fix.
  - (c) Unrelated extraction non-determinism -- investigate.
  - The W2 gate's value is exactly that it CAN surface (a); finding bugs there is a feature of the gate, not a failure of the plan.
- **W3 contract still non-zero on QWCL** -> check whether some QWCL cvar uses a different separator path the audit missed (other than line 113's `, ` join).
- **Floor probe FAIL** -> seed-value capture was stale; re-run the seed query and update constants. Do NOT silently update -- surface the count change.

**No silent skips.** Every Phase-2 commit must run the contract and capture the result in the commit message body.

---

## 5. Acceptance for the arc (mirrors success condition)

- [ ] Positive contract for `flags_raw` (Section 3.2.2) runs clean across all four projects: zero violations.
- [ ] Zero private `_concat_string_literals` copies remain in `apps/qw-oracle/scripts/extractors/fte/_handler_*.py` (`grep -c "^def _concat_string_literals" fte/_handler_*.py` = 0 across all five files).
- [ ] Zero `flags_raw IS NULL` rows for `source_state = 'source_backed'` cvars across all four projects.
- [ ] QWCL emits canonical ` | ` separator.
- [ ] Quality grid has universal floor (58 entity_type x {count, source_state} probes) across all four projects: ezquake +22, fte +16, mvdsv +14, qwcl +6.
- [ ] Per-project anchor probes shipped: ezQuake `gl_lightmode` ping-pong (F1 equality), ezQuake `doc_only=194` (F1 equality), QWCL all-source-backed invariant, FTE engine-vs-plugin:ezhud count split. Exactly four; any fifth candidate to HANDOVER.
- [ ] `quality-grid.ts` includes a per-project comment block near floor probe definitions documenting seed expected values + date + the SQL query used to derive them (audit trail for the magic constants).
- [ ] Runbook Section 3.2.1 + 3.2.2 documented; "candidate positive contracts" list captures `default_value` C-escape interpretation, `info_key` / `qc_builtin` canonical names, `handler_fn` shape, descriptions as future-arc work.
- [ ] HANDOVER updated with: D.1.8 lifecycle hooks gap (already tracked, restate); broader positive-contract coverage entry -- wording: "broader positive-contract coverage (handler_fn, descriptions, default_value C-escape interpretation, info_key/qc_builtin canonical names) -- see VALIDATION-RUNBOOK.md Section 3.2 'candidate positive contracts' list"; deep-time-walk re-extract obligation note for any future FTE/QWCL historical-version load.

---

## 6. Phase ordering / commit shape

Six commits in one PR-equivalent chunk. Phase 1 = commit 1. Phase 2 = commits 2-4. Phase 3 = commits 5-6.

| Commit | Phase | Work unit | Files touched |
|---|---|---|---|
| 1 | 1 | W4a + W4b runbook updates + baseline violation capture | `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` |
| 2 | 2 | W1 ezhud handler fix | `fte/_handler_ezhud.py:200` + re-extracted FTE outputs |
| 3 | 2 | W2 lift to `_source.py` + delete 5 private copies + adopt per audit | `extractor_lib/_source.py` + 5 FTE handlers + re-extracted FTE outputs (zero diff expected) |
| 4 | 2 | W3 QWCL `, ` -> ` | ` normalization | `qwcl/_handler_cvars.py:113` + re-extracted QWCL outputs |
| 5 | 3 | W5 floor probes + per-project seed comment block | `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` |
| 6 | 3 | W6 per-project anchor probes (exactly 4) | `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` |

**Push** at end of Phase 1 + end of Phase 3 (or single push at end of Phase 3). Six-commit chunk is digestible as one PR-equivalent.

---

## 7. After this arc

- HANDOVER inherits: D.1.8 (restate), broader positive-contract coverage pointer, deep-time-walk re-extract obligation.
- Next likely arc: KTX (tree-sitter) Layer 1 extraction -- separate methodology, separate runbook (`VALIDATION-RUNBOOK-KTX.md` when KTX ships).
- Or: Arc B (ezQuake F-EZQ-01 trailing-comment look-ahead bug + F-EZQ-03 `registration_file` schema rename) -- sequenced after Arc A so its runbook contract update is in place.
- A potential fourth memory in the chain (predictions -> closure-equivalence -> consumer-adoption sweep -> ?) may surface during this arc; keep an ear out. Candidate framing: "verification layer must catch the failure shape lifts can leave behind, not just the failure shapes the prior arc caught."
