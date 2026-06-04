# Handoff -- info_key fill: close the loose ends (KTX extractor fix + 10 keys)

**Spin up a fresh terminal.** The 83-key cross-engine info_key fill is mostly DONE -- **79 applied to L1**, concept note fixed. This handoff closes what's left: a 2-part bug in the KTX info_key extractor, plus the 10 keys that bug affects. Everything below is source-verified 2026-06-04.

## Where things are

- **79 of 83 info_keys APPLIED** to `entities.description` (`description_origin='synthesized'`), verified (79 UPDATE-1, 4 held still `source_inline`). They came from a per-key cross-codebase **re-synthesis** (workflow `we3djscfr` / run `wf_32022839-ae2`): one Opus agent per key, each independently derived from ezquake+mvdsv+ktx source, then confirmed or rewrote the first-pass draft. Outcome: **45 confirmed, 38 corrected** (~46% -- the original `info-key-fill` drafts were single-pass / single-codebase / mostly Sonnet and had a high error rate; this pass was the missing verification pass).
- **Full review (durable):** `2026-06-04-info-key-resynth-review.md` (this dir) -- all 38 corrected (new text + what-changed), 5 scope-flags, 45 confirmed.
- **Concept note fixed:** `apps/qw-oracle/curated/concept-notes/weapon-scripts.md` now has a `## Server-side weapon switching (w_rank)` section; `wreg` demoted to legacy. `w_rank` reconciled as **server-authored via SSWS** (mvdsv writes it from the client's switch order; the mod reads it), reliable under packet loss/high ping.
- **The 79 are protected:** `deriveInfoKey` guard at `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts:387-388` skips `synthesized`/`shipped_doc` rows (verified live 2026-06-04). Re-extraction will NOT clobber them. (HANDOVER's old "deriveInfoKey unguarded" note is stale.)

## The loose ends to close

### 1. Fix the KTX info_key extractor -- `apps/qw-oracle/scripts/extractors/ktx/_handler_info_keys.py` (TWO defects)

**A -- scope hardcoded.** Lines 173 + 213 emit `scope="userinfo"` for every key; the handler never inspects `args[0]` (the read entity). A read via the `world` entity is a **serverinfo** read. Fix: inspect `args[0]`; when it resolves to the `world` identifier, emit `scope="serverinfo"`.

**B -- `infokey()` not recognized.** `API_OP_MAP` (line 117) has only `SetUserInfo`/`ezinfokey`/`iKey`. The docstring (line 49) claims *"infokey() reads -- not observed in KTX HEAD"* -- that is **false**: KTX HEAD uses `infokey(ent, "key", buf, size)`. Fix: add `"infokey": "read"` to `API_OP_MAP` (args[0]=entity, args[1]=key literal -- same positions the handler already uses).

### 2. Re-extract KTX + load, then finalize the 10 affected keys

After the fix, re-run the KTX extractor + `load-knowledge`. It will:

- **Re-scope 4 keys** (currently mistagged `:userinfo`, all `world`-reads -> `:serverinfo`): `fpd`, `matchtag`, `*cheats`, `*version`. They become NEW entities (`*:serverinfo`); the old `*:userinfo` rows go stale (loader prune). **Descriptions already drafted** -- in `2026-06-04-info-key-resynth-review.md` (Corrected section: search `fpd`, `matchtag`, `*cheats`, `*version`). They were written as serverinfo descriptions; apply to the re-scoped entities.
- **Surface 6 keys** currently MISSING from L1 (read only via `infokey`, so the handler never emitted them):
  - `mapname`, `modelname` -- **serverinfo**; KTX reads them at `g_main.c:184-186` to set `world->model`. Triage value, then document.
  - `*spectator`, `*VIP` -- **userinfo**; server-stamped star keys. These are just KTX-consumer rows for keys already documented on **mvdsv** (`*spectator:userinfo`, `*VIP:userinfo`) -- borrow the mvdsv semantics.
  - `name`, `nomaps` -- **userinfo**; `name` is the player name (KTX reads it once); `nomaps` is an obscure client flag -- both need a source look.
  - The 6 need fresh per-key synthesis (same method as below). 2 of the 6 are trivial mvdsv-borrows.

### 3. Close HANDOVER + commit

Once the 10 are documented, the two HANDOVER info_key items (MVDSV describe-fill "info_keys" sub-item; "KTX info_key wider-sweep triage") fully close.

## Method to reuse (the verification that worked)

One Opus agent per key. Give it: project + key + current scope, the four source trees (`research/repos/{mvdsv,ktx,ezquake-source,fteqw}`), DB metadata + producer-cvar queries, and the rules: **derive from source first, then judge; a `world`-entity read => serverinfo; route by who owns the meaning, not who reads the bytes; park-when-illegible.** Script: `info-key-resynth-verify` (persisted under the prior session's `workflows/scripts/`; re-author from this paragraph if gone -- it's a single `parallel()` over the key list).

## First actions

1. Read this + `2026-06-04-info-key-resynth-review.md` + the design-decision parking doc `docs/superpowers/parking/2026-05-27-ktx-userinfo-consumer-handler-design-decision.md`.
2. Open `_handler_info_keys.py` (lines 49, 117, 173, 213); confirm the two defects against current `research/repos/ktx/src` HEAD (`grep -rn '(world,' src/` for the world-reads; `grep -rn 'infokey(' src/` for the unrecognized API).
3. Fix both defects, re-extract KTX, run the F1 quality grid, apply the 4 drafted descriptions, synthesize + apply the 6 new ones.

## When in doubt

The 79 applied keys are DONE and guard-protected -- do not re-touch them. The remaining work is exactly: the 2-line-ish handler fix, a KTX re-extraction, and documenting the 10 keys it re-scopes (4, drafted) / surfaces (6, fresh). The first-pass `info-key-fill` workflow was single-pass and unreliable; trust the re-synth review file, not the original drafts file.
