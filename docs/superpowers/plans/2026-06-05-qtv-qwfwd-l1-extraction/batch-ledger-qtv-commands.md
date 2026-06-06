# Batch ledger -- QTV commands (Wave 3)

**Date:** 2026-06-06
**Project:** qtv  **Type:** command  **Anchor:** 1.16-dev
**Knobs:** 12 (all commands) -- all `synthesized`, all V-pass/self-class TRACED-CLEAN.
**Workers (3):** W9 upstream commands (4) / W10 downstream+status+varlist (4) / W11 cmd.go control (4).

## Per-command verdicts (all synthesized / TRACED-CLEAN)

| command | usage | primary handler ref | class |
|---|---|---|---|
| qtv | qtv <[streamId@]host:port> [password] [options] | upstream_storage.go:394 | TRACED-CLEAN (V-pass) |
| playdemo | playdemo <demo.mvd> | upstream_storage.go:418 | TRACED-CLEAN |
| close | close <streamId> | upstream_storage.go:430 | TRACED-CLEAN |
| list | list | upstream_storage.go:440 | TRACED-CLEAN |
| dclose | dclose <id> | downstream_storage.go:222 | TRACED-CLEAN |
| dlist | dlist | downstream_storage.go:232 | TRACED-CLEAN |
| status | status | qtv.go:449 | TRACED-CLEAN |
| varlist | varlist [pattern] | var.go:254 | TRACED-CLEAN |
| echo | echo <text> | cmd.go:291 | TRACED-CLEAN |
| quit | quit [anything] | cmd.go:297 | TRACED-CLEAN |
| exec | exec <filename.cfg> | cmd.go:324 | TRACED-CLEAN (V-pass) |
| cmdlist | cmdlist [pattern] | cmd.go:344 | TRACED-CLEAN |

## Verification (mother)

- **F-D6a grep-verify (load-bearing claims, confirmed live independently):**
  - exec extension switch (cmd.go:314-320): `case "": name += ".cfg"`; `case ".cfg":`; `default: return errors.New("cfg extension required")` -- exact-match -> case-SENSITIVE (.CFG refused). Backward-compat root-dir comment present.
  - exec path safety (pkg/qfs/qfs.go BasePath :18-32): `filepath.Join(base, filepath.Clean("/"+name))` COLLAPSES leading `..` (cannot climb above base) but does NOT reject mid-path `..`; absolute / leading-`\`/`/` / drive `X:` rejected; leading-dot rejected. Search order (qfs.Open): `[base="", "qtv","qw","id1"]` -> root first then qtv/qw/id1; first open wins. Front-insert via cmd.Prepend.
  - qtv parseOptions (upstream_storage.go:360-389): bare positional `Argv(2)` -> `usPassword` (auth TO source); named `password <p>` -> `dsPassword` (downstream viewer pw); `delay <s>` -> `ingameDelay` (overrides parse_delay); `address <a>` -> advertised address. Two passwords NOT conflated.
- **Independent Opus V-pass (B3 cold) on qtv + exec (the two behavior-rich commands):** both TRACED-CLEAN. Cold re-derivation confirmed: the qtv two-password direction at both parse-site AND use-site (usPassword -> outbound AUTH/PASSWORD, dsPassword -> inbound client check); the @-chain dials the rightmost host first; maxchains caps the @-count; exec's case-sensitivity (.CFG refused, empirically verified) and `..`-collapse-not-reject (description says "cannot reach above", does not over-claim a ..-reject).
- Remaining 10 commands: F-D6a grep-verify + worker self-class TRACED-CLEAN (QWFWD-command-half precedent: mechanical grep-verify is the canary for low-D6-risk command waves; Opus V-pass reserved for the behavior-rich ones).
- DB untouched; no worker committed.

## Findings (surfaced to mother / halt report)

1. **exec diverges from the qwfwd C sibling (flavour-C discipline HELD):** three verified Go-specific behaviors NOT copied from the C exec -- (a) case-SENSITIVE `.cfg` (qwfwd uses case-insensitive stricmp); (b) search order root->qtv->qw->id1 (qwfwd is qwfwd->qw); (c) `..` is collapsed by `filepath.Clean("/"+name)` not rejected (qwfwd rejects `..`). The worker traced each against Go (even ran a Go probe for filepath.Ext case behavior) and deliberately did NOT assert the C behavior. This is exactly the C-vs-Go discrimination D6 protects.
2. **qtv command two distinct passwords:** the bare positional password authenticates THIS proxy TO the source; the named `password <pw>` option sets the password DOWNSTREAM viewers must give to watch the stream. Described separately to avoid conflation.
3. **Access model (cross-cutting, matches QWFWD half):** QTV has no rcon command and no per-command access tiers -- dispatch is a flat `map[string]cmdFunc` lookup via execLine with no permission gate. All 12 commands are `Set by: proxy console / qtv.cfg` only. Source-verified, not name-inferred.
4. **Chesterton's-fence note (varlist ledger, not asserted in description):** a `set` command exists but is commented out (var.go:85-86, :244-252, "There is no need for set command right now"); variables are set via `name value` (Argc>1) or config. Recorded, not described.
5. **SR-5 breadcrumb:** qtv's per-stream `delay` option = the qtv-side of candidate (b) MVD streaming + parse_delay ghosting (overrides parse_delay). Tagged. No other command breadcrumbs (the rest are local console/lifecycle/introspection ops).

All 12 description_origin='synthesized', anchor=1.16-dev, provenance=null, type='command'. QTV COMPLETE: 52/52 (40 cvar + 12 command).
