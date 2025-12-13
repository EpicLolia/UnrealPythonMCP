# Unreal Python MCP

## Installation

1. Enable the **Python Editor Script Plugin**
2. Enable the `Edit` -> `Project Settings` -> `Plugins` -> `Python` -> `Enable Remote Execution` & `Develop Mode` option
3. (Optional. If your mcp client support fetch npm online, you can skip this step) Run `npm install --save-dev unreal-python-mcp` in your workspace
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

## Reference

1. [unreal-mcp](https://github.com/runreal/unreal-mcp)
2. [unreal-remote-execution](https://github.com/nils-soderman/unreal-remote-execution)