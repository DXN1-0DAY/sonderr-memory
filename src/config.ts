import { MemoryEntry, MemoryStore, MemoryMeta } from "./memory/types";
import * as path from "path";
import * as fs from "fs";

export type UsageStats = {
  sessionCount: number;
  lastUsedAt: string | null;
  commandCounts: Record<string, number>;
};

export type Config = {
  store: MemoryStore;
  maxContextTokens: number;
  maxSearchResults: number;
  timelineLimit: number;
  autoLabel: boolean;
  enableUsageStats: boolean;
  usageStats?: UsageStats;
  theme: {
    bg: string;
    fg: string;
    accent: string;
  };
};

export const defaultConfig: Config = {
  store: { root: process.env.SONDERR_MEMORY_ROOT || "" },
  maxContextTokens: 2000,
  maxSearchResults: 50,
  timelineLimit: 40,
  autoLabel: false,
  enableUsageStats: false,
  theme: {
    bg: "#0d0d0d",
    fg: "#e6e6e6",
    accent: "#FF6A00",
  },
};

export function getConfigPath(store: MemoryStore): string {
  return path.join(store.root, "config.json");
}

export function loadConfig(): Config {
  const root = process.env.SONDERR_MEMORY_ROOT || process.env.HOME
    ? `${process.env.HOME}/.sonderr-memory`
    : "/tmp/.sonderr-memory";

  const configPath = path.join(root, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...defaultConfig,
        ...parsed,
        store: { root },
      };
    } catch {
      return { ...defaultConfig, store: { root } };
    }
  }

  return {
    ...defaultConfig,
    store: { root },
  };
}

export function saveConfig(config: Config): void {
  const configPath = getConfigPath(config.store);
  try {
    if (!fs.existsSync(config.store.root)) {
      fs.mkdirSync(config.store.root, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch {
    // local config write is best-effort
  }
}
