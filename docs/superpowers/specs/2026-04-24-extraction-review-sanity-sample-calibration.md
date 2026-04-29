# Extraction-review sanity-sample calibration

**Date:** 2026-04-24
**Purpose:** Execute spec Section 9 step 9 of `2026-04-24-extraction-review-skill-tweaks.md` -- run the `review` CLI on 2-3 additional tag pairs (eyeball-only, no walks) to validate cluster-detection behavior on older code and calibrate the TBD thresholds from Section 8 before Phase 2f begins.
**Verdict:** Thresholds hold at their starting values. One detector bug found and fixed in-flight (`commit-UNKNOWN` sentinel). One semantic-pass gap captured to HANDOVER (abbreviation-bridge). Phase 2f is unblocked.

---

## Pairs tested

| Pair | Role | Findings | Clusters | Source-invisible annotated |
|---|---|---|---|---|
| 3.6.5 -> 3.6.6 | Regression (spec Section 7 target) | 65 | 6 | 17 / 26 |
| 3.6.1 -> 3.6.2 | Oldest-known sanity | 71 | 1 | 0 / 9 |
| 3.6.6 -> 3.6.8 | Recent / lightweight sanity | 45 | 6 | 0 / 2 |
| 3.6.2 -> 3.6.5 | Stress test (artificial 19-month jump) | 79 | 7* | 5 / 13 |

*post-P1 fix. Pre-fix the stress pair produced 8 clusters, one of which was the false `commit-UNKNOWN` mega-cluster (18 members).

## Regression verdict (3.6.5 -> 3.6.6)

All five positive clusters from spec Section 7 re-emerged:

| Expected slug | Actual slug | Members (expected / actual) | Notes |
|---|---|---|---|
| `skywind-family` | `skywind-family` | 6 / 6 | Exact match. 83% prefix coverage -> semantic slug. |
| `client-side-server-exec-allowlist` | `commit-41852d49` | 3 cvars + 4 release-notes / 3 + 7 | Semantic pass over-annotated (proposed 61/71/86 in addition to expected 64/65/66/79). Operator confirms at walk. |
| `hud-gun-frame-hide` | `commit-2c7fd802` | 8 / 8 | Exact count; commit-sha slug correct per 80% rule. |
| `ruleset-anti-script-restriction-pattern` | `commit-2dbb3f1d` | 16 / 15 | Smackdrive cvar (commit `22b5b6c2`) did not cross-commit-merge. Spec allows operator merge at walk. |
| `completing-legacy-fte-protocol-extensions` | `commit-e5bc1600` | 4 / 2 cvars + 7 release-notes | Detector found mechanical signal the spec predicted absent (2 cvars co-commit). Bonus, not regression. |

Negative test `scr_scoreboard-family` surfaces as a `strong` 3-member cluster - operator-split path per spec Section 7 acceptance.

## Threshold verdict (spec Section 8 TBDs)

All three threshold values hold at their Section 8 starting values. No tuning needed before Phase 2f.

| Threshold | Starting value | Behavior observed | Verdict |
|---|---|---|---|
| `commit-window` | 60s | Fired across all pairs (commit-window:1 through :9 values seen). No false-positive mergers observed. 3.6.5->3.6.6 `cl_allow_*` cluster landed 3 commits in 3 seconds, well inside. | Hold at 60s. |
| Entity-name prefix | >=2 tokens + >=2 siblings (multi-token); >=5 chars + >=3 siblings + not-generic (single-token) | Fired correctly for `hud_ammo`, `hud_scoreclock`, `hud_scoremapname`, `cl_allow`, `cl_portpingprobe`, `cl_pext`, `scr_scoreboard`, `smackdown`, `thunderdome`, `r_tracker`, `gl_outline`, `gl_spec`, `hud_frags`, `skywind`, `keymap`. Correctly did NOT fire for `joy*`/`aux*` in 3.6.1->3.6.2 (single-token names without shared underscore structure). `hud_frags-family` at 2+2 floor produced coherent cluster. | Hold at current thresholds. |
| Shared-author window | <=1 day (weak, pair-only) | Not exercised in any cluster - other signals always sufficed. | No data. Re-assess when the first cluster relies on it. |

80% prefix-slug rule fired as designed: 3 clusters across the sample earned semantic slugs (`skywind-family`, `cl_portpingprobe-family`, `hud_ammo_text_color-family`); the rest fell back to commit-sha slugs per the 80%-coverage requirement.

## Findings

### P1 (FIXED) - `commit-UNKNOWN` sentinel bug

**Site:** `apps/qw-oracle/scripts/load-knowledge/review/clusters.ts` line 76.

**Observed during 3.6.2 -> 3.6.5 stress pair.** The `diff-versions.ts` pipeline emits `evidence.commit_sha: "UNKNOWN"` as a sentinel for changes without commit attribution (typically `relation_changes` on `asset_loader_sites`). The cluster-key generator passed the sentinel through as a valid `commit:<sha>` key, bundling 18 unrelated asset-loader-site additions (`Draw_CachePicSafe_hud_262_Hud_Add_f_1`, `FS_OpenVFS_cl_cmd_CL_Download_Accept_1`, etc.) into one fake `commit-UNKNOWN` strong-confidence cluster.

**Fix:** One-line guard: `if (f.evidence.commit_sha && f.evidence.commit_sha !== 'UNKNOWN')`.

**Post-fix verification:** Re-ran 3.6.2 -> 3.6.5. The false cluster is gone. A legitimate `keymap-family` (medium, 6 members) cluster emerged that was being swallowed by the false commit-UNKNOWN blob pre-fix. Remaining 7 clusters unchanged. Asset-loader-site findings without commit attribution now correctly remain unclustered singletons.

### P2 (NOT A BUG) - 3.6.8 release-notes sparsity

Initial concern: only 4 release_notes rows loaded for 3.6.8 compared to 34 for 3.6.6 and 19 for 3.6.2. Verified via `gh api repos/QW-Group/ezquake-source/releases/tags/3.6.8`: the GitHub release body has exactly 4 improvement bullets. The loader pulled everything. 3.6.8 is a genuinely short release. No action.

### P3 (HANDOVER) - semantic-pass abbreviation bridge

See `HANDOVER.md` Section  "semantic-pass abbreviation-bridge heuristic" for the full spec. Summary: release_notes:25 of 3.6.1->3.6.2 ("Restore joystick support (ewhac)") does not propose membership in the 55-member joystick-PR cluster because the cluster's entity tokens are `joyadvanced`/`joyflysensitivity`/`aux*` and the release-note uses the full word "joystick". No cross-name transform bridges abbreviation <-> expansion. Not a Phase 2f blocker (operator catches at walk); worth fixing during or before Phase 2f for better automation.

## Architecture confirmations

**Skill-time scope-tracking preview.** Two source-invisible findings on 3.6.6 -> 3.6.8 are by `@osm`:
- `release_notes:89`: "SECURITY: protect against server/proxy injection of malicious triggers (@osm)"
- `release_notes:90`: "Allow exec and IPC from localhost (@osm)"

These match the existing concept-note `concept-notes/client-side-server-exec-allowlist.md` on `primary_contributors: @osm` + `topic: security-policy`. The CLI's semantic pass did not propose the match - expected, because concept-note scope-tracking is skill-time (Section 3 of tweaks spec), not CLI-time, and the match rule uses `related_entities` intersection which source-invisible findings lack. During a real walk of 3.6.6 -> 3.6.8, the skill's preamble will surface these as concept-note-extension candidates. Architecture works end-to-end; eyeball-only sanity just doesn't exercise the skill side.

**Cross-commit multi-feature detection.** `gl_outline-family` in 3.6.2->3.6.5 spans 4 different commits (`116022bb`, `2adb43dc`, `543f3404`, `656184da`) but correctly merges via shared `prefix:gl_outline`. Validates that a feature landing across multiple commits still clusters as one story.

**Large-cluster handling.** 3.6.1->3.6.2's 55-member `joy*`/`aux*` PR-567 cluster (ewhac joystick restoration, Dec 2022) clusters correctly via `commit:17ed82c0` + `pr:567` + `commit-window:6`. No threshold wobble at cluster sizes 2 (floor) through 55. Slug correctly falls back to commit-sha since `joy*` and `aux*` don't share an underscore-delimited token.

## Phase 2f readiness

The calibration gate from HANDOVER `Section  Phase 2d-2h remaining QW knowledge rollout` is now satisfied:

- All Section 8 TBD thresholds hold at starting values. No retune needed before Phase 2f proper.
- One detector bug surfaced and fixed in-flight (P1).
- One semantic-pass gap logged as HANDOVER with concrete spec (P3).
- Scope-tracking architecture preview confirms end-to-end behavior for cross-walk concept-note extension.

Phase 2f is unblocked.

## Related artifacts

- Spec being calibrated: `docs/superpowers/specs/2026-04-24-extraction-review-skill-tweaks.md` Section 8 (TBD thresholds), Section 9 step 9 (this calibration step).
- Bug fix commit: see `clusters.ts` line 76.
- Draft review outputs written during this run (not dispositioned - eyeball-only):
  - `apps/qw-oracle/docs/reviews/regression-ezquake-3.6.5-to-3.6.6.md`
  - `apps/qw-oracle/docs/reviews/sanity-ezquake-3.6.1-to-3.6.2.md`
  - `apps/qw-oracle/docs/reviews/sanity-ezquake-3.6.6-to-3.6.8.md`
  - `apps/qw-oracle/docs/reviews/sanity-ezquake-3.6.2-to-3.6.5.md`
