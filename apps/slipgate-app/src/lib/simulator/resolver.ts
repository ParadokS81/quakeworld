import type { PlayerState, Issue, TraceStep, EvaluateTeamsayResult } from "./types.js";
import { expandVars } from "./expander.js";
import { evaluateExpression } from "./evaluator.js";

export interface RuntimeResolution {
  display: string;
  tooltip: string;
  origin: "runtime";
  active?: boolean;
}

export interface RuntimeResolver {
  resolve(token: string): RuntimeResolution | null;
}

const SHORT_FORM_ALIASES: Record<string, string> = {
  a: "armor", h: "health", l: "location",
  w: "weapon", b: "bestweapon",
  c: "cells", r: "rockets", n: "nails", s: "shells",
  p: "powerups", d: "deathloc", t: "took",
  x: "ammo", y: "weaponnum",
  u: "need",
};

const TOKEN_DESCRIPTIONS: Record<string, string> = {
  health: "player health",
  armor: "player armor value",
  armortype: "armor type letter (g/y/r/none)",
  colored_armor: "armor value with health-band color codes",
  weapon: "currently selected weapon (tp_name_*)",
  weapons: "space-joined list of owned weapons",
  bestweapon: "highest-priority owned weapon with ammo",
  weaponnum: "impulse number of current weapon",
  ammo: "ammo count for current weapon",
  bestammo: "ammo count for bestweapon",
  cells: "cells count",
  rockets: "rockets count",
  nails: "nails count",
  shells: "shells count",
  powerups: "space-joined active powerups",
  location: "player location",
  mapname: "current map",
  lastloc: "last location visited",
  deathloc: "location of last death",
  matchname: "match name",
  matchstatus: "match status",
  matchtype: "match type",
  ledpoint: "LED point color",
  ledstatus: "LED status color",
  point: "pointed-at player name",
  pointloc: "location of pointed-at player",
  pointatloc: "at-location form",
  took: "last item taken",
  tookloc: "where item was taken",
  tookatloc: "at-location form for took",
  droploc: "last backpack drop location",
  droptime: "seconds since last drop",
  lastpowerup: "last powerup taken",
  need: "current item the player needs (ezQuake teamplay need state; resolves against $need cvar)",
};

export function createSimulatorResolver(
  state: PlayerState,
  cvars: Map<string, string>,
): RuntimeResolver {
  return {
    resolve(token: string): RuntimeResolution | null {
      const canonical = SHORT_FORM_ALIASES[token] ?? token;
      const desc = TOKEN_DESCRIPTIONS[canonical];
      if (!desc) return null;
      const { text } = expandVars(`$${canonical}`, state, cvars);
      if (text === `$${canonical}`) return null;
      return {
        display: text,
        tooltip: `${canonical}: ${desc}`,
        origin: "runtime",
      };
    },
  };
}

const MAX_WALK_DEPTH = 8;

const SIDE_EFFECT_COMMANDS = new Set([
  "set", "set_tp", "seta", "set_calc", "inc", "wait",
  "alias", "tempalias", "bind", "unbind", "bindlist", "toggle", "echo",
]);

const OUTPUT_COMMANDS = new Set([
  "say", "say_team", "say_me",
  "tp_msg_report", "tp_msg_coming", "tp_msg_lost",
  "tp_msg_enemy_pwr", "tp_msg_need", "tp_msg_point",
]);

export interface ConditionResult {
  result: boolean;
  issues: Issue[];
}

export function evaluateCondition(
  expr: string,
  state: PlayerState,
  cvars: Map<string, string>,
  positionalArgs: string[] = [],
): ConditionResult {
  const expanded = expandVars(expr, state, cvars, positionalArgs);
  const er = evaluateExpression(expanded.text);
  return { result: er.result, issues: [...expanded.issues, ...er.issues] };
}

export function evaluateTeamsay(
  rawText: string,
  state: PlayerState,
  cvars: Map<string, string>,
  aliases: Map<string, string>,
  positionalArgs: string[] = [],
): EvaluateTeamsayResult {
  const trace: TraceStep[] = [];
  const issues: Issue[] = [];
  const outputParts: string[] = [];

  walk(rawText, 0, positionalArgs);

  return { output: outputParts.join(" ").trim(), trace, issues };

  function walk(body: string, depth: number, args: string[]): void {
    if (depth >= MAX_WALK_DEPTH) {
      const issue: Issue = {
        kind: "depth-cap-reached",
        detail: `walker depth cap (${MAX_WALK_DEPTH})`,
      };
      issues.push(issue);
      trace.push({ kind: "leaf", text: body, issues: [issue] });
      return;
    }
    for (const seg of splitTopLevel(body)) {
      const t = seg.trim();
      if (t.length === 0) continue;
      walkSegment(t, depth, args);
    }
  }

  function walkSegment(seg: string, depth: number, args: string[]): void {
    const ifm = seg.match(/^\s*if\b\s*(.*)$/i);
    if (ifm) { walkIf(ifm[1], depth, args); return; }

    const m = seg.match(/^(\S+)\s*(.*)$/);
    if (!m) return;
    const head = m[1];
    const rest = m[2];
    const headLower = head.toLowerCase();

    if (OUTPUT_COMMANDS.has(headLower)) {
      const expanded = expandVars(rest, state, cvars, args);
      issues.push(...expanded.issues);
      outputParts.push(expanded.text);
      trace.push({ kind: "leaf", text: seg, detail: expanded.text });
      return;
    }

    if (SIDE_EFFECT_COMMANDS.has(headLower)) {
      trace.push({
        kind: "skip-side-effect",
        text: seg,
        detail: `${headLower} not simulated`,
      });
      return;
    }

    if (aliases.has(head)) {
      const body = aliases.get(head)!;
      trace.push({ kind: "alias-follow", text: head, detail: body });
      const subArgs = rest.length > 0 ? rest.split(/\s+/) : [];
      walk(body, depth + 1, subArgs);
      return;
    }

    const issue: Issue = {
      kind: "missing-alias",
      detail: `reference "${head}" not defined`,
    };
    issues.push(issue);
    trace.push({ kind: "alias-follow", text: head, issues: [issue] });
  }

  function walkIf(rest: string, depth: number, args: string[]): void {
    const { condition, thenBody, elseBody } = splitIfThenElse(rest);
    if (condition === null) {
      const issue: Issue = {
        kind: "malformed-condition",
        detail: `if missing "then": ${rest}`,
      };
      issues.push(issue);
      trace.push({ kind: "condition", text: rest, issues: [issue] });
      return;
    }
    const cr = evaluateCondition(condition, state, cvars, args);
    issues.push(...cr.issues);
    const activeBranch: "then" | "else" = cr.result ? "then" : "else";
    trace.push({
      kind: "condition",
      text: condition,
      result: cr.result,
      activeBranch,
      issues: cr.issues.length > 0 ? cr.issues : undefined,
    });
    const chosen = cr.result ? thenBody : elseBody;
    if (chosen.trim().length === 0) return;
    walkSegment(chosen.trim(), depth + 1, args);
  }
}

function splitIfThenElse(rest: string): {
  condition: string | null;
  thenBody: string;
  elseBody: string;
} {
  const thenIdx = findKeyword(rest, "then");
  if (thenIdx < 0) return { condition: null, thenBody: "", elseBody: "" };
  const condition = rest.slice(0, thenIdx).trim();
  const after = rest.slice(thenIdx + 4);
  const elseIdx = findKeyword(after, "else");
  if (elseIdx < 0) {
    return { condition, thenBody: after.trim(), elseBody: "" };
  }
  return {
    condition,
    thenBody: after.slice(0, elseIdx).trim(),
    elseBody: after.slice(elseIdx + 4).trim(),
  };
}

function findKeyword(text: string, keyword: string): number {
  let depth = 0;
  let inQuote: string | null = null;
  for (let i = 0; i <= text.length - keyword.length; i++) {
    const c = text[i];
    if (inQuote) { if (c === inQuote) inQuote = null; continue; }
    if (c === "'" || c === '"') { inQuote = c; continue; }
    if (c === "(") { depth++; continue; }
    if (c === ")") { depth--; continue; }
    if (depth > 0) continue;
    if (text.substring(i, i + keyword.length) === keyword) {
      const prev = i > 0 ? text[i - 1] : " ";
      const next = i + keyword.length < text.length ? text[i + keyword.length] : " ";
      if (!/\w/.test(prev) && !/\w/.test(next)) return i;
    }
  }
  return -1;
}

function splitTopLevel(body: string): string[] {
  const out: string[] = [];
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
    if (c === ";" && depth === 0) { out.push(buf); buf = ""; continue; }
    buf += c;
  }
  if (buf.length > 0) out.push(buf);
  return out;
}
