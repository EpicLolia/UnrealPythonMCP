#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types';
import { commandResultToJsonString, getUnrealPythonStub, runCommand, runFile } from '.';

const server = new McpServer({
  version: '0.1.1',
  name: 'unreal-python-mcp',
});

server.registerTool(
  'run_python_code',
  {
    title: 'Run Python Code in Unreal Editor',
    description:
      'Execute Python code within Unreal Editor. Note: 1) Use `import unreal` to access the Unreal Python API. 2) Refer to the Unreal Python API Stub (using tool `get_python_api_stub`) for available classes and methods. 3) Avoid adding comments in the code.',
    inputSchema: {
      code: z.string().describe('Python code to execute'),
    },
  },
  async ({ code }): Promise<CallToolResult> => {
    const result = await runCommand(code);
    return { content: [{ type: 'text', text: commandResultToJsonString(result) }] };
  },
);

server.registerTool(
  'run_python_file',
  {
    title: 'Run Python File in Unreal Editor',
    description: 'Execute a python file within the Unreal Editor.',
    inputSchema: {
      path: z.string().describe('Path to the python file'),
      args: z.array(z.string()).describe('Arguments to pass'),
    },
  },
  async ({ path, args }): Promise<CallToolResult> => {
    const result = await runFile(path, args);
    return { content: [{ type: 'text', text: commandResultToJsonString(result) }] };
  },
);

server.registerTool(
  'get_python_api_stub',
  {
    title: 'Get Unreal Python API Stub File Path',
    description:
      'Returns the local file path of the auto-generated Python API stub (unreal.py) for the current Unreal Engine project. Use this path to read the stub file for type hints and API reference. Note: The stub file can be very large (40MB+).',
  },
  async (): Promise<CallToolResult> => {
    const path = await getUnrealPythonStub();
    return { content: [{ type: 'text', text: path }] };
  },
);

server.registerResource(
  'unreal_python_api_docs',
  'resource://unreal/python-api-docs',
  {
    title: 'Unreal Engine Python API Documentation',
    description: 'Official Epic Games documentation for the Unreal Engine Python API.',
    mimeType: 'text/html',
  },
  async (): Promise<ReadResourceResult> => {
    return {
      contents: [
        {
          uri: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/',
          text: 'For complete Unreal Engine Python API reference, visit: https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/',
        },
      ],
    };
  },
);

server.registerResource(
  'unreal_python_api_stub',
  'resource://unreal/python-stub',
  {
    title: 'Unreal Python API Stub File Path',
    description:
      'Returns the local file path of the auto-generated Python API stub (unreal.py) for the current Unreal Engine project. This stub file contains type hints and class definitions for IDE autocompletion.',
    mimeType: 'text/plain',
  },
  async (): Promise<ReadResourceResult> => {
    const path = await getUnrealPythonStub();
    return { contents: [{ uri: `file:///${path}`, text: `Unreal Python API stub file location: ${path}` }] };
  },
);

const transport = new StdioServerTransport();
server.connect(transport);
