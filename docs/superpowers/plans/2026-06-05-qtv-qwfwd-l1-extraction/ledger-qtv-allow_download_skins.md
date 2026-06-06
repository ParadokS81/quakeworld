# describe-fill-synthesis ledger -- qtv `allow_download_skins`

- **Project:** qtv
- **Knob:** `allow_download_skins` (cvar) -- per-category download toggle (skins).
- **Registered name string:** `allow_download_skins` -- registered `pkg/qtv/downstream_storage.go:203` (`qtv.qvs.Reg("allow_download_skins", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg:82` carries a commented-out `// allow_download_skins 1` line, HINT only, NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:allow_download_skins: synthesized -- whether viewers may download player skin files (paths under skins/); also requires the master allow_download to be on -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:432 anchor=1.16-dev self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Controls whether connected viewers may download player skin files from the proxy -- the files whose path is under the skins folder. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, skin files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.
>
> 1 = skin downloads permitted (when downloads are enabled overall).
> 0 = skin downloads refused.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`allow_download_skins`) confirms the only READ is the `skins/` branch of the download cascade in `dStream.downloadClientCmd`; other hits are the registration (`downstream_storage.go:203`) and the commented-out config hint (`resources/qtv.cfg:82`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:203` | registers name `allow_download_skins` default `"1"`, plain `Reg` (no flags) |
| Master gate (precedes) | `pkg/qtv/downstream_client_commands.go:421` | `if !...allow_download` -- if master off, this branch fires first and the `skins/` arm is never reached (`allow` stays false from init `:405`) |
| Security pre-checks (precede) | `pkg/qtv/downstream_client_commands.go:423-430` | sensitive-extension / leading-dot / absolute / not-in-subdir arms run before the per-type arms; any match leaves `allow` false |
| Per-type read (this knob) | `pkg/qtv/downstream_client_commands.go:431-432` | `} else if strings.HasPrefix(name, "skins/") { allow = us.qtv.qvs.Get("allow_download_skins").Bool }` |
| Deny path | `pkg/qtv/downstream_client_commands.go:445-447,470-478` | `if !allow { goto denyDownload }` -> empty `svc_download` refusal |

## D5 rubric check (Step 3)

Cold-synth: register site `:203` has no trailing comment and no shipped-doc candidate -> nothing to affirm; the single read use-site is fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (whether skin files may be downloaded); (2) not a name restatement (spells the path category, the master dependency, and the always-refused exclusions); (3) value=meaning spelled (1/0 boolean via `.Bool`); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/downstream_client_commands.go` (gate) and `pkg/qtv/downstream_storage.go` (registration) at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates download of skin files (paths under skins/) | `downstream_client_commands.go:431-432` | `} else if strings.HasPrefix(name, "skins/") { allow = us.qtv.qvs.Get("allow_download_skins").Bool }` | MATCH |
| Dependency: only takes effect when master allow_download is on | `downstream_client_commands.go:421` + `:431` | the `skins/` arm is an `else if` after `if !...allow_download` (`:421`); the chain reaches it only when the master arm was false (master on) | MATCH |
| Off-master overrides: master off -> skins refused regardless | `downstream_client_commands.go:405,421,445` | `allow := false` (`:405`); master-off arm has empty body (`:421-422`), so `allow` never reaches the `skins/` assignment; `if !allow { goto denyDownload }` (`:445`) | MATCH |
| Always-refused exclusions (shared) | `downstream_client_commands.go:423-429` (+ callee `qtv.go:291-294`) | sensitive-extension `:423`, leading-dot `:425`, absolute `:427`, not-in-subdir `:429` -- all precede the `skins/` arm and leave `allow` false | MATCH |
| Polarity: 1 = permitted, 0 = refused (boolean) | `downstream_client_commands.go:432` (`.Bool`) | `allow = us.qtv.qvs.Get("allow_download_skins").Bool` | MATCH |
| Default: 1 | `downstream_storage.go:203` (WI-2) | `qtv.qvs.Reg("allow_download_skins", "1")` | MATCH |
| Set by: server config (no flags; not a viewer/admin command) | `downstream_storage.go:203` + dispatch table `:27-43` | plain `Reg` (no SERVERINFO/init-only flag); no `dStreamCommands` entry sets this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description`: every file:line cite; the Go identifiers (`downloadClientCmd`, `strings.HasPrefix`, `qvs.Get(...).Bool`, `goto denyDownload`, `svc_download`); the `else if` cascade mechanism. The user doc states only the admin-observable WHAT: the skin-file category, the master dependency, the always-refused exclusions, value meanings, Default, Set-by.

## Rationale

Cold-synth from a fully-legible use-site. `allow_download_skins` gates the `skins/`-prefixed arm of the download cascade in `dStream.downloadClientCmd` (`:431-432`). Because the arm is an `else if` placed after the master arm (`if !...allow_download`, `:421`) and the four security arms (`:423-429`), it is reached ONLY when the master `allow_download` is on AND none of the security exclusions matched -- so this toggle is subordinate to the master (hierarchical AND), traced to the gate, not inferred from the name. When reached, `allow` is set from this cvar's `.Bool`; if false, the trailing `if !allow { goto denyDownload }` (`:445`) refuses the file with an empty `svc_download`.

The path category is files whose name (lowercased, backslash-normalized at `:418-419`) begins with `skins/` -- the QuakeWorld player-skin directory. Default is the registered literal `"1"` (`:203`, WI-2); read via `.Bool` so it is boolean. Registered with plain `Reg` (no flags) and only READ in the handler; no command sets it -> `Set by: server config`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/init/callee line; no clause rests on the cvar name, an enum, or a config comment. The `resources/qtv.cfg:82` commented `// allow_download_skins 1` corroborates the default and is a HINT only (SR-1); no C2 conflict. `description_provenance` stays `null` (cold-synth; operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).

## D6Record

```json
{
  "project": "qtv",
  "knob": "allow_download_skins",
  "type": "cvar",
  "description": "Controls whether connected viewers may download player skin files from the proxy -- the files whose path is under the skins folder. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, skin files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.\n\n1 = skin downloads permitted (when downloads are enabled overall).\n0 = skin downloads refused.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:203 (qtv.qvs.Reg(\"allow_download_skins\", \"1\"); plain Reg, no flags), no shipped-doc candidate -> synthesize from the sole read use-site. Tree-wide grep: only READ is the skins/ arm of dStream.downloadClientCmd. Clauses->cites: gates skin files (paths under skins/) -> `} else if strings.HasPrefix(name, \"skins/\") { allow = us.qtv.qvs.Get(\"allow_download_skins\").Bool }` (downstream_client_commands.go:431-432); only effective when master allow_download on -> this is an else-if AFTER the master arm `if !...allow_download` (:421) and the four security arms (:423-429), reached only when master arm false (master on) -> hierarchical AND not independent; master-off overrides -> allow:=false init (:405), master-off arm empty body (:421-422) so allow never reaches the skins assignment, `if !allow { goto denyDownload }` (:445); shared always-refused exclusions -> sensitive .cfg/.key (:423 -> callee qtv.go:291-294), leading-dot (:425), absolute (:427), not-in-subdir (:429); polarity 1/0 -> .Bool read (:432); Default 1 (WI-2) -> registered literal (:203); Set-by server config -> plain Reg no flag + no dStreamCommands entry sets it. No clause rests on name/enum/comment. resources/qtv.cfg:82 commented hint corroborates default(1), HINT only (SR-1); no C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).",
  "description_proposed": null
}
```
