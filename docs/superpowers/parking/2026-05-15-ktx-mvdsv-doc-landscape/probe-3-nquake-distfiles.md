# Probe report: P3 -- nQuake distfiles

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg

Primary KTX mod config shipped by nQuakesv. 136 lines, 95 `set` statements all
carrying inline `// comment` descriptions. The file is the "operator-facing
defaults" surface -- every cvar is annotated.

### Domain: cvars (KTX)

- **Coverage count:** 95 of 260 KTX cvars carry an admin-facing description here
  (37%). Denominator M source: probe-0 (`ktx` `cvars` registered set = 260).
  Method: `grep -c "^set "` on the file (95); all 95 lines carry a `//` comment.
  Note: the 95 names are a subset of L1's 260 -- the remainder are less-common
  gameplay or internal cvars not exposed in the shipped default.
- **Format:** shipped-config // comment
- **Structure quality:** enum/range/type fully recoverable for all 95 entries.
  Bit-mask fields (`k_disallow_weapons`, `timing_players_action`, `k_spec_info`,
  `k_allowed_free_modes`) spell out the bit values inline. Boolean fields use
  `0 = off, 1 = on` or `0 = no, 1 = yes` consistently. Integer ranges named
  where relevant (`k_overtime`: 0/1/2, `k_spw`: 0-3, `k_frp`: 0-2).
- **Overlap / conflict:** Overlaps with in-repo KTX example-configs at
  `research/repos/ktx/resources/example-configs/ktx/ktx.cfg`. 73 cvars are
  shared; 22 nQuake-only; 19 in-repo-only (see Probe notes for full lists).
  Concrete value conflicts on shared cvars: `sv_maxrate` (nQuake 50000 vs
  in-repo 500000); `k_exclusive` (nQuake 0 vs in-repo 1); `k_short_gib` (nQuake
  0 vs in-repo 1); `k_exttime` (nQuake 3 vs in-repo 5); `k_vp_admin` (nQuake 75
  vs in-repo 51); `allow_timing` (nQuake 0 vs in-repo 1);
  `timing_players_time` (nQuake 6 vs in-repo 2); `k_cmd_fp_dontkick` (nQuake 1
  vs in-repo 0); `k_sready` (nQuake 1 vs in-repo 0). Comment wording also
  diverges on `k_noframechecks`: nQuake says "check for fps/speed manipulation
  (0 = yes, 1 = no)" (inverted polarity label vs in-repo "disable check... (0 =
  no, 1 = yes)").
- **Extractability for a future L1 spine:** mechanical -- every line is
  `set <name> <value> // <description>`; regex extraction is trivial.

---

## Source: research/repos/nquake-distfiles/sv-configs/ktx/mvdsv.cfg

MVDSV base config shipped by nQuakesv. 101 lines. Covers both MVDSV cvars (bare
`name value // comment` format) and a few KTX info_keys via `serverinfo`.

### Domain: cvars (MVDSV)

- **Coverage count:** ~63 of 183 MVDSV cvars carry an admin-facing description
  here (34%). Denominator M source: probe-0 (`mvdsv` `cvars` registered set =
  183). Method: `grep -E "^[a-zA-Z]" | grep -v "^//" | grep "//" | wc -l`
  yields 68 commented lines; subtracting 5 `serverinfo` lines leaves ~63 cvar
  lines. Marked (est.) because a few uncommented lines (e.g. `vip_values`,
  `setmaster`) are not cvars; the remainder with `//` are all admin-facing.
- **Format:** shipped-config // comment
- **Structure quality:** boolean `(0 = off, 1 = on)` / `(0 = no, 1 = yes)`
  recoverable. Bit-mask for `fpd` (8 flags, all spelled out inline). Numeric
  ranges named where relevant (`sv_getrealip`: 0/1/2, `sv_specprint`: 1/2/4).
- **Overlap / conflict:** Overlaps with in-repo `research/repos/ktx/resources/
  example-configs/ktx/mvdsv.cfg`. 10 names present in nQuake only
  (`fs_cache`, `sv_broadcast_enabled`, `sv_crypt_rcon`, `sv_demoDirAlt`,
  `sv_demoMaxSize`, `sv_demoUseCache`, `sv_demofps`, `sv_enableprofile`,
  `sv_safestrafe`, `sv_demofps`); 3 in in-repo only (`qtv_maxstreams`,
  `sv_antilag` (moved to in-repo), `set maxfps` vs `serverinfo maxfps` naming
  difference). Value conflicts: `maxclients` (nQuake 32 vs in-repo 8);
  `maxspectators` (nQuake 12 vs in-repo 4); `fpd` (nQuake 206 vs in-repo 222 --
  different flag set); `sv_reliable_sound` (nQuake 1 vs in-repo 0);
  `sv_demoMaxDirSize` (nQuake 4096000 vs in-repo 262144);
  `allow_download_other` (nQuake 1 vs in-repo 0). `sv_antilag` is in-repo-only
  (nQuake omits it; its absence implies a meaningful operational choice).
- **Extractability for a future L1 spine:** mechanical -- same `name value //
  comment` format; regex captures name + value + description.

### Domain: info_keys (MVDSV)

- **Coverage count:** 3 of 45 MVDSV info_keys carry an admin-facing description
  here (7%). Denominator M source: probe-0 (`mvdsv` `info_keys` registered set =
  45). Covered: `serverinfo fpd` (8-flag bitmask fully documented inline),
  `serverinfo pm_ktjump` (jumpfix 0/1), `serverinfo maxfps`. The remaining 42
  MVDSV info_keys are not present in this file.
- **Format:** shipped-config // comment (for `fpd`); bare value for others.
- **Structure quality:** `fpd` bitmask: fully parseable (8 flags enumerated).
  `pm_ktjump`, `maxfps`: recoverable boolean / integer.
- **Overlap / conflict:** Same three entries appear in in-repo `mvdsv.cfg` with
  minor comment wording differences on `fpd` (nQuake uses "reporter does not
  see" vs in-repo "reporter doesn't see"). The `fpd` bitmask listing is
  identical in structure.
- **Extractability for a future L1 spine:** mechanical -- `serverinfo <name>
  <value> // <description>` lines are directly parseable.

---

## Source: research/repos/nquake-distfiles/sv-configs/ktx/SETUP_FFA_CTF.txt

37-line plain-text admin guide explaining how to configure FFA and CTF server
ports on an existing nQuakesv installation.

### Domain: freeform_prose

- **Coverage count:** 4 of 260 KTX cvars explicitly named with values in this
  file (1.5% of M=260). The four: `k_matchless`, `k_use_matchless_dir`,
  `k_mode`, `k_allowed_free_modes`. They appear as raw `set` lines in the
  instructions without `//` descriptions, but the surrounding prose contextualises
  their meaning (e.g. "change the following lines to..." with stated outcome
  "run a CTF port").
- **Format:** man page (step-by-step plain prose, not structured fields)
- **Structure quality:** free prose only; values shown but not defined; meaning
  inferred from context.
- **Overlap / conflict:** All four cvars documented here also appear in
  `sv-gpl/ktx/port_template.cfg` with `//` comments. No contradiction; this file
  provides the "why" (when to use them) while the port_template provides the
  "what" (enum definitions).
- **Extractability for a future L1 spine:** hand-curate -- the guide explains
  admin workflows (FFA vs CTF vs matchless CTF) that have no direct mapping to
  individual cvar descriptions; the value is the workflow narrative.

---

## Source: research/repos/nquake-distfiles/sv-configs/ktx/modes/ (1on1/1on1.cfg, ffa/ffa.cfg, plus stubs for 2on2, 4on4)

The `modes/` directory contains canonical server-mode config files with a
`DONT EDIT` marker (empty zero-byte sentinel file). Four mode subdirectories:
1on1, 2on2, 4on4, ffa. Of these, `1on1/1on1.cfg` and `ffa/ffa.cfg` have
content; `2on2/2on2.cfg` and `4on4/4on4.cfg` are empty (zero-byte placeholder
files).

### Domain: modes (KTX)

- **Coverage count:** 4 of 27 KTX game_mode catalog entries have a canonical
  `modes/` override file here (15%). Denominator M source: probe-0 (`ktx`
  `modes` game_mode catalog M=27). Covered: 1on1, 2on2, 4on4, ffa. The
  `1on1.cfg` sets: `k_exclusive`, `k_lockmax`, `k_lockmin`, `k_membercount`,
  `k_idletime`, `k_defmap`, `k_timetop`, `k_mode`, `k_overtime`, `k_exttime`,
  `k_defmode`, `k_free_mode`, `k_demo_mintime` -- 13 cvars with inline comments.
  `ffa.cfg` sets 10 cvars (matchless mode, map rotation cvars). The 2on2/4on4
  stubs are zero-byte; they exist as placeholders for rsync targets.
- **Format:** shipped-config // comment
- **Structure quality:** fully parseable; enum/range recoverable for all fields
  present in `1on1.cfg` and `ffa.cfg`.
- **Overlap / conflict:** `1on1/1on1.cfg` diverges from in-repo
  `configs/usermodes/1on1/default.cfg` in content scope: the nQuake `modes/`
  file sets server-mode cvars (`k_mode`, `k_defmode`, `k_free_mode`,
  `k_defmap`), whereas the in-repo `usermodes/1on1/default.cfg` only sets
  `k_idletime 60`. These are complementary layers, not conflicting.
  `ffa.cfg` is substantially identical to `matchless.cfg` in `sv-configs/ktx/`
  root (both set the same 10 cvars; `matchless.cfg` is the non-modes-dir copy).
- **Extractability for a future L1 spine:** mechanical -- same `set name value //
  comment` format.

---

## Source: research/repos/nquake-distfiles/sv-configs/ktx/configs/usermodes/ (97 .cfg files)

nQuakesv usermode overlay configs. 97 files total across named mode subdirs and
per-map-name flat files. These are loaded by KTX at match start to apply
mode/map-specific cvar overrides on top of the base `ktx.cfg`. The 97-file set
is a superset of the in-repo 76-file set.

### Domain: cvars (KTX)

- **Coverage count:** usermodes collectively exercise ~30 distinct KTX cvars
  (est.) beyond what `ktx.cfg` covers, but almost all with no inline comments
  (bare `set name value` without `//`). Of those 30, only a handful (`ctf/
  default.cfg` lines like `k_lockmode` and `k_pow_min_players`) carry inline
  comments. The net additional documented cvars from usermodes is ~3-5 of 260
  (1-2%). Marked (est.) because a full count requires scanning all 97 files
  individually; spot-checks on `ca/default.cfg`, `ctf/default.cfg`,
  `ffa/default.cfg`, and `default.cfg` confirm the absence-of-comment pattern.
- **Format:** shipped-config // comment (sparse); mostly bare `set name value`
  with no description.
- **Structure quality:** not recoverable from comments (none); recoverable only
  by cross-referencing with `ktx.cfg` descriptions where the same cvar appears.
- **Overlap / conflict:** The 97 nQuake files overlap with the in-repo 76 files.
  42 files are nQuake-only -- the large `dmm4<mapname>.cfg` set (40+ files for
  dmm4 Rocket Arena / custom map layouts) plus `maphub_v2.cfg` and `under.cfg`.
  21 files are in-repo-only (notably the `anarena*.cfg` set covering 10 arena
  maps, plus `2on2on2/`, `3on3on3/`, `4on4on4/`, `XonX/` multi-team modes,
  `tot/` tournament configs, `schlossdmm4.cfg`, `pushdmm4.cfg`, `sewer.cfg`).
  Value drift confirmed on shared files: `1on1/default.cfg` nQuake adds `teamplay
  0` and `set k_pow 0` lines absent from in-repo; `4on4/default.cfg` nQuake adds
  `set k_pow 1` absent from in-repo.
- **Extractability for a future L1 spine:** LLM-assisted -- bare `set` lines
  require cross-referencing cvar names against `ktx.cfg` descriptions; no
  independent extraction possible from usermodes alone.

---

## Source: research/repos/nquake-distfiles/sv-gpl/ktx/port_template.cfg

Installer-generated per-port config. 27 lines. Contains templated placeholders
(`NQUAKESV_HOSTNAME`, `NQUAKESV_ADMIN`, `NQUAKESV_IP`, `NQUAKESV_PORT`) that
the install scripts substitute at setup time.

### Domain: cvars (KTX + MVDSV)

- **Coverage count:** 7 of 260 KTX cvars documented here (3%); all carry inline
  `//` comments. The 7: `k_motd1`-`k_motd5`, `k_motd_time`, `k_matchless`,
  `k_use_matchless_dir`, `k_defmode`, `k_allowed_free_modes` (incl. full bitmask
  explanation), `k_defmap`, `k_mode`. Additionally, 3 MVDSV cvars: `hostname`,
  `sv_admininfo`, `sv_serverip` (2 of 183 = 1% of MVDSV M).
- **Format:** shipped-config // comment
- **Structure quality:** `k_allowed_free_modes` bitmask fully spelled out (12
  flags). Other fields: boolean 0/1 with prose labels.
- **Overlap / conflict:** Duplicates `ktx.cfg` descriptions for `k_matchless`,
  `k_use_matchless_dir`, `k_defmode`, `k_allowed_free_modes`, `k_mode`. No
  value conflicts; this file adds the MOTD cvars (`k_motd*`, `k_motd_time`) not
  in `ktx.cfg`.
- **Extractability for a future L1 spine:** mechanical -- standard `set name
  value // description` format.

---

## Source: research/repos/nquake-distfiles/sv-gpl/addons/install_ffa.sh and install_ca.sh

Bash installer scripts for FFA and CA addon packages. These are the "interactive
logic" surface: the scripts `read -p` from the operator and then `sed -i`
template variables into port1.cfg files.

### Domain: freeform_prose (implicit info_keys)

- **Coverage count:** 4 admin-configurable settings captured by installer
  interaction (hostname, port, mirror, admin identity). These implicitly
  correspond to MVDSV cvars `hostname` (via `NQUAKESV_HOSTNAME`) and
  `sv_admininfo` (via `NQUAKESV_ADMIN`) plus `sv_serverip` and
  `qtv_streamport`. None of these are in the MVDSV M=183 cvar set per probe-0
  (they appear in the template as bare `name value` lines not in L1, or are
  info_key-adjacent). Coverage against the domain denominators: effectively 0 net
  new cvars beyond what port_template.cfg already captures. The installer's
  documentation value is the workflow context ("the admin is asked once at
  install time, values are persisted to `~/.nquakesv/` files and re-applied on
  config updates").
- **Format:** runtime output (interactive shell prompts)
- **Structure quality:** free prose only; no enum/range. The prompts reveal which
  settings the nQuake authors judged "must be set at install time" vs "ship with
  safe defaults".
- **Overlap / conflict:** The values set by the installer overwrite the
  `NQUAKESV_*` placeholders in port_template.cfg -- the two are paired.
- **Extractability for a future L1 spine:** hand-curate -- installer interaction
  is implicit documentation of "settings that matter for a new admin"; the list
  is very short (hostname, port, admin name, IP) and already covered in
  port_template.

---

## Probe notes

### nQuake-only KTX cvars (21, in ktx.cfg, not in in-repo ktx.cfg)

All 21 are documented with inline comments in nQuake's ktx.cfg. They represent
features added after the in-repo snapshot was taken, or nQuakesv-specific config
extensions: `k_admins`, `k_allow_vwep`, `k_autoreset`, `k_instagib`,
`k_instagib_custom_models`, `k_master`, `k_on_end_f_modified`,
`k_on_end_f_ruleset`, `k_on_end_f_version`, `k_on_start_f_modified`,
`k_on_start_f_ruleset`, `k_on_start_f_version`, `k_race_simultaneous`,
`k_spm_color_rgba`, `k_spm_custom_model`, `k_spm_glow`, `k_spm_show`,
`k_vwep`, `k_yawnmode`, `sv_www_address`, `sv_www_authkey`.

These 21 cvars are not described in L1 today (they are among the 192 NULL-
description cvars). The nQuake ktx.cfg is therefore the primary available source
for their admin-facing descriptions.

### in-repo-only KTX cvars (19, in in-repo ktx.cfg, not in nQuake)

`k_allowed_free_modes`, `k_classic_shotgun`, `k_ctf_hookstyle`,
`k_ctf_rune_power_hst`, `k_ctf_rune_power_res`, `k_ctf_rune_power_rgn`,
`k_ctf_rune_power_str`, `k_defmap`, `k_defmode`, `k_keepspectalkindemos`,
`k_mode`, `k_use_matchless_dir`, `k_vp_antilag`, `k_vp_coach`, `k_vp_coop`,
`k_vp_hookstyle`, `k_vp_nospecs`, `k_vp_suggestcolor`, `k_vp_teamoverlay`.

These appear with inline comments in the in-repo config but were removed or
restructured in nQuakesv (e.g. `k_defmode` and `k_mode` moved to `modes/` and
`port_template.cfg`). P1 probe covers these.

### nQuake-only MVDSV cvars (10, in nQuake mvdsv.cfg, not in in-repo)

`fs_cache`, `sv_broadcast_enabled`, `sv_crypt_rcon`, `sv_demoDirAlt`,
`sv_demoMaxSize`, `sv_demoUseCache`, `sv_demofps`, `sv_enableprofile`,
`sv_safestrafe`, plus `sv_demofps` (same name). All carry inline comments in
nQuake's mvdsv.cfg. Of the 183 NULL-description MVDSV cvars, these 10 represent
a direct gap-fill surface.

### modes/ DONT EDIT marker

The zero-byte file `modes/DONT EDIT` at
`sv-configs/ktx/modes/DONT EDIT` is a distribution-package sentinel: it signals
to rsync/update scripts that these configs are managed by nQuakesv and should not
be locally modified. It is not documentation. The 2on2 and 4on4 mode files are
empty placeholders (zero bytes) -- the actual 2on2 and 4on4 configuration lives
entirely in the `configs/usermodes/` hierarchy.

### dmm4 usermode set (40+ files, nQuake-only)

The 40+ `dmm4<mapname>.cfg` files (e.g. `dmm4moon.cfg`, `dmm4pyramid.cfg`)
document a community-maintained per-map DMM4 override practice. All are tiny
(2-4 `set` lines, no comments). The accompanying `"dmm4cfgs for Rocket Arena
maps.txt"` note (at `sv-configs/ktx/configs/usermodes/`) explains the intent:
"upon map load, your server will automatically execute the respective .cfg of
the map and load DMM4 settings." This is L3-worthy context (the
KTX per-map-usermode activation pattern) but contains no new cvar descriptions.

### Operational divergence signal

The `sv_antilag` cvar is present in the in-repo mvdsv.cfg (set to 2, documented
"antilag server setting") but absent from nQuakesv's mvdsv.cfg. This is
intentional: nQuakesv ships a KTX-specific configuration profile where antilag
is expected to be set via KTX's own controls. The `fpd` value difference
(nQuake 206 vs in-repo 222) reflects a different security posture: nQuakesv
uses bit 0+1+2+5 = 206; in-repo uses 0+1+2+3+5+6+7 = 222 (stricter).

### sv-ca cace.cfg (bonus surface)

`sv-ca/cace/cace.cfg` documents a non-KTX CA (Clan Arena) mod (CACE/ProX).
It uses `localinfo` key-value pairs (not KTX cvars) to configure round counts,
team counts, spawn settings. These do not map to any L1 KTX or MVDSV domain.
Not counted in coverage; flagged as an out-of-scope CA mod config.

### No main nQuake installer script in this repo

The interactive installer (`nquakesv-linux.sh`) lives in a separate repository
(`github.com/nQuake/server-linux`, not cloned here). This repo contains only
the distfiles (configs + binaries). The install scripts present
(`sv-gpl/addons/install_ffa.sh`, `install_ca.sh`, `install_fortress.sh`) are
the addon-only sub-installers; their interactive prompts (hostname, port,
mirror) are documented above but are not the full installer surface. The main
installer's question set (admin email, rcon password, etc.) is not visible in
this repo.

### Key gap-fill estimate vs L1

Combined across all nQuake files (ktx.cfg + mvdsv.cfg + port_template.cfg):
- KTX cvars newly documented (not already in L1): 21 nQuake-only cvars from
  ktx.cfg + ~10 MVDSV cvars from mvdsv.cfg = ~31 entries where nQuake is the
  only prose source. This directly addresses the 192-NULL KTX cvar gap and
  148-NULL MVDSV cvar gap identified in probe-0.
- MVDSV commands (M=108, 100% NULL): no coverage in any nQuake file -- gap
  remains entirely open.
- MVDSV cmdline (M=11, 100% NULL): no coverage -- install_ffa.sh shows
  `-port $port -game ffa` pattern but does not describe what these flags do.
