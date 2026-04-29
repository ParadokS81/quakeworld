# Feed tab future content

**Added:** 2026-04-27 (evening -- surfaced when operator decided to extract the Updates section from the Clients tab into a new Feed tab during Phase 3.5a planning).
**Status:** Future arcs; not Phase 3.5a scope. Phase 3.5a ships the Feed tab with only the extracted Updates section as initial content. This entry captures the operator's intended Feed scope so the framing isn't lost between 3.5a ship and the first Feed-content arc.
**Verification first:** After 3.5a ships, `apps/slipgate-app/src/components/FeedTab.tsx` should exist and render only `<UpdatesPanel />`. No tournaments / dev landscape / GitHub monitoring surfaces.

### What Feed is

The "what's happening in QW right now" top-level surface. Distinct from MyQuake (your local quake stuff) and Profile (you). Conceptually a community + tooling activity feed -- pulls in external data about Quake-world activity that isn't tied to the user's specific install.

### Future content types (each is its own arc)

**A. Tournaments.** Current + upcoming tournament data, probably consumed from hub.quake.world or a successor catalog. Eventually integrates with Schedule (your matches in scheduled tournaments). Out of scope until matchscheduler integration becomes a priority.

**B. Developer landscape.** Active QW projects (engine forks, server mods, tooling, community sites) with recent activity. Could pull from GitHub for any project with a public repo: ezQuake, FTE, KTX, MVDSV, QWFWD, unezQuake, plus tooling repos like nQuake distfiles, QW Hub, qw-stats, this monorepo, etc. Surface "what shipped recently" / "who's actively committing" / "what's getting attention."

**C. GitHub monitoring.** Subset of (B) but specifically the recent-releases and recent-commits firehose. Useful for "is there a new ezQuake snapshot since yesterday?" beyond the existing Updates section's per-project check. Could surface as a unified activity timeline.

**D. Community announcements.** Possibly. Discord pin scrapes, forum thread highlights, anything moderated as "community-relevant news." Lower-priority because Discord is already where this happens; slipgate doesn't need to compete.

### Operator's framing

Direct quote 2026-04-27: "i would almost create a new entry poiint all together called Feed.. where we can pull in data about current running tournaments, and whats the dewveloper landscape, where we have this github monitoring of the active quake projects."

### Pressure

Low. Phase 3.5a ships the empty Feed shell with Updates inside. Future content arcs land independently when each data source has a clear shape and the operator wants to invest. No specific trigger for any of A/B/C/D yet.

### Related

- HANDOVER: "Phase 3.5a: Absorb Clients tab into MyQuake -> Domains -> Clients" (the phase that creates the Feed shell)
- Memory: `project_slipgate_web_services_vision.md` (the assets/maps/hub.quake.world triad -- adjacent ecosystem context, but Feed is a different surface from those catalogs; Feed pulls in activity, the catalogs serve content)
- Memory: `project_slipgate_tier_ladder.md` (Feed is orthogonal to the four-tier ladder -- visible at all tiers since it's external content, not local writes)

---
