# describe-fill-synthesis ledger -- qtv `demo_dir`

- **Project:** qtv
- **Knob:** `demo_dir` (cvar)
- **Registered name string:** `demo_dir` -- registered `pkg/qtv/qtv.go:213` (`qtv.qvs.Reg("demo_dir", "demos")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (NULL description; no trailing comment at the register site; the seed `qtv.cfg` carries a hint comment but is NOT ground truth / NOT a seed-of-record).
- **Suspect-pool member:** FALSE (frozen snapshot; no C3 runtime-dead pool in this arc).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:demo_dir: synthesized -- the directory the proxy reads demos from, serves them out of, and writes uploads into; must be a single plain name (letters/digits/underscore) or it silently reverts to "demos"; default "demos" -- origin=synthesized ref=pkg/qtv/qtv.go:240 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The folder where this proxy keeps demo files. The proxy lists the demos in this folder, serves them for playback and download, and saves uploaded demos here. It must be a single plain folder name using only letters, digits, and underscores (no slashes, dots, or path separators); any other value is ignored and the proxy uses the "demos" folder instead.
>
> Default: demos.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`demo_dir` / `demoDir`) confirms use-sites in `pkg/qtv/qtv.go`, `pkg/qtv/downstream_client_commands.go`, `pkg/qtv/upstream_io_file.go`, and `pkg/qtv/http.go`. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/qtv.go:213` | registers name `demo_dir`, default `"demos"`, no flags |
| Read accessor + sanitize | `pkg/qtv/qtv.go:240-246` | `demoDir()` returns the cvar value ONLY if `qfs.IsSimplePath` passes; otherwise returns `"demos"` |
| Sanitizer | `pkg/qfs/qfs.go:84-96` | `IsSimplePath` returns false for empty or for any character that is not a letter/digit/underscore |
| Demo listing | `pkg/qtv/qtv.go:301-345` | `updateDemoList()` opens `demoDir()` and scans it for valid-extension demos (the list shown to clients / on the web page) |
| Upload cleanup | `pkg/qtv/qtv.go:375` | removes oldest upload files from `demoDir()` when over the upload size limit |
| Demo playback path | `pkg/qtv/downstream_client_commands.go:410` | a client demo request is resolved under `demoDir()` |
| File-source open | `pkg/qtv/upstream_io_file.go:56` | opening a demo as a stream source reads from `demoDir()` |
| HTTP upload target | `pkg/qtv/http.go:397` | uploaded demos are written into `demoDir()` |
| HTTP file serving | `pkg/qtv/http.go:544` | the web file server serves demos out of `demoDir()` |

## D5 rubric check (Step 3)

Cold-synth: register site `pkg/qtv/qtv.go:213` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm; D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (the folder demos live in and the four operations against it); (2) not a name restatement (the name is `demo_dir`; the prose spells the list/serve/upload roles AND the single-plain-name constraint with its silent fallback); (3) the format constraint is spelled (single name, letters/digits/underscore only, else reverts); (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Role: the proxy lists demos from this folder | `pkg/qtv/qtv.go:301-303` | `func (qtv *QTV) updateDemoList() error { demoDir := qtv.demoDir(); f, err := os.Open(demoDir); ...` (then scans + builds the demo list) | MATCH |
| Role: serves demos for playback/download | `pkg/qtv/downstream_client_commands.go:410` (playback) + `pkg/qtv/http.go:544` (HTTP serve) + `pkg/qtv/upstream_io_file.go:56` (file source) | `name = us.qtv.demoDir() + "/" + strings.TrimPrefix(name, "demos/")`; `demosFileSys := fileHidingFileSystem{http.Dir(sv.qtv.demoDir())}`; `qfs.Open(ust.qtv.demoDir(), addr)` | MATCH |
| Role: saves uploaded demos here | `pkg/qtv/http.go:397` | `tempFile, err := ioutil.TempFile(sv.qtv.demoDir(), "upload-*-"+fileName+".mvd")` | MATCH |
| Constraint: must be a single plain name (letters/digits/underscore), else reverts to "demos" | `pkg/qtv/qtv.go:240-245` + `pkg/qfs/qfs.go:84-96` | `dd := qtv.qvs.Get("demo_dir"); if !qfs.IsSimplePath(dd.Str) { return "demos" } return dd.Str`; `IsSimplePath`: returns false if empty, else `for _, r := range s { if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' { continue }; return false }` | MATCH |
| Default: demos | `pkg/qtv/qtv.go:213` | `qtv.qvs.Reg("demo_dir", "demos")` (2nd arg `"demos"`) | MATCH |
| Set-by: server config | `pkg/qtv/qtv.go:213` | registered with no init-only/read-only flag; no command/vote writes the cvar | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`demoDir()`, `qfs.IsSimplePath`, `os.Open`, `ioutil.TempFile`, `http.Dir`, `updateDemoList`, `unicode.IsLetter`), and the `IsSimplePath` rune-loop mechanism (stated in plain English as "only letters, digits, and underscores"). The user doc states only the admin-observable WHAT (the demo folder and its four roles), the single-plain-name constraint + silent fallback, Default, and Set-by.

## Rationale

Cold-synth from fully-legible use-sites. `demo_dir` is the directory the proxy uses for all demo storage. The accessor `demoDir()` (`qtv.go:240-246`) is the load-bearing site: it returns the cvar value ONLY if `qfs.IsSimplePath` passes, otherwise it silently returns `"demos"`. `IsSimplePath` (`qfs.go:84-96`) rejects an empty string and any string containing a character that is not a letter, digit, or underscore -- so any path with a slash, dot, colon, or separator is rejected and the proxy falls back to `"demos"`. This single-segment-only constraint with silent fallback is the most operationally surprising behavior and is stated explicitly. The resolved directory is then: scanned for the demo list (`updateDemoList()` `qtv.go:301-345`), the target for upload cleanup (`qtv.go:375`), the resolve root for client demo playback (`downstream_client_commands.go:410`), the file-source root (`upstream_io_file.go:56`), the HTTP upload write target (`http.go:397`), and the HTTP file-serving root (`http.go:544`) -- summarized as list / serve (playback + download) / save uploads.

Default is `"demos"` (`:213`, WI-2 from the registered literal). No flags, no command/vote writes the cvar, so `Set by: server config`. The seed `qtv.cfg:85-87` comment ("demo_dir provides possibility to specify directory where demos located") is an admissible HINT only (SR-1, not a seed-of-record); note it does NOT mention the single-plain-name constraint, which the CODE enforces -- so the description follows the code (the constraint is stated), not the looser seed comment. No C2 conflict per se (the seed is silent on the constraint, not contradicting it), but the divergence in completeness is noted: source is the authority.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing accessor/sanitizer/open/serve line; no clause rests on the cvar name alone.

## D6Record

```json
{
  "project": "qtv",
  "knob": "demo_dir",
  "type": "cvar",
  "description": "The folder where this proxy keeps demo files. The proxy lists the demos in this folder, serves them for playback and download, and saves uploaded demos here. It must be a single plain folder name using only letters, digits, and underscores (no slashes, dots, or path separators); any other value is ignored and the proxy uses the \"demos\" folder instead.\n\nDefault: demos.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/qtv.go:213 (qtv.qvs.Reg(\"demo_dir\", \"demos\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep confirms use-sites in qtv.go, downstream_client_commands.go, upstream_io_file.go, http.go. Clauses->cites: lists demos from this folder -> qtv.go:301-303 (updateDemoList opens demoDir() and scans it); serves for playback/download -> downstream_client_commands.go:410 (playback resolve under demoDir()) + http.go:544 (http.Dir(demoDir()) file server) + upstream_io_file.go:56 (qfs.Open(demoDir(), addr) file source); saves uploads here -> http.go:397 (ioutil.TempFile(demoDir(), 'upload-*-...mvd')); single-plain-name constraint + silent fallback -> qtv.go:240-245 (if !qfs.IsSimplePath(dd.Str) { return \"demos\" }) + qfs.go:84-96 (IsSimplePath: false if empty, else rejects any rune that is not letter/digit/underscore); Default demos -> qtv.go:213 (2nd arg); Set-by server config -> no flag, no command/vote writes it. The IsSimplePath rune-loop is stated in plain English ('only letters, digits, and underscores'). No clause rests on name alone; each maps to an enforcing accessor/sanitizer/open/serve line. Seed qtv.cfg:85-87 comment corroborates the 'directory where demos located' role but is a HINT only (SR-1, not a seed-of-record) and is SILENT on the single-plain-name constraint -- the description follows the CODE (constraint stated), not the looser seed. No C2 conflict (seed silent, not contradicting); source is the authority on the constraint. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
