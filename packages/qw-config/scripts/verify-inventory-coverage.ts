#!/usr/bin/env tsx
/**
 * Replay the asset bundle's extension + path_hint rules against a real
 * slipgate inventory dump. Prints a coverage summary and exits 1 if the
 * residual "other" bucket exceeds the configured threshold.
 *
 * Usage:
 *   npx tsx packages/qw-config/scripts/verify-inventory-coverage.ts \
 *     --inventory /mnt/c/Games/QuakeWorld/QuakeWorld/quake-dir-inventory.md \
 *     --bundle packages/qw-config/src/data/ezquake-asset-bundle.json \
 *     --max-other 400
 *
 * Inventory format: slipgate's `quake-dir-inventory.md` is a markdown report
 * with (a) a per-extension summary table giving exact totals across the whole
 * install and (b) per-extension "Samples" sections listing 5 representative
 * paths. This script handles both shapes, plus a fenced-code-block fallback
 * for future inventory variants that dump paths verbatim.
 *
 * Classification: for extensions without a path_hint the full extension total
 * is attributed to the mapped category. For extensions whose bundle rules
 * include path_hints (currently .png/.jpg/.tga/.pcx for textures/skins/gfx/
 * crosshairs/env), the script uses the sample paths to estimate the category
 * distribution and scales that distribution across the extension's real total.
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    inventory: { type: "string" },
    bundle: { type: "string" },
    "max-other": { type: "string", default: "400" },
  },
});

if (!values.inventory) throw new Error("--inventory required");
if (!values.bundle) throw new Error("--bundle required");

// ── Bundle: build the extension -> rules lookup ─────────────────────────────

type ExtRule = { path_hint: string | null; category_id: string };

const bundle = JSON.parse(readFileSync(values.bundle, "utf-8"));
const extRules = new Map<string, ExtRule[]>();
for (const e of bundle.asset_extensions as Array<{
  extension: string;
  path_hint: string | null;
  category_id: string;
}>) {
  const arr = extRules.get(e.extension) ?? [];
  arr.push({ path_hint: e.path_hint ?? null, category_id: e.category_id });
  extRules.set(e.extension, arr);
}

function extOf(p: string): string | null {
  // Strip archive prefix (id1/pak0.pak::gfx.wad -> gfx.wad) for extension
  // lookup. path_hint matching uses the pre-strip path so archive-internal
  // paths like "ezquake/ezquake.pk3::gfx/cursor.lmp" still see "gfx/".
  const afterArc = p.includes("::") ? p.split("::").pop()! : p;
  const i = afterArc.lastIndexOf(".");
  if (i < 0) return null;
  return afterArc.slice(i);
}

function classify(path: string): string {
  const ext = extOf(path);
  if (!ext) return "other";
  const rules = extRules.get(ext);
  if (!rules) return "other";
  // Path_hint matching: match against any path component, not just the prefix.
  // A path like "ezquake/ezquake.pk3::gfx/cursor.lmp" should match hint "gfx/".
  const normalized = path.includes("::") ? path.split("::").pop()! : path;
  let best: ExtRule | null = null;
  for (const r of rules) {
    if (!r.path_hint) continue;
    const hint = r.path_hint.toLowerCase();
    if (normalized.includes(hint)) {
      const bestLen = best?.path_hint?.length ?? 0;
      if (hint.length > bestLen) best = r;
    }
  }
  if (best) return best.category_id;
  const unq = rules.find((r) => r.path_hint === null);
  return unq ? unq.category_id : "other";
}

// ── Inventory parsing ────────────────────────────────────────────────────────

type ExtSummary = { count: number; samples: string[] };

function parseInventory(md: string): {
  byExt: Map<string, ExtSummary>;
  fencedPaths: string[];
  unknownExtCount: number;
} {
  const byExt = new Map<string, ExtSummary>();
  const fencedPaths: string[] = [];

  // Extract total count for every extension from the summary table rows:
  //   | `.png` | 3464 | 8.67 GB | ... |
  //   | `(no-ext)` | 6 | ... |
  const tableRe = /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/;
  let currentExt: string | null = null;

  for (const line of md.split("\n")) {
    // Summary table rows.
    const tm = line.match(tableRe);
    if (tm) {
      const rawExt = tm[1];
      const count = Number(tm[2]);
      const ext = rawExt === "(no-ext)" ? "" : rawExt.toLowerCase();
      // Only accept rows that look like an extension (starts with "." or the
      // no-extension marker). Skips archive / match-group tables.
      if (ext === "" || ext.startsWith(".")) {
        // First occurrence wins: the "Files by extension (all)" table runs
        // first and covers every extension once. Later "Classified extensions
        // — detail" sections repeat counts but we only want the first total.
        if (!byExt.has(ext)) {
          byExt.set(ext, { count, samples: [] });
        }
      }
      continue;
    }

    // Sample-path detection inside per-extension sections:
    //   ### `.png` — 3464 files, 8.67 GB
    //   ...
    //   - Samples:
    //     - `qw/dm3_000.png`
    const header = line.match(/^###\s+`([^`]+)`/);
    if (header) {
      const rawExt = header[1];
      currentExt = rawExt === "(no-ext)" ? "" : rawExt.toLowerCase();
      continue;
    }
    if (currentExt !== null) {
      const sample = line.match(/^\s*-\s*`([^`]+)`\s*$/);
      if (sample) {
        const entry = byExt.get(currentExt);
        if (entry) entry.samples.push(sample[1].toLowerCase());
      }
    }
  }

  // Second pass: collect paths from any fenced code blocks (forward-compatible
  // with inventory variants that embed the full file list).
  let inFence = false;
  for (const line of md.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) continue;
    const m = line.match(/^\s*(\S+\/\S+?)(?:\s|$)/);
    if (m) fencedPaths.push(m[1].toLowerCase());
  }

  // Count rows whose extension isn't in the bundle at all — reported as
  // context but always classified "other".
  let unknownExtCount = 0;
  for (const [ext, sum] of byExt) {
    if (ext === "") {
      unknownExtCount += sum.count;
      continue;
    }
    if (!extRules.has(ext)) unknownExtCount += sum.count;
  }

  return { byExt, fencedPaths, unknownExtCount };
}

// ── Classification ───────────────────────────────────────────────────────────

function classifyInventory(byExt: Map<string, ExtSummary>, fencedPaths: string[]) {
  const counts = new Map<string, number>();
  const bump = (cat: string, n: number) =>
    counts.set(cat, (counts.get(cat) ?? 0) + n);

  const unclassifiedExts: Array<[string, number]> = [];

  for (const [ext, sum] of byExt) {
    if (ext === "") {
      // No-extension files always fall through to "other".
      bump("other", sum.count);
      unclassifiedExts.push(["(no-ext)", sum.count]);
      continue;
    }
    const rules = extRules.get(ext);
    if (!rules) {
      bump("other", sum.count);
      unclassifiedExts.push([ext, sum.count]);
      continue;
    }
    const hasHints = rules.some((r) => r.path_hint);
    if (!hasHints) {
      // Simple case: whole extension maps to one category.
      bump(rules[0].category_id, sum.count);
      continue;
    }
    // Hinted case: use sample paths to build a distribution, then scale
    // across the extension's real total.
    if (sum.samples.length === 0) {
      // No samples -> fall back to the unqualified rule if any, else "other".
      const unq = rules.find((r) => r.path_hint === null);
      bump(unq ? unq.category_id : "other", sum.count);
      if (!unq) unclassifiedExts.push([ext, sum.count]);
      continue;
    }
    const sampleDist = new Map<string, number>();
    for (const p of sum.samples) {
      const cat = classify(p);
      sampleDist.set(cat, (sampleDist.get(cat) ?? 0) + 1);
    }
    // Scale each sampled category proportionally to sum.count.
    const sampleTotal = sum.samples.length;
    let attributed = 0;
    const entries = [...sampleDist.entries()];
    for (let i = 0; i < entries.length; i++) {
      const [cat, n] = entries[i];
      const share =
        i === entries.length - 1
          ? sum.count - attributed // absorb rounding remainder
          : Math.round((n / sampleTotal) * sum.count);
      bump(cat, share);
      attributed += share;
    }
  }

  // Include any paths parsed out of fenced code blocks (forward compat).
  for (const p of fencedPaths) bump(classify(p), 1);

  return { counts, unclassifiedExts };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const inv = readFileSync(values.inventory, "utf-8");
const { byExt, fencedPaths, unknownExtCount } = parseInventory(inv);
const { counts, unclassifiedExts } = classifyInventory(byExt, fencedPaths);

let total = 0;
for (const n of counts.values()) total += n;
// Fenced-block paths are counted directly; everything else comes via the
// extension summary so `total` reflects the whole-inventory count.

console.log(`Total files: ${total}`);
console.log(`Extensions listed in inventory: ${byExt.size}`);
console.log(`Unknown-to-bundle extensions (count): ${unknownExtCount}`);
console.log("");
console.log("By category:");

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
for (const [cat, n] of sorted) {
  console.log(`  ${cat.padEnd(40)} ${n}`);
}

if (unclassifiedExts.length > 0) {
  console.log("");
  console.log("Unclassified extensions (feed into 'other'):");
  const byCount = [...unclassifiedExts].sort((a, b) => b[1] - a[1]);
  for (const [ext, n] of byCount) {
    console.log(`  ${ext.padEnd(12)} ${n}`);
  }
}

const maxOther = Number(values["max-other"]);
const otherCount = counts.get("other") ?? 0;
console.log("");
if (otherCount > maxOther) {
  console.error(`FAIL: 'other' bucket = ${otherCount} exceeds max ${maxOther}`);
  process.exit(1);
}
console.log(`OK: 'other' bucket = ${otherCount} within max ${maxOther}`);
