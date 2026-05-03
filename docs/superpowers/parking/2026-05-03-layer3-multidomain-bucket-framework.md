# Layer 3 multi-domain expansion + bucket framework (parked 2026-05-03)

**Status:** Parked. Trigger: Arc 3 (post-Phase-8 deploy of qw-oracle Arc 1, alongside L2 thread reconstruction and the showcase-site contributor pipeline).

**Author context:** ParadokS + Claude (Opus 4.7), surfaced during the Phase 8 eval-set walkthrough on 2026-05-03 when q5/q8 (vague-NL Linux/Windows symptoms) failed retrieval and the conversation extrapolated from "we need more concept notes" to "L3 has a structural gap that the player-as-system framing reveals." Discord-side mining context (HDR+Windows / Linux+NVIDIA / mic+Linux / qw:// handler / self-hosting / HUD workflow) and the slipgate player-profile analogy are load-bearing inputs.

---

## TL;DR

Layer 3's current scope is implicitly **engine-internal** (concept notes about cvars, scripts, weapons, rulesets). The Phase 8 eval surfaced that helpdesk questions consistently span a wider ontology — the **player-as-system** ontology — where the answer chain combines an engine-config lever with a system / hardware / peripheral / server-side constraint. None of the 6 strongest L3 candidates from the Phase 8 helpdesk scan are pure engine-config; all cross at least one bucket boundary.

This doc captures three connected design decisions:

1. **The bucket framework** -- 9 domains the corpus operates across, mapped from the slipgate player-profile model. Used as primer-input for L2 thread reconstruction (so sonnet tags threads by domain) and as frontmatter taxonomy for L3 notes (so retrieval can filter by domain).

2. **Recipe-shape vs encyclopedia-shape** -- L3 notes should be narrow recipes that the LLM consumes alongside live L1, NOT exhaustive guides. The LLM augments at query time. Recipes resist rot because they are scoped to one working configuration; when the config breaks, write a new recipe rather than amending the old.

3. **Lockstep flagging architecture** -- the staleness model that makes L3 multi-domain expansion sustainable. Detail is captured in `2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` (the "Lockstep flagging architecture" section added 2026-05-03). This doc references it; the showcase-site doc owns it.

These three together turn L3 from "engine-internal concept-note collection" into "the operational layer of a complete-player-profile knowledge service" without expanding the schema or rewriting Phase 4's storage design.

## Why this exists

**The triggering observation (Phase 8 eval, 2026-05-03):**

The eval set surfaced 4 failures (q5, q7, q8, q11 in `apps/qw-oracle/eval/eval-queries.json`). Two of those (q5 "screen flicker on Windows close", q8 "Linux stutters with sys_highpriority set") are vague-NL queries whose answers exist as scattered cvars in L1 but have no L3 concept-note coverage. The fix isn't more cvars in L1 -- the cvars are there; their descriptions are even partially embedded. The fix is L3 notes that bridge the symptom -> cvar-family chain in narrative form.

**The deeper observation:**

Both failing queries cross the engine-config boundary into system territory:

- "Screen flicker on Windows close" → engine-config (`vid_software_palette`, `vid_hwgammacontrol`) + system (Windows HDR display tech)
- "Linux stutters with sys_highpriority set" → engine-config (`sys_highpriority`, `vid_renderer`) + system (Linux compositor, performance governor) + hardware (CPU affinity)

Six other L3 candidates surfaced from a 90-day helpdesk scan have the same shape (HDR+Windows brightness, Linux+NVIDIA performance, Mic+audio Linux, qw:// URL handler Linux, Self-hosting mvdsv/KTX, HUD customization workflow). NONE are pure engine-config. ALL combine an engine-config lever with at least one system / peripheral / server-side / community constraint.

**The structural insight:**

Layer 1's ontology is **engine-internal vocabulary** -- built from libclang extraction of QW engine source. But the helpdesk *channel* operates on the **player-as-system** ontology -- the same ontology slipgate's public-facing player profile already encodes (config + visuals + system + hardware + peripherals + files). A helpdesk question is just as likely to be about an Nvidia driver as about a cvar.

If L3 is going to serve helpdesk-shape questions, L3 must be able to express recipes that span engine + system + hardware. The schema already supports it (frontmatter is JSONB, `concept_entities` is intentionally not FK-bound to L1). The taxonomy does not yet exist.

## The bucket framework

Drawing from the slipgate player profile + Phase 8 helpdesk candidates + the Discord conversation context:

| Bucket | What lives here | Currently in L1? |
|---|---|---|
| **Engine-config** | cvars, commands, macros, scripts, binds | YES (Layer 1) |
| **Engine-content** | maps, gameplay rules, weapons, items | YES (Layer 1, qw namespace) |
| **Visual customization** | textures, skins, HUD layouts, particles, sounds | Partial (asset_extensions / paths in L1, but no player-facing entity for "skin pack X") |
| **System** | OS (Win/Linux/Mac), display tech (HDR/SDR/refresh), compositor, governor, audio stack | NO |
| **Hardware** | GPU vendor, CPU, monitor specs | NO |
| **Peripherals** | Mouse, keyboard, headset, audio interface | NO |
| **Network** | ISP, NAT, firewall, packet loss patterns | NO |
| **Server-side** | mvdsv/KTX deploy, qwfwd, masterserver, gamecode mods | Partial (mvdsv/ktx/fte L1 ports cover engine cvars but not the deploy-runtime concerns) |
| **Community** | Pickup channels, tournament rules, etiquette, lore | NO |

**Buckets are not mutually exclusive.** A single recipe can span 3-4 buckets ("Linux + NVIDIA performance" = System + Hardware + Engine-config). The taxonomy is multi-tag, not a single category field.

**The bucket framework has three uses:**

1. **L2 thread reconstruction primer** (cross-ref `2026-05-03-layer2-thread-reconstruction.md`). Stage 4's summary prompt asks sonnet to tag each merged thread by which buckets contributed to the question AND which buckets contributed to the answer. Cross-domain threads (question-buckets ≠ answer-buckets, or both span multiple buckets) self-flag as L3 concept-note candidates.

2. **L3 frontmatter taxonomy.** Notes carry `domain: [system, engine-config]`, `os: [linux]`, `audience: [player, server-admin]`, `note-shape: [recipe, explainer, reference, diagnostic]`. Frontmatter is JSONB → no schema migration needed; just write the fields.

3. **Retrieval-side filtering (deferred).** `search_concepts` could filter by domain ("only system-bucket notes"). Phase 6's RRF doesn't currently expose this; deferred until evidence shows it matters.

## Recipe-shape vs encyclopedia-shape

**The choice: recipes, not encyclopedias.**

A recipe-shape concept note covers ONE narrow scenario with a worked solution. The LLM consumes the recipe alongside live L1 entity data and composes the answer. The recipe doesn't try to be authoritative; it's a SEED the LLM augments.

**Why recipes over encyclopedias:**

| Property | Recipe (200 lines) | Encyclopedia (2000 lines) |
|---|---|---|
| Authoring cost | Low; one scenario, one pass | High; survey scope, exhaustive |
| Maintenance cost | Low; if the scenario changes, write a new recipe | High; scope-creep over time, hard to amend without breaking other parts |
| Staleness | Detectable; recipe is scoped enough that a single L1 entity change clearly invalidates or doesn't | Diffuse; large doc has many semi-independent claims that decay at different rates |
| LLM consumption | Good; small focused context, leaves room for L1 augmentation | Risky; large context might crowd out the live L1 the LLM should also be reading |
| Discoverability via embeddings | High; tight topical embedding | Diluted; broad doc embeds to a vague centroid that doesn't match specific user queries well |

**Matching project memory:**

- `project_qw_oracle_product_vision.md` -- "real product is construction not retrieval; Layer 3 encodes patterns; version-aware retrieval is free." Recipes ARE patterns the LLM applies; encyclopedias try to BE the answer.
- Deep-modules philosophy (CLAUDE.md philosophy doc) -- recipes have a simple interface (one query → one recipe) and deep behavior (LLM + L1 fill in gaps).
- Grug-brain philosophy -- don't over-DRY; copy-paste with small variations beats a hard-to-follow generic solution. Multiple narrow recipes beat one encyclopedic note that tries to cover everything.

**Practical implication:**

When the L3 authoring queue surfaces "HUD customization workflow" as a candidate (per the Phase 8 helpdesk scan), the answer is NOT one massive 1500-line guide covering all of `hud_*`. The answer is several small recipe-shape notes:
- "HUD layout fundamentals" (pos, scale, align, place — worked example with armor icon)
- "Toggling HUD elements on and off" (`hud_<name>_show` family)
- "Building scr_newhud configs" (the workflow + common pitfalls)
- etc.

The LLM combines these on retrieval based on which is most relevant to the user's specific question.

## Lockstep flagging architecture

The L3 multi-domain expansion only works if the staleness story is sustainable. Engine-topic notes flag automatically when L1 changes. **System-topic notes need different staleness signals because the world (drivers, OS releases, hardware) changes outside the QW corpus.**

Detail is captured in `2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` (the "Lockstep flagging architecture" section, added 2026-05-03 alongside this doc). Summary:

- **Engine-topic notes:** L1-driven flags (already supported via the FK-not-FK pattern on `concept_entities`).
- **System-topic notes:** time-based decay via `recheck_after` frontmatter field. Cadence per topic calibrated to how fast that domain moves.
- **Cross-surface:** every concept note has a paired wiki entry on the showcase site. Bidirectional flag contract: edit one → flag the other for review. Same authoritative content, two presentations (LLM-facing terse / human-facing narrative). The contract preserves wording flexibility while guaranteeing factual consistency.

The lockstep flagging architecture turns L3 from "the docs we hope to keep up to date" into "the docs whose decay is detectable and queueable." That's what makes the multi-domain expansion sustainable rather than a slow rot.

## Concrete L3 candidates from the Phase 8 helpdesk scan

These six are the immediate authoring queue once Arc 3 unshelves. ALL are recipe-shape, NOT encyclopedia-shape. ALL cross at least one bucket boundary.

| Candidate | Buckets | Recurring evidence |
|---|---|---|
| HDR + Windows brightness flicker on quit | System + Engine-config | Andeh, nas, Faustov, niomic; community workaround is "turn HDR off before booting QW" |
| Linux + NVIDIA performance baseline | System + Hardware + Engine-config | niomic spent days; spans Wayland vs X11, compositor, governor, sys_highpriority, hud_performance_average measurement gotcha |
| Mic + audio for QW + Discord on Linux | Peripherals + System | niomic + rauvz; USB DAC, pavucontrol/pipewire/alsa, latency tradeoffs |
| qw:// URL handler on Linux | System | niomic, halides; Firefox needs about:config trick + wrapper script; Chromium-family works via register_qwurl_protocol |
| Self-hosting mvdsv/KTX from scratch | Server-side | Knyte, halides, Atom1K; mvdsv binaries + ktx pk3 + qwprogs.qvm + map rotation + masterserver registration |
| HUD customization workflow | Visual customization + Engine-config | nilton, ibsen, halides, Edwhine, Åke Vader; hud_editor + scr_newhud + per-element pos/scale/align quirks |

Each is one recipe, not one encyclopedia. Some break into 2-3 sub-recipes (e.g. HUD customization) at authoring time.

## Schema notes

**No migrations needed.** The Phase 4 schema supports everything proposed:

- `concepts.frontmatter` JSONB → carries `domain: [...]`, `os: [...]`, `audience: [...]`, `note-shape: [...]`, `recheck_after: "YYYY-MM-DD"`, `wiki_url: "..."` without any DDL changes.
- `concept_entities` (FK-not-FK on entity side) → already supports L1-driven staleness detection.
- GIN index on `frontmatter` JSONB → supports filter-by-domain retrieval queries when that becomes a Phase 6 amendment.

The future work is in **authoring conventions** (how operators tag notes with these fields) and **retrieval enrichment** (how `search_concepts` exposes domain filtering), not in the storage layer.

## Trigger / when to revisit

Same trigger as the L2 thread reconstruction parking doc: post-Phase-8 deploy of qw-oracle Arc 1, after `query_log` evidence shows whether L3 coverage gaps are the bottleneck.

If the L2 thread reconstruction work (Stage 4 status tagging + bucket tagging) lands first, the Stage 4 output IS the L3 authoring queue prioritization. The bucket framework is immediately useful at that point.

If Arc 3 prioritizes showcase-site work first, the lockstep flagging architecture becomes load-bearing immediately and the bucket framework is the missing taxonomy that the public-facing wiki needs.

Either way, the three parked threads (L2 thread reconstruction, this doc, showcase-site) are now visibly one connected effort. They were three separate parking docs because the framing crystallized over three separate conversations; the substance is one architecture.

## What this is NOT

- **Not a Phase 8 blocker.** Phase 8 ships with the current 9-concept L3 corpus. The Phase 8 eval failures (q5, q8) are acknowledged as L3 authoring leads -- the eval IS supposed to surface them per its README. The deploy gate calibration accommodates the gap rather than blocking on it.
- **Not a schema change.** Frontmatter is JSONB; everything proposed lives there.
- **Not a retrieval rewrite.** Phase 6's RRF stays unchanged. Domain filtering can be added later; nothing requires it for v1.
- **Not a replacement for L1.** L1 stays the source of engine-fact truth. L3 multi-domain expansion ADDS the system / hardware / peripheral / server-side overlay that L1 architecturally cannot cover.
- **Not a "we should write more concept notes" todo.** That framing misses the structural insight. The insight is that L3 is the operational layer of a complete-player-profile knowledge service, not a docs-replacement project.

## Cross-references

- `2026-05-03-layer2-thread-reconstruction.md` -- Stage 4 primer should incorporate the bucket framework so threads self-tag by domain. Cross-domain threads become L3 candidates by construction.
- `2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` -- owns the lockstep flagging architecture detail. This doc references it.
- `apps/qw-oracle/docs/phase-8-eval-candidates.md` -- the helpdesk scan that surfaced the 6 cross-domain candidates above.
- `docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md` -- the showcase-site design that the lockstep architecture extends.
- Memory: `project_layer3_two_path_curation` (community-curated imports + newly-earned authoring), `project_qw_oracle_product_vision` (active-assistance product framing), `project_qw_oracle_vision` (three-layer architecture).

---

End of document. When picked up, append execution notes here or open a new spec / phase MD per the arc's conventions.
