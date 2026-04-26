# Windows SDK Stubs for libclang Extraction

Minimal header stubs that let libclang parse Windows-specific Quake engine source
files on Linux without a real Windows SDK.

## Purpose

The qw-oracle extractor pipeline runs under Linux libclang. Source files like
`sys_win.c`, `vid_win.c`, and `gl_vidnt.c` include `<windows.h>`, `<ddraw.h>`,
`<dsound.h>`, and related headers that do not exist on Linux. Without stubs,
libclang hits a fatal missing-header error early in each TU, producing an
incomplete or empty AST. Critical entities hidden inside Windows-only function
bodies (`-heapsize` in `WinMain`, `-nomtex` in `CheckMultiTextureExtensions`, etc.)
become unreachable.

These stubs provide just enough declarations for libclang's type-checker to stay
functional through Windows-specific function bodies. They are **not** a real SDK
replacement and are never used for compilation or linking.

## Files

| File | Covers |
|---|---|
| `windows.h` | Core types (HWND, HANDLE, DWORD, etc.), structs (MEMORYSTATUS, WNDCLASS, DEVMODE, PIXELFORMATDESCRIPTOR), function prototypes (Win32 API, registry, threads, hooks) |
| `winsock2.h` | Socket types, WSAData, BSD socket function prototypes |
| `mmsystem.h` | Multimedia timer (timeGetTime, timeBeginPeriod), wave audio (WAVEFORMATEX, waveOutOpen), `_LPCWAVEFORMATEX_DEFINED` guard for FTE |
| `ddraw.h` | DirectDraw 1 API (LPDIRECTDRAW, DDSURFACEDESC, DirectDrawCreate) used by QWCL's vid_win.c |
| `dsound.h` | DirectSound types (LPDIRECTSOUND, DSBUFFERDESC, DirectSoundCreate) |
| `d3d.h` | Direct3D 7-era types (transitively included by some ddraw.h chains) |

## Design Decisions

**Opaque void\* for interface pointers.** COM interface pointers (LPDIRECTDRAW,
LPDIRECTSOUND, etc.) are typed as `void*`. The extractor only needs to walk past
their declarations, never call methods on them.

**Minimal struct fields.** Structs have enough fields to avoid "incomplete type"
errors where the engine code takes `sizeof(struct)` or assigns members. Fields
not referenced by any extractor-targeted source file are omitted.

**wchar\_t.** In pure C mode libclang predefines `wchar_t` as an int-sized type.
The stub guards its own `typedef unsigned int wchar_t` with `_WCHAR_T` to avoid
redefinition conflicts.

**Command-line macro override.** Calling-convention macros (`WINAPI`, `CALLBACK`,
`APIENTRY`) are defined as empty in windows.h, but clang_config.py also passes
`-DWINAPI= -DCALLBACK= -DAPIENTRY=` on the command line. Command-line defines
take precedence over header defines, ensuring calling conventions expand to empty
before any prototype is seen by the parser even in TUs that include the stub
indirectly.

## When to Extend

If a new engine port surfaces a missing type that causes a COMPOUND_STMT collapse
(function body has 0 children after all other fixes), add the minimum declaration
here. Do not add fields or types that are not referenced by any extraction target.

Check `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` for the
`_STUBS_WINDOWS` constant and the functions that include it: `clang_args_win_for`
(ezQuake), `clang_args_qwcl_for` (QWCL), and `clang_args_fte_win_for` (FTE).

## Known Limitations

- **`-novbeaf`** (QWCL vid_win.c:408): `registerAllDispDrivers` calls `MGL_registerDriver`
  (SciTech MGL SDK) whose unknown return type disrupts the AST structure of the
  enclosing COMPOUND_STMT. The call at line 399 before the inner `if (useWinDirect)`
  block causes that block's COMPOUND_STMT to have 0 children, making COM_CheckParm
  at line 408 unreachable. Adding more SciTech type stubs does not fix this because
  the disruption is a libclang behavior with partially-resolved function calls,
  not a type-lookup failure.

- **`-starttime`** (QWCL sys_win.c:356): Inside a `#if 0` dead-code block (lines 278-370).
  Irrecoverable by definition.
