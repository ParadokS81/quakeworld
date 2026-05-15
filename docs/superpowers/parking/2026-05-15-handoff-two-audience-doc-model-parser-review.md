> **RESOLVED 2026-05-15.** THE open question settled = **answer #2 (provenance/promotion bug), NOT faithful capture of upstream junk** -- primary-sourced both sides across all extracted tags. The decisive test: upstream `help_variables.json` carries no `desc` (absent / `system-generated:true`) for `extralogname`/`skill`/`mvd_info_setup`/`qtv_sayenabled` AND the "legit-mirror" control `cl_voip_demorecord`, at every tag; our DB has `help_desc` byte-identical to `trailing_comment`, all `description_origin='help_json'`. Mechanism, blast radius (24 live / 47 entities / 502 rows -- reconciles the "498"), the 97%-different two-audience proof, and the recommended arc action are folded into the convergence tracker `2026-05-15-l1-extractor-entity-classification-followups.md` -> "Cvar provenance pass (2026-05-15)". Downstream corrections shipped: RESCAN-banner predicate (`2026-05-14-ezquake-help-json-empty-entries-audit.md`) and memory `reference_ezquake_dual_doc_model`. No code change made (explicitly a landscape task; the extractor revert belongs to the L1-refinement arc). This doc is history; the tracker is live.

# Fresh-terminal handover: the two-audience doc model and what it means for L1 extraction/parser review

**Date:** 2026-05-15. **For:** a fresh terminal, cold, bloated-context reset. **Framing:** this is NOT a bugfix ticket. It is a *landscape-mapping + parser-review-shaping* task. A narrow followup session uncovered a design principle (confirmed by the ezQuake dev) that may invalidate an assumption baked into our L1 extraction/parser. Your job is to map the real picture and decide how it should reshape our extraction/parser review -- starting from one decisive, unresolved verification.

---

## The core discovery (why you're here)

ezQuake has **two documentation surfaces with deliberately different audiences** (confirmed by slime, active ezQuake dev, 2026-05-15):

- `help_*.json` = **user-facing documentation** -- WHAT a cvar/command does, how to configure it. Audience: users.
- source `// trailing comment` = **coder rationale** -- WHY the code does what it does. Audience: developers. Modern norm: do NOT mirror docs into comments; comments explain WHY only.
- This separation is the modern standard; **legacy code is inconsistent** (old code sometimes put real docs in comments). Hence the mess.

A fix shipped earlier 2026-05-15 -- `apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py` -- promotes the trailing comment into the description field when help-JSON has no desc. **Under slime's principle this is conceptually suspect**: it can (a) launder coder notes/FIXMEs into user-facing descriptions, (b) mislabel provenance as `help_json` (curated user doc) when the text is really a code comment, and (c) mask genuine user-doc gaps (the entity still needs real docs; we filled the field with a coder note and stopped flagging it).

## THE open question (unresolved -- do not assume the answer)

DB evidence (ezquake cvars, post-fix): 2110 cvars have BOTH `help_desc` and `trailing_comment`, **all labeled `description_origin='help_json'`**. Of those, **498 have `help_desc` byte-identical to the trailing comment**. A sample of the identical ones contains BOTH legitimate mirrors (`cl_voip_demorecord` -> "Record VOIP in demo.") AND clear coder-junk (`extralogname` -> "no sv_ prefix? WTF!"; `mvd_info_setup` -> "FIXME: non-ascii chars"; `skill` -> "dont delete this variable - it used by mods"; `qtv_sayenabled` -> "allow mod to override GameStarted() logic").

**The unresolved question that determines everything:** are the coder-junk descriptions
1. **faithful captures of genuinely-bad upstream `help_variables.json` data** (our extraction is correct; `description_origin='help_json'` is right; the finding is "ezQuake's own help-JSON contains junk" -> feeds the docs-PR workstream, NOT a parser bug), OR
2. **our promotion fix synthesizing them from the comment and mislabeling provenance** (a real parser/provenance bug -> the promotion should be relabeled `source_inline`, or not promoted into the user-doc field at all so the gap stays visible)?

**This is unverified. Do not assert either answer until you run the decisive test (First action #1).** This session repeatedly caught inference-as-evidence errors; hold the line.

---

## Where things are (shipped + verified this session -- do NOT redo or reopen)

- **Issue A (s_stereo `source_retired` vs `doc_only`):** verified intended no-op. The `3be4d576` retreat fix's temporal rule (latest surviving version-row below HEAD -> `source_retired`) is by design; functionally inert (snapshot + MCP treat doc_only/source_retired identically). No code change. Closed.
- **Issue B (F2.flickering_presence false-positive on ghosts):** FIXED + verified, commit `9a5a0c2d`. F2 now excludes pure help-JSON ghosts by provenance (no `source_file` at any version) instead of the `doc_only` label `3be4d576` invalidated. ezquake F2.flickering FOUND 1 -> CLEAN; other projects unchanged. Closed.
- **Commit `291268bd` hallucination** ("s_stereo is a live Linux-only cvar the extractor is blind to"): RETRACTED, commit `fb633ed0`. Verified: s_stereo was a real Linux/ALSA cvar 2005 (`b8236019`), purged 2013 (`0538d9ae`/`1215c7c3`), gone before earliest extracted tag v3.0 = 2016; zero in source at any tag or upstream/master; the extractor parses Linux as the libclang **baseline** (4-variant union), NOT blind to Linux. **Do not reopen this.**
- **`kick_to_ciscon` (46 entries):** NOT to be hand-verified. It is output of a PAUSED 3-terminal doc-triage sidequest that scanned PRE-FIX L1. A RESCAN-REQUIRED banner was added to `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` (commit `e7dd402a`) specifying the corrected predicate. That triage resumes on its own; not your task.
- Convergence tracker updated + the stale `Cmd_AddLegacyCommand` finding corrected (handler DOES emit `legacy_alias_of`; gap is loader-persistence + schema = arc work) in `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` (commit `fb633ed0`).
- HANDOVER.md has an uncommitted closure line, intentionally entangled with unrelated prior edits -> rides the session-wrap batch. Leave it.

## Verified domain facts (do not re-derive)

- **ezQuake lineage:** FuhQuake continuation (forked ~FuhQuake 0.31, 2004; early commits delete "FuhQuake's useless" files; FuhQuake copyright still in `src/*.c` headers; `EZ_VERSION "0.31"` continues FuhQuake's version line). MQWCL 0.97b is a *feature donor* (HUD, ctab/menus, server+file browser, the `/help /describe` system) ported in 2004-2007 -- NOT the base. Help system: XML from 2004 (`63482d74`), converted XML->JSON wholesale 2015-12-09 (`4d5bfe05`, 11790 lines in one commit). There was NEVER a comment->docs migration.
- **The doc model is TWO orthogonal axes** (not a flat state count):
  - `source_state` (existence axis): `source_backed` / `source_retired` / `doc_only` / `dynamically_registered` (4 values; `types.ts:26`, `SCHEMA.md:74`).
  - doc-coverage (2x2): (`trailing_comment` present?) x (`help_desc` present?).
  - `description_origin` tags provenance (`help_json` vs `source_inline`); set in `derive-entity-description.ts` ~L79-105 (help_desc wins; else trailing_comment fallback; origin='help_json' iff help_desc non-null -- **note this is exactly the mislabel mechanism if the handler pre-promoted comment into help_desc**).
  - Existence is NOT inferable from the comment/help pattern. Only `cvar_versions` (+ `flag_bit`/`token_primitive`/`protocol_message`/`qc_builtin`) carry `trailing_comment`; `command`/`macro`/`cmdline_param` version tables have `help_desc` only (single user-doc surface by schema -- the promotion question is cvar-specific).
- **`source_state_transitions` is not a provenance signal** -- its from/to states are hardcoded branch literals in `diff-versions.ts`. Verify source-backing via `*_versions.source_file`, never the transition log. (Memory: `reference_qw_oracle_transition_log_artifact`.)
- L1 source axis is up-to-date + historically accurate post-`3be4d576` + the all-15-ezquake-tag re-walk (`/tmp/walk-all.log` showed `WALK LOOP COMPLETE`) + the F2 fix.

---

## First three actions

1. **Settle THE open question (decisive, do this first).** For the coder-junk identical cases -- `extralogname`, `skill`, `mvd_info_setup`, `qtv_sayenabled`, plus a few legit-looking ones as control (`cl_voip_demorecord`) -- read the ACTUAL upstream file: `git -C /home/paradoks/projects/quakeworld/research/repos/ezquake-source show HEAD:help_variables.json` and check whether each key's entry literally contains that string.
   - If upstream help_variables.json contains it verbatim -> faithful capture; `help_json` origin is correct; this is an upstream-data-quality finding (feeds docs-PR), NOT a parser bug. Pivot the review accordingly.
   - If upstream has no/empty/different entry and we synthesized it from the comment -> confirmed parser/provenance bug. Then read `_handler_cvars.py` promotion logic + `derive-entity-description.ts` origin assignment and scope the fix (relabel `source_inline` at minimum; consider NOT promoting into the user-doc field so gaps stay visible).
2. Quantify the blast radius of whichever answer (1) gives, project-scoped, primary-source. The 498 byte-identical is a starting count, not the answer -- partition it into legit-mirror vs laundered-coder-note using the upstream diff from action 1.
3. From that, write the *landscape*: how the two-audience principle should reshape extraction/parser review -- specifically the promotion behavior, `description_origin` correctness, and what "documented" must mean for the docs-triage (a trailing comment is NOT user documentation; "has comment" must not suppress a real user-doc gap).

## Reads required

- This doc, fully.
- `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` (convergence tracker -- the home doc; fold findings here).
- `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` (the RESCAN-REQUIRED banner explains the paused triage's corrected predicate -- your landscape connects to it).
- `apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py` (the suspect promotion logic).
- `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts` ~L79-105 (origin assignment).
- Memory: `reference_ezquake_dual_doc_model` (NOTE: its "two surfaces that drift, reconcile/mirror them" framing PREDATES slime's clarification that they are different-audience by design -- your landscape should correct this memory's framing), `reference_ezquake_dev_team` (slime/nano routing), `reference_qw_oracle_transition_log_artifact`.

## Critical rules

- **Verify, don't infer.** The whole prior session was a fight against inference-as-evidence (a hallucinated committed finding; a transition log that looked like it contradicted ground truth; my own confirmation-biased "MQWCL is the base" claim, refuted by git). Primary-source every factual claim (grep / SQL / git), project-scope every DB count (`JOIN entities ... WHERE project=...`).
- **The user's north star:** the qw-oracle is for helping users configure/run Quake. The product question is "do user-facing entities that SHOULD have user documentation actually have it?" A trailing comment is NOT user documentation (slime's principle). Keep the review anchored to this, not to abstract "completeness".
- **No deferral theater.** Resolve findings to a terminal state (real+valuable -> a concrete action/PR we own; not real -> deleted). No "kick to X", no park-for-later. The operator is actively fighting a handover-item pile -- do not add to it.
- DB is Postgres: `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`. ezquake-source repo: `/home/paradoks/projects/quakeworld/research/repos/ezquake-source` (use `git -C`). Solo-dev; Claude runs git silently; commit to `main`; no PR/branch ceremony.
- Do not reopen Issue A, Issue B, or the 291268bd retraction. They are verified-closed. The L1 source axis is correct; this task is about the *description/provenance* axis only.

## When in doubt

A clear "our extraction is faithful; the junk is genuinely upstream" is a valid and valuable outcome -- it redirects the energy to a help-JSON-quality docs-PR instead of a parser change. Do not force a parser-bug conclusion to feel productive. Equally, if it IS a provenance mislabel, say so plainly with the upstream diff as proof. The point of the fresh eyes is an honest landscape, not a predetermined verdict.
