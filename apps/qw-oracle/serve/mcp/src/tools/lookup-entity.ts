import { db } from '../db.ts';
import type { EntityRecord, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface LookupEntityArgs {
  name: string;
  project?: string;
  type?: 'cvar' | 'command';
}

interface RawCvarRow {
  id: string;
  project: string;
  name: string;
  type: string | null;
  default_value: string | null;
  description: string | null;
  group_name: string | null;
  major_group: string | null;
  source_file: string | null;
  extraction_method: string;
}

interface RawCmdRow {
  id: string;
  project: string;
  name: string;
  description: string | null;
  group_name: string | null;
  extraction_method: string;
}

// bun:sqlite statements: we drop compile-time generics and cast `.all()`
// results inline. The SELECT list here IS the shape contract; keep them
// in sync with RawCvarRow / RawCmdRow below.
const selectCvarsByNameAndProject = db.prepare(`
  SELECT id, project, name, type, default_value, description, group_name, major_group, source_file, extraction_method
  FROM kb_cvars WHERE name = ? AND project = ?
`);

const selectCvarsByName = db.prepare(`
  SELECT id, project, name, type, default_value, description, group_name, major_group, source_file, extraction_method
  FROM kb_cvars WHERE name = ?
`);

const selectCmdsByNameAndProject = db.prepare(`
  SELECT id, project, name, description, group_name, extraction_method
  FROM kb_commands WHERE name = ? AND project = ?
`);

const selectCmdsByName = db.prepare(`
  SELECT id, project, name, description, group_name, extraction_method
  FROM kb_commands WHERE name = ?
`);

function cvarToEntity(r: RawCvarRow, conceptIndex: Map<string, string[]>): EntityRecord {
  return {
    id: r.id,
    type: 'cvar',
    project: r.project,
    name: r.name,
    value_type: r.type,
    default_value: r.default_value,
    description: r.description,
    group_name: r.group_name,
    major_group: r.major_group,
    source_file: r.source_file,
    extraction_method: r.extraction_method,
    linked_concepts: conceptIndex.get(r.id) ?? [],
  };
}

function cmdToEntity(r: RawCmdRow, conceptIndex: Map<string, string[]>): EntityRecord {
  return {
    id: r.id,
    type: 'command',
    project: r.project,
    name: r.name,
    value_type: null,
    default_value: null,
    description: r.description,
    group_name: r.group_name,
    major_group: null,
    source_file: null,
    extraction_method: r.extraction_method,
    linked_concepts: conceptIndex.get(r.id) ?? [],
  };
}

export function lookupEntity(
  args: LookupEntityArgs,
  conceptIndex: Map<string, string[]>,
): ToolResponse<EntityRecord> {
  const wantCvars = args.type !== 'command';
  const wantCmds = args.type !== 'cvar';

  const results: EntityRecord[] = [];

  if (wantCvars) {
    const cvarRows = (args.project
      ? selectCvarsByNameAndProject.all(args.name, args.project)
      : selectCvarsByName.all(args.name)) as unknown as RawCvarRow[];
    for (const r of cvarRows) results.push(cvarToEntity(r, conceptIndex));
  }

  if (wantCmds) {
    const cmdRows = (args.project
      ? selectCmdsByNameAndProject.all(args.name, args.project)
      : selectCmdsByName.all(args.name)) as unknown as RawCmdRow[];
    for (const r of cmdRows) results.push(cmdToEntity(r, conceptIndex));
  }

  let matchQuality: 'strong' | 'weak' | 'none';
  if (results.length === 0) {
    matchQuality = 'none';
  } else if (results.some((r) => r.description && r.description.length > 20)) {
    matchQuality = 'strong';
  } else {
    matchQuality = 'weak';
  }

  return {
    results,
    match_quality: matchQuality,
    suggested_fallback:
      matchQuality === 'none'
        ? `No entity named "${args.name}" in Layer 1 across cvars or commands. Consider search_solved_issues for Layer 2 discussion mentions, or asking in #ezquake on Discord.`
        : null,
    meta: {
      tool: 'lookup_entity',
      server_version: SERVER_VERSION,
      queried_at: new Date().toISOString(),
    },
  };
}
