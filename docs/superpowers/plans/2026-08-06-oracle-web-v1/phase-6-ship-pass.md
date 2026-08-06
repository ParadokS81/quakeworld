# Phase 6 -- ship pass

**Arc:** oracle-web-v1. **Ledger:** `decisions.md` P1-P11 (load-bearing here:
P1 mockup-is-comp + its additive-amendment rule, P3 single-network-call, P4
dumb components / URL-blind seam, P5 read-only/no-backends, P6 dark overlay,
P8 copy locks, P9 doors, P11 deploy target). **Spec:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` D1/D3/D6 + both
2026-08-06 amendment blocks. **Comp:**
`docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7).
**Predecessors:** Phases 1-5 complete on the live URL.

**Path caveat:** `apps/oracle-web` does not exist at drafting time -- every
literal below touching `apps/oracle-web/...` is an **arc-RUN-time literal**.
Literals against the mockup, the spec, DNS, the live oracle endpoints, and this
box's toolchain were smoke-tested read-only at drafting time (2026-08-06);
each carries its evidence inline.

**Comp-relationship framing (P1):** two of this phase's ships -- URL-fragment
deep links and the footer doors -- have NO counterpart in the mockup.
Verified 2026-08-06: the mockup contains zero hash/`location`/`history`
handling -- grep over the file finds no `location`, `hashchange`, or
`pushState` at all (the only "history" hits are the COMMUNITY HISTORY teaser
copy) -- and no footer (the body ends at the `.mockupnote` meta block, which
Phase 4 already rules un-ported). Both ships
are therefore **additive-beyond-comp, demanded by spec D6** ("URL fragment
makes any view shareable (`/#community-memory` in a Discord paste lands
zoomed in)"; "footer doors to sibling surfaces (docs.quake.world, wiki; exact
list at drafting)") -- not deviations from the comp. Per P1's rule they land
as a dated amendment in `decisions.md` (Task 7), never silently. Everything
else in this phase edits copy or attributes without changing the comp's
rendered look.

## Goal

Ship the site: wire D6's URL-fragment deep links over the vocabulary defined
below (open-on-load, update-on-interaction, defined back/forward and
share-paste semantics), add the D6 footer doors to sibling surfaces (exact
list derived at this drafting, live-status verified), run the
a11y/reduced-motion/perf sweep (dialog semantics + focus management added,
keyboard walkthrough, automated static probes from this box, browser-run
Lighthouse checks by the operator -- no headless browser exists on this box,
verified), and close the final copy sweep: the endpoint truth-up (OPERATOR
GATE -- real MCP endpoint verified live at `https://oracle.slipgate.me/mcp`),
the `● ALL LAYERS UP` static-claim ruling, the `cm.solved` copy-consumer
confirmation, and the arc-wide TBD-token drain. The phase -- and the arc --
ends with `https://qw-oracle-web.pages.dev/` ship-ready: every guard-list
item verified ABSENT, `grep -rn "TBD-PHASE"` empty across both the subtree
and this plan directory, the operator's final walkthrough ritual green
(including a real end-to-end agent connection -- D1's success shape), and the
arc-end cold-review package assembled and handed to arc-run.

## The fragment vocabulary (normative -- this phase's D6 contract)

Slugs derive from the P8 display names, lowercased, spaces to hyphens; the
slug->target map lives in `App.tsx` ONLY (P4: components stay URL-blind).
Registry ids (`ef`/`cm`/...) stay internal vocabulary, never in URLs (P8's
layer-number rule extended to ids). The spec's own example fragment
`/#community-memory` predates the P8 rename and is superseded by `#discord`;
no alias ships (no wild links exist pre-launch).

| Fragment | View it lands on / reflects |
|---|---|
| `#brain` | floor 1, rest state (Phase 2 native anchor -- kept) |
| `#machine-room` | floor 2, terminal at boot (Phase 2 native anchor -- kept) |
| `#engine-facts` `#discord` `#concept-notes` `#game-content` | floor 1 + that datacenter's drill card open |
| `#community-history` `#match-stats` | floor 1 + that dormant teaser card open |
| `#connect` | floor 1 + the singular CONNECT YOUR AGENT card (P9; the D1 share target -- deliberately short) |
| `#mcp` | floor 1 + the MCP card |
| `#snapshot-door` | floor 1 + the SNAPSHOT DOOR card |
| `#slipgate-app` | floor 1 + the SLIPGATE APP teaser card |
| `#rack-engine-facts` `#rack-discord` `#rack-concept-notes` `#rack-game-content` `#rack-community-history` `#rack-match-stats` | floor 2 + that rack selected, its SUBSYS card in the terminal, root hot |

**Excluded by design:** no `#why` -- a fragment reaching the why-comparison
overlay would breach P6's dark rule (the overlay must be unreachable at
rest); when the eval arc's captures land, adding `#why` rides that content
drop. No fragments for hover-only surfaces (growth docks, tool-reveal,
station reveals) -- they are states, not views (D6 covers views).

**Semantics (the defined behaviors the plan row demands):**

- **Open-on-load:** after `loadManifest()` resolves and the floors render,
  `App.tsx` reads `location.hash` once; a vocabulary match scrolls the owning
  floor into view instantly (`scrollIntoView({ behavior: 'auto' })` --
  native-anchor-landing semantics, no smooth animation, no new motion
  species) and opens the mapped card/selection through the reduced-style
  instant transition with no origin rect (there is no clicked origin; the
  card appears in place, exactly the P7c reduced path DrillOverlay already
  implements). An unknown hash is a no-op (browser-native behavior).
- **Update-on-interaction:** opening a drill/XN card or selecting a rack
  writes its slug via `history.replaceState`; closing a floor-1 card
  restores `#brain` (rack selection is sticky in the comp -- no deselect, so
  no restore case on floor 2). Scrolling between floors does NOT rewrite the
  hash (no scroll-observer; the hash reflects the last interaction, which is
  what a sharer just did).
- **Back/forward:** `replaceState` only -- in-page interactions create ZERO
  history entries. Back leaves the page (returns to the Discord paste, the
  previous site), exactly as a static page behaves; Back is NOT a
  close-card gesture (esc/X/backdrop close, as shipped). This is the
  defined default -- see Open question 3 for the overrule path.
- **Share-paste:** copying the URL at any moment reproduces the current
  view; `/#discord` pasted in Discord lands with the DISCORD drill card open
  over floor 1 -- D6's sentence, post-rename. Query flags compose
  independently (`/?dev=why#discord` works; `?data=force-fallback` and
  `?dev=why` are untouched by this phase).
- **A `hashchange` listener** in `App.tsx` honors hand-edited hashes after
  load (same mapping, same no-op on unknown). `replaceState` never fires it,
  so interaction writes cannot loop.
- **No-collision rule:** no DOM element may carry an id equal to a
  vocabulary slug (else native anchor scroll fights the handler). The two
  floor sections (`brain`, `machine-room`) are the only sanctioned
  id/slug overlaps -- for them native behavior and the handler agree.

**State lift (resolves `TBD-PHASE-6-fragment-urls`):** Phase 3 left
drill-card state as one narrow signal in `Floor1Brain`; Phase 4 left rack
selection in `Floor2MachineRoom` -- both flagged for exactly this lift. The
signals move up to `App.tsx`; floors become controlled: `Floor1Brain` gets
`card` + `onOpenCard(target, originRect)` / `onCloseCard`, `Floor2MachineRoom`
gets `selected` + `onSelect(id)`. Components still parse no URLs and fetch
nothing (P4 holds); `App.tsx` remains the only `location` reader
(Phase 3 probe A5 extended to assert it).

## The footer-door list (normative -- D6 strip 3, "exact list at drafting")

Derived now, per the plan row. Every status below probed 2026-08-06 from this
box:

| Door | Display | Href | Drafting-time status |
|---|---|---|---|
| Engine reference | `docs.quake.world` | `https://quakeworld-docs.pages.dev/` | `docs.quake.world` does NOT resolve (getent: no answer); pages.dev returns `200`. Display-name/href split carries Phase 1 Open question 4's ruling verbatim -- when vikpe DNS lands, one href edit, no redesign. |
| Wiki | `wiki · coming` (UNLINKED placeholder) | none | Default per ledger P5's literal wording ("wiki placeholder") + D3's register ("wiki (narrative -- coming)"). Evidence for the overrule: `https://wiki.slipgate.me/` is LIVE today -- 301 to `index.php?title=Main_Page`, page title `QuakeWorld Wiki (beta)`. Linking the beta is the operator's public-readiness call (same class as the tester-invite timing, P11) -- Open question 2. |
| Source | `github.com/ParadokS81/quakeworld` | `https://github.com/ParadokS81/quakeworld` | `200` (Phase 4 probe set, re-verified 2026-08-06). Sanctioned repeat of the terminal footer door -- P5 names "GitHub repo doors" in the site's link-out set. |

NOT in the default list: `https://quake.world/` (resolves, GitHub Pages,
`200`) -- live, but D6/P5 name only docs + wiki + repo doors as the sibling
set; adding the apex is an operator EDIT (Open question 2). `wiki.quake.world`
and `oracle.quake.world` do not resolve (probed -- both NO-RESOLVE).

**Placement:** a slim strip after the `#machine-room` section (a third,
auto-height block on the same gradient; scroll-snap `proximity` tolerates a
short tail block). Cornernote register: mono, dim, one row of three doors --
no headings, no legends (P8). Draft copy (operator may EDIT in the S-ritual):
`elsewhere: docs.quake.world · wiki (coming) · github.com/ParadokS81/quakeworld`
with the door prefix `elsewhere:` matching the terminal's `door:` register.
External links `target="_blank" rel="noopener"` (Phase 4's door convention).

## The endpoint truth-up (OPERATOR GATE -- resolves `TBD-PHASE-6-endpoint-truth`)

**The real endpoint, verified live 2026-08-06 from this box:**

- `location /mcp` exists in `/mnt/user/appdata/qw-oracle/nginx.conf`
  (proxy_pass to `mcp:3000`; read-only inspect).
- `curl -si --max-time 8 -X POST https://oracle.slipgate.me/mcp -H
  'Content-Type: application/json' -H 'Accept: application/json,
  text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"initialize",
  "params":{"protocolVersion":"2025-03-26","capabilities":{},
  "clientInfo":{"name":"probe","version":"0"}}}'` returned **HTTP 200**,
  `content-type: text/event-stream`, an `mcp-session-id` header, and
  `serverInfo: { name: "qw-oracle", version: "0.7.0" }` -- a working
  streamable-HTTP MCP initialize **with no Authorization header**, i.e. the
  current auth posture is no-auth.
- **ChatGPT Developer-Mode reach -- now cited, still not end-to-end verified**
  (cold review CR-SPEC-5; the spec amendment asserted this uncited). Per
  OpenAI's own documentation: developer mode gives full MCP client support,
  the supported transports are SSE and streaming HTTP, and the supported auth
  modes are **OAuth, No Authentication, and Mixed** -- so the oracle's
  streamable-HTTP + no-auth posture is a documented-supported combination,
  and reach is open in principle. Sources:
  https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt
  and https://developers.openai.com/api/docs/guides/developer-mode .
  **Caveats the connect card must not paper over:** the toggle lives in
  Workspace Settings -> Permissions & Roles -> Connected Data, availability
  differs by plan tier (Pro/Plus/Business/Enterprise/Edu, web only), some
  custom-connector capability is scoped to admins/authorized developers on
  Enterprise/Edu, and OpenAI community threads report friction reaching the
  custom-connector settings. Net: the steps are written FROM VENDOR DOCS, not
  from a run we performed -- S11 verifies the Claude path only. Label it
  accordingly (Task 4) and verify opportunistically at tester-invite time.
- Bare `GET /mcp` returns 400 `Invalid or missing session ID` -- correct
  transport behavior, not an outage (the health check is `/health` -> 200
  `ok`, also probed).
- `oracle.quake.world` does NOT resolve (getent: no answer) -- the mockup's
  endpoint URL is a dead address today; the quake.world domain awaits the
  vikpe DNS ask, which P11 scopes OUTSIDE this arc.

**The decision the operator must make (gate -- Open question 1 states the
default):** the mockup ships `Endpoint (illustrative in this mockup):
https://oracle.quake.world/mcp` in the CONNECT card (line 277, where the URL
appears twice -- headline + the CLI paste-prompt) and the sibling in the
terminal boot card (line 876). Shipping that string means the page's central
CTA hands testers a URL that cannot work. Default: truth up all three copy
sites to `https://oracle.slipgate.me/mcp` and DROP the `(illustrative in
this mockup)` marker -- the connect card then works end-to-end (D1's success
shape) from the day the operator shares the preview URL. When
`oracle.quake.world` DNS lands, one copy commit swaps the string (grep-able:
the URL literal appears only in `XnCards.tsx` + `TerminalTopics.tsx`).
This is a copy deviation from the comp -> dated P8 amendment (Task 7),
operator-ruled, never silent.

## Inputs from previous phase

From Phase 5 -- drafted concurrently; referenced ONLY as inert tokens,
resolved at the plan coherence pass:

- **`TBD-PHASE-5-portrait-layout`** -- the portrait projection is live on the
  deploy; this phase's S-ritual re-checks fragments/footer under it.
- **`TBD-PHASE-5-portrait-rebuild`** -- the media-change rebuild mechanics;
  the fragment open-on-load handler must not fight it.
- **The scroll-quirk retest outcome** (spec addendum) -- Phase 5 owns and
  records it (its Task 5 / ritual item M11; no token exists for it); this
  phase only carries the recorded result into the arc-end package.

From Phases 1-4 (stable outputs; verify literals at phase start, arc-RUN):

- **Live URL + pipeline**: `https://qw-oracle-web.pages.dev/` serving both
  floors; redeploy = the one command in `apps/oracle-web/DEPLOYMENT.md`.
  Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/`
  -> `200`.
- **Narrow state seams flagged for this phase** (Phase 3 + Phase 4 outputs):
  drill-card signal in `Floor1Brain`, rack-selection signal in
  `Floor2MachineRoom`. Verify the pre-lift shape:
  `grep -c "createSignal" /home/dev/projects/quakeworld/apps/oracle-web/src/components/Floor1Brain.tsx` -> >= 1.
- **Truth-up markers present pre-sweep**: verify
  `grep -rc "oracle.quake.world" /home/dev/projects/quakeworld/apps/oracle-web/src/` -> >= 1 and
  `grep -rc "illustrative" /home/dev/projects/quakeworld/apps/oracle-web/src/` -> >= 1
  (both must read 0 after Task 4 if the default ruling stands).
- **`?dev=why` flag + dark door** (P6, Phase 3 Task 8): unchanged by this
  phase; re-verified in the S-ritual.
- **The five GitHub door URLs** (Phase 4 topic-set table): re-probed in this
  phase's boundary run.
- **Manifest contract**: `cm.threads` / `cm.solved` raw fields live (Phase 1
  amendment 2026-08-06). Copy-consumer status verified AT DRAFTING from the
  phase docs: `cm.threads` feeds the MCP card line (Phase 3 T8) + the
  terminal cm card; **`cm.solved` IS consumed** -- the terminal cm card's
  "threads carry a solved resolution" figure maps to `cm.solved` in Phase
  4's interpolation table, and the formatted counts ride `sub`/`stationSubs`
  on floor 1. The sweep confirms on the live page and records the
  confirmation in `review-findings.md` (Task 5) -- no dangling contract
  field, no future-manifest-surface entry needed unless the live check
  contradicts this.

Drafting-time environment facts (probed 2026-08-06 on this box):

- **No headless browser exists on this box.** `which chromium
  chromium-browser google-chrome chrome playwright lighthouse` -> only
  node/npx shims; no `~/.cache/ms-playwright` (no Playwright browsers
  installed -- the playwright packages in `~/worktrees/telegram-diary-*` and
  the bun cache are library code without browser binaries); `phoenix-chrome`
  (a kasmweb VNC chrome for the phoenix bridge) is NOT running and is a
  desktop-in-a-VNC, not a probe rig. Installing a browser in this container
  is untested (`playwright install --with-deps` needs root apt -- not
  available). **Consequence: every browser-dependent check below is marked
  operator-browser-run; no headless probe literals are claimed.**
- `curl` + `jq` + `git` on PATH (all automated probes below need nothing
  else); `bun 1.3.11` for any pure-module probe re-runs.
- Live-status table above (MCP endpoint, docs pages.dev, wiki beta, DNS
  no-resolves) -- all probed this session, evidence inline where cited.
- TBD-token census (`grep -rn "TBD-PHASE-[0-9]" docs/superpowers/plans/2026-08-06-oracle-web-v1/ | grep -o "TBD-PHASE-[A-Za-z0-9-]*" | sort -u`):
  9 distinct tokens across phases 2-6 at checker time (enumerated in Task 5
  step 1). Task 5 drains ALL of them. The grep pattern is the TOKEN shape
  (`TBD-PHASE-` + digit) -- prose mentions of the convention, including this
  doc's own, deliberately do not match.

## Files touched

**Created (inside `apps/oracle-web/` -- arc-RUN-time):**
- `src/components/FooterDoors.tsx` -- the three-door strip (dumb, static)

**Modified (inside `apps/oracle-web/`):**
- `src/App.tsx` -- fragment map + open-on-load + `hashchange` +
  `replaceState` writes; lifted `card` / `selected` signals; props re-wire
- `src/components/Floor1Brain.tsx` -- card state controlled via props
- `src/components/Floor2MachineRoom.tsx` -- selection controlled via props
- `src/components/DrillOverlay.tsx` -- dialog semantics + focus management
- `src/components/XnCards.tsx` -- endpoint truth-up (2 URL sites + marker)
- `src/components/TerminalTopics.tsx` -- boot-card endpoint truth-up
- `src/styles/app.css` -- footer strip block
- `index.html` -- `lang="en"` on `<html>`, meta description, data-URI favicon

**Modified (outside the subtree -- plan scaffold + ledger, sanctioned):**
- `docs/superpowers/plans/2026-08-06-oracle-web-v1/phase-1-*.md` through
  `phase-6-*.md` -- TBD-token drain (each token replaced by its dated
  resolution line; Task 5. Phase 1's doc is included: it carries
  `TBD-PHASE-2-type-mirroring` at its Outputs section, and the B7 gate
  greps the whole dir)
- `docs/superpowers/plans/2026-08-06-oracle-web-v1/review-findings.md` --
  sweep entries (solved-consumer confirmation, Lighthouse scores, any
  operator EDITs)
- `docs/superpowers/plans/2026-08-06-oracle-web-v1/decisions.md` -- one
  dated amendment block (Task 7)

**Deleted:** none.

## Tasks

Wave structure: T1 first; T2 after T1 (both edit `App.tsx` -- T2's touch is
a one-line footer render insertion, sequenced to avoid a lost-update race);
T3 after T1 (shared file: `Floor2MachineRoom.tsx`, and T3's focus-restore
consumes the invoker ref that T1's lifted open call threads through); T4 is
the operator-gated copy sweep (independent of T1-T3, needs the operator
in-session); T5 after T1-T4; T6-T7 close.

### Task 1 -- fragment deep links: state lift + hash module · `agent (workhorse, high)`

**Goal:** the vocabulary table above works end to end; `App.tsx` is the only
URL-aware module (P4).

**Files:** `src/App.tsx`, `src/components/Floor1Brain.tsx`,
`src/components/Floor2MachineRoom.tsx`.

**Steps:**
1. Lift the two narrow signals into `App.tsx` per "State lift" above; floors
   become controlled components (props in, callbacks out -- no behavior
   change from the user's seat; drill zoom/close animations, esc handling,
   rack `sel`/`hotroot` all keep their Phase 3/4 mechanics).
2. The slug map: one `const FRAGMENTS: Record<string, View>` table in
   `App.tsx` transcribing the vocabulary table -- 18 entries total (16
   view-openers + the 2 floor anchors' pass-through). Both directions: view->slug for interaction
   writes, slug->view for load/hashchange reads.
3. Open-on-load per the Semantics block: run once after the manifest
   resource resolves (cards render manifest data -- opening before resolve
   would show an empty card); instant transitions, no origin rect.
4. Interaction writes: `history.replaceState(null, '', '#' + slug)` on card
   open / rack select; restore `#brain` on floor-1 card close. NEVER
   `pushState` (the defined back/forward semantics).
5. `hashchange` listener (App-level, removed on cleanup) applying the same
   mapping for hand-edited hashes.
6. Honor `reduced` (P7c): fragment-opened cards use the instant path
   unconditionally (step 3) -- already reduced-safe by construction.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && for s in engine-facts discord concept-notes game-content community-history match-stats connect mcp snapshot-door slipgate-app rack-discord rack-match-stats; do grep -rlq "\"$s\"\|'$s'" dist/assets/ && echo "YES  $s" || echo "NO   $s"; done && grep -rn "location.hash\|hashchange\|replaceState" src/components/ src/generators/ ; echo "components-url-blind exit=$?"

Expect: tsc + build clean, twelve `YES`, final grep zero hits (`exit=1`) --
URL handling lives in `App.tsx` only. Browser-level deep-link behavior is
operator-run (S1-S3): fragments never reach the server (this is WHY
fragments, not paths -- a static CF Pages bundle needs no `_redirects`
machinery), so `curl` cannot exercise them and no headless browser exists on
this box (environment facts).

### Task 2 -- footer doors · `agent (workhorse, low)` -- after Task 1 (shares `App.tsx`)

**Goal:** the D6 strip-3 footer exists per the normative list above.

**Files:** `src/components/FooterDoors.tsx`, `src/App.tsx` (render after
floor 2), `src/styles/app.css` (one labeled block).

**Steps:**
1. `FooterDoors.tsx`: static dumb component -- the three doors exactly as
   the list table rules them at run time (docs door display/href split per
   Phase 1 OQ4's ruling; wiki as unlinked placeholder text unless Open
   question 2 is overruled; repo door). `target="_blank" rel="noopener"` on
   real links.
2. CSS: `/* ===== FOOTER DOORS (additive -- spec D6 strip 3, no comp
   counterpart) ===== */` -- auto-height strip, cornernote register (mono,
   dim `#6b7f96`-class tones from the mockup's `.cornernote`/`.ft`
   vocabulary), continues the page gradient (no new background), NOT a
   `section.floor` (no `min-height: 100svh`, no snap-align -- a short tail
   block under `proximity` snap).
3. No aria surprises: it is a `<footer>` landmark with an
   `aria-label="Doors to sibling surfaces"`.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && grep -c "quakeworld-docs.pages.dev\|wiki\|ParadokS81/quakeworld" dist/assets/*.js && curl -s -o /dev/null -w 'docs:%{http_code}\n' https://quakeworld-docs.pages.dev/ && curl -s -o /dev/null -w 'repo:%{http_code}\n' https://github.com/ParadokS81/quakeworld

Expect: grep >= 3, `docs:200`, `repo:200` (drafting-time observations:
both 200).

### Task 3 -- a11y sweep: dialog semantics, focus, page chrome · `agent (workhorse, medium)` -- after Task 1

**Goal:** keyboard and screen-reader behavior worthy of a shipped page. The
mockup carries the a11y floor already ported (aria-labels, `role="button"`,
`tabindex`, `:focus-visible`, reduced-motion); this task adds the overlay
focus discipline the comp lacks -- attribute/behavior-only changes, no
visual delta (P1-safe).

**Files:** `src/components/DrillOverlay.tsx`, `index.html`,
`src/components/Floor2MachineRoom.tsx` (one attribute).

**Steps:**
1. `DrillOverlay`: `role="dialog"` + `aria-modal="true"` on the card (the
   `aria-label` prop already names it -- Phase 3); on open, focus moves to
   the close button; on close, focus returns to the invoking element (the
   originRect source element ref -- thread it through the lifted open call);
   a minimal focus trap (Tab/Shift-Tab cycle within the card while open).
   Esc handling already exists (Phase 3).
2. `index.html`: `<html lang="en">`; one-line meta description (draft, ops
   may EDIT in the ritual: `The QW Oracle -- 30 years of QuakeWorld
   knowledge, routed to your agent or API. See what it knows, then connect
   your agent.` -- tagline-derived, P8-conformant); a data-URI SVG favicon
   (kills the console 404; no network request -- P5-clean). Open question 5
   covers the overrules.
3. `Floor2MachineRoom`: `aria-live="polite"` on the terminal `.body` so rack
   selection announces the loaded card to screen readers (attribute only).
4. Re-verify (no re-add) the P7c guards: `.sig`/`.fire`/`i.on.bl` animation
   kills and instant transitions are already in `app.css` (Phases 2-4);
   the S-ritual re-runs the behavior checks.

**Verification probe (arc-RUN):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm run check && pnpm build && grep -c 'role="dialog"\|aria-modal' src/components/DrillOverlay.tsx && grep -c 'lang="en"' index.html && grep -c 'aria-live' src/components/Floor2MachineRoom.tsx

Expect: tsc + build clean; three greps >= 1 each. Behavioral focus checks =
S5/S6 (operator-browser-run -- no headless browser on this box).

### Task 4 -- final copy sweep · `inline` -- OPERATOR GATES LIVE HERE

**Goal:** every deferred copy question closed by the operator, edits applied,
nothing silent.

**Files:** `src/components/XnCards.tsx`, `src/components/TerminalTopics.tsx`
(the endpoint copy sites); `review-findings.md` (sweep entries + EDIT log).

**Steps (walk with the operator, one item at a time, in-session):**
1. **Endpoint truth-up (the gate).** Present "The endpoint truth-up" section
   verbatim -- evidence, default (real endpoint
   `https://oracle.slipgate.me/mcp` at all three copy sites, `(illustrative
   in this mockup)` marker dropped), consequence of the alternative (a
   dead-address CTA). On ruling: apply to `XnCards.tsx` (agent-card headline
   + CLI paste-prompt) and `TerminalTopics.tsx` (boot card); the CLI
   prompt's question text and client steps stay byte-identical otherwise.
1b. **Per-client honesty labeling (cold review CR-SPEC-5).** The connect
   card lists client paths we have NOT all executed. Rule for the shipped
   copy: steps we have run end to end (Claude connector / CLI agent, proven
   at S11) read as instructions; the **ChatGPT Developer-Mode** path is
   written from OpenAI's documentation and must not imply we tested it --
   keep its wording procedural and vendor-sourced, and do not promise a
   plan tier or a menu path the vendor docs hedge (availability varies by
   plan; some custom-connector capability is admin/Enterprise-scoped; the
   settings path has reported friction -- see environment facts for the two
   citations). If the operator wants a stronger claim, it needs a real
   ChatGPT run first, which is a tester-invite-time action, not a
   ship blocker.
2. **`● ALL LAYERS UP`** (Phase 4 Open question 3, queued here). Default:
   stays byte-identical static copy (P1; it is a badge, not data, and must
   render on the baked fallback too). Overrule = manifest-derived variant =
   finding + P1 amendment (comp has no such state) -- do not implement
   without that amendment.
3. **`cm.solved` consumer confirmation.** Confirm on the live page that the
   terminal cm card renders the solved figure from `cm.solved` and floor-1
   DISCORD strings carry the formatted count (Phase 4 interpolation table +
   Phase 1 amendment). Record the confirmation as a sweep entry in
   `review-findings.md` (the field HAS a copy consumer; only if the live
   check contradicts this does it become a
   record-as-future-manifest-surface finding).
4. **Footer copy + wiki ruling** (Open question 2) and the **meta
   description / favicon** defaults (Open question 5) -- present, apply
   EDITs verbatim.
5. **Copy-lock re-read (P8):** with the operator, spot-scan the live page
   for the locked names (DISCORD / CONCEPT NOTES everywhere; no
   "Community Memory"/"Curated Synthesis"; no L1/L2/L3 user-facing; no
   "brain barrier"). Automated assist:

       cd /home/dev/projects/quakeworld/apps/oracle-web && grep -rioE "community memory|curated synthesis|brain barrier|layer [123]|\bL[123]\b" dist/assets/ | grep -v "sourceMappingURL" ; echo "copy-locks exit=$?"

   Expect zero hits (`exit=1`). (`L1`-pattern false positives from minified
   identifiers are possible -- inspect any hit before calling it a
   violation.)

**Verification probe (arc-RUN, post-ruling with the default):**

    cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && grep -rc "oracle.quake.world" dist/assets/ | grep -v ":0" ; echo "quakeworld-endpoint-gone exit=$?" ; grep -rc "illustrative" dist/assets/ | grep -v ":0" ; echo "illustrative-gone exit=$?" ; grep -rc "oracle.slipgate.me/mcp" dist/assets/ | grep -v ":0" | head -1

Expect: first two `exit=1` (strings absent), last grep >= 1 file carrying
the real endpoint. If the operator overrules to keep the aspirational URL,
this probe inverts -- record the inversion with the ruling.

### Task 5 -- TBD drain + guard-list sweep · `inline`

**Goal:** zero TBD tokens anywhere; every guard-list item verified ABSENT.

**Steps:**
1. **TBD drain.** For every remaining `TBD-PHASE-*` token in
   `docs/superpowers/plans/2026-08-06-oracle-web-v1/` -- checker-time census,
   9 distinct: `TBD-PHASE-2-type-mirroring` (lives in the Phase 1 doc),
   `TBD-PHASE-3-brain-port`, `TBD-PHASE-3-overlay-flag`,
   `TBD-PHASE-4-machine-room-port`, `TBD-PHASE-4-root-travelers`,
   `TBD-PHASE-5-portrait-layout`, `TBD-PHASE-5-portrait-rebuild`,
   `TBD-PHASE-6-endpoint-truth`, `TBD-PHASE-6-fragment-urls` (re-census at
   run time; any addition resolves against its owning phase) -- replace
   the token text in place with its dated resolution -- e.g.
   `TBD-PHASE-6-endpoint-truth` -> `resolved 2026-08-XX (Phase 6 T4):
   endpoint = <ruling>`; `TBD-PHASE-2-type-mirroring` -> `resolved (Phase 2):
   hand-mirrored manifest-types.ts` -- so each phase doc still reads
   truthfully as history. Also sweep the subtree:
   `grep -rn "TBD" apps/oracle-web/src/` must be empty (no marker ever
   belonged in code; this catches strays).
2. **Guard-list absence greps** (D6 guard: NO contributor sections, NO
   admin/corpus-state detail, NO auth, NO forms; P5: no analytics, one
   endpoint):

       cd /home/dev/projects/quakeworld/apps/oracle-web && grep -rioE "<form|<input|type=.password|contributor|sign.?up|log.?in|admin" dist/ | grep -v "sourceMappingURL" ; echo "guard exit=$?"
       grep -rioE "gtag|googletagmanager|plausible|umami|posthog|hotjar" dist/ ; echo "analytics exit=$?"
       grep -rc "fetch(" --include="*.ts" --include="*.tsx" /home/dev/projects/quakeworld/apps/oracle-web/src/ | grep -v ":0"

   Expect: first two `exit=1` (zero hits; inspect any minified-identifier
   false positive before ruling); last shows exactly ONE file
   (`src/data/manifest.ts`) with one `fetch(` -- the P3/P5 single-call
   audit at source level.
3. **P6 re-check:** why-door absent at rest is a runtime state -- S9 covers
   it in the browser; the bundle-presence half
   (`grep -rlq "WHY DO I NEED THIS?" dist/assets/`) must still hit (the
   overlay rides the bundle, dark).

**Verification probe (the token-zero gate):**

    cd /home/dev/projects/quakeworld/docs/superpowers/plans/2026-08-06-oracle-web-v1/ && grep -n "TBD-PHASE-[0-9]" README.md decisions.md review-findings.md phase-*.md ; echo "drain-set exit=$?"
    grep -rn "TBD" /home/dev/projects/quakeworld/apps/oracle-web/src/ ; echo "src exit=$?"

Expect: both `exit=1` (empty) -- the arc's every-TBD-resolved gate.

Two scoping rules, both learned the hard way (this gate has now been caught
unsatisfiable twice -- findings F7(d) and cold review CR-GATE-1):

1. **Pattern = the TOKEN shape** (`TBD-PHASE-` + digit), not bare
   `TBD-PHASE`, so prose mentions of the convention do not self-trip the
   grep.
2. **Scope = the DRAIN SET only** -- `README.md`, `decisions.md`,
   `review-findings.md`, and the six `phase-*.md` docs; explicitly NOT the
   whole directory. Review artifacts (`coherence-pass.md`,
   `REVIEW-BRIEF.md`, `cold-review-*.md`) quote real token shapes as
   evidence and are historical records, not live plan surface: they are
   never drained, so a whole-dir grep can never return empty no matter how
   completely the arc finishes its work. Scoping to the drain set is what
   makes the gate a real gate rather than a permanent red light.

### Task 6 -- perf probes + deploy + boundary run · `inline`

**Goal:** the final bundle deployed; automated boundary probes green;
operator S-ritual staged.

**Steps:**
1. Redeploy: `set -a; . ~/.secrets/cloudflare-pages.env; set +a; pnpm --dir
   /home/dev/projects/quakeworld/apps/oracle-web run deploy`.
2. Automated perf probe (transfer-size budget; this box's instrument is
   curl -- Lighthouse is operator-browser-run, environment facts):

       for a in $(curl -s https://qw-oracle-web.pages.dev/ | grep -o '/assets/[^"]*' | sort -u); do curl -s -H 'Accept-Encoding: br,gzip' -o /dev/null -w "%{size_download}\t$a\n" "https://qw-oracle-web.pages.dev$a"; done

   Budget (target, not a lock): compressed JS+CSS total <= 250 KB -- a
   SolidJS page with no runtime deps beyond solid-js should sit far under;
   exceeding it = finding + investigate before ship (grug: measure first).
3. Run boundary probes B0-B8 below; stage the operator S-ritual (hand over
   the live URL + the checklist + the fragment paste-set).
4. Commit the subtree + plan-doc edits at green probes; push.

### Task 7 -- decisions amendment + arc-end package assembly · `inline`

**Goal:** the additive ships recorded per P1's rule; the cold reviewer's
package defined and handed to arc-run.

**Steps:**
1. One dated amendment block in `decisions.md` (under P8, cross-referencing
   P1): fragments vocabulary (D6-demanded, comp-lacking, additive), footer
   doors (D6 strip 3, list as ruled), endpoint truth-up (as ruled -- the one
   comp-copy deviation), a11y dialog/focus additions (attribute-only).
2. Assemble the arc-end review package (contents = "Outputs to arc-end
   review" below) and hand to arc-run for the cold spec-vs-shipped
   walkthrough + the operator's final walkthrough. Tag at ship:
   `git tag -a arc-oracle-web-v1-shipped -m "oracle-web v1 live at
   qw-oracle-web.pages.dev"` pushed at the next checkpoint (repo git
   convention).

## Phase-boundary verification

### Automated probes (arc-RUN; run in order; each YES/NO)

0. **B0 -- regression baseline re-run** (Phase 5's Outputs hand this phase
   the arc's accumulated probe set as its baseline; this phase's state-lift
   refactor touches the very surfaces those probes pin): re-run Phase 3
   A1-A5 **as amended by Phase 5**, Phase 5's own automated probes
   A2/A3/A4/A6 (the portrait set), and Phase 4 probes 1-6 -- all green
   before any phase-6-specific probe is read -- YES/NO.

1. **B1 -- build + types + deploy serve:**

       cd /home/dev/projects/quakeworld/apps/oracle-web && pnpm build && pnpm run check && curl -s -o /dev/null -w '%{http_code}\n' https://qw-oracle-web.pages.dev/

   Expect clean + `200` -- YES/NO.

2. **B2 -- fragment vocabulary in the shipped bundle** (Task 1 probe's
   twelve-slug loop against `dist/assets/`, plus the deployed asset:
   `ASSET=$(curl -s https://qw-oracle-web.pages.dev/ | grep -o '/assets/[^"]*\.js' | head -1); curl -s "https://qw-oracle-web.pages.dev$ASSET" | grep -c "snapshot-door"` >= 1, chunk-split fallback per Phase 2 probe 2) -- YES/NO.

3. **B3 -- components stay URL-blind** (Task 1's zero-hit grep:
   `location.hash|hashchange|replaceState` in `src/components/` +
   `src/generators/` -> empty; plus the Phase 3 A5 re-run **in its
   Phase-5-amended form** -- the amended pattern including the `matchMedia`
   conjunct, so environment reads stay in `App.tsx` alongside URL reads ->
   empty) -- YES/NO.

4. **B4 -- all outbound doors live** (footer set + Phase 4's five GitHub
   landmarks + the manifest URL + the MCP endpoint):

       for u in "https://quakeworld-docs.pages.dev/" "https://github.com/ParadokS81/quakeworld" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/scripts/extractors" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/scripts/load-chat" "https://github.com/ParadokS81/quakeworld/tree/main/apps/qw-oracle/curated/concept-notes" "https://oracle.slipgate.me/snapshots/brain-manifest.json"; do echo "$(curl -sI -o /dev/null -w '%{http_code}' --max-time 15 "$u")  $u"; done
       curl -s --max-time 8 -o /dev/null -w 'mcp-initialize:%{http_code}\n' -X POST https://oracle.slipgate.me/mcp -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}'

   Expect seven `200` + `mcp-initialize:200` -- YES/NO. Drafting-time
   observations 2026-08-06: six of the seven URLs green (docs pages.dev +
   the five GitHub landmarks) and the MCP initialize 200; the manifest URL
   (`.../snapshots/brain-manifest.json`) is an **arc-RUN-time literal -- 404
   at drafting/checker time** (Phase 1 has not executed; expected 200 once
   Phase 1 ships and publishes). (Plus the wiki door IF Open question 2
   linked it: `https://wiki.slipgate.me/` -> 301 to Main_Page, observed at
   drafting.)

5. **B5 -- guard-list + analytics + single-fetch greps** (Task 5 step 2
   literals, all three) -- YES/NO.

6. **B6 -- copy locks + endpoint truth** (Task 4 step 5 grep zero; Task 4
   boundary probe per the ruling) -- YES/NO.

7. **B7 -- TBD-token zero** (Task 5's two greps, run verbatim: the DRAIN SET
   -- README + decisions + review-findings + the six phase docs -- on the
   token-shape pattern `TBD-PHASE-[0-9]`, plus src on bare `TBD`; both
   empty). Review artifacts are out of scope by design; see Task 5's two
   scoping rules -- YES/NO.

8. **B8 -- a11y statics + perf budget:** Task 3's three attribute greps
   >= 1 each on the deployed bundle
   (`curl -s .../$ASSET | grep -c 'aria-modal'` >= 1;
   `curl -s https://qw-oracle-web.pages.dev/ | grep -c 'lang="en"'` >= 1);
   Task 6's transfer-size loop within budget -- YES/NO.

### Operator ship ritual (browser-run -- this box has no browser; final walkthrough on the live URL)

Every line YES/NO (EDITs applied verbatim then re-checked); any NO = finding
in `review-findings.md`, fix-or-amend before the arc closes.

- **S1 deep-link paste set:** open each in a FRESH tab -- `/#discord`
  (floor 1, DISCORD drill card open), `/#connect` (CONNECT YOUR AGENT card),
  `/#machine-room` (floor 2, boot terminal), `/#rack-match-stats` (floor 2,
  MATCH STATS rack selected, its `no power` card loaded, root hot),
  `/#engine-facts`, `/#snapshot-door`. Each lands on the right view,
  instantly, no animation flash, no console error.
  **Then repeat two of them on a real phone** (any two -- one floor-1 card,
  one rack), plus a footer-door glance: fragments must land correctly in the
  portrait projection too (Phase 5's shipped layout). This absorbs what was
  a separate mobile ritual item -- it eyeballs the same surface, so it is
  one answer, not two (cold review, operator-load consolidation). A phone
  failure here is a finding against THIS phase's fragment wiring, not a
  reopening of Phase 5's projection.
- **S2 update-on-interaction + round-trip:** click through stations/cards/
  racks -- the URL bar tracks the vocabulary; copy the URL mid-exploration,
  paste in a fresh tab -- same view. Esc-closing a floor-1 card restores
  `#brain`.
- **S3 back/forward semantics as defined:** open several cards, press Back
  ONCE -- the browser leaves the page (no card-close-by-back, no history
  spam); Forward returns to the last-reflected view.
- **S4 footer:** the strip renders after floor 2 in cornernote register;
  docs door opens the docs site; repo door opens GitHub; wiki renders per
  the Open-question-2 ruling; no layout shift, snap behavior unharmed.
- **S5 keyboard-only journey:** Tab reaches every interactive surface in a
  sane order (hero CTA, six stations, gate, agent, snapshot nodes, docks,
  racks, terminal links, footer doors); Enter/Space activates; the
  `:focus-visible` ring is visible throughout.
- **S6 overlay focus management:** opening any card moves focus to the
  close button; Tab cycles inside the card only; Esc/X/backdrop close
  returns focus to the element that opened it.
- **S7 reduced-motion re-run** (P7c; Phase 3 V12 + Phase 4 F8 condensed):
  with OS reduce-motion on, reload -- zero pulses/flicker/travelers on both
  floors; cards and rack selection instant; fragment deep links still land
  correctly.
- **S8 guard-list eyeball:** scroll the whole page -- no contributor
  language, no admin/corpus-state surface, no auth, no form controls,
  nothing collecting anything (D6 guard, P5).
- **S9 P6 re-check:** no why-door at rest anywhere; `/?dev=why` shows the
  pill and the overlay works; `/?dev=why#discord` composes.
- **S10 Lighthouse** (Chrome DevTools > Lighthouse, on the live URL,
  desktop + mobile runs): record all four scores in `review-findings.md`.
  Targets: Performance >= 90, Accessibility >= 95, Best Practices >= 95
  (targets, not locks -- a miss is a finding with the report attached, then
  fix-or-accept with the operator).
- **S11 the D1 success shape, for real:** connect an actual agent (Claude
  connector or a CLI agent) using EXACTLY the shipped connect-card steps and
  endpoint string; ask one of the card's first questions; a cited answer
  comes back. This is the arc's product claim tested end to end. **Scope
  honesty:** this verifies the Claude / CLI path. The ChatGPT
  Developer-Mode path ships documented-per-vendor-docs but UNVERIFIED by us
  (see environment facts + Task 4's labeling rule); it is not a blocker
  here, and it gets checked opportunistically at tester-invite time. Record
  which client actually passed in the arc-end package -- never let "an agent
  connected" stand in for "every listed client works".

## Outputs to arc-end review

The cold reviewer (arc-run dispatches; four-verdict walkthrough) receives:

- **The live site:** `https://qw-oracle-web.pages.dev/` (+ the latest
  per-deployment alias from `wrangler pages deployment list`).
- **The contract chain:** spec
  `docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md` (D1-D7 + both
  amendments + addendum); comp
  `docs/superpowers/specs/2026-08-05-oracle-web-v1-mockup.html` (v4.7);
  `decisions.md` P1-P11 + the Task 7 amendment block; the parking doc
  (Arc B parent).
- **The plan trail:** README + all six phase docs (TBD-drained, so every
  token reads as its dated resolution) + `review-findings.md` complete
  (F-entries + sweep entries + Lighthouse scores + operator EDIT log).
- **The deviations register** for the spec-vs-shipped walk: Phase 3 D-a
  through D-e, Phase 4 D-f/D-g, Phase 5 D-h (ambient-cadence restart on
  orientation flip) and D-i (one CTA pill at rest), plus this phase's
  additive set (fragments, footer, endpoint truth-up as ruled, a11y
  attributes) -- everything sanctioned; anything else the reviewer sees
  differing from comp/spec is a reviewable finding.
- **Probe evidence:** B0-B8 transcripts (incl. the guard-list absence greps
  and the TBD-zero greps) + the S-ritual answer sheet.
- **Review charge:** walk spec D1-D7 + amendments against the live page;
  verify the guard list ABSENT; verify P6 (dark at rest, works under flag);
  verify the singular connect surface (P9); verdict per arc-run's
  four-verdict scale. The reviewer does NOT re-litigate operator-ruled
  copy (the EDIT log marks those closed).

Post-arc residue (HANDOVER, not review items): the vikpe DNS ask
(`oracle.quake.world` + `docs.quake.world` -> one-commit swaps when they
land); the why-overlay content drop from the eval arc (adds `#why` then);
the tester-invite timing (operator's call, P11); **the docs-web front-page
link to the coverage map** -- spec D2 says docs-web links here instead of
duplicating the map, which shrank the parked docs-web front-page brainstorm
to "compact per-codebase entry strip + link to the brain"; no phase of THIS
arc owns the docs-web side, so it rides the docs-web design pass as a
HANDOVER rider (cold review CR-SPEC-2, which found it ownerless);
**ChatGPT Developer-Mode path verification** at tester-invite time (S11
covers Claude/CLI only).

## Open questions (default + who overrules)

1. **Endpoint truth-up -- OPERATOR GATE (Task 4 step 1).** Default: real
   endpoint `https://oracle.slipgate.me/mcp` at all three copy sites,
   `(illustrative in this mockup)` dropped -- the CTA works today (verified
   live: initialize 200, no-auth, qw-oracle 0.7.0). Overrule: operator only
   -- keeping `oracle.quake.world/mcp` ships a dead address (NO-RESOLVE,
   probed) behind the page's central promise; if kept, the illustrative
   marker MUST stay and S11 cannot pass as written (record the exception).
2. **Wiki footer door: placeholder vs live beta link.** Default: unlinked
   `wiki · coming` (ledger P5's literal word; public-readiness of the beta
   is the operator's timing call). Overrule: operator -- evidence for
   linking: `wiki.slipgate.me` is live (301 -> Main_Page, title "QuakeWorld
   Wiki (beta)", probed 2026-08-06). Same ruling point may add
   `quake.world` (live, 200) to the list -- default excludes it (not in
   D6/P5's named set).
3. **Back/forward: replaceState-only (no history entries).** Default as
   specified in Semantics -- zero history pollution, Back always leaves the
   page; simplest contract that satisfies D6 (shareability, not history
   choreography). Overrule: operator -- the alternative (pushState on card
   open so Back closes cards, phone-back-button friendly) is a behavior
   change within this phase's latitude if ruled before Task 1 lands; after
   that it is a finding.
4. **`● ALL LAYERS UP` stays static** (inherited Phase 4 OQ3, closed here).
   Default: byte-identical static copy (P1; renders on baked fallback).
   Overrule: operator -> finding + dated P1 amendment before any
   manifest-derived variant is built.
5. **Page chrome additions (meta description + data-URI favicon +
   `lang="en"`).** Default: all three ship (invisible-to-comp, standard ship
   hygiene; favicon kills a console 404 without a network request).
   Overrule: operator on the description wording (draft in Task 3) or on
   shipping a favicon at all; `lang` is not optional (a11y).
6. **Fragment slug special case `#connect`.** Default: the one deviation
   from the name-derived rule (`#connect-your-agent` would be the mechanical
   slug) -- it is the share target the arc most wants typed. Overrule:
   operator (mechanical slug instead; one map-line edit).

## Recovery

- **A fragment lands on the wrong view / nothing:** check in order -- slug
  present in the `FRAGMENTS` table? open-on-load running AFTER the manifest
  resource resolves (a pre-resolve open renders an empty card)? a DOM id
  colliding with a slug (the no-collision rule)? `hashchange` listener
  double-firing against a `replaceState` write (it must not -- replaceState
  never fires it; if observed, something is calling `location.hash =`
  directly, which is banned).
- **Deep link scrolls but the card misses its data:** the manifest gate in
  Task 1 step 3 was bypassed -- the fragment handler must be sequenced on
  the resource, not on mount.
- **Focus trap fights the drill zoom or Esc:** the trap listens on the card
  subtree only and must not preventDefault Esc (Esc close is Phase 3's
  document-level listener); focus-restore needs the invoker ref threaded
  through the lifted open call -- if the ref is gone (re-render), fall back
  to the floor section, never `document.body`.
- **State lift regresses drill/rack behavior:** the lift is mechanical
  (signal moves, mechanics stay); any visible change to zoom, esc, sel, or
  hotroot behavior = a port bug against Phases 3/4, not a new design --
  diff against the pre-lift component, fix there.
- **Guard or copy-lock grep hits on minified identifiers:** inspect the hit
  in context before ruling; a genuine hit is a finding (never silently
  allow-listed); a minifier false positive gets the grep pattern tightened
  and the tightening recorded in the probe transcript.
- **A door URL dies at ship time:** footer/GitHub doors follow Phase 4's
  recovery verbatim (fix the target or amend the list operator-approved --
  never deep-link around a landmark). The docs pages.dev door dying is a
  docs-web-side incident: ship may proceed with the door marked down as a
  finding + HANDOVER line, operator's call.
- **MCP initialize probe fails at B4:** the site itself is unaffected (P3:
  the page's only fetch is the manifest) -- but S11 cannot pass. Diagnose
  oracle-side (`qw-oracle-mcp` logs via the deploy proxy); do not ship the
  truth-up copy against a dead endpoint -- hold the gate open and surface to
  the operator.
- **Lighthouse below target:** attach the report to the finding; fix only
  with a measured cause (grug: never optimize without the profile).
  Accessibility misses get fixed, not accepted, unless the operator
  explicitly rules otherwise.
- **TBD drain finds a token this doc did not anticipate** (e.g. a Phase 5
  addition): resolve it against its owning phase's shipped state; if it
  names genuinely unshipped work, that is a finding + operator call (ship
  gap vs scope cut), never a silent deletion.
- **Deploy pipeline failure:** Phase 2's `DEPLOYMENT.md` + Recovery own it
  (auth gate, wrangler version, rollback-by-redeploy).
