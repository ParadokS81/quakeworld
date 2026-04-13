# Vision - Quad

## The problem

QuakeWorld 4on4 teams use voice comms constantly -- calling items, coordinating attacks, reacting to plays. But voice has always been ephemeral. After a match, the demo exists (MVD files are uploaded to hub.quakeworld.nu within seconds of a game ending), but the voice is gone. There is no way to review what was said during a critical fight, no way to hear the callouts that led to a comeback or the silence that preceded a collapse.

Discord offers built-in recording, but the workflow is painful: manual start/stop, manual download, files land as a single mixed track or require third-party bots with their own friction. Even if you get the files, you end up with audio that has no relationship to the game. You cannot pair it with a demo. You cannot say "show me what we were saying during the last 5 minutes on dm2."

The core insight was: both MVD demos and voice recordings have UTC timestamps. If you control the recording end-to-end, you can match them.

## What this aims to be

Quad is the bridge between voice and gameplay. It records per-speaker audio during matches, automatically detects which match was played by querying QW Hub, slices the recordings to match boundaries, and uploads them to a shared backend where the web demo player can stream voice alongside the game replay -- per track, perfectly synced.

The result: you open a match on the MatchScheduler web app, hit play on the FTE web client demo viewer, and hear your team's comms overlaid on the action. Automatically. No manual steps after the initial `/record start`.

Beyond recording, Quad serves as the community's Discord-side interface for match scheduling. QuakeWorld has lacked a proper community website for nearly a decade. Discord is where the community lives. The bot meets teams where they already are -- scheduling matches, showing availability, delivering notifications -- without requiring anyone to visit a separate site.

## Who it's for

All QuakeWorld 4on4 teams. 16 teams are currently connected and using the bot. Any team can register their Discord server, link their team identity, and start recording. The scheduling, availability, and notification features work across all registered teams.

## Design intent

- **End-to-end control.** Own the full pipeline from microphone to playback. No third-party recording bots, no manual file juggling, no format conversions. Raw Opus frames go straight to disk as OGG, metadata is written alongside, and the processing pipeline takes it from there.
- **Automatic match pairing.** The recording bot does not need to know what match you are playing. It records, queries the Hub API for matches in the same time window, and figures out the pairing through timestamp correlation and confidence scoring. Zero configuration per session.
- **Per-speaker isolation.** One audio track per person, not a mixed-down single file. This enables per-player volume control in playback, selective muting, and future analysis of individual communication patterns. It also opens the door for adding non-player tracks like commentator audio.
- **Self-hosted on real hardware.** Runs on a dedicated server with an RTX 4090 that the team has access to. Free, fast, no cloud restrictions, full control over the runtime. GPU transcription runs locally. When new features need compute, the headroom is there.
- **Multi-clan from the start.** Not just for ]sr[ (Slackers). Any QW team can register their Discord server, link their team identity, and start recording. The bot runs as a single instance serving all guilds.

## What this is NOT

- **Not a streaming tool.** It records for after-the-fact review, not live broadcast. Commentator tracks are a future possibility but the system is designed around post-match playback.
- **Not a stats platform.** Match statistics live on QW Hub and qw-stats. Quad consumes stats (for analysis context) but does not compute or display them.
- **Not a replacement for Discord or Mumble.** Teams use their existing voice setup. Quad joins as a listener, records, and leaves. It does not manage voice channels or route audio between platforms.

## On the drawing board

### Richer match analysis

The processing pipeline already has transcription (faster-whisper) and AI analysis (Claude API) stages. The initial runs showed promise but lacked data -- voice transcripts alone, without knowing what was happening in the game, produced shallow analysis.

That is about to change. A new demo parser (being built by vikpe) extracts a full event log from MVD demos: every kill, every item pickup, every teamsay message, all with millisecond timestamps. When that parser is fully functional, the analysis pipeline can correlate real-world game events with team binds AND voice comms. "Player X picked up quad at 12:34, called it at 12:35, team pushed 2 seconds later" -- that level of detail.

Whether the analysis turns out to be genuinely valuable or just entertaining remains to be seen. But with event-level demo data, voice transcripts, and teamsay logs all on the same timeline, the input quality is strong enough to find out.

### Commentator tracks

The per-track architecture naturally supports adding non-player audio tracks. A streamer or caster could record their commentary as an additional track that syncs to the same demo, creating an enriched playback experience -- game action, team comms, and commentary all layered.

### Newsletter

A periodic digest delivered to all registered clan channels -- community updates, match results, notable performances. Parked until slipgate web is active, since the newsletter's value increases significantly when it can link to a real community site rather than just Discord.

### Knowledge base interface

Quad could become the Discord front-end for the QW Oracle -- a comprehensive QuakeWorld knowledge engine. Players could ask the bot anything about QW directly in their team's Discord server and get informed answers powered by the knowledge base. Discord is the most obvious outlet because the community is already there, but the same engine could power a web chatbot or a helper inside the slipgate desktop app. See `apps/qw-oracle/VISION.md` for the full knowledge base vision.

## Relationship to other projects

| Project | How Quad connects |
|---|---|
| **MatchScheduler** | Deep integration. Shared Firebase backend. Quad uploads paired recordings to Firestore, delivers scheduling notifications, handles availability UI, and provides standin DM feedback. MatchScheduler's web app consumes the recordings for synced playback. |
| **QW Hub** | Read-only consumer. Quad queries the Hub API (Supabase) for recent matches to power the automatic match pairing. Hub hosts the MVD demos that recordings sync against. |
| **slipgate web** | No integration today. When the web hub launches, Quad may gain new features that feed into it -- but the bot is not dependent on it and will continue to serve the community through Discord regardless. |
| **qw-oracle** | No integration today. Long-term: Quad is the most natural Discord outlet for the QW knowledge base. Same knowledge engine, different interface. |
| **slipgate-app** | No direct integration. Both live in the monorepo for cross-app context but do not communicate. |

## Why Discord stays

QuakeWorld's community has lived on Discord for years. There is no sign of that changing. Even when slipgate web launches as a proper community website, Discord will remain the place where teams coordinate daily. A bot that provides value inside Discord -- where people already are -- will stay relevant for years. New features may arrive when slipgate web goes live, but Quad is not a stopgap; it is a permanent piece of the ecosystem.
