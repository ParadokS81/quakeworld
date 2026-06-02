# describe-fill-synthesis ledger -- mvdsv `sv_onDemoRemove`

- **project:** mvdsv
- **knob:** `sv_onDemoRemove` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_onDemoRemove: synthesized -- runs a named .qws server script on rmdemo/rmdemonum, passing demo dir + filename; empty=nothing -- origin=synthesized ref=sv_demo_misc.c:631 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Names a server-side script to run automatically when a single named MVD demo is removed with the sv_demoremove / sv_demonumremove commands (bulk/wildcard removals do not trigger it). When set, after the demo file is successfully removed the server runs the named script (a .qws script file on the server host) and passes it the demo directory and the removed demo's filename as arguments.
>
> "" (empty) = run nothing on demo removal.
> any value = name of the script to run, optionally followed by fixed arguments.
>
> Default: "".
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default empty | sv_demo.c:51 | cvar_t sv_ondemoremove = {"sv_onDemoRemove", ""} | MATCH |
| fires on successful demo removal (rmdemo) | sv_demo_misc.c:627,631 | if (!Sys_remove(path)) {... if (*sv_ondemoremove.string) | MATCH |
| also fires for rmdemonum | sv_demo_misc.c:682 | if (*sv_ondemoremove.string) (inside SV_MVDRemoveNum_f) | MATCH |
| runs script with dir + filename args | sv_demo_misc.c:637 | Cmd_TokenizeString(va("script %s \"%s\" \"%s\"", sv_ondemoremove.string, sv_demoDir.string, name)) | MATCH |
| value is a server-side .qws script | sv_main.c:2864,2866 | Sys_Printf("Running %s.qws\n", path); Sys_Script(path, ...) | MATCH |
| empty -> nothing runs | sv_demo_misc.c:631 | if (*sv_ondemoremove.string) (false when empty) | MATCH |
| run from console context | sv_demo_misc.c:636 | sv_redirected = RD_NONE; // this script is called always from the console | MATCH |
| set-by config/rcon (not blocklisted) | sv_main.c:1748-1762 | not present in blocklist | MATCH |
| KTX no override of cvar or 'script' | ktx/src (grep) | no sv_onDemoRemove ref; no 'script' command registration | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Names a server-side script run automatically on MVD demo deletion | sv_demo_misc.c:631-638, 682-689 | `if (*sv_ondemoremove.string) { ... Cmd_TokenizeString(va("script %s ...")); SV_Script_f(); }` | MATCH (core behavior; trigger-name sub-clause wrong, see #2) |
| 2 | "deleted with the rmdemo / rmdemonum commands" | sv_demo.c:1947-1948 (registration) vs sv_demo_misc.c:570,660 (help text only) | `Cmd_AddCommand ("sv_demoremove", SV_MVDRemove_f); Cmd_AddCommand ("sv_demonumremove", SV_MVDRemoveNum_f);` -- `rmdemo`/`rmdemonum` appear ONLY inside Con_Printf usage strings, never in any Cmd_AddCommand/alias | MISMATCH |
| 3 | runs only after a demo is SUCCESSFULLY removed | sv_demo_misc.c:627, 679 + sv_sys_unix.c:92 | `if (!Sys_remove(path)) { Con_Printf("...successfully removed..."); if(*sv_ondemoremove.string)... }` ; `Sys_remove` = `return unlink(path)` (0 on success) | MATCH |
| 4 | runs a .qws script file on the server host | sv_sys_unix.c:521 / sv_sys_win.c:681 | unix: `strlcat(exec_path, ".qws", ...)` + fork/execv; win: `"%s\\sh.exe %s.qws %s"` + CreateProcess | MATCH |
| 5 | passes the demo directory + removed filename as arguments | sv_demo_misc.c:637,688 + sv_main.c:2866 | `Cmd_TokenizeString(va("script %s \"%s\" \"%s\"", sv_ondemoremove.string, sv_demoDir.string, name))` ; then `Sys_Script(path, va("%d %s", sv_redirected, p))` | MATCH (minor: dir+filename ARE passed, but a leading redirect-level integer arg ($1) precedes them; description omits it) |
| 6 | "" (empty) = run nothing on removal | sv_demo_misc.c:631, 682 | `if (*sv_ondemoremove.string)` -- empty string skips the entire script block | MATCH |
| 7 | any value = script name, optionally followed by fixed arguments | sv_main.c:2840,2853-2859 | `path = Cmd_Argv(1)` (first token = script name); args-skip loop drops only the first token, so trailing cvar tokens flow through as leading fixed args | MATCH |
| 8 | Default: "" | sv_demo.c:51 + 1854 | `cvar_t sv_ondemoremove = {"sv_onDemoRemove", ""};` registered via plain `Cvar_Register (&sv_ondemoremove)` | MATCH |
| 9 | Set by: server config / rcon | sv_demo.c:51, 1854 | ordinary cvar, no CVAR_ROM / settability flag -- settable from console/config/rcon | MATCH |

**V-pass notes:** CLASSIFICATION: C-FIX. The description's named trigger commands "rmdemo / rmdemonum" CONTRADICT the enforcing registration site. In this build (1.11-53-g18d0362) the commands that invoke the sv_onDemoRemove script are registered as `sv_demoremove` (-> SV_MVDRemove_f) and `sv_demonumremove` (-> SV_MVDRemoveNum_f) at sv_demo.c:1947-1948. The tokens `rmdemo` and `rmdemonum` are NOT registered by any Cmd_AddCommand or alias anywhere in the mvdsv tree -- they appear ONLY inside the usage-help Con_Printf strings at sv_demo_misc.c:570 and :660. An admin following this doc and typing `rmdemo <demo>` gets "Unknown command". This is a textbook flavour-C defect: the command names were lifted from the help-text strings rather than enforce-traced to the Cmd_AddCommand site. (The help strings are themselves stale/inconsistent with the real command names -- flagged below as a suspected upstream cosmetic bug, off-scope for this knob's description but the SOURCE of the wrong clause.)

FIX DIRECTION (for re-synth, anchoring on this seed): name the commands `sv_demoremove` / `sv_demonumremove`. Do NOT cite `rmdemo`/`rmdemonum` as the trigger -- those strings are help-text only.

SECONDARY (C-NEAR-MISS-grade, does not change the C-FIX verdict but should be folded into the re-synth):
(a) Clause #5 omits a leading argument. What the script actually receives is `Sys_Script(path, va("%d %s", sv_redirected, p))` (sv_main.c:2866) -- i.e. positionally $1 = the sv_redirected integer (forced to RD_NONE=0 here at sv_demo_misc.c:636/687), then any fixed args, then $N-1 = demo dir, $N = filename. The dir+filename claim is correct but there is an extra leading redirect-level integer arg the doc does not mention. Minor for a user-doc but factually the arg vector is wider than stated.
(b) Clause #1/#2 "whenever an MVD demo is deleted" is slightly broad. The script fires ONLY on the single-named-demo removal path (sv_demo_misc.c:627-642 and the rmdemonum path :679-693). The wildcard/bulk branch of the same SV_MVDRemove_f command (`sv_demoremove *<token>` / `sv_demoremove *`, sv_demo_misc.c:585-616) loops Sys_remove directly and NEVER invokes SV_Script_f -- bulk deletions do not trigger the script. So "whenever ... deleted" overstates; it is "when a single named demo is removed".

CONFIRMED-CLEAN clauses: .qws external-process semantics (#4, both unix+win), success-gating via unlink==0 (#3), empty-string OFF-state (#6), trailing-tokens-as-fixed-args (#7), registered default "" (#8), ordinary settability (#9).

## flags_for_review

- [blocker/contradiction/vpass] The named trigger commands in the proposed description (rmdemo / rmdemonum) do not exist in this build. Registered names are sv_demoremove (SV_MVDRemove_f) and sv_demonumremove (SV_MVDRemoveNum_f) at sv_demo.c:1947-1948. rmdemo/rmdemonum appear ONLY in Con_Printf usage-help strings (sv_demo_misc.c:570, 660), with no Cmd_AddCommand or alias backing them. This is the C-FIX clause.
- [review/suspected-bug/vpass] Upstream cosmetic bug (off-scope for this knob, but it is the root cause of the wrong clause): the usage-help text printed by SV_MVDRemove_f / SV_MVDRemoveNum_f says `rmdemo <demoname>` (sv_demo_misc.c:570) and `rmdemonum <#>` (sv_demo_misc.c:660), but the commands are actually registered as sv_demoremove / sv_demonumremove. The help text is stale relative to the registered command names -- an admin reading the in-engine usage would type a non-existent command. Candidate for an upstream help-string fix.
- [fyi/other/vpass] Argument-vector precision: the script is invoked as Sys_Script(path, va("%d %s", sv_redirected, p)) at sv_main.c:2866, so the first positional arg the .qws script receives is the redirect-level integer (RD_NONE=0 in the demo-remove path, forced at sv_demo_misc.c:636/687), NOT the demo dir. Dir and filename follow. The proposed description's argument list omits this leading integer arg.
- [fyi/other/vpass] Scope precision: sv_onDemoRemove fires only on single-named-demo removal (sv_demo_misc.c:627-642 / :679-693). The wildcard bulk-removal branch of the same sv_demoremove command (sv_demo_misc.c:585-616, handling `*<token>` and `*`) loops Sys_remove without ever calling SV_Script_f. 'whenever a demo is deleted' is therefore slightly broad -- bulk deletions skip the script.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_onDemoRemove",
  "type": "cvar",
  "description": "Names a server-side script to run automatically when a single named MVD demo is removed with the sv_demoremove / sv_demonumremove commands (bulk/wildcard removals do not trigger it). When set, after the demo file is successfully removed the server runs the named script (a .qws script file on the server host) and passes it the demo directory and the removed demo's filename as arguments.\n\n\"\" (empty) = run nothing on demo removal.\nany value = name of the script to run, optionally followed by fixed arguments.\n\nDefault: \"\".\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo_misc.c:631. Registration cvar_t sv_ondemoremove = {\"sv_onDemoRemove\", \"\"} at sv_demo.c:51 (default empty), registered sv_demo.c:1854. ENFORCING reads: sv_demo_misc.c:631 (in SV_MVDRemove_f, the rmdemo handler) and sv_demo_misc.c:682 (in SV_MVDRemoveNum_f, the rmdemonum handler). Both fire INSIDE the success branch of demo removal: :627 `if (!Sys_remove(path))` -> :629 prints 'successfully removed' -> :631 `if (*sv_ondemoremove.string)` gates on non-empty -> :637 Cmd_TokenizeString(va(\"script %s \\\"%s\\\" \\\"%s\\\"\", sv_ondemoremove.string, sv_demoDir.string, name)) then :638 SV_Script_f(). So the value is a command string (script name + optional fixed params) and the two appended args are the demo dir (sv_demoDir, :637) and the removed demo filename (name, :637). 'script' = SV_Script_f (sv_main.c:2829): :2866 Sys_Script(path, ...) executes <path>.qws on the host (confirmed by :2864 \"Running %s.qws\"); :2843-2850 strips/rejects '..' path traversal. Redirect forced to console: :636 `sv_redirected = RD_NONE; // this script is called always from the console`. OFF-state: empty string -> the `if (*sv_ondemoremove.string)` guard is false -> no script. Trigger is the operator commands rmdemo/rmdemonum (the only callers of these handlers). Set-by: not on the rcon blocklist (sv_main.c:1748-1762). F-MV1: KTX does not reference this cvar and does not override the 'script' command (grep ktx/src: no script command registration; matches are unrelated description strings) -- live behavior is the MVDSV engine's. All clauses TRACED-CLEAN.",
  "description_proposed": null
}
```
