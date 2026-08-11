# KTX L1 cross-card polish sweep

Extracted from quakeworld HANDOVER.md (pre-migration, line 33) at the chunk-6 W17 migration, 2026-08-11.

Four scattered cross-card-polish followups from the 2026-05 ktx-l1-rewrite apply passes, none individually large, all still open per a 2026-08-04 live-DB re-check even though the batches around each of them shipped. Bundle into one session:

1. **FPS-kick threshold wording** -- `k_noframechecks` still says "after 3 accumulated FPS warnings" while `maxfps` correctly says "the fourth warning in a session triggers a forced disconnect" (source-true per `fIllegalFPSWarnings > 3` at `client.c:3868-3870`) -- align `k_noframechecks`' wording to the `maxfps` phrasing.
2. **`kick` See-also gap** -- still lists only `mkick + force_spec`; add `y` + `n` per the original F2 cross-card finding to close the bidirectional triangle (kick <-> y <-> n).
3. **`break` See-also asymmetry** -- `ready`'s See-also references `break`, but `break`'s See-also (`next_map`/`forcebreak`/`k_vp_break`/`k_vp_map`) still omits `ready` -- add `ready (paired peer -- sets ready state)`.
4. **Permission-line mislabels from the F1 CF-flag audit** -- `dmgfrags` Permission line still says "admin only" (source is `CF_PLAYER | CF_SPC_ADMIN` = any player or admin spectator, per `include/g_local.h:647-658`); `silence`'s Headliner still says "Admin command that toggles..." (its Permission line is already correctly two-phase-gated -- just drop the "Admin command" prefix).

All 4 are single-card hand-edits to `entities.description`, no re-synthesis needed.
