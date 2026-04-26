// VersionSpec is the structured form of a version string. Three kinds today:
//
//   tag   — semver-shaped release tag (e.g. "3.6.9")
//   head  — dated working-tree snapshot (e.g. "head-2026-04-25")
//   build — numbered CI artifact (e.g. "build-6698", FTE-style)
//
// Unrecognized shapes fall back to kind:"tag" so the function is total. Add
// new kinds here when a project introduces a new version-string convention.

export type VersionSpec =
  | { kind: "tag"; value: string; display: string }
  | { kind: "head"; date: string; commit?: string; display: string }
  | { kind: "build"; number: number; commit?: string; display: string };

const HEAD_RE = /^head-(\d{4}-\d{2}-\d{2})$/;
const BUILD_RE = /^build-(\d+)$/;

export function parseVersionSpec(s: string): VersionSpec {
  const head = HEAD_RE.exec(s);
  if (head) return { kind: "head", date: head[1], display: s };
  const build = BUILD_RE.exec(s);
  if (build) return { kind: "build", number: Number(build[1]), display: s };
  return { kind: "tag", value: s, display: s };
}
