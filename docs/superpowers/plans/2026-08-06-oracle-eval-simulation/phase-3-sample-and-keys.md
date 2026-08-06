# Phase 3 -- frozen sample manifest + answer keys

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` E1-E14 (this phase
owns E4's freeze and its baseline, and depends on E12's tree rule, E13's
committed-manifest rule, E9's incremental-write rule, E10's cost accounting).
**Spec:** `docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md`
D1, D4, D5, D6 stage 1, plus the 2026-08-06 pool-figure amendment.
**Findings consumed:** F1, F2, F3, F4, F12, F13, F14.
**Findings raised here:** F27-F31 (numbers provisional -- Phases 2 and 4 drafted
in parallel may collide; reconcile at the coherence pass).
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
(D6 stage 1), a Claude spot-read of 40 keys gates the result, and rejected
threads are replaced by walking the manifest's own frozen order -- never by
re-resolving the frame. The phase ends with
`bun eval/sim/verify-manifest.ts --live` green against the twin,
`sample-manifest.json` and `sample-keys.json` committed, a passing spot-read
block inside the keys file, a measured DeepSeek token+dollar total, and
`loadEffectiveSample()` returning exactly 500 records each with a non-empty
`question` and a `truth`.

## Inputs from previous phase

Phase 1 LANDED. These are the claims this phase actually leans on, each
re-probed read-only at drafting time (2026-08-06):

- **`apps/qw-oracle/.env` is a symlink in the worktree and Bun loads it from
  cwd `apps/qw-oracle/` only** (Phase 1 Task 1). Every probe below sources it
  by that path. At drafting time the worktree symlink did not exist yet, so the
  SQL probes were executed with the main checkout's
  `/home/dev/projects/quakeworld/apps/qw-oracle/.env`, which Phase 1 Task 1
  makes byte-identical. `DATABASE_URL` host is
  `qw-oracle-postgres-dev:5432/qw_oracle` -- the twin.
- **Both `bun install`s have run** (root workspace + `serve/mcp`). This phase
  needs only the root one: `postgres` and `ulid` are declared in
  `apps/qw-oracle/package.json`; nothing here imports the MCP SDK, so the
  MAJOR-1 exception (E12 amendment) does not apply and every file this phase
  writes lands under `eval/sim/`.
- **`apps/qw-oracle/tsconfig.json` includes `eval/sim/**/*`** (Phase 1 Task 5),
  so everything below is covered by `bun run typecheck`.
- **`eval/sim/records/` is gitignored** (Phase 1 Task 5). The key pass's
  resumable JSONL lands there; the two committed JSON artifacts sit at
  `eval/sim/*.json`, outside the ignore, so no negation pattern is needed.
- **`eval/sim/telemetry-baseline.json` exists** with pre-run `query_log` /
  `embedding_api_log` / `oracle_meta` / `chat_threads` counts.
- **`RunRecord`'s question-identity fields are already fixed** (Phase 1 Contract
  (b)): `thread_id` (string), `thread_key`, `domain` (a `faq-domains-resolve.ts`
  `META` key), `era` (integer year), `question`, `truth`. This phase produces
  exactly those values; it invents no field (E2).
- **The corpus has not moved.** Live at drafting time: `chat_threads` 40,219;
  `reconstruction_version` `fence-sonnet-v2` for all rows; per channel
  `#antilag` 1,015/410, `#dev-corner` 10,359/3,714, `#helpdesk` 6,772/3,694,
  `#quakeworld` 22,073/5,316 (total/solved).
- **The frame assets are read-only to this arc** (E12, F14) and typecheck
  clean. `faq-domains-resolve.ts` was compiled in isolation under the repo's
  real `compilerOptions` plus `--types bun-types`: **exit 0**. Importing it from
  `eval/sim/` therefore pulls it into the tsc program without turning
  `bun run typecheck` red -- the mirror image of the F18 hazard that constrained
  Phase 1's include pattern, checked rather than assumed. (Without
  `bun-types` the only error is `import.meta.main` at line 157, which is a
  missing-types artifact, not a defect.)

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
    "by_domain": { "<domain>": { "quota": 64.16, "alloc": 63, "floored": false }, ... 24 ... },
    "sum": 500
  },

  "order": { "<domain>": [ "<every solved thread_id in that domain, as a STRING, in frozen sampling order>" ] },

  "selected": [
    {
      "thread_id": "6805",              // string, matching RunRecord.thread_id / ThreadHit convention
      "thread_key": "#helpdesk:fence-sonnet-v2:helpdesk-2020-003:2",
      "content_sha256": "<64 hex>",     // sha256 of chat_threads.content, UTF-8 bytes
      "domain": "visual-projectile",
      "domain_rank_source": [1],        // which frame ranks put it in that domain
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
thread rejected by the key pass is replaced by the next id in the same frozen
list -- a walk down data that is already committed, not a second resolution of
the frame. Size cost of carrying all 3,164 ids: about 25 KB. Cheap insurance
against exactly the thing E4 forbids.

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
`scripts/load-chat/thread-key.ts`. Chunk ids are per-year and small (the 2020
`#helpdesk` chunks hold 1-14 threads each), and `thread_index` is the thread's
position within a chunk as segmented by the fence -- which is an LLM pass, not
a deterministic function of the messages. So a re-fence of a year preserves
`thread_key` only if the model re-segments that chunk identically.

It is unfalsifiable in the one case that matters: the 234 ids the August
re-fence ate are gone, so their old `thread_key`s cannot be compared with the
new 2026 rows at 86063..87037 (522 of them, all carrying
`helpdesk-2026-NNN` chunk ids). `thread_key` is unique across the corpus today
(0 duplicate keys over 40,219 rows), so it is a sound identity for a stable
corpus, and it is strictly better than `id`, which is re-allocated by
construction. It is simply not proof against a re-fence.

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

**No domain fails to meet the floor.** The smallest live pool is spectating at
33 solved against a floor of 8. The algorithm still carries the cap
(`alloc <= solved`) and the manifest still records `floored` per domain,
because "it cannot happen today" is a statement about 2026-08-06 numbers and the
frame decays (F1/F3). If a future re-run finds `solved < floor` for a domain,
that domain is allocated its entire live pool, `floored` is recorded true, the
shortfall is redistributed proportionally over the remaining domains, and the
manifest's `allocation.by_domain` shows it. The probe asserts
`alloc <= solved` for all 24 rather than assuming.

### The algorithm, stated so it can be checked rather than trusted

1. `quota_d = solved_d / sum(solved) * N`.
2. Iterate: any domain whose quota falls **below** the floor is pinned at
   `min(floor, solved_d)`; any whose quota exceeds `solved_d` is pinned at
   `solved_d`. Recompute the remaining budget and the remaining pool over the
   unpinned domains, and repeat until a pass pins nothing.
3. Round the unpinned domains by **largest remainder**: floor every quota, then
   hand the leftover units to the largest fractional parts, breaking ties on
   domain key ascending (so the result does not depend on object key order).
4. Assert `sum(alloc) === N` and `alloc_d <= solved_d` for every domain.

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
points") rather than a change to it, and costs exactly 7 threads: one each off
hud, onboard-install and server-admin, redistributed to the three small
domains. Recorded as Open question 1, overrulable by the operator.

**The headline stays interpretable.** 493 of the 500 are proportional; the 7
floored-in threads are 1.4% of the sample. Phase 8 reports the headline
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
- **Leaky opening.** 89 of 3,164 (2.81%; 21 of the dry-run 500) have an opening
  matching resolution phrasing (`fixed|solved|nvm|nevermind|works now|figured it
  out|found (it|the fix|how)|my bad|sorted`). Some are false positives ("no
  success"), some are real: thread 12533 is `djaevulsk: quick question, what are
  the gfx files for the ammo icons/backgrounds in classic hud?` /
  `"ibar.png", nevermind` -- the question literally contains the answer, and
  every cell would "solve" it by echoing.

The regex is a **screen, not a verdict**. The key-extraction prompt returns a
`question_leaks_fix` boolean judged by the model on the actual text, and the
regex figure above exists only to size the exposure (about 3%, so substitution
volume is roughly 15-30 threads, against a minimum per-domain spare of 25 and a
median of 89).

**Ruling:** the extractor reads the **full `content`**, never just `rest` --
that is what makes the monologue threads legible at all -- and a thread is
REJECTED and substituted when `key_quality === "none"` or
`question_leaks_fix === true`. Trimming the offending lines out of the question
was rejected: it edits the player's words to make a measurement come out, and
the honest alternative (a narrower, stated population) costs nothing here.

The population this defines, and which the findings doc must state: *#helpdesk
threads from the June FAQ frame that are marked solved, still present in the
live corpus, and pose a question whose fix the thread states without the
question itself giving it away.*

## Key extraction (D6 stage 1)

A single-shot JSON-mode DeepSeek call per selected thread. **The client module
is Phase 2's** (`apps/qw-oracle/eval/sim/deepseek-client.ts`); this phase
imports it and defines no HTTP, no retry policy, and no pricing arithmetic of
its own. Capabilities needed from it, named as inert tokens rather than guessed
signatures:

- `TBD(phase-2-client: one-shot JSON-mode completion returning parsed content plus the usage envelope -- prompt_tokens, prompt_cache_hit_tokens, prompt_cache_miss_tokens, completion_tokens, reasoning_tokens)`
- `TBD(phase-2-client: paced-wave concurrency runner with a retry pass and honest failure counts -- the runGently shape fence-external.ts already ports)`
- `TBD(phase-2-client: pricing table plus a cost_usd(usage) helper, E10)`

If Phase 2 lands without one of these, this phase's Task 5 stops and routes a
finding rather than writing a private second client -- two clients means two
pricing tables and two retry postures, and E10's dollar total stops meaning
anything.

**Volume, measured, so the pass is sized rather than guessed:** the 500 selected
threads carry 653,143 characters of `content` (p50 691, p90 3,310, max 15,560),
about 187k input tokens before prompt overhead. The wider pool's max is 54,514
characters and 6 pool threads exceed 16,000, so the prompt truncates `content`
at **16,000 characters** and records `content_truncated: true` -- which
truncates 0 of today's 500 and bounds the tail if a substitution promotes a
monster thread.

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
  "rejected": [ { "thread_id": "12533", "reason": "question_leaks_fix" } ],
  "substitutions": [ { "domain": "hud", "rejected_thread_id": "12533",
                       "promoted_thread_id": "...", "promoted_order_index": 63,
                       "identity": { ...same shape as manifest.selected[]... },
                       "key": { ...same shape as keys[]... } } ],
  "spot_read": { "gate": "PASS"|"BLOCK", "n": 40, "strata": {...}, "verdicts": [...],
                 "faithful": 38, "thin": 2, "wrong": 0, "read_by": "claude",
                 "operator_read": ["<5 thread_ids>"] },
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

**Sample: 40 keys (8%), two strata, both deterministic from the manifest seed.**

- **Coverage stratum, 24** -- one per domain: the first selected thread in that
  domain's frozen `order`. This is the load-bearing half. It is the only thing
  that catches "every server-admin key is garbage because those threads resolve
  into a config file rather than a cvar", which is a per-domain systematic
  failure that a purely random 40 would miss two times in three.
- **Random stratum, 16** -- over the remaining 476, ordered by
  `sha256(seed + ":spot:" + thread_id)`. This half is unbiased, so its pass rate
  is an estimate rather than a tripwire reading.

**Standard, per key**, judged by Claude reading the thread's full `content`
alongside the key:

- `faithful` -- the key names the fix the thread actually landed on.
- `thin` -- the thread states a specific fix and the key is generic about it.
  This is not cosmetic: the grader will mark a correct, specific oracle answer
  as `miss` against a vague key, which biases every cell downward and biases
  cell A least (a generic baseline answer matches a generic key).
- `wrong` -- the key asserts a fix the thread does not state. This inverts
  grades in both directions and is the class that would silently invalidate the
  arc.

**Gate: PASS requires `wrong == 0` AND `faithful >= 36/40` (90%).** Any single
`wrong` blocks. On BLOCK: revise `key-prompt.ts`, re-run the pass over **all
500** (not just the failures -- a prompt change makes old and new keys
incomparable), re-draw the same 40 (the strata are seed-deterministic, so the
re-read is on the same threads plus whatever substitution changed), and
re-gate. Cost of a full re-run is a few hundred thousand tokens, which is why
the expensive-and-correct rule is affordable here.

**Operator reads 5**, per D6's "operator eyeballs a handful": every key Claude
marked `thin` or `wrong`, topped up from the coverage stratum in domain order
to 5. Their disposition lands in `spot_read.operator_read`.

**Stated limitation, so the number is not over-read:** 40 keys cannot certify a
95% faithful rate to within a point. At a true rate of 90% the 40-sample's
95% interval is roughly +/-9 points. The gate is a tripwire for systematic
failure, not a precision estimate, and the coverage stratum is what makes it
one.

`key_quality: "weak"` keys are **kept**, flagged, and reported both ways by
Phase 8 (headline over all keys, and over `clear` keys only). Dropping them
would bias the sample toward threads with tidy one-line fixes, which is exactly
the population where the oracle looks best.

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
5. `allocate(solvedByDomain, N, floor)`: the four-step algorithm above,
   including both assertions (`sum === N`, `alloc_d <= solved_d`) and the
   largest-remainder tie-break on domain key ascending.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'import { deriveRankPin, resolveFrameIds, allocate } from "./eval/sim/frame.ts"; const fail=(m)=>{console.log("FAIL",m);process.exit(1)}; const pin=deriveRankPin(); if(pin.length!==48) fail("rank pin length "+pin.length); const a=pin.find(p=>p.rank===12); if(!a||a.cluster_id!==14||a.size!==134||a.domain!=="weapon-scripts") fail("anchor "+JSON.stringify(a)); const ids=resolveFrameIds(); const flat=Object.values(ids).flat(); if(flat.length!==4456) fail("frame ids "+flat.length); if(new Set(flat).size!==4456) fail("frame ids not unique"); if(Object.keys(ids).length!==24) fail("domains "+Object.keys(ids).length); const solved={hud:406,"onboard-install":314,"server-admin":308,"visual-world":227,performance:175,textures:174,linux:161,"visual-projectile":155,display:137,network:133,demos:106,"weapon-scripts":105,"input-mouse":97,"config-files":80,skins:79,"maps-locs":77,crash:71,"ruleset-legality":68,"server-browser":61,audio:57,"binds-scripting":55,fonts:46,"teamplay-comms":39,spectating:33}; const al=allocate(solved,500,8); const sum=Object.values(al).reduce((x,y)=>x+y,0); if(sum!==500) fail("alloc sum "+sum); for(const k of Object.keys(solved)) if(al[k]>solved[k]) fail("alloc>solved "+k); if(al.hud!==63||al.spectating!==8||al.fonts!==8||al["teamplay-comms"]!==8) fail("alloc drift "+JSON.stringify({hud:al.hud,spectating:al.spectating,fonts:al.fonts,tc:al["teamplay-comms"]})); console.log("FRAME_OK 48 ranks, 4456 ids, alloc 500"); process.exit(0);'

Expect `FRAME_OK 48 ranks, 4456 ids, alloc 500`, exit 0. The hardcoded
`solved` map is the drafting-time measurement, used here so the ALLOCATOR is
tested against a known-answer fixture independently of whatever the live pool
says on the day; Task 3's probe checks it against live counts.

### Task 3 -- Allocation, selection, question extraction, FREEZE · `agent (workhorse, high)`

**Goal:** `sample-manifest.json` exists, is committed, and is never written
again.

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
   passed; the freeze is once-only by construction, not by discipline.
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
6. Commit it. This is one of the two committed artifacts E13 names.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const m = await Bun.file("eval/sim/sample-manifest.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; if(m.selected.length!==500) fail("selected "+m.selected.length); if(new Set(m.selected.map(s=>s.thread_id)).size!==500) fail("duplicate thread_id"); const alloc=Object.fromEntries(Object.entries(m.allocation.by_domain).map(([k,v])=>[k,v.alloc])); if(Object.keys(alloc).length!==24) fail("domains "+Object.keys(alloc).length); if(Object.values(alloc).reduce((a,b)=>a+b,0)!==500) fail("alloc sum"); const seen={}; for(const s of m.selected) seen[s.domain]=(seen[s.domain]||0)+1; for(const d of Object.keys(alloc)) if(seen[d]!==alloc[d]) fail("domain "+d+" has "+seen[d]+" want "+alloc[d]); for(const d of Object.keys(alloc)) { if(alloc[d] > m.pool.by_domain[d].solved) fail("alloc>solved "+d); if(m.order[d].length !== m.pool.by_domain[d].solved) fail("order len "+d); if(m.order[d].slice(0,alloc[d]).join(",") !== m.selected.filter(s=>s.domain===d).map(s=>s.thread_id).join(",")) fail("selected is not the head of order for "+d); } if(Object.values(m.order).flat().length!==3164) fail("order total"); if(m.selected.some(s=>!s.question || !s.question.trim())) fail("empty question"); if(m.selected.some(s=>!/^[0-9a-f]{64}$/.test(s.content_sha256))) fail("bad digest"); if(m.frame.rank_pin.length!==48) fail("rank pin"); console.log("MANIFEST_SHAPE_OK", m.selected.length, "threads /", Object.keys(alloc).length, "domains"); process.exit(0);'

Expect `MANIFEST_SHAPE_OK 500 threads / 24 domains`, exit 0. Note what this
asserts that a weaker probe would not: that `selected` per domain is exactly the
HEAD of `order[domain]`, which is what makes substitution a walk rather than a
new draw.

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
2. `--live` additionally opens `shared/db.ts` and asserts, over the 500
   selected: every `thread_id` is present; `thread_key` matches;
   `encode(sha256(convert_to(content,'UTF8')),'hex')` matches
   `content_sha256`; `resolution_status = 'solved'`; `channel_name =
   '#helpdesk'`; and the corpus baseline (total, per-channel, distinct
   `reconstruction_version`) equals `manifest.corpus_baseline`.
3. **Non-emptiness floor on every live assertion:** the count of rows the join
   returned must equal 500 before any FILTER-based assertion is read. Without
   it, a join that returns nothing makes "all rows are `#helpdesk`" and "all
   digests match" vacuously true, and the probe passes loudest exactly when the
   frame has evaporated. This is the same trap F22 documented on the lexical
   path.
4. `process.exit(failures ? 1 : 0)`, and print the failure list, not just a
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
5. Compact the JSONL into `sample-keys.json` with `manifest_sha256`,
   `prompt_sha256`, `model`, the `keys` map, and the `accounting` block --
   summed usage including `reasoning_tokens` and both cache-token fields, with
   `cost_usd` from
   `TBD(phase-2-client: pricing table plus a cost_usd(usage) helper, E10)`.
   Print the token and dollar totals to stdout. Leave `rejected`,
   `substitutions` and `spot_read` empty; Task 6 fills them.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const m=await Bun.file("eval/sim/sample-manifest.json").json(); const k=await Bun.file("eval/sim/sample-keys.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; const ids=m.selected.map(s=>s.thread_id); const missing=ids.filter(i=>!(i in k.keys)); if(missing.length) fail("no key for "+missing.length+" threads, first "+missing[0]); const V=new Set(["clear","weak","none"]); for(const [id,v] of Object.entries(k.keys)) { if(!V.has(v.key_quality)) fail("bad key_quality "+id+" "+v.key_quality); if(typeof v.question_leaks_fix!=="boolean") fail("bad question_leaks_fix "+id); if(!Array.isArray(v.fix_tokens)) fail("bad fix_tokens "+id); if((v.truth.trim()==="") !== (v.key_quality==="none")) fail("truth/key_quality disagree "+id); } const clear=Object.values(k.keys).filter(v=>v.key_quality==="clear").length; const none=Object.values(k.keys).filter(v=>v.key_quality==="none").length; if(clear < 250) fail("only "+clear+" clear keys of 500 -- extraction is broken, not merely imperfect"); if(k.accounting.calls < 500) fail("accounting.calls "+k.accounting.calls); if(!(k.accounting.cost_usd > 0)) fail("cost_usd not measured"); if(!(k.accounting.reasoning_tokens >= 0)) fail("reasoning tokens missing"); console.log("KEYS_OK 500 keys, clear="+clear+" none="+none+" cost=$"+k.accounting.cost_usd.toFixed(4)); process.exit(0);'

Expect `KEYS_OK 500 keys, clear=<n> none=<n> cost=$<n>`, exit 0. The
`clear >= 250` floor is deliberately a broken-vs-imperfect line, not a quality
bar -- quality is Task 6's job. The `truth`/`key_quality` cross-check is what
stops a model that answers `{"truth":"", "key_quality":"clear"}` from passing.

### Task 6 -- Spot-read gate and substitutions · `agent (session-tier, high)`

**Goal:** the answer sheet is checked before anything is built on it, and every
unusable thread is replaced from the manifest's own frozen order.

**Files:** `eval/sim/sample-keys.json` (modify -- `rejected`, `substitutions`,
`spot_read`).

**Steps:**
1. Draw the 40: the 24 coverage keys (per domain, the selected thread with the
   lowest `order_index`) plus 16 from the remaining 476 ordered by
   `sha256(seed + ":spot:" + thread_id)`. Print the 40 ids so the draw is
   reproducible and auditable.
2. For each, read the thread's full `content` from the twin and judge the key
   `faithful | thin | wrong` with a one-line reason. Where `fix_tokens` names a
   cvar or command, check it exists at dev-head via the L1 tables or an MCP
   `lookup_entity` -- a key naming a cvar that has never existed is `wrong`
   regardless of how plausible the prose reads.
3. Write `spot_read` with the gate outcome. **PASS requires `wrong == 0` and
   `faithful >= 36`.** On BLOCK, stop the phase: revise `key-prompt.ts`, delete
   `eval/sim/records/key-extraction.jsonl`, re-run Task 5 over all 500, and
   re-run this task. Do not patch individual keys by hand -- hand-patched keys
   are not produced by the pinned prompt and make `prompt_sha256` a lie.
4. Surface the 5 operator-read keys in chat (thread id, question, key, Claude's
   verdict) and record their disposition in `spot_read.operator_read`.
5. Substitution: every thread with `key_quality === "none"` or
   `question_leaks_fix === true` goes into `rejected`. For each, walk
   `order[domain]` from `alloc[domain]` upward to the first id not already
   selected and not already promoted, extract its identity + question + key
   (one more DeepSeek call through the same pinned prompt), and append to
   `substitutions`. Assert afterwards that
   `500 - rejected.length + substitutions.length === 500` and that each
   substitution stayed inside its own domain, so the allocation is preserved
   exactly.
6. Append the substitution calls' usage to `accounting`.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e 'const m=await Bun.file("eval/sim/sample-manifest.json").json(); const k=await Bun.file("eval/sim/sample-keys.json").json(); const fail=(x)=>{console.log("FAIL",x);process.exit(1)}; const sr=k.spot_read; if(!sr) fail("no spot_read block"); if(sr.n!==40||sr.verdicts.length!==40) fail("spot_read n="+sr.n+" verdicts="+(sr.verdicts||[]).length); if(sr.wrong!==0) fail("gate: "+sr.wrong+" wrong keys"); if(sr.faithful<36) fail("gate: faithful "+sr.faithful+"/40 < 36"); if(sr.gate!=="PASS") fail("gate "+sr.gate); const domsOfSelected=Object.fromEntries(m.selected.map(s=>[s.thread_id,s.domain])); const rej=new Set(k.rejected.map(r=>r.thread_id)); for(const r of k.rejected) if(!(r.thread_id in domsOfSelected)) fail("rejected id not in manifest "+r.thread_id); if(k.substitutions.length!==k.rejected.length) fail("subs "+k.substitutions.length+" != rejected "+k.rejected.length); for(const s of k.substitutions){ if(domsOfSelected[s.rejected_thread_id]!==s.domain) fail("substitution crossed domains "+s.rejected_thread_id); const ord=m.order[s.domain]; const idx=ord.indexOf(s.promoted_thread_id); if(idx<0) fail("promoted id not in frozen order "+s.promoted_thread_id); if(idx < m.allocation.by_domain[s.domain].alloc) fail("promoted from inside the selected head "+s.promoted_thread_id); if(rej.has(s.promoted_thread_id)) fail("promoted a rejected thread"); if(!s.key || typeof s.key.truth!=="string") fail("promoted thread has no key"); } const covered=new Set(sr.verdicts.map(v=>m.selected.find(s=>s.thread_id===v.thread_id)?.domain)); if(covered.size<24) fail("coverage stratum missed "+(24-covered.size)+" domains"); console.log("GATE_PASS faithful="+sr.faithful+"/40 wrong=0 rejected="+k.rejected.length+" substituted="+k.substitutions.length); process.exit(0);'

Expect `GATE_PASS faithful=<n>/40 wrong=0 rejected=<n> substituted=<n>`,
exit 0. The `idx < alloc` check is the one that matters: it proves a promotion
came from OUTSIDE the originally selected head, i.e. that substitution added a
thread rather than shuffling one.

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

Every probe runs as written from a shell in the worktree. Probes 1, 2, 5, 6 and
7 were executed verbatim at drafting time against the twin (substituting the
main checkout's `.env` path, which Phase 1 Task 1 makes identical) and their
expected values are the observed ones. Probes 3, 4 and 8 exercise code this
phase creates and are stated with their exact expected stdout and exit status.

**1. Corpus has not moved and the frame file is the one that was resolved.**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;"
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && jq -r '.frame.faq_clusters_sha256 + "  scripts/calibration/faq-gate/faq-clusters.json"' eval/sim/sample-manifest.json | sha256sum -c - && echo FRAME_PINNED

Expect `40219`, then `scripts/calibration/faq-gate/faq-clusters.json: OK` and
`FRAME_PINNED` -- YES/NO. The frame digest at drafting time was
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
`pool.by_domain[*].solved` and identical, summing to 500 over 24 domains with
`alloc <= solved` everywhere; every domain's sampling order reproduced from the
recorded `seed`; both frame-file digests matching -- YES/NO.

**4. Every sampled thread is still there, unchanged, solved, and `#helpdesk`.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/verify-manifest.ts --live

Expect every line PASS and exit 0. The same assertion at raw-SQL level, which
is what was actually executed at drafting time over the 500-thread dry-run
sample:

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle
    J=$(jq -c '[.selected[] | {thread_id: (.thread_id|tonumber), thread_key, content_sha256}]' eval/sim/sample-manifest.json)
    psql "$DATABASE_URL" -Atc "WITH m AS (SELECT * FROM json_to_recordset('$J') AS x(thread_id bigint, thread_key text, content_sha256 text)) SELECT count(*)||'/'||count(t.id)||'/'||count(*) FILTER (WHERE t.thread_key=m.thread_key)||'/'||count(*) FILTER (WHERE encode(sha256(convert_to(t.content,'UTF8')),'hex')=m.content_sha256)||'/'||count(*) FILTER (WHERE t.resolution_status='solved' AND t.channel_name='#helpdesk') FROM m LEFT JOIN chat_threads t ON t.id=m.thread_id;"

Expect exactly `500/500/500/500/500` -- YES/NO. Observed
`500/500/500/500/500` at drafting time against the dry-run sample. The first
number is the non-emptiness floor: any other leading value means the jq
extraction or the join produced a different row count and none of the
trailing counts can be read.

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

Expect `TELEMETRY_UNCHANGED` -- YES/NO. Phase 3 issues no MCP tool call: it
reads `chat_threads` through `shared/db.ts` and talks to DeepSeek over HTTP, so
neither telemetry table should move. Task 6's optional `lookup_entity`
fact-check during the spot-read is the one exception; if it was used, the
expected delta is one `query_log` row per lookup and the probe's failure output
must be reconciled against the printed lookup count, not waved through. A
larger unexplained delta means either something called a tool that should not
have, or the concurrent oracle-web arc touched the twin -- check before
proceeding.

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
  `corpus_baseline` against the live corpus, and per selected thread its
  presence, `thread_key`, content digest, `resolution_status = 'solved'` and
  `channel_name = '#helpdesk'`. A failure there means records taken before and
  after are not comparable; re-run the affected cells, do not reconcile (E4).
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
   tier-3. Cost of the default: 7 threads moved, 1.4% of the sample. Overrule:
   operator. Reading the floor literally is defensible -- it just means D4's
   floor clause does nothing and the small domains report on 5-7 questions.
2. **Floor value 8 vs 10.** Default: **8**, the bottom of D4's "~8-10", because
   it is the value that redistributes least (7 threads vs 12 for floor 10) while
   still binding on all three small domains. Floor 10 gives every small domain a
   round 10 at the cost of one more thread off each of the four largest.
   Overrule: operator.
3. **Proportional base: live solved counts, or June cluster sizes.** Default:
   **live solved counts**. D5 predicts "40-65 questions in each large tier-1
   domain" and live counts deliver hud 63 / onboard-install 49; the June sizes
   are the arithmetic F1 already proved wrong by 5%. Overrule: operator, but
   note this would reopen the spec amendment.
4. **Leaky and keyless threads: reject-and-substitute, or trim the question.**
   Default: **reject and substitute**, and state the narrowed population in the
   manifest and the findings doc. Trimming edits a player's words to make a
   measurement come out; substitution costs nothing here (the smallest domain
   has 25 spare threads against an expected ~3% rejection rate). Overrule:
   operator.
5. **`key_quality: "weak"` keys: keep or drop.** Default: **keep, flagged**,
   with Phase 8 reporting the headline over all keys and over `clear` keys
   only. Dropping them biases the sample toward threads with tidy one-line
   fixes -- the population where the oracle looks best. Overrule: operator, or a
   Phase 5 pilot finding that the grader is unreliable on weak keys.
6. **Era stratification.** Default: **none** -- D4 stratifies on domain alone,
   and the measured sample tracks the pool's era spread within 2.5 points
   everywhere, so stratifying would buy nothing. `era` is carried per record
   (E2) and Phase 8 cuts by it. Overrule: operator; it would be a spec
   amendment (E1).
7. **Spot-read size, 40.** Default: **40 (8%), 24 coverage + 16 random**, gated
   at `wrong == 0` and `faithful >= 36`. It is a tripwire for systematic
   failure, not a precision estimate (+/-9 points at a true rate of 90%).
   Overrule: operator -- a bigger read costs Claude time, not dollars, and the
   coverage stratum is the part that must not shrink.
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
  exists and E4 says it is written once. If you genuinely need a new sample
  (a spec amendment changed N, the floor, or the seed), write it to a NEW path
  and amend this doc; do not `--force` over the committed one, because every
  record already taken references it by digest.
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
  `key-prompt.ts`, delete the JSONL, re-run Task 5 over all 500, re-run Task 6.
  Do not hand-patch the failing keys: hand-patched keys were not produced by the
  pinned prompt, so the 40-key read no longer says anything about the other 460.
  A `wrong` verdict specifically means the extractor asserted a fix the thread
  does not contain -- look for the prompt's "never add knowledge from outside
  the thread" rule being overridden by the model's own QuakeWorld knowledge, and
  tighten it before re-running.
- **A domain runs out of substitutes.** Cannot happen at today's numbers (the
  smallest spare is spectating's 25 against an expected 0-1 rejections in a
  domain of 8), but if it does: the walk down `order[domain]` has exhausted the
  domain's live solved pool, which means the rejection rate in that domain is
  above 75%. That is not a substitution problem, it is a signal that the
  domain's threads are systematically unusable -- record it as a finding, drop
  the domain's allocation to what it can supply, and take the operator's call on
  whether to redistribute or to report the domain at reduced N.
- **Phase 2's DeepSeek client is not ready when Task 5 comes up.** Stop Task 5
  and route a finding. Do not write a second client: two clients means two
  pricing tables (E10's dollar total stops being one number), two retry
  postures, and a silent divergence between how keys were extracted and how
  answers were generated.
- **`bun run typecheck` red after Task 2.** The import of
  `faq-domains-resolve.ts` pulled `scripts/calibration/**` into the tsc program
  (the flip side of F13). That file compiled clean at drafting time under the
  repo's real options, so a failure means it changed -- check `git diff` on it
  before touching anything else. Do not "fix" it in place (E12/E14: findings are
  routed, not fixed in-arc); if it genuinely needs a fix, that is a finding for
  HANDOVER and this phase reads the frame through a local shim instead.
