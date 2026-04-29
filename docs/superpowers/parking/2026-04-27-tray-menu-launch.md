# Tray menu launch

**Added:** 2026-04-27 (evening -- surfaced when operator decided to drop the Launch section from the Clients-Domain surface during Phase 3.5a planning).
**Status:** Optional future arc; no specific trigger. Phase 3.5a removes the Launch section (Server input + Join / Spec / Launch buttons) from the user-facing UI per VISION's "Not a game launcher" framing. This entry captures the natural home if launch ever needs to come back.
**Verification first:** After 3.5a ships, no UI in slipgate spawns ezQuake. Users launch via ezQuake's own desktop shortcut. The `launch_ezquake` Tauri command in `commands/ezquake.rs` stays callable but no frontend code invokes it (except possibly the future Screenshot POC integration when that ships).

### Why Launch was dropped

VISION explicitly: "Not a game launcher. ezQuake handles that. The app can launch ezQuake with arguments, but it does not try to replace the client." The Server-input + Join/Spec/Launch buttons in the Clients tab gave users a quick-connect surface but duplicated functionality available elsewhere (QW Hub website's quick-connect, future `qw://` URL handler, ezQuake's own console). Dropping it shrinks slipgate's responsibility surface to match the stated product positioning.

### When this might come back

Three plausible triggers:

1. **Screenshot POC integration.** When the profile-picture generator ships (HANDOVER entry above), slipgate will need to spawn ezQuake with specific args (load demo, seek to timestamp, screenshot, quit). That uses the same `launch_ezquake` Rust command. If the user-facing surface for that is "click button in Profile," no tray-menu launch is needed; the button does it. If the architecture splits launch into a slipgate-managed surface, the tray menu becomes the home.

2. **Quick-join-from-tray UX desire.** Operator could decide in the future that "right-click slipgate tray -> Quick join -> server-IP-input" is genuinely useful even though VISION says slipgate isn't a launcher. Tray menu fits "invisible until needed" -- visible only when right-clicking the tray icon, doesn't burn UI real estate.

3. **External "Launch in slipgate" deep links.** If hub.quake.world or assets.quake.world ships an "Open in slipgate" button (e.g. for "join this server" or "preview this asset"), slipgate needs an entry point that doesn't require navigating to a specific tab. Tray icon menu OR custom URL protocol handler are the options.

### Why tray over re-adding to a tab

- "Invisible until needed" matches slipgate's tray-app posture.
- Doesn't compete with VISION's "not a launcher" framing because it's not a primary surface; it's a contextual menu attached to the always-visible tray icon.
- Cheap to implement: Tauri v2 tray-menu plumbing already exists in `lib.rs` (per docs/OVERVIEW: "System tray -- show/hide/quit menu, left-click toggles window, right-click menu"). Adding Launch / Join / Spec entries is a small extension.

### Concrete shape (when it lands)

- Tray right-click menu gains: separator -> "Launch ezQuake" / "Join server..." / "Spectate server..."
- "Launch ezQuake" -- spawns the active version directly (no args).
- "Join / Spectate server..." -- opens a small input prompt for IP:PORT, then spawns with the appropriate args. Could reuse the `launch_ezquake` Rust command's existing options.
- No version-picker in tray; launch always uses the active version (`index.json:active`).

### Pressure

None. No specific trigger. Capture this so the natural home is documented if any future need arises.

### Related

- HANDOVER: "Phase 3.5a: Absorb Clients tab into MyQuake -> Domains -> Clients" (the phase that drops Launch from Clients-Domain)
- HANDOVER: "Screenshot POC -> Profile picture generator" (one possible trigger for needing slipgate-side launch back)
- Source: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` (`launch_ezquake` -- the command that stays callable)
- Source: `apps/slipgate-app/src-tauri/src/lib.rs` (existing tray-menu plumbing)
- Reference: `apps/slipgate-app/VISION.md` Section  "Not a game launcher" (the framing that justified the drop)

---
