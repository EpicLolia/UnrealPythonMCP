import { IRemoteExecutionMessageCommandOutputData, RemoteExecution, RemoteExecutionConfig } from 'unreal-remote-execution';

const config = new RemoteExecutionConfig(1, ['239.0.0.1', 6766], '127.0.0.1');

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

export async function runFile(path: string, args?: string[]) {
  let cmd = path;
  if (args && args.length > 0) cmd += ` ${args.join(' ')}`;
  return await runCommand(cmd);
}

const GET_UNREAL_PYTHON_STUB = `import unreal;print(f'{unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_intermediate_dir())}PythonStub/unreal.py')`;

export async function getUnrealPythonStub() {
  const result = await runCommand(GET_UNREAL_PYTHON_STUB);
  return result.output[0]?.output;
}

export function commandResultToJsonString(result: IRemoteExecutionMessageCommandOutputData) {
  const lines = result.output.map((item) => {
    let line = item.type !== 'Info' ? `[${item.type}] ` : '';
    line += item.output.replace(/\r\n|\r/g, '\n');
    if (!line.endsWith('\n')) line += '\n';
    return line;
  });
  if (result.result !== 'None') lines.push(result.result.replace(/\r\n|\r/g, '\n') + '\n');
  return lines.join('');
}
