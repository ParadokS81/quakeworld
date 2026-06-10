// Produces the stable deep-link fragment for an entity (D22). Case-folded,
// deterministic, rebuild-stable. Pure -- no imports.

export function entityAnchor(name: string): string {
  return name.toLowerCase()
}
