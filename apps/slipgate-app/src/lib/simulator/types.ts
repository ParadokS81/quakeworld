export type Weapon = "axe" | "sg" | "ssg" | "ng" | "sng" | "gl" | "rl" | "lg";
export type Powerup = "quad" | "pent" | "ring" | "biosuit";
export type ArmorClass = "ga" | "ya" | "ra" | "none";
export type MatchStatus = "standby" | "countdown" | "live" | "overtime" | "ended";
export type LedColor = "none" | "green" | "red" | "yellow";

export interface PlayerState {
  // Vitals
  health: number;
  armor: number;
  armorClass: ArmorClass;

  // Weapons
  ownedWeapons: Set<Weapon>;
  currentWeapon: Weapon;

  // Ammo
  shells: number;
  nails: number;
  rockets: number;
  cells: number;

  // Powerups
  activePowerups: Set<Powerup>;
  powerupTimers: Partial<Record<Powerup, number>>;

  // Location and map
  location: string;
  mapname: string;
  lastloc: string;
  deathloc: string;

  // Match
  matchname: string;
  matchstatus: MatchStatus;
  matchtype: string;

  // LEDs and pointing
  ledpoint: LedColor;
  ledstatus: LedColor;
  point: string;
  pointloc: string;
  pointatloc: string;

  // Recent events
  took: string;
  tookloc: string;
  tookatloc: string;
  droploc: string;
  droptime: number;
  lastpowerup: string;
}

export type IssueKind =
  | "unresolved-var"
  | "missing-alias"
  | "malformed-condition"
  | "unknown-operator"
  | "unsupported-regex"
  | "depth-cap-reached"
  | "side-effect-skipped";

export interface Issue {
  kind: IssueKind;
  detail: string;
  location?: string;
}

export interface TraceStep {
  kind: "condition" | "alias-follow" | "skip-side-effect" | "leaf";
  text: string;
  detail?: string;
  result?: boolean;
  activeBranch?: "then" | "else";
  issues?: Issue[];
}

export interface EvaluateTeamsayResult {
  output: string;
  trace: TraceStep[];
  issues: Issue[];
}
