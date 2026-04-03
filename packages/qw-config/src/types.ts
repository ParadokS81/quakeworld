// ── Client identifiers ──

export type ClientId = "ezquake" | "fte" | "qwcl";

// ── Cvar knowledge base types ──

export interface CvarInfo {
  /** Client-native cvar name, e.g. "gl_picmip" */
  name: string;
  /** One-line description */
  description: string;
  /** Detailed remarks/notes (optional, may contain newlines) */
  remarks?: string;
  /** Value type */
  type: "boolean" | "integer" | "float" | "string" | "enum";
  /** Default value as string */
  default?: string;
  /** Valid range for numeric types */
  range?: { min: number; max: number };
  /** Possible values for boolean/enum types */
  values?: CvarEnumValue[];
  /** Category group, e.g. "Graphics" */
  category: string;
  /** Specific sub-group, e.g. "Crosshair Settings" */
  group: string;
  /** Which client this info comes from */
  client: ClientId;
  /** True if defined in sv_*.c (server-only cvar) */
  serverOnly?: boolean;
  /** False if only in help docs, not in current source code */
  inSource?: boolean;
}

export interface CvarEnumValue {
  name: string;
  description: string;
}

// ── Parsed config types ──

export interface ParsedConfig {
  /** All cvar assignments: name → value */
  cvars: Map<string, string>;
  /** All key bindings: key → action string */
  binds: Map<string, string>;
  /** All aliases: name → command string */
  aliases: Map<string, string>;
  /** Exec references found */
  execs: string[];
  /** Lines that couldn't be parsed */
  unparsed: string[];
}

// ── Agnostic config representation ──

export interface AgnosticCvar {
  /** Canonical ID, e.g. "input.sensitivity" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Dotted category path, e.g. "graphics.textures" */
  category: string;
  /** Value type */
  type: "boolean" | "integer" | "float" | "string" | "enum";
  /** Valid range for numeric types */
  range?: { min: number; max: number };
  /** Possible values for enum types */
  values?: CvarEnumValue[];
  /** Per-client info */
  clients: Partial<Record<ClientId, ClientCvar>>;
}

export interface ClientCvar {
  /** The actual cvar name in this client */
  cvar: string;
  /** Default value */
  default: string;
  /** Client-specific description if different */
  description?: string;
  /** Client-specific remarks */
  remarks?: string;
  /** Whether this client has deprecated this cvar */
  deprecated?: boolean;
}

// ── Conversion types ──

export type ConversionStatus = "transferred" | "mapped" | "no_equivalent";

export interface ConvertedCvar {
  /** Source cvar name */
  sourceCvar: string;
  /** Source value */
  sourceValue: string;
  /** Target cvar name (if transferred or mapped) */
  targetCvar?: string;
  /** Target value (may differ if value mapping needed) */
  targetValue?: string;
  /** Conversion status */
  status: ConversionStatus;
  /** Description of what this cvar does */
  description: string;
  /** Category for grouping */
  category: string;
  /** Note explaining the mapping or why there's no equivalent */
  note?: string;
}

export interface ConversionReport {
  /** Source client */
  sourceClient: ClientId;
  /** Target client */
  targetClient: ClientId;
  /** Successfully transferred (same name) */
  transferred: ConvertedCvar[];
  /** Mapped to different name */
  mapped: ConvertedCvar[];
  /** No equivalent in target */
  noEquivalent: ConvertedCvar[];
  /** Binds that transferred */
  bindsKept: number;
  /** Total binds in source */
  bindsTotal: number;
  /** Coverage percentage */
  coverage: number;
}

// ── Cvar database ──

export interface CvarDatabase {
  /** All known cvars indexed by client and cvar name */
  clients: Record<ClientId, Map<string, CvarInfo>>;
  /** Cross-client mappings: source client+cvar → target client+cvar */
  mappings: CvarMapping[];
  /** Category hierarchy */
  categories: CategoryGroup[];
}

export interface CvarMapping {
  /** Agnostic ID linking equivalent cvars */
  id: string;
  /** Per-client cvar name */
  clients: Partial<Record<ClientId, string>>;
  /** Optional note about differences */
  note?: string;
}

export interface CategoryGroup {
  /** Major group name, e.g. "Graphics" */
  name: string;
  /** Sub-groups */
  groups: string[];
}
