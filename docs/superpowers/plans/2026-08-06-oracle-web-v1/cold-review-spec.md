# Cold adversarial review -- spec coverage + world-facing sweep

**Reviewer:** cold subagent, attack surface #3 (REVIEW-BRIEF.md). Inherits
nothing from the planning conversation. Read the spec
(`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md`, D1-D7 + both
2026-08-06 amendment blocks + the addendum) line by line against the six
phase docs' Goal/Ships/Tasks, then enumerated every world-facing claim in the
plan and verdicted it PROBE-COVERED / CITATION-COVERED / NAKED. Did not
re-walk mockup line-citation accuracy, npm registry pins, GitHub door
URLs/MCP endpoint posture, or field-name conformance diffs (REVIEW-BRIEF's
"where not to bother" list -- already checked hard by independent agents).

Findings numbered `CR-SPEC-<n>`, severity MAJOR (plan ships something
wrong/broken) / MINOR (friction, ambiguity) / NOTE.

---

## Half A -- spec coverage table

Legend: **SHIPS** = phase/task that delivers it, verified present in that
doc. **MISSING** = no phase doc or HANDOVER/decisions.md line captures it.
**N/A** = spec item correctly out of this arc's scope (deferred elsewhere,
recorded as such).

### D1 -- tester-invite companion

| Spec demand | Status |
|---|---|
| Connect-your-agent quickstart: MCP endpoint | SHIPS -- Phase 3 T8 `XnCards.tsx` (mcp/agent cards), Phase 4 T3 `boot` terminal card |
| Connect-your-agent quickstart: copy-paste client config snippet | SHIPS -- Phase 3 T8 (CONNECT card, "endpoint + per-client steps + paste-able prompt"), Phase 4 T3 boot card |
| Connect-your-agent quickstart: "what to expect ... and what to do when the oracle doesn't know (redirect_to_human exists)" | **MISSING -- CR-SPEC-1** |
| Read-only, no auth/tickets/playground | SHIPS -- P5 ledger entry; Phase 6 T5 guard-list greps enforce it mechanically |
| Success shape: understands 3 layers in <1 min, sees live coverage numbers, leaves with a working MCP connection | SHIPS (numbers: Phase 2-3; working connection: Phase 6 S11 real end-to-end agent connect) |

### Design direction -- growing brain (recorded, not D-locked)

| Spec demand | Status |
|---|---|
| Brain IS the coverage map, hero content | SHIPS -- Phase 3 |
| IA brain-first with graceful degradation (drillable data, cards/tables fallback) | SHIPS -- Phase 1's registry contract is the degradation-safe data model; Phase 2's skeleton renders it as plain list before Phase 3's visual port |

### D2 -- coverage map on oracle.quake.world; docs-web front page links to it

| Spec demand | Status |
|---|---|
| Site itself exists at the CF Pages URL (proxy for the eventual domain) | SHIPS -- Phase 2 |
| docs-web's front page updated to LINK to it (replacing duplication) | **MISSING -- CR-SPEC-2** (not this arc's file, but also absent from HANDOVER / post-arc residue) |

### D3 -- zoom-stop rule (3 owned levels, level 4 always a door)

| Spec demand | Status |
|---|---|
| 3 levels: datacenters / regions / inventory card | SHIPS -- Phase 3 (stations -> drill cards), Phase 4 (racks -> terminal cards) |
| Engine facts door -> docs.quake.world | SHIPS -- Phase 1 `Door{kind:'site'}`, Phase 3 T7 render, Phase 4 boot/ef door |
| Synthesis + community memory doors -> visitor's agent (literal tool-call rendering, funnels to connect) | SHIPS -- Phase 1 `Door{kind:'agent'}`, Phase 3 T7 |
| Future doors stay honest ("wiki -- coming"); no browsable thread archive | SHIPS -- Phase 6 footer wiki placeholder; no archive feature anywhere in the plan |
| Support-archive "topic threads within topic domains" instinct captured for a future arc, not built here | N/A -- correctly not built; captured in spec prose only, no plan action needed |

### D4 -- open datacenter registry

| Spec demand | Status |
|---|---|
| Render code keys by `id`, open registry, no hardcoded list | SHIPS -- Phase 1 contract, Phase 3/4 "registry grace" (skip + warn) |
| UI names by content (ENGINE FACTS / DISCORD / ...), layer numbers internal-only | SHIPS -- P8, Phase 6 T4 step 5 automated grep for stray L1/L2/L3 vocabulary |
| Federation guardrail: vikpe-platform data queried, never duplicated | N/A for v1 -- only applies once Community History/Match Stats connect to real data (dormant in this arc; nothing to violate yet) |

### D5 -- launch registry (4 lit + 2 dim)

| Spec demand | Status |
|---|---|
| 4 lit: Engine Facts, Community Memory(->Discord), Curated Synthesis(->Concept Notes), Game Content | SHIPS -- Phase 1 |
| 2 dim: Community History, Match Stats, rendered as inspiration not promise | SHIPS -- Phase 1 dormant shape, Phase 3 V5, Phase 4 F2/C6 |
| 920 profile rows stay backstage, no serving surface | N/A -- correctly nothing built (nothing to ship) |

### D6 -- page inventory

| Spec demand | Status |
|---|---|
| Single page, drill panels open in place | SHIPS -- Phase 3/4 |
| URL fragment shareability | SHIPS -- Phase 6 T1 (fragment vocabulary) |
| Strip 1 (explainer + worked trace) | Superseded by 2026-08-06 amendment (why-overlay) -- not a gap |
| Strip 2 (connect quickstart) | SHIPS -- Phase 3/4 |
| Strip 3 (footer doors, exact list at drafting) | SHIPS -- Phase 6 T2, list resolved with live probes |
| Guard: NO contributor sections, NO admin/corpus-state detail, NO auth, NO forms | SHIPS -- Phase 6 T5 mechanical absence greps |

### Naming disposition

| Spec demand | Status |
|---|---|
| Working name QW Oracle, growing-brain hero copy + functional subline | SHIPS -- P8, byte-identical copy locks Phase 3/4/6 |

### D7 -- manifest contract, static site, CORS, refresh mechanics

| Spec demand | Status |
|---|---|
| Static CF Pages site, redeploys only for code | SHIPS -- Phase 2/P3 |
| Manifest fetched from reserved snapshots URL, Cache-Control max-age=300 | SHIPS -- Phase 1 |
| Baked build-time fallback, never an error state | SHIPS -- Phase 2 T3 |
| Update = emit + copy to appdata, no deploy | SHIPS -- Phase 1 T2/T4 (runbook rider) |
| Manifest carries D3 zoom data + counts + inventory + glow/state + history stub | SHIPS -- Phase 1 contract |
| History stub actually consumed by a v1 UI surface | **Dead weight -- CR-SPEC-3** (contract shipped, no renderer anywhere in Phases 2-6) |
| CORS line on snapshots nginx block | SHIPS -- Phase 1 T3 |

### "Remaining for arc-plan" list (spec lines 186-197)

All five bullets (emitter home/shapes/history mechanics; CORS+reload+fallback
wiring; scaffold per federation locks; visual design job sequencing;
harvest-runbook rider) SHIP -- Phase 1 + Phase 2 + Phase 1 T4. No gaps.

### Amendment (2026-08-06) -- visual design exploration outcome

| Spec demand | Status |
|---|---|
| One page, two floors, scroll-snap, one gradient | SHIPS -- Phase 2 |
| Floor 1 neural-circuit brain (full description) | SHIPS -- Phase 3 (T1-T9) |
| Growth docks BOTH sides ("new datacenters dock here" / "future consumers dock here") | SHIPS -- Phase 3 T5 step 7 -- verified both copy lines present |
| Floor 2 machine room as root system | SHIPS -- Phase 4 |
| "Why do I need this?" overlay, structurally present but dark | SHIPS -- Phase 3 T8 `WhyCompare.tsx`, P6 |
| Connect surface singular (hero CTA / YOUR AGENT / MCP card -> one card) | SHIPS -- Phase 3 T8, P9, ritual V8 |
| Client landscape copy (Claude / ChatGPT / CLI / Gemini+Grok excluded) | SHIPS as COPY (byte-ported) but **NAKED as a claim -- see CR-SPEC-5 (Half B)** |
| Copy locks (tagline, no legends, "brain barrier" retired) | SHIPS -- P8, mechanically re-checked Phase 6 T4 step 5 |

### Amendment (2026-08-06) -- why-comparison capture re-homed to eval arc

| Spec demand | Status |
|---|---|
| Comparison capture session moves OUT of this arc | **Verified correctly excluded** -- grepped for capture-session language across all six phase docs; only WhyCompare's ported draftstamp placeholder exists, no phase attempts real capture. P6/Phase 3 T8 treat it as dark-until-fed exactly per the amendment. |

### Amendment addendum (rounds 4.5-4.7)

| Spec demand | Status |
|---|---|
| Naming locks (DISCORD, CONCEPT NOTES) everywhere | SHIPS -- P8, mechanical grep Phase 6 T4 |
| Station label pattern (horizontal centered / vertical side-anchored); MCP tool-reveal beside gate | SHIPS -- Phase 3 T5 step 5, T6 step 3 |
| One-pulse rule + z-order | SHIPS -- Phase 3 P7a/P7b, `journeys.ts` contract |
| First portrait projection (<=900px), scroll-quirk retest on real deploy | SHIPS -- Phase 5 in full, including the Q-rule adjudication |

**Half A summary: 3 findings.** CR-SPEC-1 (MAJOR, missing copy), CR-SPEC-2
(MINOR, missing cross-app HANDOVER item), CR-SPEC-3 (MINOR, unconsumed
contract field). No spec-forbidden content found shipped (D6 guard list and
P5 read-only both hold, mechanically re-verified at Phase 6's boundary).

---

## CR-SPEC-1 (MAJOR) -- "what to do when the oracle doesn't know" / `redirect_to_human` copy is absent from all six phase docs

**Evidence:** spec
`docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md:47-48`: "...what to
expect (and what to do when the oracle doesn't know -- `redirect_to_human`
exists). Not in the parking doc's original sketch; demanded by the frame."
`grep -rn "redirect_to_human\|doesn't know" docs/superpowers/plans/2026-08-06-oracle-web-v1/`
returns zero hits across README, decisions.md, and all six phase docs. Phase
3 T8 (`XnCards.tsx`) and Phase 4 T3 (`TerminalTopics.tsx` boot card) both
port the connect-quickstart copy in detail (endpoint, client steps, first
questions) but neither mentions the failure/redirect path.

**Why it matters:** D1 explicitly flags this as content the tester-invite
frame *demands*, not decoration -- it is literally in the same sentence as
the MCP endpoint and config snippet, which both shipped. A page whose whole
job is "understand the brain, then connect your agent" that never tells a
tester what happens when the agent doesn't know something is missing a piece
of its own stated success shape (trust in a read-only tool depends on honest
failure behavior).

**Minimal fix:** one line in the CONNECT card (Phase 3 T8) or boot terminal
(Phase 4 T3) -- e.g. "when the oracle doesn't have an answer, it says so and
points you to a human (`redirect_to_human`)" -- routed through the existing
operator content-review gate (Phase 4's C-checklist or Phase 6 T4) so it
isn't a silent copy add.

## CR-SPEC-2 (MINOR) -- D2's docs-web front-page link has no owner anywhere in the plan or its HANDOVER

**Evidence:** spec D2 (`design.md:72-80`): "docs-web's front page links to it
instead of duplicating it." `grep -n "docs-web" phase-2-*.md phase-6-*.md
decisions.md README.md` shows docs-web referenced ONLY as a deploy-procedure
precedent (wrangler steps, `DEPLOYMENT.md` shape) -- never as a page needing
an edit. Phase 6's "Post-arc residue (HANDOVER, not review items)" section
(`phase-6-ship-pass.md:663-666`) lists three deferred items (vikpe DNS ask,
why-overlay content drop, tester-invite timing) and does not include the
docs-web link.

**Why it matters:** P10 correctly scopes this arc to `apps/oracle-web` only,
so not shipping the docs-web edit here is fine -- but D2 is a locked spec
decision, and nothing in the plan records it as deferred work. Without a
HANDOVER line, this is the kind of decision that quietly falls off the map
between arcs.

**Minimal fix:** one line added to Phase 6's "Post-arc residue" list: "D2's
docs-web front-page link to oracle.quake.world -- separate app, separate
arc/session."

## CR-SPEC-3 (MINOR) -- the manifest's `history` field has zero UI consumer across Phases 2-6

**Evidence:** `grep -rn "\.history\b\|HistoryEntry" phase-*.md` hits only
inside Phase 1 (contract definition, emitter mechanics, its own boundary
probes) and Phase 2 (type mirroring). No hit in Phase 3's `Floor1Brain.tsx`
tasks, Phase 4's `TerminalTopics.tsx`/`Rack.tsx` tasks, or Phase 6's sweep --
nowhere does any component read `manifest.history` to render a growth trail
or sparkline. REVIEW-BRIEF's own contested-ruling list names this exact
question ("what consumes history in v1 at all -- is it dead weight shipped
on faith?"); this review confirms the answer is yes, nothing does.

**Why it matters:** real engineering cost was spent on this field --
shape-guard logic against old-shape corruption (Phase 1 T1 step 5), a
dedicated boundary probe (probe 3's history-entry validity check), and a
closed-key-set leak-guard special-case (`del(.history[].nums)`, F3 in
review-findings.md) -- for a field nothing in v1 reads. Not spec-violating
(D7 only requires the manifest to *carry* a history stub, not that v1 render
it), so this is not a MISSING finding, but it is unexplained scope: a future
reader hunting for the sparkline that consumes `history` will not find one.

**Minimal fix:** either (a) give it a v1 consumer -- a minimal growth
indicator in a drill card, small enough for Phase 3 or Phase 6 to absorb --
or (b) add one sentence to `decisions.md` P2 or P7 stating history is
forward-provisioning with no v1 renderer, so the gap reads as a decision, not
an oversight.

---

## Half B -- world-facing claims

Verdict key: **PROBE-COVERED** (a named runnable/on-deploy probe exists
against the real system) / **CITATION-COVERED** (a real, checked doc/source
backs the claim) / **NAKED** (confident assertion, no probe, no citation).

| # | Claim | Where | Verdict | Notes |
|---|---|---|---|---|
| 1 | Cloudflare does not edge-cache the `.json` manifest under this nginx config (`cf-cache-status: DYNAMIC`) | Phase 1 boundary probe 9 | **PROBE-COVERED** + independently CITATION-CONFIRMED | Live curl observation at drafting time, re-run at every Phase 1 execution. Cross-checked against Cloudflare's own docs (WebSearch 2026-08-06): CF's default cache-by-extension list excludes `.json`/`.html`, matching the observed DYNAMIC status. Model example for the rest of the plan -- verify by observation, not by assertion, exactly as Phase 1's own comment states. |
| 2 | `nginx add_header ... always` is required for headers to survive non-2xx responses | Phase 1 T3 step 1 | **CITATION-COVERED** | Directly quotes `ngx_http_headers_module` docs' "regardless of the response code" wording, and verifies live (today's 404 carries no configured header without it). Solid. |
| 3 | wrangler v3/v4 both launch on Node 22.12.0 on this box | Phase 2 environment facts | **PROBE-COVERED** (version print only) | `npx -y wrangler@N --version` actually ran at drafting time. The stronger claim -- that a full `pages deploy` succeeds on this Node/wrangler combo -- is untested until Task 5 executes (auth-gated stall, explicitly acknowledged); this is a sanctioned defer-to-execution, not a naked claim. |
| 4 | pnpm@10 blocks dependency postinstall scripts by default; `pnpm approve-builds` is the recovery | Phase 2 Task 2 verification probe | **CITATION-COVERED**, MINOR caveat | Confirmed accurate via WebSearch: pnpm 10 introduced default-blocked lifecycle scripts for dependencies as a supply-chain-security change, with `pnpm approve-builds` as the sanctioned unblock. The plan pins a *floating* `pnpm@10` (not a patch version), and whether the exact failure mode is a warning or a hard error depends on the `strictDepBuilds` default, which has moved between pnpm 10 point releases. Low risk: Task 2's own verification probe (`pnpm install && pnpm exec vite build`) is the actual test, and the documented recovery command is identical regardless of which mode fires. |
| 5 | A SolidJS ternary conditional (`{portrait() ? <Floor1Brain layout={PORTRAIT_LAYOUT}/> : <Floor1Brain layout={DESKTOP_LAYOUT}/>}`) disposes the old branch's reactive scope (rAF loop, timers, listeners via `onCleanup`) and mounts a fresh one on flip | Phase 5 Task 4 step 2; asserted as **P-A** in Phase 5's "Facts asserted on install-time probes" | **NAKED -- CR-SPEC-4 (MAJOR)** | See below. |
| 6 | `matchMedia('(max-width: 900px)').addEventListener('change', ...)` fires reliably on phone rotation across mobile browsers | Phase 5 Task 4 / **P-B** | **Self-flagged unverified, PROBE-COVERED via M10** | The doc itself lists this as "asserted not proven until M10" with a named recovery path. This is honest, appropriately hedged practice -- not a finding, but noted because it shares the same risk shape as item 5 (both gate the same remount mechanism) and a P-B failure would surface through the same symptom (doubled travelers / stuck layout) that a P-A failure produces, making root-cause triage at M10 harder than the doc's linear "check P-A then P-B" recovery order implies. |
| 7 | `scroll-snap-type: y proximity` on `html`, combined with `touch-action: pan-y` and `overflow: visible` on portrait sections, will scroll correctly on real mobile Safari/Chrome | Phase 5's whole Q-rule (Task 5) + the addendum's parked quirk | **PROBE-COVERED**, well-designed | The Q1/Q2 adjudication rule explicitly refuses to assume a root cause and requires real-phone + off-artifact-panel emulation evidence before any code changes. WebSearch cross-check: applying `scroll-snap-type` directly to `html`/`body` is a documented historical WebKit risk class (multiple bugs describing broken body scrolling) -- but the plan already disables snap entirely below 900px / on coarse pointers (Phase 2's 166-168 guard), which sidesteps exactly that risk class on the surfaces where it would bite. This validates the existing design rather than surfacing a new gap. |
| 8 | GitHub landmark doors (`/tree/main/apps/qw-oracle/...`) stay live and stable across refactors | Phase 4 topic-set table + probes 3/4; Phase 6 B4 | **PROBE-COVERED**, repeatedly | curl-verified at drafting time, re-verified at Phase 4's boundary, re-verified again at Phase 6's ship boundary. The "stable landmark" argument is explicitly labeled "an argument, not a guarantee" (Phase 4:242) rather than asserted as fact. Good practice, no finding. |
| 9 | MCP client landscape: Claude connectors (claude.ai/Desktop/Code), ChatGPT Developer Mode (paid, "Settings -> Apps -> enable Developer mode"), CLI self-configure, Gemini/Grok lack custom connectors | Spec amendment (`design.md:240-245`); ported byte-identical into Phase 3 T8 `XnCards.tsx` and Phase 4 T3 boot card | **NAKED -- CR-SPEC-5 (MAJOR)** | See below. |
| 10 | `AbortSignal.timeout(5000)` is baseline browser API, safe with no polyfill | Phase 2 Task 3 | NAKED but trivial | Accurate and uncontroversial (broadly supported since 2022 across evergreen browsers); not worth a finding given zero real risk. |
| 11 | `SVGPathElement.getTotalLength()`/`getPointAtLength()` require the element mounted in the DOM | Phase 3 **P-A**, Phase 4 **P-A** | NAKED but trivial | Standard, well-established DOM API behavior, not project-specific; the plan already builds samplers in `onMount`/post-measurement per this understanding. No finding. |

## CR-SPEC-4 (MAJOR) -- Floor-1 remount-on-rotation relies on an unresearched SolidJS disposal pattern; the framework's own guidance favors a different construct

**Evidence:** `phase-5-mobile-projection.md:414-421` (Task 4 step 2):

    {portrait()
      ? <Floor1Brain layout={PORTRAIT_LAYOUT} ...same props... />
      : <Floor1Brain layout={DESKTOP_LAYOUT} ...same props... />}

...and `phase-5-mobile-projection.md:656-660` ("Facts asserted... P-A"): "a
Solid ternary branch switch disposes the old `Floor1Brain` (running
`onCleanup`: rAF, timers, listeners) and mounts a fresh one. Standard Solid
conditional-rendering behavior, asserted not proven until M10."

WebSearch cross-check (2026-08-06) of SolidJS community discussion and docs:
raw ternary conditionals in JSX are contrasted directly against `<Show>`
specifically on this axis -- "when using ternary operators in JSX component
properties, there can be issues with computations created that may never be
disposed," and "`<Show>` generally provides better control over reactive
scopes, making it more suitable when you need predictable `onCleanup`
behavior." SolidJS's own docs and GitHub discussions treat ternary-vs-`Show`
disposal predictability as a known, named gotcha area -- not settled
"standard behavior" the way the plan's Facts-asserted wording implies.

**Why it matters:** this is the single mechanism gating every rAF loop,
timer, and event listener Floor 1 owns (the ambient journey spawner, the
hover-throttle map, the traveler animation loop) across every device
rotation a real tester's phone performs. If disposal is incomplete, the
failure mode is a slow leak -- extra rAF loops and timers accumulating with
each flip -- which M10 (a single-pass "rotate once, check for doubles"
checklist item) is not well shaped to catch; leaks of this kind typically
need several rotations before symptoms (frame drops, runaway CPU) become
visible enough to notice by eye. The plan chose the higher-risk construct
over the framework's own better-documented pattern without recording why.

**Minimal fix:** either switch to `<Show when={!portrait()} fallback={...}>`
(or `<Switch>`/`<Match>`) for the floor-1 mount point -- same visible
behavior, framework-endorsed disposal guarantees -- or, if the raw ternary is
kept, strengthen M10 to an explicit multi-rotation stress check (rotate 5+
times, confirm exactly one `requestAnimationFrame` call site active via
devtools, not just "no doubled travelers by eye") and cite the tradeoff in
Phase 5's Local Decisions section rather than leaving it an unexamined
"standard behavior" assertion.

## CR-SPEC-5 (MAJOR) -- ChatGPT Developer Mode connect-path copy ships to real testers with no citation and no end-to-end verification anywhere in the plan

**Evidence:** spec amendment `design.md:240-245`: "Client landscape verified
2026-08-06: Claude connectors ... ChatGPT Developer Mode (paid plans;
requires public HTTPS streamable-HTTP + OAuth-or-no-auth) ... consumer Gemini
app and Grok lack custom connectors." No source URL accompanies "verified."
The literal copy (mockup line 280, ported byte-identical per P1 into Phase 3
T8 and Phase 4 T3): `"<li><b>ChatGPT</b> (paid plans) — Settings → Apps →
enable Developer mode → add the URL</li>"`.

Phase 6's end-to-end product-claim test, S11 (`phase-6-ship-pass.md:626-629`):
"connect an actual agent (Claude connector **or a CLI agent**) using EXACTLY
the shipped connect-card steps ... a cited answer comes back." ChatGPT is
grammatically excluded from this test -- it is never the agent connected. No
other phase or probe touches the ChatGPT path at all.

WebSearch cross-check (2026-08-06): confirms real, actively-shifting
complexity here -- ChatGPT's MCP feature was renamed from "connectors" to
"apps" in December 2025, auth requirements differ by product surface (OAuth
2.1 + Dynamic Client Registration mandatory for the Apps SDK/store path,
while remote MCP servers separately support no-auth/API-key/OAuth), and the
feature has been under active naming/policy churn across 2025-2026. The
ported copy's own navigation string ("Settings → Apps → enable Developer
mode") happens to already use the post-rename "Apps" terminology rather than
stale "Connectors" language for ChatGPT specifically -- a point in the copy's
favor -- but that alignment is not evidenced by any citation or probe
*in the plan itself*; it reads as accidentally correct rather than verified.

**Why it matters:** this is exactly the failure class the orchestrator's own
error record calls out (REVIEW-BRIEF item 4: "world-facing claims ...
platform API behavior ... written in confident normative voice"). The
connect card is the site's central CTA (D1's whole success shape terminates
here) and it ships a literal, specific UI-navigation string for a
third-party product outside anyone's control, sourced from a spec claim with
no retrievable citation, and it is the one of three named client paths this
plan's own ship ritual does not require testing live before shipping to real
testers.

**Minimal fix:** add either (a) a citation URL to the spec's "verified
2026-08-06" line so a later reader can re-check it without a fresh web
search, or (b) a lightweight Phase 6 S-ritual step that opens ChatGPT's
current settings surface and confirms the "Settings → Apps → enable
Developer mode" path still matches reality before ship (does not require a
full connect test -- just confirming the navigation string), or (c) soften
the copy to describe the destination rather than the exact click-path
("find custom connector/app settings in ChatGPT") so staleness degrades
gracefully instead of silently misdirecting testers.

---

## Verdict

**GO-WITH-FIXES**

Blockers before ship (both MAJOR, both fixable without replanning):

1. **CR-SPEC-4** -- confirm (or replace) the SolidJS ternary disposal
   mechanism for the portrait/desktop remount before Phase 5 closes; this
   gates a real leak risk on the arc's one mobile-specific JS mechanism.
2. **CR-SPEC-5** -- either cite/re-verify the ChatGPT connect-path copy or
   add a cheap live-check step to Phase 6's ship ritual; do not ship an
   unverified third-party UI-navigation string as part of the page's central
   CTA without at least one of citation, probe, or softened copy.

Non-blocking, apply opportunistically: CR-SPEC-1 (redirect_to_human copy),
CR-SPEC-2 (docs-web HANDOVER line), CR-SPEC-3 (history consumer or
disclaimer). None of these three risk shipping something broken; they are
coverage/documentation gaps the operator can close in the same session as
the two blockers or defer explicitly.
