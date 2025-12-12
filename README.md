# Unreal Python MCP

1. Enable the **Python Editor Script Plugin**,
2. Enable the `Edit` -> `Project Settings` -> `Plugins` -> `Python` -> `Enable Remote Execution` option
3. Run `npm install --save-dev git+https://github.com/EpicLolia/UnrealPythonMCP` in your workspace
4. Add mcp config:
   ```json
   {
     "mcpServers": {
       "unreal": {
         "command": "npx",
         "args": ["-y", "@runreal/unreal-mcp"]
       }
     }
   }
   ```
