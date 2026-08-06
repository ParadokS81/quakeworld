// Floor 1 -- the brain. INPUT side (Task 5): section frame, seeded mesh, the
// six source stations with their traces / pads / seats / labels, the hover +
// focus reveal chains, the dormant ghosts, and the growth docks. OUTPUT side
// (Task 6): the gather point + axon, the two-way agent highway, the MCP
// gate, the YOUR AGENT node, the snapshot branch (THIS PAGE + the dormant
// SLIPGATE APP ghost), and the brainstem leading to floor 2.
//
// Source of truth is the comp (P1): docs/superpowers/specs/
// 2026-08-05-oracle-web-v1-mockup.html (v4.7). Mockup line refs below are
// how a later reader traces a value back to the contract.
//
// The mockup builds this imperatively -- one `SRC.forEach` closure per station
// appending into six sibling <g> groups. SVG has no z-index, so that group
// order IS the paint order (P7b) and is normative. The port therefore keeps
// the six groups and fans each station's parts out into the group it belongs
// to: one <For> per group rather than one loop per station. Appearance and
// document order are identical; only the source shape differs. The output
// side has no per-item loop (six fixed nodes), so it is ported as static
// JSX appended to the same groups in the comp's append order.
//
// Dumb component (P4): everything arrives via props. No network calls, no URL
// parsing, no environment reads -- App.tsx owns all three.
import { For, Show, createMemo, createSignal } from 'solid-js'
import { DESKTOP_LAYOUT } from '../generators/layout'
import type { CenterLabel, StationSource } from '../generators/layout'
import { generateMesh } from '../generators/mesh'
import type { BrainManifest, Datacenter, LitDatacenter } from '../data/manifest-types'
import type { ManifestSource } from '../data/manifest'
import DrillOverlay from './DrillOverlay'
import DatacenterCard from './DatacenterCard'
import XnCards, { XN_NAMES, type XnId } from './XnCards'
import WhyCompare from './WhyCompare'

const L = DESKTOP_LAYOUT

interface Props {
  manifest: BrainManifest
  source: ManifestSource
  /** P6: the why-comparison door is dark at rest. Task 8 wires the flag. */
  showWhyDoor?: boolean
  /** Task 9's hover-spawn seam -- fires on every chain toggle. */
  onChainHover?: (id: string, on: boolean) => void
  /** P7c: honored by the drill overlay's open/close animation. Task 9 wires
      the real `prefers-reduced-motion` read in App.tsx; defaults falsy until
      then (team brief, Task 7). */
  reduced?: boolean
}

/** One open drill card. `kind` routes to its content (Task 7 owns 'dc';
    Task 8 plugs 'xn' and 'why' in below). `originRect` is captured at click
    time so the overlay can zoom out of the element that was actually
    clicked. */
interface DrillState {
  kind: 'dc' | 'xn' | 'why'
  id: string
  originRect: DOMRect
}

/** Dialog aria-label for an open card. 'dc' uses the real manifest name;
    'why' matches the mockup's comparison fallback (line 326); 'xn' uses
    XnCards' display-name registry so the aria-label and the card's own h3
    can never say two different things. */
function drillLabel(manifest: BrainManifest, d: DrillState): string {
  if (d.kind === 'dc') {
    return manifest.datacenters.find((dc) => dc.id === d.id)?.name ?? d.id
  }
  if (d.kind === 'why') return 'comparison'
  return XN_NAMES[d.id as XnId] ?? d.id
}

/** Card body for an open drill: 'dc' renders a manifest datacenter via
    DatacenterCard, 'xn' routes to XnCards keyed by id (mcp/agent/snap/slip),
    'why' renders the (P6-dark) comparison overlay. */
function drillBody(manifest: BrainManifest, d: DrillState, onOpenConnect: (ev: MouseEvent) => void) {
  if (d.kind === 'dc') {
    const dc = manifest.datacenters.find((x) => x.id === d.id)
    return dc ? <DatacenterCard dc={dc} onOpenConnect={onOpenConnect} /> : null
  }
  if (d.kind === 'xn') {
    return <XnCards manifest={manifest} id={d.id as XnId} onOpenConnect={onOpenConnect} />
  }
  return <WhyCompare />
}

/** A layout station paired with its manifest datacenter (D4: keyed by id). */
interface Station {
  s: StationSource
  dc: Datacenter
  delay: string
}

/** Revealed line height for the center label stack (mockup 642, desktop). */
const CENTER_LINE_HEIGHT = 14

/**
 * Center-pattern label geometry (mockup 645-651): the stack grows UPWARD from
 * the trace line -- subs bottom-up, then the num, then the title on top.
 */
function centerStack(label: CenterLabel, subCount: number, lit: boolean) {
  let bottom = label.liney - 6
  const subYs: number[] = []
  for (let i = subCount - 1; i >= 0; i--) {
    subYs.unshift(bottom)
    bottom -= CENTER_LINE_HEIGHT
  }
  const numY = lit ? bottom : null
  if (lit) bottom -= 18
  return { subYs, numY, titleY: bottom - 2 }
}

/** Station reveal lines: manifest `stationSubs`, `sub` fallback, `dormant`. */
function stationSubs(dc: Datacenter): string[] {
  if (!dc.lit) return ['dormant']
  return dc.stationSubs ?? [dc.sub]
}

export default function Floor1Brain(props: Props) {
  // Chain state (mockup 680-696). A Set, not a single id: a focused station
  // and a hovered station can be revealed at once, as in the comp's
  // independent classList toggles.
  const [hotStations, setHotStations] = createSignal<ReadonlySet<string>>(new Set())
  const isHot = (id: string) => hotStations().has(id)

  const chain = (id: string, on: boolean) => {
    setHotStations((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
    props.onChainHover?.(id, on)
  }

  // Only one dock can be under the pointer, and docks take no focus (mockup
  // 714-715) -- a single index is the whole state.
  const [hotDock, setHotDock] = createSignal<number | null>(null)

  // Output-side reveal state (mockup 757-758, 771-772, 799-804). Unlike the
  // station chain(), these are hover-only in the comp -- no focus/blur, no
  // traveler spawn -- so plain booleans are enough; no need for the Set +
  // onChainHover machinery stations use.
  const [gateHot, setGateHot] = createSignal(false)
  const [agentHot, setAgentHot] = createSignal(false)
  const [snapHot, setSnapHot] = createSignal(false)

  // Card state (Task 7): a signal holding the one open drill, or null. Every
  // click and keyboard target already routes through this one function, so
  // T7 replaces the body, not the call sites. The rect is captured NOW, at
  // click time, from the element that was actually clicked (mockup 331 does
  // the same via a stored element reference; capturing the rect directly is
  // equivalent since nothing moves between click and open).
  const [drill, setDrill] = createSignal<DrillState | null>(null)
  const openCard = (kind: 'dc' | 'xn' | 'why', id: string, origin: Element) => {
    setDrill({ kind, id, originRect: origin.getBoundingClientRect() })
  }
  const closeCard = () => setDrill(null)

  // The comp zooms a station's card out of its LABEL group even when the click
  // landed on the trace's fat hit stroke (mockup 698 passes `g`, not `hit`) --
  // so the hit path needs a way back to the group it belongs to.
  const labelGroups = new Map<string, SVGGElement>()

  const openStation = (id: string, ev: Event) => {
    ev.preventDefault()
    openCard('dc', id, labelGroups.get(id) ?? (ev.currentTarget as Element))
  }
  const onStationKey = (id: string, ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') openStation(id, ev)
  }

  // Output-side nodes (gate / agent / snapshot / slipgate) have no separate
  // hit stroke, so the clicked group IS the right drill origin -- unlike
  // stations, no labelGroups lookup is needed here.
  const openOut = (id: string, ev: Event) => {
    ev.preventDefault()
    openCard('xn', id, ev.currentTarget as Element)
  }
  const onOutKey = (id: string, ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') openOut(id, ev)
  }

  // The snapshot branch DOES have a fat hit stroke (mockup 805-806, bypassing
  // the gate like the trace it covers), and the comp zooms its card out of
  // the THIS PAGE label group even when the click lands on that stroke
  // (mockup 813 passes `tp`, not the hit path) -- same shape as
  // openStation/labelGroups above, so it reuses that same map under a 'snap'
  // key rather than inventing a second origin-tracking mechanism.
  const openSnapHit = (ev: Event) => {
    ev.preventDefault()
    openCard('xn', 'snap', labelGroups.get('snap') ?? (ev.currentTarget as Element))
  }

  // D4 registry grace (Open question 4): seats and traces are hand-placed, so
  // a brand-new datacenter cannot be auto-positioned. Warn and skip -- never
  // crash. The reverse (a layout id with no manifest entry) is the
  // dock-shaped future and stays silent.
  const stations = createMemo<Station[]>(() => {
    const byId = new Map(props.manifest.datacenters.map((d) => [d.id, d] as const))
    for (const dc of props.manifest.datacenters) {
      if (!L.SEATS[dc.id] || !L.SRC.some((s) => s.id === dc.id)) {
        console.warn(
          `[oracle-web] datacenter "${dc.id}" has no floor-1 layout entry -- skipped. ` +
            'Add SEATS + SRC entries in src/generators/layout.ts.',
        )
      }
    }
    const out: Station[] = []
    L.SRC.forEach((s, i) => {
      const dc = byId.get(s.id)
      if (!dc) return
      out.push({ s, dc, delay: L.SRC_DELAY_CLASSES[i % L.SRC_DELAY_CLASSES.length] })
    })
    return out
  })

  const litStations = createMemo(() => stations().filter((st) => st.dc.lit))

  // Mesh scatter is seeded off the LIT datacenters' shares in manifest order
  // -- call order is part of the determinism contract (mesh.ts header). One
  // memo, evaluated once per manifest: the dots below are static JSX, never
  // per-dot reactive primitives (phase doc, Recovery "Jank on deploy").
  const mesh = createMemo(() =>
    generateMesh(
      props.manifest.datacenters
        .filter((d): d is LitDatacenter => d.lit && L.SEATS[d.id] !== undefined)
        .map((d) => [d.id, d.share] as const),
      L,
    ),
  )

  return (
    <>
      <div class="titleblock">
        <h1>
          THE ORACLE IS <b>AWAKE</b>
        </h1>
      </div>
      <div class="herolinks">
        {/* P6: dark at rest. With the flag it renders BEFORE connect (200-203). */}
        <Show when={props.showWhyDoor}>
          <button
            class="herolink"
            onClick={(ev) => openCard('why', 'why', ev.currentTarget)}
          >
            Why do I need this?
          </button>
        </Show>
        <button
          class="herolink go"
          onClick={(ev) => openCard('xn', 'agent', ev.currentTarget)}
        >
          connect your agent
        </button>
      </div>

      <svg
        class="main"
        id="brainSvg"
        viewBox={L.VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Oracle architecture: sources feed the brain; MCP barrier and snapshot door serve consumers; the brainstem leads to the machine room below"
      >
        <defs>
          {/* mockup 374-377 */}
          <filter id="aglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* P7b paint order (mockup 379-384): drops < traces < mesh < top < fx < hit */}

        {/* gDrops -- seat-to-gather ghost curves (mockup 633-635) */}
        <g>
          <For each={litStations()}>
            {({ s }) => {
              const seat = L.SEATS[s.id]
              return (
                <path
                  d={`M${seat.x},${seat.y} Q${(seat.x + L.GATHER.x) / 2},${seat.y + 60} ${L.GATHER.x},${L.GATHER.y - 4}`}
                  fill="none"
                  stroke="#1d3350"
                  stroke-width={1 * L.S}
                  opacity=".6"
                />
              )
            }}
          </For>
        </g>

        {/* gTrace -- source traces + pads (mockup 467-478, 624-627). Task 6
            appends the output side and the brainstem to this group. */}
        <g>
          <For each={stations()}>
            {({ s, dc, delay }) => (
              <>
                <Show
                  when={dc.lit}
                  fallback={
                    <path
                      d={s.d}
                      fill="none"
                      stroke="#1d3350"
                      stroke-width={2 * L.S}
                      stroke-dasharray="3 7"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      classList={{ hotbase: isHot(s.id) }}
                    />
                  }
                >
                  <path
                    d={s.d}
                    fill="none"
                    stroke="#2a4a74"
                    stroke-width={2 * L.S}
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    classList={{ hotbase: isHot(s.id) }}
                  />
                  <path
                    d={s.d}
                    fill="none"
                    stroke="#4aa8ff"
                    stroke-width={2.4 * L.S}
                    stroke-linecap="round"
                    filter="url(#aglow)"
                    class={`sig ${delay}`.trimEnd()}
                  />
                </Show>
                <rect
                  x={s.pad[0]}
                  y={s.pad[1]}
                  width={s.pad[2]}
                  height={s.pad[3]}
                  rx="2"
                  fill={dc.lit ? '#2a4a74' : '#1d3350'}
                />
              </>
            )}
          </For>

          {/* gather + axon (mockup 735-737): the green trunk everything
              upstream converges into. */}
          <path
            d={L.OUT.axon}
            fill="none"
            stroke="#2a4a74"
            stroke-width={2 * L.S}
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            d={L.OUT.axon}
            fill="none"
            stroke="#52ffa8"
            stroke-width={2.4 * L.S}
            stroke-linecap="round"
            filter="url(#aglow)"
            class="sig s3"
          />
          <circle cx={L.OUT.gpt[0]} cy={L.OUT.gpt[1]} r={5 * L.S} fill="#52ffa8" filter="url(#aglow)" />
          <circle cx={L.OUT.jn[0]} cy={L.OUT.jn[1]} r={3.5 * L.S} fill="#52ffa8" />

          {/* agent highway (mockup 738-739): green answers flow OUT toward
              the agent (laneA), cyan questions flow IN toward the gate
              (laneQ) -- opposing directions is the whole point of the cue. */}
          <path
            d={L.OUT.laneA}
            fill="none"
            stroke="#2a4a74"
            stroke-width={2 * L.S}
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            d={L.OUT.laneA}
            fill="none"
            stroke="#52ffa8"
            stroke-width={2.4 * L.S}
            stroke-linecap="round"
            filter="url(#aglow)"
            class="sig s2"
          />
          <path
            d={L.OUT.laneQ}
            fill="none"
            stroke="#2a4a74"
            stroke-width={2 * L.S}
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            d={L.OUT.laneQ}
            fill="none"
            stroke="#6fe3ff"
            stroke-width={2.4 * L.S}
            stroke-linecap="round"
            filter="url(#aglow)"
            class="sig"
          />

          {/* snapshot branch trace (mockup 777): visibly bypasses the gate. */}
          <path
            d={L.OUT.snap}
            fill="none"
            stroke="#2a4a74"
            stroke-width={2 * L.S}
            stroke-linejoin="round"
            stroke-linecap="round"
            classList={{ hotbase: snapHot() }}
          />
          <path
            d={L.OUT.snap}
            fill="none"
            stroke="#52ffa8"
            stroke-width={2.4 * L.S}
            stroke-linecap="round"
            filter="url(#aglow)"
            class="sig"
          />

          {/* brainstem (mockup 815-829): main line, two side rails starting
              18u below the gather point, a green pulse overlay, the stem-head
              dot, and the floor-2 teaser label. Ends at STEM_END -- nothing
              crosses the fold (coordinate contract). */}
          <path
            d={`M${L.GATHER.x},${L.GATHER.y} L${L.GATHER.x},${L.STEM_END}`}
            fill="none"
            stroke="#2a4a74"
            stroke-width={2.5 * L.S}
          />
          <path
            d={`M${L.GATHER.x - 6},${L.GATHER.y + 18} L${L.GATHER.x - 6},${L.STEM_END}`}
            fill="none"
            stroke="#1d3350"
            stroke-width={1 * L.S}
          />
          <path
            d={`M${L.GATHER.x + 6},${L.GATHER.y + 18} L${L.GATHER.x + 6},${L.STEM_END}`}
            fill="none"
            stroke="#1d3350"
            stroke-width={1 * L.S}
          />
          <path
            d={`M${L.GATHER.x},${L.GATHER.y} L${L.GATHER.x},${L.STEM_END}`}
            fill="none"
            stroke="#52ffa8"
            stroke-width={2.4 * L.S}
            stroke-linecap="round"
            filter="url(#aglow)"
            class="sig s3"
          />
          <circle cx={L.GATHER.x} cy={L.GATHER.y - 2} r={5 * L.S} fill="#52ffa8" filter="url(#aglow)" />
          <text
            x={L.GATHER.x + 14}
            y={L.STEM_END - 25}
            fill="#3f7f9a"
            font-size="10.5"
            font-family="ui-monospace, monospace"
          >
            brainstem · the machines below ↓
          </text>
        </g>

        {/* gMesh -- edges first, then dots (mockup 434-465) */}
        <g>
          <For each={mesh().edges}>
            {(d) => <path d={d} fill="none" stroke="#24466e" stroke-width={1 * L.S} opacity=".5" />}
          </For>
          <For each={mesh().dots}>
            {(dot) => (
              <circle
                cx={dot.cx.toFixed(1)}
                cy={dot.cy.toFixed(1)}
                r={dot.r * L.S}
                fill={dot.fill}
                class={dot.fire ? 'meshdot fire' : 'meshdot'}
                style={dot.fire ? { 'animation-delay': `${dot.fireDelayMs}ms` } : undefined}
              />
            )}
          </For>
        </g>

        {/* gTop -- seats, station labels, docks (Task 6 adds gate / agent /
            snapshot nodes). Mockup order: per station seat then label, then
            the docks (629-717). */}
        <g>
          <For each={stations()}>
            {({ s, dc }) => {
              const seat = L.SEATS[s.id]
              const subs = stationSubs(dc)
              return (
                <>
                  <Show
                    when={dc.lit}
                    fallback={
                      <circle
                        cx={seat.x}
                        cy={seat.y}
                        r={seat.r}
                        fill="none"
                        stroke="#3c4a60"
                        stroke-width={1.4 * L.S}
                        stroke-dasharray="3 4"
                        classList={{ hotseat: isHot(s.id) }}
                      />
                    }
                  >
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={seat.r}
                      fill="#0d2036"
                      stroke="#4aa8ff"
                      stroke-width={2 * L.S}
                      filter="url(#aglow)"
                      classList={{ hotseat: isHot(s.id) }}
                    />
                    <circle
                      cx={seat.x}
                      cy={seat.y}
                      r={Math.max(2.5, seat.r - 5 * L.S)}
                      fill="#6fe3ff"
                    />
                  </Show>

                  <g
                    ref={(el) => labelGroups.set(s.id, el)}
                    class={dc.lit ? 'major' : 'major dim'}
                    classList={{ reveal: isHot(s.id) }}
                    tabindex="0"
                    role="button"
                    aria-label={dc.name + (dc.lit ? '' : ' (dormant)')}
                    onMouseEnter={() => chain(s.id, true)}
                    onMouseLeave={() => chain(s.id, false)}
                    onFocus={() => chain(s.id, true)}
                    onBlur={() => chain(s.id, false)}
                    onClick={(ev) => openStation(s.id, ev)}
                    onKeyDown={(ev) => onStationKey(s.id, ev)}
                  >
                    <Show
                      when={s.label.mode === 'side' ? s.label : null}
                      fallback={(() => {
                        // Center pattern (mockup 644-666)
                        const label = s.label as CenterLabel
                        const geo = centerStack(label, subs.length, dc.lit)
                        return (
                          <>
                            <text
                              x={label.cx}
                              y={geo.titleY}
                              text-anchor="middle"
                              class="majorlabel"
                            >
                              {dc.name}
                            </text>
                            <Show when={dc.lit ? dc : null}>
                              {(lit) => (
                                <text
                                  x={label.cx}
                                  y={geo.numY!}
                                  text-anchor="middle"
                                  class="majornum num detail"
                                >
                                  {lit().num.toLocaleString('en-US')}
                                </text>
                              )}
                            </Show>
                            <For each={subs}>
                              {(txt, i) => (
                                <text
                                  x={label.cx}
                                  y={geo.subYs[i()]}
                                  text-anchor="middle"
                                  class="majorsub detail"
                                >
                                  {txt}
                                </text>
                              )}
                            </For>
                            <rect
                              x={label.cx - 110}
                              y={geo.titleY - 14}
                              width={220}
                              height={label.liney - geo.titleY + 20}
                              fill="transparent"
                            />
                          </>
                        )
                      })()}
                    >
                      {(label) => (
                        // Side pattern (mockup 667-677): fixed offsets, and a
                        // dormant station reads `dormant` where the num goes.
                        <>
                          <text
                            x={label().x}
                            y={label().y}
                            text-anchor={label().anchor}
                            class="majorlabel"
                          >
                            {dc.name}
                          </text>
                          <text
                            x={label().x}
                            y={label().y + 19}
                            text-anchor={label().anchor}
                            class="majornum num detail"
                          >
                            {dc.lit ? dc.num.toLocaleString('en-US') : 'dormant'}
                          </text>
                          <text
                            x={label().x}
                            y={label().y + 33}
                            text-anchor={label().anchor}
                            class="majorsub detail"
                          >
                            {dc.lit ? dc.sub : ''}
                          </text>
                          <rect
                            x={label().anchor === 'end' ? label().x - 200 : label().x - 8}
                            y={label().y - 16}
                            width={208}
                            height={54}
                            fill="transparent"
                          />
                        </>
                      )}
                    </Show>
                  </g>
                </>
              )
            }}
          </For>

          {/* growth docks (mockup 701-717) */}
          <For each={L.DOCKS}>
            {(dock, i) => (
              <g
                opacity=".7"
                classList={{ reveal: hotDock() === i() }}
                onMouseEnter={() => setHotDock(i())}
                onMouseLeave={() => setHotDock((cur) => (cur === i() ? null : cur))}
              >
                <circle
                  cx={dock.cx}
                  cy={dock.cy}
                  r={10}
                  fill="none"
                  stroke="#2a4a74"
                  stroke-width="1.4"
                  stroke-dasharray="3 5"
                />
                <text
                  x={dock.cx}
                  y={dock.cy + 5}
                  text-anchor="middle"
                  fill="#2a4a74"
                  font-size="13"
                  font-family="ui-monospace, monospace"
                >
                  +
                </text>
                <text
                  x={dock.labelX}
                  y={dock.labelY}
                  text-anchor={dock.anchor}
                  fill="#44597a"
                  font-size="10.5"
                  font-family="ui-monospace, monospace"
                  class="detail"
                >
                  {dock.label}
                </text>
              </g>
            )}
          </For>

          {/* MCP gate (mockup 740-759): the consumer barrier. Tool-channel
              reveal sits beside the gate, not inside it. */}
          <g
            classList={{ gate: true, reveal: gateHot() }}
            tabindex="0"
            role="button"
            aria-label="MCP"
            onMouseEnter={() => setGateHot(true)}
            onMouseLeave={() => setGateHot(false)}
            onClick={(ev) => openOut('mcp', ev)}
            onKeyDown={(ev) => onOutKey('mcp', ev)}
          >
            <path
              d={L.OUT.arc1}
              fill="none"
              stroke="#6fe3ff"
              stroke-width={2 * L.S}
              opacity=".85"
              filter="url(#aglow)"
            />
            <path
              d={L.OUT.arc2}
              fill="none"
              stroke="#2a4a74"
              stroke-width={1.6 * L.S}
              stroke-dasharray="5 5"
            />
            <rect
              x={L.OUT.port[0]}
              y={L.OUT.port[1]}
              width={L.OUT.port[2]}
              height={L.OUT.port[3]}
              rx="3"
              fill="#0b1626"
              stroke="#6fe3ff"
              stroke-width={1.4 * L.S}
            />
            <text
              x={L.OUT.mcpXY[0]}
              y={L.OUT.mcpXY[1]}
              text-anchor="middle"
              fill="#6fe3ff"
              font-size="17"
              font-weight="700"
              letter-spacing=".2em"
              font-family="system-ui, sans-serif"
            >
              MCP
            </text>
            <For each={['search_solved_issues', 'get_concept_note', 'lookup_map']}>
              {(t, i) => (
                <text
                  x={926}
                  y={350 + i() * 15}
                  fill="#3f7f9a"
                  font-size="9.5"
                  font-family="ui-monospace, monospace"
                  class="detail"
                >
                  {t}
                </text>
              )}
            </For>
          </g>

          {/* YOUR AGENT node (mockup 761-773): any MCP client, symmetric with
              the hero CTA -- both drill into the one CONNECT card (P9). */}
          <g
            classList={{ major: true, reveal: agentHot() }}
            tabindex="0"
            role="button"
            aria-label="Your agent"
            onMouseEnter={() => setAgentHot(true)}
            onMouseLeave={() => setAgentHot(false)}
            onClick={(ev) => openOut('agent', ev)}
            onKeyDown={(ev) => onOutKey('agent', ev)}
          >
            <circle
              cx={L.OUT.agent[0]}
              cy={L.OUT.agent[1]}
              r={15}
              fill="#0d2036"
              stroke="#6fe3ff"
              stroke-width={2 * L.S}
              filter="url(#aglow)"
            />
            <circle cx={L.OUT.agent[0]} cy={L.OUT.agent[1]} r={6} fill="#6fe3ff" />
            <text x={L.OUT.agentLbl[0]} y={L.OUT.agentLbl[1]} text-anchor="middle" class="majorlabel">
              YOUR AGENT
            </text>
            <text
              x={L.OUT.agentLbl[0]}
              y={L.OUT.agentLbl[1] + 16}
              text-anchor="middle"
              class="majorsub detail"
            >
              any MCP client
            </text>
          </g>

          {/* snapshot branch (mockup 775-813): bypasses the gate entirely.
              THIS PAGE (this site, "you are here") and the dormant SLIPGATE
              APP ghost share one reveal chain, `snapHot`, along with the
              branch trace's hotbase and the "snapshot door" detail label. */}
          <g classList={{ reveal: snapHot() }}>
            <text
              x={L.OUT.snapLblXY[0]}
              y={L.OUT.snapLblXY[1]}
              text-anchor="middle"
              fill="#3f7f9a"
              font-size="10"
              font-family="ui-monospace, monospace"
              class="detail"
            >
              snapshot door
            </text>
          </g>
          <g
            ref={(el) => labelGroups.set('snap', el)}
            classList={{ major: true, reveal: snapHot() }}
            tabindex="0"
            role="button"
            aria-label="This page, a snapshot consumer"
            onMouseEnter={() => setSnapHot(true)}
            onMouseLeave={() => setSnapHot(false)}
            onClick={(ev) => openOut('snap', ev)}
            onKeyDown={(ev) => onOutKey('snap', ev)}
          >
            <circle
              cx={L.OUT.snapEnd[0]}
              cy={L.OUT.snapEnd[1]}
              r={9}
              fill="#0d2036"
              stroke="#52ffa8"
              stroke-width={2 * L.S}
              filter="url(#aglow)"
            />
            <circle cx={L.OUT.snapEnd[0]} cy={L.OUT.snapEnd[1]} r={3.5} fill="#52ffa8" />
            <text x={L.OUT.tpLbl[0]} y={L.OUT.tpLbl[1]} text-anchor="start" class="majorlabel">
              THIS PAGE
            </text>
            <text
              x={L.OUT.tpLbl[0]}
              y={L.OUT.tpLbl[1] + 15}
              text-anchor="start"
              class="majorsub detail"
            >
              you are here
            </text>
          </g>
          <g
            classList={{ major: true, dim: true, reveal: snapHot() }}
            tabindex="0"
            role="button"
            aria-label="Slipgate app (future consumer)"
            onMouseEnter={() => setSnapHot(true)}
            onMouseLeave={() => setSnapHot(false)}
            onClick={(ev) => openOut('slip', ev)}
            onKeyDown={(ev) => onOutKey('slip', ev)}
          >
            <circle
              cx={L.OUT.sgC[0]}
              cy={L.OUT.sgC[1]}
              r={8}
              fill="none"
              stroke="#3c4a60"
              stroke-width={1.6 * L.S}
              stroke-dasharray="4 5"
            />
            <text x={L.OUT.sgLbl[0]} y={L.OUT.sgLbl[1]} text-anchor="start" class="majorlabel">
              SLIPGATE APP
            </text>
            <text
              x={L.OUT.sgLbl[0]}
              y={L.OUT.sgLbl[1] + 15}
              text-anchor="start"
              class="majorsub detail"
            >
              future · same door
            </text>
          </g>
        </g>

        {/* gFx -- travelers (Task 9 fills this; it stays empty and stays here
            so the paint order does not shift when it arrives) */}
        <g />

        {/* gHit -- fat transparent strokes over each trace (mockup 678-679) */}
        <g>
          <For each={stations()}>
            {({ s }) => (
              <path
                d={s.d}
                fill="none"
                stroke="#000"
                stroke-opacity="0"
                stroke-width={16 * L.S}
                pointer-events="stroke"
                cursor="pointer"
                onMouseEnter={() => chain(s.id, true)}
                onMouseLeave={() => chain(s.id, false)}
                onClick={(ev) => openStation(s.id, ev)}
              />
            )}
          </For>

          {/* snapshot branch hit path (mockup 805-806): fat enough to be
              clickable along its full curve, bypassing the gate visibly. */}
          <path
            d={L.OUT.snap}
            fill="none"
            stroke="#000"
            stroke-opacity="0"
            stroke-width={16 * L.S}
            pointer-events="stroke"
            cursor="pointer"
            onMouseEnter={() => setSnapHot(true)}
            onMouseLeave={() => setSnapHot(false)}
            onClick={openSnapHit}
          />
        </g>
      </svg>

      <div class="stemext" aria-hidden="true" />
      <div class="cornernote">
        <p class="tag">30 years of QuakeWorld knowledge, routed to your agent or API.</p>
      </div>

      {/* Drill overlay (Task 7, mockup 321-353). `keyed` is load-bearing:
          opening a second card must fully remount DrillOverlay -- fresh
          zoom-from-origin animation, fresh Escape listener -- rather than
          patch props onto the still-mounted one (mockup 322: a second open
          calls closeDrill(true), an INSTANT close, before opening the new
          card). A plain (non-keyed) Show only recreates the DOM on a
          falsy<->truthy transition; two different truthy DrillStates would
          just update the accessor in place and skip both the remount and
          the instant-replace behavior. */}
      <Show when={drill()} keyed>
        {(d) => (
          <DrillOverlay
            originRect={d.originRect}
            label={drillLabel(props.manifest, d)}
            wide={d.kind === 'why'}
            reduced={props.reduced}
            onClose={closeCard}
          >
            {drillBody(props.manifest, d, (ev) => openCard('xn', 'agent', ev.currentTarget as Element))}
          </DrillOverlay>
        )}
      </Show>
    </>
  )
}
