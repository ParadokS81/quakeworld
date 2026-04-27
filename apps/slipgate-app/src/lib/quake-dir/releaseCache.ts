import type { InvokeFn } from "./invoke-types";

export interface ReleaseEntry {
  tag: string;
  published_at: string;
  download_url: string | null;
  asset_sha256: string | null;
}

export interface ClientReleaseCache {
  client: string;
  channel: string;
  last_fetched: number;
  releases: ReleaseEntry[];
  source: string;
}

export async function getReleaseCache(
  invoke: InvokeFn,
  client: string,
  channel: string,
): Promise<ClientReleaseCache> {
  return invoke<ClientReleaseCache>("get_release_cache", { client, channel });
}

export async function refreshAllReleaseCaches(
  invoke: InvokeFn,
): Promise<Record<string, ClientReleaseCache>> {
  return invoke<Record<string, ClientReleaseCache>>("refresh_all_release_caches");
}

/**
 * Mirror of Rust's matches_official_release: PE FileVersion "3.6.6.7949"
 * matches GitHub tag "3.6.6". Three match shapes (exact, v-prefix, normalized).
 */
export function matchesOfficialRelease(
  cache: ClientReleaseCache,
  versionStr: string,
): boolean {
  const normalized = normalizePeVersion(versionStr);
  return cache.releases.some((r) => {
    const t = r.tag;
    return (
      t === versionStr ||
      t === `v${versionStr}` ||
      t === normalized ||
      t === `v${normalized}`
    );
  });
}

/** Mirror of `parse_pe_version`: take "3.6.6.7949" -> "3.6.6". Returns the
 * input unchanged if it doesn't look like a 3+ component dotted version. */
function normalizePeVersion(s: string): string {
  const parts = s.split(".");
  if (parts.length < 3) return s;
  if (!parts.slice(0, 3).every((p) => /^\d+$/.test(p))) return s;
  return parts.slice(0, 3).join(".");
}

export function isStubChannel(client: string, channel: string): boolean {
  // Per F14 + D3: ezQuake snapshot + FTE builds are stubs in 3.5b. Their
  // caches return empty release lists; consumers should branch on this to
  // skip the Tier-2 verdict.
  return (
    (client === "ezquake" && channel === "snapshot") ||
    (client === "fte" && channel === "builds")
  );
}
