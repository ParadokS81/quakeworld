# describe-fill-synthesis ledger -- mvdsv `qtv_maxstreams`

- **Project:** mvdsv
- **Knob:** `qtv_maxstreams` (cvar)
- **C variable / registered name string:** both `qtv_maxstreams` (no case difference) -- `src/sv_demo_qtv.c:26`, declared `static cvar_t qtv_maxstreams = {"qtv_maxstreams", "1"};`
- **Anchor version:** `1.11-53-g18d0362` (verified: `git describe --tags` == `1.11-53-g18d0362`)
- **Mechanical candidate:** none (cold-synth -- no trailing comment, no shipped-config candidate)
- **Suspect-pool member:** FALSE (per brief, verified vs Phase-0 C3 pool; not runtime-dead)
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line
- **Confidence:** high

## Halt verdict

```
mvdsv:qtv_maxstreams: synthesized -- cold-synth, no comment; cap on concurrent QTV streams fully source-legible, every clause enforce-traced (count>=value refusal + value>0 OFF-gate + registered default 1); +3 qizmo grace band traced and routed to reasoning per D20 lean -- origin=synthesized ref=src/sv_demo_qtv.c:61 anchor=1.11-53-g18d0362
```

## Final description (user-facing, D20 shape)

> Limits how many QTV proxy/client streams can pull the server's MVD broadcast at the same time. When the limit is reached, further QTV stream connections are refused.
>
> 0 (or any value below 1) = no limit.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table

All sites in `src/sv_demo_qtv.c` at anchor `1.11-53-g18d0362`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Semantic: caps concurrent QTV **stream** connections (counts `DEST_STREAM` dests) | `src/sv_demo_qtv.c:52` and `src/sv_demo_qtv.c:191` | `if (dst->desttype == DEST_STREAM)` / `if (dest->desttype == DEST_STREAM)` (count loops at 50-58 and 189-195) | MATCH |
| Threshold/refusal: at `count >= value` a new stream is refused | `src/sv_demo_qtv.c:61` | `if ((int)qtv_maxstreams.value > 0 && count >= (int)qtv_maxstreams.value) return NULL; //sorry` | MATCH |
| Threshold (poll-side enforcement of the same cap) | `src/sv_demo_qtv.c:197` | `if (count >= (int)qtv_maxstreams.value)` | MATCH |
| Polarity: higher value permits a larger count before refusal | `src/sv_demo_qtv.c:61` / `:197` | `count >= (int)qtv_maxstreams.value` (raising value raises the count gate) | MATCH |
| OFF-state: `value > 0` gates the limit; value <= 0 => no cap enforced | `src/sv_demo_qtv.c:61` (first conjunct) and `src/sv_demo_qtv.c:186` | `qtv_maxstreams.value > 0 && ...` / `if ((int)qtv_maxstreams.value > 0)` (when false, neither refusal block runs) | MATCH |
| Default: 1 | `src/sv_demo_qtv.c:26` (registration; WI-2) | `static cvar_t qtv_maxstreams = {"qtv_maxstreams", "1"};` | MATCH |
| Set by: server config (registered via `Cvar_Register`, no `CVAR_SERVERINFO`/command/vote path) | `src/sv_demo_qtv.c:1513` (register) + `:26` (no flag arg) | `Cvar_Register (&qtv_maxstreams);` | MATCH |
| Side-effect (NOT in description; recorded here): `value`..`value+3` grace band reserves headroom for qizmo TCP control connections; QTV stream clients still dropped; hard-refuse beyond `value+3` | enforce path: `src/sv_demo_qtv.c:200` -> `:212` -> `:314` / `:354` | `if (count >= (int)qtv_maxstreams.value + 3) { ... send(... goawaymessage ...); }` (200-207); else `must_be_qizmo_tcp_connect = true;` (212); downstream `if (p->must_be_qizmo_tcp_connect) { p->error = true; continue; }` (314) and `if (p->must_be_qizmo_tcp_connect) continue;` (354) | MATCH (traced, deliberately omitted from user doc -- see rationale) |

## Rationale

Cold-synth: the registration site (`:26`) carries no trailing comment and there is no shipped-config candidate, so there is nothing to affirm -- D5 amendment requires evaluation anyway, and the use-sites are fully source-legible, so this synthesizes (not hedge/residue). The cvar gates two count-and-refuse blocks (`SV_InitStream` line 61; `SV_MVDStream_Poll` lines 186-214) that both count active `DEST_STREAM` destinations and compare to `qtv_maxstreams.value`; `count >= value` is the refusal threshold (so value N admits at most N streams), and both blocks are gated on `value > 0`, making any non-positive value an unlimited/OFF state. Registered default is the literal `"1"` at line 26 (WI-2: read from the cvar_t literal, not a cfg). No `CVAR_SERVERINFO` flag and no command/vote dispatch path -> `Set by: server config`.

The `value`..`value+3` qizmo grace band (lines 197-214, flag traced to lines 314/354) IS a real source-enforced side-effect, fully traced above. It is deliberately kept OUT of the user-facing `description` per the LEAN-D20 brief and the D20 anti-pattern rule: it concerns an internal qizmo-over-TCP port-multiplexing hack (engine jargon: `DEST_STREAM`, `must_be_qizmo_tcp_connect`, the `"qizmo\n"` handshake), it does NOT change how an admin sets the value, and stating it in admin terms would still require naming proxy-control-connection internals. Per D20 it is recorded in the enforce-trace (this ledger / `description_reasoning`), not asserted in the user doc -- I assert in `description` only the clauses I can state cleanly AND that are action-relevant; the band is traced-clean but routed to reasoning, not dropped. No clause in `description` rests on the cvar name, an enum/string, or a comment -- each maps to an enforcing comparison line. No C2 conflict (no competing candidate). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30 -- provenance holds retained shipped-doc DATA only).

## D6Record

```json
{
  "project": "mvdsv",
  "knob": "qtv_maxstreams",
  "type": "cvar",
  "description": "Limits how many QTV proxy/client streams can pull the server's MVD broadcast at the same time. When the limit is reached, further QTV stream connections are refused.\n\n0 (or any value below 1) = no limit.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/sv_demo_qtv.c:26 (literal {\"qtv_maxstreams\",\"1\"}), no shipped-config candidate -> nothing to affirm; use-sites fully source-legible so synthesize. Clauses->cites: cap-on-concurrent-QTV-streams (counts desttype==DEST_STREAM) -> src/sv_demo_qtv.c:52 + :191 (loops 50-58, 189-195); refusal-at-count>=value -> src/sv_demo_qtv.c:61 (return NULL) and :197; polarity higher=more-allowed -> same count>=value at :61/:197; OFF-state value<=0=no-limit gated by value>0 -> src/sv_demo_qtv.c:61 first conjunct + :186; Default 1 (WI-2, registered literal) -> src/sv_demo_qtv.c:26; Set-by server config (Cvar_Register, no CVAR_SERVERINFO/command/vote) -> src/sv_demo_qtv.c:1513 + :26. Side-effect value..value+3 qizmo-TCP grace band traced (:200 hard-refuse goaway, :212 sets must_be_qizmo_tcp_connect, downstream drop-unless-qizmo at :314 and :354) but OMITTED from description per LEAN-D20 + D20 anti-pattern: internal qizmo-port-multiplex hack, not action-changing, would require engine jargon -> recorded in reasoning, not dropped. No clause rests on name/enum/string/comment; each maps to an enforcing comparison. No C2 conflict. Grading: synthesized, high confidence, every clause TRACED-CLEAN. provenance=null (cold-synth, operator 2026-05-30: provenance is retained shipped-doc DATA only).",
  "description_proposed": null
}
```
