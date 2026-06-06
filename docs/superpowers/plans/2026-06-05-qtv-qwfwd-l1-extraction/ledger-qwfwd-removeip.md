# describe-fill-synthesis ledger -- qwfwd `removeip`

- **Project:** qwfwd
- **Knob:** `removeip` (command)
- **Handler / registration:** handler `SV_RemoveIP_f` (`src/ban.c:203-227`); registered `Cmd_AddCommand("removeip", SV_RemoveIP_f)` at `src/ban.c:511` (inside `Ban_Init`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- the file-top block comment `src/ban.c:5-34` mentions `removeip` at `:14,:18` but is an upstream HINT, NOT a register-site comment and NOT a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:removeip: synthesized -- cold-synth; removes one entry from the proxy's packet-filter list, matching the IP/subnet EXACTLY as it was added (same mask+compare); removes either ban or safe entries; reports Removed / "Didn't find"; Set by server config / command line (no rcon, no access check) -- origin=synthesized ref=src/ban.c:216 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Removes a single address from the proxy's packet-filter list (the list managed by `addip`). The address must be written exactly the way it was added: a subnet entry can only be removed by giving that same subnet, not by naming one host inside it. The first entry matching that exact address is removed, whether it was added as a `ban` or a `safe` entry; if nothing matches, the list is left unchanged.
>
> removeip <ip> = remove the filter entry for <ip>.
>
> Like `addip`, this changes only the in-memory list; use `writeip` afterward if you want the change persisted.
> Set by: server config / command line.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`removeip` / `SV_RemoveIP_f` / `StringToFilter` / `ipfilters` / `numipfilters`) confirms `removeip` is referenced only in `src/ban.c` (registration `:511`, handler `:203-227`, and the file-top comment `:14,:18`). All sites below at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:511` | `Cmd_AddCommand("removeip", SV_RemoveIP_f)` -- binds the command name to the handler |
| Handler body | `src/ban.c:203-227` | the whole remove operation |
| arg1 parse + reject | `src/ban.c:208-212` | `StringToFilter(Cmd_Argv(1),&f)`; bad address -> "Bad filter address", nothing removed (note: no `compare==0` guard here, unlike `addip`) |
| Exact-match scan | `src/ban.c:214-216` | iterate `ipfilters[]`; match requires BOTH `mask == f.mask` AND `compare == f.compare` (so subnet must match subnet; type is NOT part of the match) |
| Remove (array compaction) | `src/ban.c:218-221` | shift later entries down (`ipfilters[j-1] = ipfilters[j]`), `numipfilters--`, print "Removed." and return after the FIRST match |
| Not-found path | `src/ban.c:226` | falls through the loop -> `Sys_Printf("Didn't find %s.\n", Cmd_Argv(1))` |
| What `mask`/`compare` mean | `src/ban.c:95-135` (`StringToFilter`) | the same dotted parse `addip` uses; the wildcard-octet rule defines what "exactly as added" means at the bit level |
| Contrast: type-aware remover | `src/ban.c:455-486` (`SV_Cmd_Banremove_f`) | the separate `banremove` command removes by list-ID and refuses `safe` entries (`:475`) -- `removeip` has neither restriction |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at register site `src/ban.c:511`; the file-top comment is an upstream HINT -> nothing to affirm, evaluate anyway (D5 amendment). Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT (removes one entry from the filter list); (2) not a name restatement (spells the exact-match requirement, the subnet caveat, the both-types behavior, the first-match-only behavior, the in-memory caveat); (3) the single arg + its match semantics spelled out; (4) mechanism only; (5) self-contained. All five hold. COMMAND -> "Default:" omitted (no-arg call -> empty `Cmd_Argv(1)` -> "Bad filter address", a no-op).

## Per-clause enforce-trace table (B1)

All sites in `src/ban.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: removes one address from the filter list | `src/ban.c:218-221` (+ reg `:511`) | `for (j=i+1 ; j<numipfilters ; j++) ipfilters[j-1] = ipfilters[j]; numipfilters--; Sys_Printf("Removed.\n"); return;` | MATCH |
| Scope: it is the SAME list `addip` manages | `src/ban.c:214` (`ipfilters`/`numipfilters`) | `for (i=0 ; i<numipfilters ; i++)` over the same static `ipfilters[]` (`:56-57`) that `SV_AddIP_f` writes | MATCH |
| Match: must be the EXACT address as added (mask AND compare) | `src/ban.c:216` | `if (ipfilters[i].mask == f.mask && ipfilters[i].compare == f.compare)` | MATCH |
| Caveat: a subnet can't be removed by naming a host in it | `src/ban.c:216` + `:123-124` (mask derivation) | exact `mask==mask` means a host address (mask 255.255.255.255-ish) never equals a /24 subnet mask, so they don't match | MATCH |
| Polarity: removes EITHER `ban` or `safe` entries (type not in match) | `src/ban.c:216` | the match condition has no `type` term -> first mask+compare match removed regardless of `ipft_ban`/`ipft_safe` | MATCH |
| Behavior: only the FIRST matching entry is removed | `src/ban.c:221` | `return;` immediately after the first removal inside the loop | MATCH |
| Not-found: list unchanged, "Didn't find" printed | `src/ban.c:226` | `Sys_Printf("Didn't find %s.\n", Cmd_Argv(1));` (reached only if no match removed) | MATCH |
| Bad address: nothing removed | `src/ban.c:208-211` | `if (!StringToFilter (Cmd_Argv(1), &f)) { Sys_Printf("Bad filter address: %s\n", Cmd_Argv(1)); return; }` | MATCH |
| In-memory only; persist with `writeip` | absence of any save in `SV_RemoveIP_f` + dedicated `SV_WriteIP_f` `:263` | no `fopen`/write in the remove handler; persistence is `writeip`'s job | MATCH (absence-of-save + dedicated writer) |
| Set by: server config / command line (no rcon, no access check) | `src/cmd.c:869-912` + `src/main.c:142,147,155,520` | `Cmd_ExecuteString` dispatch with no `CF_`/permission check; commands enter only via cfg-`exec` and `Cmd_StuffCmds` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user doc per D20: every file:line cite; the C identifiers (`SV_RemoveIP_f`, `StringToFilter`, `ipfilters`, `numipfilters`, `mask`/`compare`, `SV_Cmd_Banremove_f`, `Cmd_ExecuteString`); the array-compaction shift mechanism; the bit-level mask equality. The user doc states only the admin-observable WHAT (removes one entry, exact-match, subnet caveat, both types, first match, in-memory) and Set-by.

No `See also:` to the sibling `banremove`: it is a separate qwfwd command (removes by numeric list-ID, refuses `safe`), not an L1 See-also anchor in this arc; the contrast is recorded here in reasoning only.

## Rationale

Cold-synth from fully-legible use-sites. `removeip` is the deleter for the same in-memory `ipfilters[]` list that `addip` writes (`src/ban.c:56-57`, iterated `:214`). The handler `SV_RemoveIP_f` (`:203-227`) parses arg1 with the same `StringToFilter` (`:208`) so the address must be expressed identically to how it was added; the match at `:216` compares BOTH `mask` and `compare`, which is why a subnet (mask with zero trailing bytes) can only be removed by giving that same subnet -- naming a single host inside it produces a different mask and does not match (the file comment's "You cannot addip a subnet, then removeip a single host", verified against the equality at `:216` and the mask derivation at `:123-124`). The match condition contains no `type` term, so `removeip` removes whichever of a `ban` or `safe` entry matches first; it then compacts the array (`:218-220`), decrements the count, prints "Removed." and returns after the first match (`:221`). If the loop completes with no match, it prints "Didn't find" and leaves the list untouched (`:226`). A bad address is rejected up front with nothing removed (`:208-211`).

Two honest contrasts recorded in reasoning (not the user doc): (1) unlike `addip`, `removeip` has no `compare==0` guard (`addip` rejects 0.0.0.0 at `:151`; `removeip` does not, but a 0.0.0.0 entry can only have been created out-of-band, so this is a non-issue for normal use). (2) qwfwd has a separate, newer `banremove` command (`SV_Cmd_Banremove_f` `:455-486`) that removes by numeric list-ID and explicitly refuses `safe` entries (`:475`); `removeip` is the legacy address-based remover with neither restriction. These are distinct commands; the description does not conflate them.

WI-2 access trace: identical to the `addip` ledger -- qwfwd has no `CF_` command-access flags and no rcon; `Cmd_ExecuteString` (`src/cmd.c:869-912`) dispatches with no permission check; commands enter only from `exec` of the config files and from the command line (`Cmd_StuffCmds` `src/main.c:155`). Hence Set-by "server config / command line", traced to the dispatch (WI-2), not inferred from the name.

`description_provenance` stays `null` (cold-synth; operator 2026-05-30). No C2 conflict (no mechanical candidate). No SR-5 breadcrumb (IP-filter not among the three concept-note candidates).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/return line (or, for "not auto-saved", the verifiable absence of a save in the remove path plus the dedicated `writeip` writer); no clause rests on the command name, an enum name, a printed string, or the file comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "removeip",
  "type": "command",
  "description": "Removes a single address from the proxy's packet-filter list (the list managed by `addip`). The address must be written exactly the way it was added: a subnet entry can only be removed by giving that same subnet, not by naming one host inside it. The first entry matching that exact address is removed, whether it was added as a `ban` or a `safe` entry; if nothing matches, the list is left unchanged.\n\nremoveip <ip> = remove the filter entry for <ip>.\n\nLike `addip`, this changes only the in-memory list; use `writeip` afterward if you want the change persisted.\nSet by: server config / command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/ban.c:511 (Cmd_AddCommand(\"removeip\", SV_RemoveIP_f); handler SV_RemoveIP_f src/ban.c:203-227); file-top block comment src/ban.c:5-34 (mentions removeip :14,:18) is an upstream HINT, not a seed -> nothing to affirm, synthesize. Tree-wide grep: removeip only in src/ban.c. Clauses->cites: removes one entry from the filter list -> src/ban.c:218-221 (array shift + numipfilters-- + 'Removed.' + return) + reg :511; same list addip manages -> iterates static ipfilters[] src/ban.c:214 (the :56-57 array SV_AddIP_f writes); exact-match required (mask AND compare) -> src/ban.c:216 (ipfilters[i].mask==f.mask && ipfilters[i].compare==f.compare); subnet can't be removed by a host inside it -> :216 equality + mask derivation :123-124 (host mask != /24 subnet mask), verifies file comment 'cannot addip a subnet then removeip a single host'; removes EITHER ban or safe (type not in match) -> :216 has no type term; only FIRST match removed -> return :221 inside loop; not-found -> 'Didn't find' :226, list unchanged; bad address -> nothing removed :208-211; in-memory only / persist with writeip -> no save in remove handler + dedicated SV_WriteIP_f :263. WI-2 Set-by: qwfwd has no CF_ access flags, no rcon; Cmd_ExecuteString src/cmd.c:869-912 dispatches with no permission check; entry only via cfg exec (main.c:142, ban.c:520) + command line (Cmd_StuffCmds main.c:155); no interactive stdin loop (main.c:160-174) -> Set by: server config / command line (traced to dispatch, not name). COMMAND -> Default omitted (no-arg -> empty Cmd_Argv(1) -> 'Bad filter address' no-op). Contrasts recorded in reasoning, not user doc: removeip lacks addip's compare==0 guard (addip rejects 0.0.0.0 :151; removeip does not); separate newer banremove (SV_Cmd_Banremove_f :455-486) removes by numeric list-ID and refuses safe (:475) -- removeip is the legacy address-based remover with neither restriction; distinct commands, no See-also (banremove not an arc anchor). provenance=null (cold-synth, operator 2026-05-30). No C2 conflict. No SR-5 breadcrumb. Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
