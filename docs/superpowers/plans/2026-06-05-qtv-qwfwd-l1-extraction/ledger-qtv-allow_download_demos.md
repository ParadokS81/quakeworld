# describe-fill-synthesis ledger -- qtv `allow_download_demos`

- **Project:** qtv
- **Knob:** `allow_download_demos` (cvar) -- per-category download toggle (demos); carries an extra extension gate.
- **Registered name string:** `allow_download_demos` -- registered `pkg/qtv/downstream_storage.go:207` (`qtv.qvs.Reg("allow_download_demos", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment; `resources/qtv.cfg:78` carries a commented `// allow_download_demos 1`, HINT only, NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:allow_download_demos: synthesized -- whether viewers may download recorded demos (requested via a demos/ path, served from the proxy's demo directory); requires the master allow_download to be on AND a valid demo extension (.mvd/.gz/.zip/.bz2) -- origin=synthesized ref=pkg/qtv/downstream_client_commands.go:440 anchor=1.16-dev self-class=TRACED-CLEAN
```

## Final description (user-facing, D20 shape)

> Controls whether connected viewers may download recorded demos from the proxy. A viewer requests a demo with a path beginning demos/, which the proxy serves from its configured demo directory. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, demos are refused regardless of this value. Even when enabled, only files with a recognized demo extension are served (.mvd, .gz, .zip, .bz2); any other extension is refused. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.
>
> 1 = demo downloads permitted (when downloads are enabled overall and the extension is recognized).
> 0 = demo downloads refused.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`allow_download_demos`) confirms the only READ is the `isDemo` branch of the download cascade in `dStream.downloadClientCmd`; other hits are the registration (`downstream_storage.go:207`) and the commented config hint (`resources/qtv.cfg:78`). All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/downstream_storage.go:207` | registers name `allow_download_demos` default `"1"`, plain `Reg` |
| Demo path detect + rewrite | `pkg/qtv/downstream_client_commands.go:407-410` | `if strings.HasPrefix(name, "demos/") { isDemo = true; gameDir = ""; name = us.qtv.demoDir() + "/" + strings.TrimPrefix(name, "demos/") }` -- a `demos/` request is flagged and re-pointed at the proxy's demo directory |
| demoDir callee | `pkg/qtv/qtv.go:240-246` | resolves the demo directory from the `demo_dir` cvar (falls back to `"demos"` if not a simple path) |
| Master gate (precedes) | `pkg/qtv/downstream_client_commands.go:421` | if master off, the demo arm is never reached (`allow` stays false from init `:405`) |
| Security pre-checks (precede) | `pkg/qtv/downstream_client_commands.go:423-430` | run before per-type arms; any match leaves `allow` false |
| Per-type read (this knob) + extension gate | `pkg/qtv/downstream_client_commands.go:439-440` | `} else if isDemo { allow = us.qtv.qvs.Get("allow_download_demos").Bool && demoNameHasValidExtension(name) }` |
| Extension callee | `pkg/qtv/qtv.go:282-299` | `demosAllowedExtentions = {".mvd", ".gz", ".zip", ".bz2"}`; `demoNameHasValidExtension` returns true only for those |
| Deny path | `pkg/qtv/downstream_client_commands.go:445-447,470-478` | `if !allow { goto denyDownload }` -> empty `svc_download` refusal |

## D5 rubric check (Step 3)

Cold-synth: register site `:207` has no trailing comment and no shipped-doc candidate -> nothing to affirm; the read use-site (incl. both callees) is fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (whether demos may be downloaded); (2) not a name restatement (spells the `demos/` request shape, the demo-directory serving, the master dependency, the extension whitelist, the always-refused exclusions); (3) value=meaning spelled (1/0 boolean) AND the enumerated allowed extensions listed; (4) mechanism only; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/downstream_client_commands.go` (gate), `pkg/qtv/qtv.go` (callees), and `pkg/qtv/downstream_storage.go` (registration) at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: gates download of recorded demos | `downstream_client_commands.go:439-440` | `} else if isDemo { allow = us.qtv.qvs.Get("allow_download_demos").Bool && demoNameHasValidExtension(name) }` | MATCH |
| Trigger: requested via a path beginning demos/ | `downstream_client_commands.go:407` | `if strings.HasPrefix(name, "demos/") { isDemo = true; ... }` -- `isDemo` is set only here | MATCH |
| Served from the proxy's configured demo directory | `downstream_client_commands.go:409-410` -> callee `qtv.go:240-246` | `gameDir = ""` then `name = us.qtv.demoDir() + "/" + strings.TrimPrefix(name, "demos/")`; `demoDir()` reads cvar `demo_dir`, defaults `"demos"` | MATCH |
| Dependency: only takes effect when master allow_download is on | `downstream_client_commands.go:421` + `:439` | the `isDemo` arm is an `else if` after `if !...allow_download` (`:421`); reached only when the master arm was false (master on) | MATCH |
| Off-master overrides: master off -> demos refused regardless | `downstream_client_commands.go:405,421,445` | `allow := false` (`:405`); master-off arm empty body (`:421-422`); `if !allow { goto denyDownload }` (`:445`) | MATCH |
| Extra gate: only recognized demo extensions served (.mvd/.gz/.zip/.bz2) | `downstream_client_commands.go:440` -> callee `qtv.go:282-299` | `&& demoNameHasValidExtension(name)`; `demosAllowedExtentions = {".mvd": true, ".gz": true, ".zip": true, ".bz2": true}` (`:283-288`); `return demosAllowedExtentions[ext]` (`:298`) | MATCH |
| Always-refused exclusions (shared) | `downstream_client_commands.go:423-429` (+ callee `qtv.go:291-294`) | sensitive-extension `:423`, leading-dot `:425`, absolute `:427`, not-in-subdir `:429` precede the demo arm | MATCH |
| Polarity: 1 = permitted, 0 = refused (boolean) | `downstream_client_commands.go:440` (`.Bool`) | `us.qtv.qvs.Get("allow_download_demos").Bool && ...` | MATCH |
| Default: 1 | `downstream_storage.go:207` (WI-2) | `qtv.qvs.Reg("allow_download_demos", "1")` | MATCH |
| Set by: server config (no flags; not a viewer/admin command) | `downstream_storage.go:207` + dispatch table `:27-43` | plain `Reg` (no flags); no `dStreamCommands` entry sets this cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description`: every file:line cite; the Go identifiers (`downloadClientCmd`, `isDemo`, `strings.HasPrefix`, `demoDir`, `demoNameHasValidExtension`, `demosAllowedExtentions`, `qvs.Get(...).Bool`, `goto denyDownload`, `svc_download`); the `else if` cascade mechanism and the `gameDir = ""` re-point. The user doc states the admin-observable WHAT: the `demos/` request shape (user-visible -- it is what a client sends), the demo-directory serving, the master dependency, the recognized-extension whitelist (action-relevant -- an admin must know files outside it are refused), the shared exclusions, value meanings, Default, Set-by. The `demo_dir` fallback detail is internal and stated only as "configured demo directory".

## Rationale

Cold-synth from fully-legible use-sites (handler + two callees). `allow_download_demos` gates the `isDemo` arm of the download cascade (`:439-440`). `isDemo` is set ONLY at `:407` when the requested name begins `demos/`; at that point the handler clears `gameDir` and rewrites the name to the proxy's demo directory (`demoDir()`, callee `qtv.go:240-246`, reads cvar `demo_dir`, default `"demos"`). Because the arm is an `else if` after the master arm (`:421`) and the four security arms (`:423-429`), it is reached ONLY when the master `allow_download` is on AND no security exclusion matched -- hierarchical AND, traced to the gate. Unique to this category, the arm carries a SECOND conjunct: `&& demoNameHasValidExtension(name)` (`:440`), whose callee (`qtv.go:282-299`) returns true only for `.mvd`/`.gz`/`.zip`/`.bz2`. So a demo download requires master-on AND this toggle on AND a recognized extension; any other extension is refused even with the toggle on. When all hold, `allow` is true; otherwise `goto denyDownload` (`:445`) refuses the file.

Default is the registered literal `"1"` (`:207`, WI-2); read via `.Bool` so boolean. Registered with plain `Reg` (no flags) and only READ in the handler; no command sets it -> `Set by: server config`.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/init/callee line; the `demos/`-trigger, the demo-directory re-point, and the extension whitelist are each traced to their enforcing site/callee, not name-inferred. The `resources/qtv.cfg:78` commented hint corroborates the default and is a HINT only (SR-1); no C2 conflict. `description_provenance` stays `null` (cold-synth; operator 2026-05-30). No SR-4/SR-5 breadcrumb: this is the QTV download gate, NOT the MVD-streaming/parse_delay concept; demo download != live stream.

## D6Record

```json
{
  "project": "qtv",
  "knob": "allow_download_demos",
  "type": "cvar",
  "description": "Controls whether connected viewers may download recorded demos from the proxy. A viewer requests a demo with a path beginning demos/, which the proxy serves from its configured demo directory. This setting only takes effect when the master allow_download setting is on; if downloads are disabled overall, demos are refused regardless of this value. Even when enabled, only files with a recognized demo extension are served (.mvd, .gz, .zip, .bz2); any other extension is refused. As with all downloads, configuration and key files, names starting with a dot, absolute paths, and files not inside a subdirectory are always refused.\n\n1 = demo downloads permitted (when downloads are enabled overall and the extension is recognized).\n0 = demo downloads refused.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/downstream_storage.go:207 (qtv.qvs.Reg(\"allow_download_demos\", \"1\"); plain Reg, no flags) -> synthesize from the read use-site + two callees. Tree-wide grep: only READ is the isDemo arm of dStream.downloadClientCmd. Clauses->cites: gates recorded demos -> `} else if isDemo { allow = us.qtv.qvs.Get(\"allow_download_demos\").Bool && demoNameHasValidExtension(name) }` (downstream_client_commands.go:439-440); trigger = path beginning demos/ -> isDemo set only at `if strings.HasPrefix(name, \"demos/\")` (:407); served from proxy demo directory -> gameDir cleared + name rewritten via demoDir() (:409-410), callee qtv.go:240-246 reads cvar demo_dir default 'demos'; only effective when master allow_download on -> else-if AFTER master arm (:421) + security arms (:423-429), reached only when master on -> hierarchical AND; master-off overrides -> allow:=false init (:405) + master-off empty body (:421-422) + `if !allow { goto denyDownload }` (:445); EXTRA extension gate (unique to demos) -> `&& demoNameHasValidExtension(name)` (:440), callee qtv.go:282-299 demosAllowedExtentions {.mvd,.gz,.zip,.bz2} (:283-288), return demosAllowedExtentions[ext] (:298) -> any other extension refused even with toggle on; shared always-refused -> sensitive .cfg/.key (:423 -> callee qtv.go:291-294), leading-dot (:425), absolute (:427), not-in-subdir (:429); polarity 1/0 -> .Bool read (:440); Default 1 (WI-2) -> registered literal (:207); Set-by server config -> plain Reg no flag + no dStreamCommands entry sets it. No clause name-inferred; each traced to enforcing site/callee. resources/qtv.cfg:78 commented hint corroborates default(1), HINT only (SR-1); no C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). No SR-4/SR-5 breadcrumb: QTV download gate, NOT the MVD-streaming/parse_delay concept (demo download != live stream).",
  "description_proposed": null
}
```
