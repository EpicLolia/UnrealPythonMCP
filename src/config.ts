// Centralized configuration for Unreal Python MCP Server

export const config = {
  UNREAL_MULTICAST_GROUP: {
    description: 'UDP multicast group address for Unreal remote execution',
    defaultValue: '239.0.0.1',
    mutable: true,
  },
  UNREAL_MULTICAST_PORT: {
    description: 'UDP multicast port for Unreal remote execution',
    defaultValue: 6766,
    mutable: true,
  },
  UNREAL_BIND_ADDRESS: {
    description: 'Local bind address for UDP communication',
    defaultValue: '127.0.0.1',
    mutable: true,
  },
  UNREAL_CONNECTION_IDLE_MS: {
    description: 'Milliseconds to keep connection alive after last command',
    defaultValue: 3000,
    mutable: true,
  },
  UNREAL_ENABLE_TOOLSET_REGISTRY: {
    description: 'Enable ToolsetRegistry tools (requires UE 5.8+)',
    defaultValue: true,
    mutable: false,
  },
  UNREAL_ENABLE_WORKBENCH: {
    description: 'Enable the Workbench HTTP server',
    defaultValue: false,
    mutable: false,
  },
  UNREAL_WORKBENCH_PORT: {
    description: 'Base HTTP port for the Workbench server',
    defaultValue: 3120,
    mutable: false,
  },
  UNREAL_MAX_HISTORY: {
    description: 'Maximum number of command history records to keep',
    defaultValue: 128,
    mutable: true,
  },
} as const;

// Type inference from config definition
type ConfigDef = typeof config;
type ConfigKey = keyof ConfigDef;
type ConfigValueType<K extends ConfigKey> = ConfigDef[K]['defaultValue'] extends boolean
  ? boolean
  : ConfigDef[K]['defaultValue'] extends number
    ? number
    : string;

function parseBool(v: string): boolean {
  return !['false', '0', 'no', 'off'].includes(v.toLowerCase());
}

// Runtime value store — initialized from env vars or defaults
const values: Record<string, boolean | number | string> = {};
function setValue(key: ConfigKey, value: boolean | number | string | undefined) {
  const def = config[key];
  if (value === undefined) {
    values[key] = def.defaultValue;
  } else if (typeof def.defaultValue === 'number') {
    values[key] = typeof value === 'number' ? value : parseInt(String(value), 10);
  } else if (typeof def.defaultValue === 'boolean') {
    values[key] = typeof value === 'boolean' ? value : parseBool(String(value));
  } else {
    values[key] = String(value);
  }
}

function initValues() {
  for (const key of Object.keys(config) as ConfigKey[]) {
    const env = process.env[key];
    setValue(key, env);
  }
}
initValues();

/** Get a config value by key (type-safe, inferred from defaultValue) */
export function get<K extends ConfigKey>(key: K) {
  return values[key] as ConfigValueType<K>;
}

/** Get all config items for API serialization */
export function getConfigSummary() {
  return (Object.keys(config) as ConfigKey[]).map((key) => {
    const def = config[key];
    return {
      key,
      description: def.description,
      defaultValue: def.defaultValue,
      mutable: def.mutable,
      value: values[key],
    };
  });
}

/** Update a mutable config value at runtime */
export function updateConfig(key: ConfigKey, value: string | number | boolean): void {
  if (!(key in config)) throw new Error(`Unknown config key: ${key}`);
  const def = config[key];
  if (!def.mutable) throw new Error(`Config "${key}" is not mutable at runtime`);
  setValue(key, value);
}
