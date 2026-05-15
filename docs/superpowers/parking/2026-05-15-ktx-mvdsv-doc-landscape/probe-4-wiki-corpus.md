# Probe report: P4 -- wiki corpus

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: https://www.quakeworld.nu/wiki/ (live QWiki) + apps/qwiki-sandbox/dumps/qwiki.sql.gz (local SQL dump)

### Investigation method

Two sub-sources investigated in parallel:

**Sub-source 1 -- live wiki (Jina fetch):** Pages fetched via `https://r.jina.ai/https://www.quakeworld.nu/wiki/<PAGE>` for: `KTX`, `MVDSV`, `How_to_server`, `NQuakesv`, `Antilag`, plus every mode page linked from the KTX article. Each page recorded as EXISTS/REDLINK, assessed for substantive vs stub depth.

**Sub-source 2 -- local SQL dump:** MariaDB dump at `apps/qwiki-sandbox/dumps/qwiki.sql.gz` (87 MB compressed, ~710 MB uncompressed; MariaDB 11.8 format; last modified 2026-05-08). Schema: MW 1.35+ with `page` + `revision` + `slots` + `content` + `text` tables. Text retrieved via join chain: `page.page_latest` -> `slots.slot_content_id` -> `content.content_address` (`tt:N`) -> `text.old_id`. Full-text wikitext extracted for 15 KTX/MVDSV-relevant pages. Dump has 18,363 unique namespace-0 page titles. No KTX/MVDSV admin cvar documentation pages found in dump beyond what live nav exposes.

**KTX game_mode set derivation (per parallel-execution note):** Derived directly from `research/repos/ktx/src/commands.c` (um_list array at line 4526) and `include/g_local.h` (UserModes_t enum), cross-checked against `apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py` docstring. The 27 = 17 um_list peers + 1 race (cvar_toggle_with_init_string|standalone) + 1 bloodfest (cvar_toggle_only|standalone) + 8 mutators (lgc, instagib, midair, berzerk, killquad, nosweep, freshteams, yawnmode). Used 27 as the modes denominator per probe-0 instructions.

---

### Domain: modes (KTX)

- **Coverage count:** 12 of 27 KTX game_modes have a live wiki page (44%). Denominator M source: probe-0 (`ktx` `modes` game_mode catalog = 27). Count verified by checking each of the 27 mode tokens against live wiki and the dump page table.
- **Format:** wiki prose -- player-facing gameplay descriptions, not admin configuration reference.
- **Structure quality:** Free prose only. Mode pages describe rules and how to activate the mode (e.g., type `/1on1`), not cvar-level behavior or configuration knobs. Exception: HoonyMode (`https://www.quakeworld.nu/wiki/HoonyMode`, dump text old_id=not extracted but page confirmed in dump) mentions `k_allowed_free_modes` -- the only admin cvar call-out in any mode page.
- **Overlap / conflict:** How_to_server overlaps with mode pages by naming the same mode-selection commands. No observed conflict.
- **Extractability for a future L1 spine:** hand-curate -- prose describes player-facing rules and history; no structured cvar/flag fields to parse.

**Mode-by-mode live wiki status (all 27):**

| Mode token | Wiki page | Status | Substantive? |
|---|---|---|---|
| 1on1 | /wiki/1on1 | EXISTS | yes -- duel rules, famous players |
| 2on2 | /wiki/2on2 | EXISTS | yes -- format description |
| 3on3 | -- | REDLINK | -- |
| 4on4 | /wiki/4on4 | EXISTS | yes -- rules, maps, clans |
| 10on10 | -- | MISSING | -- |
| ffa | /wiki/Free_For_All | EXISTS | minimal stub (2 sentences) |
| ctf | /wiki/Capture_The_Flag | EXISTS | yes -- full CTF rules, runes, hook |
| hoonymode | /wiki/HoonyMode | EXISTS | yes -- spawn rules, server req (k_allowed_free_modes) |
| blitz2v2 | -- | MISSING | -- |
| blitz4v4 | -- | MISSING | -- |
| 2on2on2 | -- | MISSING | -- |
| 3on3on3 | -- | MISSING | -- |
| 4on4on4 | -- | MISSING | -- |
| XonX | -- | MISSING | -- |
| wipeout | /wiki/Wipeout | EXISTS | yes -- gameplay + tested-map table |
| ca | /wiki/Clan_Arena | EXISTS | yes -- round rules, install note |
| tot | /wiki/ToT_Mode | EXISTS | yes -- how to play, bot commands |
| race | /wiki/Race | EXISTS | yes -- concept + 12-command list |
| bloodfest | /wiki/Bloodfest | EXISTS | yes -- rules, wave mechanics |
| lgc (mutator) | /wiki/LGC | EXISTS but wrong | LGC page documents the offline frogbot CHALLENGE, not the ktx lgcmode mutator toggle; does not describe the server-side mode |
| instagib (mutator) | /wiki/Instagib | EXISTS | yes -- history, KTX reload-time variants |
| midair (mutator) | -- | REDLINK | -- |
| berzerk (mutator) | -- | REDLINK | -- |
| killquad (mutator) | -- | MISSING | -- |
| nosweep (mutator) | -- | MISSING | -- |
| freshteams (mutator) | -- | MISSING | -- |
| yawnmode (mutator) | -- | MISSING | -- |

Net: 12 of 27 have a wiki page that documents the mode (44%). 11 of those 12 are substantive; ffa (`/wiki/Free_For_All`) is a 2-sentence stub. The lgc entry is not counted as documenting the ktx lgcmode mutator. Mutators are the worst-covered sub-set: 1 of 8 (instagib only) has a matching wiki page.

---

### Domain: commands (KTX)

- **Coverage count:** ~12 of 358 KTX commands carry any description in the wiki corpus (<4%, est.). Denominator M source: probe-0 (`ktx` `commands` registered set = 358). Method: the Race wiki page (`/wiki/Race`, dump old_id=37374) lists 12 race_* commands by name with brief function descriptions; all 12 verified against `research/repos/ktx/src/commands.c`. No other wiki page enumerates KTX commands. The KTX page itself says "type `commands` to get a list" but lists none.
- **Format:** wiki prose embedded in a mode page -- 12 race-specific commands listed inline with 1-line descriptions. Not a structured command reference.
- **Structure quality:** Free prose only. Command names are listed but no parameter types, access levels (CF_PLAYER vs CF_SPC_ADMIN), or return values are documented.
- **Overlap / conflict:** Race page lists `race`, `race_set_start`, `race_set_finish`, `race_set_checkpoint`, `race_del_checkpoint`, `race_set_timeout`, `race_cancel`, `race_show_toptimes`, `race_dl_record_demo`, `race_route_clear`, `race_set_weapon_mode`, `race_route_switch`, `race_show_route`, `race_show_record_details` -- 14 names, 12 with descriptions. All confirmed in `research/repos/ktx/src/commands.c`. No conflict observed.
- **Extractability for a future L1 spine:** LLM-assisted -- command names are machine-readable in the prose; descriptions need extraction from surrounding text.

---

### Domain: commands (MVDSV)

- **Coverage count:** 0 of 108 MVDSV commands carry any description in the wiki corpus (0%). Denominator M source: probe-0 (`mvdsv` `commands` registered set = 108). No wiki page found that enumerates or describes MVDSV server commands.
- **Format:** n/a -- no MVDSV commands documentation in wiki.
- **Structure quality:** n/a.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** n/a -- no content to extract.

---

### Domain: cvars (KTX)

- **Coverage count:** ~1 of 260 KTX cvars carry a description in the wiki corpus (<1%, est.). Denominator M source: probe-0 (`ktx` `cvars` registered set = 260). The HoonyMode page (`/wiki/HoonyMode`) names `k_allowed_free_modes` and gives a brief functional description (must add 128 to support hoonymode). No other wiki page names or describes KTX cvars.
- **Format:** wiki prose -- single cvar mentioned in passing within a mode description, not a cvar reference page.
- **Structure quality:** Free prose only. No type, default, or range information.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** hand-curate -- incidental mentions only, not a structured source.

---

### Domain: cvars (MVDSV)

- **Coverage count:** ~2 of 183 MVDSV cvars mentioned contextually in the wiki corpus (~1%, est.). Denominator M source: probe-0 (`mvdsv` `cvars` registered set = 183). The How_to_server page (`/wiki/How_to_server`, dump page_id=1634, text old_id via tt:61425) names `sv_getrealip` and `sv_serverip` in example command invocations (`./mvdsv -port 27502 -game ctf +set sv_getrealip 1`). Both cvars confirmed in `research/repos/mvdsv/src/sv_main.c` lines 140-141. No descriptions are given -- they appear as example flags only.
- **Format:** wiki prose -- embedded in shell-command examples, not a cvar reference.
- **Structure quality:** Free prose / example commands. Type/default/range not documented.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** hand-curate -- incidental appearance in examples; not a systematic source.

---

### Domain: cmdline (MVDSV)

- **Coverage count:** ~3 of 11 MVDSV cmdline params named in the wiki corpus (~27%, est.). Denominator M source: probe-0 (`mvdsv` `cmdline` registered set = 11). How_to_server (`/wiki/How_to_server`) gives example MVDSV launch commands naming: `-port`, `-game`, `+exec`, `+set` -- 4 params named, 3 clearly cmdline-class (`-port`, `-game`, `+exec`; `+set` is ambiguous as a cvar-set prefix not a standalone param). No descriptions beyond example context.
- **Format:** wiki prose -- shell-command examples only.
- **Structure quality:** Free prose / example shell commands. No param type, default, or full description.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** hand-curate -- example-embedded; not a systematic source.

---

### Domain: freeform_prose (both engines)

- **Coverage count:** 5 substantive pages documented (not counted against a denominator -- this is connective/admin-workflow prose, not entity coverage). Pages: `How_to_server` (setup workflow, antilag build instructions, nQuakesv reference), `NQuakesv` (package description, feature list, dev credits), `Antilag` (client-side antilag cvars -- ezQuake cl_predict_* series, NOT server cvars), `KTX` (overview, mode list, usage summary, KTPro comparison, crew), `MVDSV` (3-sentence stub: definition + GitHub link, last edited 2022-08-01).
- **Format:** wiki prose -- human-narrative orientation and how-to.
- **Structure quality:** Free prose only. How_to_server is the richest admin-workflow document; MVDSV page is a stub.
- **Overlap / conflict:** How_to_server references KTX and MVDSV setup steps; content is unique to wiki (no observed conflict with probe-1/probe-2 source). The Antilag page covers client-side cvars (ezQuake scope), not server-side antilag config -- this is the main content-class confusion risk if ingested without a scope filter.
- **Extractability for a future L1 spine:** LLM-assisted for workflow prose; mechanical for any named entities embedded in prose.

---

## Probe notes

**Dump vs live delta (key finding):** The local SQL dump (`apps/qwiki-sandbox/dumps/qwiki.sql.gz`) holds 18,363 unique namespace-0 page titles. After exhaustive title search against all KTX/MVDSV-relevant terms (ktx, mvdsv, server, setinfo, serverinfo, localinfo, cvar, command, mode names), the dump exposes NO hidden server-admin documentation pages beyond what the live wiki navigation already exposes. The dump adds historical revision archives and redirect stubs, but no extra cvar/command reference content. The live wiki and the dump are effectively identical in coverage for this domain.

**The wiki's documentation scope is player-facing, not admin-facing.** Mode pages describe gameplay rules and player experience; they do not document the cvar-layer settings each mode applies (those 317 mode_default overlay rows from probe-0 have no wiki analog). The single cvar exception is `k_allowed_free_modes` in HoonyMode -- an admin-configuration requirement that had to be documented to make the mode usable.

**Broken KTX wiki link:** The KTX article wikitext (`research/repos/ktx...` dump text old_id=77126) links `[https://github.com/qwassoc/mvdsv the KTX wiki pages]` -- this URL is the old-org MVDSV repo (now QW-Group/mvdsv), not the KTX GitHub wiki. The real KTX GitHub wiki at `https://github.com/QW-Group/ktx/wiki` appears to be empty or login-gated. This stale link means the QWiki article actively misdirects admins looking for a KTX configuration reference.

**MVDSV page is a stub:** The MVDSV wiki page (`/wiki/MVDSV`, last edited 2022-08-01, dump old_id=49310) is 345 bytes of wikitext: three sentences and a GitHub link. It has not been updated since 2022 and contains no admin-useful content.

**Race page is the only command-coverage island:** 12+ race_* commands are named and briefly described in `/wiki/Race` -- the only wiki page that functions as a partial command reference for any KTX domain. All other command and cvar coverage is incidental (embedded in examples or mentioned in passing in a mode page).

**Antilag page scope confusion risk:** `/wiki/Antilag` covers client-side prediction cvars (`cl_predict_beam`, `cl_predict_jump`, etc.) attributed to ezQuake's "andehlag" feature, NOT MVDSV server antilag configuration. If this page is ingested as server admin documentation it would misattribute ezQuake client cvars to the MVDSV/KTX admin domain. Scope filter required.

**Structurally-derived domains (gameplay_tables, gameplay_taxonomies, log_templates, match_events, protocol, qc_builtins, info_keys):** The wiki does not document any of these domains. No pages for death rules, election types, score systems, drop items, log templates, MVD protocol messages, or QC builtins were found. These domains are entirely absent from the wiki corpus.

**Mode coverage cliff:** Of the 15 modes with no wiki page, 8 are recently-added or niche modes (blitz variants, XonX, mutators like killquad/nosweep/freshteams/yawnmode). The 8 mutators are the biggest blank spot -- only `instagib` has coverage. These are also the modes least likely to be found in probe-1/probe-3, since they tend not to ship as usermodes/*.cfg presets.
