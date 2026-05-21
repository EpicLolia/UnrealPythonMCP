import * as http from 'http';
import { commandHistory, formatCommandResult, hasException, runCommand } from '.';
import { get, getConfigSummary, updateConfig } from './config';

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
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unreal MCP Workbench</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1e1e2e;
    color: #cdd6f4;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 12px 20px;
    background: #181825;
    border-bottom: 1px solid #313244;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header h1 {
    font-size: 16px;
    font-weight: 600;
    color: #cba6f7;
  }
  header .actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  header .status {
    font-size: 12px;
    color: #6c7086;
  }
  .editor-section {
    padding: 16px 20px;
    background: #1e1e2e;
    border-bottom: 1px solid #313244;
  }
  .editor-section textarea {
    width: 100%;
    min-height: 100px;
    background: #11111b;
    color: #cdd6f4;
    border: 1px solid #313244;
    border-radius: 6px;
    padding: 12px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    tab-size: 4;
  }
  .editor-section textarea:focus {
    border-color: #cba6f7;
  }
  .editor-toolbar {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  button {
    padding: 6px 14px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  button:hover { opacity: 0.85; }
  button:active { opacity: 0.7; }
  .btn-primary { background: #cba6f7; color: #1e1e2e; }
  .btn-secondary { background: #313244; color: #cdd6f4; }
  .btn-small {
    padding: 3px 8px;
    font-size: 11px;
    border-radius: 3px;
  }
  .history-section {
    flex: 1;
    overflow-y: auto;
    padding: 12px 20px;
  }
  .history-section h2 {
    font-size: 13px;
    font-weight: 600;
    color: #6c7086;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .record {
    background: #181825;
    border: 1px solid #313244;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
    transition: border-color 0.15s;
  }
  .record:hover { border-color: #45475a; }
  .record-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .record-id { color: #6c7086; font-weight: 600; }
  .record-time { color: #6c7086; }
  .record-duration { color: #6c7086; margin-left: auto; }
  .badge-success { background: #a6e3a1; color: #1e1e2e; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
  .badge-error { background: #f38ba8; color: #1e1e2e; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
  .record-code {
    background: #11111b;
    border-radius: 4px;
    padding: 8px 10px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
    color: #a6adc8;
  }
  .record-output {
    margin-top: 6px;
    background: #11111b;
    border-radius: 4px;
    padding: 8px 10px;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 80px;
    overflow-y: auto;
    color: #6c7086;
    display: none;
  }
  .record-output.visible { display: block; }
  .record-actions {
    margin-top: 8px;
    display: flex;
    gap: 6px;
  }
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #6c7086;
  }
  .empty-state p { font-size: 14px; }
  .running-indicator {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f9e2af;
    animation: pulse 1s infinite;
    margin-right: 6px;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  /* Tabs */
  .tabs {
    display: flex;
    gap: 0;
    background: #181825;
    border-bottom: 1px solid #313244;
  }
  .tab {
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 500;
    color: #6c7086;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab:hover { color: #cdd6f4; }
  .tab.active { color: #cba6f7; border-bottom-color: #cba6f7; }
  .tab-content { display: none; flex: 1; overflow-y: auto; }
  .tab-content.active { display: flex; flex-direction: column; }
  /* Config panel */
  .config-section {
    padding: 16px 20px;
  }
  .config-item {
    background: #181825;
    border: 1px solid #313244;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
  }
  .config-item.readonly { opacity: 0.6; }
  .config-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .config-key {
    font-weight: 600;
    font-size: 13px;
    color: #cdd6f4;
  }
  .config-env {
    font-size: 11px;
    color: #6c7086;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  }
  .config-badge-mutable {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #a6e3a1;
    color: #1e1e2e;
    font-weight: 600;
  }
  .config-badge-readonly {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #45475a;
    color: #a6adc8;
    font-weight: 600;
  }
  .config-desc {
    font-size: 12px;
    color: #6c7086;
    margin-bottom: 8px;
  }
  .config-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .config-input {
    flex: 1;
    padding: 6px 10px;
    background: #11111b;
    border: 1px solid #313244;
    border-radius: 4px;
    color: #cdd6f4;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    outline: none;
  }
  .config-input:focus { border-color: #cba6f7; }
  .config-input:disabled { color: #6c7086; cursor: not-allowed; }
  .config-default {
    font-size: 11px;
    color: #6c7086;
    margin-top: 4px;
  }
</style>
</head>
<body>
<header>
  <h1>Unreal MCP Workbench</h1>
  <div class="actions">
    <span class="status" id="status">Ready</span>
    <button class="btn-secondary btn-small" onclick="refreshHistory()">Refresh</button>
  </div>
</header>

<div class="tabs">
  <div class="tab active" onclick="switchTab('commands')">Commands</div>
  <div class="tab" onclick="switchTab('config')">Config</div>
</div>

<div class="tab-content active" id="tab-commands">
  <div class="editor-section">
    <textarea id="editor" placeholder="Enter Python code to execute in Unreal Editor..." spellcheck="false"></textarea>
    <div class="editor-toolbar">
      <button class="btn-primary" onclick="runCode()" id="runBtn">Run</button>
      <button class="btn-secondary" onclick="clearEditor()">Clear</button>
    </div>
  </div>

  <div class="history-section">
    <h2>Command History</h2>
    <div id="history-list">
      <div class="empty-state"><p>No commands executed yet.</p></div>
    </div>
  </div>
</div>

<div class="tab-content" id="tab-config">
  <div class="config-section" id="config-list"></div>
</div>

<script>
const editor = document.getElementById('editor');
const historyList = document.getElementById('history-list');
const status = document.getElementById('status');
const runBtn = document.getElementById('runBtn');

let autoRefreshTimer = null;

// Handle Tab key in textarea
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
});

async function runCode() {
  const code = editor.value.trim();
  if (!code) return;

  runBtn.disabled = true;
  status.innerHTML = '<span class="running-indicator"></span>Running...';

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    status.textContent = data.success ? 'Completed successfully' : 'Completed with error';
    refreshHistory();
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  } finally {
    runBtn.disabled = false;
  }
}

function clearEditor() {
  editor.value = '';
  editor.focus();
}

function loadToEditor(code) {
  editor.value = code;
  editor.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    const prev = status.textContent;
    status.textContent = 'Copied!';
    setTimeout(() => { status.textContent = prev; }, 1500);
  });
}

function toggleOutput(id) {
  const el = document.getElementById('output-' + id);
  if (el) el.classList.toggle('visible');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString();
}

async function refreshHistory() {
  try {
    const res = await fetch('/api/history');
    const records = await res.json();
    renderHistory(records);
  } catch (err) {
    // silent fail on refresh
  }
}

function renderHistory(records) {
  if (records.length === 0) {
    historyList.innerHTML = '<div class="empty-state"><p>No commands executed yet.</p></div>';
    return;
  }

  // Show newest first
  const sorted = [...records].reverse();
  historyList.innerHTML = sorted.map(r => {
    const badge = r.success
      ? '<span class="badge-success">OK</span>'
      : '<span class="badge-error">ERR</span>';
    const codePreview = r.code.length > 500 ? r.code.slice(0, 500) + '...' : r.code;
    const hasOutput = r.output && r.output.trim().length > 0;

    return \`<div class="record">
      <div class="record-header">
        <span class="record-id">#\${r.id}</span>
        \${badge}
        <span class="record-time">\${formatTime(r.timestamp)}</span>
        <span class="record-duration">\${r.duration}ms</span>
      </div>
      <div class="record-code">\${escapeHtml(codePreview)}</div>
      \${hasOutput ? \`<div class="record-output" id="output-\${r.id}">\${escapeHtml(r.output)}</div>\` : ''}
      <div class="record-actions">
        <button class="btn-primary btn-small" onclick="loadToEditor(\${JSON.stringify(JSON.stringify(r.code))})">Edit</button>
        <button class="btn-secondary btn-small" onclick="copyCode(\${JSON.stringify(JSON.stringify(r.code))})">Copy</button>
        \${hasOutput ? \`<button class="btn-secondary btn-small" onclick="toggleOutput(\${r.id})">Output</button>\` : ''}
      </div>
    </div>\`;
  }).join('');
}

// Auto-refresh every 2 seconds
function startAutoRefresh() {
  autoRefreshTimer = setInterval(refreshHistory, 2000);
}

// Tab switching
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(\`.tab-content#tab-\${tab}\`).classList.add('active');
  event.target.classList.add('active');
  if (tab === 'config') refreshConfig();
}

// Config panel
async function refreshConfig() {
  try {
    const res = await fetch('/api/config');
    const items = await res.json();
    renderConfig(items);
  } catch (err) {
    // silent
  }
}

function renderConfig(items) {
  const configList = document.getElementById('config-list');
  configList.innerHTML = items.map(item => {
    const badge = item.mutable
      ? '<span class="config-badge-mutable">MUTABLE</span>'
      : '<span class="config-badge-readonly">READONLY</span>';
    return \`<div class="config-item \${item.mutable ? '' : 'readonly'}">
      <div class="config-header">
        <span class="config-key">\${item.key}</span>
        \${badge}
      </div>
      <div class="config-desc">\${escapeHtml(item.description)}</div>
      <div class="config-env">\${item.env}</div>
      <div class="config-input-row">
        <input class="config-input" id="config-\${item.key}" value="\${escapeHtml(String(item.value))}" \${item.mutable ? '' : 'disabled'} />
        \${item.mutable ? \`<button class="btn-primary btn-small" onclick="saveConfig('\${item.key}')">Save</button>\` : ''}
      </div>
      <div class="config-default">Default: \${escapeHtml(String(item.defaultValue))}</div>
    </div>\`;
  }).join('');
}

async function saveConfig(key) {
  const input = document.getElementById('config-' + key);
  const value = input.value;
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    const data = await res.json();
    if (data.error) {
      status.textContent = 'Error: ' + data.error;
    } else {
      status.textContent = key + ' updated';
      setTimeout(() => { status.textContent = 'Ready'; }, 2000);
    }
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

// Initial load
refreshHistory();
startAutoRefresh();
</script>
</body>
</html>`;
}

// #endregion
