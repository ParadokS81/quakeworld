# Game-mode concept-notes v2 -- fresh-terminal handover

**Date:** 2026-06-01. **Status:** methodology locked + proven on 5 exemplars; ~20 notes still to migrate. Pick this up cold in a fresh terminal.

## Where things are

The game-mode concept-note methodology was reworked and locked this session. The player/admin **access split** that derailed the earlier attempt is now resolved and encoded.

- **Methodology (locked, committed):** `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/` -- `concept-note-section-structure.md` (the section skeleton + rules), `concept-note-frontmatter-schema.md`, `experience-group-classification.md` (the 27 modes, their groups, the appendix table), `triage-rules.md`.
- **Clean v2 exemplars (calibrate against these, not the others):**
  - `4on4.md` -- lean standalone (no Settings to tune).
  - `ctf.md` -- rich standalone; the player/admin split in action (player toggles in Settings to tune, `k_ctf_*` server cvars as a structured list in Hosting).
  - `berzerk.md` -- lean modifier (single-rule delta, so no Basic ruleset).
  - `dmm4.md` -- aim/edge case; structured settings (bitmask + scalar + toggle).
  - `killquad.md` -- modifier with a multi-rule Basic ruleset.
- **Commits this session:** `5ad13604` (methodology + berzerk), `3b2665a8` (dmm4), `a9d21aa5` (killquad + Rule 3 fix), `79f2b12a` (ctf). All on `main`.

## The v2 rules (locked this session)

1. **Access split.** A setting goes to a section by *who can reach it*. Player types a console command -> `Settings to tune`. Needs `server.cfg`/rcon -> `Hosting & settings`. The "gamehost" is a trap: anyone can toggle a mode and is still just a player.
2. **Basic ruleset is conditional for modifiers.** Keep it when the modifier locks several distinct rules (killquad's five); omit it when the whole delta is one rule already in Summary (berzerk). Standalones always carry it.
3. **Settings render as a structured list:** `name -- default/range (or enum: each value's meaning) -- one-line effect`. Values for KTX `k_*` cvars come from **source**, not L1 (see gotcha below).
4. **Gimmick toggles get no always-on / dedicated-server path** (berzerk, yawnmode). Surfacing it just hands a newbie a bad default.
5. **One fact, one home; no audience whiplash.** Player sections carry gameplay; Hosting carries admin setup and never restates gameplay; See-also is terse cross-refs, not summaries.
6. **Restructuring re-verifies inherited claims.** Reshaping a v1 note is not a license to trust its prose or values -- re-check against source.

## Critical rules / gotchas

- **KTX `k_*` cvars carry NULL values in L1.** `lookup_entity` returns the name + `source_ref` only -- no help text, no default. Read the value from source: KTX checkout at `research/repos/ktx` (commit `1.47-2-g67253dc`, matches the methodology anchor). Headers in `include/` (`g_consts.h`, `g_local.h`); source in `src/`. Defaults live in the `*_um_init` config strings (`commands.c`, e.g. `ctf_um_init` at `commands.c:4438`, `common_um_init` at `:4161`) and in `RegisterCvarEx(...)` calls (`world.c`), not in L1.
- **Re-verify inherited prose AND values.** This session caught two errors in existing notes: berzerk's "spectator-friendly free-for-all" (wrong -- frags still count in a team base mode, so it's a blood-frenzy) and ctf's `k_ctf_hookstyle` enum (the note had `1 classic / 3 smooth`; source `vote.c` has `1 smooth / 2 fast / 3 classic / 4 crhook`). Assume v1 notes contain similar errors.
- **Don't repeat universal activation behaviour per note** (warmup-only, "can't change mode mid-match", who-can-toggle). It lives once in `server-setup`. A note's Activate carries only what's specific to that mode.
- **Toggle modes** (`k_<name>` mutators) reset on every mode change (`common_um_init`), so `set k_<name> 1` in `server.cfg` does NOT stick -- never tell a reader to enable a *mode* that way. (Config cvars that shape a *running* mode are different and do belong in Hosting.)

## Remaining work (the runway)

1. **Complete `server-setup.md`** (the fan-out prerequisite -- methodology Open Q#3). Every Hosting section defers universal mechanics to it: the `k_allowed_free_modes` bitmask (read at map load -> needs a map restart), the universal pre-match gate, the always-on per-usermode-config path. It is a WIP draft -- finish it before bulk migration, or the per-note deferrals point at gaps.
2. **Re-check the modifiers recast on 2026-05-29/31** -- `freshteams`, `nosweep`, `yawnmode`. They were recast "to v2" BEFORE today's access-split / structured-settings / de-dup rules, so they are v2-*structured* but may carry killquad-style issues (Hosting restating gameplay, settings mis-placed). Verify against the rules above.
3. **Migrate the ~20 untouched notes.** Roster variants (`1on1` `2on2` `3on3` `3on3on3` `4on4on4` `10on10` `XonX` `2on2on2`) are similar-shape -- batch them. Then `ca` `wipeout` `ffa` `hoonymode` `blitz2v2` `blitz4v4` `race` `tot` `bloodfest` `instagib` `midair` `lgc` `rocket-arena`.

To check a note's state quickly: v2 notes use `## Summary / ## Activate / ## Basic ruleset / (Settings to tune) / ## How it plays / (Maps) / (History) / ## Hosting & settings / ## See also` and have no body `# H1` and no `activation_summary` frontmatter field. v1 notes differ.

## The recast process (repeatable)

1. Read the existing note + the methodology section-structure doc.
2. Triage its content into the v2 sections, applying the access split (player commands vs server cvars).
3. Re-verify every value + inherited claim against KTX source at `research/repos/ktx`.
4. Apply the rules: modifier-conditional Basic ruleset, structured settings, no gameplay restatement in Hosting, terse See-also, drop universal boilerplate.
5. Show the operator a draft (especially contested content / value corrections), iterate, then write + commit. Commit per note (or per small batch).

## On the `game-mode-curate` skill

A `game-mode-curate` skill exists (investigate one mode -> produce a note). It predates today's rules -- **verify it aligns with the locked methodology before relying on it** (it may still encode the old section semantics). The manual recast process above is what's proven this session.

## First three actions (cold start)

1. Read the 4 methodology docs + the 5 exemplar notes (`4on4`, `ctf`, `berzerk`, `dmm4`, `killquad`).
2. Open `server-setup.md` and assess what's missing -- it is the fan-out prerequisite.
3. Confirm with the operator: finish `server-setup` first, then re-check `freshteams`/`nosweep`/`yawnmode`, then batch the roster variants.

## When in doubt

The operator works at intent level (player experience, useful-vs-noise) -- bring them mechanical facts verified against source, not against the existing notes. Show drafts for contested content and value corrections. Keep notes tight (not a book); fine verbosity phrasing is the operator's co-edit, so do your best and let them tweak. Open methodology questions still live: Q#1 (Maps format) and Q#3 (server-setup completeness); Q#2 and Q#4 were resolved this session.
