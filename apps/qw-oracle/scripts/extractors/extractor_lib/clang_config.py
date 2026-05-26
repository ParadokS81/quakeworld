"""Shared libclang configuration for ezQuake extractors.

Keep CLANG_ARGS, CLANG_ARGS_SERVER, and PARSE_OPTS identical to the values
in the legacy per-entity extractors. If new preprocessor defines are added
upstream, update them in ONE place here.
"""
from __future__ import annotations

import pathlib

from clang.cindex import Config, TranslationUnit

Config.set_library_file("libclang-18.so.1")

# Minimal Windows SDK stub headers for Linux-hosted libclang parsing of
# Windows-specific source files (sys_win.c, vid_win.c, gl_vidnt.c, etc.).
# Append -I{_STUBS_WINDOWS} to any Win-flavored clang_args_*_win_for variant.
_STUBS_WINDOWS = str(
    pathlib.Path(__file__).parent.parent.parent.parent.parent.parent
    / "research" / "stubs" / "windows-sdk"
)


def clang_args_for(ezq_src_dir: str) -> list[str]:
    """Client-variant args. ezq_src_dir is passed in rather than resolved from
    environment so the unified driver can run against arbitrary checkouts
    (historical tags, alternate trees)."""
    return [
        "-x", "c",
        f"-I{ezq_src_dir}",
        "-w",
        "-DWITH_IRC",
        "-DFTE_PEXT2_VOICECHAT",
        "-DMVD_PEXT1_SERVERSIDEWEAPON",
        "-DFTE_PEXT_CHUNKEDDOWNLOADS",
        "-DFTE_PEXT_FLOATCOORDS",
        "-DFTE_PEXT_TRANS",
        "-DFTE_PEXT_COLOURMOD",
        "-DFTE_PEXT_MODELDBL",
        "-DFTE_PEXT_ENTITYDBL",
        "-DFTE_PEXT_256PACKETENTITIES",
        "-DFTE_PEXT_SPAWNSTATIC2",
        "-DMVD_PEXT1_HIGHLAGTELEPORT",
        "-DMVD_PEXT1_HIDDEN_MESSAGES",
        "-DMVD_PEXT1_DEBUG",
        "-DPROTOCOL_VERSION_FTE",
        "-DPROTOCOL_VERSION_FTE2",
        "-DPROTOCOL_VERSION_MVD1",
        "-DUSE_PR2",
        "-DWITH_ZIP",
        "-DWITH_ZLIB",
        "-DWITH_PNG",
        "-DWITH_JPEG",
        "-DWITH_NQPROGS",
        "-DEZ_FREETYPE_SUPPORT",
        "-DEZ_MULTIPLE_RENDERERS",
        "-DJSS_CAM",
        "-DRENDERER_OPTION_CLASSIC_OPENGL",
        "-DRENDERER_OPTION_MODERN_OPENGL",
        "-DRENDERER_OPTION_VULKAN",
        "-DWITH_RENDERING_TRACE",
        "-DWWW_INTEGRATION",
        "-DEXPERIMENTAL_SHOW_ACCELERATION",
        "-DX11_GAMMA_WORKAROUND",
        "-DPARANOID",
        "-DDEBUG_VM",
        "-DDEBUG_MEMORY_ALLOCATIONS",
        "-DWEBSITE_LOGIN_SUPPORT",
    ]


def clang_args_server_for(ezq_src_dir: str) -> list[str]:
    return clang_args_for(ezq_src_dir) + ["-DSERVERONLY", "-DSERVER_ONLY"]


def clang_args_win_for(ezq_src_dir: str) -> list[str]:
    """Client-flavored Windows variant. Surfaces entities behind
    `#ifdef _WIN32` / `#ifdef WIN32` guards: demo_capture_codec,
    con_deadkey, cl_verify_qwprotocol, etc., plus the -nopriority
    cmdline_param in sv_sys_win.c.

    `-U__linux__` undoes the Linux libclang host's automatic
    predefine so guards like `#if !defined(_WIN32) && !defined(__linux__)`
    don't silently exclude Win-only branches.

    `-I{_STUBS_WINDOWS}` supplies minimal Windows SDK stubs so libclang
    can type-check function bodies that reference Windows types."""
    return clang_args_for(ezq_src_dir) + [
        "-DWIN32", "-D_WIN32", "-U__linux__",
        f"-I{_STUBS_WINDOWS}",
    ]


def clang_args_apple_for(ezq_src_dir: str) -> list[str]:
    """Client-flavored macOS variant. Surfaces entities behind
    `#ifdef __APPLE__` guards: in_ignore_deadkeys, etc. The
    keynames handler runs its own Apple parse internally so this
    variant primarily benefits cvars/commands/cmdline handlers.

    `-U__linux__` undoes the Linux libclang host's automatic
    predefine so guards like `#if !defined(_WIN32) && !defined(__linux__)`
    treat the variant as a non-Linux platform."""
    return clang_args_for(ezq_src_dir) + ["-D__APPLE__", "-U__linux__"]


def clang_args_qwcl_for(qwcl_src_dir: str) -> list[str]:
    """Args for the original 1996 QuakeWorld client (research/repos/qwcl-original/QW/client/).

    Pre-tooling C: no FTE protocol extensions, no IRC/PNG/JPEG/zlib feature
    macros, no renderer-option flags. The QWCL build segregates platform-
    specific code into separate translation units (gl_vidnt.c vs
    gl_vidlinux_x11.c, cd_win.c vs cd_linux.c, sys_win.c vs sys_linux.c)
    rather than guarding with #ifdef inside one file, so a single client
    variant suffices — no need for win/apple/server permutations.

    The libclang host's stricmp/isspace pre-C99 implicit-declaration
    diagnostics fire harmlessly on this codebase; PARSE_INCOMPLETE recovers
    past them.

    `-D_WINDOWS` activates the two `#ifdef _WINDOWS` branches in the QWCL
    tree (cl_main.c:1176 `Cmd_AddCommand("windows", CL_Windows_f)` and
    keys.c:21 `#include <windows.h>`). The keys.c include resolves to a
    missing-header diagnostic under Linux libclang; PARSE_INCOMPLETE
    recovers past it without affecting the rest of the TU. Note: QWCL
    used the original QuakeWorld guard `_WINDOWS` (capital W, singular),
    distinct from ezQuake's `_WIN32`.

    `-DGLQUAKE` activates 18 `#ifdef GLQUAKE` branches scattered through
    non-gl_*.c files (e.g. view.c:62 `gl_cshiftpercent`). The QWCL build
    ships two binaries (`qwcl` software vs `glqwcl` GL); we extract from
    the GL flavour because it's the modern reference and all 17 gl_*.c
    TUs already parse unconditionally. The single `#ifndef GLQUAKE` block
    in the tree (view.c:1017) contains no cvar/command/COM_CheckParm
    sites, so the trade is +18 branches active for 0 entity losses.

    Windows-specific fixes required to reach entities in Windows TUs:
    - `-I{_STUBS_WINDOWS}` provides Windows SDK stubs so libclang can
      type-check function bodies (vid_win.c, sys_win.c, gl_vidnt.c).
    - `-D_WIN32 -DWIN32` opens the `#ifdef _WIN32` guard in gl_vidnt.c's
      CheckMultiTextureExtensions which contains `-nomtex`.
    - `-Dbool=int` avoids C99 `bool` type error at vid_win.c line 117
      (`bool useWinDirect = true`) which would corrupt subsequent parsing.
    - `-Duchar=__uint8_t -Dm_int=long` resolve SciTech MGL SDK types used
      in VID_InitMGLFull (vid_win.c:430), preventing COMPOUND_STMT collapse.
    - `-DWINAPI= -DCALLBACK= -DAPIENTRY=` on the command line take precedence
      over the same defines in the stub header, ensuring calling-convention
      macros expand to empty before any prototype is seen by the parser.
    Note: `-starttime` (sys_win.c:356) is inside a `#if 0` dead-code block
    (lines 278-370) and is permanently irrecoverable. `-novbeaf`
    (vid_win.c:408) is inside registerAllDispDrivers whose first MGL call
    disrupts AST structure enough that the inner COMPOUND_STMT has 0
    children; also irrecoverable via libclang."""
    return [
        "-x", "c",
        f"-I{qwcl_src_dir}",
        f"-I{_STUBS_WINDOWS}",
        "-w",
        "-D_WINDOWS",
        "-DGLQUAKE",
        "-D_WIN32",
        "-DWIN32",
        "-Dbool=int",
        "-Duchar=__uint8_t",
        "-Dm_int=long",
        "-DWINAPI=",
        "-DCALLBACK=",
        "-DAPIENTRY=",
    ]


PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)


def _clang_args_fte_base(fte_engine_dir: str, fte_plugin_dirs: list[str]) -> list[str]:
    """Common defines + includes for all FTE variants. Excludes game-type defines
    (HEXEN2/Q2CLIENT/Q3CLIENT/etc) per Phase 2d Option B scope."""
    includes = [fte_engine_dir + "/" + sub for sub in (
        "common", "client", "server", "qclib", "gl", "vk", "sw", "http",
    )]
    includes.extend(fte_plugin_dirs)
    return [
        "-x", "c", "-w",
    ] + [f"-I{p}" for p in includes]


def clang_args_fte_for(fte_repo: str) -> list[str]:
    """FTE client variant: GL renderer, NetQuake + QW protocols, common feature flags.

    Excluded: HEXEN2, Q2CLIENT, Q2SERVER, Q3CLIENT, Q3BSPS, Q2BSPS, VM_Q1 (game-type
    gates per Option B). SWQUAKE, D3DQUAKE excluded (renderer scope). __APPLE__ excluded
    (FTE has 0 Apple-gated cvars verified 2026-04-26).
    """
    engine = f"{fte_repo}/engine"
    plugins = [f"{fte_repo}/plugins/ezhud"]
    return _clang_args_fte_base(engine, plugins) + [
        "-DHAVE_CLIENT", "-DGLQUAKE",
        "-DNQPROT", "-DCSQC_DAT", "-DRTLIGHTS",
        "-DMVD_RECORDING", "-DMULTITHREAD", "-DSUPPORT_ICE", "-DPLUGINS",
    ]


def clang_args_fte_server_for(fte_repo: str) -> list[str]:
    """FTE server variant: SERVERONLY + server-only feature flags."""
    engine = f"{fte_repo}/engine"
    plugins = [f"{fte_repo}/plugins/ezhud"]
    return _clang_args_fte_base(engine, plugins) + [
        "-DHAVE_SERVER", "-DSERVERONLY",
        "-DNQPROT", "-DMVD_RECORDING", "-DQUAKESTATS",
    ]


def clang_args_fte_win_for(fte_repo: str) -> list[str]:
    """FTE Windows-client variant: client defines + Windows platform defines.
    Suppresses __linux__ to reach Win-only code paths (mirrors ezQuake pattern).
    `-I{_STUBS_WINDOWS}` supplies Windows SDK stubs for sys_win.c and friends."""
    return clang_args_fte_for(fte_repo) + [
        "-D_WIN32", "-DWIN32",
        "-U__linux__", "-U__unix__",
        f"-I{_STUBS_WINDOWS}",
        "-DWINAPI=",
        "-DCALLBACK=",
        "-DAPIENTRY=",
    ]


def clang_args_fte_vk_for(fte_repo: str) -> list[str]:
    """FTE Vulkan-renderer client variant: GL undefined, VK defined."""
    base = clang_args_fte_for(fte_repo)
    base = [a for a in base if a != "-DGLQUAKE"]
    return base + ["-DVKQUAKE"]


# ----------------------------------------------------------------------------
# MVDSV (apps/qw-oracle/scripts/extractors/mvdsv/) -- Phase 2e
# Server-only QuakeWorld engine. SERVERONLY is always defined; no
# client/server toggle within MVDSV itself. Three variants: server-base,
# server+Win, server+Linux. CMakeLists.txt-driven flags ON;
# NQPROGS / PARANOID / DEBUG_VM / MVD_PEXT1_DEBUG / experimental flags OFF.
# Protocol-extension bit-shift values (FTE_PEXT_*, MVD_PEXT1_*,
# PROTOCOL_VERSION_FTE*) come from src/qwprot/src/protocol.h via -I, not
# from explicit -D defines.
# ----------------------------------------------------------------------------

_MVDSV_CMAKE_DEFINES: list[str] = [
    # Sourced from research/repos/mvdsv/CMakeLists.txt:169-186
    "-DSERVERONLY",
    "-DUSE_PR2",
    "-DMVD_PEXT1_SERVERSIDEWEAPON",
    "-DMVD_PEXT1_SERVERSIDEWEAPON2",
    "-DFTE_PEXT2_VOICECHAT",
    "-DWWW_INTEGRATION",
]


def clang_args_mvdsv_for(mvdsv_src_dir: str) -> list[str]:
    """Server-base variant: SERVERONLY + CMakeLists flags + protocol.h via -I.

    The qwprot submodule at src/qwprot/src/ provides protocol.h, which
    defines FTE_PEXT_*, MVD_PEXT1_*, and PROTOCOL_VERSION_FTE* bit-shift
    constants. Including via -I lets clang resolve them from the header
    rather than supplying explicit -D defines."""
    qwprot_dir = str(pathlib.Path(mvdsv_src_dir) / "qwprot" / "src")
    return [
        "-x", "c",
        f"-I{mvdsv_src_dir}",
        f"-I{qwprot_dir}",
        "-w",
        *_MVDSV_CMAKE_DEFINES,
    ]


def clang_args_mvdsv_win_for(mvdsv_src_dir: str) -> list[str]:
    """Server+Win variant: server-base plus Windows platform flags. Reuses
    the ezQuake stub Windows SDK headers under research/stubs/windows-sdk/."""
    return clang_args_mvdsv_for(mvdsv_src_dir) + [
        "-D_WIN32",
        "-D_MSC_VER=1900",
        f"-I{_STUBS_WINDOWS}",
    ]


def clang_args_mvdsv_linux_for(mvdsv_src_dir: str) -> list[str]:
    """Server+Linux variant: server-base plus Linux platform flags."""
    return clang_args_mvdsv_for(mvdsv_src_dir) + [
        "-D__linux__",
        "-D__unix__",
    ]


# ---------- KTX (canonical -- https://github.com/QW-Group/ktx) ----------
#
# Pure C; QuakeC mods (dusty-ktx/qcsrc/) are NOT in scope -- canonical KTX
# has none. Single-variant TU parse: only one platform-guard #ifdef exists
# (native_lib.c:14, NO RegisterCvar* inside guarded blocks per Pass 1 spec).
# BOT_SUPPORT=1 is enabled so bot_commands.c's std_commands[] and
# editor_commands[] tables compile (Phase 2 _handler_commands.py target).
#
# KTX's project-wide headers (g_local.h, progs.h, deathtype.h, ...) live
# under <ktx_repo>/include/ -- a SIBLING of <ktx_repo>/src/ (NOT a
# qwprot submodule like MVDSV uses). Verified at canonical 1.46
# (CMakeLists.txt:143 -- target_include_directories(... PRIVATE "include")).
# The Phase 1 lift's #include walk over collect_file_macros relies on this
# -I path so g_local.h's LGCMODE_VARIABLE / TOT_MODE_VARIABLE resolve when
# commands.c is parsed (Phase 3 modes handler dependency). The walk is
# depth-N as of 2026-05-26 -- transitive includes are also reachable.

def clang_args_ktx_for(ktx_src_dir: str) -> list[str]:
    """KTX server-mod variant. ktx_src_dir is the absolute path to
    research/repos/ktx/src; project headers live at the sibling
    research/repos/ktx/include directory.

    Single variant: KTX has no Win / Linux / Apple platform splits. The
    one platform-guard at native_lib.c:14 wraps non-registration code
    only (verified by Pass 1 spike).

    BOT_SUPPORT=1 MUST be defined so bot_commands.c's std_commands[] and
    editor_commands[] (lines 2315 + 2332) are not preprocessed out;
    Phase 2 _handler_commands.py walks both tables. CMakeLists.txt:149
    ships -DBOT_SUPPORT=1 in the canonical build.
    """
    include_dir = str(pathlib.Path(ktx_src_dir).parent / "include")
    return [
        "-x", "c",
        f"-I{ktx_src_dir}",
        f"-I{include_dir}",
        "-w",
        "-DBOT_SUPPORT=1",
    ]
