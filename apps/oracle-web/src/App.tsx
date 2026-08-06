// Page shell: two floors + the ONE loadManifest() call site (P4). Floor
// components are dumb -- they receive manifest/source via props and never
// fetch. Phases 3-4 replace what's INSIDE the floors; this shell (the
// resource, the sections, the data-manifest-source hook) survives.
import { Show, createResource, createSignal } from 'solid-js'
import { loadManifest } from './data/manifest'
import Floor1Brain from './components/Floor1Brain'
import Floor2MachineRoom from './components/Floor2MachineRoom'

export default function App() {
  const [result] = createResource(loadManifest)

  // P6: the why-comparison overlay ships dark -- Floor1Brain only renders a
  // door to it (the herolinks "Why do I need this?" pill) when this flag is
  // set. Read once, here, per the ?data=force-fallback precedent
  // (data/manifest.ts) -- App.tsx is the only place allowed to touch
  // location.search (P4); Floor1Brain just receives the resulting boolean.
  const showWhyDoor = new URLSearchParams(window.location.search).get('dev') === 'why'

  // P7c: read once, no change listener -- faithful to the mockup (line 240).
  // App.tsx is the only place allowed to touch matchMedia (P4); both floors
  // receive the resulting boolean as a prop.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // The journey-handoff contract (phase-3-floor1-brain.md): increments once
  // per traveler finishing floor 1's brainstem descent. `data-stem-exits` on
  // the root div is the invisible verification hook (devtools); Phase 4
  // consumes the same count to spawn one root traveler downstairs per tick.
  const [stemExits, setStemExits] = createSignal(0)

  return (
    <div data-manifest-source={result()?.source} data-stem-exits={stemExits()}>
      <section class="floor" id="brain" aria-label="The oracle's brain">
        <Show when={result()}>
          {(r) => (
            <Floor1Brain
              manifest={r().manifest}
              source={r().source}
              showWhyDoor={showWhyDoor}
              reduced={reduced}
              onStemExit={() => setStemExits((n) => n + 1)}
            />
          )}
        </Show>
      </section>
      <section class="floor" id="machine-room" aria-label="The machine room">
        <Show when={result()}>
          {(r) => <Floor2MachineRoom manifest={r().manifest} reduced={reduced} stemExits={stemExits()} />}
        </Show>
      </section>
    </div>
  )
}
