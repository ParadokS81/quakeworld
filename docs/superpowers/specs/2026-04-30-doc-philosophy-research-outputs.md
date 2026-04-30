# Doc Philosophy — Research Outputs (Amendment 11)

**Date:** 2026-04-30
**Status:** Approved. Skill + reference updates apply this session; QWFWD migration applied this session as the worked-example landing.
**Extends:** `docs/superpowers/specs/2026-04-30-doc-philosophy-amendments.md` (the ten-amendment spec — extended, not modified; amendment numbering continues from #10), and through it the 2026-04-11 origin and 2026-04-29 Mode→Phase rewrite.
**Driver:** Slipgate retrofit prep audit (2026-04-30) discovered `apps/slipgate-app/docs/research/QWFWD-SECURITY.md` — a 23KB closed investigation into a QWFWD proxy exploit (wirequake) and proposed mitigations. The investigation produced findings as artifact: no implementation arc, no revival intent, not Layer 2 reference, not Layer 3 pattern guide. The existing taxonomy had no honest home. The 2026-04-30 amendments cover in-flight work (specs/plans/parking/preplans), Layer 1/2/3 docs, and decommission discipline; closed-investigation outputs were a gap.

---

## Amendment 11 — Research outputs

### Rule

**Research output** is a closed investigation: a paper-shaped doc capturing findings from focused work that produced knowledge but no implementation arc. The findings ARE the artifact; no spec or plan is forthcoming.

**Default placement:**
- Ecosystem-scope (cross-app, QW-community, upstream tooling) → `docs/research/<YYYY-MM-DD>-<slug>.md` at monorepo root.
- App-internal (specific to one app's domain) → `apps/<app>/docs/research/<YYYY-MM-DD>-<slug>.md`.

**Filename convention:** date-prefixed `YYYY-MM-DD-<slug>.md` matching the superpowers convention dirs. Prevents collisions; carries the timeline visually.

### Recognition — when something is research vs another type

The category fills a gap the prior taxonomy didn't address. Decision flow when a session produces findings that need a home:

1. **Findings will inform an implementation arc soon?** → write a spec (`docs/superpowers/specs/`).
2. **Findings might revive into an arc someday but not now?** → parked-with-purpose under `docs/superpowers/parking/`, with stated revival intent in the file body.
3. **Findings became ongoing reference material the project consults regularly?** → promote to a Layer 2 doc.
4. **Findings ARE the artifact — captured for record, no further action planned?** → research output, the new doctrine.

The boundary with parking: parking is parked-with-purpose (active intent to revive). Research is closed (no revival intent stated). If you can articulate revival intent ("we'll come back to this when X"), write parking; otherwise research.

The boundary with Layer 3 concept notes: Layer 3 is **ongoing pattern guidance** — content that helps Claude work with a subsystem on an ongoing basis. Research is a **snapshot of one investigation** at a point in time. Layer 3 has continuous applicability ("how to think about teamsay scripts"); research is bounded ("what we learned about QWFWD's exploit surface in March 2026").

If a research output later proves broadly applicable as pattern guidance, it can be promoted: rewrite as a Layer 3 concept note in the appropriate scope, then delete the research file (per amendment #6 decommission discipline). Operator-decided, not skill-enforced.

### Routing — root vs app-internal

| Scope | Where it lives | Indexed from |
|---|---|---|
| Ecosystem-scope (cross-app, QW-community, upstream tooling) | `docs/research/` (monorepo root) | Root `CLAUDE.md` |
| App-internal (specific to one app's domain) | `apps/<app>/docs/research/` | App `CLAUDE.md` |

When in doubt: ecosystem-scope. Cross-pollination is easier from root than from a buried app dir, and most QW-domain research transcends one app's boundary.

### docs-check skill behavior

`docs/research/` (root and per-app) joins the existing special-conventions spaces (the superpowers convention dirs). Concrete behavior:

- **Birth check excluded.** The directory naming carries the classification. No 3-field announcement needed when writing to `docs/research/<file>.md` (parallel to how `docs/superpowers/specs/*` is excluded from birth check).
- **Index walk treats research as dir-level pointer.** Root `CLAUDE.md`'s `## Documentation index` indexes the directory ("Standalone investigations / research papers" → `docs/research/`). Individual research files are reachable via the dir-level pointer; no per-file index entries needed (parallel to how `docs/superpowers/specs/` is indexed).
- **Orphan detection excluded.** Files in `docs/research/` aren't orphans even without individual pointers (the dir-level pointer suffices). Parallel treatment to `docs/superpowers/specs/` and `docs/superpowers/plans/` in the existing exclusion table.
- **Append-only chronicle.** Research files are write-once. Operations on them follow the chronicle pattern: write, leave as record. If findings are superseded, write a new research output and `Replaces:` the prior one (per amendment #6).

### Worked example — the QWFWD migration

`apps/slipgate-app/docs/research/QWFWD-SECURITY.md` (2026-03-25, ~23KB) investigates the wirequake exploit against QWFWD and proposes mitigations. QWFWD is a QW-ecosystem proxy slipgate doesn't run; the investigation is advocacy material for upstream maintainers + community knowledge.

Routing decision: **ecosystem-scope** (slipgate doesn't run QWFWD; the value is QW-community-wide).

Migration applied this session:
1. `apps/slipgate-app/docs/research/QWFWD-SECURITY.md` → `docs/research/2026-03-25-qwfwd-security.md`.
2. The slipgate-internal `docs/research/` directory becomes empty, removed during this same arc.
3. Root `CLAUDE.md` gains a row in its `## Where to find things` table (renamed to `## Documentation index` during slipgate retrofit per amendment #5) pointing to `docs/research/`.

### Out of scope

- **Auto-promotion mechanism research → Layer 2 / Layer 3.** Operator decision, not skill enforcement.
- **Research output frontmatter format.** Date + slug in filename suffices; no structured frontmatter required (parallel to how specs use frontmatter for `Replaces:` only when needed).
- **Cross-linking conventions between research outputs and specs.** Specs that build on a research output can `Extends:` the research filename if relevant; not required.
- **Migration of other apps' potential research dirs.** None exist today; doctrine applies forward-going.
- **The actual slipgate retrofit pass.** Separate session. This spec only enables the retrofit by establishing where QWFWD-SECURITY.md lands.

---

## docs-check skill update (this session)

Three concrete changes to `~/.claude/skills/docs-check/SKILL.md`:

1. **Birth check exclusion list** (in section "Birth check — session-time, before any `.md` Write"): add `Research dirs: docs/research/, apps/<app>/docs/research/` after the existing exclusion bullets.

2. **Phase 2 Step 2 exclusion table** (in section "Index integrity walk + orphan detection"): add a row for `docs/research/`, `apps/<app>/docs/research/` treated like the superpowers chronicle dirs (excluded from orphan detection; reachable via dir-level pointer in root or app `CLAUDE.md`).

3. **Amendments-arc tracking table** (in section "Amendments arc 2026-04-30 — what's new"): add a row for amendment #11 noting the special-conventions space addition.

## doc-template.md update (this session)

Adds a new "## Research outputs" section between Layer 3 and the trailer, with the standard format: question answered, audience, trigger, what goes in / what doesn't, voice example, filename convention, placement table, target length, update cadence, distinctions from parking and Layer 3, skill behavior summary.

## doc-philosophy.md update (this session)

Adds entry "### 11. Research outputs (spec § Amendment 11 in 2026-04-30 doc-philosophy-research-outputs.md)" under the existing "## Amendments — 2026-04-30 arc" section. Brief rule + recognition flow + routing summary mirroring the other amendment entries.

## Root `CLAUDE.md` update (this session)

Adds row to the "Where to find things" table (will become `## Documentation index` post slipgate retrofit) pointing to `docs/research/`.

---

## Related docs and dependencies

- **Parent doctrine** — `docs/superpowers/specs/2026-04-30-doc-philosophy-amendments.md` (ten amendments). Extended; amendment numbering continues from #10.
- **Origin doctrine** — `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`. Extended through the 2026-04-30 amendments chain.
- **Mode→Phase rewrite** — `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md`. Extended through the 2026-04-30 amendments chain.
- **Skill** — `~/.claude/skills/docs-check/SKILL.md`. Updated this session per the three changes above.
- **Skill references** — `~/.claude/skills/docs-check/references/doc-template.md` (new section) and `references/doc-philosophy.md` (new amendment entry). Updated this session.
- **Migrated artifact** — `docs/research/2026-03-25-qwfwd-security.md` (was `apps/slipgate-app/docs/research/QWFWD-SECURITY.md`).
