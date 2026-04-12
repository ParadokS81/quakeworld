import { createMemo, For, Show } from "solid-js";
import { loadEzQuakeCommands, loadEzQuakeDefaultCommands } from "qw-config";
import type { CommandInvocation } from "../types";

interface ConfigCommandsSectionProps {
  commands: CommandInvocation[];
  hideDefaults: boolean;
  search: string;
  activeGroup: string | null;
}

interface EnrichedCommand {
  name: string;
  args: string;
  groupId: string;
  groupName: string;
  description: string;
  isDefault: boolean;
}

export default function ConfigCommandsSection(props: ConfigCommandsSectionProps) {
  const enriched = createMemo((): EnrichedCommand[] => {
    const db = loadEzQuakeCommands();
    const defaults = loadEzQuakeDefaultCommands();
    const result: EnrichedCommand[] = [];

    for (const ci of props.commands) {
      const info = db.commands.get(ci.name) ?? db.commands.get(ci.name.toLowerCase());
      const groupId = info?.groupId ?? "misc";
      const groupName = info?.groupName ?? "Miscellaneous";
      const isDefault = defaults.has(`${ci.name}||${ci.args}`);

      result.push({
        name: ci.name,
        args: ci.args,
        groupId,
        groupName,
        description: info?.description ?? "",
        isDefault,
      });
    }

    return result;
  });

  const filtered = createMemo(() => {
    const q = props.search.trim().toLowerCase();
    return enriched().filter((c) => {
      if (props.hideDefaults && c.isDefault) return false;
      if (props.activeGroup && c.groupId !== props.activeGroup) return false;
      if (q) {
        const hay = `${c.name} ${c.args} ${c.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  return (
    <div>
      <div class="sg-category-group-header">Commands</div>

      <div class="sg-cv-command-row text-[11px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
        <span>Command</span>
        <span>Arguments</span>
        <span>Group</span>
      </div>

      <Show
        when={filtered().length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No commands match the current filters
          </div>
        }
      >
        <For each={filtered()}>
          {(cmd) => (
            <div class="sg-cv-command-row" title={cmd.description}>
              <span class="font-mono text-xs text-[var(--sg-text-bright)] font-semibold">
                {cmd.name}
              </span>
              <span class="font-mono text-xs text-[var(--sg-text-dim)] truncate">
                <Show when={cmd.args} fallback={<span class="italic">(no args)</span>}>
                  {cmd.args}
                </Show>
              </span>
              <span class="text-[11px] text-[var(--sg-section-label)] uppercase tracking-wide">
                {cmd.groupName}
                <Show when={cmd.isDefault}>
                  <span class="ml-2 text-[10px] px-1 rounded bg-[var(--sg-stat-border)] text-[var(--sg-text-dim)]">default</span>
                </Show>
              </span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
