# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [slipgate-app: 8 TS errors](#slipgate-app-8-ts-errors) — User type + Store API + dead branch. Needs a dedicated session after `feature/qw-config` merges.

---

## slipgate-app: 8 TS errors

**Added:** 2026-04-14 (migrated from memory file `project_slipgate_ts_errors.md` on the same date because it was a todo mislabeled as durable memory)
**Status:** pending, out of scope for the `feature/qw-config` branch
**Verification first:** run `bunx tsc --noEmit` from `apps/slipgate-app/` before starting. Some errors may have been resolved in the meantime. The list below is the snapshot as of 2026-04-13.

The weapon-classifier v2 branch cleaned up the trivial unused-import errors and fixed two runtime-crash bugs, leaving these 8 architectural issues for a follow-up session. They need type-model / API design decisions that don't belong in a weapon-classifier branch.

### Group A — `User` type missing `discord` field (6 errors)

- `src/auth.ts:64` — `Object literal may only specify known properties, and 'user' does not exist in type 'User'` (TS2353)
- `src/components/SettingsTab.tsx:92, 93, 95, 96, 97` — `Property 'discord' does not exist on type 'User'` (TS2339 x5)

**Root cause:** the `User` type definition was updated but consumers were not. `SettingsTab.tsx` reads `user.discord.id` / `user.discord.username` / etc., and `auth.ts` constructs a literal the type no longer accepts.

**Fix approach:** read `src/auth.ts` for the current `User` type. Either re-add the `discord` nested type, or refactor `SettingsTab.tsx` to use whatever replaced it. Couples to the Discord OAuth flow documented in `apps/slipgate-app/docs/AUTH.md`.

### Group B — Store API change (1 error)

- `src/store.ts:132` — `Argument of type '{ autoSave: true; }' is not assignable to parameter of type 'StoreOptions'. Property 'defaults' is missing` (TS2345)

**Root cause:** `StoreOptions` gained a required `defaults` field but the call site was not updated.

**Fix approach:** provide a `defaults` object at the call site (read `store.ts` to see what state is being constructed) or make `defaults` optional. The right answer depends on whether the missing defaults indicate a real bug (silent state loss on first run) or just a redundant type constraint. Couples to `apps/slipgate-app/docs/STATE.md`.

### Group C — Dead branch (1 error)

- `src/components/MyQuakeTab.tsx:30` — `This comparison appears to be unintentional because the types '"drop" | "enter"' and '"cancel"' have no overlap` (TS2367)

**Root cause:** a check against `"cancel"` that can never match the union type. Either dead code to delete, or the union should include `"cancel"`.

**Fix approach:** read `MyQuakeTab.tsx` around line 30 to determine intent. Five-minute fix once intent is clear.
