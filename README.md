# Unreal Python MCP

## Setup

1. Enable 'Python Editor Script Plugin' in Unreal Editor
2. Enable 'Edit' → 'Project Settings' → 'Plugins' → 'Python' → 'Enable Remote Execution' & 'Develop Mode'
3. Restart Unreal Editor and keep it running
4. Add mcp config:
   ```json
   {
     "mcpServers": {
       "unreal": {
         "command": "npx",
         "args": ["-y", "unreal-python-mcp"]
       }
     }
   }
   ```
5. Enjoy it!

- If your mcp client does not support auto install node packages, you can run `npm install --save-dev unreal-python-mcp` in your workspace

## Reference

1. [unreal-mcp](https://github.com/runreal/unreal-mcp)
2. [unreal-remote-execution](https://github.com/nils-soderman/unreal-remote-execution)
3. [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
