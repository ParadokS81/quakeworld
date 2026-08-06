// XnCards.tsx -- the four "system" card bodies (Task 8): MCP, CONNECT YOUR
// AGENT, SNAPSHOT DOOR, SLIPGATE APP. Port of the mockup's XN object (mockup
// 269-292); buildCard's `custom` branch (mockup 296-298) renders mcp/agent/
// snap as raw HTML strings in the comp -- here each is its own JSX body.
// `slip` carries no `custom` and is dormant, so it falls through buildCard's
// generic dormant branch (mockup 315-318) -- the same shape DatacenterCard
// uses for a dormant datacenter.
//
// Dumb component (P4): the two manifest-fed numbers on the MCP card (thread
// count, note count) arrive via the `manifest` prop and are looked up by id
// -- no fetching, no environment reads.
import { Show } from 'solid-js'
import type { BrainManifest, LitDatacenter } from '../data/manifest-types'

export type XnId = 'mcp' | 'agent' | 'snap' | 'slip'

/** Card display names (mockup 270/276/285/290). Floor1Brain's drillLabel
    imports this so the dialog aria-label and the card h3 can never drift
    apart into two different strings. */
export const XN_NAMES: Record<XnId, string> = {
  mcp: 'MCP',
  agent: 'CONNECT YOUR AGENT',
  snap: 'SNAPSHOT DOOR',
  slip: 'SLIPGATE APP',
}

interface Props {
  manifest: BrainManifest
  id: XnId
  /** P9 funnel: the MCP card's "connect your agent ->" line opens the ONE
      CONNECT card in place (mockup 275's data-open mechanism, 342-344). */
  onOpenConnect: (ev: MouseEvent) => void
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

function findLit(manifest: BrainManifest, id: string): LitDatacenter | undefined {
  const dc = manifest.datacenters.find((d) => d.id === id)
  return dc?.lit ? dc : undefined
}

export default function XnCards(props: Props) {
  if (props.id === 'slip') {
    // Dormant teaser (mockup 290-291) -- same shape as DatacenterCard's
    // dormant branch: chip, teaser text as the headline, the honesty footer.
    return (
      <>
        <h3>
          SLIPGATE APP
          <span class="chipdim">dormant</span>
        </h3>
        <div class="headline">
          <span class="s">
            The desktop companion joins through the same snapshot door — delta-fetch, later. Future
            consumers dock beside it.
          </span>
        </div>
        <div class="door">rendered dim on purpose — inspiration of where this grows, not a promise.</div>
        <div class="escnote">esc / click outside to close</div>
      </>
    )
  }

  // Raw counts this card renders live rather than from the mockup's
  // hardcoded copy (2026-08-06 Phase 1 amendment, Open question 2): thread
  // count from `cm.threads`, note count from `cs.num`. Looked up by id
  // against the manifest registry (D4), never positionally -- and each
  // clause degrades to plain text if its datacenter is absent or dormant.
  const cm = () => findLit(props.manifest, 'cm')
  const cs = () => findLit(props.manifest, 'cs')

  return (
    <>
      <h3>{XN_NAMES[props.id]}</h3>

      <Show when={props.id === 'mcp'}>
        <div class="headline">
          <span class="s">
            The interactive door into the brain. Your agent calls these tools; only cited answers come
            out — the corpus itself stays inside.
          </span>
        </div>
        <ul class="notes">
          <li>
            <code>search_solved_issues("…")</code>
            <Show when={cm()?.threads !== undefined}> — {fmt(cm()!.threads!)} community threads</Show>
          </li>
          <li>
            <code>get_concept_note("…")</code>
            <Show when={cs() !== undefined}> — {fmt(cs()!.num)} curated notes</Show>
          </li>
          <li>
            <code>lookup_map("dm3")</code> · <code>search_entities("…")</code> ·{' '}
            <code>search_mechanics("…")</code>
          </li>
        </ul>
        <div class="door">
          <span
            style={{ cursor: 'pointer', 'text-decoration': 'underline' }}
            role="button"
            tabindex={0}
            onClick={props.onOpenConnect}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                props.onOpenConnect(ev as unknown as MouseEvent)
              }
            }}
          >
            connect your agent →
          </span>
        </div>
      </Show>

      <Show when={props.id === 'agent'}>
        {/* TBD-PHASE-6-endpoint-truth: the real endpoint depends on the MCP
            auth posture, undecided at drafting time (Open question 3).
            Ported byte-identical from the mockup for now (P1/P8); Phase 6's
            final-copy pass truths it up. */}
        <div class="headline">
          <span class="s">
            Pick your lowest-friction path. Endpoint (illustrative in this mockup):{' '}
            <code>https://oracle.quake.world/mcp</code>
          </span>
        </div>
        <ul class="notes">
          <li>
            <b>Claude</b> (claude.ai / Desktop) — Settings → Connectors → add custom connector → paste
            the URL
          </li>
          <li>
            <b>ChatGPT</b> (paid plans) — Settings → Apps → enable Developer mode → add the URL
          </li>
          <li>
            <b>CLI agents</b> (Claude Code, Gemini CLI, …) — just paste this prompt:
            <br />
            <code>
              add MCP server "qw-oracle" at https://oracle.quake.world/mcp, then ask it: why does my
              rocket feel delayed on antilag servers?
            </code>
          </li>
        </ul>
        <div class="door">
          first questions: rocket delay on antilag · weapon scripts · what is hoonymode — and when it
          doesn't know, it says so.
        </div>
        {/* Additive beyond the comp (spec D1, cold review CR-SPEC-1): the
            comp's connect card stops at client setup, so no phase shipped
            what-to-expect / what-happens-when-the-oracle-doesn't-know copy.
            Paraphrases apps/qw-oracle/serve/mcp/src/orientation.ts's
            citation + honest-failure discipline and the redirect_to_human
            dispatch at .../mcp/src/index.ts:194 -- claims nothing stronger.
            Layer vocabulary (L1/L2/L3) stays internal per P8; "engine
            facts" / "community threads" / "curated notes" are its
            plain-language stand-ins. */}
        <div class="headline">
          <span class="s">
            Good answers are grounded and cited — to the engine facts, community threads, or curated
            notes they're drawn from, never just "the AI says." When the oracle isn't sure, it says so
            and hands the question back to the community with <code>redirect_to_human</code>, instead
            of guessing.
          </span>
        </div>
      </Show>

      <Show when={props.id === 'snap'}>
        <div class="headline">
          <span class="s">
            The brain also publishes. Every harvest emits <code>brain-manifest.json</code> to a stable
            URL, cached five minutes, with a baked fallback if the oracle sleeps. Apps read it without
            ever crossing the MCP barrier.
          </span>
        </div>
        <ul class="notes">
          <li>
            first tenant: <b>this page</b> — every number you see here rides that file
          </li>
          <li>next: the slipgate desktop app, same door, delta-fetch</li>
        </ul>
        <div class="door">
          door: <code>GET oracle.slipgate.me/snapshots/brain-manifest.json</code>
        </div>
      </Show>

      <div class="escnote">esc / click outside to close</div>
    </>
  )
}
