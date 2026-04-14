# Concept note frontmatter schema

Every `.md` file in `layers/concepts/` (except `README.md` and files prefixed with `_`) must begin with YAML frontmatter matching this shape:

    ---
    id: concept:<slug>                    # required, must match filename stem
    title: <short title>                  # required
    description: <one-line description>   # required, used by MCP get_concept_note
    tags: [tag1, tag2]                    # required, can be empty list
    references:
      cvars:    [ezquake:cvar:..., ...]                    # Layer 1 cvar canonical ids
      commands: [ezquake:cmd:..., ktx:cmd:..., ...]        # Layer 1 command canonical ids
      sessions: [session:discord:#chan:YYYY-MM-DDT..., ...] # Layer 2 session ids (optional)
      concepts: [concept:other_note, ...]                  # Other concept notes (optional)
    authored_by: <author>                 # required (e.g. ParadokS)
    authored_at: YYYY-MM-DD               # required
    confidence: high | medium | low       # required
    ---

All `references.*` arrays may be empty but must be present. The verifier script (`scripts/verify-concepts.mjs`) checks that:

- Every required top-level field exists.
- The `id` matches the filename stem.
- Every `references.cvars` entry exists in `kb_cvars`.
- Every `references.commands` entry exists in `kb_commands`.
- Every `references.sessions` entry resolves to an existing row in the `sessions` table (parsed from the canonical shape `session:<platform>:<channel>:<started_at>`).
- Every `references.concepts` entry points at a file that exists in this directory.

Warnings (not errors) are emitted for missing concept cross-refs and session rows — those are soft links. Errors are emitted for unknown cvar/command ids, missing required fields, and id/filename mismatches.
