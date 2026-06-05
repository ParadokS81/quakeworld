/*
 * Synthetic fixture for the Track-B HUD_Register command probe
 * (verify-hud-probes.py). Committed and OWNED by qw-oracle so the probe's
 * five known-answer anchors are pinned to fixture symbols we control, not
 * live ezQuake features.
 *
 * WHY this exists: the probe used to assert against live HUD elements in the
 * real source (the `radar` element in hud_radar.c, the `togglehud` plain
 * command in hud.c). That works only as long as those features keep their
 * exact shape and file -- a HUD refactor, a renamed element, or a file move
 * would flip the gate RED for a reason unrelated to the extractor mechanism.
 * It also forced a full ~308-file parse (~50-60s) on every stage-1 run. A
 * self-owned fixture the probe parses via --repo-root is stable forever and
 * parses in a fraction of a second (sibling of fixtures/callgraph-probe/).
 *
 * WHAT the hud-commands handler reads (verified in _handler_hud.py): ONLY the
 * HUD_Register CALL SITE -- arg0 (name) via literal_string, arg3 (flags) raw
 * text tested for the whole token HUD_PLUSMINUS, arg7 (show) as a non-NULL
 * string literal. handler_fn / registration_api are CONSTANTS the handler
 * emits, not parsed from the body -- so this fixture needs no HUD machinery,
 * just call sites with >=8 args. A HUD_Register with <8 args is "malformed"
 * (recorded as an R1 non-literal site); keep every call at exactly 8 args.
 *
 * It exercises the five anchors the probe asserts:
 *   ANCHOR 1  fixradar bare command (unconditional) with handler_fn
 *             HUD_Func_f / registration_api Cmd_AddCommand / source
 *             hud_fixture.c.
 *   ANCHOR 2  +hud_fixradar and -hud_fixradar -- emitted because fixradar's
 *             flags carry HUD_PLUSMINUS AND its show arg is the non-NULL
 *             literal "0" (the double gate). handler_fn HUD_Plus_f /
 *             HUD_Minus_f, registration_api Cmd_AddRemCommand.
 *   ANCHOR 3  fixtoggle (a plain Cmd_AddCommand) must NOT appear -- the
 *             handler visits only HUD_Register, never plain commands; plus
 *             the no-orphan-+/- invariant (every +/- has its bare element).
 *   R7        zero cvar-shaped output (this handler emits commands only).
 *   R1        zero non-literal HUD_Register first args (every arg0 here is a
 *             plain string literal).
 *
 * fixclock is a bare-only control: its flags lack HUD_PLUSMINUS, so the gate
 * fails and NO +/- pair is emitted -- proving the double gate actually gates.
 */

/* arg3 flag tokens. The handler does a raw-text token test (no macro
 * expansion), but defining them keeps libclang's parse clean. */
#define HUD_PLUSMINUS (1 << 2)
#define HUD_NO_GROW   (1 << 0)

/* Prototypes keep the CALL_EXPR spellings stable as "HUD_Register" /
 * "Cmd_AddCommand"; the handler matches on spelling. */
void HUD_Register();
void Cmd_AddCommand();

void Fixture_HudInit(void)
{
	/* ANCHOR 1 + 2: HUD_PLUSMINUS in flags (arg3) AND non-NULL show "0"
	 * (arg7) -> bare fixradar + +hud_fixradar + -hud_fixradar. */
	HUD_Register("fixradar", 0, 0, HUD_PLUSMINUS, 0, 0, 0, "0");

	/* Bare-only control: no HUD_PLUSMINUS in flags -> only the bare
	 * fixclock command, no +/- pair (proves the gate gates). */
	HUD_Register("fixclock", 0, 0, HUD_NO_GROW, 0, 0, 0, "0");

	/* ANCHOR 3: a plain Cmd_AddCommand. The handler visits only
	 * HUD_Register, so fixtoggle must never appear in hud_commands. */
	Cmd_AddCommand("fixtoggle", 0);
}
