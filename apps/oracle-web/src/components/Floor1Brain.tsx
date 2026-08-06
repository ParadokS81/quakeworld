// Phase-2 placeholder -- Phase 3 replaces this with the mesh/canopy/station
// visual port (src/generators/ + the real brain SVG). This task only needs
// the copy locks (P8) and the datacenter data flowing through as props (P4).
import { For } from 'solid-js'
import type { BrainManifest } from '../data/manifest-types'
import type { ManifestSource } from '../data/manifest'

interface Props {
  manifest: BrainManifest
  source: ManifestSource
}

export default function Floor1Brain(props: Props) {
  return (
    <>
      <div class="titleblock">
        <h1>THE ORACLE IS AWAKE</h1>
      </div>
      <p class="cornernote">
        30 years of QuakeWorld knowledge, routed to your agent or API.
      </p>
      {/* Open registry (D4): iterate manifest.datacenters, key by id --
          never positionally, never a hardcoded id list. */}
      <ul class="dc-list">
        <For each={props.manifest.datacenters}>
          {(dc) =>
            dc.lit ? (
              <li class="dc dc-lit" data-dc-id={dc.id}>
                <span class="dc-name">{dc.name}</span>{' '}
                <span class="num">{dc.num.toLocaleString('en-US')}</span>{' '}
                <span class="dc-sub">{dc.sub}</span>
              </li>
            ) : (
              <li class="dc dc-dormant" data-dc-id={dc.id}>
                <span class="dc-name">{dc.name}</span>{' '}
                <span class="dc-num">—</span>{' '}
                <span class="dc-sub">dormant</span>
              </li>
            )
          }
        </For>
      </ul>
    </>
  )
}
