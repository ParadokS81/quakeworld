// Single source of truth for the MCP server version. Imported by index.ts
// (the Server constructor) and by every tool file's meta block. Update here
// when bumping; package.json is updated in lockstep but is not imported.
export const SERVER_VERSION = '0.5.0';
