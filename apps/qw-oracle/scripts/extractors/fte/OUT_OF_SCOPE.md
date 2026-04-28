# FTE Extractor -- Out of Scope

FTE has the largest extraction surface among the QW engines and the most preprocessor variation. Phase 2d-core completed 2026-04-26 with 3208 entities loaded (1397 engine + 1085 ezhud plugin cvars, plus commands, macros, cmdline_params). Pass 1 runtime cvarlist diff identified 114 runtime-only entries, all categorized below.

**Last reviewed:** 2026-04-28 (post-cross-extractor-arc, post-Mode-B-validation).
**Extraction total:** 3208 entities (build-6698: 2482 cvar + 556 command + 67 macro + 108 cmdline_param + cvar_alias 38 + asset surface).

---

## Bucket 1 -- Out of scope by design (~26 cvars, plugin paths not visited)

Phase 2d-core deliberately limited the plugin allowlist to `ezhud` -- the QW-competitive bridge plugin that exposes ezQuake-compatible cvars to FTE. Other plugins are not in SOURCE_ROOTS and were not visited:

| Plugin path | Description | Example cvars absent |
|---|---|---|
| `plugins/irc/` | IRC chat client | `irc_nick`, `irc_altnick`, `irc_quitmessage` |
| `plugins/jabber/` (or `plugins/xmpp/`) | XMPP/Jabber messaging | `xmpp_autoacceptjoins` |
| `plugins/bullet/` | Bullet physics integration | physics_bullet_* family |
| `plugins/avplug/` | Audio/video plugin | av_* family |
| `plugins/cef/` | Chromium embedded browser | cef_* family |
| `plugins/cod/`, `plugins/hl2/`, `plugins/quake3/` | Game-format support | (game-format-specific) |
| `plugins/serverb/`, `plugins/qi/` | Server browser, Quake Injector | sb_*, qi_* |
| `plugins/ezscript/` | Script helpers (QW-relevant) | ezscript_* |
| ~17 other plugins | Various | various |

**Fixable?** Yes. Add the plugin directory to SOURCE_ROOTS in `extract.py`. Existing handlers process `cvarfuncs->GetNVFDG()` and `CVARD`-family registration patterns without code changes. Each plugin is a one-line SOURCE_ROOTS addition.

**Trigger to revisit:** a real FTE user config surfaces `irc_*`, `ezscript_*`, or similar cvars and slipgate's converter flags them as unknown. Quick add at that point.

---

## Bucket 2 -- Dynamic registration via Cvar_Get / Cvar_FindOrGet (~27 cvars)

Cvars created at runtime when something requests them by name. Names not present in source as literals. Static extraction cannot reach them.

**Confirmed examples:**
- `physics_ode_*` family: ODE (Open Dynamics Engine) plugin runtime config -- names built from runtime physics solver state
- IRC/XMPP per-session user-state cvars: connection state, channel membership, user list
- A small set from CSQC integration: user-loaded `progs.dat` mod code can call `RegisterCvar()` at runtime with arbitrary names

**Fixable?** No. Fundamental static-analysis limit. Same wall ezQuake hits with `Cvar_Create`. Document these in the runtime-validation categorization step so they are separated from real extraction gaps.

---

## Bucket 3 -- Runtime-synthesized names (~56 cvars)

Names built via `sprintf("template_%s", ext_name)` or `sprintf("prefix_%d", i)` at runtime. Format strings ARE in source; actual expansions depend on hardware, audio playlist length, or loop bounds only known at runtime.

**Confirmed examples:**

GL extension cvars (hardware-dependent -- one per extension the GPU advertises at startup):
- `gl_ext_GL_ARB_texture_env_dot3`
- `gl_ext_GL_EXT_stencil_two_side`
- `gl_ext_GL_EXT_texture_compression_dxt1`
- `gl_ext_GL_ARB_multisample`
- (dozens more depending on GPU driver)

Numbered addon slots (16 slots via `sprintf("addon%d", i)` loop):
- `addon0`, `addon1`, ..., `addon15`

Music playlist position cvars (one per audio track in the active playlist):
- `music_playlist_sampleposition1`
- `music_playlist_sampleposition2`
- (N more depending on playlist length)

**Fixable?** No. Names depend on runtime state that doesn't exist at extraction time. For the addon slots specifically, the count (16) is a compile-time constant -- could synthesize those 16 rows at extraction time as a special case. Deferred until a use case justifies it.

---

## Bucket 4 -- Windows SDK PARSE_INCOMPLETE (RESOLVED 2026-04-26)

Stub headers at `research/stubs/windows-sdk/` landed 2026-04-26 and recovered all FTE Bucket 4 entries. Pre-stubs, the affected entries were `sys_disableTaskSwitch`, `sys_disableWinKeys`, `-nohwtimer`, `-gl-forward-only-profile`, and others that now extract cleanly.

No FTE-specific Bucket 4 residual today. The two QWCL irrecoverable cases (`-novbeaf` MGL, `-starttime` `#if 0`) are documented in `apps/qw-oracle/scripts/extractors/qwcl/OUT_OF_SCOPE.md`.

---

## Architectural exclusions (not a bucket)

**QuakeC modules under `quakec/`:** demo/reference QuakeC included in the FTE repo. No actual cvar registrations found (verified during Phase 2d prep). User-loaded `progs.dat` from mods (KTX-style) is fundamentally out of static reach regardless of tooling.

**Game-type defines (HEXEN2, Q2CLIENT, Q3CLIENT, etc.):** deliberately undefined per Phase 2d Option B scope. The extractor targets the QW-only profile. Fixable by adding game-type variant passes to `clang_config.py` if the QW-only scope proves too narrow.

**Renderer variants beyond GL+Vulkan:** software renderer (`SWQUAKE`) and D3D paths excluded. Fixable by adding variants to `clang_config.py`.

---

## Cross-references

- Playbook (4-bucket canonical reference): `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (Known Limits section)
- Stubs: `research/stubs/windows-sdk/`
- FTE findings: `docs/superpowers/specs/2026-04-26-fte-extraction-findings.md`
- Memory: `project_fte_phase2d.md`, `project_extraction_pipeline_vision.md`
