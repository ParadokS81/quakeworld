# Docs Redesign — Session B (Plans 4+5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Plans 4+5 from the docs-system-redesign spec — rewrite the docs-check skill into the two-phase auto-escalating shape (Phase 1 always runs; Phase 2 conditional on arc-shipping signals), and standardize the "Start with OVERVIEW.md" directive across every project's CLAUDE.md.

**Architecture:** The skill rewrite consolidates today's 336-line single-mode flow into a leaner two-phase flow with explicit boundary detection. The CLAUDE.md directive pass is mechanical — same wording template added to each project's "Where to find things" section, with arc-history.md pointers added where they exist. **Plan 4 must run in a fresh session** per spec line 357: rewriting a skill while it's supposed to keep working invites self-modification race conditions.

**Tech Stack:** Markdown editing, git. No code, tests, or build steps. Verification is grep / wc -l / visual scan.

**Spec reference:** `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md` — Plans 4, 5.

**Prerequisites:** Session A (Plans 1+2+3) must be complete. Specifically:
- `~/.claude/skills/docs-check/references/doc-philosophy.md` carries Principle 0 + updated Principles 2/3.
- `~/.claude/skills/docs-check/references/doc-template.md` has the new OVERVIEW.md section with litmus test.
- `docs/superpowers/parking/` exists and is populated.
- HANDOVER.md is in docket shape (≤ 300 lines).
- `apps/qw-oracle/docs/arc-history.md` is the only project-level arc-history.md present.

If any prerequisite is missing, STOP and report — Session B builds on Session A's outputs.

**Out of scope for Session B:** Memory directory consolidation (deferred per spec Out-of-scope). Any further OVERVIEW.md slimming (Session A's pass is the official one).

---

## Plan 4 — docs-check skill rewrite (Tasks 1-6)

### Task 1: Verify Session A prerequisites

**Files:**
- Read-only checks

- [ ] **Step 1: Verify doctrine files have Session A's edits**

Run: `grep -nE "^\*\*0\.|Layer 1 is mandatory" /home/paradoks/.claude/skills/docs-check/references/doc-philosophy.md`
Expected: at least one match per pattern (Principle 0 + Principle 2's appended Layer 1 paragraph).

Run: `grep -A1 "Litmus test" /home/paradoks/.claude/skills/docs-check/references/doc-template.md | head -5`
Expected: shows litmus test in OVERVIEW.md section.

- [ ] **Step 2: Verify HANDOVER is in docket shape**

Run: `wc -l /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: ≤ 300 lines.

Run: `grep -c "^### " /home/paradoks/projects/quakeworld/HANDOVER.md`
Expected: 5 H3 sub-sections in the index (Small followups / Sidequests / Ongoing arcs / Future arcs / Recently opened).

- [ ] **Step 3: Verify parking dir exists and is populated**

Run: `ls /home/paradoks/projects/quakeworld/docs/superpowers/parking/ | wc -l`
Expected: ≥ 16 (README + ongoing arcs + future arcs).

- [ ] **Step 4: STOP and report if any prerequisite fails**

If any of the three checks above failed, do NOT proceed with Plan 4 — Session A wasn't fully shipped. Report what's missing and ask the operator whether to halt or re-run the missing Session A tasks.

If all pass, continue.

### Task 2: Read the existing skill to anchor the rewrite

**Files:**
- Read-only: `/home/paradoks/.claude/skills/docs-check/SKILL.md` (currently 336 lines)

- [ ] **Step 1: Read full current skill**

Run: `cat /home/paradoks/.claude/skills/docs-check/SKILL.md`
Expected: full 336-line skill visible. Pay attention to:
- Frontmatter `name:` and `description:` (must stay unchanged for trigger compatibility — spec line 292)
- Step 4 (Mode 1 — 9 questions)
- Step 5 (Mode 2 — 7 questions)
- Step 7 (six-pattern friction review — to be replaced with one-question journal)
- Step 7.5 (Track A/B triage — to be replaced with 5-category routing)
- Step 9.25 (memory hygiene check — to be replaced with flag-only check)
- Step 9.5 (git state review — kept as-is)

Note the trigger phrases in the description: "lets wrap up", "wrap up", "let's wrap", "lets push and commit", "lets stop for now", "start new session", "let's start fresh", "done for today", "closing out", "end of session", "before I stop", "before we stop". **These must appear verbatim in the new description.**

- [ ] **Step 2: No edits in this task — anchor read only.**

### Task 3: Write the new SKILL.md

**Files:**
- Modify: `/home/paradoks/.claude/skills/docs-check/SKILL.md` (replace entirely; target < 200 lines per spec line 290)

- [ ] **Step 1: Write the new SKILL.md content**

Use Write tool. The new file content:

```markdown
---
name: docs-check
description: Session wrap-up ritual. Use when the user signals end-of-session with phrases like "lets wrap up", "wrap up", "let's wrap", "lets push and commit", "lets stop for now", "start new session", "let's start fresh", "done for today", "closing out", "end of session", "before I stop", "before we stop". Two-phase flow: Phase 1 always runs (slim-doc freshness sweep + HANDOVER triage + friction journal append + memory byte-size sanity + git state review, ~30-60 seconds for small sessions). Phase 2 fires only on arc-shipping signals (existence checks for missing Layer 2 docs, lifecycle pressure calibration, heavier triage, full memory updates). Memory updates run LAST so newly-surfaced facts flow into the same pass.
---

# docs-check — Session Wrap-Up Skill

When the user signals they're wrapping up, this skill runs a **two-phase** wrap-up ritual against every project touched during the session.

**Phase 1 always runs.** It's the lightweight sweep — numerical drift, HANDOVER routing, friction journal append, memory byte-size, git state. Realistic time on a small session: ~30-60 seconds.

**Phase 2 fires only on arc-shipping signals.** It does the heavier work — existence checks for missing Layer 2 docs, lifecycle pressure calibration, full Track A/B triage with 5-category routing, full memory updates. Most small sessions skip Phase 2 entirely.

The skill **announces its decision out loud** so the operator sees what's happening:
- *"Light wrap done — no doctrine sweep needed."*
- *"Arc-shipping signals detected — running doctrine sweep."*

Operator can override either direction in one sentence ("do a full wrap" / "skip the heavy stuff").

**Source of truth:** `references/doc-philosophy.md` and `references/doc-template.md`. Read those before making judgments about what a project's docs should look like — the skill consults them, doesn't re-derive them.

## Why it runs in the main context, not a sub-agent

The value of this skill is introspecting what the main agent *actually did this session*, with full conversation history and mental state still loaded. A sub-agent would start from a blank slate, read git diff, and miss everything decided verbally or explored-and-discarded. Do NOT dispatch a sub-agent for this work. Do it inline.

## Critical override: memory updates happen LAST

Default auto-memory behavior is to save memories as soon as the user says wrap-up. **This skill overrides that.** Memory updates run at the end of the flow (Phase 2 Step 4), AFTER doc updates and friction capture. This ordering matters because earlier steps often surface new memory-worthy facts that should be captured in the same wrap-up.

---

## Phase 1 — always runs

Run these steps in order:

### Step 1. Scope detection

Identify which project(s) were touched this session. Signals:
- File paths edited / written / read — `apps/<project>/...` patterns
- Memory files accessed — memory is monorepo-scoped, so file touches tell you which sub-project mattered
- Git branch — what branch are we on, what project does the branch name imply
- User's explicit project mentions

If multiple projects were touched, run the check for each. If cross-cutting infra was touched (root `CLAUDE.md`, `contracts/`, shared Firestore collections, shared packages), include those too.

### Step 2. Slim-doc freshness sweep

For each touched project, scan the slim Layer 1 + Layer 2 docs for **drift between today's session delta and what the docs say**:
- **Numerical drift** (the dominant high-yield catch): schema versions, entity / row / table counts, MCP tool counts, CLI subcommand counts, catalog sizes, path or filename references that the docs cite. Cheap probe per type: SQL probe, `wc -l`, `ls | wc -l`, `git log --oneline | head`. Pick the canonical number from live source, then patch every cite.
- **Feature-landed-since-last-touch:** did the OVERVIEW map miss something the session built?
- **Path drift:** did a file that the docs name move during the session?

For each drift finding, classify per the **HANDOVER routing model** in Step 3.

### Step 3. HANDOVER triage with 5-category routing

Read `HANDOVER.md` first to resolve any items the session closed (delete BOTH the index line AND the body / parking file). Then triage new findings into one of these categories:

| Category | Where it goes |
|---|---|
| **Drained inline** | No HANDOVER entry. Edit applied directly during this wrap-up. |
| **Small followup** | One-line index entry under "Small followups", body inline in HANDOVER. Days-weeks lifecycle. |
| **Sidequest** | One-liner under "Sidequests" — no body, no parking file. Soon-ish, escalates to arc if it grows. |
| **Ongoing arc** | One-line index entry under "Ongoing arcs" pointing to `docs/superpowers/parking/<file>.md`. Multi-session, in-flight. Body lives in the parking file. |
| **Future arc** | Same as Ongoing but under "Future arcs", with a trigger condition in the description. Multi-session, not started. |
| **Shipped retrospective** | NOT indexed in HANDOVER. One paragraph appended to the relevant project's `apps/<project>/docs/arc-history.md`. Bootstrap arc-history.md only when the project ships its first arc in the new format. |

Apply Track A drains (mechanical fixes — typos, count updates, dropped references, version bumps) inline during Step 2's sweep — those don't need HANDOVER entries at all. Track B equivalents land in one of Small followup / Sidequest / Ongoing arc / Future arc per the table above.

**Never leave findings unassigned.** Every finding has exactly one of: `[drained inline]`, `[small followup]`, `[sidequest]`, `[ongoing arc]`, `[future arc]`, `[shipped retrospective]`, or `[rejected: misfire]`. No prose deferrals.

**Sidequest → arc graduation:** when a sidequest accumulates more than 1-2 sessions of active work or multiple sub-threads, promote it to an Ongoing arc — write a parking file, move the index entry to "Ongoing arcs". Operator decides; this skill prompts the question.

### Step 4. Friction journal append

One question, not a six-pattern checklist: *"did this session reveal anything friction-shaped (tool ergonomics, missing reference, repeated manual work, comm-style observation)?"*

If yes, append one line to `~/.claude/friction-log.md` under the appropriate category. If the file doesn't exist, create it with section headers (tool/infra, reference gap, repeated manual work, communication).

The cross-session aggregation is `/insights`'s job — this skill just captures the day's note.

### Step 5. Memory hygiene quick check (flag-only)

Run: `wc -c /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md` and count files in the project memory dir.

If any of these threshold breaches:
- `MEMORY.md` ≥ 20KB OR ≥ 150 lines
- Project memory file count ≥ 30

Then **flag a Section C finding noting the deferred memory-consolidation arc should be scheduled.** Do NOT consolidate inline. The consolidation arc has its own brainstorm — this skill flags drift, doesn't fix it.

If no threshold tripped, skip this step silently.

### Step 6. Git state review

Read-only state check — never run `git push`, `git merge`, `git commit`, or any state-changing command from this step.

Run these in order:
1. **Uncommitted changes** — `git status --short`. Count + classify (session-related vs pre-existing drift).
2. **Unpushed commits** — `git log @{upstream}..HEAD --oneline` (or `git log origin/$(git branch --show-current)..HEAD --oneline` if no upstream tracking).
3. **Branch divergence vs main** (only if on non-main branch) — `git rev-list --left-right --count main...HEAD`, `git diff --stat main...HEAD | tail -1`, `git log -1 --format=%cr $(git merge-base main HEAD)`. Flag loudly if > 5 commits ahead OR > 20 files changed OR > 7 days since divergence.
4. **Stale local branches** — `git branch --merged main` minus `main`. Low-priority signal.
5. **Remote drift on main** — `git fetch origin main >/dev/null 2>&1` then `git log HEAD..origin/main --oneline`. Flag if origin has unpulled commits.

Findings go to Section F. Same triage applies — Track A drain (push pending commits, delete stale merged branches), Sidequest / Future arc (large branch needing merge), or rejection.

**Edge cases:** not a git repo → skip step entire. Detached HEAD → skip 2/3. No origin / no network → skip 5. On main → skip 3.

---

## Boundary signal scan

After Phase 1, check for arc-shipping signals on each touched project:

- **Files touched > 15** across the session
- **Session produced > 5 commits** (count what the session did, not branch-relative)
- **New top-level file, package, or app** shipped
- **A doc-philosophy mandatory file is missing** on a touched project (forces Phase 2 — quartet completeness is binary)
- **OVERVIEW.md last commit > 7 days ago AND code commits to that project landed since** then (verifiable via git, not session-counting)
- **Operator explicitly stated arc-shipping language** ("the arc is done", "we shipped X")
- **Operator explicitly requested full sweep** ("do a full wrap")

If **zero signals**: announce *"Light wrap done — no doctrine sweep needed"* and finish at the report (Phase 2 + memory updates skipped).

If **any signal**: announce *"Arc-shipping signals detected: <list which signals fired> — running doctrine sweep."* Then proceed to Phase 2.

---

## Phase 2 — conditional

Run only when boundary scan fires. Steps in order:

### Step 1. Existence check (Layer 2 trigger sweep)

Walk this checklist for each touched project. For each "yes," verify the corresponding doc EXISTS; if missing, propose creation per `references/doc-template.md`. **Existence only — freshness already happened in Phase 1.**

1. Did this session add or change a database schema, Firestore collection, or durable data model? → `SCHEMA.md` exists?
2. Did this session touch an API boundary, new external SDK, Tauri command, or cross-project IPC? → `API_CONTRACTS.md` exists?
3. Did this session touch auth, sessions, tokens, or role checks? → `AUTH.md` exists?
4. Did this session add UI components, color tokens, or layout rules? → `DESIGN.md` exists?
5. Did this session add global state, store migrations, or cross-page sync logic? → `STATE.md` exists?
6. Did this session change how to run, build, or test the project? → `DEVELOPMENT.md` exists?
7. Did this session touch deploy config, CI, or release flow? → `DEPLOYMENT.md` exists?
8. Did this session reveal tech debt worth a snapshot? → offer to generate fresh `HEALTH.md`.
9. Did this session touch a curated evolving content corpus (concept-notes/, skill libraries, seed datasets, template galleries)? → `OPERATIONS.md` exists?

Also: is the **Layer 1 quartet** complete (`CLAUDE.md`, `README.md`, `VISION.md`, `OVERVIEW.md` present at root or `docs/`)? Any missing file is a Phase 2 finding regardless of whether the session touched it.

### Step 2. Lifecycle pressure calibration

Read each touched project's `CLAUDE.md` `**Status:**` line. Calibrate how forcefully to push findings:

| Status | Pressure |
|---|---|
| Active | Strict. Fix before wrap-up. Block close-out on material gaps. |
| Maintenance | Normal. Propose fixes, apply with approval. |
| Paused | Passive. Note the gap; don't push. |
| Legacy | None. Don't nudge. |
| Planning | Normal. Pre-code but docs can still be wrong. |

If no `**Status:**` line, treat as Active and add the missing line to findings.

### Step 3. OVERVIEW reconstruction-count diagnostic

Optional Phase 2 question: did Claude reconstruct the project layout from code more than twice this session? If yes, `OVERVIEW.md` is probably stale — propose a refresh (or add to HANDOVER as Future arc if the refresh is non-trivial).

### Step 4. VISION addendum check

Did anything land this session that changes the project's intent statement? Rare. If yes, propose a `VISION.md` addendum.

### Step 5. Memory updates

Save memories captured during the session per the auto-memory four-type model (user / feedback / project / reference). Follow the auto-memory frontmatter conventions in the harness's auto-memory section. Update `MEMORY.md` index with one-liners.

If Phase 1 Step 5 flagged a threshold breach, surface it again here as a recommendation to schedule the deferred memory-consolidation arc. Do NOT consolidate inline.

---

## Mode 1 / Mode 2 → Phase 1 / Phase 2 mapping (provenance)

For readers comparing this skill to its 336-line predecessor:

| Old question | New phase / step |
|---|---|
| Mode 1 Q1-Q9: "does the doc EXIST given the trigger?" | Phase 2 Step 1 |
| Mode 1 Q1-Q9: "if it exists, is it FRESH given today's session?" | Phase 1 Step 2 (freshness sweep) |
| Mode 2 Q1 (was OVERVIEW touched?) | Phase 1 Step 2 |
| Mode 2 Q2 (quartet completeness — mandatory file missing) | Phase 2 Step 1 (and as a boundary signal) |
| Mode 2 Q3 (features that belong on map) | Phase 1 Step 2 |
| Mode 2 Q4 (reconstruction-count diagnostic) | Phase 2 Step 3 |
| Mode 2 Q5 (numerical drift) | Phase 1 Step 2 — the dominant high-yield function |
| Mode 2 Q6 (VISION addendum) | Phase 2 Step 4 |
| Mode 2 Q7 (session friction) | Phase 1 Step 4 (friction journal append) |
| Step 7 six-pattern friction review | Phase 1 Step 4 (collapsed to one question) |
| Step 7.5 Track A/B triage | Phase 1 Step 3 (5-category routing) |
| Step 9.25 memory-hygiene four questions | Phase 1 Step 5 (flag-only) + deferred consolidation arc |
| Step 9.5 git state review | Phase 1 Step 6 (unchanged shape) |

---

## Report shape

After Phase 1 (and Phase 2 if it ran), present a wrap-up report. Every finding carries an explicit category from Step 3.

```markdown
## Wrap-up report

### Section A — Freshness drains (Phase 1)
- [doc name]: [drift detected / fixed inline / handed off] [category: drained inline / small followup / sidequest / ongoing arc / future arc / shipped retrospective / rejected: misfire]
- ...

### Section B — Existence checks (Phase 2 only; absent if Phase 2 skipped)
- [doc name]: [missing / present, stale / present, fresh] [category]
- ...

### Section C — Memory updates
- [memory name] — what was saved and which type
- [if Step 5 flagged threshold: "MEMORY.md hit 22KB / 161 lines — schedule deferred memory-consolidation arc"]

### Section D — Friction journal
- "appended N entries today" or "no entries today"

### Section E — Handover state
- Resolved this wrap-up: [list, or "none"]
- Added this wrap-up: [list with category, or "none"]
- Currently pending after wrap-up: N items across the five categories

### Section F — Git state
- Working tree: [N files uncommitted + summary, or "clean"]
- Current branch: `<name>` — [M ahead / N behind main, files changed, branch age]
- Unpushed commits: [count + subjects, or "none"]
- Stale merged branches: [list, or "none"]
- Remote main drift: [N unpulled, or "up to date"]
- Recommendation: [one actionable line]
```

**No prose deferrals.** "This could be addressed later" / "out of scope for now" / "consider X eventually" without an explicit category assignment is the failure mode this skill exists to prevent. Pick a category.

**Surface rejections.** If any findings are `[rejected: misfire]`, list them at report end and ask: *"I rejected these N findings as misfires. Confirm, or reconsider any as small followup / sidequest?"*

If the user's trigger phrase included commit intent ("lets push and commit"), note that the wrap-up is complete and hand off cleanly to the commit workflow. Do NOT execute commits yourself — that's the user's call.

---

## Edge cases

- **Empty session / no work done:** if the session had no meaningful changes, skip Phase 1 Step 2 (no drift to sweep). Still run Step 3-6 and the boundary scan. Step 4's friction question still applies.
- **Session was all about fixing docs/automation:** still run the full flow. Meta work is work — you have doc changes, memory to capture, friction to review.
- **Multiple projects touched cross-cuttingly:** run Steps 1-3 once per project, then a separate pass on shared infra (root docs, `contracts/`, shared packages).
- **Project missing `**Status:**` line:** treat as Active and add to Phase 2 Step 1 findings.
- **Large drift found:** if drift is huge (entire sections wrong), don't fix everything inline. Add as Future arc with explicit fix-shape (which file, what sections, rough time).
```

- [ ] **Step 2: Verify line count**

Run: `wc -l /home/paradoks/.claude/skills/docs-check/SKILL.md`
Expected: < 200 lines (acceptance per spec line 290). If above, identify and trim verbose sections.

- [ ] **Step 3: Verify frontmatter trigger phrases unchanged**

Run: `grep -E "lets wrap up|wrap up|let's wrap|lets push and commit|lets stop for now|start new session|let's start fresh|done for today|closing out|end of session|before I stop|before we stop" /home/paradoks/.claude/skills/docs-check/SKILL.md | head`
Expected: all 12 trigger phrases present in the description frontmatter.

- [ ] **Step 4: Verify the announce decisions are in the file**

Run: `grep -E "Light wrap done|Arc-shipping signals detected" /home/paradoks/.claude/skills/docs-check/SKILL.md`
Expected: both announce strings present (operator visibility per spec line 291).

- [ ] **Step 5: Verify the 5-category model is documented**

Run: `grep -E "Small followup|Sidequest|Ongoing arc|Future arc|Shipped retrospective|Drained inline" /home/paradoks/.claude/skills/docs-check/SKILL.md | head -10`
Expected: all six category labels present.

- [ ] **Step 6: Verify Mode→Phase mapping table is in the skill**

Run: `grep -E "Mode 1 Q|Mode 2 Q" /home/paradoks/.claude/skills/docs-check/SKILL.md | wc -l`
Expected: at least 9 (one row per Mode 1 + Mode 2 question).

- [ ] **Step 7: No commit (skill file lives outside the monorepo).**

The skill file is at `~/.claude/skills/docs-check/SKILL.md`, not under monorepo git tracking. Edit lands without a monorepo commit.

### Task 4: Smoke-test the new skill against today's git state

**Files:**
- Read-only check; no edits.

- [ ] **Step 1: Walk through the new skill mentally against the current session**

Go through Phase 1 Steps 1-6 against this Session B's actual state:
- Step 1 (scope): touched files include `~/.claude/skills/docs-check/SKILL.md` + the upcoming CLAUDE.md edits in Plan 5. Cross-cutting work, mostly outside the monorepo.
- Step 2 (freshness): no monorepo doc drift expected from Plan 4 alone.
- Step 3 (HANDOVER triage): no new findings expected (the Wrap-up split brainstorm entry was already removed in Session A).
- Step 4 (friction): self-test — did writing the new skill surface friction worth journaling?
- Step 5 (memory hygiene): run the byte-size check.
- Step 6 (git state): expect 1+ commits in monorepo from Plan 5 work; the skill file itself isn't tracked.

- [ ] **Step 2: Run the boundary signal scan**

For Session B's session shape:
- Files touched: probably 2-10 (skill file + CLAUDE.md fleet)
- Commits: likely 5-8 (one per CLAUDE.md edit)
- New top-level shipped: NO (Session A shipped parking dir; B doesn't add a comparable structural artifact)
- Mandatory file missing: NO (Session A verified)
- OVERVIEW.md > 7 days old + new code: NO (Session A just touched all of them)
- Operator language: probably yes (this is the wrap-up of a deliberate arc)

Result: Phase 2 will likely fire on "operator language" + possibly "session produced > 5 commits". That's correct — Session B's wrap should run the full flow.

- [ ] **Step 3: Confirm the skill behaves correctly at this boundary**

Verify the skill's announce string would print *"Arc-shipping signals detected: operator language + N commits — running doctrine sweep."* at this session's wrap. If the announce string would be ambiguous or hard to read, refine in Task 3's edit.

- [ ] **Step 4: Note for Task 6 acceptance:**

The smoke test passed if (a) Phase 1's six steps map cleanly onto today's session, (b) the boundary signals correctly classify Session B as arc-shipping, (c) Phase 2's existence checks would surface no missing Layer 2 docs (Session A verified). Record the result for Task 6's report.

### Task 5: Refresh the docs-check skill description in the harness's user-invocable skills list

**Files:**
- Read-only verification (the harness reads SKILL.md frontmatter; no separate edit needed)

- [ ] **Step 1: Verify the harness sees the new description**

The system-reminder at session start lists user-invocable skills with descriptions pulled from each SKILL.md frontmatter. The new description is in the new SKILL.md from Task 3. No separate edit required — the harness will pick it up on next session start.

- [ ] **Step 2: Note: the next session's start banner shows the new docs-check description.**

If the operator wants to verify mid-session, they can manually re-trigger the skill with one of the trigger phrases.

### Task 6: Plan 4 acceptance verification

**Files:**
- Read-only verification

- [ ] **Step 1: Verify spec acceptance criteria (lines 287-293)**

Run: `wc -l /home/paradoks/.claude/skills/docs-check/SKILL.md`
Expected: < 200 lines.

Run: `head -3 /home/paradoks/.claude/skills/docs-check/SKILL.md`
Expected: `---` / `name: docs-check` / `description: ...` (frontmatter intact).

Run: `grep -c "Phase 1\|Phase 2" /home/paradoks/.claude/skills/docs-check/SKILL.md`
Expected: many matches across the file — not just the headings, but the announce strings, the mapping table, the report sections.

- [ ] **Step 2: Confirm "skill announces phase decisions out loud"**

Already verified in Task 3 Step 4.

- [ ] **Step 3: No commit (skill file outside monorepo).**

---

## Plan 5 — CLAUDE.md directive standardization (Tasks 7-13)

### Task 7: Audit current state of every CLAUDE.md

**Files:**
- Read-only inventory

- [ ] **Step 1: List all CLAUDE.md files and their current OVERVIEW pointer state**

Run: `for f in /home/paradoks/projects/quakeworld/CLAUDE.md /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md /home/paradoks/projects/quakeworld/packages/*/CLAUDE.md; do echo "=== $f ==="; grep -nE "OVERVIEW|ARCHITECTURE-MAP" "$f" || echo "(no match)"; done`
Expected: confirms which projects have explicit directives, which have passive bullets, which have none.

Per the spec audit (lines 319-328) — expected current state:
- `/CLAUDE.md` (root) — passive lookup table pointer
- `apps/matchscheduler/CLAUDE.md` — competing `context/ARCHITECTURE-MAP.md` "READ FIRST" directive
- `apps/quad/CLAUDE.md` — already has explicit directive
- `apps/qw-oracle/CLAUDE.md` — NO reference at all
- `apps/qw-stats/CLAUDE.md` — passive bullet
- `apps/slipgate-app/CLAUDE.md` — already has explicit two-tier directive
- `packages/qw-knowledge/CLAUDE.md` — audit at this point
- `packages/qw-version-resolution/CLAUDE.md` — audit at this point

- [ ] **Step 2: Note the standard directive wording for use across edits**

The standard:

> **Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**

Variations are OK if project context demands (per spec line 335 softened in this update). Acceptance is intent-uniformity, not literal-uniformity.

For projects with two-tier OVERVIEW (slipgate-app has root `OVERVIEW.md` + `docs/OVERVIEW.md`), the existing two-tier directive in slipgate-app/CLAUDE.md already handles it correctly — verify wording matches intent.

The arc-history.md pointer (where it exists):

> | Chronological log of shipped arcs | `apps/<project>/docs/arc-history.md` |

Today only qw-oracle has arc-history.md; qw-oracle's CLAUDE.md needs both the OVERVIEW directive AND the arc-history pointer added.

### Task 8: Add directive to root /CLAUDE.md

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/CLAUDE.md`

- [ ] **Step 1: Read the current "Where to find things" section**

Run: `grep -n -A20 "Where to find things" /home/paradoks/projects/quakeworld/CLAUDE.md | head -25`
Expected: shows the table with "Living map: integration diagram, per-app status, packages, contracts | `OVERVIEW.md`" line.

- [ ] **Step 2: Add explicit directive line after the existing table**

Insert after the "Where to find things" table block, before the next `## ` section. The new line:

```markdown
**Start with `OVERVIEW.md` when working in this monorepo — it's the load-bearing cross-app map (integration diagram, per-app status, packages, contracts).**
```

- [ ] **Step 3: Verify**

Run: `grep -A1 "Start with .OVERVIEW.md." /home/paradoks/projects/quakeworld/CLAUDE.md | head -2`
Expected: shows the new directive line.

- [ ] **Step 4: Defer commit until Task 13 batch.**

### Task 9: Fix matchscheduler CLAUDE.md (remove competing pointer + add directive)

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/matchscheduler/CLAUDE.md`

- [ ] **Step 1: Read the current state**

Run: `cat /home/paradoks/projects/quakeworld/apps/matchscheduler/CLAUDE.md`
Expected: 68 lines visible. Note the lines:
- Line 10: `**OVERVIEW.md** - current-state living map: features, Firestore collections, Discord integration, voice-pairing flow`
- Line 14: `**Architecture Map**: context/ARCHITECTURE-MAP.md - File map, module guide, subsystem overview (READ FIRST for orientation if modifying code)`

- [ ] **Step 2: Remove the "READ FIRST for orientation" framing from the ARCHITECTURE-MAP line**

Edit line 14 to drop the "(READ FIRST for orientation if modifying code)" clause. ARCHITECTURE-MAP.md stays referenced as a Layer 3 reference doc. New line:

```markdown
- **Architecture Map**: `context/ARCHITECTURE-MAP.md` — File map, module guide, subsystem overview. Layer 3 reference doc; consult on demand.
```

- [ ] **Step 3: Upgrade the OVERVIEW.md line from passive bullet to explicit directive**

Append after the existing OVERVIEW.md line (or replace it):

```markdown
**Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries). For deeper File-map / module guide questions, see `context/ARCHITECTURE-MAP.md`.**
```

- [ ] **Step 4: Verify**

Run: `grep -nE "OVERVIEW|ARCHITECTURE-MAP|READ FIRST" /home/paradoks/projects/quakeworld/apps/matchscheduler/CLAUDE.md`
Expected: OVERVIEW.md is now the explicit directive. ARCHITECTURE-MAP.md is referenced but no longer "READ FIRST". `READ FIRST` returns no matches.

- [ ] **Step 5: Defer commit until Task 13 batch.**

### Task 10: Add directive to qw-oracle CLAUDE.md (no current reference at all)

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/qw-oracle/CLAUDE.md`

- [ ] **Step 1: Read the current CLAUDE.md**

Run: `cat /home/paradoks/projects/quakeworld/apps/qw-oracle/CLAUDE.md`
Expected: 129 lines, no OVERVIEW.md mention.

- [ ] **Step 2: Locate the "Where to find things" section (or equivalent)**

Run: `grep -nE "^## |^###" /home/paradoks/projects/quakeworld/apps/qw-oracle/CLAUDE.md`
Expected: section structure visible. Identify the right insertion point — a top-level section like "Where to find things" or "Project layout".

- [ ] **Step 3: Add the standard directive AND the arc-history.md pointer**

Insert into the "Where to find things" section. If no such section exists, add one near the top (after the project description, before always-on rules).

```markdown
## Where to find things

| When you need... | Read... |
|---|---|
| Load-bearing orientation map | `OVERVIEW.md` |
| Chronological log of shipped arcs | `docs/arc-history.md` |
| Schema, entity types, table shapes | `SCHEMA.md` |
| Extractor architecture + handler patterns | `scripts/extractors/EXTRACTOR-PLAYBOOK.md` |
| ... [keep existing pointers if any]

**Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**
```

Adapt the table to whatever existing structure qw-oracle's CLAUDE.md uses. The two required additions are: (a) the explicit directive sentence, (b) the arc-history.md pointer line.

- [ ] **Step 4: Verify**

Run: `grep -nE "OVERVIEW|arc-history" /home/paradoks/projects/quakeworld/apps/qw-oracle/CLAUDE.md`
Expected: OVERVIEW.md mentioned + explicit directive sentence + arc-history.md pointer.

- [ ] **Step 5: Defer commit until Task 13 batch.**

### Task 11: Verify quad and slipgate-app CLAUDE.md wording matches standard

**Files:**
- Modify (potentially): `/home/paradoks/projects/quakeworld/apps/quad/CLAUDE.md`
- Modify (potentially): `/home/paradoks/projects/quakeworld/apps/slipgate-app/CLAUDE.md`

- [ ] **Step 1: Read current quad directive**

Run: `grep -nE "Start with|OVERVIEW" /home/paradoks/projects/quakeworld/apps/quad/CLAUDE.md`
Expected: shows existing "Start with `OVERVIEW.md` when returning to the project after a break." per audit.

- [ ] **Step 2: Verify quad's wording is acceptable**

Per the softened acceptance criterion ("Directive intent is uniform; minor wording variants OK"), quad's existing wording is fine. No edit needed unless the operator wants strict alignment.

- [ ] **Step 3: Read current slipgate-app directive**

Run: `grep -nE "Start with|OVERVIEW" /home/paradoks/projects/quakeworld/apps/slipgate-app/CLAUDE.md`
Expected: shows the existing two-tier directive line ("Start with `docs/OVERVIEW.md` when returning to the project after a break - it is the full living feature map.").

- [ ] **Step 4: Update slipgate-app wording to align with the new doctrine**

The slipgate wording calls `docs/OVERVIEW.md` "the full living feature map" — this is pre-slim language. Update to reflect the new role:

```markdown
Start with `docs/OVERVIEW.md` when returning to the project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries). For a thinner app-root surface, see `OVERVIEW.md`.
```

- [ ] **Step 5: Verify**

Run: `grep "Start with" /home/paradoks/projects/quakeworld/apps/slipgate-app/CLAUDE.md`
Expected: shows the updated directive.

- [ ] **Step 6: Defer commit until Task 13 batch.**

### Task 12: Add directive to qw-stats and packages CLAUDE.md files

**Files:**
- Modify: `/home/paradoks/projects/quakeworld/apps/qw-stats/CLAUDE.md`
- Modify (potentially): `/home/paradoks/projects/quakeworld/packages/qw-knowledge/CLAUDE.md`
- Modify (potentially): `/home/paradoks/projects/quakeworld/packages/qw-version-resolution/CLAUDE.md`

- [ ] **Step 1: Upgrade qw-stats from passive bullet to explicit directive**

Run: `grep -nE "OVERVIEW" /home/paradoks/projects/quakeworld/apps/qw-stats/CLAUDE.md`
Expected: shows passive bullet ("**OVERVIEW.md** - current-state living map: ...").

Add the explicit directive sentence after the existing bullet (or replace the bullet):

```markdown
**Start with `OVERVIEW.md` when working in this project — it's the load-bearing orientation map (parked-with-purpose, design intent, code landmarks, integration boundaries).**
```

- [ ] **Step 2: Audit qw-knowledge and qw-version-resolution**

Run: `cat /home/paradoks/projects/quakeworld/packages/qw-knowledge/CLAUDE.md /home/paradoks/projects/quakeworld/packages/qw-version-resolution/CLAUDE.md`
Expected: small CLAUDE.md files. Each currently has wording like "Read `VISION.md` for identity, `OVERVIEW.md` for what's here, `README.md` for the elevator pitch" — passive enumeration.

For each, upgrade the OVERVIEW.md line to explicit directive form, keeping the rest of the file unchanged. Suggested wording for packages (smaller scope than apps):

```markdown
**Start with `OVERVIEW.md` when working in this package — it's the load-bearing module map (what's here, what depends on what, what's stable vs in-flight).**
```

- [ ] **Step 3: Verify all CLAUDE.md files have explicit directives**

Run: `for f in /home/paradoks/projects/quakeworld/CLAUDE.md /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md /home/paradoks/projects/quakeworld/packages/*/CLAUDE.md; do echo "=== $f ==="; grep -E "Start with .OVERVIEW" "$f" || echo "MISSING DIRECTIVE"; done`
Expected: every CLAUDE.md shows a `Start with OVERVIEW.md` line. No `MISSING DIRECTIVE` outputs.

- [ ] **Step 4: Verify no "READ FIRST" pointers compete with OVERVIEW**

Run: `grep -rni "READ FIRST" /home/paradoks/projects/quakeworld/CLAUDE.md /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md /home/paradoks/projects/quakeworld/packages/*/CLAUDE.md`
Expected: no matches. The matchscheduler READ FIRST was removed in Task 9; nothing else should carry it.

- [ ] **Step 5: Verify arc-history.md pointer where applicable**

Today only qw-oracle has arc-history.md. Verify only qw-oracle's CLAUDE.md mentions it:

Run: `grep -l "arc-history" /home/paradoks/projects/quakeworld/CLAUDE.md /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md /home/paradoks/projects/quakeworld/packages/*/CLAUDE.md`
Expected: only `/home/paradoks/projects/quakeworld/apps/qw-oracle/CLAUDE.md`.

- [ ] **Step 6: Defer commit until Task 13.**

### Task 13: Plan 5 commit + acceptance verification + Session B finalization

**Files:**
- Modify: none (commit + verification)

- [ ] **Step 1: Stage all CLAUDE.md edits and commit**

```bash
git -C /home/paradoks/projects/quakeworld add CLAUDE.md apps/*/CLAUDE.md packages/*/CLAUDE.md
git -C /home/paradoks/projects/quakeworld diff --cached --stat
```
Expected: shows 5-7 CLAUDE.md files changed.

```bash
git -C /home/paradoks/projects/quakeworld commit -m "$(cat <<'EOF'
docs: standardize OVERVIEW.md directive across CLAUDE.md fleet

Plan 5 of docs-redesign spec. Every CLAUDE.md now carries an explicit
"Start with OVERVIEW.md" directive (intent-uniform; minor wording
variants OK). qw-oracle's CLAUDE.md gains the doctrine (was missing)
plus an arc-history.md pointer. matchscheduler's competing
"READ FIRST: context/ARCHITECTURE-MAP.md" demoted to plain Layer 3
reference; ARCHITECTURE-MAP.md stays in place per Plan 2 narrow scope.
slipgate-app's pre-slim "full living feature map" wording updated to
new role.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Verify Plan 5 acceptance per spec lines 330-335**

Run: `for f in /home/paradoks/projects/quakeworld/CLAUDE.md /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md /home/paradoks/projects/quakeworld/packages/*/CLAUDE.md; do echo "=== $f ==="; grep -E "Start with .OVERVIEW" "$f" || echo "MISSING"; done`
Expected: every CLAUDE.md has an explicit directive. Zero MISSING.

Run: `grep -rn "arc-history" /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md`
Expected: only qw-oracle (the only project with arc-history.md per spec rule).

Run: `grep -rni "READ FIRST" /home/paradoks/projects/quakeworld/CLAUDE.md /home/paradoks/projects/quakeworld/apps/*/CLAUDE.md /home/paradoks/projects/quakeworld/packages/*/CLAUDE.md`
Expected: no output.

- [ ] **Step 3: Push Session B's commits**

```bash
git -C /home/paradoks/projects/quakeworld push origin main
```

- [ ] **Step 4: Print Session B summary report**

```
Session B complete. Plans 4-5 shipped.

Plan 4 — docs-check skill rewrite:
  - SKILL.md: 336 → <X> lines (target <200; verify achieved)
  - Two-phase auto-escalation: Phase 1 always runs; Phase 2 fires on signals
  - 5-category routing (drained inline / small followup / sidequest / ongoing arc / future arc / shipped retrospective + reject:misfire)
  - Mode→Phase mapping table preserved as provenance
  - Memory hygiene flag-only (no inline consolidation)
  - Friction journal append (one question, not six-pattern review)
  - Frontmatter trigger phrases unchanged (verified)
  - Boundary signals reframed for monorepo workflow (session-commits / OVERVIEW wall-clock)
  - Smoke-tested mentally against this session's shape — Phase 2 would fire on operator language + commit count, which is correct behavior.

Plan 5 — CLAUDE.md directive standardization:
  - 7 CLAUDE.md files audited and updated:
    - root /CLAUDE.md (passive → explicit directive)
    - apps/matchscheduler/CLAUDE.md (READ FIRST removed; ARCHITECTURE-MAP demoted to Layer 3 reference)
    - apps/qw-oracle/CLAUDE.md (no reference → directive + arc-history pointer added)
    - apps/qw-stats/CLAUDE.md (passive → explicit)
    - apps/slipgate-app/CLAUDE.md (pre-slim wording → new role wording)
    - apps/quad/CLAUDE.md (verified existing wording acceptable)
    - packages/qw-knowledge/CLAUDE.md (passive → explicit)
    - packages/qw-version-resolution/CLAUDE.md (passive → explicit)
  - No competing READ FIRST pointers remain.
  - arc-history.md pointer present only in qw-oracle's CLAUDE.md (correct per bootstrap rule).

Docs-system-redesign arc complete. The deferred memory-consolidation arc is the next docs-related work, queued via the spec's Out-of-scope section.
```

- [ ] **Step 5: Done. The whole 5-plan arc is shipped.**

---

## Self-review notes (for plan-writer use only — execution can ignore)

**Spec coverage check:** Plan 4's acceptance criteria (lines 287-293) covered in Task 6. Plan 5's criteria (lines 330-335) covered in Task 13.

**Skill rewrite verification:** Task 3 spells out the entire new SKILL.md content inline — no "TODO: write the skill" placeholders. Subagent reads the inline content and writes it to disk via Write tool.

**Per-CLAUDE.md per-project guidance:** Tasks 8-12 each name the file, the current state per audit, and the specific edit to make. No subagent guesswork.

**Smoke test discipline:** Task 4 mentally walks the new skill against today's session shape — catches obvious regressions before merging.

**Order of edits:** Task 3 (skill) lands first because it's the foundation of the new flow; Tasks 7-13 (CLAUDE.md fleet) build on the doctrine the skill now enforces.

**No placeholders:** Every step has actual content. The standard directive wording is given verbatim in Task 7 Step 2 and reused across Tasks 8-12. Edge-case acceptance per the softened criterion is acknowledged in Task 11.

**Self-modification race condition (spec line 357):** Honored by running Plan 4 in a fresh session. Task 1's prerequisite check verifies Session A landed before Plan 4 starts.

**Type / wording consistency:** "Start with `OVERVIEW.md` when working in this project" appears uniformly across Tasks 8-12 (with project-context variants explicitly allowed per softened acceptance). The 5-category routing labels (drained inline / small followup / sidequest / ongoing arc / future arc / shipped retrospective) appear consistently in Task 3's skill content and Task 6's verification.
