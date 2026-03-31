import type {
  ParsedConfig,
  ClientId,
  ConversionReport,
  ConvertedCvar,
} from "../types.js";
import type { ConversionResult } from "./converter.js";
import { lookupCvar } from "../loaders/index.js";

// ── Report generator ───────────────────────────────────────────────────────

/**
 * Map a ConversionResult to a typed ConversionReport.
 * Enriches each cvar entry with description and category from the knowledge base.
 * Calculates coverage percentage: (transferred + mapped) / total cvars.
 */
export function generateReport(
  result: ConversionResult,
  sourceParsed: ParsedConfig,
  sourceClient: ClientId,
  targetClient: ClientId
): ConversionReport {
  const transferred: ConvertedCvar[] = result.transferred.map(({ cvar, value }) => {
    const info = lookupCvar(cvar, sourceClient) ?? lookupCvar(cvar);
    return {
      sourceCvar: cvar,
      sourceValue: value,
      targetCvar: cvar,
      targetValue: value,
      status: "transferred",
      description: info?.description ?? "",
      category: info?.category ?? "Other",
    };
  });

  const mapped: ConvertedCvar[] = result.mapped.map(({ sourceCvar, targetCvar, value, note }) => {
    const info = lookupCvar(sourceCvar, sourceClient) ?? lookupCvar(sourceCvar);
    return {
      sourceCvar,
      sourceValue: value,
      targetCvar,
      targetValue: value,
      status: "mapped",
      description: info?.description ?? "",
      category: info?.category ?? "Other",
      note,
    };
  });

  const noEquivalent: ConvertedCvar[] = result.noEquivalent.map(({ cvar, value }) => {
    const info = lookupCvar(cvar, sourceClient) ?? lookupCvar(cvar);
    return {
      sourceCvar: cvar,
      sourceValue: value,
      status: "no_equivalent",
      description: info?.description ?? "",
      category: info?.category ?? "Other",
    };
  });

  const totalCvars = sourceParsed.cvars.size;
  const covered = transferred.length + mapped.length;
  const coverage = totalCvars > 0 ? Math.round((covered / totalCvars) * 100) : 100;

  return {
    sourceClient,
    targetClient,
    transferred,
    mapped,
    noEquivalent,
    bindsKept: result.targetBinds.size,
    bindsTotal: sourceParsed.binds.size,
    coverage,
  };
}
