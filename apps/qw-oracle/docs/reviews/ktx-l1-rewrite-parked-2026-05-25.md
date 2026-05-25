# ktx-l1-rewrite parked entities -- batch 2026-05-25

Entities the skill could not confidently recast. Each entry names the park
trigger and the source signature observed. Operator reviews at end of batch.

## k_spec_info (KTX cvar, Spectator chat & visibility)

- **Source**: `src/world.c:965`
- **Anchor**: v1.36-1633-g67253dc
- **Park trigger**: 1 -- no-shape-match

### What the skill saw

**Registration:**
- `world.c:965`: `RegisterCvar("k_spec_info")` -- no explicit default; default value is `""` (0).

**Bit definitions (include/g_consts.h:282-283):**
- `MI_ON = 1<<0` (bit 0 = decimal 1) -- enables sending extra info to spectators.
- `MI_ADM_ONLY = 1<<1` (bit 1 = decimal 2) -- restricts recipients to admin spectators only.

**Two independent XOR-toggle handlers (commands.c):**
- `infospec` (lines 7234-7247): XORs `MI_ON` bit, writes via `cvar_fset`. Registration: `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator. Pre-match only (`match_in_progress` early-return). Broadcasts result to all.
- `infolock` (lines 7205-7232): XORs `MI_ADM_ONLY` bit, writes via `cvar_fset`. Registration: `CF_BOTH_ADMIN` -- admin only. Pre-match only (`match_in_progress` early-return AND `is_adm` gate). Broadcasts result to all.

**Consumer chain:**
- `mi_on()` (commands.c:7069): reads `MI_ON` bit; returns true/false.
- `mi_adm_only()` (commands.c:7074): reads `MI_ADM_ONLY` bit; returns true/false.
- `mi_print()` (commands.c:7102-7148): called from items.c on item pickup/armor/weapon events. Gated by `mi_on()`; if `mi_adm_only()`, skips non-admin spectators; routes each eligible spectator through their personal `"mi"` userinfo key (5 levels: 0=off through 4=powerups only).
- `moreinfo` (commands.c:7151-7175): spectator command (`CF_SPECTATOR | CF_MATCHLESS`) that cycles the spectator's own `"mi"` userinfo level. Prints "Spec info is turned off by server" and returns if `mi_on()` is false. This is a Shape 4-like dependency: `k_spec_info` MI_ON bit gates whether `moreinfo` has any effect.

**Common usermode init reset (commands.c:4185):**
- The `common_um_init[]` string (applied by ALL user mode presets -- 1on1, ffa, ctf, ca, etc.) includes `"k_spec_info 1\n"`. This resets the cvar to `1` (MI_ON only, all spectators, not admin-locked) whenever any preset is applied. The server.cfg default is `0`; the practical runtime default when running any match preset is `1`.

**Why this does not match any cataloged shape:**

Shape 1 (cvar + paired toggle, binary flip) is the closest candidate, but the pattern here deviates in two load-bearing ways:
1. **Source signature mismatch**: Shape 1 identifies via `cvar_toggle_msg(self, "<cvar>", ...)`. Both handlers here use raw XOR + `cvar_fset("k_spec_info", k_spec_info)` with no `cvar_toggle_msg`. Shape 1's identification guide is explicit about the `cvar_toggle_msg` source signature.
2. **Two commands, different permissions, independent bits**: Shape 1 covers one command symmetrically toggling one binary cvar (same permission on both sides). Here two commands (`infospec` at player+spc_admin; `infolock` at admin-only) each own a distinct bit of a 2-bit bitmask, independently. The permission asymmetry (one command is wider-access than the other) is load-bearing: the cvar card's See-also and the Permission framing differ structurally from Shape 1.

Shape 3 (no paired command, set-once in server.cfg) is explicitly wrong -- two in-game commands write to this cvar.

The three-entity fan (k_spec_info + infospec + infolock) with the additional gated-downstream `moreinfo` creates a relationship pattern -- bitmask-cvar-with-two-asymmetric-permission-bit-toggle-commands -- not currently in the catalog.

**Instance count for earn-their-keep:** survey of `cvar_toggle_msg` and `cvar_fset` sites in commands.c found no other bitmask cvar with two independent per-bit XOR-toggle commands at different permission levels. This is 1-of-1 in the current walk. Earn-their-keep discipline: do not create a new shape; surface for operator review.

### Suggested manual investigation

- **Shape 1 extension vs new shape**: the operator should decide whether this is a Shape 1 "extended variant" (one cvar, multiple bit-flip commands with possibly different permissions) or a genuinely new shape. Template-differentiation check: does the Layer A card for this pattern differ load-bearingly from Shape 1? Yes -- the Permission line fragments (two commands have different access), the value enum is a 2-bit bitmask (4 states), and the See-also cross-links two command peers plus a gated-downstream command.
- **Instance count**: if a future KTX walk surfaces another bitmask cvar with two independent per-bit toggle commands, that's the evidence for crystallizing a new shape. One confirmed sibling = 2-instance count; per earn-their-keep, the operator can lock the shape at that point.
- **Fallback**: the operator may choose to draft this card manually with Shape 3 framing + explicit Notes describing the command relationships, given the existing description is functionally correct. The card blocks the apply pass until the shape classification is resolved.
- **moreinfo dependency**: `moreinfo` is a downstream Shape 4-like gated command. The operator may want to classify `k_spec_info` as a gating cvar for `moreinfo` (Shape 4 facet) in addition to however the bitmask-toggle relationship is resolved. `moreinfo` silently fails if MI_ON is not set -- this is the primary surprise-bearing prerequisite for spectators.

---

## infolock (KTX command, Spectator chat & visibility)

- **Source**: `src/commands.c:930` (registration) + `commands.c:7205-7232` (handler)
- **Anchor**: `v1.36-1633-g67253dc`
- **Park trigger**: 1 -- no-shape-match

### What the skill saw

- Registration: `{ "infolock", infolock, 0, CF_BOTH_ADMIN, CD_INFOLOCK }` -- admin only, both classes (players and spectators who hold admin role). Pre-match only (confirmed by `match_in_progress` early-return at handler line 7209).
- Handler XORs the `MI_ADM_ONLY` bit of `k_spec_info` via raw `cvar_fset("k_spec_info", k_spec_info)` (no `cvar_toggle_msg`). On pass: broadcasts "Only admins can receive specinfos" or "All spectators can receive specinfos" via `G_bprint`.
- Primary consumer of the bit: `mi_print()` at `commands.c:7102-7148`. When `mi_adm_only()` returns true (MI_ADM_ONLY bit set), the per-pickup notification loop skips all non-admin spectators (`if (adm && !is_adm(p)) { continue; }`).
- Surprise-bearing side-effect: `common_um_init[]` at `commands.c:4185` includes `"k_spec_info 1\n"`, which resets `k_spec_info` to 1 (MI_ON set, MI_ADM_ONLY cleared = unlocked) whenever any user-mode preset is applied. An admin who calls `infolock` will have the lock silently cleared at the next preset switch.
- Sibling command: `infospec` at `commands.c:7234-7248` XORs the *other* bit (MI_ON) of the same bitmask, at a different permission level (CF_BOTH_ADMIN for infolock vs broader access for infospec -- see infospec card for its exact flags).
- Parent cvar `k_spec_info` was parked this same batch (trigger 1) because the two-toggle-bitmask-cvar pattern (two commands with asymmetric permissions each XORing one bit via raw `cvar_fset`) has no cataloged shape. `infolock` is one command-side component of that same parked pattern.
- Shape 1 ruled out: `cvar_toggle_msg` not present; handler uses raw XOR + `cvar_fset`. Shape 1's source signature requires `cvar_toggle_msg`.
- Shape-less lever path ruled out: the "command-side lever for a Shape X relationship" framing requires the cvar to have a cataloged shape. `k_spec_info` is parked with no shape; there is no Shape X for `infolock` to be a lever for. Drafting `infolock` as `shape-less` would create a dangling leaf referencing a parked, unclassified cvar relationship.
- No other shape candidates apply: no cycle (`cvar_fset` increment-wrap pattern absent), no gate-read (reads to WRITE, not to gate), no userinfo state (`SetUserInfo` absent), no pure print dispatch (state-modifying handler), no subcommand dispatcher structure.

### Suggested manual investigation

- **Reconcile with k_spec_info park**: the apply-pass should process `infolock` and `infospec` together with `k_spec_info` once the operator resolves the bitmask-toggle pattern question. The three entities form an inseparable unit (cvar + two bit-flip commands); the shape classification decision on `k_spec_info` unblocks both command cards.
- **Surprise-bearing side effect for the apply pass**: the `common_um_init[]` reset is user-observable and not in the existing description. When the shape is eventually resolved and the card drafted, the Effect or Prerequisites section should note that any user-mode preset clears the admin lock (resets `k_spec_info` to 1).
- **Draft path if operator chooses shape-less manually**: if the operator decides to draft this card without waiting for shape crystallization, the v2 card can proceed with `shape-less` classification, provided the See-also explicitly calls out the parked `k_spec_info` relationship as context. The existing description is behaviorally correct; it just needs the v2 template applied and the preset-reset side effect added.

---

## infospec (KTX command, Spectator chat & visibility)

- **Source**: `src/commands.c:931` (registration) + `commands.c:7234-7247` (handler)
- **Anchor**: `v1.36-1633-g67253dc`
- **Park trigger**: 1 -- no-shape-match

### What the skill saw

- Registration: `{ "infospec", infospec, 0, CF_PLAYER | CF_SPC_ADMIN, CD_INFOSPEC }` -- any player or admin spectator. Pre-match only (confirmed by `match_in_progress` early-return at handler line 7238-7241).
- Handler XORs the `MI_ON` bit (= 1<<0 = 1) of `k_spec_info` via raw `cvar_fset("k_spec_info", k_spec_info)` (no `cvar_toggle_msg`). On pass: broadcasts `"Extra info for spectators on"` or `"off"` via `G_bprint(2, "Extra info for spectators %s\n", redtext(OnOff(mi_on())))`.
- `MI_ON = 1<<0` confirmed in `include/g_consts.h:282`. `OnOff()` at `g_utils.c:1852` returns literal lowercase `"on"` / `"off"`.

**Consumer chain (from behavioral notes + source verification):**
- `mi_on()` at `commands.c:7069` reads the MI_ON bit of `k_spec_info`; returns true/false.
- `mi_print()` at `commands.c:7102-7148` is called on every item-pickup event; short-circuits at the top (`if (!mi_on()) { return; }`) when MI_ON is 0 -- no spectators receive pickup notifications regardless of personal "mi" filter level. When `mi_adm_only()` is also true (MI_ADM_ONLY bit set by `infolock`), the loop additionally skips all non-admin spectators.
- `moreinfo()` at `commands.c:7151-7175` -- spectator command that cycles the personal `"mi"` userinfo filter level. Prints `"Spec info is turned off by server"` and returns immediately if `mi_on()` is false. When `infospec` is off, spectators cannot adjust their personal filter level at all.

**Surprise-bearing side effect (common_um_init):**
- `common_um_init[]` at `commands.c:4185` includes `"k_spec_info 1\n"`, applied by ALL user-mode presets (1on1, ffa, ctf, ca, etc.). This resets `k_spec_info` to 1 (MI_ON=1, MI_ADM_ONLY=0) at every preset switch, effectively turning `infospec` ON as a side effect and clearing any manual toggle the player or admin may have applied.

**Why this does not match any cataloged shape:**
- Shape 1 (cvar + paired toggle, binary flip) is the closest candidate. Ruled out on two grounds: (1) Shape 1 source signature requires `cvar_toggle_msg(self, "<cvar>", ...)`; the handler here uses raw XOR + `cvar_fset` with no `cvar_toggle_msg`. (2) Shape 1 covers one command symmetrically toggling one binary cvar; here `infospec` and sibling `infolock` each own a distinct bit of the same shared bitmask cvar `k_spec_info`, at different permission levels (`CF_PLAYER | CF_SPC_ADMIN` vs `CF_BOTH_ADMIN`). The two-command/two-bit/asymmetric-permission structure does not fit Shape 1's template.
- Shape-less lever path ruled out: the "command-side lever for a Shape X relationship" framing requires the cvar (`k_spec_info`) to have a cataloged shape. `k_spec_info` is parked this same batch (trigger 1) with no cataloged shape. There is no Shape X for `infospec` to be a lever for. Drafting `infospec` as `shape-less` would create a dangling leaf referencing a parked, unclassified cvar relationship -- same ruling as `infolock` (also parked this batch).
- No other shape candidates: no cycle pattern (no `cvar_fset` increment-wrap), no gate-read (reads to WRITE, not to gate), no userinfo state write (`SetUserInfo` absent), no pure print dispatch, no subcommand dispatcher structure.
- Instance count: survey found no other bitmask cvar with two independent per-bit XOR-toggle commands at different permission levels in the current KTX walk. 1-of-1; earn-their-keep discipline applies.

### Suggested manual investigation

- **Reconcile with k_spec_info and infolock parks**: the apply-pass should process `infospec`, `infolock`, and `k_spec_info` together as a unit once the operator resolves the bitmask-toggle pattern question. The shape classification decision on `k_spec_info` unblocks all three command cards.
- **Surprise-bearing side effect for the apply pass**: the `common_um_init[]` reset at `commands.c:4185` is user-observable and not in the existing description. When the shape is eventually resolved and the card drafted, the Effect or Prerequisites section should note that any user-mode preset resets `k_spec_info` to 1, turning `infospec` ON and overriding any manual toggle.
- **Downstream gate behavior for the apply pass**: the existing description mentions `moreinfo` but does not fully surface the gating relationship. When `infospec` is off, `moreinfo` actively refuses with `"Spec info is turned off by server"` (not silent failure). The v2 card Effect should state this: off-state blocks not just item-pickup notifications but the spectator's ability to configure their own filter level at all.
- **Draft path if operator chooses shape-less manually**: if the operator decides to draft this card without waiting for shape crystallization, the v2 card can proceed with `shape-less` classification. The existing description is behaviorally mostly correct; it needs the v2 template applied, the `moreinfo` gating consequence stated precisely, and the preset-reset side effect added. See-also should point at `k_spec_info` (parked parent bitmask cvar), `infolock` (sibling command for the other bit), and `moreinfo` (downstream gated command).
