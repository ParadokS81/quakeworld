# Slipgate App — Health Report

> **Doc type: snapshot** — Point-in-time health report from 2026-04-10. Do NOT maintain in place. If a fresh snapshot is needed, generate a new one rather than editing this.

**What this document is:** A one-shot snapshot of the state of the codebase as of 2026-04-10, after ~1 month of active building. Read it once, pick your battles, then let it get stale — it's not meant to be a living doc. The living doc is `OVERVIEW.md`.

**How to read the severity tags:**
- 🔴 **RISK** — actual bug, real security concern, or user-visible failure mode. Worth fixing soon.
- 🟡 **DEBT** — works but will hurt you when you come back to it. Worth fixing before the next big addition in that area.
- 🟢 **NICE** — cosmetic. Fine to leave.

---

## The honest headline

**This codebase is in surprisingly good shape for ~1 month of vibe coding by a non-coder.** No crashes, no critical bugs, no leaked secrets, types are mostly safe, components are coherent, styling is consistent, and the hard parts (the 2,124-line config parser, the ConfigViewer, the updater) are all thoughtful rather than chaotic.

The problems are mostly:
1. **Debug cruft left behind** — `println!` / `console.log` / orphan files / an unused placeholder command
2. **One hardcoded path that will 100% break on anyone else's machine** — the screenshot POC
3. **A few architectural things that will cost you an afternoon each if you add a second client (FTE, Fodquake)** — specifically the size and wide public surface of `ezquake.rs`, and zero tests for the config parser
4. **A few edge-case safety issues** in the store layer and OAuth flow that will only bite if something weird happens, but that *would* bite hard

Nothing here is a crisis. But there are ~5 things you should clean up before the next big push, and I'll call those out at the end.

---

## 🔴 Risks — fix these soon

### R1. Hardcoded Administrator path in the screenshot POC
**File:** `src/components/ClientsTab.tsx:127`
```
const assetsDir = "C:/Users/Administrator/projects/slipgate-app/assets/screenshots";
```
**Why it matters:** If anyone other than you ever clicks the screenshot button, this line explodes. The POC path assumes a Windows user named "Administrator" with a specific project layout. It's in user-reachable code, not behind a dev flag.

**Fix:** Either remove the button wiring until the POC is productized, or compute the path from `app.path().app_local_data_dir()` / Tauri's dirs API.

---

### R2. The `greet` command is registered and exposed
**File:** `src-tauri/src/lib.rs:9-12, 21`
```rust
#[tauri::command]
fn greet(name: &str) -> String { ... }
```
**Why it matters:** Scaffolding leftover from `create-tauri-app`. Not security-critical (it's just a placeholder function), but it's a surface-area smell — the frontend can invoke it, and any new command added by accident gets that same exposure. Plus it's embarrassing.

**Fix:** Delete the function and remove `greet` from the `.invoke_handler` macro.

---

### R3. Debug `console.log` dumps on every config reload
**File:** `src/App.tsx:113-123`
```
console.log("=== MOVEMENT ===");
console.log(`  ↑${m.forward}  ←${m.moveleft}  ↓${m.back}  →${m.moveright}  jump:${m.jump}`);
// ... 10 more lines
```
**Why it matters:** Fires every time a config is auto-loaded, which is every app start and every time the watcher detects a change. DevTools console fills up with these. Not dangerous, but it's the kind of thing that makes you feel unprofessional if you ever screen-share the app.

**Fix:** Delete those lines or gate them on `import.meta.env.DEV`.

---

### R4. Profile store: corruption or write failure is silent
**File:** `src/store.ts` — `migrateProfile()`, `loadProfile()`, `saveProfile()`
**Why it matters:** Three related issues:
1. **No version field in the schema.** When v3 lands, `migrateProfile()` won't be able to distinguish v2 from v1 except by duck-typing the shape. One bad heuristic and you lose everyone's data. Adding `schema_version: 2` now costs you one line and saves you a headache later.
2. **`saveProfile()` has no error handling.** If the disk is full or the store file is locked, the save fails silently and the user never knows their preferences didn't persist.
3. **Corrupted `profile.json` → silent data loss.** If the JSON is malformed, `loadProfile()` returns a blank default profile and the old data is gone on next save.

**Fix priorities:** Add `schema_version` immediately (cheap, prevents future pain). Wrap `saveProfile` with try/catch + user feedback. Add explicit validation in `migrateProfile` that throws loudly on weird shapes instead of silently falling through to "create default".

---

### R5. OAuth flow has no `state` parameter (CSRF)
**File:** `src/auth.ts:22-28`
**Why it matters:** Standard OAuth 2 wants a random `state` value generated client-side, sent to Discord, and verified when the callback comes back. It prevents a class of attacks where someone tricks the user into completing an auth flow the user didn't start. In practice the risk is **low** here because auth is user-initiated from a desktop app (not a hidden iframe), but it's a well-known best practice and a real auditor would flag it.

**Fix:** Generate a random token, stash it in memory, pass as `state` in the Discord URL, verify in the callback before exchanging the code. ~15 lines of work.

---

### R6. (Borderline) Screenshot fallback scan + `file_name().unwrap()`
**File:** `src-tauri/src/commands/screenshot.rs:246-267`
**Why it matters:** The fallback screenshot finder scans the ezQuake capture dir for any recent `.png`/`.tga`/`.jpg` and copies it to the output dir. If something unexpected ends up in that dir — a symlink, a pre-existing file, a pathological filename — it gets copied without validation, and `file_name().unwrap()` could panic on a weird path. The attack surface is small (an attacker needs write access to the user's ezQuake folder, which means they've already won), but it's a low-quality section of code.

**Fix:** The whole POC wants a rethink before it becomes a real feature, so this is worth flagging but not worth a one-off patch. Downgrade to 🟡 if you prefer.

---

## 🟡 Debt — address before the next big push in each area

### Dead weight to delete (10-minute cleanup)

| What | Where | Note |
|---|---|---|
| `ConfigCategoryBar.tsx` (156 lines) | `src/components/` | Imported nowhere. Unknown origin |
| `TabNav.tsx` (29 lines) | `src/components/` | Imported nowhere. Superseded by `SideNav` |
| `md-5` crate + `verify_md5` function | `Cargo.toml`, `updater.rs:468-485` | `verify_md5` is defined but never called anywhere. If snapshots are supposed to use MD5, that wiring was never completed. Either wire it up or delete both |
| `greet` command | `lib.rs:9-12` | See R2 |

### Duplication that will drift

- **`Row` component is reimplemented in three files** — `ClientsTab.tsx:17-27`, `ProfileTab.tsx:33-43`, `ToolsTab.tsx:6-16`. Same code, three copies. Next style change touches three places. Extract to `components/Row.tsx`.
- **Teamsay/weapon color constants duplicated with slightly different values** — `ConfigDomainBinds.tsx:19-29` and `ProfileTab.tsx:92-102` both define `TEAMSAY_COLORS` / `WEAPON_COLORS`, and the OKLCH values are *different* between the two. That's not just duplication, it's a visual inconsistency bug. Extract to a shared `colors.ts`.
- **PAK header parsing duplicated** — `archive.rs:27, 66, 82-84`. Cheap to fix, one helper function.

### The big structural finding: `ezquake.rs` (2,124 lines)

This is the single thing that will hurt you most if you add a second client (FTE, Fodquake, vkQuake). The file is currently *coherent* — it's all about ezQuake parsing, classification, and launching — but:

1. **Public surface is too wide.** `scanner.rs` and `watcher.rs` both reach into `pub(crate) parse_config()`, `pub(crate) read_config_chain_internal()`, `pub fn config_dir_from_exe()`, `pub fn read_exe_version()`. They're leaking internal abstractions. Every time you refactor the parser, you ripple changes across the backend.
2. **It has 5 clear internal seams** that want to be separate modules:
   - Config parsing / tokenizing (`parse_config`, `extract_exec_refs`, `walk_exec_refs`)
   - QW name rendering (`expand_qw_name`, `qw_byte_to_char`, `qw_byte_color`, `expand_dollar_code`) — totally unrelated to parsing
   - Weapon + teamsay bind classification (`analyze_weapon_binds`, `analyze_teamsay_binds`, ~500 lines of heuristics)
   - Config building (`build_config`, assembles the final struct)
   - Tauri command handlers
3. **Three functions exceed 150 lines** — `analyze_weapon_binds` (~170), `build_config` (~130), `read_config_chain_internal` (~250).

**When it becomes urgent:** The moment you try to add FTE or vkQuake parsing. Today it's fine.

**What to do now:** Nothing — but be aware that "add another client" is a bigger task than it looks because of this.

### Zero tests for the config parser
**Where:** `src-tauri/src/commands/ezquake.rs`
**Context:** `archive.rs` has clean unit tests. `ezquake.rs`, which is the most complex and most user-critical module in the app, has **zero automated tests** — only a print-and-inspect test harness at the bottom of the file that reads a real config and prints results.

You have rich test assets (`assets/sae.cfg`, `ibsen.cfg`, `peppe.cfg`, `bps.cfg`, `phrenic.cfg`, teamsays dir). Turning those into snapshot tests ("this config parses into this expected structure") would catch the "oh no, my fix broke someone else's config" class of regression that's inevitable when you keep refining bind classification.

Not urgent, but it's the cheapest insurance policy in the codebase.

### Weapon bind classifier correctness gaps (new 2026-04-13)
**Where:** `src-tauri/src/commands/ezquake.rs` — `analyze_weapon_binds`
**Context:** The weapon bind classifier has a correct rebind path (Priority 1) and a mostly-correct direct-select path (Priority 2) but uses an assumption-based fire_key heuristic for manual selects. Edge cases (HangTime's `Mouse1 → +rocket` weapon-specific quickfire, weapon-preselect configs, teamsay-dominant binds that also select a weapon) produce wrong classifications. A bug fix on 2026-04-13 replaced the `mouse1_is_primary_fire` filter with an actual-rebind counter, but the deeper model — "what does it actually mean for a key to be a weapon bind?" — needs a rewrite.

**Handoff:** `docs/superpowers/specs/2026-04-13-weapon-bind-classifier-rewrite-handoff.md` documents the current state, known issues, the user's mental model, the weapon-preselect research task, and a phased approach for a fresh session to tackle this properly.

**Related:** the `stateful_commands` list in the Rust parser duplicates a tiny subset of the authoritative ezQuake commands database in `qw-config`. The long-term fix is plumbing the database through to Rust, but that's a bigger refactor.

### No logging infrastructure — `println!` / `eprintln!` scattered
**Files:**
- `watcher.rs:118, 132-139` — config watcher prints state to stdout
- `scanner.rs:317` — `eprintln!` for errors
- `ezquake.rs:1876-2122` — test harness prints
- Plus the `App.tsx` frontend console dumps

**Why it matters:** When something weird happens in production (config watcher fails, updater errors), there's no trail to follow. Users can't tell you what went wrong because there's nowhere for them to look. Today this isn't biting because the app is young and you can reproduce things locally, but as soon as someone else runs it, you'll want a log file.

**What to do:** Adopt `tracing` crate (Rust's standard structured logging), replace `println!`/`eprintln!`, wire to a log file under `app_local_data_dir`. Not a big job, maybe 2-3 hours.

### Updater network code has no retry and no explicit timeout
**File:** `src-tauri/src/commands/updater.rs`
**Why it matters:** One bad wifi moment → "no update available" when there actually is one. Plus if a request hangs, reqwest's default timeout is permissive. Users on flaky connections will see this.

**Fix:** Add `reqwest::Client::builder().timeout(Duration::from_secs(30)).build()`, and a single retry on transient failures.

### Partial download cleanup is unclear
**File:** `updater.rs:698-750`
If the user closes the app mid-download, the `.slipgate-update-download.tmp` file is left in the exe directory. Not dangerous, just messy. Add a cleanup pass on updater start.

### Error handling: frontend silently swallows some failures
- `App.tsx:73-76` — `loadSpecs()` catches and logs; if it fails, the specs signal stays null and the UI shows nothing with no explanation
- `ClientsTab.tsx:220-228` — KTX/MVDSV/QWFWD changelog fetches in a `Promise.all` each return `[]` on failure, so the tab renders as if there's no changelog data (not "failed to load")
- `ConfigViewer.tsx:217-226` — compare bind classification fails silently, leaving stale data

The app has no toast/notification system, so there's no place for these to surface. For a system tray app this is tolerable (users aren't looking at the window), but a small inline error bar near the affected area would close the gap.

### Hardcoded URLs that aren't really constants
- `src/auth.ts:6-8` — `DISCORD_CLIENT_ID`, `REDIRECT_URI`, `CLOUD_FUNCTION_URL`
- `src/components/MouseLayout.tsx:4` — EloShapes CDN base URL

These work fine but they lock you to a single environment. If you ever want a "dev" build pointing at `matchscheduler-staging` (doesn't exist today, but likely to), you'll want these in a config file or `import.meta.env` values.

### ConfigViewer state density — 39 signals and memos in one component
**File:** `src/components/ConfigViewer.tsx`
**Honest assessment:** This isn't a bug, and the component is well-delegated (each `Config*Section` is its own component). But 39 reactive primitives in a single component's body is a lot of state to hold in your head. If you add much more, it'll cross the line from "dense but manageable" to "scary to change."

Natural extraction targets:
- Compare-side state (6-7 signals) → `useCompareState()`
- Category/filter state (6 signals) → `useCategoryFilter()`
- View mode + search + hide-defaults → leave alone, they're simple

Not urgent. Flag for "next time you open ConfigViewer for a real feature."

### Store layer has unused machinery
**File:** `src/store.ts`
`addEquipmentHistory()` is defined and exported but **nothing calls it**. The `equipment_history` field is initialized on new profiles but never appended to. Either wire up a "you changed mouse from X to Y" handler in the gear selector, or delete both the field and the function.

### Screenshot POC timing is hardcoded
**File:** `src-tauri/src/commands/screenshot.rs:192, 214, 228`
5-second wait for demo load, 3-second wait for seek, 2-second wait for file write. On a slow disk or a contested CPU, these could fail or capture the wrong frame. This is a known POC problem and it's marked as such, but if the POC graduates to a real feature, this needs to become event-driven (poll for state changes) rather than timer-driven.

---

## 🟢 Nice — leave these unless you're bored

- Magic numbers for byte conversions (`1_073_741_824.0` etc.) could be `const GiB` but aren't hurting anyone
- `User-Agent` string is always `"slipgate-app/0.1"` instead of pulling from `Cargo.toml` version
- Some `unwrap_or_default()` / `.ok()` chains could preserve error context but aren't causing user-visible issues
- Hardcoded GitHub repo owners in `updater.rs:24-68` — locks to QW-Group org, fine for now
- Icons have no alt text (not critical for a desktop app context)
- `(_: any, i: number)` casts in `ConfigViewer.tsx:177, 198` — cosmetic only
- `Row` children prop is `children?: any` instead of a proper JSX type — cosmetic

---

## What's genuinely in good shape (for balance)

I went in expecting more problems. These things are solid:

- **Type safety is strong.** No `@ts-ignore`, no `@ts-expect-error`, no `as any` casts outside two cosmetic spots. For a month of work by a non-coder, this is better than many professional codebases.
- **No leaked secrets.** No `.env`, no `firebase-service-account.json`, no API tokens in code. Firebase public config is intentionally committed (same as Slipgate web, same as every Firebase web app — those values are designed to be public; security comes from Firestore rules).
- **Styling is coherent.** DaisyUI semantic classes + custom `sg-*` tokens + CSS custom properties + OKLCH. No stray hex values. Minor duplication on color constants but the discipline is there.
- **Event listener hygiene is correct.** Every Tauri `listen()` is paired with `onCleanup()`. No accumulating listeners.
- **State flow is clean.** App → tabs via props, no painful prop drilling, no state duplication across components.
- **Commands are properly isolated.** No race conditions or shared mutable state between Tauri commands.
- **The watcher's Mutex usage is correct** — no deadlock risk.
- **The hard bits are thoughtful.** The `absent=default` cvar resolution, the bind classification heuristics, the exec chain walker with cycle detection, the updater's snapshot-vs-stable channel split, the mailslot IPC for ezQuake — these are the kind of thing that shows someone actually thought about the problem. Lots of vibe-coded apps have breezy feature code and garbage edge-case handling. This one has the opposite.
- **`configMerger.ts` really is pure** as claimed. No hidden mutations, no console logs, no side effects. Easy to test if you ever want to.
- **Package.json is clean.** No unused npm deps.
- **Tray/close-to-tray/sleep-recovery plumbing in `lib.rs`** is well-understood and correct.
- **`archive.rs` has real unit tests with in-memory archive builders.** That's the only Rust module with proper tests, and the pattern is good.

---

## If you only fix five things, fix these

1. **Delete the debug `console.log` dump in `App.tsx:113-123`.** 2-minute fix. Stops the console noise on every config load.
2. **Delete the orphan files:** `ConfigCategoryBar.tsx`, `TabNav.tsx`, `greet` command, `md-5` crate + `verify_md5` function (or wire `verify_md5` up to the snapshot flow if that was the plan). 10-minute cleanup.
3. **Fix or gate the hardcoded Administrator path in `ClientsTab.tsx:127`.** Either remove the screenshot button until the POC is productized, or compute the path correctly. This is the one thing in the codebase that will definitely break when anyone else runs the app.
4. **Add a `schema_version` field to the profile store and wrap `saveProfile` in try/catch.** Cheap insurance against future data-loss bugs. Do it before you ship to anyone.
5. **Extract the duplicated `Row` component** to `components/Row.tsx` and the duplicated `TEAMSAY_COLORS` / `WEAPON_COLORS` to a shared `colors.ts`. Closes two drift sources in one sitting. ~30 minutes.

Everything else can wait. The ezquake.rs split, the config parser tests, the logging infrastructure, the retry/timeout on updater network calls, the OAuth state param — these are all worth doing but they're "next month" work, not "this week" work.

---

*One-shot report. Not meant to be kept in sync with the code — re-run if you want a fresh snapshot. The living map of what's in the app is `OVERVIEW.md`.*
