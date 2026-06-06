# describe-fill-synthesis ledger -- qtv `maxchains`

- **Project:** qtv
- **Knob:** `maxchains` (cvar)
- **Registered name string:** `maxchains`; registered `pkg/qtv/upstream_storage.go:87` (`qtv.qvs.Reg("maxchains", "1")`).
- **Anchor version:** `1.16-dev` (per mother ledger; `pkg/qtv/qtv.go:29` `qtvRelease`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; `resources/qtv.cfg` is a HINT only, not ground truth / not a seed, SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qtv, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qtv:maxchains: synthesized -- cold-synth, no comment; caps how many '@'-chained hops an upstream address may contain (QTV-to-QTV relay chaining); an address with more hops than this is rejected; effective value bounded 0-5 -- origin=synthesized ref=pkg/qtv/upstream_storage.go:170 anchor=1.16-dev
```

## Final description (user-facing, D20 shape)

> The maximum length of a chained upstream address QTV will accept. QTV can connect through other QTV proxies by chaining addresses with the `@` separator (for example `host3@host2@host1`, which connects via host1, then host2, then host3). This setting limits how many `@`-linked hops such an address may contain; an address with more hops than allowed is rejected. The effective limit is capped at 5 even if a higher value is set.
>
> Default: 1.
> Set by: server config.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`maxchains`, `maxChains`, `MaxChains`) across `pkg/`. All sites at anchor `1.16-dev`. The chaining semantics are corroborated by the `qtv` command usage text (`upstream_storage.go:406-408`).

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `pkg/qtv/upstream_storage.go:87` | registers name `maxchains` default `"1"`, flags `0` |
| Read + clamp accessor | `pkg/qtv/upstream_storage.go:154-156` | `func (uss *uStreamStorage) maxChains() int { return iBound(0, uss.qtv.qvs.Get("maxchains").Int, 5) }` -- read as int, clamped 0..5 |
| Enforcement (chain-length gate) | `pkg/qtv/upstream_storage.go:170-171` | `if strings.Count(server, "@") > uss.maxChains() { return nil, false, errors.New("invalid server address, maxchains reached") }` -- reject over-long chains |
| Chaining semantics (corroboration) | `pkg/qtv/upstream_storage.go:406-408` | `qtv` usage text: `Chaining usage is similar: %s <[streamId@]host3:port3@host2:port2@host1:port1>` ... "This will connect to host1, then host2 and finally host3" |

## D5 rubric check (Step 3)

Cold-synth: register site has no trailing comment, no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (the cap on chained `@`-hops in an upstream address and the rejection behavior); (2) not a name restatement ("chains" is explained as `@`-linked relay hops, with the address syntax shown); (3) numeric scalar, the unit (count of `@` hops) and the 5 hard cap are spelled; (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: limits the number of `@`-linked hops in an upstream address | `pkg/qtv/upstream_storage.go:170-171` | `if strings.Count(server, "@") > uss.maxChains() { ... }` -- counts `@` in the address string and compares to the limit | MATCH |
| Behavior: an address with more hops than allowed is rejected | `pkg/qtv/upstream_storage.go:171` | `return nil, false, errors.New("invalid server address, maxchains reached")` | MATCH |
| Semantic: `@` chains relay through other proxies, connecting host1 then host2 ... | `pkg/qtv/upstream_storage.go:406-408` (usage text, corroboration) | `%s <[streamId@]host3:port3@host2:port2@host1:port1>` / `This will connect to host1, then host2 and finally host3` | MATCH |
| Cap: effective limit capped at 5 | `pkg/qtv/upstream_storage.go:155` | `return iBound(0, uss.qtv.qvs.Get("maxchains").Int, 5)` (`iBound` clamps to max, `math.go:24-35`) | MATCH |
| Default: 1 | `pkg/qtv/upstream_storage.go:87` (WI-2: registered literal) | `qtv.qvs.Reg("maxchains", "1")` | MATCH |
| Set by: server config (flags `0`, no SERVERINFO/readonly, no command sets it) | `pkg/qtv/upstream_storage.go:87` | `qtv.qvs.Reg("maxchains", "1")` (no flags); no `Set`/command writes this cvar anywhere in `pkg/` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the Go identifiers (`uStreamStorage`, `maxChains`, `iBound`, `strings.Count`, `open`), the `strings.Count(server, "@") > ...` comparison mechanism, and the `iBound(0, x, 5)` clamp identifiers. The user doc states only the admin-observable WHAT (cap on `@`-chained hops, the address syntax, rejection on overflow, the 5 ceiling), Default, and Set-by. The `@`-chain address example is kept (it is admin-observable syntax, not code jargon).

## Rationale

Cold-synth from fully-legible use-sites. `maxchains` caps how many `@`-separated hops an upstream address may contain. QTV supports chaining one proxy through another by joining addresses with `@`; the cvar is read through the `maxChains()` accessor (`upstream_storage.go:154-156`), clamped to 0..5 via `iBound`. The single enforcement site is in `open()` (`:170-171`): it counts the `@` characters in the requested server address (`strings.Count(server, "@")`) and rejects the address with "invalid server address, maxchains reached" if that count exceeds `maxChains()`. The chaining semantics (each `@` segment is one relay hop, connected innermost-first) are spelled out verbatim in the `qtv` command usage text (`:406-408`), which corroborates the meaning.

WI-2: registered default is the literal `"1"` at `upstream_storage.go:87` (so by default only a direct, non-chained address is accepted -- zero `@` <= 1). Flags arg is `0` (no `qVarFlagServerInfo`, no read-only) and no `Set`/command writes this cvar anywhere in `pkg/` -> Set by server config. The `resources/qtv.cfg` seed is an admissible HINT only (SR-1), not ground truth.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing read/compare/clamp line (the chaining-semantics clause is backed by the in-engine usage text, an admin-observable string, not an inferred meaning); no clause rests on the cvar name alone, an enum, or a config comment.

No SR-5 breadcrumb: `maxchains` is a proxy-chaining address-length cap, unrelated to the master-server, MVD-streaming/ghosting, or auth-matrix concept-note candidates. No `See also:` (the limit is enforced entirely within QTV; the chained hops are other QTV proxies but that does not change how an admin sets this cvar).

## D6Record

```json
{
  "project": "qtv",
  "knob": "maxchains",
  "type": "cvar",
  "description": "The maximum length of a chained upstream address QTV will accept. QTV can connect through other QTV proxies by chaining addresses with the `@` separator (for example `host3@host2@host1`, which connects via host1, then host2, then host3). This setting limits how many `@`-linked hops such an address may contain; an address with more hops than allowed is rejected. The effective limit is capped at 5 even if a higher value is set.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration pkg/qtv/upstream_storage.go:87 (Reg(\"maxchains\", \"1\")), no shipped-doc candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Tree-wide grep: maxchains read only via maxChains() accessor at pkg/qtv/upstream_storage.go:154-156. Clauses->cites: limits number of @-linked hops + rejects over-long address -> enforcement gate upstream_storage.go:170-171 (if strings.Count(server, \"@\") > uss.maxChains() { return ... 'invalid server address, maxchains reached' }); @ chains relay through proxies connecting host1 then host2... -> qtv usage text upstream_storage.go:406-408 (host3@host2@host1 'connect to host1, then host2 and finally host3'), an admin-observable in-engine string; effective limit capped 5 -> upstream_storage.go:155 (iBound(0, Get(\"maxchains\").Int, 5); iBound clamps to max, math.go:24-35); Default 1 (WI-2, registered literal; so default accepts only a direct/non-chained address, 0 '@' <= 1) -> upstream_storage.go:87; Set-by server config (flags 0, no SERVERINFO/readonly; no Set/command writes it in pkg/) -> upstream_storage.go:87. No clause rests on name/enum/config-comment (chaining semantics backed by the in-engine usage text). resources/qtv.cfg is a HINT only (SR-1). Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30). D20: all file:line + identifiers (uStreamStorage, maxChains, iBound, strings.Count, the count>limit comparison, the 0..5 clamp) kept out of description, in reasoning; the @-chain address example is admin-observable syntax, kept in description. No SR-5 breadcrumb (proxy-chaining address-length cap, not master/streaming/auth). No See-also (enforced entirely within QTV).",
  "description_proposed": null
}
```
