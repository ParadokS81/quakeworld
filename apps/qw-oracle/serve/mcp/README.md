# qw-oracle MCP server

Exposes Layers 1-3 of the QW knowledge service over the Model Context Protocol. Any MCP-capable LLM client can load it as a tool server.

## Tools

- `lookup_entity(name, project?, type?)` - Layer 1 cvar/command lookup, returns rows with a type discriminator plus linked Layer 3 concept notes. Cross-layer linking to Layer 2 is done by the caller via `search_solved_issues`, not via precomputed junction.
- `search_solved_issues(query, limit?)` - Layer 2 FTS5 search across the 128K denoised session corpus. Returns session metadata plus the raw chat transcript (category='chat' filtered) for each matching session. The outlet LLM reads the raw messages and synthesises the answer.
- `get_concept_note(id)` - Layer 3 concept note retrieval by canonical id.

All tools return a response envelope with `match_quality` (`strong | weak | none`) and an optional `suggested_fallback` string. Outlet policy decides what to do on `none` or `weak` matches.

## Run locally

    cd apps/qw-oracle/serve/mcp
    bun install
    bun run dev

The server speaks MCP over stdio.

## Register with Claude Code

From this repo root:

    claude mcp add qw-oracle bun run /home/paradoks/projects/quakeworld-poc/apps/qw-oracle/serve/mcp/src/index.ts

Or edit `~/.claude.json` directly, adding under `mcpServers`:

    {
      "mcpServers": {
        "qw-oracle": {
          "command": "bun",
          "args": ["run", "/home/paradoks/projects/quakeworld-poc/apps/qw-oracle/serve/mcp/src/index.ts"]
        }
      }
    }

Then restart Claude Code and run `/mcp` to confirm `qw-oracle` is listed with three tools.

## Data dependencies

The server reads `apps/qw-oracle/data/qw.db` and `apps/qw-oracle/layers/concepts/*.md`. Run the Layer 1 importer (`node layers/facts/import-from-qw-config.mjs`) first so `kb_cvars` and `kb_commands` are populated. The Layer 2 corpus (`sessions`, `message_labels`, `session_search`) and Layer 3 concept notes must also be present.

No build-time LLM dependency. No API key needed.
