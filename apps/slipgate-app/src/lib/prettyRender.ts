import type { PlayerState, Issue } from "./simulator/index.js";
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

export function buildSpanTree(input: string, _ctx: BuildContext): BuildResult {
  if (input.length === 0) return { spans: [], issues: [] };
  return {
    spans: [{ text: input, color: { kind: "default" }, origin: "literal" }],
    issues: [],
  };
}
