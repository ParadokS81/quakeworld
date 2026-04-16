# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)](#qw-oraclecladuemd-is-192-lines-over-150-hard-ceiling) — split into Layer 2 docs next time qw-oracle gets active work
- [ConfigViewer domain vs settings overlap and compare tab counts](#configviewer-domain-vs-settings-overlap-and-compare-tab-counts) — compare counts are global, domain sections show fewer items than raw settings

---

## qw-oracle/CLAUDE.md is 192 lines (over 150 hard ceiling)

**Added:** 2026-04-14
**Status:** pending, expect to address when qw-oracle gets its next active session
**Verification first:** `wc -l apps/qw-oracle/CLAUDE.md`. If under 150, this item is resolved (someone already split it or trimmed it).

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`

---

## ConfigViewer domain vs settings overlap and compare tab counts

**Added:** 2026-04-16
**Status:** needs investigation in a dedicated session
**Verification first:** open ConfigViewer in compare mode, click "All" under Settings, then check Domains > Teamplay > Macros. If Teamplay Macros shows far fewer items than the tp_* macros visible in the Settings > Macros raw view, the issue persists.

Two related issues surfaced during 2026-04-15/16 keyboard panel verification:

1. **Compare tab counts are global, not section-scoped.** The "All (2748) / Different (331) / Same (191) / Only yours (0) / Only theirs (2112)" counts at the top of ConfigViewer always show the total across ALL cvars, regardless of which section/domain the user is viewing. When viewing Teamplay Binds, seeing "2748" is confusing because that's cvar rows, not teamsay rows. Scoping the counts to the active section requires knowing which section type is active (cvars vs weapon binds vs teamsay vs aliases) and computing counts per type.

2. **Domain Teamplay Macros shows far fewer items than raw Settings Macros.** The user observed that Domains > Teamplay > Macros shows only a handful of macros, but Settings > Macros shows many tp_*-related macros. This suggests the domain curation filter is too narrow. Investigation needed: what filter does ConfigTeamplayMacros use to select its items, and why does it miss macros that the raw Settings > Macros section includes?

These are the same underlying question: how do Settings (raw, exhaustive) and Domains (curated, focused) relate to each other, and how should overlapping content be presented to the user. The user's mental model: Settings = "show me everything", Domains = "show me a curated subset organized by purpose". The counts and curation filters need to reflect this.

### Related

- `apps/slipgate-app/src/components/ConfigViewer.tsx` lines 363-378 (compareCounts memo)
- `apps/slipgate-app/src/components/ConfigTeamplayMacros.tsx` (domain macros filter)
- `apps/slipgate-app/src/components/ConfigMacrosSection.tsx` (raw macros section)
- Prior fix this session: `a55e7f9` added Teamplay pill to settings sidebar
