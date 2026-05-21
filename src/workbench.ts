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
  :root {
    --bg: #1e1e2e;
    --bg-surface: #181825;
    --bg-deep: #11111b;
    --border: #313244;
    --border-hover: #45475a;
    --text: #cdd6f4;
    --text-dim: #6c7086;
    --text-faint: #585b70;
    --accent: #cba6f7;
    --green: #a6e3a1;
    --red: #f38ba8;
    --yellow: #f9e2af;
    --mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Header */
  header {
    padding: 10px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  header h1 { font-size: 15px; font-weight: 600; color: var(--accent); }
  header .status { font-size: 12px; color: var(--text-dim); }

  /* Three-column layout */
  .main-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    overflow: hidden;
  }

  /* Panels */
  .panel-left {
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-right {
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-header {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-surface);
    flex-shrink: 0;
  }

  /* History list */
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }
  .history-item {
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition: background 0.1s;
  }
  .history-item:hover { background: var(--bg-surface); }
  .history-item.active {
    background: var(--bg-surface);
    border-color: var(--accent);
  }
  .history-item-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .history-item-id { font-size: 11px; font-weight: 600; color: var(--text-dim); }
  .history-item-meta { font-size: 10px; color: var(--text-faint); margin-left: auto; }
  .history-item-code {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  /* Badges */
  .badge {
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    color: var(--bg);
  }
  .badge-ok { background: var(--green); }
  .badge-err { background: var(--red); }

  /* Center panel */
  .panel-center {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .editor-wrapper {
    flex: 3;
    display: flex;
    flex-direction: column;
    padding: 16px;
    min-height: 0;
    position: relative;
  }
  .editor-wrapper textarea {
    flex: 1;
    width: 100%;
    background: var(--bg-deep);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px;
    padding-bottom: 50px;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.6;
    resize: none;
    outline: none;
    tab-size: 4;
    transition: border-color 0.2s;
  }
  .editor-wrapper textarea:focus { border-color: var(--accent); }
  .editor-wrapper textarea.running {
    border-color: var(--yellow);
    animation: running-pulse 1.5s ease-in-out infinite;
  }
  @keyframes running-pulse {
    0%, 100% { border-color: var(--yellow); }
    50% { border-color: var(--border); }
  }
  .editor-toolbar {
    position: absolute;
    bottom: 28px;
    right: 28px;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  /* Output */
  .output-wrapper {
    flex: 2;
    display: flex;
    flex-direction: column;
    padding: 0 16px 16px 16px;
    min-height: 0;
  }
  .output-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    flex-shrink: 0;
  }
  .output-content {
    flex: 1;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    overflow-y: auto;
    color: var(--text);
  }
  .output-content.placeholder {
    color: var(--text-faint);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .output-content.error { border-color: var(--red); }
  .output-content.success { border-color: var(--green); }

  /* Config */
  .config-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }
  .config-item {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 6px;
  }
  .config-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 8px;
  }
  .config-key {
    font-weight: 600;
    font-size: 12px;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .config-input {
    width: 100%;
    padding: 5px 8px;
    background: var(--bg-deep);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    outline: none;
    transition: border-color 0.15s;
  }
  .config-input:focus { border-color: var(--accent); }
  .config-input:disabled {
    color: var(--text);
    cursor: default;
    border-color: transparent;
    background: transparent;
  }
  .config-input.saved {
    border-color: var(--green);
  }
  .config-desc {
    font-size: 10px;
    color: var(--text-faint);
    margin-top: 4px;
  }

  /* Buttons */
  button {
    padding: 6px 14px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.1s;
  }
  button:hover { opacity: 0.85; }
  button:active { opacity: 0.7; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-run {
    background: var(--accent);
    color: var(--bg);
    padding: 8px 20px;
    border-radius: 6px;
    font-weight: 600;
  }
  .btn-clear {
    background: var(--border);
    color: var(--text-dim);
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 40px 16px;
    color: var(--text-faint);
    font-size: 13px;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }
</style>
</head>
<body>
<header>
  <h1>Unreal MCP Workbench</h1>
  <span class="status" id="status">Ready</span>
</header>

<div class="main-layout">
  <div class="panel-left">
    <div class="panel-header">History</div>
    <div class="history-list" id="history-list">
      <div class="empty-state">No commands yet</div>
    </div>
  </div>

  <div class="panel-center">
    <div class="editor-wrapper">
      <textarea id="editor" placeholder="Enter Python code...&#10;&#10;Ctrl+Enter to run" spellcheck="false"></textarea>
      <div class="editor-toolbar">
        <button class="btn-clear" onclick="clearEditor()">Clear</button>
        <button class="btn-run" id="runBtn" onclick="runCode()">Run</button>
      </div>
    </div>
    <div class="output-wrapper">
      <div class="output-label">Output</div>
      <div class="output-content placeholder" id="output">Run code to see output</div>
    </div>
  </div>

  <div class="panel-right">
    <div class="panel-header">Config</div>
    <div class="config-list" id="config-list"></div>
  </div>
</div>

<script>
const editor = document.getElementById('editor');
const output = document.getElementById('output');
const historyList = document.getElementById('history-list');
const statusEl = document.getElementById('status');
const runBtn = document.getElementById('runBtn');

// Store history records for safe lookup (avoids XSS from inline JSON)
let historyRecords = [];
let activeHistoryId = null;

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart, end = editor.selectionEnd;
    editor.value = editor.value.substring(0, s) + '    ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = s + 4;
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
  editor.classList.add('running');
  statusEl.textContent = 'Running...';
  output.className = 'output-content placeholder';
  output.textContent = 'Executing...';

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    output.textContent = data.output || '(no output)';
    output.className = 'output-content ' + (data.success ? 'success' : 'error');
    statusEl.textContent = data.success ? 'Done' : 'Error';
    refreshHistory();
  } catch (err) {
    output.textContent = 'Request failed: ' + err.message;
    output.className = 'output-content error';
    statusEl.textContent = 'Error';
  } finally {
    runBtn.disabled = false;
    editor.classList.remove('running');
  }
}

function clearEditor() {
  editor.value = '';
  editor.focus();
}

function selectHistoryItem(id) {
  const record = historyRecords.find(r => r.id === id);
  if (!record) return;
  activeHistoryId = id;
  editor.value = record.code;
  output.textContent = record.output || '(no output)';
  output.className = 'output-content ' + (record.success ? 'success' : 'error');
  document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('hist-' + id);
  if (el) el.classList.add('active');
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function codePreview(code) {
  const line = code.split('\\n')[0];
  return line.length > 50 ? line.slice(0, 50) + '...' : line;
}

async function refreshHistory() {
  try {
    const res = await fetch('/api/history');
    historyRecords = await res.json();
    renderHistory();
  } catch (e) { /* silent */ }
}

function renderHistory() {
  if (historyRecords.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No commands yet</div>';
    return;
  }
  const sorted = [...historyRecords].reverse();
  historyList.innerHTML = sorted.map(r => {
    const badge = r.success
      ? '<span class="badge badge-ok">OK</span>'
      : '<span class="badge badge-err">ERR</span>';
    const active = r.id === activeHistoryId ? ' active' : '';
    const meta = formatTime(r.timestamp) + (r.duration != null ? ' · ' + r.duration + 'ms' : '');
    return \`<div class="history-item\${active}" id="hist-\${r.id}" onclick="selectHistoryItem(\${r.id})" tabindex="0" role="button">
      <div class="history-item-header">
        <span class="history-item-id">#\${r.id}</span>
        \${badge}
        <span class="history-item-meta">\${meta}</span>
      </div>
      <div class="history-item-code">\${escapeHtml(codePreview(r.code))}</div>
    </div>\`;
  }).join('');
}

// Config
async function refreshConfig() {
  try {
    const res = await fetch('/api/config');
    renderConfig(await res.json());
  } catch (e) { /* silent */ }
}

function renderConfig(items) {
  const list = document.getElementById('config-list');
  list.innerHTML = items.map(item => {
    const placeholder = item.mutable ? String(item.defaultValue) : '';
    return \`<div class="config-item">
      <div class="config-row">
        <span class="config-key">\${escapeHtml(item.key)}</span>
        <input class="config-input" id="cfg-\${item.key}"
          value="\${escapeHtml(String(item.value))}"
          placeholder="\${escapeHtml(placeholder)}"
          \${item.mutable ? 'data-mutable="1"' : 'disabled'} />
      </div>
      <div class="config-desc">\${escapeHtml(item.description)}</div>
    </div>\`;
  }).join('');

  // Attach auto-save on blur or Enter for mutable inputs
  list.querySelectorAll('input[data-mutable]').forEach(input => {
    const original = input.value;
    input.addEventListener('blur', () => {
      if (input.value !== original) {
        const key = input.id.replace('cfg-', '');
        saveConfig(key, input);
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
  });
}

async function saveConfig(key, input) {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: input.value }),
    });
    const data = await res.json();
    if (data.error) {
      statusEl.textContent = 'Error: ' + data.error;
      setTimeout(() => { statusEl.textContent = 'Ready'; }, 3000);
    } else {
      input.classList.add('saved');
      setTimeout(() => { input.classList.remove('saved'); }, 1500);
    }
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    setTimeout(() => { statusEl.textContent = 'Ready'; }, 3000);
  }
}

// Polling with visibility check
let pollTimer = null;
function startPolling() {
  pollTimer = setInterval(() => {
    if (!document.hidden) refreshHistory();
  }, 3000);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshHistory();
});

// Keyboard support for history items
historyList.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    const item = e.target.closest('.history-item');
    if (item) { e.preventDefault(); item.click(); }
  }
});

// Init
refreshHistory();
refreshConfig();
startPolling();
</script>
</body>
</html>`;
}

// #endregion
