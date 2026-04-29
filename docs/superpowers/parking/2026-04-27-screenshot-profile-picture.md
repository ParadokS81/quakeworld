# Screenshot POC -> Profile picture generator

**Added:** 2026-04-27 (evening -- surfaced when operator decided to drop the Screenshot POC section from the Clients-Domain surface during Phase 3.5a planning).
**Status:** Future arc; not Phase 3.5a scope. Phase 3.5a removes the Screenshot POC section from the user-facing UI but leaves the `screenshot.rs` Rust command intact and callable. This entry captures the eventual graduation path.
**Verification first:** After 3.5a ships, `grep -rn "capture_screenshot" apps/slipgate-app/src/` should return zero hits in the frontend (no UI calls the Rust command), but `apps/slipgate-app/src-tauri/src/commands/screenshot.rs` should still exist and `capture_screenshot` should still be registered in `lib.rs` handler block. Profile tab should still have its placeholder screenshot slots (per docs/OVERVIEW's Profile description).

### The use case

Profile pictures for slipgate users -- generated from a shipped demo file with standardized scene / map / point-in-time, so flipping through profiles surfaces "different visuals, same scene" depending on each user's video setup (resolution, FOV, texture pack, conchars, HUD, etc.). 1-button-press generates 5 screenshots, replaces or augments the user's profile picture slots.

Operator's stated end-goal 2026-04-27: "for profile pictures, we can press 1 button and it generates 5 screenshots. for all users i our app they will look the same, in terms of same map, point in time etc. from a demo we ship with the app. so when you flip through profiles its the same screenshots just different visuals, depending on users setup."

### Why Profile is the right home

- Output IS profile pictures. The action button should live where the result lives.
- Profile tab already has placeholder slots for screenshots (per docs/OVERVIEW: "Output section -- 'res @ Hz @ FOV' single-liner + screenshot placeholders").
- Closes a feature loop the Profile tab has been signaling for months.
- Alternative homes (MyQuake, Tools) don't fit: MyQuake is "your dir," Tools is for utilities, neither is "your identity."

### Concrete shape (when it lands)

- Profile tab gains a "Generate profile pictures" button near the existing screenshot slots.
- Click -> guard "is ezQuake running? close it first" -> spawn ezQuake with the shipped demo file + slipgate's mailslot puppet IPC -> seek to predefined timestamps -> screenshot at each -> quit ezQuake -> write the 5 PNGs into the user's profile-picture cache -> display in the slots.
- Demo file ships with slipgate (small, GPL-clean, like a 30-second clip on a public-license map; e.g. operator picks a recreated scene from a famous match on dm3 or similar).
- The 5 timestamps capture different scene types: weapon-up close, enemy-engagement, item-pickup, movement, map-overview. So the 5 screenshots collectively give a sense of how the user's full setup looks.

### Preconditions

- Screenshot POC graduates from "internal-only, hardcoded path" to a real feature (per memory `project_slipgate_screenshot_automation`). Today's blockers: hardcoded `C:/Users/Administrator/projects/slipgate-app/assets/screenshots`, fragile timing, untested-at-scale.
- Demo file curation: pick the demo, ship it with slipgate, define the timestamps.
- Profile-tab UI work: the placeholder slots become real, with affordances for replace / regenerate / clear.

### Pressure

Low for now. The screenshot POC works end-to-end on operator's box but isn't user-ready. Profile-picture generation is a polish feature; it shines when slipgate has more users and the profile-card display matters. Until then, parking is fine.

### Related

- HANDOVER: "Phase 3.5a: Absorb Clients tab into MyQuake -> Domains -> Clients" (the phase that drops Screenshot POC from Clients-Domain)
- Memory: `project_slipgate_screenshot_automation` (the existing screenshot POC's design + current state)
- Source: `apps/slipgate-app/src-tauri/src/commands/screenshot.rs` (the Rust command that stays in place)
- Reference: `apps/slipgate-app/docs/OVERVIEW.md` Section  Profile tab (the screenshot placeholder slots that this feature fills)

---
