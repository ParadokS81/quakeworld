# Handoff: ezQuake cmdline_params help-JSON pass -- ready to execute

**Created:** 2026-05-26 at end of cvar-pass ship session.
**For:** a fresh terminal, cold, executing the cmdline_params doc-verdict pass.
**Supersedes (cmdline parts only):** `docs/superpowers/parking/2026-05-24-handoff-helpjson-cmdline-pass-and-cvar-pr-open.md` -- the cmdline-pass section of that doc is folded in here and the cvar PR section is now obsolete (cvar pass shipped 2026-05-26 as PR #1130).
**Cross-references:**
- `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` (the LOCKED audit rubric, applies to cmdline too)
- `docs/superpowers/parking/2026-05-26-handoff-helpjson-cvar-pr-execute.md` (the just-shipped cvar pass handoff -- methodology source)
- PR #1130 (cvar pass, just opened) -- mirror this PR's shape

---

## One-paragraph state

The cmdline_params pass is the last open sub-pass of the help-JSON-empty-entries audit. Original 2026-05-15 drafts projected 56 entries. The drafts file at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries-cmdline.md` is ~10 days stale (predates PR #1120 and other upstream fills). Apply the corrected empty-desc predicate FIRST to shrink scope cheaply (cvar pass: 124 -> 58 after predicate + directives; expect similar shrinkage here). Then verifier sub-agent fan-out (cvar pass caught 45% needing correction), then walk concerns one-by-one, then standard PR packaging (parser script -> payload JSON -> branch -> per-family commits -> PR + L1 synthesis + snapshot regen). **Estimated ~90 minutes from a fresh terminal**, same shape as the cvar pass that just shipped.

---

## Three audit lessons from the cvar pass (CRITICAL -- read before drafting)

These surfaced during the 2026-05-26 cvar pass and apply directly to the cmdline pass:

### Lesson 1: The audit-predicate bug

The 2026-05-15 audit used `name in help_<type>.json` as the "needs filling" predicate. **This is wrong.** Entries can be IN the file but have `desc` already filled by upstream PRs (PR #1120 etc populated 14 cvar descs between 2026-05-15 and 2026-05-26).

**Corrected predicate:**
```python
def in_scope(name, help_json):
    if name not in help_json.get("cmdline_params", help_json):
        return False  # not in file -- adding new namespace entries is out of scope
    entry = help_json[name]  # or help_json["cmdline_params"][name] -- check schema
    desc = entry.get("desc", "").strip()
    if desc:
        return False  # already documented upstream, drop from queue
    return True
```

**Apply FIRST** before doing any other audit work. The cvar pass discovered this with ~10% of its queue (14 of 140) already filled; expect similar for cmdline given the same 10-day staleness window. Easier to shrink the queue up front than to discover during drafting.

### Lesson 2: Sub-agent verifier must follow platform-conditional code

The cvar pass's verifier sub-agent claimed Windows path for `fs_savegame_home` was `~/ezQuake/...` based on reading `fs.c:766-769`. **Wrong.** That code calls `Sys_HomeDirectory()`, which is platform-specific:
- `sys_win.c:1656` -- returns `CSIDL_PERSONAL` (Documents folder on Windows)
- `sys_posix.c:750` -- returns `getenv("HOME")` on Linux/macOS

So the actual Windows path is `C:\Users\<user>\Documents\ezQuake\<gamedir>\save\` -- not the userprofile root the handoff claimed. Caught only because the operator pasted a screenshot.

**For cmdline pass:** cmdline_params often have platform-conditional registration (`#ifdef _WIN32`, `#ifndef __APPLE__`, etc.) AND platform-conditional behavior. The verifier checklist's `systems_json` check covers registration scope, but not behavior. When drafting prose for any cmdline_param with platform-specific behavior, **follow the source to ALL platform branches** -- not just the first one that looks definitive.

Verifier checklist items to add (cmdline-specific) on top of the cvar pass's 18-point list:
- Platform scope (`#ifdef`, `#ifndef`) verified against `systems_json`
- Default value present in `arguments` JSON matches source
- `-no*` negation behavior verified for inverse flags (e.g., `-nomouse` documented at `mouse` cvar, or as standalone with explicit "disables X" prose)
- Value-vs-flag form: `-data <directory>` (takes arg) vs `-nomouse` (no arg) clearly framed

### Lesson 3: Lookalike entities aren't interchangeable

The cvar pass had `mvd_info_setup` and `hud_teaminfo_layout` -- two cvars with near-identical format strings (`%p%n %l %h/%a %w` shape), both controlling player-info overlays. But the `%p` token works in `hud_teaminfo_layout` (icon draw at `hud_teaminfo.c:508`) and is **dead code** in `mvd_info_setup` (population commented out at `mvd_utils.c:1089-1103`). Operator caught this by screenshotting their actual game and noting the icons; without that, the doc would have repeated the dead-code claim.

**For cmdline pass:** cmdline_params often look similar to cvars with the same name (e.g., `-mouse` cmdline vs `mouse` cvar). When the prose draft references a cvar-side counterpart, verify the relationship is what the draft claims -- some cmdline params are aliases that set the cvar; some are independent; some are documented as obsolete. The `arguments` and `flags` fields in the L1 schema usually disambiguate, but operator-verifying when there's ambiguity is cheap insurance.

---

## Methodology that worked (mirror this for cmdline)

The cvar pass used a parser-driven approach instead of hand-coded payload prose (commands pass did hand-coded). Both work; the parser approach won for the cvar pass because (a) the drafts file IS the source of truth, (b) no transcription risk, (c) the same parser can feed both the upstream PR payload AND the L1 synthesis.

**Reusable scripts:**
- `/tmp/build-variables-payload.py` (cvar parser; cmdline pass clones + adapts patterns + filter logic)
- `/tmp/build-variables-commits.py` (commit-grouping script; clone for cmdline)
- `apps/qw-oracle/scripts/insert-helpjson-synthesis-variables.py` (L1 insert; clone to `...-cmdline_params.py`, switch `type='cvar'` -> `type='cmdline_param'` and table name)

**Family coordination pattern:** when a verifier-flagged concern is part of a multi-cvar family (e.g., `scr_scoreboard_login_*` had 4 members, `gl_powerupshells_*` had 4), rewrite the WHOLE family for cross-reference consistency, not just the flagged member. For cmdline pass, candidate families include any `-no*` / `+x` / `-x` pairs and any platform-suffix families.

**Walkthrough discipline:** one concern at a time with the operator (`feedback_one_question_at_a_time`). Recommend a draft, not just "accept / sharpen / PR-body question" options. The user's principle from the cvar walk: **show usage with examples, drop algorithm prose** -- prefer `cmdline_param -data <directory>` examples over "this parses..." explanations. Captured as `feedback_show_usage_drop_algorithm`.

---

## House style for cmdline_params (different from cvars)

Sampled during the parking-doc audit (2026-05-14). Match per entity-type.

- **Imperative or terse declarative.** "Sets X to Y" / "Enables X" / "Disables X" / "Selects X". Match the form to whether the param takes a value or is a flag.
- **Value-vs-flag form is load-bearing:**
  - `-data <directory>` -- takes a value; describe what the value should be
  - `-nomouse` -- no value (boolean flag); describe what it disables
- **Platform scope when relevant:** "Windows-only" / "SDL2-only" / "Linux/X11 only". `systems_json` provides this; surface it.
- **Negation flags (`-no*`):** if there are 20 `-noX` flags and X is documented as a feature, the `-noX` desc can be a one-liner pointer ("Disables X. See -X cmdline.") OR a small augmented head with member pointers if X is itself a parameter.
- **No upstream-PR-style rationale prose.** Terse, factual, what the user puts on the command line.

---

## Scope (regenerate before firing)

Original 2026-05-15 audit: 56 cmdline_params. After predicate correction + drop-list filter, expect ~30-40 entries (similar shrinkage to cvar's 124 -> 58).

**Pre-flight queue regeneration:**
1. Run the corrected-predicate parser against current `help_cmdline_params.json` (clone the cvar pass's `/tmp/build-variables-payload.py` and adapt the JSON schema).
2. Apply the four exclusion categories:
   - **Already-documented upstream** (filtered automatically by predicate)
   - **`sv_*`** (none expected for cmdline_params, but verify)
   - **Dead-stub** (registered but no read sites)
   - **OUT OF SCOPE** (not in help_cmdline_params.json -- can't add new namespace entries per audit decision #7)
3. Run a verifier sub-agent fan-out over the surviving queue (mirror the cvar pass's 5-sub-agent shape).

---

## First three actions on session start

1. **Read this handoff + the locked audit rubric** (`docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` "House style" and "Verdict rubric" sections) + **the cvar PR (#1130) for shape reference**.

2. **Apply the corrected empty-desc predicate** to the drafts file. Generate the shrunken queue. Reconcile against the live `help_cmdline_params.json` to ensure scope is accurate. The cvar pass shrank 140 -> 58 by this step alone.

3. **Run the verifier sub-agent fan-out** on the surviving queue. Each sub-agent gets a chunk of drafts, the 18-point factual/style/rubric checklist, and the 3 lessons above. Returns VERIFIED / CORRECTION / CONCERN findings with `file:line` evidence.

After those three: walk concerns with operator, generate PR payload, branch + commits + PR, then L1 synthesis + snapshot regen (mirror the cvar pass).

---

## When in doubt

- This pass exists because help-JSON coverage is useful for QW players. Don't over-engineer; ship the entries that have value, route the rest to their proper homes.
- **The PR is one channel; L1 synthesis is the parallel stop-gap.** Even if nano sits on the PR for weeks, Oracle MCP and slipgate-app users see the descriptions today. The two-track architecture is intentional (`reference_l1_snapshot_data_flow`).
- Maintainer review latency: PRs #1127 + #1128 + #1130 are stacking up open. Normal for ezQuake's solo-volunteer review cadence. Don't delay opening the cmdline PR waiting for engagement.
- **The cvar pass shipped 58 entries via PR #1130 + L1 stop-gap (commits `12580984` / `530ae1ec`).** Mirror that shape. The synthesis-fallback CASE in `build-snapshot.ts:193-197` already routes synthesized prose into the slipgate snapshot's `help_desc` field.

---

## Open dependencies

- **Maintainer responses on PRs #1127 + #1128 + #1130** -- 3-5 questions awaiting on each. When responses arrive, may need follow-up commits or PRs; track in HANDOVER small followups.
- **MVDSV describe-fill arc** -- after KTX describe-fill completes, handles all `sv_*` cvars. ezQuake's `help.c:774` filter aligns with this division of responsibility. No cmdline-pass dependency.
- **L1-extractor follow-ups** -- the cvar pass didn't surface new L1 issues beyond the predicate bug. Watch for any cmdline-specific L1 schema gaps during the verifier fan-out.

---

## Closeout: arc-history entry after cmdline ships

Once cmdline PR opens + L1 synthesis lands, the whole **ezQuake help-JSON empty-entries audit arc** can ship to `apps/qw-oracle/docs/arc-history.md` as a single retrospective covering all four passes (verified-dead PR #1126, macros PR #1127, commands PR #1128, cvar PR #1130, cmdline PR #TBD). HANDOVER entry can then be retired.
