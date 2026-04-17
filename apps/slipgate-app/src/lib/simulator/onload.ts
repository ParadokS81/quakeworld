import { expandVars } from "./expander.js";
import { createDefaultPlayerState } from "./defaults.js";

/**
 * One-pass simulation of ezQuake's cl_onload command chain.
 *
 * ezQuake fires cl_onload after the initial config parse completes. Its value
 * is a command sequence -- typically `exec <team>.cfg; clear; <team_alias>` --
 * and that team_alias (a tempalias defined by the team cfg) usually contains
 * `set tpname "{&cXXX$nick:&cfff}"` or similar. The slipgate cfg parser reads
 * `set X Y` statements in file order but does NOT execute alias invocations,
 * so any cvar that only gets its final value via a cl_onload-driven alias
 * call will look stale in the Pretty view (tpname shows "para" instead of
 * `{&cfd2para:&cfff}` etc).
 *
 * This walker fixes that. It reads cl_onload, splits it into top-level
 * statements, and applies each: `set`/`set_tp`/`seta` commands write to the
 * cvar map after expanding `$vars`; alias invocations recurse into the
 * corresponding alias body; `exec` refs are skipped (already merged during
 * parse). Returns the augmented cvar map. Non-mutating on the input.
 *
 * Kept separate from resolver.ts's walkSegment so that evaluateTeamsay's
 * side-effect-skipping semantics stay intact for condition/output evaluation.
 */

const MAX_DEPTH = 8;

const WRITE_COMMANDS = new Set(["set", "set_tp", "seta"]);
const SKIP_COMMANDS = new Set([
  "exec", "clear", "wait", "bind", "unbind", "bindlist", "toggle", "echo",
  "inc", "alias", "tempalias",
]);

export function applyOnloadChain(
  cvars: Map<string, string>,
  aliases: Map<string, string>,
): Map<string, string> {
  const onload = cvars.get("cl_onload");
  if (!onload || onload.trim().length === 0) return cvars;

  const out = new Map(cvars);
  walk(onload, 0, new Set());

  function walk(body: string, depth: number, visited: Set<string>): void {
    if (depth >= MAX_DEPTH) return;
    for (const seg of splitTopLevel(body)) {
      const t = seg.trim();
      if (t.length === 0) continue;
      walkSegment(t, depth, visited);
    }
  }

  function walkSegment(seg: string, depth: number, visited: Set<string>): void {
    const m = seg.match(/^(\S+)\s*(.*)$/);
    if (!m) return;
    const head = m[1];
    const rest = m[2];
    const headLower = head.toLowerCase();

    if (WRITE_COMMANDS.has(headLower)) {
      applySet(rest);
      return;
    }
    if (SKIP_COMMANDS.has(headLower)) return;

    if (aliases.has(head) && !visited.has(head)) {
      const body = aliases.get(head)!;
      visited.add(head);
      walk(body, depth + 1, visited);
      visited.delete(head);
    }
  }

  function applySet(rest: string): void {
    // `set name value` or `set name "value with spaces"`.
    const m = rest.match(/^(\S+)\s*(.*)$/);
    if (!m) return;
    const name = m[1];
    let raw = m[2].trim();
    if (raw.length === 0) { out.set(name, ""); return; }
    // Strip one level of surrounding double quotes -- ezQuake's `set` strips
    // them in the common case.
    if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    // Expand `$vars` in the value using the current out map and a default
    // player state (onload runs pre-game, no real player state exists yet --
    // derivations return empty/zero which matches ezQuake's pre-connect
    // behavior).
    const { text } = expandVars(raw, createDefaultPlayerState(), out);
    out.set(name, text);
  }

  return out;
}

/** Split a command body at top-level `;` separators, respecting quotes and parens. */
function splitTopLevel(body: string): string[] {
  const outArr: string[] = [];
  let buf = "";
  let depth = 0;
  let inQuote: string | null = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuote) {
      buf += c;
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === "'" || c === '"') { inQuote = c; buf += c; continue; }
    if (c === "(") { depth++; buf += c; continue; }
    if (c === ")") { depth--; buf += c; continue; }
    if (c === ";" && depth === 0) { outArr.push(buf); buf = ""; continue; }
    buf += c;
  }
  if (buf.length > 0) outArr.push(buf);
  return outArr;
}
