# Modular Keyboard Panel - Session Handoff Brief

> **For the next session:** This is a PRE-BRAINSTORM brief, not an executable plan. Read it, then kick off `superpowers:brainstorming` to turn it into a design spec, then `superpowers:writing-plans` to produce an implementation plan, then execute. Don't skip to implementation.

**Created:** 2026-04-15
**Status:** Brief only. No spec, no plan, no code.
**Author context:** ParadokS sketched the feature at end of a cleanup session. The three ConfigKeyboardPanel polish items (hook extraction, memo dedupe, CSS vars) were shipped in commits `3668fc9`, `bea3d56`, `0088ed9` to set up runway for this feature.

---

## One-line purpose

Let the right-hand portion of the keyboard visualization swap between three modules (nav + arrows / numpad / mouse) so ConfigViewer can show bindings that today have no keys to highlight. Today the keyboard only shows the main alphanumeric block plus the 6-key nav cluster and arrows.

## Reference screenshots

All three are Windows paths, reachable from WSL at `/mnt/c/...`.

- `/mnt/c/Users/Administrator/Downloads/2026-04-15_10-41.png` - current state of the ConfigViewer keyboard (one config loaded, showing main block + nav/arrows on the right). Pain point: no numpad or mouse, so many real binds (numpad weapon switches, mouse-button fires) have nothing to light up.
- `/mnt/c/Users/Administrator/Downloads/2026-04-15_10-44.png` - the user's mental model: keyboard as two modules. Module 1 = main alphanumeric block (Esc through space row). Module 2 = swappable cluster on the right. Pink outlines drawn on the screenshot mark the two module zones.
- `/mnt/c/Users/Administrator/Downloads/2026-04-15_10-48.png` - the Profile view keyboard (separate code path). Shows how Profile currently lays out main block + nav/arrows + a separate mouse section underneath + a "NuPhy Field75 HE" brand label next to F12. The brand label is what would get shortened to make room for a module-swap toggle on the profile side.

**Read the screenshots first.** The visual intent is clearer from the drawings than from any prose description.

## The user's idea, captured

1. **Modular keyboard.** `KeyboardLayout` gets a swappable right-hand slot. The main alphanumeric block stays fixed. The right slot can render one of three modules: nav cluster + arrow keys (current behavior, the default), numpad, or mouse.
2. **Toggle placement in ConfigViewer.** Above the right-slot area, in the row of F-keys (or near it, visually hinting at which side of the keyboard it controls). One toggle, three options.
3. **Synced across both keyboards in compare mode.** When two keyboards are stacked (compare mode), they show the same module. Toggling the module on one toggles both.
4. **Auto-reveal on selection.** When the user clicks a row in the bind list on the left and the target key lives in a non-active module, the panel should auto-switch to the module that contains that key before highlighting. This means `handleKeyClick` / `buildSelectedIds` need to report which module a key belongs to, and the panel needs an effect watching `selection` that flips the active module when needed.
5. **Profile view also gets modular treatment, but with fewer options.** Profile already has a dedicated mouse section underneath the keyboard, so its right-slot only swaps between nav+arrows and numpad (no mouse option). Toggle lives next to F12 in the brand/model label area; the label text gets shortened to make room.
6. **ConfigViewer right-slot has all three options** (nav / numpad / mouse) because ConfigViewer does NOT have a separate mouse section elsewhere.

## What exists today (as of 2026-04-15)

- **`apps/slipgate-app/src/components/KeyboardLayout.tsx`** - 331 lines. Single shared component consumed by both `ConfigKeyboardPanel` and `ProfileTab`. Uses an absolute-position `LAYOUT` array with `NAV_X = 15.5` as the x-coordinate where the nav cluster starts. Nav cluster (Ins/Hm/PU/Del/End/PD) and arrow cluster are hardcoded at x >= NAV_X, rows 1/3/4/5.
- **`apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`** - 181 lines. Renders one or two `<KeyboardLayout />` instances with a shared toggle bar, owner frame tints, and click-to-pin. Consumes `useKeyboardPanelState` for state.
- **`apps/slipgate-app/src/components/useKeyboardPanelState.ts`** - 117 lines. Hook that owns selection, visibility, category toggles (Movement/Weapons/Teamplay), section-focus memo, and persistence to `ProfilePrefs`. **This is the natural home for the new module signal** - see "Where the new state lives" below.
- **`apps/slipgate-app/src/components/keyboardHighlights.ts`** - 222 lines. Pure helpers: `buildKeyHighlights`, `buildKeyLabels`, `resolveCommandKeys`, `buildSelectedIds`, `identifyKeyCommands`. Also defines `BindSelection` / `BindSelectionItem` types and `HighlightInput`. **New mouse/numpad layout IDs need to be understood here** (specifically in `resolveCommandKeys` / `identifyKeyCommands`, via the new IDs that `toLayoutId` will return).
- **`apps/slipgate-app/src/components/KeyboardLayout.tsx` - `toLayoutId` function** - lives near the bottom of the file. Currently maps ezQuake key names to layout IDs for the main block + nav + arrows. **Needs new cases** for `kp_*` (numpad) and `mouse*` / `mwheel*` (mouse buttons/wheel).
- **`apps/slipgate-app/src/components/ProfileTab.tsx`** - also uses `KeyboardLayout`. Has a separate mouse section underneath. Will need the same right-slot parameterization plus its own module-swap toggle next to F12.

## Where the new state lives (design hint)

The `useKeyboardPanelState` hook was just extracted from ConfigViewer in commit `3668fc9`. Its single responsibility is to own panel-related state. **The new module signal belongs in this hook**, not inline in ConfigKeyboardPanel. Adding it to the hook keeps the panel component stateless and gives ConfigViewer one object that holds all the knobs.

Rough shape (for the brainstorm to refine):

```ts
// useKeyboardPanelState.ts - new additions
type KeyboardRightModule = "nav" | "numpad" | "mouse";
// Hook returns:
//   rightModule: () => KeyboardRightModule
//   setRightModule: (m: KeyboardRightModule) => void      (persists via updatePrefs)
//   availableModules: () => readonly KeyboardRightModule[] (so ProfileTab can get a subset)
```

Plus the new ProfilePrefs field (`config_keyboard_right_module`) and the store migration.

## Design questions for the brainstorm

These are the things the user hasn't decided yet, or didn't explicitly think about. Surface them.

1. **Auto-reveal tie-breaking.** If a selection's target keys live in more than one module (e.g. a teamsay label bound to both F and mouse1), should the panel switch, stay, or prefer one? My default recommendation: "if current module already has a match, stay; otherwise switch to the first module with a match". Prevents ping-pong. User needs to confirm.
2. **Numpad key set.** Which numpad keys to include? The full extended cluster is kp_0-9 + kp_enter + kp_plus/minus/star/slash + kp_dot + kp_home/end/pgup/pgdn/ins/del + kp_numlock. That's ~18 keys. ezQuake's KTX key name conventions for numpad - need to verify by grepping ezQuake's `keys.c` or the config parser. Some engines use `num_0`, some use `kp_0`, some just `0` with numlock state. **This is a research task before coding.**
3. **Mouse key set.** `mouse1`..`mouse5` + `mwheelup` + `mwheeldown` is the usual ezQuake vocabulary. Verify against the parser. How to render them visually? Literal mouse-shape SVG? Simple labeled rectangles like the numpad? Screenshot 2 doesn't show the mouse sketch; this is an open design question.
4. **Profile vs ConfigViewer divergence.** Confirmed: Profile = `["nav", "numpad"]`, ConfigViewer = `["nav", "numpad", "mouse"]`. Should the hook accept the allowed-modules list as input, or should it read it from some config, or should there be two hooks? Simplest: input param on the hook.
5. **Persistence scope.** Does Profile have its own module signal (separate pref field) or does it share one with ConfigViewer? User didn't say. They're two different views of different data - argue for separate fields.
6. **Module sync across the two keyboards in compare mode.** User explicitly wants this. Single signal at the panel/hook level, not per-keyboard. Confirmed.
7. **Toggle UI.** Three buttons? A segmented control? A dropdown? User said "conveniently have the toggle for those modules above in the row of f buttons, so i can switch visually between them on the keyboard side". That sounds like inline buttons above the right-slot, not a dropdown. Brainstorm should settle the exact control.
8. **Default module on first run.** `"nav"` is the only sane default (it's the current behavior). Confirm.

## Scope estimate

Not a same-session task. Rough inventory of work:

- `KeyboardLayout.tsx`: add numpad layout data (~18 keys), mouse layout data (~7 keys), new `rightModule` prop, conditional rendering of the right slot. `toLayoutId` new cases. Maybe 150-200 lines added.
- `ConfigKeyboardPanel.tsx`: new toggle UI row, new prop threading for module + setter + available list. ~40 lines added.
- `useKeyboardPanelState.ts`: new signal, new effect (auto-reveal on selection), new persistence handler, new input field for available modules. ~50 lines added.
- `ConfigViewer.tsx`: pass `availableModules={["nav", "numpad", "mouse"]}` to the hook, thread the new props to the panel.
- `ProfileTab.tsx`: the whole same parameterization on the profile side, its own toggle next to F12, its own persistence (new pref field or shared). This is effectively a second implementation pass.
- `src/store.ts` / `ProfileData` / `ProfilePrefs`: new field(s), default value, migration (silent if new field is just added - check how slipgate handles missing keys on load).
- `app.css`: styling for the new right-slot layout and the toggle control. Semantic color vars already in place from commit `0088ed9`; any new color needs should join them.

Call it 2-3 focused sessions end-to-end (brainstorm; plan; execute in one or two passes).

## Recommended next-session workflow

1. **Read this brief.** Especially the screenshot paths - look at them before anything else.
2. **Verify current state.** `wc -l` the files listed in "What exists today" to confirm nothing drifted. Check `git log --oneline -10` to see if the three cleanup commits are still the tip.
3. **Invoke `superpowers:brainstorming`** with the user. Walk through the design questions above one by one. Output: a design spec in `apps/slipgate-app/docs/superpowers/specs/2026-04-15-modular-keyboard-panel-design.md`.
4. **Invoke `superpowers:writing-plans`** once the spec is settled. Output: an executable plan in `apps/slipgate-app/docs/superpowers/plans/2026-04-15-modular-keyboard-panel.md` (replacing this brief or sitting alongside it).
5. **Execute the plan** in a fresh session (memory `feedback_fresh_context_for_execution.md`: wrap brainstorm, execute in clean context).

## Files the next session should open first

Read these before brainstorming, in this order:

1. The three screenshots (paths above)
2. `apps/slipgate-app/src/components/KeyboardLayout.tsx` - understand the layout array and `toLayoutId`
3. `apps/slipgate-app/src/components/useKeyboardPanelState.ts` - understand where the new state will live
4. `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx` - understand how the panel consumes hook state today
5. `apps/slipgate-app/src/components/ProfileTab.tsx` - understand how profile uses `KeyboardLayout` and where the brand label sits
6. `apps/slipgate-app/src/store.ts` and whichever file owns `ProfilePrefs` - for the new pref field

## Non-obvious facts worth knowing

- The keyboard panel feature was originally implemented per plan `apps/slipgate-app/docs/superpowers/plans/2026-04-14-config-viewer-keyboard-panel.md`. That plan's spec is at `apps/slipgate-app/docs/superpowers/specs/2026-04-14-config-viewer-keyboard-panel-design.md`. Both are useful reference for the patterns used.
- The session ahead of this brief (2026-04-15) ran the three polish items flagged in the ConfigKeyboardPanel wrap-up. The polish was deliberate runway for this feature - `useKeyboardPanelState` exists specifically so the module signal has a clean home. Don't undo that hook and don't move keyboard state back into `ConfigViewer`.
- The `BindSelection` / `BindSelectionItem` types now live in `keyboardHighlights.ts` (commit `bea3d56`). Any new code that touches selection should import from there, not redefine.
- `--sg-kb-selected`, `--sg-kb-owner-you`, `--sg-kb-owner-them` are the semantic keyboard colors in `app.css` (commit `0088ed9`). Any new keyboard-related color should join them, not hardcode OKLCH.
- The `docs/EZQUAKE-RESOLUTION.md` doc explains the absent=default cvar pattern that the config parser relies on - useful if any brainstorming question touches how binds get resolved.
- `src-tauri/` changes auto-rsync to the Windows build mirror via a `PostToolUse` hook. This feature is mostly frontend so it shouldn't matter, but if the brainstorm lands on any Rust-side work, don't relocate slipgate to a worktree - the hook hardcodes the main-tree path.
