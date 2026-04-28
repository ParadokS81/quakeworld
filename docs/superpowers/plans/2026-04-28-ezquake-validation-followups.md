# ezQuake Validation Follow-ups (2026-04-28)

**Source report:** `docs/superpowers/reviews/2026-04-28-ezquake-validation.md`
**Trigger:** per-project deep validation (Mode B) of ezQuake@head, schema v18.
**Scope:** drain the two drain-in-arc findings from the validation pass plus one drain-now markdown patch.

## Phase 1 -- Trailing-comment scan robustness (F-EZQ-01)

**Problem.** `_handler_cvars.py:_attach_trailing_comments` (lines 624-660) probes `source_line + 0`, `+1`, `+2` looking for `// ...` after `};`. When a cvar's own line has no inline comment AND a later cvar within 2 lines DOES have a comment, the wrong comment is grabbed. Quantified: 78 of 230 (~34%) cvar rows with non-empty `trailing_comment` at head are misattributed.

**Concrete example** (`scr_cursor_alpha` at cl_screen.c:122):
```
121: cvar_t scr_cursor_iconoffset_y = {"scr_cursor_iconoffset_y", "0"};
122: cvar_t scr_cursor_alpha        = {"scr_cursor_alpha", "1"};        <-- THIS row's source_line
123: <blank>
124: cvar_t scr_showcrosshair       = {"scr_showcrosshair", "1"}; // so crosshair does't affected ...
```
The DB attaches `scr_showcrosshair`'s comment to `scr_cursor_alpha`. Wrong.

**Why the look-ahead exists.** 1437 of 2733 head cvar registrations span multiple lines (closing `};` on a line after `source_line`). The look-ahead is needed for true multi-line struct inits (e.g. `r_aliasmodel.c:111-112` for nested cvar tables). Removing the look-ahead is not an option.

**Fix.** Two-rule clamp:

1. Stop probing after the first probe line that contains `};` (we've seen the close).
2. If a probe line contains a fresh `cvar_t ... = {` (regex matching `\bcvar_t\s+\w+\s*=`), abort the probe -- we've crossed into the next cvar's registration without finding our own close.

Pseudocode:
```python
def _attach_trailing_comments(cvars, ezq_src):
    file_cache = {}
    attached = 0
    next_cvar_re = re.compile(r"^\s*(?:static\s+)?cvar_t\s+\w+\s*=")
    for cv in cvars:
        # ...existing file-cache lookup...
        seen_close = False
        for probe in (cv["source_line"], cv["source_line"] + 1, cv["source_line"] + 2):
            idx = probe - 1
            if idx < 0 or idx >= len(lines):
                continue
            l = lines[idx]
            # Rule 2: stop if we've reached a fresh cvar_t registration line.
            # (Skip the cvar's own line -- probe == source_line -- which always
            # contains its own `cvar_t name = ` and would otherwise abort.)
            if probe != cv["source_line"] and next_cvar_re.match(l):
                break
            close_idx = l.rfind("};")
            if close_idx >= 0:
                tail = l[close_idx + 2:]
            else:
                semi_idx = l.rfind(";")
                tail = l[semi_idx + 1:] if semi_idx >= 0 else l
            tail = tail.strip()
            if tail.startswith("//"):
                cv["trailing_comment"] = tail[2:].strip()
                attached += 1
                break
            if tail.startswith("/*"):
                end = tail.find("*/", 2)
                cv["trailing_comment"] = (tail[2:end] if end >= 0 else tail[2:]).strip()
                attached += 1
                break
            # Rule 1: if we just saw `};`, do not extend the probe to subsequent lines.
            # The closing brace marks end-of-this-cvar; anything past is foreign.
            if close_idx >= 0:
                seen_close = True
                break
    return attached
```

Note Rule 1's `break` is conservative -- it stops on the first `};` regardless of whether the `tail.startswith("//")` matched. For the legitimate multi-line cases (closing `};` on line `+1` or `+2`), the comment-after-`};` IS the closing line's tail, so the `if tail.startswith("//"):` branch fires and the function returns naturally. The `seen_close` variable is technically redundant given the early-break; simplify by removing it.

**Implementation steps.**

1. Edit `apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py:_attach_trailing_comments` (lines 624-660) per the fix above.
2. Re-run `python3 apps/qw-oracle/scripts/extractors/ezquake/extract.py --workers 12`. Verify wall time roughly unchanged (~29s).
3. `git diff --stat apps/qw-oracle/scripts/extractors/ezquake/output/` -- expected diff: `ezquake-variables-ast.json` changes; `trailing_comment` field on ~78 entries goes from a wrong neighbour-comment to empty string. No other extractor outputs change (the fix is scoped to cvars).
4. Spot-check: `scr_cursor_alpha`, `cl_delay_packet_deviation`, `sys_command_line`, `cl_nofake`, `bgmvolume`, `cl_camera_tpp_distance`, `con_notify`, `gl_lightning_size` -- should all have their incorrect comments cleared. Adjacent legitimate cases like `r_tracker_positive_enemy_suicide` (vx_tracker.c:123, comment on its own line) and `bgmvolume` (snd_main.c:85, comment on its own line) should retain their correct comments.
5. Re-run `npm run load-knowledge -- load-version --project ezquake --version head --type cvar --json apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-variables-ast.json --commit bea2515d0511bdf250dee43f0df7c4ace3fdfc17 --ordinal 999999` (orchestrator step; subagent does not run loaders).
6. Verify post-load DB: count of `trailing_comment != '' AND trailing_comment IS NOT NULL` for `ezquake@head` should drop from 281 to ~152 (the previously-correct rows survive; misattributed ones are now empty). Spot-query `scr_cursor_alpha` to confirm `trailing_comment IS NULL OR trailing_comment = ''`.

**Testing.**

- F1.ezquake.cvar_count probe: expected unchanged (rows themselves don't disappear, only `trailing_comment` field changes).
- New F1 probe to add (optional): `F1.ezquake.cvar_trailing_comment_count` asserting ~152 rows have non-empty trailing_comment at head. Prevents regression of this fix.

**Risk.** Low. The fix is local (one helper function), test surface is the 230 currently-non-empty trailing_comment rows, and the failure mode (false-positive comment attribution) is the most visible bug in the cvar-display surface. Wrong trailing_comment leaks into Layer 2 lookup display and into the Slipgate Config Viewer's "blame line" -- operator-facing. Worth fixing.

**Acceptance.** Empty git diff against re-extract is NOT expected for this phase (the phase exists to PRODUCE a diff). After the diff lands and the loader run completes, subsequent re-extracts must be byte-stable (Section 1.1 from VALIDATION-RUNBOOK.md must pass).

## Phase 2 -- `registration_file` column rename (F-EZQ-03)

**Problem.** `command_versions.registration_file` and `macro_versions.registration_file` are TEXT columns whose name implies "file path" but whose data is "enclosing function name" (e.g. `CL_InitInput`, `Cvar_Set_ex_f`). The schema and the loader (`load-commands.ts:35`, `load-macros.ts:38`) agree on this misnomer. `hud_element_versions` already has a properly-named `enclosing_function` column (load-hud-elements.ts:33), so the precedent for the correct name exists.

**Two options.**

A. **Rename `registration_file` -> `enclosing_function`.** Single column, semantically accurate. Schema migration territory.
B. **Add a real `registration_file` column AND keep `enclosing_function` separate.** Two columns. More schema surface; arguably useful if any future caller wants the source file path that's already stored in `source_file` (which is the actual file).

I recommend Option A. The `source_file` column already carries the C file path; a second "file" column adds nothing. Operators reading `registration_file` today and getting `CL_InitInput` are confused; renaming clears the confusion.

**Implementation steps (Option A).**

1. Add a v19 migration in `apps/qw-oracle/scripts/load-knowledge/schema.ts`. SQL:
   ```sql
   ALTER TABLE command_versions RENAME COLUMN registration_file TO enclosing_function;
   ALTER TABLE macro_versions   RENAME COLUMN registration_file TO enclosing_function;
   ```
   SQLite supports `ALTER TABLE ... RENAME COLUMN` since 3.25.0; better-sqlite3 11 ships SQLite 3.x well past that. No table rebuild needed.
2. Update `apps/qw-oracle/scripts/load-knowledge/types.ts`: rename `CommandVersionRow.registration_file` -> `enclosing_function`; same for `MacroVersionRow`.
3. Update `apps/qw-oracle/scripts/load-knowledge/load-commands.ts:35`: change `registration_file: ast?.enclosing_function ?? null` to `enclosing_function: ast?.enclosing_function ?? null`.
4. Update `apps/qw-oracle/scripts/load-knowledge/load-macros.ts:38`: same.
5. Update `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`: `upsertCommandVersion` and `upsertMacroVersion` INSERT columns and named-param keys.
6. Update `e2e-verify.md` and any quality-grid probes referencing the old column name (grep `registration_file` across `apps/qw-oracle/`).
7. Bump SCHEMA_VERSION to 19 in schema.ts.
8. `bunx tsc --noEmit` from `apps/qw-oracle/` to confirm types compile.
9. Run `npm run load-knowledge -- ...` for any test version (ezquake@head sufficient) to verify the migration applies and the new column populates correctly.

**Testing.**

- DB probe: `SELECT enclosing_function FROM command_versions WHERE entity_id = (SELECT id FROM entities WHERE project='ezquake' AND type='command' AND name='+forward')` should return `CL_InitInput`.
- `bunx tsc --noEmit` clean.
- F1 quality-grid all PASS.

**Risk.** Low. SQLite `ALTER TABLE ... RENAME COLUMN` is well-tested. The TS-side change is mechanical (rename + type update). No data reshape required.

**Acceptance.** Schema migration applies cleanly; loader code TS-types compile; `enclosing_function` column populates correctly on re-load; `registration_file` is gone.

## Phase 3 -- OUT_OF_SCOPE.md path correction (F-EZQ-05)

**Problem.** `apps/qw-oracle/scripts/extractors/ezquake/OUT_OF_SCOPE.md:40` references `extractor_lib/handler_cvars.py` which no longer exists. The handler was relocated to `ezquake/_handler_cvars.py` in the consolidation arc.

**Implementation.** One-line fix:

```diff
-**Note:** the underlying HUD elements ARE in the DB under `type='hud_element'`. The associated cvars (e.g. `hud_netgraph_show`, `hud_netgraph_pos_x`) ARE captured via `_synthesize_hud_cvars()` in `extractor_lib/handler_cvars.py`. Only the runtime `+/-` command-alias bindings are absent.
+**Note:** the underlying HUD elements ARE in the DB under `type='hud_element'`. The associated cvars (e.g. `hud_netgraph_show`, `hud_netgraph_pos_x`) ARE captured via `_synthesize_hud_cvars()` in `apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py`. Only the runtime `+/-` command-alias bindings are absent.
```

Also bump the "Last reviewed" date and the stale entity count (3849 -> 4042) at the top of the file. F-EZQ-04 was dispositioned HANDOVER but it's fine to combine into this phase since it's the same file edit.

**Testing.** None -- markdown only.

## Phase ordering

Phases 1 and 2 are independent and can ship in either order. Phase 1 fixes a 34% data-quality bug (high value); Phase 2 improves operator query ergonomics (medium value). Phase 3 is a small markdown patch (low value but trivial).

Suggested order: **Phase 3 first** (cleanup), **Phase 1 second** (high-value data fix), **Phase 2 third** (schema migration takes more verification). All three should fit into one arc.

Plus the orchestrator-tracked drain-now items from the cross-extractor audit (D.1.7 mvdsv field-name rename) which are independent and unaffected by these phases.

## Out of scope for this arc

- **F-EZQ-02** (no validation-fixtures for ezquake) is HANDOVER; capturing a runtime cvarlist + cmdlist dump from a reference build is a substantial effort and was already deferred in the cross-extractor audit's D.8.2.
- **F-EZQ-04** (OUT_OF_SCOPE.md "3849 entities" stale) -- folded into Phase 3 as a bonus edit; otherwise HANDOVER.
- The 14 historical-version rows for `sv_demoregexp` and the broader "pre-v17 versions still carry NULL flags_raw / raw escapes" backlog -- orchestrator-side decision whether to re-load all 14 historical ezquake tags. Not part of this arc.

## Estimated cost

- Phase 1: ~30 minutes implementation + 30 minutes verification (re-extract + spot-check + re-load).
- Phase 2: ~45 minutes implementation + 30 minutes verification (migration + tsc + re-load + DB probes).
- Phase 3: ~5 minutes.

Total: ~2.5 hours.
