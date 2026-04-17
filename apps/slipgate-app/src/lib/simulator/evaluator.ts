import type { Issue } from "./types.js";

export interface Token {
  kind: "number" | "string" | "op" | "lparen" | "rparen";
  value: string;
}

// Longest-first so <= beats <, etc.
const MULTI_CHAR_OPS = [
  "!isin", "isin",
  "==", "!=", "<>", "<=", ">=",
  "&&", "||",
  "=~", "!~",
  "and", "AND", "or", "OR",
];
const SINGLE_CHAR_OPS = ["<", ">", "=", "+", "-", "*", "/"];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const c = input[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "(") { tokens.push({ kind: "lparen", value: "(" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "rparen", value: ")" }); i++; continue; }

    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      const start = i;
      while (i < n && input[i] !== quote) i++;
      tokens.push({ kind: "string", value: input.slice(start, i) });
      if (i < n) i++;
      continue;
    }

    let matched = false;
    for (const op of MULTI_CHAR_OPS) {
      if (input.startsWith(op, i)) {
        // For alpha keywords and !isin require word boundary.
        if (/^[a-zA-Z!]/.test(op)) {
          const endIdx = i + op.length;
          const boundary = endIdx >= n || !/[\w]/.test(input[endIdx]);
          const leftBoundary = i === 0 || !/[\w]/.test(input[i - 1]) || op.startsWith("!");
          if (!boundary || !leftBoundary) continue;
        }
        tokens.push({ kind: "op", value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (SINGLE_CHAR_OPS.includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }

    if (/[0-9.]/.test(c)) {
      const start = i;
      while (i < n && /[0-9.]/.test(input[i])) i++;
      tokens.push({ kind: "number", value: input.slice(start, i) });
      continue;
    }

    if (/[\w]/.test(c)) {
      const start = i;
      while (i < n && /[\w\-_.]/.test(input[i])) i++;
      tokens.push({ kind: "string", value: input.slice(start, i) });
      continue;
    }

    i++;
  }

  return tokens;
}

export interface EvaluateResult {
  result: boolean;
  issues: Issue[];
}
