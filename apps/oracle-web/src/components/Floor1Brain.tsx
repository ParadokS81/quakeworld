// Floor 1 -- the brain. INPUT side (Task 5): section frame, seeded mesh, the
// six source stations with their traces / pads / seats / labels, the hover +
// focus reveal chains, the dormant ghosts, and the growth docks.
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
// document order are identical; only the source shape differs.
//
// Dumb component (P4): everything arrives via props. No network calls, no URL
// parsing, no environment reads -- App.tsx owns all three.
import { For, Show, createMemo, createSignal } from 'solid-js'
import { DESKTOP_LAYOUT } from '../generators/layout'
import type { CenterLabel, StationSource } from '../generators/layout'
import { generateMesh } from '../generators/mesh'
import type { BrainManifest, Datacenter, LitDatacenter } from '../data/manifest-types'
import type { ManifestSource } from '../data/manifest'

const L = DESKTOP_LAYOUT

interface Props {
  manifest: BrainManifest
  source: ManifestSource
  /** P6: the why-comparison door is dark at rest. Task 8 wires the flag. */
  showWhyDoor?: boolean
  /** Task 9's hover-spawn seam -- fires on every chain toggle. */
  onChainHover?: (id: string, on: boolean) => void
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

  // The drill system is Task 7's; every click and keyboard target already
  // routes through this one function so T7 replaces a body, not call sites.
  const openCard = (kind: 'dc' | 'xn' | 'why', id: string, origin: Element) => {
    console.debug('[oracle-web] drill card requested:', kind, id, origin)
  }

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
        </g>
      </svg>

      <div class="stemext" aria-hidden="true" />
      <div class="cornernote">
        <p class="tag">30 years of QuakeWorld knowledge, routed to your agent or API.</p>
      </div>
    </>
  )
}
