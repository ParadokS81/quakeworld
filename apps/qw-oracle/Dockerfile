# apps/qw-oracle/Dockerfile
# Build context: MONOREPO ROOT (/home/paradoks/projects/quakeworld/).
#
#   docker build -f apps/qw-oracle/Dockerfile \
#                -t ghcr.io/paradoks81/qw-oracle-mcp:<semver> \
#                -t ghcr.io/paradoks81/qw-oracle-mcp:latest \
#                .
#
# Two stages: install workspace deps once (deps stage), then copy the install
# output and the qw-oracle subset into a thin runtime image. The MCP server is
# the only entry point shipped; loaders, embedding scripts, and eval scripts
# run interactively from the operator's WSL against the prod Postgres over
# Tailscale, not inside this container.

ARG BUN_VERSION=1.3-alpine

FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /repo

# Workspace plumbing first (cached if package.json files don't change).
# The bun.lock at repo root resolves the workspace:* dep on
# @qw/version-resolution; the MCP server itself does not import that package
# but the parent qw-oracle package.json declares it. Bun's frozen-lockfile
# check compares the resolved workspace shape against bun.lock - omitting any
# sibling workspace's package.json makes bun think the workspace changed and
# bails. Copy every apps/*/package.json so the shape matches the lockfile.
COPY package.json bun.lock ./
COPY packages/qw-version-resolution/package.json ./packages/qw-version-resolution/package.json
COPY apps/matchscheduler/package.json ./apps/matchscheduler/package.json
COPY apps/quad/package.json ./apps/quad/package.json
COPY apps/qw-oracle/package.json ./apps/qw-oracle/package.json
COPY apps/slipgate-app/package.json ./apps/slipgate-app/package.json

# --filter=qw-oracle scopes install to qw-oracle + its workspace deps only;
# without this the build pulls in quad's @discordjs/opus (native node-pre-gyp
# binding) and slipgate-app's Tauri tooling, neither of which the MCP image
# needs.
RUN bun install --frozen-lockfile --production --filter=qw-oracle

# serve/mcp/ is NOT a workspace member - it has its own package.json + bun.lock
# (the MCP server's @modelcontextprotocol/sdk + express deps). Install those
# separately so node module resolution at runtime finds them.
COPY apps/qw-oracle/serve/mcp/package.json ./apps/qw-oracle/serve/mcp/package.json
COPY apps/qw-oracle/serve/mcp/bun.lock ./apps/qw-oracle/serve/mcp/bun.lock
RUN cd apps/qw-oracle/serve/mcp && bun install --frozen-lockfile --production

FROM oven/bun:${BUN_VERSION} AS runtime
WORKDIR /app

# Copy the install output (root + per-workspace node_modules trees) plus
# packages/qw-version-resolution source (workspace dep needs to resolve via
# its symlink even though the MCP server does not import it).
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/qw-oracle/node_modules ./apps/qw-oracle/node_modules
COPY --from=deps /repo/apps/qw-oracle/serve/mcp/node_modules ./apps/qw-oracle/serve/mcp/node_modules
COPY --from=deps /repo/packages ./packages

# Manifests for runtime debugging (e.g. printing the version on startup).
COPY apps/qw-oracle/package.json ./apps/qw-oracle/package.json
COPY apps/qw-oracle/serve/mcp/package.json ./apps/qw-oracle/serve/mcp/package.json

# Source: the MCP server tree + the shared modules the MCP imports + the
# migrations the server runs at first boot. Concept-notes and extractor
# outputs are NOT copied; concept-note bodies are loaded into Postgres at
# corpus-build time (Phase 4 loader). Layer 1 / Layer 2 data is loaded into
# Postgres by the operator running loaders from WSL against the prod
# connection string over Tailscale (or via pg_dump | pg_restore from dev,
# see deploy/README.md).
COPY apps/qw-oracle/serve/mcp/src ./apps/qw-oracle/serve/mcp/src
COPY apps/qw-oracle/shared ./apps/qw-oracle/shared
COPY apps/qw-oracle/db ./apps/qw-oracle/db

WORKDIR /app/apps/qw-oracle

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3000
EXPOSE 3000

# Health endpoint comes from serve/mcp/src/transports/http.ts (Phase 6 Task 10).
# Use BusyBox-compatible flags only: alpine ships BusyBox wget, which supports
# `-q` and `-O <file>` reliably but may not accept GNU long-form options like
# `--tries=` across all alpine releases. Redirecting body to /dev/null and
# letting the exit code propagate is the most portable HEALTHCHECK shape.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

CMD ["bun", "serve/mcp/src/index.ts"]
