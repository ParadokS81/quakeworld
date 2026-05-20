// Cloudflare Worker: serves https://join.slipgate.me/<slug>
//
// Bridges Discord-friendly https URLs to mumble:// URLs. Discord auto-links
// http(s) but NOT custom protocols like mumble://, so a plain mumble:// URL
// in a Discord message renders as un-clickable gray text. The Worker returns
// a tiny HTML page that auto-launches mumble:// via <meta refresh>; clicking
// the link in Discord -> browser -> Worker page -> Mumble client opens.
//
// Why an HTML launch page rather than a 302? Chrome (and others) can block
// raw 302 redirects to non-http schemes; the HTML page with meta-refresh +
// a visible click-here fallback works reliably across browsers.
//
// Stateless by design: any team's slug works without per-team provisioning.
// New team registers in matchscheduler -> channelPath = "Teams/<slug>" ->
// modal shows https://join.slipgate.me/<slug> -> it just works.

const MUMBLE_HOST = 'mumble.slipgate.me';
const MUMBLE_PORT = 64738;
const CHANNEL_PREFIX = 'Teams';

// Conservative slug shape: lowercase alphanumeric + dash/underscore, 1-32 chars.
// Rejects anything else so the page can't be weaponized for arbitrary content.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

function htmlEscape(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function launchPage(slug) {
  const mumbleUrl = `mumble://${MUMBLE_HOST}:${MUMBLE_PORT}/${CHANNEL_PREFIX}/${slug}`;
  const e = htmlEscape;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Joining ${e(slug)} voice...</title>
<meta http-equiv="refresh" content="0; url=${e(mumbleUrl)}">
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0b0b0d; color: #e4e4e7;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
  .card { max-width: 28rem; padding: 2rem; background: #18181b; border-radius: 0.75rem;
          text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
  p { margin: 0.5rem 0; color: #a1a1aa; }
  code { background: #27272a; padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
  a.btn { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem;
          background: #6366f1; color: white; border-radius: 0.5rem;
          text-decoration: none; font-weight: 600; }
  a.btn:hover { background: #4f46e5; }
  .small { font-size: 0.85rem; margin-top: 1.5rem; }
  .small a { color: #818cf8; }
</style>
</head>
<body>
  <div class="card">
    <h2>Joining <code>${e(slug)}</code> voice channel</h2>
    <p>Mumble should open automatically.</p>
    <a class="btn" href="${e(mumbleUrl)}">Launch Mumble</a>
    <p class="small">No Mumble client yet? <a href="https://www.mumble.info/downloads/">Download here</a>.</p>
  </div>
</body>
</html>`;
}

const rootPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Slipgate voice join</title>
<style>:root{color-scheme:dark}body{font-family:system-ui,-apple-system,sans-serif;background:#0b0b0d;color:#e4e4e7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem}.card{max-width:32rem;padding:2rem;background:#18181b;border-radius:.75rem;box-shadow:0 8px 32px rgba(0,0,0,.5)}code{background:#27272a;padding:.1rem .35rem;border-radius:.25rem}p{color:#a1a1aa}</style>
</head><body><div class="card"><h2>Slipgate voice join</h2><p>Use <code>https://join.slipgate.me/&lt;team-slug&gt;</code> to launch Mumble and join your team's voice channel.</p><p>The link is Discord-shareable -- each clicker connects with their own Mumble identity.</p></div></body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Trim slashes; lowercase for case-insensitive slug routing.
    const path = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();

    if (!path) {
      return new Response(rootPage, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    if (!SLUG_PATTERN.test(path)) {
      return new Response(
        'Invalid team slug. Use 1-32 lowercase letters/numbers/hyphens/underscores.',
        { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }

    return new Response(launchPage(path), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  },
};
