# describe-fill-synthesis ledger -- qtv `allow_download`

- **Project:** qtv
- **Knob:** `allow_download` (cvar) -- MASTER toggle of the download permission family.
- **Registered name string:** `allow_download` -- registered `pkg/qtv/downstream_storage.go:202` (`qtv.qvs.Reg("allow_download", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg:77` carries a commented-out `// allow_download 1` line but it is a HINT only, NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:allow_download: synthesized -- master switch for all file downloads served to connected viewers; when off every download is refused regardless of the per-type toggles; when on, the per-category toggles (skins/models/sounds/maps/demos/other) decide each file -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:421 anchor=1.16-dev self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Master switch for serving file downloads to connected viewers. When off, the proxy refuses every file a viewer asks to download, no matter what the per-category download settings are set to. When on, each request is then checked against the matching per-category setting (allow_download_skins, allow_download_models, allow_download_sounds, allow_download_maps, allow_download_demos, allow_download_other), and the file is sent only if that category also allows it. Some files are always refused regardless of this setting: configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory.
>
> 1 = downloads permitted (subject to the per-category settings).
> 0 = all downloads refused.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`allow_download`) confirms the only READ of this cvar is in the download handler `dStream.downloadClientCmd`; the only other hits are the registration (`downstream_storage.go:202`) and the commented-out config hint (`resources/qtv.cfg:77`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:202` | registers name `allow_download` default `"1"`, no flags (`Reg` = plain register) |
| Master gate read | `pkg/qtv/downstream_client_commands.go:421` | first branch of the download cascade: `if !us.qtv.qvs.Get("allow_download").Bool` -> falls through with `allow` still false (init `:405`) -> nothing is sent |
| Cascade init | `pkg/qtv/downstream_client_commands.go:405` | `allow := false` -- the default-deny that the master-off branch leaves untouched |
| Security pre-checks | `pkg/qtv/downstream_client_commands.go:423-430` | between the master gate and the per-type branches: sensitive-extension (`:423`), leading-dot (`:425`), absolute-path (`:427`), not-in-subdirectory (`:429`) all leave `allow` false |
| Per-type branches | `pkg/qtv/downstream_client_commands.go:431-443` | reached ONLY when master is on AND security checks pass; each sets `allow` from the matching per-category cvar |
| Deny path | `pkg/qtv/downstream_client_commands.go:445-447,470-478` | `if !allow { goto denyDownload }` sends an empty `svc_download` (refusal) to the client |
| Command dispatch | `pkg/qtv/downstream_client_commands.go:31` | `"download": {f: (*dStream).downloadClientCmd}` -- this is a downstream-client (viewer) command, not an admin console command |

## D5 rubric check (Step 3)

Cold-synth: register site `downstream_storage.go:202` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The single read use-site is fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (the master switch that gates whether the proxy serves downloads at all); (2) not a name restatement (the name says "allow download"; the prose spells the master-plus-per-type relationship, the always-refused security exclusions, and the polarity); (3) the value=meaning is spelled (1 = permitted subject to per-category, 0 = all refused) -- this reads as a boolean cvar via `.Bool`; (4) mechanism only, no recommended value; (5) self-contained without reading source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/downstream_client_commands.go` (gate) and `pkg/qtv/downstream_storage.go` (registration) at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: master switch -- when off, every download is refused | `downstream_client_commands.go:421-422` + init `:405` + deny `:445-446` | `allow := false` (`:405`); `if !us.qtv.qvs.Get("allow_download").Bool { // Download is not allowed at all. }` (`:421-422`) -- empty body, `allow` stays false; `if !allow { goto denyDownload }` (`:445`) | MATCH |
| Semantic: when on, the per-category setting then decides each file | `downstream_client_commands.go:421,431-443` | the `if !...allow_download` is the FIRST arm of one `if/else if` chain; the per-type `else if` arms (`:431-442`) are reached only when this arm is false (master on) AND no security arm fired | MATCH |
| Scope: per-category toggles named (skins/models/sounds/maps/demos/other) | `downstream_client_commands.go:432,434,436,438,440,442` | `allow = us.qtv.qvs.Get("allow_download_skins").Bool` ... through `allow_download_other` -- the six toggles read in the chain | MATCH |
| Always-refused: configuration and key files | `downstream_client_commands.go:423` -> `qtv.go:291-294` + `:277-280` | `} else if fileNameHasSensitiveExtension(name) {` (`:423`); callee `sensitiveDataExtensions = {".cfg": true, ".key": true}` (`:277-280`), `return sensitiveDataExtensions[ext]` (`:293`) | MATCH |
| Always-refused: leading-dot names | `downstream_client_commands.go:425` | `} else if name[0] == '.' { // Do not allow names with leading dot. }` | MATCH |
| Always-refused: absolute paths | `downstream_client_commands.go:427` | `} else if name[0] == '/' { // Do not allow absolute names. }` | MATCH |
| Always-refused: files not in a subdirectory | `downstream_client_commands.go:429` | `} else if !strings.Contains(name, "/") { // Requested file should be in subdirectory. }` | MATCH |
| Polarity: 1 = permitted, 0 = refused (boolean) | `downstream_client_commands.go:421` (`.Bool` read, negated) | `if !us.qtv.qvs.Get("allow_download").Bool` -- read as Bool; truthy enters the (empty-skip) chain toward per-type, falsy leaves allow false | MATCH |
| Default: 1 | `downstream_storage.go:202` (WI-2) | `qtv.qvs.Reg("allow_download", "1")` -- registered literal `"1"` | MATCH |
| Set by: server config (no flags; not a viewer/admin command) | `downstream_storage.go:202` + dispatch table `downstream_client_commands.go:27-43` | `Reg(...)` (plain register, no SERVERINFO/init-only flag); no entry in `dStreamCommands` sets this cvar (the `download` command READS it, does not set it) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite; the Go identifiers (`downloadClientCmd`, `qvs.Get(...).Bool`, `fileNameHasSensitiveExtension`, `sensitiveDataExtensions`, `goto denyDownload`, `svc_download`, `dStreamCommands`); the `if/else if` cascade mechanism and the `allow := false` init; the `Reg` flag reasoning. The user doc states only the admin-observable WHAT: the master switch, the master-plus-per-type relationship, the always-refused security exclusions, the value meanings, Default, and Set-by.

## Rationale

Cold-synth from a fully-legible use-site. `allow_download` is the master toggle of the QTV downstream download-permission family. The handler `dStream.downloadClientCmd` (dispatched for the downstream-client `download <filename>` command, table at `:31`) runs one `if/else if` cascade with `allow` initialized to `false` (`:405`). The FIRST arm (`:421`) is `if !us.qtv.qvs.Get("allow_download").Bool` with an empty body -- so when the master is OFF, control skips every other arm and `allow` remains false, and the trailing `if !allow { goto denyDownload }` (`:445`) refuses the file. This makes `allow_download` a hard master gate: it MUST be on for ANY download. When it is ON, the next arms run: four security exclusions (sensitive `.cfg`/`.key` extension `:423`, leading dot `:425`, absolute path `:427`, not-in-subdirectory `:429`) that also leave `allow` false, then the per-category `else if` arms (`:431-442`) that set `allow` from the matching per-type cvar. The master-vs-per-type relationship is therefore hierarchical AND (master on AND category on AND security passed), traced to the gate, not inferred from names.

Default is the registered literal `"1"` (`downstream_storage.go:202`, WI-2). It is read via `.Bool`, so it is a boolean cvar (1 = on, 0 = off). The cvar is registered with the plain `Reg` (no SERVERINFO / init-only flag) and is only READ in the handler; no command in `dStreamCommands` sets it -> `Set by: server config`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/init/callee line; no clause rests on the cvar name, an enum, or a config comment. The `resources/qtv.cfg:77` commented `// allow_download 1` corroborates the default (1) and is an admissible HINT only (SR-1), not ground truth and not a seed; no C2 conflict (source default and the cfg hint agree on 1). `description_provenance` stays `null` (cold-synth; operator 2026-05-30). No SR-4/SR-5 breadcrumb: this is a QTV-internal download gate, not a cross-codebase handshake or master-server/streaming concept.

## D6Record

```json
{
  "project": "qtv",
  "knob": "allow_download",
  "type": "cvar",
  "description": "Master switch for serving file downloads to connected viewers. When off, the proxy refuses every file a viewer asks to download, no matter what the per-category download settings are set to. When on, each request is then checked against the matching per-category setting (allow_download_skins, allow_download_models, allow_download_sounds, allow_download_maps, allow_download_demos, allow_download_other), and the file is sent only if that category also allows it. Some files are always refused regardless of this setting: configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory.\n\n1 = downloads permitted (subject to the per-category settings).\n0 = all downloads refused.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:202 (qtv.qvs.Reg(\"allow_download\", \"1\"); plain Reg, no flags), no shipped-doc candidate -> nothing to affirm; sole read use-site fully source-legible so synthesize. Tree-wide grep: the only READ is in dStream.downloadClientCmd (pkg/qtv/downstream_client_commands.go), dispatched for the downstream-client 'download' command (table :31). Clauses->cites: MASTER switch, off=refuse-all -> allow:=false init (:405) + first cascade arm `if !us.qtv.qvs.Get(\"allow_download\").Bool` with empty body (:421-422, skips rest, allow stays false) + `if !allow { goto denyDownload }` (:445) sending empty svc_download refusal (:470-478); on=>per-category decides -> the master arm is the FIRST of one if/else-if chain, the six per-type else-if arms (:431-442) reached only when master on AND no security arm fired -> hierarchical AND, NOT independent; per-category toggles named -> reads of allow_download_skins/models/sounds/maps/demos/other (:432,434,436,438,440,442); always-refused .cfg/.key -> else-if fileNameHasSensitiveExtension(name) (:423) -> callee qtv.go:291-294 over sensitiveDataExtensions {.cfg,.key} (:277-280); leading-dot -> name[0]=='.' (:425); absolute -> name[0]=='/' (:427); not-in-subdir -> !strings.Contains(name,\"/\") (:429); polarity 1=on/0=off -> read via .Bool negated (:421); Default 1 (WI-2) -> registered literal \"1\" (:202); Set-by server config -> plain Reg no SERVERINFO/init-only flag + no dStreamCommands entry sets it (the download cmd only READS it). No clause rests on name/enum/string/comment; each maps to an enforcing branch/compare/init/callee. resources/qtv.cfg:77 commented `// allow_download 1` corroborates default(1), HINT only (SR-1, not a seed); no C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate, not a cross-codebase handshake / master-server / streaming concept).",
  "description_proposed": null
}
```
