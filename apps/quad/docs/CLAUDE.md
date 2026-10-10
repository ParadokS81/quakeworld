# Quad docs/ -- shipped plans, contract copies, research and incident records

Nothing in this folder is current guidance. The live documents are the app root's (`../CLAUDE.md` indexes them). What sits here is the record of how the modules were built (phase plans, left as written when each phase shipped), quad-side copies of cross-project contracts whose canonical versions live in `contracts/completed/` at the repository root, closed research, and one incident record. Read a phase plan to recover a design decision; never treat its steps as a todo list.

## Documentation index

| When you need... | Read... |
|---|---|
| The JSON Schema for `session_metadata.json` (Discord shape; the Mumble shape is described in `../SCHEMA.md`) | `session_metadata_schema.json` |
| The 2026-03-14 one-off that moved the bot from the `qwvoice` to the `dave` Discord account (done) | `dave-migration-instructions.md` |
| The research behind the Mumble recording module (closed) | `mumble-recording-research.md` |
| The proposal for direct match-event signaling to sync voice with demos (research; the mvdsv demo-start-timestamp work descends from it) | `voice-sync-proposal.md` |
| Auto-record build plan: shared session registry + pipeline fix | `auto-record/phase-U1-session-registry.md` |
| Auto-record build plan: Discord auto-record engine | `auto-record/phase-U2-discord-auto-record.md` |
| Auto-record build plan: Mumble auto-record migration | `auto-record/phase-U3-mumble-migration.md` |
| Auto-record build plan: unified `/record` command | `auto-record/phase-U4-unified-record-command.md` |
| Incident record: corrupt Opus packets in one guild's recordings (status as written 2026-02-25: open, DAVE passthrough suspected, mitigation deployed) | `incidents/2026-02-25-opus-corruption.md` |
| Multi-clan: quad-side decisions from the Voice Replay contract (canonical: `contracts/completed/VOICE-REPLAY-CONTRACT.md`) | `multi-clan/CONTRACT.md` |
| Multi-clan: Discord roster contract (canonical, repo root) | `contracts/completed/DISCORD-ROSTER-CONTRACT.md` |
| Multi-clan: recording management contract (canonical, repo root) | `contracts/completed/RECORDING-MANAGEMENT-CONTRACT.md` |
| Multi-clan build plan: `/register` completes a pending bot registration | `multi-clan/phase-1b-register-command.md` |
| Multi-clan build plan: voice uploader refactor | `multi-clan/phase-2-uploader-refactor.md` |
| Multi-clan build plan: name resolution + silent-track filtering | `multi-clan/phase-2b-pipeline-enhancements.md` |
| Multi-clan build plan: availability prev/next day navigation | `multi-clan/phase-A5-prev-next-navigation.md` |
| Multi-clan build plan: availability template actions | `multi-clan/phase-A6-discord-template-actions.md` |
| Multi-clan build plan: multi-team registration | `multi-clan/phase-C1-multi-team-registration.md` |
| Multi-clan build plan: multi-registration resolution | `multi-clan/phase-C2-multi-registration-resolution.md` |
| Multi-clan build plan: guild sync + disconnect | `multi-clan/phase-C3-guild-sync-and-disconnect.md` |
| Multi-clan build plan: guild member sync | `multi-clan/phase-D1-guild-member-sync.md` |
| Multi-clan build plan: recording management (deletion, downloads, privacy) | `multi-clan/phase-R1R2R5-recording-management.md` |
| Mumble: quad-side decisions from the Mumble integration contract (canonical: `contracts/completed/MUMBLE-INTEGRATION-CONTRACT.md`) | `mumble/CONTRACT.md` |
| Mumble: post-review fix list | `mumble/fix-post-review.md` |
| Mumble build plan: Murmur connection + channel management | `mumble/phase-M1-channel-management.md` |
| Mumble build plan: user registration + certificate pinning | `mumble/phase-M2-user-registration.md` |
| Mumble build plan: roster sync | `mumble/phase-M4-roster-sync.md` |
| Mumble build plan: recording bot | `mumble/phase-M5-recording-bot.md` |
| Mumble build plan: pipeline integration + Discord link sharing | `mumble/phase-M6-pipeline-discord.md` |
| Newsletter (parked feature, see `../OVERVIEW.md`): research index | `newsletter-research/README.md` |
| Newsletter: overview | `newsletter-research/overview.md` |
| Newsletter: data pipeline strategy | `newsletter-research/pipeline.md` |
| Newsletter: Discord history backfill strategy | `newsletter-research/backfill.md` |
| Newsletter: local LLM feasibility (written for the old 4090 host) | `newsletter-research/local-llm.md` |
| Schedule channel build plan, slice 1: settings UI (MatchScheduler side) | `slices/schedule-channel-slice1-settings-ui.md` |
| Schedule channel build plan, slice 2: module skeleton | `slices/schedule-channel-slice2-module-skeleton.md` |
| Schedule channel build plan, slice 3: canvas grid renderer | `slices/schedule-channel-slice3-canvas-renderer.md` |
| Schedule channel build plan, slice 4: persistent message + Firestore listener | `slices/schedule-channel-slice4-persistent-message.md` |
| Schedule channel build plan, slice 5: interactive availability | `slices/schedule-channel-slice5-interactions.md` |
| Standin DM flow design (shipped) | `standin-flow/design.md` |
| Voice replay PRD (shipped as synced playback; retrospective) | `voice-replay/PRD.md` |
| Hub demo-player internals research behind voice replay | `voice-replay/hub-research.md` |

## Subsystem scopes

None. The subfolders above carry no nested `CLAUDE.md`; their files are indexed here.
