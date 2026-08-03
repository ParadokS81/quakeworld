# D5-amended quality-bar rubric -- the keep-vs-synthesize judgment

This is the single judgment the `describe-fill-synthesis` skill applies at
Step 3. It is the D5 quality bar AS AMENDED. Where this file and
`decisions.md` D5 (+ "D5 amendment") differ, `decisions.md` governs; where
that and the spec differ, the spec governs. The dated D5 amendment GOVERNS
the original D5 text -- never revert to the pre-amendment phrasing.

## The five rubric clauses

A description is good enough to serve a user (an admin / server operator)
when ALL five hold. A good description:

1. Says WHAT the knob does in admin-observable terms -- the effect the
   admin can see by setting it -- NOT WHY the code does it (no
   implementation rationale, no "we added this because ...").
2. Is NOT a restatement of the knob's own name. "`sv_maxclients` -- the
   maximum number of clients" fails: it is the name re-spelled.
3. Spells out units and enum/bitmask meanings where they exist. "0 = off,
   1 = team only, 2 = all" -- not "the mode". Seconds vs ms vs frags
   stated explicitly. A bitmask lists what each bit does.
4. Is mechanism only -- NO recommended value, NO opinion, NO "competitive
   servers usually set this to ...". (That is the locked L1/L3 line;
   recommended values are L3.)
5. Is self-contained without reading source. A reader who cannot see the
   C code still understands what the knob does and what its values mean.

## The amendment -- evaluate EVERY entity (LOCKED, supersedes original D5)

A trailing comment does NOT place an entity in a "documented / done"
bucket. Most KTX/MVDSV trailing comments are dev-to-dev rationale, not
user docs (the dual-doc reality: a code comment is coder-WHY by default;
user-WHAT must be judged). EVERY entity -- with or without a comment, with
or without a mechanical candidate -- is evaluated equally for whether it
warrants an owned user-facing description. The existing comment / candidate
is ONE INPUT to that evaluation, NEVER a verdict.

- Comment genuinely reads as a user description (clears all five clauses)
  -> ADOPT it verbatim; origin tag stays `source_inline` (honest: the
  dev's own words, and there is no separate user-doc field to launder
  into -- this is NOT the ezQuake comment-promotion bug). It is
  AFFIRMED-BY-EVALUATION, not skipped. Verdict `affirmed`.
- Comment is dev-rationale / tautological / cryptic / opinion-laced /
  weak / ABSENT -> SYNTHESIZE ours from the read use-sites ->
  `synthesized` + anchored. Verdict `synthesized`.

The D5 cheap-classify step routes EFFORT (a good comment classifies-and-
affirms quickly = the fast-affirm early exit; weak or absent = full Opus-
MAX synthesis). It does NOT exempt anything from evaluation. Coverage =
"every entity evaluated and carrying an owned, affirmed-or-synthesized
description," NEVER "had a comment so counted." The original D5 phrasing
"clears the bar -> kept as-is, no rework" is SUPERSEDED by this amendment.

"cheap" / "fast affirm" is EFFORT routing, not a cheaper model: it is the
early-exit path WITHIN the single Opus-4.7-MAX D6 invocation, not a
separate pre-classify tier (D7 clarification 2026-05-17).

## Worked examples

### Affirm (comment clears the rubric -- adopt verbatim, `source_inline`)

- Shipped comment: `// rounds per match; match ends when a team reaches
  this score or the timelimit expires`. WHAT in observable terms; not a
  name restatement; mechanism only; self-contained. -> `affirmed`,
  `source_inline`, no anchor.

### Synthesize (comment is dev-WHY -- write ours from read use-sites)

- Trailing comment: `// see Bug #4412, kept for back-compat with old
  configs`. This is coder-WHY, says nothing about observable behavior. ->
  read the use-sites, synthesize the WHAT, `synthesized` + `source_ref` +
  anchor.

### Synthesize (tautological comment -- a name restatement fails clause 2)

- Comment: `// enable the antilag system`. For knob `sv_antilag`. Restates
  the name; does not say what "antilag" observably does or what the values
  mean. -> synthesize from the read use-sites (the lag-compensation
  branch), spell the enum, `synthesized`.

### Synthesize / mechanism-only (D8 bot-tier -- COMPLETE, not degraded)

- `k_fbskill_rl` with no user-facing comment. AI use-sites show it scales
  the bot's rocket-launcher accuracy weighting. -> synthesize mechanism-
  only: "controls the bot's rocket-launcher accuracy weighting; higher =
  more accurate bot RL aim". This is COMPLETE L1. The
  "what-value-for-fair-bots" advice routes OUT to an L3 candidate; its
  absence is NOT an L1 gap (D8).

### Hedge (only partially source-legible -- never guess the rest)

- A knob whose read use-site sets a flag consumed by a third-party module
  not in the source tree. State only the legible part ("sets internal
  flag X consumed by the <module> path"), mark the downstream effect as
  not source-legible. Verdict `hedged`; route to the C1 outreach track.
  Do NOT invent the downstream behavior.

### Residue (not source-legible at all -- C1 track, never dropped)

- A registered knob with zero legible read use-site, not in the suspect
  pool. Do NOT synthesize from the name. Placeholder description marking
  it not-yet-source-legible; verdict `residue_routed`; C1 community-
  outreach track. It still gets a row (C1 is non-negotiable).
