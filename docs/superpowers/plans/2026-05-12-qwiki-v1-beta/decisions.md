# Arc qwiki-v1-beta -- locked cross-cutting decisions

These choices apply to every phase. If any phase needs to deviate, surface a "Deviation" section at the top of that phase MD and stop for operator review. Mid-arc amendments land here as dated amendment blocks; never silently override in a phase MD.

Sources: LOCKED sections of `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` (Passes 1-6 complete 2026-05-12), the brainstorm handoff `docs/superpowers/parking/2026-05-12-qwiki-sandbox-planner-handoff.md`, and operator durable memory.

---

## Substrate (D1-D5)

### D1. Fresh-build, not modernize-in-place

**Decision:** This arc stands up a clean MW 1.39 LTS stack from scratch with new templates, page-types, and ecosystem-integration patterns. The old wiki is an extraction source only; nothing is migrated wholesale.

**Why:** Pivot 2026-05-09 evening (vision spec preamble + pass-tracker memory). Content analysis showed structural decay (51% stubs, 63% stale 5+ years) + ecosystem-integration vision (Layer 3 harvest from day 1) requires redesigned templates. "Too broken to fix" instinct prevailed over retrofit.

**Implication:** Phase MDs do NOT propose modernize-in-place patches to the old wiki. Selective extracts come in via per-domain mini-arcs (Modes in this arc; others in future arcs). Old wiki becomes read-only archive at cutover (cutover is a future arc, not this one).

### D2. MW substrate stack composition

**Decision:** MediaWiki 1.39 LTS + Citizen skin + Page Forms + Semantic MediaWiki + PluggableAuth + Discord OAuth extension + MariaDB 10.11 LTS.

**Why:** Pass 6 6.3 substrate item 1. Liquipedia (same MW + SMW + form-driven family) confirms achievability. MW 1.39 is current LTS through Dec 2027.

**Implication:** Phase MDs reference these versions directly. The OAuth extension choice (OpenID Connect vs WSOAuth) is a Phase B decision (both are PluggableAuth providers; both satisfy D4). Substitutions require operator approval. Visual Editor is NOT in v1 baseline (defer post-baseline if operator wants it).

**Amendment 2026-05-13 (Phase 1 review):** Web-server composition explicitly locked as **nginx + php-fpm + MariaDB** (three containers). Uses upstream-maintained official Docker images: `nginx:1.27-alpine` (or equivalent stable Alpine line) + `mediawiki:1.39-fpm` + `mariadb:10.11`.

Aligns with Pass 6 6.3 substrate item 4 parenthetical "(php-fpm + nginx + MariaDB + extensions)" which the initial Phase 1 draft read as illustrative; on review the parens were re-read as the locked production-standard composition. nginx+php-fpm is the production-standard MW substrate (Wikipedia, Liquipedia, larger MW farms run this shape). The official `mediawiki:1.39-fpm` image variant is upstream-maintained, so this is not custom integration work -- same upstream-support tier as the Apache-bundled `mediawiki:1.39`.

**Rationale:** Apache+PHP can technically handle QW-wiki-scale load fine, so the choice is not about capacity -- it is about production-standard architecture. Pass 6's intent (per the operator on 2026-05-13) was a reasonably-scalable wiki, not "minimum viable for current contributor count." nginx+php-fpm gives separately-tunable workers, better static-asset handling, and easier future flexibility (caching / rate-limits / CDN at the nginx layer) without a swap arc later.

**Implication for Phase 1:** the initial Apache+PHP draft at `phase-1-mw-core.md` is stale. Phase 1 redrafts Tasks 4 (docker-compose three services) + 7 (deploy README three-container topology + `nginx.conf` in file list) + V4 probe (three healthy containers, not two) + minor edits to Tasks 1-3 (CLAUDE.md / README.md / OVERVIEW.md topology mentions). Tasks 5 (.env.prod.example), 6 (LocalSettings.php), 8 (operator deploy) substantively unchanged. A new file `apps/qwiki-sandbox/deploy/nginx.conf` is required (MW-specific fastcgi proxy config + static-asset serving).

**Implication for later phases:** Phase 2 (extensions) and Phase 3 (auth) are MW-application-level concerns -- web-server choice does not affect them. Operator deploys still use `docker compose` against the three-container stack; MW maintenance scripts run via `docker compose exec mediawiki php maintenance/*.php`.

**Amendment 2026-05-13 #2 (Phase 1 recon -- version verification against live sources):**

Same-day live-source verification (Docker Hub registry API + MediaWiki Version_lifecycle page + extension GitHub repos) revealed that the four image/skin tags named in Amendment #1 above are all drifted relative to current best practice. The brainstorm pass + initial Phase 1 amendment both reflected stale training data ("MW 1.39 LTS through Dec 2027" conflates 1.39 with 1.43's actual EOL date). Replacing all four pins with current-stable equivalents:

| Component | Amendment #1 | Amendment #2 (this) | Rationale |
|---|---|---|---|
| MediaWiki | `mediawiki:1.39-fpm` | `mediawiki:1.43-fpm` | MW 1.39 LTS is past its formal upstream-support window; the `1.39/` directory was removed from `wikimedia/mediawiki-docker` master. **MW 1.43 is the active LTS through December 2027**. The official `mediawiki:1.43-fpm` image bundles PHP 8.3 (verified against the upstream Dockerfile). |
| MariaDB | `mariadb:10.11` | `mariadb:11.4` | The `lts` tag on the official MariaDB image now resolves to **11.4** (verified 2026-05-13). 11.4 LTS runs through **May 2029** vs 10.11's February 2028; 15 extra months of upstream support for a one-character tag bump. Wire-protocol + healthcheck-script compatibility with the rest of the stack is unchanged. |
| nginx | `nginx:1.27-alpine` | `nginx:1.30-alpine` | **1.30** is the current stable Alpine line (released April 2026); the `stable-alpine` tag resolves there now. nginx config syntax for our directives (fastcgi_pass / fastcgi_split_path_info / location regexes) is unchanged. |
| Citizen skin | `v2.40.2` (last 1.39-compat tag) | `v3.16.0` (released 2026-05-12) | Forced by the MW 1.43 bump -- Citizen v3 explicitly requires `MediaWiki >= 1.43.0` per `skin.json`. v3.16.0 is the current release. **Drop `$wgCitizenEnableCommandPalette` from `LocalSettings.php`** -- the option was removed when Citizen v2 -> v3 renamed the search subsystem; the v3 default replaces it. |

The arc's three-container topology + shared `/var/www/html` named volume pattern from Amendment #1 remain unchanged; only the version pins move.

**MW LTS lifecycle going forward.** MediaWiki ships a new LTS every two years with a one-year overlap window. **1.43 LTS** runs through Dec 2027; **1.47 LTS** arrives ~Nov 2026 and gets ~3 years of support. The expected upgrade cadence is one in-arc MW bump every ~2 years (pg_dump / image tag bump / `maintenance/update.php` / smoke -- standard MW operation, not a substrate rebuild). This is documented as a future-arc concern, not in-scope for qwiki-v1-beta.

**Implication for Phase 1:** Tasks 1-3 (CLAUDE.md / README.md / OVERVIEW.md) update version + topology mentions. Task 4 (`docker-compose.prod.yml`) updates the three image tags. Task 7 (`LocalSettings.php`) drops the obsolete `$wgCitizenEnableCommandPalette` setting. Task 8 (deploy README) updates the Citizen `git clone --branch v3.16.0` step. Task 9 (operator deploy) commit message references the new versions.

**Implication for later phases (carry-forward to drafter prompts):**

- **Phase 2 (extensions).** Page Forms installs from its `REL1_43` branch via `git clone` (no GitHub-tagged releases on the wikimedia mirror; REL1_43 active commit 2026-05-12). Semantic MediaWiki pins to release **6.0.1** (released 2025-08-26; current stable; MW 1.43 compatible).
- **Phase 3 (auth).** PluggableAuth installs from `REL1_43` branch (active commit 2026-05-05). OpenID Connect extension (operator's `prerequisites.md` default OAuth provider) installs from `REL1_43` branch (active commit 2026-04-16); WSOAuth is the listed alternative also on `REL1_43`.

The MW 1.39 LTS lifecycle gap that triggered this recon (review-findings F1) is closed by this amendment; F1 status moves to RESOLVED with the resolution pointer to this amendment.

### D3. Hosting + backup inheritance

**Decision:** Docker stack on Unraid (php-fpm + nginx + MariaDB + extensions). Cloudflare Tunnel for exposure. TLS via Cloudflare. Restricted URL `wiki-beta.quake.world`. Backup inherited from the existing Unraid -> Synology weekly cycle (`/home/paradoks/projects/unRAID/docs/server/backup.md`).

**Why:** Pass 6 6.3 substrate item 4. The appdata-backup script tars all of `/mnt/user/appdata/`, so a wiki container placed there is auto-included; no bespoke backup wiring needed.

**Implication:** Phase MDs do NOT scaffold backup infrastructure. They place the wiki container under `/mnt/user/appdata/qwiki-beta/` (subdirectory name finalized in Phase A) so the existing tarball includes it. Cutover from `wiki-beta.quake.world` to old-wiki URL is a future arc (not this one). Migration off Unraid to long-term Hetzner+Cloudflare is a downstream operational concern: standard MW migration (DB dump + images + extensions), no v1 lock-in.

**Amendment 2026-05-14 (Phase 1 deploy):** URL changed from `wiki-beta.quake.world` to `wiki.slipgate.me`. Operator decision during Phase 1 Task 9 step 9 (Cloudflare Tunnel route configuration): the `-beta` suffix and the `quake.world` zone were both dropped. `wiki.slipgate.me` aligns with the sibling `oracle.slipgate.me` convention for Unraid-side internal services on the slipgate.me zone; `quake.world` stays reserved for community-facing federation surfaces (hub, maps, assets, etc.).

The earlier "Restricted URL `wiki-beta.quake.world`" line above stands as historical record; the active URL is `wiki.slipgate.me`. The "beta" deployment phase identity is preserved via `$wgSitename = "QuakeWorld Wiki (beta)"` in LocalSettings.php and access control via Discord-role gating (D19), not via the URL itself.

**Implication for Phase 1 (applied during deploy):** LocalSettings.php `$wgServer` updated in place; mediawiki container restarted; V1 phase-boundary probe rerun against `https://wiki.slipgate.me` (PASS). Paper artifacts (apps/qwiki-sandbox/{CLAUDE.md, README.md, OVERVIEW.md, deploy/README.md}) retargeted in the same follow-up commit. The Phase 1 MD itself is not amended retroactively; this decision-level record carries the new URL forward to Phase 2+.

**Implication for later phases:** Phase 3 (Discord OAuth) PluggableAuth redirect URI: use `https://wiki.slipgate.me/index.php/Special:PluggableAuthLogin` (the wiki-beta.quake.world variant listed in prerequisites.md is updated in this commit; refresh the Phase 3 drafter prompt accordingly when authored). No impact on Phase 2 extensions (install path is MW-internal, hostname-independent) or Phase 4 quality-tags (category-level, hostname-independent).

**Implication for future cutover arc:** beta -> broader transition retains the same `wiki.slipgate.me` URL (no rename moment within this arc). When/if the wiki moves to a community-facing zone (e.g., `wiki.quake.world`), that's a separate cutover-event arc, not in scope here.

### D4. Auth via PluggableAuth + Discord OAuth + MW groups

**Decision:** MediaWiki handles OAuth natively via PluggableAuth + Discord OAuth extension. Quad does NOT provision MW accounts. Two MW groups:

- `wiki-contributor`: auto-assigned via Discord-role-as-OAuth-claim mapping (`@wiki-beta` Discord role -> `wiki-contributor` MW group on first login).
- `wiki-curator`: manually assigned by operator. No auto-mapping. v1 = 1-2 curators (operator + Carapace-candidate if available).

Read access is public; no account required to browse.

**Why:** Pass 5 5.1 + 5.2 locked. Single auth source of truth via MW. Discord role drives access. Quad's optional role is `/invite_wiki @user` (grants Discord role + DMs login link); see prerequisites for whether to ship this in v1 or defer.

**Implication:** Phase MDs do NOT scaffold Quad MW-account-provisioning paths. Discord role administration in v1 is manual (operator assigns `@wiki-beta` directly) unless Phase B opts to include the `/invite_wiki` Quad command.

### D5. MW namespace edit restrictions

**Decision:** Form / Template / Category namespaces are `wiki-curator`-only. Main / Talk / File / User editable by `wiki-contributor`. MediaWiki: namespace is sysop only (MW default).

**Why:** Pass 5 5.4a locked. Curator scope is narrower than old-wiki curator work because bones+slots + form gates eliminate structural drift at authoring time; the load-bearing curator activity is content quality + Layer 3 harvest, not template policing.

**Implication:** Phase MDs configure these restrictions in `LocalSettings.php` during the substrate phase. Forms and templates are curator-owned; contributors edit content via forms, not raw template wikitext.

---

## URL discipline (D6)

### D6. URL slug discipline

**Decision:** For pages kept from the old wiki (extract path during per-domain migration), use the same URL slug as the old wiki. New-build pages get new slugs. v1 beta lives at `wiki-beta.quake.world`; cutover infrastructure (redirect-from-old-domain) is a cutover-event concern, not baseline.

**Why:** Pass 4 4.6 locked + Pass 6 6.3 substrate item 2. External code references (KTX source pointing to wiki URLs) survive cutover when slugs match.

**Implication:** Modes mini-arc phase MDs enforce slug-preservation as an authoring rule during the migrate step (form validation can warn on slug deviation). Architecture pass may add a curator-side slug-check tool; not in v1 baseline.

---

## Authoring discipline (D7-D12)

### D7. 6-tile main page nav (1:1 with SHOULD list)

**Decision:** Main page renders six tiles with locked names: **Modes / Game Content / Distributions / The Scene / Tutorials / Community & Lore**. Two tiles include external nav links (Game Content -> maps.quake.world + assets.quake.world; The Scene -> hub.quake.world per architecture pass).

**Why:** Pass 4 4.1 + 4.2 locked. The cross-entity-or-no-entity-owner cut produced a 6-entry SHOULD list; tile names match SHOULD entries 1:1. Liquipedia-inspired 6-tile layout with integrated header search.

**Implication:** Phase MDs do NOT re-litigate tile names or count. Architecture pass settles tile styling, integrated header search behavior, and Layer B/C transitions. Visual companion HTML at `docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html` (v3 2026-05-12) is the design substrate for ongoing iteration.

### D8. 12 page-types from Pass 4 4.3

**Decision:** Twelve page-types ship in v1 baseline (sub-page-types named where shapes diverge). Each has a locked bones+slots shape per Pass 4 4.3.

| # | Page-type | SHOULD entry |
|---|---|---|
| 1 | Modes | Modes |
| 2 | mechanic | Game Content |
| 3 | item | Game Content |
| 4 | weapon-baseline | Game Content |
| 5 | distribution | Distributions |
| 6 | server-admin-overview | Distributions |
| 7 | hof-league | The Scene |
| 8 | player | The Scene |
| 9 | clan | The Scene |
| 10 | Tutorials | Tutorials |
| 11 | article-page | Community & Lore |
| 12 | glossary-page | Community & Lore (umbrella; H3 sections) |

**Why:** Pass 4 4.3 locked. Bones+slots design enables baseline-plus-deviations (D10) and Track C harvest discipline (D11).

**Implication:** v1 baseline ships substrate that supports forms+templates for all 12 page-types, but only the Modes page-type is authored with content in v1 (per D14). Subsequent domain mini-arcs (future arcs per D16) author the remaining types.

### D9. 3-level edit-gate taxonomy per page-type

**Decision:** Each page-type's edit gate is one of: **strict-form / form+slots / free-form**. Split across the 12 page-types from D8: 8 form+slots / 3 strict-form / 1 free-form. Specific per-page-type assignments are locked at Pass 5 5.2. Slot specifics iterate post-mockup at near-zero cost; gate-level changes are tolerable at v1 beta scale, painful later.

**Why:** Pass 5 5.2 locked. Resolves the Pass 4 -> Pass 5 carry-forward tension (Track C structure vs Pass 1 low-barrier contribution). Form gates eliminate structural drift; free-form is reserved for genuinely loose content (glossary).

**Implication:** Phase MDs implementing page-types reference the gate-level for that type. Form gates are PageForms-driven; strict-form uses `#forminput` with no free-text section; form+slots allows narrative inside named sections; free-form is wikitext with metadata.

### D10. Baseline-plus-deviations design pattern

**Decision:** Combat baseline ("how QW works by default") is a single source of truth living in Game Content / mechanic + weapon-baseline + item pages. Mode pages have explicit "Deviations from baseline" sections naming deltas. No content duplication; atomic for Track C harvest.

**Why:** Pass 4 4.2 + 4.3 locked. Atomicity supports both human readability and Layer 3 harvest cleanness.

**Implication:** Modes mini-arc phase MDs author mode pages with "Deviations from baseline" sections that reference Game Content baselines. Red-links acceptable in v1 since Game Content domain ships in a future arc (per D16). Form templates include a "Deviations" section structure.

### D11. Track C four authoring disciplines

**Decision:** Four disciplines, baked into form structure, template scaffolding, and help-text:

1. **Section-as-atom.** Each section answers one question completely.
2. **Self-contained sections.** Read each section without needing surrounding context.
3. **L1-L3 cross-refs.** Cite engine facts (Layer 1 entities) explicitly when invoked.
4. **Citation discipline.** Sources named when claims are non-obvious.

Manual curator workflow harvests sections into oracle Layer 3 concept-notes per the existing workflow at `apps/qw-oracle/curated/concept-notes/CLAUDE.md`. NO automated pipeline.

**Why:** Pass 4 4.4 reframe (manual-curator-friendly, not auto-pipeline). Disciplines support the load-bearing curator activity (Layer 3 harvest) without requiring pipeline infrastructure.

**Implication:** Phase MDs implementing page-type templates include section structures supporting the four disciplines. Help-text in forms reminds contributors at point of authoring. Curator workflow harvests sections into concept-notes by hand; no automation in v1.

### D12. 5 schema-enforced page-type exclusions

**Decision:** The wiki does NOT have page-types for: **per-Map / per-Asset / News / per-Season-Historical-Tournament / per-Match**. Schema (Page Forms + SMW) enforces this -- no form exists to create these page-types.

**Why:** Pass 3 + Pass 4 4.5 locked. These belong to federation entities (maps.quake.world / assets.quake.world / hub.quake.world / tournaments.quake.world) with their own native narrative slots. Cross-entity narrative (Modes / mechanics / etc.) lives in the wiki.

**Implication:** Phase MDs do NOT scaffold forms or templates for excluded page-types. Cross-references to external surfaces (map names, asset names, hub game IDs) use plain text + optional external-link slot.

---

## Content strategy (D13-D16)

### D13. Per-domain workflow shape

**Decision:** Each domain follows five steps: **analyze** (build inventory from dump) -> **plan-target** (confirm bones+slots fit) -> **plan-migration** (per-page disposition: extract / new-build / merge / abandon) -> **migrate** (execute with Track C disciplines) -> **verify** (per-page sign-off against schema + Track C + curator review). Backed by per-domain curator tooling cribbed from `apps/qw-oracle/scripts/curate-brands/`.

**Why:** Pass 6 6.1 locked. Brand-curator pattern (three-column inventory -> triage -> sign-off, JSON-sidecar state, pauseable + resumable) is validated by operator's 88-tournament-page sort. Per-domain rather than one mega-tool because data shapes diverge wildly across domains.

**Implication:** Modes mini-arc phase MDs implement the workflow for Modes specifically. Subsequent domain mini-arcs (future arcs) replicate the workflow shape with domain-specific data shapes. Phase MDs do NOT scaffold a generic per-domain-tool framework (skipped from baseline per Pass 6 6.3).

### D14. Modes is the vertical-slice proof domain

**Decision:** This arc's content work is scoped to the Modes domain. 27 pages bounded. Full triage diversity (rich existing / sparse stubs / missing entirely). KTX source-code references wiki URLs here -- finishing Modes closes that pain point. Cross-link dependency on Game Content baselines is non-blocking (red-links resolve to blue when Game Content ships in a future arc).

**Why:** Pass 6 6.2 locked. Vertical-slice proof: exercises wiki authoring + Layer 3 harvest path + harvested result observable via oracle MCP end-to-end. Aligns with operator memory `project_concept_notes_vertical_slice.md`.

**Implication:** Phase MDs do NOT scope content work to additional domains in this arc. Modes phase boundaries include Layer 3 harvest verification (newly-harvested concept-note surfaces via oracle MCP query). Per-mode disposition (extract / new-build / merge / abandon) happens during analyze + plan-migration steps; not pre-locked here.

### D15. Author-once-harvest-many

**Decision:** Wiki is upstream of oracle Layer 3 / hub / future AI services. Author canonical narrative at wiki; harvest into downstream consumers via the manual curator workflow. Don't duplicate authorship in private .md files or downstream surfaces.

**Why:** Pass 2 carry-forward + Pass 6 reinforcement. KTX modes (27 modes, 15 wiki pages, half-bad) is the flagship case -- finishing in the wiki means humans + oracle + future hub + future AI services all inherit.

**Implication:** Modes mini-arc phase MDs produce wiki content that becomes oracle Layer 3 input via the existing harvest workflow at `apps/qw-oracle/curated/concept-notes/CLAUDE.md`. The harvest path must be observable end-to-end as a baseline phase verification probe (Pass 6 6.3 substrate item 3).

### D16. Subsequent priority order deferred post-Modes

**Decision:** After Modes wraps, priority order for remaining domains (Game Content / Distributions / The Scene / Tutorials / Community & Lore + Glossary) is revisited with Modes-mini-arc learnings. Pass 4 4.2 priority field remains the durable starting hypothesis (candidate-next is Game Content, which closes the cross-link loop on Modes "Deviations" sections).

**Why:** Pass 6 6.2 locked. Order calcifies after seeing what 27 pages actually takes at 2-4 contributors and what harvest looks like in practice.

**Implication:** This arc does NOT scaffold subsequent per-domain mini-arcs. Each becomes its own arc-classifier candidate when prioritized post-Modes. The orchestrator handoff at end of this arc notes the priority decision as a future operator concern.

---

## Curator + quality (D17-D20)

### D17. Curator scope

**Decision:** `wiki-curator` group scope: content quality / cross-page coherence / currency review / Layer 3 harvest / spam response / template maintenance. NOT structural drift (form gates + bones+slots eliminate at authoring time). v1 curator workflow surface = wiki UI in browser (Special:RecentChanges + Category-filtered listings). No external dashboard / Discord notifications / email for v1.

**Why:** Pass 5 5.3 locked. Old-wiki curator work was burnout-inducing because no forms existed; new structure narrows the load-bearing job. Layer 3 harvest is THE load-bearing curator activity that doesn't exist in normal wikis.

**Implication:** Phase MDs configure `wiki-curator` group with delete / protect / restricted-edit / revert rights. No custom dashboard scaffolding (parked to future pipeline-mechanics arc). Anti-burnout discipline: curator workload bounded by tagged-queue + recent-changes-that-catch-their-eye; no backlog chasing.

### D18. Quality-tag system (3 tags)

**Decision:** Three categories: `Category:Needs review` (auto-added to a page on save), `Category:Stale` (explicit, manually added), `Category:Draft` (explicit, manually added).

**Why:** Pass 5 5.3c locked. Narrowed from a longer original list to the three that actually drive curator action. Form gates handle "incomplete bones" and "broken cross-refs" at authoring time.

**Implication:** Phase MDs configure the three categories during the substrate phase. Page-type templates wire `Needs review` into save-time autocategorization. Curator workflow includes a Category-filtered Special:Categories listing.

### D19. V1 = invite-only beta via Discord-role-as-OAuth-claim

**Decision:** V1 deploys at `wiki-beta.quake.world` with invite-only access. Access mechanism: Discord-role-as-OAuth-claim mapping (`@wiki-beta` Discord role -> `wiki-contributor` MW group on first login). Pass 1's "credentialed-but-not-curatorial low-barrier" is end-state operating point, not v1.

**Why:** Pass 5 5.1 locked. Battle-test forms with handful of trusted invitees before broader access opens. Transition criterion: operator-judgement, not metric-gated (all 12 page-types proven; solo authoring per page-type; no major spam; curator workflow sustainable).

**Implication:** Phase MDs configure Discord OAuth + role mapping in the substrate phase. Beta -> broader transition is OUT OF SCOPE for this arc (future arc; mechanism: add `@wiki-contributor` Discord role mapped to same MW group; both Discord roles coexist; no hard switchover).

### D20. Modes curator tool follows brand-curator pattern

**Decision:** Modes curator tool implements three-column inventory -> triage -> sign-off + JSON sidecar state persistence + pauseable + resumable. Cribbed from `apps/qw-oracle/scripts/curate-brands/`. Lives at `apps/qwiki-sandbox/scripts/curate-modes/` (specific subdirectory name finalized in the relevant Modes phase MD).

**Why:** Pass 6 6.1 locked. Brand-curator validated by operator's 88-tournament-page sort. Per-domain (not generic framework) keeps complexity bounded.

**Implication:** Modes mini-arc phase MDs implement the curator tool. Subsequent domain mini-arcs (future arcs) crib from it (or reshape per their data). NO generic per-domain-tool framework in this arc (Pass 6 6.3 explicit skip).

---

## Engineering discipline (D21-D26)

### D21. Output discipline -- operator's ASCII rules

ASCII only. No emoji. No em-dashes / en-dashes -- use ASCII hyphen-minus. No marketing voice. Comments explain WHY, not WHAT.

Source: operator memory; enforced by docs-check-style validation.

### D22. No subagents for mechanical edits

When a phase MD ships full file content / per-file diffs inline AND the change has no logic (markdown, doc edits, MW LocalSettings.php config, docker-compose YAML), execute directly with Edit/Write/Bash. Subagent dispatch is for code synthesis, multi-file integration, exploratory implementation, schema/migration writing, test authoring.

Source: operator memory `feedback_no_subagents_for_mechanical_edits.md`.

### D23. Phase atomicity

Each phase ends with a commit that leaves the system in a runnable state. If a phase mid-task leaves the system broken, that's a phase-internal concern; phase boundaries must be green. The phase MD's "Outputs to next phase" section names what's runnable at the end.

Mirrors qw-oracle Arc 1 D14.

### D24. Verification at every phase boundary

Each phase MD ends with a "Verification (phase boundary)" section listing copy-paste commands the operator runs to confirm the phase landed correctly. Commands return YES/NO answers, not interpretive prose. Operator reviews; phase MD's "Recovery" section covers anticipatable failures.

Mirrors qw-oracle Arc 1 D15.

### D25. Open questions tracked, not improvised

If the drafter encounters a decision this doc + phase template don't cover, they list it under the phase MD's "Open questions" section with default-chosen + who-can-resolve. They do NOT escalate to operator mid-draft; operator reviews open questions at phase boundaries.

Mirrors qw-oracle Arc 1 D17.

### D26. Execution mode declared per task

Each task in a phase MD declares one of:

- `subagent (Sonnet medium | Sonnet MAX | Opus medium | Opus MAX | Haiku)` with a one-line rationale
- `inline` with a one-line rationale (typically: "purely textual edits with full content shipped inline")

Default is `subagent (Sonnet medium)` for any task requiring reasoning. Haiku for genuinely mechanical text shuffling. Opus MAX for architectural / cross-cutting / post-arc-analytical tasks.

Source: operator memory `feedback_model_effort_range.md`. NEW vs qw-oracle Arc 1 template (closes the inline-execution defect).

---

## Explicit non-goals for this arc

If a phase drifts into one of these, that's scope creep -- flag it.

**Content not in scope (drop from old wiki):**

- Player stubs (5,000+ pages, 3,353 explicitly stub-tagged). Hub V2 will produce richer profiles.
- Long-tail stubs and stale articles outside the 27-mode Modes domain.

**Domains not in scope (each is its own future arc):**

- Game Content (mechanics / items / weapon-baselines). Candidate-next per D16; not this arc.
- Distributions (clients / servers / proxies + server-admin-overview).
- The Scene (hof-league / player / clan).
- Tutorials.
- Community & Lore (article-page + glossary-page).

**Infrastructure / tooling not in scope:**

- Custom backup scaffolding (inherited per D3).
- Generic per-domain-tool framework (Modes curator is de-facto pattern; subsequent domains crib).
- Visual Editor (defer post-baseline if operator wants it).
- AI-agent steering (`llms.txt` / bot user-agent handling / edge worker policies). Cooperative `llms.txt` is optional v1 add; not a baseline lock. Adversarial tarpit (ciscon's QWiki playbook, `reference_botload_tarpit_pattern.md`) is a separate concern.
- Pipeline-mechanics tooling (curator workflow tools, search, draft suggestions). Future arc.

**Federation surfaces not in scope:**

- Bidirectional sync with quake.world / hub / assets / maps. v1 is link-only per (C-prime) loose-coupling locked Pass 3.
- per-Map / per-Asset / News / per-Season-Historical-Tournament / per-Match page-types (schema-enforced exclusions per D12).

**Cutover not in scope:**

- Cutover from `wiki-beta.quake.world` to old-wiki URL. Future arc (or operator-driven event when v1 -> broader transition criteria met per D19 carry-forward).
- bps cutover negotiation. Operator-side stakeholder concern.
- Image-tarball mass migration. Per-domain as needed; Modes may need a few screenshots; mass import deferred.
- Subsequent priority order after Modes. Deferred per D16.

---

*End of decisions. If a future phase needs to override one of these, that override goes here as an amendment with date + reason -- not silently in the phase MD.*
