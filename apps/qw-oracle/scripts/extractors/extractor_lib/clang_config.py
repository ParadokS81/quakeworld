"""Shared libclang configuration for ezQuake extractors.

Keep CLANG_ARGS, CLANG_ARGS_SERVER, and PARSE_OPTS identical to the values
in the legacy per-entity extractors. If new preprocessor defines are added
upstream, update them in ONE place here.
"""
from __future__ import annotations

from clang.cindex import Config, TranslationUnit

Config.set_library_file("libclang-18.so.1")


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
    don't silently exclude Win-only branches."""
    return clang_args_for(ezq_src_dir) + ["-DWIN32", "-D_WIN32", "-U__linux__"]


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
    sites, so the trade is +18 branches active for 0 entity losses."""
    return [
        "-x", "c",
        f"-I{qwcl_src_dir}",
        "-w",
        "-D_WINDOWS",
        "-DGLQUAKE",
    ]


PARSE_OPTS = (
    TranslationUnit.PARSE_DETAILED_PROCESSING_RECORD
    | TranslationUnit.PARSE_INCOMPLETE
)
