# qw-oracle/curated/concept-notes/

Layer 3 corpus -- hand-authored notes synthesizing Layer 1 facts and Layer 2 testimony into usable guidance. The MCP `get_concept_note` tool serves this directory live.

Authoring conventions, frontmatter shape, voice/length tiers, and the human-facing notes table live in `README.md`. Stewardship playbook in `OPERATIONS.md`. Project skills (`.claude/skills/` at the repo root): `guide-rewrite` when porting an ezquake.com docs page, `domain-concept-curate` for a demand-ranked player-help note, `game-mode-curate` for a KTX mode; `extraction-review` when walking a Phase 2f tag-pair. After editing a note, `bun scripts/load-concepts/index.ts` + `bun run embed:chunks` -- the loader is the only path into the DB.

## Documentation index

| When you need... | Read... |
|---|---|
| Authoring conventions, frontmatter, voice/length tiers, human-facing notes table | `README.md` |
| Stewardship playbook (feeding paths, lifecycle, feedback loop) | `OPERATIONS.md` |
| Contributor-onboarding seed for the ezquake.com gap report | `_gap-report.md` |
| Game-mode concept-note methodology (experience-group classification / frontmatter schema / section structure / triage rules) | `_methodology/game-modes/` |
| `.kmap` legacy keymap system + nQuake persistence | `kmap-legacy-keymap-system.md` |
| Engine-internal vs player-facing files classifier | `engine-internal-vs-player-facing-files.md` |
| Skywind animated skyboxes ported from IronWail | `skywind-animated-skyboxes.md` |
| Completing legacy FTE protocol extensions in ezQuake 3.6.6 | `completing-legacy-fte-protocol-extensions.md` |
| Client-side server-exec allowlist (security policy) | `client-side-server-exec-allowlist.md` |
| userinfo/serverinfo protocol -- how client, server, and KTX share player state | `qw-userinfo-serverinfo-protocol.md` |
| QW competitive ruleset anti-script restriction pattern | `ruleset-anti-script-restriction-pattern.md` |
| QuakeWorld weapon scripts -- the three practical methods | `weapon-scripts.md` |
| Customizing the Lightning Gun | `lightning-gun-customization.md` |
| Player skins: identification, visibility, tracking | `player-skins.md` |
