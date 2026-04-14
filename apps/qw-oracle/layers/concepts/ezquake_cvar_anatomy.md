---
id: concept:ezquake_cvar_anatomy
title: Anatomy of an ezQuake cvar
description: How to read an ezQuake cvar row - name, type, default, group - and what the major groups mean.
tags: [ezquake, cvars, reference]
references:
  cvars:
    - ezquake:cvar:cl_bob
    - ezquake:cvar:crosshair
    - ezquake:cvar:sensitivity
  commands: []
  sessions: []
  concepts:
    - concept:qw_command_vs_cvar
    - concept:ktx_matchstart_injection
authored_by: ParadokS
authored_at: 2026-04-14
confidence: high
---

# Anatomy of an ezQuake cvar

Every cvar in ezQuake has a `name`, a `type` (float / int / string / bool / enum), a `default` value, and belongs to a `group` that organizes the client's settings UI. The group hierarchy has two levels: a `major_group` like "Graphics" or "Input" and a specific `group_name` like "Input - Misc".

For knowledge-base purposes, the canonical id of a cvar is `ezquake:cvar:<name>` - e.g. `ezquake:cvar:cl_bob` is the canonical id for the classic view-bob cvar. Version-pinned ids (e.g. `ezquake:cvar:cl_bob@v4.0.1`) are reserved for when behavior changed across releases; the un-suffixed id always refers to the latest known definition.

## Reading a row

The `kb_cvars` table holds these columns per row:

- `name` - the literal cvar identifier used in console and configs
- `type` - declared type, guides UI and validation
- `default_value` - what fresh installs start with
- `major_group` / `group_name` - settings UI hierarchy
- `description` - the human-readable explanation from the source
- `source_file` / `source_line` - where the cvar is declared (FTE rows carry this, ezQuake rows do not - see below)
- `extraction_method` - how the row was produced (`scraped-json` vs a future `ast-extractor`)

Not every column is populated. `source_file` and `source_line` are null for ezQuake rows in the POC import because the upstream scraped JSON does not capture them. FTE rows do carry source paths (e.g. `engine/server/sv_phys.c`) because the FTE scrape, though shallow in other ways, happened to harvest them. A phase-2 AST extractor will fill in the ezQuake side.

## What descriptions look like

- `cl_bob` - "This variable controls how much your weapon moves up and down when walking."
- `crosshair` - (no description; enum type; the scraper did not catch this one - a gap to document in the Layer 1 coverage doc)
- `sensitivity` - "This variable sets the sensitivity of the mouse, it is one of the most important settings..."

The `crosshair` gap is intentional evidence that the current scrape is incomplete - see `docs/layer1-category-coverage.md` for the full gap list. Phase-2 AST-based extraction will close most of these.

## When a cvar has no ezQuake source

Some identifiers that appear to be cvars in a player's config are actually set by a server via `stuffcmd` and have no ezQuake definition at all. See `concept:ktx_matchstart_injection` for the classic case: KTX servers inject commands and cvars into the client's namespace on connect. A "missing" cvar is often a server-owned one, not a typo.
