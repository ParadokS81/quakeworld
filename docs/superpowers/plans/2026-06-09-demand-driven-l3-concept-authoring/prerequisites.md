# demand-driven L3 concept authoring -- prerequisites (operator-side Task 0)

Most of this arc runs against the existing qw-oracle dev stack, so setup is light and largely already satisfied. Confirm these before Phase 0; the runner + gate depend on the dev DB and (for realistic scoring) embeddings.

## Must exist before Phase 0

1. **qw-oracle dev Postgres up, full stack loaded.** Postgres 16 + pgvector running locally, with L1 (`entities` + `*_versions`), L2 (`chat_threads` + `thread_messages`), and L3 (`concepts` + `concept_chunks`) populated. The harness retrieves against this via the live MCP tool functions; the 3 existing concept notes (weapon-scripts, player-skins, lightning-gun-customization) must be loaded -- they are the Phase-0 verification fixtures.

2. **`apps/qw-oracle/.env` configured.** `DATABASE_URL` -> dev `qw_oracle` (the harness scripts read `process.env.DATABASE_URL`). Tests pin `qw_oracle_test` -- do not point them at dev.

3. **Bun installed.** Everything here runs under Bun (`bun run load-concepts`, `bun scripts/.../*.ts`). npm is not an option in `apps/qw-oracle/` (D13).

## Recommended (for realistic gate scoring)

4. **`VOYAGE_API_KEY` in `.env`.** Notes load + are FTS-retrievable without it (D13), but the harness retrieval is hybrid (vector + FTS), so a key makes gate scoring reflect production retrieval. Two embedding models are configured (`voyage-4-large` build / `voyage-4-lite` query). Without the key, the gate runs FTS-only -- usable for a first pass, weaker as a final signal. Backfill vectors with `bun run embed:chunks` once the key is present.

## Already in place (no action -- listed for the executor)

5. **Cluster JSON.** `apps/qw-oracle/scripts/calibration/scratch/faq-clusters.json` (the domain -> threadIds source, K=48) is committed. `faq-cluster-coarse.ts` regenerates it deterministically (seed 42) if needed.

6. **Harness scratch scripts.** `apps/qw-oracle/scripts/calibration/scratch/faq-hypothesis-test/` holds the POC (`faq-retrieve.ts`, `faq-verify*.ts`, `faq-domains.ts`) + the committed `outputs/` run snapshot. Phase 0 generalizes these (D12).

7. **Workflow capability.** The programmatic "fresh-Claude answer" step (D11) dispatches Workflow subagents from within the executing Claude Code session -- a session capability, not an install. No API key, no SDK.

## No operator-side prerequisites for

- Cloud/infra/secrets beyond the above. This arc is local-first: dev DB + Bun + (optionally) a Voyage key. No prod deploy, no external accounts, no new containers.
