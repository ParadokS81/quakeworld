# KTX / MVDSV Layer-1 describe-fill -- design spec

**Status:** in progress (arc-brainstormer multi-pass). Created 2026-05-15 during Pass 1.
**Arc capture:** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-l1-describe-fill.md` (locked conceptual model; not re-derived here).
**Grounding evidence:** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/` (gap-findings + probe-0 denominators + coverage manifest).

## Purpose

Every admin-configurable KTX/MVDSV knob (cvars, commands, cmdline params,
info_keys) ends up with a sensible, provenance-stamped Layer-1 description.
That baseline is the single source of truth that the MCP, the Slipgate JSON
snapshot, a future web server-manager, and wiki.slipgate.me all render from,
and that the separately-docketed game-mode L3 concept notes cite as anchors.
This arc builds the foundation; it does not write L3 concept notes.

## Locked conceptual model (from the capture; do not relitigate)

- Single source of truth + generated projections (MCP / snapshot / web / wiki
  are render targets, never hand-edited).
- Three-tier description model: mechanical-extract from a real shipped
  artifact / source-synthesis from observable call-site behavior / opinion
  banished to L3.
- Provenance graduation path: a description is born synthesized, can graduate
  only on deliberate logged upstream adoption, de-duplicated so our own
  contribution cannot echo back as independent source truth.
- Staleness anchoring: a synth description is pinned to the source version it
  was written against and auto-flagged for re-review when the underlying
  extracted fact drifts.
- Hard L1-is-fact / L3-is-opinion boundary.
- KTX-first sequencing. The brainstorm sizes phases; it does not relitigate
  engine order or the locked model.

## Decisions log

### D1 -- Data boundary: configurable buckets only; no L3 prose (Pass 1.1)

This arc fills descriptions for every configurable bucket -- cvars, commands,
cmdline params, info_keys -- for KTX and MVDSV, including every mode-related
knob (the cvars and commands an admin sets to run or tune a KTX game mode).

It does NOT write the gameplay story of a mode. Mode narrative is L3 synthesis
owned by the separately-docketed game-mode concept-note arc
(`docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`).

Reason: single source of truth, no dual maintenance. A cvar description is an
L1 fact written once on the cvar; a mode's character is L3 prose written once
as a concept note that cites those same L1 cvars. Writing the mode story into
L1 too would duplicate knowledge across two homes and let it drift -- the
exact failure the single-source-of-truth model exists to prevent.

The 27 KTX game_mode catalog rows and 317 mode_default overlay rows in
`gameplay_mechanics` are out of scope: they are not a bucket of knobs. An
overlay row records "mode X sets cvar Y to value Z" and points at a cvar that
is already in the cvar bucket and gets its description here. Every actual knob
is a cvar or command this arc describes; nothing falls through. KTX absorbing
modes as a code blob only means KTX has more mode-related cvars/commands than
ezQuake -- all in the in-scope buckets.

Consequence for the provenance schema: it governs the `entities` table
descriptions only (KTX/MVDSV cvars, commands, cmdline params, info_keys). It
does not model provenance for `gameplay_mechanics`, which by design has no
`description_origin` column (structurally extracted; provenance via
`source_ref` + `props_json`).

### D2 -- Origin-state model: this arc creates the user-doc track KTX/MVDSV never had (Pass 1.2)

Framing (load-bearing, clearer than the capture doc): ezQuake is the only
engine with a user-facing documentation track (help-JSON), owned in its own
repo. KTX, MVDSV, FTE, QWCL have no user-doc track -- only dev code comments.
This arc creates the missing user-doc track for KTX and MVDSV, owned by us in
qw-oracle Layer 1 because upstream never wrote one. It is NOT a docs.json
clone: (a) it is the track plus provenance discipline (ezQuake help-JSON has
no origin/staleness tracking -- the cause of its 156 unwatched stale
references); (b) it is built to graduate upstream via the locked graduation
path, not to fork forever. FTE/QWCL are later arcs on the same engine-agnostic
pattern.

Origin-state model:

- `source_inline` -- unchanged. Means a KTX/MVDSV developer wrote this as a
  code comment. KTX/MVDSV have no help-JSON, so the comment is the only source
  surface and labeling it `source_inline` is correct -- this is NOT the
  ezQuake comment-promotion bug (that bug was laundering a comment into a
  separate user-doc field; KTX/MVDSV have no such field to launder into).
- One NEW tag for "lifted mechanically from a shipped human-written file"
  (in-repo ktx.cfg / nQuake ktx.cfg / mvdsv.6 man page). Which file is
  recorded in a separate provenance field, not its own tag (the
  nQuake-vs-in-repo conflict policy needs the file identity anyway; tag-per-
  file would bloat the vocabulary). Exact label + file field deferred to Pass 3.
- `synthesized` -- LLM-written from observable code behavior. Plus two
  per-row tracking fields built now (state that changes over time, so fields
  not tags): anchor version (which source version it was written against);
  re-review flag (auto-set when the underlying extracted fact drifts). The
  upstream-frozen marker is NOT built now -- see D3 (graduation deferred); it
  is a noted future hook, not a column.
- Opinion -- no tag; absent from L1 by the locked boundary.

Carry-forward to Pass 2: whether a given dev code comment is actually good
enough to serve a *user* (trust-but-verify) is the Pass 2 quality-bar / review-
gate question, not a Pass 1 schema question.

### D3 -- Upstream graduation deferred to a future deliberate procedure (Pass 1.3)

Graduation (synthesized text adopted upstream, then de-duplicated so it cannot
echo back as independent source truth) stays in the locked conceptual model
but its infrastructure is NOT designed or built in this arc. Reason: nothing
can self-echo until the operator has presented to the KTX/MVDSV dev group and
a deliberate manual adoption procedure has run -- building an automatic guard
now is infrastructure for an event that may not happen (premature complexity).

Pass 1 leaves only a non-boxing hook: `synthesized` is a distinct tag carrying
an anchor version, so a future procedure can identify "these entries are ours,
written against version X" and act deliberately. No upstream-frozen column, no
content-hash contribution ledger now. If/when graduation becomes real, it is
its own scoped piece of work (Pass 5 deferrable tail names it; does not design
it).

The one drift case that IS our-part now -- a maintainer independently writes a
genuine source comment for a knob we synthesized, with zero action from us --
is plain version drift, not graduation. Handled under staleness (Pass 1.4),
not the graduation machinery.

### D4 -- Staleness = a walk-time report, operator-reviewed in-terminal (Pass 1.4)

Each synthesized description stores the source version it was written against
(anchor version, D2). The per-version re-extract/ingest -- which already runs
when a new KTX/MVDSV version is walked -- compares each synthesized
description's knob against its anchor and produces a **walk-time report**,
baked into the new-version runbook. The report has three sections:

1. **Drifted** -- synthesized descriptions whose underlying facts changed vs
   the anchor. Trigger list (tight, nothing looser, so a flag means
   something): (a) default value changed; (b) type changed; (c) set of valid
   values / enum choices changed; (d) knob retired or renamed; (e) a genuine
   upstream source comment newly appeared for it. Read-site moves, cosmetic
   refactors, and unrelated nearby changes are explicitly NOT triggers.
2. **Added** -- new knobs with NULL description (need writing). Falls out of
   the same exhaustive N/M coverage count that drives the whole arc; no
   judgement call.
3. **Removed** -- knobs retired/renamed at the new version; their description
   is now orphaned and routes to the existing source_state transition
   handling.

Review model: the operator reviews the report in this terminal at walk time;
re-review is a manual confirm-or-rewrite pass (Claude proposes, operator
approves -- same model as the rest of the arc), operator-paced, not auto-edit
and not a notification system. A flagged description keeps serving, stamped
"may be stale as of version X" -- stale-but-present beats a hole. This is the
same auto-flag-on-drift property concept notes already have via typed anchors.

Cadence makes this sustainable: KTX ships ~1 tagged release/year (1.46
2025-09, 1.45 2025-02, 1.44 2024-10, 1.43 2024-03, 1.42 2022-11); MVDSV ~1-2/
year. ~1-2 review events per engine per year.

Explicitly an intermediary solution. Future non-blocking hook (NOT this arc):
a visual monitoring website replacing in-terminal report review once the
broader system is coherent.

## Pass status

| Pass | Scope | Status |
|---|---|---|
| 1 | Provenance + staleness schema | COMPLETE (D1-D4) |
| 2 | Source-synthesis method + quality bar + review gate | pending |
| 3 | Mechanical-extract pipeline + drift resolution + ezquake.com probe disposition | pending |
| 4 | Multi-projection data contract + wiki-feed mechanism | pending |
| 5 | Upstream export (deferrable tail) + lessons-as-constraints + phase sizing + game-mode-arc relationship | pending |

### Pass 1 sub-questions

- 1.1 Data boundary -- LOCKED (D1).
- 1.2 Origin-state model -- LOCKED (D2).
- 1.3 De-dup / self-echo rule (graduation) -- LOCKED (D3: deferred).
- 1.4 Staleness anchoring + re-review trigger taxonomy + report -- LOCKED (D4).

### Pass 1 close

Resolved: D1 data boundary (buckets only, no L3); D2 origin-state model (this
arc creates the owned user-doc track KTX/MVDSV never had; keep source_inline,
one new shipped-file tag, synthesized + anchor/re-review fields, opinion
absent); D3 graduation deferred to a future deliberate procedure (non-boxing
hook only); D4 staleness = operator-reviewed walk-time report, sustainable at
~1 release/engine/year.

Carry-forwards (each with a track):

- **Trust-but-verify: is a given dev code comment good enough for a user?**
  -> Pass 2 (quality bar / review gate).
- **Exact shipped-file origin tag label + the file-provenance field + the
  nQuake-vs-in-repo conflict policy** -> Pass 3 (mechanical-extract pipeline).
- **Full upstream-graduation design (frozen marker, content-hash de-dup
  ledger, the deliberate adoption procedure)** -> Pass 5 deferrable tail;
  names it, does not design it. Gated on the operator presenting to the
  KTX/MVDSV dev group first.
- **L3 inverse-staleness problem** (a newly-introduced upstream entity that
  *should* be referenced by some concept note, but no typed anchor exists yet
  to flag it -- needs a changelog-reading LLM judgement). NOT an L1 problem;
  does not exist in this arc. Routed OUT to the L3 concept-note line
  (`docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`
  and broader L3 staleness). To be breadcrumbed there at session wrap.
- **Visual monitoring website** replacing in-terminal walk-time report review
  -> future non-blocking hook, not this arc.

Pass plan revisions: none. Five-pass plan holds. Pass 5's upstream-export
piece remains the deferrable tail (operator steer + D3 reinforce it).
