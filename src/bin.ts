#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { commandResultToJsonString, getUnrealPythonStub, runCommand, runFile } from '.';

const server = new McpServer(
  {
    version: '0.1.5',
    name: 'unreal-python-mcp',
    title: 'Unreal Python MCP Server',
  },
  {
    instructions: '',
  },
);

server.registerTool(
  'run_python_code',
  {
    title: 'Run Python Code in Unreal Editor',
    description: `Execute Python code within Unreal Editor. Tips:
1. Access Unreal API via 'import unreal'
2. Explore available API using Python's inspect module
3. Obtain Python stub via 'get_python_stub' for text-based API discovery`,
    inputSchema: { code: z.string().describe('Python code to execute') },
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
    description: 'Execute Python script file within Unreal Editor.',
    inputSchema: {
      path: z.string().describe('Absolute path to the script to execute'),
      args: z.array(z.string()).optional().describe('Optional command-line arguments to pass to the script'),
    },
  },
  async ({ path, args }): Promise<CallToolResult> => {
    const result = await runFile(path, args);
    return { content: [{ type: 'text', text: commandResultToJsonString(result) }] };
  },
);

server.registerTool(
  'get_python_stub',
  {
    title: 'Get Unreal Python Stub File Path',
    description: 'Returns the file path of the auto-generated unreal python stub (unreal.py).',
  },
  async (): Promise<CallToolResult> => {
    const path = await getUnrealPythonStub();
    return { content: [{ type: 'text', text: path }] };
  },
);

// TODO(loiafeng): Resource & Prompt

const transport = new StdioServerTransport();
server.connect(transport);
