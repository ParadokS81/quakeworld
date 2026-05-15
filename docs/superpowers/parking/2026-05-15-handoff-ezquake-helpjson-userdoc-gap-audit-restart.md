# Fresh-terminal handover: RESTART the ezQuake help-JSON user-doc-gap audit (on corrected foundation)

**Date:** 2026-05-15. **For:** a fresh terminal, cold. **Framing:** this is a *restart*, not a resume. A prior multi-terminal run of this audit produced verdicts against (a) a wrong predicate ("a source `// comment` counts as documentation") and (b) pre-fix corrupted L1. Both root causes are now fixed and verified-shipped 2026-05-15. Discard all prior verdicts; regenerate the queue from clean L1; keep the toolkit.

## Mission

For every ezQuake help-JSON entity (`cvar` / `command` / `macro` / `cmdline_param`) that is **alive in source HEAD** and **genuinely lacks USER documentation** (help-`*`.json prose), produce one of four verdicts with primary-source evidence. Deliverables are upstream-doc-PR material. The product north star: *do the cvars/commands a user would actually configure have user-facing docs?* -- not abstract completeness.

## Why this is a restart (load-bearing; read the cited docs, do not re-derive)

ezQuake has **two documentation surfaces with deliberately different audiences** (confirmed by slime, active ezQuake dev): `help_*.json` = USER docs (WHAT); source `// trailing comment` = CODER rationale (WHY). They are not mirrors -- primary-sourced, 97% of ezQuake cvars carrying both have genuinely different text. The prior audit (and a since-removed extractor "promotion" fix) treated a comment as documentation, which laundered coder notes into the user-doc field, mislabeled provenance, and **masked the very gaps this audit exists to find**. The promotion was removed and all 15 ezQuake tags re-walked + verified (commits `dc50b3ef` / `1f0227f5` / `99c21532`, 2026-05-15). L1 is now clean foundation.

## THE corrected predicate (this is the one thing that changed -- internalize it)

**"Documented" = a genuine help-JSON user-doc surface (`help_desc` / `help_remarks` / `help_values`) is non-empty.** On the corrected L1 this is now directly expressible by provenance:

- `description_origin = 'help_json'` -> has genuine user doc -> **NOT a gap**.
- `description_origin = 'source_inline'` (comment-derived) **OR `NULL`** (no desc at all) -> **NOT user-documented -> a gap candidate**.

A trailing comment is coder rationale, never user documentation. It may *inform* the human's `needs_doc` vs `no_doc` decision; it never closes the gap and never suppresses the flag.

## The four verdict buckets (corrected)

1. **needs_doc** -- a user would want to know what this does; draft a description in house style.
2. **no_doc** -- coder-only / mod-internal / self-evident (e.g. `skill` = "dont delete this variable - it used by mods"; users never set it). A per-entity *curatorial* judgment, recorded in the classification seed. "Lazy dev" is **not** a bucket -- convention drift over a 20-year codebase is the cause, not laziness.
3. **family_collapse** -- N siblings share one description on the family head.
4. **route-upstream** -- meaning genuinely unclear from source: surface the question. Route by provenance: ezQuake-native -> nano (head dev) / slime; `sv_*` -> MVDSV source (it flows to ezQuake on import). **ciscon is QWiki/community, NOT an ezQuake-doc target** -- the legacy "kick_to_ciscon" vocabulary is mis-addressed; relabel by provenance.

## Verified anchors (sanity-check your regenerated queue against these; if wildly off, STOP and diagnose before triaging)

Post-fix, ezQuake **cvars** alive + source-backed at HEAD = **2741**. Of those: **2012** documented (`help_json`); **729 raw gaps** (`origin <> help_json`) = **708 NULL-origin (no desc at all) + 21 source_inline (comment-only, e.g. `extralogname`)**; **~101 of the 729 are `sv_*`** (MVDSV-provenance -- route there, the audit's existing `sv_*` filter handles this). The audit's HUD-family auto-gen filter (`_align_x`/`_color_*`/`_draw`/...) then reduces the ezQuake-owned cvar triage queue toward the ~128 ballpark in the audit doc's Scope table. **`command` / `macro` / `cmdline_param` were NOT affected by the promotion** (their version tables have no `trailing_comment` column) -- those queues only need recompute against the retreat-corrected entity set, verdicts otherwise stand structurally.

## First three actions

1. Read `2026-05-14-ezquake-help-json-empty-entries-audit.md` fully (workflow, locked verdict rubric, house style, and the **CORRECTED RESCAN-banner predicate** -- that banner is now authoritative). Regenerate the queue from current L1 using the corrected predicate. Sanity-check against the anchors above (raw cvar gap ~= 729).
2. Confirm the foundation fix is reflected before triaging: `extralogname` / `timeout` / `maxfps` must appear **as gaps** (`source_inline`, comment != doc); `skill` and `cl_voip_*` must **not** (genuine help-JSON). If any comment-bearing cvar is being treated as "documented", the predicate is still wrong -- halt and diagnose, do not triage on it.
3. Run the verdict pass per the locked rubric, per-entity, primary-sourced against `research/repos/ezquake-source` HEAD. Surface (do NOT pre-bake) the 6 rubric refinements the paused terminal proposed; get operator sign-off before applying them.

## Reads required

- `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` -- THE primary doc: workflow, locked rubric, house style, corrected RESCAN predicate.
- `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` -> "Cvar provenance pass (2026-05-15)" SHIPPED block (what changed in L1 + verification) and the Macros "VERIFIED NON-FINDING" note.
- Memory `reference_ezquake_dual_doc_model` (two-audience principle, corrected) and `reference_ezquake_dev_team` (routing: nano/slime, never ciscon).
- Tooling (reusable, do not rebuild): `apps/qw-oracle/scripts/classify-help-json.py`, `apps/qw-oracle/scripts/build-help-json-pr-digest.py`, seed `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml`, aggregate deliverables `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries{,-commands,-macros,-cmdline}.md`.

## Critical rules

- **Verify, don't infer.** This restart exists *because* inference-as-evidence corrupted the prior pass. Every factual claim is grep/SQL/source-confirmed; every DB count is project-scoped. A dispatched-terminal/sub-agent claim is a hypothesis until you verify it (a "teamplay_restricted is inverted" claim from the paused run was checked against `src/teamplay.c` and is a **CLOSED non-finding** -- do not resurrect it).
- **A trailing comment is NOT user documentation** (slime's principle). "Has a comment" must never suppress a user-doc-gap flag.
- **No deferral theater.** Every queue entry resolves to a terminal verdict. Nothing "kicked to X"; route by provenance.
- **Routing:** ezQuake-native -> nano/slime; `sv_*` -> MVDSV upstream; ciscon is QWiki/community, never the ezQuake-doc target.
- DB is Postgres: `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`. ezQuake source: `git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source`. Solo-dev; Claude runs git silently; commit to `main`; no PR/branch ceremony.

## When in doubt

The question is user-facing documentation coverage. "This has a comment but no user doc, and a user would want to know what it does -> needs_doc" is the common case; "coder-only, no user would ever set this -> no_doc" is the other; don't force-fit between them, and don't treat the comment's existence as the answer. `sv_*` is MVDSV's to document, not ezQuake's. A clean "the audit queue is correct and the verdicts are honest" beats a fast pass that re-imports the old framing.
