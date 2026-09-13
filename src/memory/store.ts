import { MemoryStore } from "./types.ts";

export function createStore(root = "/home/dxn1/.sonderr-memory"): MemoryStore {
  return { root };
}

export function inboxPath(store: MemoryStore, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${store.root}/inbox/${y}/${m}/${d}`;
}
