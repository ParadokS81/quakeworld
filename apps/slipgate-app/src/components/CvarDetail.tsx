import { Show, For } from "solid-js";
import { findEquivalent } from "qw-config";
import type { CvarInfo } from "qw-config";

interface CvarDetailProps {
  name: string;
  value: string;
  info: CvarInfo | undefined;
}

export default function CvarDetail(props: CvarDetailProps) {
  const fteEquivalent = () => findEquivalent(props.name, "ezquake", "fte");
  const qwclEquivalent = () => findEquivalent(props.name, "ezquake", "qwcl");

  return (
    <div class="px-10 py-3 bg-[var(--sg-stat-bg)] border-b border-[var(--sg-stat-border)] text-sm">
      <div class="flex gap-8 flex-wrap">
        {/* Left column: description + remarks */}
        <div class="flex-1 min-w-60">
          <Show when={props.info} fallback={
            <p class="text-[var(--sg-text-dim)] italic text-xs">
              This cvar is not in the ezQuake knowledge base. It may be a custom alias or from a script.
            </p>
          }>
            <Show when={props.info!.description}>
              <p class="text-[var(--sg-text-bright)] mb-2">{props.info!.description}</p>
            </Show>
            <Show when={props.info!.remarks}>
              <p class="text-[var(--sg-text-dim)] text-xs whitespace-pre-wrap leading-relaxed">{props.info!.remarks}</p>
            </Show>
          </Show>
        </div>

        {/* Right column: metadata */}
        <div class="flex flex-col gap-1.5 text-xs min-w-44">
          {/* Type + Default + Range */}
          <Show when={props.info}>
            <div class="flex gap-2 items-center">
              <span class="text-[var(--sg-section-label)] w-16">Type</span>
              <span class="badge badge-ghost text-[10px] h-4 px-1.5">{props.info!.type}</span>
            </div>
            <Show when={props.info!.default !== undefined}>
              <div class="flex gap-2 items-center">
                <span class="text-[var(--sg-section-label)] w-16">Default</span>
                <span class="font-mono text-[var(--sg-text-dim)]">{props.info!.default}</span>
                <Show when={props.value !== props.info!.default}>
                  <span class="text-[10px] text-[var(--sg-section-label)]">(you: {props.value})</span>
                </Show>
              </div>
            </Show>
            <Show when={props.info!.range}>
              <div class="flex gap-2 items-center">
                <span class="text-[var(--sg-section-label)] w-16">Range</span>
                <span class="font-mono text-[var(--sg-text-dim)]">
                  {props.info!.range!.min} – {props.info!.range!.max}
                </span>
              </div>
            </Show>
            <div class="flex gap-2 items-center">
              <span class="text-[var(--sg-section-label)] w-16">Category</span>
              <span class="text-[var(--sg-text-dim)]">{props.info!.category} › {props.info!.group}</span>
            </div>
          </Show>

          {/* Cross-client equivalents */}
          <div class="mt-1 pt-1.5 border-t border-[var(--sg-stat-border)]">
            <div class="flex gap-2 items-center">
              <span class="text-[var(--sg-section-label)] w-16">FTE</span>
              <Show when={fteEquivalent()} fallback={
                <span class="text-[var(--sg-section-label)] italic">no equivalent</span>
              }>
                <span class="font-mono text-[var(--sg-text-dim)]">{fteEquivalent()}</span>
              </Show>
            </div>
            <div class="flex gap-2 items-center mt-1">
              <span class="text-[var(--sg-section-label)] w-16">QWCL</span>
              <Show when={qwclEquivalent()} fallback={
                <span class="text-[var(--sg-section-label)] italic">no equivalent</span>
              }>
                <span class="font-mono text-[var(--sg-text-dim)]">{qwclEquivalent()}</span>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* Enum values table */}
      <Show when={props.info?.values && props.info!.values!.length > 0}>
        <div class="mt-3 pt-2 border-t border-[var(--sg-stat-border)]">
          <p class="text-[var(--sg-section-label)] text-xs font-semibold uppercase tracking-wide mb-1.5">Values</p>
          <div class="flex flex-col gap-0.5">
            <For each={props.info!.values}>
              {(v) => (
                <div class="flex gap-3 text-xs">
                  <span
                    class={`font-mono w-8 flex-shrink-0 ${props.value === v.name ? "text-[var(--color-primary)] font-bold" : "text-[var(--sg-text-dim)]"}`}
                  >
                    {v.name}
                    {props.value === v.name ? " ✓" : ""}
                  </span>
                  <span class="text-[var(--sg-text-dim)]">{v.description}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
