import { createMemo, For, Show } from "solid-js";
import { loadEzQuakeCommands, loadEzQuakeDefaultCommands } from "qw-config";

interface ConfigCommandsSectionProps {
  commands: Array<{ name: string; args: string; sourceFile: string }>;
  hideDefaults: boolean;
  search: string;
}

interface EnrichedCommand {
  name: string;
  args: string;
  groupId: string;
  groupName: string;
  description: string;
  isDefault: boolean;
}

interface CommandGroup {
  groupId: string;
  groupName: string;
  commands: EnrichedCommand[];
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

  const filtered = createMemo((): EnrichedCommand[] => {
    const q = props.search.trim().toLowerCase();
    return enriched().filter((c) => {
      if (props.hideDefaults && c.isDefault) return false;
      if (q) {
        const hay = `${c.name} ${c.args} ${c.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  const grouped = createMemo((): CommandGroup[] => {
    const db = loadEzQuakeCommands();
    const groupOrder = db.groups.map((g) => g.id);
    const byGroup = new Map<string, EnrichedCommand[]>();

    for (const c of filtered()) {
      const arr = byGroup.get(c.groupId) ?? [];
      arr.push(c);
      byGroup.set(c.groupId, arr);
    }

    const result: CommandGroup[] = [];
    for (const groupId of groupOrder) {
      const commands = byGroup.get(groupId);
      if (!commands || commands.length === 0) continue;
      commands.sort((a, b) => a.name.localeCompare(b.name));
      const groupName = db.groups.find((g) => g.id === groupId)?.name ?? "Miscellaneous";
      result.push({ groupId, groupName, commands });
    }
    return result;
  });

  return (
    <div>
      <div class="sg-category-group-header">Commands</div>

      {/* Column headers — matches Settings style */}
      <div
        class="grid py-1 border-b border-[var(--sg-stat-border)] flex-shrink-0 text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]"
        style={{ "grid-template-columns": "320px 1fr" }}
      >
        <span class="pl-12 pr-4">Command</span>
        <span class="px-3">Arguments</span>
      </div>

      <Show
        when={filtered().length > 0}
        fallback={
          <div class="flex items-center justify-center h-12 text-xs text-[var(--sg-section-label)]">
            No commands match the current filters
          </div>
        }
      >
        <For each={grouped()}>
          {(group) => (
            <>
              <div class="sg-subgroup-header">{group.groupName}</div>
              <For each={group.commands}>
                {(cmd) => (
                  <div
                    class="grid text-sm border-b border-[var(--sg-stat-border)] hover:bg-[color-mix(in_oklch,var(--sg-stat-border)_20%,transparent)]"
                    style={{ "grid-template-columns": "320px 1fr" }}
                    title={cmd.description}
                  >
                    <span class="pl-12 pr-4 py-1.5 font-mono truncate text-[var(--sg-section-label)]">
                      {cmd.name}
                    </span>
                    <span class="px-3 py-1.5 font-mono truncate text-[var(--sg-text-bright)]">
                      <Show when={cmd.args} fallback={
                        <span class="italic text-[var(--sg-section-label)]">(no args)</span>
                      }>
                        {cmd.args}
                      </Show>
                    </span>
                  </div>
                )}
              </For>
            </>
          )}
        </For>
      </Show>
    </div>
  );
}
