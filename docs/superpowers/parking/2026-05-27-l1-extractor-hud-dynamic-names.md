# L1 extractor HUD dynamic-name family (Arc B)

**Status:** CLOSED 2026-05-27 (verified no-op). The premise that "HUD cvars built from runtime templates are missing from L1 or labeled less precisely than they should be" turned out to be stale -- the work was already shipped via earlier arcs by the time Arc A's closure prompted Arc B's investigation. No code work needed.

## What this was supposed to be (premise)

When the Arc A mini-arc was scoped on 2026-05-27, the parking doc inherited HANDOVER's framing that the ezQuake HUD subsystem builds many of its cvar names at runtime (`hud_<element>_<subvar>` pattern, with the element name supplied as the first arg to `HUD_Register`). The static extractor was assumed to see only the template `hud_%s_x` and never fan it out into the actual names. That gap was supposedly the largest user-visible L1 coverage hole and was carrying a `~1-2 day libclang AST surgery` estimate.

## What's actually shipped (verification evidence, 2026-05-27)

The HUD dynamic-name cvar family IS already extracted as first-class `type='cvar'`, `source_backed` L1 entities, but **not via `_handler_hud_elements.py`** -- via a dedicated `HUD_Register` -> cvar synthesis path inside `_handler_cvars.py`. This was verified by the prior `docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md` audit and re-confirmed empirically against the current DB.

**Counts (ezQuake HEAD, 2026-05-27):**

| Metric | Value |
|---|---|
| Total `hud_*` cvars in `entities` | 1,463 |
| `source_backed` | 1,418 |
| `source_retired` | 44 |
| `doc_only` | 1 |
| Distinct HUD elements covered (the `<element>` portion) | 87 |

**Quality spot-checks:** `hud_radar_*` family is fully captured (23+ entries -- autosize / colornames / draw / fade_players / frame / frame_color / height / highlight + highlight_color / item_opacity / itemfilter / onlytp / opacity / order / otherfilter / place / player_size / pos_x / pos_y / proportional / scale / show / show_height ...). Entries carry proper descriptions and `default_value`s (e.g. `hud_clock_show` -> `"Switches showing of clock."` default `0`; `hud_radar_pos_x` -> `"Horizontal relative position of the radar HUD element."` default `0`).

**The HUD command half is also already shipped.** The `+hud_<name>` / `-hud_<name>` / bare `<name>` command family was recovered as first-class L1 entities via Track-B of the enforce-L1-runtime-truth arc (Phase 3 + Phase 5, shipped 2026-05-19 at `41965fe2`). 129 HUD commands were promoted to `source_backed`.

So the HUD subsystem's L1 coverage is comprehensive on BOTH the cvar half (via `_handler_cvars.py` HUD_Register synthesis -- pre-Arc-A, exact origin not chased) AND the command half (via Track-B of enforce-L1, 2026-05-19).

## Why the premise was stale

The HANDOVER 114 entry (last touched 2026-05-20) says:

> "2026-05-16: the HUD dynamic-name family + command-direction case-fold gap were pulled OUT of this feeder INTO the libclang two-track arc (Track B + shared foundation)"

That sentence is structurally correct -- the work WAS pulled into the two-track arc -- but the second half of the implication (that it still needs shipping) decayed when:

- The 2026-05-17 audit (`hud-cvar-coverage-audit-findings.md`) verified the cvar half was already in via `_handler_cvars.py`.
- The enforce-L1 arc Phase 3 + Phase 5 (2026-05-18 -- 2026-05-19) shipped Track-B HUD command recovery (129 first-class entities).

By 2026-05-20 the HUD dynamic-name work was effectively complete; HANDOVER 114's residual phrasing never got pruned. The Arc B parking doc I created on 2026-05-27 inherited that stale phrasing without re-verifying against L1 state.

## Lesson (matches Arc A's Items 2-3)

This is the THIRD verified-no-op finding in the L1 extractor improvements space within a single session:

1. Arc A Item 2 (bare `COM_CheckParm` detection) -- already in `_handler_cmdline.py:122`.
2. Arc A Item 3 (`.h`-aware liveness) -- 4 of 5 cases already correctly detected via libclang macro expansion; only `-enablelocalcommand` remains and is parked separately as a small variant-dispatch fix.
3. **Arc B (this doc)** -- HUD dynamic-name cvar family already extracted via `_handler_cvars.py` HUD_Register synthesis; command half shipped via enforce-L1 Track-B.

**Across the four items originally framed under the "L1 extractor improvements" backlog (Arc A's 3 items + Arc B), only Item 1 (`Cmd_AddLegacyCommand` persistence) and the small `-enablelocalcommand` residual represented real outstanding work.** The other three were verified-already-done.

The ezQuake L1 corpus is in significantly better shape than the parking-doc framing suggested. Aside from the `-enablelocalcommand` residual (HANDOVER followup), there are no known outstanding ezQuake L1 extractor gaps. Future ezQuake L1 work should re-verify HANDOVER claims against the DB before scoping.

## Cross-references

- Arc A parking doc (sibling, closed same day): `docs/superpowers/parking/2026-05-27-l1-extractor-refinements-mini-arc.md`
- Prior HUD cvar coverage audit (the authoritative verification): `docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md`
- enforce-L1-runtime-truth arc history (Track-B HUD command shipping): `apps/qw-oracle/docs/arc-history.md` 2026-05-19 entry
- `-enablelocalcommand` residual (only outstanding follow-up): HANDOVER `Cmdline handler misses server-variant findings inside #ifdef SERVERONLY` entry

## Exit criteria (closure 2026-05-27)

- [x] HUD cvar coverage verified comprehensive (1,463 cvars, 87 distinct HUD elements).
- [x] HUD command coverage verified comprehensive (129 first-class entities via Track-B).
- [x] No code work required.
- [x] Parking doc updated with verification evidence.
- [x] No fresh-terminal handover needed (no work to hand off).
