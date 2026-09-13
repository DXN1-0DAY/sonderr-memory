import { MemoryEntry, MemoryStore, MemoryMeta } from "./memory/types";

export type Config = {
  store: MemoryStore;
  maxContextTokens: number;
  maxSearchResults: number;
  timelineLimit: number;
  autoLabel: boolean;
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
  theme: {
    bg: "#0d0d0d",
    fg: "#e6e6e6",
    accent: "#FF6A00",
  },
};

export function loadConfig(): Config {
  const root = process.env.SONDERR_MEMORY_ROOT || process.env.HOME
    ? `${process.env.HOME}/.sonderr-memory`
    : "/tmp/.sonderr-memory";

  return {
    ...defaultConfig,
    store: { root },
  };
}
