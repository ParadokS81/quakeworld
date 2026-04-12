import { createMemo, For, Show } from "solid-js";
import { loadEzQuakeCommands, loadEzQuakeDefaultCommands } from "qw-config";

interface ConfigCommandsSectionProps {
  commands: Array<{ name: string; args: string; sourceFile: string }>;
  hideDefaults: boolean;
  search: string;
  activeGroup: string | null;
  onSelectGroup: (groupId: string | null) => void;
}

interface EnrichedCommand {
  name: string;
  args: string;
  sourceFile: string;
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
        sourceFile: ci.sourceFile,
        groupId,
        groupName,
        description: info?.description ?? "",
        isDefault,
      });
    }

    return result;
  });

  // Groups present in current data, in spec order
  const groupsPresent = createMemo(() => {
    const db = loadEzQuakeCommands();
    const present = new Set<string>();
    for (const c of enriched()) {
      present.add(c.groupId);
    }
    return db.groups.filter((g) => present.has(g.id));
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

      {/* Group filter pills */}
      <Show when={groupsPresent().length > 0}>
        <div class="flex flex-wrap gap-1 px-3 py-2 border-b border-[var(--sg-stat-border)]">
          <For each={groupsPresent()}>
            {(group) => (
              <button
                class="sg-pill-toggle-opt rounded"
                classList={{ "sg-pill-toggle-active": props.activeGroup === group.id }}
                onClick={() => props.onSelectGroup(props.activeGroup === group.id ? null : group.id)}
              >
                {group.name}
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class="sg-cv-command-row text-[11px] uppercase tracking-wide text-[var(--sg-section-label)] border-b border-[var(--sg-stat-border)]">
        <span>Command</span>
        <span>Arguments</span>
        <span>Group</span>
        <span>Source</span>
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
              <span class="font-mono text-[11px] text-[var(--sg-text-dim)]">
                {cmd.sourceFile}
              </span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
