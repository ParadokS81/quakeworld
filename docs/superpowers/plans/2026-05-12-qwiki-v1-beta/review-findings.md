# qwiki-v1-beta -- review findings ledger

This arc has no prior monolithic plan. The brainstorm (six conceptual passes 2026-05-09 through 2026-05-12; vision spec at `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`) drained directly into this six-artifact scaffold, not via a monolithic plan. As a result, the F-finding ledger is empty at scaffold time.

Findings accrue here during phase-MD drafting if the sub-agent verifier surfaces drift between a draft phase MD and the live state (decisions.md / live source files / prior phase deliverables). Each finding gets a sequential F-number, a severity tag, and a phase pointer.

---

## Findings table

| F# | Severity | Title | Surfaced in | Resolved by |
|---|---|---|---|---|
| F1 | SUBSTANTIVE | MW 1.39 LTS is past upstream support window | Phase 1 drafting (2026-05-13) | RESOLVED 2026-05-13 -- `decisions.md` D2 Amendment #2 (MW 1.39 -> 1.43 LTS + cascading version bumps) |

### F1 -- MW 1.39 LTS is past upstream support window

**Surfaced during:** Phase 1 redraft, 2026-05-13 (the same session as the D2 amendment that locked nginx + php-fpm + MariaDB).

**Finding.** `decisions.md` D2 names MW 1.39 LTS with "current LTS through Dec 2027." Live recon against the MW Version_lifecycle page (consulted 2026-05-13) shows:

- MW 1.39 is no longer listed in the lifecycle table.
- The active LTS is **MW 1.43** (end-of-life December 2027).
- The next LTS will be MW 1.47 (November 2026).
- The `mediawiki:1.39-fpm` Docker tag still pulls (latest patch is `1.39.17-fpm`), but the `1.39/` directory has been removed from the upstream `wikimedia/mediawiki-docker` master branch -- the image is in security-frozen state with no further upstream backports expected.

**Why this is SUBSTANTIVE.** Shipping wiki-beta.quake.world on MW 1.39 means the substrate is past its formal upstream-support window from day 1. An MW security CVE between Phase 1 ship and the eventual 1.43+ migration arc would leave the wiki unpatched. Even invite-only (`@wiki-beta` Discord role gates contribution per D19), the read-side is public to the internet, so XSS / SQLi / path-traversal CVEs are exploitable by any visitor.

**Phase 1's stance.** Phase 1 does NOT deviate from D2; it ships `mediawiki:1.39-fpm` as locked. The finding is captured in the phase MD's Open Questions section #1 with default = ship 1.39, who-can-resolve = operator.

**Resolution path.** Operator decision:

- **Keep D2 as-is (ship 1.39):** accept the security-frozen risk on a low-volume wiki with invite-only contributor pool, plan an MW upgrade arc for 1.43+ within the next 6-12 months.
- **Amend D2 to MW 1.43 LTS:** dated amendment block in `decisions.md` D2; bump image tags in Phase 1's `docker-compose.prod.yml` (`mediawiki:1.43-fpm`) and deploy README; switch Citizen skin pin from v2.40.2 (1.39-compatible) to main branch (1.43+ compatible) or another Citizen tag that supports 1.43; rerun Phase 1 drafter prompt to refresh the MD.

**Cross-phase implications.** If D2 is amended to 1.43 LTS:

- **Phase 2 (extensions):** Page Forms + Semantic MediaWiki release tags need to track 1.43-compatible versions (REL1_43 branches), not 1.39-compatible (REL1_39 branches). The Phase 2 drafter prompt has not been written yet; it must reference the resolved D2 image tag.
- **Phase 3 (auth):** PluggableAuth + Discord OAuth extension release tags need to track 1.43-compatible versions. Same drafter-prompt note.
- **Citizen skin (Phase 1 + carry-forward):** the v2.40.2 pin gives way to a 1.43-compatible Citizen reference; main branch is the default candidate; specific tag locked by operator.

**Recommendation.** Resolve before Phase 2 drafting begins. The amendment is a routine D2 edit; the Phase 1 redraft impact is mechanical (image tags + Citizen pin); the Phase 2/3 drafter prompts inherit the resolved decision without needing a redraft.

**Resolution 2026-05-13.** Operator approved amending D2. Live-source verification (Docker Hub registry API + MW Version_lifecycle + GitHub extension repos) revealed that ALL FOUR pinned versions in D2 Amendment #1 were drifted (training-data-era versions). `decisions.md` D2 Amendment #2 (same day) locks current-stable equivalents:

- MediaWiki: `1.39-fpm` -> `1.43-fpm` (PHP 8.3 bundled)
- MariaDB: `10.11` -> `11.4` (current `lts` tag; supported through May 2029)
- nginx: `1.27-alpine` -> `1.30-alpine` (current stable Alpine line)
- Citizen skin: `v2.40.2` -> `v3.16.0` (current release; requires MW 1.43+)

Phase 1 MD redrafted in place at `phase-1-mw-core.md` to reflect the new tags + drop the obsolete `$wgCitizenEnableCommandPalette` LocalSettings option (removed in Citizen v3). Phase 2 + Phase 3 drafter prompts (still to be written) inherit the resolved versions per the amendment's "Implication for later phases" section.

F1 closed.

---

## Severity legend

- **CRITICAL** -- would break execution if shipped (e.g., wrong schema, missing config, broken deploy).
- **SUBSTANTIVE** -- would ship buggy behavior or violate a locked decision (e.g., gate-level mis-assignment, missing Track C discipline in a template).
- **ADVISORY** -- style / consistency; non-blocking (e.g., inconsistent section names, minor doc drift).

---

## How findings accrue

Per `phase-template.md` verification-sub-agent dispatch (drafter spawns a sub-agent after drafting a phase MD), the sub-agent reports findings in CRITICAL / SUBSTANTIVE / ADVISORY tiers. The drafter applies findings; if a finding contradicts `decisions.md`, decisions wins and the finding is rejected with a one-line rationale in the phase MD's Open Questions section.

If a finding has implications for OTHER phases (not just the one being drafted), append it here with cross-phase pointers so subsequent phase drafters consult it.

---

## How findings link to decisions

When a finding resolves via a `decisions.md` entry (D1-D26), the "Resolved by" column references the decision number. When a finding requires a NEW cross-cutting commitment, the resolution is "amend decisions.md (DXX)" -- which means a dated amendment block is added under the relevant decision, and the F-finding is closed.

A finding that's resolved by a phase-internal change (not cross-cutting) has "Resolved by" = the phase MD that absorbs it. These do not require a decisions amendment.
