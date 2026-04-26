# Quake Dir Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build slipgate-app's "Quake Dir Control" suite — multi-version ezQuake management with portable/installed dual-mode storage and an entity-level diff viewer between any two versions.

**Architecture:** Versioned binaries are warehoused in slipgate's data root using content-addressed storage (`<data-root>/binaries/blobs/<sha256>.exe` for the bytes, `<data-root>/binaries/<client>/<version>/manifest.json` for metadata pointing at the blob). The active binary still lives in the user's quake dir as `ezquake.exe` so slipgate never enters the launch path — uninstall slipgate and the user's setup keeps working. Switching versions copies the chosen blob over the active exe. Backups happen only when the displaced exe is unknown to the warehouse (foreign), since otherwise the warehouse already holds the bytes. The diff viewer reads snapshots widened to include retired entities, and a shared monorepo lib (`packages/qw-version-resolution/`) supplies the version-arithmetic helpers used by both oracle and slipgate. No SQLite on the slipgate side.

**Tech stack:** Tauri v2 + SolidJS + Rust + Bun. Persistence via `tauri-plugin-store` (`profile.json`). Frontend tests use `bun:test` (not vitest). Rust tests use `tempfile` (already a dev-dep). Build tooling: `bun run tauri` for dev, `./scripts/build-portable.sh` post-bundle for the portable .zip.

---

## Critical context for the engineer

Read this section before starting. These gotchas are not optional knowledge.

1. **Rust sync hook is live.** A PostToolUse hook in `.claude/settings.json` rsyncs `apps/slipgate-app/src-tauri/` to a Windows build mirror after every edit. Do not relocate slipgate work to a worktree without updating the hook AND `apps/slipgate-app/scripts/sync-rust.sh`. Stay in the main tree.

2. **Two-step Rust command registration.** Adding a new Tauri command requires:
   - `pub mod <name>;` in `src-tauri/src/commands/mod.rs`
   - The `#[tauri::command]` function listed in `tauri::generate_handler![]` in `src-tauri/src/lib.rs`
   Forgetting either side gives a runtime "command not found" error in the frontend, not a compile error.

3. **No rusqlite in slipgate.** Slipgate is snapshot-only today (`Cargo.toml` confirms). Phase 4 widens the snapshot rather than introducing a SQLite dependency. If a future feature genuinely needs `knowledge.db` direct access, that's a separate architectural decision.

4. **`ezquake.rs` is a 2,124-line monolith.** New ezQuake-related Rust code goes in new modules (`commands/version_warehouse.rs`, `commands/data_root.rs`, etc.), not appended to `ezquake.rs`. Do not grow that file.

5. **Existing updater code is in `commands/updater.rs` (867 lines).** It has `ClientDef`, GitHub release fetching, download+verify+extract, and `backup_exe()`. Phase 2 hooks into it (insert `register_version` between lines 758 and 778); Phase 3 refactors it (deletes its own backup/swap logic, calls `version_swap::swap_active_version` instead). Read lines 507-538 (`backup_exe`) and 661-831 (`download_and_install_update`) before touching it.

6. **Tauri naming convention:** snake_case Rust commands surface as snake_case in `invoke()` calls too — slipgate's frontend calls `invoke("check_for_update")`, not `checkForUpdate`. Match the existing pattern in `src/lib/tauri-commands.ts`.

7. **Bun, not npm.** `bun run`, `bun test`, `bun install`. Frontend tests live in `src/**/*.test.ts(x)` next to the code under test, not in a separate `tests/` dir.

8. **bun:test is not vitest.** Slipgate tests import `{ describe, expect, test } from "bun:test"`. Use `test`, not `it`. No `vi.fn()` API available. This plan structures all wrappers to take `invoke` as a parameter so tests can pass a plain inline function — no mocking framework needed at all.

9. **No hardcoded colors, paths, or URLs in components.** Use DaisyUI classes, module-top constants, or Tauri APIs. ConfigViewer is the existing model.

10. **Profile persistence is silent on errors** (HEALTH.md R4). Don't wrap warehouse-state mutations in `saveProfile()` calls without error surfacing — the warehouse has its own state files (`index.json`, per-version `manifest.json`).

11. **Tauri's `"all"` bundle target does not include a portable Windows .zip.** It produces MSI + NSIS. Portable mode requires a custom build script. Phase 1 covers this.

12. **`read_exe_version` is Windows-only.** `commands/ezquake.rs:1765` is `#[cfg(target_os = "windows")]`; the Linux fallback at line 1823 returns `None`. WSL dev mode cannot read PE versions, so first-run import silently no-ops on Linux. Warehouse smoke-testing of imports has to happen on Windows or with a manually-injected fake version.

13. **Rust tests use tempfile (already a dev-dep).** Per CLAUDE.md ("Automated tests only when the project already has them"), this plan adds Rust tests **only** for the warehouse + version-resolution modules where the logic is sufficiently complex to merit them. `apps/slipgate-app/src-tauri/Cargo.toml` already lists `tempfile = "3"` under `[dev-dependencies]` — no Cargo.toml edit needed for that.

14. **No new heavy Rust deps.** `chrono` is NOT currently in `Cargo.toml`. To avoid pulling it in, manifests store `downloaded_at: u64` (Unix epoch seconds) instead of an ISO 8601 string. `sha2` (already there) covers blob hashing. `semver` (already there) is fine for stable-tag comparisons inside the existing updater logic but is NOT used by the cross-version-string logic in `qw-version-resolution` — that lib handles tags + dated heads + build numbers via a structured kind/value schema.

15. **The screenshot at `/mnt/c/Users/Administrator/Downloads/2026-04-26_14-49.png`** shows the current Updater tab UI. Phases 3 and 5 evolve this surface. Refer to it visually when reasoning about the new layout.

16. **Slipgate's parsed user config is already `Map<string, string>`.** `ParsedConfig.cvars` in `src/lib/config/types.ts:41` is exactly the shape Phase 5's diff-impact code wants. No adapter layer needed — pass `parsedConfig.cvars` directly.

---

## Design decisions

These resolve structural choices made during the second-pass review on 2026-04-26. Each is written as **decision + rationale + which phase implements it**, so the engineer doesn't have to infer the why.

### D1. Top-level warehouse index file

**Decision:** Add `<data-root>/binaries/index.json` with `{ schema_version: 1, active: { ezquake: "3.6.9" }, last_scan: <u64-epoch> }`. The filesystem (per-version manifests + blobs) remains the source of truth; the index serves cheap "what's active for X" lookups and provides a place for future warehouse-level metadata (retention rules, schema migration markers).

**Why:** `list_warehoused_versions` doing a full FS walk on every UI tick is wasteful, and there's nowhere clean to record "active version per client" without re-hashing the canonical exe. The index also makes future schema migrations of the manifest format diagnosable — without it, old manifests parse silently because serde tolerates unknown fields.

**Phase:** 2.

### D2. Hash-based reconcile on launch

**Decision:** On every app launch, after the warehouse loads, hash `<quake-dir>/<canonical_exe>` and look up the sha256 in the warehouse. If found, set that version as active in `index.json`. If not found and the exe exists, prompt to import. If not found and the exe is missing, mark "no active version."

**Why:** The user might manually swap a binary outside slipgate (drop in a custom build, run another updater, restore from a system backup). Without reconcile, slipgate's "active version" pointer drifts from reality silently. Reconcile makes the on-disk exe authoritative — slipgate adapts to whatever it finds.

**Phase:** 2 (alongside the index).

### D3. sha256 is required, not optional

**Decision:** `WarehousedVersion.sha256` is `String`, not `Option<String>`. Every code path that creates a manifest computes and stores it — including `import_existing_install`. Cost: ~50ms on a 5MB exe, one-time per import.

**Why:** sha256 is the join key for D2 (reconcile). It's also the only deduplication signal we have. Skipping it on import is the easiest way to ensure imported versions are forever opaque to the warehouse — that future is worse than 50ms once.

**Phase:** 2.

### D4. Content-addressed storage

**Decision:** Binaries live at `<data-root>/binaries/blobs/<sha256>.exe`. Per-version manifests live at `<data-root>/binaries/<client>/<version>/manifest.json` and reference the blob via a `blob_sha256: String` field. `list_warehoused_versions` walks the per-version directories; `version_swap` reads from the blob path computed via `blobs/<manifest.blob_sha256>.exe`.

**Why:** Same shape as git, OCI, npm cache, every other content store in our toolchain. Buys deduplication for free (two versions with identical bytes share one blob), enables a future "delete unused blobs" garbage collector, and keeps the per-client/per-version dirs small (a manifest is a few hundred bytes). The alternative — bytes inlined in the version dir — is a one-way door: fixing it later means migrating filled-up warehouses on user disks. Doing it now is ~30 lines extra in `register_version`.

**Phase:** 2.

### D5. Version-resolution logic is shared monorepo TypeScript, not pre-resolved snapshots

**Decision:** Create `packages/qw-version-resolution/` — a small TS lib exporting:
- A structured `VersionSpec` type: `{ kind: "tag"; value: string } | { kind: "head"; date: string; commit?: string } | { kind: "build"; number: number; commit?: string }`
- `parseVersionSpec(s: string, displayString: string): VersionSpec`
- `compareVersions(a: VersionSpec, b: VersionSpec): -1 | 0 | 1` — total ordering across kinds (tag < head with later date, build numbers compared, etc.)
- `existsAtVersion(entity: { first_seen_version?: string; last_seen_version?: string }, target: VersionSpec): boolean`
- `defaultAtVersion(entity: { default?: string; default_history?: Array<{ version: string; value: string }> }, target: VersionSpec): string | null`

Both oracle's `build-snapshot.ts` and slipgate's diff viewer import from this lib. Snapshot files do NOT pre-resolve per-version views; they continue to ship `default_history` + `first_seen_version` + `last_seen_version` as today.

**Why:** Pre-resolving per-version views multiplies the snapshot ~14x today (more as we walk more versions and clients). For a workshop-stage project with one snapshot consumer, that's premature. The real concern — "version-arithmetic logic rotting in slipgate alone" — is solved by extracting it into one shared home that every consumer imports. If a future MCP consumer needs version-resolved data, MCP has direct DB access via tools — it doesn't need pre-resolved snapshots either.

**Phase:** 0 (the monorepo lib is built first; Phase 5's diff viewer imports from it).

### D6. Backups happen only for foreign exes

**Decision:** Before swapping in a new version, hash the currently-installed exe. If its sha256 is in the warehouse (we already have those bytes), do not back it up — just delete or rename-and-overwrite. If the sha256 is NOT in the warehouse (foreign exe), rename it to `<stem>.bak.exe` and keep it. Drops the timestamp-suffix hack from `backup_exe`.

**Why:** Backups exist to prevent data loss. If the warehouse already holds the bytes, there's nothing to lose — the exe can be rebuilt from `<data-root>/binaries/blobs/<sha256>.exe` at any time. Backing up a known binary just produces clutter and burns disk. Foreign exes (user dropped in something we've never seen) are the only case where the .bak file does work.

**Phase:** 3.

### D7. Single swap path; updater refactors to use it

**Decision:** Phase 2 inserts `register_version` into `download_and_install_update` between lines 758 and 778 (the exe is at `.slipgate-update-exe.tmp`, before any quake-dir mutation), keeping the existing backup/install logic intact for that phase. Phase 3 then **deletes** the existing stages 5-7 of `download_and_install_update` (backup_exe call, rename to canonical) and replaces them with a single `version_swap::swap_active_version` call. After Phase 3 ships, there is exactly one swap implementation.

**Why:** The original plan had Phase 2 leave the old swap intact and Phase 3 add a new swap module without explicitly retiring the old one — risk of two swap paths drifting forever. The refactor is small (delete ~30 lines, add 1 call) and pays back permanently.

**Phase:** 3.

### D8. Transactional swap shape is already in the existing code

**Decision:** The existing `download_and_install_update` flow is already 3-stage: extract to `<exe_dir>/.slipgate-update-exe.tmp` → backup current → rename `.tmp` → canonical. POSIX rename is atomic, so the swap is already crash-safe in the happy case. Phase 3's `swap_active_version` preserves this exact shape, plus it cleans up the partial-rollback gap at line 801 (existing code restores the backup on failure but leaves the .tmp lying around).

**Why:** The "transactional swap" concern from the second-pass review (item K) was looking for a gap that's mostly already solved. Just preserve the shape and tighten the rollback.

**Phase:** 3.

### D9. Out of scope

The "share my versioned setup across machines" use case (cross-machine config sharing keyed by sha256) is captured but explicitly NOT in this plan. Belongs to the slipgate web-services vision arc, surfaces as a future feature that benefits from D3 (required sha256) and D4 (content-addressed blobs) being in place — those decisions buy optionality without committing to the feature.

---

## File-structure preview

**New monorepo package** (Phase 0):
- `packages/qw-version-resolution/package.json`
- `packages/qw-version-resolution/src/index.ts`
- `packages/qw-version-resolution/src/version-spec.ts`
- `packages/qw-version-resolution/src/compare.ts`
- `packages/qw-version-resolution/src/resolve.ts`
- `packages/qw-version-resolution/src/*.test.ts`
- `packages/qw-version-resolution/tsconfig.json`

**New Rust modules** (Phase 1-3):
- `src-tauri/src/commands/data_root.rs` — portable/installed detection, paths
- `src-tauri/src/commands/version_warehouse.rs` — list, register, scan, import; manages `index.json`, `manifest.json`, blobs
- `src-tauri/src/commands/version_swap.rs` — copy from blob to user's quake dir, foreign-exe backup logic
- `src-tauri/src/commands/warehouse_reconcile.rs` — hash-based active-version reconcile on launch

**Modified Rust files**:
- `src-tauri/src/commands/mod.rs` — register new modules
- `src-tauri/src/lib.rs` — register new Tauri commands
- `src-tauri/src/commands/updater.rs` — Phase 2 inserts `register_version` call; Phase 3 deletes own backup/swap logic, calls `version_swap`

**New SolidJS files** (Phase 1-5):
- `src/lib/quake-dir/dataRoot.ts` (+ test)
- `src/lib/quake-dir/warehouse.ts` (+ test)
- `src/lib/quake-dir/swap.ts` (+ test)
- `src/lib/quake-dir/firstRunImport.ts` (+ test)
- `src/lib/quake-dir/invoke-types.ts` — single shared `InvokeFn` type
- `src/components/VersionWarehouse.tsx`
- `src/components/VersionDiffViewer.tsx`
- `src/lib/version-diff/computeDiff.ts` (+ test) — slipgate-side composition over the shared lib

**Modified SolidJS files**:
- `src/components/ClientsTab.tsx` — host the new VersionWarehouse + diff viewer; layout planned once across phases (not incrementally appended)
- `src/lib/config/loaders/ezquake.ts` — extend `RawVar` with enrichment fields; add `loadEzQuakeCvarsWithEnrichment()`
- `src/App.tsx` (or whatever bootstraps the app) — wire reconcile + first-run import

**Oracle (Phase 0 + 4)**:
- `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts` — emit retired entities for cvar/command/macro/cmdline_param via secondary fetch keyed on `last_seen_version`; import version helpers from `qw-version-resolution`
- `apps/qw-oracle/docs/entity-types.md` — document the widened snapshot shape

**Build/CI**:
- `apps/slipgate-app/scripts/build-portable.sh` — package portable .zip after `bun run tauri build`
- `apps/slipgate-app/docs/DEVELOPMENT.md` — portable build steps

**Documentation**:
- `apps/slipgate-app/docs/QUAKE-DIR-CONTROL.md` — architectural reference for this subsystem (created stub-style in Phase 1, fully filled in Phase 5; absorbs the design-decisions content from this plan as the durable home)

---

## Phase 0: Shared version-resolution lib

**Sessions:** 1 (~2 hours)
**Goal:** A typed monorepo TypeScript package both oracle and slipgate import for version arithmetic. Resolves D5 + locks in the structured version schema (item F from review).

### Task 0.1: Set up the package skeleton

**Files:**
- Create: `packages/qw-version-resolution/package.json`
- Create: `packages/qw-version-resolution/tsconfig.json`
- Create: `packages/qw-version-resolution/src/index.ts`
- Verify: `package.json` (root) workspaces array

- [ ] **Step 0: Confirm root workspaces glob covers `packages/*`**

```bash
cat /home/paradoks/projects/quakeworld/package.json
```

Today's root `package.json` has `"workspaces": ["apps/*", "packages/*"]`, so a new `packages/qw-version-resolution/` is picked up automatically by `bun install`. If a future restructure narrows the glob, this task gains a Step where the new package is added explicitly. Verify before continuing.

- [ ] **Step 1: Create the package**

```json
// packages/qw-version-resolution/package.json
{
  "name": "@qw/version-resolution",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "bun test",
    "typecheck": "bunx tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "~5.6.2"
  }
}
```

```json
// packages/qw-version-resolution/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

```typescript
// packages/qw-version-resolution/src/index.ts
export * from "./version-spec";
export * from "./compare";
export * from "./resolve";
```

- [ ] **Step 2: Verify it loads**

```bash
cd packages/qw-version-resolution && bun install && bunx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/qw-version-resolution/
git commit -m "feat(qw-version-resolution): package skeleton"
```

### Task 0.2: VersionSpec parsing

**Files:**
- Create: `packages/qw-version-resolution/src/version-spec.ts`
- Create: `packages/qw-version-resolution/src/version-spec.test.ts`

- [ ] **Step 1: Write the test first**

```typescript
// version-spec.test.ts
import { describe, expect, test } from "bun:test";
import { parseVersionSpec } from "./version-spec";

describe("parseVersionSpec", () => {
  test("parses semver tags", () => {
    expect(parseVersionSpec("3.6.9")).toEqual({
      kind: "tag",
      value: "3.6.9",
      display: "3.6.9",
    });
  });

  test("parses dated head strings", () => {
    expect(parseVersionSpec("head-2026-04-25")).toEqual({
      kind: "head",
      date: "2026-04-25",
      display: "head-2026-04-25",
    });
  });

  test("parses build-number strings", () => {
    expect(parseVersionSpec("build-6698")).toEqual({
      kind: "build",
      number: 6698,
      display: "build-6698",
    });
  });

  test("falls back to tag for unrecognized shapes", () => {
    expect(parseVersionSpec("weirdo")).toEqual({
      kind: "tag",
      value: "weirdo",
      display: "weirdo",
    });
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
cd packages/qw-version-resolution && bun test
```

- [ ] **Step 3: Implement**

```typescript
// version-spec.ts
export type VersionSpec =
  | { kind: "tag"; value: string; display: string }
  | { kind: "head"; date: string; commit?: string; display: string }
  | { kind: "build"; number: number; commit?: string; display: string };

const HEAD_RE = /^head-(\d{4}-\d{2}-\d{2})$/;
const BUILD_RE = /^build-(\d+)$/;

export function parseVersionSpec(s: string): VersionSpec {
  const head = HEAD_RE.exec(s);
  if (head) return { kind: "head", date: head[1], display: s };
  const build = BUILD_RE.exec(s);
  if (build) return { kind: "build", number: Number(build[1]), display: s };
  return { kind: "tag", value: s, display: s };
}
```

- [ ] **Step 4: Run, expect pass; commit**

```bash
bun test
git add packages/qw-version-resolution/src/version-spec.ts \
        packages/qw-version-resolution/src/version-spec.test.ts
git commit -m "feat(qw-version-resolution): parse VersionSpec from strings"
```

### Task 0.3: compareVersions

**Files:**
- Create: `packages/qw-version-resolution/src/compare.ts`
- Create: `packages/qw-version-resolution/src/compare.test.ts`

Total ordering rules (encoded once, consumed everywhere). These rules are subtle enough that the lib's `compare.ts` opens with a doc-comment stating them verbatim — code review checks the rules against the implementation, not the plan.

- **Two `tag` versions:** compare numeric components left-to-right (so `3.6.9` < `3.6.10`). Non-numeric tail in either component breaks the numeric compare; remaining components fall back to string compare. Project assumption: tags are dotted-numeric; if a tag like `3.7.0-rc1` ever shows up, the prerelease tail is treated as smaller than the release.
- **Two `head` versions:** compare by ISO date string (lexicographic compare suffices for `YYYY-MM-DD`).
- **Two `build` versions:** compare by `number` (FTE-style monotonically-increasing build numbers).
- **`tag` vs `head`:** `tag < head`. A `head-*` snapshot is always taken from a working tree later than any released tag on the same project, by construction (snapshots come from main/HEAD after the most recent tag).
- **`tag` vs `build`:** `tag < build`. Build numbers are post-release artifacts produced by FTE's CI on top of a tagged base; any build is later than the most recent tag it built from.
- **`head` vs `build`:** **mutually unordered (returns 0)**. They live in different ecosystems (heads are ezQuake-style date-tagged main snapshots; builds are FTE-style numbered CI artifacts). Real comparisons happen within one project, so the diff viewer never crosses kinds — but if it ever does, returning 0 means "treated as equal for ordering purposes" rather than producing a misleading lie. Callers that need cross-kind ordering must supply their own rule (commit timestamps, etc.) — not this lib's job.

The implementation must mirror this list as a doc-comment so future maintainers see the rules attached to the code, not buried in a plan file.

- [ ] **Step 1: Test**

```typescript
// compare.test.ts
import { describe, expect, test } from "bun:test";
import { parseVersionSpec } from "./version-spec";
import { compareVersions } from "./compare";

const v = parseVersionSpec;

describe("compareVersions", () => {
  test("orders semver tags numerically", () => {
    expect(compareVersions(v("3.6.9"), v("3.6.10"))).toBe(-1);
    expect(compareVersions(v("3.7.0"), v("3.6.9"))).toBe(1);
    expect(compareVersions(v("3.6.9"), v("3.6.9"))).toBe(0);
  });

  test("orders dated heads by date", () => {
    expect(compareVersions(v("head-2026-04-25"), v("head-2026-04-26"))).toBe(-1);
  });

  test("tag < head", () => {
    expect(compareVersions(v("3.6.9"), v("head-2026-04-25"))).toBe(-1);
    expect(compareVersions(v("head-2026-04-25"), v("3.6.9"))).toBe(1);
  });

  test("orders build numbers", () => {
    expect(compareVersions(v("build-6697"), v("build-6698"))).toBe(-1);
  });

  test("head vs build is unordered (returns 0)", () => {
    expect(compareVersions(v("head-2026-04-25"), v("build-6698"))).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

```typescript
// compare.ts
//
// Total ordering rules across VersionSpec kinds. Mirror these in any future
// refactor — they are the contract this lib promises consumers.
//
//   tag  vs tag : compare numeric components left-to-right (3.6.9 < 3.6.10).
//                 Non-numeric tail (e.g. "3.7.0-rc1") sorts below a clean tag.
//   head vs head: lexicographic compare of YYYY-MM-DD date suffix.
//   build vs build: numeric compare of build number.
//   tag  vs head : tag < head (heads come from working trees after the latest tag).
//   tag  vs build: tag < build (builds are post-release CI artifacts).
//   head vs build: UNORDERED — return 0. Heads (ezQuake-style) and builds
//                  (FTE-style) live in different project ecosystems; consumers
//                  that need cross-kind ordering must supply their own rule.
//
// All real diff-viewer compares happen within one project, so head-vs-build
// never gets called in practice. Returning 0 keeps the function total without
// producing a misleading lie.
import type { VersionSpec } from "./version-spec";

function parseSemver(s: string): number[] {
  return s.split(".").map((p) => Number(p.replace(/[^\d].*$/, "")) || 0);
}

export function compareVersions(a: VersionSpec, b: VersionSpec): -1 | 0 | 1 {
  if (a.kind === "tag" && b.kind === "tag") {
    const an = parseSemver(a.value);
    const bn = parseSemver(b.value);
    for (let i = 0; i < Math.max(an.length, bn.length); i++) {
      const x = an[i] ?? 0;
      const y = bn[i] ?? 0;
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  }
  if (a.kind === "head" && b.kind === "head") {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  }
  if (a.kind === "build" && b.kind === "build") {
    return a.number < b.number ? -1 : a.number > b.number ? 1 : 0;
  }
  if (a.kind === "tag" && (b.kind === "head" || b.kind === "build")) return -1;
  if ((a.kind === "head" || a.kind === "build") && b.kind === "tag") return 1;
  return 0; // head vs build: unordered
}
```

- [ ] **Step 4: Run, expect pass; commit**

```bash
git add packages/qw-version-resolution/src/compare.ts \
        packages/qw-version-resolution/src/compare.test.ts
git commit -m "feat(qw-version-resolution): compareVersions with cross-kind rules"
```

### Task 0.4: existsAtVersion + defaultAtVersion

**Files:**
- Create: `packages/qw-version-resolution/src/resolve.ts`
- Create: `packages/qw-version-resolution/src/resolve.test.ts`

- [ ] **Step 1: Test**

```typescript
// resolve.test.ts
import { describe, expect, test } from "bun:test";
import { parseVersionSpec } from "./version-spec";
import { existsAtVersion, defaultAtVersion } from "./resolve";

describe("existsAtVersion", () => {
  test("entity is alive when first <= target <= last", () => {
    const e = { first_seen_version: "3.6.0", last_seen_version: "3.6.9" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.5"))).toBe(true);
  });

  test("entity is absent before first_seen_version", () => {
    const e = { first_seen_version: "3.6.5" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.0"))).toBe(false);
  });

  test("entity is absent after last_seen_version", () => {
    const e = { first_seen_version: "3.0.0", last_seen_version: "3.6.2" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.5"))).toBe(false);
  });

  test("missing both bounds is treated as 'unknown coverage' = false", () => {
    expect(existsAtVersion({}, parseVersionSpec("3.6.5"))).toBe(false);
  });
});

describe("defaultAtVersion", () => {
  test("walks default_history backward to find effective default", () => {
    const e = {
      default: "1",
      default_history: [
        { version: "3.6.0", value: "0" },
        { version: "3.7.0", value: "1" },
      ],
    };
    expect(defaultAtVersion(e, parseVersionSpec("3.6.9"))).toBe("0");
    expect(defaultAtVersion(e, parseVersionSpec("3.7.0"))).toBe("1");
  });

  test("falls back to top-level default when no history", () => {
    expect(defaultAtVersion({ default: "5" }, parseVersionSpec("3.6.9"))).toBe("5");
  });

  test("returns null when no default known", () => {
    expect(defaultAtVersion({}, parseVersionSpec("3.6.9"))).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect fail; implement; run, expect pass**

```typescript
// resolve.ts
import type { VersionSpec } from "./version-spec";
import { parseVersionSpec } from "./version-spec";
import { compareVersions } from "./compare";

export interface VersionedEntity {
  first_seen_version?: string;
  last_seen_version?: string;
  default?: string;
  default_history?: Array<{ version: string; value: string }>;
}

export function existsAtVersion(e: VersionedEntity, target: VersionSpec): boolean {
  if (!e.first_seen_version) return false;
  const first = parseVersionSpec(e.first_seen_version);
  if (compareVersions(target, first) < 0) return false;
  if (e.last_seen_version) {
    const last = parseVersionSpec(e.last_seen_version);
    if (compareVersions(target, last) > 0) return false;
  }
  return true;
}

export function defaultAtVersion(e: VersionedEntity, target: VersionSpec): string | null {
  if (e.default_history && e.default_history.length > 0) {
    let effective: string | null = null;
    for (const entry of e.default_history) {
      const entryV = parseVersionSpec(entry.version);
      if (compareVersions(entryV, target) <= 0) effective = entry.value;
      else break;
    }
    if (effective !== null) return effective;
  }
  return e.default ?? null;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/qw-version-resolution/src/resolve.ts \
        packages/qw-version-resolution/src/resolve.test.ts
git commit -m "feat(qw-version-resolution): existsAtVersion + defaultAtVersion"
```

### Task 0.5: Hook the package into both consumers

- [ ] **Step 1: Add as a workspace dep in slipgate**

In `apps/slipgate-app/package.json`, add to `dependencies`:

```json
"@qw/version-resolution": "workspace:*"
```

- [ ] **Step 2: Same for oracle**

In `apps/qw-oracle/package.json`, add to `dependencies`:

```json
"@qw/version-resolution": "workspace:*"
```

- [ ] **Step 3: Confirm root workspace recognizes the package**

Check the root `package.json` workspaces array — `packages/*` should already be covered. If not, add it.

- [ ] **Step 4: Install + smoke-import**

```bash
cd /home/paradoks/projects/quakeworld && bun install
cd apps/slipgate-app && bunx tsc --noEmit
cd ../qw-oracle && npm --no-workspaces run typecheck
```

Expected: all clean. The lib is now resolvable but unused.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/package.json apps/qw-oracle/package.json package.json bun.lockb
git commit -m "chore: wire @qw/version-resolution into slipgate and qw-oracle"
```

**Phase 0 complete.** The shared lib exists, both apps can import from it. No behavior change yet — Phase 4 and 5 wire it in.

---

## Phase 1: Storage abstraction + portable-mode build

**Sessions:** 1 (~3 hours including portable build verification)
**Goal:** A single `getDataRoot()` Rust function that returns the right path in both installed and portable modes, plus a build script that produces a portable .zip artifact alongside the MSI.

### Task 1.1: Create the data-root Rust module

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/data_root.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs` (add `pub mod data_root;`)
- Modify: `apps/slipgate-app/src-tauri/src/lib.rs` (register `get_data_root` in `tauri::generate_handler![]`)

- [ ] **Step 1: Create the data_root module**

```rust
// apps/slipgate-app/src-tauri/src/commands/data_root.rs
use std::path::PathBuf;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct DataRootInfo {
    pub path: String,
    pub mode: DataRootMode,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DataRootMode {
    Portable,
    Installed,
}

#[tauri::command]
pub fn get_data_root(app: tauri::AppHandle) -> Result<DataRootInfo, String> {
    resolve_data_root(&app).map_err(|e| e.to_string())
}

fn resolve_data_root(app: &tauri::AppHandle) -> Result<DataRootInfo, std::io::Error> {
    let exe_dir = std::env::current_exe()?
        .parent()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::Other, "no exe dir"))?
        .to_path_buf();

    let portable_marker = exe_dir.join("data").join("portable.flag");
    if portable_marker.exists() {
        let portable_root = exe_dir.join("data");
        std::fs::create_dir_all(&portable_root)?;
        return Ok(DataRootInfo {
            path: portable_root.to_string_lossy().into_owned(),
            mode: DataRootMode::Portable,
        });
    }

    let installed_root = app.path()
        .app_data_dir()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    std::fs::create_dir_all(&installed_root)?;

    Ok(DataRootInfo {
        path: installed_root.to_string_lossy().into_owned(),
        mode: DataRootMode::Installed,
    })
}

pub fn data_root_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    resolve_data_root(app)
        .map(|info| PathBuf::from(info.path))
        .map_err(|e| e.to_string())
}
```

`portable.flag` is an empty marker file. Plain text marker is intentional — JSON would invite future "what's IN the flag?" creep; the file's mere existence is the contract.

- [ ] **Step 2: Register the module**

Edit `apps/slipgate-app/src-tauri/src/commands/mod.rs` — add `pub mod data_root;`.

Edit `apps/slipgate-app/src-tauri/src/lib.rs` — find the `tauri::generate_handler![]` macro and add `commands::data_root::get_data_root`.

- [ ] **Step 3: Verify Rust compiles**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/data_root.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): add data_root command for portable/installed detection"
```

### Task 1.2: Shared Invoker type + dataRoot wrapper

The `InvokeFn` type used across all wrappers in Phases 1-3 lives in one place to avoid duplicating the primitive (item J from review).

**Files:**
- Create: `apps/slipgate-app/src/lib/quake-dir/invoke-types.ts`
- Create: `apps/slipgate-app/src/lib/quake-dir/dataRoot.ts`
- Create: `apps/slipgate-app/src/lib/quake-dir/dataRoot.test.ts`

- [ ] **Step 1: Shared invoke type**

```typescript
// apps/slipgate-app/src/lib/quake-dir/invoke-types.ts
export type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
```

This matches the signature of `@tauri-apps/api/core`'s `invoke`. All wrappers in this subsystem accept it as a parameter so tests pass plain inline functions — no mock framework needed.

- [ ] **Step 2: Test the wrapper (bun:test syntax)**

```typescript
// dataRoot.test.ts
import { describe, expect, test } from "bun:test";
import { getDataRoot } from "./dataRoot";

describe("getDataRoot", () => {
  test("returns the structured info from the Tauri command", async () => {
    let receivedCmd = "";
    const invoke = async (cmd: string) => {
      receivedCmd = cmd;
      return { path: "/fake/appdata", mode: "installed" } as any;
    };
    const result = await getDataRoot(invoke);
    expect(result).toEqual({ path: "/fake/appdata", mode: "installed" });
    expect(receivedCmd).toBe("get_data_root");
  });

  test("propagates errors from the Tauri command", async () => {
    const invoke = async () => {
      throw "permission denied";
    };
    expect(getDataRoot(invoke as any)).rejects.toBe("permission denied");
  });
});
```

- [ ] **Step 3: Run, expect fail**

```bash
cd apps/slipgate-app && bun test src/lib/quake-dir/dataRoot.test.ts
```

- [ ] **Step 4: Implement**

```typescript
// dataRoot.ts
import type { InvokeFn } from "./invoke-types";

export type DataRootMode = "portable" | "installed";

export interface DataRootInfo {
  path: string;
  mode: DataRootMode;
}

export async function getDataRoot(invoke: InvokeFn): Promise<DataRootInfo> {
  return invoke<DataRootInfo>("get_data_root");
}
```

- [ ] **Step 5: Run, expect pass; commit**

```bash
bun test src/lib/quake-dir/dataRoot.test.ts
git add apps/slipgate-app/src/lib/quake-dir/invoke-types.ts \
        apps/slipgate-app/src/lib/quake-dir/dataRoot.ts \
        apps/slipgate-app/src/lib/quake-dir/dataRoot.test.ts
git commit -m "feat(slipgate): shared InvokeFn type + dataRoot wrapper"
```

### Task 1.3: Manual verification of installed-mode

Pure manual check.

- [ ] **Step 1: Run dev mode**

```bash
cd apps/slipgate-app && bun run tauri dev
```

- [ ] **Step 2: Devtools call**

```javascript
const { invoke } = window.__TAURI__.core;
await invoke("get_data_root");
```

Expected (Windows): `{ path: "C:\\Users\\<you>\\AppData\\Roaming\\com.slipgate.app", mode: "installed" }`
Expected (WSL/Linux): `{ path: "/home/<you>/.local/share/com.slipgate.app", mode: "installed" }`

Confirm the path exists on disk after the call.

### Task 1.4: Build the portable artifact script

**Files:**
- Create: `apps/slipgate-app/scripts/build-portable.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# apps/slipgate-app/scripts/build-portable.sh
# Builds a portable Windows .zip from the unbundled tauri output.
# Run after `bun run tauri build` produces the standard MSI/NSIS bundles.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$ROOT/src-tauri/target/release"
PORTABLE_NAME="slipgate-portable"
WORK_DIR="$(mktemp -d)"
PORTABLE_DIR="$WORK_DIR/$PORTABLE_NAME"

EXE_PATH=""
for cand in "$RELEASE_DIR/slipgate.exe" "$RELEASE_DIR/slipgate-app.exe"; do
  if [ -f "$cand" ]; then EXE_PATH="$cand"; break; fi
done

if [ -z "$EXE_PATH" ]; then
  echo "Error: no slipgate exe in $RELEASE_DIR. Run 'bun run tauri build' first." >&2
  exit 1
fi

mkdir -p "$PORTABLE_DIR/data"
cp "$EXE_PATH" "$PORTABLE_DIR/"
touch "$PORTABLE_DIR/data/portable.flag"

VERSION="$(grep '^version' "$ROOT/src-tauri/Cargo.toml" | head -1 | sed -E 's/version = "(.+)"/\1/')"
OUTPUT="$RELEASE_DIR/${PORTABLE_NAME}-${VERSION}.zip"

cd "$WORK_DIR" && zip -r "$OUTPUT" "$PORTABLE_NAME" >/dev/null
rm -rf "$WORK_DIR"

echo "Portable build: $OUTPUT"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x apps/slipgate-app/scripts/build-portable.sh
```

- [ ] **Step 3: Document in DEVELOPMENT.md**

Add a section to `apps/slipgate-app/docs/DEVELOPMENT.md` titled "Building the portable artifact":

```markdown
## Building the portable artifact

Slipgate ships in two modes detected via an adjacent `data/portable.flag` marker.

```bash
bun run tauri build
./scripts/build-portable.sh
```

The first command produces the standard MSI/NSIS bundles; the second produces a sibling `slipgate-portable-<version>.zip` containing `slipgate.exe` + `data/portable.flag`. Extracting the zip anywhere yields a portable install whose data root is the adjacent `data/` directory.
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/scripts/build-portable.sh \
        apps/slipgate-app/docs/DEVELOPMENT.md
git commit -m "feat(slipgate): build-portable.sh + docs for dual-mode artifacts"
```

### Task 1.5: Stub QUAKE-DIR-CONTROL.md

Cannot run the portable smoke from WSL — defer to Windows. Capture the protocol now.

- [ ] **Step 1: Create the stub**

```markdown
# Quake Dir Control

Slipgate's multi-version client management subsystem. See plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md`.

## Portable vs installed mode

Slipgate detects mode at startup by checking for an adjacent `data/portable.flag` file:

- **Installed**: data root is `%APPDATA%/com.slipgate.app/` (or platform equivalent).
- **Portable**: data root is `<exe-dir>/data/`.

### Smoke-test protocol (Windows-only)

1. Build: `bun run tauri build && ./scripts/build-portable.sh`
2. Test installed: install the MSI, launch, devtools-call `invoke("get_data_root")`, confirm `mode: "installed"` and the AppData path.
3. Test portable: extract the portable .zip to `D:\Test\`, launch `D:\Test\slipgate-portable\slipgate.exe`, devtools-call `invoke("get_data_root")`, confirm `mode: "portable"` and `path` ending in `D:\Test\slipgate-portable\data`.
4. Side-by-side: confirm AppData state and portable state are independent (set a profile field in one, confirm the other doesn't see it).
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/docs/QUAKE-DIR-CONTROL.md
git commit -m "docs(slipgate): seed QUAKE-DIR-CONTROL.md with portable smoke protocol"
```

**Phase 1 complete.** Slipgate has a single `getDataRoot()` source of truth, the frontend can call it, and the build pipeline knows how to produce a portable artifact.

---

## Phase 2: Version warehouse with content-addressed blobs + index + reconcile

**Sessions:** 1-2 (~4-5 hours)
**Goal:** Content-addressed warehouse under `<data-root>/binaries/`, top-level `index.json`, hash-based reconcile on launch, updater hooks register downloads, first-run import for pre-existing installs.

### Task 2.1: Warehouse module with blobs + manifests + index

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`
- Modify: `apps/slipgate-app/src-tauri/src/lib.rs`

The module exposes:
- Pure helpers (`warehouse_root_at`, `register_version_at`, `list_warehoused_versions_at`, `read_index_at`, `write_index_at`) keyed on a `data_root: &Path` for testability.
- Tauri-aware wrappers (`list_warehoused_versions`, `import_existing_install`) that resolve `data_root_path(app)?` and delegate.
- Internal helpers (`register_version`) for cross-module calls (updater.rs).

- [ ] **Step 1: Write the module**

```rust
// apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs
use std::fs;
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use serde::{Serialize, Deserialize};
use crate::commands::data_root::data_root_path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WarehousedVersion {
    pub client: String,           // "ezquake", "ktx", "mvdsv", "qwfwd"
    pub version: String,          // "3.6.9", "head-2026-04-25", "build-6698"
    pub channel: String,          // "stable", "snapshot", "imported"
    pub blob_sha256: String,      // points into <data-root>/binaries/blobs/<sha256>.exe
    pub original_exe_name: String,// "ezquake.exe" — name as-extracted, used as canonical default
    pub size_bytes: u64,
    pub downloaded_at: u64,       // Unix epoch seconds (no chrono dep)
    pub source: String,           // "github_release", "user_import", "snapshot"
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WarehouseIndex {
    pub schema_version: u32,
    pub active: std::collections::HashMap<String, String>, // client -> version
    pub last_scan: u64,
}

const SCHEMA_VERSION: u32 = 1;

pub fn warehouse_root_at(data_root: &Path) -> PathBuf {
    data_root.join("binaries")
}

pub fn blobs_dir_at(data_root: &Path) -> PathBuf {
    warehouse_root_at(data_root).join("blobs")
}

pub fn version_dir_at(data_root: &Path, client: &str, version: &str) -> PathBuf {
    warehouse_root_at(data_root).join(client).join(version)
}

pub fn index_path_at(data_root: &Path) -> PathBuf {
    warehouse_root_at(data_root).join("index.json")
}

fn now_epoch_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn hash_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("read failed for hashing: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

pub fn read_index_at(data_root: &Path) -> WarehouseIndex {
    let path = index_path_at(data_root);
    if !path.exists() {
        return WarehouseIndex { schema_version: SCHEMA_VERSION, ..Default::default() };
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| WarehouseIndex { schema_version: SCHEMA_VERSION, ..Default::default() })
}

pub fn write_index_at(data_root: &Path, idx: &WarehouseIndex) -> Result<(), String> {
    let path = index_path_at(data_root);
    if let Some(parent) = path.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    fs::write(&path, serde_json::to_string_pretty(idx).map_err(|e| e.to_string())?)
        .map_err(|e| format!("write index failed: {}", e))
}

pub fn register_version_at(
    data_root: &Path,
    client: &str,
    version: &str,
    src_exe: &Path,
    channel: &str,
    source: &str,
) -> Result<WarehousedVersion, String> {
    let sha = hash_file(src_exe)?;

    // Write blob (idempotent — if it exists, trust it).
    let blobs_dir = blobs_dir_at(data_root);
    fs::create_dir_all(&blobs_dir).map_err(|e| e.to_string())?;
    let blob_path = blobs_dir.join(format!("{}.exe", &sha));
    if !blob_path.exists() {
        fs::copy(src_exe, &blob_path).map_err(|e| format!("blob write failed: {}", e))?;
    }

    // Write per-version manifest.
    let dir = version_dir_at(data_root, client, version);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let original_exe_name = src_exe.file_name()
        .ok_or("source exe has no filename")?
        .to_string_lossy()
        .into_owned();
    let metadata = fs::metadata(src_exe).map_err(|e| e.to_string())?;
    let entry = WarehousedVersion {
        client: client.to_string(),
        version: version.to_string(),
        channel: channel.to_string(),
        blob_sha256: sha,
        original_exe_name,
        size_bytes: metadata.len(),
        downloaded_at: now_epoch_secs(),
        source: source.to_string(),
    };
    let manifest_path = dir.join("manifest.json");
    fs::write(&manifest_path, serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    Ok(entry)
}

pub fn list_warehoused_versions_at(data_root: &Path) -> Result<Vec<WarehousedVersion>, String> {
    let root = warehouse_root_at(data_root);
    if !root.exists() { return Ok(Vec::new()); }
    let mut out = Vec::new();
    for client_entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let client_entry = client_entry.map_err(|e| e.to_string())?;
        let client_path = client_entry.path();
        if !client_path.is_dir() { continue; }
        let name = client_entry.file_name().to_string_lossy().into_owned();
        if name == "blobs" { continue; }
        for version_entry in fs::read_dir(&client_path).map_err(|e| e.to_string())? {
            let version_entry = version_entry.map_err(|e| e.to_string())?;
            let version_path = version_entry.path();
            if !version_path.is_dir() { continue; }
            let manifest_path = version_path.join("manifest.json");
            if !manifest_path.exists() { continue; }
            let manifest_text = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
            let entry: WarehousedVersion = serde_json::from_str(&manifest_text)
                .map_err(|e| format!("manifest parse failed at {}: {}", manifest_path.display(), e))?;
            out.push(entry);
        }
    }
    Ok(out)
}

pub fn blob_path_for(data_root: &Path, sha256: &str) -> PathBuf {
    blobs_dir_at(data_root).join(format!("{}.exe", sha256))
}

// ─── Tauri-facing thin wrappers ────────────────────────────────────────────

#[tauri::command]
pub fn list_warehoused_versions(app: tauri::AppHandle) -> Result<Vec<WarehousedVersion>, String> {
    let root = data_root_path(&app)?;
    list_warehoused_versions_at(&root)
}

#[tauri::command]
pub fn read_warehouse_index(app: tauri::AppHandle) -> Result<WarehouseIndex, String> {
    let root = data_root_path(&app)?;
    Ok(read_index_at(&root))
}

#[tauri::command]
pub fn import_existing_install(
    app: tauri::AppHandle,
    client: String,
    exe_path: String,
) -> Result<WarehousedVersion, String> {
    let exe_path = PathBuf::from(&exe_path);
    if !exe_path.exists() { return Err(format!("exe not found: {}", exe_path.display())); }
    let version = crate::commands::ezquake::read_exe_version(&exe_path)
        .ok_or("could not read version from exe (Linux/dev cannot read PE versions)")?;
    let root = data_root_path(&app)?;
    register_version_at(&root, &client, &version, &exe_path, "imported", "user_import")
}

pub fn register_version(
    app: &tauri::AppHandle,
    client: &str,
    version: &str,
    src_exe: &Path,
    channel: &str,
    source: &str,
) -> Result<WarehousedVersion, String> {
    let root = data_root_path(app)?;
    register_version_at(&root, client, version, src_exe, channel, source)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_fake_exe(dir: &Path, name: &str, contents: &[u8]) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, contents).unwrap();
        path
    }

    #[test]
    fn empty_warehouse_returns_empty_list() {
        let tmp = TempDir::new().unwrap();
        assert!(list_warehoused_versions_at(tmp.path()).unwrap().is_empty());
    }

    #[test]
    fn register_writes_blob_and_manifest() {
        let tmp = TempDir::new().unwrap();
        let src = make_fake_exe(tmp.path(), "src.exe", b"fake exe contents");
        let entry = register_version_at(tmp.path(), "ezquake", "3.6.9", &src, "stable", "github_release").unwrap();
        assert_eq!(entry.client, "ezquake");
        assert_eq!(entry.version, "3.6.9");
        assert_eq!(entry.size_bytes, 17);
        assert_eq!(entry.blob_sha256.len(), 64);
        let blob = blob_path_for(tmp.path(), &entry.blob_sha256);
        assert!(blob.exists());
    }

    #[test]
    fn duplicate_bytes_share_blob() {
        let tmp = TempDir::new().unwrap();
        let src1 = make_fake_exe(tmp.path(), "a.exe", b"identical");
        let src2 = make_fake_exe(tmp.path(), "b.exe", b"identical");
        let e1 = register_version_at(tmp.path(), "ezquake", "v1", &src1, "stable", "src").unwrap();
        let e2 = register_version_at(tmp.path(), "ezquake", "v2", &src2, "stable", "src").unwrap();
        assert_eq!(e1.blob_sha256, e2.blob_sha256);
        let blob_count = fs::read_dir(blobs_dir_at(tmp.path())).unwrap().count();
        assert_eq!(blob_count, 1);
    }

    #[test]
    fn list_skips_dirs_without_manifest_and_blobs_dir() {
        let tmp = TempDir::new().unwrap();
        let bogus = tmp.path().join("binaries/ezquake/no-manifest");
        fs::create_dir_all(&bogus).unwrap();
        fs::write(bogus.join("ezquake.exe"), b"orphan").unwrap();
        // Also add blobs/ at the same level — must not be treated as a client.
        fs::create_dir_all(blobs_dir_at(tmp.path())).unwrap();
        assert!(list_warehoused_versions_at(tmp.path()).unwrap().is_empty());
    }

    #[test]
    fn list_handles_multiple_clients() {
        let tmp = TempDir::new().unwrap();
        let exe1 = make_fake_exe(tmp.path(), "a.exe", b"a");
        let exe2 = make_fake_exe(tmp.path(), "b.exe", b"b");
        register_version_at(tmp.path(), "ezquake", "3.6.9", &exe1, "stable", "src").unwrap();
        register_version_at(tmp.path(), "ktx", "1.45", &exe2, "stable", "src").unwrap();
        let listed = list_warehoused_versions_at(tmp.path()).unwrap();
        assert_eq!(listed.len(), 2);
    }

    #[test]
    fn index_round_trip() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir_all(warehouse_root_at(tmp.path())).unwrap();
        let mut idx = read_index_at(tmp.path());
        idx.active.insert("ezquake".to_string(), "3.6.9".to_string());
        idx.last_scan = 1714000000;
        write_index_at(tmp.path(), &idx).unwrap();
        let read = read_index_at(tmp.path());
        assert_eq!(read.active.get("ezquake").unwrap(), "3.6.9");
        assert_eq!(read.schema_version, SCHEMA_VERSION);
    }
}
```

- [ ] **Step 2: Register the module**

`commands/mod.rs`: `pub mod version_warehouse;`
`lib.rs`: add to `tauri::generate_handler![]`:
- `commands::version_warehouse::list_warehoused_versions`
- `commands::version_warehouse::read_warehouse_index`
- `commands::version_warehouse::import_existing_install`

- [ ] **Step 3: Build + test**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet && cargo test --quiet version_warehouse
```

Expected: clean build, 6 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): warehouse with blobs + manifests + index"
```

### Task 2.2: Frontend wrapper

**Files:**
- Create: `apps/slipgate-app/src/lib/quake-dir/warehouse.ts`
- Create: `apps/slipgate-app/src/lib/quake-dir/warehouse.test.ts`

- [ ] **Step 1: Test**

```typescript
// warehouse.test.ts
import { describe, expect, test } from "bun:test";
import {
  listWarehousedVersions,
  readWarehouseIndex,
  importExistingInstall,
} from "./warehouse";

describe("warehouse wrapper", () => {
  test("listWarehousedVersions forwards to the command", async () => {
    const fixture = [{ client: "ezquake", version: "3.6.9", channel: "stable",
      blob_sha256: "x", original_exe_name: "ezquake.exe", size_bytes: 1, downloaded_at: 1, source: "x" }];
    const calls: any[] = [];
    const invoke = async (cmd: string) => { calls.push(cmd); return fixture as any; };
    expect(await listWarehousedVersions(invoke)).toEqual(fixture);
    expect(calls).toEqual(["list_warehoused_versions"]);
  });

  test("readWarehouseIndex forwards", async () => {
    const idx = { schema_version: 1, active: { ezquake: "3.6.9" }, last_scan: 0 };
    const invoke = async () => idx as any;
    expect(await readWarehouseIndex(invoke)).toEqual(idx);
  });

  test("importExistingInstall passes client and exePath", async () => {
    const calls: any[] = [];
    const invoke = async (cmd: string, args?: any) => { calls.push([cmd, args]); return {} as any; };
    await importExistingInstall(invoke, "ezquake", "C:\\QW\\ezquake.exe");
    expect(calls).toEqual([["import_existing_install", { client: "ezquake", exePath: "C:\\QW\\ezquake.exe" }]]);
  });
});
```

- [ ] **Step 2: Run, expect fail; implement**

```typescript
// warehouse.ts
import type { InvokeFn } from "./invoke-types";

export interface WarehousedVersion {
  client: string;
  version: string;
  channel: "stable" | "snapshot" | "imported" | string;
  blob_sha256: string;
  original_exe_name: string;
  size_bytes: number;
  downloaded_at: number;
  source: string;
}

export interface WarehouseIndex {
  schema_version: number;
  active: Record<string, string>;
  last_scan: number;
}

export async function listWarehousedVersions(invoke: InvokeFn): Promise<WarehousedVersion[]> {
  return invoke<WarehousedVersion[]>("list_warehoused_versions");
}

export async function readWarehouseIndex(invoke: InvokeFn): Promise<WarehouseIndex> {
  return invoke<WarehouseIndex>("read_warehouse_index");
}

export async function importExistingInstall(
  invoke: InvokeFn,
  client: string,
  exePath: string,
): Promise<WarehousedVersion> {
  return invoke<WarehousedVersion>("import_existing_install", { client, exePath });
}
```

- [ ] **Step 3: Run, expect pass; commit**

```bash
git add apps/slipgate-app/src/lib/quake-dir/warehouse.ts \
        apps/slipgate-app/src/lib/quake-dir/warehouse.test.ts
git commit -m "feat(slipgate): warehouse frontend wrappers"
```

### Task 2.3: Hook updater download into the warehouse

The existing `download_and_install_update` flow at `commands/updater.rs:661-831` extracts the new exe to `<exe_dir>/.slipgate-update-exe.tmp` (line 738/756) and then runs the backup + rename dance. Phase 2 only adds a `register_version` call between stage 4 (extract done) and stage 5 (backup_exe). The existing swap stays for now; Phase 3 deletes it.

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/updater.rs`

- [ ] **Step 1: Insert register_version call**

Find the section ending at line 758 (where `new_exe_temp` exists at `<exe_dir>/.slipgate-update-exe.tmp`). Just before line 760 (the "5. Backup current exe" comment / `window.emit`), insert:

```rust
// Register the freshly extracted exe into the warehouse before any quake-dir
// mutation. Phase 3 will move the swap itself out of this function; for now
// the existing backup+rename stays.
let new_version_for_warehouse = read_exe_version(&new_exe_temp)
    .or_else(|| Some("unknown".to_string()))
    .unwrap();
let _warehouse_entry = crate::commands::version_warehouse::register_version(
    &app_handle,                    // see Step 2 — function signature gains `app: tauri::AppHandle`
    client_def.name,                // already in scope
    &new_version_for_warehouse,
    &new_exe_temp,
    &channel,                       // already a String parameter
    "github_release",
)?;
```

- [ ] **Step 2: Add `app: tauri::AppHandle` parameter**

`download_and_install_update` currently takes `window: tauri::Window`. We need a `tauri::AppHandle` too so the warehouse module can resolve `data_root_path`. Add it to the signature:

```rust
pub async fn download_and_install_update(
    app: tauri::AppHandle,
    exe_path: String,
    client_name: String,
    channel: String,
    download_url: String,
    checksums_url: Option<String>,
    window: tauri::Window,
) -> Result<UpdateResult, String> {
```

Tauri injects `AppHandle` automatically when listed; no frontend change needed. Reference `app` (or `&app`) in the register_version call.

- [ ] **Step 3: Build**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet
```

- [ ] **Step 4: Manual smoke (Windows or any host)**

Run `bun run tauri dev`, trigger an update from the Updater tab. After it completes, verify in `<data-root>/binaries/`:
- `blobs/<sha256>.exe` exists
- `<client>/<version>/manifest.json` exists with the right shape

On Linux dev `read_exe_version` returns `None` so the version field becomes `"unknown"` — acceptable for dev-mode smoke; production paths are Windows-only.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/updater.rs
git commit -m "feat(slipgate): updater registers downloaded exe into warehouse"
```

### Task 2.4: Hash-based reconcile module

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/warehouse_reconcile.rs`
- Modify: `commands/mod.rs`, `lib.rs`

The reconcile flow:
1. Take `(client, canonical_exe_path)` from frontend.
2. If exe doesn't exist, clear `index.active[client]` and return `{ status: "no_active" }`.
3. Hash the exe.
4. Look up the sha256 in the warehouse manifests.
5. If found, set `index.active[client] = manifest.version` and return `{ status: "matched", version }`.
6. If not found, return `{ status: "foreign", sha256 }` so the UI can offer to import.

- [ ] **Step 1: Module**

```rust
// apps/slipgate-app/src-tauri/src/commands/warehouse_reconcile.rs
use std::path::PathBuf;
use sha2::{Digest, Sha256};
use serde::Serialize;
use crate::commands::data_root::data_root_path;
use crate::commands::version_warehouse::{
    list_warehoused_versions_at, read_index_at, write_index_at, WarehouseIndex,
};

#[derive(Serialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum ReconcileResult {
    NoActive,
    Matched { version: String },
    Foreign { sha256: String },
}

#[tauri::command]
pub fn reconcile_active_version(
    app: tauri::AppHandle,
    client: String,
    canonical_exe_path: String,
) -> Result<ReconcileResult, String> {
    let data_root = data_root_path(&app)?;
    let exe = PathBuf::from(&canonical_exe_path);

    let mut idx: WarehouseIndex = read_index_at(&data_root);

    if !exe.exists() {
        idx.active.remove(&client);
        idx.last_scan = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        write_index_at(&data_root, &idx)?;
        return Ok(ReconcileResult::NoActive);
    }

    let bytes = std::fs::read(&exe).map_err(|e| format!("read failed: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let sha = format!("{:x}", hasher.finalize());

    let warehoused = list_warehoused_versions_at(&data_root)?;
    let matched = warehoused.into_iter().find(|w| w.blob_sha256 == sha && w.client == client);
    let result = match matched {
        Some(w) => {
            idx.active.insert(client.clone(), w.version.clone());
            ReconcileResult::Matched { version: w.version }
        }
        None => {
            idx.active.remove(&client);
            ReconcileResult::Foreign { sha256: sha }
        }
    };
    idx.last_scan = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    write_index_at(&data_root, &idx)?;
    Ok(result)
}
```

- [ ] **Step 2: Register**

`mod.rs`: `pub mod warehouse_reconcile;`
`lib.rs`: add `commands::warehouse_reconcile::reconcile_active_version`.

- [ ] **Step 3: Build**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/warehouse_reconcile.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): hash-based active-version reconcile"
```

### Task 2.5: Frontend bootstrap — first-run import + reconcile

The bootstrap calls reconcile first (sets active if user's exe is already known), then offers import if reconcile returned `foreign`.

**Files:**
- Create: `apps/slipgate-app/src/lib/quake-dir/firstRunImport.ts`
- Create: `apps/slipgate-app/src/lib/quake-dir/firstRunImport.test.ts`
- Modify: `apps/slipgate-app/src/App.tsx` (or whichever file bootstraps)

- [ ] **Step 1: Test**

```typescript
// firstRunImport.test.ts
import { describe, expect, test } from "bun:test";
import { runWarehouseBootstrap } from "./firstRunImport";

describe("runWarehouseBootstrap", () => {
  test("foreign exe with no warehouse entries triggers import", async () => {
    const calls: string[] = [];
    const invoke = async (cmd: string) => {
      calls.push(cmd);
      if (cmd === "reconcile_active_version") return { status: "foreign", sha256: "abc" } as any;
      if (cmd === "import_existing_install") return { version: "3.6.6" } as any;
      return null as any;
    };
    await runWarehouseBootstrap({
      invoke, client: "ezquake", canonicalExePath: "C:\\QW\\ezquake.exe",
    });
    expect(calls).toEqual(["reconcile_active_version", "import_existing_install"]);
  });

  test("matched exe does NOT trigger import", async () => {
    const calls: string[] = [];
    const invoke = async (cmd: string) => {
      calls.push(cmd);
      if (cmd === "reconcile_active_version") return { status: "matched", version: "3.6.9" } as any;
      return null as any;
    };
    await runWarehouseBootstrap({
      invoke, client: "ezquake", canonicalExePath: "C:\\QW\\ezquake.exe",
    });
    expect(calls).toEqual(["reconcile_active_version"]);
  });

  test("no exe path skips everything", async () => {
    const calls: string[] = [];
    const invoke = async (cmd: string) => { calls.push(cmd); return null as any; };
    await runWarehouseBootstrap({ invoke, client: "ezquake", canonicalExePath: null });
    expect(calls).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// firstRunImport.ts
import type { InvokeFn } from "./invoke-types";

interface BootstrapArgs {
  invoke: InvokeFn;
  client: string;
  canonicalExePath: string | null;
}

type ReconcileResult =
  | { status: "no_active" }
  | { status: "matched"; version: string }
  | { status: "foreign"; sha256: string };

export async function runWarehouseBootstrap(args: BootstrapArgs): Promise<void> {
  if (!args.canonicalExePath) return;
  const result = await args.invoke<ReconcileResult>("reconcile_active_version", {
    client: args.client,
    canonicalExePath: args.canonicalExePath,
  });
  if (result.status === "foreign") {
    await args.invoke("import_existing_install", {
      client: args.client,
      exePath: args.canonicalExePath,
    });
    // Re-reconcile so index.active points at the just-imported version.
    await args.invoke("reconcile_active_version", {
      client: args.client,
      canonicalExePath: args.canonicalExePath,
    });
  }
}
```

- [ ] **Step 3: Wire into App bootstrap**

Locate the SolidJS startup flow (likely `src/App.tsx` or `src/main.tsx`). After the profile loads, fire-and-forget:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { runWarehouseBootstrap } from "./lib/quake-dir/firstRunImport";
import { getPrimarySetup } from "./store";

const setup = getPrimarySetup();
runWarehouseBootstrap({
  invoke,
  client: "ezquake",
  canonicalExePath: setup?.client?.exe_path ?? null,
}).catch((e) => console.warn("warehouse bootstrap failed:", e));
```

- [ ] **Step 4: Manual smoke**

Run `bun run tauri dev` on Windows (Linux dev's `read_exe_version` returns None so the import will fail; that's the expected dev-mode limitation from gotcha 12). Confirm:
- `<data-root>/binaries/blobs/<sha>.exe` exists matching the user's exe
- `<data-root>/binaries/ezquake/<version>/manifest.json` exists
- `<data-root>/binaries/index.json` has `active.ezquake` set to the right version

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/quake-dir/firstRunImport.ts \
        apps/slipgate-app/src/lib/quake-dir/firstRunImport.test.ts \
        apps/slipgate-app/src/App.tsx
git commit -m "feat(slipgate): warehouse bootstrap (reconcile + first-run import)"
```

**Phase 2 complete.** The warehouse holds content-addressed blobs, manifests + an index file describe what's installed, the updater registers downloads, and launch-time reconcile keeps the active-version pointer truthful no matter what the user did outside slipgate.

---

## Phase 3: Active-version swap + UI + updater refactor + delete

**Sessions:** 1-2 (~4 hours)
**Goal:** A `version_swap` module that owns ALL canonical-exe mutation, refactor `download_and_install_update` to use it (deleting its own backup/swap logic), a UI panel listing every warehoused version with switch + delete buttons, and the foreign-exe backup heuristic from D6.

### Task 3.1: version_swap module

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/version_swap.rs`
- Modify: `commands/mod.rs`, `lib.rs`

- [ ] **Step 1: Module**

```rust
// apps/slipgate-app/src-tauri/src/commands/version_swap.rs
use std::fs;
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use serde::Serialize;
use crate::commands::data_root::data_root_path;
use crate::commands::version_warehouse::{
    blob_path_for, list_warehoused_versions_at, read_index_at, write_index_at,
};

#[derive(Serialize, Clone, Debug)]
pub struct SwapResult {
    pub previous_sha256: Option<String>,
    pub previous_was_foreign: bool,
    pub new_version: String,
    pub backup_path: Option<String>,
}

fn hash_file(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("read failed: {}", e))?;
    let mut h = Sha256::new();
    h.update(&bytes);
    Ok(format!("{:x}", h.finalize()))
}

fn now_epoch_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[tauri::command]
pub fn swap_active_version(
    app: tauri::AppHandle,
    client: String,
    target_version: String,
    quake_dir: String,
    target_exe_name: String,
) -> Result<SwapResult, String> {
    let data_root = data_root_path(&app)?;
    let quake_dir = PathBuf::from(&quake_dir);
    if !quake_dir.exists() {
        return Err(format!("quake dir does not exist: {}", quake_dir.display()));
    }
    let canonical = quake_dir.join(&target_exe_name);

    // Resolve target blob.
    let warehoused = list_warehoused_versions_at(&data_root)?;
    let target = warehoused.iter()
        .find(|w| w.client == client && w.version == target_version)
        .ok_or_else(|| format!("version not in warehouse: {} {}", client, target_version))?;
    let blob = blob_path_for(&data_root, &target.blob_sha256);
    if !blob.exists() {
        return Err(format!("warehouse blob missing: {}", blob.display()));
    }

    // Decide backup behavior (D6).
    let mut previous_sha256: Option<String> = None;
    let mut previous_was_foreign = false;
    let mut backup_path: Option<String> = None;

    if canonical.exists() {
        let current_sha = hash_file(&canonical)?;
        previous_sha256 = Some(current_sha.clone());
        let warehoused_match = warehoused.iter().any(|w| w.blob_sha256 == current_sha);
        if !warehoused_match {
            previous_was_foreign = true;
            let stem = target_exe_name.strip_suffix(".exe").unwrap_or(&target_exe_name);
            let backup = quake_dir.join(format!("{}.bak.exe", stem));
            // If a .bak already exists, overwrite — only one foreign-exe-backup retained.
            fs::rename(&canonical, &backup)
                .map_err(|e| format!("rename to backup failed: {}", e))?;
            backup_path = Some(backup.to_string_lossy().into_owned());
        } else {
            // Bytes already in warehouse — safe to delete.
            fs::remove_file(&canonical)
                .map_err(|e| format!("remove current exe failed: {}", e))?;
        }
    }

    // Transactional copy: blob -> .new -> rename to canonical (atomic on POSIX/NTFS).
    let staging = canonical.with_extension("new");
    fs::copy(&blob, &staging)
        .map_err(|e| format!("copy from blob failed: {}", e))?;
    if let Err(e) = fs::rename(&staging, &canonical) {
        // Rollback: restore backup if we made one, remove staging.
        let _ = fs::remove_file(&staging);
        if let Some(ref bp) = backup_path {
            let _ = fs::rename(bp, &canonical);
        }
        return Err(format!("install rename failed: {}", e));
    }

    // Update index.active.
    let mut idx = read_index_at(&data_root);
    idx.active.insert(client.clone(), target_version.clone());
    idx.last_scan = now_epoch_secs();
    write_index_at(&data_root, &idx)?;

    Ok(SwapResult {
        previous_sha256,
        previous_was_foreign,
        new_version: target_version,
        backup_path,
    })
}

#[tauri::command]
pub fn delete_warehoused_version(
    app: tauri::AppHandle,
    client: String,
    version: String,
) -> Result<(), String> {
    let data_root = data_root_path(&app)?;
    let warehoused = list_warehoused_versions_at(&data_root)?;
    let target = warehoused.iter()
        .find(|w| w.client == client && w.version == version)
        .ok_or_else(|| format!("not in warehouse: {} {}", client, version))?;

    // Refuse if active.
    let idx = read_index_at(&data_root);
    if idx.active.get(&client).map(|v| v == &version).unwrap_or(false) {
        return Err("cannot delete the active version; switch first".into());
    }

    // Delete per-version dir (manifest).
    let dir = crate::commands::version_warehouse::version_dir_at(&data_root, &client, &version);
    fs::remove_dir_all(&dir).map_err(|e| format!("remove version dir failed: {}", e))?;

    // GC blob if no other manifest references it.
    let still_referenced = warehoused.iter()
        .any(|w| !(w.client == client && w.version == version) && w.blob_sha256 == target.blob_sha256);
    if !still_referenced {
        let blob = blob_path_for(&data_root, &target.blob_sha256);
        if blob.exists() { let _ = fs::remove_file(&blob); }
    }
    Ok(())
}
```

- [ ] **Step 2: Register**

`mod.rs`: `pub mod version_swap;`
`lib.rs`: add `commands::version_swap::swap_active_version`, `commands::version_swap::delete_warehoused_version`.

- [ ] **Step 3: Build**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/version_swap.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs \
        apps/slipgate-app/src-tauri/src/lib.rs
git commit -m "feat(slipgate): version_swap with foreign-exe backup heuristic + delete"
```

### Task 3.2: Refactor updater to use the swap module (D7)

`download_and_install_update` currently does its own backup + rename in stages 5-7. Now that the warehouse owns the bytes (Phase 2 step), the updater should:
1. Download to temp.
2. Verify checksum.
3. Extract to a temp path inside `<data-root>/binaries/` (NOT in the user's quake dir at all).
4. Call `register_version` on that temp file (writes blob, then can delete the temp).
5. Call `swap_active_version`.

This deletes the existing `backup_exe` call in updater.rs and the rename-to-canonical at line 799. Same observable behavior, single swap path.

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/updater.rs`

- [ ] **Step 1: Stage extracted exe inside data-root, not exe-dir**

In `download_and_install_update`, change `temp_download` and `new_exe_temp` paths to live under `<data-root>/binaries/.staging/` instead of `<exe_dir>`. Add a helper:

```rust
fn staging_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dr = crate::commands::data_root::data_root_path(app)?;
    let s = dr.join("binaries").join(".staging");
    std::fs::create_dir_all(&s).map_err(|e| e.to_string())?;
    Ok(s)
}
```

Use `staging_dir(&app)?.join("update-download.tmp")` and `.join("update-exe.tmp")` in place of `exe_dir.join(...)` calls.

- [ ] **Step 2: Replace stages 5-7 with register + swap**

Delete the existing stages 5 (backup_exe call), 6 (rename new_exe_temp → target_path), and 7 (read new version). Replace with:

```rust
// 5. Register into warehouse (writes blob + manifest).
let entry = crate::commands::version_warehouse::register_version(
    &app, client_def.name, &new_version_for_warehouse, &new_exe_temp, &channel, "github_release",
)?;
let _ = std::fs::remove_file(&new_exe_temp);

// 6. Swap into the user's quake dir via the canonical swap path.
let quake_dir_str = std::path::Path::new(&exe_path)
    .parent()
    .ok_or("Cannot determine exe directory")?
    .to_string_lossy()
    .into_owned();
let swap = crate::commands::version_swap::swap_active_version(
    app.clone(),
    client_def.name.to_string(),
    entry.version.clone(),
    quake_dir_str,
    client_def.exe_name.to_string(),
)?;

let _ = window.emit("update-progress", UpdateProgress {
    stage: "done".into(),
    percent: Some(100.0),
    message: format!("Updated to {}", entry.version),
});

Ok(UpdateResult {
    success: true,
    new_version: Some(entry.version),
    backup_path: swap.backup_path,
    error: None,
})
```

- [ ] **Step 3: Delete the now-unused `backup_exe` function** (lines 507-538) and any newly-orphaned imports. Run `cargo build` and chase warnings until clean.

- [ ] **Step 4: Build**

```bash
cd apps/slipgate-app/src-tauri && cargo build --quiet
```

- [ ] **Step 5: Manual smoke**

Run dev mode, trigger an update. Verify:
- `<data-root>/binaries/blobs/<sha>.exe` exists for the new version.
- `<quake-dir>/ezquake.exe` is the new version.
- If the previous exe was warehouse-known (Phase 2 imported it), no `.bak` file appears in the quake dir.
- If the previous exe was foreign, `<quake-dir>/ezquake.bak.exe` appears.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/updater.rs
git commit -m "refactor(slipgate): updater uses version_swap; delete legacy backup_exe"
```

### Task 3.3: Frontend swap + delete wrappers

**Files:**
- Create: `apps/slipgate-app/src/lib/quake-dir/swap.ts`
- Create: `apps/slipgate-app/src/lib/quake-dir/swap.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, expect, test } from "bun:test";
import { swapActiveVersion, deleteWarehousedVersion } from "./swap";

describe("swap wrappers", () => {
  test("swapActiveVersion forwards args", async () => {
    const calls: any[] = [];
    const invoke = async (cmd: string, args?: any) => {
      calls.push([cmd, args]);
      return { previous_sha256: "x", previous_was_foreign: false,
        new_version: "3.6.9", backup_path: null } as any;
    };
    const r = await swapActiveVersion(invoke, {
      client: "ezquake", targetVersion: "3.6.9",
      quakeDir: "C:\\QW", targetExeName: "ezquake.exe",
    });
    expect(r.new_version).toBe("3.6.9");
    expect(calls[0][0]).toBe("swap_active_version");
  });

  test("deleteWarehousedVersion forwards", async () => {
    const calls: any[] = [];
    const invoke = async (cmd: string, args?: any) => { calls.push([cmd, args]); return null as any; };
    await deleteWarehousedVersion(invoke, "ezquake", "3.6.6");
    expect(calls).toEqual([["delete_warehoused_version", { client: "ezquake", version: "3.6.6" }]]);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// swap.ts
import type { InvokeFn } from "./invoke-types";

export interface SwapResult {
  previous_sha256: string | null;
  previous_was_foreign: boolean;
  new_version: string;
  backup_path: string | null;
}

export interface SwapArgs {
  client: string;
  targetVersion: string;
  quakeDir: string;
  targetExeName: string;
}

export async function swapActiveVersion(invoke: InvokeFn, args: SwapArgs): Promise<SwapResult> {
  return invoke<SwapResult>("swap_active_version", { ...args });
}

export async function deleteWarehousedVersion(
  invoke: InvokeFn, client: string, version: string,
): Promise<void> {
  await invoke("delete_warehoused_version", { client, version });
}
```

- [ ] **Step 3: Run, expect pass; commit**

```bash
git add apps/slipgate-app/src/lib/quake-dir/swap.ts \
        apps/slipgate-app/src/lib/quake-dir/swap.test.ts
git commit -m "feat(slipgate): swap + delete frontend wrappers"
```

### Task 3.4: VersionWarehouse component

**Files:**
- Create: `apps/slipgate-app/src/components/VersionWarehouse.tsx`
- Modify: `apps/slipgate-app/src/components/ClientsTab.tsx`

Plan the ClientsTab layout once now (avoid incremental appends across phases). Sketch:

```
ClientsTab
├── (existing) ezQuake updater + release-notes panel
├── <VersionWarehouse client="ezquake" .../>
└── <VersionDiffViewer client="ezquake" .../>   (added in Phase 5)
```

- [ ] **Step 1: Component**

```tsx
// apps/slipgate-app/src/components/VersionWarehouse.tsx
import { createResource, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import {
  listWarehousedVersions, readWarehouseIndex,
  type WarehousedVersion,
} from "../lib/quake-dir/warehouse";
import { swapActiveVersion, deleteWarehousedVersion } from "../lib/quake-dir/swap";

interface Props {
  client: string;
  quakeDir: string | null;
  targetExeName: string;
  onSwapComplete?: (newVersion: string) => void;
}

export default function VersionWarehouse(props: Props) {
  const [versions, { refetch: refetchVersions }] = createResource(() => listWarehousedVersions(invoke));
  const [index, { refetch: refetchIndex }] = createResource(() => readWarehouseIndex(invoke));
  const [busy, setBusy] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const activeVersion = () => index()?.active?.[props.client] ?? null;
  const filtered = () => (versions() ?? []).filter((v) => v.client === props.client);

  const refresh = async () => {
    await Promise.all([refetchVersions(), refetchIndex()]);
  };

  const handleSwap = async (v: WarehousedVersion) => {
    if (!props.quakeDir) { setError("No quake dir configured"); return; }
    setBusy(`swap:${v.version}`); setError(null);
    try {
      await swapActiveVersion(invoke, {
        client: props.client, targetVersion: v.version,
        quakeDir: props.quakeDir, targetExeName: props.targetExeName,
      });
      props.onSwapComplete?.(v.version);
      await refresh();
    } catch (e) { setError(String(e)); }
    finally { setBusy(null); }
  };

  const handleDelete = async (v: WarehousedVersion) => {
    if (!confirm(`Delete ${v.client} ${v.version} from warehouse?`)) return;
    setBusy(`del:${v.version}`); setError(null);
    try {
      await deleteWarehousedVersion(invoke, props.client, v.version);
      await refresh();
    } catch (e) { setError(String(e)); }
    finally { setBusy(null); }
  };

  return (
    <div class="space-y-2">
      <h3 class="text-lg font-semibold">Installed versions</h3>
      <Show when={error()}>
        <div class="alert alert-error text-sm">{error()}</div>
      </Show>
      <ul class="space-y-1">
        <For each={filtered()}>{(v) => (
          <li class="flex items-center gap-3 p-2 rounded border border-base-300">
            <div class="flex-1">
              <span class="font-mono">{v.version}</span>
              <span class="ml-2 badge badge-sm">{v.channel}</span>
              <Show when={v.version === activeVersion()}>
                <span class="ml-2 badge badge-sm badge-success">active</span>
              </Show>
            </div>
            <button
              class="btn btn-sm btn-primary"
              disabled={v.version === activeVersion() || busy() !== null || !props.quakeDir}
              onClick={() => handleSwap(v)}
            >
              {busy() === `swap:${v.version}` ? "Switching..." : "Switch"}
            </button>
            <button
              class="btn btn-sm btn-ghost"
              disabled={v.version === activeVersion() || busy() !== null}
              onClick={() => handleDelete(v)}
            >
              {busy() === `del:${v.version}` ? "..." : "Delete"}
            </button>
          </li>
        )}</For>
        <Show when={filtered().length === 0}>
          <li class="text-sm text-base-content/60 p-2">
            No versions warehoused yet. Use the updater above to download one.
          </li>
        </Show>
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Mount in ClientsTab**

Open `src/components/ClientsTab.tsx`. Below the existing release-notes/changelog block for ezQuake, insert:

```tsx
<VersionWarehouse
  client="ezquake"
  quakeDir={quakeDirFromExePath(primarySetup()?.client?.exe_path)}
  targetExeName="ezquake.exe"
  onSwapComplete={(newVersion) => {
    updatePrimaryClient({ version: newVersion });
  }}
/>
```

Helper:

```typescript
function quakeDirFromExePath(p: string | null | undefined): string | null {
  if (!p) return null;
  const idx = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
  return idx > 0 ? p.slice(0, idx) : null;
}
```

- [ ] **Step 3: Manual smoke**

```bash
cd apps/slipgate-app && bun run tauri dev
```

Verify on Windows:
- ClientsTab shows the panel.
- User's existing install appears (auto-imported in Phase 2).
- Downloading another version adds a second entry; the new one is active.
- Switching restores the older version as active; if the previous (newer) version was warehouse-known, no .bak file appears.
- Deleting a non-active version removes it; blob is GC'd if not referenced.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/VersionWarehouse.tsx \
        apps/slipgate-app/src/components/ClientsTab.tsx
git commit -m "feat(slipgate): VersionWarehouse panel with switch + delete"
```

**Phase 3 complete.** Single swap path, multi-version UI, foreign-exe backups only when needed, delete with blob GC. The user's quake dir is mutated only via `version_swap`.

---

## Phase 4: Snapshot widening for retired entities (all 4 entity types)

**Sessions:** 1 (~2-3 hours)
**Goal:** Widen `build-snapshot.ts` to emit retired entities across cvar, command, macro, and cmdline_param. Slipgate consumer types pick up the new fields. Diff viewer in Phase 5 uses them via `@qw/version-resolution`.

### Task 4.1: Audit baseline

**Files (read-only):**
- `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`
- `apps/slipgate-app/src/lib/config/data/ezquake-variables.json`

- [ ] **Step 1: Confirm DB has retired entities**

```bash
cd apps/qw-oracle
sqlite3 data/knowledge.db "SELECT type, COUNT(*) FROM entities WHERE project='ezquake' AND source_state='source_retired' GROUP BY type"
```

Expected today: 5 retired cvars (cl_showkeycodes, gl_smoothfont, keymap_name, r_fx_geometry, scr_printspeed). May or may not include retired commands/macros/cmdline_params.

- [ ] **Step 2: Confirm snapshot drops them**

```bash
python3 -c "
import json
v = json.load(open('../slipgate-app/src/lib/config/data/ezquake-variables.json'))['vars']
print('total:', len(v))
print('source_retired:', sum(1 for o in v.values() if o.get('source_state') == 'source_retired'))
"
```

Expected: total ~2899, source_retired 0.

### Task 4.2: Widen build-snapshot.ts to emit retired entities

The structural fix (per the reading-pass finding): `loadEnrichment` already collects retired entities and stamps them with `retired_at_version`. The drop happens in `fetchCvarRows` / `fetchCommandRows` / etc., which JOIN `<type>_versions` on the head version only. Retired entities have no head row, so they fall out.

Strategy: for each entity type, run an additional query that fetches `<type>_versions` rows at each retired entity's `last_seen_version` (whatever `retired_at_version` says, modulo retiree-was-active-at-last-seen invariant). Merge into the same vars/commands/macros/params dictionary the head query produced, with the enrichment block already including `source_state: source_retired`.

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`

- [ ] **Step 1: Add a retired-row fetcher per type**

After the existing `fetchCvarRows` (and friends), add:

```typescript
// Fetch the "last alive" row for each retired entity of the given type.
function fetchRetiredCvarRows(db: Database.Database, project: Project) {
  return db.prepare(`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.help_values, cv.help_group_id,
           cv.help_type, cv.default_value, cv.flag_names, cv.server_only, cv.source_root
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND e.source_state = 'source_retired'
      AND cv.version = e.last_seen_version
    ORDER BY e.name
  `).all(project) as ReturnType<typeof fetchCvarRows>;
}
// (Same shape for fetchRetiredCommandRows, fetchRetiredMacroRows, fetchRetiredCmdlineRows.)
```

Replicate for `command_versions`, `macro_versions`, `cmdline_param_versions` — same predicate `cv.version = e.last_seen_version`.

- [ ] **Step 2: Merge retired rows into each emit fn**

In `emitEzqVariables`, after the existing `for (const r of rows)` loop, add:

```typescript
const retired = fetchRetiredCvarRows(db, project);
for (const r of retired) {
  if (vars[r.name]) continue; // shouldn't happen, but defensively skip
  const entry: Record<string, unknown> = {};
  if (r.help_type) entry.type = r.help_type;
  if (r.help_group_id) entry['group-id'] = r.help_group_id;
  if (r.default_value != null) entry.default = r.default_value;
  if (r.server_only) entry['server-only'] = true;
  if (r.help_desc) entry.desc = r.help_desc;
  if (r.help_remarks) entry.remarks = r.help_remarks;
  if (r.help_values) {
    try { entry.values = JSON.parse(r.help_values); } catch { /* keep absent */ }
  }
  if (r.source_root != null) entry.source_root = r.source_root;
  const enr = enrichment.get(r.name);
  if (enr) Object.assign(entry, enr);
  vars[r.name] = entry;
}
```

Same shape for `emitEzqCommands`, `emitEzqMacros`, `emitEzqCmdline`.

- [ ] **Step 3: Regenerate**

```bash
cd apps/qw-oracle
npm --no-workspaces run load-knowledge -- build-snapshot --project ezquake
```

- [ ] **Step 4: Verify retired count**

```bash
python3 -c "
import json
v = json.load(open('../slipgate-app/src/lib/config/data/ezquake-variables.json'))['vars']
retired = [n for n, o in v.items() if o.get('source_state') == 'source_retired']
print('retired cvars in snapshot:', len(retired))
print('  ', retired)
"
```

Expected: 5 entries matching the DB.

Run the same audit for commands / macros / cmdline-params files.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts \
        apps/slipgate-app/src/lib/config/data/ezquake-variables.json \
        apps/slipgate-app/src/lib/config/data/ezquake-commands.json \
        apps/slipgate-app/src/lib/config/data/ezquake-macros.json \
        apps/slipgate-app/src/lib/config/data/ezquake-cmdline-params.json
git commit -m "feat(qw-oracle): build-snapshot emits retired entities for all 4 types"
```

### Task 4.3: Audit per-version field coverage

`first_seen_version`, `last_seen_version`, and `default_history` already ride in via `loadEnrichment`. Confirm coverage is 100% on the active rows (head + retired).

- [ ] **Step 1: Count fields**

```bash
python3 << 'EOF'
import json
data = json.load(open('apps/slipgate-app/src/lib/config/data/ezquake-variables.json'))['vars']
total = len(data)
fs = sum(1 for v in data.values() if 'first_seen_version' in v)
ls = sum(1 for v in data.values() if 'last_seen_version' in v)
dh = sum(1 for v in data.values() if 'default_history' in v)
print(f"total: {total}")
print(f"first_seen_version: {fs}")
print(f"last_seen_version:  {ls}")
print(f"default_history:    {dh}")
EOF
```

Expected: `first_seen_version` and `last_seen_version` at 100% (`total`). `default_history` only on cvars where it's interesting (~32 today).

If first/last coverage is incomplete, fix `loadEnrichment` and re-run.

- [ ] **Step 2: Document the snapshot shape**

Update `apps/qw-oracle/docs/entity-types.md` with the canonical snapshot field list — mention which fields each entity type carries (cvar carries default_history; commands don't; etc.) and note that `source_state: source_retired` plus `retired_at_version` are guaranteed for retired entries.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/docs/entity-types.md
git commit -m "docs(qw-oracle): snapshot shape and retired-entity guarantees"
```

### Task 4.4: Slipgate consumer types pick up enrichment

`loadEzQuakeCvars()` strips enrichment fields today (it returns plain `CvarInfo`). Diff viewer needs them. Add a parallel function rather than expanding `CvarInfo` (which is consumed by ConfigViewer and shouldn't gain optional fields it doesn't use).

**Files:**
- Modify: `apps/slipgate-app/src/lib/config/loaders/ezquake.ts`

- [ ] **Step 1: Extend RawVar with optional enrichment fields**

```typescript
interface RawVar {
  type: "boolean" | "integer" | "float" | "string" | "enum";
  "group-id": string;
  desc?: string;
  default?: string;
  remarks?: string;
  values?: RawVarValue[];
  "server-only"?: boolean;
  // ── enrichment (snapshot-widening, used by diff viewer) ──
  source_state?: "source_backed" | "doc_only" | "source_retired";
  first_seen_version?: string;
  last_seen_version?: string;
  default_history?: Array<{ version: string; value: string }>;
  retired_at_version?: string;
}
```

- [ ] **Step 2: Add a richer loader fn**

```typescript
export interface CvarInfoWithEnrichment extends CvarInfo {
  source_state?: "source_backed" | "doc_only" | "source_retired";
  first_seen_version?: string;
  last_seen_version?: string;
  default_history?: Array<{ version: string; value: string }>;
  retired_at_version?: string;
}

export function loadEzQuakeCvarsWithEnrichment(): Map<string, CvarInfoWithEnrichment> {
  const result = new Map<string, CvarInfoWithEnrichment>();
  for (const [name, raw] of Object.entries(data.vars)) {
    const meta = groupLookup.get(raw["group-id"]) ?? { category: "Miscellaneous", group: "Other" };
    const cvar: CvarInfoWithEnrichment = {
      name,
      description: raw.desc ?? "",
      type: raw.type,
      category: meta.category,
      group: meta.group,
      client: "ezquake",
      serverOnly: raw["server-only"] ?? false,
    };
    if (raw.default !== undefined) cvar.default = raw.default;
    if (raw.remarks !== undefined) cvar.remarks = raw.remarks;
    if (raw.values !== undefined) {
      cvar.values = raw.values.map((v) => ({ name: v.name, description: v.description }));
    }
    if (raw.source_state !== undefined) cvar.source_state = raw.source_state;
    if (raw.first_seen_version !== undefined) cvar.first_seen_version = raw.first_seen_version;
    if (raw.last_seen_version !== undefined) cvar.last_seen_version = raw.last_seen_version;
    if (raw.default_history !== undefined) cvar.default_history = raw.default_history;
    if (raw.retired_at_version !== undefined) cvar.retired_at_version = raw.retired_at_version;
    result.set(name, cvar);
  }
  return result;
}
```

- [ ] **Step 3: Verify the test suite still passes**

```bash
cd apps/slipgate-app && bunx tsc --noEmit && bun test
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/lib/config/loaders/ezquake.ts
git commit -m "feat(slipgate): loadEzQuakeCvarsWithEnrichment for diff viewer"
```

**Phase 4 complete.** Snapshot now carries every entity ever seen, with full per-version metadata. Slipgate has a richer loader that exposes the new fields without disturbing existing consumers.

---

## Phase 5: Diff viewer UI

**Sessions:** 1-2 (~3-4 hours)
**Goal:** "Compare any two versions" view showing added / removed / default-changed sections + a user-config impact panel. Built on `@qw/version-resolution` for all version arithmetic.

### Task 5.1: Slipgate-side composition over the shared lib

The shared lib provides `existsAtVersion` and `defaultAtVersion`. Slipgate composes them into the diff structure.

**Files:**
- Create: `apps/slipgate-app/src/lib/version-diff/types.ts`
- Create: `apps/slipgate-app/src/lib/version-diff/computeDiff.ts`
- Create: `apps/slipgate-app/src/lib/version-diff/computeDiff.test.ts`

- [ ] **Step 1: Types**

```typescript
// types.ts
import type { CvarInfoWithEnrichment } from "../config/loaders/ezquake";

export interface VersionDiff {
  base: string;
  target: string;
  added: CvarInfoWithEnrichment[];
  removed: CvarInfoWithEnrichment[];
  defaultChanged: Array<{
    name: string;
    info: CvarInfoWithEnrichment;
    baseDefault: string;
    targetDefault: string;
  }>;
}

export interface UserConfigImpact {
  affectedRemoved: string[];
  affectedDefaultChanged: Array<{
    name: string;
    userValue: string;
    baseDefault: string;
    targetDefault: string;
    userMatchesBaseDefault: boolean;
  }>;
  newSinceBase: string[];
}
```

- [ ] **Step 2: Test**

```typescript
// computeDiff.test.ts
import { describe, expect, test } from "bun:test";
import { computeVersionDiff, computeUserConfigImpact } from "./computeDiff";
import type { CvarInfoWithEnrichment } from "../config/loaders/ezquake";

function cvar(name: string, opts: Partial<CvarInfoWithEnrichment> = {}): CvarInfoWithEnrichment {
  return {
    name,
    description: "",
    type: "boolean",
    category: "test",
    group: "test",
    client: "ezquake",
    ...opts,
  };
}

describe("computeVersionDiff", () => {
  test("flags added cvars (first_seen_version > base, <= target)", () => {
    const cvars = [cvar("new_cvar", { first_seen_version: "3.6.9", last_seen_version: "head-2026-04-25" })];
    const diff = computeVersionDiff(cvars, "3.6.6", "3.6.9");
    expect(diff.added.map((c) => c.name)).toEqual(["new_cvar"]);
  });

  test("flags removed cvars (last_seen_version < target)", () => {
    const cvars = [cvar("dead_cvar", { first_seen_version: "3.6.0", last_seen_version: "3.6.6" })];
    const diff = computeVersionDiff(cvars, "3.6.6", "3.6.9");
    expect(diff.removed.map((c) => c.name)).toEqual(["dead_cvar"]);
  });

  test("flags default changes via default_history", () => {
    const cvars = [cvar("cl_fakeshaft", {
      first_seen_version: "3.6.0",
      last_seen_version: "head-2026-04-25",
      default_history: [
        { version: "3.6.0", value: "0" },
        { version: "3.7.0", value: "1" },
      ],
      default: "1",
    })];
    const diff = computeVersionDiff(cvars, "3.6.9", "3.7.0");
    expect(diff.defaultChanged.length).toBe(1);
    expect(diff.defaultChanged[0].baseDefault).toBe("0");
    expect(diff.defaultChanged[0].targetDefault).toBe("1");
  });

  test("ignores cvars present in both versions with stable defaults", () => {
    const cvars = [cvar("stable", {
      first_seen_version: "3.0.0",
      last_seen_version: "head-2026-04-25",
      default: "5",
    })];
    const diff = computeVersionDiff(cvars, "3.6.6", "3.6.9");
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.defaultChanged).toEqual([]);
  });
});

describe("computeUserConfigImpact", () => {
  test("flags user cvars that are removed in target", () => {
    const userConfig = new Map([["dead_cvar", "1"]]);
    const diff = {
      base: "3.6.6", target: "3.6.9", added: [], defaultChanged: [],
      removed: [cvar("dead_cvar")],
    };
    const impact = computeUserConfigImpact(userConfig, diff);
    expect(impact.affectedRemoved).toEqual(["dead_cvar"]);
  });

  test("flags silent default change when user value matches base default", () => {
    const userConfig = new Map([["cl_fakeshaft", "0"]]);
    const diff = {
      base: "3.6.9", target: "3.7.0", added: [], removed: [],
      defaultChanged: [{
        name: "cl_fakeshaft", info: cvar("cl_fakeshaft"),
        baseDefault: "0", targetDefault: "1",
      }],
    };
    const impact = computeUserConfigImpact(userConfig, diff);
    expect(impact.affectedDefaultChanged[0].userMatchesBaseDefault).toBe(true);
  });

  test("user-overridden default reports userMatchesBaseDefault=false", () => {
    const userConfig = new Map([["cl_fakeshaft", "5"]]);
    const diff = {
      base: "3.6.9", target: "3.7.0", added: [], removed: [],
      defaultChanged: [{
        name: "cl_fakeshaft", info: cvar("cl_fakeshaft"),
        baseDefault: "0", targetDefault: "1",
      }],
    };
    const impact = computeUserConfigImpact(userConfig, diff);
    expect(impact.affectedDefaultChanged[0].userMatchesBaseDefault).toBe(false);
  });
});
```

- [ ] **Step 3: Implement (using shared lib)**

```typescript
// computeDiff.ts
import type { CvarInfoWithEnrichment } from "../config/loaders/ezquake";
import type { VersionDiff, UserConfigImpact } from "./types";
import { parseVersionSpec, existsAtVersion, defaultAtVersion } from "@qw/version-resolution";

export function computeVersionDiff(
  cvars: CvarInfoWithEnrichment[],
  base: string,
  target: string,
): VersionDiff {
  const baseSpec = parseVersionSpec(base);
  const targetSpec = parseVersionSpec(target);
  const added: CvarInfoWithEnrichment[] = [];
  const removed: CvarInfoWithEnrichment[] = [];
  const defaultChanged: VersionDiff["defaultChanged"] = [];

  for (const c of cvars) {
    const inBase = existsAtVersion(c, baseSpec);
    const inTarget = existsAtVersion(c, targetSpec);
    if (!inBase && inTarget) { added.push(c); continue; }
    if (inBase && !inTarget) { removed.push(c); continue; }
    if (inBase && inTarget) {
      const baseDefault = defaultAtVersion(c, baseSpec);
      const targetDefault = defaultAtVersion(c, targetSpec);
      if (baseDefault !== null && targetDefault !== null && baseDefault !== targetDefault) {
        defaultChanged.push({ name: c.name, info: c, baseDefault, targetDefault });
      }
    }
  }
  return { base, target, added, removed, defaultChanged };
}

export function computeUserConfigImpact(
  userConfig: Map<string, string>,
  diff: VersionDiff,
): UserConfigImpact {
  const affectedRemoved = diff.removed
    .filter((c) => userConfig.has(c.name))
    .map((c) => c.name);

  const affectedDefaultChanged = diff.defaultChanged
    .filter((d) => userConfig.has(d.name))
    .map((d) => ({
      name: d.name,
      userValue: userConfig.get(d.name)!,
      baseDefault: d.baseDefault,
      targetDefault: d.targetDefault,
      userMatchesBaseDefault: userConfig.get(d.name) === d.baseDefault,
    }));

  const newSinceBase = diff.added
    .filter((c) => !userConfig.has(c.name))
    .map((c) => c.name);

  return { affectedRemoved, affectedDefaultChanged, newSinceBase };
}
```

- [ ] **Step 4: Run, expect pass; commit**

```bash
cd apps/slipgate-app && bun test src/lib/version-diff/
git add apps/slipgate-app/src/lib/version-diff/
git commit -m "feat(slipgate): version-diff composition over @qw/version-resolution"
```

### Task 5.2: VersionDiffViewer component

`ParsedConfig.cvars` (from the existing config parser) IS the user-config Map — pass it through directly.

**Files:**
- Create: `apps/slipgate-app/src/components/VersionDiffViewer.tsx`
- Modify: `apps/slipgate-app/src/components/ClientsTab.tsx`

- [ ] **Step 1: Component**

```tsx
// apps/slipgate-app/src/components/VersionDiffViewer.tsx
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listWarehousedVersions } from "../lib/quake-dir/warehouse";
import { computeVersionDiff, computeUserConfigImpact } from "../lib/version-diff/computeDiff";
import { loadEzQuakeCvarsWithEnrichment } from "../lib/config/loaders/ezquake";

interface Props {
  client: string;
  userConfig: Map<string, string> | null;
}

export default function VersionDiffViewer(props: Props) {
  const [versions] = createResource(() => listWarehousedVersions(invoke));
  const cvars = Array.from(loadEzQuakeCvarsWithEnrichment().values());

  const versionsForClient = createMemo(() =>
    (versions() ?? []).filter((v) => v.client === props.client),
  );

  const [base, setBase] = createSignal<string | null>(null);
  const [target, setTarget] = createSignal<string | null>(null);

  const diff = createMemo(() => {
    const b = base(); const t = target();
    if (!b || !t) return null;
    return computeVersionDiff(cvars, b, t);
  });

  const impact = createMemo(() => {
    const d = diff();
    if (!d || !props.userConfig) return null;
    return computeUserConfigImpact(props.userConfig, d);
  });

  return (
    <div class="space-y-4 p-4 border border-base-300 rounded">
      <h3 class="text-lg font-semibold">Version diff</h3>
      <div class="flex gap-2 items-center">
        <label>From:</label>
        <select class="select select-sm" onChange={(e) => setBase(e.currentTarget.value || null)}>
          <option value="">Select base version</option>
          <For each={versionsForClient()}>{(v) => <option value={v.version}>{v.version}</option>}</For>
        </select>
        <label>To:</label>
        <select class="select select-sm" onChange={(e) => setTarget(e.currentTarget.value || null)}>
          <option value="">Select target version</option>
          <For each={versionsForClient()}>{(v) => <option value={v.version}>{v.version}</option>}</For>
        </select>
      </div>

      <Show when={diff()}>{(d) => (
        <div class="space-y-3">
          <Section title={`Added in ${d().target}`} count={d().added.length}>
            <For each={d().added.slice(0, 50)}>{(c) => <li class="font-mono text-sm">{c.name}</li>}</For>
            <Show when={d().added.length > 50}>
              <li class="text-xs text-base-content/60">+ {d().added.length - 50} more</li>
            </Show>
          </Section>

          <Section title={`Removed by ${d().target}`} count={d().removed.length}>
            <For each={d().removed}>{(c) => <li class="font-mono text-sm">{c.name}</li>}</For>
          </Section>

          <Section title="Default changed" count={d().defaultChanged.length}>
            <For each={d().defaultChanged}>{(dc) => (
              <li class="text-sm">
                <span class="font-mono">{dc.name}</span>:{" "}
                <span class="text-error">{dc.baseDefault}</span> →{" "}
                <span class="text-success">{dc.targetDefault}</span>
              </li>
            )}</For>
          </Section>

          <Show when={impact()}>{(i) => (
            <div class="border-t border-base-300 pt-3 space-y-2">
              <h4 class="font-semibold">Impact on your config</h4>
              <Show when={i().affectedRemoved.length > 0}>
                <div>
                  <span class="badge badge-warning">{i().affectedRemoved.length}</span>{" "}
                  cvars in your config will be removed: {i().affectedRemoved.join(", ")}
                </div>
              </Show>
              <Show when={i().affectedDefaultChanged.length > 0}>
                <div>
                  <span class="badge badge-info">{i().affectedDefaultChanged.length}</span>{" "}
                  cvars will silently behave differently:
                  <ul class="ml-4 mt-1 space-y-1 text-sm">
                    <For each={i().affectedDefaultChanged}>{(c) => (
                      <li>
                        <span class="font-mono">{c.name}</span>{" "}
                        (you: {c.userValue}, was: {c.baseDefault}, now: {c.targetDefault})
                        <Show when={c.userMatchesBaseDefault}>
                          <span class="ml-2 badge badge-warning badge-xs">silent</span>
                        </Show>
                      </li>
                    )}</For>
                  </ul>
                </div>
              </Show>
            </div>
          )}</Show>
        </div>
      )}</Show>
    </div>
  );
}

function Section(props: { title: string; count: number; children: any }) {
  return (
    <details class="border border-base-300 rounded">
      <summary class="px-3 py-2 cursor-pointer">{props.title} ({props.count})</summary>
      <ul class="px-4 py-2 space-y-1">{props.children}</ul>
    </details>
  );
}
```

- [ ] **Step 2: Mount in ClientsTab**

Below `<VersionWarehouse>`:

```tsx
<VersionDiffViewer
  client="ezquake"
  userConfig={parsedConfig()?.cvars ?? null}
/>
```

`parsedConfig()` is whatever signal already holds the parsed user config in the tab — `ParsedConfig.cvars` is `Map<string, string>` directly. No adapter.

- [ ] **Step 3: Manual smoke**

Run dev mode. Pick two warehoused versions. Confirm:
- Added/Removed/Default-changed sections populate.
- Impact panel surfaces real cvars from the user's config.
- The known case `cl_fakeshaft` (default 0 → 1 between 3.6.9 and head) shows up as a default change with the "silent" badge if the user's value matches the base default.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/VersionDiffViewer.tsx \
        apps/slipgate-app/src/components/ClientsTab.tsx
git commit -m "feat(slipgate): VersionDiffViewer with user-config impact"
```

### Task 5.3: Polish + final verification

- [ ] **Step 1: Full type + test pass**

```bash
cd apps/slipgate-app && bunx tsc --noEmit && bun test
cd ../qw-oracle && npm --no-workspaces run typecheck
cd ../../packages/qw-version-resolution && bun test && bunx tsc --noEmit
```

Expected: clean across the board.

- [ ] **Step 2: End-to-end manual happy path**

Run `bun run tauri dev`:

1. App opens to Clients tab.
2. First-run reconcile + import: existing exe is hashed; if it matches a warehouse manifest, `index.active.ezquake` reflects it; if not, it gets imported and re-reconciled.
3. Click update — new version downloads, registers in warehouse, swap_active_version installs it. If previous exe was warehoused, no .bak; if foreign, `<quake-dir>/ezquake.bak.exe` exists.
4. VersionWarehouse panel shows the active marker on the new version.
5. Switch back to the older version — active marker moves; no .bak created (warehouse already has the bytes).
6. Delete the older version — vanishes from the panel; blob GC'd.
7. VersionDiffViewer dropdowns populate. Pick two versions. Diff sections render.
8. Impact panel surfaces real cvars from the user's parsed config.

- [ ] **Step 3: Fill out QUAKE-DIR-CONTROL.md**

Replace the Phase 1 stub with full architectural reference. Bring across the design decisions D1-D9 from this plan (this doc becomes the durable home — the plan can be deleted after merge). Sections:
- Architecture overview (warehouse, blobs, manifests, index)
- Active-version concept + reconcile flow
- Swap protocol (foreign-exe heuristic, transactional rename)
- Diff viewer (what data, where it comes from, what user-config impact means)
- Smoke-test protocols for installed + portable modes (carry over Phase 1 stub)
- Migration notes if/when schema_version bumps

- [ ] **Step 4: Final commit**

```bash
git add apps/slipgate-app/docs/QUAKE-DIR-CONTROL.md
git commit -m "docs(slipgate): full QUAKE-DIR-CONTROL.md after Phase 5 ships"
```

**Phase 5 complete.** Slipgate offers a real diff viewer that beats the GitHub release-notes panel for the user's actual question: "what does upgrading mean for my config?"

---

## Self-review against goal

- **Multi-version install:** Phases 2 + 3.
- **Detailed diff viewer:** Phases 4 + 5.
- **Portable mode:** Phase 1.
- **AppData architecture (slipgate-managed warehouse, user's quake dir untouched except via swap):** Phases 1-3.
- **nQuake / existing-install discovery:** Phase 2 reconcile + first-run import.
- **No SQLite on slipgate side:** Phase 4 widens the snapshot; consumers stay snapshot-only.
- **Shared version arithmetic, no consumer drift:** Phase 0 lib.
- **Snapshot delivery for installed users:** explicitly deferred. The current `build-snapshot` regen-and-commit flow is sufficient until slipgate has actual users. Capture this as a future entry in HANDOVER once Phase 5 ships.
- **Clean-room extract:** out of scope.

## What this plan does NOT cover

- **Multi-quake-dir tracking.** Today slipgate tracks one setup. The warehouse model accommodates it (versions warehoused once, swapped into N different quake dirs); UI assumes single primary setup. Multi-dir UI is a follow-up.
- **FTE / KTX / MVDSV in the warehouse UI.** Architecture supports it (`WarehousedVersion.client` is open-ended); UI shows ezQuake only.
- **Automatic snapshot updates.** Slipgate ships with whatever snapshot is in `src/lib/config/data/` at build time. A future "fetch latest oracle snapshot from a URL" feature is outside this plan.
- **Auto-rollback on swap failure beyond what's in version_swap.** Existing rollback restores a foreign backup if the staging rename fails. Power-loss between operations leaves a recoverable state (canonical missing, blob still in warehouse). Production-hardening this is a Phase 3 follow-up if smoke tests reveal it.
- **`gamedir/slipgate/` per-install annotations.** Architecture-discussion item; not in this plan.
- **Cross-machine config sharing keyed on sha256 (D9).** D3+D4 buy the optionality; the feature itself belongs to the slipgate web-services vision arc.
- **Blob-only garbage collector beyond per-delete cleanup.** `delete_warehoused_version` GCs the deleted version's blob if unreferenced. There's no separate "scan for orphan blobs" job — adding one is trivial when needed but YAGNI today.

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-04-26-quake-dir-control.md`. Two execution shapes:

1. **Subagent-driven (recommended)** — fresh subagent per task with two-stage review between tasks. Best for staying clean across 6 phases.
2. **Inline execution** — tasks executed in this session with checkpoints. Faster iteration, more context buildup.

Phases ship independently. After Phase 0 you have a shared version-resolution lib. After Phase 1 you have working portable mode. After Phase 2 you have a content-addressed warehouse + reconcile. After Phase 3 you have the full multi-version UI with single-swap-path. After Phases 4+5 you have the diff viewer. Stop after any phase to assess.
