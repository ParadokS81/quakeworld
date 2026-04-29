# L1-beta: Cross-format binary fingerprinting (2026-04-29)

**Added:** 2026-04-29 (Pass 3 carry-forward from Slipgate Managed Mode brainstorm).
**Pressure:** Medium. None of the four L1 expansion tracks gate Slipgate Managed Mode V1.

**Scope (from Pass 3 ratifications doc):**

Extend Phase 3.5b's PE-fingerprint flow to AppImage / ELF / Mach-O. Same `clients` table; new fingerprint backends per-format.

- AppImage = ELF + squashfs metadata.
- Mach-O has its own version-string conventions.
- ELF `.note` sections often carry build metadata.

**Implementation shape:** new `read_appimage_strings`, `read_elf_strings`, `read_macho_strings` parallels to Phase 3.5b's `read_pe_strings`. Same downstream consumers (slipgate's binary fingerprinter, MyQuake -> Browse classification).

**Why this exists:** the operator's "other" bucket likely contains `fteqw64.exe.db`, `ezquake-x86_64.appimage`, and similar non-PE engine binaries that Phase 3.5b's PE-only flow does not recognize. L1-beta closes that gap.

**Source for scope and methodology:** `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md` -- "Carry-forwards -- L1 expansion strategy."

---
