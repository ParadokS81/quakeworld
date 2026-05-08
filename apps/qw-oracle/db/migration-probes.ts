// apps/qw-oracle/db/migration-probes.ts
//
// Per-migration probe registry. Maps each migration filename to a probe
// function that asserts the migration's invariants against the live DB.
// Explicit registry (not auto-discovery) per Pass 1.2.2: explicit probes
// force the migration author to think about validation.
//
// Run via: bun run load-knowledge -- migration-probes [--migration NNN]
//
// JSONB binding (D12): sentinel inserts that write JSONB columns MUST
// pass JS values directly (e.g. [], {}, sql.json(v)).
// NEVER pre-stringify with JSON.stringify(...) and bind as TEXT.

import type postgres from 'postgres';

export interface MigrationProbeResult {
  migration: string;
  status: 'PASS' | 'FAIL';
  findings: string[];
}

export type MigrationProbeFn = (sql: postgres.Sql) => Promise<MigrationProbeResult>;

// Stubs -- Tasks 2-5 replace each with a real implementation.
// Keys are migration filenames; insertion order = probe run order.
export const MIGRATION_PROBES: Record<string, MigrationProbeFn> = {
  '001_init.sql': async (s) => {
    const findings: string[] = [];

    // 1. embedding_metadata table exists
    const [emRow] = await s`SELECT to_regclass('embedding_metadata') IS NOT NULL AS r`;
    if (!emRow?.r) findings.push('embedding_metadata table does not exist');

    // 2. oracle_meta table exists
    const [omRow] = await s`SELECT to_regclass('oracle_meta') IS NOT NULL AS r`;
    if (!omRow?.r) findings.push('oracle_meta table does not exist');

    // 3. oracle_meta has a schema_version key row
    const [svRow] = await s`SELECT count(*)::int AS n FROM oracle_meta WHERE key='schema_version'`;
    if ((svRow?.n ?? 0) < 1) findings.push("oracle_meta: no row with key='schema_version'");

    // 4. embedding_metadata singleton CHECK (id=1) rejects id=2
    let singletonEnforced = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO embedding_metadata (id, model_name, model_version, dimension, rows_embedded)
                 VALUES (2, 'probe', '1', 1024, 0)`;
      });
    } catch {
      singletonEnforced = true;
    }
    if (!singletonEnforced) findings.push('embedding_metadata: singleton constraint did not reject id=2');

    return { migration: '001_init.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '002_layer1_schema.sql': async (s) => {
    const findings: string[] = [];

    // 1. entities table exists
    const [entRow] = await s`SELECT to_regclass('entities') IS NOT NULL AS r`;
    if (!entRow?.r) findings.push('entities table does not exist');

    // 2. versions table exists
    const [verRow] = await s`SELECT to_regclass('versions') IS NOT NULL AS r`;
    if (!verRow?.r) findings.push('versions table does not exist');

    // 3. cvar_versions table exists
    const [cvRow] = await s`SELECT to_regclass('cvar_versions') IS NOT NULL AS r`;
    if (!cvRow?.r) findings.push('cvar_versions table does not exist');

    // 4. Positive sentinel: INSERT into entities succeeds then rolls back
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO entities
                  (project, type, name, canonical_id, source_state,
                   first_seen_version, last_seen_version, created_at, updated_at)
                 VALUES ('ezquake','cvar','STUB_M002_POS','ezquake:cvar:STUB_M002_POS',
                         'source_backed','head','head',now(),now())`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`entities positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push('entities: positive sentinel INSERT did not succeed before rollback');

    // 5. Negative sentinel: INSERT with invalid type -> expect CHECK violation
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO entities
                  (project, type, name, canonical_id, source_state,
                   first_seen_version, last_seen_version, created_at, updated_at)
                 VALUES ('ezquake','nonexistent_type_xyz','STUB_M002_NEG',
                         'ezquake:nonexistent_type_xyz:STUB_M002_NEG',
                         'source_backed','head','head',now(),now())`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push('entities.type CHECK did not reject nonexistent_type_xyz');

    return { migration: '002_layer1_schema.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '003_layer1_entities_search.sql': async (s) => {
    const findings: string[] = [];

    // 1. entities.description column exists
    const [descRow] = await s`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name='entities' AND column_name='description'`;
    if ((descRow?.n ?? 0) !== 1) findings.push('entities.description column does not exist');

    // 2. entities.description_tsv generated column exists
    const [tsvRow] = await s`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name='entities' AND column_name='description_tsv'`;
    if ((tsvRow?.n ?? 0) !== 1) findings.push('entities.description_tsv column does not exist');

    // 3. entities.description_embedding vector column exists
    const [embRow] = await s`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name='entities' AND column_name='description_embedding'`;
    if ((embRow?.n ?? 0) !== 1) findings.push('entities.description_embedding column does not exist');

    // 4. GIN index entities_desc_tsv_gin exists
    const [ginRow] = await s`
      SELECT count(*)::int AS n FROM pg_indexes
      WHERE tablename='entities' AND indexname='entities_desc_tsv_gin'`;
    if ((ginRow?.n ?? 0) !== 1) findings.push('GIN index entities_desc_tsv_gin does not exist');

    // 5. HNSW index entities_desc_embedding_hnsw exists
    const [hnswRow] = await s`
      SELECT count(*)::int AS n FROM pg_indexes
      WHERE tablename='entities' AND indexname='entities_desc_embedding_hnsw'`;
    if ((hnswRow?.n ?? 0) !== 1) findings.push('HNSW index entities_desc_embedding_hnsw does not exist');

    return { migration: '003_layer1_entities_search.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },
  '004_layer2_chat.sql': async (s) => {
    const findings: string[] = [];

    // 1. messages table exists
    const [msgRow] = await s`SELECT to_regclass('messages') IS NOT NULL AS r`;
    if (!msgRow?.r) findings.push('messages table does not exist');

    // 2. sessions table exists
    const [sessRow] = await s`SELECT to_regclass('sessions') IS NOT NULL AS r`;
    if (!sessRow?.r) findings.push('sessions table does not exist');

    // 3. session_search table exists
    const [ssRow] = await s`SELECT to_regclass('session_search') IS NOT NULL AS r`;
    if (!ssRow?.r) findings.push('session_search table does not exist');

    // 4. Positive sentinel: INSERT into messages with discord platform then rollback
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO messages (id, platform, channel_name, author_name, content, source, created_at, imported_at)
                 VALUES ('STUB_M004_POS', 'discord', '#probe', 'probe', '', 'probe', now(), now())`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`messages positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push('messages: positive sentinel INSERT did not succeed before rollback');

    // 5. Negative sentinel: INSERT with platform='irc' -> expect CHECK violation
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO messages (id, platform, channel_name, author_name, content, source, created_at, imported_at)
                 VALUES ('STUB_M004_NEG', 'irc', '#probe', 'probe', '', 'probe', now(), now())`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push('messages.platform CHECK did not reject irc');

    return { migration: '004_layer2_chat.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '005_layer3_concepts.sql': async (s) => {
    const findings: string[] = [];

    // 1. concepts table exists
    const [conRow] = await s`SELECT to_regclass('concepts') IS NOT NULL AS r`;
    if (!conRow?.r) findings.push('concepts table does not exist');

    // 2. concept_chunks table exists
    const [chkRow] = await s`SELECT to_regclass('concept_chunks') IS NOT NULL AS r`;
    if (!chkRow?.r) findings.push('concept_chunks table does not exist');

    // 3. redirect_targets table exists
    const [rdRow] = await s`SELECT to_regclass('redirect_targets') IS NOT NULL AS r`;
    if (!rdRow?.r) findings.push('redirect_targets table does not exist');

    // 4. concept_chunks.embedding column exists
    const [embRow] = await s`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name='concept_chunks' AND column_name='embedding'`;
    if ((embRow?.n ?? 0) !== 1) findings.push('concept_chunks.embedding column does not exist');

    // 5. GIN index concept_chunks_tsv_gin exists
    const [ginRow] = await s`
      SELECT count(*)::int AS n FROM pg_indexes
      WHERE tablename='concept_chunks' AND indexname='concept_chunks_tsv_gin'`;
    if ((ginRow?.n ?? 0) !== 1) findings.push('GIN index concept_chunks_tsv_gin does not exist');

    return { migration: '005_layer3_concepts.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '006_embedding_api_log.sql': async (s) => {
    const findings: string[] = [];

    // 1. embedding_api_log table exists
    const [logRow] = await s`SELECT to_regclass('embedding_api_log') IS NOT NULL AS r`;
    if (!logRow?.r) findings.push('embedding_api_log table does not exist');

    // 2. Positive sentinel: INSERT with source='loader' then rollback
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO embedding_api_log (source, model, input_tokens)
                 VALUES ('loader', 'probe', 1)`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`embedding_api_log positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push('embedding_api_log: positive sentinel INSERT did not succeed before rollback');

    // 3. Negative sentinel: INSERT with source='nonexistent_source' -> expect CHECK violation
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO embedding_api_log (source, model, input_tokens)
                 VALUES ('nonexistent_source', 'probe', 1)`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push('embedding_api_log.source CHECK did not reject nonexistent_source');

    return { migration: '006_embedding_api_log.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },
  '007_query_log.sql': async (s) => {
    const findings: string[] = [];

    // 1. query_log table exists
    const [qlRow] = await s`SELECT to_regclass('query_log') IS NOT NULL AS r`;
    if (!qlRow?.r) findings.push('query_log table does not exist');

    // 2. Positive sentinel: INSERT with match_quality='strong' then rollback
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO query_log (tool, match_quality)
                 VALUES ('probe', 'strong')`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`query_log positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push('query_log: positive sentinel (match_quality=strong) INSERT did not succeed before rollback');

    // 3. Positive sentinel: INSERT with match_quality=null (CHECK allows NULL)
    let nullOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO query_log (tool, match_quality)
                 VALUES ('probe', null)`;
        nullOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`query_log null match_quality insert failed: ${e.message}`);
        nullOk = false;
      }
    }
    if (!nullOk) findings.push('query_log: NULL match_quality INSERT did not succeed before rollback');

    // 4. Negative sentinel: INSERT with invalid match_quality -> expect CHECK violation
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO query_log (tool, match_quality)
                 VALUES ('probe', 'invalid_quality')`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push('query_log.match_quality CHECK did not reject invalid_quality');

    return { migration: '007_query_log.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '008_community_schema.sql': async (s) => {
    const findings: string[] = [];

    // 1. community.players table exists
    const [playersRow] = await s`SELECT to_regclass('community.players') IS NOT NULL AS r`;
    if (!playersRow?.r) findings.push('community.players table does not exist');

    // 2. community.clans table exists
    const [clansRow] = await s`SELECT to_regclass('community.clans') IS NOT NULL AS r`;
    if (!clansRow?.r) findings.push('community.clans table does not exist');

    // 3. community.tournaments table exists
    const [tournamentsRow] = await s`SELECT to_regclass('community.tournaments') IS NOT NULL AS r`;
    if (!tournamentsRow?.r) findings.push('community.tournaments table does not exist');

    // 4. Positive sentinel: INSERT into community.players then rollback
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO community.players (slug, title, has_note, is_substantive, is_stub)
                 VALUES ('STUB_M008_POS', 'Stub', false, false, true)`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`community.players positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push('community.players: positive sentinel INSERT did not succeed before rollback');

    // 5. Negative sentinel: INSERT with invalid status -> expect CHECK violation
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO community.players (slug, title, has_note, is_substantive, is_stub, status)
                 VALUES ('STUB_M008_NEG', 'Stub', false, false, true, 'InvalidStatus')`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push('community.players.status CHECK did not reject InvalidStatus');

    return { migration: '008_community_schema.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '009_ktx_log_template_logfile_channel.sql': async (s) => {
    const findings: string[] = [];

    // 1. Positive sentinel: channel='logfile' admitted after migration 009
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO entities
                  (project, type, name, canonical_id, source_state,
                   first_seen_version, last_seen_version, created_at, updated_at)
                 VALUES ('ktx', 'log_template', 'STUB_M009_POS', 'ktx:log_template:STUB_M009_POS',
                         'source_backed', 'head', 'head', now(), now())`;
        await tx`INSERT INTO log_template_versions
                  (entity_id, version, channel, format_string, format_string_normalized,
                   source_file, source_line, all_call_sites_json, extracted_at)
                 SELECT id, 'head', 'logfile', 'STUB', 'stub', 'stub.c', 1,
                        ${[] as any}, now()
                 FROM entities WHERE name='STUB_M009_POS' AND project='ktx'`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`009 positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push("log_template_versions: channel='logfile' positive sentinel failed");

    // 2. Negative sentinel: channel='nonexistent_channel' rejected
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO entities
                  (project, type, name, canonical_id, source_state,
                   first_seen_version, last_seen_version, created_at, updated_at)
                 VALUES ('ktx', 'log_template', 'STUB_M009_NEG', 'ktx:log_template:STUB_M009_NEG',
                         'source_backed', 'head', 'head', now(), now())`;
        await tx`INSERT INTO log_template_versions
                  (entity_id, version, channel, format_string, format_string_normalized,
                   source_file, source_line, all_call_sites_json, extracted_at)
                 SELECT id, 'head', 'nonexistent_channel', 'STUB', 'stub', 'stub.c', 1,
                        ${[] as any}, now()
                 FROM entities WHERE name='STUB_M009_NEG' AND project='ktx'`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push("log_template_versions.channel CHECK did not reject 'nonexistent_channel'");

    return { migration: '009_ktx_log_template_logfile_channel.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },
  '010_ktx_match_event_type.sql': async (s) => {
    const findings: string[] = [];

    // 1. match_event_versions table exists
    const [tevRow] = await s`SELECT to_regclass('match_event_versions') IS NOT NULL AS r`;
    if (!tevRow?.r) findings.push('match_event_versions table does not exist');

    // 2. Exactly 3 indexes on match_event_versions (PK + 2 named indexes)
    const [idxRow] = await s`SELECT count(*)::int AS n FROM pg_indexes WHERE tablename='match_event_versions'`;
    if ((idxRow?.n ?? 0) !== 3) findings.push(`match_event_versions: expected 3 indexes, got ${idxRow?.n ?? 0}`);

    // 3. Positive sentinel: entity + match_event_versions row inserts, then rollback
    let positiveOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO entities
                  (project, type, name, canonical_id, source_state,
                   first_seen_version, last_seen_version, created_at, updated_at)
                 VALUES ('ktx', 'match_event', 'STUB_M010_POS', 'ktx:match_event:STUB_M010_POS',
                         'source_backed', 'head', 'head', now(), now())`;
        const attrVal = [{ name: 'item_name', type: 'xs:string', constraint: null }] as any;
        const callSitesVal = [] as any;
        await tx`INSERT INTO match_event_versions
                  (entity_id, version, event_name, complex_type, attributes_json,
                   emission_call_sites_json, xsd_path, extracted_at)
                 SELECT id, 'head', 'pick_mapitem', 'mapitemtype', ${attrVal},
                        ${callSitesVal}, 'resources/extralog/ktxlog_0.1.xsd', now()
                 FROM entities WHERE name='STUB_M010_POS' AND project='ktx'`;
        positiveOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`010 positive insert failed: ${e.message}`);
        positiveOk = false;
      }
    }
    if (!positiveOk) findings.push("match_event_versions: positive sentinel INSERT did not succeed before rollback");

    // 4. Negative sentinel: type='nonexistent_type_xyz' rejected by entities.type CHECK
    let negRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO entities
                  (project, type, name, canonical_id, source_state,
                   first_seen_version, last_seen_version, created_at, updated_at)
                 VALUES ('ktx', 'nonexistent_type_xyz', 'STUB_M010_NEG',
                         'ktx:nonexistent_type_xyz:STUB_M010_NEG',
                         'source_backed', 'head', 'head', now(), now())`;
      });
    } catch {
      negRejected = true;
    }
    if (!negRejected) findings.push("entities.type CHECK did not reject 'nonexistent_type_xyz'");

    return { migration: '010_ktx_match_event_type.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '011_ktx_gameplay_kinds.sql': async (s) => {
    const findings: string[] = [];

    // 1. Pre-flight: gameplay_sources ktx row must exist (Phase 1 obligation)
    const [gsRow] = await s`SELECT count(*)::int AS n FROM gameplay_sources WHERE id='ktx'`;
    if ((gsRow?.n ?? 0) < 1) {
      findings.push("gameplay_sources ktx row missing; KTX Phase 1 onboarding prerequisite not met");
      return { migration: '011_ktx_gameplay_kinds.sql', status: 'FAIL', findings };
    }

    // 2. Positive sentinel: kind='monster' admitted in gameplay_entity_defs
    let monsterOk = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO gameplay_entity_defs
                  (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
                 VALUES ('ktx', 'monster', 'STUB_M011_MONSTER', 'stub.c:1',
                         ${{} as any}, ${{} as any})`;
        monsterOk = true;
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`011 monster positive insert failed: ${e.message}`);
        monsterOk = false;
      }
    }
    if (!monsterOk) findings.push("gameplay_entity_defs: kind='monster' positive sentinel did not succeed before rollback");

    // 3. Positive sentinel: 7 new gameplay_mechanics.kind values all admitted
    const newKinds = ['game_mode', 'election_type', 'score_system', 'drop_item', 'loc_macro', 'teamplay_message', 'mode_default'];
    let mechanicsInsertCount = 0;
    try {
      await s.begin(async (tx) => {
        for (const k of newKinds) {
          await tx`INSERT INTO gameplay_mechanics
                    (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
                   VALUES ('ktx', ${k}, ${'STUB_M011_' + k}, 'stub.c:1',
                           ${{} as any}, ${{} as any})`;
          mechanicsInsertCount++;
        }
        throw new Error('probe:rollback');
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'probe:rollback') {
        findings.push(`011 mechanics positive inserts failed at kind #${mechanicsInsertCount + 1}: ${e.message}`);
      }
    }
    if (mechanicsInsertCount !== 7) findings.push(`gameplay_mechanics: expected 7 new-kind inserts before rollback, got ${mechanicsInsertCount}`);

    // 4. Negative sentinel: kind='nonexistent_kind_xyz' rejected in gameplay_entity_defs
    let negEdRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO gameplay_entity_defs
                  (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
                 VALUES ('ktx', 'nonexistent_kind_xyz', 'STUB_M011_ED_NEG', 'stub.c:1',
                         ${{} as any}, ${{} as any})`;
      });
    } catch {
      negEdRejected = true;
    }
    if (!negEdRejected) findings.push("gameplay_entity_defs.kind CHECK did not reject 'nonexistent_kind_xyz'");

    // 5. Negative sentinel: kind='nonexistent_kind_xyz' rejected in gameplay_mechanics
    let negGmRejected = false;
    try {
      await s.begin(async (tx) => {
        await tx`INSERT INTO gameplay_mechanics
                  (gameplay_source_id, kind, name, source_ref, ruleset_gate_json, props_json)
                 VALUES ('ktx', 'nonexistent_kind_xyz', 'STUB_M011_GM_NEG', 'stub.c:1',
                         ${{} as any}, ${{} as any})`;
      });
    } catch {
      negGmRejected = true;
    }
    if (!negGmRejected) findings.push("gameplay_mechanics.kind CHECK did not reject 'nonexistent_kind_xyz'");

    return { migration: '011_ktx_gameplay_kinds.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },

  '012_description_origin.sql': async (s) => {
    const findings: string[] = [];

    // 1. entities.description_origin column exists
    const [colRow] = await s`
      SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_name='entities' AND column_name='description_origin'`;
    if ((colRow?.n ?? 0) !== 1) findings.push('entities.description_origin column does not exist');

    // 2. Backfill completeness: no rows with description non-NULL but description_origin NULL
    const [bfRow] = await s`
      SELECT count(*)::int AS n FROM entities
      WHERE description IS NOT NULL AND description_origin IS NULL`;
    if ((bfRow?.n ?? 0) > 0) {
      findings.push(`description_origin NULL for ${bfRow?.n ?? 0} rows with non-NULL description; backfill gap or deriver not setting origin`);
    }

    // 3. Valid-values spot-check: no unexpected description_origin values
    const [vvRow] = await s`
      SELECT count(*)::int AS n FROM entities
      WHERE description_origin IS NOT NULL
        AND description_origin NOT IN ('help_json','source_inline','inherited','synthesized')`;
    if ((vvRow?.n ?? 0) > 0) {
      findings.push(`${vvRow?.n ?? 0} rows have description_origin value not in expected set`);
    }

    return { migration: '012_description_origin.sql', status: findings.length === 0 ? 'PASS' : 'FAIL', findings };
  },
};
