# Phase 3 -- frozen sample manifest + answer keys

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` E1-E14 (this phase
owns E4's freeze and its baseline, and depends on E12's tree rule, E13's
committed-manifest rule, E9's incremental-write rule, E10's cost accounting).
**Spec:** `docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`
D1, D4, D5, D6 stage 1, plus the 2026-08-06 pool-figure amendment.
**Findings consumed:** F1, F2, F3, F4, F11, F12, F13, F14, F15, F18, F22.
**Findings raised here:** F27-F31 (drafting) and F41-F42 (this revision). The
independent checker's own findings are F32-F36 and live in
`review-findings.md`; the floor's corrected cost figure landed there as F28
and as a dated amendment to spec D4. **Revised 2026-08-06** against that
check -- every disputed figure below was re-measured first-hand and the
checker was right on all of them, including one where my own re-derivation was
wrong (see the F27 amendment).
**Lane:** worktree `/home/dev/projects/quakeworld-eval`, branch
`eval-oracle-sim`.

## Goal

Resolve the June frame against live rows exactly ONCE, freeze the result to a
committed manifest, and fill each sampled thread's answer key. The manifest
pins the corpus baseline the whole arc is measured against (E4), the derived
rank -> domain assignment (F12), the proportional-with-floor allocation over 24
non-NOISE domains, and 500 thread identities carrying `thread_id`, `thread_key`,
a content digest, `domain`, `era`, and the extracted question text. A DeepSeek
bulk pass then distills "what actually fixed it" into each thread's `truth`
(D6 stage 1), a blind-first Claude spot-read of 50 keys gates the result, and
rejected threads are replaced by a LOOPING walk down the manifest's own frozen
order -- never by re-resolving the frame. The phase ends with
`bun eval/sim/verify-manifest.ts --live` green against the twin,
`sample-manifest.json` and `sample-keys.json` committed, a passing spot-read
block inside the keys file, a measured DeepSeek token+dollar total, and
`loadEffectiveSample()` returning exactly 500 records each with a non-empty
`question` and a `truth`.

## Inputs from previous phase

Phase 1 LANDED. These are the claims this phase actually leans on. Each is
marked either **[probed]** -- re-verified read-only at drafting or revision
time -- or **[forward dependency]** -- a Phase 1 Task 1 deliverable that is NOT
true in the worktree today and must be satisfied before Task 1 of this phase
runs. Mixing the two is how a plan inherits a false precondition, so they are
labelled rather than listed together.

- **[forward dependency] `apps/qw-oracle/.env` is a symlink in the worktree
  and Bun loads it from cwd `apps/qw-oracle/` only** (Phase 1 Task 1). Every
  probe below sources it by that path. It does NOT exist in the worktree today,
  so the SQL probes were executed with the main checkout's
  `/home/dev/projects/quakeworld/apps/qw-oracle/.env`, which Phase 1 Task 1
  makes byte-identical. `DATABASE_URL` host is
  `qw-oracle-postgres-dev:5432/qw_oracle` -- the twin.
- **[forward dependency] Both `bun install`s have run** (root workspace +
  `serve/mcp`). Also NOT true today: the worktree has no `node_modules` at all,
  and `bun run typecheck` in `apps/qw-oracle` exits **127** right now. This
  phase needs only the root install: `postgres` and `ulid` are declared in
  `apps/qw-oracle/package.json` **[probed]**; nothing here imports the MCP SDK,
  so the MAJOR-1 exception (E12 amendment) does not apply and every file this
  phase writes lands under `eval/sim/`.
- **[forward dependency] `apps/qw-oracle/tsconfig.json` includes
  `eval/sim/**/*`** (Phase 1 Task 5), so everything below is covered by
  `bun run typecheck`.
- **[forward dependency] `eval/sim/records/` is gitignored** (Phase 1 Task 5).
  The key pass's resumable JSONL lands there; the two committed JSON artifacts
  sit at `eval/sim/*.json`, outside the ignore, so no negation pattern is
  needed.
- **[forward dependency] `eval/sim/telemetry-baseline.json` exists** with
  pre-run `query_log` / `embedding_api_log` / `oracle_meta` / `chat_threads`
  counts.
- **[probed] `RunRecord`'s question-identity fields are already fixed** (Phase 1
  Contract (b)): `thread_id` (string), `thread_key`, `domain` (a
  `faq-domains-resolve.ts` `META` key), `era` (integer year), `question`,
  `truth`. This phase produces exactly those values; it invents no field (E2).
- **[probed] The corpus has not moved.** Live at revision time:
  `chat_threads` 40,219; `reconstruction_version` `fence-sonnet-v2` for all
  rows; per channel `#antilag` 1,015/410, `#dev-corner` 10,359/3,714,
  `#helpdesk` 6,772/3,694, `#quakeworld` 22,073/5,316 (total/solved).
  `chat_threads_thread_key_key` is a real `UNIQUE (thread_key)` constraint, not
  an observed property.
- **[probed, with stated provenance] The frame assets are read-only to this arc
  (E12, F14) and `faq-domains-resolve.ts` typechecks clean.** This claim is what
  makes boundary probe 8 safe -- importing the resolver from `eval/sim/` pulls
  `scripts/calibration/**` into the tsc program, which is the F18/F13 hazard
  that constrained Phase 1's include pattern. It cannot be established from the
  worktree today (no `node_modules`, no global `tsc`), so it was established
  with a `tsc` binary from the main checkout, read-only, exact command:

      /home/dev/projects/quakeworld/apps/oracle-web/node_modules/.bin/tsc \
        --noEmit --strict --noUncheckedIndexedAccess --noImplicitOverride \
        --target ES2022 --module ESNext --moduleResolution Bundler \
        --allowImportingTsExtensions --skipLibCheck --esModuleInterop \
        --resolveJsonModule --isolatedModules --lib ES2022 --types bun-types \
        /home/dev/projects/quakeworld-eval/apps/qw-oracle/scripts/calibration/faq-gate/faq-domains-resolve.ts

  tsc 5.9.3, run from `/home/dev/projects/quakeworld/apps/qw-oracle` so
  `bun-types` resolves; **exit 0**, re-run at revision time. Without
  `--types bun-types` the only error is `import.meta.main` at line 157, a
  missing-types artifact rather than a defect. **The failure mode if this is
  wrong:** boundary probe 8's `bun run typecheck` goes red on a file this arc
  is forbidden to edit, and the phase stalls with no in-lane fix -- which is why
  Recovery carries a shim escape hatch. Task 2's verification probe re-checks it
  from inside the worktree with the real toolchain the moment Phase 1's install
  has landed, so the out-of-worktree evidence above is a bridge, not the
  standing guarantee.

## The frozen sample manifest (normative)

`apps/qw-oracle/eval/sim/sample-manifest.json`. **Written exactly once, by
Task 3, and never rewritten.** Everything that happens afterwards -- key
extraction, spot-read, substitution -- lands in `sample-keys.json`. That split
is the whole point: E4 says resolve the frame once and freeze, and a file that
gets rewritten cannot evidence a freeze.

```
{
  "schema_version": "eval-sample-manifest-v1",
  "frozen_at": "<ISO-8601>",
  "seed": "oracle-eval-sim-2026-08-06",
  "n_target": 500,
  "floor": 8,
  "note": "<the era-window paragraph below, verbatim -- boundary probe 6 asserts it>",

  "frame": {
    "faq_clusters_path": "scripts/calibration/faq-gate/faq-clusters.json",
    "faq_clusters_sha256": "<64 hex>",
    "faq_domains_resolve_sha256": "<64 hex>",
    "K": 48,
    "N": 5028,
    "generated_from_seed": 42,
    "rank_pin": [ { "rank": 1, "cluster_id": 10, "size": 200, "domain": "visual-projectile" }, ... 48 entries ... ],
    "rank_pin_anchor": { "rank": 12, "cluster_id": 14, "size": 134, "domain": "weapon-scripts" }
  },

  "corpus_baseline": {
    "captured_at": "<ISO-8601>",
    "chat_threads": 40219,
    "reconstruction_versions": ["fence-sonnet-v2"],
    "by_channel": { "#antilag": [1015, 410], "#dev-corner": [10359, 3714],
                    "#helpdesk": [6772, 3694], "#quakeworld": [22073, 5316] },
    "query_log": <int>,
    "embedding_api_log": <int>
  },

  "pool": {
    "frame_ids_non_noise": 4456,
    "present": 4222,
    "missing": 234,
    "solved": 3164,
    "era_histogram": { "2020": 365, "2021": 710, "2022": 523, "2023": 615, "2024": 511, "2025": 440 },
    "by_domain": { "<domain>": { "tier": "1", "frame_n": 544, "present": 518, "solved": 406 }, ... 24 ... }
  },

  "allocation": {
    "method": "proportional-to-live-solved, per-domain floor 8, largest-remainder rounding",
    "by_domain": { "<domain>": { "quota_raw": 64.159, "quota_post_pin": 63.446,
                                 "alloc": 63, "floored": false }, ... 24 ... },
    "sum": 500
  },

  "order": { "<domain>": [ "<every solved thread_id in that domain, as a STRING, in frozen sampling order>" ] },

  "selected": [
    {
      "thread_id": "6805",              // string, matching RunRecord.thread_id / ThreadHit convention
      "thread_key": "#helpdesk:fence-sonnet-v2:helpdesk-2020-003:2",
      "content_sha256": "<64 hex>",     // sha256 of chat_threads.content, UTF-8 bytes
      "domain": "visual-projectile",
      "domain_rank": 1,                 // scalar: the 48 clusters partition the 5,028 frame
                                        // ids exactly (verified: 0 ids in more than one
                                        // cluster), so a thread has exactly one rank
      "era": 2020,
      "channel_name": "#helpdesk",
      "message_count": 12,
      "content_len": 1083,
      "order_index": 0,                 // its position in order[domain]
      "question": "<splitQ opening, verbatim>",
      "question_lines": 3,
      "question_fallback": false        // true = splitQ's first-4-lines path fired
    }, ... 500 ...
  ]
}
```

**`order` is what makes substitution legal.** It carries every one of the 3,164
solved pool ids, grouped by domain, in the deterministic sampling order defined
below. `selected` is exactly the first `alloc[domain]` entries of each list. A
thread rejected by the key pass is replaced by walking that same frozen list
past `alloc[domain]` -- a walk down data that is already committed, not a
second resolution of the frame. Size cost of carrying all 3,164 ids: about
**46 KB** at 2-space indent. Cheap insurance against exactly the thing E4
forbids.

**Expect a large committed file, and know why.** Built for real from the live
pool at revision time, the whole manifest is roughly **380-410 KB** at 2-space
indent (~300 KB compact). The `order` block is only 46 KB of that; the bulk is
`selected` at ~324 KB, because it carries 500 verbatim question texts. That is
deliberate -- the question text is what makes the manifest reviewable by a human
and re-runnable without the twin -- but a reviewer should not meet a 400 KB JSON
file in a diff unprepared. It is public Discord content already in the corpus,
so there is no disclosure question, only a size one.

**Thread ids are strings everywhere in both files** -- in `order`, in
`selected[].thread_id`, in `keys`' object keys, and in
`substitutions[].promoted_thread_id`. This matches `RunRecord.thread_id` and
the `ThreadHit.thread_id` convention Phase 1 pinned, and it is not cosmetic:
several probes below compare ids by `indexOf` and by joined string equality,
and a manifest that stored `order` as numbers while `selected` stored strings
would make those comparisons fail for a reason unrelated to the thing they
test. The one place ids become numbers is inside the SQL builders, where they
are cast to `bigint`.

### F29 -- `thread_key` is a better handle than `id`, but it is not a proven-durable one, which is why the digest is in the manifest

Phase 1's schema comment says `thread_key` "survives an id re-fence (E4, F1)".
Probed: `thread_key` is
`channel:reconstruction_version:chunk_id:thread_index`
(`#helpdesk:fence-sonnet-v2:helpdesk-2020-001:1`), built by
`scripts/load-chat/thread-key.ts`. `thread_index` is the thread's position
within a chunk as segmented by the fence -- which is an LLM pass, not a
deterministic function of the messages -- so a re-fence of a year preserves
`thread_key` only if the model re-segments that chunk identically.

**And the chunks are not small.** 2020's `#helpdesk` messages fall into **97
chunks holding 1 to 55 threads each** (mean 7.4); across all of `#helpdesk`,
1,049 chunks holding 1 to 72. A 55-thread chunk gives the fence 55 boundary
decisions, and one added or dropped boundary near the start renumbers every
`thread_index` after it. This makes F29's conclusion stronger, not weaker: the
larger the chunk, the more `thread_key` mass a single re-segmentation
disagreement can move. (An earlier draft of this section said "1-14 threads",
which came from reading only the first 26 rows of the chunk histogram -- a
truncated probe presented as a full one.)

It is unfalsifiable in the one case that matters: the 234 ids the August
re-fence ate are gone, so their old `thread_key`s cannot be compared with the
new 2026 rows at 86063..87037 (522 of them, all carrying
`helpdesk-2026-NNN` chunk ids). `thread_key` uniqueness is guaranteed by the
`chat_threads_thread_key_key` UNIQUE constraint (Phase 1's Inputs already names
the index), not by an observation -- so it is a sound identity for a stable
corpus, and strictly better than `id`, which is re-allocated by construction.
It is simply not proof against a re-fence.

Disposition: carry **all three** -- `thread_id`, `thread_key`, and
`content_sha256` -- in every `selected` entry, and have Phase 6's E4
re-assertion check all three per row. A count-only baseline check (Phase 1's
`chat_threads == 40219`) is global and can pass while individual rows moved
underneath; the per-row digest cannot. Cost: 64 hex characters times 500 rows.

**F31 (minor) -- `content::bytea` throws on real rows; the digest must use
`convert_to`.** `encode(sha256(content::bytea),'hex')` is the obvious spelling
and it fails with `invalid input syntax for type bytea` over the 500-thread
sample, because a text-to-bytea cast reinterprets backslash sequences in the
content rather than taking the bytes. The correct form is
`encode(sha256(convert_to(content,'UTF8')),'hex')`, and it was verified to
agree with TypeScript's `createHash('sha256').update(content,'utf8')` on
500/500 dry-run threads -- which matters because the manifest is written from
TS and re-checked from SQL. The failure is loud rather than silent, so this is
a time-waster rather than a hazard, but it is exactly the kind of thing a
probe author hits at the end of a long task.

### Sampling order is deterministic and seeded, and the seed is in the file

Within a domain: take that domain's live solved thread ids, sort **ascending by
numeric id** (so the input order does not depend on `resolveDomainThreads`'s
cluster-iteration order), then sort by `sha256(seed + ":" + id)` compared as a
lowercase hex string, ascending. `seed` is the literal
`oracle-eval-sim-2026-08-06`, recorded in the manifest. Selection is the first
`alloc[domain]` of that order.

Two properties this buys, both load-bearing. (1) It is reproducible from the
manifest alone with `node:crypto` and no database -- a reader can re-derive the
order and check it. (2) It is independent of the frame's own k-means seed 42 and
of the rank derivation, so a tie-break flip (F27) changes domain MEMBERSHIP but
not the ordering rule.

Verified at drafting time by dry run over the live pool: 500 selected, 500
unique, and the sample's era spread tracks the pool's within 2.5 points
everywhere (pool 2020:11.5% 2021:22.4% 2022:16.5% 2023:19.4% 2024:16.2%
2025:13.9%; sample 11.4 / 20.8 / 19.0 / 18.8 / 16.0 / 14.0). No era
stratification is applied -- D4 stratifies on domain only -- and this measurement
is why that is safe rather than merely permitted.

### The era window is structural, and the manifest says so in prose

The manifest carries a top-level `"note"` string, committed verbatim:

> This sample contains ZERO 2026 threads. The June frame was frozen before the
> August harvest re-fenced the current year and reassigned its `chat_threads.id`
> values, so every 2026 thread the frame referenced is gone (234 missing ids,
> one contiguous band 7420..7792). The eval therefore grades the oracle against
> community fixes that are 1 to 6 years old. This is a property of the design
> (spec D4 rejects re-clustering), not a defect, and it is why D6's `divergent`
> flag is load-bearing rather than a corner case.

Findings F1 and F2 are the evidence; the findings doc (Phase 8) repeats this
rather than letting a reader assume currency.

## The allocation, computed against live counts

Base = each domain's **live solved count**, not the June cluster size. D4 says
"proportional to demand" and D5 predicts "40-65 questions in each large tier-1
domain"; against live solved counts hud lands at 63 and onboard-install at 49,
which is D5's stated range. Against June cluster sizes it would not be, and the
June numbers are the ones F1 already proved wrong.

Measured on the twin 2026-08-06 (`frame_n` from `faq-clusters.json` via
`resolveDomainThreads(key, {limit: Infinity})`; `present` and `solved` from a
single `unnest`-joined SELECT against `chat_threads`):

| domain | tier | frame_n | present | solved | quota (N=500) | **alloc** | spare |
|---|---|---|---|---|---|---|---|
| hud | 1 | 544 | 518 | 406 | 64.16 | **63** | 343 |
| onboard-install | 1 | 397 | 373 | 314 | 49.62 | **49** | 265 |
| server-admin | server-side | 408 | 392 | 308 | 48.67 | **48** | 260 |
| visual-world | 1 | 309 | 292 | 227 | 35.87 | **36** | 191 |
| performance | caveated-hard | 296 | 288 | 175 | 27.65 | **27** | 148 |
| textures | 1 | 232 | 222 | 174 | 27.50 | **27** | 147 |
| linux | caveated-niche | 236 | 230 | 161 | 25.44 | **25** | 136 |
| visual-projectile | 1 | 200 | 193 | 155 | 24.49 | **24** | 131 |
| display | 2 | 185 | 178 | 137 | 21.65 | **21** | 116 |
| network | 1 | 211 | 193 | 133 | 21.02 | **21** | 112 |
| demos | 1 | 149 | 140 | 106 | 16.75 | **17** | 89 |
| weapon-scripts | 1 | 134 | 128 | 105 | 16.59 | **16** | 89 |
| input-mouse | 2 | 135 | 129 | 97 | 15.33 | **15** | 82 |
| config-files | 2 | 102 | 96 | 80 | 12.64 | **13** | 67 |
| skins | 1 | 109 | 104 | 79 | 12.48 | **12** | 67 |
| maps-locs | 2 | 103 | 94 | 77 | 12.17 | **12** | 65 |
| crash | caveated-hard | 147 | 140 | 71 | 11.22 | **11** | 60 |
| ruleset-legality | 2 | 105 | 100 | 68 | 10.75 | **11** | 57 |
| server-browser | 2 | 83 | 77 | 61 | 9.64 | **10** | 51 |
| audio | 2 | 119 | 112 | 57 | 9.01 | **9** | 48 |
| binds-scripting | 2 | 69 | 63 | 55 | 8.69 | **9** | 46 |
| fonts | 3-foldable | 61 | 55 | 46 | 7.27 | **8 (floored)** | 38 |
| teamplay-comms | 2 | 64 | 52 | 39 | 6.16 | **8 (floored)** | 31 |
| spectating | 2 | 58 | 53 | 33 | 5.21 | **8 (floored)** | 25 |
| **TOTAL** | | **4456** | **4222** | **3164** | 500.00 | **500** | 2664 |

`solved` sums to 3,164 -- F1's figure, re-derived independently here. Every
solved row in the frame is `#helpdesk` (checked per domain:
`solved == solved_helpdesk` for all 24), which is D1 holding without a channel
predicate needing to be added.

**No domain fails to meet the floor today.** The smallest live pool is
spectating at 33 solved against a floor of 8. But "it cannot happen today" is a
statement about 2026-08-06 numbers, and the frame decays (F1/F3), so the
distinction is recorded in the data rather than left to the reader.

**`floored` is a THREE-valued field, not a boolean** (raised by the independent
check -- see `review-findings.md` F32-F36 for its numbering, which this doc
deliberately does not guess at; and verified here first-hand: with
`spectating.solved` artificially dropped to 5, the allocator
returns `spectating: 5`, the sum still lands on exactly 500, and nothing
throws -- a domain silently under-filling its own floor while every other check
stays green):

| value | meaning | posture |
|---|---|---|
| `false` | proportional quota exceeded the floor; the floor never bound | normal |
| `'at-floor'` | quota fell below the floor and the domain was lifted TO it | normal, this is the floor working |
| `'pool-exhausted'` | the domain's entire live solved pool is smaller than the floor, so it was allocated everything it has and still fell short | **loud** |

`pool-exhausted` is not a quiet annotation. The freeze script prints it, the
verifier reports it as a FAILED check unless the manifest also carries an
explicit `pool_exhausted_acknowledged` list, and Phase 8 must caveat that
domain's row. The assertion is `alloc_d >= min(floor, solved_d)` for every
domain -- which is the check that distinguishes "under-filled because the pool
ran out" (legal, loud) from "under-filled because the allocator is wrong"
(a defect). The cap `alloc_d <= solved_d` is asserted alongside it.

### The algorithm, stated so it can be checked rather than trusted

1. `quota_d = solved_d / sum(solved) * N`.
2. Iterate: any domain whose quota falls **below** the floor is pinned at
   `min(floor, solved_d)`; any whose quota exceeds `solved_d` is pinned at
   `solved_d`. Recompute the remaining budget and the remaining pool over the
   unpinned domains, and repeat until a pass pins nothing.
3. Round the unpinned domains by **largest remainder**: floor every quota, then
   hand the leftover units to the largest fractional parts, breaking ties on
   domain key ascending (so the result does not depend on object key order).
4. Assert `sum(alloc) === N`, `alloc_d <= solved_d`, and
   `alloc_d >= min(floor, solved_d)` for every domain, recording `floored` as
   `false | 'at-floor' | 'pool-exhausted'` per the table above.

Step 3's distribution loop hands out at most one unit per domain, because the
fractional parts of a set of quotas summing to an integer sum to an integer
strictly less than the count. The implementation asserts that rather than
relying on it -- an off-by-one here is a 501-thread sample that still looks
plausible in every downstream table.

### Two allocation facts worth stating plainly

**F28 -- D4's floor, as literally scoped, does nothing at N=500.** D4 sets the
floor "~8-10 threads minimum for **tier-1** domains". Every tier-1 domain's
proportional quota already exceeds 12 (the smallest, skins, is 12.48), so a
tier-1-only floor is inert: computed both ways, `floor 8 applied to tier-1
only` and `no floor at all` produce byte-identical 24-domain allocations. The
domains that actually ride on too few data points are fonts (7.27),
teamplay-comms (6.16) and spectating (5.21), none of them tier-1. This plan's
default therefore applies the floor to **all 24 domains**, which is a
strengthening of D4's stated intent ("no important domain rides on two data
points") rather than a change to it.

**Its cost, measured** (an earlier draft of this doc said "7 threads off 3
domains" from an eyeballed comparison; the correct figure is below and is also
recorded as F28 in the findings ledger and in spec D4's amendment): the floor
moves **6 threads off 6 domains** -- hud 64->63, onboard-install 50->49,
server-admin 49->48, performance 28->27, display 22->21, weapon-scripts 17->16
-- into the 3 pinned ones: fonts 7->8, teamplay-comms 6->8, spectating 5->8.
The loss spreads wider than "the biggest domains" because largest-remainder
rounding re-runs over the whole post-pin quota vector, so a domain sitting just
above a rounding boundary (performance 27.65, display 21.65, weapon-scripts
16.59) drops a unit while a domain further from one (textures 27.50, network
21.02) does not. Recorded as Open question 1, overrulable by the operator.

**The headline stays interpretable.** 494 of the 500 are proportional; the 6
floored-in threads are **1.2%** of the sample. Phase 8 reports the headline
unweighted and notes the floor's contribution, rather than re-weighting -- the
distortion is smaller than the CI.

## The rank pin (F12, and what F27 adds to it)

`loadSortedClusters()` sorts by `size` descending and treats `index + 1` as
rank; the rank -> domain map `R` is keyed on that derived rank. F12 called this
an unguarded tie-break and rated it cheap insurance. Measured, it is worse than
that.

**F27 -- all five tie groups straddle a domain boundary, and one straddles the
NOISE boundary.** Enumerated from the live frame file:

| tied size | ranks (cluster id -> domain) | what a reorder would do |
|---|---|---|
| 157 | r4 (cid 13) -> server-admin, r5 (cid 20) -> hud, r6 (cid 47) -> hud | moves a 157-thread cluster between server-admin and hud |
| 119 | r15 (cid 3) -> server-admin, r16 (cid 18) -> audio | moves 119 threads between server-admin and audio |
| 89 | **r31 (cid 1) -> NOISE**, r32 (cid 40) -> linux | moves 89 threads **into or out of the sampling pool entirely** |
| 79 | r35 (cid 17) -> display, r36 (cid 44) -> visual-world | moves 79 threads between display and visual-world |
| 51 | r44 (cid 11) -> textures, r45 (cid 22) -> performance | moves 51 threads between textures and performance |

`Array.prototype.sort` is stable in modern engines and the JSON's cluster order
is fixed, so today's assignment is reproducible -- but nothing asserts it, and
the 89-tie means an unstable sort would change the pool size, the denominator,
the allocation, and the headline, silently. Pinning all 48 `(rank, cluster_id,
size, domain)` tuples into the manifest converts the derivation into data. The
verifier re-derives it and diffs against the pin; a mismatch is a hard failure,
not a warning. Anchor: rank 12 = cluster id 14, size 134, `weapon-scripts` --
the resolver's own sanity anchor, so a broken pin fails the same check the
resolver's CLI self-test prints.

**F27 amendment (revision 2026-08-06) -- the 89-tie's blast radius, measured,
and it is asymmetric.** The two tied clusters carry very different live
payloads: rank 31 / cluster 1 (`quake,map,mdl,project,model`) holds 89 frame
ids, 84 present, of which **26 solved**; rank 32 / cluster 40
(`linux,compile,ezquake,build,source`) holds 89 frame ids of which **70
solved**. So a reorder is not a null swap of equal-sized clusters -- it trades
70 solved threads for 26:

- pool **3,164 -> 3,120 (-44)**
- **eight** domains' allocations shift: hud 63->64, onboard-install 49->50,
  server-admin 48->49, textures 27->28, performance 27->28, linux **25->18**,
  display 21->22, weapon-scripts 16->17
- linux's live solved pool goes 161 -> 117, because it loses its own largest
  cluster to NOISE and gains a cluster with almost nothing solved in it

**F42 (minor, methodological) -- re-deriving this requires resolving solved
status over all 5,028 frame ids, not the 4,456 non-NOISE ones.** My own first
re-derivation gave -70 and ten shifted domains, because the dataset I resolved
solved status against had been built from the non-NOISE frame only -- so
cluster 1's 26 solved threads were invisible and read as 0. The independent
checker's figures were right and mine were wrong. Anyone re-checking a tie-flip
consequence must widen the live query to the full 5,028 first; otherwise the
blast radius is understated by roughly 60% in exactly the direction that makes
the finding look less serious.

## Question extraction (splitQ, reimplemented)

Prior art is `splitQ()` in `scripts/calibration/faq-gate/faq-gate-retrieve.ts`,
lines 69-83. That file does **not run on this box** -- it imports five tool
functions through hardcoded `/home/paradoks/...` paths (F4) -- so this phase
reimplements the function in `eval/sim/split-question.ts` and does not import
it. Behaviour is preserved exactly, including the fallback:

- Match line 0 against `/^([^:]{1,40}):\s/`. The capture is the asker.
- **If it does not match**, the opening is the first 4 lines and the rest is
  everything after. Keep this branch. Measured over all 3,164 pool threads it
  fires **0 times** (0.00%), so it is dead code today -- but the pool is
  `#helpdesk` fences only, the branch costs two lines, and Chesterton's fence
  applies to a guard whose absence would silently produce a garbage question.
  Record `question_fallback` per selected thread so the manifest shows it.
- Otherwise walk forward to the first line whose author differs; the opening is
  everything before it, trimmed.

`question` = the opening **verbatim, author prefixes included** (`nick: text`),
matching the prior art's `q`. Measured on the dry-run sample: opening length
p50 150 chars, p90 356, max 1,862; 252 of 500 openings are a single line.

### F30 -- the opening sometimes contains the answer, and 1.8% of threads have no answer at all

Two measured contamination classes, both of which the key pass must handle
because nothing downstream can:

- **Empty rest.** 57 of 3,164 pool threads (1.80%; 10 of the dry-run 500) are a
  single-author monologue: the asker states a problem and then says they solved
  it, with no second speaker. `splitQ`'s `rest` is empty, so a key extractor fed
  only `rest` gets nothing. Worse, the whole thread is the OPENING, so the
  question handed to the answering agent contains the asker's own resolution.
  Real example, thread 8926: `caremachine: hey, here i come again` /
  `... armor is indicated as icon` / `how to turn it back to numbers with icon?`
  / `found how to fix it, no worries! thanks` -- solved, and neither a key nor a
  clean question can be recovered from it.
- **Leaky opening.** 89 of 3,164 (2.81%) have an opening matching resolution
  phrasing. The screen is this regex, **normative and verbatim** -- an earlier
  draft of this doc printed an abbreviated prose version of it (dropping
  `never mind`, `got it working` and `solved it`), which screens 88 rather than
  89 and made the doc and the probe disagree by one:

      /\b(fixed|solved|nvm|nevermind|never mind|works now|got it working|figured it out|found (it|the fix|how)|solved it|my bad|sorted)\b/i

  Some hits are false positives ("no success"), some are real: thread 12533 is
  `djaevulsk: quick question, what are the gfx files for the ammo
  icons/backgrounds in classic hud?` / `"ibar.png", nevermind` -- the question
  literally contains the answer, and every cell would "solve" it by echoing.

The regex is a **screen, not a verdict**. The key-extraction prompt returns a
`question_leaks_fix` boolean judged by the model on the actual text, and the
regex exists only to size the exposure and to give the substitution machinery a
worst case to be built against.

**Sized against the real selected 500, not the pool rate:** applying the union
screen (empty `rest` OR the regex above) to the actual frozen selection flags
**25 of 500 (5.0%)** -- 15 leak-only, 4 empty-rest-only, 6 both -- spread over
13 domains, worst hud with 6 of its 63. Minimum per-domain spare is 25
(spectating) and the median is 85.5, so the reserve absorbs it comfortably.
That 25 is the number the substitution design below has to survive, and it is
higher than the pool's 4.3% because the selection is a draw, not a stratified
match on this property.

**Ruling:** the extractor reads the **full `content`**, never just `rest` --
that is what makes the monologue threads legible at all -- and a thread is
REJECTED and substituted when `key_quality === "none"` or
`question_leaks_fix === true`. Trimming the offending lines out of the question
was rejected: it edits the player's words to make a measurement come out, and
the honest alternative (a narrower, stated population) costs nothing here.

### Substitution is a LOOP, because substitutes are drawn from the same contaminated population

The obvious design -- "promote the next id in `order[domain]` that is not
already selected" -- is wrong, and measurably so. Simulated against the real
selection and the real screen: of the 25 single-shot promotions that design
would make, **3 are themselves reject-class**. The deepest clean walk needed is
**7 positions past `alloc`** (hud), and three domains need to walk past at least
one bad candidate (hud, display, visual-world). This is not bad luck; the
reserve is drawn from the same distribution as the selection, so a ~5% reject
rate applies to promotions too.

Left as a single shot, the consequence is a deadlock rather than a wrong number:
the promoted thread has `key_quality: "none"` or a leaking question,
`loadEffectiveSample()` throws on the empty `truth`, and Task 7 cannot complete
with no in-lane remedy. Normative rules:

1. **Promotion loops.** For each rejected thread, walk `order[domain]` upward
   from `alloc[domain]`, extract a key for each candidate in turn, and stop at
   the first candidate that is neither `key_quality: "none"` nor
   `question_leaks_fix: true` nor a permanent extraction failure.
2. **Every candidate examined is recorded**, including the ones rejected along
   the way, each with its own `reason` and its own key. A promotion that
   consumed three candidates leaves three entries in `rejected` and one in
   `substitutions`; the walk is auditable, and the extra keys are already paid
   for.
3. **Therefore `rejected.length >= substitutions.length`, never equality.** The
   invariant that actually holds -- and the one the probe must assert -- is
   per-domain: the effective sample's per-domain count equals
   `allocation.by_domain[domain].alloc`, for all 24, summing to 500. An earlier
   draft's probe asserted `substitutions.length === rejected.length`, which is
   precisely the invariant a correct re-substitution loop breaks; it would have
   failed the fix and passed the bug.
4. **Every promoted id must sit at `order_index >= alloc[domain]`** and must not
   itself appear in `rejected`. Both are asserted.

The population this defines, and which the findings doc must state: *#helpdesk
threads from the June FAQ frame that are marked solved, still present in the
live corpus, and pose a question whose fix the thread states without the
question itself giving it away.* The substitution walk means the sample is the
first `alloc[domain]` threads in frozen order that meet that definition, which
is a well-defined draw, not a hand-picked one.

## Key extraction (D6 stage 1)

A single-shot JSON-mode DeepSeek call per selected thread. **The client module
is Phase 2's** (`apps/qw-oracle/eval/sim/deepseek-client.ts`); this phase
imports it and defines no HTTP, no retry policy, and no pricing arithmetic of
its own. Capabilities needed from it, named as inert tokens rather than guessed
signatures:

- `TBD(phase-2-client: one-shot JSON-mode completion returning parsed content plus the usage envelope -- prompt_tokens, prompt_cache_hit_tokens, prompt_cache_miss_tokens, completion_tokens, reasoning_tokens)`
- `TBD(phase-2-client: paced-wave concurrency runner with a retry pass and honest failure counts -- the runGently shape fence-external.ts already ports)`

**Cost is NOT a third capability.** An earlier draft carried a
`TBD(phase-2-client: pricing table plus a cost_usd(usage) helper)` token; the
cross-doc check found it does not map -- Phase 2's per-call result already
arrives with `cost_usd` filled on its usage envelope, and the pricing helper
that would compute it lives in a sibling pricing module, not on the client, and
takes a model argument the caller would have to supply. So this phase does not
call a pricing helper at all: `accounting.cost_usd` is the **sum of the
per-call `cost_usd` values the client already reports**, and the only thing
Task 5 must not do is recompute a dollar figure of its own. If the field turns
out to be absent at execution time, that is a finding routed to Phase 2, not a
local pricing table (E10 wants one dollar arithmetic in the arc, not two).

If Phase 2 lands without one of the two capabilities above, this phase's Task 5
stops and routes a finding rather than writing a private second client -- two
clients means two retry postures and two cost stories.

**Permanently failed calls are a defined outcome, not an exception.** The paced
runner's contract returns a null for an item that failed every retry, and a null
that nobody handles becomes a missing key that only surfaces as a probe failure
three tasks later. Rule: a thread whose extraction fails permanently is written
to the JSONL as `{thread_id, error}` with no key, is entered in `rejected` with
`reason: "extraction_failed"`, and is replaced through the same substitution
loop as a leaky or keyless thread. It is never silently dropped and never
retried by hand.

**Volume, measured on one basis and named:** all character counts here are
**JavaScript `String.length`** (UTF-16 code units), because Task 5 truncates in
TypeScript and that is the number the truncation actually applies to. Postgres
`length()` differs slightly on this corpus (it counts characters, so surrogate
pairs -- emoji, which appear in these threads -- count once instead of twice).
On that basis the 500 selected threads carry **653,143 characters** of `content`
(p50 692, p90 3,311, max 15,567), roughly 187k input tokens before prompt
overhead. The wider pool's max is **54,514** and 6 pool threads exceed 16,000,
so the prompt truncates `content` at **16,000 characters** and records
`content_truncated: true` -- which truncates 0 of today's 500 and bounds the
tail if a substitution promotes a monster thread.

### The prompt (byte-pinned)

Lives in `eval/sim/key-prompt.ts` as one exported const. Its sha256 is recorded
in `sample-keys.json`; changing it invalidates every key and requires a full
re-run, which the spot-read gate's failure path already prescribes.

```
You are reading one archived QuakeWorld #helpdesk support thread and writing
down what actually fixed the asker's problem.

DOMAIN: <domain label from faq-domains-resolve META>
QUESTION (the asker's opening messages):
<question>

FULL THREAD (verbatim, "<author>: <text>" per line):
<content, truncated to 16000 chars>

Write ONLY the fix this thread arrived at. Rules:
- Use the thread's own terms. Never add knowledge from outside the thread, and
  never repair or modernise a fix you believe is outdated.
- If several things were tried, record the one the asker confirmed worked.
- If the thread ends with the asker saying they solved it WITHOUT saying how,
  that is key_quality "none" and truth "".
- If the QUESTION block above already states the resolution, set
  question_leaks_fix true (independently of key_quality).
- key_quality: "clear" = a specific, actionable fix (a cvar and its value, a
  file, a download, a named procedure). "weak" = a real but vague direction
  ("update your drivers", "ask in #dev-corner"). "none" = no fix is stated.

Reply with JSON only, no prose, no markdown fence:
{"truth": "<1-3 sentences>", "key_quality": "clear"|"weak"|"none",
 "question_leaks_fix": true|false, "fix_tokens": ["<literal cvar/command/file
 tokens named by the fix>"]}
```

`fix_tokens` exists so the spot-read and D6 stage 4 can mechanically check a
named cvar against L1 at dev-head, instead of judging prose. It is not used for
grading.

### `sample-keys.json`

```
{
  "schema_version": "eval-sample-keys-v1",
  "manifest_sha256": "<64 hex>",         // binds keys to the exact frozen manifest
  "prompt_sha256": "<64 hex>",
  "model": "<the model string the client used>",
  "generated_at": "<ISO-8601>",
  "keys": { "<thread_id>": { "truth": "...", "key_quality": "clear",
                             "question_leaks_fix": false, "fix_tokens": ["gl_outline"],
                             "content_truncated": false } },
  // reason: "question_leaks_fix" | "no_key" | "extraction_failed"
  // from_walk: true = examined while walking for a substitute, not part of the original 500
  "rejected": [ { "thread_id": "12533", "domain": "hud", "reason": "question_leaks_fix",
                  "order_index": 12, "from_walk": false } ],
  "substitutions": [ { "domain": "hud", "rejected_thread_id": "12533",
                       "promoted_thread_id": "...", "promoted_order_index": 65,
                       "candidates_examined": 3,      // >=1; the walk's length
                       "identity": { ...same shape as manifest.selected[]... },
                       "key": { ...same shape as keys[]... } } ],
  "spot_read": {
    "gate": "PASS"|"BLOCK", "n": 50, "read_by": "claude",
    "strata": { "coverage": ["<34 thread_ids>"], "random": ["<16 thread_ids>"] },
    // one entry per read key; reviewer_fix is written BEFORE the key is revealed
    "verdicts": [ { "thread_id": "...", "domain": "hud", "stratum": "coverage",
                    "reviewer_fix": "<one line, written from the thread alone>",
                    "verdict": "faithful"|"thin"|"wrong", "reason": "<one line>" } ],
    "faithful": 47, "thin": 3, "wrong": 0,
    "reviewer_agreement": 0.94,                 // reviewer_fix and truth name the same fix
    "operator_read": [ { "thread_id": "...", "drawn_as": "flagged"|"seeded",
                         "disposition": "<operator's words>" } ]
  },
  "accounting": { "calls": 517, "prompt_tokens": 0, "prompt_cache_hit_tokens": 0,
                  "prompt_cache_miss_tokens": 0, "completion_tokens": 0,
                  "reasoning_tokens": 0, "cost_usd": 0.0 }
}
```

### The spot-read gate -- this is the phase's real risk control

The key IS the answer sheet for every number this arc produces, and nothing
downstream re-derives it: Phase 4's grader is explicitly toolless and sees only
`{question, answer, truth}` (Phase 1's `toGradingInput`), so a systematically
bad key produces confidently wrong verdicts that no later gate can catch. The
D6 pilot checks key quality too, but on 30-50 threads AFTER the grader exists;
this gate runs on the keys themselves, before anything is built on them.

**Sample: 50 keys (10%), two strata, both deterministic from the manifest seed.**

- **Coverage stratum, 34** -- one per domain (the selected thread with the
  lowest `order_index`), plus a **second key for each of the 10 domains whose
  `alloc <= 12`** (skins, maps-locs, crash, ruleset-legality, server-browser,
  audio, binds-scripting, fonts, teamplay-comms, spectating), taken as that
  domain's next-lowest `order_index`. Those are the domains the floor exists to
  protect and the ones Phase 8 reports at n=8..12, so they are exactly where a
  single read key buys the least.
- **Random stratum, 16** -- over the remaining 466, ordered by
  `sha256(seed + ":spot:" + thread_id)`. Unbiased, so its rate is an estimate
  rather than a tripwire reading.

**Standard, per key.** The reviewer works in two passes over the same thread,
and the order is normative:

1. **Blind pass.** Read the thread's full `content` WITHOUT the key, and write
   one line naming the fix the thread landed on (`reviewer_fix`). Commit it.
2. **Compare pass.** Reveal `truth` and assign the verdict.

The order is the whole point. Reading the key first turns the task into
"find support for this" -- confirmation-shaped, and it fails specifically
toward rating a vague key `faithful`, which is the exact class the gate is
weakest against. Writing the fix first makes `thin` visible as a difference
between two texts rather than a judgement about one. `reviewer_agreement` (how
often `reviewer_fix` and `truth` name the same fix) is recorded as a
by-product and is itself informative: a low agreement with a high `faithful`
count means the reviewer is rationalising.

- `faithful` -- the key names the fix the thread actually landed on, at the same
  specificity the reviewer's own line reached.
- `thin` -- the thread states a specific fix and the key is generic about it.
  Not cosmetic: the grader will mark a correct, specific oracle answer as `miss`
  against a vague key, which biases every cell downward and biases cell A least
  (a generic baseline answer matches a generic key) -- i.e. straight at the
  A-vs-C delta that is the arc's headline.
- `wrong` -- the key asserts a fix the thread does not state. Inverts grades in
  both directions; the class that would silently invalidate the arc.

**Gate: PASS requires `wrong == 0` AND `faithful >= 45/50` (90%).** Any single
`wrong` blocks. On BLOCK: revise `key-prompt.ts`, re-run the pass over **all
500** (not just the failures -- a prompt change makes old and new keys
incomparable), re-draw the strata (seed-deterministic, so the re-read is on the
same threads plus whatever substitution changed), and re-gate.

**Operator reads 5**, per D6's "operator eyeballs a handful", and the draw is
mixed on purpose: **at least 2 are drawn seed-deterministically from the whole
50 regardless of verdict** (`sha256(seed + ":oper:" + thread_id)`, lowest
first), the rest are keys Claude marked `thin` or `wrong`, topped up from the
coverage stratum in domain order. If the operator only ever sees keys Claude
flagged plus keys Claude passed and chose to show, systematic leniency is
invisible from that sample by construction -- the unconditional draw is the only
part that can catch a reviewer that is quietly rating `thin` as `faithful`.
Dispositions land in `spot_read.operator_read`.

#### Measured power, stated instead of asserted

An earlier draft of this section claimed a random 40 would miss a per-domain
systematic failure "two times in three". That is wrong by roughly 45x for the
domain it was about. Exact hypergeometric figures, N=500:

**Global gate (the thing it does certify).** P(PASS) as a function of the true
non-`faithful` rate:

| true bad rate | n=40, tolerate 4 | **n=50, tolerate 5 (adopted)** | n=50, tolerate 3 |
|---|---|---|---|
| 2% | 100.0% | 100.0% | 98.8% |
| 5% | 95.9% | 97.0% | 76.7% |
| 10% | 63.0% | 61.7% | 23.6% |
| 15% | 25.2% | **20.5%** | 3.8% |
| 20% | 6.8% | 4.0% | 0.4% |
| 25% | 1.3% | 0.5% | 0.0% |

So a systematic 15% `thin` rate (75 of 500 keys) still slips through **one time
in five**. The tighter `tolerate 3` column would cut that to 3.8% but would
also BLOCK a perfectly acceptable 5% rate **23% of the time**, and a false BLOCK
costs a full 500-key re-run plus a re-read. The 90% threshold is kept, and the
residual is handled downstream instead: **Phase 8 MUST report the headline
twice -- over all keys and over `clear` keys only.** That is no longer an
option (it was Open question 5's default), it is a required companion number,
because it is the only cheap instrument that bounds the `thin` bias's effect on
the A-vs-C delta.

**F41 -- per-domain key quality cannot be certified by any spot-read the arc can
afford, at any domain size.** Probability that a domain whose keys are half bad
ESCAPES the read entirely:

| domain size (alloc) | 24-coverage + 16 random | **34-coverage + 16 random (adopted)** |
|---|---|---|
| 63 (hud) | 15.9% | 15.5% |
| 48 (server-admin) | 21.6% | 21.2% |
| 27 (performance) | 29.6% | 29.3% |
| 16 (weapon-scripts) | 38.0% | 37.7% |
| 12 (skins) | 40.7% | **18.4%** |
| 8 (fonts/teamplay/spectating) | 43.6% | **18.6%** |

The second coverage key roughly halves the escape rate for the small domains
and does nothing for the large ones -- which is the right trade, because the
small domains are the ones Phase 8 reports at n=8. But read the table honestly:
**no domain at any size reaches 90% detection**, and at a 25%-bad rate every
domain escapes more than 42% of the time. Reaching 90% detection for an
8-thread domain requires reading 3 of its 8 keys, and for a 25%-bad rate, 4 of
8 -- i.e. certifying per-domain key quality means reading roughly half the
sample, ~250 keys, which is not a Claude read, it is a second job.

**Declared, so Phase 8 cannot over-read it:** this gate certifies the
**global** key quality within the OC curve above. **Per-domain key quality is
uncertified at every domain size.** Phase 8 must not cut key quality by domain,
and every per-domain match rate carries that caveat. What the coverage stratum
DOES guarantee is that no domain contributes zero read keys, so a domain that is
wholly broken (every key bad) is caught with certainty -- which is the failure
mode that would move the headline, as opposed to the one that would only blur a
single row.

**And the residual on the global number:** at a true rate of 90% the 50-sample's
95% interval is roughly +/-8 points. The gate is a tripwire, not a precision
estimate.

`key_quality: "weak"` keys are **kept**, flagged, and reported both ways by
Phase 8 (headline over all keys, and over `clear` keys only -- now required, per
the OC discussion above). Dropping them would bias the sample toward threads
with tidy one-line fixes, which is exactly the population where the oracle looks
best.

## Files touched

**Created:**
- `apps/qw-oracle/eval/sim/frame.ts` (rank pin derivation + live pool
  resolution + the allocator; pure functions plus one DB read)
- `apps/qw-oracle/eval/sim/split-question.ts` (splitQ reimplementation, F4)
- `apps/qw-oracle/eval/sim/freeze-sample.ts` (CLI, writes the manifest once)
- `apps/qw-oracle/eval/sim/verify-manifest.ts` (CLI, `--live` mode)
- `apps/qw-oracle/eval/sim/key-prompt.ts` (the byte-pinned prompt)
- `apps/qw-oracle/eval/sim/extract-keys.ts` (CLI, resumable)
- `apps/qw-oracle/eval/sim/sample.ts` (`loadEffectiveSample()`)
- `apps/qw-oracle/eval/sim/sample-manifest.json` (**committed**, E13)
- `apps/qw-oracle/eval/sim/sample-keys.json` (**committed**, E13)
- `apps/qw-oracle/eval/sim/records/key-extraction.jsonl` (gitignored, E9/E13)

**Modified:** none. In particular nothing under
`scripts/calibration/faq-gate/` (E12, F14), nothing under `serve/mcp/`, and no
tsconfig or gitignore change -- Phase 1 already made both.

**Deleted:** none.

## Tasks

Strictly forward-dependent: 1 -> 2 -> 3 -> {4, 5}, 5 -> 6, {3, 6} -> 7. No task
consumes a later task's output. The one ordering constraint that is not
obvious: **Task 1 must precede Task 3**, because the baseline it captures is
embedded IN the frozen manifest, and a baseline captured after the freeze
documents a different corpus than the one that was sampled.

### Task 1 -- Corpus baseline capture (MUST precede Task 3) · `inline`

**Goal:** the exact corpus state the arc is pinned to (E4), captured before
anything selects from it.

**Files:** none written yet -- the output is pasted into Task 3's manifest.

**Steps:** run the SQL below and keep its output verbatim. Cross-check
`chat_threads` against Phase 1's `eval/sim/telemetry-baseline.json`; a
difference is an E4/F3 event and stops the phase (see Recovery).

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT json_build_object('captured_at', now(), 'chat_threads',(SELECT count(*) FROM chat_threads),'reconstruction_versions',(SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT reconstruction_version AS v FROM chat_threads) s),'by_channel',(SELECT json_object_agg(channel_name, json_build_array(total, solved) ORDER BY channel_name) FROM (SELECT channel_name, count(*) AS total, count(*) FILTER (WHERE resolution_status='solved') AS solved FROM chat_threads GROUP BY 1) c),'query_log',(SELECT count(*) FROM query_log),'embedding_api_log',(SELECT count(*) FROM embedding_api_log));"

Observed 2026-08-06 (drafting time, with the main checkout's `.env`):
`chat_threads` 40219, `reconstruction_versions` `["fence-sonnet-v2"]`,
`by_channel` `{"#antilag":[1015,410],"#dev-corner":[10359,3714],"#helpdesk":[6772,3694],"#quakeworld":[22073,5316]}`.

**Verification probe:**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;" | grep -qx 40219 && jq -e '.chat_threads == 40219' /home/dev/projects/quakeworld-eval/apps/qw-oracle/eval/sim/telemetry-baseline.json > /dev/null && echo BASELINE_CONSISTENT || { echo BASELINE_MOVED; exit 1; }

Expect `BASELINE_CONSISTENT`, exit 0.

### Task 2 -- Frame module: rank pin + live pool resolution · `agent (workhorse, medium)`

**Goal:** the derived rank -> domain assignment becomes checkable data (F12,
F27), and the live solved pool is resolved once per domain.

**Files:** `eval/sim/frame.ts` (new).

**Steps:**
1. Import `META`, `loadSortedClusters` and `resolveDomainThreads` from
   `../../scripts/calibration/faq-gate/faq-domains-resolve.ts`. Do not copy
   them (E12), do not edit that file, and do not import
   `faq-gate-retrieve.ts` at all (F4 -- its hardcoded `/home/paradoks/...`
   imports fail on this box).
2. `deriveRankPin()`: call `loadSortedClusters()`, and for each non-NOISE and
   NOISE domain key in `META` call `resolveDomainThreads(key, { limit: 1 })`
   and read the returned `clusters[].rank`. Build 48
   `{ rank, cluster_id, size, domain }` tuples. Assert the anchor
   `rank 12 -> cluster_id 14, size 134, 'weapon-scripts'` and that all 48 ranks
   are covered exactly once; throw otherwise.
3. `resolveFrameIds()`: for each of the 24 non-NOISE `META` keys call
   `resolveDomainThreads(key, { limit: Infinity })` and keep the numeric id
   array. Assert the union is 4,456 ids with no id appearing under two domains
   (verified at drafting time: 4,456 total, 4,456 unique).
4. `resolveLivePool(db)`: ONE query, not 24. Build
   `unnest(ARRAY[<ids>]::bigint[], ARRAY[<domains>]::text[])` as a `frame` CTE,
   join `chat_threads`, and return per-row
   `{ id, domain, era, thread_key, channel_name, message_count, content_len,
   content_sha256 }` for rows where `resolution_status = 'solved'`, plus the
   per-domain `frame_n / present / solved` counts. Digest column is
   **`encode(sha256(convert_to(content,'UTF8')),'hex')`** -- see F31: the
   obvious `content::bytea` cast throws `invalid input syntax for type bytea`
   on real rows, because a text-to-bytea cast reinterprets backslash escapes.
5. `allocate(solvedByDomain, N, floor)`: the four-step algorithm above, with all
   three assertions (`sum === N`, `alloc_d <= solved_d`,
   `alloc_d >= min(floor, solved_d)`), the largest-remainder tie-break on domain
   key ascending, and `floored` returned per domain as
   `false | 'at-floor' | 'pool-exhausted'`. Return both `quota_raw` (the
   first-pass proportional quota, e.g. hud 64.159) and `quota_post_pin` (the
   quota the rounding actually consumed after the floor pins, e.g. hud 63.446)
   -- they differ, and `alloc` derives from the SECOND. Task 4's field-by-field
   diff compares against `quota_post_pin`; a verifier told to re-derive `alloc`
   from `quota_raw` fails spuriously on every floored run.

**Verification probe** (the first command re-establishes, from inside the
worktree with the real toolchain, the resolver-typechecks-clean precondition
that Inputs could only establish out-of-worktree):

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo RESOLVER_IMPORT_TYPECHECKS
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'import { deriveRankPin, resolveFrameIds, allocate } from "./eval/sim/frame.ts"; const fail=(m)=>{console.log("FAIL",m);process.exit(1)}; const pin=deriveRankPin(); if(pin.length!==48) fail("rank pin length "+pin.length); const a=pin.find(p=>p.rank===12); if(!a||a.cluster_id!==14||a.size!==134||a.domain!=="weapon-scripts") fail("anchor "+JSON.stringify(a)); const ids=resolveFrameIds(); const flat=Object.values(ids).flat(); if(flat.length!==4456) fail("frame ids "+flat.length); if(new Set(flat).size!==4456) fail("frame ids not unique"); if(Object.keys(ids).length!==24) fail("domains "+Object.keys(ids).length); const solved={hud:406,"onboard-install":314,"server-admin":308,"visual-world":227,performance:175,textures:174,linux:161,"visual-projectile":155,display:137,network:133,demos:106,"weapon-scripts":105,"input-mouse":97,"config-files":80,skins:79,"maps-locs":77,crash:71,"ruleset-legality":68,"server-browser":61,audio:57,"binds-scripting":55,fonts:46,"teamplay-comms":39,spectating:33}; const r=allocate(solved,500,8); const al=r.alloc; const sum=Object.values(al).reduce((x,y)=>x+y,0); if(sum!==500) fail("alloc sum "+sum); for(const k of Object.keys(solved)){ if(al[k]>solved[k]) fail("alloc>solved "+k); if(al[k]<Math.min(8,solved[k])) fail("below floor "+k); } const want={hud:63,"onboard-install":49,"server-admin":48,"visual-world":36,performance:27,textures:27,linux:25,"visual-projectile":24,display:21,network:21,demos:17,"weapon-scripts":16,"input-mouse":15,"config-files":13,skins:12,"maps-locs":12,crash:11,"ruleset-legality":11,"server-browser":10,audio:9,"binds-scripting":9,fonts:8,"teamplay-comms":8,spectating:8}; for(const k of Object.keys(want)) if(al[k]!==want[k]) fail("alloc drift "+k+": "+al[k]+" want "+want[k]); const pinned=Object.entries(r.floored).filter(([,v])=>v!=="false"&&v!==false).map(([k])=>k).sort(); if(pinned.join(",")!=="fonts,spectating,teamplay-comms") fail("floored set "+pinned.join(",")); const x=allocate({...solved,spectating:5},500,8); if(x.floored.spectating!=="pool-exhausted") fail("pool-exhausted not flagged, got "+x.floored.spectating); console.log("FRAME_OK 48 ranks, 4456 ids, alloc 500, 3 at-floor, pool-exhaustion detected"); process.exit(0);'

Expect `RESOLVER_IMPORT_TYPECHECKS` then
`FRAME_OK 48 ranks, 4456 ids, alloc 500, 3 at-floor, pool-exhaustion detected`,
both exit 0. Three things this checks that a weaker probe would not: the FULL
24-row allocation against the drafting-time known-answer (not just four
domains, so a rounding change anywhere is caught); that exactly
`fonts, spectating, teamplay-comms` are the pinned set; and that a domain whose
pool falls below the floor is reported `pool-exhausted` rather than silently
under-filling -- verified at revision time that the naive allocator returns
`spectating: 5` with the sum still landing on 500 and nothing thrown, which is
the defect this assertion exists for. The hardcoded `solved` map tests the
ALLOCATOR against a fixture independently of what the live pool says on the day;
Task 3's probe checks it against live counts.

### Task 3 -- Allocation, selection, question extraction, FREEZE · `agent (workhorse, high)`

**Goal:** `sample-manifest.json` exists, is verified, is committed, and is never
written again.

**Write, verify, THEN commit -- in that order.** An earlier draft committed at
the end of this task and built the verifier in Task 4, which meant the first
manifest was in git before anything had checked it, and Recovery then forbade
`--force` on the grounds that "every record already taken references it by
digest" -- at a moment when zero records exist. The DAG is unchanged (Task 4
still builds the reusable checker); what moves is the commit, to after step 7's
in-task check passes. Re-freezing before any key exists is free, and the plan
must not pretend otherwise.

**Files:** `eval/sim/split-question.ts` (new), `eval/sim/freeze-sample.ts`
(new), `eval/sim/sample-manifest.json` (new, committed).

**Steps:**
1. Write `split-question.ts`: `splitQuestion(content: string): { opening:
   string; rest: string; fallback: boolean; lines: number }`, behaviourally
   identical to `faq-gate-retrieve.ts:69-83` including the first-4-lines
   fallback. Comment says where it came from and why it is a copy (F4), and
   that the fallback is retained despite firing 0/3164 on this pool.
2. Write `freeze-sample.ts`. It **refuses to run if `sample-manifest.json`
   already exists** (exit 1 with a message naming E4) unless `--force` is
   passed; the freeze is once-only by construction, not by discipline. The
   refusal message states the one legitimate `--force` case explicitly: while
   `sample-keys.json` does NOT yet exist, nothing downstream references the
   manifest and re-freezing is harmless.
3. It calls `deriveRankPin()`, `resolveFrameIds()`, `resolveLivePool(db)`,
   `allocate(...)`, then builds `order[domain]` = the domain's live solved ids
   sorted ascending by id and re-sorted by `sha256(seed + ":" + id)` hex
   ascending, and takes the first `alloc[domain]` of each as `selected`.
4. For each selected thread, run `splitQuestion(content)` and record
   `question`, `question_lines`, `question_fallback`, plus the identity fields
   and `order_index`. Assert every `question` is non-empty and every
   `content_sha256` is 64 hex characters.
5. Paste Task 1's baseline JSON into `corpus_baseline`, add the frame file
   digests (`sha256sum` of `faq-clusters.json` and `faq-domains-resolve.ts`),
   the `note` prose block verbatim from this doc, and write the file with
   2-space indentation and a trailing newline so future diffs are readable.
   Expect roughly 380-410 KB.
6. **Run the verification probe below against the written-but-uncommitted
   file.** If it fails, fix the generator and re-run `freeze-sample.ts
   --force` -- legal here precisely because no key file exists yet.
7. Only once the probe passes, commit. This is one of the two committed
   artifacts E13 names.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const m = await Bun.file("eval/sim/sample-manifest.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; if(m.selected.length!==500) fail("selected "+m.selected.length); if(new Set(m.selected.map(s=>s.thread_id)).size!==500) fail("duplicate thread_id"); if(typeof m.note!=="string" || !/ZERO 2026/.test(m.note)) fail("note block missing or does not carry the era-window statement"); const A=m.allocation.by_domain; const alloc=Object.fromEntries(Object.entries(A).map(([k,v])=>[k,v.alloc])); if(Object.keys(alloc).length!==24) fail("domains "+Object.keys(alloc).length); if(Object.values(alloc).reduce((a,b)=>a+b,0)!==500) fail("alloc sum"); const seen={}; for(const s of m.selected) seen[s.domain]=(seen[s.domain]||0)+1; const FL=new Set([false,"at-floor","pool-exhausted"]); for(const d of Object.keys(alloc)) { if(seen[d]!==alloc[d]) fail("domain "+d+" has "+seen[d]+" want "+alloc[d]); const sv=m.pool.by_domain[d].solved; if(alloc[d] > sv) fail("alloc>solved "+d); if(alloc[d] < Math.min(m.floor, sv)) fail("below floor "+d); if(!FL.has(A[d].floored)) fail("floored not tri-state for "+d+": "+JSON.stringify(A[d].floored)); if(A[d].floored==="pool-exhausted" && !(m.pool_exhausted_acknowledged||[]).includes(d)) fail("UNACKNOWLEDGED pool-exhausted domain "+d); if(typeof A[d].quota_raw!=="number"||typeof A[d].quota_post_pin!=="number") fail("missing quota_raw/quota_post_pin for "+d); if(m.order[d].length !== sv) fail("order len "+d); if(m.order[d].slice(0,alloc[d]).join(",") !== m.selected.filter(s=>s.domain===d).map(s=>s.thread_id).join(",")) fail("selected is not the head of order for "+d); } if(Object.values(m.order).flat().length!==3164) fail("order total"); if(m.selected.some(s=>!s.question || !s.question.trim())) fail("empty question"); if(m.selected.some(s=>!/^[0-9a-f]{64}$/.test(s.content_sha256))) fail("bad digest"); if(m.selected.some(s=>typeof s.domain_rank!=="number")) fail("domain_rank must be a scalar"); if(m.frame.rank_pin.length!==48) fail("rank pin"); const pinned=Object.entries(A).filter(([,v])=>v.floored!==false).map(([k])=>k).sort().join(","); console.log("MANIFEST_SHAPE_OK", m.selected.length, "threads /", Object.keys(alloc).length, "domains / floored:", pinned||"(none)"); process.exit(0);'

Expect `MANIFEST_SHAPE_OK 500 threads / 24 domains / floored:
fonts,spectating,teamplay-comms`, exit 0. Three things this asserts that a
weaker probe would not: that `selected` per domain is exactly the HEAD of
`order[domain]` (what makes substitution a walk rather than a new draw); that
`alloc_d >= min(floor, solved_d)`, which is the only check that catches a
silently under-filled domain; and that any `pool-exhausted` domain has been
explicitly acknowledged rather than merely recorded.

### Task 4 -- `verify-manifest.ts`, the reusable checker · `agent (workhorse, medium)`

**Goal:** the manifest's arithmetic and its agreement with the live corpus are
one command, because Phase 6 re-runs it before the bulk run (E4).

**Files:** `eval/sim/verify-manifest.ts` (new).

**Steps:**
1. Default (no flag) mode is pure: no DB. Re-derive the rank pin via
   `frame.ts` and diff it against `manifest.frame.rank_pin` field by field;
   re-derive the allocation from `manifest.pool.by_domain[*].solved` and diff
   against `manifest.allocation.by_domain`; re-derive each domain's sampling
   order from `manifest.order[domain]`'s id set using the manifest's own `seed`
   and assert it reproduces the recorded order; re-check the file digests of
   `faq-clusters.json` and `faq-domains-resolve.ts` against
   `manifest.frame.*_sha256`. Print one PASS/FAIL line per check.
2. **The allocation diff compares `alloc` against `quota_post_pin`, not
   `quota_raw`.** Both are recorded and they differ on any floored run (hud:
   raw 64.159, post-pin 63.446, alloc 63). A verifier that re-derives `alloc`
   from `quota_raw` fails spuriously on exactly the runs where the floor did
   its job. It also asserts `floored` is one of
   `false | 'at-floor' | 'pool-exhausted'`, that `alloc_d >= min(floor,
   solved_d)`, and that any `pool-exhausted` domain appears in
   `pool_exhausted_acknowledged`.
3. `--live` additionally opens `shared/db.ts` and asserts, over the **effective
   sample** -- `loadEffectiveSample()` if `sample-keys.json` exists, otherwise
   the manifest's 500 `selected` -- that every `thread_id` is present;
   `thread_key` matches; `encode(sha256(convert_to(content,'UTF8')),'hex')`
   matches `content_sha256`; `resolution_status = 'solved'`; `channel_name =
   '#helpdesk'`; and the corpus baseline (total, per-channel, distinct
   `reconstruction_version`) equals `manifest.corpus_baseline`. Checking the
   effective set rather than the frozen one is what makes this usable as Phase
   6's pre-bulk gate: substituted-in threads are the ones the bulk will answer.
4. **Non-emptiness floor on every live assertion:** the count of rows the join
   returned must equal 500 before any FILTER-based assertion is read. Without
   it, a join that returns nothing makes "all rows are `#helpdesk`" and "all
   digests match" vacuously true, and the probe passes loudest exactly when the
   frame has evaporated. This is the same trap F22 documented on the lexical
   path.
5. `process.exit(failures ? 1 : 0)`, and print the failure list, not just a
   count.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/verify-manifest.ts && bun eval/sim/verify-manifest.ts --live

Expect all PASS and exit 0 from both. Also run the negative case once by hand
-- point it at a copy with one `content_sha256` altered -- and confirm it exits
1; a checker that has never been seen to fail is not evidence.

### Task 5 -- Key extraction pass · `agent (session-tier, high)`

**Goal:** every selected thread has a `truth`, with cost accounted (E10) and
the run resumable (E9).

**Files:** `eval/sim/key-prompt.ts` (new), `eval/sim/extract-keys.ts` (new),
`eval/sim/records/key-extraction.jsonl` (gitignored), `eval/sim/sample-keys.json`
(new, committed).

**Steps:**
1. Write `key-prompt.ts`: the prompt above as one exported template function,
   byte-identical to this doc, plus an exported `PROMPT_SHA256` computed at
   import from the template's literal source string.
2. Write `extract-keys.ts`. It reads the manifest, loads each selected thread's
   `content` from the twin in one batched SELECT, truncates at 16,000
   characters (recording `content_truncated`), and issues one call per thread
   through Phase 2's client
   (`TBD(phase-2-client: one-shot JSON-mode completion returning parsed content plus the usage envelope)`),
   paced by
   `TBD(phase-2-client: paced-wave concurrency runner with a retry pass and honest failure counts)`.
3. **Append one JSONL line per completed thread** to
   `eval/sim/records/key-extraction.jsonl` before moving on (E9); on restart,
   read that file and skip thread ids already present. A crash at thread 400
   costs 100 calls, not 500. Do not accumulate in memory and write once -- that
   is the F15 failure the ledger already ruled out.
4. Validate every response: `key_quality` in `clear|weak|none`,
   `question_leaks_fix` boolean, `fix_tokens` an array of strings, `truth` a
   string that is empty **iff** `key_quality === "none"`. A schema-invalid
   response is a counted, retried failure, never a silent default.
5. **Handle the runner's nulls explicitly.** The paced runner reports a null for
   an item that failed every retry. For each such thread, write
   `{thread_id, error}` to the JSONL and add it to `rejected` with
   `reason: "extraction_failed"`. Print the permanent-failure count. Do not
   leave a null to surface later as a missing key -- the probe below would fail
   with no diagnosis attached, three tasks after the cause.
6. Compact the JSONL into `sample-keys.json` with `manifest_sha256`,
   `prompt_sha256`, `model`, the `keys` map, and the `accounting` block --
   summed usage including `reasoning_tokens` and both cache-token fields.
   `cost_usd` is the **sum of the per-call `cost_usd` values the client already
   reports**; do not compute a dollar figure locally (E10 wants one dollar
   arithmetic in the arc). Print the token and dollar totals to stdout. Leave
   `substitutions` and `spot_read` empty and `rejected` holding only the
   `extraction_failed` entries; Task 6 fills the rest.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const m=await Bun.file("eval/sim/sample-manifest.json").json(); const k=await Bun.file("eval/sim/sample-keys.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; const failed=new Set((k.rejected||[]).filter(r=>r.reason==="extraction_failed").map(r=>r.thread_id)); const ids=m.selected.map(s=>s.thread_id); const missing=ids.filter(i=>!(i in k.keys) && !failed.has(i)); if(missing.length) fail("no key and no recorded failure for "+missing.length+" threads, first "+missing[0]); if(failed.size > 25) fail(failed.size+" permanent extraction failures -- that is a client or quota problem, not a data one"); const V=new Set(["clear","weak","none"]); for(const [id,v] of Object.entries(k.keys)) { if(!V.has(v.key_quality)) fail("bad key_quality "+id+" "+v.key_quality); if(typeof v.question_leaks_fix!=="boolean") fail("bad question_leaks_fix "+id); if(!Array.isArray(v.fix_tokens)) fail("bad fix_tokens "+id); if((v.truth.trim()==="") !== (v.key_quality==="none")) fail("truth/key_quality disagree "+id); } const n=Object.keys(k.keys).length; const clear=Object.values(k.keys).filter(v=>v.key_quality==="clear").length; const none=Object.values(k.keys).filter(v=>v.key_quality==="none").length; if(n < 475) fail("only "+n+" keys produced"); if(clear < 250) fail("only "+clear+" clear keys -- extraction is broken, not merely imperfect"); if(k.accounting.calls < n) fail("accounting.calls "+k.accounting.calls+" < keys "+n); if(!(k.accounting.cost_usd > 0)) fail("cost_usd not measured"); if(typeof k.accounting.reasoning_tokens !== "number") fail("reasoning tokens missing"); console.log("KEYS_OK "+n+" keys, clear="+clear+" none="+none+" failed="+failed.size+" cost=$"+k.accounting.cost_usd.toFixed(4)); process.exit(0);'

Expect `KEYS_OK <n> keys, clear=<n> none=<n> failed=0 cost=$<n>`, exit 0. The
`clear >= 250` floor is deliberately a broken-vs-imperfect line, not a quality
bar -- quality is Task 6's job. The `truth`/`key_quality` cross-check is what
stops a model that answers `{"truth":"", "key_quality":"clear"}` from passing.
And the missing-key check accepts a thread that has a RECORDED permanent
failure while still failing on a thread that simply has no key -- the
distinction step 5 exists to make.

### Task 6 -- Spot-read gate and substitutions · `agent (session-tier, high)`

**Goal:** the answer sheet is checked before anything is built on it, and every
unusable thread is replaced from the manifest's own frozen order.

**Files:** `eval/sim/sample-keys.json` (modify -- `rejected`, `substitutions`,
`spot_read`).

**Substitution runs BEFORE the spot-read**, so the 50 keys read are the 50 keys
the arc will actually use. Reading the gate on a sample that then changes under
it would certify keys that got substituted away and leave the promoted ones
uncertified.

**Steps:**
1. **Substitution loop.** Every selected thread with `key_quality === "none"`,
   `question_leaks_fix === true`, or a recorded `extraction_failed` goes into
   `rejected` with `from_walk: false`. For each, walk `order[domain]` upward
   from `alloc[domain]`; for each candidate, extract a key with the SAME pinned
   prompt and apply the SAME screen. A candidate that fails the screen is
   appended to `rejected` with `from_walk: true` and the walk continues; the
   first candidate that passes becomes the promotion, recorded with
   `candidates_examined` = the walk length. Measured expectation on the real
   selection: ~25 rejections, 3 of which need a walk of more than one, deepest
   walk 7 (hud). Skip any id already selected or already promoted.
2. Assert, before going further: each substitution stayed inside its own
   domain; every promoted id sits at `order_index >= alloc[domain]`; no promoted
   id appears in `rejected`; and the per-domain effective count equals
   `allocation.by_domain[domain].alloc` for all 24. **Do not assert
   `substitutions.length === rejected.length`** -- a walk longer than one makes
   that false by design.
3. Append every extraction call made here (promotions and walked-past
   candidates alike) to `accounting`.
4. **Draw the 50:** 34 coverage keys -- one per domain (lowest `order_index`
   among the effective sample) plus a second for each domain whose
   `alloc <= 12` (its next-lowest `order_index`) -- plus 16 from the remaining
   466 ordered by `sha256(seed + ":spot:" + thread_id)`. Print all 50 ids so the
   draw is reproducible and auditable.
5. **Blind pass first.** For each of the 50, read the thread's full `content`
   from the twin WITHOUT looking at `truth`, and write `reviewer_fix`: one line
   naming the fix the thread landed on. All 50 blind lines are committed before
   any key is revealed. This ordering is normative -- reading the key first is
   what makes a vague key look faithful, which is the class the gate is weakest
   against.
6. **Compare pass.** Reveal `truth` and assign `faithful | thin | wrong` with a
   one-line reason. Where `fix_tokens` names a cvar or command, check it exists
   at dev-head **with a direct SELECT against the L1 `entities` table** --

       SELECT name, project, type FROM entities WHERE lower(name) = ANY(<lowercased fix_tokens>)

   -- and NOT via an MCP tool call. This phase makes no MCP call at all, which
   is what keeps the Outputs claim true, keeps E3's telemetry attribution clean
   (boundary probe 7 asserts `query_log` is unchanged), and keeps every file
   under `eval/sim/` rather than dragging in E12's MAJOR-1 SDK exception. A key
   naming a cvar with no `entities` row is `wrong` regardless of how plausible
   the prose reads. Record `reviewer_agreement` = the fraction of the 50 where
   `reviewer_fix` and `truth` name the same fix.
7. Write `spot_read` with the gate outcome. **PASS requires `wrong == 0` and
   `faithful >= 45/50`.** On BLOCK, stop the phase: revise `key-prompt.ts`,
   delete `eval/sim/records/key-extraction.jsonl`, re-run Task 5 over all 500,
   re-run this task from step 1. Do not patch individual keys by hand --
   hand-patched keys are not produced by the pinned prompt and make
   `prompt_sha256` a lie.
8. Surface the 5 operator-read keys in chat (thread id, question, key,
   `reviewer_fix`, Claude's verdict). **At least 2 of the 5 are drawn
   seed-deterministically from the whole 50 regardless of verdict**
   (`sha256(seed + ":oper:" + thread_id)`, lowest first, marked
   `drawn_as: "seeded"`); the remainder are keys marked `thin` or `wrong`, then
   coverage keys in domain order, marked `drawn_as: "flagged"`. Record each
   disposition in `spot_read.operator_read` as
   `{thread_id, drawn_as, disposition}`. Without the unconditional draw the
   operator only ever sees what Claude flagged plus what Claude passed and chose
   to show, so a systematically lenient reviewer is invisible from that sample
   by construction.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const m=await Bun.file("eval/sim/sample-manifest.json").json(); const k=await Bun.file("eval/sim/sample-keys.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; const sr=k.spot_read; if(!sr) fail("no spot_read block"); if(sr.n!==50||(sr.verdicts||[]).length!==50) fail("spot_read n="+sr.n+" verdicts="+(sr.verdicts||[]).length); if(sr.wrong!==0) fail("gate: "+sr.wrong+" wrong keys"); if(sr.faithful<45) fail("gate: faithful "+sr.faithful+"/50 < 45"); if(sr.gate!=="PASS") fail("gate "+sr.gate); if(sr.verdicts.some(v=>typeof v.reviewer_fix!=="string"||!v.reviewer_fix.trim())) fail("a verdict has no blind reviewer_fix -- the blind pass was skipped"); if(typeof sr.reviewer_agreement!=="number") fail("reviewer_agreement not recorded"); const seeded=(sr.operator_read||[]).filter(o=>o.drawn_as==="seeded").length; if((sr.operator_read||[]).length<5) fail("operator_read "+(sr.operator_read||[]).length+" < 5"); if(seeded<2) fail("only "+seeded+" unconditional operator draws, need >=2"); if(sr.operator_read.some(o=>!o.disposition)) fail("an operator_read entry has no disposition"); const A=m.allocation.by_domain; const domOf=Object.fromEntries(m.selected.map(s=>[s.thread_id,s.domain])); const rej=new Set(k.rejected.map(r=>r.thread_id)); const prom=new Set(k.substitutions.map(s=>s.promoted_thread_id)); for(const r of k.rejected){ if(!r.from_walk && !(r.thread_id in domOf)) fail("non-walk rejected id not in manifest selected: "+r.thread_id); if(r.from_walk && !m.order[r.domain].includes(r.thread_id)) fail("walked-past id not in frozen order: "+r.thread_id); } if(k.substitutions.length > k.rejected.length) fail("more substitutions ("+k.substitutions.length+") than rejections ("+k.rejected.length+")"); const eff={}; for(const s of m.selected) if(!rej.has(s.thread_id)) eff[s.domain]=(eff[s.domain]||0)+1; for(const s of k.substitutions){ const ord=m.order[s.domain]; const idx=ord.indexOf(s.promoted_thread_id); if(idx<0) fail("promoted id not in frozen order "+s.promoted_thread_id); if(idx < A[s.domain].alloc) fail("promoted from inside the selected head "+s.promoted_thread_id); if(rej.has(s.promoted_thread_id)) fail("promoted a rejected thread "+s.promoted_thread_id); if(domOf[s.rejected_thread_id] && domOf[s.rejected_thread_id]!==s.domain) fail("substitution crossed domains "+s.rejected_thread_id); if(!(s.candidates_examined>=1)) fail("candidates_examined missing for "+s.promoted_thread_id); if(!s.key || typeof s.key.truth!=="string" || !s.key.truth.trim()) fail("promoted thread has no usable key "+s.promoted_thread_id); eff[s.domain]=(eff[s.domain]||0)+1; } let tot=0; for(const d of Object.keys(A)){ if((eff[d]||0)!==A[d].alloc) fail("effective count for "+d+": "+(eff[d]||0)+" != alloc "+A[d].alloc); tot+=eff[d]; } if(tot!==500) fail("effective total "+tot); const covered=new Set(sr.verdicts.map(v=>v.domain)); if(covered.size!==24) fail("coverage stratum reached only "+covered.size+" domains"); const small=Object.keys(A).filter(d=>A[d].alloc<=12); for(const d of small){ const n=sr.verdicts.filter(v=>v.domain===d&&v.stratum==="coverage").length; if(n<2) fail("small domain "+d+" got only "+n+" coverage keys, need 2"); } console.log("GATE_PASS faithful="+sr.faithful+"/50 wrong=0 agreement="+sr.reviewer_agreement+" rejected="+k.rejected.length+" substituted="+k.substitutions.length+" (walks>1: "+k.substitutions.filter(s=>s.candidates_examined>1).length+")"); process.exit(0);'

Expect
`GATE_PASS faithful=<n>/50 wrong=0 agreement=<n> rejected=<n> substituted=<n> (walks>1: <n>)`,
exit 0. Four assertions carry the weight here. `idx >= alloc` proves a promotion
came from OUTSIDE the originally selected head, so substitution added a thread
rather than shuffling one. **The per-domain effective count against `alloc`
replaces the old `substitutions.length === rejected.length` check**, which a
correct re-substitution loop breaks by design -- it would have failed the fix
and passed the bug. The `reviewer_fix` non-emptiness check is the only
mechanical evidence that the blind pass actually happened. And the
`seeded >= 2` check is what stops the operator's sample from being entirely
Claude's own selection.

### Task 7 -- `loadEffectiveSample()` · `agent (workhorse, medium)`

**Goal:** Phases 4-6 read one function, not three files and a merge rule.

**Files:** `eval/sim/sample.ts` (new).

**Steps:**
1. Export
   `interface SampleThread { thread_id, thread_key, domain, era, question, truth, key_quality, fix_tokens, content_sha256, channel_name }`
   and `loadEffectiveSample(): SampleThread[]`.
2. It reads both JSON files, asserts `sample-keys.json.manifest_sha256` matches
   the manifest's actual digest (so a stale keys file cannot pair with a
   re-frozen manifest), drops every `rejected` thread, appends every
   `substitutions[].identity` merged with its `.key`, and returns the result
   sorted by `domain` then `order_index`.
3. It THROWS on: length !== 500, a duplicate `thread_id`, an empty `question`,
   an empty `truth`, a per-domain count that differs from
   `allocation.by_domain[*].alloc`, or a manifest-digest mismatch. Every one of
   those is a condition under which a downstream phase would produce numbers
   that look fine and mean nothing, so the loader refuses rather than degrades
   -- the same posture Phase 1 took on `parseEnvContext()`.
4. No DB access. The effective sample is derivable from two committed files, so
   Phase 8 can rebuild it a month later without the twin.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && bun -e 'import { loadEffectiveSample } from "./eval/sim/sample.ts"; const m=await Bun.file("eval/sim/sample-manifest.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; const s=loadEffectiveSample(); if(s.length!==500) fail("length "+s.length); if(new Set(s.map(x=>x.thread_id)).size!==500) fail("duplicates"); if(s.some(x=>!x.question.trim())) fail("empty question"); if(s.some(x=>!x.truth.trim())) fail("empty truth"); if(s.some(x=>x.channel_name!=="#helpdesk")) fail("non-helpdesk thread in sample"); const by={}; for(const x of s) by[x.domain]=(by[x.domain]||0)+1; for(const [d,v] of Object.entries(m.allocation.by_domain)) if(by[d]!==v.alloc) fail("domain "+d+": "+by[d]+" != "+v.alloc); const eras=new Set(s.map(x=>x.era)); if([...eras].some(e=>e<2020||e>2025)) fail("era outside 2020-2025: "+[...eras].join(",")); console.log("EFFECTIVE_SAMPLE_OK 500 threads, 24 domains, eras "+[...eras].sort().join("/")); process.exit(0);'

Expect `EFFECTIVE_SAMPLE_OK 500 threads, 24 domains, eras 2020/2021/2022/2023/2024/2025`,
exit 0.

## Phase-boundary verification

Every probe runs as written from a shell in the worktree. Probes 1, 2, 5, 6, 7
and probe 4's raw-SQL half were executed verbatim at drafting or revision time
against the twin (substituting the main checkout's `.env` path, which Phase 1
Task 1 makes identical) and their expected values are the observed ones. Probes
3, 8 and probe 4's `verify-manifest.ts` half exercise code this phase creates
and are stated with their exact expected stdout and exit status.

**1. Corpus has not moved and the frame file is the one that was resolved.**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;" | grep -qx 40219 && echo CORPUS_UNMOVED || { echo CORPUS_MOVED; exit 1; }
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && jq -r '.frame.faq_clusters_sha256 + "  scripts/calibration/faq-gate/faq-clusters.json"' eval/sim/sample-manifest.json | sha256sum -c - && echo FRAME_PINNED

Expect `CORPUS_UNMOVED`, then
`scripts/calibration/faq-gate/faq-clusters.json: OK` and `FRAME_PINNED` --
YES/NO, both exit 0. (An earlier draft printed the count and compared nothing,
so the line exited 0 whatever the corpus said; the `grep -qx` is what turns it
into an assertion.) The frame digest at drafting time was
`aa7f65723e128a94aff17bc94709b2985195f307638bf46df54d4fb54d2f9a94`; a
different count is an E4/F3 event and stops the arc, a different digest means
something edited a file this arc is only allowed to read (E12).

**2. Live corpus baseline equals the manifest's frozen baseline.**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle
    diff <(jq -Sc '.corpus_baseline | del(.captured_at, .query_log, .embedding_api_log)' eval/sim/sample-manifest.json) <(psql "$DATABASE_URL" -Atc "SELECT json_build_object('chat_threads',(SELECT count(*) FROM chat_threads),'reconstruction_versions',(SELECT json_agg(v ORDER BY v) FROM (SELECT DISTINCT reconstruction_version AS v FROM chat_threads) s),'by_channel',(SELECT json_object_agg(channel_name, json_build_array(total, solved) ORDER BY channel_name) FROM (SELECT channel_name, count(*) AS total, count(*) FILTER (WHERE resolution_status='solved') AS solved FROM chat_threads GROUP BY 1) c));" | jq -Sc .) && echo BASELINE_IDENTICAL

Expect `BASELINE_IDENTICAL` and exit 0 -- YES/NO. Observed right-hand side at
drafting time:
`{"by_channel":{"#antilag":[1015,410],"#dev-corner":[10359,3714],"#helpdesk":[6772,3694],"#quakeworld":[22073,5316]},"chat_threads":40219,"reconstruction_versions":["fence-sonnet-v2"]}`.
This is the exact comparison Phase 6 re-runs before the bulk (E4).

**3. Manifest arithmetic, pure.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/verify-manifest.ts

Expect every line PASS and exit 0: 48-entry rank pin re-derived and identical
(including the five straddling tie groups of F27); allocation re-derived from
`pool.by_domain[*].solved` and identical, summing to 500 over 24 domains, with
`alloc <= solved` AND `alloc >= min(floor, solved)` everywhere and `floored`
tri-state on all 24; the `alloc` diff taken against `quota_post_pin`; every
domain's sampling order reproduced from the recorded `seed`; both frame-file
digests matching -- YES/NO.

**4. Every sampled thread is still there, unchanged, solved, and `#helpdesk`.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/verify-manifest.ts --live

Expect every line PASS and exit 0. The same assertion at raw-SQL level, which
is what was actually executed at drafting time over the 500-thread dry-run
sample:

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle
    J=$(jq -c '[.selected[] | {thread_id: (.thread_id|tonumber), thread_key, content_sha256}]' eval/sim/sample-manifest.json)
    psql "$DATABASE_URL" -Atc "WITH m AS (SELECT * FROM json_to_recordset('$J') AS x(thread_id bigint, thread_key text, content_sha256 text)) SELECT count(*)||'/'||count(t.id)||'/'||count(*) FILTER (WHERE t.thread_key=m.thread_key)||'/'||count(*) FILTER (WHERE encode(sha256(convert_to(t.content,'UTF8')),'hex')=m.content_sha256)||'/'||count(*) FILTER (WHERE t.resolution_status='solved' AND t.channel_name='#helpdesk') FROM m LEFT JOIN chat_threads t ON t.id=m.thread_id;" | grep -qx '500/500/500/500/500' && echo SAMPLE_IDENTITIES_INTACT || { echo SAMPLE_IDENTITIES_MOVED; exit 1; }

Expect `SAMPLE_IDENTITIES_INTACT`, exit 0 -- YES/NO. Observed
`500/500/500/500/500` at drafting time against the dry-run sample. The `grep
-qx` is load-bearing: without it an empty `.selected[]` yields `0/0/0/0/0` and
the command still exits 0, which is a probe that passes loudest when the
manifest is emptiest. The first number is also the non-emptiness floor -- any
leading value other than 500 means the jq extraction or the join produced a
different row count and none of the trailing counts can be read.

**This probe checks the FROZEN 500, not the effective 500.** Substitution
(Task 6) changes which threads the arc uses without touching the manifest, so
after Task 6 the promoted threads are covered by boundary probe 8 via
`loadEffectiveSample()` rather than here. Phase 6's E4 re-assertion must run
`verify-manifest.ts --live`, which checks both sets.

**5. The pool is the one the arc's numbers are based on.**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle
    jq -e '.pool.solved == 3164 and .pool.present == 4222 and .pool.frame_ids_non_noise == 4456 and ([.pool.by_domain[].solved] | add) == 3164 and ([.allocation.by_domain[].alloc] | add) == 500' eval/sim/sample-manifest.json && echo POOL_PINNED

Expect `true` + `POOL_PINNED` -- YES/NO. Every one of those five figures was
measured live at drafting time. A `solved` other than 3,164 with an unchanged
`chat_threads` count means `resolution_status` moved under the frame, which is
not a harvest event and needs its own finding.

**6. The era window is what the findings doc will claim.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && jq -e '(.pool.era_histogram | keys | sort) == ["2020","2021","2022","2023","2024","2025"] and (.pool.era_histogram | to_entries | map(.value) | add) == 3164 and (.note | test("ZERO 2026"))' eval/sim/sample-manifest.json && echo ERA_WINDOW_PINNED

Expect `true` + `ERA_WINDOW_PINNED` -- YES/NO. Observed histogram
2020:365 2021:710 2022:523 2023:615 2024:511 2025:440.

**7. This phase made no oracle tool call (E3 attribution stays clean).**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle
    psql "$DATABASE_URL" -Atc "SELECT (SELECT count(*) FROM query_log)||'|'||(SELECT count(*) FROM embedding_api_log);" | tr '|' ' ' | { read q e; jq -e --argjson q "$q" --argjson e "$e" '.corpus_baseline.query_log == $q and .corpus_baseline.embedding_api_log == $e' eval/sim/sample-manifest.json > /dev/null && echo TELEMETRY_UNCHANGED || { echo "TELEMETRY_MOVED live=$q/$e"; exit 1; }; }

Expect `TELEMETRY_UNCHANGED` -- YES/NO, exit 0. **Phase 3 issues no MCP tool
call at all, with no exception**: it reads `chat_threads` and `entities`
through `shared/db.ts`, and talks to DeepSeek over HTTP. Task 6's `fix_tokens`
fact-check is a plain SELECT against `entities`, not `lookup_entity`, precisely
so this probe can be a strict equality rather than a reconciliation against a
count nobody produces. (An earlier draft offered the MCP route as an option and
then asked this probe to reconcile against a "printed lookup count" that no
task emitted -- three mutually inconsistent statements across one doc.) Any
delta therefore means either something called a tool that should not have, or
the concurrent oracle-web arc touched the twin. Check which before proceeding;
do not relax the probe.

**8. Typecheck and the effective sample.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'import { loadEffectiveSample } from "./eval/sim/sample.ts"; const s=loadEffectiveSample(); const by={}; for(const x of s) by[x.domain]=(by[x.domain]||0)+1; const bad=s.filter(x=>!x.question.trim()||!x.truth.trim()); if(s.length!==500||bad.length||Object.keys(by).length!==24){console.log("FAIL",s.length,bad.length,Object.keys(by).length);process.exit(1);} console.log("EFFECTIVE_SAMPLE_OK"); process.exit(0);'

Expect `APP_TYPECHECK_OK` then `EFFECTIVE_SAMPLE_OK` -- YES/NO. The typecheck
was green before this phase (Phase 1 boundary probe 1), so a red one here is
this phase's regression; the likeliest cause is the import of
`faq-domains-resolve.ts` pulling `scripts/calibration/**` into the tsc program
-- which was verified clean at drafting time (exit 0 under the repo's real
options with `bun-types`), so a failure there means that file changed.

## Outputs to next phase

Phases 4-9 may rely on exactly these:

- **`eval/sim/sample-manifest.json`** -- committed, frozen, never rewritten.
  Carries the 48-entry rank pin, the corpus baseline (total, per-channel
  total/solved, `reconstruction_version` list, `query_log` /
  `embedding_api_log` counts), the pool figures (4,456 / 4,222 / 3,164) with
  their per-domain and per-era breakdowns, the allocation with its method
  string, `order[domain]` for all 3,164 solved ids, and 500 `selected`
  identities each with `thread_id`, `thread_key`, `content_sha256`, `domain`,
  `era`, `channel_name`, `order_index` and the extracted `question`.
- **`eval/sim/sample-keys.json`** -- committed. `truth` + `key_quality` +
  `question_leaks_fix` + `fix_tokens` per thread, the `rejected` and
  `substitutions` lists, the `spot_read` gate block, and the `accounting`
  block (E10: summed usage including `reasoning_tokens` and both cache-token
  fields, plus `cost_usd`).
- **`loadEffectiveSample(): SampleThread[]`** (`eval/sim/sample.ts`) -- the
  ONLY supported way to read the sample. Exactly 500 threads, every one with a
  non-empty `question` and `truth`, per-domain counts equal to the manifest's
  allocation, all `#helpdesk`, eras 2020-2025. It throws rather than degrading
  on any violation, and it needs no database.
- **`verify-manifest.ts`** -- **Phase 6 runs `--live` immediately before the
  bulk run** (E4). What it re-asserts is precisely: the manifest's frozen
  `corpus_baseline` against the live corpus, and for every thread in the
  EFFECTIVE sample (the 500 the arc actually uses, i.e. selected minus rejected
  plus promoted) its presence, `thread_key`, content digest,
  `resolution_status = 'solved'` and `channel_name = '#helpdesk'`. A failure
  there means records taken before and after are not comparable; re-run the
  affected cells, do not reconcile (E4).
- **The key quality that was and was NOT certified (F41).** The `spot_read`
  block certifies the GLOBAL faithful rate within a stated OC curve (a
  systematic 15% `thin` rate still passes ~20% of the time). **Per-domain key
  quality is uncertified at every domain size** -- even the largest domain
  escapes a half-bad key set 15.5% of the time under a 50-key read. Phase 8
  must not cut key quality by domain, and **must report the headline twice,
  over all keys and over `clear` keys only**; that second number is the only
  cheap bound on the `thin` bias, which pushes every cell down and cell A least,
  i.e. directly at the A-vs-C delta.
- **`splitQuestion()`** (`eval/sim/split-question.ts`) -- available if a later
  phase needs a question from a thread outside the sample. Do NOT import
  `faq-gate-retrieve.ts` for this (F4).
- **`frame.ts`'s `deriveRankPin` / `resolveFrameIds` / `allocate`** -- available
  for a targeted follow-up run on a single domain (spec D5's "interesting
  domain, want more data" answer). Such a run is a NEW manifest at a new path,
  never a rewrite of this one.
- **What this phase does NOT ship**, so no later phase plans on it: it writes no
  run records (Phase 2's writer owns that shape and Phase 6 populates it from
  `loadEffectiveSample()`); it defines no grading rubric or verdict logic
  (Phase 4); it makes no answering pass and no MCP tool call; it does not choose
  the pilot slice -- `TBD(phase-5: which manifest threads form the 30-50 pilot
  slice, and whether the slice is domain-stratified)`; and it does not touch
  `sim-explorer.html`, whose stale header tiles (F11) are Phase 5's to
  re-derive from this manifest.

## Open questions

1. **Floor scope: all 24 domains, or D4's literal "tier-1 domains".** Default:
   **all 24, floor 8**. Measured reason (F28): every tier-1 domain's
   proportional quota already exceeds 12, so a tier-1-only floor is byte-for-byte
   identical to no floor at all, and the three domains that actually need
   protection (fonts 7.27, teamplay-comms 6.16, spectating 5.21) are tier-2 and
   tier-3. Cost of the default, measured: **6 threads off 6 domains, 1.2% of the
   sample** (hud, onboard-install, server-admin, performance, display,
   weapon-scripts each lose one). Overrule: operator. Reading the floor
   literally is defensible -- it just means D4's floor clause does nothing and
   the small domains report on 5-7 questions each.
2. **Floor value 8 vs 10.** Default: **8**, the bottom of D4's "~8-10". Both
   options measured against the no-floor allocation, because this is the number
   the choice actually turns on:

   | | floor 8 (default) | floor 10 |
   |---|---|---|
   | threads moved | 6 | **14** |
   | domains that lose a thread | 6 | **11** (hud, onboard-install and server-admin lose **two** each) |
   | domains pinned at the floor | 3 (fonts, teamplay-comms, spectating) | **6** (+ server-browser, audio, binds-scripting) |
   | smallest domain's n | 8 | 10 |

   Floor 10 buys every small domain a round 10 and pulls three more domains up
   to it, at more than double the redistribution and with the cost spread over
   nearly half the table. (An earlier draft of this entry said "12 threads off
   the four largest, pinning three", which was wrong on all three counts.)
   Overrule: operator.
3. **Proportional base: live solved counts, or June cluster sizes.** Default:
   **live solved counts**. D5 predicts "40-65 questions in each large tier-1
   domain" and live counts deliver hud 63 / onboard-install 49; the June sizes
   are the arithmetic F1 already proved wrong by 5%. Overrule: operator, but
   note this would reopen the spec amendment.
4. **Leaky and keyless threads: reject-and-substitute, or trim the question.**
   Default: **reject and substitute, with a looping walk**. Trimming edits a
   player's words to make a measurement come out; substitution costs little here
   (25 rejections measured on the real selection, smallest domain spare 25,
   median 85.5). The looping part is not optional -- 3 of 25 single-shot
   substitutes are themselves reject-class, so a non-looping design deadlocks at
   Task 7. Overrule: operator on the reject-vs-trim choice; the loop is a
   correctness requirement, not a preference.
5. **`key_quality: "weak"` keys: keep or drop.** Default: **keep, flagged**.
   Dropping them biases the sample toward threads with tidy one-line fixes --
   the population where the oracle looks best. Note that the companion
   `clear`-only headline is **no longer part of this option**: it is required of
   Phase 8 regardless, because the gate's OC curve leaves a systematic `thin`
   rate materially possible and that is the only cheap bound on it. Overrule:
   operator, or a Phase 5 pilot finding that the grader is unreliable on weak
   keys.
6. **Era stratification.** Default: **none** -- D4 stratifies on domain alone,
   and the measured sample tracks the pool's era spread within 2.5 points
   everywhere, so stratifying would buy nothing. `era` is carried per record
   (E2) and Phase 8 cuts by it. Overrule: operator; it would be a spec
   amendment (E1).
7. **Spot-read size and threshold.** Default: **50 keys (10%), 34 coverage + 16
   random**, gated at `wrong == 0` and `faithful >= 45/50`. The 34 is 24
   one-per-domain plus a second key for each of the 10 domains with
   `alloc <= 12`, which roughly halves those domains' escape rate (43.6% ->
   18.6% against a half-bad key set) for ten extra reads. The 90% threshold was
   chosen over a tighter 94%: 94% would cut a 15%-thin escape from 20.5% to
   3.8%, but would also BLOCK an acceptable 5% rate 23% of the time, and a false
   BLOCK costs a full 500-key re-run. The residual is handled by Phase 8's
   required `clear`-only companion headline instead. Overrule: operator -- a
   bigger read costs Claude time, not dollars, and the coverage stratum is the
   part that must not shrink.
7b. **Per-domain key certification is declined, not deferred (F41).** Default:
   **declare it uncertified and say so in Phase 8**. Getting a small domain to
   90% detection needs 3 of its 8 keys read at a 50%-bad rate and 4 of 8 at
   25%; across 24 domains that is roughly 250 keys, a second job rather than a
   spot-read. Overrule: operator, if per-domain key quality turns out to matter
   enough to fund the read.
8. **The seed string `oracle-eval-sim-2026-08-06`.** Default as stated,
   recorded in the manifest so the order is reproducible from the file. Any
   change re-draws the whole sample. Overrule: operator, before the freeze
   only.
9. **`truth` lives in a sibling file, not in the manifest.** Default: sibling
   (`sample-keys.json`), so the manifest can be written once and never touched
   again -- which is what makes E4's freeze evidenced rather than asserted.
   Cost: two files and one loader. Overrule: operator.

## Recovery

- **`chat_threads` is not 40,219 at boundary probe 1.** Stop. That is a corpus
  move (E4 / F3): the monthly harvest re-fences the current year and reassigns
  `chat_threads.id`, which is exactly what already ate 234 ids out of this
  frame. Check `.claude/calendar-checks.txt` (the harvest is due 2026-09-06),
  record a finding, and get the operator's call. If the freeze has already
  happened, boundary probe 4 tells you how much of the sample survived; a
  partial survival is NOT repairable by substitution, because the pool
  underneath changed.
- **`freeze-sample.ts` refuses to run.** Working as designed -- the manifest
  exists and E4 says it is written once. Two cases, and they are not the same:
  - **`sample-keys.json` does NOT exist yet.** `--force` is **legitimate**.
    Nothing references the manifest, no key and no record has been taken
    against it, and re-freezing costs one script run. This is the normal path
    when Task 3's own verification probe (or Task 4's checker) finds a defect
    in the first freeze. Do not go build a new path for this.
  - **`sample-keys.json` exists.** Now `--force` is destructive: keys are bound
    to `manifest_sha256`, so a re-freeze orphans every key and any record taken
    since. If you genuinely need a different sample (a spec amendment changed
    N, the floor, or the seed), write it to a NEW path and amend this doc.
- **`verify-manifest.ts` fails the rank-pin diff.** The derived rank -> domain
  assignment moved. Check the tie groups first (F27): sizes 157, 119, 89, 79
  and 51 each straddle a domain boundary, and the 89 tie straddles the NOISE
  boundary, so a reorder there changes the pool size itself. If
  `faq-clusters.json`'s digest also changed, someone edited a read-only asset
  (E12) -- revert it. If the digest is unchanged and the pin still moved, the
  sort's stability assumption broke; record it as a finding and re-freeze from
  the pin rather than from the derivation.
- **A live probe returns fewer than 500 rows.** Read the leading count first --
  every live assertion in this phase carries a non-emptiness floor precisely so
  that a shrunken join cannot pass as a clean run. If the count is 0, the jq
  extraction produced an empty array (check the `.selected[]` path) before
  suspecting the corpus.
- **`invalid input syntax for type bytea` from a digest query.** F31: the cast
  `content::bytea` reinterprets backslash escapes in the text and throws on real
  rows. Use `encode(sha256(convert_to(content,'UTF8')),'hex')`. Verified at
  drafting time that this form agrees with TypeScript's
  `createHash('sha256').update(content,'utf8')` on all 500 dry-run threads,
  500/500.
- **The key pass dies mid-run.** Restart it. `eval/sim/records/key-extraction.jsonl`
  is append-per-thread (E9), so a restart skips completed ids and the loss is
  bounded by one in-flight wave. Do NOT delete the JSONL to "start clean"
  unless the PROMPT changed -- if the prompt changed, deleting it is mandatory,
  because mixing keys from two prompts makes `prompt_sha256` false and the
  spot-read ungeneralisable.
- **The spot-read gate BLOCKS.** That is the gate working. Revise
  `key-prompt.ts`, delete the JSONL, re-run Task 5 over all 500, re-run Task 6
  from step 1. Do not hand-patch the failing keys: hand-patched keys were not
  produced by the pinned prompt, so the 50-key read no longer says anything
  about the other 450. A `wrong` verdict specifically means the extractor
  asserted a fix the thread does not contain -- look for the prompt's "never add
  knowledge from outside the thread" rule being overridden by the model's own
  QuakeWorld knowledge, and tighten it before re-running.
- **`reviewer_agreement` is low while `faithful` is high.** The reviewer wrote
  one fix blind and then rated a different fix `faithful`. That is the
  anchoring failure the two-pass order exists to expose, and it means the
  compare pass is rationalising rather than comparing. Do not take the gate's
  PASS: re-read the disagreeing keys with the blind lines in front of you, and
  bring them to the operator's five.
- **A promoted substitute is itself reject-class.** Expected -- measured at 3
  of 25 on the real selection, with a deepest clean walk of 7 past `alloc`
  (hud). The walk continues; record the candidate in `rejected` with
  `from_walk: true` and keep going. If your implementation stopped instead,
  it took the single-shot design this doc explicitly rejects, and Task 7 will
  deadlock on an empty `truth`.
- **A domain runs out of substitutes.** Cannot happen at today's numbers (the
  smallest spare is spectating's 25 against 2 measured rejections in a domain of
  8), but if it does: the walk down `order[domain]` has exhausted the domain's
  live solved pool, which means the rejection rate in that domain is above 75%.
  That is not a substitution problem, it is a signal that the domain's threads
  are systematically unusable -- record it as a finding, drop the domain's
  allocation to what it can supply (recording `floored: 'pool-exhausted'` and
  acknowledging it), and take the operator's call on whether to redistribute or
  to report the domain at reduced N.
- **Permanent extraction failures.** A thread the client could not answer after
  every retry is recorded as `{thread_id, error}` plus a `rejected` entry with
  `reason: "extraction_failed"`, and is substituted like any other reject. If
  the count is more than a handful (the probe blocks above 25), the cause is the
  client, the quota, or the API -- not the data. Stop, diagnose, and re-run;
  substituting around a systemic client failure would quietly replace a random
  slice of the sample with its successors.
- **Phase 2's DeepSeek client is not ready when Task 5 comes up.** Stop Task 5
  and route a finding. Do not write a second client: two clients means two retry
  postures, two cost stories (E10's dollar total stops being one number), and a
  silent divergence between how keys were extracted and how answers were
  generated. Note specifically that this phase does NOT need a pricing helper --
  it sums the `cost_usd` the client reports per call. If that field is absent,
  that is a finding for Phase 2, not a licence to build a local pricing table.
- **`bun run typecheck` red after Task 2.** The import of
  `faq-domains-resolve.ts` pulled `scripts/calibration/**` into the tsc program
  (the flip side of F13). That file compiled clean under the repo's real options
  at drafting AND revision time (see the exact command in Inputs), so a failure
  means either that file changed -- check `git diff` on it first -- or that the
  out-of-worktree evidence did not transfer. Do not "fix" it in place (E12/E14:
  findings are routed, not fixed in-arc). **Escape hatch:** copy nothing and
  edit nothing; instead have `frame.ts` read `faq-clusters.json` directly with
  `readFileSync` and carry its own local copy of the 48-entry `R` rank -> domain
  map, sourced from the manifest's committed `rank_pin` rather than re-derived.
  That keeps `scripts/calibration/**` out of the tsc program entirely, costs one
  small duplicated constant, and is strictly safer than the import for the
  narrow purpose of a frozen manifest -- the pin is data by then, and E12's "no
  copying" rule is about behaviour, not about a table this doc already prints.
  Record it as a finding either way.
- **Re-deriving a tie-flip consequence and getting a smaller number than F27
  says.** Check the denominator: solved status must be resolved over all
  **5,028** frame ids, not the 4,456 non-NOISE ones. The NOISE-side cluster of
  the 89-tie holds 26 live solved threads that are invisible in a non-NOISE
  dataset, and omitting them understates the swing by roughly 60% (F42). My own
  first re-derivation made exactly this mistake and reported -70 instead of -44.
