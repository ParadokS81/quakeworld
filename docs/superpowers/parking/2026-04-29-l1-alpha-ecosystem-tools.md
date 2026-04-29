# L1-alpha: Ecosystem-tools registry (2026-04-29)

**Added:** 2026-04-29 (Pass 3 carry-forward from Slipgate Managed Mode brainstorm).
**Pressure:** Medium. None of the four L1 expansion tracks gate Slipgate Managed Mode V1; each shrinks the operator's "other" bucket on a per-track cadence and lands more Layer 1 data via delta-sync to slipgate.

**Methodology (operator's investigative starting principle):**

> Walk the "other" bucket end-to-end. Take every file in operator's Quake directory that slipgate's classifier doesn't recognize, trace each one back to a concrete community source (which tool produced it, where it lives, what it's used for), classify with a stable role, store in oracle with the right table shape, expose via the same loader -> snapshot -> slipgate consumption flow that asset-bundle and maps already use.

This mirrors the closure pattern that worked for asset mapping (Phase 2d-bundle) and map knowledge (Phase 2e-maps): start from operator's empirical evidence, trace each back to source ground-truth, structure into a Layer 1 table, ship the snapshot. Same methodology, new domain.

**Scope (from Pass 3 ratifications doc):**

- Walk operator's "other" bucket end-to-end; classify well-known community tools.
- Initial seed covers qizmo.exe, pakexpl.exe, frikbot.exe, demo-tools, AVI-encoder bundles, server-rcon clients, etc.
- New Layer 1 table type `ecosystem_tools` with curator-authored YAML seeds.
- Loader emits typed records; snapshot to slipgate; classifier consumes; Layer 3 concept-note refs link to user-facing context.

**Implementation shape:** parallel to Phase 2d-bundle and Phase 2e-maps. New extractor handler + seed YAMLs + loader integration + snapshot wiring + slipgate-side classifier consumer.

**Out-of-scope:** engine binaries themselves (covered by L1-beta); engine help-doc files (covered by L1-gamma); files-inside-paks (covered by L1-delta).

**Source for scope and methodology:** `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md` -- "Carry-forwards -- L1 expansion strategy."

---
