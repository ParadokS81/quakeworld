# Design Approach - Slipgate App UI

## Core Principle: Share the Slipgate Web Design System

The desktop app's frontend IS web tech (rendered in Tauri's OS webview). This means we use the exact same design stack as Slipgate web:

- **Tailwind CSS 4** -- utility-first styling
- **DaisyUI 5** -- semantic component classes with OKLCH theming
- **OKLCH color ramp** -- from infiniti's Harmonizer export (when ready)
- **CSS custom properties** -- for all themed values

When infiniti finalizes the Harmonizer ramp and primary/secondary hues, both projects consume the same exported CSS variables. Change the theme once, it updates everywhere.

Design system reference docs (in WSL): `\\wsl.localhost\Ubuntu\home\paradoks\projects\quake\slipgate\DESIGN-SYSTEM.md` and `COLOR-PALETTE.md`.

---

## UI Rules

The app is an 820x560 window with a 6-tab vertical sidebar. See `OVERVIEW.md` for the tab layout.

1. **Dense layout** - less whitespace than web. Gamers are used to information-dense UIs.
2. **System-native feel** - respect OS conventions (close-to-tray behavior, tray interaction patterns).
3. **Dark theme primary** - gamers expect dark UI. Support light mode but dark is default.
4. **Monospace for specs** - CPU model, GPU name, resolution, FPS values in monospace font.
5. **Minimal navigation** - tabs in a single panel, not multi-page routing.
6. **Fast open/close** - window should appear/disappear instantly. No loading spinners for cached data.

---

## Theme Configuration

### DaisyUI Theme Setup

```css
/* Use DaisyUI's OKLCH theming */
[data-theme="slipgate-dark"] {
  --p: oklch(65% 0.15 265);    /* primary -- indigo (TBD from Harmonizer) */
  --s: oklch(65% 0.15 180);    /* secondary -- teal (TBD) */
  --b1: oklch(20% 0.02 265);   /* base-100 background */
  --b2: oklch(16% 0.02 265);   /* base-200 */
  --b3: oklch(12% 0.02 265);   /* base-300 */
  --bc: oklch(90% 0.02 265);   /* base-content (text) */
  /* ... full ramp from Harmonizer export */
}
```

### What Changes When the Ramp Arrives

When infiniti exports the Harmonizer ramp:
1. Replace the placeholder OKLCH values above with the real ramp
2. Both Slipgate web and Slipgate App get the same CSS file/variables
3. Components don't change -- they already use `btn-primary`, `bg-base-200`, etc.

This is exactly why the ramp system is powerful: zero component changes when the theme updates.

---

## Open Questions

- [ ] Tray icon: static Slipgate logo or dynamic (color change when in-game, notification badge)?
- [ ] Animation/transitions: keep minimal for performance, or add subtle polish?
