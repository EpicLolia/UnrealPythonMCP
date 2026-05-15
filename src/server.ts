#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types';
import { formatCommandResult, executeTool, getAllToolsetSchemas, getUnrealPythonStub, runCommand, runFile, hasException } from '.';

const enableToolsetRegistry = process.env.UNREAL_ENABLE_TOOLSET_REGISTRY !== 'false';

const server = new McpServer(
  {
    version: '0.2.0',
    name: 'unreal-python-mcp',
    title: 'Unreal Python MCP Server',
  },
  {
    instructions: `Provides tools to execute Python script in Unreal Editor.

Two ways to interact with the editor:
1. ToolsetRegistry tools (preferred when available): Use get_toolset_schema to discover available tools, then execute_tool to call them. These are purpose-built, schema-validated editor operations covering 300+ tools (actors, Blueprints, materials, meshes, Niagara, UMG, etc.).
2. Raw Python (fallback): Use run_python_code for custom logic or when no suitable tool exists. Access the Unreal API via 'import unreal'.

Note: ToolsetRegistry requires Unreal Editor 5.8+ with the Toolset Registry plugin enabled. If get_toolset_schema returns an error, fall back to run_python_code.`,
  },
);

server.registerTool(
  'run_python_code',
  {
    title: 'Run Python Code in Unreal Editor',
    description: `Execute Python code within Unreal Editor. Use this for custom logic when no ToolsetRegistry tool is available.
- Access Unreal API via 'import unreal'
- Use the 'unreal-python-stub' resource to get the path to the full API stub (unreal.py) for reference`,
    inputSchema: { code: z.string().describe('Python code to execute') },
  },
  async ({ code }): Promise<CallToolResult> => {
    const result = await runCommand(code);
    return { content: [{ type: 'text', text: formatCommandResult(result) }], isError: hasException(result) };
  },
);

server.registerTool(
  'run_python_file',
  {
    title: 'Run Python Script File in Unreal Editor',
    description:
      'Execute a Python script file within Unreal Editor. Use this instead of run_python_code when running an existing .py file on disk.',
    inputSchema: {
      path: z.string().describe('Absolute path to the script to execute'),
      args: z.array(z.string()).optional().describe('Optional command-line arguments to pass to the script'),
    },
  },
  async ({ path, args }): Promise<CallToolResult> => {
    const result = await runFile(path, args);
    return { content: [{ type: 'text', text: formatCommandResult(result) }], isError: hasException(result) };
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
    if (!path) throw new Error('Failed to get Python stub path from Unreal Editor.');
    return {
      contents: [{ uri: 'unreal://python-stub', mimeType: 'text/plain', text: path }],
    };
  },
);

if (enableToolsetRegistry) {
  server.registerTool(
    'get_toolset_schema',
    {
      title: 'Get Toolset Schema',
      description: `Look up registered toolsets and tools in Unreal Editor. Requires UE 5.8+ with the Toolset Registry plugin enabled. Three levels of detail:
- No args: list all toolset names and descriptions
- toolset only: list all tool names and descriptions in that toolset
- toolset + tool_name: get full input/output schema for that tool

Always check the schema before calling execute_tool — it tells you exactly what arguments are required.`,
      inputSchema: {
        toolset: z.string().optional().describe('Toolset name, e.g. "toolset_registry.toolsets.core.static_mesh.StaticMeshTools"'),
        tool_name: z.string().optional().describe('Tool name, e.g. "get_level_info", "get_lod_count"'),
      },
    },
    async ({ toolset, tool_name }): Promise<CallToolResult> => {
      const schemas = await getAllToolsetSchemas();
      if (schemas === null) {
        return {
          content: [
            {
              type: 'text',
              text: 'ToolsetRegistry is not available. Requires UE 5.8+ with the Toolset Registry plugin enabled. Use run_python_code instead.',
            },
          ],
          isError: true,
        };
      }

      if (!toolset) {
        if (tool_name) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'toolset is required when tool_name is specified' }) }] };
        }
        // Level 1: list all toolsets
        const text = JSON.stringify(schemas.map((ts) => ({ name: ts.name, description: ts.description ?? '' })));
        return { content: [{ type: 'text', text }] };
      }

      const ts = schemas.find((s) => s.name === toolset);
      if (!ts) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Toolset not found', available: schemas.map((s) => s.name) }) }] };
      }

      if (!tool_name) {
        // Level 2: list tools in a toolset
        const shortName = (name: string) => (name.includes('.') ? name.split('.').pop() : name);
        const text = JSON.stringify({
          name: ts.name,
          description: ts.description ?? '',
          tools: ts.tools.map((t) => {
            const desc = t.description ?? '';
            return { name: shortName(t.name), description: desc.length > 120 ? desc.slice(0, 120) + '...' : desc };
          }),
        });
        return { content: [{ type: 'text', text }] };
      }

      // Level 3: full schema for a single tool
      const shortName = (name: string) => (name.includes('.') ? name.split('.').pop() : name);
      const tool = ts.tools.find((t) => t.name === tool_name || shortName(t.name) === tool_name);
      if (!tool) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Tool not found', available: ts.tools.map((t) => shortName(t.name)) }) }],
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(tool) }] };
    },
  );

  server.registerTool(
    'execute_tool',
    {
      title: 'Execute Unreal Editor Tool',
      description: `Execute a tool registered in Unreal Editor via ToolsetRegistry. Use the get_toolset_schema tool to discover available tools and their schemas.

tool_name should be the short name (e.g. "get_level_info", not the fully qualified "ECABridge.get_level_info"). Check the tool's inputSchema via get_toolset_schema before calling to ensure correct arguments.`,
      inputSchema: {
        toolset: z.string().describe('Toolset name, e.g. "ECABridge" or "toolset_registry.toolsets.core.static_mesh.StaticMeshTools"'),
        tool_name: z.string().describe('Tool name (e.g. "get_level_info", "get_lod_count")'),
        args: z.record(z.string(), z.unknown()).default({}).describe('Tool arguments as object'),
      },
    },
    async ({ toolset, tool_name, args }): Promise<CallToolResult> => {
      const result = await executeTool(toolset, tool_name, JSON.stringify(args));
      if (result === null) {
        return {
          content: [
            {
              type: 'text',
              text: 'ToolsetRegistry is not available. Requires UE 5.8+ with the Toolset Registry plugin enabled. Use run_python_code instead.',
            },
          ],
          isError: true,
        };
      }
      if (result.error) {
        return { content: [{ type: 'text', text: result.error }], isError: true };
      }
      return { content: [{ type: 'text', text: result.result }] };
    },
  );
}

const transport = new StdioServerTransport();
server.connect(transport);
