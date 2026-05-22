import * as http from 'http';
import { commandHistory, formatCommandResult, hasException, runCommand } from '.';
import { get, getConfigSummary, updateConfig } from './config';
import fs from 'fs';
import path from 'path';

// #region HTTP Server

function setCorsHeaders(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: http.ServerResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    setCorsHeaders(res);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/history') {
    sendJson(res, commandHistory);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run') {
    readBody(req)
      .then(async (body) => {
        const { code } = JSON.parse(body);
        if (!code || typeof code !== 'string') {
          sendJson(res, { error: 'Missing "code" field' }, 400);
          return;
        }
        try {
          const result = await runCommand(code);
          sendJson(res, {
            success: !hasException(result),
            output: formatCommandResult(result),
          });
        } catch (err) {
          sendJson(res, { success: false, output: String(err) }, 500);
        }
      })
      .catch(() => {
        sendJson(res, { error: 'Invalid request body' }, 400);
      });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    sendJson(res, getConfigSummary());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/config') {
    readBody(req)
      .then((body) => {
        const { key, value } = JSON.parse(body);
        if (!key) {
          sendJson(res, { error: 'Missing "key" field' }, 400);
          return;
        }
        try {
          updateConfig(key, value);
          sendJson(res, { success: true, key, value: get(key) });
        } catch (err) {
          sendJson(res, { error: String(err instanceof Error ? err.message : err) }, 400);
        }
      })
      .catch(() => {
        sendJson(res, { error: 'Invalid request body' }, 400);
      });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}

export function startWorkbench() {
  const basePort = get('workbenchPort');
  const maxAttempts = 10;

  tryListen(basePort, 0, maxAttempts);
}

function tryListen(basePort: number, attempt: number, maxAttempts: number) {
  const port = basePort + attempt;
  const server = http.createServer(handleRequest);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attempt < maxAttempts - 1) {
      tryListen(basePort, attempt + 1, maxAttempts);
    } else {
      process.stderr.write(`[unreal-mcp] Failed to start Workbench: ${err.message}\n`);
    }
  });

  server.listen(port, () => {
    process.stderr.write(`[unreal-mcp] Workbench available at http://localhost:${port}\n`);
  });
}

// #endregion

// #region HTML Frontend

function getHtml(): string {
  return fs.readFileSync(path.join(__dirname, '../res/workbench.html'), 'utf8');
}

// #endregion
