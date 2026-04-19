import { createSignal, createEffect, createMemo, onCleanup, For, Show } from "solid-js";

interface Section {
  label: string;
  offsetTop: number;
  height: number;
  element: HTMLElement;
}

// Minimum vertical gap between adjacent section labels, as a fraction of
// the track height. Below this the labels start colliding and become
// unreadable. Also drives the minimum display extent of any section.
const MIN_GAP = 0.045;

// Piecewise-linear remap from raw scroll fractions to displayed minimap
// fractions. Enforces MIN_GAP between adjacent section markers so the
// small sections stay clickable when one section (HUD) dominates the
// content height. Returns matched `nat` (natural fractions) and `dis`
// (displayed fractions) arrays — callers remap scroll ↔ minimap through
// both arrays.
function computeMapping(sections: Section[], scrollHeight: number) {
  const N = sections.length;
  if (N === 0 || scrollHeight === 0) return { nat: [] as number[], dis: [] as number[] };
  const nat = sections.map((s) => Math.min(1, s.offsetTop / scrollHeight));
  const dis = new Array<number>(N);
  dis[0] = nat[0];
  for (let i = 1; i < N; i++) {
    dis[i] = Math.max(nat[i], dis[i - 1] + MIN_GAP);
  }
  // If the cascade pushed past the track, compress uniformly then re-pass
  // to guarantee gaps still hold under the scale.
  const ceiling = 1 - MIN_GAP;
  if (dis[N - 1] > ceiling) {
    const scale = ceiling / dis[N - 1];
    for (let i = 0; i < N; i++) dis[i] *= scale;
    for (let i = 1; i < N; i++) {
      dis[i] = Math.max(dis[i], dis[i - 1] + MIN_GAP);
    }
  }
  return { nat, dis };
}

// Natural scroll fraction → displayed minimap fraction.
function natToDisplay(natFrac: number, nat: number[], dis: number[]): number {
  if (nat.length === 0) return 0;
  if (natFrac <= nat[0]) {
    return nat[0] > 0 ? (natFrac / nat[0]) * dis[0] : dis[0];
  }
  for (let i = 0; i < nat.length - 1; i++) {
    if (natFrac < nat[i + 1]) {
      const span = Math.max(nat[i + 1] - nat[i], 1e-9);
      const f = (natFrac - nat[i]) / span;
      return dis[i] + f * (dis[i + 1] - dis[i]);
    }
  }
  const last = nat.length - 1;
  const span = Math.max(1 - nat[last], 1e-9);
  const f = (natFrac - nat[last]) / span;
  return dis[last] + f * (1 - dis[last]);
}

// Displayed minimap fraction → natural scroll fraction. Used by
// drag-to-scroll so the thumb stays under the cursor through the
// non-uniform mapping.
function displayToNat(disFrac: number, nat: number[], dis: number[]): number {
  if (nat.length === 0) return 0;
  if (disFrac <= dis[0]) {
    return dis[0] > 0 ? (disFrac / dis[0]) * nat[0] : nat[0];
  }
  for (let i = 0; i < nat.length - 1; i++) {
    if (disFrac < dis[i + 1]) {
      const span = Math.max(dis[i + 1] - dis[i], 1e-9);
      const f = (disFrac - dis[i]) / span;
      return nat[i] + f * (nat[i + 1] - nat[i]);
    }
  }
  const last = nat.length - 1;
  const span = Math.max(1 - dis[last], 1e-9);
  const f = (disFrac - dis[last]) / span;
  return nat[last] + f * (1 - nat[last]);
}

interface SectionMinimapProps {
  scrollContainer: () => HTMLDivElement | undefined;
}

/**
 * Scroll minimap for the config viewer content area.
 * Renders a thin vertical track with labeled ticks at each section header.
 * - Visible only when the scroll container has overflow
 * - Click a label or tick to smooth-scroll to that section
 * - Viewport indicator moves as the user scrolls
 * - The section whose range overlaps the current scroll top gets highlighted
 */
export default function SectionMinimap(props: SectionMinimapProps) {
  const [sections, setSections] = createSignal<Section[]>([]);
  const [scrollTop, setScrollTop] = createSignal(0);
  const [scrollHeight, setScrollHeight] = createSignal(0);
  const [clientHeight, setClientHeight] = createSignal(0);
  let trackEl: HTMLDivElement | undefined;

  // Recompute section positions + overflow on scroll/resize/content change
  function recomputeSections() {
    const container = props.scrollContainer();
    if (!container) {
      setSections([]);
      return;
    }
    const headers = container.querySelectorAll<HTMLElement>(".sg-category-group-header");
    const next: Section[] = [];
    headers.forEach((el) => {
      // textContent includes any child spans (like counters); take just the first text node
      const firstText = Array.from(el.childNodes)
        .find((n) => n.nodeType === Node.TEXT_NODE)?.textContent?.trim() ?? el.textContent?.trim() ?? "";
      next.push({
        label: firstText,
        offsetTop: el.offsetTop,
        height: el.offsetHeight,
        element: el,
      });
    });
    setSections(next);
    setScrollHeight(container.scrollHeight);
    setClientHeight(container.clientHeight);
  }

  function handleScroll() {
    const container = props.scrollContainer();
    if (!container) return;
    setScrollTop(container.scrollTop);
  }

  createEffect(() => {
    const container = props.scrollContainer();
    if (!container) return;

    // Initial measurement
    recomputeSections();
    setScrollTop(container.scrollTop);

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Re-measure when content mutates (filters change, sections added/removed)
    const mutationObserver = new MutationObserver(() => {
      recomputeSections();
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    // Re-measure on container resize
    const resizeObserver = new ResizeObserver(() => {
      recomputeSections();
    });
    resizeObserver.observe(container);

    onCleanup(() => {
      container.removeEventListener("scroll", handleScroll);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    });
  });

  const hasOverflow = () => scrollHeight() > clientHeight() + 4;

  function scrollToSection(section: Section) {
    const container = props.scrollContainer();
    if (!container) return;
    container.scrollTo({ top: section.offsetTop - 4, behavior: "smooth" });
  }

  // Section whose range (offsetTop .. next.offsetTop) contains the current scroll position
  const activeIndex = () => {
    const list = sections();
    const top = scrollTop() + 8; // small offset so the section "activates" just after its header
    for (let i = list.length - 1; i >= 0; i--) {
      if (top >= list[i].offsetTop) return i;
    }
    return 0;
  };

  // Shared nat→dis mapping, used for both label placement and viewport
  // thumb geometry so the thumb always lines up with the labels even when
  // section sizes are remapped to satisfy MIN_GAP.
  const mapping = createMemo(() => computeMapping(sections(), scrollHeight()));

  // Viewport indicator geometry (relative to track height = 100%)
  const viewportTopPct = () => {
    const sh = scrollHeight();
    if (sh === 0) return 0;
    const { nat, dis } = mapping();
    return natToDisplay(scrollTop() / sh, nat, dis) * 100;
  };
  const viewportHeightPct = () => {
    const sh = scrollHeight();
    if (sh === 0) return 0;
    const { nat, dis } = mapping();
    const top = natToDisplay(scrollTop() / sh, nat, dis);
    const bottom = natToDisplay(Math.min(1, (scrollTop() + clientHeight()) / sh), nat, dis);
    return Math.max(0, bottom - top) * 100;
  };

  // Drag-to-scroll on the viewport thumb. Inverts the nat↔display mapping
  // so the thumb tracks the cursor consistently even though content scroll
  // speed varies per section under the remap.
  function handleViewportMouseDown(e: MouseEvent) {
    const container = props.scrollContainer();
    if (!container || !trackEl) return;
    e.preventDefault();
    e.stopPropagation();

    const trackRect = trackEl.getBoundingClientRect();
    const trackPx = trackEl.clientHeight;
    const scrollableContentPx = container.scrollHeight - container.clientHeight;
    if (trackPx <= 0 || scrollableContentPx <= 0) return;

    const { nat, dis } = mapping();
    const startY = e.clientY;
    const startDisFrac = natToDisplay(container.scrollTop / container.scrollHeight, nat, dis);

    const onMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - startY;
      const nextDisFrac = Math.max(0, Math.min(1, startDisFrac + deltaY / trackPx));
      const nextNatFrac = displayToNat(nextDisFrac, nat, dis);
      container.scrollTop = Math.max(0, Math.min(scrollableContentPx, nextNatFrac * container.scrollHeight));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    // trackRect reserved for future clamping to track bounds; currently
    // we clamp via display fraction which is equivalent.
    void trackRect;
  }

  return (
    <div class="sg-section-minimap">
      <Show when={hasOverflow()}>
        <div class="sg-section-minimap-track" ref={trackEl}>
          <div class="sg-section-minimap-line" />
          <For each={sections()}>
            {(section, i) => {
              const topPct = () => (mapping().dis[i()] ?? 0) * 100;
              const isActive = () => activeIndex() === i();
              return (
                <button
                  type="button"
                  class="sg-section-minimap-item"
                  classList={{ "sg-section-minimap-item-active": isActive() }}
                  style={{ top: `${topPct()}%` }}
                  onClick={() => scrollToSection(section)}
                  title={section.label}
                >
                  <span class="sg-section-minimap-tick" />
                  <span class="sg-section-minimap-label">{section.label}</span>
                </button>
              );
            }}
          </For>
          <div
            class="sg-section-minimap-viewport"
            style={{
              top: `${viewportTopPct()}%`,
              height: `${viewportHeightPct()}%`,
            }}
            onMouseDown={handleViewportMouseDown}
          />
        </div>
      </Show>
    </div>
  );
}
