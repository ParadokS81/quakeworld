# Probe report: P5 -- Dangling Threads

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: https://github.com/qwassoc (org) and https://github.com/qwassoc/mvdsv (rotted KTX wiki link)

### Domain: freeform_prose

- **Coverage count:** 0 of 260 KTX cvars, 0 of 108 MVDSV commands, 0 of 183 MVDSV cvars. Denominator M source: probe-0 (`ktx` `cvars` M=260; `mvdsv` `commands` M=108; `mvdsv` `cvars` M=183). The qwassoc org has exactly 2 repositories (confirmed via https://github.com/orgs/qwassoc/repositories): `ktlogparser` (PHP KTX log parser, last commit Feb 2011) and `qwscores` (C match scanner, last commit Jun 2014). Neither contains any cvar or command documentation for KTX or MVDSV.
- **Format:** n/a -- no doc content found
- **Structure quality:** n/a
- **Overlap / conflict:** none -- this source is entirely orthogonal to the L1 spine
- **Extractability for a future L1 spine:** n/a -- no extractable content exists here

## Probe notes

### Thread 1 -- Rotted KTX wiki "complete guide" link (qwassoc/mvdsv): DEAD, no content loss

The rotted link `github.com/qwassoc/mvdsv` is a GitHub **redirect** (HTTP 301) to `github.com/QW-Group/mvdsv` -- the current canonical MVDSV repo. There is no separate "qwassoc" fork of MVDSV, and there is no "complete KTX config guide" at that URL or anywhere in the qwassoc org. The qwassoc GitHub org (id 7924697, email qwassoc@gmail.com, URL qwassoc.org) contains only `ktlogparser` and `qwscores`, both dormant since 2011/2014 and both focused on match result parsing, not server configuration. No content recovery possible or needed from this thread.

### Thread 2 -- GitHub Wiki tabs (KTX and MVDSV): BOTH EMPTY

**KTX wiki** (`https://github.com/QW-Group/ktx/wiki`): Jina fetch returns only the sign-in prompt and page metadata. The `_pages` index (`/wiki/_pages`) returns only the URL source line with no page list -- this is GitHub's behavior when a wiki has zero published pages. The KTX wiki tab is a blank placeholder with no content whatsoever.

**MVDSV wiki** (`https://github.com/QW-Group/mvdsv/wiki`): Contains exactly **2 pages**:
- `Home` -- body text: "Welcome to the mvdsv wiki! This wiki is in construction, please check back later." Edited Jun 20, 2014. 1 revision. No admin-relevant content.
- `Latest changes` -- contains two sub-sections: MVDSV 0.34 Release Notes and MVDSV 0.32 Changelist. The Jina fetch of the `Latest-changes` page yields only the GitHub navigation chrome with no visible wiki body text (likely JS-rendered content not captured by Jina). The page is linked but its body is not recoverable via Jina without authentication.

**Gap impact:** The GitHub wiki tabs for both engines are effectively empty. Neither contributes to coverage of any L1 domain (cvars M=260/183, commands M=358/108, cmdline M=11). This is a commonly-missed surface that in this case adds zero doc value.

### Thread 3 -- ezquake.com/docs: client-only, thin MVDSV parity

`https://ezquake.com/docs/` (HTTP 200, last updated 2026-01-31) is structured documentation for the ezQuake **client**. All sections -- Features, Graphics, Reference, Settings -- are client-facing. The Settings reference includes a **Server** sub-page (`/docs/settings/server.html`) which documents 124 cvars. Of these, exactly 3 carry explicit KTX/MVDSV attribution in their body text:

1. `cl_sv_packetsync` -- body note: "Recommend to disable for older mods which fake players (frogbots) and leave enabled for KTX."
2. `download_map_url` -- body note: "MVDSV : URL announced to clients for faster map downloads over HTTP."
3. `sv_maxpitch` / `sv_minpitch` -- body note: "server-side variable for setting maximum/minimum of view angles."

The 124 cvars on this page are **MVDSV engine cvars** (the ezQuake internal server runs MVDSV under the hood), so the full page is structurally relevant to MVDSV cvar coverage. Cross-matching the 124 cvar names against the MVDSV L1 set (M=183) is possible but was not executed here (out of this probe's scope -- probe-2/3 cover this surface). One notable entry: `sv_ktpro_mode` appears in the list, indicating KTX-adjacent content exists in this doc surface.

**Gap impact:** ezquake.com/docs is a client-first surface. Its Server settings page is a secondary MVDSV cvar reference (124 entries, structured, human-prose descriptions with type/default, parseable into a dropdown schema). It does not cover KTX `k_*` cvars at all. It does not affect the KTX cvar gap (192 NULL of 260). Its MVDSV cvar overlap is for probe-2/3 to quantify; this probe notes the surface exists, is alive, is structured, and is LLM-assisted extractable.

- **Format (ezquake.com/docs Server page):** structured field (type + default + enum values + prose description per cvar)
- **Structure quality:** 0=off/1=on enum style + boolean/integer/float type labels; highly parseable
- **Overlap / conflict:** overlaps MVDSV cvars domain; `download_map_url` is confirmed MVDSV-only; no conflicts observed with L1
- **Extractability for a future L1 spine:** mechanical -- consistent `###` heading + type tag + description prose pattern

### Thread 4 -- Runtime self-documentation from KTX source: REAL SURFACE, THIN ADMIN PROSE

KTX does not use a `cmdlist` or `serverinfo` command in the QuakeWorld sense (those are MVDSV engine-level commands). Instead it exposes three admin-facing runtime surfaces, characterized by direct source read:

**4a. `commands` command** (`src/commands.c` lines 335-1510): The `ShowCmds()` function iterates the `cmds[]` table and prints each command's `description` field (the `CD_*` macros defined at lines 335-599). The output format is `<redtext(name)><dots><description>` per command, split into "common" and "admin" sub-lists. Commands with `CD_NODESC` (="no desc") are **silently skipped** from output. There are **326 command table entries** in `cmds[]`; **3 of 326** use `CD_NODESC` explicitly in the table (the `cm`, `info`, and `uinfo` entries at lines 698, 943-944); however 46 `CD_NODESC` macro definitions appear in the `CD_*` block (lines 403-512, for ksound1-6 and fav slot entries 4-18 and their go-equivalents). The `CD_*` macros themselves are concise one-liners (5-15 words each), covering roughly **280+ of 358 commands** (est. ~78%) with a brief description. These are admin-visible at runtime via the `commands` command but are NOT the same as the L1 `description` field -- they are shorter action labels, not usage documentation.

**4b. `status1` / `status2` commands** (`src/commands.c` lines 1855-2050): These two commands print a live status dashboard of active KTX settings. `status1` prints: Maxspeed, Deathmatch, Teamplay, Timelimit, Fraglimit, Powerups, Discharge, Drop Quad, Drop Ring, Fair Backpacks, Drop Backpacks, spec info perm, more spec info, teleteam, Berzerk, plus election/captain/coach state and match timer. `status2` prints: spawn mode, Server mode (duel/FFA/CTF/team), locking mode, CTF settings (hook/runes/ga), overtime state, spectalk, Admin election, election type. These expose current **values** of ~20 key `k_*` cvars by readable label, but they do not expose cvar names or ranges -- they are state dashboards, not documentation.

**4c. `rules` command** (`src/commands.c` lines 3290-3333): Prints a mode-specific summary (duel/CTF/FFA/team mode description plus Berzerk reminder if active). Freeform prose, not cvar documentation.

**4d. `k_*` cvar surface**: KTX uses `k_*`-prefixed cvars as its primary admin configuration surface. From source scan across all `.c` files, **174+ unique `k_*` cvar names** are referenced via `cvar()` / `cvar_string()` calls. The shipped `resources/example-configs/ktx/ktx.cfg` (93 `set` lines, 114 comment lines) documents **77 of these 174** (est., by grep intersection) with inline `// comment` descriptions. The example config is the richest in-repo prose source for KTX cvars.

**Coverage impact from runtime self-documentation:**
The `commands` `CD_*` descriptions cover an estimated 280 of 358 KTX commands with brief action labels (est. 78% of M=358 at action-label depth, not prose-description depth). These are already captured in L1 as `source_inline` origin (311/358 = 87% per probe-0). The status1/status2 outputs expose live values only -- they cannot be lifted as description text for the NULL-cvar gap. The runtime surface does not expose `k_*` cvar documentation at all -- it only shows current values of ~20 cvars by label. **The 192 NULL KTX cvars and 148 NULL MVDSV cvars are not documented by any runtime self-documentation mechanism.**

**Completeness of the in-game `commands` output as an admin surface:** The `commands` command is useful for discovering what commands exist and their one-line purpose, but it does not expose parameter syntax, value ranges, or side effects. It covers player/spectator/admin role separation via `CF_BOTH / CF_PLAYER / CF_SPEC_ADMIN` flags but the flags are not surfaced in the output text. `CD_NODESC` entries are silently dropped. The output is printed to the requesting player's console, not to server logs. An admin cannot use it to discover the `k_*` cvar namespace at all -- cvars are not commands in QuakeC/KTX's model.

### Summary: gap picture unchanged by these threads

None of the four dangling threads reveals a previously-unknown rich prose source for the central gaps (KTX cvars 192 NULL / MVDSV cvars 148 NULL / MVDSV commands 108 NULL / MVDSV cmdline 11 NULL):

| Thread | Status | Gap impact |
|---|---|---|
| qwassoc org / rotted link | Dead redirect; 2 dormant non-doc repos | None |
| GitHub wiki tabs (KTX + MVDSV) | Both effectively empty | None |
| ezquake.com/docs Server page | Alive; 124 MVDSV cvars with structured prose | MVDSV cvars partial overlap (quantify in probe-2/3) |
| KTX runtime self-doc (source read) | `commands` covers ~78% commands at label depth; status1/2 = value dashboard only; no cvar docs | None for the NULL cvar gaps |

The `resources/example-configs/ktx/ktx.cfg` in-repo config (93 set + 114 comment lines, covering est. 77 of 174+ k_* cvars with inline comments) is the one concrete previously-identified surface confirmed alive and moderately rich; but this is probe-1/3 territory, not a new finding from this probe.
