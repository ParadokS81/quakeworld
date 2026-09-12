# Scheduler as a headless service

Parked 2026-09-12 (dev-scheduler session, late-night brainstorm after the sign-in fix). Future arc, operator-initiated.

## Why now

qwleague.com (SvelteKit, beta) appeared while the scheduler sat idle: ladder + tournaments + clans, no scheduling beyond challenge-each-other. The operator's proof of concept for 4on4 scheduling works and the concept is proven; what users complained about was reliability of availability fill-in, not the mechanics. A community site is still unbuilt. Three would-be clients (qwleague, slipgate web, a future community site) plus the quad bot and the standalone site point at one shape: scheduling as a service, with every site a client.

**Operator's framing:** "if we built it as headless, it allows qwleague to use it and integrate it, it also allows me to redesign the page freely, and it allows a future community site to also integrate it easily ... the long term solution that could benefit everyone for years to come."

## Decisions locked tonight

- **Shape: headless service.** All rules behind an API; the standalone site, slipgate web, qwleague, a future community site and quad are clients. This is a rebuild, not an API bolted onto the current Firebase front end (browser talks to Firestore directly; callables assume Firebase Auth UIDs).
- **Identity: Discord ID primary, Google email secondary.** Both are keys the scheduler already holds. Integrating sites vouch for their user with a signed server-to-server call; the standalone site signs in directly. No account migration on either side.
- **Tenancy: sites are tenants.** Each site holds an API key; teams belong to a tenant; players are global. Cross-tenant proposals are allowed (a qwleague clan can challenge a team that exists only on the standalone site).
- **Availability is player-owned, stored once.** A team's grid is a filtered view over its roster's player records. This is what the operator always understood the product to do and what today's code emulates by copying: self-edits fan out to every team the player is in (`functions/availability.js:102-113`) and recurring templates apply across all teams (`functions/recurring.js:37-44`), one document per team-week (`context/SCHEMA.md` `/availability/{teamId}_{weekId}`). The copy cannot reach a team on another site; the single record can. Also the direct attack on the fill-in reliability complaint: fewer places to fill.

## Open questions for arc-design

- Leader-edits-on-behalf: today a leader marking a player's slots stays single-team (`availability.js:103`). With player-owned availability, does a leader edit the player's global record, or does the use case go away?
- Hosting/runtime: stay on Firebase (HTTPS functions + API keys) or move; migration of existing users, teams, availability history and proposals.
- Notifications as webhooks (quad DMs, qwleague in-app), so nudging happens where players already are.
- An embeddable widget as a cheap client for sites that will not build their own UI (Calendly-style); tier two on top of tier three.
- qwleague: who builds it, and are they open to it. A deep-link or read-API pilot is the cheap first probe of whether their users would use scheduling at all. The existing open read endpoint (`functions/scheduled-games-api.js`, upcoming matches by team tag, CORS open) is a seed.
- VISION.md's graduation path says "rebuild inside slipgate web". In the headless shape slipgate web is a client, not the home. Record as a changed decision when the arc designs; do not edit VISION.md until then.

## Next step

Run arc-design on this doc in a fresh session. Cheap probe before any design pass: talk to the qwleague author.
