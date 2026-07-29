import { IRemoteExecutionMessageCommandOutputData, RemoteExecution, RemoteExecutionConfig } from 'unreal-remote-execution';
import { get } from './config';

// Command history for workbench
export interface CommandRecord {
  id: number;
  timestamp: string;
  code: string;
  success: boolean;
  output: string;
  duration: number; // ms
}

export const commandHistory: CommandRecord[] = [];
let nextRecordId = 1;

function recordCommand(code: string, result: IRemoteExecutionMessageCommandOutputData, duration: number) {
  const maxHistory = get('UNREAL_MAX_HISTORY');
  const output = formatCommandResult(result);
  commandHistory.push({
    id: nextRecordId++,
    timestamp: new Date().toISOString(),
    code,
    success: !hasException(result),
    output,
    duration,
  });
  if (commandHistory.length > maxHistory) {
    commandHistory.shift();
  }
}

// Serial command queue with connection reuse
interface QueueItem {
  code: string;
  resolve: (value: IRemoteExecutionMessageCommandOutputData) => void;
  reject: (reason: unknown) => void;
}
const queue: QueueItem[] = [];
let working = false;
let wakeUp: (() => void) | null = null;

async function processQueue() {
  if (wakeUp) wakeUp();
  if (working) return;
  working = true;

  const remoteConfig = new RemoteExecutionConfig(
    1,
    [get('UNREAL_MULTICAST_GROUP'), get('UNREAL_MULTICAST_PORT')],
    get('UNREAL_BIND_ADDRESS'),
  );
  const re = new RemoteExecution(remoteConfig);
  try {
    await re.start();
    const node = await re.getFirstRemoteNode(1000, 5000);
    await re.openCommandConnection(node);

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const startTime = Date.now();
      try {
        const result = await re.runCommand(item.code);
        recordCommand(item.code, result, Date.now() - startTime);
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }
      // Keep connection alive briefly, wake immediately if new command arrives
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            wakeUp = null;
            resolve();
          }, get('UNREAL_CONNECTION_IDLE_MS'));
          wakeUp = () => {
            clearTimeout(timer);
            wakeUp = null;
            resolve();
          };
        });
      }
    }
  } catch (err) {
    for (const item of queue) item.reject(err);
  } finally {
    re.stop();
    queue.length = 0;
    working = false;
  }
}

// Prevent unhandled socket 'error' events from crashing the process.
// The unreal-remote-execution library does not attach error listeners to its
// UDP broadcast socket, so invalid config values (e.g. bad bind address) cause
// an unhandled 'error' event that would otherwise terminate Node.js.
process.on('uncaughtException', (err) => {
  process.stderr.write(`[unreal-mcp] Uncaught exception (recovered): ${err.message}\n`);
  for (const item of queue) item.reject(err);
  queue.length = 0;
  working = false;
});
process.on('unhandledRejection', (reason) => {
  process.stderr.write(`[unreal-mcp] Unhandled rejection (recovered): ${reason}\n`);
  for (const item of queue) item.reject(reason);
  queue.length = 0;
  working = false;
});

export function runCommand(code: string): Promise<IRemoteExecutionMessageCommandOutputData> {
  return new Promise((resolve, reject) => {
    queue.push({ code, resolve, reject });
    processQueue();
  });
}

export function hasException(result: IRemoteExecutionMessageCommandOutputData) {
  return result.result !== 'None';
}

export function formatCommandResult(result: IRemoteExecutionMessageCommandOutputData) {
  // logs
  const lines = result.output.map((item) => {
    let line = item.type !== 'Info' ? `[${item.type}] ` : '';
    line += item.output.replace(/\r\n|\r/g, '\n');
    if (!line.endsWith('\n')) line += '\n';
    return line;
  });
  // exception traceback
  if (hasException(result)) lines.push(result.result.replace(/\r\n|\r/g, '\n') + '\n');
  return lines.join('');
}

export async function runFile(path: string, args?: string[]) {
  let cmd = path;
  if (args && args.length > 0) cmd += ` ${args.join(' ')}`;
  return await runCommand(cmd);
}

export async function getUnrealPythonStub(): Promise<string | null> {
  const code = `import unreal;print(f'{unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_intermediate_dir())}PythonStub/unreal.py')`;
  const result = await runCommand(code);
  return result.output[0]?.output?.trim() ?? null;
}

// #region ToolsetRegistry

export interface ToolSchema {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

export interface ToolsetSchema {
  name: string;
  description?: string;
  tools: ToolSchema[];
}

/**
 * Returns all registered toolset schemas, or null if ToolsetRegistry is not available (UE < 5.8).
 */
export async function getAllToolsetSchemas(): Promise<ToolsetSchema[] | null> {
  const code = `import unreal
if hasattr(unreal, 'ToolsetRegistry'):
    print(unreal.ToolsetRegistry.get_all_toolset_json_schemas())
else:
    print('null')`;
  const result = await runCommand(code);
  return JSON.parse(result.output[0]?.output?.trim() ?? 'null');
}

export async function executeTool(
  toolset: string,
  toolName: string,
  argsJson: string,
): Promise<{ result: string; error: string; is_complete: boolean } | null> {
  const code = `import unreal, json
if hasattr(unreal, 'ToolsetRegistry'):
    r = unreal.ToolsetRegistry.execute_tool(${JSON.stringify(toolset)}, ${JSON.stringify(toolName)}, ${JSON.stringify(argsJson)})
    result, error = r.value, r.error
    print(json.dumps({"is_complete": bool(r.is_complete), "result": result, "error": error}))`;
  const result = await runCommand(code);
  const output = result.output[0]?.output?.trim();
  if (!output) return null;
  const parsed = JSON.parse(output);
  return { result: parsed.result ?? '', error: parsed.error ?? '', is_complete: parsed.is_complete ?? true };
}

// #endregion
