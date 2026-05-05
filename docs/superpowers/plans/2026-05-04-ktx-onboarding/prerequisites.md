# Prerequisites -- Task 0 (operator-driven, before kicking off any phase)

KTX onboarding rides on top of the qw-oracle Arc 1 infrastructure that landed at `oracle.slipgate.me/mcp`. Most prerequisites are already satisfied; this list captures the few KTX-specific items the agentic loop cannot auto-resolve, plus the inheritance check.

These take ~15-30 minutes total. Run through once before kicking off Phase 0.

---

## Inherited from qw-oracle Arc 1 (verify still satisfied)

These should all be in place from Arc 1; spot-check before Phase 1 fires.

- [ ] **Postgres dev container running.** From WSL: `docker ps --format '{{.Names}} {{.Status}}' | grep qw-oracle-postgres-dev` should report `Up ... (healthy)`.
- [ ] **Migrations 001-007 applied to dev DB.** `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations ORDER BY applied_at"` should list 001 through 007. Phase 1 of THIS arc lands 008/009/010.
- [ ] **`bun --version` >= 1.3** in WSL. (`bun` is the canonical script runner per Arc 1 D2; KTX onboarding follows the same.)
- [ ] **`apps/qw-oracle/.env` populated** with `DATABASE_URL` (dev DB connection string) at minimum. KTX onboarding does NOT need new env vars; the existing Voyage / embedding env vars are not load-bearing for any phase in THIS arc (no embedding work; KTX rows ride existing description-derivation when arc execution completes).

If any inherited item is missing, fix before starting Phase 0. If a major component is broken (container won't start, migrator complains, etc.), surface to operator -- KTX onboarding cannot proceed without the Arc 1 foundation.

---

## KTX-specific prerequisites (required before Phase 1)

- [ ] **KTX research repo cloned locally.** The repo lives at `/home/paradoks/projects/quakeworld/research/repos/ktx/`. Verify with `ls research/repos/ktx/src/world.c research/repos/ktx/include/g_local.h` -- both should exist.
- [ ] **KTX upstream is QW-Group/ktx.** Confirm with `git -C research/repos/ktx remote -v`. Should show `origin` pointing at `https://github.com/QW-Group/ktx` (or git@ equivalent).
- [ ] **KTX tag floor pre-resolved (operator decision).** Per Pass 2.3a of the spec, the tag floor for the historical walk is initially guessed at `1.40` (2020) or `1.41` (2022); pre-2020 tags may have C-style issues. The actual floor is resolved during arc execution Phase 0/1 spike (walk back tag by tag, stop at first tag where libclang fails to parse without major handler changes). Operator confirms the floor at execution time, NOT at scaffold time. **Default for arc-planner:** treat the floor selection as a known unknown. Phase 1 ships HEAD-only walk first; historical walks land later.

  Operator notes about KTX historical walk (write here if any):
  ```
  (currently empty; fill in during execution if surprises surface)
  ```

- [ ] **Latest KTX stable tag confirmed.** Per spec preamble: 1.46 (2025-09-14) is the latest. Verify with `git -C research/repos/ktx tag --sort=-creatordate | head -5`. Any newer tag means the arc target should bump to it (operator decision).

---

## Tooling already in place (verification, no action needed)

These were set up during Arc 1 / earlier engine ports; no re-install needed.

- [ ] **libclang + python3-clang installed.** `python3 -c "import clang.cindex; print(clang.cindex.Config().get_cindex_library())"` should print a path without error. Per `reference_libclang_ezquake_extraction.md` memory.
- [ ] **Python `xml.etree.ElementTree`** is stdlib (Python 3.x); no install needed. Used by Phase 6 match_event handler.
- [ ] **postgres-js + bun-types** are in `apps/qw-oracle/package.json` (Arc 1 Phase 1).
- [ ] **EXTRACTOR-PLAYBOOK.md and VALIDATION-RUNBOOK.md** exist at `apps/qw-oracle/scripts/extractors/`. Phase 8 amends them; Phase 7 references the runbook.

---

## Decision deferrals (operator clarifies on demand, not now)

These are things the phase drafter may ask about. Pre-decide if you want to short-circuit them; otherwise the phase MD will surface them as open questions.

- [ ] **HEAD vs historical walk scope.** Default: HEAD only for first KTX landing (~tag 1.46). Historical tags walked in a follow-on landing once HEAD-only proves stable. Skip if operator wants both in Phase 1.
- [ ] **OUT_OF_SCOPE.md format.** Default: per-item section with `## <token>`, `**Why skip:**`, `**Source:**` (file:line), `**Related:**`. Skip if operator has a different convention from prior engines (verify against existing OUT_OF_SCOPE.md files).
- [ ] **F1 probe naming convention for KTX.** Default: mirror existing `F1.<project>.<kind>.<predicate>` shape (e.g., `F1.ktx.cvar.source_state`, `F1.ktx.match_event.attribute_count`). Skip if operator wants a different namespace.

---

## What this list deliberately does NOT include

- Anything the agentic loop can do (running migrations, running extract-tag, running loaders, running tests, building images locally).
- Anything that gets created by the phases themselves (handler files, loader files, migration SQL, OUT_OF_SCOPE.md).
- Cleanup / rollback steps. Each phase lands a commit; if a phase needs to be rolled back, `git revert` is the path. The prod-update-lifecycle spec (`2026-05-04-oracle-prod-update-lifecycle.md`) documents the three rollback tiers for the eventual prod deploy; nothing arc-specific to add here.
- Voyage API key. KTX onboarding ships zero new entity descriptions for embedding; reuses existing description-derivation infrastructure. Voyage is touched only at consumer-snapshot regen time, which is decoupled from this arc per the lifecycle spec.

---

## Sign-off

When all "Inherited from qw-oracle Arc 1" boxes are checked AND all "KTX-specific prerequisites" boxes are checked, Phase 0 drafting can start.

If a prerequisite blocks a phase that's already started, the phase pauses at the relevant task and waits.
