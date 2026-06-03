# describe-fill-synthesis ledger -- mvdsv `skill`

- **project:** mvdsv
- **knob:** `skill` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:skill: synthesized -- NQ single-player/coop difficulty 0-3 (clamped at map load) that filters entity spawns; bypassed under deathmatch so no effect on a normal QW/KTX server -- origin=synthesized ref=src/pr_edict.c:1020 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the single-player / cooperative difficulty level (the classic Quake skill setting) that the server stores and the game mod reads. At map load the value is rounded to a whole number; for entity spawning it is clamped to 0-3 (a value above 3 is stored as-is but behaves as 3).
>
> 0 = easy, 1 = normal, 2 = hard, 3 = nightmare.
>
> This only affects which entities spawn on a map (harder skills remove or add certain pickups/monsters) and only when the server is NOT running deathmatch; on a normal deathmatch server (the usual QuakeWorld/KTX case) it has no effect on entity spawns.
>
> Default: 1.
> Set by: server config / rcon.
> See also: coop, samelevel.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| rounded to int at map load | src/sv_init.c:341 | `current_skill = (int) (skill.value + 0.5);` | MATCH |
| clamped 0..3 | src/sv_init.c:342-346 | `if (current_skill < 0) current_skill = 0;` / `if (current_skill > 3) current_skill = 3;` | MATCH |
| affects which entities spawn by skill | src/pr_edict.c:1020-1022 | `(current_skill == 0 && spawnflags & SPAWNFLAG_NOT_EASY) || ... NOT_MEDIUM ... NOT_HARD` -> `ED_Free(ent)` | MATCH |
| no effect under deathmatch (scope) | src/pr_edict.c:1011,1019 | `if ((int)deathmatch.value){...} else if (current_skill...)` | MATCH |
| skill 2 and 3 identical to filter | src/pr_edict.c:1022 | `current_skill >= 2 && ... SPAWNFLAG_NOT_HARD` | MATCH |
| default 1 | src/sv_main.c:171 | `cvar_t skill = {"skill", "1"};` | MATCH |
| *skill is botskill, not this cvar | src/sv_main.c:476 | `botskill = Info_Get(&cl->_userinfo_ctx_, "*skill");` | MATCH (excluded) |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Sets the SP/coop difficulty level (classic Quake skill) the server stores | src/sv_main.c:171 ; src/sv_main.c:3487 | `cvar_t skill = {"skill", "1"}; // dont delete this variable - it used by mods` ; `Cvar_Register (&skill);` | MATCH |
| 2 | "the game mod reads" (consumer is the QC mod, outside engine) | src/sv_main.c:171 (comment) | `// dont delete this variable - it used by mods` | MATCH (comment-grounded; cvar is registered/mod-queryable; engine has no enforcing read other than the spawn filter) |
| 3 | At map load the value is rounded to a whole number | src/sv_init.c:341 | `current_skill = (int) (skill.value + 0.5);` | MATCH (round-to-nearest for the non-negative range; runs inside SV_SpawnServer before PR_LoadEnts at sv_init.c:635) |
| 4 | ...and clamped to the range 0-3 | src/sv_init.c:341-346 | `current_skill = (int)(skill.value+0.5);` / `if (current_skill < 0) current_skill = 0;` / `Cvar_Set (&skill, va("%d", current_skill));` / `if (current_skill > 3) current_skill = 3;` | MISMATCH (narrower than implied): the spawn-driving local `current_skill` IS clamped to [0,3], but the value written BACK to the `skill` cvar at line 344 is only floored at 0 -- the upper clamp (345-346) executes AFTER the Cvar_Set, so the stored cvar can read back >3 (e.g. `skill 5` stores "5"). Asymmetric clamp; the clause reads as if the cvar value itself is bounded 0-3. |
| 5 | 0=easy,1=normal,2=hard,3=nightmare | src/pr_edict.c:1020-1022 | `else if ((current_skill == 0 && ...NOT_EASY) || (current_skill == 1 && ...NOT_MEDIUM) || (current_skill >= 2 && ...NOT_HARD))` | MATCH-with-caveat: 0/1 map to NOT_EASY/NOT_MEDIUM exactly; but `>= 2` folds BOTH 2 and 3 into the NOT_HARD filter -- engine does not distinguish nightmare(3) from hard(2) at entity spawn. Labels are the conventional Quake values the mod/QC sees; no SPAWNFLAG_NOT_NIGHTMARE exists. |
| 6 | Only affects which entities spawn (harder skills remove/add pickups/monsters) | src/pr_edict.c:1015-1027 ; src/server.h:688-690 | `ED_Free (ent); inhibit++; continue;` under the skill/spawnflag tests ; `#define SPAWNFLAG_NOT_EASY 256` (+MEDIUM 512, HARD 1024) | MATCH (`current_skill` has exactly one behavioral consumer tree-wide -- this spawn filter; verified via grep) |
| 7 | Only when server is NOT running deathmatch | src/pr_edict.c:1011-1019 | `if ((int)deathmatch.value) { ...NOT_DEATHMATCH... } else if (current_skill...)` | MATCH (skill branch is the `else` of the deathmatch test -- runs only when deathmatch==0) |
| 8 | On a normal deathmatch server (usual QW/KTX) it has no effect on entity spawns | src/pr_edict.c:1011 ; src/sv_main.c:166 | `if ((int)deathmatch.value)` ; `cvar_t deathmatch = {"deathmatch","3",CVAR_SERVERINFO};` | MATCH (deathmatch defaults to 3; when nonzero the skill branch is skipped entirely) |
| 9 | Default: 1 | src/sv_main.c:171 ; src/cvar.c:240-269 (Cvar_Register) | `cvar_t skill = {"skill", "1"}` ; Cvar_Register preserves `variable->string` via `Cvar_SetROM(variable, value)` | MATCH (registered default = "1", no override) |
| 10 | Set by: server config / rcon | src/sv_main.c:171 (no CVAR_ROM/CVAR_SERVERINFO flag) | `cvar_t skill = {"skill", "1"};` -- writable cvar, no ROM flag | MATCH (ordinary writable cvar; settable via cfg/rcon `set`) |
| 11 | See also: coop, samelevel | src/sv_main.c:170,172 ; src/sv_init.c:339-340 | `cvar_t samelevel = {"samelevel","1"};` `cvar_t coop = {"coop", "0"};` ; `if ((int)coop.value) Cvar_Set (&deathmatch, "0");` | MATCH (both are real cvars; coop is mechanically coupled -- coop!=0 forces deathmatch 0, which is exactly the gate that lets skill take effect) |

**V-pass notes:** Classification: C-NEAR-MISS. The description is substantively correct on polarity, default, scope, OFF-state, and the sole side-effect -- all map to located, verified enforcing lines. One clause is narrower than implied (the C-NEAR-MISS trigger):

CLAUSE 4 ("clamped to the range 0-3"): The clamp is ASYMMETRIC between the two things named "skill". The spawn-driving local `current_skill` is fully clamped to [0,3] (sv_init.c:342-346). But the value written back to the `skill` CVAR (sv_init.c:344 `Cvar_Set`) is only floored at 0 -- the upper clamp at lines 345-346 runs AFTER the Cvar_Set. So `skill 5` leaves the cvar reading "5" while entity spawning behaves as skill 3. The description's "the value is rounded to a whole number and clamped to 0-3" reads as a single claim about the stored value; the code clamps the cvar only at the low end and reserves the 0-3 bound for the internal spawn variable. The OBSERVABLE behavior (entity spawns) is exactly as described, which is why this is a near-miss and not a C-FIX.

Secondary imprecision (CLAUSE 5, not severe enough alone to drive the class): the enforcing line uses `current_skill >= 2` for the NOT_HARD filter, so skill 2 (hard) and skill 3 (nightmare) are mechanically identical at the entity-spawn level -- there is no separate nightmare filtering in the engine (no SPAWNFLAG_NOT_NIGHTMARE; matches vanilla Quake, which differentiates nightmare only in QC monster behavior). The "3 = nightmare" label is the correct conventional value the mod/QC reads, so the label itself is fine; the engine-level "removes/adds pickups/monsters" effect just doesn't differentiate 2 from 3.

Wide read: every tree-wide use-site traced. `skill.value` is READ in exactly one place (sv_init.c:341). `current_skill` has exactly one behavioral consumer (the pr_edict.c:1020-1022 spawn filter); the other current_skill touch points are savegame serialize/deserialize (sv_save.c:140,219) and the local copy `skill_level` (sv_init.c:252,315) used only on the savegame-restore path. The `*skill` userinfo key (sv_main.c:476, sv_user.c:2294) is the BOT skill for ping calc -- unrelated to this cvar, correctly not conflated. No cross-mod override of the difficulty cvar in this tree (mods consume it externally via the registered cvar, per the source comment).

Metadata (WI-2): default verified "1" against registration + Cvar_Register semantics (not a shipped-cfg value). Access class is an ordinary writable cvar (no ROM flag) -- "server config / rcon" is correct.

## flags_for_review

- [fyi/suspected-bug/synthesis] skill clamp-order quirk: src/sv_init.c:344 `Cvar_Set(&skill, va("%d", current_skill))` writes the cvar string BEFORE the upper clamp `if (current_skill > 3) current_skill = 3;` at line 345. So a configured skill of e.g. 5 is rounded+lower-clamped, written back to the cvar string as 5 (not 3), while the in-memory current_skill used by the spawn filter is then clamped to 3. Cosmetic (the filter treats >=2 as hard regardless), but the cvar value an admin reads back can exceed 3. Flagged as a possible minor engine bug for human review, not asserted in the user doc.
- [fyi/suspected-bug/vpass] Asymmetric clamp at src/sv_init.c:341-346: the upper bound (lines 345-346, `if (current_skill > 3) current_skill = 3;`) executes AFTER `Cvar_Set (&skill, va("%d", current_skill));` at line 344. Consequence: the spawn-logic variable current_skill is bounded 0-3, but the skill CVAR itself is only floored at 0 -- a value like `skill 5` is rounded and stored back as "5", never reduced to 3. Looks like an ordering oversight (the high clamp belongs before the Cvar_Set, mirroring the low clamp at 342-343). Behaviorally low-impact: entity spawning still treats anything >=2 identically via the `current_skill >= 2` test in pr_edict.c:1022, so >3 and 3 produce the same map. Same upstream as id Quake/QW; not MVDSV-introduced. FYI only -- not in scope for this knob's description.
- [fyi/other/vpass] Engine does not distinguish nightmare(3) from hard(2) at entity spawn: pr_edict.c:1022 gates NOT_HARD on `current_skill >= 2`. There is no SPAWNFLAG_NOT_NIGHTMARE (server.h:688-691 defines only NOT_EASY/NOT_MEDIUM/NOT_HARD/NOT_DEATHMATCH). Nightmare-specific behavior, in stock Quake, lives entirely in the QC/progs monster logic, not the engine spawn filter. Relevant if a future doc pass wants to tighten the 0-3 label semantics.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "skill",
  "type": "cvar",
  "description": "Sets the single-player / cooperative difficulty level (the classic Quake skill setting) that the server stores and the game mod reads. At map load the value is rounded to a whole number; for entity spawning it is clamped to 0-3 (a value above 3 is stored as-is but behaves as 3).\n\n0 = easy, 1 = normal, 2 = hard, 3 = nightmare.\n\nThis only affects which entities spawn on a map (harder skills remove or add certain pickups/monsters) and only when the server is NOT running deathmatch; on a normal deathmatch server (the usual QuakeWorld/KTX case) it has no effect on entity spawns.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: coop, samelevel.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr_edict.c:1020. Enforcing behavior read-site: src/pr_edict.c:1010-1027 SpawnEntities entity-filter. The skill value is consumed as the global `current_skill` (server.h:730), set from the cvar at map load src/sv_init.c:341-346: `current_skill = (int)(skill.value + 0.5);` (round) then clamp `if (current_skill < 0) current_skill = 0;` and `if (current_skill > 3) current_skill = 3;`. Range/polarity 0-3 enforced there. Entity-spawn effect: pr_edict.c:1020-1022 `else if ((current_skill == 0 && spawnflags & SPAWNFLAG_NOT_EASY) || (current_skill == 1 && ... NOT_MEDIUM) || (current_skill >= 2 && ... NOT_HARD)) { ED_Free(ent); inhibit++; continue; }` -- removes entities flagged not-for-this-skill. SCOPE clause (deathmatch bypass): this branch is the `else` of `if ((int)deathmatch.value)` at pr_edict.c:1011, so when deathmatch is on the skill filter is skipped entirely (only SPAWNFLAG_NOT_DEATHMATCH applies); QW normally forces deathmatch (sv_init.c:339-340 forces deathmatch off only when coop is set), so on a standard KTX deathmatch server skill has no spawn effect -- this is action-relevant scope, kept inline. Enum names easy/normal/hard/nightmare are the conventional Quake skill 0-3 mapping; the code treats current_skill>=2 as 'hard' (skill 2 and 3 are identical to the entity filter -- the >3 clamp at sv_init.c:345 runs AFTER Cvar_Set at 344, so the cvar string can read 3 but the spawn filter never distinguishes 2 from 3). Default \"1\" verified at registered literal src/sv_main.c:171 `cvar_t skill = {\"skill\", \"1\"}; // ... used by mods` (registered sv_main.c:3487). NOTE: the `*skill` userinfo at sv_user.c:2294 / sv_main.c:476 is the bot 'botskill' key (USE_PR2 bot path), a DIFFERENT entity -- not this cvar. Set-by: not on the rcon blocklist (sv_main.c:1754-1764) -> 'server config / rcon'. F-MV1: grep of ktx/src shows KTX (a deathmatch mod) does not use the skill difficulty filter; the engine stores the value and the difficulty filter lives in engine spawn code, gated out of deathmatch.",
  "description_proposed": null
}
```
