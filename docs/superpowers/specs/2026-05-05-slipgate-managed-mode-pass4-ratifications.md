# Slipgate Managed Mode -- Brainstorm Pass 4 Ratifications

> **Captured 2026-05-05.** Bridge document between the Pass 4 brainstorm session and the canonical drain pass (architecture spec body edits + roadmap + HANDOVER + memory).
>
> **Status:** Brainstorm complete. Drain pending. This doc is the source of truth for Pass 4 decisions until those decisions land in their canonical homes; it can be removed (or marked superseded) once drained.
>
> **Companion docs:**
> - Vision: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
> - Architecture: `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
> - Roadmap: `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
> - Pass 3 minutes: `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`
>
> **Pass 4 is small by design.** Pass 3.4 absorbed the original Pass 4 surface (capture/swap pipeline, five-case watcher dispatch, Defenses 1-4, cleanup notification UX, auto-mode opt-in). Only two sub-questions remain in Pass 4: debounce-window tuning and per-extension integrity-check registry growth. Both are refinements of the file-integrity-check table that Pass 3.5 placed in the slipgate self-knowledge surface as `[code-bundled]`.

---

## Pass 4 brainstorm shape

Two sub-questions ratified, in order:

- **4.1** Debounce-window tuning (the 5s stable-mtime knob locked in Pass 3.4)
- **4.2** Per-extension integrity-check registry growth (Defense 3's declarative table -- V1 roster + row shape + tiering)

---

## 4.1 -- Debounce-window tuning

### Locked decisions: tuneability surface

- **Per-extension overrides live in the integrity-check registry.** One row per extension carries both debounce + integrity rules. No separate debounce table; no global-only knob; no adaptive-backoff retry mechanic. Same registry that Defense 3 grows.
- **Global default = 5s** (Pass 3.4 lock; reaffirmed). Extensions without a registry row fall through to the default-row fallback (see 4.2c) which inherits the 5s default.
- **Reason:** different file types have genuinely different stability profiles. A 4MB demo writing at 200KB/s and a 12KB config written in one syscall need different debounce windows. Folding the knob into the integrity-check registry costs one extra column and keeps both axes of per-extension knowledge in one declarative table.

### Locked decisions: give-up behavior when files stay unstable

- **Escalate to cleanup notification after N retries.** When a pending entry stays unstable across multiple Stage 2 invocations, it surfaces as a "still unstable after N tries" row in the cleanup UI with explicit user actions: capture-anyway / discard / keep-pending.
- **Default N = 3 retries.** One full trigger cycle (engine-exit + user-invoked Cleanup + idle-nudge). Per-extension `max_retries` override available in the same registry row, so a 50MB AVI demo getting written for ten minutes does not surface after 3 minutes of waiting.
- **Pending-but-stable entries do not escalate.** Only retry-failures count toward N. An entry that simply has not been Stage-2'd yet (because no trigger has fired) stays in `.pending-swap.json` until the next safe-moment processing pass.
- **Reason:** Pass 3.4 already designated the cleanup notification as the unified surface for "files captured but not yet organized." Escalating retry failures into that same surface is consistent and gives the user an explicit decision point rather than silent drop or silent bloat.

### Affected canonical docs (4.1)

- **Architecture spec Filesystem Watcher Contract:** add per-extension `debounce_seconds` and `max_retries` knobs to the integrity-check registry row shape. Add escalation behavior: "after `max_retries` Stage 2 invocations with the file still unstable, the entry escalates to a 'still unstable' row in the cleanup notification with capture-anyway / discard / keep-pending actions."
- **Architecture spec Slipgate self-knowledge surface:** the file-integrity-check table row shape grows two columns (`debounce_seconds`, `max_retries`); both are nullable with global-default fallback (5s and 3 respectively). Otherwise unchanged -- still `[code-bundled]` at V1, oracle-authored delta-sync at V1+.

---

## 4.2 -- Per-extension integrity-check registry growth

### Locked decisions: tiered V1 roster

- **Two tiers + default fallback, all in one registry table.** A `tier: "strict" | "permissive"` column (or equivalent) discriminates row shape. Extensions not in the registry hit a default row.
- **Reason:** strict-tier rows carry magic bytes + structural checks; permissive-tier rows carry text-shape sanity checks (UTF-8, non-empty, size cap). Forcing a uniform row schema across both kinds inflates strict rows or weakens permissive rows. Two tiers in the same table keep it one declarative artifact with two rule shapes.

### Locked decisions: strict tier (V1)

Ten binary formats with corruption modes worth checking:

| Extension | Format | V1 integrity check |
|---|---|---|
| `.bsp` | Map | Magic bytes (BSP29 / BSP2 / 2PSB variants) + lump pointer bounds |
| `.pak` | Quake archive | "PACK" magic + entry count + offsets within file bounds |
| `.wav` | Sound | RIFF header + chunk sizes <= file size |
| `.mdl` | Model | IDPO magic bytes + skin/frame counts within bounds |
| `.spr` | Sprite | IDSP magic bytes + frame count within bounds |
| `.tga` | Texture | Header sanity + size from header within file bounds |
| `.png` | Texture | Magic bytes + IHDR chunk validity |
| `.dem` | Demo | Block sequence parseable; QW MVD magic on MVDs specifically |
| `.lmp` | Palette / menu | Fixed sizes for known lmp variants; headers where applicable |
| `.lit` | Colored lighting | "QLIT" magic + version + size matches associated `.bsp` lighting lump |

**Notable absentees considered and excluded from V1:**
- `.pcx` -- some old textures use it, but rare in modern QW; Layer 1 closure work can promote later.
- `.jpg` -- engine-supported but rare in shipped content; promote later.
- `.pk3` -- FTE-flavor archive; deferred because pk3 is just a renamed zip and zip integrity is well-trodden. Add when FTE coverage is V1+.

### Locked decisions: permissive tier (V1)

Five text-shaped extensions getting thin rows (UTF-8 sanity + size cap + non-empty + debounce):

| Extension | Use |
|---|---|
| `.cfg` | Configs |
| `.txt` | Notes, readmes (surfaces in Browse; rarely manifest-eligible) |
| `.loc` | Location files |
| `.ent` | Entity files (text-format Quake entity lump dumps) |
| `.rc` | Engine startup script (`quake.rc`) |

**Notable absentees:** `.json` -- some modern engine helpdocs ship JSON, but L1-gamma is going to land helpdoc handling separately; defer until L1-gamma's role taxonomy lands.

### Locked decisions: default-row fallback shape

For extensions not in either tier:

- Size cap (configurable global, default e.g. 500MB to catch obvious garbage but not block legitimate large mod content)
- Debounce 5s (global default)
- `max_retries` 3 (global default)
- No magic-byte check
- No structural integrity check
- Hash-and-capture if stable
- Surfaces in cleanup notification's "Unrecognized files" bucket per Pass 3.4 UX

The default row gives Layer 1 closure a graceful runway: every extension gets some defense, even before its row is authored. Each oracle release shrinks the default-row population by adding strict or permissive rows.

### Locked decisions: registry distribution trajectory

- **V1: code-bundled.** The file-integrity-check table ships with slipgate releases per Pass 3.5's per-table cadence. Every release can grow strict / permissive coverage and shrink the default-row population.
- **V1+: oracle-authored delta-sync.** The registry is data-not-code (declarative rules, no imperative integrity logic per row), so oracle can author it and slipgate consumes via the same delta-sync shape as other catalog-refreshable tables. Migration trajectory rather than V1 work.

### Affected canonical docs (4.2)

- **Architecture spec Filesystem Watcher Contract -- Defense 3:** replace the five-extension sketch with the full V1 roster (10 strict + 5 permissive + default fallback). Add the row-shape spec with `tier`, `magic_bytes`, `header_checks`, `text_checks`, `size_cap_bytes`, `debounce_seconds`, `max_retries` columns. Note that strict and permissive rows use different subsets of the columns.
- **Architecture spec Slipgate self-knowledge surface -- per-table cadence table:** the file-integrity-check table row gains a "Notes" entry clarifying tiered shape (strict / permissive / default). Stays `[code-bundled]` at V1; oracle-authored delta-sync becomes a V1+ trajectory note.
- **Roadmap Arc E:** add Pass 4 as fully drained into the watcher arc; capture/swap pipeline + integrity-check registry are the two load-bearing surfaces. No new arc-level scope.

---

## Carry-forwards

None new. Pass 4 closed cleanly.

Pass 5 (launch UX + runtime swap classes from Pass 1 anchor item 5 + manifest backup UX) and Pass 6 / Arc H pre-impl (cloud catalog data shape) remain as previously scoped.

L1-alpha / L1-beta / L1-gamma / L1-delta tracks remain as previously scoped (qw-oracle scope, not slipgate Managed Mode arcs). L1-gamma's helpdoc role taxonomy will retroactively decide whether `.json` and similar extensions get added to the integrity-check registry as part of Layer 1 closure work.

---

## Drain instructions for fresh session

A fresh session (or a continuation in the current session if context budget allows) should drain Pass 4 ratifications into the canonical docs. Pass 4 drain is small -- maybe 30-60 lines net across the architecture spec, plus the anchor block update, plus minor roadmap + HANDOVER + memory entries.

### Step 1 -- Load context

Read in this order:
1. This Pass 4 ratifications doc.
2. Architecture spec (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`) -- focus on Filesystem Watcher Contract + Slipgate self-knowledge surface sections.
3. Pass 3 minutes (`docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md`) -- to confirm the 5s debounce / cleanup notification UX framings being extended.
4. HANDOVER index entry "Slipgate Managed Mode pivot."
5. Memory: `project_slipgate_managed_mode_passes.md` -- to confirm Pass 3 status before updating to Pass 4.

### Step 2 -- Architecture spec body edits

In `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`:

- **Pre-Pass anchor block:** add `> **Pass 4 status: COMPLETE 2026-05-05.**` line summarizing the two sub-questions ratified and drained.
- **Filesystem Watcher Contract -- Defense 3:** replace the five-extension sketch with the full V1 roster (10 strict + 5 permissive + default fallback). Add the row-shape spec.
- **Filesystem Watcher Contract -- escalation behavior:** add the "after `max_retries` Stage 2 invocations with the file still unstable, the entry escalates to a 'still unstable' row in the cleanup notification" rule.
- **Slipgate self-knowledge surface -- file-integrity-check table row:** clarify tiered shape (strict / permissive / default) in the Notes column. Add V1+ trajectory note (oracle-authored delta-sync) to the bundling-with-slipgate-release notes.
- **Open architectural questions section:** mark Pass 4 items resolved. Items still open: Pass 5 launch UX + runtime swap classes (anchor item 5); Pass 5 manifest backup UX; Pass 6 cloud catalog data shape (Arc H pre-implementation brainstorm).

### Step 3 -- Roadmap edits

In `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`:

- **Brainstorm-progress block:** mark Pass 4 COMPLETE 2026-05-05 with two-sub-question summary.
- **Arc E:** add Pass 4's integrity-check registry as the second load-bearing surface (alongside the Pass 3.4 capture/swap pipeline). Note V1 ships with the 10 strict + 5 permissive roster; V1+ adds delta-sync from oracle.

### Step 4 -- HANDOVER edits

In `HANDOVER.md`:

- **Update "Slipgate Managed Mode pivot" entry:** mark Pass 4 COMPLETE 2026-05-05; mention the integrity-check registry V1 roster and the per-extension debounce/retry overrides.

### Step 5 -- Memory edits

- **Update `project_slipgate_managed_mode_passes.md`:** add Pass 4 row to the pass-by-pass table (COMPLETE 2026-05-05; drained-into Filesystem Watcher Contract Defense 3 + Slipgate self-knowledge surface). Update the "remaining brainstorm passes" section -- Pass 5 + Pass 6 only.

### Step 6 -- Verify and commit

- Read the modified architecture spec end-to-end to verify cross-section consistency.
- Commit with descriptive message:
  ```
  docs(slipgate): Managed Mode brainstorm Pass 4 (debounce-window per-extension overrides + integrity-check registry V1 roster)
  ```
- Push to origin.

### Step 7 -- Optional cleanup

- Once drained, this Pass 4 ratifications doc can be moved to a "drained" status or kept as standalone minutes alongside Pass 3's. Recommended: keep, mirroring Pass 3.

---

## Provenance

This doc is the output of a Pass 4 brainstorm session on 2026-05-05 (single conversation, plain-English Q&A with the operator one sub-question at a time per the locked Pass 1 + Pass 2 + Pass 3 brainstorm shape). No code was changed; no canonical docs were edited during the brainstorm session itself.

Pass 4 was deliberately small. The original Pass 4 scope was largely subsumed by Pass 3.4's capture/swap pipeline drain. What remained was two refinement questions on the file-integrity-check table -- both closed cleanly without surfacing unexpected issues, which means the session can roll forward into Pass 5 (launch UX + runtime swap classes + manifest backup UX) without a context reset, per the operator's pre-Pass-4 note.
