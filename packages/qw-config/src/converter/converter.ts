import type { ParsedConfig, ClientId } from "../types.js";
import { loadDatabase } from "../loaders/index.js";

// ── Exported types ─────────────────────────────────────────────────────────

export interface ConversionResult {
  targetCvars: Map<string, string>;
  targetBinds: Map<string, string>;
  transferred: Array<{ cvar: string; value: string }>;
  mapped: Array<{ sourceCvar: string; targetCvar: string; value: string; note?: string }>;
  noEquivalent: Array<{ cvar: string; value: string }>;
}

// ── Converter ──────────────────────────────────────────────────────────────

/**
 * Convert a parsed config from one QW client format to another.
 *
 * For each source cvar:
 *   1. If the target client has a cvar of the same name → transferred
 *   2. If a mapping links source cvar to a different-named target cvar → mapped
 *   3. Otherwise → noEquivalent
 *
 * Binds carry over as-is (same syntax across all QW clients).
 */
export function convertConfig(
  parsed: ParsedConfig,
  sourceClient: ClientId,
  targetClient: ClientId
): ConversionResult {
  const db = loadDatabase();
  const targetClientMap = db.clients[targetClient];

  const targetCvars = new Map<string, string>();
  const transferred: ConversionResult["transferred"] = [];
  const mapped: ConversionResult["mapped"] = [];
  const noEquivalent: ConversionResult["noEquivalent"] = [];

  for (const [cvarName, value] of parsed.cvars.entries()) {
    // 1. Same name exists in target client
    if (targetClientMap.has(cvarName)) {
      transferred.push({ cvar: cvarName, value });
      targetCvars.set(cvarName, value);
      continue;
    }

    // 2. Look for a cross-client mapping
    const mapping = db.mappings.find(
      (m) =>
        m.clients[sourceClient] === cvarName &&
        m.clients[targetClient] !== undefined
    );

    if (mapping) {
      const targetCvar = mapping.clients[targetClient]!;
      mapped.push({ sourceCvar: cvarName, targetCvar, value, note: mapping.note });
      targetCvars.set(targetCvar, value);
      continue;
    }

    // 3. No equivalent
    noEquivalent.push({ cvar: cvarName, value });
  }

  // Binds carry over unchanged
  const targetBinds = new Map(parsed.binds);

  return { targetCvars, targetBinds, transferred, mapped, noEquivalent };
}
