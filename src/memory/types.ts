export type MemoryEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  path: string;
  project?: string;
  topics: string[];
  people: string[];
  tags: string[];
  source: "inbox" | "project" | "topic" | "lesson" | "reference";
  content: string;
  linkedIds: string[];
};

export type MemoryStore = {
  root: string;
};

export type MemoryMeta = {
  total: number;
  bySource: Record<string, number>;
  byProject: Record<string, number>;
  byTopic: Record<string, number>;
  recentIds: string[];
};
