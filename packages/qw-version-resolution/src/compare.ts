// Total ordering rules across VersionSpec kinds. Mirror these in any future
// refactor — they are the contract this lib promises consumers.
//
//   tag  vs tag : compare numeric components left-to-right (3.6.9 < 3.6.10).
//                 Tags with a non-numeric tail (e.g. "3.7.0-rc1") sort BELOW
//                 a clean tag with the same numeric base; two tagged
//                 prereleases compare lexicographically on the tail.
//   head vs head: lexicographic compare of YYYY-MM-DD date suffix.
//   build vs build: numeric compare of build number.
//   tag  vs head : tag < head (heads come from working trees after the latest tag).
//   tag  vs build: tag < build (builds are post-release CI artifacts).
//   head vs build: UNORDERED — return 0. Heads (ezQuake-style) and builds
//                  (FTE-style) live in different project ecosystems; consumers
//                  that need cross-kind ordering must supply their own rule.
//
// All real diff-viewer compares happen within one project, so head-vs-build
// never gets called in practice. Returning 0 keeps the function total without
// producing a misleading lie.

import type { VersionSpec } from "./version-spec";

interface TagParts {
  numeric: number[];
  tail: string;
}

function splitTag(value: string): TagParts {
  const parts = value.split(".");
  const numeric: number[] = [];
  let tail = "";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const m = /^(\d+)(.*)$/.exec(p);
    if (m) {
      numeric.push(Number(m[1]));
      if (m[2]) {
        tail = m[2] + parts.slice(i + 1).map((x) => "." + x).join("");
        break;
      }
    } else {
      tail = parts.slice(i).join(".");
      break;
    }
  }
  return { numeric, tail };
}

function compareNumericArrays(a: number[], b: number[]): -1 | 0 | 1 {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function compareVersions(a: VersionSpec, b: VersionSpec): -1 | 0 | 1 {
  if (a.kind === "tag" && b.kind === "tag") {
    const ap = splitTag(a.value);
    const bp = splitTag(b.value);
    const numeric = compareNumericArrays(ap.numeric, bp.numeric);
    if (numeric !== 0) return numeric;
    // Numeric base equal — compare tails. Empty tail outranks any prerelease tail.
    if (ap.tail === "" && bp.tail === "") return 0;
    if (ap.tail === "") return 1;
    if (bp.tail === "") return -1;
    return ap.tail < bp.tail ? -1 : ap.tail > bp.tail ? 1 : 0;
  }
  if (a.kind === "head" && b.kind === "head") {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  }
  if (a.kind === "build" && b.kind === "build") {
    return a.number < b.number ? -1 : a.number > b.number ? 1 : 0;
  }
  if (a.kind === "tag" && (b.kind === "head" || b.kind === "build")) return -1;
  if ((a.kind === "head" || a.kind === "build") && b.kind === "tag") return 1;
  return 0; // head vs build: unordered
}
