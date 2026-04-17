/** Ported from src-tauri/src/commands/ezquake.rs:432-467 `expand_dollar_code`. */
const DOLLAR_CODES: Record<string, number> = {
  "\\": 0x0D, ":": 0x0A,
  "[": 0x10, "]": 0x11,
  "0": 0x12, "1": 0x13, "2": 0x14, "3": 0x15, "4": 0x16,
  "5": 0x17, "6": 0x18, "7": 0x19, "8": 0x1A, "9": 0x1B,
  ",": 0x1C, ".": 0x9C,
  "<": 0x1D, "-": 0x1E, ">": 0x1F,
  "(": 0x80, "=": 0x81, ")": 0x82, "a": 0x83,
  "W": 0x84, "G": 0x86, "R": 0x87, "Y": 0x88, "B": 0x89,
  "b": 0x8B, "c": 0x8D, "d": 0x8D,
  "$": 0x24, "^": 0x5E,
};

export function expandDollarCode(ch: string): number | null {
  return DOLLAR_CODES[ch] ?? null;
}

/** Ported from src-tauri/src/commands/ezquake.rs:471-513 `qw_byte_to_char`. */
export function qwByteToChar(byte: number): string {
  const base = byte & 0x7F;
  switch (base) {
    case 0x00: case 0x01: case 0x02: case 0x03: case 0x04:
    case 0x06: case 0x07: case 0x08: case 0x09: case 0x0A:
    case 0x0B: case 0x0C: case 0x0D: case 0x0F: case 0x7F:
      return " ";
    case 0x05: return "\u2022"; // bullet
    case 0x0E: return "\u00B7"; // middle dot
    case 0x10: return "[";
    case 0x11: return "]";
    case 0x12: return "0";
    case 0x13: return "1";
    case 0x14: return "2";
    case 0x15: return "3";
    case 0x16: return "4";
    case 0x17: return "5";
    case 0x18: return "6";
    case 0x19: return "7";
    case 0x1A: return "8";
    case 0x1B: return "9";
    case 0x1C: return "\u2022"; // bullet dot
    case 0x1D: return "\u2039"; // small left bracket
    case 0x1E: return "\u2014"; // em dash
    case 0x1F: return "\u203A"; // small right bracket
    default:
      return base >= 0x20 && base <= 0x7E ? String.fromCharCode(base) : " ";
  }
}

/** Ported from src-tauri/src/commands/ezquake.rs:516-523 `qw_byte_color`. */
export type QwColorClass = "w" | "g" | "b";

export function qwByteColor(byte: number): QwColorClass {
  // Gold range: bracket+digit glyphs (0x10-0x1B) and their high-bit variants (0x90-0x9B)
  if ((byte >= 0x10 && byte <= 0x1B) || (byte >= 0x90 && byte <= 0x9B)) return "g";
  if (byte >= 0x80) return "b";
  return "w";
}
