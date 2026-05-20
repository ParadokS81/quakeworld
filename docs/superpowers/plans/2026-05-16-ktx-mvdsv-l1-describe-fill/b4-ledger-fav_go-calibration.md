# B4 ledger -- fav_go calibration cluster

CLUSTER_ID: `fav_go-calibration` (the FIRST B4 cluster, calibration run /
V-pass batch-0 analogue per decisions.md D7 Amendment 2026-05-19 / B4).

Source oracle: `/tmp/ktx-src-67253dc9` @ tag `1.47-2-g67253dc` (HARD GATE 1
verified). Cluster members: 14.

## Members (from `v-pass-stage-1-collation.md` fav_go family)

```
ktx:command:1fav_go        -- C-FIX
ktx:command:2fav_go        -- C-FIX
ktx:command:3fav_go        -- C-FIX
ktx:command:11fav_go       -- C-FIX
ktx:command:13fav_go       -- C-NEAR-MISS
ktx:command:15fav_go       -- C-FIX
ktx:command:16fav_go       -- C-FIX
ktx:command:18fav_go       -- C-FIX
ktx:command:20fav_go       -- C-FIX
ktx:command:fav_show       -- C-FIX
ktx:command:fav_add        -- WI2-FIX
ktx:command:fav_del        -- WI2-FIX
ktx:command:fav_all_del    -- WI2-FIX
ktx:command:fav_next       -- WI2-FIX
```

## Pre-reads (all loaded by the orchestrator at session start)

1. `~/.claude/skills/describe-fill-synthesis/SKILL.md`
2. `~/.claude/skills/describe-fill-synthesis/references/enforce-trace-discipline.md`
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/v-pass-stage-1-collation.md`
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` D7 Amendment 2026-05-19 (B1-B5)

## Cluster-shared root context (the MANDATORY synth-brief preamble per row)

ESTABLISHED at the source oracle 1.47-2-g67253dc by orchestrator re-grep
across batches 01 (20fav_go), 08 (3fav_go), and the per-row V-pass findings:

- `favN_add` for N=1..20 (registered via `DEF(favx_add)` at commands.c:842-865)
  is the per-slot populator. It writes `self->favx[N-1]` --
  commands.c:5732 `self->favx[(int)fav_num - 1] = diff;`.
- `Nfav_go` for N=1..20 (registered via `DEF(xfav_go)` at commands.c:866-885)
  is the per-slot consumer. It READS `self->favx[N-1]` --
  commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];`.
- The GENERIC `fav_add` (commands.c:886 -- distinct from favN_add!) writes
  a DIFFERENT array, `self->fav[]` -- commands.c:5613
  `self->fav[(int)fav_num - 1] = diff;`. That array is consumed by
  `fav_next` (commands.c:5793 `pl_num = self->fav[fav_num - 1];`), NOT by
  Nfav_go.
- No command literally named "Nfav_add" (digit-first) exists; the populator
  name pattern is `favN_add` (digit-last after the prefix).
- WI-2 cohort (fav_add, fav_del, fav_all_del, fav_next): the CF_MATCHLESS
  flag is ADDITIVE permission ("also valid in matchless mode"), NOT a
  match-block. Any "not during a match" / "blocked during matches" clause
  on these commands is a flavour-C WI-2.

This shared context is a MANDATORY input to every per-row D6 re-synth in
this cluster -- included verbatim in each synth sub-agent's seed brief.

## C4 constraint (non-negotiable)

NO DB writes. NO L1 row mutation. This ledger is the operator-gated input
to a separate L1-update step that this terminal NEVER takes.

---

## Results

(B4-RESULT lines appended as each row converges or halts. WAVE
boundaries marked as comments.)

<!-- WAVE 1 -- 5 rows, all first-attempt TRACED-CLEAN -->

B4-RESULT | ktx:command:11fav_go | TRACED-CLEAN | rev=1 | seed-clause: "Favourite slots are filled with fav<N>_add / fav_add" (populator conflation; the generic fav_add writes a different array consumed by fav_next, not Nfav_go) | new-clause: "The matching slot-11 populator is fav11_add; the generic fav_add command does NOT fill this slot -- it writes a separate favourites array consumed by fav_next."

### ktx:command:11fav_go
- canonical_id: ktx:command:11fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-06 C-FIX; wrong clause = "Favourite slots are filled with fav<N>_add / fav_add while tracking a player" generalises the populator; enforcing-line citation: commands.c:842-865 (favN_add registrations -> favx_add @ 5732 writes favx[]) vs commands.c:886 (`fav_add` -> @ 5614 writes self->fav[] consumed by fav_next @ 5793; different array).

- OLD description:
  > Spectator-only command. Switches the spectator's tracked view to the player stored in favourite slot 11 (the slot is fixed for this command, not an argument). Favourite slots are filled with fav<N>_add / fav_add while tracking a player; 11fav_go issues an internal track on the player saved in slot 11. If slot 11 is empty it prints "fav go: slot 11 is not defined"; if the saved player is no longer present it prints "fav go: slot 11 can't find player"; if already spectating that player it prints "fav go: already observing...". One of a fixed family 1fav_go..20fav_go, one command per favourite slot.

- NEW description:
  > Spectator-only command. Switches the spectator's tracked view to the player stored in personal favourites slot 11 (the slot is fixed for this command, not an argument). The matching slot-11 populator is fav11_add; the generic fav_add command does NOT fill this slot -- it writes a separate favourites array consumed by fav_next. If slot 11 is empty it prints "fav go: slot 11 is not defined"; if the saved player is no longer present it prints "fav go: slot 11 can't find player"; if already spectating that player it prints "fav go: already observing...". One of a fixed family 1fav_go..20fav_go, one command per favourite slot.

- NEW description_reasoning:
  > B4 re-synth addressing v-pass-ledger-batch-06.md C-FIX (the original "Favourite slots are filled with fav<N>_add / fav_add while tracking a player" clause conflated two DIFFERENT populators that write DIFFERENT arrays). Re-derived under enforce-trace discipline (D7 Amendment 2026-05-19 B1) at the 1.47-2-g67253dc oracle. The corrected populator-naming clause is enforce-traced to commands.c:856 `{ "fav11_add", DEF(favx_add), 11, CF_SPECTATOR, CD_FAV11_ADD }` and the favx_add handler at commands.c:5732 `self->favx[(int)fav_num - 1] = diff;` (writes the favx[] array that 11fav_go reads at commands.c:5831); the GENERIC fav_add command is registered separately at commands.c:886 and its handler at commands.c:5614 writes `self->fav[(int)fav_num - 1] = diff;` -- a DIFFERENT array that fav_next reads at commands.c:5793. Slot binding to 11 is enforced by the literal int arg in the cmds[] row at commands.c:876 plus the dispatcher's arg-pass at commands.c:1135. Spectator-only is enforced at commands.c:1091. Track effect at commands.c:5856. Each failure-mode string is enforced verbatim at commands.c:5835 / 5844 / 5851. Family scope 1fav_go..20fav_go enforced by commands.c:866-885. suspect_pool_member=FALSE; CD_11FAV_GO is CD_NODESC (no shipped user-doc comment). Not a D8 bot/judgment knob. No C2 conflict. The new clause names BOTH sides of the actual divergence (fav11_add fills it; the generic fav_add does NOT) to defuse the original conflation.

- NEW source_ref: src/commands.c:5821
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator-only command" -> src/commands.c:876 `{ "11fav_go", DEF(xfav_go), 11, CF_SPECTATOR, CD_11FAV_GO },` + src/commands.c:1091 `if (!(cmds[icmd].cf_flags & CF_SPECTATOR))` -> MATCH
  - "Switches the spectator's tracked view to the player stored in personal favourites slot 11" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + 5856 `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p));` -> MATCH
  - "the slot is fixed for this command, not an argument" -> src/commands.c:876 (arg literal 11) + 1135 `((void (*)(float))(cmds[icmd].f))(cmds[icmd].arg);` -> MATCH
  - "The matching slot-11 populator is fav11_add" -> src/commands.c:856 + 5732 (favx_add writes favx[]) -> MATCH
  - "the generic fav_add command does NOT fill this slot -- it writes a separate favourites array consumed by fav_next" -> src/commands.c:886 + 5614 (fav_add writes self->fav[]) + 5793 (fav_next reads self->fav[]) -> MATCH
  - "If slot 11 is empty it prints \"fav go: slot 11 is not defined\"" -> src/commands.c:5833-5835 -> MATCH
  - "if the saved player is no longer present it prints \"fav go: slot 11 can't find player\"" -> src/commands.c:5842-5844 -> MATCH
  - "if already spectating that player it prints \"fav go: already observing...\"" -> src/commands.c:5849-5851 -> MATCH
  - "One of a fixed family 1fav_go..20fav_go" -> src/commands.c:866-885 (20 contiguous rows) -> MATCH
- orchestrator HG2 re-grep: confirmed at HEAD 67253dc -- favN_add block 842-865 (all 20 entries DEF(favx_add)); Nfav_go block 866-885 (all 20 entries DEF(xfav_go)); favx_add write site `self->favx[(int)fav_num - 1] = diff;` (5732) vs fav_add write site `self->fav[(int)fav_num - 1] = diff;` (5614); xfav_go reads favx[] (5831), fav_next reads fav[] (5793); progs.h:1009-1010 declares the two arrays as DISTINCT fields with adjacent comments naming the disjoint command pairings. Seed correctly addressed.
- attempts: 1

---

B4-RESULT | ktx:command:13fav_go | TRACED-CLEAN | rev=1 | seed-clause: "the slot-indexed favourites list populated by the fav-add commands" (family-name inference, no enforcing line on the generalised "fav-add commands") | new-clause: "the slot populated by fav13_add, which writes the spectator's slot-indexed favx[] array"

### ktx:command:13fav_go
- canonical_id: ktx:command:13fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-08 C-NEAR-MISS; wrong clause = "the slot-indexed favourites list populated by the fav-add commands" -- no enforcing line ties slot 13 to a generic "fav-add commands"; only fav13_add writes favx[12] (commands.c:858 -> 5732); the plain fav_add at 5613 writes self->fav[], a different array consumed by fav_next, NOT xfav_go.

- OLD description:
  > Spectator-only command. Switches the spectator's point of view to the player stored in personal favourite slot 13 (the slot-indexed favourites list populated by the fav-add commands), by issuing a track on that player's user id. If slot 13 is empty it prints "fav go: slot 13 is not defined"; if the stored player is no longer connected it prints "fav go: slot 13 can't find player"; if already spectating that player it prints "fav go: already observing...". One of the 1fav_go..20fav_go family, identical behaviour per slot index 1-20.

- NEW description:
  > Spectator-only command. Switches the spectator's point of view to the player stored in personal favourite slot 13 (the slot populated by fav13_add, which writes the spectator's slot-indexed favx[] array). The POV switch is issued as a track on that player's user id. If slot 13 is empty it prints "fav go: slot 13 is not defined"; if the stored player is no longer connected it prints "fav go: slot 13 can't find player"; if already spectating that player it prints "fav go: already observing...". One of the 1fav_go..20fav_go family, identical behaviour per slot index 1-20.

- NEW description_reasoning:
  > CD_13FAV_GO at the registration site (commands.c:878) resolves to CD_NODESC = "no desc" -- not a user description; fails D5 clauses; mechanical_candidate is none -> synthesize. B4 re-synth under D7 Amendment 2026-05-19 (B1) enforce-trace discipline addressing the V-pass C-NEAR-MISS: the prior populator clause was a family-name inference. The only command that enforces a write to self->favx[12] is fav13_add: registered at commands.c:858 with literal arg 13 dispatching to favx_add, whose handler writes self->favx[(int)fav_num-1] = diff at commands.c:5732. Per-clause trace: spectator-only enforced at commands.c:1091; slot 13 specifically by literal arg 13 at commands.c:878 + xfav_go read at 5831; POV-switch by commands.c:5856 stuffcmd_flags("track %d", GetUserID(p)); three failure messages at 5833/5842/5849; family scope by 866-885. source_ref at the handler line exhibiting the POV switch.

- NEW source_ref: src/commands.c:5856
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator-only command" -> src/commands.c:878 `{ "13fav_go", DEF(xfav_go), 13, CF_SPECTATOR, ... }` + 1090-1093 -> MATCH
  - "Switches the spectator's point of view to the player stored in personal favourite slot 13" -> src/commands.c:5831 `pl_num = self->favx[(int)fav_num - 1];` + 1135 + 878 (arg=13 -> favx[12]) -> MATCH
  - "the slot populated by fav13_add, which writes the spectator's slot-indexed favx[] array" -> src/commands.c:858 `{ "fav13_add", DEF(favx_add), 13, CF_SPECTATOR, ... }` + 5732 `self->favx[(int)fav_num - 1] = diff;` -> MATCH
  - "The POV switch is issued as a track on that player's user id" -> src/commands.c:5856 -> MATCH
  - "If slot 13 is empty it prints 'fav go: slot 13 is not defined'" -> src/commands.c:5833-5835 -> MATCH
  - "if the stored player is no longer connected it prints 'fav go: slot 13 can't find player'" -> src/commands.c:5842-5844 -> MATCH
  - "if already spectating that player it prints 'fav go: already observing...'" -> src/commands.c:5849-5851 -> MATCH
  - "One of the 1fav_go..20fav_go family" -> src/commands.c:866-885 -> MATCH
- orchestrator HG2 re-grep: confirmed (same cluster-wide grep batch as 11fav_go). fav13_add at line 858 binds arg=13 to DEF(favx_add); no other command writes self->favx[12].
- attempts: 1

---

B4-RESULT | ktx:command:15fav_go | TRACED-CLEAN | rev=1 | seed-clause: "fav15_add (or fav_add into the next free slot)" (the "or fav_add" branch conflates the two distinct arrays) | new-clause: "filled beforehand by the matching per-slot populator command fav15_add ... the generic fav_add command does NOT populate this slot (it writes a separate \"fav\" cycle list consumed by fav_next, not the per-slot favx array)"

### ktx:command:15fav_go
- canonical_id: ktx:command:15fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-03 C-FIX; wrong clause = "(or fav_add into the next free slot)" -- the generic fav_add does NOT fill the favx[] slot 15fav_go reads; only fav15_add does (commands.c:860 -> 5732 writes favx[14]) while fav_add (commands.c:886 -> 5614) writes self->fav[].

- OLD description:
  > Spectator-only command (CF_SPECTATOR). Switches your spectator view to track the player saved in favourite slot 15. The slot is filled beforehand with fav15_add (or fav_add into the next free slot), which stores whoever you are currently tracking. If slot 15 is empty it prints "slot 15 is not defined"; if the saved player is no longer present it prints "slot 15 can't find player"; if you are already viewing that player it prints "already observing". On success it issues an internal track command to that player's user id. Slots are 1-20 (one fixed command per slot: 1fav_go..20fav_go); this is the slot-15 instance.

- NEW description:
  > Spectator-only command (CF_SPECTATOR). Switches your spectator view to track the player saved in favourite slot 15. The slot is filled beforehand by the matching per-slot populator command fav15_add, which stores whoever you are currently tracking into that slot; the generic fav_add command does NOT populate this slot (it writes a separate "fav" cycle list consumed by fav_next, not the per-slot favx array). If slot 15 holds no player it prints a "fav go: slot 15 is not defined" message; if the stored entity is no longer a connected player it prints "fav go: slot 15 can't find player"; if you are already tracking that player it prints "fav go: already observing...". On success it issues an internal "track <userid>" stuffcmd to your client to repoint the spectator view. Slots are addressed by a fixed family of 20 per-slot consumer commands 1fav_go..20fav_go (one command per slot, with the slot number baked into the command argument); this is the slot-15 instance.

- NEW description_reasoning:
  > B4 re-synth under enforce-trace discipline (D7 Amendment 2026-05-19/B1) addressing v-pass-ledger-batch-03 C-FIX. Family-level fact verified at HEAD 67253dc: favx_add (commands.c:5713-5732) is the per-slot populator writing self->favx[N-1]; registered as fav1_add..fav20_add at lines 846-865 (slot 15 = "fav15_add" at line 860). xfav_go (commands.c:5821-5856) reads self->favx[N-1] at 5831; registered as 1fav_go..20fav_go at 866-885 (slot 15 at line 880). The generic fav_add (commands.c:886 / 5577) is a DIFFERENT command writing self->fav[] (5614) consumed by fav_next (5793), NOT xfav_go. CF_SPECTATOR enforced at DoCommand line 1091. Three failure G_sprint sites at 5835/5844/5851 and one success stuffcmd at 5856. The user-visible slot space is 1-20 (the registered command family).

- NEW source_ref: src/commands.c:5831
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator-only command (CF_SPECTATOR)" -> src/commands.c:880 + 1091 -> MATCH
  - "Switches your spectator view to track the player saved in favourite slot 15" -> src/commands.c:5831 + 5856 -> MATCH
  - "slot is filled beforehand by the matching per-slot populator command fav15_add" -> src/commands.c:860 + 5732 -> MATCH
  - "which stores whoever you are currently tracking into that slot" -> src/commands.c:5715 + 5732 -> MATCH
  - "the generic fav_add command does NOT populate this slot" -> src/commands.c:5614 (writes self->fav, not self->favx) -> MATCH
  - "it writes a separate \"fav\" cycle list consumed by fav_next, not the per-slot favx array" -> src/commands.c:5765 + 5793 -> MATCH
  - "fav go: slot 15 is not defined / can't find player / already observing..." -> src/commands.c:5833-5851 -> MATCH
  - "On success it issues an internal \"track <userid>\" stuffcmd to your client" -> src/commands.c:5856 -> MATCH
  - "fixed family of 20 per-slot consumer commands 1fav_go..20fav_go" -> src/commands.c:866-885 -> MATCH
  - "with the slot number baked into the command argument" -> src/commands.c:1133-1135 -> MATCH
  - "this is the slot-15 instance" -> src/commands.c:880 (arg=15) -> MATCH
- orchestrator HG2 re-grep: confirmed (cluster-wide grep batch). fav15_add at line 860 binds arg=15 to DEF(favx_add); no other command writes self->favx[14].
- attempts: 1

---

B4-RESULT | ktx:command:16fav_go | TRACED-CLEAN | rev=1 | seed-clause: "fav16_add (or fav_add for the next free slot)" (the "or fav_add" branch conflates two distinct arrays) | new-clause: "Slot 16 is filled by first tracking a player and then running `fav16_add` (each per-slot populator `favN_add` writes its own slot N; the unrelated `fav_add` populates a separate list used by `fav_next`, not by this command)"

### ktx:command:16fav_go
- canonical_id: ktx:command:16fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-09 C-FIX; wrong clause = "or fav_add for the next free slot" -- the generic fav_add (commands.c:886 -> 5614) writes self->fav[] which fav_next consumes (5793), NOT the favx[] slot 16fav_go reads at 5831. Only fav16_add (commands.c:861 -> 5732) populates favx[15].

- OLD description:
  > Spectator-only command that switches your point of view to the player stored in favorites slot 16. Favorites slots are filled by tracking a player and running fav16_add (or fav_add for the next free slot); 16fav_go then issues a track to that saved player. Prints "slot 16 is not defined" if the slot is empty, "slot 16 can't find player" if the saved player is no longer connected, and "already observing..." if you are already tracking that player. Takes no arguments (the slot number is fixed at 16).

- NEW description:
  > Spectator-only command that switches your point of view to the player stored in favorites slot 16. Slot 16 is filled by first tracking a player and then running `fav16_add` (each per-slot populator `favN_add` writes its own slot N; the unrelated `fav_add` populates a separate list used by `fav_next`, not by this command). `16fav_go` then issues a `track` to that saved player. Prints "slot 16 is not defined" if the slot is empty, "slot 16 can't find player" if the saved player is no longer connected, and "already observing..." if you are already tracking that player. Takes no arguments (the slot number is fixed at 16).

- NEW description_reasoning:
  > D5 Step 3: shipped CD_16FAV_GO macro is `(CD_NODESC) // skip` at commands.c:501 -- no shipped user-doc, synthesis required. B4 re-synth: V-pass batch-09 flagged C-FIX on the slot-population clause. The generic fav_add (commands.c:886, body 5577) writes self->fav[] (5614) consumed by fav_next (5793), a DIFFERENT array than self->favx[] (5831) read by xfav_go. Re-derived full description under B1 enforce-trace. Per-clause: spectator-only -> CF_SPECTATOR at 881 + dispatcher check at 1091; slot-16 read -> 5831 with fav_num=16 from 881 / 1135 dispatch; population -> 861 (fav16_add registration -> favx_add) feeding 5732; track-first precondition -> 5723; "unrelated fav_add" disambiguation -> 5614 + 5793. Three error/idempotent branches -> 5833-5835 / 5842-5844 / 5849-5851. Track stuffcmd -> 5856. Fixed-arg -> 881 (arg=16). All clauses enforce-trace clean.

- NEW source_ref: src/commands.c:5831
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator-only" -> src/commands.c:881 + 1091-1093 -> MATCH
  - "Reads slot 16 (favx[15])" -> src/commands.c:5831 (fav_num=16 from 881) -> MATCH
  - "fav16_add fills slot 16 from current track target" -> src/commands.c:861 + 5715 + 5723 + 5732 -> MATCH
  - "Each favN_add writes its own slot N" -> src/commands.c:846-865 (20 rows) + 5732 -> MATCH
  - "fav_add populates a SEPARATE list used by fav_next, not by this command" -> src/commands.c:5614 (fav_add writes ->fav[]) + 5793 (fav_next reads ->fav[]) vs 5831 (xfav_go reads ->favx[]) -> MATCH
  - "Issues a track to that saved player" -> src/commands.c:5856 -> MATCH
  - "'slot 16 is not defined / can't find player / already observing...'" -> src/commands.c:5833-5851 -> MATCH
  - "Takes no arguments; slot number fixed at 16" -> src/commands.c:881 + 1133-1135 -> MATCH
- orchestrator HG2 re-grep: confirmed (cluster-wide grep batch). fav16_add at line 861 binds arg=16 to DEF(favx_add); no other command writes self->favx[15].
- attempts: 1

---

B4-RESULT | ktx:command:18fav_go | TRACED-CLEAN | rev=1 | seed-clause: "1-20 slot-based favourites list managed by fav_add / fav_del / fav_show" + "5fav_go..20fav_go" (TWO wrong clauses: populator generalisation AND wrong family range) | new-clause: "slot 18 of the slot-based favourites array (self->favx[], distinct from the non-slot favourites list used by fav_add / fav_next). Slot 18 is populated by fav18_add ... this is the slot-18 form of the Nfav_go family (1fav_go..20fav_go)"

### ktx:command:18fav_go
- canonical_id: ktx:command:18fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-08 C-FIX; TWO wrong clauses: (a) "managed by fav_add / fav_del / fav_show" -- those commands write self->fav[] (5614 / fav_del_do 5639) or only partially touch favx[] (fav_show display loop 5882); the populator for favx[] is favN_add not fav_add. (b) family range "5fav_go..20fav_go" -- the registration block 866-885 enumerates 1fav_go..20fav_go (twenty entries; range starts at 1, not 5).

- OLD description:
  > Spectator command (CF_SPECTATOR): switches your spectated point of view to the player stored in favourites slot 18. Slots are the 1-20 slot-based favourites list managed by fav_add / fav_del / fav_show; this is the fixed-slot-18 form of the Nfav_go family (5fav_go..20fav_go). On success it issues an internal 'track <userid>' to follow that player. If slot 18 is empty, the saved player is no longer connected, or you are already observing them, it does nothing except print a 'fav go: slot 18 ...' status message. Takes no arguments (the slot number is fixed by the command name).

- NEW description:
  > Spectator command (CF_SPECTATOR): switches your spectated point of view to the player stored in slot 18 of the slot-based favourites array (self->favx[], distinct from the non-slot favourites list used by fav_add / fav_next). Slot 18 is populated by fav18_add (which captures whoever you are currently observing into favx[17]); this is the slot-18 form of the Nfav_go family (1fav_go..20fav_go). On success it issues an internal 'track <userid>' to follow that player. If slot 18 is empty, the saved player is no longer a connected player, or you are already observing them, it does nothing except print a 'fav go: ...' status message. Takes no arguments (the slot number is fixed by the command name).

- NEW description_reasoning:
  > Pre-flight PASS: registration commands.c:883. CD_18FAV_GO -> (CD_NODESC) // skip; no user-doc -- synthesis required. B4 seeded re-synth addressing two V-pass C-FIX clauses: (a) prior text said "managed by fav_add / fav_del / fav_show" -- WRONG; those operate on the DIFFERENT self->fav[] array (5614, 5639); slot 18 of favx[] is populated by fav18_add (862 -> favx_add at 5713 writing favx[17] at 5732), and progs.h:1009 explicitly documents the favx[]<->favX_add/Xfav_go pairing vs progs.h:1010 fav[]<->fav_add/fav_next. (b) prior text said family is "5fav_go..20fav_go" -- WRONG; registrations at 866-885 enumerate 1..20. Corrected text per-clause: CF_SPECTATOR at 883; favx[17] read at 5831; family enumeration at 866-885; populator fav18_add at 862 writing favx[17] via favx_add at 5732; track-stuffcmd at 5856; guards at 5832-5853; status prints at 5834/5843/5850 (the third lacks a slot number, so the description says "fav go: ..." not "fav go: slot 18 ..."); fixed-arg dispatch at 1135.

- NEW source_ref: src/commands.c:5831
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator command (CF_SPECTATOR)" -> src/commands.c:883 -> MATCH
  - "switches your spectated point of view to the player stored in slot 18" -> src/commands.c:5831 + 5856 -> MATCH
  - "slot-based favourites array (self->favx[])" -> include/progs.h:1009 `int favx[MAX_CLIENTS]; // ... for appropriate favX_add/Xfav_go commands` -> MATCH
  - "distinct from the non-slot favourites list used by fav_add / fav_next" -> include/progs.h:1010 + src/commands.c:5614 -> MATCH
  - "Slot 18 is populated by fav18_add" -> src/commands.c:863 + 5732 -> MATCH
  - "(which captures whoever you are currently observing into favx[17])" -> src/commands.c:5715 + 5732 (fav_num=18 -> idx 17) -> MATCH
  - "slot-18 form of the Nfav_go family (1fav_go..20fav_go)" -> src/commands.c:866-885 (twenty rows, args 1..20) -> MATCH
  - "On success it issues an internal 'track <userid>'" -> src/commands.c:5856 -> MATCH
  - "If slot 18 is empty" -> src/commands.c:5833-5835 -> MATCH
  - "the saved player is no longer a connected player" -> src/commands.c:5842-5846 -> MATCH
  - "or you are already observing them" -> src/commands.c:5849-5853 -> MATCH
  - "print a 'fav go: ...' status message" (collapsed three-branch) -> src/commands.c:5835/5844/5851 -> MATCH
  - "Takes no arguments (the slot number is fixed by the command name)" -> src/commands.c:883 + 1133-1135 -> MATCH
- orchestrator HG2 re-grep: confirmed (cluster-wide grep batch + progs.h:1009-1010 declaration comments). fav18_add at line 863 (offset 22 in the 842-block sed) binds arg=18 to DEF(favx_add); the family registration block enumerates exactly 1fav_go..20fav_go.
- attempts: 1

<!-- WAVE 1 END -- 5/5 TRACED-CLEAN, all rev=1, all HG2 PASS. Cluster-shared root validated. -->

<!-- WAVE 2 -- 5 rows. 2 first-attempt TRACED-CLEAN (2fav_go, 3fav_go);
     3 needed attempt-2 (1fav_go, 20fav_go, fav_add) -- attempt-1 introduced
     NEW flavour-C from synth elaborations beyond seed scope. Re-dispatch
     used DISCRIMINATION-toward-enforcing-line briefs, NOT anti-flag briefs
     (per decisions.md D7 Amendment B4 + V-pass batch-03 FAILURE-B). -->

B4-RESULT | ktx:command:1fav_go | TRACED-CLEAN | rev=2 | seed-clause: "slot 1 is filled by the matching '1fav_add' command" (digit-first; no such command registered) | new-clause: "Slot 1 is filled by the matching `fav1_add` command" (digit-LAST per the favN_add pattern enforced at commands.c:846)

### ktx:command:1fav_go
- canonical_id: ktx:command:1fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-06 C-FIX; wrong clause = "slot 1 is filled by the matching '1fav_add' command" -- no command literally named "1fav_add" (digit-first) is registered; the registered populator is `fav1_add` (commands.c:846 -> favx_add @ 5732 writes favx[0]).
- attempt-1 rejection reason (C-FIX from blind verify): attempt-1 correctly addressed the seed (fav1_add) but ADDED a new flavour-C clause "(ignored when running inside a demo)" inferred from the flag NAME STUFFCMD_IGNOREINDEMO. The flag's actual semantic per g_syscalls.h:57 is "do not put in mvd demo" (omit-from-MVD-recording), NOT ignore-during-demo-playback. Attempt-2 brief sharpened: cite g_syscalls.h:57 verbatim if mentioning the flag; safe to omit.

- OLD description:
  > Spectator-only command that switches your point of view to the player saved in favorites slot 1. The favorites slots are a per-spectator list; slot 1 is filled by the matching '1fav_add' command (run while tracking a player). If slot 1 is empty it prints "fav go: slot 1 is not defined"; if the saved player has since left it prints "fav go: slot 1 can't find player"; if you are already tracking that player it prints "fav go: already observing...". On success it issues an internal track of the stored player's user id.

- NEW description (attempt-2):
  > Spectator-only command that switches your POV to the player saved in favourites slot 1. Slot 1 is filled by the matching `fav1_add` command, which must be run while you are tracking a player; running `fav1_add` while not tracking a player prints `fav add: you are not tracking player!` and stores nothing. If slot 1 is empty `1fav_go` prints `fav go: slot 1 is not defined`; if the stored player has since left it prints `fav go: slot 1 can't find player`; if you are already tracking that player it prints `fav go: already observing...`. On success it issues a `track <userid>` stuffcmd against your own spectator client so your POV follows the stored player.

- NEW description_reasoning:
  > Attempt-2 synth: re-derived per D6/D7 from read use-sites. Spectator-only at CF_SPECTATOR flag commands.c:866 + dispatcher 1091/1106. fav1_add registration at commands.c:846 dispatches to favx_add at 5713; favx_add's tracking precondition at 5723 `(goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)` and "fav add: you are not tracking player!" error at 5725 verified. Three xfav_go messages verbatim at 5835/5844/5851. track stuffcmd at 5856; `self` first arg targets the invoking spectator's own client. STUFFCMD_IGNOREINDEMO at g_syscalls.h:57 = "do not put in mvd demo" (MVD-recording suppression, not demo-playback) -- OMITTED from the description rather than risk a flag-name inversion (the attempt-1 defect).

- NEW source_ref: src/commands.c:5821
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN (attempt-2)
- re-V per-clause table (attempt-2):
  - "Spectator-only command" -> src/commands.c:866 -> MATCH
  - "switches your POV to the player saved in favourites slot 1" -> src/commands.c:5831 + 5856 -> MATCH
  - "Slot 1 is filled by the matching fav1_add command" -> src/commands.c:846 + 5732 -> MATCH
  - "must be run while you are tracking a player" -> src/commands.c:5723 -> MATCH
  - "prints `fav add: you are not tracking player!` and stores nothing" -> src/commands.c:5725-5727 -> MATCH
  - "If slot 1 is empty 1fav_go prints `fav go: slot 1 is not defined`" -> src/commands.c:5833-5835 -> MATCH
  - "if the stored player has since left it prints `fav go: slot 1 can't find player`" -> src/commands.c:5842-5844 -> MATCH
  - "if you are already tracking that player it prints `fav go: already observing...`" -> src/commands.c:5849-5851 -> MATCH
  - "issues a `track <userid>` stuffcmd" -> src/commands.c:5856 -> MATCH
  - "against your own spectator client" -> src/commands.c:5856 first arg `self` -> MATCH
- orchestrator HG2 re-grep: confirmed (Wave 1 cluster-wide grep covers fav1_add/favN_add + xfav_go/favx[]). Targeted re-grep on the new precondition clause: commands.c:5723 `if ((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS))` + 5725 `"fav add: you are %s player!\n", redtext("not tracking")` + 5727 `return;` -- the tracking-precondition path and its message are verbatim from source. Attempt-1's demo-flag inversion successfully removed in attempt-2.
- attempts: 2

---

B4-RESULT | ktx:command:2fav_go | TRACED-CLEAN | rev=1 | seed-clause: "per-client slots populated by fav2_add / fav_add" (fav_add does not populate slot 2; it writes self->fav[] consumed by fav_next) | new-clause: "the per-client slot array populated by fav2_add"

### ktx:command:2fav_go
- canonical_id: ktx:command:2fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-05 C-FIX; wrong clause = "fav2_add / fav_add" -- fav_add writes self->fav[] @ 5614, not self->favx[]; only fav2_add populates favx[1] for 2fav_go.

- OLD description:
  > Spectator point-of-view command: switches the spectator's view to track the player stored in favorite slot 2 of their personal favorites list (the per-client slots populated by fav2_add / fav_add). Usable only while spectating. If slot 2 is empty or the stored player is no longer in the game, it prints a "slot 2 is not defined" or "can't find player" message and does nothing; if already tracking that player, it reports "already observing" and does nothing. The leading number is the slot index (2 here); sibling commands 1fav_go through 20fav_go target slots 1-20.

- NEW description:
  > Spectator point-of-view command: switches the spectator's view to track the player stored in favorite slot 2 of their personal favorites list (the per-client slot array populated by fav2_add). Usable only while spectating. If slot 2 is empty or the stored player is no longer in the game, it prints a "slot 2 is not defined" or "can't find player" message and does nothing; if already tracking that player, it reports "already observing" and does nothing. The leading number is the slot index (2 here); sibling commands 1fav_go through 20fav_go target slots 1-20.

- NEW description_reasoning:
  > B4 seeded re-synth following V-pass C-FIX (batch-05). Dropped "/ fav_add" -- the generic fav_add writes the SEPARATE self->fav[] array (5614), consumed only by fav_next (5793), not by Nfav_go. progs.h:1009-1010 makes the partition explicit. xfav_go at 5831 reads self->favx[fav_num-1], so the sole slot-2 populator is fav2_add (commands.c:847 dispatching favx_add with arg=2, writing self->favx[1] at 5732). All other clauses traced clean.

- NEW source_ref: src/commands.c:5821
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "switches the spectator's view to track the player stored in favorite slot 2" -> src/commands.c:5831 + 5856 -> MATCH
  - "the per-client slot array populated by fav2_add" -> src/commands.c:847 + 5732 + progs.h:1009 -> MATCH
  - "Usable only while spectating" -> src/commands.c:867 CF_SPECTATOR + 1088-1117 -> MATCH
  - "slot 2 empty / player gone / already tracking" messages -> 5833-5854 -> MATCH
  - "leading number = slot index; siblings 1fav_go..20fav_go" -> 866-885 + 867 + 5826 + 5831 -> MATCH
- orchestrator HG2 re-grep: confirmed (Wave 1 cluster-wide grep). fav2_add at line 847 binds arg=2 to DEF(favx_add); generic fav_add writes self->fav[] not self->favx[].
- attempts: 1

---

B4-RESULT | ktx:command:3fav_go | TRACED-CLEAN | rev=1 | seed-clause: "fav3_add / fav_add commands" (fav_add does not populate slot 3) | new-clause: "the slot is populated beforehand by the `fav3_add` command"

### ktx:command:3fav_go
- canonical_id: ktx:command:3fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-08 C-FIX; wrong clause = "fav3_add / fav_add commands" -- fav_add does not populate slot 3.

- OLD description:
  > Spectator command: switches your point of view to whichever player is stored in favourites slot 3. The slot is populated beforehand by the fav3_add / fav_add commands. If slot 3 holds no player it prints "slot 3 is not defined"; if the stored player is no longer an active player it prints "can't find player"; if you are already observing that player it does nothing. Spectator-only (CF_SPECTATOR). One of the per-slot family 1fav_go..20fav_go, identical behavior with the slot number fixed to 3.

- NEW description:
  > Spectator command: switches your point of view to whichever player is stored in favourites slot 3. The slot is populated beforehand by the `fav3_add` command. If slot 3 holds no player it prints "slot 3 is not defined"; if the stored player is no longer an active player it prints "can't find player"; if you are already observing that player it does nothing. Spectator-only (CF_SPECTATOR). One of the per-slot family 1fav_go..20fav_go, identical behavior with the slot number fixed to 3.

- NEW description_reasoning:
  > B4 seeded re-synth of the V-pass C-FIX. Replaced "fav3_add / fav_add" with `fav3_add` alone: fav_add (commands.c:5577) writes self->fav[] (5614, the AUTO list consumed by fav_next at 5793), NOT self->favx[] (read by xfav_go at 5831). The only command that writes the slot-3 cell self->favx[2] is fav3_add (commands.c:848 dispatching favx_add with arg=3, writing at 5732). All other clauses re-traced clean.

- NEW source_ref: src/commands.c:868
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator command" -> src/commands.c:868 + 1091/1106 -> MATCH
  - "switches your point of view to whichever player is stored in favourites slot 3" -> src/commands.c:5856 + 5831 -> MATCH
  - "slot is populated beforehand by the `fav3_add` command" -> src/commands.c:848 + 5732 -> MATCH
  - "If slot 3 holds no player ... 'slot 3 is not defined'" -> src/commands.c:5833-5835 -> MATCH
  - "if the stored player is no longer an active player ... 'can't find player'" -> src/commands.c:5842-5844 -> MATCH
  - "if you are already observing that player it does nothing" -> src/commands.c:5849-5853 -> MATCH (print-and-return)
  - "Spectator-only (CF_SPECTATOR)" -> src/commands.c:868 + 1091/1106 -> MATCH
  - "One of the per-slot family 1fav_go..20fav_go" -> src/commands.c:866-885 -> MATCH
  - "identical behavior with the slot number fixed to 3" -> src/commands.c:868 (arg=3) + handler 5821-5857 -> MATCH
- orchestrator HG2 re-grep: confirmed (Wave 1 cluster-wide grep). fav3_add at line 848 writes favx[2].
- attempts: 1

---

B4-RESULT | ktx:command:20fav_go | TRACED-CLEAN | rev=2 | seed-clause: "(assigned beforehand via 20fav_add/fav_add)" (no command "20fav_add" exists; fav_add writes a different array) | new-clause: "(the slot populated beforehand by `fav20_add`, which writes the currently tracked player into the per-slot favx[] array at index 19)"

### ktx:command:20fav_go
- canonical_id: ktx:command:20fav_go
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-01 C-FIX; wrong clause = "20fav_add/fav_add" -- both populator names wrong (20fav_add unregistered; fav_add writes wrong array). Sole populator is `fav20_add` at commands.c:865.
- attempt-1 rejection reason (C-FIX from blind verify): attempt-1 correctly used `fav20_add`, but ADDED two NEW flavour-C clauses: (a) "If the slot 20 number is out of range it silently does nothing" -- cited the generic xfav_go bounds check at 5826-5829, but for 20fav_go fav_num is HARD-WIRED to 20 by the dispatch table (885), so 20 < 1 || 20 > MAX_CLIENTS=32 is unreachable; (b) "the same list fav20_add and fav_show operate on" -- fav_show iterates BOTH favx[] AND fav[], scope-narrowing. Attempt-2 brief sharpened: drop dead-code clause; phrase the array-distinction without misnaming fav_show's scope.

- OLD description:
  > Spectator command: switches your tracked point-of-view to the player stored in personal favourites slot 20 (assigned beforehand via 20fav_add/fav_add). If slot 20 is empty or its stored player is no longer connected, it prints a "slot 20 is not defined" / "can't find player" notice and does nothing; if you are already tracking that player it reports "already observing". One such command exists per favourites slot (1fav_go..20fav_go).

- NEW description (attempt-2):
  > Spectator command: switches your tracked point-of-view to the player stored in personal favourites slot 20 (the slot populated beforehand by `fav20_add`, which writes the currently tracked player into the per-slot favx[] array at index 19). If slot 20 is empty it prints "slot 20 is not defined" and does nothing; if the slot's stored player is no longer connected as a real player it prints "slot 20 can't find player"; if you are already observing that player it prints "already observing". Otherwise it issues a `track <userid>` command to switch your view to that player. One such command exists per favourites slot (1fav_go..20fav_go); the per-slot favx[] array is distinct from the auto-list self->fav[] that the unrelated `fav_add` writes and `fav_next` consumes.

- NEW description_reasoning:
  > Attempt-2 synth: dropped the attempt-1 dead-code "out of range" clause (the bounds check at commands.c:5826 is unreachable for fav_num=20 hard-wired at the dispatch table 885); replaced the attempt-1 fav_show-scope-narrowing clarifier with an array-distinction phrasing that names the actual writer/consumer pairs for each array (favx[] populated by favN_add, read by Nfav_go; self->fav[] written by fav_add, consumed by fav_next). All retained behavior clauses (5833/5842/5849/5856) are reachable when fav_num=20.

- NEW source_ref: src/commands.c:5821
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN (attempt-2)
- re-V per-clause table (attempt-2):
  - "Spectator command" -> src/commands.c:885 + 1091 -> MATCH
  - "switches your tracked point-of-view to the player stored in personal favourites slot 20" -> src/commands.c:5831 + 5856 -> MATCH
  - "the slot populated beforehand by `fav20_add`" -> src/commands.c:865 -> MATCH
  - "which writes the currently tracked player into the per-slot favx[] array at index 19" -> src/commands.c:5715 + 5732 (fav_num=20 -> idx 19) -> MATCH
  - "If slot 20 is empty ... 'slot 20 is not defined'" -> src/commands.c:5833-5837 -> MATCH
  - "if the slot's stored player is no longer connected as a real player ... 'slot 20 can't find player'" -> src/commands.c:5842-5846 + progs.h ctPlayer -> MATCH
  - "if you are already observing that player ... 'already observing'" -> src/commands.c:5849-5853 -> MATCH
  - "Otherwise it issues a `track <userid>` command" -> src/commands.c:5856 -> MATCH
  - "One such command exists per favourites slot (1fav_go..20fav_go)" -> src/commands.c:866-885 -> MATCH
  - "the per-slot favx[] array is distinct from the auto-list self->fav[]" -> progs.h:1009-1010 -> MATCH
  - "the unrelated `fav_add` writes" -> src/commands.c:5614 -> MATCH
  - "and `fav_next` consumes" -> src/commands.c:5743/5765/5793 -> MATCH
- orchestrator HG2 re-grep: confirmed (Wave 1 cluster-wide grep). Targeted re-grep on the corrected array-distinction: fav_next handler at commands.c:5735 reads self->fav[] at 5743 and 5793, NOT self->favx[]; consistent with the attempt-2 phrasing.
- attempts: 2

---

B4-RESULT | ktx:command:fav_add | TRACED-CLEAN | rev=2 | seed-clause: "not during a match" (CF_MATCHLESS additive permission misread as match-block) | new-clause: dropped match-state claim; spectator-only retained via CF_SPECTATOR

### ktx:command:fav_add
- canonical_id: ktx:command:fav_add
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-01 WI2-FIX; wrong clause = "not during a match" -- CF_MATCHLESS at commands.c:886 is ADDITIVE permission (interpreted at commands.c:1078), NOT a match-block. No CF_MATCHLESS_ONLY; no match_in_progress guard in DoCommand or fav_add. Spectator-only half correct.
- attempt-1 rejection reason (C-FIX from blind verify): attempt-1 correctly dropped "not during a match" and kept spectator-only, but ADDED a NEW flavour-C clause "(distinct from the per-slot favx[] populated by 1fav_add..20fav_add and read by 1fav_go..20fav_go)" -- "1fav_add..20fav_add" (digit-FIRST) inverted the registered populator pattern (registered names are `fav1_add..fav20_add`, digit-LAST per the favN_add convention). Attempt-2 brief sharpened: use the EXACT registered name patterns (fav1_add..fav20_add for populators, 1fav_go..20fav_go for consumers).

- OLD description:
  > Spectator command (usable only by spectators and not during a match). Adds the player the spectator is currently tracking (point-of-view target) to that spectator's personal favourites list, placing them in the first free slot. Reports an error if the spectator is not tracking a player, if that player is already on the list, or if all favourites slots are full.

- NEW description (attempt-2):
  > Spectator command (usable only by spectators). Adds the player the spectator is currently tracking (point-of-view target) to that spectator's personal favourites list at self->fav[], placing them in the first free slot, for later cycling by fav_next (distinct from the per-slot favx[] populated by fav1_add..fav20_add and read by 1fav_go..20fav_go). Reports an error if the spectator is not tracking a player, if that player is already on the list, or if all favourites slots are full.

- NEW description_reasoning:
  > Attempt-2 synth: WI-2 fix preserved (dropped "not during a match"; kept spectator-only via CF_SPECTATOR at 886 + dispatcher 1091). Array-distinction clarifier now uses the EXACT registered names: populators `fav1_add..fav20_add` (digit-LAST, commands.c:846-865) dispatching to favx_add; consumers `1fav_go..20fav_go` (digit-FIRST, commands.c:866-885) dispatching to xfav_go. fav_add writes self->fav[] at 5614 (consumed by fav_next at 5793); the per-slot family writes self->favx[] at 5732 (consumed by xfav_go at 5831). Tracking precondition + duplicate detection + all-slots-full + first-free-slot all enforce-traced.

- NEW source_ref: src/commands.c:886
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN (attempt-2)
- re-V per-clause table (attempt-2):
  - "Spectator command (usable only by spectators)" -> src/commands.c:886 + 1091 -> MATCH (CF_SPECTATOR only without CF_PLAYER; CF_MATCHLESS additive permission not a match block)
  - "Adds the player the spectator is currently tracking ... at self->fav[]" -> src/commands.c:5580-5581 + 5614 -> MATCH
  - "placing them in the first free slot" -> src/commands.c:5598-5601 -> MATCH
  - "for later cycling by fav_next" -> src/commands.c:5735-5775 (fav_next reads self->fav[]) -> MATCH
  - "distinct from the per-slot favx[] populated by fav1_add..fav20_add and read by 1fav_go..20fav_go" -> src/commands.c:846-865 (fav1_add..fav20_add, digit-LAST) + 5732 + 866-885 (1fav_go..20fav_go, digit-FIRST) + 5831 -> MATCH
  - "error if the spectator is not tracking a player" -> src/commands.c:5583-5588 -> MATCH
  - "already on the list" -> src/commands.c:5591-5597 -> MATCH
  - "all favourites slots are full" -> src/commands.c:5603-5610 -> MATCH
- orchestrator HG2 re-grep: confirmed. Targeted re-grep on the array-distinction patterns: favN_add registration block 842-865 confirms digit-LAST `fav1_add..fav20_add`; Nfav_go registration block 866-885 confirms digit-FIRST `1fav_go..20fav_go`. fav_add (886) writes self->fav[] at 5614; fav_next reads self->fav[] at 5743/5793. Verified.
- attempts: 2

<!-- WAVE 2 END -- 5/5 TRACED-CLEAN. 2 rev=1 + 3 rev=2. Attempt-1 failures
     were synth-elaboration flavour-C (extra clauses beyond seed scope:
     1fav_go demo-flag inference, 20fav_go dead-code clause + fav_show
     scope-narrowing, fav_add populator-name pattern inversion). All
     resolved cleanly with discrimination-toward-enforcing-line briefs. -->

<!-- WAVE 3 -- 4 rows (fav_all_del, fav_del, fav_next, fav_show).
     All 4 share the CF_MATCHLESS misread root defect. Cluster-discipline
     was baked into briefs upfront based on Wave 2 lessons (named the
     "no new flavour-C in elaborations" caution + the exact registered
     name patterns). All 4 first-attempt TRACED-CLEAN. -->

B4-RESULT | ktx:command:fav_all_del | TRACED-CLEAN | rev=1 | seed-clause: "not during a match" (CF_MATCHLESS additive permission misread as match-block) | new-clause: dropped "not during a match"; added positive enforce-traced clause "Usable while a live match is in progress"

### ktx:command:fav_all_del
- canonical_id: ktx:command:fav_all_del
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-01 WI2-FIX; wrong clause = "not during a match" (CF_MATCHLESS at commands.c:888 is additive permission interpreted at commands.c:1078, not a match-state block; no CF_MATCHLESS_ONLY; no match_in_progress guard in DoCommand or fav_all_del 5696-5710).

- OLD description:
  > Spectator command (usable only by spectators and not during a match). Clears the spectator's entire personal favourites list, emptying every slot. Reports whether the list was actually cleared or was already empty.

- NEW description:
  > Spectator-only command that clears the spectator's entire personal favourites list, zeroing every slot, then prints a message confirming whether the list was actually cleared or was already empty. Usable while a live match is in progress.

- NEW description_reasoning:
  > B4 re-synth: dropped "not during a match" (CF_MATCHLESS at 888 is additive permission interpreted at 1078; CF_MATCHLESS_ONLY at 1083 is the actual matchless-only flag and fav_all_del lacks it; no in-handler match guard). Replaced with a positive enforce-traced clause "Usable while a live match is in progress" backed by 1078/1083 dispatch flow + handler body 5696-5710 (no match_in_progress check). Spectator-only retained via CF_SPECTATOR at 888 + dispatch 1091/1106. Clear semantics at 5701-5707 (loop zeros every non-zero slot, sets deleted=true on any non-zero); status print at 5710 toggles "already " prefix based on the deleted flag.

- NEW source_ref: src/commands.c:5696
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator-only" -> src/commands.c:888 + 1091-1094 + 1106-1109 -> MATCH (CF_SPECTATOR set, CF_PLAYER absent; players get DO_WRONG_CLASS)
  - "clears the spectator's entire personal favourites list" -> src/commands.c:5701-5707 + progs.h:1010 -> MATCH
  - "zeroing every slot" -> src/commands.c:5701-5707 (loop bounds 0..MAX_CLIENTS-1) -> MATCH
  - "prints a message confirming whether the list was actually cleared or was already empty" -> src/commands.c:5710 -> MATCH
  - "Usable while a live match is in progress" -> src/commands.c:1078-1086 + g_local.h:653/657 + 888 (no CF_MATCHLESS_ONLY) + 5696-5710 (no match_in_progress) -> MATCH
- orchestrator HG2 re-grep: confirmed. fav_all_del body at 5696-5712: loop iterates 0..MAX_CLIENTS-1 with `if (self->fav[fav_num]) { self->fav[fav_num] = 0; deleted = true; }`; final G_sprint at 5710 with "Favourites list %sdeleted\n" + conditional "already " prefix. No match_in_progress guard anywhere in body. CF_MATCHLESS additive semantics held at commands.c:1078.
- attempts: 1

---

B4-RESULT | ktx:command:fav_del | TRACED-CLEAN | rev=1 | seed-clause: "not during a match" (CF_MATCHLESS additive permission misread) | new-clause: dropped "not during a match"; added array-distinction clarifier "(the auto-list shared with fav_add / fav_next; the per-slot list used by favN_add / Nfav_go is separate)"

### ktx:command:fav_del
- canonical_id: ktx:command:fav_del
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-09 WI2-FIX; wrong clause = "and not during a match" (CF_MATCHLESS additive; no CF_MATCHLESS_ONLY; no match_in_progress guard in fav_del body 5676-5694).

- OLD description:
  > Spectator command (usable only by spectators and not during a match). Removes the player the spectator is currently tracking (point-of-view target) from that spectator's personal favourites list. Reports an error if the spectator is not tracking a player, or if that player is not on the list.

- NEW description:
  > Spectator command. Removes the player the spectator is currently tracking (point-of-view target) from that spectator's personal favourites list (the auto-list shared with fav_add / fav_next; the per-slot list used by favN_add / Nfav_go is separate). Reports an error if the spectator is not tracking a player, or if that player is not on the list.

- NEW description_reasoning:
  > B4 re-synth: dropped "and not during a match" (CF_MATCHLESS at 887 is additive permission interpreted at 1078; no CF_MATCHLESS_ONLY; no match_in_progress guard in fav_del 5676-5694 or fav_del_do 5619-5645). Spectator-only retained via CF_SPECTATOR + dispatch 1091. Tracking-target derived from self->s.v.goalentity (5678); list write at 5639 inside fav_del_do (operates on self->fav[]). Array-distinction clarifier added (auto-list fav[] partner of fav_add/fav_next; per-slot favx[] partner of favN_add/Nfav_go) per cluster discipline -- the generic favN_add/Nfav_go convention is acceptable as both expand to the literal registered fav1_add..fav20_add and 1fav_go..20fav_go families (846-885). Error paths: 5683 (not tracking) + 5693 (target not in list).

- NEW source_ref: src/commands.c:5676
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator command" -> src/commands.c:887 + 1091 -> MATCH (CF_SPECTATOR enforced)
  - "Removes the player the spectator is currently tracking (point-of-view target)" -> src/commands.c:5678 -> MATCH
  - "from that spectator's personal favourites list" -> src/commands.c:5631 + 5639 (fav_del_do operates on self->fav[]) -> MATCH
  - "(the auto-list shared with fav_add / fav_next" -> src/commands.c:886/887/889 + progs.h:1010 -> MATCH
  - "the per-slot list used by favN_add / Nfav_go is separate)" -> src/commands.c:846-865 + 866-885 + 5662 (favx_del_do operates on s->favx[]) + progs.h:1009 -> MATCH
  - "Reports an error if the spectator is not tracking a player" -> src/commands.c:5681-5685 -> MATCH
  - "or if that player is not on the list" -> src/commands.c:5688-5693 -> MATCH
- orchestrator HG2 re-grep: confirmed. fav_del body 5676-5694: precondition check at 5681-5685 ("fav_del: you are not tracking player!"); fav_del_do called at 5688 with (self, goal, "fav_del: "); error message at 5693 ("is not in favourites"). fav_del_do at 5619-5645 scans self->fav[] for matching player, sets s->fav[fav_num]=0 at 5639, prints "removed from favourites" at 5631. No match_in_progress guard.
- attempts: 1

---

B4-RESULT | ktx:command:fav_next | TRACED-CLEAN | rev=1 | seed-clause: "not during a match" (CF_MATCHLESS additive permission misread) | new-clause: dropped "not during a match"; added array-distinction clarifier "(the list managed by fav_add / fav_del / fav_all_del, distinct from the per-slot fav1_add..fav20_add / 1fav_go..20fav_go array)"

### ktx:command:fav_next
- canonical_id: ktx:command:fav_next
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-09 WI2-FIX; wrong clause = "and not during a match" (CF_MATCHLESS additive; no CF_MATCHLESS_ONLY; no match gate in fav_next body 5735-5816).

- OLD description:
  > Spectator command (usable only by spectators and not during a match). Switches the spectator's point-of-view (track target) to the next player on their personal favourites list: if currently tracking a favourite, advances to the following list entry; otherwise jumps to the first favourite. Reports an error if the favourites list is empty, and does nothing if already observing that player.

- NEW description:
  > Spectator command (rejected when invoked by a player). Advances the spectator's tracked target through the personal generic favourites list (the list managed by fav_add / fav_del / fav_all_del, distinct from the per-slot fav1_add..fav20_add / 1fav_go..20fav_go array): if the spectator is currently tracking a player who is on that list, switches to the next favourite after them; otherwise jumps to the first favourite on the list. Issues an "empty" error and does nothing when the favourites list holds no entries, and reports "already observing..." without re-issuing the track when the chosen favourite is already the current target; otherwise stuffs a "track <userid>" to the spectator.

- NEW description_reasoning:
  > B4 re-synth: dropped "and not during a match" (CF_MATCHLESS additive at 1078; CF_MATCHLESS_ONLY absent at 889; no match guard in body). Spectator-only retained via CF_SPECTATOR + dispatch 1091/1106. Empty-list error at 5749-5754. Tracking-player gate at 5759. Advance logic at 5765-5774 (search current goal in self->fav[], then advance to next populated slot). Fall-back to first_fav at 5783. Already-observing no-op at 5811-5816. Track stuffcmd at 5818. Array-distinction clarifier using exact registered names per cluster discipline (fav_add/fav_del/fav_all_del at 886/887/888; fav1_add..fav20_add at 846-865; 1fav_go..20fav_go at 866-885).

- NEW source_ref: src/commands.c:5735
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator command (rejected when invoked by a player)" -> src/commands.c:889 + 1106 -> MATCH
  - "Advances the spectator's tracked target through the personal generic favourites list" -> src/commands.c:5743 + 5765 -> MATCH
  - "the list managed by fav_add / fav_del / fav_all_del" -> src/commands.c:5614 + 5639 + 5705 -> MATCH
  - "distinct from the per-slot fav1_add..fav20_add / 1fav_go..20fav_go array" -> src/commands.c:846-865 + 866-885 + 5732 -> MATCH
  - "if the spectator is currently tracking a player who is on that list, switches to the next favourite after them" -> src/commands.c:5759 + 5765-5772 + 5777-5780 -> MATCH
  - "otherwise jumps to the first favourite on the list" -> src/commands.c:5783 -> MATCH
  - "Issues an 'empty' error and does nothing when the favourites list holds no entries" -> src/commands.c:5749-5754 -> MATCH
  - "reports 'already observing...' without re-issuing the track" -> src/commands.c:5811-5816 -> MATCH
  - "otherwise stuffs a 'track <userid>' to the spectator" -> src/commands.c:5818 -> MATCH
- orchestrator HG2 re-grep: confirmed. fav_next body 5735-5819: empty-list check at 5749 (`if (fav_num >= MAX_CLIENTS)`), tracking gate at 5759 (`if (!((goal->ct != ctPlayer) || (diff < 1) || (diff > MAX_CLIENTS)))`), advance logic at 5765-5774 (search-then-break), fav_num resolve at 5777/5783, sanity guards at 5787-5798 (elided in description as "internal error" / "must not happen" -- acceptable scope narrowing per V-pass minor-vagueness rule), already-observing at 5811-5816, track stuffcmd at 5818 (`stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "track %d\n", GetUserID(p))`). Note: blind verifier flagged the wrap-edge framing (tracking last-on-list still routes to "first" via fall-back; acceptable as "still-true minor vagueness that was traceable" per enforce-trace-discipline.md TRACED-CLEAN definition).
- attempts: 1

---

B4-RESULT | ktx:command:fav_show | TRACED-CLEAN | rev=1 | seed-clause: "and not during a match" (CF_MATCHLESS additive permission misread; canonical autotrack C-FIX pattern) | new-clause: dropped "and not during a match"; preserved + sharpened the two-loop structure with explicit favx[] and fav[] array names

### ktx:command:fav_show
- canonical_id: ktx:command:fav_show
- prior L1 verdict: synthesized (origin=synthesized, confidence=high)
- V-pass finding (seed): batch-05 C-FIX; wrong clause = "and not during a match" (CF_MATCHLESS additive at commands.c:1078; no CF_MATCHLESS_ONLY; no match_in_progress in DoCommand or fav_show body 5859-5917; canonical autotrack C-FIX pattern).

- OLD description:
  > Spectator command (usable only by spectators and not during a match). Prints the spectator's personal favourites to that spectator: first the slot-based favourites (each shown as 'slot N -> player name'), then the plain favourites list (player names). Prints 'Favourites list empty or nothing to show' when both are empty.

- NEW description:
  > Spectator command. Prints the caller's personal favourites list to that spectator only. First the slot-based favourites are listed (each line as "slot N -> player name", iterating the per-slot favx[] array, 1-indexed); then the plain favourites list (just player names, from the auto-add fav[] array). Entries that point to a no-longer-present player or an empty netname are silently skipped. If both lists produce no printable entries, prints "Favourites list empty or nothing to show".

- NEW description_reasoning:
  > B4 re-synth: dropped "and not during a match" (CF_MATCHLESS at 890 is additive per 1078; CF_MATCHLESS_ONLY absent; no match_in_progress guard in DoCommand 1069-1143 or fav_show 5859-5917). Spectator-only retained via CF_SPECTATOR + dispatch 1091/1106; no CF_SPC_ADMIN so any spectator passes. "To that spectator only" enforced by G_sprint(self, ...) at 5882/5908/5915 routing through trap_SPrint(NUM_FOR_EDICT(ed), ...). Two-loop structure: first loop 5865-5885 iterates self->favx[] (slot-based), prints fav_num+1 (1-indexed) via "%2d \x8D %s" format (the \x8D conchar renders as a right-arrow, transliterated as "->"); second loop 5892-5911 iterates self->fav[] (plain auto-add list), prints just netname. Entry skip at 5870/5897 (`(p->ct != ctPlayer) || strnull(p->netname)`). Fallback at 5913-5915 when showed flag is false across both loops.

- NEW source_ref: src/commands.c:5859
- NEW anchor: 1.47-2-g67253dc
- NEW verdict: synthesized (confidence: high)

- re-V (blind) verdict: TRACED-CLEAN
- re-V per-clause table:
  - "Spectator command" -> src/commands.c:890 -> MATCH
  - "prints ... to that spectator only" -> src/commands.c:5882/5908/5915 + g_utils.c:753-763 -> MATCH
  - "First the slot-based favourites are listed" -> src/commands.c:5865 + 5877 header -> MATCH
  - "each line as 'slot N -> player name'" -> src/commands.c:5882 (`\x8D` conchar = right-arrow, transliterated -> ) -> MATCH
  - "iterating the per-slot favx[] array" -> src/commands.c:5867 -> MATCH
  - "1-indexed" -> src/commands.c:5882 (`fav_num + 1`) -> MATCH
  - "then the plain favourites list (just player names ...)" -> src/commands.c:5892 + 5904 header + 5908 -> MATCH
  - "from the auto-add fav[] array" -> src/commands.c:5894 + fav_add at 5579-5614 -> MATCH
  - "Entries that point to a no-longer-present player or an empty netname are silently skipped" -> src/commands.c:5870 + 5897 -> MATCH
  - "If both lists produce no printable entries, prints 'Favourites list empty or nothing to show'" -> src/commands.c:5913-5915 -> MATCH
  - "no 'during a match' claim (correctly omitted)" -> src/commands.c:890 + 1078 (CF_MATCHLESS additive) -> MATCH
- orchestrator HG2 re-grep: confirmed. fav_show body 5859-5917: two-loop structure at 5865-5885 (favx[] slot-based) and 5892-5911 (fav[] plain), with shared `showed` flag set at 5883/5909 and final fallback message at 5915 (`if (!showed)`). Entry-skip at 5870 / 5897 (`(p->ct != ctPlayer) || strnull(p->netname) -> continue`). No match_in_progress guard anywhere in body.
- attempts: 1

<!-- WAVE 3 END -- 4/4 TRACED-CLEAN, all rev=1. CF_MATCHLESS-additive
     cluster-discipline successfully internalized via upfront briefing
     (the Wave 2 lessons-learned baked into Wave 3 briefs reduced
     attempt-1 flavour-C to zero for this final wave). -->







