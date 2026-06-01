# MVDSV describe-fill -- session-boundary handover -> Chunk 3

**Written:** 2026-06-01, end of a session that shipped Chunks 1-2.
**For:** a fresh terminal picking up the WORKFLOW chunk-campaign at **Chunk 3 (commands: admin/ban)**.
**This file is the delta; the brief is the save-game.** Re-verify anything here before acting -- it is a hypothesis as of the write date.

## Spawn prompt (paste into the new terminal)

> You are the MVDSV describe-fill WORKFLOW orchestrator. Read
> `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/workflow-chunk-campaign-brief.md`
> and `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/chunk3-handover.md`, then run
> **Chunk 3 (commands: admin/ban)** per them. Session at `/effort max`. Do NOT synthesize inline --
> the Workflow runner dispatches the agents. Recon, gate, persist, improve the brief + findings; then HALT.

## Where things are (verified this session)

- **Shipped:** Chunk 1 `c3-dead-network` (10 cvars, commit `bd54ff9b`) + Chunk 2 `physics-movement` (15 cvars, commit `6831af03`). **175/347 done, 172 remaining** -- buckets: cvar 95, command 66, cmdline_param 11 (info_key 45/45 done).
- Synthesized-origin rows: **73**. In-scope MVDSV fingerprint: `31ad65f4`. Anchor: `1.11-53-g18d0362`.
- **Runner tuned** (commit `20974e3c`): a canary miss now re-runs ONLY the failed canary, escalating to an HG1 halt on a persistent miss -- it no longer bulk-re-runs the wave.
- **Findings report** `mvdsv-describe-fill-findings.md`: 13 rows; brief step 7 auto-feeds it each chunk.

## Reads required (in order)

1. `workflow-chunk-campaign-brief.md` -- the per-chunk loop, chunk plan, per-shape rule blocks, args shape, cursor, learnings. **This is the authoritative process doc.**
2. This file -- the Chunk-3-specific delta below.

## Chunk 3 = commands: admin/ban -- NEW SHAPE

**Live set (14, recon-verified 2026-06-01 -- re-confirm before fan-out):**

| command | reg | family |
|---|---|---|
| addip / removeip / listip / writeip | src/sv_main.c:3617-3620 | engine IP ban list |
| vip_addip / vip_removeip / vip_listip / vip_writeip | src/sv_main.c:3621-3624 | VIP IP list |
| cuff / mute | src/sv_ccmds.c:1846-1847 | per-player penalties |
| penaltylist / penaltyremove | src/sv_ccmds.c:1849-1850 | penalty management |
| acc_block / acc_unblock | src/sv_login.c:565-566 | account blocks |

Recon query (commands use `command_versions`, no default):
```
SELECT e.name, cv.source_file||':'||cv.source_line AS reg
FROM entities e LEFT JOIN command_versions cv ON cv.entity_id=e.id
WHERE e.project='mvdsv' AND e.description IS NULL AND e.type='command'
  AND (e.name ~ '^(addip|removeip|listip|writeip|cuff|mute)' OR e.name LIKE 'vip%'
       OR e.name LIKE 'penalt%' OR e.name LIKE 'acc_%')
ORDER BY e.name;
```

**Why this shape is new (per the brief's command rule block, paste it into `chunk.rules`):**
- No default / no polarity. The "clauses" are: what it does, **who may issue it** (rcon/admin vs any client -- STATE THIS), arguments, side-effects.
- Locate the handler FUNCTION: `cmd_t` registration -> its `Cmd_*_f`. The enforcing logic often lives in **another file** (comparator / list / format helpers -- the demo/qtv "newest-first" trap). Cite the real enforcing line, not the registration.
- F-MV1: grep `ktx/src` for an override of each command.

**Canaries for commands (different from cvar chunks -- there is no polarity/default to invert):**
Take an ALREADY-FILLED mvdsv command and invert one clause, grepping the registration flags + handler yourself first:
- Good filled sources: `sv_democancel`, `sv_demolist`, `qtv_status`, `stop` (the demo/qtv batch is filled).
- **C-FIX canary:** invert the ACCESS-CLASS ("any client may issue" when it is rcon/admin-only) or the EFFECT.
- **TRACED-CLEAN control:** keep a filled command's description correct.
- Canary knob must NOT be in the synth set. Use ~2-3 (1 per ~6 V-pass workers).

## Critical rules (carry-forward)

- **Source is the only citation.** Existing L1/docs are NOT -- synthesize fresh. Hedge / flag / route-to-residue when source isn't legible; never guess.
- `suspect=FALSE` unless you have a genuine dead-suspect with no live consumer; fold any recon-derived context into `chunk.rules` (as Chunks 1-2 did).
- **Counterintuitively-named knobs need explicit disambiguation from the naive reading** (Chunk-2 lesson: stopspeed / nailhack / airaccelerate). For commands, watch for names that imply a different access class than the code enforces.
- **Chunk 3 is the LAST full operator prose-gate.** Chunk 4+ switch to spot-checks (per the brief).
- **Git:** a parallel session occasionally commits to `main` (qw-oracle concept-notes) -- NOT a collision on this topic. Always path-scope your `git add` to this chunk's files and verify `git diff --cached --stat` before committing. End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## First three actions

1. **Anchor gate:** `git -C research/repos/mvdsv describe --tags` MUST be `1.11-53-g18d0362`.
2. **Recon** the 14-command set (query above); confirm the live set vs this table before fanning out.
3. **Design command canaries** (access-class inversion from a filled command), assemble the args config (brief step 3), and launch `describe-fill-chunk-runner.js`.

## When in doubt

The brief + mvdsv source are ground truth. The orchestrator owns recon / F-D6a / HG2 / the operator prose-gate / all DB+git writes; the Workflow runner owns the parallel synthesis + cold V-pass + canary gate. Never synthesize inline.
