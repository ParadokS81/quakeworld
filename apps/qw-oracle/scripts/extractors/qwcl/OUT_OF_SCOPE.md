# QWCL Extractor -- Out of Scope

QWCL is the 1996 original QuakeWorld client: single codebase, single version. The corpus is small (364 total entities: 186 cvar / 120 command / 58 cmdline_param). Most extractor capabilities apply directly.

**Last reviewed:** 2026-04-26 (post-stub-headers).
**Extraction total:** 364 entities.

---

## Bucket 1 -- Out of scope by design (source roots not visited)

QWCL has no plugin system. This bucket is empty.

---

## Bucket 2 -- Dynamic registration (unknown, expected small)

QWCL uses `Cvar_RegisterVariable()` for static cvars -- a struct-pointer registration, not a by-name runtime call. No `Cvar_Create` or `Cvar_Get` equivalent found in source. This bucket is expected to be empty or near-empty.

**Fixable?** N/A. If dynamic calls are found in a future source audit, document them here.

**Trigger to revisit:** runtime cvarlist dump from a running QWCL instance surfaces entries absent from the DB. That would indicate either a Bucket 2 hit or a new extraction pattern.

---

## Bucket 3 -- Runtime-synthesized names

No sprintf-built name patterns found in QWCL source. This bucket is empty.

---

## Bucket 4 -- Windows SDK PARSE_INCOMPLETE (2 irrecoverable cases)

Stub headers at `research/stubs/windows-sdk/` landed 2026-04-26 and recovered 9 of 11 previously deferred cmdline_params. Two remain irrecoverable:

**`-novbeaf`** (at `vid_win.c`, inside `registerAllDispDrivers()`):
- The function body uses MGL display-driver types (`MGLDC`, `MGL_createWindowedDC`, driver-table init) that the stub headers don't fully model. libclang's AST recovery is insufficient to reach the `COM_CheckParm` call inside.
- Fix shape: extend `research/stubs/windows-sdk/` with MGL types. Low ROI -- QWCL has a very small audience and this cmdline param is a VBE audio flag that predates modern hardware.
- Trigger to revisit: a user specifically reports `-novbeaf` in their QWCL config and slipgate flags it as unknown.

**`-starttime`** (at `sys_win.c`, inside `#if 0 ... #endif`):
- The `COM_CheckParm` call is inside a dead-code preprocessor block. libclang correctly skips `#if 0` blocks. There is no extraction fix short of a source-level patch upstream (not realistic).
- This is a QWCL source artifact, not an extractor limitation. The flag was intentionally disabled by the original authors.

---

## Cross-references

- Playbook (4-bucket canonical reference): `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` (Known Limits section)
- Stubs: `research/stubs/windows-sdk/`
- Memory: `reference_libclang_ezquake_extraction.md` (WSL setup applies to QWCL too)
