# Arc (future): ezQuake help-JSON documentation-gap -- map + propose + upstream

**Created:** 2026-05-17 (spun out of enforce-L1-runtime-truth Pass 5).
**Shape:** metadata-fidelity arc (NOT presence-fidelity). **Status:** parked;
**hard dependency** -- runs only AFTER the enforce-L1-runtime-truth arc ships.
**Predecessor:** `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
(see its "Out of scope -- siblings"); parking
`docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`.

## Why this arc exists (verified Pass 5, not assumed)

ezQuake ships a documentation system; a real, partly self-acknowledged slice
of its user-facing surface is undocumented. Verified live (HEAD `3f9e724f`):

- `ezquake.com/docs/commands.html` renders `help_commands.json` 1:1 -- it is
  a Vue `v-for` over the imported JSON (`ezquake-docs/docs/docs/commands.md`);
  `ezquake-docs/scripts/update_help_files.sh` pulls the file straight from
  ezquake-source. There is NO hand-authoring layer; the JSON IS the manual.
- Of 511 `help_commands.json` entries: **346 hand-written** (real
  `description`), **165 `system-generated:true` stubs** (registered command,
  no description -- **tier-1 gap**, ezQuake already enumerated these), and
  the **entire HUD command family ABSENT** -- not even stubbed.
- Tier-2 root cause (verified, `help.c:957-977`): `Help_Describe_f` walks the
  live `cmd_functions` runtime table, but has an EXPLICIT
  `if (cmd_func->function == HUD_Plus_f || HUD_Minus_f || HUD_Func_f)
  continue;` guarded by the comment `// not interested in hud's
  system-generated commands for the moment`. ezQuake's own doc tool
  deliberately skips the HUD command family; "for the moment" went stale.

To a user, `+hud_radar` is exactly as real and bindable as `+forward`
(which IS documented). The asymmetry is arbitrary from where they sit, and
the command cannot be learned by typing it (it just fires) -- the manual is
the only consumer. This is a genuine documentation defect.

## Why it is OUT of scope for the predecessor arc (and depends on it)

The enforce-L1-runtime-truth arc is **presence-fidelity**: make L1 tell the
truth about what is present and live. This arc is **metadata-fidelity**:
fill the documentation. Different North Star; folding it in is the exact
scope-bleed D1 forbids. It is a genuine **sequential dependency**: you
cannot map the doc gap until you know the true entity set, and the
predecessor arc is what produces it -- specifically Track B makes the hidden
HUD commands first-class L1 entities, at which point qw-oracle's existing
help-JSON `needs_doc` audit can see them.

## Scope (when this arc runs)

1. **Map the gap from post-predecessor L1.** Tier 1: the 165
   `system-generated:true` stubs. Tier 2: the HUD command family (now
   first-class L1 entities via Track B) cross-referenced absent from
   `help_commands.json`. (Possibly also non-command help-JSON families --
   verify scope at brainstorm.)
2. **Propose descriptions.** For each gap entity, draft a user-facing
   description grounded in source (the dual-doc model -- memory
   `reference_ezquake_dual_doc_model` -- governs: help-JSON = user WHAT, NOT
   the coder-WHY comment).
3. **Upstream contribution.** PR to nano/slime (memory
   `reference_ezquake_dev_team`): the proposed `help_commands.json` entries
   PLUS the concrete code-pointer `help.c:967-970` (their own acknowledged
   TODO -- high credibility). Attribution per CLAUDE.md upstream-PR rule
   (`Assisted-by:`, operator signs; memory
   `reference_upstream_pr_attribution`).

## Open questions for the brainstorm

- Does the existing `needs_doc` audit already flag the literal `+/-` family
  (`+forward`/`+attack`, which are first-class but undocumented today)? That
  verifies the "presence -> auto needs_doc" seam for this command shape.
- Is the deliverable a single upstream PR, or per-family batches?
- Does the help.c skip removal belong in the same PR (a code change) or a
  separate issue? (Touches their build/help-generate flow.)
- Scope beyond commands: do `help_variables` / `help_macros` have analogous
  gaps worth the same treatment, or commands-only first?

## First actions for the picking-up terminal

1. Confirm the predecessor arc has SHIPPED (Track B entities in L1).
2. Read this doc + the predecessor spec's siblings section + memories
   `reference_ezquake_dual_doc_model`, `reference_ezquake_help_generate_mechanism`,
   `reference_ezquake_dev_team`, `reference_upstream_pr_attribution`.
3. Route into arc-classifier/brainstormer (doc-gap is design-shaped:
   gap-mapping method, description-authoring rigor, upstream packaging).
