# qwiki-v1-beta -- review findings ledger

This arc has no prior monolithic plan. The brainstorm (six conceptual passes 2026-05-09 through 2026-05-12; vision spec at `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md`) drained directly into this six-artifact scaffold, not via a monolithic plan. As a result, the F-finding ledger is empty at scaffold time.

Findings accrue here during phase-MD drafting if the sub-agent verifier surfaces drift between a draft phase MD and the live state (decisions.md / live source files / prior phase deliverables). Each finding gets a sequential F-number, a severity tag, and a phase pointer.

---

## Findings table

(Empty at scaffold time. Populates during phase-MD drafting.)

| F# | Severity | Title | Surfaced in | Resolved by |
|---|---|---|---|---|
| | | | | |

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
