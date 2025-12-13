#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const z = __importStar(require("zod/v4"));
const _1 = require(".");
const server = new mcp_js_1.McpServer({
    version: '0.1.0',
    name: 'unreal-python-mcp',
});
server.registerTool('run_python_code', {
    title: 'Run Python Code in Unreal Editor',
    description: 'Execute Python code within Unreal Editor. Note: 1) Use `import unreal` to access the Unreal Python API. 2) Refer to the Unreal Python API documentation for available classes and methods. 3) Avoid adding comments in the code.',
    inputSchema: {
        code: z.string().describe('Python code to execute'),
    },
}, async ({ code }) => {
    const result = await (0, _1.runCommand)(code);
    return {
        content: [{ type: 'text', text: result.output.map((line) => line.output).join('\n') }],
    };
});
server.registerTool('run_python_file', {
    title: 'Run Python File in Unreal Editor',
    description: 'Execute a python file within the Unreal Editor.',
    inputSchema: {
        path: z.string().describe('Path to the python file'),
        args: z.array(z.string()).describe('Arguments to pass'),
    },
}, async ({ path, args }) => {
    const result = await (0, _1.runFile)(path, args);
    return { content: [{ type: 'text', text: result.output.map((line) => line.output).join('\n') }] };
});
server.registerTool('get_unreal_python_api_stub_path', {
    title: 'Get Unreal Python API Stub Path',
    description: 'Returns the local file path of the auto-generated Python API stub (unreal.py) for the current Unreal Engine project. Use this path to read the stub file for type hints and API reference. Note: The stub file can be very large (40MB+).',
}, async () => {
    return { content: [{ type: 'text', text: await (0, _1.getUnrealPythonStub)() }] };
});
server.registerResource('unreal_python_api_docs', 'resource://unreal/python-api-docs', {
    title: 'Unreal Engine Python API Documentation',
    description: 'Official Epic Games documentation for the Unreal Engine Python API.',
    mimeType: 'text/html',
}, async () => {
    return {
        contents: [
            {
                uri: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/',
                text: 'For complete Unreal Engine Python API reference, visit: https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/',
            },
        ],
    };
});
server.registerResource('unreal_python_api_stub', 'resource://unreal/python-stub', {
    title: 'Unreal Python API Stub File Path',
    description: 'Returns the local file path of the auto-generated Python API stub (unreal.py) for the current Unreal Engine project. This stub file contains type hints and class definitions for IDE autocompletion.',
    mimeType: 'text/plain',
}, async () => {
    const path = await (0, _1.getUnrealPythonStub)();
    return {
        contents: [{ uri: `file:///${path}`, text: `Unreal Python API stub file location: ${path}` }],
    };
});
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
//# sourceMappingURL=bin.js.map