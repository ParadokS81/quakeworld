-- Layer 1: Extracted facts. Deterministic ground truth.
-- Tables prefixed kb_ (knowledge base) to keep them clearly separate from
-- the existing raw `messages`, `sessions`, and `import_log` tables.

CREATE TABLE IF NOT EXISTS kb_cvars (
  id                 TEXT PRIMARY KEY,   -- canonical: 'ezquake:cvar:cl_bob'
  project            TEXT NOT NULL,      -- 'ezquake' | 'ktx' | 'fte' | 'mvdsv' | 'qwcl'
  name               TEXT NOT NULL,      -- 'cl_bob'
  type               TEXT,               -- 'float' | 'int' | 'string' | 'bool' | NULL
  group_id           TEXT,               -- upstream group id from source JSON (e.g. '31'); NULL for FTE which uses inline names
  group_name         TEXT,               -- resolved human-readable group
  major_group        TEXT,               -- resolved top-level category (ezquake has it, FTE does not)
  default_value      TEXT,               -- raw string default (nullable; source JSON may not provide)
  description        TEXT,               -- from source comment / docs
  source_file        TEXT,               -- populated for FTE rows; NULL for ezquake/ktx scraped rows
  source_line        INTEGER,            -- NULL for POC; future AST extractor would fill this
  source_version     TEXT,               -- 'poc' for now; future: pipeline commit SHA
  extraction_method  TEXT NOT NULL,      -- 'scraped-json' | 'ast-extractor' | 'hand-curated'
  imported_at        TEXT NOT NULL       -- ISO 8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_kb_cvars_name              ON kb_cvars(name);
CREATE INDEX IF NOT EXISTS idx_kb_cvars_project           ON kb_cvars(project);
CREATE INDEX IF NOT EXISTS idx_kb_cvars_major_group       ON kb_cvars(major_group);
CREATE INDEX IF NOT EXISTS idx_kb_cvars_extraction_method ON kb_cvars(extraction_method);

CREATE TABLE IF NOT EXISTS kb_commands (
  id                 TEXT PRIMARY KEY,   -- canonical: 'ezquake:cmd:say_team'
  project            TEXT NOT NULL,
  name               TEXT NOT NULL,
  group_id           TEXT,
  group_name         TEXT,
  description        TEXT,
  source_file        TEXT,
  source_line        INTEGER,
  source_version     TEXT,
  extraction_method  TEXT NOT NULL,
  imported_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_commands_name              ON kb_commands(name);
CREATE INDEX IF NOT EXISTS idx_kb_commands_project           ON kb_commands(project);
CREATE INDEX IF NOT EXISTS idx_kb_commands_extraction_method ON kb_commands(extraction_method);

-- Track each Layer 1 import so re-running is idempotent.
CREATE TABLE IF NOT EXISTS kb_facts_import_log (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  project            TEXT NOT NULL,      -- 'ezquake' | 'ktx' | 'fte'
  entity_type        TEXT NOT NULL,      -- 'cvar' | 'cmd'
  source_file        TEXT NOT NULL,      -- path to JSON file
  source_version     TEXT,
  extraction_method  TEXT NOT NULL,
  rows_inserted      INTEGER NOT NULL,
  rows_updated       INTEGER NOT NULL,
  imported_at        TEXT NOT NULL
);
