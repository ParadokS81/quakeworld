import type { PlayerState, Issue } from "./simulator/index.js";
import { expandVars } from "./simulator/index.js";
import type { RuntimeResolver } from "./runtimeResolver.js";

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
}

export interface BuildContext {
  state: PlayerState;
  cvars: Map<string, string>;
  resolver: RuntimeResolver | null;
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

export function buildSpanTree(input: string, ctx: BuildContext): BuildResult {
  if (input.length === 0) return { spans: [], issues: [] };
  const issues: Issue[] = [];
  const stack: Frame[] = [{
    defaultColor: { kind: "default" },
    current: { kind: "default" },
  }];
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
      ...(rawTokenOverride ? { rawToken: rawTokenOverride } : {}),
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
    if (c === "$") {
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
            text: raw,
            color: top.current,
            origin: "unresolved",
            rawToken: raw,
            tooltip: `${raw} - not found in this config or state`,
          });
        } else {
          out.push(...runParser(text, stack, ctx, issues, "variable", raw));
        }
        i += raw.length;
        continue;
      }
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}
