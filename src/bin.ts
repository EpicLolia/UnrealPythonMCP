import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { runCommand } from '.';

const transport = new StdioServerTransport();

const server = new McpServer({
  version: '0.1.0',
  name: 'unreal-python-mcp',
});
server.connect(transport);

server.registerTool(
  'run_python_code',
  {
    title: 'Run Python Code',
    description:
      'Execute python code within the Unreal Editor. All python must have `import unreal` at the top. CHECK THE UNREAL PYTHON DOCUMENTATION BEFORE USING THIS TOOL. NEVER EVER ADD COMMENTS',
    inputSchema: {
      code: z.string().describe('Code to execute'),
    },
  },
  async ({ code }): Promise<CallToolResult> => {
    const result = await runCommand(code);

    return {
      content: [
        {
          type: 'text',
          text: result.output.map((line) => line.output).join('\n'),
        },
      ],
    };
  },
);
