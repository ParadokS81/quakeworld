// Page shell: two floors + the ONE loadManifest() call site (P4). Floor
// components are dumb -- they receive manifest/source via props and never
// fetch. Phases 3-4 replace what's INSIDE the floors; this shell (the
// resource, the sections, the data-manifest-source hook) survives.
import { createResource, Show } from 'solid-js'
import { loadManifest } from './data/manifest'
import Floor1Brain from './components/Floor1Brain'
import Floor2MachineRoom from './components/Floor2MachineRoom'

export default function App() {
  const [result] = createResource(loadManifest)

  return (
    <div data-manifest-source={result()?.source}>
      <section class="floor" id="brain" aria-label="The oracle's brain">
        <Show when={result()}>
          {(r) => <Floor1Brain manifest={r().manifest} source={r().source} />}
        </Show>
      </section>
      <section class="floor" id="machine-room" aria-label="The machine room">
        <Show when={result()}>
          {(r) => <Floor2MachineRoom manifest={r().manifest} />}
        </Show>
      </section>
    </div>
  )
}
