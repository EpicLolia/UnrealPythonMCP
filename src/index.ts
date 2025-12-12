import { RemoteExecution, RemoteExecutionConfig } from 'unreal-remote-execution';

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
