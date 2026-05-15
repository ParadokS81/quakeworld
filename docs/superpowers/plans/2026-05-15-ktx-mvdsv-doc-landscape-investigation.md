# KTX / MVDSV Server-Doc Landscape Investigation -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a quantified evidence map of where KTX/MVDSV server documentation lives and whether it coheres into a foundation solid enough to build an L1 server-config knowledge base.

**Architecture:** This is an investigation, not a build. Orchestrator owns the shared foundation (probe-0 L1 baseline = the denominator) and all synthesis. Five independent source-class probes fan out as parallel read-only subagents, each writing one fixed-schema report into a parking folder. Orchestrator then assembles the README coverage tables, a machine-readable `coverage.ndjson`, and the `gap-findings.md` verdict. The "test" analog is schema-conformance verification of each probe report before synthesis.

**Tech Stack:** Markdown + NDJSON outputs; Postgres 16 (`qw_oracle`, dev container `qw-oracle-postgres-dev`) for the L1 baseline; `curl` via `r.jina.ai` for JS-rendered wiki pages; Agent tool (general-purpose subagents, Sonnet) for the fan-out.

**Spec:** `docs/superpowers/specs/2026-05-15-ktx-mvdsv-doc-landscape-investigation-design.md`

---

## Execution discipline

- All paths below are repo-relative to `/home/paradoks/projects/quakeworld` unless absolute.
- Probes are READ-ONLY except for writing their own single report file. No probe edits source, schema, or any other file.
- Commit after each task. Commit messages end with the trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>` (monorepo-internal; not an upstream PR).
- Sequencing constraint: Task 2 (probe-0) MUST complete and commit before Task 3 dispatches probes 1-5, because every probe expresses coverage as `N of M` where `M` is probe-0's per-domain denominator.

---

### Task 1: Scaffold the parking folder + README skeleton + report template

**Files:**
- Create: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md`
- Create: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/_report-template.md`

- [ ] **Step 1: Create the folder and the report template**

Write `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/_report-template.md` with EXACTLY this content (this is the fixed schema every probe fills in; `_`-prefixed so it sorts above probe files and reads as scaffolding):

```markdown
# Probe report: <SOURCE CLASS NAME>

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: <exact path or URL>

### Domain: <one of: cvars | commands | info_keys | cmdline | modes | log_templates | match_events | gameplay_tables | gameplay_taxonomies | protocol | qc_builtins | freeform_prose>

- **Coverage count:** <N> of <M> <domain> carry an admin-facing description here (<P>%). Denominator M source: probe-0 (`<engine>` `<domain>` registered set = <M>).
- **Format:** <structured field | shipped-config // comment | man page | wiki prose | runtime output | other:_____>
- **Structure quality:** <is enum/range/type recoverable? e.g. "0=off,1=on,2=liquid -> parseable into dropdown" | "free prose only" | "n/a">
- **Overlap / conflict:** <which other source duplicates or contradicts this; name the file/page and the specific drift, or "none observed">
- **Extractability for a future L1 spine:** <mechanical | LLM-assisted | hand-curate> -- <one-line why>

<repeat the Domain block for every domain this source documents>

## Probe notes

<free text: anything that does not fit the schema but the synthesis needs -- dead ends, surprises, structurally-derived domains touched opportunistically, why a source was thinner/richer than expected>
```

- [ ] **Step 2: Create the README skeleton**

Write `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md` with EXACTLY this content:

```markdown
# KTX / MVDSV Server-Doc Landscape -- Investigation Output

**Status:** IN PROGRESS. Spec: `docs/superpowers/specs/2026-05-15-ktx-mvdsv-doc-landscape-investigation-design.md`.

This folder is the assembled evidence map. Read order: this README (the picture) -> `gap-findings.md` (the verdict) -> individual probes (the evidence).

## Nav index

- `probe-0-l1-baseline.md` -- authoritative domain roster + current L1 per-domain counts/provenance (the denominator)
- `probe-1-ktx-in-repo.md` -- research/repos/ktx
- `probe-2-mvdsv-in-repo.md` -- research/repos/mvdsv
- `probe-3-nquake-distfiles.md` -- research/repos/nquake-distfiles
- `probe-4-wiki-corpus.md` -- live wiki + local QWiki SQL dump
- `probe-5-dangling-threads.md` -- link-rot, GitHub wiki tabs, runtime self-docs
- `coverage.ndjson` -- machine-readable (engine,domain,source) records
- `gap-findings.md` -- Phase-2 synthesis + verdict on the success criterion

## Assembled coverage (filled in Task 4)

_Cross-source coverage tables per domain per engine land here once probes complete._

## Verdict (filled in Task 6)

_The one-line answer to the spec's success criterion lands here, pointing at `gap-findings.md`._
```

- [ ] **Step 3: Verify the scaffold exists**

Run: `ls -1 docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`
Expected output (exactly these two lines):
```
README.md
_report-template.md
```

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): scaffold folder + fixed-schema template

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Probe-0 -- L1 baseline (orchestrator-inline; the denominator)

Done inline by the orchestrator, NOT a subagent: probes 1-5 depend on its denominators, and the synthesis (Tasks 4-6) must hold these counts in context.

**Files:**
- Create: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-0-l1-baseline.md`

- [ ] **Step 1: Enumerate the authoritative domain roster from the extractor handler sets**

Run:
```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle/scripts/extractors
for e in ktx mvdsv; do echo "=== $e ==="; ls $e/_handler_*.py | sed 's#.*/_handler_##; s#\.py##'; done
```
Record the exact handler list per engine. This is the roster source of truth; the spec's snapshot (KTX 8 / MVDSV 7) is a check, not the authority -- if the live set differs, the live set wins and you note the drift.

- [ ] **Step 2: Locate the DB connection**

Run: `grep -r "DATABASE_URL\|postgres://" /home/paradoks/projects/quakeworld/apps/qw-oracle/.env* 2>/dev/null | head; docker ps --format '{{.Names}}' | grep qw-oracle`
Expected: a `postgres://...` URL and/or the container name `qw-oracle-postgres-dev`. Use the `.env` `DATABASE_URL` if present; otherwise connect via the container: `docker exec -i qw-oracle-postgres-dev psql -U postgres -d qw_oracle`.

- [ ] **Step 3: Pull per-domain entity counts (the denominators M)**

The `entities` table carries `project`, `type`, and `description_origin` (migration 012; verified present this session). Run this SQL through the connection from Step 2:

```sql
SELECT project, type, count(*) AS m
FROM entities
WHERE project IN ('ktx','mvdsv')
GROUP BY project, type
ORDER BY project, type;
```

If the query errors on a column name, inspect the live schema with `\d entities` and adjust the column names, then record the corrected query verbatim in the report.

- [ ] **Step 4: Pull description provenance per domain**

```sql
SELECT project, type, description_origin, count(*) AS n
FROM entities
WHERE project IN ('ktx','mvdsv')
GROUP BY project, type, description_origin
ORDER BY project, type, description_origin;
```
`description_origin` values are `help_json` / `source_inline` / `synthesized` / NULL. NULL = no description at all (a hard gap).

- [ ] **Step 5: Write `probe-0-l1-baseline.md`**

Write the file with: (a) the per-engine handler roster from Step 1 and any drift vs the spec snapshot; (b) a table `engine | domain | M (registered) | help_json | source_inline | synthesized | NULL` from Steps 3-4; (c) a one-line-per-domain "denominator to cite" list that probes 1-5 will read (e.g. `ktx cvars M=NNN`, `mvdsv commands M=NNN`). Map handler names to `entities.type` values explicitly (e.g. handler `cvars` -> type `cvar`; `info_keys` -> type `info_key`); if a handler has no matching `type` rows, record M=0 and flag it.

- [ ] **Step 6: Verify the report has denominators for every rostered domain**

Run: `grep -c "M=" docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-0-l1-baseline.md`
Expected: a count >= the total rostered (engine,domain) pairs (KTX ~8 + MVDSV ~7 = ~15). If lower, a domain is missing a denominator -- fix before committing.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-0-l1-baseline.md
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): probe-0 L1 baseline (denominators)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Dispatch probes 1-5 in parallel (read-only subagents)

Dispatch all five in a SINGLE message (five Agent tool calls) so they run concurrently. `subagent_type: general-purpose`, `model: sonnet`. Each writes exactly one report file and edits nothing else.

Each prompt is the COMMON TEMPLATE below with its `<<<SOURCE-CLASS BLOCK>>>` replaced by that probe's concrete block. The template is complete and paste-ready; do not abbreviate it.

**COMMON TEMPLATE (paste fully into every probe, substituting the two ALL-CAPS slots):**

```
You are a read-only investigation probe for the KTX/MVDSV server-doc landscape study. You produce ONE markdown report file and edit nothing else. You do not modify source, the schema, or any other file.

Repo root: /home/paradoks/projects/quakeworld

Step A -- Read these first (mandatory context):
- The fixed report schema: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/_report-template.md
- The denominators: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-0-l1-baseline.md  (every coverage count you report uses M from here; cite the engine+domain+M you used)

Step B -- Do the investigation described in your SOURCE-CLASS BLOCK below. Quantify, do not hand-wave: every "coverage count" must be an actual N out of the probe-0 M with the % computed. Where you cannot get an exact N, state the method and give a defensible estimate labelled "(est.)" with the reasoning.

Step C -- Write your report to the EXACT path in your SOURCE-CLASS BLOCK, following _report-template.md's structure verbatim (one Domain block per domain this source documents; fill every mandatory field; use the "Probe notes" section for anything off-schema, including any structurally-derived domains you touched opportunistically: log_templates / match_events / gameplay_tables / gameplay_taxonomies / protocol / qc_builtins).

Step D -- Self-check before finishing: every Domain block has all 5 mandatory fields; every Coverage count states its denominator and source; every factual claim cites a concrete file path / line / URL. Do NOT commit (the orchestrator commits). Your final message: the report path + a 3-line summary (biggest coverage surface found, biggest gap, one surprise).

<<<SOURCE-CLASS BLOCK>>>
```

- [ ] **Step 1: Dispatch probe-1 (KTX in-repo)** -- general-purpose, sonnet. SOURCE-CLASS BLOCK:

```
SOURCE CLASS: P1 -- KTX in-repo. Write report to: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-1-ktx-in-repo.md

Investigate research/repos/ktx:
- src/world.c RegisterCvar / RegisterCvarEx call sites: how many of the registered cvars carry a trailing // comment vs are bare (give N/M/% against probe-0 ktx cvars M).
- Shipped configs resources/example-configs/ktx/ktx.cfg, mvdsv.cfg, server.cfg: per-cvar admin-facing comment coverage (this is the suspected richest surface -- quantify it hard: how many distinct k_*/sv_* set lines carry an explanatory comment, vs probe-0 M).
- src/commands.c CD_* command-description table: how many commands have a CD_ string vs CD_NODESC, vs probe-0 ktx commands M.
- resources/example-configs/ktx/configs/usermodes/*.cfg: enumerate every mode file; for each, list the cvars it sets. This is the modes domain -- N modes found vs operator estimate ~27.
- Enum/range prose density in ktx.cfg comments: how often is a comment a parseable value table like "0 = off, 1 = on, 2 = liquid" (this drives the structure-quality field and future GUI dropdowns).
- Opportunistically note any in-repo doc surface for ktx info_keys / log_templates / match_events / gameplay_* in Probe notes.
```

- [ ] **Step 2: Dispatch probe-2 (MVDSV in-repo)** -- general-purpose, sonnet. SOURCE-CLASS BLOCK:

```
SOURCE CLASS: P2 -- MVDSV in-repo. Write report to: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-2-mvdsv-in-repo.md

Investigate research/repos/mvdsv:
- docs/man/man6/mvdsv.6 : how many cvars and commands does the man page document, vs probe-0 mvdsv cvars/commands M (N/M/%). Characterize what it covers (cmdline flags? sv_* cvars? operational only?).
- README.md and any docs/: any sv_* / info_key / cmdline coverage; quantify.
- MVDSV is already in L1 -- frame every number as a DELTA: of probe-0's mvdsv rows, how many already have a description (use probe-0 provenance) and how many would this source newly cover or corroborate.
- Opportunistically note doc surface for mvdsv protocol / qc_builtins / log_templates in Probe notes.
```

- [ ] **Step 3: Dispatch probe-3 (nQuake distfiles)** -- general-purpose, sonnet. SOURCE-CLASS BLOCK:

```
SOURCE CLASS: P3 -- nQuake distfiles. Write report to: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-3-nquake-distfiles.md

Investigate research/repos/nquake-distfiles/ (focus sv-configs/ and siblings sv-ca, sv-ffa, sv-fortress, sv-configs, sv-docker):
- sv-configs/ktx/*.cfg vs the in-repo example-configs (probe-1): are they the same file, drifted, or richer? Quantify drift (which cvars/comments differ). This is the key overlap/conflict signal.
- sv-configs/ktx/SETUP_FFA_CTF.txt and any other *.txt / README: what prose admin guidance exists; which domains it explains.
- sv-configs/ktx/modes/ (note the "DONT EDIT" marker): the canonical mode definitions -- enumerate, compare to probe-1's usermodes set.
- The installer's interactive logic (look in research/repos/nquake-distfiles/linux/ and any install*.sh): what does it ASK the admin and what cvars/info_keys does it SET as a result -- this is implicit documentation of the "settings that matter".
- Coverage counts use probe-0 denominators; flag everything that overlaps probe-1/probe-3.
```

- [ ] **Step 4: Dispatch probe-4 (wiki corpus)** -- general-purpose, sonnet. SOURCE-CLASS BLOCK:

```
SOURCE CLASS: P4 -- wiki corpus. Write report to: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-4-wiki-corpus.md

Two sub-sources:
1. LIVE wiki (JS-rendered MediaWiki -- fetch via Jina: `curl -sL --max-time 40 "https://r.jina.ai/https://www.quakeworld.nu/wiki/<PAGE>"`). Pages: How_to_server, KTX, MVDSV, and every mode/setting page they link. For each linked page record: exists / redlink / stale. Quantify: of the modes in probe-1's usermodes set, how many have a live wiki page, and how many of those are substantive vs stub.
2. LOCAL QWiki SQL dump at apps/qwiki-sandbox/dumps/ : identify the dump file(s); the `page` + `text`/`revision` tables hold ALL articles, including ones not in live nav. Query (sqlite or mysql per dump format -- inspect first) for any page whose title or body matches ktx | mvdsv | server | setinfo | serverinfo | localinfo | the mode names from probe-1. The dump may hold more than the live site exposes -- that delta is a key finding.
- Coverage uses probe-0 denominators. Map which domains the wiki actually documents (mostly modes + connective/admin-workflow prose, little raw cvar meaning -- verify or refute).
```

- [ ] **Step 5: Dispatch probe-5 (dangling threads)** -- general-purpose, sonnet. SOURCE-CLASS BLOCK:

```
SOURCE CLASS: P5 -- dangling threads. Write report to: docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-5-dangling-threads.md

Chase, characterize, do not exhaustively mirror:
- The rotted wiki pointer: the KTX wiki page's "complete guide" link points at github.com/qwassoc/mvdsv. Fetch via Jina (`curl -sL "https://r.jina.ai/https://github.com/qwassoc/mvdsv"` and `.../qwassoc`). Does a `qwassoc` org / a lost KTX config guide exist? Is there content worth recovering?
- GitHub WIKI TABS (distinct from repo files): https://github.com/QW-Group/ktx/wiki and https://github.com/QW-Group/mvdsv/wiki (Jina-fetch). Enumerate pages; this is a commonly-missed real doc surface.
- ezquake.com/docs : any server-side or KTX/MVDSV-relevant page, or client/server parity worth noting (Jina-fetch the docs index).
- Runtime self-documentation: from probe-1's source read, characterize what the in-game `commands`, `serverinfo`, `cmdlist`, and KTX `k_*` help output EXPOSE to an admin (you cannot run a server here -- describe the surface and its completeness from source, do not execute).
- For each thread: alive / dead / partially-recoverable, and whether it changes the gap picture. Coverage fields where a real doc surface is found; otherwise use Probe notes.
```

- [ ] **Step 6: Verify every probe report against the fixed schema**

After all five subagents return, run:
```bash
cd /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape
for f in probe-1-ktx-in-repo.md probe-2-mvdsv-in-repo.md probe-3-nquake-distfiles.md probe-4-wiki-corpus.md probe-5-dangling-threads.md; do
  echo "=== $f ==="
  [ -f "$f" ] && grep -c "Coverage count:" "$f" && grep -L "Extractability for a future L1 spine:" "$f" || echo "MISSING FILE: $f"
done
```
Expected: each file exists, has >=1 "Coverage count:" line, and is NOT listed by `grep -L` (i.e. it contains the Extractability field). Any file that fails: re-dispatch that single probe with the same prompt plus "Your prior report was missing <field>; fix it." Do not proceed to Task 4 until all five pass.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-1-ktx-in-repo.md docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-2-mvdsv-in-repo.md docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-3-nquake-distfiles.md docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-4-wiki-corpus.md docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-5-dangling-threads.md
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): probes 1-5 source-class reports

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Assemble the README cross-source coverage tables

**Files:**
- Modify: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md`

- [ ] **Step 1: Build one table per engine**

Read probe-0 through probe-5. Replace the README's `## Assembled coverage` placeholder with, for each engine (KTX, MVDSV), a table:

`domain | M (probe-0) | best source | best coverage N (%) | format | structure quality | extractability | other sources`

One row per rostered domain. "Best source" = the source with the highest admin-facing coverage for that domain. Include the structurally-derived domains with their probe-0 counts even if no prose source documents them (mark source = "L1 structural only").

- [ ] **Step 2: Verify every rostered domain has a row**

Run:
```bash
grep -oE "M=[0-9]+" docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/probe-0-l1-baseline.md | wc -l
grep -c "^| " docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md
```
Expected: the README table row count (minus header rows) is >= the probe-0 denominator count. If a domain is missing a row, add it before committing.

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): assembled README coverage tables

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Build `coverage.ndjson` (machine-readable, reusable downstream)

**Files:**
- Create: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/coverage.ndjson`

- [ ] **Step 1: Emit one JSON object per (engine, domain, source)**

From the probe reports, write `coverage.ndjson` -- one line per (engine, domain, source) where a probe reported a Coverage count. Each line is exactly this shape (one example line, real values from the reports):

```json
{"engine":"ktx","domain":"cvars","source":"research/repos/ktx/resources/example-configs/ktx/ktx.cfg","covered":214,"total":228,"pct":93.9,"format":"shipped-config // comment","structure_quality":"enum tables parseable","extractability":"mechanical"}
```

Keys, all mandatory, exact names: `engine` (ktx|mvdsv), `domain` (roster value), `source` (path/URL), `covered` (int), `total` (int = probe-0 M), `pct` (number, one decimal), `format` (string), `structure_quality` (string), `extractability` (mechanical|LLM-assisted|hand-curate).

- [ ] **Step 2: Verify it is valid NDJSON**

Run:
```bash
cd /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape
while IFS= read -r line; do echo "$line" | python3 -c "import sys,json;json.loads(sys.stdin.read())" || echo "BAD LINE: $line"; done < coverage.ndjson && echo "ALL LINES VALID"
```
Expected: `ALL LINES VALID`, no `BAD LINE` output.

- [ ] **Step 3: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/coverage.ndjson
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): coverage.ndjson reusable manifest

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Write `gap-findings.md` (Phase-2 synthesis + verdict)

**Files:**
- Create: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md`
- Modify: `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md` (Verdict section)

- [ ] **Step 1: Write the synthesis**

Write `gap-findings.md` with these mandatory sections:
- **Verdict** (lead, one paragraph): the explicit answer to the spec's success criterion -- does the evidence cohere into a foundation solid enough to build an L1 KTX/MVDSV server-config KB. Yes / Yes-with-caveats / No, with the one-sentence why.
- **Gap size per domain tier:** admin-configurable tier (cvars/commands/info_keys/cmdline/modes) -- how much is documented somewhere vs genuinely missing; structurally-derived tier -- do they need prose at all.
- **Source overlaps and conflicts:** the concrete drifts (esp. repo example-configs vs nQuake sv-configs from probe-3).
- **Why it is not in the repo:** the narrative (distribution-layer + tribal + installer-opacity + link-rot), grounded in the probe evidence.
- **Prioritized thread list:** ordered, each with effort estimate, what it unblocks.
- **Recommendation for downstream:** shape of the L1 server-config KB arc (if viable); what feeds the docketed KTX game-mode concept notes; what is deferred to the community-outreach pass.

- [ ] **Step 2: Fill the README Verdict section**

Replace the README's `## Verdict` placeholder with the one-line verdict + a link to `gap-findings.md`. Flip the README `**Status:**` line from `IN PROGRESS` to `COMPLETE 2026-05-15`.

- [ ] **Step 3: Verify the success criterion is explicitly answered**

Run: `grep -iE "verdict|solid enough|foundation" docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md | head`
Expected: a Verdict line that explicitly says yes / yes-with-caveats / no. If absent, the synthesis dodged the question -- fix before committing.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/README.md
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): gap-findings synthesis + verdict

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Wire into the HANDOVER docket + cross-references

**Files:**
- Modify: `HANDOVER.md`
- Modify: `docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`

- [ ] **Step 1: Add the HANDOVER docket pointer**

In `HANDOVER.md`, under `### Recently opened (this session)`, add one line:
```
- **KTX/MVDSV server-doc landscape investigation COMPLETE 2026-05-15** -- evidence map at `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/` (README = the picture; gap-findings.md = the verdict). Feeds the deferred L1 server-config KB arc + the docketed KTX game-mode concept notes.
```

- [ ] **Step 2: Cross-reference the concept-note parking doc**

In `docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md`, add a line near the top noting that the L1 foundation evidence for this work now lives at `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md` and should be read before authoring mode notes.

- [ ] **Step 3: Verify both references resolve**

Run:
```bash
cd /home/paradoks/projects/quakeworld
grep -n "2026-05-15-ktx-mvdsv-doc-landscape" HANDOVER.md docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md
```
Expected: at least one match in each file.

- [ ] **Step 4: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add HANDOVER.md docs/superpowers/parking/2026-05-09-ktx-game-mode-l3-concept-notes.md
git commit -m "$(cat <<'EOF'
investigation(ktx-mvdsv-doc-landscape): wire into HANDOVER + concept-note cross-ref

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review (run by the plan author; fixes applied inline above)

**1. Spec coverage:**
- Success criterion (foundation solid enough?) -> Task 6 Step 1 Verdict + Step 3 verification gate.
- Per-engine domain roster from `_handler_*.py` -> Task 2 Step 1.
- info_keys 3 sub-domains -> covered by roster; probes report info_keys per-domain via schema.
- Fixed report schema -> Task 1 Step 1 `_report-template.md`, enforced Task 3 Step 6.
- P1-P5 source decomposition -> Task 3 Steps 1-5 (one block each, matches spec P1-P5).
- Cross-cut L1 baseline / denominators -> Task 2.
- Admin-configurable vs structurally-derived tiers -> Task 4 Step 1 + Task 6 Step 1.
- Folder output (README + probe-0..5 + coverage.ndjson + gap-findings) -> Tasks 1,2,3,4,5,6.
- HANDOVER pointer + concept-note cross-ref -> Task 7.
- Sizing 1-2 sessions, no human dependency -> parallel fan-out Task 3; all desk-only. No gap found.

**2. Placeholder scan:** No "TBD/TODO/handle edge cases". The two README `_filled in Task N_` italics are intentional scaffold markers a later task replaces (Tasks 4 and 6), not plan placeholders. Probe prompts are complete and paste-ready.

**3. Type consistency:** File paths identical across all tasks (`docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/...`). Schema field names in `_report-template.md` (Coverage count / Format / Structure quality / Overlap-conflict / Extractability) match the Task 3 Step 6 verification grep strings and the Task 5 `coverage.ndjson` keys. Roster terms (domain values) consistent between Task 1 template, probe blocks, and Task 4/5.

No gaps found; plan stands.
