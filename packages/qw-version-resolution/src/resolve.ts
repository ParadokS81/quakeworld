// existsAtVersion + defaultAtVersion: project a version-bracketed entity onto
// a single point in time. Both consume snapshot fields produced by oracle's
// build-snapshot (first_seen_version, last_seen_version, default_history).
//
// Missing first_seen_version is "unknown coverage" — return false rather than
// silently treating the entity as alive forever. Snapshots from oracle today
// guarantee 100% coverage on these fields, so the only path that hits the
// "missing" branch is hand-constructed test fixtures or future regressions.

import type { VersionSpec } from "./version-spec";
import { parseVersionSpec } from "./version-spec";
import { compareVersions } from "./compare";

export interface VersionedEntity {
  first_seen_version?: string;
  last_seen_version?: string;
  default?: string;
  default_history?: Array<{ version: string; value: string }>;
}

export function existsAtVersion(e: VersionedEntity, target: VersionSpec): boolean {
  if (!e.first_seen_version) return false;
  const first = parseVersionSpec(e.first_seen_version);
  if (compareVersions(target, first) < 0) return false;
  if (e.last_seen_version) {
    const last = parseVersionSpec(e.last_seen_version);
    if (compareVersions(target, last) > 0) return false;
  }
  return true;
}

export function defaultAtVersion(e: VersionedEntity, target: VersionSpec): string | null {
  if (e.default_history && e.default_history.length > 0) {
    let effective: string | null = null;
    for (const entry of e.default_history) {
      const entryV = parseVersionSpec(entry.version);
      if (compareVersions(entryV, target) <= 0) {
        effective = entry.value;
      } else {
        break;
      }
    }
    if (effective !== null) return effective;
  }
  return e.default ?? null;
}
