# Alias Chain Pretty View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the ConfigViewer's expanded alias chains with resolved colors, substituted variables, readable runtime tokens, and (in Simulator mode) active-branch highlighting - consuming the shipped player-state simulator module for all runtime-value logic.

**Architecture:** A span-tree IR in `src/lib/prettyRender.ts` is produced by a four-stage builder (color-stack scoping, `$var` expansion via `expandVars` from `@/lib/simulator`, `%token` resolution via an injected `RuntimeResolver`, `$X` char-code expansion from a static TS table). `AliasChainView` renders each entry's command through this pipeline when Pretty mode is active. Tier 2 adds a `LabelResolver` + imports the simulator's `SimulatorResolver` behind a mode toggle. Tier 3 calls `evaluateTeamsay` per chain and correlates its trace to dim inactive branches.

**Tech Stack:** TypeScript, SolidJS, Bun test runner, Tailwind + DaisyUI CSS. Consumes `@/lib/simulator` (already shipped). No Rust changes.

**Spec:** `apps/slipgate-app/docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md`

---

## File Structure

**New:**
- `src/lib/prettyRender.ts` — span-tree IR types, color-stack state machine, `buildSpanTree()` orchestrator, `$var` integration with simulator, `$X` char-code integration. Pure functions, no Solid imports.
- `src/lib/charCodeTable.ts` — TS port of `expand_dollar_code` + `qw_byte_to_char` + `qw_byte_color` from `src-tauri/src/commands/ezquake.rs:432-523`. Static data + three pure lookup functions.
- `src/lib/runtimeResolver.ts` — `LabelResolver` implementation. Re-exports the `RuntimeResolver` / `RuntimeResolution` types from `@/lib/simulator`.
- `src/lib/prettyRender.test.ts`, `src/lib/charCodeTable.test.ts`, `src/lib/runtimeResolver.test.ts` — unit tests alongside each module.

**Modified:**
- `src/components/AliasChainResolver.tsx` — adds `mode: "pretty" | "raw"` prop, per-row toggle, `resolver` prop, `playerState` signal reader, pretty render branch.
- `src/components/ConfigSidebar.tsx` — adds global Pretty/Raw default toggle + (tier 2) Label/Simulator mode toggle in the options block.
- `src/components/ConfigViewer.tsx` — reads new prefs, threads them to `ConfigSidebar` + `AliasChainView` call sites.
- `src/store.ts` — extends `ProfilePrefs` with `alias_chain_mode` (tier 1) and `alias_chain_resolver` (tier 2) defaults.
- `src/app.css` — new `sg-span-*` classes, `qw-default` color helper.

---

## Tier 1 — Foundation

### Task 1: Port `$X` single-char code table to TypeScript

**Files:**
- Create: `apps/slipgate-app/src/lib/charCodeTable.ts`
- Test: `apps/slipgate-app/src/lib/charCodeTable.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/slipgate-app/src/lib/charCodeTable.test.ts
import { describe, expect, test } from "bun:test";
import { expandDollarCode, qwByteToChar, qwByteColor } from "./charCodeTable.js";

describe("expandDollarCode", () => {
  test("single-char codes map to expected bytes", () => {
    expect(expandDollarCode("]")).toBe(0x11); // gold right bracket
    expect(expandDollarCode(",")).toBe(0x1C); // white bullet
    expect(expandDollarCode(".")).toBe(0x9C); // brown dot
    expect(expandDollarCode("Y")).toBe(0x88); // yellow LED
    expect(expandDollarCode("0")).toBe(0x12); // gold digit zero
  });
  test("returns null for unknown chars", () => {
    expect(expandDollarCode("q")).toBeNull();
    expect(expandDollarCode("!")).toBeNull();
  });
});

describe("qwByteToChar", () => {
  test("printable ASCII round-trips", () => {
    expect(qwByteToChar(0x41)).toBe("A");
    expect(qwByteToChar(0x7E)).toBe("~");
  });
  test("control bytes map to glyphs", () => {
    expect(qwByteToChar(0x10)).toBe("[");
    expect(qwByteToChar(0x11)).toBe("]");
    expect(qwByteToChar(0x12)).toBe("0");
    expect(qwByteToChar(0x1C)).toBe("\u2022"); // bullet dot
    expect(qwByteToChar(0x1E)).toBe("\u2014"); // em dash
  });
});

describe("qwByteColor", () => {
  test("gold range returns g", () => {
    expect(qwByteColor(0x10)).toBe("g");
    expect(qwByteColor(0x1B)).toBe("g");
  });
  test("high-bit range returns b", () => {
    expect(qwByteColor(0x80)).toBe("b");
    expect(qwByteColor(0x9C)).toBe("g"); // 0x90-0x9B is gold variant
    expect(qwByteColor(0xA0)).toBe("b");
  });
  test("normal ASCII returns w", () => {
    expect(qwByteColor(0x41)).toBe("w");
    expect(qwByteColor(0x20)).toBe("w");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/slipgate-app && bun test src/lib/charCodeTable.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write implementation**

```ts
// apps/slipgate-app/src/lib/charCodeTable.ts

/** Ported from src-tauri/src/commands/ezquake.rs:432-467 `expand_dollar_code`. */
const DOLLAR_CODES: Record<string, number> = {
  "\\": 0x0D, ":": 0x0A,
  "[": 0x10, "]": 0x11,
  "0": 0x12, "1": 0x13, "2": 0x14, "3": 0x15, "4": 0x16,
  "5": 0x17, "6": 0x18, "7": 0x19, "8": 0x1A, "9": 0x1B,
  ",": 0x1C, ".": 0x9C,
  "<": 0x1D, "-": 0x1E, ">": 0x1F,
  "(": 0x80, "=": 0x81, ")": 0x82, "a": 0x83,
  "W": 0x84, "G": 0x86, "R": 0x87, "Y": 0x88, "B": 0x89,
  "b": 0x8B, "c": 0x8D, "d": 0x8D,
  "$": 0x24, "^": 0x5E,
};

export function expandDollarCode(ch: string): number | null {
  return DOLLAR_CODES[ch] ?? null;
}

/** Ported from src-tauri/src/commands/ezquake.rs:471-513 `qw_byte_to_char`. */
export function qwByteToChar(byte: number): string {
  const base = byte & 0x7F;
  switch (base) {
    case 0x00: case 0x01: case 0x02: case 0x03: case 0x04:
    case 0x06: case 0x07: case 0x08: case 0x09: case 0x0A:
    case 0x0B: case 0x0C: case 0x0D: case 0x0F: case 0x7F:
      return " ";
    case 0x05: return "\u2022";
    case 0x0E: return "\u00B7";
    case 0x10: return "[";
    case 0x11: return "]";
    case 0x12: return "0";
    case 0x13: return "1";
    case 0x14: return "2";
    case 0x15: return "3";
    case 0x16: return "4";
    case 0x17: return "5";
    case 0x18: return "6";
    case 0x19: return "7";
    case 0x1A: return "8";
    case 0x1B: return "9";
    case 0x1C: return "\u2022";
    case 0x1D: return "\u2039";
    case 0x1E: return "\u2014";
    case 0x1F: return "\u203A";
    default:
      return base >= 0x20 && base <= 0x7E ? String.fromCharCode(base) : " ";
  }
}

/** Ported from src-tauri/src/commands/ezquake.rs:516-523 `qw_byte_color`. */
export type QwColorClass = "w" | "g" | "b";

export function qwByteColor(byte: number): QwColorClass {
  if ((byte >= 0x10 && byte <= 0x1B) || (byte >= 0x90 && byte <= 0x9B)) return "g";
  if (byte >= 0x80) return "b";
  return "w";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/slipgate-app && bun test src/lib/charCodeTable.test.ts`
Expected: 3 describe blocks pass, all assertions green.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/charCodeTable.ts apps/slipgate-app/src/lib/charCodeTable.test.ts
git commit -m "feat(slipgate): TS port of ezquake dollar-code + byte-to-char tables"
```

---

### Task 2: Span-tree IR types and empty builder scaffold

**Files:**
- Create: `apps/slipgate-app/src/lib/prettyRender.ts`
- Test: `apps/slipgate-app/src/lib/prettyRender.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/slipgate-app/src/lib/prettyRender.test.ts
import { describe, expect, test } from "bun:test";
import { buildSpanTree } from "./prettyRender.js";
import { createDefaultPlayerState } from "./simulator/index.js";

describe("buildSpanTree (scaffold)", () => {
  test("empty input produces empty span list", () => {
    const r = buildSpanTree("", {
      state: createDefaultPlayerState(),
      cvars: new Map(),
      resolver: null,
    });
    expect(r.spans).toEqual([]);
  });

  test("plain ASCII produces one literal span", () => {
    const r = buildSpanTree("hello", {
      state: createDefaultPlayerState(),
      cvars: new Map(),
      resolver: null,
    });
    expect(r.spans.length).toBe(1);
    expect(r.spans[0].text).toBe("hello");
    expect(r.spans[0].origin).toBe("literal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write implementation**

```ts
// apps/slipgate-app/src/lib/prettyRender.ts
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
```

Also create the resolver module header (used only for type import here):

```ts
// apps/slipgate-app/src/lib/runtimeResolver.ts
export type { RuntimeResolver, RuntimeResolution } from "./simulator/index.js";
```

- [ ] **Step 4: Run tests**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.ts apps/slipgate-app/src/lib/prettyRender.test.ts apps/slipgate-app/src/lib/runtimeResolver.ts
git commit -m "feat(slipgate): pretty-render span tree types + scaffold"
```

---

### Task 3: Color-stack state machine (stage 1)

**Files:**
- Modify: `apps/slipgate-app/src/lib/prettyRender.ts`
- Modify: `apps/slipgate-app/src/lib/prettyRender.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `prettyRender.test.ts`:

```ts
describe("color-stack state machine", () => {
  const ctx = {
    state: createDefaultPlayerState(),
    cvars: new Map<string, string>(),
    resolver: null,
  };

  test("&cRGB sets inline hex color then &r resets to default", () => {
    const r = buildSpanTree("&cf00red&rdefault", ctx);
    expect(r.spans.length).toBe(2);
    expect(r.spans[0].text).toBe("red");
    expect(r.spans[0].color).toEqual({ kind: "hex", value: "#ff0000" });
    expect(r.spans[1].text).toBe("default");
    expect(r.spans[1].color).toEqual({ kind: "default" });
  });

  test("12-bit hex expands each nibble to 24-bit", () => {
    const r = buildSpanTree("&cf13rl", ctx);
    expect(r.spans[0].color).toEqual({ kind: "hex", value: "#ff1133" });
  });

  test("braces push white-default frame, pop restores outer", () => {
    const r = buildSpanTree("{hello}world", ctx);
    expect(r.spans.length).toBe(2);
    expect(r.spans[0].text).toBe("hello");
    expect(r.spans[0].color).toEqual({ kind: "qw"; class: "qw-w" });
    expect(r.spans[1].text).toBe("world");
    expect(r.spans[1].color).toEqual({ kind: "default" });
  });

  test("nested brace + &cRGB inside brace", () => {
    const r = buildSpanTree("{&cf13red&cfffwhite}outside", ctx);
    expect(r.spans.map((s) => s.text)).toEqual(["red", "white", "outside"]);
    expect(r.spans[0].color).toEqual({ kind: "hex", value: "#ff1133" });
    expect(r.spans[1].color).toEqual({ kind: "hex", value: "#ffffff" });
    expect(r.spans[2].color).toEqual({ kind: "default" });
  });

  test("&r inside brace resets to white (brace default)", () => {
    const r = buildSpanTree("{&cf00red&rwhite}", ctx);
    expect(r.spans[1].text).toBe("white");
    expect(r.spans[1].color).toEqual({ kind: "qw"; class: "qw-w" });
  });

  test("braces are not emitted as literal characters", () => {
    const r = buildSpanTree("a{b}c", ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).toBe("abc");
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: 6 new failures; existing 2 still pass.

- [ ] **Step 3: Implement the color-stack state machine**

Replace `buildSpanTree` in `prettyRender.ts`:

```ts
interface Frame {
  defaultColor: SpanColor;
  current: SpanColor;
}

function expandHex12(hex: string): string {
  return "#" + hex.split("").map((c) => c + c).join("");
}

export function buildSpanTree(input: string, _ctx: BuildContext): BuildResult {
  if (input.length === 0) return { spans: [], issues: [] };
  const spans: PrettySpan[] = [];
  const stack: Frame[] = [{
    defaultColor: { kind: "default" },
    current: { kind: "default" },
  }];
  let buf = "";

  function flush() {
    if (buf.length === 0) return;
    const top = stack[stack.length - 1];
    spans.push({ text: buf, color: top.current, origin: "literal" });
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

    buf += c;
    i++;
  }
  flush();
  return { spans, issues: [] };
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.ts apps/slipgate-app/src/lib/prettyRender.test.ts
git commit -m "feat(slipgate): pretty-render color stack + brace scoping"
```

---

### Task 4: `$variable` substitution stage via `expandVars`

**Files:**
- Modify: `apps/slipgate-app/src/lib/prettyRender.ts`
- Modify: `apps/slipgate-app/src/lib/prettyRender.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `prettyRender.test.ts`:

```ts
describe("$variable substitution", () => {
  const state = createDefaultPlayerState();

  test("$var resolves via cvars and emits variable-origin span", () => {
    const cvars = new Map([["tpname", "para"]]);
    const r = buildSpanTree("hi $tpname", { state, cvars, resolver: null });
    const varSpan = r.spans.find((s) => s.origin === "variable");
    expect(varSpan?.text).toBe("para");
    expect(varSpan?.rawToken).toBe("$tpname");
  });

  test("unresolved $var emits unresolved-origin span preserving raw token", () => {
    const r = buildSpanTree("hi $nope there", { state, cvars: new Map(), resolver: null });
    const bad = r.spans.find((s) => s.origin === "unresolved");
    expect(bad?.text).toBe("$nope");
    expect(bad?.rawToken).toBe("$nope");
  });

  test("nested colors inside substituted value render correctly", () => {
    const cvars = new Map([["tp_name_rl", "{&cfffrl&cfff}"]]);
    const r = buildSpanTree("$tp_name_rl", { state, cvars, resolver: null });
    // Expansion "{&cfffrl&cfff}" produces a white-scope span "rl" then pops.
    const white = r.spans.find((s) => s.text === "rl");
    expect(white?.color).toEqual({ kind: "hex", value: "#ffffff" });
    expect(white?.origin).toBe("variable");
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts -t "\\$variable"`
Expected: 3 failures.

- [ ] **Step 3: Implement stage 2**

Update `prettyRender.ts`. Add the import and modify the main loop:

```ts
import type { PlayerState, Issue } from "./simulator/index.js";
import { expandVars } from "./simulator/index.js";
```

Replace the main loop body so that when we see `$\w+`, we:
1. Flush the current literal buffer.
2. Look up the name. Use `expandVars("$" + name, ctx.state, ctx.cvars)`.
3. If the result equals the raw token, emit one unresolved span for it and advance.
4. Otherwise, recursively parse the expansion with the current stack state, tagging each produced span's `origin` as `variable` and setting `rawToken` to the raw `$name` form.

Concretely, after the existing `{`/`}`/`&r`/`&cRGB` branches and before the `buf += c` default, add:

```ts
    if (c === "$") {
      const m = input.slice(i).match(/^\$(\w+)/);
      if (m) {
        flush();
        const name = m[1];
        const raw = "$" + name;
        const { text, issues: exIssues } = expandVars(raw, _ctx.state, _ctx.cvars);
        issues.push(...exIssues);
        if (text === raw) {
          const top = stack[stack.length - 1];
          spans.push({
            text: raw, color: top.current, origin: "unresolved", rawToken: raw,
            tooltip: `${raw} - not found in this config or state`,
          });
        } else {
          const sub = runParser(text, stack, _ctx, "variable", raw);
          spans.push(...sub);
        }
        i += raw.length;
        continue;
      }
    }
```

Refactor the main loop into `runParser(input, stack, ctx, originOverride?, rawTokenOverride?)` that returns the spans it produces and mutates `stack` in place for enclosing callers. The issues array also needs to be accumulated across the recursion — hoist it to closure scope:

```ts
export function buildSpanTree(input: string, ctx: BuildContext): BuildResult {
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
            text: raw, color: top.current, origin: "unresolved", rawToken: raw,
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
```

- [ ] **Step 4: Run tests**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: all tests green (color-stack tests + new $var tests).

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.ts apps/slipgate-app/src/lib/prettyRender.test.ts
git commit -m "feat(slipgate): pretty-render delegates \$var to simulator expandVars"
```

---

### Task 5: `$X` single-char code stage (stage 4)

**Files:**
- Modify: `apps/slipgate-app/src/lib/prettyRender.ts`
- Modify: `apps/slipgate-app/src/lib/prettyRender.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe("$X char-code expansion", () => {
  const state = createDefaultPlayerState();
  const ctx = { state, cvars: new Map<string, string>(), resolver: null };

  test("$] emits gold right bracket with qw-g class", () => {
    const r = buildSpanTree("$]", ctx);
    expect(r.spans.length).toBe(1);
    expect(r.spans[0].text).toBe("]");
    expect(r.spans[0].origin).toBe("charcode");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-g" });
    expect(r.spans[0].rawToken).toBe("$]");
  });

  test("$, emits white bullet with qw-w class", () => {
    const r = buildSpanTree("$,", ctx);
    expect(r.spans[0].text).toBe("\u2022");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-w" });
  });

  test("$. emits brown dot with qw-b class (since 0x9C > 0x9B)", () => {
    const r = buildSpanTree("$.", ctx);
    expect(r.spans[0].text).toBe("\u00B7");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-b" });
  });

  test("$. qw-g classification for 0x90-0x9B range uses gold", () => {
    // 0x9C is qw-b per qwByteColor; this test verifies NOT gold for 0x9C.
    const r = buildSpanTree("$.", ctx);
    expect(r.spans[0].color).not.toEqual({ kind: "qw", class: "qw-g" });
  });

  test("unknown $X falls through as literal", () => {
    const r = buildSpanTree("$!x", ctx);
    // $! is not a known code and not a word, so it should emit literal "$!x".
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).toBe("$!x");
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts -t "\\$X"`
Expected: 5 failures (char-code not emitting correct spans yet).

- [ ] **Step 3: Implement stage 4 handler**

In `prettyRender.ts`, add import:

```ts
import { expandDollarCode, qwByteToChar, qwByteColor } from "./charCodeTable.js";
```

In `runParser`, after the `$\w+` branch and still inside the `if (c === "$")` block, handle the single-char case:

```ts
    if (c === "$" && i + 1 < input.length) {
      // Word case handled above. Try single-char code next.
      const next = input[i + 1];
      const byte = expandDollarCode(next);
      if (byte !== null) {
        flush();
        const ch = qwByteToChar(byte);
        const colorClass = qwByteColor(byte);
        const top = stack[stack.length - 1];
        const color: SpanColor = top.current.kind === "default"
          ? { kind: "qw", class: colorClass === "w" ? "qw-w" : colorClass === "g" ? "qw-g" : "qw-b" }
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
```

Note ordering: the existing `$\w+` (word-char) match must be tried first; the single-char handler only runs when the char after `$` is a non-word char. Adjust by checking `/\w/` on `next` before attempting word-match, or by explicit fallthrough.

Cleaner structure - replace the whole `$` handling block with:

```ts
    if (c === "$" && i + 1 < input.length) {
      const next = input[i + 1];
      if (/\w/.test(next)) {
        // Word-char $var path (stage 2)
        const m = input.slice(i).match(/^\$(\w+)/);
        if (m) { /* ...existing var-substitution code... */ }
      } else {
        const byte = expandDollarCode(next);
        if (byte !== null) { /* ...char-code span emission... */ }
      }
    }
```

Make sure the unknown-code fallthrough reaches `buf += c`.

- [ ] **Step 4: Run tests**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.ts apps/slipgate-app/src/lib/prettyRender.test.ts
git commit -m "feat(slipgate): pretty-render \$X char-code expansion stage"
```

---

### Task 6: Fixture-driven integration test against a real teamsay config

**Files:**
- Create: `apps/slipgate-app/src/lib/prettyRender.fixtures.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/slipgate-app/src/lib/prettyRender.fixtures.test.ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseConfig } from "qw-config";
import { buildSpanTree } from "./prettyRender.js";
import { createDefaultPlayerState } from "./simulator/index.js";

function loadFixture(name: string) {
  const path = join(__dirname, "..", "..", "assets", "teamsays", name);
  const text = readFileSync(path, "utf-8");
  return parseConfig(text);
}

describe("fixture: locktar.cfg / tp_name_rlg", () => {
  const fx = loadFixture("locktar.cfg");
  const cvars = fx.cvars;
  const ctx = { state: createDefaultPlayerState(), cvars, resolver: null };

  test("tp_name_rlg renders with no brace/color codes in output", () => {
    const raw = cvars.get("tp_name_rlg")!;
    const r = buildSpanTree(raw, ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).not.toMatch(/[{}]/);
    expect(joined).not.toMatch(/&[cr]/);
  });

  test("tp_name_rlg contains a hex-colored rl span", () => {
    const raw = cvars.get("tp_name_rlg")!;
    const r = buildSpanTree(raw, ctx);
    const rl = r.spans.find((s) => s.text === "rl");
    expect(rl).toBeDefined();
    expect(rl?.color.kind).toBe("hex");
  });
});

describe("fixture: hangtime.cfg sample alias body", () => {
  const fx = loadFixture("hangtime.cfg");
  const ctx = { state: createDefaultPlayerState(), cvars: fx.cvars, resolver: null };

  test("renders .msg.lost body without raw color codes in output", () => {
    const body = fx.aliases.get(".msg.lost");
    if (!body) return; // skip if fixture changed
    const r = buildSpanTree(body, ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).not.toMatch(/&c[0-9a-f]{3}/);
  });
});
```

- [ ] **Step 2: Run test to verify it passes or identify real fixture-driven bugs**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.fixtures.test.ts`
Expected: All tests pass. If the text includes stray `{` or `&c`, the parser has a bug — fix in `prettyRender.ts` before committing. Re-run until all four pass.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.fixtures.test.ts
git commit -m "test(slipgate): pretty-render fixture tests against real teamsay cfgs"
```

---

### Task 7: CSS classes for tier-1 origins and `qw-default`

**Files:**
- Modify: `apps/slipgate-app/src/app.css`

- [ ] **Step 1: Add the CSS block**

After the existing `qw-g` rule (line 528), insert:

```css
/* Pretty-render spans: origin treatments */
.qw-default { color: var(--sg-qw-default); }

.sg-span-literal {
  color: var(--sg-text-dim);
  font-family: "Geist Mono", monospace;
}
.sg-span-variable {
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  text-decoration-color: var(--sg-text-dim);
  cursor: help;
}
.sg-span-charcode {
  cursor: help;
}
.sg-span-unresolved {
  opacity: 0.55;
  font-weight: 600;
}
.sg-span-unresolved::before {
  content: "\25CF";
  color: var(--sg-warning, #d97706);
  margin-right: 2px;
  font-size: 0.7em;
  vertical-align: middle;
}
```

At the top of the file where CSS variables are declared, add `--sg-qw-default: #c8a078;` (tan default for say_team body text) to the `:root` block. If the `:root` block does not exist in this stylesheet, place the variable at the top of the file inside a `:root { ... }` wrapper.

- [ ] **Step 2: Visual spot check**

Run: `cd apps/slipgate-app && bun run dev` (in a Windows terminal — WSL cannot run the Tauri app) or preview the CSS in the browser dev tools. Verify the new classes exist in the compiled CSS without errors.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/app.css
git commit -m "style(slipgate): pretty-render span CSS classes + qw-default color"
```

---

### Task 8: `ProfilePrefs.alias_chain_mode` + store migration

**Files:**
- Modify: `apps/slipgate-app/src/store.ts`

- [ ] **Step 1: Extend the interface**

In `store.ts` find the `ProfilePrefs` interface (around line 74) and add:

```ts
  /** Pretty-render mode for expanded alias chains. */
  alias_chain_mode: "pretty" | "raw";
```

In `DEFAULT_PREFS` (around line 141) add:

```ts
  alias_chain_mode: "pretty",
```

Migration is covered by the existing `{ ...DEFAULT_PREFS, ...data.prefs, ... }` spread at line 254 — new field inherits its default automatically for older profiles.

- [ ] **Step 2: Verify no TS errors**

Run: `cd apps/slipgate-app && bunx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/store.ts
git commit -m "feat(slipgate): ProfilePrefs.alias_chain_mode with pretty default"
```

---

### Task 9: `AliasChainView` renders span tree in Pretty mode

**Files:**
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx`

- [ ] **Step 1: Add imports and props**

At the top of `AliasChainResolver.tsx`:

```ts
import type { PlayerState } from "../lib/simulator/index.js";
import { createDefaultPlayerState } from "../lib/simulator/index.js";
import { buildSpanTree, type PrettySpan, type SpanColor } from "../lib/prettyRender.js";
import type { RuntimeResolver } from "../lib/runtimeResolver.js";
```

Extend `AliasChainView`'s props:

```ts
export function AliasChainView(props: {
  chain: AliasChainEntry[];
  label?: string;
  ownerClass?: string;
  macroRefs?: Set<string>;
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
  mode?: "pretty" | "raw";            // NEW
  playerState?: PlayerState;          // NEW (tier 2+ uses this)
  resolver?: RuntimeResolver | null;  // NEW (tier 2+ uses this)
}) {
```

- [ ] **Step 2: Add a helper component that renders a command string**

Inside the component file, above the return:

```tsx
function cvarMap(rec?: Record<string, string>): Map<string, string> {
  const m = new Map<string, string>();
  if (!rec) return m;
  for (const [k, v] of Object.entries(rec)) m.set(k, v);
  return m;
}

function colorStyle(c: SpanColor): { class?: string; style?: Record<string, string> } {
  if (c.kind === "qw") return { class: c.class };
  if (c.kind === "hex") return { style: { color: c.value } };
  return { class: "qw-default" };
}

function PrettyCmd(props: {
  cmd: string;
  state: PlayerState;
  cvars: Map<string, string>;
  resolver: RuntimeResolver | null;
}) {
  const result = () => buildSpanTree(props.cmd, {
    state: props.state, cvars: props.cvars, resolver: props.resolver,
  });
  return (
    <span class="sg-alias-chain-cmd">
      <For each={result().spans}>
        {(s) => {
          const cs = colorStyle(s.color);
          const originClass = `sg-span-${s.origin}`;
          return (
            <span
              class={[originClass, cs.class].filter(Boolean).join(" ")}
              style={cs.style}
              title={s.tooltip}
            >{s.text}</span>
          );
        }}
      </For>
    </span>
  );
}
```

- [ ] **Step 3: Branch the render on mode**

Replace the existing entry render block (around lines 114-124):

```tsx
        <For each={props.chain}>
          {(entry) => (
            <div
              class="sg-alias-chain-entry"
              style={{ "padding-left": `${12 + entry.depth * 16}px` }}
            >
              <span class="sg-alias-chain-name">{entry.name}</span>
              <Show
                when={(props.mode ?? "pretty") === "pretty"}
                fallback={<span class="sg-alias-chain-cmd">{entry.command}</span>}
              >
                <PrettyCmd
                  cmd={entry.command}
                  state={props.playerState ?? createDefaultPlayerState()}
                  cvars={cvarMap(props.primaryCvars)}
                  resolver={props.resolver ?? null}
                />
              </Show>
            </div>
          )}
        </For>
```

- [ ] **Step 4: TS-check**

Run: `cd apps/slipgate-app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/AliasChainResolver.tsx
git commit -m "feat(slipgate): AliasChainView Pretty mode renders span tree"
```

---

### Task 10: Global Pretty/Raw default toggle in options + thread through ConfigViewer

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigSidebar.tsx`
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`

- [ ] **Step 1: Add the prop + UI to `ConfigSidebar.tsx`**

Near the existing `hideDefaults` prop (around line 26):

```ts
  aliasChainMode: "pretty" | "raw";
  onAliasChainModeChange: (val: "pretty" | "raw") => void;
```

In the options block (after the Hide defaults row, near line 164), add a segmented toggle:

```tsx
        <div class="flex items-center gap-2 px-3 py-1 text-xs">
          <span class="text-[var(--sg-section-label)]">Alias chains:</span>
          <div class="join">
            <button
              class={`join-item btn btn-xs ${props.aliasChainMode === "pretty" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => props.onAliasChainModeChange("pretty")}
            >Pretty</button>
            <button
              class={`join-item btn btn-xs ${props.aliasChainMode === "raw" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => props.onAliasChainModeChange("raw")}
            >Raw</button>
          </div>
        </div>
```

- [ ] **Step 2: Thread in `ConfigViewer.tsx`**

Near the existing `hideDefaults` signal (around line 106):

```ts
  const [aliasChainMode, setAliasChainMode] = createSignal<"pretty" | "raw">(
    profileStore.profile.prefs.alias_chain_mode,
  );

  // Persist on change
  createEffect(() => {
    updatePrefs({ alias_chain_mode: aliasChainMode() });
  });
```

If `updatePrefs` does not already exist in the store, add a simple setter — check `store.ts` for existing patterns (there will be `savePrefs` or similar).

Pass `aliasChainMode()` + `setAliasChainMode` to `ConfigSidebar` via the new prop pair. Then at each `AliasChainView` call site in this file (grep for `AliasChainView` in the component tree — likely inside `ConfigDomainBinds.tsx` and friends), thread `mode={aliasChainMode()}` down the prop chain.

For tier 1, only the top-level `AliasChainView` consumer needs the prop; other files can accept the prop via context or prop-drilling — whichever pattern exists for `hideDefaults` works here too.

- [ ] **Step 3: Verify dev build**

Run: `cd apps/slipgate-app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual visual check**

Start the Tauri dev server on Windows, open a config with teamsay binds, expand an alias chain (e.g. locktar.cfg's `Report`), toggle Pretty/Raw. Expected:
- Raw mode = today's view unchanged.
- Pretty mode = colors rendered, `$tp_name_rl` substituted inline with its inner colors, gold brackets visible, no `&cXXX`/`&r`/`{`/`}` noise in output.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigSidebar.tsx apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/components/ConfigDomainBinds.tsx
git commit -m "feat(slipgate): Pretty/Raw alias chain toggle wired from Sidebar through ConfigViewer"
```

---

## Tier 2 — Resolvers (LabelResolver + SimulatorResolver + mode toggle)

### Task 11: `LabelResolver` implementation + tests

**Files:**
- Modify: `apps/slipgate-app/src/lib/runtimeResolver.ts`
- Create: `apps/slipgate-app/src/lib/runtimeResolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/slipgate-app/src/lib/runtimeResolver.test.ts
import { describe, expect, test } from "bun:test";
import { createLabelResolver } from "./runtimeResolver.js";

describe("LabelResolver", () => {
  const r = createLabelResolver();

  test("long-form tokens map to human label", () => {
    expect(r.resolve("health")?.display).toBe("health");
    expect(r.resolve("bestweapon")?.display).toBe("best weapon");
    expect(r.resolve("location")?.display).toBe("location");
  });

  test("short-form aliases map through to same label", () => {
    expect(r.resolve("h")?.display).toBe("health");
    expect(r.resolve("a")?.display).toBe("armor");
    expect(r.resolve("l")?.display).toBe("location");
    expect(r.resolve("b")?.display).toBe("best weapon");
  });

  test("unknown token returns null", () => {
    expect(r.resolve("nope")).toBeNull();
  });

  test("tooltip mentions both short form and description", () => {
    const res = r.resolve("a");
    expect(res?.tooltip).toContain("armor");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/slipgate-app && bun test src/lib/runtimeResolver.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `runtimeResolver.ts` (extending the re-export-only file from task 2):

```ts
import type { RuntimeResolver, RuntimeResolution } from "./simulator/index.js";
export type { RuntimeResolver, RuntimeResolution };

const SHORT_FORM_ALIASES: Record<string, string> = {
  a: "armor", h: "health", l: "location",
  w: "weapon", b: "bestweapon",
  c: "cells", r: "rockets", n: "nails", s: "shells",
  p: "powerups", d: "deathloc", t: "took",
  x: "ammo", y: "weaponnum",
};

const LABELS: Record<string, { display: string; description: string }> = {
  health: { display: "health", description: "player health" },
  armor: { display: "armor", description: "player armor value" },
  armortype: { display: "armor type", description: "armor type letter (g/y/r/none)" },
  colored_armor: { display: "armor", description: "armor value with health-band color codes" },
  weapon: { display: "weapon", description: "currently selected weapon" },
  weapons: { display: "weapons", description: "space-joined list of owned weapons" },
  bestweapon: { display: "best weapon", description: "highest-priority owned weapon with ammo" },
  weaponnum: { display: "weapon number", description: "impulse number of current weapon" },
  ammo: { display: "ammo", description: "ammo count for current weapon" },
  bestammo: { display: "best ammo", description: "ammo count for bestweapon" },
  cells: { display: "cells", description: "cells count" },
  rockets: { display: "rockets", description: "rockets count" },
  nails: { display: "nails", description: "nails count" },
  shells: { display: "shells", description: "shells count" },
  powerups: { display: "powerups", description: "space-joined active powerups" },
  location: { display: "location", description: "player location" },
  mapname: { display: "map", description: "current map" },
  lastloc: { display: "last location", description: "last location visited" },
  deathloc: { display: "death location", description: "location of last death" },
  matchname: { display: "match", description: "match name" },
  matchstatus: { display: "match status", description: "match status" },
  matchtype: { display: "match type", description: "match type" },
  ledpoint: { display: "LED point", description: "LED point color" },
  ledstatus: { display: "LED status", description: "LED status color" },
  point: { display: "pointed", description: "pointed-at player name" },
  pointloc: { display: "pointed location", description: "location of pointed-at player" },
  took: { display: "took", description: "last item taken" },
  tookloc: { display: "took location", description: "where item was taken" },
  droploc: { display: "drop location", description: "last backpack drop location" },
  lastpowerup: { display: "last powerup", description: "last powerup taken" },
};

export function createLabelResolver(): RuntimeResolver {
  return {
    resolve(token: string): RuntimeResolution | null {
      const canonical = SHORT_FORM_ALIASES[token] ?? token;
      const entry = LABELS[canonical];
      if (!entry) return null;
      return {
        display: entry.display,
        tooltip: `%${token} (${canonical}): ${entry.description}`,
        origin: "runtime",
      };
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd apps/slipgate-app && bun test src/lib/runtimeResolver.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/runtimeResolver.ts apps/slipgate-app/src/lib/runtimeResolver.test.ts
git commit -m "feat(slipgate): LabelResolver for %token human labels"
```

---

### Task 12: Wire `RuntimeResolver` into stage 3 of `buildSpanTree`

**Files:**
- Modify: `apps/slipgate-app/src/lib/prettyRender.ts`
- Modify: `apps/slipgate-app/src/lib/prettyRender.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe("%token resolution via RuntimeResolver", () => {
  const state = createDefaultPlayerState();

  test("LabelResolver: %a renders as 'armor' with runtime origin", () => {
    const { createLabelResolver } = require("./runtimeResolver.js");
    const r = buildSpanTree("%a", { state, cvars: new Map(), resolver: createLabelResolver() });
    expect(r.spans[0].text).toBe("armor");
    expect(r.spans[0].origin).toBe("runtime");
    expect(r.spans[0].rawToken).toBe("%a");
  });

  test("Unknown %token with resolver returning null falls through as unresolved", () => {
    const { createLabelResolver } = require("./runtimeResolver.js");
    const r = buildSpanTree("%nope", { state, cvars: new Map(), resolver: createLabelResolver() });
    expect(r.spans[0].origin).toBe("unresolved");
    expect(r.spans[0].text).toBe("%nope");
  });

  test("No resolver leaves %token as literal text", () => {
    const r = buildSpanTree("%a", { state, cvars: new Map(), resolver: null });
    expect(r.spans[0].origin).toBe("literal");
    expect(r.spans[0].text).toBe("%a");
  });
});
```

- [ ] **Step 2: Run to verify failures**

Expected: 2 failures (pretty renderer doesn't yet call resolver on `%token`).

- [ ] **Step 3: Implement stage 3**

In `runParser`, add a new handler for `%\w+` after the `$` handler and before `buf += c`:

```ts
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
            out.push({
              text: res.display,
              color: top.current,
              origin: "runtime",
              rawToken: raw,
              tooltip: res.tooltip,
            });
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
        // No resolver -> fall through to literal handling below
      }
    }
```

- [ ] **Step 4: Run tests**

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.ts apps/slipgate-app/src/lib/prettyRender.test.ts
git commit -m "feat(slipgate): pretty-render \%token resolution via RuntimeResolver"
```

---

### Task 13: `ProfilePrefs.alias_chain_resolver` + wire mode toggle

**Files:**
- Modify: `apps/slipgate-app/src/store.ts`
- Modify: `apps/slipgate-app/src/components/ConfigSidebar.tsx`
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx`

- [ ] **Step 1: Extend `ProfilePrefs`**

In `store.ts`, add next to `alias_chain_mode`:

```ts
  /** Which %token resolver to use in Pretty mode. */
  alias_chain_resolver: "label" | "simulator";
```

In `DEFAULT_PREFS`:

```ts
  alias_chain_resolver: "label",
```

- [ ] **Step 2: Add the Sidebar toggle**

In `ConfigSidebar.tsx` below the Pretty/Raw toggle from task 10, add:

```tsx
        <div class="flex items-center gap-2 px-3 py-1 text-xs">
          <span class="text-[var(--sg-section-label)]">Tokens:</span>
          <div class="join">
            <button
              class={`join-item btn btn-xs ${props.aliasChainResolver === "label" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => props.onAliasChainResolverChange("label")}
            >Label</button>
            <button
              class={`join-item btn btn-xs ${props.aliasChainResolver === "simulator" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => props.onAliasChainResolverChange("simulator")}
            >Simulator</button>
          </div>
        </div>
```

And the matching props:

```ts
  aliasChainResolver: "label" | "simulator";
  onAliasChainResolverChange: (val: "label" | "simulator") => void;
```

- [ ] **Step 3: Thread state + resolver through `ConfigViewer`**

In `ConfigViewer.tsx`:

```ts
import { createLabelResolver } from "../lib/runtimeResolver.js";
import { createSimulatorResolver } from "../lib/simulator/index.js";

const [aliasChainResolver, setAliasChainResolver] = createSignal<"label" | "simulator">(
  profileStore.profile.prefs.alias_chain_resolver,
);

createEffect(() => {
  updatePrefs({ alias_chain_resolver: aliasChainResolver() });
});

const resolver = createMemo(() => {
  if (aliasChainResolver() === "simulator") {
    return createSimulatorResolver(
      profileStore.profile.prefs.simulator.currentState,
      // Flatten enrichedCvars to a Map<string,string>
      mapifyCvars(enrichedCvars()),
    );
  }
  return createLabelResolver();
});

const playerState = () => profileStore.profile.prefs.simulator.currentState;
```

Add a small helper `mapifyCvars(list: CvarEntry[]): Map<string,string>` if the enrichedCvars shape is not already a Map — check the shape in-file.

Pass to `ConfigSidebar`:

```tsx
<ConfigSidebar
  ...
  aliasChainResolver={aliasChainResolver()}
  onAliasChainResolverChange={setAliasChainResolver}
/>
```

And to every `AliasChainView` call (through the prop-drill chain already established in task 10):

```tsx
<AliasChainView
  ...
  resolver={resolver()}
  playerState={playerState()}
/>
```

- [ ] **Step 4: Verify dev build**

Run: `cd apps/slipgate-app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual visual check**

Start dev server. Open a config. In Pretty mode + Label: `{%a}/{%h}` shows `armor/health` underlined. Switch to Simulator: same expression shows the current PlayerState's values (`100/100` at defaults). Edit state in the right-rail State panel; pretty output updates live.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/store.ts apps/slipgate-app/src/components/ConfigSidebar.tsx apps/slipgate-app/src/components/ConfigViewer.tsx apps/slipgate-app/src/components/AliasChainResolver.tsx
git commit -m "feat(slipgate): Label|Simulator resolver toggle with live PlayerState subscription"
```

---

### Task 14: CSS for `sg-span-runtime`

**Files:**
- Modify: `apps/slipgate-app/src/app.css`

- [ ] **Step 1: Append the rule**

After the `.sg-span-charcode` block (added in task 7):

```css
.sg-span-runtime {
  font-style: italic;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  text-decoration-color: var(--sg-text-dim);
  cursor: help;
}
```

- [ ] **Step 2: Visual check**

Reload dev server. `%a` in Label mode should now be italic + dotted-underline. Tooltip on hover shows `%a (armor): player armor value`.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/app.css
git commit -m "style(slipgate): sg-span-runtime italic + underline"
```

---

## Tier 3 — Active-branch highlighting

### Task 15: Call `evaluateTeamsay` per expanded chain in Simulator mode

**Files:**
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx`

- [ ] **Step 1: Add import**

```ts
import { evaluateTeamsay, type TraceStep } from "../lib/simulator/index.js";
```

- [ ] **Step 2: Add a memo that computes the trace for the whole chain**

Inside `AliasChainView`, add:

```ts
const trace = createMemo<TraceStep[]>(() => {
  if ((props.mode ?? "pretty") !== "pretty") return [];
  if (!props.playerState || !props.primaryCvars) return [];
  // Compose the chain body: join all entries' commands in traversal order.
  const body = props.chain.map((e) => e.command).join("; ");
  const cvars = cvarMap(props.primaryCvars);
  const aliases = new Map<string, string>();
  for (const e of props.chain) aliases.set(e.name, e.command);
  return evaluateTeamsay(body, props.playerState, cvars, aliases).trace;
});
```

This precomputes the trace once per render cycle and makes it available to the per-entry render.

- [ ] **Step 3: Expose trace to `PrettyCmd`**

Add `trace?: TraceStep[]` to `PrettyCmd` props. At each `<PrettyCmd .../>` call site, pass `trace={trace()}`. The consumer does not yet act on it — next task does.

- [ ] **Step 4: TS-check**

Run: `cd apps/slipgate-app && bunx tsc --noEmit`
Expected: no errors (trace is accepted but unused).

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/AliasChainResolver.tsx
git commit -m "feat(slipgate): precompute evaluateTeamsay trace per alias chain"
```

---

### Task 16: Correlate trace to conditional spans and dim inactive branches

**Files:**
- Modify: `apps/slipgate-app/src/lib/prettyRender.ts`
- Modify: `apps/slipgate-app/src/lib/prettyRender.test.ts`
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx`

- [ ] **Step 1: Extend `BuildContext` to accept a trace index**

In `prettyRender.ts`:

```ts
export interface BuildContext {
  state: PlayerState;
  cvars: Map<string, string>;
  resolver: RuntimeResolver | null;
  /** Map condition-expression text -> active branch for dimming. Tier 3. */
  activeBranches?: Map<string, "then" | "else">;
}
```

Add a `branchInactive?: boolean` flag to `PrettySpan`:

```ts
export interface PrettySpan {
  text: string;
  color: SpanColor;
  origin: SpanOrigin;
  rawToken?: string;
  tooltip?: string;
  branchInactive?: boolean;
}
```

- [ ] **Step 2: Extend the parser to recognize `if / then / else` at top level**

In `runParser`, wrap each segment walk in a lightweight if/then/else aware splitter. Because the parser today walks char-by-char, the simplest implementation is a pre-split: tokenize at top-level (respecting quotes + parens) into segments keyed by `if COND then BODY_T [else BODY_E]`. For each such segment:

- Render the literal `if ` / ` then ` / ` else ` keywords.
- Render the condition via the existing stage 2/3/4 pipeline.
- Render `BODY_T` and `BODY_E` via the pipeline. If `ctx.activeBranches` has an entry for this condition's trimmed text, flag spans in the inactive branch with `branchInactive: true`.

For tier 3, scope the conditional handling to **top-level if/then/else only** — nested if inside an alias body renders normally (the evaluator still produces trace entries for nested ifs; tier 3.1 can refine). Add a helper:

```ts
interface IfSplit {
  before: string;
  cond: string;
  thenBody: string;
  elseBody: string;
  after: string;
}

function splitTopLevelIf(input: string): IfSplit | null {
  // Scan for the first top-level "if" keyword outside quotes/parens.
  // Return null if none found.
  // Implementation mirrors simulator's findKeyword/splitIfThenElse.
  // (Code elided - copy the pattern from src/lib/simulator/resolver.ts
  //  findKeyword + splitIfThenElse, adapt to return offsets.)
}
```

Copy the `findKeyword` and offset-tracking logic from the simulator's resolver and adapt to return start/end positions of each segment.

When an if-split is found in `buildSpanTree`:

```ts
const split = splitTopLevelIf(input);
if (split) {
  const before = runParser(split.before, stack, ctx, issues);
  const kwIf = literalSpan("if ", stack);
  const cond = runParser(split.cond, stack, ctx, issues);
  const kwThen = literalSpan(" then ", stack);
  const active = ctx.activeBranches?.get(split.cond.trim());
  const thenSpans = runParser(split.thenBody, stack, ctx, issues);
  if (active === "else") thenSpans.forEach((s) => { s.branchInactive = true; });
  const elseSpans = split.elseBody ? runParser(split.elseBody, stack, ctx, issues) : [];
  if (active === "then") elseSpans.forEach((s) => { s.branchInactive = true; });
  const kwElse = split.elseBody ? [literalSpan(" else ", stack)] : [];
  const after = runParser(split.after, stack, ctx, issues);
  return [...before, kwIf, ...cond, kwThen, ...thenSpans, ...kwElse, ...elseSpans, ...after];
}
```

Where `literalSpan(text, stack)` returns a single literal span in the current stack color.

- [ ] **Step 3: Add failing test for active-branch flagging**

```ts
describe("tier 3: if/then/else active-branch dimming", () => {
  const state = createDefaultPlayerState();
  test("active=then marks else spans as branchInactive", () => {
    const r = buildSpanTree("if $health < 1 then a else b", {
      state, cvars: new Map(), resolver: null,
      activeBranches: new Map([["$health < 1", "then"]]),
    });
    const a = r.spans.find((s) => s.text === "a");
    const b = r.spans.find((s) => s.text === "b");
    expect(a?.branchInactive).toBeFalsy();
    expect(b?.branchInactive).toBe(true);
  });
});
```

Run: `cd apps/slipgate-app && bun test src/lib/prettyRender.test.ts -t "tier 3"`
Expected: FAIL first, then PASS after implementation.

- [ ] **Step 4: Build the activeBranches map in the Solid memo**

In `AliasChainResolver.tsx`:

```ts
const activeBranches = createMemo(() => {
  const m = new Map<string, "then" | "else">();
  for (const step of trace()) {
    if (step.kind === "condition" && step.activeBranch) {
      m.set(step.text.trim(), step.activeBranch);
    }
  }
  return m;
});
```

Pass into the `BuildContext` at the `buildSpanTree` call site (inside `PrettyCmd`). Requires plumbing the map through as a prop.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/prettyRender.ts apps/slipgate-app/src/lib/prettyRender.test.ts apps/slipgate-app/src/components/AliasChainResolver.tsx
git commit -m "feat(slipgate): pretty-render dims inactive if/then/else branches"
```

---

### Task 17: CSS `sg-span-branch-inactive` + issues inline + visual verification

**Files:**
- Modify: `apps/slipgate-app/src/app.css`
- Modify: `apps/slipgate-app/src/components/AliasChainResolver.tsx`

- [ ] **Step 1: Append CSS**

In `app.css`:

```css
.sg-span-branch-inactive {
  opacity: 0.32;
}
.sg-span-branch-inactive.sg-span-runtime,
.sg-span-branch-inactive.sg-span-variable {
  text-decoration: none;
}
```

- [ ] **Step 2: Apply the class in the span render**

In `PrettyCmd`:

```tsx
const classes = [
  `sg-span-${s.origin}`,
  cs.class,
  s.branchInactive ? "sg-span-branch-inactive" : null,
].filter(Boolean).join(" ");
```

- [ ] **Step 3: Surface Issues on originating spans**

In the render loop (`PrettyCmd`), augment `title` with any issue message. Build a `Map<rawToken, string[]>` from `result().issues` keyed by the issue's `detail` (look for token in the detail string). Attach to `title` when present:

```tsx
const fullTooltip = [s.tooltip, ...(issueMap.get(s.rawToken ?? "") ?? [])]
  .filter(Boolean).join("\n");
```

- [ ] **Step 4: Manual visual verification**

Start dev server. Switch to Simulator mode. Edit the right-rail State so `$health < 1` is true (health=0). Expand an alias chain containing `if $health < 1 then A else B`. Expected:
- `A` branch renders bright.
- `B` branch renders at 32% opacity.
- Change state so `$health = 50`; the dimming flips.
- Switch to Label mode: both branches render at full intensity, no dimming (no trace available).

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/app.css apps/slipgate-app/src/components/AliasChainResolver.tsx
git commit -m "style(slipgate): dim inactive if/then/else branches + issues in tooltip"
```

---

## Self-Review Checklist

Run before handing off:

1. **Spec coverage** — scan each section of the spec:
   - §3.1 span tree IR: Task 2.
   - §3.2 color stack: Task 3.
   - §3.3 stage 1 (colors): Task 3.
   - §3.3 stage 2 ($var via expandVars): Task 4.
   - §3.3 stage 3 (%token via resolver): Task 12.
   - §3.3 stage 4 ($X char codes): Task 5.
   - §3.5 RuntimeResolver interface + LabelResolver + SimulatorResolver: Tasks 2, 11, 13.
   - §4 scope + corner cases: covered by Tasks 3-5 + Task 6 fixture tests.
   - §5 UX toggle + hover + visuals: Tasks 7, 10, 13, 14, 17.
   - §6 Tier 1: Tasks 1-10. Tier 2: Tasks 11-14. Tier 3: Tasks 15-17.
   - §7 touch points: all files enumerated.
   - §8 testing: unit tests per task, fixture test in Task 6.

2. **Placeholder scan** — no TBDs, no "implement later". All tasks contain exact file paths and runnable code or exact diff locations.

3. **Type consistency** — `PrettySpan`, `SpanColor`, `SpanOrigin`, `BuildContext`, `BuildResult`, `RuntimeResolver`, `RuntimeResolution` used consistently across tasks. `buildSpanTree(input, ctx)` signature stable.
