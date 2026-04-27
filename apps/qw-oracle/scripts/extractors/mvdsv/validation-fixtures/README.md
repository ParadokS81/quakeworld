# MVDSV Validation Fixtures

## ciscon-1.20-dev-2026-04-27.log

Production server `cvarlist` + `cmdlist` dump from `nicotinelounge.com KTX #1`,
captured 2026-04-27 by operator. Server identity per the dump:

- Engine: MVDSV 1.20-dev (post-1.11 head, build date 2026-04-11)
- Mod: KTX 1.47-dev
- Platform: Linux ARM64

Total: 758/758 cvars, 107/107 commands.

## ktx-progs-prefixes.txt + ktx-progs-allowlist.txt

Filter list for the runtime-validation diff. Cvars/commands matching one of
the prefixes (or appearing on the allowlist) are KTX-progs registrations
visible in the live server but not in MVDSV C source. Filter them out before
declaring an extractor gap.

The allowlist starts as a seed; new entries get added when runtime-validation
surfaces them and source inspection confirms they are KTX-side.

## How to refresh the dump

For a fresh dump from any MVDSV server:

```
rcon <pw> log_file 1
rcon <pw> cvarlist
rcon <pw> cmdlist
rcon <pw> log_file 0
# fetch <gamedir>/qconsole.log
```

Save with the filename pattern `<server>-<engine-version>-YYYY-MM-DD.log`.
