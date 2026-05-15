import { IRemoteExecutionMessageCommandOutputData, RemoteExecution, RemoteExecutionConfig } from 'unreal-remote-execution';

const multicastGroup = process.env.UNREAL_MULTICAST_GROUP || '239.0.0.1';
const multicastPort = parseInt(process.env.UNREAL_MULTICAST_PORT || '6766', 10);
const bindAddress = process.env.UNREAL_BIND_ADDRESS || '127.0.0.1';

const config = new RemoteExecutionConfig(1, [multicastGroup, multicastPort], bindAddress);

// Serial command queue with connection reuse
interface QueueItem {
  code: string;
  resolve: (value: IRemoteExecutionMessageCommandOutputData) => void;
  reject: (reason: unknown) => void;
}
const queue: QueueItem[] = [];
let working = false;

async function processQueue() {
  if (working) return;
  working = true;

  const re = new RemoteExecution(config);
  try {
    await re.start();
    const node = await re.getFirstRemoteNode(1000, 5000);
    await re.openCommandConnection(node);

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      try {
        const result = await re.runCommand(item.code);
        item.resolve(result);
      } catch (err) {
        item.reject(err);
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

export function runCommand(code: string): Promise<IRemoteExecutionMessageCommandOutputData> {
  return new Promise((resolve, reject) => {
    queue.push({ code, resolve, reject });
    processQueue();
  });
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
  if (result.result !== 'None') lines.push(result.result.replace(/\r\n|\r/g, '\n') + '\n');
  return lines.join('');
}

export async function runFile(path: string, args?: string[]) {
  let cmd = path;
  if (args && args.length > 0) cmd += ` ${args.join(' ')}`;
  return await runCommand(cmd);
}

export async function getUnrealPythonStub() {
  const code = `import unreal;print(f'{unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_intermediate_dir())}PythonStub/unreal.py')`;
  const result = await runCommand(code);
  const path = result.output[0]?.output;
  if (!path) throw new Error('Failed to get Python stub path from Unreal Editor');
  return path;
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
  return JSON.parse(result.output[0]?.output ?? 'null');
}

export async function executeTool(toolset: string, toolName: string, argsJson: string) {
  const code = `import unreal, json
if hasattr(unreal, 'ToolsetRegistry'):
    result, error = unreal.ToolsetRegistry.execute_tool(${JSON.stringify(toolset)}, ${JSON.stringify(toolName)}, ${JSON.stringify(argsJson)})
else:
    result, error = None, 'ToolsetRegistry is not available in this version of Unreal Editor. Use run_python_code instead.'
print(result)
print(error)`;
  const result = await runCommand(code);
  return {
    result: result.output[0]?.output ?? '',
    error: result.output[1]?.output ?? '',
  };
}

// #endregion
