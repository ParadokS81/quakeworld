# describe-fill-synthesis ledger -- qtv `allow_download_maps`

- **Project:** qtv
- **Knob:** `allow_download_maps` (cvar) -- per-category download toggle (maps).
- **Registered name string:** `allow_download_maps` -- registered `pkg/qtv/downstream_storage.go:206` (`qtv.qvs.Reg("allow_download_maps", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment; `resources/qtv.cfg:79` carries a commented `// allow_download_maps 1`, HINT only, NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:allow_download_maps: synthesized -- whether viewers may download map files (paths under the maps/ directory); also requires the master allow_download to be on -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:438 anchor=1.16-dev self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Controls whether connected viewers may download map files from the proxy -- the files Quake stores in its maps folder. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, map files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.
>
> 1 = map downloads permitted (when downloads are enabled overall).
> 0 = map downloads refused.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`allow_download_maps`) confirms the only READ is the `maps/` branch of the download cascade in `dStream.downloadClientCmd`; other hits are the registration (`downstream_storage.go:206`) and the commented config hint (`resources/qtv.cfg:79`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:206` | registers name `allow_download_maps` default `"1"`, plain `Reg` |
| Master gate (precedes) | `pkg/qtv/downstream_client_commands.go:421` | if master off, the `maps/` arm is never reached (`allow` stays false from init `:405`) |
| Security pre-checks (precede) | `pkg/qtv/downstream_client_commands.go:423-430` | run before per-type arms; any match leaves `allow` false |
| Per-type read (this knob) | `pkg/qtv/downstream_client_commands.go:437-438` | `} else if strings.HasPrefix(name, "maps/") { allow = us.qtv.qvs.Get("allow_download_maps").Bool }` |
| Deny path | `pkg/qtv/downstream_client_commands.go:445-447,470-478` | `if !allow { goto denyDownload }` -> empty `svc_download` refusal |

## D5 rubric check (Step 3)

Cold-synth: register site `:206` has no trailing comment and no shipped-doc candidate -> nothing to affirm; the single read use-site is fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (whether map files may be downloaded); (2) not a name restatement (spells the `maps/` directory category, the master dependency, the always-refused exclusions); (3) value=meaning spelled (1/0 boolean); (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/downstream_client_commands.go` (gate) and `pkg/qtv/downstream_storage.go` (registration) at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates download of map files (paths under maps/) | `downstream_client_commands.go:437-438` | `} else if strings.HasPrefix(name, "maps/") { allow = us.qtv.qvs.Get("allow_download_maps").Bool }` | MATCH |
| Dependency: only takes effect when master allow_download is on | `downstream_client_commands.go:421` + `:437` | the `maps/` arm is an `else if` after `if !...allow_download` (`:421`); reached only when the master arm was false (master on) | MATCH |
| Off-master overrides: master off -> maps refused regardless | `downstream_client_commands.go:405,421,445` | `allow := false` (`:405`); master-off arm empty body (`:421-422`); `if !allow { goto denyDownload }` (`:445`) | MATCH |
| Always-refused exclusions (shared) | `downstream_client_commands.go:423-429` (+ callee `qtv.go:291-294`) | sensitive-extension `:423`, leading-dot `:425`, absolute `:427`, not-in-subdir `:429` precede the `maps/` arm | MATCH |
| Polarity: 1 = permitted, 0 = refused (boolean) | `downstream_client_commands.go:438` (`.Bool`) | `allow = us.qtv.qvs.Get("allow_download_maps").Bool` | MATCH |
| Default: 1 | `downstream_storage.go:206` (WI-2) | `qtv.qvs.Reg("allow_download_maps", "1")` | MATCH |
| Set by: server config (no flags; not a viewer/admin command) | `downstream_storage.go:206` + dispatch table `:27-43` | plain `Reg` (no flags); no `dStreamCommands` entry sets this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description`: every file:line cite; the Go identifiers (`downloadClientCmd`, `strings.HasPrefix`, `qvs.Get(...).Bool`, `goto denyDownload`, `svc_download`); the `else if` cascade mechanism. The user doc names the `maps` folder in plain admin-observable terms, states the master dependency and shared exclusions, value meanings, Default, Set-by.

## Rationale

Cold-synth from a fully-legible use-site. `allow_download_maps` gates the `maps/`-prefixed arm of the download cascade (`:437-438`) -- the toggle name and the path prefix match (`maps/` is Quake's map directory). Because the arm is an `else if` after the master arm (`:421`) and the four security arms (`:423-429`), it is reached ONLY when the master `allow_download` is on AND no security exclusion matched -- hierarchical AND, traced to the gate. When reached, `allow` is set from this cvar's `.Bool`; if false, `goto denyDownload` (`:445`) refuses the file.

Default is the registered literal `"1"` (`:206`, WI-2); read via `.Bool` so boolean. Registered with plain `Reg` (no flags) and only READ in the handler; no command sets it -> `Set by: server config`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/init/callee line; the `maps/` mapping is enforce-traced to `:437-438`. The `resources/qtv.cfg:79` commented hint corroborates the default and is a HINT only (SR-1); no C2 conflict. `description_provenance` stays `null` (cold-synth; operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).

## D6Record

```json
{
  "project": "qtv",
  "knob": "allow_download_maps",
  "type": "cvar",
  "description": "Controls whether connected viewers may download map files from the proxy -- the files Quake stores in its maps folder. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, map files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.\n\n1 = map downloads permitted (when downloads are enabled overall).\n0 = map downloads refused.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:206 (qtv.qvs.Reg(\"allow_download_maps\", \"1\"); plain Reg, no flags) -> synthesize from the sole read use-site. Tree-wide grep: only READ is the maps/ arm of dStream.downloadClientCmd. Clauses->cites: gates map files (paths under maps/) -> `} else if strings.HasPrefix(name, \"maps/\") { allow = us.qtv.qvs.Get(\"allow_download_maps\").Bool }` (downstream_client_commands.go:437-438); only effective when master allow_download on -> else-if AFTER master arm (:421) + security arms (:423-429), reached only when master on -> hierarchical AND; master-off overrides -> allow:=false init (:405) + master-off empty body (:421-422) + `if !allow { goto denyDownload }` (:445); shared always-refused -> sensitive .cfg/.key (:423 -> callee qtv.go:291-294), leading-dot (:425), absolute (:427), not-in-subdir (:429); polarity 1/0 -> .Bool read (:438); Default 1 (WI-2) -> registered literal (:206); Set-by server config -> plain Reg no flag + no dStreamCommands entry sets it. Toggle name and path prefix match (maps/). resources/qtv.cfg:79 commented hint corroborates default(1), HINT only (SR-1); no C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).",
  "description_proposed": null
}
```
