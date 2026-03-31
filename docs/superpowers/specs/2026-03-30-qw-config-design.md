# QW Config — Design Spec

**Date:** 2026-03-30
**Status:** Approved for implementation
**Stakeholders:** ParadokS, vikpe (architecture advisor), matrix (ezQuake internals)

## Vision

A "pandoc for QuakeWorld configs." Drop in a config from any QW client, get a clean agnostic representation. Convert it to any other client. View and edit it with full documentation. Lower the barrier for players to try different clients — especially FTE, which may become the path to browser-based QW.

vikpe's framing: "define a client agnostic config format, make a round trip converter for quakeworld/ezquake/fte <-> agnostic."

## Architecture

```
ezQuake config.cfg  -->  parser  -->  AGNOSTIC FORMAT  -->  writer  -->  FTE config.cfg
FTE config.cfg      -->  parser  --/                   \->  writer  -->  ezQuake config.cfg
QWCL config.cfg     -->  parser  --/                   \->  writer  -->  QWCL config.cfg
                                          |
                                    viewer / editor
                                   (slipgate-app UI)
```

The agnostic format is the hub. Every feature flows through it.

### Where It Lives

```
packages/qw-config/           <-- core library (TypeScript)
  src/
    schema/                   <-- agnostic format types and validation
    data/
      qwcl.json               <-- QWCL baseline cvars (assembled from sources)
      ezquake-variables.json   <-- from ezQuake repo (2,554 vars)
      ezquake-commands.json    <-- from ezQuake repo (511 commands)
      ezquake-macros.json      <-- from ezQuake repo (68 macros)
      fte-variables.json       <-- extracted from FTE source (CVARD macros)
      mappings.json            <-- cross-client cvar equivalences
    parsers/
      config-parser.ts         <-- parse config.cfg text -> structured data
      ezquake.ts               <-- ezQuake structured -> agnostic
      fte.ts                   <-- FTE structured -> agnostic
      qwcl.ts                  <-- QWCL structured -> agnostic
    writers/
      ezquake.ts               <-- agnostic -> ezQuake config text
      fte.ts                   <-- agnostic -> FTE config text
      qwcl.ts                  <-- agnostic -> QWCL config text

apps/slipgate-app/            <-- UI consumer (SolidJS + DaisyUI)
  src/components/
    ConfigTab.tsx              <-- config viewer/editor tab
```

`packages/qw-config/` is a workspace package in the monorepo. slipgate-app imports it at build time — Vite bundles it into the final .exe. No publishing needed. The future slipgate website can import the same package.

## Scope

### In scope (cvars + binds)

- **Cvars/variables**: all client settings (`sensitivity`, `gl_picmip`, etc.)
- **Binds**: key and mouse bindings (`bind mouse1 +attack`)
- **Documentation**: description, type, default, range for every cvar

### Out of scope (for now)

- **Aliases**: client-specific scripting, doesn't convert cleanly
- **Teamplay messages**: heavily personal, not a conversion target
- **Weapon scripts**: complex, client-specific timing tricks
- **Exec chains**: `exec gfx.cfg` etc. — structural, not settings

These can be added later. The agnostic format should be extensible.

## Data Sources — Verified

### ezQuake (2,554 variables, 511 commands, 68 macros)

**Source:** JSON files in the ezQuake repo, manually curated by contributors.
**Local path:** `research/repos/ezquake-source/help_variables.json` (+ commands, macros, cmdline_params)
**Quality:** Excellent. Typed, grouped into 54 groups / 10 major groups, descriptions, defaults, enum values.
**Update method:** Track the ezQuake repo. Updates come as PRs from contributors (e.g., slime's PR #1093).

### FTE (~797 documented cvars)

**Source:** Embedded in C source code via `CVARD(name, default, description)` and `CVARFD(name, default, flags, description)` macros. Nearly 100% of FTE cvars have inline descriptions (only 9 plain `CVAR()` without).
**Local path:** `research/repos/fteqw/engine/` (across ~59 files)
**Quality:** Good descriptions in source. No grouping/categorization — we'd add that.
**Update method:** Re-run extraction script against updated FTE source. Descriptions track upstream automatically.
**Extraction approach:** Parse C source for CVARD/CVARFD/CVARAFD macros, extract name + default + description + flags.

### QWCL (~189 cvars — the universal baseline)

**Source:** No single source. Assembled from multiple verified sources:

| Source | Cvars covered | Notes |
|--------|--------------|-------|
| ezQuake JSON (with descriptions) | 123 (65%) | Direct overlap — QWCL cvars that ezQuake inherited and documented |
| quakeworld.net archive | 16 (8%) | Original 1999-era documentation (web.archive.org, also pasted in our research) |
| FTE source (CVARD macros) | 8 (4%) | FTE documented some QWCL cvars that ezQuake dropped |
| **Combined coverage** | **144 (76%)** | |
| Still need manual descriptions | 45 (24%) | Breakdown below |

**The 45 without descriptions break down as:**
- 16 debug/developer internals (r_speeds, showram, etc.) — not converter-relevant
- 19 obsolete (gl_ztrick, joywwhack, VGA/VESA stuff) — dead tech, no modern equivalent
- 8 self-explanatory (crosshair, cl_hudswap, ambient_level) — name says it all
- ~7 converter-relevant that need manual descriptions — small, manageable

**Local path:** `research/repos/qwcl-original/QW/client/` (id Software GPL release, frozen 1999 codebase)
**Update method:** Never changes. One-time assembly.

## The Agnostic Format

### Cvar entry structure

```typescript
interface AgnosticCvar {
  id: string;                    // canonical identifier, e.g. "input.sensitivity"
  name: string;                  // human-readable name
  description: string;           // what it does
  category: string;              // dotted path, e.g. "graphics.textures"
  type: 'boolean' | 'integer' | 'float' | 'string' | 'enum';
  range?: { min: number; max: number };
  values?: { value: string; description: string }[];  // for enums
  clients: {
    qwcl?: ClientCvar;
    ezquake?: ClientCvar;
    fte?: ClientCvar;
  };
}

interface ClientCvar {
  cvar: string;                  // the actual cvar name in this client
  default: string;               // default value
  description?: string;          // client-specific description if different
  remarks?: string;              // client-specific notes
  deprecated?: boolean;          // if the client has deprecated this
}
```

### Bind entry structure

```typescript
interface AgnosticBind {
  key: string;                   // normalized key name
  action: string;                // agnostic action identifier
  clients: {
    qwcl?: string;              // raw bind string in this client
    ezquake?: string;
    fte?: string;
  };
}
```

### Conversion report

When converting, the tool produces a report:

```typescript
interface ConversionReport {
  transferred: AgnosticCvar[];   // successfully mapped
  skipped: AgnosticCvar[];       // source-only, no target equivalent
  defaulted: AgnosticCvar[];     // target-only, using defaults
  warnings: string[];            // value range mismatches, etc.
}
```

## Cvar Mapping Reality

Not all cvars convert. The realistic breakdown:

| Category | Estimated count | Conversion behavior |
|----------|----------------|-------------------|
| Shared baseline (QWCL heritage) | ~150 | Automatic — same name in all clients |
| Same feature, different name | ~50-100 | Manual mapping needed (the real work) |
| Client-specific extensions | ~2000+ | Skip — no equivalent in other clients |

The "same feature, different name" bucket is where vikpe and matrix's expertise is needed. This mapping grows over time as the community identifies equivalences.

## Conversion Philosophy

**Pragmatic, not perfect.**

1. Parse source config into agnostic format
2. Carry over everything with a match in the target client
3. Skip source-only cvars (no equivalent)
4. Use target client defaults for unmatched target cvars
5. Report what transferred, what was skipped, what's defaulted

A 70-80% config transfer is infinitely better than starting from scratch.

## Build Order

### Phase 1: Data extraction and assembly
- Extract FTE cvars from source into `fte-variables.json`
- Assemble QWCL baseline from combined sources into `qwcl.json`
- Copy/reference ezQuake JSON files
- Define the agnostic TypeScript types

### Phase 2: Config parser
- Parse raw config.cfg text (shared format: `cvar value`, `bind key action`)
- Map parsed cvars to agnostic format using each client's database

### Phase 3: Config writer
- Write agnostic format back to client-specific config.cfg text
- Round-trip test: ezQuake config -> agnostic -> ezQuake config should be lossless for known cvars

### Phase 4: Viewer UI (slipgate-app)
- Config viewer tab: load a config, see all settings with descriptions and categories
- Click any cvar to see docs (pulled from the database)
- Side-by-side compare: two configs, highlight differences

### Phase 5: Converter UI
- Select source client + target client
- Show conversion report (transferred / skipped / defaulted)
- Export converted config

### Phase 6: Cross-client mappings (ongoing)
- Identify "same feature, different name" cvars across clients
- Community input from vikpe, matrix, and others
- Each mapping added improves conversion coverage

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Language | TypeScript | Runs everywhere (Tauri app, web, CLI). Shared with all other projects. |
| Location | `packages/qw-config/` | Shared package, consumed by slipgate-app now, website later |
| Scope | Cvars + binds | Covers what matters for client switching. Aliases/scripts don't convert cleanly. |
| Conversion approach | Pragmatic skip/default | 70-80% is better than 0%. Mappings grow over time. |
| QWCL as baseline | Yes | The universal foundation all clients inherit from |

## External Dependencies

- **vikpe**: Architecture validated. Available to advise on cross-client mappings.
- **matrix**: ezQuake internals expertise. Has curated optimization presets (future: optimizer tool). Needed for the "same feature, different name" mapping work.
- **ezQuake repo**: Source of truth for ezQuake cvar documentation. Watch for updates.
- **FTE repo**: Source of truth for FTE cvars. Re-extract when updated.

## Research Artifacts

All reference repos cloned locally in `research/repos/`:
- `ezquake-source/` — ezQuake client source + help JSON files
- `fteqw/` — FTE engine source (CVARD macros in `engine/`)
- `qwcl-original/` — id Software's original Quake source (QW/client/)

quakeworld.net archive content (original QWCL documentation) captured in brainstorming session notes.
