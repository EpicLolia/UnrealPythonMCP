import { IRemoteExecutionMessageCommandOutputData, RemoteExecution, RemoteExecutionConfig } from 'unreal-remote-execution';

const multicastGroup = process.env.UNREAL_MULTICAST_GROUP || '239.0.0.1';
const multicastPort = parseInt(process.env.UNREAL_MULTICAST_PORT || '6766', 10);
const bindAddress = process.env.UNREAL_BIND_ADDRESS || '127.0.0.1';

const config = new RemoteExecutionConfig(1, [multicastGroup, multicastPort], bindAddress);

export async function runCommand(code: string) {
  const remoteExecution = new RemoteExecution(config);
  remoteExecution.start();
  try {
    const node = await remoteExecution.getFirstRemoteNode(1000, 5000);
    await remoteExecution.openCommandConnection(node);
    return await remoteExecution.runCommand(code);
  } finally {
    remoteExecution.stop();
  }
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
  return result.output[0]?.output;
}

// #region ToolsetRegistry

interface ToolSchema {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

interface ToolsetSchema {
  name: string;
  description?: string;
  tools: ToolSchema[];
}

async function getAllToolsetSchemas(): Promise<ToolsetSchema[]> {
  const code = `import unreal;print(unreal.ToolsetRegistry.get_all_toolset_json_schemas())`;
  const result = await runCommand(code);
  return JSON.parse(result.output[0]?.output ?? '[]');
}

function shortToolName(fullName: string) {
  const parts = fullName.split('.');
  return parts[parts.length - 1];
}

export async function getToolsetSchema(toolsetName?: string, toolName?: string): Promise<string> {
  const schemas = await getAllToolsetSchemas();

  if (!toolsetName) {
    // Level 1: list all toolsets
    return JSON.stringify(schemas.map((ts) => ({ name: ts.name, description: ts.description ?? '' })));
  }

  const ts = schemas.find((s) => s.name === toolsetName);
  if (!ts) {
    return JSON.stringify({
      error: 'Toolset not found',
      available: schemas.map((s) => s.name),
    });
  }

  if (!toolName) {
    // Level 2: list tools in a toolset
    return JSON.stringify({
      name: ts.name,
      description: ts.description ?? '',
      tools: ts.tools.map((t) => ({
        name: shortToolName(t.name),
        description: (t.description ?? '').split('\n')[0].slice(0, 120),
      })),
    });
  }

  // Level 3: full schema for a single tool
  const tool = ts.tools.find((t) => t.name === toolName || shortToolName(t.name) === toolName);
  if (!tool) {
    return JSON.stringify({
      error: 'Tool not found',
      available: ts.tools.map((t) => shortToolName(t.name)),
    });
  }

  return JSON.stringify(tool);
}

export async function executeTool(toolset: string, toolName: string, argsJson: string) {
  const code = `import unreal, json
result, error = unreal.ToolsetRegistry.execute_tool(${JSON.stringify(toolset)}, ${JSON.stringify(toolName)}, ${JSON.stringify(argsJson)})
print(json.dumps({'result': result, 'error': error}, ensure_ascii=False))`;
  return await runCommand(code);
}

// #endregion
