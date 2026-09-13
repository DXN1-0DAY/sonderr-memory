import type { MemoryEntry } from "../memory/types";

export type SaveHook = {
  beforeSave?: (entry: Partial<MemoryEntry>) => Partial<MemoryEntry> | void;
  afterSave?: (entry: MemoryEntry) => void;
};

export type LoadHook = {
  beforeLoad?: (path: string, text: string) => { text: string } | void;
  afterParse?: (entry: MemoryEntry) => MemoryEntry | void;
};

export type UpdateHook = {
  beforeUpdate?: (entry: MemoryEntry, patch: Partial<MemoryEntry>) => Partial<MemoryEntry> | void;
  afterUpdate?: (entry: MemoryEntry) => void;
};

export type DeleteHook = {
  beforeDelete?: (entry: MemoryEntry) => boolean | void;
  afterDelete?: (entry: MemoryEntry) => void;
};

export type MemoryHooks = SaveHook & LoadHook & UpdateHook & DeleteHook;
