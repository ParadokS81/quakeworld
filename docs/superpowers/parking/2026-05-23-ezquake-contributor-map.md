# ezQuake contributor map -- arc capture

**Captured:** 2026-05-23 by arc-classifier mode S.
**Status:** shelved (awaiting trigger).
**Trigger to start:** next time we need to route a non-trivial upstream PR question to a specific subsystem owner and can't tell who to ask, OR operator-initiated.

## Why this is arc-shaped (briefly)

Two signals fire:

- **Spec required.** Output shape is a structured doc (per-subsystem authorship + activity) that needs deliberate design before the data extraction starts: what counts as a subsystem (directory? feature area? header file?), what time windows ("currently active" = last N months?), how authorship is weighted (line count vs commit count vs recency-weighted).
- **Cross-cutting decisions.** Choices about codebase slicing, authorship weighting, and activity windows are decisions every section of the deliverable must respect. Wrong default early -> rebuild the whole doc.

Only two criteria fire; this is borderline arc-shape. Could plausibly ship as a single intensive session if the slicing decisions get made up front. Captured here so we don't have to rebuild the framing later.

## Scope sketch

A lookup doc that surfaces, per ezQuake subsystem, the top historical contributors and the currently-active ones. Data sources: `git log` and `git blame` on `research/repos/ezquake-source`. Operational use: when a question about renderer / sound / demos / qtv / fs / hud / teamplay arises, the operator (or Claude) can look up who originally built the subsystem, who maintains it now, and who to address in an upstream PR or issue. Secondary value: a community-history artifact, since several long-time contributors have rotated out and current "head devs" are not the original authors.

## Open questions for the eventual brainstorm

- Subsystem slicing: by source directory? by `src/*.c` file? by feature area inferred from filenames?
- Authorship weighting: total lines added vs net lines surviving vs commit count? Recency-weighted?
- "Currently active" definition: last 12 months? last 6 months? last release tag?
- Output format: markdown table per subsystem? a single matrix? per-contributor profile pages?
- Whether to extend to KTX / MVDSV / QWFWD / FTE (each codebase has different ownership shape; one arc, one engine likely the right move).

## What is NOT in scope

- Not a credits page, not a hall-of-fame. This is an operational lookup aid.
- Not extended to KTX / MVDSV / QWFWD / FTE in the first pass.
- Not blocking the current commands PR (that ships addressing "ezQuake maintainers" generically rather than naming individuals).

## Operator notes (verbatim where possible)

- "slime is just one of the later devs to join the team. none of the current developers actually created ezquake in its original incarnation"
- Memory note `reference_ezquake_dev_team.md` lists nano = head dev, slime helps, ciscon = QWiki/community NOT ezQuake. That gives a starting anchor but lacks historical depth.
- Immediate trigger that surfaced this: the commands PR was being framed as "ask slime" when slime is a contributor, not an owner. The PR body has been updated to address "ezQuake maintainers" generically.

## Related

- Memory: `reference_ezquake_dev_team.md` -- current team summary (starting anchor).
- Source: `research/repos/ezquake-source/.git` -- the data source.
- Adjacent: this commands PR (the trigger).
