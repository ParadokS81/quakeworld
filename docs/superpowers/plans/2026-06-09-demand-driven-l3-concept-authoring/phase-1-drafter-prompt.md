You are drafting the **Phase 1** MD for arc **`2026-06-09-demand-driven-l3-concept-authoring`** -- the L3 player-help concept-notes arc. You are DRAFTING the phase plan, not executing it.

**Sibling-arc guard:** the neighbor is `2026-06-09-docs-quake-world` (the L1 reference site). If your reads pull toward VitePress / build-snapshot / per-codebase reference rendering, you are in the WRONG arc -- stop. This arc authors concept notes.

**Working directory:** `/home/paradoks/projects/quakeworld/`

## What Phase 1 delivers

**Tier-1: 7 new player-help concept notes (~41% of all FAQ demand).** Authored via the `domain-concept-curate` skill (built in Phase 0), each gated by the per-domain runner AND operator prose review. The domains (size-ranked, per `decisions.md` D1/D2):

1. **HUD configuration** (frags/sbar/ibar/team-score/notify) -- 544 threads, the single biggest.
2. **Onboarding & install** (new player, download, pak files, fragfile.dat) -- 397.
3. **World rendering & brightness** (drawflat/outlines/gamma/palette) -- 309.
4. **Textures & models** (HD packs, simpleitems, pk3) -- 232.
5. **Network & connection** (packet loss, antilag, proxies, cl_c2sdupe) -- 211.
6. **Projectile/powerup cosmetics** (rocket/grenade/LG colors, trails) -- 200.
7. **Demo recording & playback** (record/stop, qwd/mvd) -- 149.

## Inputs from Phase 0 (must exist + be approved)

- The `domain-concept-curate` skill + its `_methodology/` doc.
- The per-domain acceptance runner (scores a domain's threads, confab-checks).
- The anti-confab guardrail in place.

If Phase 0 is not approved, STOP -- Phase 1 cannot gate a note without the runner or author one without the skill.

## Required reads (in order)

1. `…/decisions.md` -- esp. **D1/D2** (taxonomy/ranking), **D3** (note-primary), **D4** (drafts/review split), **D5** (source-truth/no-confab), **D6** (note architecture), **D10** (gate), **D14** (parallel drafts @ Sonnet MAX).
2. `…/review-findings.md` -- esp. **F5** (3-part refs for cross-link edges).
3. `…/phase-template.md` + `contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md` (the note-structure contract).
4. **The skill:** `domain-concept-curate` (Phase 0 output) + its methodology doc -- this is HOW each note is authored.
5. **The demand map:** `docs/superpowers/parking/2026-06-09-helpdesk-faq-landscape.md` + `apps/qw-oracle/scripts/calibration/scratch/faq-clusters.json` -- map EACH Tier-1 domain to its cluster(s)/threadIds so the runner knows which threads to gate against. `faq-domains.ts` carries the rank->domain reference.
6. **The template notes:** `apps/qw-oracle/curated/concept-notes/{weapon-scripts,player-skins,lightning-gun-customization}.md` -- the shape/voice/depth to match. weapon-scripts is the proven exemplar.

## How to draft

Draft `phase-1-tier1-notes.md` against `phase-template.md`. The natural shape is **one task per domain** (7 tasks), notes being independent within the tier (D14) -> parallel fan-out.

Each per-note task carries:
- **Goal:** author the `<domain>` note.
- **Files:** `apps/qw-oracle/curated/concept-notes/<slug>.md` (Created).
- **Steps:** invoke `domain-concept-curate` for the domain (it runs pre-flight / source-verify / cross-engine / draft per the note architecture). Map the domain to its threadIds (read 5). Then `bun run load-concepts` (D13: Bun, whole-dir scan).
- **Verification:** the runner moves the domain's representative threads dig/PARTIAL -> platter/NAILED + **zero confab**; then operator prose review (the second gate, D4).
- **Execution mode:** `subagent (Sonnet MAX)` -- judgment-dense multi-source synthesis (D14).

Note in the MD that the 7 drafts can run in parallel (independent), but each gate + operator review is per-note.

## Verification at the phase boundary

- All 7 notes load clean (`bun run load-concepts`, 0 errors).
- Each note: runner = NAILED + zero-confab on its domain threads.
- Each note: operator prose-reviewed + approved.
- Coverage: ~41% of FAQ demand now on a platter.

## After drafting

Dispatch the sub-agent verifier (brief in `phase-template.md`): file paths, entity/column claims, decisions + contract alignment (esp. name-by-domain, audience sections, 3-part refs), execution-mode sanity, regime self-containment. Apply findings; decisions win on conflict (record rejections in "Open questions").

**Then halt** with the standard status report (phase MD path, task list + modes, verification regime, open questions, DRAFTED / DRAFTED-WITH-CONCERNS). Do NOT author the notes -- execution is a separate fresh terminal.
