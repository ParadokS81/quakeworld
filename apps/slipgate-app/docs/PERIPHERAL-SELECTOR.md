# Peripheral Selector — EloShapes Data Source Reference

> **Doc type: external** — Reference documentation for an external data source (EloShapes). The selector itself is built and shipped; this doc exists because the EloShapes API is undocumented and we want the details captured somewhere if we ever need to refresh the bundled data.

## Why we use EloShapes

The Profile tab lets users pick their exact mouse and mousepad from a searchable list. The auto-detected USB bus-reported name (see `SYSTEM-SPECS.md`) only gives us brand-level info ("BenQ ZOWIE Gaming Mouse" — no model). For the exact model, users need a database to pick from.

**EloShapes** (eloshapes.com) is the best source of gaming peripheral data we've found: 1,439 mice + 623 mousepads with rich metadata (shape, weight, sensor, DPI, polling rate, images, dimensions).

## How it's used in Slipgate

The data is **bundled as JSON with the app** — no runtime API calls. Shipped files:
- `src/data/mice.json` — 1,439 EloShapes records (minified)
- `src/data/mice-supplement.json` — 2 manually-added entries
- `src/data/mousepads.json` — 623 EloShapes records
- `src/data/mousepads-supplement.json` — 24 manually-added entries

These are imported at build time into `ProfileTab.tsx` and fed to the `GearSelector` component (searchable modal). Total ~564 KB uncompressed — negligible vs the Tauri runtime.

## How to refresh the bundled data

When EloShapes adds new mice/mousepads and we want to update what Slipgate ships, re-fetch from their public Supabase REST endpoint and regenerate the slim JSON.

### API details

**Base URL:** `https://qyjffrmfirkwcwempawu.supabase.co/rest/v1/`

**Main view:** `products_available_v8` (note the version suffix — has changed from v3 → v8 historically; may change again)

**Required headers:**
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5amZmcm1maXJrd2N3ZW1wYXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NzAyNzgsImV4cCI6MjA0MjM0NjI3OH0.clLm3KrW9nuWtWRgL4VXz2dH0zohot2Q3XqQ1lSRelI
Authorization: Bearer <same key>
```

The anon key is embedded in their frontend JavaScript — it's public, not a secret. Expires 2034.

**Example queries (PostgREST syntax):**
```
# All mice
?general__category=eq.mouse&select=general__brand_name,general__model,mouse__weight,mouse__wireless

# Search by brand
?general__category=eq.mouse&general__brand_name=ilike.*zowie*

# All mousepads
?general__category=eq.mousepad&select=general__brand_name,general__model
```

### Key fields — mice

- `general__brand_name`, `general__model`, `general__handle` (slug/ID)
- `mouse__weight`, `mouse__length`, `mouse__width`, `mouse__height`
- `mouse__wireless`, `mouse__polling_rate`
- `mouse__shape` (symmetrical / ergonomic)
- `mouse__sensor__model`, `mouse__sensor__dpi`
- `general__images` (PNG filenames for product photos)

### Key fields — mousepads

- `general__brand_name`, `general__model`
- `mousepad__speed_rating`, `mousepad__texture`
- `mousepad__surface_material`, `mousepad__base_material`
- `mousepad__width`, `mousepad__length`, `mousepad__thickness`

### Image CDN

Product photos are served from the same Supabase storage bucket:
```
https://qyjffrmfirkwcwempawu.supabase.co/storage/v1/object/public/images/products/
```
Used by `src/components/MouseLayout.tsx` to render real product photos. If EloShapes moves hosts, that constant needs updating.

## Caveats

- **Unofficial API.** Not documented or guaranteed stable. View names have versioned (`v3` → `v8`) so refreshes may require updating the view name in the fetch script.
- **Cloudflare protection.** Don't hammer it. Our use case (manual refresh when rebundling) is fine.
- **No keyboards.** EloShapes doesn't cover keyboards. Slipgate uses a text field with the auto-detected USB name as default, letting users override manually.
- **Rights.** We're bundling their data in our app. For a personal / community tool this is likely fine, but if Slipgate ever commercializes we'd want to contact EloShapes for explicit permission.

## Fallback data source (if EloShapes becomes unavailable)

The QuakeWorld community maintains a smaller hardware repo at:
https://github.com/quakeworld/quake.world-data/tree/main/hardware

- `mice.json` — ~1,157 mice with basic fields (name, wireless, dpi, polling_rate)
- `mousepads.json` — mousepad names
- `keyboard_switches.json` — switch types

Simpler, community-owned, stable. Not as rich but would work in a pinch.

## What's stored per user selection

When a user picks a mouse or mousepad, the selection saves to their profile as:

```typescript
// from src/store.ts — SetupHardware
mouse_model: GearSelection | null;
mousepad_model: GearSelection | null;

// GearSelection shape
interface GearSelection {
  handle: string;   // "zowie-ec2-cw"
  brand: string;    // "ZOWIE"
  model: string;    // "EC2-CW"
}
```

The `handle` is the EloShapes slug, which also serves as the image filename lookup. Minimal data — we don't copy the full mouse record into the profile, we just reference it.
