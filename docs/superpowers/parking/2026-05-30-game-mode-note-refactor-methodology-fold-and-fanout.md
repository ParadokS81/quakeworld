# Handoff: game-mode concept-note refactor — methodology fold + fan-out

**Date:** 2026-05-30. **Owner:** fresh terminal (driving session hit ~500k context mid-work).
**Why a handoff:** the audience-split restructure of the 27 KTX game-mode notes is **proven on two exemplars** (CTF + 4on4, committed `c5ad54ae`). The remaining work — fold the proven rules into the two methodology docs, then fan out the other ~25 notes — is precise and load-bearing, best done fresh. This doc carries the full spec so you don't re-derive it.

## Where things are

- **Two exemplars shipped + committed** (`c5ad54ae`): `curated/concept-notes/ctf.md` (max / special UserMode — rich Settings, `###` subsystems) and `curated/concept-notes/4on4.md` (standard UserMode — `Settings to tune` omitted, the `4095`-reframe). Both restructured to the v2 skeleton **and** wiki-grounded.
- **The methodology docs still describe the OLD (v1) structure** — updating them is the immediate next task.
- A separate terminal is fixing the MCP (see Reads) — independent; don't wait on it, but its gap is why `Basic ruleset` is body-complete.

## The proven v2 structure (the spec to encode)

Skeleton: `Summary(lead) · Activate · Basic ruleset · Settings to tune* · How it plays · Maps* · History* · Hosting & settings · See also`  (`*` = conditional, omit if empty)

Section contracts:
- **Summary** = orienting hook + objective + a *bare* command teaser (`/4on4`). No cvar names (anti-pattern). Full activation procedure lives only in Activate. (Kept as `## Summary` per corpus convention — no body H1.)
- **Activate** = the command(s) only. Universal activation behavior (the pre-match `is_rules_change_allowed` gate) lives once in `server-setup`, not per-note.
- **Basic ruleset** = the key enforced defaults the mode locks in, scannable. **Body-complete** — the `mode_default_init_array` L1 pointer does NOT resolve via MCP, so never defer to it. Each cvar value lives here once; its effect/feel goes to How-it-plays.
- **Settings to tune** (conditional) = mode-specific tunable knobs (name / default / effect + in-game toggles); **omit entirely when the mode has none** (4on4 → no section).
- **How it plays** = experience / objective / strategy prose (fold the old `Strategy` in; `###` subsections ONLY for distinct named mechanics, à la CTF's hook/runes). **Must be grounded in the local wiki rip** — inherited prose can be flat wrong.
- **Maps** (conditional) = community-tiered + structured (canonical staples vs the "Kenya" pool, per the wiki). Kept parseable for future automation. Proposed format: comma-by-category (operator to confirm vs one-per-row / table).
- **Hosting & settings** = admin-only, thin: availability one-liner (the `4095`-reframe: available by default, remove the bit to restrict, bit-sharing caveat) + this mode's wrinkle → `server-setup`. NO knob list, NO enforced-defaults list.
- Cross-cutting: each value has ONE home (no restating across sections); factor out anything universal to `server-setup`/`deathmatch-modes`; mechanical accuracy in reader-facing prose.
- Exemplars → **CTF + 4on4**; retire the old (4on4/ca/wipeout/killquad under v1).

Frontmatter (`concept-note-frontmatter-schema.md`): **drop `activation_summary`** (0 code consumers; `Activate` is canonical). **Keep `mode_default_init_array`** as latent metadata but strip the "reachable via this pointer" promise from note bodies.

## The fan-out is TWO jobs (key finding — don't treat it as pure restructure)

1. **Structure relocation** (Activate / Basic ruleset / Settings / Hosting split, dead-pointer + anti-pattern fixes) — mechanical, subagent-safe.
2. **How-it-plays content-correctness** — needs the **local wiki rip as ground truth + operator review**. The inherited prose can be subtly or flatly wrong. Proof from 4on4: the original framed it as "weapon denial," but dmm1 weapons *do* respawn (30s) and the real game is **armor control + powerup running + item timing + reporting** (per `Teamplay_Guide.json` + `Deathmatch.json`). Three latent defects were caught in two notes (`+scores` stuck-alias, a cvar in the Summary, the wrong-angle How-it-plays).

## Reads required (cold start)

- The two exemplars: `apps/qw-oracle/curated/concept-notes/{ctf,4on4}.md` — the ground truth for the shape.
- The methodology docs to rewrite: `curated/concept-notes/_methodology/game-modes/concept-note-section-structure.md` + `concept-note-frontmatter-schema.md`.
- `curated/concept-notes/server-setup.md` — the shared admin note Hosting sections defer to (WIP — needs a completeness pass; see Open decisions).
- **Local wiki rip:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/*.json` (per-article `.wikitext`; `redirects.json` + `article-list.json` index it). The authoritative source for How-it-plays. Per mode, consult: the mode page + `Deathmatch.json` + `Teamplay_Guide.json` + relevant map pages. **Do NOT fetch the live QWiki** — use the rip.
- The MCP gap (why Basic ruleset is body-complete): `docs/superpowers/parking/2026-05-30-mcp-realignment-ktx-data-handoff.md`.

## First three actions

1. Read the two exemplars + the two methodology docs cold.
2. Rewrite the two methodology docs to the v2 spec above (encode the contracts; exemplars → CTF + 4on4; drop `activation_summary`). Present for operator review before committing.
3. Then plan the fan-out — resolve the Open decisions first; **do not start fanning out until the methodology is locked AND `server-setup` completeness is resolved.**

## Open decisions (operator, at fan-out planning)

- **Maps format** — comma-by-category + community tiers (proposed) vs one-per-row vs table.
- **Fan-out posture** — structure-by-subagent + How-it-plays wiki-grounded + operator reviews flagged content.
- **Toggle-mode third exemplar** (`killquad`)? CTF + 4on4 are both UserModes; the 8 `k_*`-toggle modes' reframe (base-then-`/toggle`; "set `k_x 1` doesn't work" — `common_um_init` resets them; lgc is the exception) is unexercised.
- **`server-setup` completeness pass — PREREQUISITE.** Per-mode Hosting defers generic mechanics to `server-setup`, but it's a WIP draft; deferral drops facts it doesn't hold. Growing list of facts to confirm-or-add: the `k_allowed_free_modes` bitmask mechanics (incl. read-at-map-load → needs restart), the universal pre-match-only gate.

## Candidate future notes (surfaced, not per-mode content)

- `frogbots.md` — the bots gap (the `botcmd` family; bots used by tot/lgc/practice). See the earlier hosting-reframe handoff.
- A teamplay-guide note — item timings, the teamsay vocabulary, reporting (4on4 references this layer; don't reproduce it per-mode).

## Don'ts

- Don't depend on the `mode_default_init_array` pointer (unresolved via MCP — Basic ruleset is body-complete).
- Don't fetch the live QWiki — use the local rip.
- Don't dress enforced values as tunables; don't restate a value in more than one section.
- Don't fan out before the methodology is locked and `server-setup` completeness is resolved.

**When in doubt:** the two committed exemplars are ground truth for the shape; the local wiki rip is ground truth for gameplay facts.
