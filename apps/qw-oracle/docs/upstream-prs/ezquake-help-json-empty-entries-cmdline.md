# ezQuake help-JSON empty-entries audit -- cmdline_param pass (2026-05-15; verifier walk + corrections applied 2026-05-26)

Output of the parking-doc audit at `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`. This is the **cmdline_param** pass (fourth and final calibration pass). Scope: ezQuake cmdline_params that exist in current source HEAD AND have no human-written prose in `help_cmdline_params.json`.

## Counts

| Verdict | Count | Notes |
|---|---|---|
| `needs_doc` | 48 | 46 high / 2 medium confidence; all drafted |
| `no_doc` | 2 | `-r-novao`, `-noatlas` — see classifications below |
| `family_collapse` | 0 | No qualifying families found (no enumeration families; -no* flags are not mirror-pair candidates) |
| `kick_to_ciscon` | 6 | 4 dead/unimplemented params in `cmdline_params_ids.h` + 2 deleted dead params |
| **Total** | **56** | matches queue size |

**Key structural findings:**
- 6 of the 56 entries are dead code: `-noinvlmaps`, `-nolibjpeg`, `-nolibpng`, `-showliberrors` are declared enums in `cmdline_params_ids.h` that are never consumed at runtime (likely refactor residue). `-nomouse` and `-nopriority` were removed entirely from the build but retained in `help_cmdline_params.json`.
- `-enablelocalcommand` is wired but calls `system()` with unsanitized input and carries prominent "REMOVE ME" comments in source — documented with a security warning.
- `-window` and `-startwindowed` are NOT aliases: both set fullscreen off, but only `-window` also routes `-width`/`-height`/`-display` to windowed cvars (`vid_win_*`) rather than fullscreen ones.
- `-userdir` takes two argv tokens (`<dirname>` + `<type>` integer 0–5), an unusual two-argument form.

---

## needs_doc entries (high confidence)

All entries are flag form (no value) unless the proposed description includes `<argument>` syntax.

### cd_linux.c

**`-cdaudio`**
> Enables CD audio playback in builds compiled against `cd_linux.c` or `cd_win.c`; the default build links `cd_null.c` which is a no-op.

---

### cl_main.c

**`-dev`**
> Enables developer mode, which unlocks development-only commands (`devmap` plus the `dev_*` family including `dev_physicsnormalset`, `dev_help_issues`, `dev_help_verify_config`, `dev_dump_defaults`) and extra cvars (`r_speeds`), and activates Vulkan validation layers when using the Vulkan renderer.

**`-noindphys`**
> Disables independent physics tick rate by setting `cl_independentPhysics` to 0 and `cl_nolerp` to 1, restoring the classic coupled rendering-and-physics frame timing.

**`-noscripts`**
> Disables movement scripting at startup by setting `allow_scripts` to 0, preventing use of advanced movement scripts such as rocket-jump or bunny-hop automation. Default allow_scripts is 2 (all scripts enabled).

**`-norjscripts`** *(medium confidence)*
> Disables movement scripting at startup; alias for `-noscripts` with identical runtime effect.

---

### cl_view.c

**`-gamma`**
> Sets the initial gamma value at startup (`-gamma <float>`, range 0.3-3.0), overriding the `gl_gamma` cvar default before the first frame.

---

### cmdline_params_ids.h

**`-enablelocalcommand`**
> Enables the server-side `localcommand` console command, which executes an arbitrary OS shell command on the server host. SERVERONLY builds only. **Security note:** the implementation calls `system()` with unsanitized input and is marked "REMOVE ME" in source; use only as a diagnostic tool in controlled environments.

**`-gl-forward-only-profile`**
> Requests an OpenGL forward-compatibility context flag (`SDL_GL_CONTEXT_FORWARD_COMPATIBLE_FLAG`) when creating a core-profile GL context on non-Apple platforms. No effect on compatibility-profile contexts or macOS.

**`-nohwtimer`**
> Disables the Windows high-resolution hardware timer (`QueryPerformanceCounter`) and falls back to the multimedia timer at 1 ms resolution. Windows only. Use when `QueryPerformanceCounter` produces unreliable results on certain hardware or VM configurations.

---

### fs.c

**`-data`**
> Adds `<datadir>` as an additional game data directory on top of the standard search path (`-data <path>`); may be specified multiple times.

**`-game`**
> Sets the active game directory to `<modname>` (`-game <modname>`), overriding the default mod search path; affects which directory generated files are read from and written to (subject to `-nohome` / `+gamedir` interaction).

**`-nohome`**
> Disables the per-user home directory (`Documents\ezQuake` on Windows, `~/.ezquake` on Linux/macOS), forcing all file I/O to use the base game directory only.

**`-userdir`** *(medium confidence)*
> Sets a named user-data subdirectory and path layout (`-userdir <dirname> <type>`), where `<type>` is an integer 0-5 selecting the path-construction formula (case 0 = relative to game directory, cases 1-4 = base-directory variants, case 5 = relative to home directory). Two-argument form; inherited from QW262.

---

### gl_buffers.c

**`-no-triple-gl-buffer`**
> Disables persistent-mapped triple-buffering of GPU streaming buffers (VBOs used for once-per-frame uploads). When enabled, streaming buffers are allocated at 3x size, persistently mapped, and rotated with `glFenceSync` to avoid CPU/GPU stalls. Requires modern OpenGL with buffer-storage, sync, and map-buffer-range extensions; auto-disabled when any are absent. Use to fall back to standard mutable-buffer uploads when persistent mapping causes driver issues.

**`-r-debug`**
> Enables OpenGL error checking and debug-group instrumentation. Requires `-dev`; the combination activates `GL_DEBUG_OUTPUT`, registers a `glDebugMessageCallback` that prints driver messages, calls `glGetError` after every tracked GL procedure, and emits `glPushDebugGroup`/`glPopDebugGroup` scope markers. Use `-r-nocallback` alongside this flag to suppress the callback while keeping the error-checking pass.

**`-r-trace`**
> Enables full per-call GL API tracing to timestamped text files. Activates all of `-r-debug` without requiring `-dev`, and additionally logs GL function calls (function name, args where instrumented, and call site) to `qw/trace/frame_<timestamp>.txt` (one file per frame). Tracing starts before `Host_Init` completes.

---

### gl_debug.c

**`-r-nocallback`**
> Disables `glDebugMessageCallback` and `glDebugMessageControl` setup when the GL debug context is active (i.e. `-r-debug` with `-dev`, or `-r-trace` alone). Use when the driver's debug callback delivery is unreliable but GL error checking is still needed.

**`-r-verify`**
> Enables per-frame GL state verification: calls `GL_VerifyState` each frame to download actual OpenGL state from the driver and diff it against ezQuake's internal state tracker, logging any mismatches. Available only in builds compiled with `WITH_RENDERING_TRACE`.

---

### gl_state.c

**`-maxtmu2`**
> Caps the number of active texture units to 2 even if the hardware reports more. Use on older hardware where multitexturing with more than 2 TMUs causes rendering problems.

**`-nomtex`**
> Disables OpenGL multitexturing in the Classic renderer (prevents loading of `glMultiTexCoord2f`, `glActiveTexture`, and `glClientActiveTexture`), and additionally disables fog rendering engine-wide. Use when multitexturing causes corruption on old or non-standard GL drivers.

**`-r-nomultibind`**
> Disables use of `glBindTextures` (GL 4.4 / `GL_ARB_multi_bind`) for batched texture-unit binding. The engine auto-disables this on known-broken AMD driver versions (github bug #416); use this flag to force the same workaround on other drivers.

---

### host.c

**`-heapsize`**
> Sets the hunk memory allocation to `<kilobytes>` (`-heapsize <kb>`, e.g. `-heapsize 65536` for 64 MB). Legacy KB-denominated form; if both `-heapsize` and `-mem` are present, `-mem` wins.

**`-mem`**
> Sets the hunk memory allocation to `<megabytes>` (`-mem <mb>`, e.g. `-mem 64`). Canonical form; overrides `-heapsize` when both are specified.

**`-minmemory`**
> Sets the hunk allocation to the engine minimum (~5.3 MB); takes no argument. Superseded by any subsequent `-heapsize` or `-mem` on the same command line. Use when testing under minimal memory conditions.

---

### net.c

**`-clientport`**
> Sets the local UDP port the client socket binds to on startup (`-clientport <number>`), overriding the `cl_net_clientport` cvar default (27001). If the requested port is unavailable, a dynamic port is assigned. Use to pin the client to a specific outbound port.

**`-ip`**
> Binds all network sockets to the specified local IP address rather than all interfaces (`-ip <address>`). Affects both UDP and TCP listen sockets (client and server). Default is `INADDR_ANY`.

**`-port`**
> Sets the UDP port the internal server listens on (`-port <number>`), overriding the default of 27500. No effect on the client's outbound socket (see `-clientport`).

---

### pr2_exec.c

**`-progtype`**
> Sets the QuakeC VM interpreter type used by the server (`-progtype <int>`), overriding `sv_progtype`. Valid values: 0 = none/legacy QWC, 1 = native (.so/.dll), 2 = bytecode, 3 = compiled. Out-of-range values silently fall back to 0.

---

### r_palette.c

**`-oldgamma`**
> Switches gamma correction to the legacy palette-baking method, applying `vid_gamma_table` to texture data at load time instead of using the hardware gamma ramp. Distinct from `-nohwgamma`, which disables hardware gamma without activating palette baking.

---

### r_part.c

**`-particles`**
> Sets the maximum number of simultaneously active particles to `<count>` (`-particles <count>`), overriding the `r_particles_count` cvar at startup. Default is 2048; the active particle subsystem clamps to its own range (classic: 512-8192, QMB: 256-32768).

---

### r_texture_load.c

**`-forcetexturereload`**
> Forces textures to reload from disk on every load call, bypassing the in-memory cache check that normally skips re-uploading a texture whose path and dimensions already match.

**`-no24bit`**
> Disables loading of 24-bit (high-resolution) replacement textures (PNG/TGA external files), forcing the engine to use original 8-bit palette textures only. Runtime equivalent: `gl_no24bit` cvar.

---

### rulesets.c

**`-ruleset`**
> Sets the active ruleset at startup by name (`-ruleset <name>`), applied before any config loads. Reliably-working values at HEAD: `smackdown`, `thunderdome`, `mtfl`. Unrecognized values fall back to default.

---

### snd_main.c

**`-nosound`**
> Skips SDL audio initialization entirely, leaving all sound subsystems inactive for the session. Distinct from the `s_nosound` cvar, which allows initialization but suppresses playback at runtime.

---

### sys_posix.c

**`-noconinput`**
> Disables reading console commands from stdin. POSIX/Linux only.

**`-nostdout`**
> Suppresses stdout output on POSIX by setting `sys_nostdout=1` before `Host_Init`. POSIX/Linux only.

---

### vid_common_gl.c

**`-gl_ext`**
> Prints the GL_EXTENSIONS string to the console at startup. Non-Windows/non-Linux only; on modern OpenGL reports `(using modern OpenGL)` instead of the extension list.

**`-nonpot`**
> Disables NPOT (non-power-of-two) texture support, forcing the renderer to treat `GL_ARB_texture_non_power_of_two` as unavailable regardless of hardware capability.

**`-r-no-amd-fix`**
> Disables the ATI/AMD driver workaround that avoids `glBindTextures` and forces `glMultiDrawArrays` in place of `glDrawArrays` on driver version strings containing `.13399` (github bug #416). Forces the standard code paths active regardless of detected GPU vendor.

---

### vid_sdl2.c

**`-display`**
> Selects the monitor index (0-based) for rendering (`-display <index>`). Sets `vid_displaynumber` in fullscreen mode or `vid_win_displaynumber` in windowed mode (when `-window` is also present).

**`-freq`**
> Sets the fullscreen display refresh rate in Hz at startup (`-freq <hz>`), overriding `vid_displayfrequency`. A value of 0 (default) lets the engine auto-select.

**`-glsl-renderer`**
> Forces the GLSL (modern OpenGL) renderer by setting `vid_renderer` to 1 at startup. Only available in builds compiled with `EZ_MULTIPLE_RENDERERS` and `RENDERER_OPTION_MODERN_OPENGL`.

**`-height`**
> Sets the vertical resolution in pixels (`-height <pixels>`). Applies to `vid_height` (fullscreen) or `vid_win_height` (windowed, when `-window` is present). Should be paired with `-width`.

**`-nohwgamma`**
> Disables hardware gamma ramp support. Has no effect under the `mtfl` ruleset, which blocks this override.

**`-nodesktopres`**
> Disables use of the desktop resolution for fullscreen mode, forcing the engine to apply an explicit resolution instead of matching the current desktop size.

**`-startwindowed`**
> Starts ezQuake in windowed (non-fullscreen) mode. Similar to `-window` but does not affect how `-width`, `-height`, or `-display` are routed to cvars.

**`-width`**
> Sets the horizontal resolution in pixels (`-width <pixels>`). Applies to `vid_width` (fullscreen) or `vid_win_width` (windowed, when `-window` is present). Should be paired with `-height`.

**`-window`**
> Starts ezQuake in windowed mode and routes `-width`, `-height`, and `-display` to the windowed resolution cvars (`vid_win_*`) instead of the fullscreen ones. Distinct from `-startwindowed`, which sets windowed mode without affecting cvar routing.

---

## no_doc classifications

These entries are self-documenting given their transparent names and the negation-flag family context. No description needed in `help_cmdline_params.json`.

| Name | Source | Classification | Reason |
|---|---|---|---|
| `-noatlas` | `r_atlas.c` | `self_documenting` | Transparent `-no*` negation name (disable texture atlas); single consumption point in `CachePics_CreateAtlas()`. No `on_change` handler. |
| `-r-novao` | `glc_vao.c` | `self_documenting` | Transparent `-r-no*` negation name (disable VAO) in the Classic renderer; single consumption point in `GLC_InitialiseVAOHandling()`. No `on_change` handler. |

*Note: both entries lack 2+ well-documented siblings (all `-no*` siblings are also undocumented), which is the strict no_doc criterion. These are borderline — the name transparency is high enough that they are unlikely to confuse users, but ciscon may prefer individual descriptions anyway.*

---

## kick_to_ciscon entries

### Dead / never-consumed params (cmdline_params_ids.h)

These four are declared as `CMDLINE_DEF` enums in `cmdline_params_ids.h` but are never consumed by any compiled source file (verified by `grep` across all `src/*.c`). They are likely refactor residue.

**`-noinvlmaps`**
> Was this param intended to disable inverse lightmaps at runtime? `gl_invlightmaps` in `r_lightmaps.c` is set only by `R_UseImmediateOpenGL()`, not by this param. Is the enum safe to remove from `cmdline_params_ids.h` and `help_cmdline_params.json`?

**`-nolibjpeg`**
> Was runtime libjpeg disabling ever wired? `image.c` gates JPEG via the `WITH_JPEG` compile-time guard only; no runtime check for this param exists. Safe to remove?

**`-nolibpng`**
> Same situation as `-nolibjpeg` but for libpng / `WITH_PNG`. Safe to remove?

**`-showliberrors`**
> Zero consumption across all `src/*.c` and no `COM_CheckParm` string match. Likely a planned companion to the nolibjpeg/nolibpng pair that was never implemented. Safe to remove?

### Deleted params (source_file: null)

These two params appear in `help_cmdline_params.json` but their registration and consumption code has been removed from the current build.

**`-nomouse`**
> Was a Linux-only guard in the deleted `in_linux.c` (removed in commit `6d165149`, "Another big purge of platform specific code", 2013). No `COM_CheckParm("-nomouse")` exists in the current source tree. SDL2 `IN_StartupMouse` has no nomouse guard. Should this entry be removed from `help_cmdline_params.json`?

**`-nopriority`**
> The sole `COM_CheckParm("-nopriority")` call is in `sv_sys_win.c`, which is not listed in `CMakeLists.txt` and never compiled. Active Windows client builds control process priority via the `sys_highpriority` cvar and `OnChange_sys_highpriority` only. Should this entry be removed from `help_cmdline_params.json`?

---

## Aggregation notes

- Run date: 2026-05-15
- Queue source: `/tmp/cmdline-queue.json` (56 entries, 22 distinct source files)
- Batch files: `/tmp/audit-batch-cmdline-<source_file>.yaml` (22 files)
- No family_collapse rows: `-no*` flags are not mirror-pair candidates (positive default = feature enabled; no +flag counterpart exists in the queue). No enumeration families were found.
- Medium-confidence entries (`-norjscripts`, `-userdir`): drafted but flagged for ciscon review before upstreaming.
- `no_doc` borderline note: strict criterion requires 2+ documented siblings; neither `-noatlas` nor `-r-novao` meet this. Operator decision required before adding `self_documenting` to `help_json_classifications.yaml`.
