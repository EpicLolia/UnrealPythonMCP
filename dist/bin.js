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
    title: 'Run Python Code',
    description: 'Execute python code within the Unreal Editor. All python must have `import unreal` at the top. CHECK THE UNREAL PYTHON DOCUMENTATION BEFORE USING THIS TOOL. NEVER EVER ADD COMMENTS',
    inputSchema: {
        code: z.string().describe('Code to execute'),
    },
}, async ({ code }) => {
    const result = await (0, _1.runCommand)(code);
    return {
        content: [
            {
                type: 'text',
                text: result.output.map((line) => line.output).join('\n'),
            },
        ],
    };
});
server.registerResource('unreal_python_api_docs', 'https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/', {
    title: 'Unreal Engine Python API Documentation',
    description: 'Official documentation for Unreal Engine Python API',
    mimeType: 'text/plain',
}, async () => {
    return {
        contents: [
            {
                uri: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/',
                text: 'Unreal Engine Python API Documentation',
            },
        ],
    };
});
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
//# sourceMappingURL=bin.js.map