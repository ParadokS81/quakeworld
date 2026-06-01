# MVDSV describe-fill -- batch ledger: demo/qtv commands

**Cluster:** `demo-qtv-cmd` (sv_demo/qtv server commands). 20 command names, 15 distinct handlers.
**Anchor:** `1.11-53-g18d0362` (HEAD `18d036218004f31cf701bb5060448012652de6d1`).
**Committed fingerprint:** `43cb33b58858b3aa95a09eddae2ffecd`.
**Persisted:** 20/20, errors 0. Cursor 24 -> 44 / 347 evaluated; command bucket 0 -> 20 / 108.

## Scope

First COMMAND batch (command bucket was 0/108) and first real F-MV1-on-commands test.
20 names resolve to 15 handlers (5 alias pairs share a handler). Three commands co-located in
`sv_demo.c` but functionally non-demo (`sv_lastscores`, `script`, `sv_usercmdtrace`) were
EXCLUDED -- they belong in their own slices.

The 20: `record`/`sv_demorecord`, `easyrecord`/`sv_demoeasyrecord`, `stop`/`sv_demostop`,
`cancel`/`sv_democancel`, `sv_demolist`, `sv_demolistr`/`sv_demolistregex`, `sv_demoremove`,
`sv_demonumremove`, `sv_demoinfoadd`, `sv_demoinforemove`, `sv_demoinfo`, `sv_demoembedinfo`,
`qtv_list`, `qtv_close`, `qtv_status`.

5 alias pairs (same handler, verified no `Cmd_Argv(0)` name-branching): record/sv_demorecord
(SV_MVD_Record_f), easyrecord/sv_demoeasyrecord (SV_MVDEasyRecord_f), stop/sv_demostop
(SV_MVDStop_f), cancel/sv_democancel (SV_MVD_Cancel_f), sv_demolistr/sv_demolistregex
(SV_DemoListRegex_f).

## F-MV1 (KTX-override check) -- MOOT

KTX registers NONE of the 20 names (only an unrelated `demomark`). KTX's `cmd demoinfo` stuffcmd
(`ktx/src/commands.c:7991`, in `dinfo()`) is CONSUMPTION of the MVDSV client `demoinfo` ucmd
surface, not an override. Engine behavior documented as-is.

## Pipeline

- **Synthesis:** 5 workers x 4 knobs (Opus MAX); alias pairs co-located so each shared handler
  traced once, both ledgers written self-contained + cross-referenced.
- **F-D6a:** all 14 handler definitions + registrations grep-verified at claimed lines. Note
  handlers live in `sv_demo.c` (record/stop/easyrecord/cancel) and `sv_demo_misc.c` /
  `sv_demo_qtv.c` (list/remove/info/embedinfo/qtv) -- the registration file (`sv_demo.c`) is NOT
  the handler file for most. Zero fabrication.
- **V-pass:** 4 waves (5 real + 1 blind canary each), Opus MAX cold, knob+description only.
  HG1 canaries 4/4 correct (3 C-FIX caught + 1 TRACED-CLEAN control -- no over-flagging).
  HG2 re-grep (both directions) confirmed every flag real; zero false-positives.
- **Real findings (caught by V-pass, missed by all 5 synth workers):**
  1. **"newest first" INVERTED on all 3 listing commands.** Ordering lives in
     `Sys_compare_by_date` (`sv_main.c:4192`) = ascending mtime = OLDEST first. Cluster error
     (shared `SV_DemoList` root -> all 3 inherited the same wrong clause). Corrected to "oldest
     first" + added the live-game >100 truncation caveat (`sv_demo_misc.c:398`).
  2. **`sv_demoembedinfo` "(no sub-directory paths)"** -- sourced from a code COMMENT
     (`sv_demo_misc.c:808`); `FS_UnsafeFilename` enforces only absolute / `..`, not subdirs.
     Corrected to the actually-enforced rejections (.cfg / absolute / `..`).
  3. **`cancel`/`sv_democancel` "does nothing"** when not recording -- actually prints
     "Not recording a demo." (`sv_demo.c:937`). Corrected for accuracy + consistency with
     `stop`/`record` phrasing.
- **Seeded re-synth (B4):** 2 workers full-re-traced + corrected the 6 affected rows.
- **Re-V-pass:** 6 corrected rows all TRACED-CLEAN; canary (`sv_demoinforemove` corrupted to
  claim it deletes the demo too) caught as C-FIX.
- **Persist + idempotency:** 20 persisted; re-run skipped all 20 terminal-owned; fingerprint
  stable `43cb33b58858b3aa95a09eddae2ffecd`.
- **Probes:** `jsonb_columns_not_strings` PASS, `describe_fill.synthesized_requires_anchor` PASS,
  `describe_fill.provenance_entry_exists` PASS. `origin_vocabulary` RED is pre-existing KTX
  (1266 unchanged; mvdsv evaluated origins = `synthesized` only -- zero contribution).

## Result

20/20 TRACED-CLEAN (14 first-pass clean + 6 corrected-and-reconfirmed). All shipped at anchor
`1.11-53-g18d0362`.
