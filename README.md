# Unreal Python MCP

## Setup

1. Enable 'Python Editor Script Plugin' in Unreal Editor
2. Enable 'Edit' → 'Project Settings' → 'Plugins' → 'Python' → 'Enable Remote Execution' & 'Develop Mode'
3. Restart Unreal Editor and keep it running
4. Add mcp config:
   ```json
   {
     "mcpServers": {
       "unreal-python-mcp": {
         "command": "npx",
         "args": ["-y", "unreal-python-mcp"]
       }
     }
   }
   ```
5. Enjoy it!

## Configuration (Optional)

You can customize the remote execution connection via environment variables:

| Environment Variable     | Description             | Default     |
| ------------------------ | ----------------------- | ----------- |
| `UNREAL_MULTICAST_GROUP` | Multicast group address | `239.0.0.1` |
| `UNREAL_MULTICAST_PORT`  | Multicast port          | `6766`      |
| `UNREAL_BIND_ADDRESS`    | Bind address            | `127.0.0.1` |

Example with custom configuration:

```json
{
  "mcpServers": {
    "unreal-python-mcp": {
      "command": "npx",
      "args": ["-y", "unreal-python-mcp"],
      "env": {
        "UNREAL_BIND_ADDRESS": "0.0.0.0"
      }
    }
  }
}
```

## Reference

1. [unreal-mcp](https://github.com/runreal/unreal-mcp)
2. [unreal-remote-execution](https://github.com/nils-soderman/unreal-remote-execution)
3. [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
