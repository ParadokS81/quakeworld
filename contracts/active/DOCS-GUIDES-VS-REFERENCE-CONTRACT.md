# Docs: Guides (L3) vs Reference (L1) -- cross-arc contract

**Status:** Active. Authored 2026-06-09 from the `demand-driven-l3-concept-authoring` arc planning session, capturing a cross-arc architecture decision reached in an operator + vikpe brainstorm the same evening.

**Coordinates two arcs:**
- `docs/superpowers/plans/2026-06-09-docs-quake-world/` -- the per-codebase L1 reference site (VitePress).
- `docs/superpowers/plans/2026-06-09-demand-driven-l3-concept-authoring/` -- the L3 player-help concept-notes arc (this contract's authoring side).

**Supersedes:** docs-quake-world `decisions.md` D1 / D7 / D19 wiki-targeting (amended 2026-06-09 -- see that arc's amendment log).

## The problem this resolves

ezquake.com is the only documentation site today: one client, hand-authored guides, stale after six years because nothing watched the cvar references. With all six codebases now in the Oracle's L1, the ecosystem needs documentation that (a) stays current automatically, (b) serves players regardless of which client they run, and (c) does not duplicate the same knowledge across per-engine sites. The two arcs above must not each invent their own answer to "where do guides live."

## The division of surfaces (the core contract)

Three surfaces, one source of truth each:

| Surface | Content | Source | Lives at |
|---|---|---|---|
| **Reference** | Per-codebase tunable knobs (cvars, commands, macros, cmdline params, info_keys, ...) by type/category | Oracle **L1** (AST-extracted) | docs.quake.world/&lt;codebase&gt; |
| **Guides** | Cross-codebase domain/feature how-tos (weapon scripts, HUD, game modes, server setup, ...) | Oracle **L3** concept notes, rendered | docs.quake.world (portal, user/admin-oriented) |
| **Social / strategy** | Player bios, clan/tournament history, tactical debate, culture | Community-editable | wiki |

**Single source of truth for guides: L3 concept notes.** A guide is a concept note *rendered* -- never hand-authored on docs.quake.world, never on the wiki. The note is authored once (in `apps/qw-oracle/curated/`) and served everywhere: the docs portal, the MCP/LLM, eventually slipgate's chatbot. The wiki's role narrows to the social/strategy layer that *should* be community-editable and *should not* be source-wired.

**Why this split:** L1 entities are naturally per-codebase (a cvar belongs to one engine); L3 guides are naturally cross-codebase (weapon-scripts spans ezQuake + FTE + MVDSV + KTX). The reference is siloed because the data is; the guides are unified because the data is. The deciding axis is **auto-sync**: source-wired facts can stay current automatically and belong on docs.quake.world; hand-maintained social content belongs on the wiki.

## Rendering: deterministic, not LLM

The note -> web-page transform is a **deterministic build-time renderer**, NOT a per-note LLM pass. An LLM in the render path would reinsert a manual bottleneck into the "auto-sync via the Oracle" pipeline -- the property the whole architecture exists to preserve. Every web affordance is derivable from structure in the note (see the note-structure contract below). Complexity is pulled to authoring-time (structure the note once, human-reviewed) so render-time stays mechanical. Optional LLM enrichments (per-client summaries, tone variants) may sit on top later, but the spine is deterministic.

## The note-structure contract (what the L3 arc produces / the renderer consumes)

The concept-notes arc authors notes carrying the structure the renderer depends on; the renderer reads exactly this:

- **Typed `related_entities`** (frontmatter): `<project>:<kind>:<id>`, cross-engine. Powers the entity cross-links (both directions).
- **Per-method support annotation:** each method/feature records which engines support it (baseline written once, deltas tagged). Prose convention for now (weapon-scripts' "Cross-engine:" lines); structured later (see cross-client, below).
- **Audience-delineated sections:** each section is player / admin / both. Powers the read-time audience lens.
- **Asset references:** notes cite visual surfaces (crosshair previews, HUD shots); the renderer embeds them. Notes stay text (MCP-friendly).
- **Named by domain, never by engine:** one "Weapon Scripts" guide, not per-engine variants.

## The cross-link contract

- **entity -> guide ("Used in"):** a build-time reverse-index over concept-note `related_entities`. Renders only where a note actually anchors the entity (no dead links). **Target: the docs.quake.world guides portal** (same site), NOT the wiki. (This is the docs-quake-world D7/D19 retarget.)
- **guide -> entity:** the note's `related_entities` become links into the per-codebase reference pages. Requires the reference to expose stable per-entity anchors/routes.
- Bidirectional, both powered by the same typed `related_entities` wire.

## Audience as a read-time lens (not an authoring split)

A note is one container (rules + gameplay + player-activation + admin-config). Audience is applied at consumption, not baked as separate notes:
- **MCP/LLM:** infers direction from the question ("how do I play X" -> player; "how do I set up X" -> admin); has both halves, can bridge or ask.
- **Web:** a Player/Admin lens toggle emphasizes or collapses sections by their audience tag; default to player (majority) or show-all.

## Cross-client handling

Method support varies by client (baseline `impulse 7` = all; `weapon 7 6` = most; `+fire_ar` = ezQuake-only; a future rust client = a likely third). Modeled as **per-method support-sets**, not per-note engine tags -- so the shared baseline is written once and only genuine deltas carry an engine label.

- **Prose now, structured later.** Author the support convention in prose (proven by weapon-scripts). Do NOT build a structured capability-matrix schema until a real second client (Xantom's rust port) gives a concrete divergence to structure to. Reality is richer than a boolean -- FTE's `cl_weaponhide_axe` is *renamed* (to `cl_weaponhide_preference`), not absent.
- **New-client onboarding = the same pipeline.** A new client's source runs through AST extraction -> its entities land in L1 -> each note's per-method support validates against L1 (method's command absent from that client's entity set -> auto-greys + flags). Partly auto-derived; only genuinely-novel methods are new authoring.
- **Trigger to revisit structuring:** rust-client onboarding.

## Soft-staleness: facts vs recommendations

Typed entity-wires auto-flag **fact** drift (a cvar renamed/retired by an extraction-walk). They do NOT catch "best practice changed" (a new client lands a better idiom; the recommendation goes stale though every cited cvar is still valid). The recommendation layer needs a **separate human-review trigger** -- a per-note `best_practices_reviewed: <date>` and/or a re-review when a new client onboards. Facts are guarded by architecture; opinions are not.

## Per-arc responsibilities

**`demand-driven-l3-concept-authoring` (L3 arc) owns:**
- The guide taxonomy (demand-ranked player-help domains) -- this IS the docs portal's guide menu.
- Authoring the notes to the note-structure contract above.
- The normativity boundary: grounded best-practice (engine-optimal, community-consensus) belongs in notes; deep strategy/culture goes to the wiki.

**`docs-quake-world` arc owns:**
- The per-codebase L1 reference (unchanged by this contract).
- The deterministic renderer + the guides portal (a later docs-web surface, downstream of the L3 arc -- NOT in docs-quake-world v1).
- The cross-link reverse-index, retargeted to the guides portal.
- Stable per-entity anchors/routes so guide -> entity links resolve.

## Deferred / not yet decided

- The guides-portal IA (topic-tree-primary with an audience lens, vs audience-primary) -- docs-quake-world's design call.
- Structured per-method support schema -- deferred to rust-client onboarding.
- Server-admin guides (a separate future arc; cross-engine mvdsv/ktx/qtv/qwfwd) -- the portal holds a slot.
- The interim delivery surface (Discord `!ask`, support form) -- out of scope for both arcs.
