import type { ParsedConfig } from "../types.js";

// ── Token splitting ────────────────────────────────────────────────────────

/**
 * Split a line into tokens, respecting double-quoted strings.
 * Returns up to `maxTokens` tokens; remaining content is returned as the
 * last element if the line has more tokens.
 */
function tokenize(line: string, maxTokens = 3): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < line.length && tokens.length < maxTokens) {
    // Skip leading whitespace
    while (i < line.length && /\s/.test(line[i])) i++;
    if (i >= line.length) break;

    if (line[i] === '"') {
      // Quoted token — consume until closing quote
      i++; // skip opening quote
      let value = "";
      while (i < line.length && line[i] !== '"') {
        value += line[i++];
      }
      i++; // skip closing quote (or EOF)
      tokens.push(value);
    } else {
      // Unquoted token — consume until whitespace
      let value = "";
      while (i < line.length && !/\s/.test(line[i])) {
        value += line[i++];
      }
      tokens.push(value);
    }

    // If we've collected maxTokens-1 tokens and there's remaining content,
    // grab everything that's left (so quoted multi-word values work as last token)
    if (tokens.length === maxTokens - 1) {
      while (i < line.length && /\s/.test(line[i])) i++;
      if (i < line.length) {
        if (line[i] === '"') {
          i++;
          let value = "";
          while (i < line.length && line[i] !== '"') {
            value += line[i++];
          }
          tokens.push(value);
        } else {
          tokens.push(line.slice(i));
        }
        break;
      }
    }
  }

  return tokens;
}

// ── Main parser ────────────────────────────────────────────────────────────

/**
 * Parse QuakeWorld config text into structured data.
 * Handles:
 *   - `cvar "value"` and `cvar value`
 *   - `bind key "action"` (key normalized to lowercase)
 *   - `alias name "commands"`
 *   - `exec filename`
 *   - `// comments` and empty lines (skipped)
 *   - Everything else goes to `unparsed`
 */
export function parseConfig(text: string): ParsedConfig {
  const cvars = new Map<string, string>();
  const binds = new Map<string, string>();
  const aliases = new Map<string, string>();
  const execs: string[] = [];
  const unparsed: string[] = [];

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (line === "" || line.startsWith("//") || line.startsWith(";")) {
      continue;
    }

    // Strip inline comment (// not inside quotes)
    // Simple approach: find // that is not inside quotes
    let effectiveLine = line;
    let inQuote = false;
    for (let i = 0; i < line.length - 1; i++) {
      if (line[i] === '"') inQuote = !inQuote;
      if (!inQuote && line[i] === '/' && line[i + 1] === '/') {
        effectiveLine = line.slice(0, i).trim();
        break;
      }
    }

    if (effectiveLine === "") continue;

    const tokens = tokenize(effectiveLine, 3);
    if (tokens.length === 0) continue;

    const command = tokens[0].toLowerCase();

    if (command === "bind") {
      // bind <key> <action>
      if (tokens.length >= 3) {
        binds.set(tokens[1].toLowerCase(), tokens[2]);
      } else if (tokens.length === 2) {
        // bind <key> with no action — ignore or treat as unbind
        binds.set(tokens[1].toLowerCase(), "");
      } else {
        unparsed.push(line);
      }
    } else if (command === "alias") {
      // alias <name> <commands>
      if (tokens.length >= 3) {
        aliases.set(tokens[1], tokens[2]);
      } else {
        unparsed.push(line);
      }
    } else if (command === "exec") {
      // exec <filename>
      if (tokens.length >= 2) {
        execs.push(tokens[1]);
      } else {
        unparsed.push(line);
      }
    } else if (tokens.length >= 2) {
      // cvar <value> — first token is cvar name, second is value
      cvars.set(tokens[0], tokens[1]);
    } else {
      unparsed.push(line);
    }
  }

  return { cvars, binds, aliases, execs, unparsed };
}
