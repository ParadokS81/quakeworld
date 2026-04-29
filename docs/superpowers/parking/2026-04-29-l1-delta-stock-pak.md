# L1-delta: Stock asset catalog (2026-04-29)

**Added:** 2026-04-29 (Pass 3 carry-forward from Slipgate Managed Mode brainstorm).
**Pressure:** Medium. None of the four L1 expansion tracks gate Slipgate Managed Mode V1.

**Scope (from Pass 3 ratifications doc):**

New Layer 1 table type `stock_pak_contents`. Per-known-stock-pak listing with semantic roles for files-inside-pak. `id1/pak0.pak` decoded with roles for:

- `end1.bin` (cinematic data)
- `gfx/menu/*` (menu graphics)
- `progs/*.mdl` (model files)
- `sound/*` (sound effects)
- `demo1.dem` / `demo2.dem` / `demo3.dem` (built-in demos)
- `quake.rc` (default config)
- (...full enumeration per pak)

Loader pak-extracts and classifies; emits one entry per file-inside-pak. Slipgate consumes via the same delta-sync surface as asset-roles registry.

**Why this exists:** files-inside-paks are invisible to slipgate's current classifier (which only sees the pak file itself). Operator's "other" bucket likely contains content that came from a manual pak-extract operation; without per-file-inside-pak knowledge, slipgate can't help users understand what those files are.

**Implementation shape:** new extractor that walks known-good stock paks (vanilla 1996, Steam, GoG, nQuake bundle), enumerates contents, classifies per-file via path-pattern rules, stores in `stock_pak_contents`. New table in schema. Loader pipeline addition. Slipgate-side consumer: classifier extension that recognizes "this file matches a known stock-pak content path."

**Source for scope and methodology:** `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md` -- "Carry-forwards -- L1 expansion strategy."
