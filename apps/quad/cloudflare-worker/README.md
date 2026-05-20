# join.slipgate.me -- Cloudflare Worker

Stateless Worker that bridges Discord-friendly `https://join.slipgate.me/<slug>` URLs
to `mumble://mumble.slipgate.me:64738/Teams/<slug>`. Squad members click the https URL
in Discord (Discord auto-links it, unlike raw `mumble://`), the Worker serves a tiny
HTML launch page, and the page fires the `mumble://` handler so the Mumble client opens.

## Why a separate subdomain

The `mumble.slipgate.me` DNS record is Cloudflare-proxy-OFF (grey cloud) because
Cloudflare's HTTP proxy can only proxy HTTP(S) and would break the raw TCP/UDP voice
traffic on port 64738. A Worker needs the hostname proxy-ON to intercept. So `join.` is
a dedicated proxied subdomain alongside the DNS-only `mumble.` record.

## Why an HTML launch page (not a 302)

Chrome and some other browsers can block raw 302 redirects to non-http schemes like
`mumble://`. The HTML page uses `<meta http-equiv="refresh">` plus a visible
click-here fallback, which works reliably across browsers.

## Stateless: no per-team provisioning

Any slug matching `[a-z0-9][a-z0-9_-]{0,31}` is accepted. The Worker substitutes it
into the Mumble URL. New team registers in matchscheduler -> channelPath is
`Teams/<slug>` -> modal shows `https://join.slipgate.me/<slug>` -> it just works.
The Worker doesn't even know teams exist; matchscheduler derives the URL from the
team's existing `mumbleConfig.channelPath` field.

## Dashboard deploy steps (~5 min, one-time)

1. **Add the DNS record.** Cloudflare dashboard -> `slipgate.me` -> DNS -> Add record:
   - Type: `A`
   - Name: `join`
   - IPv4 address: `192.0.2.1` (reserved non-routable; the Cloudflare proxy intercepts
     and routes to the Worker, so the actual IP is irrelevant)
   - Proxy status: **Proxied** (orange cloud)
   - TTL: Auto
2. **Create the Worker.** Cloudflare dashboard -> Workers & Pages -> Create application
   -> Create Worker:
   - Name: `join-slipgate`
   - Replace the Hello World template with the contents of `worker.js`
   - Click **Save and Deploy**
3. **Bind it to the route.** In the deployed Worker -> Settings -> Triggers ->
   Routes -> Add route:
   - Route: `join.slipgate.me/*`
   - Zone: `slipgate.me`
   - Save
4. **Verify.** Open `https://join.slipgate.me/sr` in a browser. You should see the
   launch page; Mumble should pop up and offer to join the `Teams/sr` channel. The
   bare `https://join.slipgate.me/` URL shows a help page.

## Updating the Worker later

- **Dashboard:** Workers & Pages -> `join-slipgate` -> Edit code -> paste new
  `worker.js` -> Save and Deploy.
- **wrangler CLI:** create a second Cloudflare API token scoped
  `Workers Scripts:Edit` + `Workers Routes:Edit` + `Account Settings:Read`,
  add a `wrangler.toml` here, and run `wrangler deploy`.

## Changing the Mumble server host/port

Edit the `MUMBLE_HOST` / `MUMBLE_PORT` constants at the top of `worker.js` and
redeploy. Host migration that changes the subdomain will need this update.
