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
};

export type MemoryStore = {
  root: string;
};
