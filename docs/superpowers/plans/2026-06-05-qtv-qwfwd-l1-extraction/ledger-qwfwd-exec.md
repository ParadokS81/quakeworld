# Ledger -- qwfwd `exec` (command)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction / Phase 3 describe-fill
**Handler:** `Cmd_Exec_f` (src/cmd.c:305-342), registered src/cmd.c:1071
**Verdict:** synthesized | TRACED-CLEAN
**Anchor:** 1.40-dev

## Enforce-trace

| Clause | Enforcing line | Snippet | Result |
|---|---|---|---|
| Takes exactly one argument (a filename); else prints usage and aborts | src/cmd.c:310-314 | `if (Cmd_Argc () != 2) { Sys_Printf("exec <filename> : execute a script file\n"); return; }` | MATCH |
| Absolute paths are rejected | src/cmd.c:317-320 | `if (!FS_SafePath(name)) { ... "absolute paths are prohibited" ... return; }` | MATCH |
| "Absolute/unsafe" = leading `/` or `\`, any `..`, or a drive-letter `X:` prefix | src/fs.c:148 | `return ( (in[0]=='\\' \|\| in[0]=='/' \|\| strstr(in,"..") \|\| (in[0] && in[1]==':')) ? false : true )` | MATCH |
| Filename must end in `.cfg` (case-insensitive) | src/cmd.c:322-325 | `if(stricmp(".cfg", FS_FileExtension(name))) { ... "cfg extension required" ... return; }` | MATCH |
| Extension = substring from the last `.` | src/fs.c:140-142 | `const char *out = strrchr(in, '.'); return ( out ? out : "" )` | MATCH |
| Looked up in the `qwfwd` game directory first | src/cmd.c:329 + qwfwd.h:123 | `FS_ReadFile(QWFWD_DIR, name, ...)` ; `#define QWFWD_DIR "qwfwd"` | MATCH |
| Falls back to the `qw` directory if not found | src/cmd.c:333 | `FS_ReadFile("qw", name, ...)` | MATCH |
| If neither has it, prints "couldn't exec" and aborts | src/cmd.c:335-337 | `Sys_Printf("exec: couldn't exec %s\n", name); return;` | MATCH |
| On success the file's commands run ahead of the rest of the buffer | src/cmd.c:341 + src/cmd.c:200-201 | `Cbuf_InsertText (buf)` ; comment "commands (exec, alias) can insert data at the beginning of the text buffer" | MATCH |

Note: FS_OpenFile (src/fs.c:5-56) adds an `id1/` and a bare-path fallback INSIDE
the read, but `exec` passes explicit gamedirs `qwfwd` then `qw`; the admin-observable
behavior is "looks in qwfwd, then qw." The id1/bare internals are engine plumbing ->
kept out of `description`, recorded here only.

```json
{
  "project": "qwfwd",
  "knob": "exec",
  "type": "command",
  "description": "Runs a config file: reads the named .cfg file and executes the commands inside it as if they had been typed at the proxy console. The file is looked up in the qwfwd directory first, then in the qw directory; if it is found in neither, nothing is run. The filename must end in .cfg, and absolute paths or paths containing \"..\" are rejected. The file's commands run ahead of any commands still queued.\n\nexec <filename.cfg> = read and run <filename.cfg>.\n\nSet by: proxy server console / qwfwd.cfg (configs commonly exec other configs).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cmd_Exec_f (src/cmd.c:305-342). Arg count: src/cmd.c:310 `Cmd_Argc() != 2` -> requires exactly one filename arg, else prints `exec <filename> : execute a script file` and returns. Path safety: src/cmd.c:317 `!FS_SafePath(name)` -> rejects; FS_SafePath (src/fs.c:148) returns false when in[0] is '\\' or '/', or strstr(in,\"..\") matches, or in[1]==':' (drive prefix) -- i.e. absolute paths and parent-dir traversal. Extension gate: src/cmd.c:322 `stricmp(\".cfg\", FS_FileExtension(name))` -> requires a .cfg extension, case-insensitive (stricmp); FS_FileExtension (src/fs.c:140) returns the substring from the last '.'. Lookup order: src/cmd.c:329 `FS_ReadFile(QWFWD_DIR, ...)` with QWFWD_DIR=\"qwfwd\" (qwfwd.h:123), then src/cmd.c:333 `FS_ReadFile(\"qw\", ...)`; failure path src/cmd.c:335 prints `exec: couldn't exec %s` and returns. Execution ordering: src/cmd.c:341 `Cbuf_InsertText(buf)` inserts at the FRONT of the command buffer (Cbuf_ExecuteEx comment src/cmd.c:200-201 confirms exec/alias insert at the beginning), so the file runs ahead of already-queued commands. FS_OpenFile (src/fs.c:5-56) has an internal id1/ + bare-path fallback, but exec supplies explicit gamedirs qwfwd then qw -- engine plumbing, kept out of the user doc. No Default line (no meaningful no-arg default; the no-arg form is a usage error). Set-by: QWFWD has no access tiers / no own rcon (ACCESS MODEL) -- issued from the proxy console or a qwfwd.cfg that chains other configs. TRACED-CLEAN.",
  "description_proposed": null
}
```
