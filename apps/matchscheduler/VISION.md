# Vision - MatchScheduler

## The problem

QuakeWorld 4on4 runs on volunteer coordination. A clan captain trying to book a match against another clan needs eight humans - four per side - all online in the same 30-minute window, usually across European and American timezones, usually on a weekday evening. Before the scheduler existed, this was a Discord message chain per pairing, a screenshot of availability here, a "who can play Thursday 8pm CET" poll there. The friction killed real matches: teams gave up before they found a slot.

The scheduler fixes the friction with a shared structured surface: every team declares availability on the same 3x3 grid, weeks in advance. When two captains look at each other's week, the overlap is visible at a glance. Match proposal and confirmation happen in a single UI rather than across three platforms.

## Why the 3x3 grid

A grid of seven days across three time-of-day bands (prime, off-prime, weekend) captures enough resolution for a community that plays mostly in evenings - without the illusion of precision that a 30-minute hourly calendar forces on users. Nobody commits to "I will be online Wednesday 19:30-20:00 but not 20:00-20:30" three weeks ahead. They commit to "I'm in on Wednesday evening." The grid matches how clan captains actually think about availability, and the 3-band structure handles the prime-slot-saturation problem (most teams want the same Monday / Wednesday / Thursday 19:00-21:00 CET window) by forcing an explicit off-prime bucket.

The grid layout is immutable in the codebase. CLAUDE.md calls it the "sacred grid." That immutability is a product constraint, not a technical one: any redesign that breaks the grid breaks the tournament scheduling rhythm the community learned to rely on.

## Who it's for

- **Clan captains** - the primary users. They create a team, invite a roster (up to 12 players, each player max 2 teams), declare weekly availability, propose matches against other teams they know.
- **Roster players** - declare their own weekly commitment on their team's grid; captains use those declarations to assess which teams actually have numbers in a slot.
- **Tournament organizers** - seasonal 4on4 leagues use the scheduler as the canonical coordination surface.
- **Discord communities** - every team operates out of a Discord server; match challenges, confirmations, and sealed-match summaries post back to Discord channels via Quad.

## Design intent

- **Firebase first, not last.** The choice to build on Firebase was pragmatic: solo developer, no DevOps budget, a community tool that needs to work rather than scale. Firestore's real-time listeners are the right fit for "two captains staring at each other's grid."
- **Vanilla-JS-and-Alpine over a framework.** The scheduler was built before React/Solid/Svelte had consolidated. Alpine.js + direct Firestore listeners + the Revealing Module pattern keeps complexity low. Adding React now would be a rewrite, not a migration; when that rewrite happens, it happens in slipgate web.
- **Tight integrations over generic abstractions.** The scheduler reads from qw-stats for H2H stats and from Quad's `voiceRecordings/` collection for demo/voice pairing. These integrations are narrow and purposeful. The cross-project contract lives in `/contracts/CROSS-PROJECT-SCHEMA.md` at monorepo root.
- **Discord as social layer, not backend.** Discord is where humans argue about scheduling. The scheduler pushes embeds back into Discord but does not try to be a Discord bot. Quad handles the bot-shaped work.

## Graduation path

MatchScheduler will not receive a framework rewrite in this repo. The target rebuild lives in vikpe's [slipgate web](https://github.com/quakeworld/slipgate) repo: a single shared web surface that subsumes the scheduler, the asset/map cataloging services, and the help-panel surfaces over qw-oracle. When that rebuild ships, the current scheduler retires.

Until then, the current scheduler is in maintenance: bugs that block the community get fixed; new features land only when there's concrete tournament pressure. The "legacy" lifecycle label does not mean "dead" - it means "do not invest in architectural improvements here; invest them in slipgate web."

## Non-goals

- **Not a generic tournament bracket manager.** The scheduler is about match-by-match coordination between known teams, not bracket generation. Bracket tools live elsewhere.
- **Not a full roster management system.** Players join/leave teams, but the scheduler is not a player-career tracker. qw-stats holds the stats; hub.quakeworld.nu holds match history; the scheduler just holds current-season rosters.
- **Not a replacement for Discord.** Match-day banter, standin scrambles, post-match trash talk all still happen in Discord. The scheduler structures the pre-match coordination.
- **No mobile app.** The grid is a web layout optimized for desktop. Mobile users get a read-only fallback. A native mobile client is out of scope and likely stays out of scope for slipgate web too.

## Values

- **Reliability beats features.** A week where a captain cannot see who's available loses matches. A week where a new chart widget is missing loses nothing.
- **Match reality.** If the community actually schedules via the 3x3 grid, stay with the 3x3 grid. If they don't, the grid is wrong. Intuition about "better UX" is suspect without ground-truth usage.
- **Graduate gracefully.** When slipgate web is ready to subsume this tool, the migration should preserve the scheduling model the community learned. Users should not have to relearn the product.
