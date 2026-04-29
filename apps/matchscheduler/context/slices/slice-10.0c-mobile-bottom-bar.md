# Slice 10.0c: Mobile Bottom Bar Functionality

## 1. Slice Definition

- **Slice ID:** 10.0c
- **Name:** Mobile Bottom Bar -- Tab Switching, Week Navigation, Drawer Toggles
- **User Story:** As a mobile player in landscape mode, I can use the bottom bar to switch between content tabs (Calendar, Teams, Players, Tournament, Matches), navigate weeks, and open left/right drawers, so that I have full app navigation without needing the desktop divider row or side panels.
- **Success Criteria:**
  - Bottom bar renders icon-only tab buttons for all 5 tabs (Calendar, Teams, Players, Tournament, Matches)
  - Tapping a tab button calls `BottomPanelController.switchTab()` and highlights the active tab
  - Bottom bar includes left/right hamburger icons that call `MobileLayout.openLeftDrawer()` / `openRightDrawer()`
  - Bottom bar includes prev/next week navigation arrows that call `WeekNavigation.navigatePrev()` / `navigateNext()`
  - Week label between arrows shows current anchor week number and updates on navigation
  - Floating action button (FAB from Slice 5.0b) repositioned above bottom bar on mobile
  - Desktop layout is 100% unchanged -- all changes gated behind mobile detection
  - All bottom bar interactions respond in <50ms (pure DOM/state, no backend calls)

## 2. PRD Mapping

```
PRIMARY SECTIONS:
- Section 6.8 (Responsive Design): Bottom bar merges divider tabs with week navigation for mobile
- Section 6.1-6.7 (UI Patterns): Tab switching, navigation controls adapted for mobile touch

DEPENDENT SECTIONS:
- Slice 10.0a: CSS foundation + HTML skeleton (bottom bar container already exists) [OK]
- Slice 10.0b: MobileLayout.js drawer open/close API [OK]
- Slice 5.0a: BottomPanelController.switchTab() + divider tab infrastructure [OK]
- Slice 2.1: WeekNavigation state manager (navigatePrev/navigateNext) [OK]

IGNORED SECTIONS (deferred to later sub-slices):
- 10.0d: Touch swipe gestures for drawers, drag-select on touch grid
- 10.0e: Right drawer tabs (Fav/Div filtering), toast repositioning polish
```

## 3. Full Stack Architecture

```
FRONTEND COMPONENTS:

NEW -- MobileBottomBar.js (Revealing Module Pattern)
  - Firebase listeners: none
  - Cache interactions: none
  - UI responsibilities:
    - Render bottom bar content: drawer toggles, tab icons, week nav arrows + label
    - Wire tab button clicks -> BottomPanelController.switchTab(tabId)
    - Wire drawer toggle clicks -> MobileLayout.openLeftDrawer() / openRightDrawer()
    - Wire week nav clicks -> WeekNavigation.navigatePrev() / navigateNext()
    - Listen for 'week-navigation-changed' event to update week label
    - Listen for 'bottom-tab-changed' event to sync active tab highlight
    - Respond to MobileLayout breakpoint (show/hide bar content)
  - User actions:
    - Tap tab icon -> switch bottom panel content
    - Tap left hamburger -> open left drawer (team info)
    - Tap right hamburger -> open right drawer (favorites + browse)
    - Tap prev/next arrow -> navigate weeks

MODIFIED -- src/css/input.css
  - Add mobile bottom bar button layout styles
  - Reposition FAB above bottom bar on mobile

MODIFIED -- public/index.html
  - Add <script> tag for MobileBottomBar.js

MODIFIED -- public/js/app.js
  - Call MobileBottomBar.init() after MobileLayout.init()

FRONTEND SERVICES:
- No service changes -- all interactions use existing public APIs

BACKEND REQUIREMENTS:
- None -- purely frontend DOM/UI slice

INTEGRATION POINTS:
- MobileBottomBar -> BottomPanelController.switchTab(tabId) for tab switching
- MobileBottomBar -> WeekNavigation.navigatePrev() / navigateNext() for week nav
- MobileBottomBar -> WeekNavigation.getCurrentWeekNumber() for week label
- MobileBottomBar -> WeekNavigation.onWeekChange() to update week label reactively
- MobileBottomBar -> MobileLayout.openLeftDrawer() / openRightDrawer() for drawers
- MobileBottomBar -> MobileLayout.isMobile() to guard mobile-only behavior
- Listens to 'bottom-tab-changed' CustomEvent (from BottomPanelController) for tab sync
- Listens to 'week-navigation-changed' CustomEvent (from WeekNavigation) for week label
```

## 4. Integration Code Examples

### 4a. MobileBottomBar.js -- Core Module

```javascript
const MobileBottomBar = (function() {
    'use strict';

    let _container = null;
    let _weekLabel = null;
    let _unsubWeekChange = null;
    let _initialized = false;

    // Tab definitions: id, icon, label (for aria)
    const TABS = [
        { id: 'calendar',   icon: '📅', label: 'Calendar' },
        { id: 'teams',      icon: '👥', label: 'Teams' },
        { id: 'players',    icon: '🎮', label: 'Players' },
        { id: 'tournament', icon: '🏆', label: 'Tournament' },
        { id: 'matches',    icon: '⚔',  label: 'Matches' }
    ];

    function init() {
        if (_initialized) return;

        _container = document.querySelector('.mobile-bottom-bar-content');
        if (!_container) {
            console.warn('MobileBottomBar: container not found');
            return;
        }

        _render();
        _wireEvents();

        // Subscribe to week changes for label updates
        _unsubWeekChange = WeekNavigation.onWeekChange(_updateWeekLabel);

        _initialized = true;
        console.log('📱 MobileBottomBar initialized');
    }

    function _render() {
        _container.innerHTML = '';

        // Left drawer toggle
        const leftBtn = _createButton('mobile-bb-left-drawer', '☰', 'Open team info', () => {
            MobileLayout.openLeftDrawer();
        });
        leftBtn.classList.add('mobile-bb-drawer-toggle');

        // Tab buttons
        const tabGroup = document.createElement('div');
        tabGroup.className = 'mobile-bb-tabs';

        const activeTab = BottomPanelController.getActiveTab();
        TABS.forEach(tab => {
            const btn = _createButton(
                `mobile-bb-tab-${tab.id}`,
                tab.icon,
                tab.label,
                () => BottomPanelController.switchTab(tab.id)
            );
            btn.classList.add('mobile-bb-tab');
            btn.dataset.tab = tab.id;
            if (tab.id === activeTab) btn.classList.add('active');
            tabGroup.appendChild(btn);
        });

        // Week navigation group
        const weekGroup = document.createElement('div');
        weekGroup.className = 'mobile-bb-week-nav';

        const prevBtn = _createButton('mobile-bb-week-prev', '◀', 'Previous week', () => {
            WeekNavigation.navigatePrev();
        });
        prevBtn.classList.add('mobile-bb-week-btn');

        _weekLabel = document.createElement('span');
        _weekLabel.className = 'mobile-bb-week-label';
        _updateWeekLabel(WeekNavigation.getCurrentWeekNumber());

        const nextBtn = _createButton('mobile-bb-week-next', '▶', 'Next week', () => {
            WeekNavigation.navigateNext();
        });
        nextBtn.classList.add('mobile-bb-week-btn');

        weekGroup.appendChild(prevBtn);
        weekGroup.appendChild(_weekLabel);
        weekGroup.appendChild(nextBtn);

        // Right drawer toggle
        const rightBtn = _createButton('mobile-bb-right-drawer', '☰', 'Open team browser', () => {
            MobileLayout.openRightDrawer();
        });
        rightBtn.classList.add('mobile-bb-drawer-toggle');

        // Assemble: [Left] [Tabs] [WeekNav] [Right]
        _container.appendChild(leftBtn);
        _container.appendChild(tabGroup);
        _container.appendChild(weekGroup);
        _container.appendChild(rightBtn);
    }

    function _createButton(id, text, ariaLabel, onClick) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'mobile-bb-btn';
        btn.textContent = text;
        btn.setAttribute('aria-label', ariaLabel);
        btn.addEventListener('click', onClick);
        return btn;
    }

    function _wireEvents() {
        // Sync active tab when BottomPanelController changes tab (e.g. from desktop)
        window.addEventListener('bottom-tab-changed', (e) => {
            _setActiveTab(e.detail.tab);
        });
    }

    function _setActiveTab(tabId) {
        if (!_container) return;
        _container.querySelectorAll('.mobile-bb-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
    }

    function _updateWeekLabel(anchorWeek) {
        if (!_weekLabel) return;
        _weekLabel.textContent = `W${anchorWeek}`;
    }

    function cleanup() {
        if (_unsubWeekChange) _unsubWeekChange();
        if (_container) _container.innerHTML = '';
        _weekLabel = null;
        _initialized = false;
    }

    return {
        init,
        cleanup
    };
})();
```

### 4b. CSS for Bottom Bar Layout

```css
/* In src/css/input.css -- inside mobile media query */

/* Bottom bar content layout */
.mobile-bottom-bar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 0 0.25rem;
    gap: 0.125rem;
}

/* Base button style */
.mobile-bb-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;   /* 44px touch target */
    min-height: 2.75rem;
    background: transparent;
    border: none;
    color: var(--muted-foreground);
    font-size: 1rem;
    cursor: pointer;
    border-radius: 0.25rem;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
}

.mobile-bb-btn:active {
    background-color: var(--accent);
}

/* Tab button group */
.mobile-bb-tabs {
    display: flex;
    align-items: center;
    gap: 0.125rem;
    flex: 1;
    justify-content: center;
}

/* Active tab indicator */
.mobile-bb-tab.active {
    color: var(--primary);
    border-bottom: 2px solid var(--primary);
}

/* Week navigation group */
.mobile-bb-week-nav {
    display: flex;
    align-items: center;
    gap: 0.125rem;
}

.mobile-bb-week-label {
    font-size: 0.75rem;
    color: var(--foreground);
    font-weight: 600;
    min-width: 2rem;
    text-align: center;
}

.mobile-bb-week-btn {
    min-width: 2rem;
    font-size: 0.75rem;
}

/* Drawer toggle buttons */
.mobile-bb-drawer-toggle {
    font-size: 1.125rem;
}

/* FAB repositioning above bottom bar on mobile */
.selection-action-btn {
    bottom: 3.5rem; /* 3rem bottom bar + 0.5rem spacing */
}
```

### 4c. index.html Script Tag

```html
<!-- After MobileLayout.js, before app.js -->
<script src="/js/MobileBottomBar.js"></script>
```

### 4d. app.js Integration

```javascript
// After MobileLayout.init():
if (typeof MobileBottomBar !== 'undefined') {
    MobileBottomBar.init();
}
```

### 4e. BottomPanelController Tab Sync

The existing `BottomPanelController.switchTab()` already:
1. Updates `.divider-tab` active states (desktop tabs)
2. Dispatches `'bottom-tab-changed'` CustomEvent

MobileBottomBar listens to this event to sync its own active tab highlight. This means tab state is always consistent between desktop and mobile -- switching tabs on either propagates to both.

Similarly, `WeekNavigation` dispatches `'week-navigation-changed'` which MobileBottomBar listens to for updating the week label. And `WeekNavigation.onWeekChange()` provides a direct callback subscription.

**No modifications needed to BottomPanelController or WeekNavigation.**

## 5. Performance Classification

```
HOT PATHS (<50ms):
- Tab button tap -> BottomPanelController.switchTab(): CSS class toggle + panel content swap
- Week nav tap -> WeekNavigation.navigatePrev/Next(): State update + event dispatch
- Drawer toggle tap -> MobileLayout.openLeftDrawer(): CSS class toggle + transition start
- Active tab highlight update: DOM querySelectorAll + classList.toggle

COLD PATHS (<2s):
- MobileBottomBar.init(): Render ~10 DOM elements, wire event listeners
- Bottom panel content switch (teams/matches tab): Component init + potential data fetch

BACKEND PERFORMANCE:
- N/A -- no backend calls from bottom bar. All interactions are client-side state/DOM.
```

## 6. Data Flow Diagram

```
No Firestore data flow changes -- bottom bar is purely UI navigation.

TAB SWITCH FLOW:
Tap tab icon -> MobileBottomBar click handler
  -> BottomPanelController.switchTab(tabId)
    -> Updates desktop .divider-tab active states
    -> Cleans up previous tab content
    -> Shows new tab content in #panel-bottom-center
    -> Dispatches 'bottom-tab-changed' event
  -> MobileBottomBar._setActiveTab(tabId) [via event listener]
    -> Updates mobile tab icon active highlight

WEEK NAVIGATION FLOW:
Tap ◀/▶ arrow -> MobileBottomBar click handler
  -> WeekNavigation.navigatePrev() / navigateNext()
    -> Updates _anchorWeek state
    -> Calls _notifyListeners() -> all week change callbacks fire
    -> Dispatches 'week-navigation-changed' event
  -> MobileBottomBar._updateWeekLabel(anchorWeek) [via onWeekChange callback]
    -> Updates "W{n}" label text
  -> WeekDisplay / AvailabilityGrid re-render with new week data

DRAWER TOGGLE FLOW:
Tap ☰ left -> MobileBottomBar click handler
  -> MobileLayout.openLeftDrawer()
    -> (See 10.0b data flow for drawer open sequence)

Tap ☰ right -> MobileBottomBar click handler
  -> MobileLayout.openRightDrawer()
    -> (See 10.0b data flow for drawer open sequence)
```

## 7. Test Scenarios

```
FRONTEND TESTS (Manual):
- [ ] Bottom bar shows icon buttons for all 5 tabs on mobile landscape
- [ ] Tapping each tab icon switches bottom panel content correctly
- [ ] Active tab has visual highlight (primary color + underline)
- [ ] Tapping active tab again does nothing (no flicker/re-render)
- [ ] Left ☰ button opens left drawer with team info
- [ ] Right ☰ button opens right drawer with favorites + browse teams
- [ ] ◀ and ▶ arrows navigate weeks correctly
- [ ] Week label shows "W{n}" and updates when navigating
- [ ] Week arrows respect bounds (week 1 min, week 52 max)
- [ ] All buttons meet minimum 2.75rem (44px) touch target
- [ ] No horizontal overflow/scrollbar on bottom bar
- [ ] FAB (floating action button) appears above bottom bar, not behind it

RESPONSIVE TESTS:
- [ ] Desktop (>900px): Bottom bar content renders but bar is hidden via CSS
- [ ] Mobile landscape (<=900px): Bottom bar visible with all controls
- [ ] Resize desktop -> mobile: Bottom bar appears with correct active tab
- [ ] Resize mobile -> desktop: Desktop divider tabs show correct active tab
- [ ] Tab state persists across resize (same tab active on both)

INTEGRATION TESTS:
- [ ] Tab switch via mobile bottom bar -> desktop divider tabs also update active state
- [ ] Tab switch via desktop divider tab -> mobile bottom bar also updates active state
- [ ] Week nav via mobile bottom bar -> grid content updates (both top and bottom grids)
- [ ] Week nav via desktop WeekDisplay arrows -> mobile week label updates
- [ ] Drawer toggle -> correct drawer opens with correct content
- [ ] Drawer open -> bottom bar still visible and interactive below overlay
- [ ] After drawer close -> bottom bar interactions work normally

REGRESSION TESTS (Desktop):
- [ ] Desktop at 1920x1080: Layout identical to before
- [ ] Desktop divider tabs click and work normally
- [ ] Desktop week navigation arrows work normally
- [ ] No console errors from MobileBottomBar on desktop
- [ ] Existing modals, toasts, FAB all unaffected

END-TO-END:
- [ ] Full mobile journey: Open app -> see grid -> tap Teams tab -> see teams browser -> tap Calendar -> see grid -> navigate weeks -> open left drawer -> close -> open right drawer -> close
- [ ] Tab content persists correctly: Switch to Teams, browse, switch to Calendar, switch back to Teams -> content correct
```

## 8. Common Integration Pitfalls

- [ ] **Forgetting to sync tab state bidirectionally** -- Mobile and desktop tab buttons must stay in sync via the `'bottom-tab-changed'` CustomEvent. Both MobileBottomBar and BottomPanelController's `.divider-tab` query must reflect the same active tab.
- [ ] **Not initializing after BottomPanelController** -- MobileBottomBar.init() reads `BottomPanelController.getActiveTab()` for initial state. Must be called after BottomPanelController is initialized.
- [ ] **Week label not updating** -- Must subscribe to `WeekNavigation.onWeekChange()` AND read initial value from `getCurrentWeekNumber()`. Missing either causes stale label.
- [ ] **FAB z-index/positioning conflict** -- FAB must be repositioned above bottom bar on mobile. Use CSS media query to adjust `bottom` property, not JavaScript.
- [ ] **Touch target size** -- All bottom bar buttons must be minimum 2.75rem (44px). Icon-only buttons can appear smaller visually but need adequate tap area.
- [ ] **Bottom bar hidden class interaction** -- The `#mobile-bottom-bar` has `hidden` class on desktop (from 10.0a). CSS media query already shows it on mobile. MobileBottomBar.js should NOT toggle the hidden class -- let CSS handle visibility.
- [ ] **Editing main.css instead of input.css** -- All custom CSS goes in `src/css/input.css`. main.css is auto-generated by Tailwind.
- [ ] **Not cleaning up week change subscription** -- `WeekNavigation.onWeekChange()` returns an unsubscribe function. Must call it in `cleanup()`.

## 9. Implementation Notes

- **Pattern follows:** Revealing Module Pattern per CLAUDE.md. No Firebase, no services, pure DOM + event wiring.
- **Similar to:** SelectionActionButton.js (Slice 5.0b) -- DOM creation, event wiring, viewport-aware positioning.
- **Dependencies:** 10.0a [OK] (HTML container exists), 10.0b [OK] (drawer API), 5.0a [OK] (BottomPanelController), 2.1 [OK] (WeekNavigation)
- **Icon choice:** Using emoji icons (📅👥🎮🏆⚔☰◀▶) for simplicity. No icon library needed. If emojis render inconsistently across devices, can switch to SVG inline icons in 10.0e polish pass.
- **Tab count:** All 5 tabs included. Tournament tab currently shows placeholder. If bar feels cramped during testing, Tournament can be deferred to 10.0e.
- **BottomPanelController.switchTab() already handles:** Desktop `.divider-tab` active class updates, component cleanup/init, event dispatch. MobileBottomBar just calls it and listens for the result.
- **No Escape key handling needed on mobile** -- Deferred. Desktop never shows the bottom bar. Mobile landscape users don't have Escape.
- **Tailwind watcher** must be running for CSS changes to compile.

## 10. Pragmatic Assumptions

- **[ASSUMPTION]**: Emoji icons are sufficient for mobile tab buttons at this stage
  - **Rationale**: Avoids adding an icon library. Emojis render on all modern mobile browsers. Can upgrade to SVG in 10.0e polish.
  - **Alternative**: Inline SVG icons for consistent rendering
- **[ASSUMPTION]**: MobileBottomBar renders its content once on init, not dynamically on enter/exit mobile
  - **Rationale**: The container is hidden/shown by CSS media query. JS only needs to populate it once. Simpler than dynamic render/destroy cycles.
  - **Alternative**: Render on _enterMobile, destroy on _exitMobile via MobileLayout callback
- **[ASSUMPTION]**: FAB repositioning only needs a CSS `bottom` adjustment, not z-index changes
  - **Rationale**: FAB already has appropriate z-index. Just needs to clear the 3rem bottom bar height.

---

## Files Changed Summary

| File | Change Type | Scope |
|------|------------|-------|
| `public/js/MobileBottomBar.js` | **NEW** | ~130 lines -- bottom bar module |
| `src/css/input.css` | Modify | ~50 lines -- bottom bar button layout + FAB repositioning |
| `public/index.html` | Modify | +1 line -- `<script>` tag for MobileBottomBar.js |
| `public/js/app.js` | Modify | +3 lines -- `MobileBottomBar.init()` call |

## Implementation Order

1. Create `public/js/MobileBottomBar.js` with full module (render, event wiring, tab sync, week label)
2. Add `<script src="/js/MobileBottomBar.js"></script>` in `index.html` after MobileLayout.js
3. Add `MobileBottomBar.init()` call in `app.js` after MobileLayout.init()
4. Add CSS for bottom bar button layout in `src/css/input.css` (inside mobile media query)
5. Add CSS for FAB repositioning above bottom bar (inside mobile media query)
6. Test desktop -- verify zero regression
7. Test mobile landscape -- verify all buttons render, all interactions work
8. Test bidirectional sync -- tab/week state consistent across mobile and desktop views
