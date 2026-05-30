# EXECUTE Phase 4 -- MVDSV fill (2026-05-16 KTX/MVDSV L1 describe-fill)

You are the **arc-executor** for **Phase 4** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc. APPROVED +
PLAN-COMPLETE (MD drafted 2026-05-17). You EXECUTE it -- close the MVDSV
slice of the describe-fill: every in-scope MVDSV configurable knob
(cvar / command / cmdline_param / info_key) ends affirmed-or-synthesized
through the synthesize -> verify loop, residue tracked to the C1 outreach
track. You are NOT drafting; `phase-4-mvdsv-fill.md` is the contract.

Invoke the `arc-executor` skill first. Working dir:
`/home/paradoks/projects/quakeworld`.

**This prompt carries dated augmentations (2026-05-30) that SUPERSEDE
specific stale lines in the MD.** The MD was drafted against a
planning-state DB; the KTX side has since shipped, the D7 contract
hardened (B1-B5), and a 2026-05-30 scoping session re-verified the MVDSV
substrate. Where this prompt and the MD differ, THIS PROMPT governs for
the named items (and `decisions.md` governs over both per the arc
precedence rule). The augmentations are the load-bearing read.

## Scope check -- right arc/phase only if these hold

Tell-tale: **MVDSV** fill -- the D6 skill (`describe-fill-synthesis`)
evaluates every in-scope MVDSV entity (cvar M=183 / command M=108 /
cmdline_param M=11 / info_key M=45), each affirmed-or-synthesized through
the synthesize -> **V-pass** loop (the B1-B5 contract, NOT
tier-1-as-MD-written -- see Augmentation 1), `sv_antilag` described DUAL
per D10, C3 suspects dead-stamped + routed. STOP if your goal looks like
a sibling arc (KTX source-synthesis = Phase 3; embedding pipeline;
game-mode L3 prose; libclang reachability; `dusty-*` fork extraction) or
like KTX work of any kind. MVDSV only.

## Required reading (all, before executing)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-4-mvdsv-fill.md`
   -- THE contract (1323 lines). Goal, Recon facts, Tasks 1-8,
   phase-boundary, C4 recovery, Open Questions (a)-(e). Read cold +
   critically. **Then read the augmentations below, which refresh it to
   2026-05-30 live state.**
2. `.../decisions.md` -- read every DATED block in full. Load-bearing for
   Phase 4: **D7 Amendment 2026-05-19 (B1-B5)** -- the V-pass contract
   that REPLACES the MD's "tier-1 independent re-check" framing (see
   Augmentation 1); D5 (+ amendment: a comment never auto-counts as done
   -- every row is evaluated); D6; D8 (bot/judgment mechanism-only = COMPLETE
   L1); D10 (`sv_antilag` DUAL; value-diffs route to L3, not L1-flagged);
   C1-C5; P1-P5.
3. `.../review-findings.md` -- your Phase 4 rows: **F-D12a (the
   ezquake.com "124" is a SHAPE not a metric -- never a NN/183 ratio)**,
   **F-D12b (the load-commands free win -- 28/108, SHIPPED `f3b356f3`)**,
   **F-C2a / F-D10c (the `sv_antilag` cross-fork DUAL -- describe dual,
   do NOT extract the dusty-* fork)**, **F-C3b (detect/stamp/route C3
   suspects, do NOT classify reachability)**.
4. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- SOURCE OF TRUTH. Read the `## Amendment precedence` clause FIRST: a
   dated amendment GOVERNS the original text; "spec wins" is never
   "original wins over amended".
5. `~/.claude/skills/describe-fill-synthesis/SKILL.md` -- the D6 skill
   you fan out (the unit of work). Read it; note its 5 `references/`
   files load at dispatch (incl. `enforce-trace-discipline.md` = B1).
6. `phase-4-drafter-prompt.md` + `phase-template.md` -- phase shape +
   verification sub-agent brief.
7. Live recon (verify, do NOT trust the MD's planning-state numbers
   blind): the current DB state; the Phase-1 spine
   (`apps/qw-oracle/scripts/describe-fill/review-gate.ts`,
   `serialize-audit-review.ts`, `synthesize-ktx.ts` as the Phase-3
   driver precedent); the V-pass prompt template
   `.../v-pass-handover-prompt.md` (you adapt it for MVDSV).

## Orchestrator augmentations (2026-05-30 -- carry these; they refresh the MD)

### Augmentation 0 -- PRECONDITIONS NOW SATISFIED (the MD's "BLOCKED" premise is stale)

The MD repeatedly states "the arc is in PLANNING; Phase 0/1/2/3 are
approved-not-executed" and "Phase 4 EXECUTION presupposes Phase 0+1+2+3
EXECUTION ... else BLOCKED" (MD Recon block, Inputs, Open Q (d)). **That
premise is OBSOLETE. Verified live 2026-05-30:**

- highest migration = **018** (the MD assumed 013; Phase 1's 014 trail
  columns exist -- all 13 `description_*` columns present incl.
  `description_provenance`, `description_verdict`, `description_anchor_version`,
  `description_rereview`).
- `apps/qw-oracle/scripts/describe-fill/` EXISTS with `review-gate.ts`,
  `synthesize-ktx.ts` (the Phase-3 driver -- your `synthesize-mvdsv.ts`
  precedent), `apply-l1-from-ledgers.py`.
- `~/.claude/skills/describe-fill-synthesis/` (the D6 skill) EXISTS.
- `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts` EXISTS.
- the Phase-0 free win SHIPPED (`f3b356f3`): MVDSV command DB state is
  **28 `source_inline` / 80 NULL** (the banners reached `entities`).

So Phase 1 (spine), Phase 2 (KTX mechanical), Phase 3 (KTX synthesis)
have all shipped; the spine Phase 4 consumes is real. **Do NOT halt
BLOCKED on the MD's planning-state language.** Re-verify each of the
above yourself (verification discipline), then proceed.

**The ONE genuine open precondition -- the C3 suspect pool.** The MD
makes Phase-0's MVDSV C3 suspect pool a hard synthesis prerequisite
(C3/D12). Phase 0's *free win* shipped, and a self-built dump exists at
`apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/selfbuilt-devhead-2026-05-17.log`,
but verify whether a per-(engine,type) MVDSV `c3-suspect-pool.md` artifact
actually exists under `phase-0-artifacts/`. **It is NOT needed for the
calibration batch (Augmentation 2)** -- the 12 calibration knobs are all
common live knobs (`suspect_pool_member=false`). It IS needed before the
full-volume run. If absent, surface it: the volume run either runs the
Phase-0 C3 task first OR the operator explicitly accepts a
suspect-pool-less first pass. Do not silently skip it; do not block
calibration on it.

### Augmentation 1 -- the D7 contract is B1-B5 (the V-pass), NOT the MD's "tier-1 re-check"

This is the single most important carry-forward (README:
"the not-yet-written Phase-4 executor prompt MUST carry decisions.md D7
B1-B5 before Phase 4 runs ... running under the un-amended prompt
reproduces flavour-C on MVDSV from zero"). The MD's Task 6 ("D7 tier-1
independent automated evidence re-check") was written 2026-05-17, BEFORE
the 2026-05-19 B1-B5 amendment. **The current verify contract:**

- **B1 -- enforce-trace, every clause (both engines, every D6 run).**
  Already hard-coded in the `describe-fill-synthesis` skill +
  `references/enforce-trace-discipline.md`. For every
  semantic/threshold/polarity/scope/OFF-state/side-effect clause, the
  synthesizer locates the line that ENFORCES it and verifies against that
  line's code incl. adjacent comments. A clause derivable only from the
  name / an announce string / an enum name / a config comment with no
  enforcing read-site is FORBIDDEN -- hedge or drop, never assert. A
  cited consistent-LOOKING line is not a pass (the r42 lesson).
- **The V-pass REPLACES "tier-1 as MD-written."** A synthesized row's
  gate is a clean **V-pass**: an independent, read-only, per-clause
  enforcement RE-TRACE against the source oracle, in a SEPARATE cold
  context from the authoring sub-agent. It CLASSIFIES only (TRACED-CLEAN
  / C-NEAR-MISS / C-FIX / WI2-FIX) and modifies no description, no DB, no
  file. The error-catching power is the **context independence**, not the
  model tier -- the operator HTML scan was MEASURED unable to see the
  flavour-C class (a wrong clause reads perfectly clean to a human).
- **B4 -- seeded re-synth on a flag.** A V-pass-flagged row gets NO
  hand-patch and NO blind re-fan. It routes back through the D6 skill
  FROM STEP 1, SEEDED with the V-pass finding (the wrong clause + the
  enforcing file:line) as a mandatory anchor, runs the FULL
  trace-every-clause pass, emits a new record, and is RE-VERIFIED through
  the V-pass. Loop terminates at TRACED-CLEAN or a genuine hedge/residue.
- **B5 -- two-stage durable record.** Stage 1 = the V-pass
  classification ledger (every row's knob / classification / per-clause
  enforcing-line citations); Stage 2 = the change report (per corrected
  row: old -> new + wrong clause + enforcing line + V-pass finding +
  re-synth + re-V result). Machine-collatable.
- Adapt `.../v-pass-handover-prompt.md` for MVDSV (the KTX template is
  the proven prototype: F-V1 strided partition + F-V2 structural canary;
  ~16.5k tokens/row, 4-5 rows/subagent, parallel waves). Source oracle =
  the loaded MVDSV head, not KTX.

**Both passes run Opus MAX** (operator decision 2026-05-30: no
cheaper-verify experiment; synthesis is generative-hard, the V-pass earns
its catch from independence). See Augmentation 4 for the version label.

### Augmentation 2 -- CALIBRATION BATCH FIRST (operator: do not one-shot; scale on yield)

The MD's Task 5 fans the D6 skill over ALL in-scope entities at once.
**Operator instruction 2026-05-30: do NOT one-shot. Run a small
known-answer calibration batch, measure yield, scale up only if yields
are good.** MVDSV source is materially different from KTX -- prove the
loop on a handful before committing volume. This is an ADDED gate in
front of Task 5, not a replacement for it.

**The calibration batch -- 12 knobs, every verdict path + a known-answer
trap (all verified live 2026-05-30):**

| # | knob | type | input state | predicted verdict | what it calibrates |
|---|---|---|---|---|---|
| 1 | `floodprot` | command | banner says "Sets the gamedir and path to a different directory." (WRONG -- it is flood rate-limiting; `sv_ccmds.c:1586` comment is a copy-paste fossil, even the banner title reads `SV_Floodport_f`) | synthesized | **THE catch.** If synth trusts the banner, the V-pass MUST flag it against the function body (`SV_Floodprot_f`, fp_messages/persecond/secondsdead). Known answer. |
| 2 | `gamedir` | command | banner correct ("Sets the gamedir...") | affirmed | no false-positive on the CORRECT twin |
| 3 | `sv_gamedir` | command | "Sets the fake *gamedir to a different directory." | affirmed/synth | disambiguation of the near-identical name |
| 4 | `acc_list` | command | "shows the list of accounts" | affirmed | clean affirm (command) |
| 5 | `kick` | command | "Kick a user off of the server" | affirmed | clean affirm |
| 6 | `rcon_password` | cvar | "password for remote server commands" | affirmed | clean affirm (cvar) |
| 7 | `edict` | command | "For debugging, prints a single edic**y**" (typo) | affirm/synth | does affirm copy the typo or clean it? |
| 8 | `maxfps` | cvar | "It actually should be called maxpps (max packets per second)..." | synthesized | reject dev-rationale, write user-WHAT |
| 9 | `coop` | cvar | "dont delete this variable - it used by mods" | **hedged** | confabulation guard -- no admin-facing read-site behavior |
| 10 | `sv_accelerate` | cvar | no comment | synthesized | cold-synth, common `sv_` |
| 11 | `pm_ktjump` | cvar | no comment | synthesized | cold-synth, physics |
| 12 | `addip` | command | no banner | synthesized | cold-synth, admin command |

Run the FULL loop on these 12 (D6 synthesize -> V-pass -> seeded re-synth
on any flag -> operator tail). Then STOP and report the **yield
scorecard** before any scale-up:

- **Did the V-pass catch `floodprot`?** (binary; the headline -- if NO,
  the independent-verify design has a hole, fix before scaling)
- **affirm rate** (expect ~5/12: gamedir, acc_list, kick, rcon_password,
  + edict-or-sv_gamedir)
- **synth-clean rate** (synthesized + passed V-pass first try)
- **re-synth rate** (V-pass flagged -> needed correction; the key health
  number)
- **hedge/residue rate** (expect `coop`; flag any others)

**Scale decision (operator-gated -- you report, operator says go):**
good yield = floodprot caught + low re-synth rate + clean affirms ->
scale to the first real SUBSYSTEM batch (a coherent prefix cluster, e.g.
`pm_*` movement ~6, or `qtv_*` ~6, NOT a random slice). High re-synth
rate -> the synthesis prompt needs work BEFORE scaling (fix the skill /
the per-knob brief, re-run the 12). Do not proceed to full volume off a
bad calibration.

**`sv_antilag` is NOT in the calibration batch.** It is the D10 cross-fork
DUAL (a 1-of-1 hard special case needing dusty-ktx + mainline-KTX
cross-reference evidence). It dilutes calibration yield numbers and
deserves dedicated attention -- handle it as the first hard case of the
SECOND batch, per the MD's Task 5 DUAL handling + Task 8 operator tail.

### Augmentation 3 -- corrected source facts (the MD has two stale specifics)

- **nQuake `mvdsv.cfg` grammar is BARE-CVAR, not `set` (MD Task 2 is
  wrong).** MD Task 2 step says parse `^\s*set\s+(\S+)\s+(\S+)\s*//...`.
  Verified live 2026-05-30:
  `research/repos/nquake-distfiles/sv-configs/ktx/mvdsv.cfg` uses
  `<cvar> <value> // <comment>` with NO `set ` keyword (e.g.
  `maxclients 32 // maximum clients`, `timeout 65 // seconds to wait for
  zombies`, `floodprot 10 1 1 // flood protection - allow x messages...`).
  88 commented lines, ~63 cvars covered. The shipped-config sibling
  parser's grammar must match the bare-cvar form -- the `set`-prefixed
  KTX `.cfg` grammar is the KTX file's shape, not MVDSV's. (`port_template.cfg`
  -- confirm its grammar live before parsing.) This is a meaningful
  synthesis source after all (an earlier scoping note that called it
  "thin / zero set lines" was a grep artifact -- corrected here).
- **Extraction is faithful and complete for the knob set (no re-extract
  needed).** Verified live 2026-05-30: a fresh extraction is byte-stable
  vs the loaded set (183/108/11). The only "missing" cvars
  (`qport`/`sv_forcenqprogs`/`sv_highchars`) are correctly EXCLUDED
  (`#ifndef SERVERONLY` / `#ifdef WITH_NQPROGS` / commented-out dead
  code -- all absent from the production runtime dump too). MVDSV uses
  ONLY `Cmd_AddCommand` (no macro variants; no `Cmd_AddMacro`). Do NOT
  burn a task re-running extraction expecting new knobs -- there are none.
- **The ~7 wrapper-hidden cmdline flags are a KNOWN, out-of-scope gap.**
  `_handler_cmdline.py` catches only `COM_CheckParm("-literal")`; ~7
  flags pass through wrapper helpers (`SV_CommandLineEnableCheats()` etc.)
  and are not extracted (the MD's "8 man-only macro-wrapped flags"
  residue is this class). Per D9 fill-not-create + arc non-goals, Phase 4
  RECORDS + tracks them to C1, never creates entities. (Recovering them
  is a Pattern-2 extractor extension -- a separate concern. Note for the
  operator: these are launch-config flags that the downstream L3
  server-setup guide will want, so the operator may choose to scope that
  small extractor enhancement separately -- flag it, do not action it
  here.)

### Augmentation 4 -- model version label (Opus 4.7 -> Opus 4.8)

Every "Opus 4.7 MAX" in the MD / decisions / spec is a label from when
those were written. The lock was always **"Opus MAX"**; the current MAX
model is **Opus 4.8** (`claude-opus-4-8`). Dispatch D6 synthesis sub-agents
and V-pass sub-agents at Opus 4.8 MAX. The dial is spec-locked (D7), NOT
lowerable, NOT a planner choice.

### Augmentation 5 -- anchor_version + context budget

- **anchor_version:** a `synthesized` MVDSV row's
  `description_anchor_version` = `git describe` of the loaded MVDSV
  dev-head. Session-observed MVDSV source commit = `18d03621` (Apr 7
  2026). Recon it live (`git -C research/repos/mvdsv describe` + the DB
  `versions` row for mvdsv); do NOT hardcode blind -- if Phase 0's
  re-extract-forward advanced it, use the advanced value.
- **Context budget:** the MD flags Phase 4 as 200-400k, subagent-heavy
  (the heaviest single-engine phase -- mechanical extract + synthesis
  fan-out + cmdline in one). With the calibration-first gate, the first
  unit is SMALL (12 knobs). If you enter the ~350k smell zone during the
  volume tail, wrap cleanly and write a fresh-terminal resume handoff at
  `docs/superpowers/parking/2026-05-30-mvdsv-l1-phase4-executor-resume.md`.
  Do NOT push the highest-judgment work (D6 synthesis / the V-pass) past
  the smell zone -- judgment fidelity degrades exactly there.

## Critical rules (locked; do not relitigate)

- **Verification discipline -- highest priority.** Re-derive every
  load-bearing number / path / shape via psql / grep / ls. A prior
  session's "verified" / "approved" is a hypothesis -- including this
  prompt's augmentation facts (re-confirm migration 018, the spine files,
  the DB counts, the mvdsv.cfg grammar). The MD's planning-state numbers
  are stale by construction.
- **Completeness is non-negotiable (C1).** Every in-scope MVDSV entity
  ends affirmed-or-synthesized OR an enumerated C1-outreach residue row
  -- never a NULL-everything row, never importance-cut. "rare dedicated-
  server knob, skip it" is a C1 violation: surface it as a deviation, do
  NOT silently comply. M (183/108/11/45) is never lowered. Scope
  category = the 3 knob types + info_keys; log_template / protocol_message
  / qc_builtin are correctly OUT (structural, not tunable knobs).
- **D6 confabulation guard (hard).** Not source-legible -> hedge, or
  route to C1; NEVER guess, even at Opus MAX. Name-only synthesis is
  FORBIDDEN (the skill's Step 1 rule).
- **`sv_antilag` is described DUAL (D10); the `dusty-*` fork is NOT
  extracted (F-D10c).** C3 suspects detected/stamped/routed, NOT
  reachability-classified (F-C3b).
- **C4 -- repair by re-running the corrected pipeline, never a hand
  `UPDATE`.** A systemic D6 error = fix the skill + re-fan, not row
  patches. JSONB binds JS values / `tx.json`, never pre-stringified (P2).
- **D9 fill-not-create.** Phase 4 fills description fields on EXISTING
  rows; it creates ZERO entities. The man-only / Windows-only /
  config-drift residue is recorded + tracked, never INSERTed.
- The dated amendment GOVERNS its original text. Never silently override
  a lock; never silently comply against one -- surface it.
- ASCII only in committed docs / code. Bun runtime; append-only
  migrations + `SCHEMA.md` same task. Main-tree git, commit-on-main, push
  at checkpoints, no worktree / PR ceremony (you run git silently; the
  operator does not touch git). Commit ONLY this arc's MVDSV files (the
  pre-existing uncommitted parallel-arc drift is not ours).

## First actions (cold start)

1. Invoke `arc-executor`. Read the MD + decisions DATED blocks +
   review-findings Phase-4 rows + the D6 skill + this prompt's
   augmentations.
2. Re-verify Augmentation 0 live (migration 018; the spine files; the D6
   skill; the MVDSV DB counts cvar 35/148, command 28/80, cmdline 0/11,
   info_key 45/0). Confirm preconditions satisfied; check whether the
   MVDSV C3 suspect-pool artifact exists (needed pre-volume, not
   pre-calibration).
3. Build / confirm the two mechanical siblings (MD Tasks 1-3) with
   Augmentation 3's corrected `mvdsv.cfg` grammar -- OR, if you and the
   operator prefer to prove the synthesis loop first, you may run the
   calibration batch (Augmentation 2) ahead of the mechanical extract
   (the 12 calibration knobs don't depend on the shipped_doc candidates;
   8 of them have a live banner/comment already in the DB, 4 are
   cold-synth). Recommend: calibration FIRST -- it is the cheapest proof
   that the loop works on MVDSV before any volume build.
4. Run the 12-knob calibration batch through the full synthesize ->
   V-pass -> (seeded re-synth) loop at Opus 4.8 MAX. Adapt the V-pass
   prompt for MVDSV from `.../v-pass-handover-prompt.md`.
5. STOP. Report the yield scorecard (Augmentation 2) -- especially
   "did the V-pass catch floodprot?" -- and HALT for the operator's
   scale-up decision. Do NOT proceed to full volume off this prompt
   alone; the scale-up is operator-gated.

## Halt-and-report contract

Execute each task per its declared Execution mode (D6 synthesis + V-pass
= Opus 4.8 MAX, NOT lowered; mechanical siblings + assembler per the MD's
named dials). After the calibration batch, HALT with one status:
**DONE** (calibration clean, scorecard reported, awaiting scale-up
go) / **DONE_WITH_CONCERNS** (loop ran, yield flags a problem -- name it)
/ **NEEDS_CONTEXT** / **BLOCKED** (a precondition genuinely missing --
name which). Report: the yield scorecard verbatim (the 5 metrics + the
floodprot-catch binary), per-knob verdicts vs predicted, any V-pass
catches with the wrong-clause + enforcing-line, the C3-suspect-pool
status, and a one-line scale-up recommendation. A "PASS" without the
per-knob verdict table is not acceptable. Do NOT scale to volume without
the operator's go.
