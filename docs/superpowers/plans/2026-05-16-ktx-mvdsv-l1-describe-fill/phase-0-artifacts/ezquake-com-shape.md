# ezquake.com Server Doc Shape Analysis

**What this is:** Cross-match of the ezquake.com hosted server-settings reference against the
current MVDSV L1 cvar roster, for Phase 4 boundary sizing and context-budget calibration.

**Source provenance:**
- Shipped doc (shipped_doc class): https://ezquake.com/docs/settings/server.html
  Fetched via Jina reader (r.jina.ai) on 2026-05-17. The page rendered successfully; names and
  partial type/default/prose data were extracted.
- MVDSV L1 roster: live qw_oracle DB, project='mvdsv', type='cvar', post Phase-0 Task-2
  re-extract.

**Roster size (prose):** The current MVDSV L1 cvar roster has 183 names. The prior nQuake
baseline established a floor of 63 names covered by the nQuake distribution; this ezquake.com
analysis now supplies a much larger shipped_doc reference set for Phase 4 cross-checking.

**ezquake.com list size (prose):** The ezquake.com server page lists 124 named settings.

---

## Bucket A -- names present on ezquake.com AND in MVDSV L1

The list below has 107 names. These are the cross-confirmed core, dominated by the shared
`sv_*` physics/download/demo families plus the common top-level server controls. Phase 4 can
lean on the ezquake.com prose as a shipped_doc candidate (evaluated via the D6 fan-out like any
other shipped_doc source) for this set. Work here is mechanical-light: the ezquake.com prose
provides a ready description scaffold; the Phase 4 task is to confirm MVDSV-specific semantics
and populate L1 description fields.

```
allow_download
allow_download_demos
allow_download_maps
allow_download_models
allow_download_other
allow_download_pakmaps
allow_download_skins
allow_download_sounds
coop
deathmatch
download_map_url
filterban
frag_log_type
fraglimit
hostname
maxclients
maxspectators
maxvip_spectators
password
pausable
pm_airstep
qconsole_log_say
qtv_maxstreams
qtv_password
qtv_pendingtimeout
qtv_streamport
qtv_streamtimeout
samelevel
skill
spectator_password
sv_accelerate
sv_admininfo
sv_airaccelerate
sv_allowlastscores
sv_bigcoords
sv_cheats
sv_crypt_rcon
sv_default_name
sv_demoClearOld
sv_demoDir
sv_demoExtraNames
sv_demofps
sv_demoIdlefps
sv_demoMaxDirSize
sv_demoMaxSize
sv_demopings
sv_demoPrefix
sv_demoRegexp
sv_demoSuffix
sv_demotxt
sv_demoUseCache
sv_downloadchunksperframe
sv_enable_cmd_minping
sv_forcenick
sv_forcespec_onfull
sv_friction
sv_getrealip
sv_gravity
sv_hashpasswords
sv_kicktop
sv_kickuserinfospamcount
sv_kickuserinfospamtime
sv_loadentfiles
sv_logdir
sv_login
sv_mapcheck
sv_maxdownloadrate
sv_maxlogsize
sv_maxpitch
sv_maxrate
sv_maxspeed
sv_maxtic
sv_maxuploadsize
sv_maxvelocity
sv_minping
sv_minpitch
sv_mintic
sv_mod_msg_file
sv_nailhack
sv_onDemoRemove
sv_onRecordFinish
sv_paused
sv_phs
sv_progsname
sv_progtype
sv_rconlim
sv_reconnectlimit
sv_registrationinfo
sv_sayteam_to_spec
sv_serverip
sv_specprint
sv_spectalk
sv_spectatormaxspeed
sv_speedcheck
sv_stopspeed
sv_timestamplen
sv_unfake
sv_use_dns
sv_wateraccelerate
sv_waterfriction
teamplay
telnet_log_level
timelimit
timeout
vip_password
vip_values
zombietime
```

---

## Bucket B -- names in MVDSV L1 but absent from ezquake.com

This is the synthesis-heavy tail. The Phase 4 drafter must route these to D6 source-grounded
synthesis (reading MVDSV source comments / help structures directly) or to the C1 outreach track
for genuine residue with no source coverage.

Bucket B splits into two sub-buckets:

### B1 -- dedicated-server-only admin families

The list below has 45 names. These are the families the arc spec identified as synthesis-heavy
by nature: QTV extensions beyond the shared qtv_* already in Bucket A, demo-recording internals
not exposed in the ezquake.com surface, sys_* OS-level controls, qwm_*/qws_* build-info
read-only properties, sv_www_* HTTP delivery, sv_broadcast_* relay controls, sv_voip_* VoIP
pipeline, sv_debug_* diagnostic toggles, sv_antilag_* server-side lag compensation, MVDSV
protocol extension flags, and rcon infrastructure. B1 is the larger share of the B tail,
dominated by the qtv/demo supplement, sys, qwm/qws, and sv_www families.

```
extralogname
qtv_sayenabled
qwm_builddate
qwm_buildnum
qwm_fullname
qwm_homepage
qwm_name
qwm_platform
qwm_version
qws_builddate
qws_buildnum
qws_fullname
qws_homepage
qws_name
qws_platform
qws_version
rcon_password
serverdemo
sv_antilag
sv_antilag_no_pred
sv_antilag_projectiles
sv_broadcast_enabled
sv_broadcast_sender_validation_enabled
sv_csqc_progname
sv_debug_antilag
sv_debug_usercmd
sv_debug_weapons
sv_demoCacheSize
sv_demoDirAlt
sv_pext_mvdsv_serversideweapon
sv_pr2references
sv_silentrecord
sv_voip
sv_voip_echo
sv_voip_record
sv_www_address
sv_www_authkey
sv_www_checkin_period
sys_command_line
sys_extrasleep
sys_nostdout
sys_restart_on_error
sys_select_timeout
sys_simulation
sys_sleep
```

### B2 -- MVDSV L1 names absent from ezquake.com, not clearly in a dedicated-server admin family

The list below has 31 names. These include legacy/compatibility server controls (registered,
showdrop, showpackets, halflifebsp, watervis), physics/movement additions not in the base
ezquake.com surface (pm_bunnyspeedcap, pm_ktjump, pm_pground, pm_rampjump, pm_slidefix),
server-side networking and rate controls (maxfps, hostport, sv_maxping, sv_local_addr,
sv_extlimits, sv_idlesleep, sv_reliable_sound, sv_safestrafe), MVDSV-specific extensions
(pext_ezquake_verfortrans, sv_mod_extensions, sv_login_web, sv_serveme_fix, vm_rtChecks,
sv_loadentfiles_dir), and miscellaneous runtime info (city, coords, countrycode, developer,
fs_cache, version).

```
city
coords
countrycode
developer
fs_cache
halflifebsp
hostport
maxfps
pext_ezquake_verfortrans
pm_bunnyspeedcap
pm_ktjump
pm_pground
pm_rampjump
pm_slidefix
registered
showdrop
showpackets
sv_bspversion
sv_extlimits
sv_idlesleep
sv_loadentfiles_dir
sv_local_addr
sv_login_web
sv_maxping
sv_mod_extensions
sv_reliable_sound
sv_safestrafe
sv_serveme_fix
version
vm_rtChecks
watervis
```

---

## Bucket C -- names on ezquake.com but absent from MVDSV L1

The list below has 17 names. These are ezquake.com over-coverage entries: client-facing cvars
listed on the server page that are not registered in MVDSV (cl_sv_packetsync is client-side;
sv_aim and sv_highchars are ezquake client-host features; sv_forcenqprogs, sv_ktpro_mode,
sv_qwfwd_port, sv_demonovis, sv_cpserver, sv_cullentities are ezquake-specific or refer to
companion services; auth_timeout, not_auth_timeout, sv_timeout, telnet_password, sv_fastconnect,
sv_enableprofile, sv_use_internal_cmd_dl appear to be stale or ezquake-only entries not present
in the current MVDSV extraction). Phase 4 need not fill these; they are out of scope for MVDSV
L1.

```
allow_download_gfx
auth_timeout
cl_sv_packetsync
not_auth_timeout
sv_aim
sv_cpserver
sv_cullentities
sv_demonovis
sv_enableprofile
sv_fastconnect
sv_forcenqprogs
sv_highchars
sv_ktpro_mode
sv_qwfwd_port
sv_timeout
sv_use_internal_cmd_dl
telnet_password
```

---

## Phase 4 sizing call

**Bucket A (the list above has 107 names):** mechanical-light. The ezquake.com shipped_doc prose
provides a ready description scaffold for the shared sv_*/core families. Phase 4 work here is
confirmation and MVDSV-semantic adjustment, not synthesis from scratch. The D6 fan-out evaluates
ezquake.com as a shipped_doc candidate in the normal way; no special handling needed.

**Bucket B (the list above has 76 names across B1 and B2):** synthesis-heavy. B1 is the larger
share (45 names), dominated by the qtv/demo supplement, sys_*, qwm_*/qws_* build-info blobs, and
sv_www_*/sv_broadcast_*/sv_voip_*/sv_debug_*/sv_antilag_* admin-facing families. These have no
ezquake.com prose to lean on and require source-grounded synthesis from MVDSV C source comments
and help structures, or routing to the C1 outreach track where source coverage is absent. B2 is
the smaller share (31 names) and is a mixed bag of legacy compatibility controls, MVDSV-specific
extensions, and runtime-info read-only properties -- also synthesis-heavy but more individually
tractable since many names are self-describing or have short comment coverage in source.

**Phase 4 context budget verdict:** The README noted "ctx 200-400k uncertain until P0." Given
that the Bucket A mechanical-light set is the larger portion of the total roster and the B tail
is dominated by compact admin families with source-comment coverage, the 200-400k range is
reasonable. A single Phase 4 pass can handle Bucket A in bulk using the shipped_doc scaffold,
then route B1/B2 names to per-family synthesis sub-tasks. Phase 4 is weighted mechanical-heavy
overall (because Bucket A dominates by count), with a synthesis-heavy tail that requires careful
source grounding for the B1 admin families and B2 MVDSV-specific extensions.
