# D20 -- the L1 description template (the user-facing SHAPE)

Load-bearing for Step 3 (affirm) and Step 5 (synthesize) of SKILL.md.
Authority: `decisions.md` D20 (locked Session #9, 2026-05-21) + D21. Governs
EVERY describe-fill engine -- KTX shipped under it via the format-unify arc;
MVDSV and every future fork START from it. A dated amendment governs its
pre-amendment text.

## Why this exists

The first KTX describe-fill cohort shipped descriptions overloaded with
file:line refs and engine-jargon prose. The operator caught it: "this might
sound great for an LLM but it's practically unreadable for a human." That
forced a whole-catalog format-unify rework (D21). ezquake.com proved the
condensed help-comment style works for the QW community for ~20 years -- we
are not improving on it by being more verbose. Verbose descriptions LEAK
verification artifacts (which belong in `description_reasoning`) into the
user-facing surface (which should answer "what does this setting do in my
game / on my server" at a glance). Pay the authoring work once; save
round-trips at every downstream query.

## The two surfaces (never confuse them)

- **`description`** = the USER-FACING prose. ezquake.com / help_commands.json
  style. Codebase-scoped. Read by a server admin, NOT a coder. This is what
  the MCP returns, what the slipgate snapshot renders, what the wiki shows.
- **`description_reasoning`** = the AUDIT TRAIL. The per-clause enforce-trace
  (B1) cites -- file:line, code snippets, the grading rationale, any C2
  conflict note. Stays in the DB as L1 data; surfaces to an LLM only on
  deep-detail queries. Proves we did not invent the description.

EVERY file:line, every code citation, every source-trace sentence goes in
`description_reasoning`. NONE of it goes in `description`. B1 is still
MANDATORY -- you trace every clause to its enforcing line -- but the trace is
EVIDENCE you record in reasoning, not prose you put in the user doc.

## The template shape

```
<1-line what-it-does, in admin-observable terms>

<value/arg> = <meaning>          [only when it takes enumerated values/args; a
<value/arg> = <meaning>           numeric scalar states the unit + what raising
                                  / lowering does]

Default: <X>.                    [the REGISTERED default (WI-2: grep the cvar_t
                                  literal / Cvar_Register*); for a command,
                                  omit unless it has a meaningful no-arg
                                  default. "Default: X. Recommended: Y." only
                                  when convention differs from the default]
Set by: <method>.                [server config only / admin command 'foo
                                  <args>' / any-player 'bar' / vote / etc. --
                                  traced to the registration + dispatch, never
                                  inferred from the name]
See also: <concept-note slug>.   [optional; see the cross-engine rule below]
```

A short knob may be one line + Default/Set-by. A knob with values/args spells
them out. Mechanism only -- no recommended values in the prose (those are L3).

## Anti-patterns -- NEVER in `description` (each belongs in reasoning or L3)

- Engine / code jargon: "handler", "cf_flags", "stuffcmd", "the global
  fp_messages", "CVAR_SERVERINFO", "serverinfo string", "pmove", "edict slot",
  "movevars", "VectorMA". Say the admin-observable effect, not the internals.
- File:line refs in the prose (e.g. `sv_user.c:1848`). -> reasoning.
- Code-citation prose ("the function returns true at...", "the registration
  sets...", "gated on `if (fp_messages)`"). -> reasoning.
- Source-trace synthesis ("records into the MVD dem_multiple bitmask..."). ->
  reasoning or an L3 concept note.

If a clause can only be said in code terms, you are leaking the trace -- move
it to reasoning and state the user-observable consequence in `description`.

## Cross-engine / cross-codebase consequences -- `See also: L3` (operator-decided 2026-05-30)

A QW knob's full behavior often spans codebases (a KTX cvar read by the MVDSV
engine + the ezQuake client + an fteqtv proxy; an MVDSV serverinfo cvar a
CLIENT acts on). That cross-codebase synthesis is L3, not L1.

- **DEFAULT: route the cross-engine consequence to an L3 concept note and
  point at it with `See also: <slug>`.** The L1 `description` states only the
  same-codebase, source-enforced behavior.
- **INLINE ONLY IF ACTION-CHANGING:** keep a one-clause cross-engine note in
  `description` ONLY when an admin would set the knob DIFFERENTLY without it
  (it changes the admin's action). Otherwise it is context -> L3.
- Example (the calibration `maxfps`): "published in server info so clients
  pace their packets" is a client-side consequence, but it is action-relevant
  (an admin sets maxfps precisely to cap the client packet rate), so a SHORT
  user-observable clause is inline-justified; the cross-stack detail (which
  client cvars read it, the antilag interaction) is L3. When in doubt, prefer
  `See also:` over inlining the trace.

## Worked examples (2026-05-30 MVDSV calibration -- both V-pass TRACED-CLEAN)

- **sv_accelerate (cvar):**
  > Controls how quickly a player speeds up toward the direction they are
  > moving. A higher value makes players reach full running speed almost
  > instantly; a lower value makes them ramp up more gradually. It does not
  > change the top speed a player can reach (that is sv_maxspeed) -- only how
  > fast that speed is gained. At 0, players gain no speed from moving.
  >
  > Default: 10.
  > Set by: server config.

  The enforcing cites (the per-frame accel multiply, the clamp-to-gap, the
  OFF-state) live in `description_reasoning`, NOT here. No "movevars", no
  "VectorMA", no file:line in the user doc.

- **floodprot (command):**
  > Configures server-side chat flood protection: a player who sends too many
  > chat messages too quickly is silenced for a set time.
  >
  > floodprot <messages> <seconds> <silence> = silence a player who sends more
  > than <messages> chat lines within <seconds>, for <silence> seconds.
  >
  > Default: 4 messages per 4 seconds, silence for 10 seconds.
  > Set by: server console / rcon.

  The trace (the enforcement read-site, the default initializer, the 1-10 cap)
  is in `description_reasoning`.

## QA self-check before emitting

1. Could a server admin who has never seen the C code understand it? (rubric clause 5)
2. Zero file:line / function names / engine jargon in `description`? (anti-patterns)
3. Values / args / units spelled out? Default + Set-by present (or justifiably absent)?
4. Cross-engine detail routed to `See also:` unless action-changing?
5. Every clause STILL enforce-traced (B1) -- the cites recorded in `reasoning`?

If any fails, reshape before emitting.
