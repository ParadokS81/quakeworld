# quad Discord-surface enhancements -- arc capture

**Captured:** 2026-05-20 by arc-classifier mode S (sidequest).
**Status:** shelved (awaiting trigger).
**Trigger to start:** operator-initiated, after the Mumble-cert + auto-record + share-link UX (shipped 2026-05-19/20) has soaked in real squad use for at least one cycle and demand for richer Discord integration is clear from actual use.

## Why this is arc-shaped

The bigger vision (Tier 3 below) fires multiple classification criteria:
- **Multi-source data integration** -- matchscheduler internal + quake.world community calendars + divisional ladder feeds + LAN tournament schedules need a design pass before any code, not a single-session brainstorm.
- **Cross-cutting decisions** -- which sources are canonical, how subscriptions are stored, polling vs push, per-user vs per-guild scoping, community-server vs team-server presentation. Five-plus commitments that need their own decisions doc.
- **Multi-phase deliverable** -- Tier 1 ships first (immediate UX win, ~half day), Tier 2 second (depends on matchscheduler schedule listener wiring, ~1-2 days), Tier 3 third (the actual arc, multi-session). Each tier leaves the system in a runnable state.

Tier 1 + 2 alone would be session-shaped. They are bundled into the same arc because they share the "quad-as-Discord-presentation-layer" plumbing and the Discord Events API substrate; doing them in isolation duplicates the work.

## Scope sketch

Three progressive layers of "surface QW community data natively inside Discord channels," unified by quad as the integration point:

1. **Tier 1 -- auto-channel-topic.** On Mumble activation, quad sets the team channel's Discord topic to include the `https://join.slipgate.me/<slug>` share link and (optionally) the auto-record state. Self-maintaining: updates if hostname migrates or auto-record toggles. Graceful skip where the bot lacks `Manage Channels` (same pattern as the existing permission warnings).

2. **Tier 2 -- auto-events for own schedule.** quad subscribes to matchscheduler's scheduled-matches collection per managed team and mirrors each upcoming match into a native Discord Scheduled Event in the team's guild (title `<TAG> vs <opponent>`, location = the `join.slipgate.me/<slug>` share URL, time = match start). Updates on reschedule, deletes on cancel. Users RSVP "Interested" -> Discord DMs them at start. Bot needs `Manage Events` per guild; graceful skip where missing.

3. **Tier 3 -- subscribable community feeds.** The bigger vision: pull from MULTIPLE QW community data sources (LAN tournaments from quake.world, Division 1 / divisional ladder matches from community schedulers, possibly KTX cup schedules) and let users opt into specific feeds via a quad command. Each subscription surfaces as Discord Scheduled Events in the user's chosen guild(s) or as DM digests. This is where the arc-shape genuinely lives.

## Open questions for the brainstorm

- **Tier 3 source registry:** which community data sources are canonical / API-available / scrapable / manually curated? (quake.world LAN calendar shape? divisional ladder source?)
- **Subscription model:** per-user vs per-guild vs per-role? Stored where (Firestore? bot-local SQLite)? Migration story for existing teams?
- **Cadence:** poll-based pull (cron) or push (webhooks where supported)? Rate-limit + cache strategy?
- **Presentation:** native Discord Scheduled Events (limits: per-guild event count, requires `Manage Events`) vs embedded messages in announce channel vs channel topics vs all three depending on feed type?
- **Authority:** quad as source of truth for "team match list," or always defer to matchscheduler? When external community sources disagree with internal, what wins?
- **Permission fallbacks:** when a user wants to subscribe to a feed in a guild where the bot lacks event permission, DM fallback? Refuse? Manual-create instructions?
- **Sequencing:** ship Tier 1 first to validate the UX premise, then Tier 2, then arc into Tier 3? Or design Tier 3 first and let Tiers 1/2 fall out as MVP slices?

## What is NOT in scope

- **Replacing matchscheduler.** quad surfaces matchscheduler's data into Discord; matchscheduler remains the source of truth for team scheduling.
- **Replacing existing `#schedule` channel posts.** Discord Events live alongside, not in place of, current schedule channel messages (different cadence, different audience).
- **Pulling QuakeWorld match RESULTS (QWHub stats).** Post-match data is a different layer and a separate concern.
- **Self-hosting a community calendar.** Tier 3 ingests from existing community sources; quad does not become a calendar service itself.

## Operator notes

- Surfaced 2026-05-20 mid-flow after the Mumble cert + share-link work shipped. Operator set the SR channel topic manually with the share link, then noticed native Discord Events while looking at the channel UI. Quote: "i see some potential there. because it has quite rich embedding."
- The manual `#sr` topic with the share link is the proof-point for Tier 1: if the squad uses the topic instead of digging into pinned messages, Tier 1 is worth automating across all 16 teams.
- Bandwidth, cert, share-link, and Mumble UX work shipped across 2026-05-19/20 (commits `ce2595da`, `cb8f7932`, `4f8e061a`, `247fad97`, plus the cert-renewal-quad-restart hook in `scripts/reload-mumble.sh` and the 192 kbit/s bandwidth bump). The Discord-surface arc builds on top of that working substrate.
- Pace: explicitly NOT urgent. Operator said "ill keep it noted down" and "ill think about it for later as well." Wait for the Mumble-cert + auto-record UX to be stable in real squad use for at least one matchday cycle before triggering.

## Related

- `HANDOVER.md` -- indexed under "Future arcs (waiting on trigger)".
- `apps/quad/CLAUDE.md` -- quad's modular architecture (channel-permission checks, Mumble config listener) is the natural insertion point for Tier 1 + Tier 2.
- `apps/quad/cloudflare-worker/README.md` -- the `join.slipgate.me` Worker is the share-URL substrate Tier 1 + Tier 2 emit.
- `apps/matchscheduler/context/SCHEMA.md` -- schedule + `autoRecord` field shapes are the inputs Tier 2 mirrors.
- `contracts/completed/MUMBLE-INTEGRATION-CONTRACT.md` -- the bot/team/mumbleConfig pattern that Tier 1 extends.
- `docs/superpowers/parking/2026-04-27-feed-tab-content.md` -- adjacent surfacing concern (matchscheduler's own Feed tab) -- Tier 3 may overlap or share infrastructure.
