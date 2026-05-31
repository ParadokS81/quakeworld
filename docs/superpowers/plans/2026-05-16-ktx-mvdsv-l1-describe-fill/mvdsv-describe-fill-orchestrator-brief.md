# MVDSV describe-fill -- orchestrator brief

**Read this file = you are primed.** It is the durable save-game of the orchestrator's
primed state. A fresh terminal that reads this can run the next batch without re-reading
the 6 scattered methodology docs or re-deriving recon. Distilled 2026-05-31 from the
calibration + batch-1 (pm_*) + batch-2 (sv_demo/qtv) runs.

## How to spawn a fresh orchestrator

Fresh terminal, paste:
> You are the MVDSV describe-fill orchestrator. Read
> `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-describe-fill-orchestrator-brief.md`
> and run the next batch per it. Invoke `arc-executor` first. Do NOT synthesize inline --
> spawn workers. Session at `/effort max`.

That's it. The orchestrator reads this (~brief-sized), dispatches workers (who carry the
heavy synthesis prep in their own throwaway contexts), processes their reports, persists,
appends learnings, commits, and HALTS. One batch per terminal -- then discard and
re-instantiate from this brief (a cheap read), never a slow rebuild.

## Your role -- the CLEAN orchestrator

You DISPATCH and VERIFY. You do NOT synthesize inline. This is the whole reason the
orchestrator stays lean: each synthesis worker loads the skill + 6 references + source
ITSELF (~70-90k each, measured) in its own disposable context. If you synthesize inline
you fuse orchestrator+worker and blow the window in a handful of cvars. Keep the heavy
prep in the workers.

## The loop (6 stages)

0. **Recon + pick the batch.** `git -C research/repos/mvdsv describe --tags` MUST print
   `1.11-53-g18d0362` (HEAD `18d036218004f31cf701bb5060448012652de6d1`). Run
   `bun scripts/describe-fill/synthesize-mvdsv.ts --status` (from `apps/qw-oracle/`).
   Pull the candidate cluster's rows + source_refs from the DB. Confirm the cluster +
   suspect-pool status. **If the live count differs from the plan, confirm scope with the
   operator before fanning out** (batch 2 lesson: the prompt's "no in-game command" was
   wrong; recon caught it).
1. **Synthesis fan-out.** One `describe-fill-synthesis` worker per UP TO 4 knobs (batch template below).
2. **F-D6a grep-verify.** Independently grep every returned source_ref vs live source
   BEFORE trusting it. A fabricated line is a shipped lie.
3. **V-pass.** Independent cold-context workers, knob+description only (template below),
   one canary per wave.
4. **Seeded re-synth (B4)** for any REAL flag that survives HG2.
5. **Persist + idempotency + probes.**
6. **Append learnings + commit + HALT.**

## Source map + access (verified facts -- re-verify the anchor each session)

- Source: `research/repos/mvdsv/src/` @ `1.11-53-g18d0362`. MVDSV-only for V-pass (no KTX).
- cvar declarations carry the registered default + flags (e.g. `sv_demo.c:34-52`,
  `sv_demo_qtv.c:25-27`). Demo cmds register `sv_demo.c:1934+`; qtv cmds `sv_demo_qtv.c:1519+`.
- DB: `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`
- **Join is `cvar_versions.entity_id = entities.id`** (NOT canonical_id). `entities.id` is bigint PK.
- Pull a cluster:
  `SELECT e.name, e.type, (e.description IS NULL) AS null, e.description_origin AS origin, e.description_verdict AS verdict FROM entities e WHERE e.project='mvdsv' AND <filter> ORDER BY e.type, e.name;`
- source_ref + default + comment:
  `SELECT e.name, cv.source_file||':'||cv.source_line AS ref, cv.default_value, cv.trailing_comment FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id WHERE ... ;`
- Write path (from `apps/qw-oracle/`): `bun scripts/describe-fill/synthesize-mvdsv.ts`
  - `--status` -- resume cursor (evaluated vs remaining per bucket)
  - `--from-ledger '<glob>' [--dry-run]` -- persist from per-knob ledgers (the durable path)
  - `--fingerprint` -- committed in-scope md5 (idempotency proof)
  - `--operator-override <name,name>` -- D11 review-tail re-write of a terminal-owned row
- Probes: `bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression`

## SPAWN: synthesis worker (UP TO 4 knobs per agent; model `opus`, MAX reasoning)

Batch mode (operator-locked 2026-05-31): each agent loads the methodology ONCE, then
synthesizes up to 4 knobs -- amortizing the ~22k skill+references read instead of re-burning
it per knob (caching does NOT dedupe it across sibling agents; each is a separate context).
Assign 4 knobs per agent, dispatch the agents concurrently, and fill the per-knob facts from
recon. Hard ceiling 4: beyond that the agent's OWN context climbs into the bloat zone and the
later knobs synthesize in a heavy context. The independent V-pass is the quality gate, so
batching synthesis is safe -- any dilution on a later knob gets caught downstream.

```
Invoke the `describe-fill-synthesis` skill to load its method + 6 references ONCE, then apply
that full discipline to EACH of your assigned knobs (up to 4) in turn. The skill hard-codes the
D5/D20 rubric, enforce-trace, the confabulation guard, and its locked Opus-4.7-MAX dial -- do not
re-derive or lower them. Run at MAXIMUM reasoning. CRITICAL: do each knob fully (grep its
use-sites, enforce-trace every clause, write its ledger), then DROP that knob's source greps /
file-reads from your working set before the next knob -- treat each knob's investigation fresh so
your context does not climb across the 4. Do NOT re-read the references between knobs (already
loaded -- that is the point of batching).

Shared facts (all knobs): project=mvdsv ; anchor=`1.11-53-g18d0362` ; mechanical_candidate=none
(cold-synth; evaluate anyway) ; source root=`/home/paradoks/projects/quakeworld/research/repos/mvdsv`.
HARD GATE before tracing: `git -C <root> describe --tags` == `1.11-53-g18d0362`.
Per-knob facts (one line per assigned knob): knob=`<KNOB>` (C cvar_t var may differ in case --
grep both) ; decl at `<REG_REF>` ; extractor default `<DEFAULT>` ; suspect_pool_member=<FALSE
unless in the C3 pool>. Decl + default are LOCATOR AIDS; find the READ use-sites + enforce-trace
every clause to its enforcing line -- the registration is NOT the citation.

These are simple config cvars -- LEAN D20 description (1-line what + value/unit + Default +
Set-by). NO file:line / engine jargon in `description` (those go in description_reasoning).

Output: write ONE ledger file PER knob at
`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-<cluster>-ledger-<KNOB>.md`
with EXACTLY ONE fenced ```json block = the D6Record below (parsed by --from-ledger; 0 or >1
block is a hard error), plus a human per-clause enforce-trace table around it. VALID JSON
(escape quotes; no raw newlines inside strings; keep description_reasoning single-line).
provenance stays null (cold-synth). Do NOT touch DB/git/commit. RETURN ONLY, per knob: (a) one-line
verdict, (b) the description verbatim, (c) the source_ref(s). Keep all reasoning in the ledgers.

```json
{ "project":"mvdsv","knob":"<KNOB>","type":"cvar","description":"...",
  "description_origin":"synthesized","description_anchor_version":"1.11-53-g18d0362",
  "description_provenance":null,"description_verdict":"synthesized","description_confidence":"high",
  "description_reasoning":"...","description_proposed":null }
```
(hedged/residue_routed -> set verdict accordingly, origin stays "synthesized"; never fabricate.)
Out-of-scope: ONLY your assigned knobs. If a knob doesn't resolve to a live MVDSV entity, skip it + report (don't improvise on others).
```

After the wave: `--from-ledger '<glob>' --dry-run` to confirm all parse + resolve (0 errors).

## SPAWN: V-pass worker (waves of ~6 real + 1 blind canary; model `opus`, MAX, READ-ONLY)

Give each worker only knob + description (B3 independence -- NOT the synth reasoning). It
reads `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`, then
per clause: wide-grep all use-sites, locate the ENFORCING line, verify the exact assertion
against its code + adjacent comments (follow callees). Classify each row: TRACED-CLEAN /
C-NEAR-MISS / C-FIX / WI2-FIX, with a per-clause table (clause | file:line | snippet |
MATCH/MISMATCH/UNTRACEABLE). Oracle = mvdsv @ `1.11-53-g18d0362` ONLY. The worker does NOT
know which row is the canary.

**Canary (one per wave, ground truth YOU establish from source):** plant a known-wrong or
known-correct row (a different knob's real row, inverted polarity / wrong default = C-FIX or
WI2-FIX; a correct row = TRACED-CLEAN to catch over-flagging). Put the canary knob's REAL row
in a DIFFERENT wave (no in-wave dupes). Rotate types: lean on C-FIX (catches false-negatives,
the main risk) + at least one TRACED-CLEAN control (catches over-flaggers).

## PROCESS REPORTS

- **F-D6a:** grep every returned source_ref; confirm it exists + reads the cvar. Zero fabrication.
- **HARD GATE 1 (canary):** wrong canary verdict -> REJECT the whole wave, re-dispatch sharpened
  (quote the enforcing line; sharpen toward discrimination, do NOT add "don't over-flag" -- it
  backfires into under-flagging). Bounded retries; persistent failure -> halt + escalate.
- **HARD GATE 2 (you re-grep >=1 clause/wave, BOTH directions):** a V-pass flag can be a
  FALSE-POSITIVE -- read the enforcing line yourself before trusting a C-FIX. (Batch-2 proof:
  V-pass flagged real `sv_demotxt` C-FIX on "deletes existing .txt"; the clause IS enforced at
  `sv_demo.c:881-882 else Sys_remove(path)` -- the worker missed it. HG2 overturned to CLEAN.)
- **Real flag (survives HG2) -> seeded re-synth (B4):** re-run synthesis seeded with the
  finding, FULL trace-every-clause (not a one-sentence patch), re-V-pass. Terminate at
  TRACED-CLEAN or a genuine hedge.

## PERSIST + idempotency + probes + commit

1. `--from-ledger '<glob>'` (live). Confirm persisted = N, errors = 0.
2. Idempotency: run `--from-ledger` again -> must skip all N as terminal-owned, byte-identical
   fingerprint (also `--fingerprint`). Clobber-guard (F-D9b) protects owned rows.
3. Probes (mvdsv): `jsonb_columns_not_strings` PASS, `describe_fill.synthesized_requires_anchor`
   PASS, `describe_fill.provenance_entry_exists` PASS (gates shipped_doc only).
   `describe_fill.origin_vocabulary` is RED -- PRE-EXISTING KTX `recast_v2` (633 rows, counted
   in both global+arc-scoped = 1266); **0 mvdsv contribution** (verify: mvdsv evaluated origins
   = `synthesized` only). NOT yours. (`synthesized_requires_source_ref` was never registered --
   3 live describe_fill probes, not 4.)
4. Append a batch ledger (`mvdsv-<cluster>-batch-ledger.md`). Commit ONLY this batch's files;
   `git diff --cached --stat` between add and commit. Push at checkpoint. One-line message.

## DECISIONS (locked -- enforce every batch)

- **provenance = NULL for cold-synth** (operator clar. 2026-05-30; provenance holds retained
  shipped-doc/multi-source DATA only). -> still pending fold into decisions.md D11.
- **D20 split:** description = condensed ezquake.com-style user-doc, no file:line/jargon; all
  enforce-trace cites -> description_reasoning. Lean scales to the entity (config cvars run lean).
- **F-MV1:** before documenting any in-game-command UX (or a cvar whose Set-by cites a command),
  grep `research/repos/ktx/src/commands.c` for a KTX override. Failure mode = documenting the
  dead engine fallback when a mod OVERRIDES the command (the `pm_airstep` case). Note: KTX
  CONSUMING a command (localcmd/cvar_fset) is NOT an override -- that's D20 See-also/L3 context.
- **Canary per V-pass wave** (HG1) + **HG2 re-grep both directions.**
- **C4:** repair by re-running the corrected pipeline, never a hand UPDATE; `--operator-override`
  for operator review-tail corrections. JSONB binds JS values / `tx.json`, never pre-stringified (P2).
- ASCII only in committed docs/code. Bun runtime. Commit-on-main, push at checkpoint, no
  worktree/PR ceremony. **One batch per terminal** (halt ~300k; re-instantiate from this brief).
- `sv_antilag` is OUT (the D10 cross-fork DUAL, handled separately).

## CURSOR (update each batch)

- **24/347 evaluated** (calibration not persisted; pm_* 6 + sv_demo/qtv 18 persisted). Remaining 323.
- Buckets: cvar 24 eval / 159 remaining ; command 0/108 ; cmdline_param 0/11 ; info_key 0/45.
- Last commit: `66cf40bc` (batch 2, sv_demo/qtv 18 cvars). Fingerprint `a32ffbe170b0b208fe49503aed52b53f`.
- C3 suspect pool (the only runtime-dead MVDSV knobs): `sv_www_*` / `sv_web_*` / `sv_login_web` /
  `sys_sleep` / `localcommand`. Everything else = suspect_pool_member FALSE.
- **Next-batch candidates:** (a) sv_demo/qtv COMMANDS (16: record/stop/list/cancel/remove/info*
  + qtv list/close/status) + 6 already-commented entries (affirm-or-synth path) -- first real
  F-MV1-on-commands test; (b) `allow_download*` (~8); (c) the C3 suspect cluster -- first
  exercise of the C3 dead-stamp path.

## LEARNINGS LOG (append 1 line per batch -- this is how the process improves)

- [calibration, 12 knobs] 0-affirm: all short/absent comments cold-synth -> full synthesize.
  Loop correctness validated (floodprot copy-paste fossil caught at synthesis AND V-pass).
- [B1 pm_*, 6] Reusable write path `synthesize-mvdsv.ts` stood up. Canary-in-one-wave-only
  left a wave untested -> **canary EVERY wave**. F-MV1 found (engine `airstep` is overrideable;
  KTX replaces it -- documented the dead fallback until operator caught it).
- [B2 sv_demo/qtv, 18] `--from-ledger` durable path added (ledgers git-committed, DB
  reconstructable, no gitignored records.json). F-MV1 MOOT here (KTX consumes sv_demo/qtv via
  localcmd/cvar_fset, never overrides). **HG2 caught a V-pass FALSE-positive** (sv_demotxt) ->
  HG2 is load-bearing in BOTH directions, not just against rubber-stamping. qtv_password lists
  CCITT/MD4/SHA3-512 -- pending trim (method names -> reasoning/L3) via --operator-override.
- [process change 2026-05-31, operator-locked] Synthesis batched to **4 knobs/agent** (was 1) to
  amortize the ~22k method-load (caching does NOT dedupe it across sibling agents -- separate
  contexts). Agent loads the skill once, loops up to 4 knobs, drops per-knob source detail between
  them; ceiling 4 so the agent stays under the bloat zone. Re-dispatch granularity is now
  per-agent. V-pass unchanged (6+1) -- it remains the quality gate that makes batching safe.

## BETWEEN-BATCH IMPROVEMENT RITUAL (the "get better each batch" loop)

After each batch HALT, before discarding the terminal:
1. **Append a learnings line** above (what surfaced, what changed).
2. **New reusable rule?** -> add it to DECISIONS.
3. **Changes how workers should be briefed?** -> edit the worker-brief TEMPLATE here (e.g. the
   `sv_demotxt` non-boolean nudge, the case-mismatch warning -- both came from a batch and
   belong in the template so the next batch's workers start sharper).
4. **Update the CURSOR.**
Commit this brief with the batch. The next orchestrator reads the improved brief -> starts
smarter than you did. That compounding is the entire point of a persistent (file-backed) brain.
