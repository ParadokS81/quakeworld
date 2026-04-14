# Layer 1 Category Coverage

**Purpose:** Make the Layer 1 coverage surface explicit before the POC demo. When someone asks "do you have macros? triggers? userinfo keys?" we want a sharp, honest answer instead of hedging.

**Status:** Living document. Update whenever a new category is added to the extraction pipeline or a new gap is discovered.

---

## How to read this doc

Each category is tagged with one of:

- **IN POC** — imported from `packages/qw-config/src/data/` JSON. Rows land in `kb_cvars` or `kb_commands` with `extraction_method = 'scraped-json'`.
- **KNOWN GAP** — we know this category exists, we chose not to cover it in the POC, it is tracked for phase 2.
- **SPECULATIVE** — a proper AST-based extractor would likely surface this category; we have not confirmed it is worth modelling.
- **OUT OF SCOPE** — not knowledge-base material (internal implementation detail, not user-facing).

When a proper AST extractor lands, any category currently marked IN POC will get a sibling row set with `extraction_method = 'ast-extractor'` so old and new rows coexist. New categories typically get their own table (`kb_macros`, `kb_triggers`, etc.) rather than being squeezed into the existing two.

---

## ezQuake (client)

### Core registration patterns

| Category | Status | Source site | Notes |
|---|---|---|---|
| Cvars | **IN POC** | `Cvar_Register` | 2892 entries via scraped JSON. Name, type, group, description. See gaps below. |
| Commands | **IN POC** | `Cmd_AddCommand` | 523 entries via scraped JSON. Name, group, description. |
| Macros | **KNOWN GAP** | `Macro_Add` / `Cmd_AddMacro` | `$time`, `$date`, `$playerid`, `$viewangles`, `$health`, etc. Slipgate app handles these at runtime but no structured extract. Needed for concept notes like "how do tp_msg_* macros resolve?" |
| Triggers | **KNOWN GAP** | `tp_msg_*` cvar family + message handler | The teamsay system. Not a separate C-level registration; it is a convention layered on cvars + msg hooks. A proper extractor would normalise this into a `kb_triggers` table. |
| Aliases | **OUT OF SCOPE** | User-defined | Runtime only, not extracted from source. Exists in saved configs, not in the engine. |

### Cvar metadata currently missing from Layer 1

The scraped JSON captures `name`, `type`, `group-id`, and `desc`. It does **not** capture:

- **Cvar flags** — `CVAR_USERINFO`, `CVAR_SERVERINFO`, `CVAR_ROM`, `CVAR_INIT`, `CVAR_LATCH`, `CVAR_AUTO`, `CVAR_CHEAT`. These tell consumers whether a cvar affects userinfo, is read-only, needs a map reload, is cheat-gated, etc. Highly useful for "can I change this mid-match?" style queries.
- **Default values** — the scraped JSON has a `default` field for some rows but not all. A real extractor would always have it, and would distinguish static defaults from runtime-computed ones.
- **Range / validation callbacks** — `Cvar_SetLimits`-style constraints.
- **Help text that lives separately from the registration** — some cvars have Help\_\*() functions that carry the long-form description. The scraper likely only grabbed the short `desc`.
- **Source file + line** — for citation. Currently stubbed as `NULL` in the schema.
- **First-seen version** — "introduced in ezQuake 3.6.3". Requires walking commit history, not just current source. Long-term phase 2.

These are all additive — a future AST extractor can backfill them into the same `kb_cvars` rows without schema changes (the columns already exist in the schema with `NULL` placeholders).

### Command metadata currently missing from Layer 1

- **Permission level** — most ezQuake commands are unrestricted, but a handful are `CMD_LOCAL_ONLY` or similar. Matters more for KTX (admin commands) but ezQuake has some too.
- **Handler signature / argument shape** — "this command takes 0-2 args." Would let consumers answer "what does `set_tp` expect?" without needing a concept note.
- **Help text and usage strings** — same as cvars, often carried separately from the registration.

### Client subsystems that might warrant their own tables

| Category | Status | Notes |
|---|---|---|
| Userinfo keys | **SPECULATIVE** | `name`, `team`, `topcolor`, `bottomcolor`, `rate`, `pmodel`, etc. Currently these are just cvars with `CVAR_USERINFO` flagged. A dedicated `kb_userinfo_keys` view might be more useful than recovering them from the flag. Revisit after cvar flags are extracted. |
| Serverinfo keys | **SPECULATIVE** | `hostname`, `*gamedir`, `maxclients`, `map`, etc. Same story. |
| Statbar / HUD fields | **SPECULATIVE** | The values addressable from hud_* cvars (`$health`, `$armor`, `$ammo`). Probably overlaps with macros. |
| Weapon scripts / priority chains | **KNOWN GAP** | `weapon` command + priority-chain conventions. Slipgate app already has a parser for these. Could be imported directly without a source walk. |
| Binds / default keymap | **KNOWN GAP** | The default keys ezQuake binds at first run. Lives in a C array, trivial to extract. |
| Plugin API surface | **SPECULATIVE** | ezQuake plugin hooks — `EZ_Plugin_*` callbacks. Relevant if concept notes ever explain "how plugins extend ezQuake." See `project_fte_plugin_bridge` memory. |

---

## KTX (server-side mod)

| Category | Status | Source site | Notes |
|---|---|---|---|
| Cvars (k_*) | **IN POC** | KTX cvar registration | 326 commands in the scraped JSON, many marked "no desc". A proper extractor would recover the descriptions from source comments. |
| Commands | **IN POC** | KTX command registration | Same caveat. |
| Admin commands | **KNOWN GAP** | `CMD_ADMIN` flag | Permission level is the single most useful KTX metadata ("can a non-admin do this?"). Not in the scraped JSON. |
| Referee commands | **KNOWN GAP** | `CMD_REF` flag | Same. |
| Match modes | **SPECULATIVE** | `k_matchmode` / mode registration | `ffa`, `duel`, `2on2`, `4on4`, etc. Probably a small enum in source, worth recovering explicitly so concept notes can reference them. |
| Rulesets | **SPECULATIVE** | Ruleset definition tables | `smackdown`, `thunderdome`, etc. Each ruleset pins a set of cvar values — a high-value cross-link target. |
| Pickup modes | **SPECULATIVE** | `rpickup`, `autopickup`, etc. | The rpickup demo query depends on this. For the POC it lives as a concept note; for phase 2 it deserves structured extraction. |
| Map rotations / map lists | **OUT OF SCOPE** | Config files, not source | Handled at deploy time, not extracted from code. |

---

## MVDSV (server / engine)

| Category | Status | Notes |
|---|---|---|
| Cvars | **KNOWN GAP** | Not in POC. Narrower than ezQuake (sv_*, net_*). Phase 2. |
| Commands | **KNOWN GAP** | Server console + rcon commands. Phase 2. |
| MVD recording / protocol | **OUT OF SCOPE** | Protocol constants, not knowledge-base material. |
| Mod / gamedir hooks | **SPECULATIVE** | Only relevant if someone wants a concept note on "how does MVDSV hand off to KTX." |

---

## FTE (alternate client)

| Category | Status | Source site | Notes |
|---|---|---|---|
| Cvars | **IN POC** | `fte-variables.json` | Scraped. Overlap with ezQuake cvars is significant and intentional — the canonical-ID scheme keeps them separate (`ezquake:cvar:cl_bob` vs `fte:cvar:cl_bob`). |
| Commands | **KNOWN GAP** | Not scraped for the POC. Phase 2. |
| QuakeC builtins | **SPECULATIVE** | FTE exposes a huge QC builtin surface. Almost certainly not in the current JSON. Matters for anyone writing mods against FTE; probably phase 3. |
| Shader system | **OUT OF SCOPE** | Rendering internals. |
| Plugin API | **KNOWN GAP** | FTE has an active plugin system. See `project_fte_plugin_bridge` memory — ezhud proves FTE plugins can register ezQuake-compatible cvars. Worth modelling as a Layer 1 category once the extractor lands. |

---

## QWFWD (proxy)

| Category | Status | Notes |
|---|---|---|
| Cvars | **KNOWN GAP** | Small surface. Phase 2. |
| Commands | **KNOWN GAP** | Small surface. Phase 2. |

---

## Cross-cutting / unclear home

These do not obviously belong to one project. They might get their own tables or be attached to whichever project registers them first.

- **Protocol message types** — `svc_*`, `clc_*`, `qqshn_*`. Probably not user-facing enough to extract.
- **QW palette / colour indices** — already covered by the `reference_qw_name_encoding` memory and the qw-knowledge terminology YAML. Not a code-extracted category.
- **Default config** — `ezquake default.cfg`, KTX `default.cfg`. Worth ingesting as a distinct data source (canonical ID: `ezquake:defaultcfg:<cvar>` = default value). Not currently modelled.
- **Changelogs** — ezQuake release notes, KTX/MVDSV/QWFWD changelogs. Cross-cutting time series. `project_slipgate_updater` memory has context. Candidate for a `kb_releases` table long-term.

---

## POC demo coverage summary

**For the rpickup demo query, Layer 1 needs:**

- `ktx:cmd:rpickup` — the command entry. **Covered** via scraped JSON (assuming `ktx-commands.json` has it — verify during Task 2).
- (Optionally) `ktx:cmd:k_matchlock`, `ktx:cvar:k_autopickup` if the concept note cross-links them. **Covered** for anything already in the scraped JSON.

**What we will say when asked "is that all?"**

Something like: "No. The POC imports scraped JSON that covers cvars and commands for ezQuake, KTX, and FTE. It does not yet cover macros, triggers, cvar flags, command permission levels, KTX match modes and rulesets, MVDSV, QWFWD, FTE QC builtins, or the plugin APIs. The schema is additive — every category in this doc can be added without breaking what already exists. A proper AST-based extractor is phase 2 and we would welcome contribution from engine developers who know the source layout."

---

## How this doc evolves

- **Before Task 2 (Layer 1 import)**: sanity-check that the IN POC rows are actually in the source JSON. Anything the JSON is missing that this doc claims is covered gets demoted to KNOWN GAP.
- **Before the demo**: walk this doc with the pitch script. Anything the demo depends on that is KNOWN GAP or SPECULATIVE gets either hand-populated or explicitly flagged as "not covered in this demo."
- **After the demo, if the pitch lands**: use this doc as the backlog for the phase-2 AST extractor. Each KNOWN GAP and each SPECULATIVE becomes a contribution target.
