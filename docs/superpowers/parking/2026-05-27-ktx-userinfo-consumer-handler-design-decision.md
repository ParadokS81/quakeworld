# KTX info_keys handler -- drop producer-only rule, align with MVDSV all-sites emission

**Date**: 2026-05-27
**Status**: DECIDED -- supersedes spec 1.6 producer-only rule
**Supersedes**: `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` Section 1.6 ("KTX info_key extraction; producer-only emission; ~5-6 rows")

## What changed

`_handler_info_keys.py` now emits **all literal call sites** for three KTX userinfo APIs:

- `SetUserInfo(ent, "*KEY", value, SETUSERINFO_STAR)` -- write (producer side)
- `ezinfokey(ent, "key")` -- read (string-typed consumer side)
- `iKey(ent, "key")` -- read (int-typed consumer side; e.g. bitmask interpretation)

The previous "producer-only" filter (`if not key_name.startswith("*"): return`) is removed. Operations are tagged per call site and aggregated by `bare_name`, mirroring MVDSV's existing handler.

## Why

The producer-only rule treated userinfo-key ownership as a binary (whoever writes the bytes owns the documentation). That framing matches code mechanics but not user documentation:

- `kf`, `k_nick`, `postmsg`, `premsg`, `k_sdir`, `k` are user-tunable knobs whose **semantics live entirely in KTX**. ezQuake provides the transport (`setinfo`) but has no idea what the bits or strings mean -- KTX is what interprets them. Documenting them as ezQuake entities would point users at the wrong codebase.
- The producer-only rule made these keys un-extractable. They never landed in L1, so downstream v2 drafts for `killer` / `victim` / `newcomer` reference them via See-also lines that point at non-existent entities (`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-27-player-communication.md`).
- MVDSV's `_handler_info_keys.py` already does all-sites emission: 21 read-only userinfo entities (`bottomcolor`, `topcolor`, `rate`, `skin`, etc.) exist in `info_key_versions` today with `operations=["read"]`. The cross-codebase convention is "emit every literal call site; the description layer carries semantic ownership." KTX's producer-only rule was the deviation, not the convention.

## Decision space considered

Three options surfaced by the handoff (`docs/superpowers/parking/2026-05-27-ktx-user-facing-userinfo-keys-handoff.md`):

1. **Extend handler with K_*/KF_* heuristic gate** -- only emit consumer reads whose value is compared against a KTX symbolic constant. **Rejected**: heuristic only catches `kf` (the bitmask case). The other 5 user-facing keys are string-typed and slip through.
2. **New `_handler_consumer_userinfo.py`** -- separate handler for consumer reads. **Rejected**: doubles plumbing (two handlers, two emission types, two adapters) for a problem MVDSV already solves in one handler.
3. **Drop producer-only rule, all-sites emission with op tagging** -- match MVDSV. **Chosen**: one handler, no new plumbing, aligns with cross-codebase convention.

## Trade-off accepted

The KTX info_key entity count rises from 7 (producer-only star keys) to ~30-50 (producer + all consumer reads). The new entities split into three classes:

- **KTX-defined semantics** (~6-15 entities): `kf`, `k_nick`, `k`, `k_sdir`, `postmsg`, `premsg`, plus candidates surfaced by the sweep (`k_spectalk`, `k_hitboxcheck_bullets`, `ktpl`, `matchtag`, `runes`, `railcolor`, `pbspeed`, `wps`, `wpsx`, and the 2-letter `iKey` codes pending source verification). These get rich L1 descriptions (this arc's deliverable).
- **Cross-engine reads** (~15-25 entities): `bottomcolor`, `topcolor`, `rate`, `team`, `gender`, `login`, etc. These belong semantically to ezQuake CVAR_USERINFO or the QW protocol. They get a one-line "Read by KTX; semantics defined by ezQuake CVAR_USERINFO" pointer description, or stay null. Same shape MVDSV exhibits today.
- **Producer-side star keys (unchanged)** (~7 entities): `*at`, `*is`, `*ml`, `*mm`, `*mp`, `*mt`, `*mu`. KTX-defined, already documented at L1.

The description layer is what makes the user-facing distinction; the L1 inventory layer is flat by design.

## Loader / schema impact

None. `apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts` is op-agnostic; `info_key_versions.scope` CHECK already admits `userinfo`. The schema accepts the new entities without migration.

The `load-version.ts` regression guard fires only on >50% drops, so the count increase needs no `--force`.

## Spec 1.6 supersession

`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md:144-149` describes the producer-only convention. Per the qw-oracle CLAUDE.md "schema evolution is append-only" + "specs are point-in-time" disciplines, that spec stays as-is (historical record); this parking doc is the supersession marker. The handler docstring is updated to describe the new convention and reference this doc.

## Follow-ups (out of scope for this arc)

- Cross-engine reference resolution. The thin "read by KTX, owned by ezQuake CVAR_USERINFO" pointer descriptions are placeholders. A future arc could wire these as typed `cross_engine_ref` cross-references at the description-layer so the MCP can return both rows side-by-side.
- Sweep candidate triage. The wider sweep finds ~10-15 KTX-semantic candidates beyond the 6 named in the handoff. Those are addressed inside this arc (Phase 4 triage) but the triage methodology is reusable for the 2-letter iKey codes if any need detailed source investigation.
