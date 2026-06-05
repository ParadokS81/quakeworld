/*
 * Synthetic fixture for the Track-A call-graph reachability probe
 * (verify-callgraph-probes.py). Committed and OWNED by qw-oracle so that no
 * upstream dead-cvar cleanup can ever delete the probe's ground truth.
 *
 * WHY this exists: the probe used to pin its three known-answer cases to
 * genuine-dead cvars in the LIVE ezQuake source (sb_qtvlist_url,
 * gl_outline_scale_world). But a genuine-dead cvar is exactly what a cleanup
 * PR deletes -- finding/flagging/removing dead cvars is the intended
 * lifecycle -- so every live-source fixture is guaranteed to evaporate. Both
 * of those cvars were later removed upstream and the probe went RED on
 * ghosts. A self-owned fixture tree the probe parses via --repo-root is
 * stable forever (and parses in seconds vs ~minutes for the 308-file tree).
 *
 * It exercises the exact three gate cases the probe asserts:
 *
 *   GATE 1  fix_dead_cg         genuine-dead via the CALL-GRAPH feeder.
 *                               Its registrar (NeverCalled) is compiled in
 *                               every variant but reachable from no entry
 *                               root -> unreachable-everywhere-compiled.
 *   GATE 2  fix_dead_commented  genuine-dead via the COMMENTED-REGISTER
 *                               feeder. Its sole Cvar_Register is commented
 *                               out; libclang strips the comment so feeder-a
 *                               sees no registration and feeder-b's textual
 *                               scanner must surface the disabled line.
 *   GATE 3  fix_reachable       build-excluded (a live cvar). Its registrar
 *                               (RegisterReachable) sits in the normal
 *                               main -> Host_Init -> RegisterReachable
 *                               cascade, reachable in every variant.
 *
 * NO #ifdef guards anywhere: every function compiles in all four ezQuake
 * variants (client / server / win / apple). That is load-bearing -- it makes
 * GATE 1 "unreachable in EVERY compiled variant" and GATE 3 "reachable in
 * every variant". A guard here would change the verdicts. Keep it flat.
 *
 * The BFS roots are the function NAMES "main" and "Host_Init"
 * (_callgraph._ENTRY_ROOTS_*). The cascade below seeds from both.
 */

/*
 * Minimal cvar_t. The call-graph passenger's _record_cvar_decl_ident only
 * needs node.type.spelling == "cvar_t" and a first string-literal field (the
 * cvar name), mirroring the ezQuake idiom `cvar_t x = {"x", "0"};`. The C
 * identifier is kept identical to the name string for each cvar so the
 * probe can query reachable() by the same token feeder-b's regex captures.
 */
typedef struct cvar_s {
	char *name;
	char *string;
} cvar_t;

/* The registration API the passenger recognizes (_CVAR_REGISTER_APIS). A
 * real prototype keeps the CALL_EXPR spelling stable as "Cvar_Register". */
void Cvar_Register(cvar_t *var);

/* ---- GATE 3: reachable in every variant -> build-excluded ------------- */
cvar_t fix_reachable = {"fix_reachable", "0"};

void RegisterReachable(void)
{
	Cvar_Register(&fix_reachable);
}

/* ---- GATE 1: compiled but unreachable -> genuine-dead (callgraph) ----- *
 * NeverCalled has zero callers and its address is never taken, so the
 * per-variant BFS never reaches it -- yet libclang DOES compile its body
 * (it lands in _compiled_fns). That is precisely the genuine-dead-via-
 * callgraph shape: unreachable in every compiled variant AND compiled in
 * at least one. */
cvar_t fix_dead_cg = {"fix_dead_cg", "0"};

void NeverCalled(void)
{
	Cvar_Register(&fix_dead_cg);
}

/* ---- GATE 2: only registration is commented out -> genuine-dead
 * (commented-register feeder) ------------------------------------------- *
 * fix_dead_commented has a real cvar_t decl but its ONLY Cvar_Register is
 * the disabled line below. libclang strips the comment, so feeder-a reports
 * _no_registration and feeder-b's textual scanner must find the line and
 * cite probe_fixture.c at its line number. The line MUST use a `//` line
 * comment -- feeder-b's regex (_COMMENTED_REG_RE) anchors on `^\s*//`. */
cvar_t fix_dead_commented = {"fix_dead_commented", "0"};

void RegisterCommented(void)
{
	// Cvar_Register(&fix_dead_commented);
}

/* ---- entry cascade: main -> Host_Init -> {RegisterReachable, ...} ----- *
 * RegisterCommented is called too (so the file reads like a normal init
 * path) but its reachability is irrelevant to GATE 2 -- feeder-b only needs
 * the textual cite. NeverCalled is deliberately absent from this cascade. */
void Host_Init(void)
{
	RegisterReachable();
	RegisterCommented();
}

int main(void)
{
	Host_Init();
	return 0;
}
