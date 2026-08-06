// Phase-2 placeholder -- Phase 4 replaces this with the rack layout + field
// terminal visual port. This task only needs the header copy (P8, minus the
// "click a rack" clause -- there is nothing clickable here yet) and a
// provenance line proving the manifest data actually reached this floor.
import type { BrainManifest } from '../data/manifest-types'

interface Props {
  manifest: BrainManifest
}

export default function Floor2MachineRoom(props: Props) {
  return (
    <>
      <div class="mrhead">The Machine Room · what the brain runs on</div>
      <div class="mr-placeholder">
        {/* Rack columns + the field-terminal panel land here in Phase 4. */}
      </div>
      <p class="mr-provenance">brain-manifest.json, {props.manifest.generated_at}</p>
    </>
  )
}
