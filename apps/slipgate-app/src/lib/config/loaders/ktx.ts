import ktxCommandsData from "../data/ktx-commands.json" with { type: "json" };
import type { KtxCommandDatabase, KtxCommandInfo } from "../types.js";

interface RawKtxCommand {
  desc: string;
}

interface RawKtxData {
  commands: Record<string, RawKtxCommand>;
}

let _cache: KtxCommandDatabase | null = null;

export function loadKtxCommands(): KtxCommandDatabase {
  if (_cache) return _cache;

  const raw = ktxCommandsData as unknown as RawKtxData;
  const commands = new Map<string, KtxCommandInfo>();
  for (const [name, entry] of Object.entries(raw.commands)) {
    commands.set(name, {
      name,
      description: entry.desc,
    });
  }

  _cache = { commands };
  return _cache;
}
