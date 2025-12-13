import { IRemoteExecutionMessageCommandOutputData, RemoteExecution, RemoteExecutionConfig } from 'unreal-remote-execution';

const config = new RemoteExecutionConfig(1, ['239.0.0.1', 6766], '127.0.0.1');

const HELPER = `
1. Enable the 'Python Editor Script Plugin'
2. Enable 'Edit' -> 'Project Settings' -> 'Plugins' -> 'Python' -> 'Enable Remote Execution' & 'Develop Mode'
`;

export async function runCommand(code: string) {
  const remoteExecution = new RemoteExecution(config);
  remoteExecution.start();
  try {
    const node = await remoteExecution.getFirstRemoteNode(1000, 5000);
    await remoteExecution.openCommandConnection(node);
    return await remoteExecution.runCommand(code);
  } catch (error) {
    console.error(`failed to run command, please check the following:\n${HELPER}`);
    throw error;
  } finally {
    remoteExecution.stop();
  }
}

export async function runFile(path: string, args: string[]) {
  return await runCommand(`${path} ${args.join(' ')}`);
}

const GET_UNREAL_PYTHON_STUB = `import unreal;print(f'{unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_intermediate_dir())}PythonStub/unreal.py')`;

export async function getUnrealPythonStub() {
  const result = await runCommand(GET_UNREAL_PYTHON_STUB);
  return result.output[0]?.output;
}

export function commandResultToJsonString(result: IRemoteExecutionMessageCommandOutputData) {
  const lines = result.output.map((item) => `[${item.type}] ${item.output}`);
  if (result.result !== 'None') {
    lines.push(result.result);
    lines.push('Note: Refer to the Unreal Python API Stub (using tool `get_python_api_stub`) for available classes and methods.');
  }
  return lines.join('');
}
