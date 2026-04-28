# FTE @ build-6698 Validation Follow-ups

**Date:** 2026-04-28
**Source report:** `docs/superpowers/reviews/2026-04-28-fte-validation.md`
**Trigger:** validate-extractor skill, Mode B per-project deep validation pass.
**Scope:** FTE handler convergence work surfaced by validation. Companion findings F-FTE-02 + F-FTE-03 are already tracked in HANDOVER under cross-extractor audit D.1.8 + D.8.2; this plan covers only the three drain-in-arc items.

## Context

The FTE Layer 1 extractor passes byte-stability, field-accuracy, and spec-compliance checks. The validation pass surfaced three drain-in-arc findings, all in handler-shape convergence territory. None block downstream consumers today. F-FTE-01 is the most consequential -- the next FTE upstream tag that adds an escape-bearing cvar default will silently surface wrong data without this fix.

## Phase 1: F-FTE-01 -- Adopt `unescape_c_string` in FTE cvars handler

**Goal:** Bring FTE's cvar default-value extraction to the post-v17 representation contract.

**Background:** ezquake / qwcl / mvdsv each call `unescape_c_string(strip_quotes(default_raw))` on the byte-extent read of the second cvar_t INIT_LIST_EXPR field. FTE walks tokens via `cursor.get_tokens()` instead, then strips outer quotes via slicing in a private `_concat_string_literals`. The token-walk approach is structurally sound (and was chosen because FTE's macro families CVARD / CVARFD / CVARAFD / CVARAD all expand to a struct-init that `read_extent` would see as a flat sequence of tokens), but the missing escape-interpretation step is a representation-shape gap.

**Decision point:** two viable approaches.

- **Option A (smaller delta, recommended):** Inline an unescape pass into `_concat_string_literals`. Replace `parts.append(t[1:-1])` with `parts.append(unescape_c_string(t[1:-1]))`. Single import change at the top of `_handler_cvars.py`. Same approach can be applied to the same helper in `_handler_commands.py`, `_handler_macros.py`, `_handler_ezhud.py`, and `_handler_ezscript.py` -- five files in total all carry near-identical helpers. After this, every FTE handler that constructs a string from token spellings interprets escapes consistently.
- **Option B (larger delta, deferred):** Switch FTE cvars to the byte-extent pipeline. Replace `cursor.get_tokens()` + `_concat_string_literals` with `read_extent(source_bytes, fields[N].extent) -> strip_quotes -> unescape_c_string`. This converges the four projects on a single extraction path but requires verifying that FTE's macro-expanded fields[N] extents resolve to non-zero-length spans (they often don't post-expansion -- the whole reason FTE chose token-walking is because zero-length extents cause `read_extent` to return empty strings or wrong content). Likely viable only field-by-field with extent-validity probes.

**Recommendation:** Option A. Single-line patch per helper, immediately closes F-FTE-01 latent gap. Option B can be a separate refactor if the four-project convergence ever becomes load-bearing for shared infrastructure.

**Tasks:**
1. Add `from extractor_lib._cvar_shared import unescape_c_string` to top of FTE handlers that own a `_concat_string_literals` helper: `_handler_cvars.py`, `_handler_commands.py`, `_handler_macros.py`, `_handler_ezhud.py`, `_handler_ezscript.py`.
2. In each helper, change `parts.append(t[1:-1])` (or the slightly-richer ezhud variant on line 87-88) to `parts.append(unescape_c_string(t[1:-1]))`. The ezhud helper currently does its own partial unescape (`replace("\\n", " ")`, `replace("\\t", " ")`, `replace('\\"', '"')`); replace those three lines with the shared `unescape_c_string` call so escape semantics match the rest of the project.
3. Re-run `python3 apps/qw-oracle/scripts/extractors/fte/extract.py --workers 12`. Expected diff: zero rows changed at build-6698 (no current FTE cvar default has escape sequences). Confirm via `git diff --stat apps/qw-oracle/scripts/extractors/fte/output/`. Empty diff = patch is correct AND latent (matches expectation that current snapshot has no escape-bearing defaults). Non-empty diff = the new unescape changes some bytes; inspect those rows individually to confirm they're the expected escape-bearing ones.
4. Verify the loader still loads cleanly (orchestrator-side); no schema impact.

**Acceptance:** patch applied; re-extract produces empty diff at build-6698 (or a validated set of escape-bearing changes); a sentinel synthetic test (introducing a fixture cvar with `\\n` in default and re-running) demonstrates the unescape now interprets correctly.

## Phase 2: F-FTE-04 -- Replace 5-level path arithmetic with explicit anchor

**Goal:** Eliminate the brittle `here.parent.parent.parent.parent.parent` pattern in asset handlers.

**Files:**
- `apps/qw-oracle/scripts/extractors/fte/_handler_asset_cvar_bindings.py:104`
- `apps/qw-oracle/scripts/extractors/fte/_handler_asset_loader_sites.py:482`

Current code:
```python
here = Path(__file__).resolve().parent
monorepo_root = here.parent.parent.parent.parent.parent
candidate = monorepo_root / "apps/qw-oracle/scripts/extractors/fte/output/fte-variables-ast.json"
```

The path arithmetic counts directory levels from `apps/qw-oracle/scripts/extractors/fte/_handler_*.py` up to the monorepo root: `_handler_*.py` -> `fte/` -> `extractors/` -> `scripts/` -> `qw-oracle/` -> `apps/` -> `<monorepo-root>`. That's 6 levels via `.parent`, but the code uses 5 (because `Path(__file__).resolve().parent` already takes the first hop). Counting visually: every `.parent.parent.parent.parent.parent` is a load-bearing maintenance hazard.

**Tasks:**
1. Replace with the same pattern used by ezquake's parallel handlers (cross-check `_handler_asset_*.py` in ezquake/ for the existing convention -- they may use the same 5-level form, in which case fix both projects).
2. Either:
   - **Option A:** Use `Path(__file__).resolve().parents[5]` (explicit count, single token).
   - **Option B:** Anchor to a project-shaped path -- `here.parent.parent.parent.parent` is `apps/qw-oracle/scripts/extractors/`, so `monorepo_root = here.parents[4]` puts the anchor closer to where it's interpreted.
   - **Option C (recommended):** the `candidate` path is just `here.parent / "output/fte-variables-ast.json"` -- there's no need to walk up to the monorepo root and back down. The asset handlers' setup() runs in the same `fte/` directory as the cvars JSON output. Drop the monorepo_root computation entirely.

**Recommendation:** Option C. The asset handlers' `setup()` only needs the project-local output path; the round-trip through the monorepo root is an artefact of an earlier directory layout. Sibling-handler audit suggests ezquake has the same artefact, so a coordinated fix may apply to both projects.

**Acceptance:** asset handlers find the cvar-ident map via the same path as before, no change to extracted `_cvar_ident_map` content, byte-stable re-extract diff.

## Phase 3: F-FTE-05 -- Anchor `_RE_CVARGROUP_IDENT` regex

**Goal:** Defensive anchoring on `_handler_cvars.py:314`.

**File:** `apps/qw-oracle/scripts/extractors/fte/_handler_cvars.py`, line 314.

Current:
```python
_RE_CVARGROUP_IDENT = re.compile(r"cvargroup_\w+")
```

Change to:
```python
_RE_CVARGROUP_IDENT = re.compile(r"^cvargroup_\w+$")
```

Today the regex is iterated over atomic token spellings (line 350-353), so unanchored vs anchored is observably equivalent. Anchoring is a no-cost defensive refactor that prevents future surface area if the regex is reused on a multi-token string.

**Tasks:**
1. Apply the one-line patch.
2. Re-run `python3 apps/qw-oracle/scripts/extractors/fte/extract.py --workers 12`. Expected diff: empty.

**Acceptance:** zero output diff; no behavioural change.

## Out of scope

- F-FTE-02 (`enter_function`/`exit_function` hooks for commands / cmdline / macros): tracked in HANDOVER under cross-extractor audit D.1.8. Adding hooks is medium-effort (per-handler refactor + `_func_stack` plumbing + every emit site needs `enclosing_function` populated). Best handled as a coordinated cross-extractor convergence arc that includes mvdsv commands, not a single-file FTE patch. Not actioned here.
- F-FTE-03 (no `validation-fixtures/` directory): tracked in HANDOVER under cross-extractor audit D.8.2. Capture requires running an actual FTE binary, dumping cvarlist + cmdlist, committing the output. Operator-driven, periodic; not a code patch.
- D.2.3 asset-handler 17-helper lift: re-confirmed during this validation pass that the closure-equivalence break is still real (project-specific data tables). Deferral remains correct; no action.

## Estimate

- Phase 1: ~30 minutes (5 single-line changes + import + re-extract verify).
- Phase 2: ~15 minutes (2 single-line changes + re-extract verify; possibly extend to ezquake if same shape exists there).
- Phase 3: ~5 minutes.

Total: ~50 minutes. Best executed as a single PR after orchestrator's cross-project synthesis.
