# describe-fill-synthesis ledger -- mvdsv `sv_airaccelerate`

- **project:** mvdsv
- **knob:** `sv_airaccelerate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `physics-movement` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_airaccelerate: hedged -- published to client+demo but server pmove uses sv_accelerate for air control, not this; client-prediction consequence cross-engine (L3) -- origin=synthesized ref=src/sv_user.c:454 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sent to connecting clients and recorded in MVD demos as part of the server's movement settings. On this server, the value is published but does not change how players actually accelerate while airborne -- the server's own movement code uses the sv_accelerate value for air control as well as ground control. A client that runs its own movement prediction would read this value for air acceleration.
>
> Default: 10.
> Set by: server config.
> See also: independent-physics.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 10 | src/sv_phys.c:51 | `cvar_t sv_airaccelerate = { "sv_airaccelerate", "10"};` | MATCH |
| registered with engine | src/sv_main.c:3516 | `Cvar_Register (&sv_airaccelerate);` | MATCH |
| value -> movevars bridge | src/sv_phys.c:1129 | `movevars.airaccelerate = sv_airaccelerate.value;` | MATCH |
| sent to client in serverdata | src/sv_user.c:454 | `MSG_WriteFloat(&sv_client->netchan.message, movevars.airaccelerate);` | MATCH |
| written into MVD demo | src/sv_demo.c:1297 | `MSG_WriteFloat(&buf, movevars.airaccelerate);` | MATCH |
| server air-move uses sv_accelerate NOT this (the trap) | src/pmove.c:534 | `PM_AirAccelerate(wishdir, wishspeed, movevars.accelerate);` | MATCH (movevars.airaccelerate absent from move code) |
| no other pmove TU | src/pmove.c (only) | grep `airaccelerate` reads = sv_user.c:454, sv_demo.c:1297 only | MATCH |
| KTX does not set it | ktx/src (grep empty) | (no occurrences) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Sent to connecting clients ... as part of the server's movement settings" | src/sv_user.c:448,454 (inside Cmd_New_f, starts :203) | `// send the movevars` ... `MSG_WriteFloat(&sv_client->netchan.message, movevars.airaccelerate);` | MATCH |
| 2 | "recorded in MVD demos as part of the server's movement settings" | src/sv_demo.c:1291,1297 | `// send the movevars` ... `MSG_WriteFloat(&buf, movevars.airaccelerate);` | MATCH |
| 3 | "the value is published but does not change how players actually accelerate while airborne" | src/pmove.c:534 (only PM_AirAccelerate call site) + src/sv_phys.c:1129 (only .value read) | `PM_AirAccelerate(wishdir, wishspeed, movevars.accelerate);` — passes movevars.accelerate, not movevars.airaccelerate; movevars.airaccelerate has zero physics consumers | MATCH |
| 4 | "the server's own movement code uses the sv_accelerate value for air control as well as ground control" | src/pmove.c:534 (air, in PM_AirMove `else`/`// not on ground`) vs :515/:521 (ground, PM_Accelerate) | air: `PM_AirAccelerate(wishdir, wishspeed, movevars.accelerate)`; ground: `PM_Accelerate(wishdir, wishspeed, movevars.accelerate)` — both use movevars.accelerate | MATCH |
| 5 | "A client that runs its own movement prediction would read this value for air acceleration" | src/sv_user.c:454 (transmit site exists; client consumer out-of-repo) | `MSG_WriteFloat(&sv_client->netchan.message, movevars.airaccelerate);` | MATCH (hedged "would"; client prediction code is not in MVDSV — server-only repo) |
| 6 | "Default: 10" | src/sv_phys.c:51; registered bare at src/sv_main.c:3516 | `cvar_t sv_airaccelerate = { "sv_airaccelerate", "10"};` + `Cvar_Register (&sv_airaccelerate);` (no flag/override) | MATCH |
| 7 | "Set by: server config" | src/sv_phys.c:51 (no CVAR_SERVERINFO/restriction); src/sv_main.c:3516 | `{ "sv_airaccelerate", "10"}` — bare cvar, no access flag (contrast sv_antilag :53 CVAR_SERVERINFO) | MATCH (settable via server console/config; not serverinfo — description does not overclaim serverinfo) |
| 8 | "See also: independent-physics" | n/a (cross-ref pointer) | air/ground accel split is the independent-physics domain | MATCH (reasonable pointer) |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. enforce-trace-discipline.md applied per-clause.

The load-bearing claim (clauses 3+4 — the cvar is published but inert in the server's own physics) is verified to the strongest possible degree. Full trace:
- sv_airaccelerate.value is read in EXACTLY ONE place: sv_phys.c:1129 -> movevars.airaccelerate. No OnChange handler, no other .value/.string read anywhere in src/.
- movevars.airaccelerate has EXACTLY THREE use-sites, none of them a physics consumer: written sv_phys.c:1129, transmitted to clients sv_user.c:454, written to MVD demo header sv_demo.c:1297.
- The airborne physics call chain is sv_user.c:3802 -> PM_PlayerMove (pmove.c:886) -> PM_AirMove (pmove.c:485) -> PM_AirAccelerate(wishdir, wishspeed, movevars.accelerate) at pmove.c:534. The accel parameter is consumed at pmove.c:413 (accelspeed = accel * wishspeed * pm_frametime). The argument passed is movevars.accelerate (= sv_accelerate), NOT movevars.airaccelerate. The else-branch carries the comment `// not on ground` confirming it is the air path. Ground path (pmove.c:515/521) also uses movevars.accelerate. So the server reuses sv_accelerate for both ground and air, and sv_airaccelerate never reaches physics. The description states this exactly, including the non-obvious detail.

Metadata (WI-2): Default 10 verified against the registered default at sv_phys.c:51 with a bare Cvar_Register (no flag, no cmdline/cfg override in registration) — not a shipped-cfg value. No CVAR_SERVERINFO flag (contrast sv_antilag at sv_phys.c:51-55), and the description correctly does NOT claim serverinfo — it frames transmission as the movevars/spawn-message block, which is accurate.

Clause 5 is the only one whose ultimate consumer is out of this repo's scope (MVDSV is server-only; no client prediction code exists here). It is correctly hedged with "would read" and matches the QW-protocol rationale for transmitting the movevars block, so it is not a flavour-C defect — it asserts no MVDSV server behavior. Flagged FYI only.

No contradictions, no missing enforcing read-site for any server-behavior clause, no inversion. This is a model description: it correctly captures a cvar that is dead in the server's own physics but live on the wire/demo, including the surprising sv_accelerate reuse.

## flags_for_review

- [review/contradiction/synthesis] sv_airaccelerate is registered (default 10) and copied into the movevars struct (src/sv_phys.c:1129), but the MVDSV server-side player-move code never reads movevars.airaccelerate -- PM_AirAccelerate (src/pmove.c:534) is passed movevars.accelerate (the sv_accelerate value) for air control. The only consumers of movevars.airaccelerate are the two serverdata broadcasts to client (src/sv_user.c:454) and MVD demo (src/sv_demo.c:1297). Net: setting sv_airaccelerate on the server changes what the client/demo is told but does NOT change server-authoritative air movement; air accel on the server is governed by sv_accelerate. This is a server/client physics-authority split (independent vs server-side physics) and could read as a latent engine quirk -- worth a human look to confirm intended (matches QW's historical client-prediction model) vs bug.
- [fyi/off-scope-entity/vpass] Clause 5 ('a client that runs its own movement prediction would read this value for air acceleration') describes client-side consumption. The enforcing read-site is NOT in MVDSV (server-only repo; no client prediction code). The transmit site (sv_user.c:454) exists and is verified, and the clause is correctly hedged ('would read'), so it is not a flavour-C defect. The actual air-accel consumer for a real client engine (ezquake/qwcl) would live in that engine's pmove, which is outside the mvdsv oracle. No action needed; noted for scope transparency.
- [fyi/runtime-dead-suspect/vpass] sv_airaccelerate is effectively a no-op for MVDSV's own server physics: its only .value read flows into movevars.airaccelerate, which has zero physics consumers (PM_AirAccelerate is called with movevars.accelerate at pmove.c:534). It functions purely as a published value (network spawn message sv_user.c:454 + MVD demo header sv_demo.c:1297). This is the intended/documented behavior and the description captures it correctly — flagging only because 'cvar read once, never consumed by physics' is the kind of dead-ish signal worth surfacing per the V-pass brief, not because the description is wrong.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: pm_airstep=C-FIX, pm_slidefix=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_airaccelerate",
  "type": "cvar",
  "description": "Sent to connecting clients and recorded in MVD demos as part of the server's movement settings. On this server, the value is published but does not change how players actually accelerate while airborne -- the server's own movement code uses the sv_accelerate value for air control as well as ground control. A client that runs its own movement prediction would read this value for air acceleration.\n\nDefault: 10.\nSet by: server config.\nSee also: independent-physics.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_user.c:454. FLAVOUR-C TRAP AVOIDED. The name + the movevars bridge both suggest this governs air acceleration, but the server-side player-move code does NOT consume movevars.airaccelerate for movement. Registration src/sv_phys.c:51 default \"10\"; Cvar_Register src/sv_main.c:3516; bridged sv_airaccelerate.value -> movevars.airaccelerate at src/sv_phys.c:1129. Tree-wide grep for `airaccelerate` reads: the ONLY consumers of movevars.airaccelerate are two serverdata broadcasts -- src/sv_user.c:454 `MSG_WriteFloat(&sv_client->netchan.message, movevars.airaccelerate)` (sent to each connecting client in the movevars block) and src/sv_demo.c:1297 `MSG_WriteFloat(&buf, movevars.airaccelerate)` (written into the MVD demo movevars block). The actual air-acceleration call PM_AirAccelerate (src/pmove.c:382, invoked once at src/pmove.c:534 from PM_AirMove) is passed movevars.accelerate -- the sv_accelerate value -- NOT movevars.airaccelerate. There is no other pmove translation unit (src/pmove.c is the only one; src/pmovetst.c is collision tracing). LEGIBLE (asserted): registered default, published to client + demo. NOT SOURCE-LEGIBLE server-side (hedged, NOT asserted as fact in prose): that the server's own air movement is governed by it -- it is not. CROSS-ENGINE (routed, not inlined as enforced): a client doing local prediction reads the broadcast value for air accel -- that lives in the ezQuake/FTE client, out of this codebase; routed to See also: independent-physics. KTX F-MV1: ktx never touches sv_airaccelerate (grep empty). Confidence medium because the client-prediction consequence is asserted from the protocol write-site, not traced into client source.",
  "description_proposed": null
}
```
