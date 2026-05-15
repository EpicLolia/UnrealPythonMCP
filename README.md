# Unreal Python MCP

An MCP server that connects AI agents to Unreal Editor via Python remote execution.

## Features

- **Run Python code** directly in Unreal Editor
- **ToolsetRegistry integration** (UE 5.8+): 300+ built-in editor tools with schema validation
- **Connection reuse**: serial command queue with idle keep-alive, no port conflicts
- **Backward compatible**: graceful fallback on older UE versions

## Setup

1. Enable 'Python Editor Script Plugin' in Unreal Editor
2. Enable 'Edit' > 'Project Settings' > 'Plugins' > 'Python' > 'Enable Remote Execution' & 'Develop Mode'
3. (Optional, UE 5.8+) Enable the 'Toolset Registry' plugin for 300+ built-in editor tools
4. Restart Unreal Editor and keep it running
5. Add MCP config:
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

## Configuration

Environment variables:

| Variable                         | Description                                     | Default     |
| -------------------------------- | ----------------------------------------------- | ----------- |
| `UNREAL_MULTICAST_GROUP`         | Multicast group address                         | `239.0.0.1` |
| `UNREAL_MULTICAST_PORT`          | Multicast port                                  | `6766`      |
| `UNREAL_BIND_ADDRESS`            | Bind address                                    | `127.0.0.1` |
| `UNREAL_CONNECTION_IDLE_MS`      | Keep connection alive after last command (ms)   | `3000`      |
| `UNREAL_ENABLE_TOOLSET_REGISTRY` | Register ToolsetRegistry tools (`true`/`false`) | `true`      |

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

## How It Works

The server communicates with Unreal Editor via UDP multicast discovery + TCP command execution (Python Remote Execution protocol).

**Two modes of operation:**

1. **ToolsetRegistry** (preferred, UE 5.8+): Use `get_toolset_schema` to browse available tools, then `execute_tool` to call them. These are purpose-built, schema-validated editor operations.
2. **Raw Python** (fallback): Use `run_python_code` for custom logic or when no suitable tool exists.

## Tools

| Tool                 | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `run_python_code`    | Execute Python code in Unreal Editor                          |
| `run_python_file`    | Execute an existing .py script file                           |
| `get_toolset_schema` | Discover available ToolsetRegistry tools (3 levels of detail) |
| `execute_tool`       | Call a ToolsetRegistry tool by name                           |

## Resources

| Resource           | URI                    | Description                                          |
| ------------------ | ---------------------- | ---------------------------------------------------- |
| Unreal Python Stub | `unreal://python-stub` | File path to the auto-generated API stub (unreal.py) |

## Reference

1. [unreal-mcp](https://github.com/runreal/unreal-mcp)
2. [unreal-remote-execution](https://github.com/nils-soderman/unreal-remote-execution)
3. [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
