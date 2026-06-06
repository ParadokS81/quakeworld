# Phase 3 describe-fill -- mother ledger (QTV + QWFWD)

**Arc:** 2026-06-05-qtv-qwfwd-l1-extraction
**Phase:** 3 (describe-fill)
**Anchor versions:** QTV `1.16-dev` (pkg/qtv/qtv.go:29 `qtvRelease`); QWFWD `1.40-dev` (qwfwd.h:118 `QWFWD_VERSION_SHORT`)
**Source roots:**
- QTV: `apps/slipgate-app/reference/qtv/` (Go 1.24, frozen vendored snapshot)
- QWFWD: `apps/slipgate-app/reference/qwfwd/` (C, frozen vendored snapshot)

## How a batch worker reads this

Read this file ONCE at the start of your batch, before reading anything else. It
is your primed context. Do NOT re-derive the standing rules -- they are locked here.
Your batch brief will supply the per-knob facts. Process your batch, then return a
tight DELTA (one paragraph) the mother appends.

## STANDING RULES (every batch worker enforces these)

### SR-1: Seeds are project-scoped; there is no cross-project seed bleed

- QTV seeds ONLY: `qtv.cfg` (Go target config, verified path
  `apps/slipgate-app/reference/qtv/resources/qtv.cfg`) and the Go source tree
  under `apps/slipgate-app/reference/qtv/pkg/`. No other file is a QTV seed.
- QWFWD seeds ONLY: `qwfwd.cfg` (verified path
  `apps/slipgate-app/reference/qwfwd/resources/example-configs/qwfwd.cfg`) and
  the C source tree under `apps/slipgate-app/reference/qwfwd/src/`. No other
  file is a QWFWD seed.

### SR-2 (D6 guard): the C-vs-Go QTV trap -- LOAD-BEARING

nQuake ships a C-QTV config. It is a DIVERGENCE SIGNAL, never a seed. The C-QTV
config registers knobs that DO NOT EXIST in the Go QTV target:

  `mvdport`, `admin_password`, `floodprot`, `allow_http`

These four knobs exist ONLY in `fteqtv/` (a different codebase, D13 scope fence).
They are absent from every `qvs.Reg`/`qvs.RegEx`/`qvs.Regf` call-site in
`apps/slipgate-app/reference/qtv/pkg/`. The Phase-2 L1 row set (40 cvars + 12
commands) does NOT contain them.

**D6 REJECT-LIST (QTV workers only):** if your candidate description mentions or
is seeded from `mvdport`, `admin_password`, `floodprot`, or `allow_http`, REJECT
it and re-source from the Go register-site. The Go equivalents are:

- `mvdport` -> `listen_address` (Go: `http.go`, `qVarFlagInitOnly`)
- `admin_password` -> `qtv_password` (Go: `downstream_storage.go`)
- `floodprot` (C command) -> `fp_time`, `fp_limit`, `fp_message` (Go triplet, `downstream_storage.go`)
- `allow_http` (C) -> `http_enabled`, `http_address` (Go: `http.go`)

QWFWD workers are not affected by this rule (QWFWD has no C-vs-Go split).

### SR-3: Deployment-default divergences -- flag in reasoning, never in description

QTV `maxclients`: Go source default = `1000` (registered `qvs.RegEx` in
`downstream_storage.go`). nQuake template = `100`. Describe the SOURCE default
(`1000`). If the divergence is material to a server operator, note it in
`description_reasoning` only -- never in `description`.

QWFWD `masters`: source default = `3` master servers (verified from
`query.c:697-700`). nQuake adds a 4th (`qwmaster.ocrana.de`). Describe the
source default (3 masters). Same flag-in-reasoning rule.

### SR-4: See-also wiring for QTV<->MVDSV handshake knobs

The following MVDSV rows were shipped in the sibling arc and are the correct
See-also anchors for QTV knobs that touch the MVDSV-QTV auth/streaming handshake:

- `qtv_password` (MVDSV side): ledger at
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_password.md`
- `qtv_maxstreams` (MVDSV side): ledger at
  `docs/.../mvdsv-svdemo-ledger-qtv_maxstreams.md`
- `qtv_streamport` (MVDSV side): ledger at
  `docs/.../mvdsv-svdemo-ledger-qtv_streamport.md`

For the QTV knobs `qtv_password` and related auth knobs: include a `See also:`
reference to the corresponding MVDSV knob in the description (D20 template `See also:` line).
For cross-engine wire protocol context: `research/repos/fteqw/fteqtv/source.c` (AUTH
PLAIN/MD4/CCITT, SOURCE/SOURCELIST/DEMOLIST) and
`research/repos/fteqw/specs/hosting.txt` (MVDSV-side enablement: `net_enable_qtv`,
`sv_port_tcp`, `qtv_password`, `qtv_maxstreams`) are admissible AIDS to locate
use-site context -- source register-site stays ground truth, these are corroboration
only (D6/D7 amendment: research docs are admissible AIDS, not substitute citations).

### SR-5: Concept-note breadcrumbs -- capture, do not author (D9)

Three concept-note candidates are identified (D9; authoring deferred to Phase 4 decision):
1. Master-server registration/heartbeat (`masters*` across qwfwd+qtv+mvdsv senders vs ezquake querier).
2. MVD streaming + `parse_delay` ghosting (qtv `parse_delay`/`tick_time` <-> mvdsv MVD source <-> ezquake viewer).
3. `qtv_password` cross-codebase auth matrix (PLAIN/MD4/CCITT/SHA3 negotiation).

When a knob's description touches one of these candidates, add a `[L3 breadcrumb: <candidate>]`
tag to `description_reasoning`. Do NOT author a concept note. These tags feed Phase 4's decision.
(Mother note: Phase 4 bias is candidate (a) author-strong, (b) defer-if-thin, (c) defer --
so the masters* and parse_delay/tick_time harvests are the load-bearing ones. If parse_delay
and tick_time yield no breadcrumb, that ABSENCE is itself the Phase-4 signal -- report it.)

### SR-6: D6Record JSON shape (the per-knob ledger contract)

Each per-knob ledger file contains exactly ONE fenced json block. The
`synthesize-qtv.ts --from-ledger` / `synthesize-qwfwd.ts --from-ledger` scripts
parse this block. Shape (mirrors the D6Record in `synthesize-mvdsv.ts`):

```json
{
  "project": "qtv",
  "knob": "<knob-name>",
  "type": "cvar",
  "description": "...",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "...",
  "description_proposed": null
}
```

For QWFWD: `"project": "qwfwd"` and `"description_anchor_version": "1.40-dev"`.
`description_provenance` is `null` for cold-synth (no shipped-doc multi-source candidate --
operator clarification 2026-05-30 from sibling arc).
`description_origin` MUST be exactly `"synthesized"` (the in-vocabulary token verified
from `012_description_origin.sql`; a different value breaks the `origin_vocabulary` probe).
The ledger file MUST contain exactly ONE ```json block -- zero or >1 aborts the whole
batch persist (extractLedgerRecord contract). All file:line / code-jargon cites go in
`description_reasoning`, NEVER in `description` (D20 hard split).

### SR-7 (F15): the 11 QWFWD source_inline stubs are NOT user-doc -- synthesize, do not affirm

11 QWFWD rows arrived from the loader carrying `description_origin='source_inline'`
(NOT NULL like the other 91). These are adapter residue, NOT owned user-doc:

- 5 commands: `alias`, `cvarlist`, `echo`, `serverinfo`, `wait` (raw C source-comment
  text; `cvarlist` carries a literal `TODO`; `alias` misspells "separated").
- All 6 info_keys: adapter placeholders shaped `userinfo info key: <name>; ops [...]`.

None clear the D20 user-doc shape. SYNTHESIZE every one fresh from the
register/use-site; do NOT affirm-and-keep the stub. The end state for all 11 MUST be
`description_origin='synthesized'` (the V2 boundary probe fails on ANY remaining
`source_inline`). Sibling-arc precedent: ktx 56 + mvdsv 45 info_keys are ALL
`synthesized`, 0 `source_inline` -- the precedent is convert, not affirm.

### SR-8 (F11): QWFWD net_ip / net_port carry a variable-name default, not a literal

The extractor emitted `default_value="ip"` (net_ip) and `"port"` (net_port) -- these
are C variable NAMES, not runtime defaults (`net.c:277-284` registers them with a
variable arg; an AST extractor cannot data-flow-resolve them). The describe author
reads `net.c` and surfaces the REAL defaults in the `description`:

- `net_ip`: defaults to `0.0.0.0` (all interfaces) when no `-ip` cmdline.
- `net_port`: defaults to `QWFWD_DEFAULT_PORT` = `30000` when no port cmdline.

Both are cmdline-overridable. Describe the real default in the prose. Do NOT try to
correct the `default_value` column (re-extraction always re-emits the variable name;
a static column override is out of this phase's scope).

## BATCH LOG (append one line per batch wave)

<!-- Executor appends one line per wave: [date wave knob-count verdict-summary] -->
- 2026-06-06 | QWFWD cvars (QWFWD-1, incl. calibration) | 13/13 synthesized, all TRACED-CLEAN | F-D6a + V-pass(masters) green | findings: stale S2M_HEARTBEAT comment (caught), F11 CLI is positional not -ip flag (descriptions correct), 4 master-registration breadcrumbs. See batch-ledger-qwfwd-cvars.md.
- 2026-06-06 | QWFWD commands (QWFWD-2/3) | 29/29 synthesized, all TRACED-CLEAN | F-D6a structural grep-verify green (ban shared-list, whitelist dest-gate+cap, no-own-rcon) | 5 SR-7 stubs converted (cvarlist/alias/echo/wait/serverinfo); access model = console/config only; heartbeat breadcrumb. See batch-ledger-qwfwd-commands.md.
- 2026-06-06 | QWFWD cmdline+info (final QWFWD wave) | 8/8 synthesized; 6 info_keys = SR-7 conversions -> F15 FULLY RESOLVED | dry-run + LIVE apply 50/50 persisted 0 errors; V1 missing=0, V2 synthesized-only, V3 anchor ok, V7 prov ok, V8 idempotent (skip 50, fp 6a871898... unchanged). See batch-ledger-qwfwd-cmdline-info.md.
- 2026-06-06 | *** QWFWD HALF COMPLETE + APPLIED (50/50 synthesized, verified) *** | handing off QTV (52: 40 cvar + 12 command) to a FRESH mother at context budget (D10 / executor-prompt). QTV remains: synthesis + apply + FULL V1-V11 (incl. V6 D6 probes -- load-bearing) + halt-to-orchestrator. Fresh mother reads phase-3-qtv-mother-handoff.md.
- 2026-06-06 | QTV cvars-A (W1: qtv.go core / downstream auth+flood / upstream_storage / log+masters) | 21/21 synthesized, all TRACED-CLEAN (synth self-class + independent Opus V-pass on all 9 D6-sensitive + network canary; 0 C-FIX/0 C-NEAR-MISS/0 WI2-FIX) | F-D6a grep-verify green; D6 flavour-C exclusions HELD (masters no host:port/no cap; fp_persecond window-not-rate; qtv_password real SHA3-512 not crypto.go XXH3); F-QTV1 found (planning docs say fp_time/fp_limit/fp_message; real Go triplet is fp_messages/fp_persecond/fp_secondsdead -- briefs corrected); breadcrumbs (a) masters + (b) parse_delay & tick_time BOTH fire (candidate b NOT thin). See batch-ledger-qtv-cvars-A.md.
- 2026-06-06 | QTV cvars-B (W5 http core / W6 http uploads+TLS / W7 allow_download family / W8 dstream buffers) | 19/19 synthesized, all TRACED-CLEAN (synth + independent Opus V-pass on http_enabled D6 + upload limits + download cascade; 0 defects) | F-D6a grep-verify green; source-corrects-the-name catches: http_upload_total_limit=aggregate disk-retention cleanup (deletes oldest) NOT per-request reject vs http_upload_file_limit=per-file MaxBytesReader; allow_download=hierarchical AND (master gate + security exclusions .cfg/.key/dot/abs/non-subdir + per-type), models keys on progs/ not models/, demos ext-whitelist .mvd/.gz/.zip/.bz2; HTTPS needs both cert+key (else HTTP), all http_* init-only; dstream ringbuffer 2x internal deliberately NOT asserted (third-party pkg unvendored, Step 4 guard). 40/52 QTV done. See batch-ledger-qtv-cvars-B.md.
- 2026-06-06 | QTV commands (W9 upstream / W10 downstream+status+varlist / W11 cmd.go control) | 12/12 synthesized, all TRACED-CLEAN (synth self-class + F-D6a grep-verify all 12 + independent Opus V-pass on qtv + exec; 0 defects) | exec flavour-C HELD (case-SENSITIVE .cfg, search root->qtv->qw->id1, `..` collapsed-not-rejected -- all Go-specific, NOT copied from qwfwd C); qtv two distinct passwords (positional=auth-to-source vs named=downstream-viewer); access model = console/config only, no rcon/no tiers (matches QWFWD); breadcrumb (b) qtv delay option. *** QTV COMPLETE 52/52 *** next: apply (synthesize-qtv.ts) + full V1-V11. See batch-ledger-qtv-commands.md.
