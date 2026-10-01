// Drill-card CONTENT for one manifest datacenter -- port of the mockup's
// buildCard for the plain (non-`custom`) branch (mockup 296-320). The
// `custom`-body branch belongs to XnCards (Task 8); this component only
// ever renders a `Datacenter` from the manifest registry.
import { For, Show } from 'solid-js'
import type { Datacenter, Door } from '../data/manifest-types'

interface Props {
  dc: Datacenter
  /** P9 funnel seam: the agent-kind door opens the singular CONNECT card. */
  onOpenConnect: (ev: MouseEvent) => void
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

/** The `door: ` line's content, keyed on the structured Door union (Phase 1). */
function DoorLine(props: { door: Door; onOpenConnect: (ev: MouseEvent) => void }) {
  const d = props.door
  if (d.kind === 'site') {
    return (
      <a href={d.href} target="_blank" rel="noreferrer">
        {d.label} → <code>{d.code}</code>
      </a>
    )
  }
  // kind 'agent': the whole line is the funnel affordance into CONNECT
  // (P9/D3) -- same idea as the mockup's MCP-card `data-open` link (275,
  // 342-344), styled the same way (inline, since no CSS class exists for
  // an in-line clickable door line).
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      props.onOpenConnect(ev as unknown as MouseEvent)
    }
  }
  return (
    <span
      style={{ cursor: 'pointer', 'text-decoration': 'underline' }}
      role="button"
      tabindex={0}
      onClick={props.onOpenConnect}
      onKeyDown={onKey}
    >
      ask your agent → <code>{d.call}</code>
    </span>
  )
}

export default function DatacenterCard(props: Props) {
  const dc = props.dc

  if (!dc.lit) {
    return (
      <>
        <h3>
          {dc.name}
          <span class="chipdim">dormant</span>
        </h3>
        <div class="headline">
          <span class="s">{dc.teaser}</span>
        </div>
        <div class="door">
          rendered dim on purpose — inspiration of where this grows, not a promise.
        </div>
        <div class="escnote">esc / click outside to close</div>
      </>
    )
  }

  const bars = dc.bars
  const max = bars ? Math.max(...bars.map(([, v]) => v)) : 0

  return (
    <>
      <h3>{dc.name}</h3>
      <div class="headline">
        <span class="n num">{fmt(dc.num)}</span>
        <span class="s">{dc.sub}</span>
      </div>
      <Show when={bars}>
        {(barsAcc) => (
          <For each={barsAcc()}>
            {([label, v]) => {
              const w = Math.max(2, Math.round((v / max) * 100))
              return (
                <div class="brow">
                  <span>{label}</span>
                  <span class="bar">
                    <i style={{ width: `${w}%` }} />
                  </span>
                  <span class="v num">{fmt(v)}</span>
                </div>
              )
            }}
          </For>
        )}
      </Show>
      <Show when={dc.stats}>
        {(statsAcc) => (
          <div class="stats">
            <For each={statsAcc()}>
              {([v, label]) => (
                <div class="st">
                  <div class="n2 num">{fmt(v)}</div>
                  <div class="l2">{label}</div>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
      <Show when={dc.notes}>
        {(notesAcc) => (
          <ul class="notes">
            <For each={notesAcc()}>{(n) => <li>{n}</li>}</For>
          </ul>
        )}
      </Show>
      <div class="door">
        door: <DoorLine door={dc.door} onOpenConnect={props.onOpenConnect} />
      </div>
      <div class="escnote">esc / click outside to close</div>
    </>
  )
}
