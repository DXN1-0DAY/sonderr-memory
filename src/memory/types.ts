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

export type MemoryFrontmatter = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  source?: MemoryEntry["source"];
  project?: string;
  topics?: string[];
  people?: string[];
  tags?: string[];
  linkedIds?: string[];
  importance?: number;
  confidence?: number;
  accessCount?: number;
  lastAccessedAt?: string;
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

export type SearchOptions = {
  fieldWeights?: {
    project?: number;
    topic?: number;
    tag?: number;
    people?: number;
    content?: number;
  };
  exactPhraseBonus?: number;
  wordLengthBonus?: number;
  lengthNormalization?: boolean;
};

export type ScoredSearchResult = {
  entry: MemoryEntry;
  score: number;
  matchedFields: string[];
};

export type SimilarityResult = {
  entry: MemoryEntry;
  score: number;
  contentSimilarity: number;
  topicSimilarity: number;
  tagSimilarity: number;
  peopleSimilarity: number;
  projectMatch: boolean;
};

export type DedupOptions = {
  threshold?: number;
  onDuplicate?: "skip" | "update" | "merge";
  mergeStrategy?: "newest" | "oldest" | "highest-importance";
};

export type MergeStrategy = "newest" | "oldest" | "highest-importance";

export type ConsolidationPolicy = {
  similarityThreshold: number;
  maxMergeSize: number;
  maxContentSnippet: number;
  preserveLinkedIds: boolean;
};

export type ConsolidationPair = {
  primary: MemoryEntry;
  secondary: MemoryEntry;
  similarity: number;
  sharedTopics: string[];
  sharedTags: string[];
  sharedWords: string[];
};

export type ConsolidationResult = {
  merged: MemoryEntry;
  mergedFrom: string[];
  deleted: string[];
  pairsConsidered: ConsolidationPair[];
};

export type ArchivePolicy = {
  staleAccessDays: number;
  importanceDecayRate: number;
  maxAgeDays: number;
  archiveAfterDays: number;
};

export type StoreHealthReport = {
  totalEntries: number;
  staleEntries: number;
  archiveCandidates: number;
  duplicateCandidates: number;
  avgAgeDays: number;
  avgImportance: number;
  avgConfidence: number;
  avgAccessCount: number;
  bySource: Record<string, number>;
  warnings: string[];
};

export type HealthAction = {
  label: string;
  action: "consolidate" | "archive" | "decay" | "none";
  entryId: string;
  reason: string;
};

export type DecayConfig = {
  decayRate: number;
  accessResilience: number;
  maxImportance: number;
  minImportance: number;
};

export type TagInfo = {
  tag: string;
  count: number;
};

export type TagStats = {
  total: number;
  unique: number;
  top: TagInfo[];
  orphans: TagInfo[];
};

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  decayRate: 0.1,
  accessResilience: 0.3,
  maxImportance: 1.0,
  minImportance: 0.0,
};
