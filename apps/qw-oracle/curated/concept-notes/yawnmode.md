---
title: "Yawnmode"
summary: "An informal, for-fun modifier by Molgrum that changes the feel of a game rather than its objective: no fall damage, a harder-hitting nailgun, stronger green armor, a beefed-up axe and super shotgun, and always respawning with your last weapon. A rarely-used 1on1 oddity layered on a normal game, not a competitive format."
slug: yawnmode
topic: game-mode-reference
status: draft
authored_by: qw-oracle
last_updated: 2026-05-31
scope: engine-scoped
engines_covered: [ktx]

experience_group: match-modifier
kind: mutator

canonical_id: ktx:game_mode:yawnmode
gameplay_source_id: ktx
source_ref: world.c:1011
wiki_status: hybrid
wiki_page_slug: Yawnmode
introduced_by: Molgrum
note_anchor_version: 1.47-2-g67253dc
note_origin: hybrid

related_entities:
  - ktx:command:yawnmode
  - ktx:cvar:k_yawnmode
related_modes:
  - {slug: killquad, relation: similar-shape}
---

## Summary

Yawnmode is an informal, for-fun modifier built by Molgrum that changes the *feel* of a game rather than its objective -- you still frag to win. It bundles a set of tweaks onto a base mode (a duel is its natural home): fall damage is gone, the nailgun shoves harder, green armor protects more, the axe and super shotgun hit harder, and you always respawn with your last weapon. It's a quirky, rarely-used oddity, not a competitive format. You arm it with `/yawnmode`.

## Activate

Yawnmode is a toggle, not a mode you start on its own. Get into a base mode first -- it was written as a 1on1 modification, so a duel is its natural home -- then type `/yawnmode` in the console during warmup to arm it (run it again to disarm). Any player can do it, and like any rules change it only takes during warmup.

## Basic ruleset

Yawnmode inherits the base mode's objective and locks in a bundle of feel tweaks. The characteristic ones:

- **No fall damage.** You keep your velocity on landing instead of taking the usual hit -- the source calls it "no broken ankle."
- **Harder nailgun.** Nails deliver more kickback (and skip the usual alternating-nail pattern), so the nailgun shoves harder.
- **Stronger green armor.** Green armor absorbs more than standard (0.4 instead of 0.3); yellow and red are unchanged.
- **Beefier axe and super shotgun.** The axe hits for far more (50 instead of 20 in dmm3), and the SSG fires more pellets with a wider spread and more damage.
- **Respawn with your last weapon.** You always come back holding the weapon you had, rather than dropping to the default.
- Plus smaller tweaks to backpack drops, fireball damage, and self-discharge.

## How it plays

The underlying game -- usually a 1on1 -- keeps its goal; what Yawnmode changes is how it feels to move and fight. With fall damage gone you can throw yourself around the map freely, the buffed melee and shotgun make close range punchier, and the armor and weapon tweaks add up to a looser, bouncier, sillier duel. It's kept around for variety, not for serious play. While it's active it also blocks a handful of admin commands, reporting "command blocked because yawnmode is active."

## Hosting & settings

Yawnmode is a toggle mode, so it isn't part of the `k_allowed_free_modes` allow-list and there's no bit to manage. Its effects are all built in -- `k_yawnmode` is the only cvar, a plain on/off with nothing to tune. It does **not** stick in `server.cfg`: KTX resets it to `0` on every mode activation (the `common_um_init` block), so the warmup `/yawnmode` command is the only way to arm it per match; a dedicated server pins it on through the per-usermode config that execs after that reset (see *server-setup*).

## See also

- The match-modifier group -- `berzerk`, `killquad`, `freshteams`, `nosweep` -- other single-toggle modes layered on a base game. Yawnmode is the odd one out: where those change one rule, it bundles a grab-bag of feel tweaks.
- `1on1` -- the duel Yawnmode was written to modify, and its natural home.
- `server-setup` -- how toggle modes are armed, and the dedicated-server path for pinning one on.
