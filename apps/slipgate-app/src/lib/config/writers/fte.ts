import type { ConversionResult } from "../converter/converter.js";
import { writeConfig } from "./shared.js";

/**
 * Serialize a ConversionResult to FTE config text.
 * Cvars and binds are sorted alphabetically.
 */
export function writeFteConfig(result: ConversionResult): string {
  return writeConfig(result, "FTE");
}
