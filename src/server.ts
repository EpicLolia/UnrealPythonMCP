#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types';
import { commandResultToJsonString, executeTool, getToolsetSchema, getUnrealPythonStub, runCommand, runFile } from '.';

const server = new McpServer(
  {
    version: '0.1.7',
    name: 'unreal-python-mcp',
    title: 'Unreal Python MCP Server',
  },
  {
    instructions: 'Provides tools to execute Python script in Unreal Editor',
  },
);

server.registerTool(
  'run_python_code',
  {
    title: 'Run Python Code in Unreal Editor',
    description: `Execute Python code within Unreal Editor. Tips:
1. Access Unreal API via 'import unreal'
2. Explore available API using Python's inspect module
3. Use the 'unreal-python-stub' resource for text-based API discovery
4. Use 'get_toolset_schema' and 'execute_tool' for ToolsetRegistry tools`,
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
    title: 'Run Python Script File in Unreal Editor',
    description: 'Execute Python script within Unreal Editor.',
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

server.registerResource(
  'unreal_python_stub',
  'unreal://python-stub',
  {
    title: 'Unreal Python Stub',
    description:
      'File path of the auto-generated Unreal Python stub (unreal.py). The stub file is typically very large (40MB+), so only the path is provided here — use a file reading tool to access its contents.',
    mimeType: 'text/plain',
  },
  async (): Promise<ReadResourceResult> => {
    const path = await getUnrealPythonStub();
    return {
      contents: [{ uri: 'unreal://python-stub', mimeType: 'text/plain', text: path }],
    };
  },
);

server.registerTool(
  'get_toolset_schema',
  {
    title: 'Get Toolset Schema',
    description: `Look up registered toolsets and tools in Unreal Editor (ToolsetRegistry). Three levels of detail:
- No args: list all toolset names and descriptions
- toolset only: list all tool names and descriptions in that toolset
- toolset + tool_name: get full input/output schema for that tool`,
    inputSchema: {
      toolset: z
        .string()
        .optional()
        .describe('Toolset name, e.g. "ECABridge" or "toolset_registry.toolsets.core.static_mesh.StaticMeshTools"'),
      tool_name: z.string().optional().describe('Tool name, e.g. "get_level_info", "get_lod_count"'),
    },
  },
  async ({ toolset, tool_name }): Promise<CallToolResult> => {
    const text = await getToolsetSchema(toolset, tool_name);
    return { content: [{ type: 'text', text }] };
  },
);

server.registerTool(
  'execute_tool',
  {
    title: 'Execute Unreal Editor Tool',
    description:
      'Execute a tool registered in Unreal Editor via ToolsetRegistry. Use the get_toolset_schema tool to discover available tools and their schemas.',
    inputSchema: {
      toolset: z.string().describe('Toolset name, e.g. "ECABridge" or "toolset_registry.toolsets.core.static_mesh.StaticMeshTools"'),
      tool_name: z.string().describe('Tool name (e.g. "get_level_info", "get_lod_count")'),
      args: z.string().default('{}').describe('Tool arguments as JSON string'),
    },
  },
  async ({ toolset, tool_name, args }): Promise<CallToolResult> => {
    const result = await executeTool(toolset, tool_name, args);
    return { content: [{ type: 'text', text: commandResultToJsonString(result) }] };
  },
);

const transport = new StdioServerTransport();
server.connect(transport);
