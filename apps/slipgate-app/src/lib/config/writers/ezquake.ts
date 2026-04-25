import type { ConversionResult } from "../converter/converter.js";
import { writeConfig } from "./shared.js";

/**
 * Serialize a ConversionResult to ezQuake config text.
 * Cvars and binds are sorted alphabetically.
 */
export function writeEzQuakeConfig(result: ConversionResult): string {
  return writeConfig(result, "ezQuake");
}
