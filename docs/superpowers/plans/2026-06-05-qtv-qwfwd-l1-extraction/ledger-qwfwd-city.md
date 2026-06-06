# describe-fill-synthesis ledger -- qwfwd `city`

- **Project:** qwfwd
- **Knob:** `city` (cvar)
- **C variable / registered name string:** both `city` (no case difference) -- declared `src/main.c:20` (`cvar_t *city;`) + `src/qwfwd.h:227` (`extern`), registered `src/main.c:132` (`city = Cvar_Get("city", "", CVAR_SERVERINFO);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `src/qwfwd.h:118` `QWFWD_VERSION_SHORT "1.40-dev"`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config carries a hint comment but is NOT ground truth / NOT a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- the serverinfo-mirror behavior is fully source-legible; every asserted clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qwfwd:city: synthesized -- cold-synth, no comment; pure CVAR_SERVERINFO mirror cvar (zero direct reads) advertising the proxy's city in its server info; empty default = not advertised; every clause enforce-traced -- origin=synthesized ref=src/cvar.c:189 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Sets the city this proxy reports in its server info, used by server browsers to show its location. The value is a free-form text label (for example `Stockholm`); it is informational only and does not affect routing or connections. While left empty, no city is published.
>
> Default: empty (not advertised).
> Set by: server config (or the `serverinfo` console command).

## Read use-sites (WI-1 wide read)

Grepped the WHOLE `src/` tree for `city` in every form (`grep -rnw`). The ONLY occurrences are the declaration, the `extern`, and the registration -- there is NO `city->string`/`->integer`/`->value` read anywhere. Its entire observable behavior flows through the generic `CVAR_SERVERINFO` machinery (traced below).

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/main.c:20` | the cvar pointer (locator only) |
| Extern | `src/qwfwd.h:227` | export of the pointer (locator only) |
| Registration | `src/main.c:132` | registers name + default `""` + flag `CVAR_SERVERINFO` (no other flag) |
| Serverinfo mirror on set | `src/cvar.c:184-192` (in `Cvar_Set2`) | when the value is changed, it is written into the serverinfo string `ps.info` (key `city`) |
| Empty-value removal | `src/info.c:162-164` (in `Info_SetValueForStarKeyEx`, called from `:189`) | an empty value removes the key from `ps.info` -> nothing advertised |
| Serverinfo publication | `src/svc.c:360-363` (in `SVC_Status`) | the full `ps.info` string is sent in the proxy's status reply to anyone querying it (server browser / qstat / qplug / qspy / connecting client) |

Traced for the "informational only / does not affect routing" clause: `city` is read NOWHERE except as part of the opaque `ps.info` blob in the status reply -- no branch, no routing decision, no connection logic references it (WI-1 grep). "Free-form text" is the actual behavior (no format check beyond generic info-string sanitation in `Info_SetValueForStarKeyEx`).

## D5 rubric check (Step 3)

Cold-synth: register site `src/main.c:132` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The serverinfo machinery is fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (a city label published in server info, shown by browsers); (2) not a name restatement (spells out that it is the reported city, informational, free-form); (3) the empty default's meaning is spelled out (not advertised); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: the value is published in the proxy's server info | `src/cvar.c:184-189` (`Cvar_Set2`, gated on `CVAR_SERVERINFO` set at `main.c:132`) | `if (var->flags & CVAR_SERVERINFO) { ... Info_SetValueForStarKey (ps.info, var->name, var->string, sizeof(ps.info)); ...}` | MATCH |
| Semantic: that info is what server browsers see (show location) | `src/svc.c:360-363` (`SVC_Status`) | `snprintf(tmp, sizeof(tmp), "%s\n", ps.info); SZ_Print(&buf, tmp);` (status reply; `ps.info` comment `qwfwd.h:215` = "mirrored in serverinfo") | MATCH |
| Semantic: informational only -- does not affect routing/connections | WI-1 grep: `city` absent from all logic except the serverinfo mirror; no enforcing branch reads it | (no read-site exists outside the `ps.info` mirror; negative clause verified by exhaustive `grep -rnw city src/`) | MATCH (negative clause) |
| Semantic: free-form text value | `src/info.c:128-147` (only generic sanitation: rejects backslash/quote, caps length) | `if (strstr(value,"\\")...) return;` / `if (strlen(value) >= MAX_INFO_KEY) return;` (no city-format check) | MATCH |
| OFF/empty-state: empty value -> not advertised (key absent) | `src/info.c:162-164` (called from `cvar.c:189`) | `Info_RemoveKey (s, key);` then `if (!value || !strlen(value)) return;` | MATCH |
| Default: empty | `src/main.c:132` (registration; WI-2) | `city = Cvar_Get("city", "", CVAR_SERVERINFO);` (literal `""`) | MATCH |
| Default-state: empty default + no startup mirror -> not in serverinfo until set | `src/cvar.c:98-141` (`Cvar_Get`->`Cvar_Create`, neither writes `ps.info`); mirror only in `Cvar_Set2` `:189` | `Cvar_Get`/`Cvar_Create` bodies contain no `Info_Set*` call | MATCH |
| Set by: server config / `serverinfo` command (no vote) | `src/main.c:142` (`exec qwfwd.cfg`); `src/main.c:80-85` (`serverinfo` command routes serverinfo-cvar keys through `Cvar_Set`) | `Cbuf_InsertText ("exec qwfwd.cfg\n");` ; `if (var && (var->flags & CVAR_SERVERINFO)) Cvar_Set (var->name, value);` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`Cvar_Set2`, `Cvar_Get`, `Cvar_Create`, `Info_SetValueForStarKey`, `Info_RemoveKey`, `SVC_Status`, `ps.info`), the `CVAR_SERVERINFO` flag name, and the serverinfo-string mechanism. The user doc says only the admin-observable effect (a city label in the proxy's server info). The `Stockholm` example is a concrete value illustration (admin-observable, not jargon). The `serverinfo` command name stays in backticks (admin-typed command). No `See also:` -- self-contained advertised metadata; browser-display detail is thin context, not action-changing (no breadcrumb warranted).

## Rationale

Cold-synth from the generic serverinfo machinery (no per-cvar read use-site exists). `city` is a `CVAR_SERVERINFO` cvar with NO direct read anywhere (WI-1 `grep -rnw city src/` returns only declaration + extern + registration). Its only effect: a non-empty value is mirrored by `Cvar_Set2` (`cvar.c:184-192`) into `ps.info`, which `SVC_Status` (`svc.c:362`) returns in the proxy's status reply; server browsers read that to display the proxy's location. It is informational only -- no routing or connection branch references it (negative clause verified by the exhaustive grep). The value is free-form text: the only validation is generic info-string sanitation in `Info_SetValueForStarKeyEx` (`info.c:128-147`). Empty default means not advertised: registration (`Cvar_Get`->`Cvar_Create`) does NOT mirror to `ps.info` (only `Cvar_Set2` does), and `info.c:162-164` removes the key on an empty value. `Set by` is server config (`exec qwfwd.cfg`, `main.c:142`) or the `serverinfo` console command (`main.c:80-85`); qwfwd has no vote system. The example config (`resources/example-configs/qwfwd.cfg:10,12`, commented `// Geographical info` / `// set city "Stockholm"`) corroborates the geo-label semantics but is an admissible HINT only, not ground truth and not a seed (SR-1). No SR-3 deployment-default divergence. No C2 conflict. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing line (or, for the negative "informational only" clause, to the verified absence of any read-site); no clause rests on the cvar name, an enum/string, or a config comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "city",
  "type": "cvar",
  "description": "Sets the city this proxy reports in its server info, used by server browsers to show its location. The value is a free-form text label (for example `Stockholm`); it is informational only and does not affect routing or connections. While left empty, no city is published.\n\nDefault: empty (not advertised).\nSet by: server config (or the `serverinfo` console command).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/main.c:132 (Cvar_Get(\"city\",\"\",CVAR_SERVERINFO)), no shipped-doc candidate -> nothing to affirm; serverinfo machinery fully source-legible so synthesize. city has ZERO direct reads (WI-1 grep -rnw over src/ returns only decl src/main.c:20, extern src/qwfwd.h:227, registration src/main.c:132); all behavior flows through the generic CVAR_SERVERINFO path. Clauses->cites: value published in server info -> src/cvar.c:184-189 (Cvar_Set2 mirrors to ps.info via Info_SetValueForStarKey when CVAR_SERVERINFO set); that info is what browsers see (show location) -> src/svc.c:360-363 (SVC_Status sends ps.info in status reply; ps.info comment qwfwd.h:215 'mirrored in serverinfo'); informational only / no routing -> verified by exhaustive grep, city absent from all logic except the serverinfo mirror (negative clause); free-form text -> src/info.c:128-147 only generic sanitation (reject backslash/quote, cap length), no city-format check; empty value -> key removed/not advertised -> src/info.c:162-164 (Info_RemoveKey then early-return on empty); empty default not mirrored at startup -> src/cvar.c:98-141 (Cvar_Get->Cvar_Create write no ps.info; mirror only in Cvar_Set2 :189); Default empty (WI-2 registered literal) -> src/main.c:132; Set-by server config (exec qwfwd.cfg src/main.c:142) or serverinfo command (src/main.c:80-85 routes serverinfo-cvar keys through Cvar_Set), no vote system in qwfwd. No clause rests on name/enum/string/comment. Example config resources/example-configs/qwfwd.cfg:10,12 (// Geographical info, // set city \"Stockholm\") corroborates geo-label semantics but is a HINT only (SR-1, not a seed). No SR-3 divergence. No C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30).",
  "description_proposed": null
}
```
