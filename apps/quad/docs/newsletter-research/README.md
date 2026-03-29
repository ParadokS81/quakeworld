# Newsletter Module — Research & Strategy

Research documents for the Discord chat → LLM newsletter pipeline.

## Documents

1. **[overview.md](overview.md)** — What we're building, high-level architecture
2. **[backfill.md](backfill.md)** — How to get years of Discord chat history out
3. **[local-llm.md](local-llm.md)** — Running models locally on a 4090, cost vs speed tradeoffs
4. **[pipeline.md](pipeline.md)** — Data pipeline: storage, filtering, processing, reprocessing

## Status

- [x] Initial research and feasibility (confirmed viable)
- [ ] Backfill strategy finalized
- [ ] Local LLM benchmarking (sample data needed)
- [ ] Filter rule discovery from sample data
- [ ] Pipeline architecture finalized
- [ ] Implementation

## Key Decisions Still Open

- Local LLM vs API vs hybrid (local for bulk, API for quality synthesis)?
- Filter rules: AI-discovered from sample data, then applied deterministically
- Output delivery: Discord embed, web page, both?
- Scope: one QW server or multi-server from day one?
