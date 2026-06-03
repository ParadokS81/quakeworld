# Handoff -- info_key fill: review drafts + apply (fresh terminal)

**Spin up a fresh terminal.** The scoping + drafting is done; this is the review-and-apply pass for the
83 cross-engine info_keys (45 MVDSV + 38 KTX). Interactive with the operator -- they read every bucket
before it touches the DB.

## Where things are right now

- **Hub concept note SHIPPED** -- `apps/qw-oracle/curated/concept-notes/qw-userinfo-serverinfo-protocol.md`
  (commit `32363675`). It explains the cross-codebase userinfo/serverinfo protocol: client publishes ->
  mvdsv stores/guards/stamps -> KTX reads. The 83 L1 rows are NODES that hang off this hub; they stay
  **terse** because the story lives in the note.
- **Drafts READY** -- `2026-06-03-info-key-fill-drafts.md` (this dir), produced by the `info-key-fill`
  workflow, all source-verified. **81 live + 2 parked** (buckets: a=16, a'=27, b=20, c=18). Quality is
  high -- the synthesis caught real semantics (e.g. `lw`/`ls`/`ln`/`lra` are centerprint LINE-OFFSETS, not
  weapon codes; `needpass` is a 1/2/4 password bitmask; `*VIP` carries the reserved-slot level).
- **SCOPE FINDING (extractor data-quality) -- read before applying KTX `*`-keys.** The 2 parks (`fpd`,
  `matchtag`) are NOT illegible -- they are **mis-scoped**: KTX reads them via `iKey(world, ...)` (a
  serverinfo read) and they are set via `serverinfo <key>`, yet L1 tags them `userinfo`. The same
  `world`-read pattern very likely affects KTX `*cheats` and `*version` (drafted as a' pointers, but their
  text already says "reads from the world/serverinfo string"). **Action:** spot-check the scope of every
  KTX `*`-key + the 2 parks; the real fix is in the KTX info_key extractor (a `world`-entity read should
  emit `scope='serverinfo'`, not `userinfo`). Log it as a HANDOVER extractor finding; fix scope (or
  re-extract) before applying `fpd`/`matchtag` (the `matchtag` description is already drafted and ready
  once scope is corrected).
- **What's left:** review the drafts with the operator bucket-by-bucket, apply the clean ones to
  `entities.description`, hold the 2 parks for the scope fix, verify, commit, close the two HANDOVER items.

## The four buckets (what each draft should look like)

| Bucket | Keys | Method | Shape of a good description |
|--------|------|--------|------------------------------|
| (a) borrow | 16 | adapted from ezQuake's `CVAR_USERINFO` cvar | "Client-set userinfo (ezQuake `rate`): max bytes/sec the client asks the server to send. Read by the server to throttle." |
| (a') pointer | 27 | authored from read-site + QW protocol | "Marker injected by the Qizmo proxy; present when the client connected through Qizmo." -- or **parked** if illegible |
| (b) mvdsv synth | 20 | synthesized from re-grepped mvdsv set-sites | "Server-set serverinfo naming the active mod/gamedir; clients/QTV read it to resolve auto-download paths." |
| (c) KTX rewrite | 20 | from `iKey`/`ezinfokey` read-sites | "Client-set bitmask KTX reads to format the weapon-stats printout." -- or **parked** for cryptic 2-letter codes |

`w_rank` appears in both (b)-mvdsv and (c)-ktx -- it is the one cross-engine pair. Reconcile the two
drafts into one shared semantic at review (recommendation: KTX-led, the consumer that gives the rank its
gameplay meaning; mvdsv row borrows it).

## Reads required (cold)

1. This file + `2026-06-03-info-key-fill-drafts.md` (the drafts).
2. `qw-userinfo-serverinfo-protocol.md` (the hub -- the rows See-also it).
3. `2026-06-03-info-key-cross-engine-batch-handoff.md` (this dir -- the original scope-first framing).
4. `docs/superpowers/parking/2026-05-27-ktx-userinfo-consumer-handler-design-decision.md` (why these
   surfaced; L1 inventory is flat by design).
5. Memories: `feedback_mod_l1_documentation_architecture`, `reference_ktx_entity_categories`,
   `feedback_l1_description_template`.

## Critical rules

- **Route by who owns the meaning, not who reads the bytes.** ops/`*` is a tell, not the law. (KTX's bot
  writes `team`/`topcolor` and mvdsv writes `name`/`spectator`, yet those stay client-semantic borrows;
  `password` is mvdsv-semantic even though it looks like the ezQuake `password` cvar -- that cvar is the
  server-HOST password, a different surface. Do not borrow it.)
- **Terse.** One to two sentences, user-facing, no engine jargon (file:line / function names / cf_flags
  belong in reasoning, never in `description`).
- **Overlap = same description into both engine rows** (the 7 shared keys: `bottomcolor` `topcolor`
  `skin` `rate` `team`, plus `Qizmo` `*client`). The L1 inventory is flat.
- **Parks stay parked.** Do NOT write a guessed description for an illegible 2-letter KTX code. Leave the
  `source_inline` stub, list it in the parks section for a later targeted pass.
- **The F-D4a guard is already in place** (`derive-entity-description.ts:387-388`, verified 2026-06-03):
  `deriveInfoKey` skips `description_origin='synthesized'/'shipped_doc'` rows, so applied descriptions
  survive the next mvdsv/ktx re-extraction. No loader change needed.
- **Stage only your own files** -- a parallel session may be committing to `main`.

## First actions

1. Confirm the drafts file exists; read it. Pull the live recon to confirm 45/38 still hold:
   `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT project, count(*) FROM entities WHERE type='info_key' AND description_origin='source_inline' AND project IN ('mvdsv','ktx') GROUP BY project;"`
2. Walk the drafts with the operator, one bucket at a time (start with the 16 borrows -- fastest to
   confirm). Operator approves / edits / rejects each. Reconcile `w_rank`.
3. Apply the approved drafts (see below). Leave parks untouched.

## Apply mechanism

Per-key, by `entities.id` (resolve from project+type+name; the name carries the `:userinfo`/`:serverinfo`
suffix). Same overwrite-in-place pattern the cvar/command catch-up used (UPDATE, no delete):

```sql
UPDATE entities
SET description = $approved_text,
    description_origin = 'synthesized',
    description_anchor_version = $head_tag,   -- match the tag the mvdsv/ktx describe-fill used; find via:
                                              -- SELECT DISTINCT description_anchor_version FROM entities
                                              -- WHERE project=$p AND description_origin='synthesized' LIMIT 3;
    updated_at = now()
WHERE id = $entity_id;
```

Hub See-also linkage is a review decision: either append a short "See also: userinfo/serverinfo protocol
(concept note)" clause to descriptions where it adds value, or rely on the note's `related_entities` (the
note already lists the exemplar keys). Do not clutter all 83 with the same clause -- ask the operator.

## Verify + commit + close

- Quality-grid green for mvdsv + ktx info_keys; idempotency (re-run apply -> 0 changes); spot-check ~5
  via `lookup_entity` through the MCP (or direct SQL) to confirm the text reads well and is jargon-free.
- Commit per bucket or as one "info_key fill" commit (operator preference); one-line message, what + why.
- Close BOTH HANDOVER items: the **MVDSV describe-fill info_key remainder** (Active arcs entry, "45
  info_keys") and the **KTX info_key wider-sweep triage** small-followup (~line 28). Delete both the index
  line and the inline body per HANDOVER's own "how to work an item" rule. The remaining MVDSV L1 work
  after this is only the `sv_antilag*` trio (D10) + the MCP realignment.

## When in doubt

Hub-and-spoke: the concept note owns the cross-codebase story; each row is a terse node. Document the
key's OWNER (client cvar / mvdsv / KTX), not the consumer that happens to read it. If a key's meaning is
not legible from source, PARK it -- a wrong-but-plausible description is worse than an honest stub.
