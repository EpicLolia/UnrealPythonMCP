"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCommand = runCommand;
const unreal_remote_execution_1 = require("unreal-remote-execution");
const config = new unreal_remote_execution_1.RemoteExecutionConfig(1, ['239.0.0.1', 6766], '127.0.0.1');
async function runCommand(code) {
    const remoteExecution = new unreal_remote_execution_1.RemoteExecution(config);
    remoteExecution.start();
    try {
        const node = await remoteExecution.getFirstRemoteNode(1000, 5000);
        await remoteExecution.openCommandConnection(node);
        return await remoteExecution.runCommand(code);
    }
    finally {
        remoteExecution.stop();
    }
}
//# sourceMappingURL=index.js.map