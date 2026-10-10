# QuakeWorld monorepo -- Arc history

Append-only chronicle of shipped arcs. One paragraph per arc, oldest at the bottom. New arcs prepend at the top.

For current state, see `OVERVIEW.md` (living map) and `HANDOVER.md` (active backlog). For why arcs shipped in the order they did, read backwards from the top.

---

## 2026-10-10 -- quad Mumble silent-recording fix, verification gate passed (single-session fix of 2026-05-20/21; gate closed by the quad docs seat)

Every Mumble auto-record session since at least 2026-02-28 had written pure-silence OGG tracks. One extended debug session on 2026-05-20 found and fixed three layers: the bot sat in Mumble's root channel while players recorded in team subchannels, so no voice packets reached it (fixed by subscribing the bot as a channel listener, `04030c6b`); the packet parser then rejected listener-forwarded Opus packets by their target byte (relaxed, `2fc5fc22`); and a timing-counter bug compressed each user's OGG timeline by total speech duration (fixed in `mumble-track.ts`, `7d9c02ff`). The first two layers were verified live the same day; the third waited five months for a real recording. The quad docs seat closed that gate on 2026-10-10 from disk: the only Mumble session recorded since the fix (2026-05-31, about two hours) has all four tracks within 0.1 s of wall clock whatever each speaker's volume, and the same probe reproduces the May bug table on the pre-fix session, so the instrument is trustworthy. The parking file (`2026-05-20-quad-mumble-silent-recording-investigation.md`) was deleted with this entry; its two carry-forwards were dropped, since the debug counters are cheap to keep and the upstream mumble-client quirks are worked around in `voice-receiver.ts` with no second consumer. (First entry in this file, established 2026-08-11 as the repo-root sibling of `apps/qw-oracle/docs/arc-history.md` for arcs outside qw-oracle's scope.)
