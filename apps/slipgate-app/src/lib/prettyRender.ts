import type { PlayerState, Issue } from "./simulator/index.js";
import { expandVars } from "./simulator/index.js";
import type { RuntimeResolver } from "./runtimeResolver.js";
import { expandDollarCode, qwByteToChar, qwByteColor } from "./charCodeTable.js";

export type SpanColor =
  | { kind: "qw"; class: "qw-w" | "qw-g" | "qw-b" }
  | { kind: "hex"; value: string }
  | { kind: "default" };

export type SpanOrigin =
  | "literal"
  | "variable"
  | "runtime"
  | "charcode"
  | "unresolved";

export interface PrettySpan {
  text: string;
  color: SpanColor;
  origin: SpanOrigin;
  rawToken?: string;
  tooltip?: string;
  branchInactive?: boolean;
}

export interface BuildContext {
  state: PlayerState;
  cvars: Map<string, string>;
  resolver: RuntimeResolver | null;
  /** Map condition-expression text -> active branch for dimming. Tier 3. */
  activeBranches?: Map<string, "then" | "else">;
}

export interface BuildResult {
  spans: PrettySpan[];
  issues: Issue[];
}

interface Frame {
  defaultColor: SpanColor;
  current: SpanColor;
}

function expandHex12(hex: string): string {
  return "#" + hex.split("").map((c) => c + c).join("");
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

interface IfSplit {
  before: string;
  cond: string;
  thenBody: string;
  elseBody: string;
}

function splitTopLevelIf(input: string): IfSplit | null {
  const ifIdx = findKeyword(input, "if");
  if (ifIdx < 0) return null;
  const before = input.slice(0, ifIdx);
  const afterIf = input.slice(ifIdx + 2);
  const thenIdx = findKeyword(afterIf, "then");
  if (thenIdx < 0) return null;
  const cond = afterIf.slice(0, thenIdx).trim();
  const afterThen = afterIf.slice(thenIdx + 4);
  const elseIdx = findKeyword(afterThen, "else");
  if (elseIdx < 0) {
    return { before, cond, thenBody: afterThen.trim(), elseBody: "" };
  }
  const thenBody = afterThen.slice(0, elseIdx).trim();
  const elseBody = afterThen.slice(elseIdx + 4).trim();
  return { before, cond, thenBody, elseBody };
}

function literalSpan(text: string, stack: Frame[]): PrettySpan {
  const top = stack[stack.length - 1];
  return { text, color: top.current, origin: "literal" };
}

export function buildSpanTree(input: string, ctx: BuildContext): BuildResult {
  if (input.length === 0) return { spans: [], issues: [] };
  const issues: Issue[] = [];
  const stack: Frame[] = [{
    defaultColor: { kind: "default" },
    current: { kind: "default" },
  }];
  const split = splitTopLevelIf(input);
  if (split) {
    const spans: PrettySpan[] = [];
    spans.push(...runParser(split.before, stack, ctx, issues));
    spans.push(literalSpan("if ", stack));
    spans.push(...runParser(split.cond, stack, ctx, issues));
    spans.push(literalSpan(" then ", stack));
    const active = ctx.activeBranches?.get(split.cond.trim());
    const thenSpans = runParser(split.thenBody, stack, ctx, issues);
    if (active === "else") thenSpans.forEach((s) => { s.branchInactive = true; });
    spans.push(...thenSpans);
    if (split.elseBody) {
      spans.push(literalSpan(" else ", stack));
      const elseSpans = runParser(split.elseBody, stack, ctx, issues);
      if (active === "then") elseSpans.forEach((s) => { s.branchInactive = true; });
      spans.push(...elseSpans);
    }
    return { spans, issues };
  }
  const spans = runParser(input, stack, ctx, issues);
  return { spans, issues };
}

function runParser(
  input: string,
  stack: Frame[],
  ctx: BuildContext,
  issues: Issue[],
  originOverride?: SpanOrigin,
  rawTokenOverride?: string,
): PrettySpan[] {
  const out: PrettySpan[] = [];
  let buf = "";

  function flush() {
    if (buf.length === 0) return;
    const top = stack[stack.length - 1];
    out.push({
      text: buf,
      color: top.current,
      origin: originOverride ?? "literal",
      ...(rawTokenOverride ? { rawToken: rawTokenOverride, tooltip: rawTokenOverride } : {}),
    });
    buf = "";
  }

  let i = 0;
  while (i < input.length) {
    const c = input[i];

    if (c === "{") {
      flush();
      stack.push({
        defaultColor: { kind: "qw", class: "qw-w" },
        current: { kind: "qw", class: "qw-w" },
      });
      i++;
      continue;
    }
    if (c === "}") {
      flush();
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }
    if (c === "&" && i + 1 < input.length) {
      const next = input[i + 1];
      if (next === "r") {
        flush();
        stack[stack.length - 1].current = stack[stack.length - 1].defaultColor;
        i += 2;
        continue;
      }
      if (next === "c" && i + 4 < input.length) {
        const hex = input.slice(i + 2, i + 5);
        if (/^[0-9a-fA-F]{3}$/.test(hex)) {
          flush();
          stack[stack.length - 1].current = { kind: "hex", value: expandHex12(hex.toLowerCase()) };
          i += 5;
          continue;
        }
      }
    }
    if (c === "$" && i + 1 < input.length) {
      const next = input[i + 1];
      if (/\w/.test(next)) {
        const m = input.slice(i).match(/^\$(\w+)/);
        if (m) {
          flush();
          const name = m[1];
          const raw = "$" + name;
          const { text, issues: exIssues } = expandVars(raw, ctx.state, ctx.cvars);
          issues.push(...exIssues);
          if (text === raw) {
            const top = stack[stack.length - 1];
            out.push({
              text: raw, color: top.current, origin: "unresolved", rawToken: raw,
              tooltip: `${raw} - not found in this config or state`,
            });
          } else {
            out.push(...runParser(text, stack, ctx, issues, "variable", raw));
          }
          i += raw.length;
          continue;
        }
      } else {
        const byte = expandDollarCode(next);
        if (byte !== null) {
          flush();
          const ch = qwByteToChar(byte);
          const colorClass = qwByteColor(byte);
          const top = stack[stack.length - 1];
          const qwClass: "qw-w" | "qw-g" | "qw-b" =
            colorClass === "w" ? "qw-w" : colorClass === "g" ? "qw-g" : "qw-b";
          const color: SpanColor = top.current.kind === "default"
            ? { kind: "qw", class: qwClass }
            : top.current;
          out.push({
            text: ch,
            color,
            origin: "charcode",
            rawToken: "$" + next,
            tooltip: `$${next} - QW char code (byte 0x${byte.toString(16).padStart(2, "0")})`,
          });
          i += 2;
          continue;
        }
      }
    }

    if (c === "%" && i + 1 < input.length) {
      const m = input.slice(i).match(/^%(\w+)/);
      if (m) {
        const token = m[1];
        const raw = "%" + token;
        if (ctx.resolver) {
          const res = ctx.resolver.resolve(token);
          flush();
          const top = stack[stack.length - 1];
          if (res) {
            // Pipe the resolver's display through runParser so any color codes
            // or nested refs baked into the resolved value (e.g. Simulator mode
            // returning "{&cf00pent&cfff}" for %p) render correctly. The tooltip
            // from the resolver is applied to each emitted span so hover still
            // reveals the canonical token name + description.
            const sub = runParser(res.display, stack, ctx, issues, "runtime", raw);
            for (const s of sub) {
              if (!s.tooltip) s.tooltip = res.tooltip;
            }
            out.push(...sub);
          } else {
            out.push({
              text: raw,
              color: top.current,
              origin: "unresolved",
              rawToken: raw,
              tooltip: `${raw} - unknown runtime token`,
            });
          }
          i += raw.length;
          continue;
        }
        // No resolver -> fall through to literal (buf += c below runs once then
        // loop re-enters, but we want the whole %name as literal, not char-by-char).
      }
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}
