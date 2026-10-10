# MatchScheduler `docs/` -- feature phase notes and contract copies

Working notes from the larger cross-project subsystems (voice replay, multi-clan recordings, Discord roster, Mumble, unified auto-record): each a set of phase documents written for the implementing session, plus reference copies of the cross-project contracts those phases executed. All of it is history: the features shipped, the notes stay as the record. The canonical contracts live at the monorepo root in `contracts/` (`completed/` for shipped ones, `active/` for unified auto-record). Current guidance is `DEVELOPMENT.md`, `DEPLOYMENT.md` and `OVERVIEW.md` at the app root.

Rules in this scope:
- Phase notes are chronicle: cite, never edit. A contradiction with the code is resolved in `OVERVIEW.md` or `context/SCHEMA.md`, not here.
- A contract copy that diverges from `contracts/` loses; the root copy is authoritative.

## Documentation index

| When you need... | Read... |
|---|---|
| Slice 8.0 (match proposals) manual testing walkthrough and its session notes | `TESTING-8.0.md`, `TESTING-8.0-NOTES.md` |
| The postMessage API proposed to the Hub demo player for voice tracks | `hub-voice-integration.md` |
| Voice replay origin: PRD, Hub demo-player research, audio-serving research, the PoC plan, the Tier 3 Firebase Storage auto-load spec | `voice-replay/` (5 files) |
| Multi-clan voice replay: contract copies (voice replay, Discord roster, recording management) and the MatchScheduler-side phases 1a, 3, 4, 5 and 5-fixes, C4, D2-D5, R3-R6, plus A1-A4 (availability templates and recurring apply, from the availability-enhancement contract) | `multi-clan/` (14 files) |
| Mumble as the second voice platform: contract copy and phases M3 (Mumble tab), M4 (roster sync), M6 (voice replay), post-review fixes | `mumble/` (5 files) |
| Unified auto-record, MatchScheduler UI phase U5 (contract: `contracts/active/UNIFIED-AUTO-RECORD-CONTRACT.md`) | `auto-record/` (1 file) |

## Subsystem scopes

None. The four subfolders are indexed above at folder grain.
