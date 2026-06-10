# Seed -- "movement & physics" concept note (future candidate, 2026-06-11)

**Status:** PARKED candidate. Not in the arc's locked taxonomy (D1); a strong Tier-2-shaped addition. Needs operator SME (which `pm_` rule each ruleset locks/standardizes) + a short scope brainstorm before drafting. Captured so the note #2 brainstorm is not lost.

**Origin:** surfaced from the network-connection gate -- thread 6989 ("smooth enemy movement / interpolation") is homeless in the corpus (review-findings **F14**) -- plus an operator brainstorm the same day. `network-connection.md` already drops a forward-ref to an "independent-physics note"; this seed widens that into a movement & physics note.

## Why it holds together

QW player movement is server-side physics (mvdsv) + KTX rules + a thin client-feel layer. The demand is the *conflation* between three layers a player cannot tell apart -- which is exactly what makes a single disentangling note valuable ("feels off / want it smoother / want more speed" -> which layer?).

## Verified entity family (all confirmed in L1, 2026-06-11)

**Server / ruleset movement rules** (mvdsv + KTX; admin-set, competitively ruleset-locked):
- `pm_airstep` -- step up onto low ledges/stairs while airborne (THE "speedjump up the stairs without getting blocked" command)
- `pm_slidefix` -- ground-running vertical-speed fix (the running-up-stairs cousin)
- `pm_ktjump` -- consistent jump height when jumping while still descending
- `pm_rampjump` -- slope-aware ramp jumping
- `pm_pground` -- NetQuake-style ground detection
- `pm_bunnyspeedcap` -- caps air-strafe (bunnyhop) horizontal speed

**Physics constants** (cvars; rarely changed in standard play): `sv_gravity`, `sv_maxspeed`, `sv_accelerate`, `sv_friction`, `sv_stopspeed`, `sv_waterfriction` (swim speed), `sv_spectatormaxspeed`, `sv_speedcheck` (anti speed-cheat).

**Client feel** (the player's own knobs): `cl_physfps` / `cl_independentphysics` (independent physics) + interpolation cvars `cl_nolerp` / `cl_newlerp` / `cl_lerp_maxdistance` (fte) / `r_lerpframes` -- the 6989 smooth-movement demand.

## Proposed scope + audience split (D6)

Three audience-delineated layers mirroring the three above: **what the server decides** (the `pm_` rules, ruleset-gated) / **what you configure** (independent physics + interpolation) / **the fixed facts** (gravity, swim, fall). The note's job is to map a symptom to the right layer.

## Boundary calls (operator-confirmed 2026-06-11)

- **Projectile speed: OUT.** Fixed weapon game-data, not player movement. Belongs in a future **weapons** concept note (factual weapon data: projectile speeds, damage, rates); the physics note *links* to it ("want the rocket's speed? see the weapons note"). Cross-note reference, not duplication.
- **Speedjump / bunnyhop *technique*: OUT -> wiki (D7).** The note owns the mechanics + the cvars (grounded); "how to chain speedjumps well" is strategy/culture -> the social wiki layer.

## Relationships

- Absorbs the `network-connection.md` forward-ref to an independent-physics note (resolve that ref to this note when it lands).
- Links to: the future **weapons** note (projectile/weapon data), `weapon-scripts.md` (server-side switching under packet loss), the wiki (technique).
- Owns review-findings **F14**'s surfaced coverage gap (interpolation / smooth-movement).

## Before drafting

Operator SME pass: per `pm_` cvar, which competitive rulesets lock or standardize it (Step 4 six-mechanism scan -- but movement physics is heavily ruleset-normalized; most competitive servers run a fixed physics profile). Then a short scope brainstorm: one note, or does "speedjumping" want its own?
