# MVDSV describe-fill -- chunk-5 batch ledger: `script-meta-cheats-web`

Workflow chunk-runner batch (run `wf_928da2ed-c76`, 35 agents / 2.2M tokens). MAIN-owned
gates (F-D6a, HG1/HG2, prose spot-check, persist) recorded here; per-knob ledgers carry the
synthesized record + cold V-pass and point here for the MAIN gate log.

- **anchor:** `1.11-53-g18d0362`
- **shape:** command -- **24 knobs** (groups of 4 -> 6 synth agents; 24 reals + 5 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `4a8c453f9857925898a5ddc73a430cea` (was `9cb713c7` after chunk 4)
- **synthesized-origin mvdsv rows:** 112 -> **136** (DB-verified; +24)

## Recon (live set == plan)

24 chunk-5 commands, all `description IS NULL` at start, registration sites confirmed via
`command_versions`. The 3 stragglers (`say` sv_ccmds.c:1875, `floodprotmsg` sv_ccmds.c:1899,
`svadmin` sv_main.c:3614) confirmed deferred per the cursor -- not in scope. No divergence.

Knobs: set toggle inc cvardump cvarlist cmdlist if unalias unaliasall vminfo profile mod
cache_print cache_report hunk_print give noclip script sv_lastscores sv_usercmdtrace
sv_web_get sv_web_post sv_web_postfile localcommand.

## HG1 -- canary gate: **PASS** (no re-dispatch)

5 canaries (4 C-FIX + 1 TRACED-CLEAN control), each ground-truth grepped by MAIN before launch.
All classified correctly on the FIRST wave:

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `god` (access-class UNDER-claim: "players cannot invoke") | C-FIX | C-FIX | client cheat in `ucmds[]` sv_user.c:3358, gated by `sv_allow_cheats` sv_ccmds.c:274 |
| `removeip` (effect inversion: "adds/bans") | C-FIX | C-FIX | deletes -- sv_main.c:2271-2273 |
| `addip` (default-type inversion: "default safe") | C-FIX | C-FIX | default ban -- sv_main.c:2203 |
| `writeip` (effect inversion: "loads/auto-restores") | C-FIX | C-FIX | writes file `wb`+fprintf -- sv_main.c:2319-2351 |
| `nslookup` (verbatim correct -- control) | TRACED-CLEAN | TRACED-CLEAN | reverse-DNS console cmd -- sv_ccmds.c:1163 |

The `god` canary is the load-bearing one: it tests the exact access-class direction the
give/noclip cheats carry in the synth set (inverse of chunk-4's admin-only over-claims). Workers
caught it; the control held (no over-flagging).

## F-D6a -- source_ref audit: **PASS** (24/24)

Every returned `source_ref` printed from live source and confirmed a real read/handler site of the
knob; zero fabrications. Several refs point at the handler-function head (vminfo/unaliasall/profile/
mod/cache_*/hunk_print/give) rather than the exact enforcing line, but each per-knob ledger's
`enforce_trace_table` carries the precise lines -- F-D6a's bar ("exists and reads the knob") is met.

## HG2 -- cold V-pass flagged 8/24 reals; all adjudicated against live source

Re-grepped each contested clause both directions. **All 8 V-pass findings confirmed REAL** (zero
false positives this chunk) -> 10 surgical MAIN edits applied at persist (no seeded re-synth needed
-- chunk-1..4 practice). Edits patched into the records before emit; each ledger's
`description_reasoning` carries a `[MAIN-HG2 edit: ...]` note.

| knob | V-pass | defect (confirmed) | fix |
|---|---|---|---|
| `vminfo` | C-FIX | "instruction count" -- vm.c:1589 prints `instructionCount*4` labeled "table length" (byte size, not a count); VM_COUNT==1 | -> "instruction-table length"; "virtual machine(s)... single game-mod VM" |
| `script` | C-FIX | "scripts cannot run from outside the server dir" -- sv_main.c:2843-2853 skips a leading `../` for the strstr check then re-fetches Cmd_Argv(1); `script ../foo` escapes one level | corrected the `..` claim; located in active gamedir; noted $/@ macro expansion |
| `sv_lastscores` | C-FIX (blocker x2) | "newest first" inverted (Sys_compare_by_date `a->time-b->time` ascending sv_main.c:4192 + ascending print sv_demo_misc.c:1009 -> newest LAST); "0 lists all" wrong (`<=0`->MAXDEMOS(10), no list-all branch, sv_demo_misc.c:985-986) | oldest-first/newest-last; "0/<=0 -> last 10" |
| `sv_web_get` | C-FIX | example "KTX race/results" -- sv_web_get has ZERO callers tree-wide; KTX uses sv_web_post (race.c:4989) + sv_web_postfile (stats.c:590, race.c:3288) | removed the example; noted no built-in caller; hedged request-id; GET-is-POST stated inline |
| `sv_web_post` | C-NEAR-MISS | request-id "match the eventual reply" -- no live consumer (comment-inferred); "game results" maps to postfile | hedged request-id to opaque tag; moved game-results to postfile |
| `sv_web_postfile` | C-NEAR-MISS | request-id "match the eventual reply" -- no live consumer (KTX passes it empty) | hedged request-id to opaque tag |
| `mod` | C-NEAR-MISS | "tells the mod which player typed it when issued at a client" -- clients can't run `mod` (not in ucmds[], no fall-through); attribution fires on source-address match (rcon from a player's machine) | reframed the attribution trigger |
| `noclip` | WI2-FIX | gate named `sv_allow_cheats` -- an internal qbool (sv_ccmds.c:26), not a cvar; the settable control is the `sv_cheats` cvar (sv_ccmds.c:25) | named `sv_cheats` cvar (+ devmap), matching the `give` sibling |

Plus a 2-row alias-consistency edit (not V-pass-flagged): `cvardump`/`cvarlist` are byte-identical
aliases (shared `Cvar_CvarList_f`, cvar.c:386) -- aligned cvardump's wildcard clause (`*` and `?`,
case-insensitive) and cross-linked each as an exact alias of the other.

### Sibling-sweep (chunk-4 lesson: per-knob V-pass can't see chunk-wide gates) -- PASS

- **normal-rcon blocklist** (sv_main.c:1754-1764): the two chunk-5 members `if` and `localcommand`
  both correctly carry "server console + master rcon only" (localcommand also notes the
  `-enablelocalcommand` registration gate). No other chunk-5 command is on the blocklist.
- **cheat gate** (`sv_cheats` cvar -> `sv_allow_cheats` flag): `give` named it correctly; `noclip`
  was the only diverger (fixed above). Both now consistent.

## Prose spot-check (MAIN; chunk-5 is spot-check, not full operator review)

All 24 reviewed -- concise, accurate, v2 user-doc shape (what-it-does + values + Default where
relevant + Set-by). Longer entries (`if`, `give`, `script`, `sv_web_*`, `sv_usercmdtrace`) justified
by genuine multi-value / worked-example content; no bloat. No further concision edits.

## Persist + gates

- `synthesize-mvdsv.ts --from-ledger` dry-run: 24 parsed / 24 persisted / **0 errors**.
- LIVE: 24 persisted / 0 errors; committed fingerprint `4a8c453f9857925898a5ddc73a430cea`.
- Idempotency re-run: 0 persisted / **24 skipped-terminal** / same fingerprint -> stable, no re-run bug.
- `quality-grid --project mvdsv --family regression`: the 2 anchored describe_fill gates
  (`synthesized_requires_anchor`, `provenance_entry_exists`) + `jsonb_columns_not_strings` + all
  mvdsv counts PASS. `origin_vocabulary` RED (1266) is **entirely the ktx `recast_v2` baseline**
  (633 rows x2 predicates); mvdsv origins are only `source_inline` (991) + `synthesized` (136) --
  **0 mvdsv contribution**, exactly as the brief predicts.

## Findings seeded

9 issue-worthy findings appended to `mvdsv-describe-fill-findings.md` (#23-#31): script path-traversal
carve-out (security), sv_web GET/POST identity + sv_web_get zero-callers + request_id-inert/CURL-build
(dead-suspect, cross-ref #1), sv_lastscores usage-string lie (upstream) + KTX lastscores shadow (L3),
cache_* dead subsystem (dead-suspect), localcommand system() "REMOVE ME" scaffolding (security),
profile QVM no-op + dead PR1 registration (cross-mod/behavior).
