---
title: "Spectator mode (Phase 4 harvest-probe breadcrumb)"
slug: test-qwiki-harvest-probe
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: authored
primary_contributors:
  - "@ParadokS"
related_entities: []
related_messages: []
last_updated: 2026-05-14
---

## Summary

Spectator mode is a non-player connection state in QuakeWorld in which a client joins a server as an observer rather than a combatant. A spectator can follow a specific player's view or roam the level freely with a freelook camera. This note is a Phase 4 harvest-probe breadcrumb: it was authored to verify the qwiki-v1-beta Layer 3 harvest path end-to-end, not as a polished domain-guide entry. The spectator-mode content below is real and accurate; the probe role is metadata, not a caveat on the substance.

## Spectator mode mechanics

When a client connects as a spectator the server allocates a spectator slot rather than a player slot. The client does not spawn, does not interact with game objects, and is not counted in team or frag scoring. Two observation modes are available:

- **Player-track mode** -- the spectator's view is locked to a chosen active player. The `track` command accepts a player number or name; the view follows that player's camera and weapon animations. Players can be cycled in-order by re-issuing `track` without arguments.
- **Freelook (roam) mode** -- the spectator navigates the level independently using standard movement keys, with full freelook. No collision with geometry applies; the camera passes through walls.

Server admins control spectator access per server configuration. Competitive match servers may restrict spectator join time (admitting spectators only after a match has started to prevent information leakage), while practice and pickup servers typically leave spectator slots open at all times.

## Consumer implications

An agent or tool consuming this note can answer: "what is spectator mode in QuakeWorld, how do I enter it, and what are the two observation modes?" The note does not cover spectator-side HUD elements, demo-playback spectator behavior, or multi-view (multiview extension). Those are separate topics. If a fuller spectator-mode page is authored under a future Game Content mini-arc, this note should be marked superseded and the slug pointed at the replacement.

## References

- Source wiki section: https://wiki.slipgate.me/wiki/Phase_4_harvest_probe (== Spectator mode == section)
- Arc: qwiki-v1-beta Phase 4 (harvest-probe task -- verifying the L3 harvest path end-to-end)
- Harvest-probe role: this note exists to prove the Layer 3 harvest pipeline works (wiki section -> concept-note authoring -> load-concepts ingestion -> MCP retrieval). It is not a polished mode/feature entry. The probe wiki page may be deleted after Phase 4 ships; this note remains as the Layer 3 record of that path test.

## Related concept notes

n/a (probe artifact)
