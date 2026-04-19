# qw-config

Authoritative QuakeWorld engine-feature database extracted from source code. Shared across the monorepo.

## What's in here

| File | Count | Source |
|---|---|---|
| `src/data/ezquake-variables.json` | 2918 cvars | ezQuake source: `cvar_t` declarations + `Cvar_Register()` calls, enriched with `help_variables.json` |
| `src/data/ezquake-commands.json` | 523 commands (443 live, 80 deprecated) | ezQuake source: `Cmd_AddCommand()` calls, enriched with `help_commands.json`, grouped via name-prefix rules |
| `src/data/ezquake-macros.json` | 68 runtime macros | ezQuake source: `help_macros.json` (`%health`, `%ammo`, etc.) |
| `src/data/ezquake-cmdline-params.json` | 71 cmdline params | ezQuake source: `help_cmdline_params.json` (scaffolding, no UI consumer yet) |
| `src/data/ezquake-default-commands.json` | 23 curated defaults | Manually curated — matches what ezQuake's `cfg_save` emits in the release block + default stateful commands |
| `src/data/fte-variables.json` | FTE cvars | FTE source extraction |
| `src/data/qwcl-variables.json` | QWCL cvars | Assembled from legacy sources |
| `src/data/ktx-commands.json` | 326 server commands | KTX source: `cmd_t cmds[]` static array in `commands.c`, enriched with CD_* description macros |
| `src/data/mappings.json` | Cross-client cvar mappings | Manually curated equivalence map |
| `src/data/domain-tags.json` | Category/domain tags | Curated grouping for viewer sidebar |

## Philosophy

Mappings must be exhaustive and extracted from authoritative source, not hand-curated subsets. Source code is the ground truth; help JSON files and wikis lag behind. When a user's config references something, we must know about it.

See feedback memory `feedback_exhaustive_mapping.md` for the full rule and history.

## Extraction scripts

Two extractor families live side-by-side in `scripts/`:

- **Bun/TypeScript extractors (`*.ts`)** — the original regex-based approach. Still the production source for all data files in `src/data/`. Idempotent.
- **Python/libclang extractors (`*-clang.py`)** — research-spike AST-based approach validated for ezQuake cvars on 2026-04-18. Produces richer output (flags, OnChange callbacks, source line numbers, trailing comments) into `src/data/ezquake-variables-ast.json`, sitting alongside the regex output. See `docs/extraction-comparison-report.md` for the full comparison and Phase 2 plan. Requires system packages `libclang-dev` + `python3-clang` (Ubuntu/WSL: `sudo apt-get install -y libclang-dev python3-clang`).

The TypeScript extractors below remain the production source today. The AST path is scheduled to replace them in Phase 2.

| Script | Regenerates | When to run |
|---|---|---|
| `extract-ezquake-cvars.ts` | `ezquake-variables.json` | On new ezQuake release, or when `cvar_t` declarations change |
| `extract-ezquake-commands.ts` | `ezquake-commands.json` | On new ezQuake release, or when `Cmd_AddCommand()` calls change |
| `extract-ezquake-macros.ts` | `ezquake-macros.json` | On ezQuake release if `help_macros.json` changes |
| `extract-ezquake-cmdline.ts` | `ezquake-cmdline-params.json` | On ezQuake release if `help_cmdline_params.json` changes |
| `extract-fte-cvars.ts` | `fte-variables.json` | On new FTE release |
| `extract-ktx-commands.ts` | `ktx-commands.json` | On new KTX release, or when `cmd_t cmds[]` array changes |
| `assemble-qwcl.ts` | `qwcl-variables.json` | Rarely — QWCL is legacy |

### Running extraction

```bash
cd packages/qw-config

bun run extract-ezquake-cvars
bun run extract-ezquake-commands
bun run extract-ezquake-macros
bun run extract-ezquake-cmdline
bun run extract-ktx-commands
```

Each script expects the corresponding source repo to exist at `research/repos/<name>/`. The monorepo vendors these as git submodules or copies — check the research directory.

### When a new upstream version lands

1. Update the research repo submodule (git submodule update, or pull/copy the new source)
2. Run all relevant extraction scripts
3. Review the diff — look for:
   - New cvars/commands added (good, more coverage)
   - Old entries removed (check if they moved to the `deprecated` group)
   - Group changes (name prefix rules may need updating in `extract-ezquake-commands.ts`)
4. Commit the regenerated JSON files along with a note about the upstream version

## Loaders

Consumers import loader functions from `qw-config`:

```typescript
import {
  loadDatabase,              // merged cvars database (ezquake + fte + qwcl + mappings)
  lookupCvar,                // lookup by name across clients
  loadEzQuakeCommands,       // the 523 commands database
  loadEzQuakeMacros,         // the 68 runtime macros
  loadEzQuakeCmdlineParams,  // the 71 cmdline params
  loadEzQuakeDefaultCommands,// the curated defaults set
  loadKtxCommands,           // the 326 KTX server commands
  loadDomainTags,            // viewer sidebar domain tags
} from "qw-config";
```

All loaders cache internally — call as many times as you want.

## Consumers

- `apps/slipgate-app` — config viewer uses loaders for cvar categorization, bind detection, commands sidebar category, KTX bind classification, runtime macros reference
- `apps/matchscheduler` — (not yet, future consumer for config validation)
- `apps/qw-oracle` — (future — knowledge engine will query this database)

## Known gaps

- **Version history**: we only track the current version snapshot. "Which cvar was added in ezQuake 3.5?" cannot be answered. Planned for Phase 2 of the AST-extraction refactor via per-tag snapshots + git-blame + GitHub PR enrichment. See `docs/extraction-comparison-report.md`.
- **FTE commands / macros**: only FTE cvars are extracted. Commands and macros missing.
- **Servers / proxies / mods**: only KTX is covered. MVDSV, QWFWD, QTV absent.
- **Default command values**: only 23 are curated. Many stateful commands have default values that would enable a more accurate "hide defaults" experience for the Commands category.

See `project_helper_panel_vision.md` memory for the long-term database vision including cross-source provenance tracking.
