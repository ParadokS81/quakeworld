# Promote methodology learnings to served admin/player concept notes

**Parked:** 2026-05-29 (surfaced mid game-mode methodology-reconciliation).
**Status:** future stream, waiting on trigger. Not blocking the game-mode note arc.

## The insight

A lot of genuinely user-useful knowledge produced during the game-mode work lives only in **internal** `_methodology/game-modes/` docs, which are **never served** — the concept-note loader ingests only top-level `curated/concept-notes/*.md` (non-recursive), so anything under `_methodology/` is authoring guidance for the curator, invisible to the MCP/oracle.

That's the right place for *authoring* guidance. But some of what's in there is exactly what a **user** — especially a **server-admin user** — would ask for, and it currently has no served home:

- How the game-mode classifications relate (the 10 experience groups; standalone vs mutator as mechanism-metadata; what "arena"/"standard"/"modifier" mean).
- The **hosting model**: `k_allowed_free_modes` as a bitmask (enable vs restrict), the `UM_*` bit-sharing groups, the `dmm0-5` deathmatch flags, the dynamic one-server-runs-all-modes model, matchless-FFA dedicated servers, where the per-mode configs live (`configs/usermodes/<mode>/`).

A query like *"what game modes should I run on my server?"* should pull a **server-setup** concept note + a **"what modes are available and how they relate"** concept note. Today it pulls neither — only the siloed per-mode notes (each of which has its own `Hosting & settings`, but no cross-mode overview).

## Candidate served notes (when triggered)

- **`game-modes.md`** — foundational overview. Player half: the experience-group landscape + how modes relate. Admin half: the hosting model above. (This is the "foundational how-KTX-modes-work note" already flagged as parked in `experience-group-classification.md:83`.)
- **`server-setup.md`** (or similar) — how to stand up / configure a KTX server; overlaps with the outdated, poorly-structured old-wiki admin guides we'll eventually restructure.
- Possibly a **`deathmatch-modes.md`** reference (dmm0-5 flags) — already referenced as `(pending)` from 4on4/ca/wipeout `See also`.

## Harvest sources (do NOT re-derive — these carry source-verified facts)

- `_methodology/game-modes/experience-group-classification.md` — the locked taxonomy + the 27-mode appendix + command-table triage + (post-reconciliation) the mutation interlocks + `mode_class` advisory.
- The shipped per-mode notes' `Hosting & settings` sections (4on4 / ca / wipeout / killquad) — bit-sharing prose, `k_allowed_free_modes` defaults (4095), the `UM_4ON4`=8 group.
- The bit-sharing patterns table + dmm-flags notes already verified during the methodology work.

## Trigger

Either: (a) an admin-facing query stream emerges ("what should I run?", "how do I set up X"), or (b) the old-wiki admin-guide restructuring arc kicks off (this stream folds into it). Until then, the knowledge stays in the internal docs as the harvest source — captured here so it isn't forgotten in a drawer.

## Relation to the live arc

The game-mode **methodology reconciliation** (simplify internal docs to the experience-first flat structure) proceeds independently and is the *reason* this was surfaced: simplifying the internal docs is fine precisely because the user-facing relational/admin knowledge is meant to live in served notes (this stream), not in `_methodology/`. The reconciliation keeps the knowledge in the internal docs (as harvest source); it does not delete it.
