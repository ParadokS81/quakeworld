export type {
  PlayerState, Weapon, Powerup, ArmorClass, MatchStatus, LedColor,
  Issue, IssueKind, TraceStep, EvaluateTeamsayResult,
} from "./types.js";

export { createDefaultPlayerState } from "./defaults.js";

export {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo,
} from "./derivations.js";

export { expandVars } from "./expander.js";
export type { ExpandResult } from "./expander.js";

export { tokenize, evaluateExpression } from "./evaluator.js";
export type { Token } from "./evaluator.js";

export { applyOnloadChain } from "./onload.js";

export {
  createSimulatorResolver,
  evaluateCondition,
  evaluateTeamsay,
} from "./resolver.js";
export type {
  RuntimeResolver, RuntimeResolution, ConditionResult,
} from "./resolver.js";
