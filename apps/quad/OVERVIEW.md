# Overview — Quad

> **Doc type: load-bearing slim.** Identity, design-intent invariants, file-structure contract, integration boundaries, parked features. Per-module file rosters are catalog and live in `src/modules/<name>/` directly.

Quad is a self-hosted Discord bot that records per-speaker voice comms during QuakeWorld matches, pairs them with match demos via UTC timestamp correlation, and uploads the result for synced playback on the MatchScheduler web app. It also serves as the community's Discord-side interface for match scheduling, availability, and standin coordination.

**Lifecycle status:** Maintenance. 16 teams connected. Single instance serving all registered guilds. Stable; new features land when needed.

For why this project exists, see `VISION.md`. For local dev, see `DEVELOPMENT.md`. For production, see `DEPLOYMENT.md`.

---

## Module map at a glance

All modules live under `src/modules/<name>/`. Each is self-contained, follows the `BotModule` interface (`src/core/module.ts`), and communicates with siblings via Firestore — never direct imports. Module-specific rules auto-load via `.claude/rules/`.

| Module | What it does |
|---|---|
| **recording** | Joins voice channel, records per-speaker OGG/Opus, writes `session_metadata.json` |
| **processing** | Two-stage pipeline (fast = pair-with-Hub-and-upload; slow = transcribe-and-analyze). Uses Python `faster-whisper` and Claude API |
| **standin** | Firestore-driven standin coordination (DM delivery + button responses) |
| **registration** | `/register` to link a Discord guild to a MatchScheduler team |
| **scheduler** | Firestore-driven match notifications (`challenge_proposed` / `slot_confirmed` / `match_sealed`) — see `SCHEDULER-MODULE-BRIEF.md` |
| **availability** | Persistent embed with `@napi-rs/canvas` rendered weekly availability grids |
| **mumble** | Mumble voice server integration via Python ICE sidecar; auto-records on channel join |

For per-module file inventories, run `ls src/modules/<name>/`. For per-module rules, see `.claude/rules/`.

---

## Recording — design-intent invariants

The recording module is the bot's reason to exist; these invariants are load-bearing across crashes and refactors.

- **Opus passthrough — never transcode.** Discord sends lossy Opus; OGG wraps the original frames (~5-8 MB/hour vs ~100-150 MB for FLAC).
- **Stream to disk — never buffer.** Sessions run 3+ hours; streaming means near-zero memory and crash recovery.
- **One continuous file per speaker per session** — `EndBehaviorType.Manual`, never fragment.
- **`selfDeaf: false, selfMute: true`** — bot hears but does not transmit.
- **Late-join handling:** silent frames prepended from session start to user join time so per-speaker tracks align in time.
- **Rejoin:** `reattach()` swaps the opus stream while the silence timer keeps running — no duplicate tracks, no drift.
- **Per-track error isolation:** a failed track is marked, others keep recording.
- **Firestore writes are fire-and-forget** — Firestore outages must never fail a recording.
- **`session_metadata.json` is the public contract** (schema at `docs/session_metadata_schema.json`). Schema changes require a version bump.
- **All timestamps UTC with millisecond precision.**

---

## Recording file structure on disk

```
recordings/
  {sessionId}/                    ULID, one dir per recording session
    session_metadata.json         public contract (schema v1)
    1-{username}.ogg              per-speaker audio, track-numbered
    2-{username}.ogg
    processed/                    created by processing pipeline
      {segment-id}/
        metadata.json             includes demoSha256 for Hub pairing
        audio/
          {discordUserId}.ogg     per-speaker sliced to match boundaries
```

Raw recordings are gitignored — never commit audio files.

---

## Processing pipeline — what's where

Two stages: **fast** (auto after recording, seconds) and **slow** (opt-in via `/process transcribe` or `/process analyze`, hours).

Stage files live at `src/modules/processing/stages/`. Knowledge YAMLs (consumed by the analyzer) live at `src/modules/processing/knowledge/`. Pipeline orchestrator at `src/modules/processing/pipeline.ts`. Run `ls` against either dir for current stage / knowledge file inventory — those are the canonical lists.

- **Fast pipeline** correlates recording timestamps with QW Hub matches, slices per-speaker audio to match boundaries via `ffmpeg` stream-copy, uploads to Firebase Storage with a Firestore manifest.
- **Slow pipeline** transcribes via Python `faster-whisper` wrapper (re-segments by silence gaps), merges transcripts with ktxstats into a unified timeline, runs Claude API analysis using the knowledge YAMLs.

---

## Integration points

| System | Direction | What | Module |
|---|---|---|---|
| **MatchScheduler** (Firebase) | Read + Write | Session tracking, voice uploads, scheduling, availability, standin | All except recording core |
| **QW Hub** (Supabase API) | Read | Match history for timestamp-based pairing | processing |
| **d.quake.world** | Read | ktxstats JSON for matched demos | processing |
| **Discord** | Read + Write | Voice streams, slash commands, embeds, DMs, buttons | All |
| **Mumble** | Read + Write | Voice streams, channel/user management via ICE | mumble |
| **Claude API** | Write (request) | Match communication analysis | processing |
| **Firebase Storage** | Write | Sliced voice recordings for web playback | processing |

See `API_CONTRACTS.md` for the boundary specification and `SCHEMA.md` for Firestore collection details.

---

## Parked features (real purpose, not dead code)

| Item | Where | Status / intent |
|---|---|---|
| **Newsletter** | `docs/newsletter-research/` | Community digest delivered to clan channels. Parked until slipgate web provides a destination for links. Idea is sound; premature without a community website. |
| **Voice replay research** | `docs/voice-replay/`, `docs/voice-sync-proposal.md` | The synced-playback feature that came out of this research is fully operational (recordings paired with demos for web playback). The research docs are historical retrospective. |
| **Multi-clan advanced features** | `docs/multi-clan/` | Basic multi-clan support (registration, recording, scheduling) is live. Cross-clan roster conflict resolution is documented but not yet needed. |

---

## Code landmarks — where to find things

| If you want to... | Look at... |
|---|---|
| Add a new bot module | `src/core/module.ts` (the `BotModule` interface) → create `src/modules/<name>/index.ts` → register in `src/core/bot.ts` |
| Change session-metadata schema | `src/modules/recording/metadata.ts` + bump schema version + update `docs/session_metadata_schema.json` |
| Change how silence is padded | `src/modules/recording/silence.ts` |
| Change how voice is uploaded | `src/modules/processing/stages/voice-uploader.ts` |
| Tune the match-pairing confidence | `src/modules/processing/stages/match-pairer.ts` |
| Add an analyzer knowledge file | drop YAML at `src/modules/processing/knowledge/<area>/<name>.yaml` (analyzer auto-loads from there) |
| Change Mumble auto-record triggers | `src/modules/mumble/auto-record.ts` |
| Change Discord availability grid rendering | `src/modules/availability/renderer.ts` (uses `@napi-rs/canvas` with Inter font) |
| Add a new scheduler notification type | `src/modules/scheduler/embeds.ts` + `src/modules/scheduler/listener.ts` + see `SCHEDULER-MODULE-BRIEF.md` |
| Run a one-off backfill or sample fetch | `scripts/` (run `ls scripts/` for current inventory) |

---

## What this doc intentionally does NOT cover

- **Per-module file inventories** → `ls src/modules/<name>/` is canonical
- **Why this project exists** → `VISION.md`
- **Production deployment** → `DEPLOYMENT.md`
- **Local dev setup** → `DEVELOPMENT.md`
- **Firestore collection schemas** → `SCHEMA.md`
- **External API boundaries** → `API_CONTRACTS.md`
- **Implementation phase history** → `PLAN.md`
- **Scheduler module design** → `SCHEDULER-MODULE-BRIEF.md`
- **Module-specific rules** → `.claude/rules/` (auto-loads by path)

---

*Last slimmed: 2026-04-29 per docs-system-redesign spec Plan 2 (litmus test applied; per-module file rosters / fast+slow pipeline stage tables / scripts directory listing / core infrastructure file roster all cut as `ls`-reproducible; recording invariants and file-structure contract preserved verbatim; integration map + parked-features attestation kept).*
