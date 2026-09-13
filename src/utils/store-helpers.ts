import { MemoryStore } from "../memory/types";

export function ensureStore(root: string): MemoryStore {
  const fs = require("fs");
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  return { root };
}

export function ensureDirs(store: MemoryStore) {
  const fs = require("fs");
  const dirs = [
    store.root,
    `${store.root}/inbox`,
    `${store.root}/projects`,
    `${store.root}/topics`,
    `${store.root}/lessons`,
    `${store.root}/references`,
    `${store.root}/index`,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

export function getStoreRoot(): string {
  return process.env.SONDERR_MEMORY_ROOT || (process.env.HOME ? `${process.env.HOME}/.sonderr-memory` : "/tmp/.sonderr-memory");
}
