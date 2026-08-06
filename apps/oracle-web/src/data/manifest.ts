import type { BrainManifest } from './manifest-types'
import baked from './baked-manifest.json'

export const MANIFEST_URL =
  'https://oracle.slipgate.me/snapshots/brain-manifest.json'
export type ManifestSource = 'live' | 'baked'
export interface ManifestResult {
  manifest: BrainManifest
  source: ManifestSource
}

function isBrainManifest(x: unknown): x is BrainManifest {
  if (typeof x !== 'object' || x === null) return false
  const m = x as Record<string, unknown>
  return m.schema_version === 'brain-manifest-v1'
    && Array.isArray(m.datacenters)
    && m.datacenters.every((d: any) =>
         typeof d?.id === 'string' && typeof d?.name === 'string'
         && (d.lit === false || (d.lit === true && typeof d.num === 'number')))
}

// ?data=force-fallback exercises the REAL failure path end to end
// (fetch -> 404 -> catch -> baked) against the real server, without
// touching prod nginx. Dev/verification flag; harmless if shared.
function targetUrl(): string {
  const forced =
    new URLSearchParams(window.location.search).get('data') === 'force-fallback'
  return forced
    ? MANIFEST_URL.replace('brain-manifest.json', '__force-fallback-probe.json')
    : MANIFEST_URL
}

export async function loadManifest(): Promise<ManifestResult> {
  try {
    const res = await fetch(targetUrl(), { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json: unknown = await res.json()
    if (!isBrainManifest(json)) throw new Error('shape validation failed')
    return { manifest: json, source: 'live' }
  } catch (err) {
    console.info('[oracle-web] live manifest unavailable, using baked copy:', err)
    return { manifest: baked as BrainManifest, source: 'baked' }
  }
}
