# MVDSV Phase-4 volume batch 2 -- `sv_demo*` + qtv cvars (18 cvars, persisted) -- 2026-05-31

> The second MVDSV volume subsystem batch after batch 1 (`pm_*`, 6 cvars). Loop
> (proven in batch 1, now with the 3 process fixes): D6 synthesis (Opus MAX,
> blind, minimal briefs -- skill supplies D20) -> F-D6a grep-verify -> V-pass
> (independent, Opus MAX, cold context, +canary PER WAVE) -> HARD GATE 1 (canary)
> + HARD GATE 2 (orchestrator re-grep) -> seeded re-synth (none needed) ->
> PERSIST (durable + idempotent via the new `--from-ledger` path). This file is
> the B5 durable record. The per-knob `mvdsv-svdemo-ledger-<knob>.md` files carry
> the full record (description + reasoning + per-clause enforce-trace + the json
> D6Record); this file summarizes + carries the V-pass + the HG2 adjudication.

- **anchor_version:** `1.11-53-g18d0362` (MVDSV dev-head; gated in every
  synthesis + V-pass sub-agent; HEAD `18d036218004f31cf701bb5060448012652de6d1`).
- **source oracle:** `research/repos/mvdsv` `src/` at `18d0362` (the loaded head;
  NOT a /tmp clone, NOT KTX -- V-pass oracle is MVDSV-only).
- **dial:** every synthesis + V-pass sub-agent at model `opus`, MAX reasoning
  (D7 spec-lock; session `/effort max`; prompt-enforced "MAXIMUM reasoning" --
  the Agent tool exposes no per-sub-agent effort dial). Load-bearing safeguard:
  the independent cold-context V-pass + the orchestrator HG2 re-grep.
- **provenance policy:** `description_provenance = NULL` for all 18 (cold-synth,
  no shipped-config candidate; operator clarification 2026-05-30 -- provenance
  holds retained shipped-doc/multi-source DATA only). Grounding = `source_ref`
  + `description_anchor_version` + the enforce-trace cites in
  `description_reasoning`. -> still pending fold into `decisions.md` D11
  (carry-forward from batch 1; orchestrator/operator item).
- **scope (operator-confirmed 2026-05-31):** the 18 cold-synth cvars only --
  15 `sv_demo*` (`sv_demo.c:34-52`) + 3 qtv (`qtv_maxstreams`/`qtv_password`/
  `qtv_streamport`, `sv_demo_qtv.c:25-27`). All `cvar`, all
  `description IS NULL` pre-run, all `suspect_pool_member=FALSE` (verified vs
  `phase-0-artifacts/c3-suspect-pool.md`; no sv_demo/qtv in the C3 pool). The
  recon surfaced the subsystem is bigger than the prompt implied -- 16 commands
  (13 `sv_demo*` + 3 qtv) + 6 already-commented entries (3 sv_demo cmds + 3 qtv
  cvars) -- ALL DEFERRED to a follow-up command batch (operator decision: keep
  this batch one processing shape).

---

## Process fixes applied (the point of this batch)

1. **Heavy text OUT of the orchestrator (KTX b4-ledger pattern).** Each synthesis
   sub-agent wrote its FULL record to its own `mvdsv-svdemo-ledger-<knob>.md`
   (one file/knob, no write races) carrying exactly one fenced ```json``` block =
   the D6Record. It returned to the orchestrator ONLY verdict + description +
   source_ref. A new **`synthesize-mvdsv.ts --from-ledger <glob>`** mode parses
   those json blocks and persists via the shared core. The ledgers are
   git-committed and the DB is reconstructable from them -- NO gitignored
   records.json (batch 1's gap closed). Orchestrator context stayed lean (well
   under the ~300k smell zone).
2. **F-MV1 KTX-override cross-check.** Result: **F-MV1 does NOT bite this batch.**
   `grep ktx/src` for `sv_demo*`/`qtv_*`: KTX does not register/override any of
   these command names -- it CONSUMES them (`localcmd("sv_demostop")`,
   `cvar_fset("qtv_sayenabled",0)`, race/match auto-record via
   `sv_demoeasyrecord`). None of the 18 cvars cite an in-game command in `Set by:`
   (all `server config` or the `-democache` cmdline). The cross-engine CONSUMER
   behavior (KTX race sets `sv_demotxt 0`/`qtv_sayenabled`, match auto-records) is
   D20 `See also: L3` territory -- correctly kept OUT of the L1 descriptions.
3. **One canary per V-pass wave.** Every wave (3 waves) carried exactly one blind
   planted canary with orchestrator-established ground truth. HARD GATE 1 held in
   all 3.

---

## Stage 1 -- synthesis records (18 knobs, blind fan-out, persisted)

Verdict tally: **synthesized 18 / affirmed 0 / hedged 0 / dead_stamped 0.**
(Matches batch 1 + the calibration 0-affirm finding: all 18 are comment-less
cold-synth, so all full-synthesize.) All `confidence=high`,
`description_origin=synthesized`, `description_provenance=NULL`, anchor set.
Full per-clause enforce-trace in each `mvdsv-svdemo-ledger-<knob>.md`.

| # | knob | primary source_ref | one-line behavior |
|---|---|---|---|
| 1 | sv_demoUseCache | sv_demo.c:836 | memory-cache vs straight-to-disk toggle; 0=disk, nonzero=memory; default 0 |
| 2 | sv_demoCacheSize | sv_demo.c:846 | KB memory buffer; CVAR_ROM (read-only); set by `-democache`; 16MB floor; default 0 |
| 3 | sv_demoMaxDirSize | sv_demo_misc.c:154 | KB cap on demo-dir; over-limit -> refuse or clear-old (per sv_demoClearOld); 0=no limit; default 102400 |
| 4 | sv_demoClearOld | sv_demo_misc.c:162 | count of oldest demos (+ their .txt) deleted when dir over cap; <=0 = refuse instead; default 0 |
| 5 | sv_demoDir | sv_demo.c:1723 | subdir under gamedir for demo write/list/delete; auto-mkdir; empty rejected; default demos |
| 6 | sv_demoDirAlt | sv_user.c:1491 | secondary dir tried on primary miss (download + upload); only when sv_demoDir set; default empty |
| 7 | sv_demofps | sv_send.c:1341 | active-state demo frame rate; 0->20 fallback; floored at 4; default 77 |
| 8 | sv_demoIdlefps | sv_send.c:1343 | idle-state demo frame rate; clamped 4-30; default 10 |
| 9 | sv_demopings | sv_send.c:1351 | record ping/packetloss into demo at N-second interval; 0=off; default 3 |
| 10 | sv_demoMaxSize | sv_demo.c:196 | per-demo file size cap (KB); stops+closes that demo when exceeded; QTV streams exempt; 0=no limit; default 20480 |
| 11 | sv_demoExtraNames | sv_demo.c:1773 | easyrecord teamplay auto-filename detail; 0=compact, >0=list players; no effect duel/FFA/explicit; default 0 |
| 12 | sv_demoPrefix | sv_demo.c:1718 | text prepended to recorded demo filename; used raw; default empty |
| 13 | sv_demoSuffix | sv_demo.c:1719 | text appended to recorded demo filename (before .mvd); used raw; default empty |
| 14 | sv_demotxt | sv_demo.c:863 | companion .txt sidecar; 0=none(+delete existing for that demo), 1=full summary, 2=empty placeholder; default 1 |
| 15 | sv_demoRegexp | sv_sys_unix.c:153 | PCRE (case-insensitive) deciding which dir files count as demos; match=listed; default `\.mvd(\.(gz\|bz2\|rar\|zip))?$` |
| 16 | qtv_streamport | sv_demo_qtv.c:122 | TCP listen port for QTV proxy streams; 0=closed; range 0-65534; live re-bind on change; default 0 |
| 17 | qtv_maxstreams | sv_demo_qtv.c:61 | cap on concurrent QTV streams; <1=no limit; default 1 |
| 18 | qtv_password | sv_demo_qtv.c:514 | QTV connection password (plaintext + shared secret for CCITT/MD4/SHA3-512); empty=no auth; default empty |

### F-D6a grep-verify (orchestrator, anti-fabrication)

Every returned `source_ref` independently grepped against live MVDSV source
BEFORE the V-pass. The cvar_t declaration block (`sv_demo.c:34-52`,
`sv_demo_qtv.c:25-27`) confirmed every registered default + flag (notably
`sv_demoCacheSize ... CVAR_ROM` and the `sv_demoDir`-only empty-reject OnChange at
`:63`). Specific-value claims confirmed exactly: `sv_send.c:1341`
`max(4.0, ...value ? ...value : 20.0)` (demofps floor-4 + 0->20); `:1343`
`bound(4.0,...,30)` (idlefps); `sv_demo.c:863`+`:868` (txt 0/1/2);
`sv_demo_qtv.c:122` `bound(0,...,65534)` (streamport); `sv_sys_unix.c:153-156`
(regexp pcre_exec, NOMATCH->skip). **Zero fabrication across all 18.**

---

## Stage 1b -- V-pass classification ledger

Independent, read-only, cold-context per-clause enforce-trace (model `opus`, MAX);
each sub-agent got ONLY knob + description (NOT the synth reasoning -- B3
independence) and re-derived from `src/` at `18d0362`. 3 waves of 6 real + 1 blind
canary. Oracle gate (`git describe == 1.11-53-g18d0362`) held in every sub-agent.

| knob | classification | flavourC | wi2 | wave |
|---|---|---|---|---|
| sv_demoUseCache | TRACED-CLEAN | 0 | 0 | A |
| sv_demoCacheSize | TRACED-CLEAN | 0 | 0 | A |
| sv_demoMaxDirSize | TRACED-CLEAN | 0 | 0 | A |
| sv_demoClearOld | TRACED-CLEAN | 0 | 0 | A |
| sv_demoDir | TRACED-CLEAN | 0 | 0 | A |
| sv_demoDirAlt | TRACED-CLEAN | 0 | 0 | A |
| sv_demofps | TRACED-CLEAN | 0 | 0 | B |
| sv_demoIdlefps | TRACED-CLEAN | 0 | 0 | B |
| sv_demopings | TRACED-CLEAN | 0 | 0 | B |
| sv_demoMaxSize | TRACED-CLEAN | 0 | 0 | B |
| sv_demoExtraNames | TRACED-CLEAN | 0 | 0 | B |
| sv_demoPrefix | TRACED-CLEAN | 0 | 0 | B |
| sv_demoSuffix | TRACED-CLEAN | 0 | 0 | C |
| sv_demotxt | **TRACED-CLEAN** (HG2-adjudicated; wave C self-class C-FIX OVERTURNED) | 0 | 0 | C |
| sv_demoRegexp | TRACED-CLEAN | 0 | 0 | C |
| qtv_streamport | TRACED-CLEAN | 0 | 0 | C |
| qtv_maxstreams | TRACED-CLEAN | 0 | 0 | C |
| qtv_password | TRACED-CLEAN | 0 | 0 | C |
| CANARY sv_demotxt-inverted (0/1 swap) | C-FIX | 1 | 0 | A (control) |
| CANARY sv_demoUseCache-inverted (0/1 swap) | C-FIX | 1 | 0 | B (control) |
| CANARY sv_demoDir-correct | TRACED-CLEAN | 0 | 0 | C (control) |

### HARD GATE 1 -- canary verdicts (all 3 waves PASS)

- Wave A canary (`sv_demotxt` text with 0/1 inverted) -> returned **C-FIX**
  (expected C-FIX). The sub-agent solved `sv_demo.c:863` `if((int)...value)` ->
  truthy writes / 0 deletes, caught the swap. PASS.
- Wave B canary (`sv_demoUseCache` text with 0/1 inverted) -> returned **C-FIX**
  (expected C-FIX). Caught via `sv_demo.c:836` branch + the corroborating
  broadcast string `:857` `(DEST_BUFFEREDFILE) ? "memory" : "disk"`. PASS.
- Wave C canary (`sv_demoDir` CORRECT text) -> returned **TRACED-CLEAN**
  (expected TRACED-CLEAN; over-flag control). Did NOT over-flag. PASS.

Canaries cover both directions: 2 C-FIX (catch false-NEGATIVE rubber-stamping --
the batch-1 risk) + 1 TRACED-CLEAN (catch over-flagging).

### HARD GATE 2 -- orchestrator independent re-grep (caught a V-pass FALSE-POSITIVE)

The decisive catch of this batch. The wave-C sub-agent self-classified the REAL
`sv_demotxt` row **C-FIX**, claiming the clause "0 = do not save a .txt (and
delete an existing one for that demo)" had no enforcing line (it cited the
clear-old doubling `sv_demo_misc.c:165-166` and the unconditional remove-command
sites `:600/646/697` -- all real, all IRRELEVANT to this clause). HG2 re-grep
read the actual record-start txt block:

```
sv_demo.c:860  strlcpy(path, name, MAX_OSPATH);              // path = the demo being recorded
sv_demo.c:861  strlcpy(path + strlen(path) - 3, "txt", ...); // ...with .txt extension
sv_demo.c:863  if ((int)sv_demotxt.value) { ... write ... }
sv_demo.c:881  else
sv_demo.c:882      Sys_remove(path);                          // value 0: removes the .txt FOR THIS demo
```

The clause IS enforced at `sv_demo.c:881-882` (`path` derives from the demo's own
name at `:860-861`). The wave-C sub-agent MISSED `:881-882`; wave A (on the
canary) AND the original synthesis ledger both located it (the
`sv_demotxt` ledger reasoning explicitly traces clause 5 ->
`sv_demo.c:881-882 else Sys_remove(path)`). **Adjudication: `sv_demotxt` is
TRACED-CLEAN; the wave-C C-FIX is a confirmed false-positive.** This is the
dropquad precedent (enforce-trace-discipline.md) in REVERSE: where the batch-1
canary caught a false-NEGATIVE, HG2 here caught a false-POSITIVE -- the
orchestrator re-grep is load-bearing in BOTH directions.

Per-wave HG2 spot-checks (>=1 clause each, all held): wave A `sv_demoUseCache`
0=disk gate `sv_demo.c:836`; wave B `sv_demofps` 0->20/floor-4 `sv_send.c:1341`;
wave C the full `sv_demotxt` adjudication above + `sv_demoDir` empty-reject `:63`.
**F-D6a holds: zero fabrication across all spot-checks.**

## Stage 2 -- change report (B4 seeded re-synth)

**Zero REAL rows flagged after HG2 -> zero real re-synths.** The only flags were
the 2 planted C-FIX canary controls (never persisted) + the 1 wave-C false-positive
on the real `sv_demotxt`, which HG2 overturned to TRACED-CLEAN against
`sv_demo.c:881-882`. All loop stages were exercised (synthesize -> V-pass flag ->
HG2 adjudicate -> resolve), and HG2's value was demonstrated on a real row.

## Persistence + idempotency + probes

- **Persisted:** 18/18 via `synthesize-mvdsv.ts --from-ledger` (fill-not-create;
  UPSERT on canonical_id; `tx.json` provenance binding [NULL here]; transaction).
- **Idempotency (C4/P3):** in-scope MVDSV fingerprint
  `a32ffbe170b0b208fe49503aed52b53f` IDENTICAL across two runs; run 2 skipped all
  18 as terminal-owned (the F-D9b clobber-guard) -> byte-identical. The
  pre-persist `--dry-run` fingerprint matched the committed one (the dry-run
  accurately predicted committed state).
- **Probes @ mvdsv:** `F1.jsonb_columns_not_strings` PASS;
  `F1.describe_fill.synthesized_requires_anchor` PASS;
  `F1.describe_fill.provenance_entry_exists` PASS (gates shipped_doc only).
  `F1.describe_fill.origin_vocabulary` FAIL (1266 = the SAME 633 `ktx:recast_v2`
  rows counted in both the global + arc-scoped parts) -- **0 MVDSV contribution**
  (verified: mvdsv distinct evaluated origins = `synthesized` only, in-vocab; 0
  synthesized rows missing anchor). PRE-EXISTING since 2026-05-21, KTX-side, the
  documented carry-forward. NOTE: `synthesized_requires_source_ref` is a
  placeholder, never registered -- 3 live describe_fill probes, not 4.
- `--status`: in-scope MVDSV evaluated 6 -> **24** (the 6 pm_* + these 18);
  remaining 323.

## Carry-forward (orchestrator/operator items -- NOT blockers)

- **`recast_v2` vocab decision** (un-reds `origin_vocabulary`): 633 KTX rows carry
  `description_origin='recast_v2'`, absent from the probe's allowed set + D2 vocab.
  Operator decides: add `recast_v2` (+ note MVDSV uses `synthesized`) to the
  vocab, or treat as a D21 mis-stamp. RED until resolved; 0 MVDSV contribution.
  (Carried from batch 1; unchanged.)
- **Fold provenance-NULL clarification into `decisions.md` D11** (carried from
  batch 1; executor recorded in ledgers, orchestrator ratifies).
- **F-MV1 promotion to `review-findings.md`** (overrideable-command cross-check):
  this batch refines it -- the failure mode is "document the dead engine fallback
  when a mod OVERRIDES a command" (the `pm_airstep`/KTX case). For sv_demo/qtv,
  KTX CONSUMES but does not override, so F-MV1 is moot -- but the cross-check
  (grep `ktx/src/commands.c` for an override) is still the required method for the
  108-command MVDSV bucket.
- **`-democache` cmdline_param cross-ref:** `sv_demoCacheSize` is set by the
  `-democache <KB>` cmdline param (CVAR_ROM). When the cmdline_param batch fills
  `-democache`, cross-link it to `sv_demoCacheSize`.

## Next-batch recommendation

Loop fully validated (18/18 V-pass-clean after HG2, idempotent, canary-caught
both directions, zero fabrication, fix-#1 durable `--from-ledger` path in place).
Batch-3 candidates: **(a)** the deferred `sv_demo*`/`qtv_*` COMMANDS (16: a
coherent subsystem completion -- record/stop/list/cancel/remove/info* + qtv
list/close/status; F-MV1 cross-check central but verified-moot for these names) +
the 6 already-commented entries (affirm-or-synth path); **(b)** `allow_download*`
(~8); **(c)** the C3 suspect cluster (`sv_www_*`/`sv_web_*`/`sys_sleep`/
`localcommand`) -- the first batch that exercises the C3 dead-stamp path. The
command batch (a) is the natural next slice (same subsystem, completes sv_demo/qtv)
and is the first real test of the F-MV1 method on commands. `sv_antilag` remains
the separate D10 cross-fork DUAL.
