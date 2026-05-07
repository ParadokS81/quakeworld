While running the same extractor against current head, I noticed the symmetric direction to this issue: 28 ezquake cvars are documented only as trailing source comments, with no help-JSON entry.

| File | Count |
|---|---|
| sv_main.c | 14 |
| snd_voip.c | 3 |
| sv_login.c | 2 |
| cl_screen.c | 2 |
| gl_rmain.c | 2 |
| cl_main.c, mvd_utils.c, sv_demo.c, sv_demo_qtv.c, sv_phys.c | 1 each |

20 of 28 (~71%) live in server-side files. Even modern additions (2016-2020, post-JSONHELP era) kept the inline-comment-only convention for server-side cvars — suggests deliberate client-only-doc convention rather than a commission gap.

This connects to the **renamed** bucket of this issue. When a server-side cvar gets renamed (e.g. `sv_timeout` → `timeout`), the new name typically has no help-JSON entry, AND the old name's help-JSON becomes the orphaned DOCS_ONLY entry counted in this issue. So pruning those renamed orphans leaves the renamed cvars with no help-JSON description at all going forward — only the inline trailing comment in source.

Two angles, same root pattern: client-side cvars get help-JSON entries; server-side cvars get inline comments only.

<details>
<summary>Full per-entry digest (28 entries)</summary>

| name | source_file:line | trailing_comment |
|---|---|---|
| `cl_pext_serversideweapon` | cl_main.c:116 | server-side weapon selection |
| `scr_notifyalways` | cl_screen.c:125 | don't hide notification messages in intermission |
| `r_drawhud` | cl_screen.c:128 | disables hud rendering |
| `gl_solidparticles` | gl_rmain.c:187 | 1 |
| `gl_particle_style` | gl_rmain.c:204 | 0 - round, 1 - square (sw style) |
| `mvd_info_setup` | mvd_utils.c:218 | FIXME: non-ascii chars |
| `s_inputdevice` | snd_voip.c:46 | SDL device to use as microphone |
| `cl_voip_capturingvol` | snd_voip.c:50 | Multiplier applied while capturing, to avoid your audio from being heard by others. |
| `cl_voip_demorecord` | snd_voip.c:53 | Record VOIP in demo. |
| `extralogname` | sv_demo.c:56 | no sv_ prefix? WTF! |
| `qtv_sayenabled` | sv_demo_qtv.c:29 | allow mod to override GameStarted() logic |
| `sv_login` | sv_login.c:39 | if enabled, login required |
| `sv_login_web` | sv_login.c:41 | 0=local files, 1=auth via website (bans can be in local files), 2=mandatory auth (must have account in local files) |
| `maxfps` | sv_main.c:50 | It actually should be called maxpps (max packets per second). |
| `sys_select_timeout` | sv_main.c:55 | microseconds. |
| `timeout` | sv_main.c:66 | seconds without any message |
| `sv_hashpasswords` | sv_main.c:79 | 0 - plain passwords; 1 - hashed passwords |
| `sv_crypt_rcon` | sv_main.c:80 | use SHA1 for encryption of rcon_password and using timestamps |
| `sv_rconlim` | sv_main.c:83 | rcon bandwith limit: requests per second |
| `sv_use_dns` | sv_main.c:101 | 1 - use DNS lookup in status command, 0 - don't use |
| `vip_password` | sv_main.c:103 | password for entering as a VIP sepctator |
| `sv_unfake` | sv_main.c:123 | bliP: 24/9 kickfake to unfake |
| `sv_loadentfiles` | sv_main.c:145 | loads .ent files by default if there |
| `sv_loadentfiles_dir` | sv_main.c:146 | check for .ent file in maps/sv_loadentfiles_dir first then just maps/ |
| `skill` | sv_main.c:168 | dont delete this variable - it used by mods |
| `sv_forcenick` | sv_main.c:175 | 0 - don't force; 1 - as login; |
| `sv_registrationinfo` | sv_main.c:176 | text shown before "enter login" |
| `sv_antilag_no_pred` | sv_phys.c:54 | "negative" cvar so it doesn't show on serverinfo for no reason |

</details>

Two questions for QW-Group:

1. **Is the client-only help-JSON convention intentional?** If yes, that closes the loop for our extractor — we treat trailing comments as the durable description source for server-side cvars and stop flagging them as drift.
2. **If not intentional, would you accept a follow-up PR adding help-JSON entries for some/all of these 28?** Most have usable inline text; a few (e.g. `extralogname`'s "no sv_ prefix? WTF!", `mvd_info_setup`'s "FIXME") are dev annotations that don't translate to user-facing docs.

Not folded into this issue because it's the opposite direction (asking to potentially *add* coverage, not prune drift). Happy to split into a separate issue if you'd rather track them separately.

---

Co-authored with Claude Code.
