// apps/qw-oracle/serve/mcp/src/transports/http.ts
//
// Streamable HTTP transport for the public-MCP deploy. Sessions are stateful:
// per the SDK v1.x pattern, each initialize request creates a new Server +
// transport pair; subsequent requests on the same session reuse the transport.
// Binds 0.0.0.0 inside the container so nginx (separate container on the same
// docker bridge network) can proxy to mcp:3000. The compose `ports:` block
// controls host exposure - in production we map only nginx to a host port,
// never mcp; the MCP container is reachable only via the qworacle-net bridge.
// 127.0.0.1-only would have been wrong: nginx reaches the container via its
// bridge IP, not via loopback inside it.

import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const transports = new Map<string, StreamableHTTPServerTransport>();

export function startHttpServer(createServer: () => Server, port: number): void {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Health endpoint for uptime monitors and the Phase 8 deploy gate. Plain
  // text, no auth, separate from the MCP path.
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).type('text/plain').send('ok');
  });

  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;
      if (sessionId && transports.has(sessionId)) {
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, transport);
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports.has(sid)) transports.delete(sid);
        };
        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('[qw-oracle-mcp] http POST error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET /mcp opens an SSE stream for server-initiated notifications on an
  // existing session (per the Streamable HTTP transport contract).
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).type('text/plain').send('Invalid or missing session ID');
      return;
    }
    await transports.get(sessionId)!.handleRequest(req, res);
  });

  // DELETE /mcp terminates a session (per the Streamable HTTP transport
  // contract). The transport's onclose handler removes it from the map.
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).type('text/plain').send('Invalid or missing session ID');
      return;
    }
    try {
      await transports.get(sessionId)!.handleRequest(req, res);
    } catch (err) {
      console.error('[qw-oracle-mcp] http DELETE error:', err);
      if (!res.headersSent) res.status(500).type('text/plain').send('Error processing session termination');
    }
  });

  app.listen(port, '0.0.0.0');

  // Graceful shutdown: close every active transport on SIGINT.
  process.on('SIGINT', async () => {
    console.error('[qw-oracle-mcp] http shutting down...');
    for (const [sid, transport] of transports) {
      try {
        await transport.close();
      } catch (err) {
        console.error(`[qw-oracle-mcp] error closing session ${sid}:`, err);
      }
    }
    process.exit(0);
  });
}
