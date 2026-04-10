import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";

interface Section {
  label: string;
  offsetTop: number;
  height: number;
  element: HTMLElement;
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

  // Viewport indicator geometry (relative to track height = 100%)
  const viewportTopPct = () => {
    const sh = scrollHeight();
    if (sh === 0) return 0;
    return (scrollTop() / sh) * 100;
  };
  const viewportHeightPct = () => {
    const sh = scrollHeight();
    if (sh === 0) return 0;
    return (clientHeight() / sh) * 100;
  };

  return (
    <Show when={hasOverflow() && sections().length > 1}>
      <div class="sg-section-minimap">
        <div class="sg-section-minimap-track">
          {/* Track line */}
          <div class="sg-section-minimap-line" />
          {/* Section ticks + labels */}
          <For each={sections()}>
            {(section, i) => {
              const sh = () => scrollHeight();
              const topPct = () => (sh() === 0 ? 0 : (section.offsetTop / sh()) * 100);
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
          {/* Viewport indicator */}
          <div
            class="sg-section-minimap-viewport"
            style={{
              top: `${viewportTopPct()}%`,
              height: `${viewportHeightPct()}%`,
            }}
          />
        </div>
      </div>
    </Show>
  );
}
