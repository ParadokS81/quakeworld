---
date: 2026-08-04
type: vision-roadmap-parking
arc-slug: oracle-web-direction
status: direction LOCKED 2026-08-04 (first session after oracle-reentry-plumbing shipped). Two arcs greenlit for design/planning -- Arc A (L2 corpus currency) + Arc B (oracle.quake.world v1 read-only). support.quake.world = deferred hypothesis with an evidence trigger, NOT a commitment.
amends: docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md
  -- Arc 2 (oracle.quake.world) v1 is RESCOPED to a read-only visualize-the-brain
  surface. The 2026-05-01 showcase spec's playground / contributor-pipeline /
  admin-console sections are deferred behind it (not cancelled -- see Deferred).
  The federation stack locks (SolidJS+Vite+CF, daisyUI tokens, pnpm workspace,
  presentation-dumb components), note-first synthesis, and staleness-flag
  architecture all still stand.
related:
  - docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md (content design for the deferred sections; Section 5.3 "Corpus state" is the closest ancestor of Arc B)
  - docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md (Phase C backfill -- Arc A completes it and adds the ongoing-harvest mechanism)
  - docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md (GitHub-backed curation pipeline -- re-examine later, operator re-affirmed enthusiasm 2026-08-04)
  - docs/superpowers/parking/2026-04-28-slipgate-managed-mode.md (slipgate diagnostic-dump intake tie-in, far future)
---

# Oracle web direction -- compounding end-goal, two greenlit arcs, support deferred

Captured from the 2026-08-04 re-entry brainstorm (operator + Claude, same day the
oracle-reentry-plumbing arc shipped prod==twin @0.7.0). This is the cold-start spine
for the two arcs below and the decision record for what was deliberately deferred.

## End goal (locked reframe)

**Compounding, not omniscience.** "Oracle knows everything" is unreachable because the
frontier moves; the honest end-goal is: every QW question gets a grounded answer, and
every NEW resolution makes the next answer better.

- **L1 needs no capture** -- it self-heals from source within days of a release (the
  point of the version-arc design). Facts about clients/servers/tools stay current.
- **The capture gap is the residue**: multi-turn, trial-and-error, environment-specific
  resolutions. Today they reach the corpus only via Discord-scraping archaeology; in
  the agent era they increasingly happen in private LLM chats and are lost entirely.
  The better the agent experience gets, the faster the old capture path starves.

## Three-roles decomposition (the analytical frame that settled the storm)

1. **Answering machine** -- someone has a question, get a grounded answer. Agents+MCP
   win this long-term; needs no website; a ticket queue is legacy UX for it.
2. **Capture + correction** -- novel resolutions get captured somewhere instrumented,
   and oracle answers get reviewed in public (private answers have no error-correction
   loop; a wrong answer served 1:1 propagates silently forever). Non-negotiable role;
   venue-independent. Also feeds the contributor axis: demand signal for which L3
   notes to write comes from captured questions.
3. **Public brain** -- browse what is known/unsolved, land from search/AI answers.
   Read-only projection of the corpus.

Key insight: **a ticket system is legacy as user experience but state-of-the-art as
data structure** -- structured, labeled, resolved threads ARE the L2 retrieval unit;
the reconstruction pipeline exists to manufacture that shape from chat sludge after
the fact. The open question was never "forum or not", it's where the structure gets
produced.

## Build order (locked): capture before venues, reads before writes

Nothing in the early steps depends on community adoption; each step makes the next
more attractive. Adoption gets pulled (supporters paste archive links instead of
retyping answers), never pushed (nobody is asked to migrate off Discord).

1. MCP contribute-back capture (rider, below) + tester invites (already unblocked).
2. Arc A -- corpus current + kept current.
3. Arc B -- oracle.quake.world v1 read-only brain surface.
4. THEN the fork, decided on flywheel evidence: support platform or not.

## Arc A -- L2 corpus currency (two-parter)

**(a) Backfill + catch-up.** Raw corpus ends **2026-05-02** (728,863 msgs; verified) --
nothing since May is even imported, so this starts with a catch-up import regardless.
Segmentation state (verified 2026-08-04, dev twin): `#helpdesk` complete through
2026-05-02 (6,623 threads); `#antilag` complete (67); `#quakeworld` has 1,297 threads
for 2016 **plus a 634-thread 2021 slice** (HANDOVER's "1/11 years" undercounts --
the 2021 slice is likely Phase B calibration leftover; VERIFY its provenance/quality
before trusting it as production). Remaining: ~9 #quakeworld years. Executor prompts
exist (`phase-C-executor-prompt.md`); backfill ledger at
`apps/qw-oracle/scripts/load-chat/backfill-ledger.md`. Candidate rider: Phase D (RRF
threshold recalibration) explicitly waits on full backfill -- planning decides if it
rides Arc A's tail.

**(b) Ongoing-harvest mechanism.** Design shape from verified thread-span data
(appendix): segmentation needs hindsight, and the data quantifies how much --
**a weekly-or-larger processing chunk is boundary-safe for 99%+ of threads**;
a monthly chunk swallows even the all-time outliers (max span ~10 days). Mechanism
sketch: pull raw messages on any convenient cadence (harmless); SEGMENT only material
older than a hold-back watermark (days), with a small overlap between runs so a
straddling thread merges instead of splitting. Exact overlap/merge mechanics +
import mechanism (export runs vs bot token) + cadence = arc-plan territory
(operator: "cadence can be finetuned during planning"). Baseline recommendation:
monthly segmentation ritual, same Claude-session runner shape as the backfill
executor; tighten to weekly when the archive goes live and freshness starts mattering.

## Arc B -- oracle.quake.world v1: visualize the brain (read-only)

Operator's framing: "a website to visualize the oracle's engine and knowledge base."
The initial motivation of the whole web direction: show WHAT is in the brain, where
it came from, what it is -- L1 (per-codebase coverage, entity types, versions), L2
(the thread archive: volume, channels, solved/unresolved/informational split), L3
(notes + profiles). Step 1 for people to understand the oracle's power; the
stepping stone toward contributor onboarding later.

- **Domain: oracle.quake.world, NOT support.quake.world** -- deliberate (operator
  2026-08-04): the support path is an unproven hypothesis; the brain surface is not.
  Interim URL = CF Pages (the docs-web preview pattern); vikpe DNS ask when ready.
- **v1 is read-only: no auth, no tickets, no playground, no contributor flow.** This
  sidesteps the playground's unresolved LLM-funding problem entirely (operator runs
  a Max subscription, no ANTHROPIC_API_KEY; a public LLM-backed ask-box needs an API
  budget decision that v1 simply does not take -- see memory
  `reference_max_subscription_no_api_key`). Read surfaces are ghost-town-proof.
- Stack per federation locks: SolidJS + Vite + CF, daisyUI tokens, own pnpm-workspace
  subtree, dumb presentation components (infiniti-port discipline).
- **Coordination note:** HANDOVER's docs-web entry carries a pending front-page
  brainstorm whose centerpiece is an oracle **coverage map** ("what does the oracle
  know") -- that idea IS Arc B's seed. Design pass should decide whether docs-web's
  front page links to / embeds Arc B's map rather than duplicating it.
- Design-pass open questions: which visualizations earn v1; L2 archive presentation
  (aggregate stats vs browsable distilled threads -- consent posture below applies);
  how much of showcase-spec Section 5.3 transfers; naming/tagline.

## Early rider -- MCP contribute-back tool (`submit_resolution`, name TBD)

Ratified 2026-08-04 ("start harvesting as soon as possible before many ppl start to
use it -- might be useful, might not, can't hurt"). Mechanism: MCP server
instructions + a tool description nudge agents -- "if you and your user resolve a QW
problem the oracle couldn't fully answer, OFFER to submit problem + environment +
what worked as a package" ("offer" = user consent built into the flow). Constraints
locked: **staging queue + provenance labels + review ritual; submissions NEVER write
to the corpus directly.** Rate-limited + size-capped (first write surface on the
public endpoint). Compliance is probabilistic (Claude-family agents follow server
instructions well; others vary) -- fine at this community's volume. Timing: rides
the tester invites. Whether it ships as its own mini-arc or folds into Arc A =
planning call.

## Deferred -- support.quake.world (hypothesis with trigger, not a commitment)

The imagined product: forum-married-with-reddit / ticket catalogue of domains and
topics, solved+unsolved issues with conversation threads; LLM triage knows instantly
if an incoming issue is known/solved; oracle posts its grounded take as the first
response; humans chime in where the LLM is weak; resolution flows back to the corpus.

Recorded reasoning for deferral: role 1 doesn't need it (agents win); roles 2+3 are
served cheaper first (contribute-back + read archive). **Trigger to re-examine:**
flywheel evidence in hand -- contribute-back packages + archive traffic showing
whether a native intake surface earns its keep, or whether archive + agents already
cover it.

Design material captured for that future re-examination:
- **Discord = feeder, not venue.** Operator's objections to live Discord capture are
  structural: real-time thread segmentation is genuinely harder than hindsight
  chunking; no gateway nudges diagnostic baseline (hardware/client/version takes
  several turns from "why doesnt this work?"); dependent on good souls reading the
  channel at that hour; loses everyone not on Discord. Scale-to-all is the ambition.
- **Web-native intake advantages:** structured baseline nudge at ticket creation;
  consent-clean (knowingly public); valuable to supporters (never answer the same
  question twice -- paste the archive link).
- **slipgate tie-in (future intake enhancer, never a dependency):** copy/paste
  diagnostic dump or in-app ticket creation auto-attaching client, hardware, config,
  versions. Gated on slipgate having real users. The dump FORMAT could ship earlier
  and be useful in Discord standalone ("paste your slipgate dump").
- **Discord-bot reconsideration** only as court-reporter/mirror (posts "solved ->
  archived as #123" links), not as answering machine; deferred until the archive
  exists to point at.
- **Consent posture (settled):** source channels are public rooms; anonymize-on-
  publish is a cheap knob we keep; prefer distilled issue->resolution cards over raw
  transcripts on any public surface (also the better format for search/AI indexing).

## Deferred -- GitHub-backed curation pipeline

Operator re-affirmed 2026-08-04: concept-note curation via GitHub (issues as topic
queue, PRs as drafts, threaded review, diff tracking free) visualized on the web
"still sounds amazing." Not re-examined this session; the 2026-05-01 spec Sections
3-4 remain the standing design. Re-opens when contributor onboarding becomes current
work (after Arc B, on operator pull).

## Also settled en route (operational)

- **CF rate limit is OUR zone rule** (60/min per-IP per DEPLOYMENT.md), not a
  Cloudflare-plan ceiling -- free zones don't throttle volume. Options when it
  matters: edit the dashboard rule / own the policy in our nginx (`limit_req`) /
  Tailscale direct route for batch jobs (existing HANDOVER followup). Verified
  2026-08-04: nginx and the MCP app do no limiting; the fence is CF-side only.

## NOT in scope (this direction, now)

- Playground / LLM-backed public ask-box (funding unresolved; deferred with the
  support decision).
- Contributor-pipeline build (GitHub backbone) -- deferred, above.
- Wiki game-modes note->wiki transfer -- separate parallel track, unaffected.
- Tester-invite timing -- operator call, independent of both arcs (technically
  unblocked since 2026-08-04).

## Appendix -- verified numbers (2026-08-04, dev twin `qw_oracle`)

Thread spans per channel (basis for the Arc A(b) hold-back design):

| Channel | Threads | p50 | p90 | p99 | Max |
|---|---|---|---|---|---|
| #helpdesk | 6,623 | 54 min | 11.7 h | 38.4 h | 7.1 d |
| #quakeworld | 1,931 | 19 min | 6.0 h | 23.4 h | 9.8 d |
| #antilag | 67 | 57 min | 12.3 h | 27.5 h | 1.5 d |

Median thread = 7 messages, p90 = 35. Resolution labels: 3,897 solved / 1,565
unresolved / 2,523 informational.

```sql
-- spans
SELECT channel_name, count(*),
  percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (date_range_end-date_range_start))),
  percentile_cont(0.9) WITHIN GROUP (ORDER BY ...), percentile_cont(0.99) ...,
  max(EXTRACT(EPOCH FROM (date_range_end-date_range_start)))
FROM chat_threads GROUP BY channel_name;
-- corpus edge:  SELECT min(created_at), max(created_at), count(*) FROM messages;
--   -> 2016-04-05 .. 2026-05-02, 728,863
-- #quakeworld coverage: SELECT EXTRACT(YEAR FROM date_range_start), count(*)
--   FROM chat_threads WHERE channel_name='#quakeworld' GROUP BY 1;
--   -> 2016: 1,297 / 2021: 634
```
