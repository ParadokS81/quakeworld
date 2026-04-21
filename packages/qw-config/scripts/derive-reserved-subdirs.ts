#!/usr/bin/env tsx
/**
 * Path 2 derivation: scan a loader-sites AST JSON, emit the list of reserved
 * subdirs. A "reserved subdir" is any path prefix shaped
 *   <parent>/<literal-segment>/<remainder>
 * where both <parent> and <literal-segment> are pure literals (no % conversion).
 * Single-segment templates like "maps/%s.bsp" or "env/%s_ft.tga" are NOT
 * reserved subdirs - they are per-key namespaces, not engine-reserved prefixes.
 */

import { readFileSync, writeFileSync } from "fs";
import { parseArgs } from "util";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export interface InputLoaderSite {
  canonical_id: string;
  path_source: string;
  path_literal: string | null;
  path_template?: string | null;
}

export interface ReservedSubdir {
  canonical_id: string;
  parent_dir: string;
  subdir_name: string;
  loader_site_refs: string[];
}

function firstTwoSegments(path: string): [string, string] | null {
  if (!path) return null;
  const parts = path.split("/");
  if (parts.length < 3) return null;
  const p0 = parts[0];
  const p1 = parts[1];
  if (!p0 || !p1) return null;
  if (p0.includes("%") || p1.includes("%")) return null;
  return [p0, p1];
}

export function deriveReservedSubdirs(sites: InputLoaderSite[]): ReservedSubdir[] {
  const byKey = new Map<string, { parent: string; sub: string; refs: Set<string> }>();
  for (const s of sites) {
    const candidates: string[] = [];
    if (s.path_template) candidates.push(s.path_template);
    if (s.path_literal) candidates.push(s.path_literal);
    for (const p of candidates) {
      const seg = firstTwoSegments(p);
      if (!seg) continue;
      const [parent, sub] = seg;
      const key = `${parent}/${sub}`;
      const rec = byKey.get(key) ?? { parent, sub, refs: new Set<string>() };
      rec.refs.add(s.canonical_id);
      byKey.set(key, rec);
    }
  }
  const out: ReservedSubdir[] = [];
  for (const [, rec] of byKey) {
    out.push({
      canonical_id: `ezquake:reserved_subdir:${rec.parent}_${rec.sub}`,
      parent_dir: rec.parent,
      subdir_name: rec.sub,
      loader_site_refs: [...rec.refs].sort(),
    });
  }
  out.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  return out;
}

async function main(): Promise<void> {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = resolve(HERE, "../../..");
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      input:  { type: "string" },
      output: { type: "string" },
    },
  });
  const input  = values.input  ?? resolve(REPO_ROOT, "packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json");
  const output = values.output ?? resolve(REPO_ROOT, "packages/qw-config/src/data/ezquake-reserved-subdirs.json");

  const raw = JSON.parse(readFileSync(input, "utf-8")) as { loader_sites: InputLoaderSite[] };
  const derived = deriveReservedSubdirs(raw.loader_sites);

  writeFileSync(output, JSON.stringify({ reserved_subdirs: derived }, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${derived.length} reserved_subdirs to ${output}`);
}

const invokedAsScript = (() => {
  try { return fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? ""); } catch { return false; }
})();
if (invokedAsScript) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
