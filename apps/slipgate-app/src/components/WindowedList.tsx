import { createSignal, createMemo, For, onMount } from "solid-js";

interface WindowedListProps<T> {
  items: T[];
  rowHeight: number;
  overscan: number;
  maxVisible: number;
  renderRow: (item: T, index: number) => any;
}

export default function WindowedList<T>(props: WindowedListProps<T>) {
  const [scrollTop, setScrollTop] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    if (containerRef) {
      containerRef.addEventListener("scroll", () => {
        setScrollTop(containerRef!.scrollTop);
      });
    }
  });

  const totalHeight = createMemo(() => props.items.length * props.rowHeight);
  const startIndex = createMemo(() =>
    Math.max(0, Math.floor(scrollTop() / props.rowHeight) - props.overscan),
  );
  const endIndex = createMemo(() =>
    Math.min(props.items.length, startIndex() + props.maxVisible + 2 * props.overscan),
  );
  const visible = createMemo(() => props.items.slice(startIndex(), endIndex()));

  return (
    <div ref={containerRef} style={{ "max-height": `${props.maxVisible * props.rowHeight}px`, "overflow-y": "auto" }}>
      <div style={{ height: `${totalHeight()}px`, position: "relative" }}>
        <div style={{ position: "absolute", top: `${startIndex() * props.rowHeight}px`, left: 0, right: 0 }}>
          <For each={visible()}>
            {(item, idx) => <div style={{ height: `${props.rowHeight}px` }}>{props.renderRow(item, startIndex() + idx())}</div>}
          </For>
        </div>
      </div>
    </div>
  );
}
