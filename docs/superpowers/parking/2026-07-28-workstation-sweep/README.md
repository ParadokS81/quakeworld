# Workstation sweep — 2026-07-28 (D10 demotion salvage)

Final salvage from NexusLite-PC (Prague workstation) before its demotion to
recovery-plane-only. The previous commit on this branch lands the 12 files that
existed nowhere else; these two patches preserve the clone's stash list:

| Patch | Origin | Contents |
|---|---|---|
| `stash-0-main-ezquake-snapshot-wip.patch` | `stash@{0}` — WIP on main (e24f8848, ezquake snapshot regen era) | 6 files, 42+/6− |
| `stash-1-feature-qw-config-align-wip.patch` | `stash@{1}` — WIP on feature/qw-config (8b22ce5) | 8 files, 179+/92− |

Apply with `git apply <patch>` on a checkout near the named base commits.
Patches carry tracked changes only (neither stash held untracked files beyond
what the sweep commit already landed).

Context: the big untracked corpora (discord-exports-full, irc-logs,
slipgate-planning) are deliberately NOT in this branch — they live in
`/mnt/user/appdata/dev/archives/workstation-irreplaceables-2026-07-20/` on
Slipgate, per that directory's RESTORE.md.
