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
export { loadFteCvars } from "./loaders/fte.js";
export { loadQwclCvars } from "./loaders/qwcl.js";
