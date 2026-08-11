# qw-oracle Layer 1 database design audit

Extracted from quakeworld HANDOVER.md (pre-migration, line 73) at the chunk-6 W17 migration, 2026-08-11.

Operator-flagged 2026-05-05 during KTX-onboarding Pass 5.4 -- schema has grown organically across v1-v18 + KTX-onboarding ahead.

## Audit scope

- Index coverage vs actual MCP query patterns (GIN indexes on JSONB columns, common-WHERE column coverage).
- Storage shape (text where ENUM/numeric would be cheaper; JSONB-everywhere vs relational normalisation pressure points).
- CHECK constraint sprawl as kind/type values grow across 5+ engines.
- pgvector index params (lists/m/ef_construction tuning).
- Dead columns / unused fields from SQLite-era leftovers.
- Implications for loader scripts and natural-key upserts.

**Outcome:** `docs/superpowers/specs/<date>-qw-oracle-db-audit.md` findings spec + actionable-items arc. Run AFTER KTX onboarding ships -- not folded into KTX execution.

**Operator's framing:** "an audit to see if there are any rookie mistakes or obvious low hanging fruit to optimize, and what it means for the scripts that produce the databases."
