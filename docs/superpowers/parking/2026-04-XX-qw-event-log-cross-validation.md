# qw_event_log as cross-validation oracle for Layer 1

**Added:** 2026-04-27 (evening, surfaced during game-mechanics arc 1 wrap-up conversation).
**Status:** Captured for later -- gated on KTX layer1 (arc 2c) shipping first.
**Verification first:** `ls /home/paradoks/projects/qw-event-log-handoff/crates/qw_event_log/src/{obituary.rs,events.rs} /home/paradoks/projects/qw-event-log-handoff/crates/qw_event_log/ARCHITECTURE.md` -- all three files must exist. If the repo has been deleted or moved, the validation-oracle plan needs a new artifact source.

### What the artifact is

The repo at `/home/paradoks/projects/qw-event-log-handoff/` is the FROZEN handoff snapshot (commit `2c584b4` from vikpe/slipgate, March 2026) of `qw_event_log` -- the Rust crate ParadokS authored with vikpe + Claude as PR #5 in vikpe's slipgate workspace. Parses MVDSV `.mvd` demos into structured `GameEvent` streams. Originally for slipgate-internal use; got packaged for Xerial's DEMOPASHA project when vikpe moved it aside to `.bak/` and started a fresh `demo_parser` rewrite.

Three internal artifacts have direct value for Oracle:

1. **`crates/qw_event_log/src/obituary.rs`** -- exhaustive obit-string->cause map. 47 KILL_PATTERNS + 12 SUICIDE_PATTERNS + 16 WORLD_PATTERNS + 12 teamkill patterns. Each pattern annotated with a `WeaponType` enum value. Comment in source reads: *"Patterns sourced from KTX `client.c` ClientObituary and original id Software QuakeC `client.qc`."* Mixed origin -- most patterns are KTX-only (e.g. `"X was brutalized by Y's quad rocket"`, `"X eats Y's pineapple"`, `"X discharges into the water"`), about 17 are id1-vanilla (`"X drowned"`, `"X was nailed by Y"`, `"X was telefragged by Y"`).

2. **`crates/qw_event_log/src/events.rs`** -- `WeaponType` enum providing a clean unified death-cause taxonomy spanning vanilla weapons (RL/GL/LG/NG/SNG/SG/SSG/Axe), KTX-promoted distinctions (Discharge as own category vs id1's "selfwater"; Stomp; Squish), Telefrag, environmental (Lava/Drown/Slime/Fall/Trigger), Suicide (`/kill` command). Notable: `Trigger` covers both the noexit/exit-level kill AND mapper-controlled trigger_hurt -- same QC mechanism, different obit strings.

3. **`crates/qw_event_log/ARCHITECTURE.md`** -- ~350-line design doc. Documents the engine-protocol model: modern KTX kills flow through MVDSV's `DamageDone` hidden message (type 0x000C); legacy demos pre-DamageDone fall back to PRINT obituary parsing; environmental deaths arrive as `attacker = world` with no Kill event. Decision rationale captured throughout. This is the kind of QW infrastructure knowledge nobody else has packaged this cleanly.

### The validation-oracle role (NOT data import)

Earlier conversation framed this as "import the obit corpus into Layer 1." Operator's revised framing makes the role substantively better: use the parser as a permanent cross-validation oracle for Layer 1, not as a data source.

The loop:
1. Layer 1 ships hard facts (id1 today; MVDSV+KTX cvars in arc 2a/2b; KTX gameplay overrides in arc 2c -- citations against `ktx/src/*.c` and `mvdsv/src/*.c`).
2. Build a harness that runs `qw_event_log` over a corpus of representative `.mvd` demos and aggregates observed event types: which deathtypes fire, at what frequency, paired with which obit strings.
3. Query Oracle for the corresponding rows.
4. Output a divergence report: did the parser observe an obit string Oracle has no row for? Did Oracle claim a death category nothing observed? Either signal is work to do.

Why this is materially better than one-shot import:
- No need to create speculative Layer 1 rows for KTX-only obit strings before KTX layer1 ships.
- Parser stays the ground truth for "what actually happens in real games" while Layer 1 stays the ground truth for "what the source code says." Two anchors, complementary.
- Generalizes beyond deaths. Same loop applies to weapon damage (parser observes hit damage values; Oracle has weapon damage rows), powerup respawn timers, mod-specific spawn rules.
- Survives `qw_event_log` being frozen: the validation harness can swap to vikpe's new `demo_parser` when it ships, since the role (parse demos, emit structured events) is stable while the implementation churns.

### When to build the harness

Sequence is rigid:
- Arc 1 (id1 game mechanics): SHIPPED 2026-04-27.
- Arc 2a (MVDSV cvars + commands): NEXT. Smaller than KTX, validates project-keyed schema works for a third codebase, gives us source-cited rows for `DamageDone` protocol references.
- Arc 2b (KTX cvars + commands): same extractor pipeline as ezQuake/FTE; reuses libclang + Visitor. KTX is C, not QuakeC.
- Arc 2c (KTX gameplay overrides): mirrors id1 game-mechanics work but extracted from C. Adds rows with `gameplay_source_id='ktx'` and populated `ruleset_gate_json`. THIS is the prerequisite for the validation harness because KTX-only obit strings need source-cited Layer 1 anchors.
- Arc 3 (validation harness): `apps/qw-oracle/scripts/validate-against-parser.ts` (or similar). Reads a `.mvd` corpus, runs the Rust parser as a subprocess (`cargo run --example parse_demo`), parses the JSON event stream, queries Layer 1, emits divergence report.
- Arc 4 (death-rules concept note): Layer 3 note "Death rules in QW" written once arcs 2c + 3 have proven Layer 1 covers what the parser sees.

### Caveats

- **Frozen snapshot risk.** README explicitly states the handoff is the frozen working copy; vikpe's new `demo_parser` will eventually supersede. Validation harness should either (a) point at whichever crate is current at harness-build time, OR (b) include the handoff source in its test fixtures and bump explicitly when newer parser becomes preferred.
- **Test coverage of the parser is partial.** README: "Tested on MVDSV demos. `.dem` (NetQuake) and `.qwd` (legacy QW) are partially supported by the `quake` crate but not exercised by `qw_event_log`." So validation against legacy QW demos may need the harness to skip those or stamp them as "parser doesn't see" rather than "Layer 1 has a gap."
- **Don't take a runtime dependency.** The repo is for one-shot tooling: build it locally, run it as a subprocess, parse stdout. Do NOT vendor it as a Cargo dependency in qw-oracle (which is TypeScript anyway), and do NOT fold it back into vikpe/slipgate.

### Related

- HANDOVER: "Layer 3 concept note: death rules" (consumes the harness output)
- HANDOVER: "Phase 2d-2h: remaining QW knowledge rollout" (drives the prerequisite arcs)
- Pre-plan: `apps/qw-oracle/docs/game-mechanics-preplan.md` Appendix B (KTX gameplay-override inventory; informs arc 2c work)
- Frozen-snapshot README: `/home/paradoks/projects/qw-event-log-handoff/README.md` (architecture summary, ParseOptions surface, DEMOPASHA integration notes)

### Pressure

Low. Multiple arcs gate the harness; nothing blocked downstream by this entry's existence. The value is making sure none of this gets forgotten between game-mechanics arc 1 ship and whenever the KTX work starts.

---
