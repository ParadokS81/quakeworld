# Cross-batch map-voting mechanism pre-flight (fold into next ktx-l1-rewrite batch)

**Created**: 2026-05-26 (immediately post-Voting batch ship, commit `7ed63f8f`)
**Trigger**: Finding 5 in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md`
**Scope**: pre-flight investigation that bootstraps both (a) Voting batch's cm-framing apply-pass and (b) the next ktx-l1-rewrite batch's dispatch context (especially if the next batch is Match flow or Mode selection where some of these entities live)
**Cost**: ~1 hour pre-flight investigation before normal batch dispatch begins

---

## Why this exists

The map-voting mechanism spans at least 3 KTX L1 categories:

- **Voting (SHIPPED 2026-05-26)** -- k_vp_map (threshold), k_no_vote_map (Shape 4 gate), cm (internal alias-target), next_map (matchless-mode alias for break)
- **Match flow (PENDING)** -- votemap (user-facing vote-by-name, catalog line 10122), break (live-match force-end), forcebreak (admin override)
- **Unknown batch (PENDING)** -- k_lockmap (Shape 4 gate referenced in cm + next_map drafts; likely Mode selection or another category)
- **Unknown batch (PENDING)** -- mapslist_dl (client-side list download enabling auto-aliases, commands.c:699)

The Voting batch's `cm` draft inherits a misleading "vote by list index" framing from the existing L1 description -- cm is actually `CF_NOALIAS | CD_NODESC` (internal alias-target), not user-facing. Users invoke `/dm3` (auto-alias stuffed at connect time, dispatching to `cmd cm 3`) or `/votemap dm3` (user-facing peer). The Voting batch's apply-pass cannot safely reframe cm without verifying votemap's actual semantics in source, because the existing votemap description ALSO looks suspicious ("switch to a named map IMMEDIATELY" -- but handler is `VoteMap`, implying vote-cast mechanics).

Finding 5 in the Voting drafts file captures the issue with `[PENDING-CROSS-BATCH-VERIFICATION]` tag.

---

## What to do (start of next batch, ~1 hour pre-flight)

Before dispatching the next batch's first per-card sub-agent, run this investigation:

### Step 1 -- source-walk the 5 pending entities

KTX source root: `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`

- **votemap** -- handler `VoteMap` at `commands.c:701` (CF_BOTH | CF_MATCHLESS | CF_PARAMS, CD_VOTEMAP). Trace `VoteMap` body. Questions to answer:
  - Is it a vote-cast (Shape 7b like cm)? Look for `self->v.<voteflag>` toggle + `get_votes_req(OV_MAP, ...)` + `cvar_fset` on map state.
  - Is it an immediate-switch (admin only)? Look for `is_adm(self)` check + immediate map change call.
  - Is it dual-mechanism (admin → immediate; player → vote-cast)? Both paths in one handler.
  - Does it route through the same OV_MAP channel as cm, or different?

- **mapslist_dl** -- handler at `commands.c:699` (CF_BOTH | CF_MATCHLESS | CF_PARAMS | CF_NOALIAS | CF_CONNECTION_FLOOD). Walk the handler body. Likely a one-shot client-side download of the server's `mapslist[]` enabling the auto-aliases. Note CF_NOALIAS -- internal command, dispatched via stuffcmd from connect-time setup. Sibling `cmdslist_dl` at commands.c:700.

- **k_lockmap** -- find registration in `world.c` + read sites. Likely Shape 4 gate that refuses cm + next_map for non-admins. Note category for the See-also cross-link.

- **break** -- in Match flow category. Find registration + handler. Per Voting batch finding (next_map sub-agent), `break` and `next_map` share the same `PlayerBreak` handler and the same `self->v.brk` vote flag; `next_map` is the matchless-mode alias. So `break` is the live-match version. Shape 7b? Threshold cvar is `k_vp_break` (Voting batch, card 6).

- **forcebreak** -- admin-override for break. CF_BOTH_ADMIN expected. Per k_vp_break sub-agent finding, this is the admin-veto path that's intentionally SEPARATE from break's vote channel (OV_BREAK has no is_admins_vote() path -- forcebreak is the override mechanism instead).

### Step 2 -- produce a mechanism map

As a small parking doc (or inline section of the batch's own handoff), capture:

- **User-facing entry points** -- `/votemap <mapname>`, auto-aliased map names (`/dm3` etc.), `/next_map` (matchless), `/break` (match), `/forcebreak` (admin override)
- **Internal alias-targets** -- `cm` (CF_NOALIAS), possibly others surfaced during the walk
- **Shared vote-channels** -- OV_MAP (cm + votemap → vote tally), OV_BREAK (break + next_map → tally), distinct channels NOT shared by cm/break
- **Cross-batch gating cvars** -- k_no_vote_map (matchless gate), k_lockmap (lock gate), k_vp_map (threshold), k_vp_break (threshold)
- **Auto-alias mechanism** -- `maps.c:296` (alias <mapname> "cmd votemap <mapname>") + `maps.c:313` (alias <mapname> cmd cm <index>). Either mechanism active depending on server config? Both always present? Walk the surrounding context.
- **User-flow vs internal-mechanism distinction** -- the Action-level vs implementation-level v2 discipline rule (per `~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md`)

Save mechanism map as `apps/qw-oracle/docs/reviews/ktx-map-voting-mechanism-map.md` (or similar) -- a permanent cross-batch reference that future batches can cite without re-investigating.

### Step 3 -- update Voting batch Finding 5

Edit `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md`:

- **Drop the `[PENDING-CROSS-BATCH-VERIFICATION]` tag** from Finding 5's header once verified
- **Replace the "PENDING cross-batch verification" subsection** with verified votemap / break / forcebreak / k_lockmap / mapslist_dl semantics
- **Refine the "Apply-pass correction" subsection** to use verified entity names + framings (currently uses provisional name-only references to votemap)

### Step 4 -- draft pending entities (if in current batch)

If any of the 5 pending entities are in THIS batch's category, draft them using the verified framing:

- They MUST cross-link bidirectionally with cm + k_no_vote_map + k_vp_map + next_map (Voting batch) in See-also
- votemap card MUST clarify whether it's vote-cast (Shape 7b) or immediate-switch or dual
- break card MUST clarify the next_map relationship (matchless alias) and the forcebreak relationship (admin override)

### Step 5 -- if none of the pending entities are in current batch

The investigation still produces value:

- Unblocks Voting batch's apply-pass (Finding 5 verified)
- Establishes mechanism map for future Match flow / Mode selection batches
- Primes the next dispatcher to fold map-mechanism context into their batch's handoff

Save the mechanism map regardless; reference it from this batch's own handoff doc.

---

## What NOT to do

- **Don't re-dispatch the 4 Voting-batch cards** (cm, k_no_vote_map, k_vp_map, next_map). Their drafts stand; only Finding 5's apply-pass guidance gets refined.
- **Don't extend the ktx-l1-rewrite SKILL.md or shape catalog** based on this investigation. It's user-flow disambiguation, not a new shape. The Action-level vs implementation-level rule already exists in `universal-shape-v2.md`.
- **Don't touch `entities.description` in the DB.** Apply pass is still operator-driven, separate phase. All 3 batches' apply passes remain queued.

---

## Reads required (in order, before dispatching)

1. **This handoff doc** (you are here).
2. **Finding 5 in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md`** (last section: `## Cross-card consistency notes` → Finding 5) -- the trigger for this work.
3. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** + all 6 references -- standard skill cold-load. Pay attention to `references/universal-shape-v2.md` "Action-level, not implementation-level" rule.
4. **`docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`** -- spec governs per SKILL.md header. Carries 2026-05-26 amendment for Shape 11.
5. **The 3 prior batch drafts files** (skim, not read in full):
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md` (Server config, 57 cards)
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-25.md` (Spectator chat, 8 cards)
   - `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26.md` (Voting, 34 cards; includes Finding 5)
6. **HANDOVER.md Small followups section** -- 3 ktx-l1-rewrite apply-pass entries (Server config / Spectator chat / Voting) are queued; this work creates a 4th that supersedes Finding 5's pending state.

---

## Anchor

Same as Voting batch: `v1.36-1633-g67253dc`. Re-verify at session start with:
```
git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always
```
Update everywhere if drifted.

---

## When you're done

- **Mechanism map saved** at a permanent cross-batch path (e.g. `apps/qw-oracle/docs/reviews/ktx-map-voting-mechanism-map.md`).
- **Finding 5 updated** in the Voting drafts file (PENDING tag dropped, Apply-pass correction refined with verified framings).
- **HANDOVER.md updated** -- delete this parking doc entry (the pre-flight is no longer pending); the apply-pass guidance now lives in Finding 5's refined form.
- **Pending-entity drafts ready** (if applicable) -- if Match flow / Mode selection batch was the host, the votemap / break / forcebreak / k_lockmap / mapslist_dl cards are drafted under the verified framing.
- **Single wrap-up commit** at the end of the batch (per standard batch ship convention).
- **Mark this parking doc for deletion**: `git rm docs/superpowers/parking/2026-05-26-handoff-cross-batch-map-mechanism-preflight.md`.

---

## When in doubt

- **The spec governs** per the SKILL.md header.
- **Verify against live KTX source** -- never trust the existing description's framing without source verification (Step 3 spot-check is the inner enforcement loop). The cm framing problem is exactly the kind of thing Step 3 catches when not skipped.
- **Action-level discipline** is the load-bearing rule here -- if an entity's description mentions an internal mechanism the user can't reason about (index lookup into a server-arbitrary list), that's an implementation-level leak and the recast must lift it to action-level.
