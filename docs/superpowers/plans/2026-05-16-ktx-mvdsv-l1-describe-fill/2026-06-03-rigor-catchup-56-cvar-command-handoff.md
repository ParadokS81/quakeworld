# Handoff -- MVDSV describe-fill RIGOR CATCH-UP: 56 cvar/command re-synthesis

**Spin up a fresh terminal at `/effort max` with the spawn prompt below.** This is EXECUTION (run
the proven chunk-runner over a re-pointed recon set), not a strategy conversation. The MVDSV NULL-fill
is already complete; this pass upgrades the rows that never went through synthesis.

## What this is / why (verified 2026-06-03)

The original arc filled all NULL descriptions, but **102 MVDSV knobs still carry their raw extracted
source comments** (`description_origin = source_inline`, `description_verdict IS NULL`) -- they were
counted as "covered" but never synthesized. The brief mislabeled them "serviceable early hand-fills,
lowest-urgency"; a cold 14-knob spot-check (workflow `wf_45d758d6`) disproved that:

- **0 / 14 at the synthesized bar.** 9 are verbatim raw code comments, 4 are accurate-but-under-shaped,
  **1 is factually WRONG.**
- `developer` = "show extra messages", `coop` = "dont delete this variable - it used by mods",
  `extralogname` = "no sv_ prefix? WTF!", `edict` keeps the "edicy" typo -- these are dev asides, not docs.

**Scope of THIS pass: the 56 cvar/command of those 102** (22 command + 34 cvar). The 45 info_keys are
OUT -- they are a different shape (key/value semantics, many cross-engine reads) and fold into a combined
cross-engine info_key batch with KTX's 38 untriaged keys. `sv_antilag_no_pred` is also OUT (matches the
brief's standing `sv_antilag*` exclusion -> D10 antilag track).

**End state:** the 56 flip `source_inline -> synthesized` + verdict-traced, taking the MVDSV knob layer
from 70% to ~95% traced -- matching KTX.

## The ONLY change from the original arc

1. **Recon selects the un-traced source_inline set, NOT `description IS NULL`** (the NULL-fill is done;
   this overwrites existing raw descriptions).
2. **The writer overwrites in place** -- `synthesize-mvdsv.ts:329-342` does `UPDATE entities SET
   description = ... WHERE canonical_id = ...` with NO `description IS NULL` guard (verified 2026-06-03).
   So **NO delete / NULL-out step is needed** -- re-running the pipeline replaces the raw text directly.
3. **Do NOT feed the existing source_inline text to the synthesis agents.** Synthesize fresh from code
   (the existing discipline; the recon query only pulls name/type/reg/dflt, so this is automatic -- keep
   it that way, do not add the old description to the args).

Everything else is unchanged. The runner, `synthesize-mvdsv.ts`, the emit script, the per-shape rule
blocks, the canary-fodder technique -- all reused as-is.

## Recon query (run first; confirm the live set before fanning out)

```sql
-- commands (expect 22)
SELECT e.name, e.type, cm.source_file||':'||cm.source_line AS reg
FROM entities e LEFT JOIN command_versions cm ON cm.entity_id = e.id
WHERE e.project='mvdsv' AND e.type='command'
  AND e.description_origin='source_inline' AND e.description_verdict IS NULL
ORDER BY e.name;

-- cvars (expect 34 -- sv_antilag_no_pred excluded -> D10)
SELECT e.name, e.type, cv.source_file||':'||cv.source_line AS reg, cv.default_value AS dflt
FROM entities e LEFT JOIN cvar_versions cv ON cv.entity_id = e.id
WHERE e.project='mvdsv' AND e.type='cvar'
  AND e.description_origin='source_inline' AND e.description_verdict IS NULL
  AND e.name NOT LIKE 'sv_antilag%'
ORDER BY e.name;
```

If the join yields duplicate rows (multiple version rows per entity), filter to the current anchor version.

**Verified target list (2026-06-03):**
- **commands (22):** acc_create, acc_list, acc_remove, alias, echo, edict, edictcount, edicts, floodprot,
  flush, gamedir, god, kick, localinfo, ls, rm, rmdir, serverinfo, setmaster, sv_gamedir, user, wait
- **cvars (34):** city, coop, coords, countrycode, developer, extralogname, hostname, hostport, maxfps,
  password, qtv_pendingtimeout, qtv_sayenabled, qtv_streamtimeout, rcon_password, samelevel, skill,
  spectator_password, sv_crypt_rcon, sv_forcenick, sv_hashpasswords, sv_loadentfiles, sv_loadentfiles_dir,
  sv_login, sv_login_web, sv_maxtic, sv_mintic, sv_rconlim, sv_registrationinfo, sv_unfake, sv_use_dns,
  sys_select_timeout, timeout, vip_password, zombietime

## Known flags (carry into chunk.rules / prose-gate)

- **floodprot is WRONG -- the headline correction.** Its current description is "Sets the gamedir and
  path to a different directory" (a stale copy-pasted banner comment at `sv_ccmds.c:1590`). Real floodprot
  configures chat flood protection: `floodprot <#msgs> <per #secs> <silence secs>` -> fp_messages /
  fp_persecond / fp_secondsdead (cap 10), no-arg prints current (`SV_Floodprot_f`, `sv_ccmds.c:1594-1636`).
  Do NOT let it slip through as another raw lift; the V-pass/prose-gate must confirm the new text is the
  flood-protection knob.
- **rcon blocklist commands (finding #20):** `ls` / `rm` / `rmdir` (and `localinfo`? verify) are on the
  normal-rcon blocklist (`sv_main.c:1754-1764`) -- Set-by must read "server console + master rcon only",
  NOT a bare "console / rcon". Sweep all siblings (the chunk-4 HG2 lesson).
- **god is a cheat** -- access-class: verify the client-CAN-issue path (the chunk-5 `god` canary lesson),
  gated on sv_cheats.
- **password cluster** (password / rcon_password / spectator_password / vip_password): cross-link; note
  empty or "none" disables the gate (spot-check confirmed on `password`, enforced `sv_main.c:1083-1090`).
- **coop / samelevel / skill** -- the "dont delete this variable - it used by mods" trio: NQ-heritage
  cvars the engine exports to progs; describe the REAL meaning (e.g. coop forces deathmatch off
  `sv_init.c:339-340` + routes team-say to all `sv_user.c:1903-1904`), not the maintenance comment.
- **extralogname** is ENGINE-written during MVD record (default "unset", `sv_demo.c:56/1828`), not a
  user-set knob -- describe accordingly.
- **gamedir vs sv_gamedir:** `gamedir` switches the real gamedir (single filename only, rejects path
  chars, must disconnect first); `sv_gamedir` sets only the `*gamedir` serverinfo display key. Keep them
  distinct.

## Per-chunk loop + machinery: REUSE the brief

The full per-chunk loop -- anchor gate -> recon -> canaries (HG1) -> run the runner -> F-D6a -> HG2 ->
prose-gate -> emit ledgers -> `synthesize-mvdsv.ts --dry-run` then live -> idempotency (skipped-terminal
= N, stable fingerprint) -> `quality-grid --project mvdsv --family regression` -> commit -- plus the args
config shape, the per-shape rule blocks, and the canary-fodder technique, are all in
`workflow-chunk-campaign-brief.md`. Reuse unchanged; ONLY the recon filter differs (above).

**Canary fodder:** the already-synthesized 243 are theme-blind-reusable -- invert a clause on a real
synthesized cvar/command -> `C-FIX`; take a correct one -> `TRACED-CLEAN` control. The catch-up knobs
themselves must NOT be in their own canary set.

**Suggested chunking:** shapes are proven (chunks 3-8), so scale confidently -- e.g. commands (22) as one
chunk, cvars (34) as one chunk, or split into 3. Risk-ordering matters less now; the command access-class
+ blocklist sweep is the only sharp edge.

## Anchor

mvdsv must be at `1.11-53-g18d0362` (verified HEAD `18d0362` 2026-06-03). The runner's anchor gate (step 0)
enforces it; do not proceed if it differs.

## Reads required (cold-start order)

1. This file.
2. `workflow-chunk-campaign-brief.md` -- the per-chunk loop + rule blocks + the per-chunk learnings log
   (the methodology memory; the command rule block carries the access-class + blocklist + worked-example
   discipline this pass needs).
3. `mvdsv-describe-fill-findings.md` -- floodprot context is implicit; #20 (rcon blocklist) is load-bearing
   for ls/rm/rmdir Set-by lines. Append any NEW issue-worthy flags this pass surfaces (verify file:line
   first).

## Critical rules

- Descriptions/findings are hypotheses until re-grepped at the anchor.
- The chunk-runner + `synthesize-mvdsv.ts` + emit are PROVEN -- reuse, do not reinvent.
- `args` can arrive at the runner as a string -- it JSON.parses defensively; pass the object.
- Stage ONLY your own files (`git diff --cached --stat` between add and commit). A parallel session has
  been committing KTX game-mode work to `main`.
- This is a re-synthesis OVERWRITE pass; the writer replaces in place by canonical_id -- there is no
  delete step, and a half-finished run is visible via `description_origin` (source_inline vs synthesized).

## First actions

1. Read brief + findings + this handoff (cold).
2. Run the recon; confirm 22 command + 34 cvar = 56 (sv_antilag_no_pred excluded).
3. Set up chunk 1 (commands): plant canaries, assemble args, launch the runner. floodprot is the knob to
   watch.
4. Gate -> prose-gate (show the operator the descriptions, compact) -> emit -> synthesize dry-run then
   live -> idempotency + quality-grid -> commit this chunk only. Then the cvar chunk(s).
5. When all 56 are synthesized + verdict-traced: re-run the verdict-coverage query (cvar/command no_verdict
   should drop to 0 bar the antilag pair); update the brief cursor; note the info_key batch + D10 antilag
   (incl. sv_antilag_no_pred) as the remaining MVDSV L1 work.

## When in doubt

The machinery is the brief; the scope is the 56 above; the headline win is correcting floodprot. Source
not legible -> hedge + `flags_for_review`, never guess (esp. anything antilag-adjacent -> defer to D10).
