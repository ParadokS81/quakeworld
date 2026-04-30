# Fresh-session prompt — Slipgate snapshot consumption + doc_only filtering investigation

**Created:** 2026-05-01. **Status:** ready to execute. Paste the prompt block below into a fresh Claude Code session at the monorepo root.

## Background

Surfaced during the 2026-05-01 help-JSON classification arc wrap-up. Two suspicions the operator wants verified:

1. **Slipgate may not actually consume qw-oracle's `build-snapshot` outputs yet.** The Config Viewer was built earlier than the qw-oracle snapshot pipeline; it may still be reading old self-scraped JSON files that predate the qw-oracle data path.
2. **The Config Viewer should not surface `doc_only` entries** (orphan help-JSON references with no live source registration). If slipgate IS consuming the qw-oracle snapshots, current data shows 184 such zombies (139 cvars + 41 commands + 2 cmdline + 2 macros) being shipped without filtering. Zero `source_state` references exist in slipgate's TS/Svelte/Rust code.

## What landed in the prior session (so you don't re-derive)

- Help-JSON classification Tasks 5-8 shipped at commits `8601eb4` → `b36337c`. See `apps/qw-oracle/docs/arc-history.md` top entry.
- Snapshot files at `apps/slipgate-app/src/lib/config/data/ezquake-*.json` carry `source_state` field on every entity (verified via `head` of `ezquake-cmdline-params.json`).
- `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts:80-90` selects all entities (no source_state filter) and emits `source_state` as a field on each (line 143 maps `dynamically_registered` → `source_backed`, otherwise pass-through).
- A `grep -rn "source_state\|doc_only" apps/slipgate-app/src/` returns hits ONLY in the data JSON files — no application code references the field. Same for `apps/slipgate-app/src-tauri/`.

## Prompt block to paste into fresh session

```
Investigate two coupled questions about the slipgate-app config viewer's
relationship with qw-oracle's snapshot output:

QUESTION A: Is slipgate-app currently consuming qw-oracle's build-snapshot
outputs (apps/slipgate-app/src/lib/config/data/ezquake-*.json), or is the
config viewer still reading older self-scraped JSON files from a pre-
qw-oracle pipeline?

QUESTION B: If slipgate IS consuming the qw-oracle snapshots, the config
viewer is currently surfacing ~184 doc_only entities (help-JSON entries
with no live source registration; orphan zombies users can't actually
use). Should we:
  (1) Filter at producer side: add `AND source_state != 'doc_only'` to
      apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts around
      line 80, so doc_only never reaches slipgate. Cleanest. Snapshots
      shrink ~5%. Note this also drops the 27 aspirational_documentation
      entries (also doc_only by definition) -- decide if that's correct
      or if aspirationals warrant separate treatment.
  (2) Filter at consumer side: filter doc_only at slipgate's data-load
      layer or per-feature in the UI. More flexible (a hypothetical
      "config compatibility checker" feature might want to recognize
      doc_only zombies in user configs and warn about them).
  (3) Both: filter at producer side for the main viewer, but keep a
      separate "all-known-names" snapshot or DB query for any future
      compatibility-warning feature.

Approach:
1. Read apps/slipgate-app/CLAUDE.md and apps/slipgate-app/OVERVIEW.md
   to orient on the current data path.
2. Find where the config viewer loads its data. Likely entry points:
   apps/slipgate-app/src/lib/config/, plus any *Loader / *Service /
   *Store patterns.
3. Determine: does the viewer import from src/lib/config/data/ezquake-
   *.json (the qw-oracle outputs), or from some older path?
4. If older path: identify when the older path was last regenerated,
   what tool produced it, and where qw-oracle's outputs would belong.
5. Once consumption path is known, sample-check the viewer UI: pick
   a known doc_only name (e.g., cfg_browser_dircolor or mp3_play) and
   verify whether it currently appears in the viewer.
6. Propose a recommendation between (1) / (2) / (3) above with the
   tradeoff explicit.
7. Stop before implementing. Hand back to operator for the implement-
   or-defer decision.

Working directory: /home/paradoks/projects/quakeworld (branch main).

Context to NOT re-derive (previous session captured this):
- Snapshot files DO carry source_state field on every entity.
- build-snapshot.ts emits all entities (no source_state filter at the
  producer).
- Zero source_state references in slipgate-app/src/ TS/Svelte/Rust.
- 184 doc_only entries currently in slipgate snapshots: 139 vars,
  41 commands, 2 cmdline_params, 2 macros.
- Of the doc_only set: 156 are upstream-cleanup-eligible (action !=
  none in seed); 27 are aspirational_documentation; ~1 is bookkeeping
  (mp3_volume name-collision counted twice).
- Upstream issue QW-Group/ezquake-source#1117 was opened 2026-05-01
  proposing cleanup of the 156. If accepted upstream, the producer
  would naturally lose those rows on next extract -- but the 27
  aspirationals would remain unless filtered explicitly.

Quality bar: orient first via CLAUDE.md / OVERVIEW.md, don't grep cold.
Verify file paths before recommending changes. Skim relevant source
before proposing producer-vs-consumer architecture.
```

## Notes for the operator

- This is a research / decision task, not an implement task. The output should be a recommendation with tradeoffs, not a PR.
- The 27 aspirational_documentation entries are a real wrinkle. They describe behavior that the cvar/command does in some other way — useful for "what does this name mean?" lookups but misleading as "this cvar exists and works as documented." Producer-side filter would drop them; that may or may not be the right call depending on what slipgate's product pitch is.
- If the answer to question A is "slipgate uses old self-scraped data, not qw-oracle snapshots", then question B is moot for now and the open question becomes "what does the cutover look like?" — a separate arc.
