# Handoff -- cross-engine info_key batch (MVDSV 45 + KTX 38)

**Spin up a fresh terminal at `/effort high`.** This one is SCOPE-FIRST, not blind execution: info_keys
are NOT single-engine code knobs, so the cvar/command chunk-runner is the wrong tool for most of them.
Read the prior scoping, categorize the combined set, decide the per-category method, and bring the
methodology back to the operator BEFORE mass-documenting.

## What this finishes

The last untraced slice of the MVDSV describe-fill arc (the **45 MVDSV info_keys**, all still
`source_inline` mechanical stubs) **plus** the long-standing **KTX info_key wider-sweep triage** (the
**38 KTX** source_inline keys -- HANDOVER small-followup, line ~28). Doing them together closes both,
because the two sets overlap heavily (`name` / `team` / `skin` / `topcolor` / `rate` / `bottomcolor` ...
are the same QW protocol keys read by both engines). After this, the only MVDSV L1 work left is the D10
antilag trio + the MCP realignment (consumability).

## Why info_keys are different (the load-bearing point)

A cvar/command lives in ONE engine's code -- you synthesize its description from that code. An **info_key
is a key in the shared `userinfo`/`serverinfo` string**, a cross-engine PROTOCOL surface. Most user-facing
keys are **defined/written by the CLIENT** (ezQuake / qwcl set `name`, `team`, `rate`, `skin`, `topcolor`,
...) and merely **read** by mvdsv/KTX. So "synthesize from the mvdsv read-site" would document the
*consumer*, not the *key*. The current stub already hands you the discriminator: its **`ops` array**.

Categorize the combined 83 by provenance (the `ops` field + the `*`-prefix are the tells):

- **(a) Cross-engine-protocol reads** -- plain keys, `ops:["read"]`, no `*` prefix (`name`, `team`, `rate`,
  `skin`, `topcolor`, `bottomcolor`, `gender`, `ip`, `ping`, `login`, `nocolors`, `Qizmo`, ...). Defined by
  the QW client protocol; mvdsv/KTX consume them. → short pointer/borrow descriptions ("client-set userinfo
  key holding X; read by the server/mod for Y"). **Check whether ezQuake/qwcl L1 already describes these as
  `CVAR_USERINFO` cvars and BORROW** (cf. the "QWCL cross-engine description borrow" future-arc) rather than
  re-deriving. Some may legitimately stay terse.
- **(b) Server/mod producer-side star keys** -- `*`-prefixed, `ops` includes `write`/`remove` (mvdsv
  `*VIP`, `*gamedir`, `*version`, `*spectator`, `*cheats`, `*client`, `*z_ext`, ...). The server/mod SETS
  these. → synthesize from the set-site (real code synthesis, the describe-fill-synthesis method; many were
  touched as cross-refs in earlier chunks, e.g. `*VIP` finding #57, `*gamedir` finding #33).
- **(c) KTX-semantic codes** -- KTX's cryptic 2-letter `iKey`s + named gameplay keys (`di`, `ev`, `fpd`,
  `fs`, `ti`, `ln`, `lra`, `ls`, `lw`, `lw_x`, `mi`, `nrb`, `matchtag`, `runes`, `railcolor`, `pbspeed`,
  `wps`, `wpsx`, `w_rank`, `ktpl`). → per-key KTX source investigation; this is **`ktx-l1-rewrite` skill**
  territory (Sonnet 4.6 high, park-when-ambiguous).

## Prior scoping (READ FIRST -- the homework is largely done)

- HANDOVER **"KTX info_key wider-sweep triage"** small-followup (line ~28) -- already splits the KTX 38
  into the (a)/(b)-style buckets with the key lists; sized ~2-4h for the KTX side.
- **`docs/superpowers/parking/2026-05-27-ktx-userinfo-consumer-handler-design-decision.md`** -- the
  architectural decision behind why these surfaced (the all-sites userinfo emission amendment).
- Memories: `feedback_mod_l1_documentation_architecture` (two-layer A-universal/B-per-codebase),
  `project_l1_seed_l3_layering`, `reference_ktx_entity_categories`.

## Recon (run first)

```sql
-- the 45 MVDSV + 38 KTX, with the ops/star discriminator visible
SELECT project, name, description_origin
FROM entities
WHERE type='info_key' AND description_origin='source_inline' AND project IN ('mvdsv','ktx')
ORDER BY project, (name LIKE '*%') DESC, name;
```
The current `description` for each is the mechanical stub `"<userinfo|serverinfo> info key: X; ops [...]"`
-- the `ops` list is your category signal. Confirm the 45/38 still hold before fanning out.

## Recommended path (scope-first)

1. Read the prior scoping + this handoff. Pull the recon.
2. **Categorize all 83 into (a)/(b)/(c)** and decide, per category, the method + how to handle the
   cross-engine OVERLAP (one description referenced from both engines? per-engine with shared semantics?
   borrow from ezQuake/qwcl producer L1?). Producer L1 check: does ezQuake/qwcl L1 already carry `name`/
   `team`/`rate`/etc. as `CVAR_USERINFO`?
3. **Bring that methodology to the operator** (a short proposal: counts per bucket, the borrow-vs-author
   decision, the overlap-handling decision). This is design-heavy enough to confirm before mass-writing --
   do NOT just run a pipeline.
4. On sign-off: execute per bucket -- (b) producer-side via describe-fill-synthesis, (c) KTX codes via
   ktx-l1-rewrite, (a) reads via borrow/pointer. Overwrite-in-place (the writer UPDATEs by canonical_id;
   no delete -- proven in the cvar/command catch-up).
5. Quality-grid green + idempotency + commit per bucket. Update the HANDOVER (close the KTX info_key
   small-followup + the MVDSV describe-fill info_key remainder).

## Critical rules

- info_keys are cross-engine -- do NOT default to "synthesize from the mvdsv/KTX read-site"; that documents
  the consumer, not the key. Categorize by `ops`/`*` first.
- Borrow before authoring for category (a) -- if the producer engine (ezQuake/qwcl) already describes the
  key, reuse, don't re-derive.
- Park-when-ambiguous for category (c) (ktx-l1-rewrite discipline) -- never force-fit a 2-letter code.
- Stage only your own files; a parallel session commits to `main`.
- Findings are hypotheses -- re-grep set-sites before documenting producer-side keys.

## First actions

1. Read this + the prior scoping (HANDOVER small-followup + the design-decision parking doc) cold.
2. Recon the 45 + 38; categorize into (a)/(b)/(c) by `ops`/`*`.
3. Probe whether ezQuake/qwcl L1 already carries the (a) protocol keys (the borrow source).
4. Bring the methodology proposal to the operator; execute on sign-off.

## When in doubt

This is the cross-engine PROTOCOL layer, not engine-internal knobs -- the value is "what the key holds +
who sets it + who reads it," often a one-liner or a borrow, not a deep synthesis. If a key's meaning is not
legible (esp. the KTX 2-letter codes), park it rather than guess. The arc record is
`workflow-chunk-campaign-brief.md`; the MVDSV describe-fill entry in HANDOVER lists this as remaining work.
