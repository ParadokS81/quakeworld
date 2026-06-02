# describe-fill-synthesis ledger -- mvdsv `sv_mod_msg_file`

- **project:** mvdsv
- **knob:** `sv_mod_msg_file` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_mod_msg_file: synthesized -- loads custom death-message regex table parsed into the frag log; empty=built-in defaults; only active when frag log open -- origin=synthesized ref=sv_send.c:332 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Loads a custom set of obituary/death-message patterns used to parse broadcast game messages into the mod frag log. Each line of the file defines one pattern (message type, weapon/cause id, player count, and a regular expression matched against the printed kill messages); when a printed message matches, a structured backslash-delimited record (player names, weapon/cause, timestamp) is written to the mod frag log (opened with modfraglogfile), a separate log from the plain frag log. It has no effect unless that mod frag log is being written to a file.
>
> "" (empty) = use the built-in default English obituary patterns.
> any value = path to a file of custom patterns to load instead.
>
> Default: "" (built-in default patterns).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default empty | sv_main.c:153 | cvar_t sv_mod_msg_file = {"sv_mod_msg_file", "", CVAR_NONE, sv_mod_msg_file_OnChange} | MATCH |
| loaded table consumed to write frag-log records | sv_send.c:332,334 | if ((fraglog = parse_mod_string(string2))) { SV_Write_Log(MOD_FRAG_LOG, 1, fraglog); | MATCH |
| only active when frag log file open | sv_send.c:324 | if (string[0] && logs[MOD_FRAG_LOG].sv_logfile) | MATCH |
| empty -> built-in default patterns | sv_mod_frags.c:64-72 | if (fp == NULL) { ... for (...qwmsg_def[i].str...) qwmsg[i] = &qwmsg_def[i]; | MATCH |
| non-empty -> load file of patterns | sv_mod_frags.c:61-62 | if (value[0]) fp = fopen(value, "r"); | MATCH |
| line format type#id#count#reverse#regex | sv_mod_frags.c:84,87,90,93,99 | msg_type=Q_atoi(strtok #); id=...; pl_count=...; reverse=...; strlcpy(qwmsg[i]->str,...) | MATCH |
| match writes names+weapon+timestamp record | sv_mod_frags.c:162 | snprintf(ret, str_len, "%s\\%s\\%s\\%d\n", buf[pl1], buf[pl2], qw_weapon[qwmsg[i]->id], (int)time(NULL)) | MATCH |
| pattern matched via PCRE | sv_mod_frags.c:147 | if ((buf = qwmsg_pcre_check(str, qwmsg[i]->str, str_len))) | MATCH |
| set-by config/rcon (not blocklisted) | sv_main.c:1748-1762 | blocklist lists sv_admininfo etc., not sv_mod_msg_file | MATCH |
| KTX no override | ktx/src (grep) | no references to sv_mod_msg_file | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Loads a custom set of obituary/death-message patterns to parse broadcast game messages into the frag log | sv_mod_frags.c:61-62 + sv_send.c:332 | `if (value[0]) fp = fopen(value, "r");` ... `if ((fraglog = parse_mod_string(string2)))` | MATCH |
| 2 | Each line defines one pattern: (message type, weapon/cause id, player count, and a regex) | sv_mod_frags.c:83-99 | `qwmsg[i]->msg_type=Q_atoi(str_tok)` / `->id` / `->pl_count` / **`->reverse`** / `->str` (5 fields split on `#`) | MISMATCH-minor (incomplete: omits the 5th field `reverse`; delimiter is `#`, unstated) |
| 3 | regex matched against the printed kill messages | sv_mod_frags.c:123,129 | `pcre_compile(qwm_str,...)` ... `pcre_exec(reg,NULL,str,str_len,...)` | MATCH |
| 4 | when a message matches, a structured **tab-style** record (player names, weapon/cause, timestamp) is written | sv_mod_frags.c:162,170 | `snprintf(ret,str_len,"%s\\%s\\%s\\%d\n", buf[pl1],buf[pl2],qw_weapon[...],(int)time(NULL))` | **MISMATCH (C-FIX): separator is BACKSLASH `\`, not tab; written verbatim per sv_main.c:4154 `log_msg = msg`** |
| 5 | written to "the server's frag log" | sv_send.c:324,334 ; log.h:24-25 ; sv_ccmds.c:225 | `if (string[0] && logs[MOD_FRAG_LOG].sv_logfile)` ... `SV_Write_Log(MOD_FRAG_LOG,1,fraglog)` ; `{... "modfraglogfile","modfrag_", ... SV_ModFragLogfile_f}` | MISMATCH-minor: target is **MOD_FRAG_LOG** (cmd `modfraglogfile`, prefix `modfrag_`), a SEPARATE log from the plain FRAG_LOG (cmd `fraglogfile`, prefix `frag_`, log.h:24) |
| 6 | "Only has an effect while the server's frag log is being written to a file" | sv_send.c:324 | `if (string[0] && logs[MOD_FRAG_LOG].sv_logfile)` | MATCH-on-gate / MISMATCH-on-name: gate is real but it is the MOD_FRAG_LOG file, not the frag log |
| 7 | "" (empty) = use built-in default English obituary patterns | sv_mod_frags.c:61-72 ; sv_mod_frags.h:74-138 | `if (value[0]) fp=fopen(...)` ; `if (fp==NULL){... qwmsg[i]=&qwmsg_def[i]; ...}` ; `// From fuhquake's fragfile.dat` table of English obits | MATCH |
| 8 | any value = path to a file of custom patterns to load instead | sv_mod_frags.c:62-74 | `fp=fopen(value,"r"); if(fp==NULL){ if(value[0]) Con_Printf("WARNING: ...can't open file %s"); ...defaults }` | MATCH-minor-incomplete: a value that FAILS to open also silently falls back to defaults (with a warning), not "load instead" |
| 9 | Default: "" | sv_main.c:153 | `cvar_t sv_mod_msg_file = {"sv_mod_msg_file", "", CVAR_NONE, sv_mod_msg_file_OnChange};` | MATCH (WI-2 ok) |
| 10 | Set by: server config / rcon | sv_main.c:153 ; cvar.h:61 | `CVAR_NONE` ; `#define CVAR_NONE (0)` (no ROM/archive flag -> settable) | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Wide-grep found exactly 3 use-sites (registration sv_main.c:153 + register sv_main.c:3565; OnChange enforcer sv_mod_frags.c:52; extern sv_mod_frags.h:29). The OnChange handler is the loader; the runtime consumer chain is sv_send.c SV_DoBroadcastPrintf -> parse_mod_string -> SV_Write_Log(MOD_FRAG_LOG). qwmsg[] has no other consumer (grep clean).

CLASSIFICATION = C-FIX. The decisive defect is clause 4: the description says the emitted record is "tab-style", but the enforcing snprintf (sv_mod_frags.c:162 WEAPON, :170 SYSTEM) uses BACKSLASH as the field separator -- format "%s\\%s\\%s\\%d\n" -- and SV_Write_Log writes it verbatim (sv_main.c:4154 `log_msg = msg`, no reformatting). grep -P '\\t' over sv_mod_frags.c returns nothing; there is no tab anywhere in the path. This is a flat contradiction against the enforcing line, not name/string inference -- it reads as fact and is wrong. Record shape is actually: WEAPON -> `victim\killer\weapon\unixtime\n`; SYSTEM -> `name\system\unixtime\n` (timestamp = time(NULL), unix epoch seconds).

Compounding (would be C-NEAR-MISS on its own, folded into the C-FIX row): clauses 5+6 name the destination as "the server's frag log", but the destination is MOD_FRAG_LOG -- a DISTINCT log opened by `modfraglogfile` (file prefix `modfrag_`), separate from the plain FRAG_LOG opened by `fraglogfile` (prefix `frag_`, log.h:24-25, sv_ccmds.c:223-225). The plain frag log is fed by a different path (QC bprint + frag_log_type, pr_cmds.c:2326 / sv_ccmds.c:452-454) and carries different content. So "Only has an effect while the frag log is written to a file" points at the wrong file: the real gate is `logs[MOD_FRAG_LOG].sv_logfile` (sv_send.c:324), i.e. the mod-frag log must be open (toggled via `modfraglogfile`).

Minor (acceptable but worth a recast): clause 2 lists 4 of the 5 parsed fields (omits `reverse`, the a->b vs b->a name-order flag used at sv_mod_frags.c:157) and does not state the `#` field delimiter; clause 8 omits that an unopenable path silently falls back to defaults (with a console WARNING) rather than failing.

Recommended re-synth seed for B4: (a) replace "tab-style" with the actual backslash-delimited record shape; (b) name the log as the mod-frag log (`modfraglogfile` / prefix `modfrag_`), not the frag log; (c) optionally note the 5th field `reverse` + `#` delimiter and the open-failure->default fallback.

## flags_for_review

- [review/cross-mod-override/vpass] sv_mod_msg_file feeds MOD_FRAG_LOG, which is a DIFFERENT log from the plain FRAG_LOG. The proposed description (and likely sibling docs for frag_log_type / fraglogfile / modfraglogfile) risk conflating the two. FRAG_LOG (cmd fraglogfile, prefix frag_) is written by the QC bprint path gated on frag_log_type (pr_cmds.c:2326, sv_ccmds.c:452-454) and carries raw \death\... style records; MOD_FRAG_LOG (cmd modfraglogfile, prefix modfrag_) is written ONLY by parse_mod_string. Worth a cross-check when those sibling knobs are described.
- [fyi/runtime-dead-suspect/vpass] qw_system[] obituary table (sv_mod_frags.h:54-60: start/end/connect/disconnect/timeout) is commented '// system messages (not released yet)'. The SYSTEM msg_type branch in parse_mod_string (sv_mod_frags.c:167-171) and qw_system are fully wired, but no default qwmsg_def entry uses msg_type==SYSTEM (all defaults are WEAPON, sv_mod_frags.h:78-137). So SYSTEM patterns are reachable ONLY via a user-supplied custom file -- the built-in defaults never emit a SYSTEM record. Not a bug, but a runtime-dead-by-default branch worth knowing if the description ever enumerates SYSTEM behavior.
- [fyi/suspected-bug/vpass] parse_mod_string indexes qw_weapon[qwmsg[i]->id] (sv_mod_frags.c:160,162) and qw_system[qwmsg[i]->id] (:168,170) with an UNVALIDATED id parsed from the user file via Q_atoi (sv_mod_frags.c:87). qw_weapon[] has 18 entries (idx 0-17), qw_system[] has 5 (idx 0-4); an out-of-range id in a custom sv_mod_msg_file would read out of bounds. Pre-existing latent issue, admin-supplied input only -- noting per trace-discipline, not a description clause.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_mod_msg_file",
  "type": "cvar",
  "description": "Loads a custom set of obituary/death-message patterns used to parse broadcast game messages into the mod frag log. Each line of the file defines one pattern (message type, weapon/cause id, player count, and a regular expression matched against the printed kill messages); when a printed message matches, a structured backslash-delimited record (player names, weapon/cause, timestamp) is written to the mod frag log (opened with modfraglogfile), a separate log from the plain frag log. It has no effect unless that mod frag log is being written to a file.\n\n\"\" (empty) = use the built-in default English obituary patterns.\nany value = path to a file of custom patterns to load instead.\n\nDefault: \"\" (built-in default patterns).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_mod_frags.c:52. Registration cvar_t sv_mod_msg_file default \"\" at sv_main.c:153 (CVAR_NONE, OnChange=sv_mod_msg_file_OnChange). ENFORCING read of the loaded table: sv_send.c:332 in SV_DoBroadcastPrintf calls parse_mod_string(string2); on a returned match sv_send.c:334 writes the result via SV_Write_Log(MOD_FRAG_LOG, 1, fraglog). GATE: sv_send.c:324 `if (string[0] && logs[MOD_FRAG_LOG].sv_logfile)` -- the parse only runs when the mod-frag log file is open, hence 'only has an effect while the frag log is being written'. parse_mod_string (sv_mod_frags.c:140-178) PCRE-matches each table entry's pattern (qwmsg_pcre_check, :147) and, on match, builds a backslash-delimited record: WEAPON case sv_mod_frags.c:162 snprintf \"%s\\\\%s\\\\%s\\\\%d\" (names, qw_weapon[id], time(NULL)); SYSTEM case :170. LOADING/OFF-state: OnChange sv_mod_frags.c:61-62 fopen(value) only if value[0]; sv_mod_frags.c:64-74 on NULL/empty falls back to the built-in default table qwmsg_def[] (defined sv_mod_frags.h:76, English obituary regexes e.g. \"(.*) cratered\"), confirming empty=defaults. File-format parse sv_mod_frags.c:77-105 strtok on '#': msg_type#weapon_id#pl_count#reverse#pattern (fields filled :84,:87,:90,:93,:99); cap MOD_MSG_MAX=512 (sv_mod_frags.h:30). 'message type / weapon-or-cause id / player count / regex' stated from these field assignments. Set-by: not on the normal-rcon blocklist (sv_main.c:1748-1762 lists sv_admininfo etc., not this), so server config / rcon. F-MV1: KTX has zero references to this cvar (grep ktx/src empty) -- engine-owned. All clauses traced TRACED-CLEAN; no name/comment inference.",
  "description_proposed": null
}
```
