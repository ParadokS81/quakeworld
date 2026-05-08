# QWiki Sandbox -- Vision

## What we're building

A local, modernized clone of the QuakeWorld community wiki, used to:

1. Prove the MediaWiki upgrade path works (1.35 -> 1.39 LTS or later)
2. Provide a Page Forms compliance environment for the Phase B cleanup pilot
3. Serve as a showcase demo when proposing the upgrade to bps/ciscon/Hooraytio/alice
4. Eventually contribute back via cutover (operator's stretch goal, not blocking)

## What we are NOT building

- A parallel canonical wiki for the community
- A long-term fork that diverges from the live wiki
- A replacement wiki engine (MediaWiki stays; we modernize within the line)

## Success criteria

- **Phase 1** -- dump imports cleanly into MW 1.35 clone; pages render identically to live wiki
- **Phase 2** -- upgrade to MW 1.39 LTS + PHP 8.x clean, no data loss, all extensions still functional
- **Phase 3** -- Citizen skin + VisualEditor working; dark mode visible
- **Phase 4** -- Page Forms authored for tournament/brand/player/clan templates
- **Phase 5** -- EQL drain runs end-to-end on sandbox via form-driven editing
- **Phase 6** -- maintainers see a credible demo and the live-cutover conversation has a concrete proposal anchored in real demo

## Eventual cutover (out of scope of this arc)

After phase 6 demo, operator + bps + ciscon decide if/when to apply the upgrade to the live wiki. The sandbox will have served its purpose if that conversation has a concrete proposal anchored in real demo, not abstract pitches.

## Strategic value

- Aligns with `qw-oracle` MCP work -- cleaner wiki data improves Phase B drain extraction yield
- Reduces ciscon's maintenance burden long-term (modern stack is easier to keep alive)
- Adds credibility to operator's role in the QW infra modernization story
