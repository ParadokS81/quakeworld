# describe-fill-synthesis ledger -- qtv `allow_download_other`

- **Project:** qtv
- **Knob:** `allow_download_other` (cvar) -- per-category download toggle; the FALLTHROUGH category (the final `else`).
- **Registered name string:** `allow_download_other` -- registered `pkg/qtv/downstream_storage.go:208` (`qtv.qvs.Reg("allow_download_other", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment; `resources/qtv.cfg:81` carries a commented `// allow_download_other 1`, HINT only, NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:allow_download_other: synthesized -- the catch-all toggle for any downloadable file that is not a skin/model/sound/map/demo (the final else in the cascade); also requires the master allow_download to be on -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:442 anchor=1.16-dev self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Controls whether connected viewers may download files that do not fall into any of the specific download categories -- anything in a subdirectory that is not a skin, model, sound, map, or demo. This is the catch-all setting: a request that passes the basic safety checks but does not match one of the dedicated categories is governed by this toggle. It only takes effect when the master allow_download setting is on; if downloads are disabled overall, these files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.
>
> 1 = downloads of uncategorized files permitted (when downloads are enabled overall).
> 0 = downloads of uncategorized files refused.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`allow_download_other`) confirms the only READ is the final `else` branch of the download cascade in `dStream.downloadClientCmd`; other hits are the registration (`downstream_storage.go:208`) and the commented config hint (`resources/qtv.cfg:81`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:208` | registers name `allow_download_other` default `"1"`, plain `Reg` |
| Master gate (precedes) | `pkg/qtv/downstream_client_commands.go:421` | if master off, the final `else` is never reached (`allow` stays false from init `:405`) |
| Security pre-checks (precede) | `pkg/qtv/downstream_client_commands.go:423-430` | sensitive-extension / leading-dot / absolute / not-in-subdir arms run before any per-type arm; any match leaves `allow` false |
| Specific-category arms (precede) | `pkg/qtv/downstream_client_commands.go:431-440` | `skins/`, `progs/`, `sound/`, `maps/`, `isDemo` arms -- a request matching ANY of these never reaches the `else` |
| Per-type read (this knob) -- final else | `pkg/qtv/downstream_client_commands.go:441-442` | `} else { allow = us.qtv.qvs.Get("allow_download_other").Bool }` -- the catch-all |
| Deny path | `pkg/qtv/downstream_client_commands.go:445-447,470-478` | `if !allow { goto denyDownload }` -> empty `svc_download` refusal |

## D5 rubric check (Step 3)

Cold-synth: register site `:208` has no trailing comment and no shipped-doc candidate -> nothing to affirm; the single read use-site (the final `else`) is fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (whether uncategorized files may be downloaded); (2) not a name restatement -- it spells out what "other" actually CATCHES (the fallthrough after the five specific categories + the safety checks), which is the load-bearing content; (3) value=meaning spelled (1/0 boolean); (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/downstream_client_commands.go` (gate) and `pkg/qtv/downstream_storage.go` (registration) at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: catch-all toggle -- the final else | `downstream_client_commands.go:441-442` | `} else { allow = us.qtv.qvs.Get("allow_download_other").Bool }` -- terminal arm of the `if/else if` chain | MATCH |
| Scope: catches anything NOT skin/model/sound/map/demo | `downstream_client_commands.go:431-440` (the preceding arms) | the `else` is reached only when none of `HasPrefix "skins/"` (`:431`), `"progs/"` (`:433`), `"sound/"` (`:435`), `"maps/"` (`:437`), `isDemo` (`:439`) matched | MATCH |
| Scope: only files in a subdirectory (uncategorized still need a `/`) | `downstream_client_commands.go:429` | the not-in-subdir arm `} else if !strings.Contains(name, "/") {` (`:429`) precedes the `else`, so a name with no `/` is caught earlier and never reaches `other` | MATCH |
| Dependency: only takes effect when master allow_download is on | `downstream_client_commands.go:421` + `:441` | the final `else` is part of the chain begun by `if !...allow_download` (`:421`); reached only when the master arm was false (master on) | MATCH |
| Off-master overrides: master off -> these files refused regardless | `downstream_client_commands.go:405,421,445` | `allow := false` (`:405`); master-off arm empty body (`:421-422`); `if !allow { goto denyDownload }` (`:445`) | MATCH |
| Always-refused exclusions (shared) | `downstream_client_commands.go:423-429` (+ callee `qtv.go:291-294`) | sensitive-extension `:423`, leading-dot `:425`, absolute `:427`, not-in-subdir `:429` precede the `else` | MATCH |
| Polarity: 1 = permitted, 0 = refused (boolean) | `downstream_client_commands.go:442` (`.Bool`) | `allow = us.qtv.qvs.Get("allow_download_other").Bool` | MATCH |
| Default: 1 | `downstream_storage.go:208` (WI-2) | `qtv.qvs.Reg("allow_download_other", "1")` | MATCH |
| Set by: server config (no flags; not a viewer/admin command) | `downstream_storage.go:208` + dispatch table `:27-43` | plain `Reg` (no flags); no `dStreamCommands` entry sets this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description`: every file:line cite; the Go identifiers (`downloadClientCmd`, `strings.HasPrefix`, `strings.Contains`, `isDemo`, `qvs.Get(...).Bool`, `goto denyDownload`, `svc_download`); the `if/else if/else` cascade mechanism. The user doc states the admin-observable WHAT: the catch-all nature, what it catches by negation (not skin/model/sound/map/demo), the subdirectory requirement, the master dependency, the shared exclusions, value meanings, Default, Set-by.

## Rationale

Cold-synth from a fully-legible use-site. `allow_download_other` is the FINAL `else` of the download cascade (`:441-442`) -- the fallthrough. To determine what it catches, the whole `if/else if` chain must be read: the `else` is reached only when (a) the master `allow_download` is on (`:421` did not fire), AND (b) none of the four security exclusions matched (`:423-429`), AND (c) the request did not match any specific category prefix -- `skins/` (`:431`), `progs/` (`:433`), `sound/` (`:435`), `maps/` (`:437`) -- and is not a demo (`isDemo`, `:439`). So `other` governs any file that is in a subdirectory (the not-in-subdir arm `:429` already excluded names without a `/`), passes the safety checks, and belongs to no dedicated category. Examples in a Quake gamedir would be textures, environment maps, or any other auxiliary asset directory; the description states the catch-all behavior by negation rather than guessing a fixed example list. Because it is part of the master-gated chain, it is subordinate to the master (hierarchical AND), traced to the gate. When the `else` is reached, `allow` is set from this cvar's `.Bool`; if false, `goto denyDownload` (`:445`) refuses the file.

Default is the registered literal `"1"` (`:208`, WI-2); read via `.Bool` so boolean. Registered with plain `Reg` (no flags) and only READ in the handler; no command sets it -> `Set by: server config`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/init line; what `other` catches is derived from the ENFORCED structure of the preceding arms (`:421-440`), not inferred from the word "other". The `resources/qtv.cfg:81` commented hint corroborates the default and is a HINT only (SR-1); no C2 conflict. `description_provenance` stays `null` (cold-synth; operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).

## D6Record

```json
{
  "project": "qtv",
  "knob": "allow_download_other",
  "type": "cvar",
  "description": "Controls whether connected viewers may download files that do not fall into any of the specific download categories -- anything in a subdirectory that is not a skin, model, sound, map, or demo. This is the catch-all setting: a request that passes the basic safety checks but does not match one of the dedicated categories is governed by this toggle. It only takes effect when the master allow_download setting is on; if downloads are disabled overall, these files are refused regardless of this value. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.\n\n1 = downloads of uncategorized files permitted (when downloads are enabled overall).\n0 = downloads of uncategorized files refused.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:208 (qtv.qvs.Reg(\"allow_download_other\", \"1\"); plain Reg, no flags) -> synthesize from the sole read use-site. Tree-wide grep: only READ is the final else of dStream.downloadClientCmd. WHAT 'other' catches is derived from the ENFORCED cascade structure (not name-inferred): the `} else { allow = us.qtv.qvs.Get(\"allow_download_other\").Bool }` (downstream_client_commands.go:441-442) is reached only when master allow_download on (:421 not fired), no security exclusion matched (:423-429), and no specific-category arm matched -- HasPrefix 'skins/' (:431), 'progs/' (:433), 'sound/' (:435), 'maps/' (:437), isDemo (:439). Clauses->cites: catch-all final else -> :441-442; catches anything not skin/model/sound/map/demo -> preceding arms :431-440; subdirectory required -> not-in-subdir arm `!strings.Contains(name,\"/\")` (:429) precedes else; only effective when master on -> part of the chain begun at master arm (:421) -> hierarchical AND; master-off overrides -> allow:=false init (:405) + master-off empty body (:421-422) + `if !allow { goto denyDownload }` (:445); shared always-refused -> sensitive .cfg/.key (:423 -> callee qtv.go:291-294), leading-dot (:425), absolute (:427), not-in-subdir (:429); polarity 1/0 -> .Bool read (:442); Default 1 (WI-2) -> registered literal (:208); Set-by server config -> plain Reg no flag + no dStreamCommands entry sets it. Description states the catch-all by negation (no fixed example list guessed). resources/qtv.cfg:81 commented hint corroborates default(1), HINT only (SR-1); no C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). No SR-4/SR-5 breadcrumb (QTV-internal download gate).",
  "description_proposed": null
}
```
