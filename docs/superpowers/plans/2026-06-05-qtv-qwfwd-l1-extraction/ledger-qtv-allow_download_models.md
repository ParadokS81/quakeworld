# describe-fill-synthesis ledger -- qtv `allow_download_models`

- **Project:** qtv
- **Knob:** `allow_download_models` (cvar) -- per-category download toggle (models).
- **Registered name string:** `allow_download_models` -- registered `pkg/qtv/downstream_storage.go:204` (`qtv.qvs.Reg("allow_download_models", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment; `resources/qtv.cfg:80` carries a commented `// allow_download_models 1`, HINT only, NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:allow_download_models: synthesized -- whether viewers may download model files; the gate keys on the progs/ directory (Quake stores model files there), NOT a "models/" path; also requires the master allow_download to be on -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:434 anchor=1.16-dev self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Controls whether connected viewers may download model files from the proxy -- the player and weapon model files Quake stores in its progs folder. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, model files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.
>
> 1 = model downloads permitted (when downloads are enabled overall).
> 0 = model downloads refused.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`allow_download_models`) confirms the only READ is the `progs/` branch of the download cascade in `dStream.downloadClientCmd`; other hits are the registration (`downstream_storage.go:204`) and the commented config hint (`resources/qtv.cfg:80`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:204` | registers name `allow_download_models` default `"1"`, plain `Reg` |
| Master gate (precedes) | `pkg/qtv/downstream_client_commands.go:421` | if master off, the `progs/` arm is never reached (`allow` stays false from init `:405`) |
| Security pre-checks (precede) | `pkg/qtv/downstream_client_commands.go:423-430` | run before per-type arms; any match leaves `allow` false |
| Per-type read (this knob) | `pkg/qtv/downstream_client_commands.go:433-434` | `} else if strings.HasPrefix(name, "progs/") { allow = us.qtv.qvs.Get("allow_download_models").Bool }` -- NOTE the path is `progs/`, not `models/` |
| Deny path | `pkg/qtv/downstream_client_commands.go:445-447,470-478` | `if !allow { goto denyDownload }` -> empty `svc_download` refusal |

## D5 rubric check (Step 3)

Cold-synth: register site `:204` has no trailing comment and no shipped-doc candidate -> nothing to affirm; the single read use-site is fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (whether model files may be downloaded); (2) not a name restatement -- and load-bearing: it spells the actual `progs/` directory the code keys on, NOT the toggle's "models" word (the name-vs-code divergence is exactly what the enforce-trace catches); (3) value=meaning spelled (1/0 boolean); (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/downstream_client_commands.go` (gate) and `pkg/qtv/downstream_storage.go` (registration) at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates download of model files -- keyed on the progs/ directory | `downstream_client_commands.go:433-434` | `} else if strings.HasPrefix(name, "progs/") { allow = us.qtv.qvs.Get("allow_download_models").Bool }` -- the prefix is `progs/`, the cvar is `allow_download_models` | MATCH |
| Dependency: only takes effect when master allow_download is on | `downstream_client_commands.go:421` + `:433` | the `progs/` arm is an `else if` after `if !...allow_download` (`:421`); reached only when the master arm was false (master on) | MATCH |
| Off-master overrides: master off -> models refused regardless | `downstream_client_commands.go:405,421,445` | `allow := false` (`:405`); master-off arm empty body (`:421-422`); `if !allow { goto denyDownload }` (`:445`) | MATCH |
| Always-refused exclusions (shared) | `downstream_client_commands.go:423-429` (+ callee `qtv.go:291-294`) | sensitive-extension `:423`, leading-dot `:425`, absolute `:427`, not-in-subdir `:429` precede the `progs/` arm | MATCH |
| Polarity: 1 = permitted, 0 = refused (boolean) | `downstream_client_commands.go:434` (`.Bool`) | `allow = us.qtv.qvs.Get("allow_download_models").Bool` | MATCH |
| Default: 1 | `downstream_storage.go:204` (WI-2) | `qtv.qvs.Reg("allow_download_models", "1")` | MATCH |
| Set by: server config (no flags; not a viewer/admin command) | `downstream_storage.go:204` + dispatch table `:27-43` | plain `Reg` (no flags); no `dStreamCommands` entry sets this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description`: every file:line cite; the Go identifiers (`downloadClientCmd`, `strings.HasPrefix`, `qvs.Get(...).Bool`, `goto denyDownload`, `svc_download`); the `else if` cascade mechanism. The user doc states the admin-observable WHAT and names the `progs` folder in plain terms (the directory the admin's clients actually request from) -- that is user-observable, not code jargon, and is the load-bearing disambiguation of the "models" name.

## Rationale

Cold-synth from a fully-legible use-site. `allow_download_models` gates the model-file arm of the download cascade -- and the load-bearing finding is that the arm keys on `strings.HasPrefix(name, "progs/")` (`:433`), NOT a `models/` path. In Quake, model files (player/weapon/projectile models, `.mdl`) live in the `progs/` directory; the cvar is named for the asset CLASS (models) while the code keys on the directory NAME (`progs/`). The description states the real directory so an admin is not misled into thinking it gates a `models/` path. Because the arm is an `else if` after the master arm (`:421`) and the four security arms (`:423-429`), it is reached ONLY when the master `allow_download` is on AND no security exclusion matched -- hierarchical AND, traced to the gate. When reached, `allow` is set from this cvar's `.Bool`; if false, `goto denyDownload` (`:445`) refuses the file.

Default is the registered literal `"1"` (`:204`, WI-2); read via `.Bool` so boolean. Registered with plain `Reg` (no flags) and only READ in the handler; no command sets it -> `Set by: server config`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/init/callee line; the `progs/`-vs-"models" mapping is enforce-traced to `:433-434`, not inferred from the name. The `resources/qtv.cfg:80` commented hint corroborates the default and is a HINT only (SR-1); no C2 conflict. `description_provenance` stays `null` (cold-synth; operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).

## D6Record

```json
{
  "project": "qtv",
  "knob": "allow_download_models",
  "type": "cvar",
  "description": "Controls whether connected viewers may download model files from the proxy -- the player and weapon model files Quake stores in its progs folder. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, model files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.\n\n1 = model downloads permitted (when downloads are enabled overall).\n0 = model downloads refused.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:204 (qtv.qvs.Reg(\"allow_download_models\", \"1\"); plain Reg, no flags) -> synthesize from the sole read use-site. Tree-wide grep: only READ is the progs/ arm of dStream.downloadClientCmd. LOAD-BEARING name-vs-code divergence: the cvar is allow_download_models but the gate keys on `strings.HasPrefix(name, \"progs/\")` (downstream_client_commands.go:433) -- Quake stores model files in progs/; the description states the real progs directory, not a 'models/' path, so the admin is not misled (this is exactly the flavour-C name-inference the B1 trace defeats). Clauses->cites: gates model files keyed on progs/ -> `} else if strings.HasPrefix(name, \"progs/\") { allow = us.qtv.qvs.Get(\"allow_download_models\").Bool }` (:433-434); only effective when master allow_download on -> else-if AFTER master arm (:421) + security arms (:423-429), reached only when master on -> hierarchical AND; master-off overrides -> allow:=false init (:405) + master-off empty body (:421-422) + `if !allow { goto denyDownload }` (:445); shared always-refused -> sensitive .cfg/.key (:423 -> callee qtv.go:291-294), leading-dot (:425), absolute (:427), not-in-subdir (:429); polarity 1/0 -> .Bool read (:434); Default 1 (WI-2) -> registered literal (:204); Set-by server config -> plain Reg no flag + no dStreamCommands entry sets it. resources/qtv.cfg:80 commented hint corroborates default(1), HINT only (SR-1); no C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN (incl. the progs/-vs-models mapping traced to :433, not name-inferred). provenance=null (cold-synth, operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).",
  "description_proposed": null
}
```
