export type {
  ClientId,
  CvarInfo,
  CvarEnumValue,
  ParsedConfig,
  AgnosticCvar,
  ClientCvar,
  ConversionStatus,
  ConvertedCvar,
  ConversionReport,
  CvarDatabase,
  CvarMapping,
  CategoryGroup,
} from "./types.js";

export { loadDatabase, lookupCvar, findEquivalent } from "./loaders/index.js";
export { loadEzQuakeCvars, getEzQuakeCategories } from "./loaders/ezquake.js";
export { loadDomainTags, getCvarDomains } from "./loaders/domains.js";
export { loadFteCvars } from "./loaders/fte.js";
export { loadQwclCvars } from "./loaders/qwcl.js";
export { parseConfig } from "./parser/config-parser.js";
export { convertConfig } from "./converter/converter.js";
export type { ConversionResult } from "./converter/converter.js";
export { generateReport } from "./converter/report.js";
export { writeFteConfig } from "./writers/fte.js";
export { writeEzQuakeConfig } from "./writers/ezquake.js";
