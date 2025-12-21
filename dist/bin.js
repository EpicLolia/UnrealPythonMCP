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
    version: '0.1.7',
    name: 'unreal-python-mcp',
    title: 'Unreal Python MCP Server',
}, {
    instructions: 'Provides tools to execute Python script in Unreal Editor',
});
server.registerTool('run_python_code', {
    title: 'Run Python Code in Unreal Editor',
    description: `Execute Python code within Unreal Editor. Tips:
1. Access Unreal API via 'import unreal'
2. Explore available API using Python's inspect module
3. Obtain Python stub via 'get_python_stub' for text-based API discovery`,
    inputSchema: { code: z.string().describe('Python code to execute') },
}, async ({ code }) => {
    const result = await (0, _1.runCommand)(code);
    return { content: [{ type: 'text', text: (0, _1.commandResultToJsonString)(result) }] };
});
server.registerTool('run_python_file', {
    title: 'Run Python Script File in Unreal Editor',
    description: 'Execute Python script within Unreal Editor.',
    inputSchema: {
        path: z.string().describe('Absolute path to the script to execute'),
        args: z.array(z.string()).optional().describe('Optional command-line arguments to pass to the script'),
    },
}, async ({ path, args }) => {
    const result = await (0, _1.runFile)(path, args);
    return { content: [{ type: 'text', text: (0, _1.commandResultToJsonString)(result) }] };
});
server.registerTool('get_python_stub', {
    title: 'Get Unreal Python Stub Path',
    description: 'Returns the file path of the auto-generated Unreal Python stub (unreal.py).',
}, async () => {
    const path = await (0, _1.getUnrealPythonStub)();
    return { content: [{ type: 'text', text: path }] };
});
// TODO(loiafeng): Resource & Prompt
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
//# sourceMappingURL=bin.js.map