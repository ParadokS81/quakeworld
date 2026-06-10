# Executor prompt -- note #3: `demos` (demand-driven-l3 arc, Phase 1)

**You are the EXECUTOR for ONE player-help L3 concept note.** Fresh terminal, no prior context. Author the `demos` domain note, gate it, report back to the orchestrator. The orchestrator verifies every claim against live source at the boundary -- do real checks, not asserted ones.

## First action

Invoke the **`domain-concept-curate`** skill (the 9-step spine). Run it for:

- **Domain key:** `demos`
- **Label:** "Demo recording & playback" -- Tier 1, cluster rank 9
- **Suggested slug:** `demo-recording-playback` (you finalize in Step 1; match the filename stem)
- **No overlapping note exists** -- verified by orchestrator. The skill will not HALT on classification here.

## Where you are in the arc

This is **note #3 of Phase 1**, one-note-at-a-time. Shipped so far: **#1 HUD** (`hud-configuration.md`), **#2 network** (`network-connection.md`). Read BOTH as exemplars -- but `demos` is an **objective/factual domain like network**, so `network-connection.md` is your primary voice + shape model.

## The skill was refined after note #2 -- apply the new rules (they are already in SKILL.md)

1. **Lead selector (Step 7):** `demos` is the "**no gate, objective best-practice**" case -> **lead with the recommendation itself** ("to record every game automatically: `match_auto_record 1`" / "to record now: `easyrecord <name>`") as terse recs / command-lists. The mechanism / "how MVD demos work" framework is progressive-disclosure DEPTH, never the lead. Do NOT open with a mental-model framework (the anti-pattern caught on note #2).
2. **Voice tier by objectivity (Step 7):** objective/factual domain -> **terse recommendations + command-list examples**, research as depth. NOT weapon-scripts-style long prose. Match `network-connection.md`'s density.
3. **F11 (in skill):** the gate grounds on the full note body for the top hit, but still author so each demand-cluster's headline answer is snippet-reachable (own section / leading sentence).
4. **F12 (LOW risk here):** a NAILED gate certifies "looks right + grounded," NOT "runs" -- HIGH only for script/state-machine domains. `demos` is factual (commands/cvars), so LOW risk; safe without the judge-hardening pass. Still: a NAILED is not ship-ready alone -- **operator prose review (D4) is the real gate.**

## Scope boundaries to respect (the demos analog of network's "server limits listed, not configured")

- **PLAYER-FACING demos only.** The note covers: recording your own demos (`easyrecord`, auto-record), watching/seeking (`demo_jump`, `demo_setspeed`/`demotimescale`, `democlock`, playlists, `demo_controls`), and the common "where do my demos go / how do I watch this .mvd" questions. **Server-side MVD recording (`sv_demo*` on the server) is server-admin -> OUT of scope** (D1, separate future arc); list it as a one-line cross-reference at most, do not document the server config.
- **Live QTV spectating is the separate `spectating` Tier-2 domain.** Demo *playback* is demos; live QTV is spectating. Cross-link, don't bleed in.
- **Demo voice (`demo_voice_*`) and deep MVD internals** (e.g. the demo-start ms timestamp) are niche -- mention only if the demand threads ask; keep the note player-facing.

## Operator-consult gate (Step 6)

`demos` is mostly R6 (factual how-to) but likely carries a light R7 layer (the auto-record / naming-convention recommendation). **If a recommendation layer emerges, run the compact Step-6 consult** (entity set, cross-engine verdict, proposed title + sections, the recommended record/playback setup) before drafting it. The operator paces this and runs the final prose gate. If it stays purely factual, the consult is optional (R6).

## Gate procedure (skill Step 8 -- the executor session runs the Workflow answer step)

```sh
cd apps/qw-oracle
bun run load-concepts          # whole-dir scan; confirm "loaded N" includes your note, skipped 0, warnings 0
bun run embed:chunks           # backfill vectors so hybrid retrieval (VOYAGE key set in dev) sees the note
bun scripts/calibration/faq-gate/faq-gate-retrieve.ts --domain demos   # Stage 1
# Stage 2: dispatch faq-answer-workflow.js via the Workflow tool (agent() path -- NO SDK, no API key)
bun scripts/calibration/faq-gate/faq-gate-confab.ts --domain demos      # Stage 3
# assemble outputs/demos/gate-demos.json
```
Gate passes when every representative thread is NAILED **and** zero hard confab. Re-run the probes yourself; don't trust a stale "PASS". **If a sampled thread's top concept hit is a DIFFERENT note** (k-means mis-clustering, see F14), flag it as sibling-owned rather than forcing it -- do not absorb off-domain content to chase the score.

## Guards (hard)

- **Sibling-arc guard:** a sibling arc (`2026-06-09-docs-quake-world`) is committing to `main` concurrently (slipgate bundles, docs-web, parking docs uncommitted/committed alongside). **NEVER `git add -A`.** Scope every `git add` to YOUR files (the new note only). Run `git diff --cached --stat` before committing -- it must show only your note. If a prompt mentions VitePress / docs-web / build-snapshot, you are in the WRONG arc.
- **Bun, never npm.** **3-part `related_entities`** only (4-part -> EXTERNAL, no edge -- F5). **ASCII hyphens.** JSONB via `tx.json`, never pre-stringified (D13).
- **Commit trailer:** `Co-Authored-By: Claude <your-model-id> <noreply@anthropic.com>`. Per-claim source verifications in the **commit body** (skill Step 9 shape), not the note prose.

## Halt + report

HALT (return without writing) on: classification uncertainty, L1-GAP (a core entity absent from BOTH L1 and source grep), or open operator-consult questions. Otherwise draft favoring source-truth.

Report back in the skill's **return-to-operator shape** (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) with: L1 anchors (verified/declared), cross-engine coverage, mode-gating result (likely "no gate -- flat domain"), sections + line count, **gate result with the actual artifacts**, pending refs, open items, file path, commit SHA, and methodology feedback (contract/voice gaps -- the skill is actively being refined note-by-note). The orchestrator re-runs the gate probes and spot-checks your source verifications against live source before the note is considered shipped.
