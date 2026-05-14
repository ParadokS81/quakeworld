# Cross-project Unraid scoping convergence -- arc capture

**Captured:** 2026-05-14 by arc-classifier mode S (sidequest, mid-orchestrator-session during qwiki-v1-beta Phase 1 boundary review).
**Status:** shelved (awaiting trigger).
**Trigger to start:** operator-initiated; cheap to schedule between bigger arcs. May also be triggered organically by a "deploy a new project onto Unraid" moment (the new project's deploy README would crib from the convention; the arc lifts the same pattern to existing projects).

## Why this is arc-shaped

Three classification criteria fire: multi-phase (one phase per project to retarget: quad / qw-stats / qw-oracle; qwiki-v1-beta already on the new convention), cross-cutting (the SSH-identity convention is itself a cross-project decision that lives above any individual project's CLAUDE.md), verification regime per phase (each retargeted project's deploy must still work + maintenance commands must succeed + no regression in the operational tooling).

## Scope sketch

Lift the qwiki-v1-beta `claude-deploy` non-root user + `ssh unraid-deploy` alias convention to the three other Unraid-deployed projects (quad, qw-stats, qw-oracle) so all four projects share a consistent scoped-deploy identity. Each project gets its own chowned `/mnt/user/appdata/<project>/` subtree (claude-deploy as owner, docker group). DEPLOYMENT.md files retargeted to `ssh unraid-deploy`; hardcoded `root@100.114.81.91` literals in qw-stats + qw-oracle drop the IP and switch to the alias. Runnable state at arc end: all four projects deploy + maintain via the same scoped identity; `ssh unraid` (root) reserved for genuine operator-only privileged operations (compose-plugin reinstall after Unraid reboot, host-level filesystem ops, anything that needs root).

## Current state snapshot (2026-05-14 audit, from qwiki-v1-beta Phase 1 boundary)

| Project | Identity | Pattern | Subtree |
|---|---|---|---|
| quad | `ssh unraid` (alias -> root) | Alias-based, root user | `/mnt/user/appdata/quad/` |
| qw-stats | `ssh root@100.114.81.91` | Literal Tailscale IP + root, no alias | `/mnt/user/appdata/qw-stats-api/` |
| qw-oracle | `ssh root@100.114.81.91` | Literal Tailscale IP + root, no alias | `/mnt/user/appdata/qw-oracle/` |
| qwiki-v1-beta | `ssh unraid-deploy` (alias -> claude-deploy) | Alias-based, scoped non-root | `/mnt/user/appdata/qwiki-beta/` |

Operator's `~/.ssh/config` has both `unraid` (root + id_rsa) and `unraid-deploy` (claude-deploy + claude_deploy_ed25519) aliases live. The scoped user was set up mid-Phase-1 of qwiki-v1-beta (commit `21a7b7d1` retargeted the deploy README; the user-creation steps live in the operator's separate unraid project).

## Open questions for the brainstorm

- Order of retargets: which project first? qw-oracle has the most-trafficked deploys (post-Arc-1 maintenance + snapshot publishes); quad has heavy Discord-driven runtime traffic but rare redeploys; qw-stats is smallest. Probable order: qw-stats first (smallest, learn the pattern), qw-oracle second (most leverage), quad last (most runtime sensitivity, rare deploys).
- Convergence depth: just the SSH identity, or also lift hardcoded `root@100.114.81.91` to alias-based form? Two separable layers -- could ship the alias-only retarget first (low risk) and the non-root scoping second (medium risk, container ownership validation per project).
- qw-stats `DEPLOYMENT.md` has a literal `PG_PASSWORD=...` in a docker run command. File is gitignored, but plaintext on WSL disk. Bundle a `.env` migration into this arc, or ship as a separate small followup before the arc starts?
- Per-project chown semantics: claude-deploy owns the appdata subtree at uid 1002, but containers run their own internal users (mariadb container is uid 999, postgres container is uid 999). Need to validate that the docker-group + ownership pattern doesn't break container startups (qwiki Phase 1 validated this for mariadb 11.4; postgres + quad's stack need their own probes during their respective phases).
- Does any project use `ssh unraid` for genuine root-required operations (host-level scripts, `/boot/config` touches)? If so, those references stay as `ssh unraid`; convergence only retargets deploy/maintenance commands.
- Should the arc also publish a top-level convention doc (e.g., monorepo-root `docs/conventions/unraid-deploy.md`) so future projects pick the right pattern by default? Decision belongs in the arc-planner pass, not here.

## What is NOT in scope

- phoenix (operator-side poker affiliate site project; outside this monorepo).
- slipgate-app (Tauri desktop companion; no Unraid deploy surface).
- matchscheduler (Firebase web; no Unraid).
- Migrating off Unraid entirely (long-term Hetzner consideration per qw-oracle D3; separate operational arc).
- Cloudflare Tunnel reconfiguration (Tunnel agent runs as root via the cloudflared container; this arc does not touch the Tunnel layer).
- Per-container internal-user changes (each project's container uids stay as-is; the convergence is about the SSH/host-side identity, not container internals).

## Operator notes

- Surfaced 2026-05-14 during qwiki-v1-beta Phase 1 boundary review: "maybe i already made a mess of things to not have a proper standard for all the quake projects." Framing: not urgent, parkable, "something I could work on in another session that shouldnt affect our work."
- The scoping pattern was an organic mid-deploy decision during qwiki-v1-beta Phase 1 (a separate Claude session set up the claude-deploy user + chowned the subtree + added the SSH alias). Not pre-designed; qwiki inherited the benefit.
- Cheap to defer; the current 3-way drift is not breaking anything. Each project ships fine on its own pattern.
- Operator declined to write a preemptive `reference_unraid_claude_deploy_scoping.md` memory entry; this parking doc captures the convention details, so the memory entry can land as part of the arc itself.

## Related

- **Source convention:** qwiki-v1-beta deploy README SSH identity section, `apps/qwiki-sandbox/deploy/README.md` lines 27-31; introduced via commit `21a7b7d1` (deploy README retarget) on 2026-05-13.
- **Current-state audit:** the 2026-05-14 orchestrator session's audit (this parking doc's snapshot table), surfaced by operator's question "can you check what quad is using?" mid-Phase-1-boundary review.
- **F2 sub-finding 4** in `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md` -- documents the docker-as-elevated-user pattern (non-root claude-deploy uid 1002 can't `rm -rf` uid-999 mariadb files; recovery via docker-based alpine container running as root). The pattern is part of the convention and the arc should carry it forward.
- **D3 amendment** in `decisions.md` of qwiki-v1-beta -- URL convention `wiki.slipgate.me` aligns with sibling `oracle.slipgate.me`; same naming convention for slipgate.me-zone Unraid services. Not directly part of this arc, but the same architectural reflex (consistent naming across Unraid-side internal services) underpins both decisions.
