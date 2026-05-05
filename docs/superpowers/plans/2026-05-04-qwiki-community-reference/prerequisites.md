# Prerequisites -- Task 0 (operator-driven, before Phase 1)

These are one-shot operator-side steps that the agentic loop cannot do. Most are inherited from the qw-oracle Arc 1 setup -- if Arc 1 has shipped, the local-dev environment is already in place.

Run through this list once. Check off items already satisfied; act on the rest.

---

## Local-dev environment (required before Phase 1)

- [ ] **WSL2 Ubuntu shell accessible.** All work happens here.

- [ ] **Postgres dev container running.** Test: `docker ps | grep qw-oracle-postgres` returns a running container, OR `docker compose -f apps/qw-oracle/docker-compose.dev.yml ps` shows postgres up. (Inherited from Arc 1.)

- [ ] **`apps/qw-oracle/.env` populated** with at minimum:

  ```
  DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle
  ```

  (Inherited from Arc 1. Voyage API key is also expected to be present from Arc 1; this arc does not add new vector embeddings, so embedding env vars are not strictly required for Phase 1-7 of this arc.)

- [ ] **Snapshot intact** at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`. Verify:

  ```bash
  ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/
  cat apps/qw-oracle/data/wiki-snapshots/2026-05-04/manifest.json
  ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ | wc -l   # expect 9173
  ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/templates/ | wc -l  # expect 767
  ```

  If any of these mismatch, Phase 0 has to re-run before Phase 1 can start. (Phase 0 fixes the slug-collision and redirect-empty issues regardless; this check is for catastrophic loss only.)

- [ ] **Working tree is the main tree** at `/home/paradoks/projects/quakeworld/`. Per project git workflow, all qw-oracle work happens in the main tree by default. No worktree creation needed.

---

## Decision deferrals (operator clarifies on demand, not now)

These are items that the phase drafter may surface as open questions:

- [ ] **Snapshot commit policy.** Phase 0 deliverable. Default recommendation: commit (compresses to ~10 MB; rarely changes; provides historical record). Alternative: gitignore.

- [ ] **Substantive threshold tuning.** Phase 2 first run produces actual `is_substantive=true` count; operator may push tighter or looser before Phase 3/4 reuse the heuristic.

- [ ] **`has_note` prose-content rule tuning.** Phase 2 first run produces actual `has_note=true` count; operator inspects emitted notes and tunes the rule once before Phase 3/4 reuse.

- [ ] **Single-arc vs defensive split.** Operator stated preference is single-arc (Phases 0-7 in one arc). Phase 4's tournament pilot is the natural decision point if Phase 4 risk seems higher than expected -- arc-orchestrator may surface a split recommendation at that moment.

---

## Production / deploy prerequisites

This arc does NOT introduce new deployment surface. The MCP server already runs in production (Arc 1 ship). New tools (Phase 6) become available after the production container rebuilds and restarts.

If Phase 6 introduces new tools that require a deploy, the existing qw-oracle deploy runbook (`apps/qw-oracle/DEPLOYMENT.md`) covers the rebuild. No separate deploy prerequisites for this arc.

---

## What this list deliberately does NOT include

- Anything the agentic loop can do (running migrations, running parsers, emitting notes, building snapshots, restarting the MCP server).
- Anything that gets created by the phases themselves (migration SQL, parser scripts, note-emitter scripts, MCP tool implementations, primer artifact).
- Snapshot re-fetching (Phase 0 handles this; not an operator-side prereq).

---

## Sign-off

When all "Local-dev environment" boxes are checked, the arc can start. Phase 1 needs the schema migration to apply cleanly; operator runs the verification at Phase 1 boundary before signing off and moving to Phase 2.

If a prerequisite blocks a phase mid-execution, the phase pauses at the relevant task and waits.
