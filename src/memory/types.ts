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
  importance: number;
  confidence: number;
  accessCount: number;
  lastAccessedAt: string;
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
  topAccessed: string[];
};

export type ContextBudget = {
  maxTokens: number;
  reservedForSystem: number;
  reservedForResponse: number;
  availableForMemory: number;
};

export type ContextItem = {
  entry: MemoryEntry;
  score: number;
  reason: string;
  tokens: number;
};

export type ContextPlan = {
  query: string;
  items: ContextItem[];
  totalTokens: number;
  budget: ContextBudget;
};
