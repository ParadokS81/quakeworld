---
paths:
  - "src/css/**"
  - "public/css/**"
  - "public/**/*.html"
  - "public/js/**"
---

# CSS, Layout, and Component Rules

## CSS Units - rem Only
```css
padding: 1rem;        /* correct */
padding: 16px;        /* wrong — except borders/shadows */
border: 1px solid;    /* OK for borders */
box-shadow: 0px 4px;  /* OK for shadows */
```

Tailwind utility classes already use rem: `px-4` = 1rem (not pixels — "padding-x"), `py-2` = 0.5rem.

## Tailwind CSS Build Process
```
Source (EDIT THIS):    src/css/input.css
                              |  (npm run css:build)
Output (NEVER EDIT):   public/css/main.css
```
Custom CSS goes in `src/css/input.css`. Changes to `main.css` are lost on rebuild.

## Sacred 3x3 Grid Layout
The grid structure is immutable. Never modify panel dimensions or positions.
See Pillar 1 for complete layout specification.

## Firebase v11 Modular Imports
```javascript
import { doc, onSnapshot } from 'firebase/firestore';  // correct
import firebase from 'firebase/app';                   // wrong (v8 pattern)
```

## Component Patterns

**Revealing Module Pattern** (existing components, simple state):
```javascript
const ComponentName = (function() {
    let _state = {};
    return { init() { }, cleanup() { } };
})();
```

**Alpine.js Pattern** (availability grid, reactive UI):
```html
<div x-data="componentName()">
    <div @click="handleClick" :class="isActive ? 'bg-primary' : 'bg-muted'">
        <span x-text="label"></span>
    </div>
</div>
```

When to use which:
- Revealing Module: Simple components, existing code, minimal reactivity
- Alpine.js: Availability grid, complex selections, real-time updates with many DOM elements

## Performance
- **Hot paths** (frequent actions): Must use cache or optimistic updates for instant response
- **Cold paths** (one-time actions): Can show loading states
