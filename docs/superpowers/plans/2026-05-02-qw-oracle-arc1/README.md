# QW Oracle Arc 1 — Postgres + Hybrid Retrieval

**Spec:** `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`

**Goal:** Move qw-oracle from SQLite (knowledge.db + qw.db) to a single Postgres 16 + pgvector + tsvector engine, port all three layers, add hybrid retrieval (RRF over lexical + semantic), introduce `search_concepts` and `redirect_to_human` tools, and deploy publicly at `oracle.slipgate.me`.

**Status:** Planning. Per-phase MDs are drafted by a fresh terminal following `handoff-prompt.md`. Each phase MD is verified by a sub-agent before operator review. Phases land in commit order; each phase boundary is operator-reviewed before the next phase begins.

---

## Read in this order

If you're new to this arc, read top-to-bottom:

1. **[`prerequisites.md`](prerequisites.md)** — Operator-side one-shot setup. Do this before kicking off any phase.
2. **[`decisions.md`](decisions.md)** — 17 locked cross-cutting decisions (FK convention, runtime, schema-as-generator, etc.). Every phase respects these. If a decision is wrong, change it here first; don't drift in a phase MD.
3. **[`review-findings.md`](review-findings.md)** — 18 issues found in the legacy monolithic plan, with which decisions resolve them. Useful checklist when drafting per-phase MDs.
4. **[`phase-template.md`](phase-template.md)** — Mandatory shape for each phase MD.
5. **Per-phase MDs** (drafted in order; see "Phase index" below).

If you're the fresh terminal that's about to draft a phase, also read:

6. **[`handoff-prompt.md`](handoff-prompt.md)** — Your orientation. Tells you what this arc is, what context you'll need, what sub-agent verification looks like, and how to halt for review.

---

## Phase index

Phases land in order. Each phase commits a coherent unit (per `decisions.md` D14). Operator reviews at phase boundaries before the next phase starts.

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 1 | shipped | `phase-1-foundation.md` | Postgres dev container + migrator + smoke test | DB up, schema_migrations tracking works |
| 2 | approved | `phase-2-layer1-port.md` | Schema-as-generator -> all 31 tables + loader port | Layer 1 entity rows in Postgres, counts match SQLite snapshot |
| 3 | approved | `phase-3-layer2-port.md` | Discord-only import (D9-revised) -> tsvector | Chat corpus searchable via tsvector |
| 4 | approved | `phase-4-layer3-graph.md` | Concept loader + bidirectional graph + chunker | Concepts + chunks + graph rows in DB; embeddings empty |
| 5 | approved | `phase-5-embeddings.md` | Voyage client + entity & chunk embedding pipelines + D8 verifier | All vectors present; embedding_metadata + api_log written |
| 6 | approved | `phase-6-mcp-rewrite.md` | All MCP tools on Postgres + RRF + new tools + HTTP/SSE | MCP server runs locally end-to-end on Postgres |
| 7 | approved | `phase-7-observability.md` | query_log standardised + OBSERVABILITY.md cheatsheet | MCP self-monitors; operator queries are documented |
| 8 | approved | `phase-8-eval-deploy.md` | Eval set + calibration + Docker prod + Unraid deploy | Public MCP live at `oracle.slipgate.me/mcp` |

When a phase MD lands, change `not started` → `drafted (awaiting review)` → `approved` → `in execution` → `shipped`.

---

## Other artifacts in this directory

- **[`_legacy-monolithic-plan.md`](_legacy-monolithic-plan.md)** — The original 3596-line plan from the previous terminal. Kept as reference. Do NOT execute from this file directly. Use it as an idea source when drafting per-phase MDs, but verify every claim against live source before inlining.

---

## Why split into per-phase MDs?

Two reasons:

1. **Context window discipline.** A 3596-line plan crowds the agent's working memory. Per-phase MDs at ≤800 lines each (per the template) leave room for live source reads and sub-agent verification.

2. **Verification at boundaries.** Each phase MD gets a dedicated sub-agent verification pass before operator review. The legacy plan's bugs (wrong CHECK enums, missing tables, wrong column lists) all came from cross-cutting hand-typed SQL the author hadn't checked. Smaller MDs + targeted sub-agent verification catches these mechanically.

The split is structural, not just cosmetic. See `decisions.md` D3 (schema-as-generator) and D16 (no subagent execution for SQL writing — only for plan verification) for the accompanying philosophy.

---

## What this arc deliberately does NOT cover

Per `decisions.md` D5:

- Snapshot manifest + delta-fetch pipeline → Arc 2.
- Layer 2 enrichment (segment / classify / summarise / embed messages) → Arc 3.
- IRC re-import with correct codepage → Arc 3.
- Hetzner / Cloudflare Worker migration of MCP → endgame, not Arc 1.
- App-level auth on the public MCP → relying on per-IP CF rate limiting; no auth in Arc 1.

If a phase drifts into one of these, that's a scope creep — flag it.

---

## Operator quick-reference

- **Kicking off a fresh phase-drafting session:** open a new terminal, paste the contents of `handoff-prompt.md` as the first message, naming the phase number to draft.
- **Reviewing a drafted phase:** read the phase MD top-to-bottom, run the verification queries listed at the bottom, eyeball the file lists and SQL, sign off.
- **A finding resolves but conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase MD's "Open questions" section. If the decision itself is wrong, amend `decisions.md` before re-running the phase draft.
- **A new finding emerges during phase drafting:** append to `review-findings.md` with a sequential F-number and tag which phase resolves it.
