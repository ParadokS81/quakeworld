# describe-fill-synthesis ledger -- mvdsv `sv_maxdownloadrate`

- **project:** mvdsv
- **knob:** `sv_maxdownloadrate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxdownloadrate: synthesized -- bytes/sec cap on per-client download rate; 0 falls back to sv_maxrate; enforced in SV_BoundRate -- origin=synthesized ref=src/sv_main.c:3189 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Caps the per-client transfer speed used while a file download is in progress, in bytes per second.
>
> 0 = no download-specific cap; while 0, the general sv_maxrate limit applies to downloads as well.
> any positive value = each client's download is limited to that many bytes per second (overriding sv_maxrate for the duration of the download).
>
> Default: 0.
> Set by: server config / rcon.
> See also: sv_maxrate.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_main.c:143 | `cvar_t sv_maxdownloadrate = {"sv_maxdownloadrate", "0"};` | MATCH |
| applies only during a download | src/sv_main.c:3184 | `if (dl)` (dl = cl->download != NULL, :3264) | MATCH |
| positive value caps download rate | src/sv_main.c:3189-3190 | `if (sv_maxdownloadrate.value && rate > sv_maxdownloadrate.value) rate = (int)sv_maxdownloadrate.value;` | MATCH |
| 0 = no download-specific cap, sv_maxrate applies | src/sv_main.c:3186-3187 | `if (!(int)sv_maxdownloadrate.value && (int)sv_maxrate.value && rate > (int)sv_maxrate.value) rate = (int)sv_maxrate.value;` | MATCH |
| bounded quantity is per-client bytes/sec send rate | src/sv_main.c:3264 | `cl->netchan.rate = 1.0 / SV_BoundRate(cl->download != NULL, ...)` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_maxdownloadrate) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1a | Per-client cap | sv_main.c:3264 / sv_user.c:1570 | `cl->netchan.rate = 1.0 / SV_BoundRate (cl->download != NULL, ...)` / `sv_client->netchan.rate = 1. / SV_BoundRate(true, ...)` | MATCH |
| 1b | Applies "while a file download is in progress" | sv_main.c:3184-3191 (dl branch); dl = download!=NULL set true at start (sv_user.c:1570), false on complete (sv_user.c:4972) | `if (dl) { ... if (sv_maxdownloadrate.value && rate > sv_maxdownloadrate.value) rate = (int)sv_maxdownloadrate.value; }` | MATCH |
| 1c | Units = bytes per second | net_chan.c:316 (rate semantics) | `chan->cleartime = curtime + send.cursize * i * chan->rate;` (cursize=bytes, rate=1/bytes_per_sec) | MATCH |
| 2 | 0 = no download-specific cap; while 0, sv_maxrate applies to downloads | sv_main.c:3186-3187 | `if (!(int)sv_maxdownloadrate.value && (int)sv_maxrate.value && rate > (int)sv_maxrate.value) rate = (int)sv_maxrate.value;` | MATCH |
| 3a | positive value = download limited to that many bytes/sec | sv_main.c:3189-3190 | `if (sv_maxdownloadrate.value && rate > sv_maxdownloadrate.value) rate = (int)sv_maxdownloadrate.value;` | MATCH |
| 3b | overriding sv_maxrate (positive value bypasses maxrate clamp) | sv_main.c:3186 (guard `!(int)sv_maxdownloadrate.value` makes maxrate clamp skip when dlrate set) | `if (!(int)sv_maxdownloadrate.value && ...)` | MATCH |
| 3c | "for the duration of the download" (cap removed when download ends) | sv_user.c:4972 (SV_ClientDownloadComplete) | `cl->netchan.rate = 1.0 / SV_BoundRate(false, ...)` | MATCH |
| 4 | Default: 0 | sv_main.c:143 | `cvar_t sv_maxdownloadrate = {"sv_maxdownloadrate", "0"};` | MATCH |
| 5 | Set by: server config / rcon | sv_main.c:143 (2-field init: no CVAR_ROM/flags/OnChange) + sv_main.c:3437 `Cvar_Register (&sv_maxdownloadrate);` | `{"sv_maxdownloadrate", "0"}` | MATCH |
| 6 | See also: sv_maxrate | sv_main.c:3186-3194 (co-enforced fallback in same fn) | `... && (int)sv_maxrate.value && rate > (int)sv_maxrate.value) rate = (int)sv_maxrate.value;` | MATCH |

**V-pass notes:** Oracle confirmed: `git describe --tags` == 1.11-53-g18d0362.

All use-sites live in sv_main.c (declaration :143, enforcing SV_BoundRate :3180-3203, SV_CheckVars re-bound block :3249-3266, Cvar_Register :3437). SV_BoundRate has 5 callers (sv_user.c:1570 download-start dl=true, :2185 rate cmd, :4972 download-complete dl=false; sv_main.c:3264 re-bound, :3838 connect). The cap is enforced ONLY inside the `if (dl)` branch where dl = (download != NULL), so it is genuinely download-scoped, and is undone on download completion -- both load-bearing scope/duration clauses trace cleanly.

Polarity verified at the enforcing lines: cvar==0 routes to the sv_maxrate fallback (:3186); cvar>0 clamps to itself and bypasses the maxrate clamp (:3189-3190 + the `!dlrate` guard on :3186). OFF-state and override semantics both MATCH the code, including adjacent lines -- no comment inverts meaning.

Units ("bytes per second"): confirmed indirectly via net_chan.c:316 where cleartime advances by cursize(bytes) * (1/rate), so rate is bytes/sec; the cvar value is compared directly against `rate` in the same units. MATCH.

WI-2 metadata: registered default is "0" via the 2-field cvar_t initializer (:143), NOT a shipped-cfg value -- confirmed. No flags / OnChange => plain server cvar, "set by config/rcon" access class is correct.

One acceptable minor vagueness (still-true, traceable, NOT a defect): clause 2's "while 0, the general sv_maxrate limit applies to downloads" is itself conditional on sv_maxrate being non-zero (line 3186 also requires `(int)sv_maxrate.value`). If sv_maxrate is also 0, neither cap applies (falls through to the floor of 500 / ceiling). The description's wording does not contradict this -- if maxrate is 0 there is simply no maxrate limit to apply. Keeping as TRACED-CLEAN per the rubric (traceable minor vagueness is acceptable).

## flags_for_review

- [fyi/suspected-bug/vpass] SV_CheckVars re-bound block (sv_main.c:3249-3266) gates on `(int)sv_maxrate.value != old_maxrate || (int)sv_maxdownloadrate.value != old_maxdlrate` -- both the stored old_* values (declared `static float`, :3216) and the compared current values are truncated to int. A live change to sv_maxdownloadrate smaller than 1.0 (e.g. 0 -> 0.5) would not retrigger the per-client re-bound loop because both sides cast to int 0. This is an existing engine edge-case in the live-update path, irrelevant to the description (the cvar is a bytes/sec rate, fractional values are nonsensical) and does NOT affect any clause. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxdownloadrate",
  "type": "cvar",
  "description": "Caps the per-client transfer speed used while a file download is in progress, in bytes per second.\n\n0 = no download-specific cap; while 0, the general sv_maxrate limit applies to downloads as well.\nany positive value = each client's download is limited to that many bytes per second (overriding sv_maxrate for the duration of the download).\n\nDefault: 0.\nSet by: server config / rcon.\nSee also: sv_maxrate.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3189. Registered src/sv_main.c:143 cvar_t sv_maxdownloadrate = {\"sv_maxdownloadrate\", \"0\"} -> default 0. Enforced inside SV_BoundRate(qbool dl, int rate) (src/sv_main.c:3180). Download-only scope: the whole maxdownloadrate logic is under `if (dl)` (src/sv_main.c:3184); the call site passes dl=cl->download!=NULL and assigns cl->netchan.rate = 1.0 / SV_BoundRate(cl->download != NULL, ...) (src/sv_main.c:3264), so the bounded quantity is a send rate. Cap when set: src/sv_main.c:3189-3190 `if (sv_maxdownloadrate.value && rate > sv_maxdownloadrate.value) rate = (int)sv_maxdownloadrate.value;` -> positive value limits the download rate. OFF-state / fallback to sv_maxrate: src/sv_main.c:3186-3187 `if (!(int)sv_maxdownloadrate.value && (int)sv_maxrate.value && rate > (int)sv_maxrate.value) rate = (int)sv_maxrate.value;` -> when 0, sv_maxrate still bounds downloads. Unit bytes/sec: rate originates from the userinfo `drate`/`rate` key (src/sv_main.c:3263) and feeds netchan.rate (per QW netchan, bytes/sec). Set-by: plain cvar (no CVAR_ROM/serverinfo flag), settable via config/rcon. No KTX override (grep of ktx/src for sv_maxdownloadrate empty).",
  "description_proposed": null
}
```
