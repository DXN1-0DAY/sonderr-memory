import { MemoryEntry, MemoryStore, MemoryMeta, ContextBudget, ContextPlan, ContextItem } from "./types";
import * as path from "path";
import * as fs from "fs";
import { logger } from "../logger";
import { ensureStore, ensureDirs } from "../utils/store-helpers";
import { groupBy, deduplicate } from "../utils/array";

const ROOT = (process.env.SONDERR_MEMORY_ROOT || (process.env.HOME ? `${process.env.HOME}/.sonderr-memory` : "/tmp/.sonderr-memory"));
ensureStore(ROOT);

export function createStore(root = ROOT): MemoryStore {
  ensureDirs({ root });
  return { root };
}

export function getStoreRoot(): string {
  return ROOT;
}

export function inboxPath(store: MemoryStore, date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return path.join(store.root, "inbox", String(y), String(m), String(d));
}

export function projectPath(store: MemoryStore, project: string): string {
  return path.join(store.root, "projects", project);
}

export function topicPath(store: MemoryStore, topic: string): string {
  return path.join(store.root, "topics", topic);
}

export function lessonPath(store: MemoryStore): string {
  return path.join(store.root, "lessons");
}

export function referencePath(store: MemoryStore): string {
  return path.join(store.root, "references");
}

export function indexPath(store: MemoryStore): string {
  return path.join(store.root, "index");
}

export function saveEntry(
  store: MemoryStore,
  category: "inbox" | "project" | "topic" | "lesson" | "reference",
  name: string,
  content: string,
  extra: Partial<MemoryEntry> = {}
): MemoryEntry {
  const now = new Date().toISOString();
  const entry: MemoryEntry = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    path: "",
    source: category,
    content,
    topics: [],
    people: [],
    tags: [],
    linkedIds: [],
    importance: extra.importance ?? 0.5,
    confidence: extra.confidence ?? 0.8,
    accessCount: 0,
    lastAccessedAt: now,
    ...extra,
  };

  let dir: string;
  switch (category) {
    case "inbox":
      dir = inboxPath(store);
      break;
    case "project":
      dir = projectPath(store, extra.project || "unknown");
      break;
    case "topic":
      dir = topicPath(store, extra.topics?.[0] || "general");
      break;
    case "lesson":
      dir = lessonPath(store);
      break;
    case "reference":
      dir = referencePath(store);
      break;
  }

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${ts}-${slug}.md`;
  const fullPath = path.join(dir, filename);

  const frontmatter = [
    "---",
    `id: ${entry.id}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    `source: ${category}`,
    extra.project ? `project: ${extra.project}` : "",
    extra.topics?.length ? `topics: ${extra.topics.join(", ")}` : "",
    extra.people?.length ? `people: ${extra.people.join(", ")}` : "",
    extra.tags?.length ? `tags: ${entry.tags.join(", ")}` : "",
    extra.linkedIds?.length ? `linkedIds: ${entry.linkedIds.join(", ")}` : "",
    `importance: ${entry.importance}`,
    `confidence: ${entry.confidence}`,
    `accessCount: ${entry.accessCount}`,
    `lastAccessedAt: ${entry.lastAccessedAt}`,
    "---",
    "",
    content,
  ].filter(Boolean).join("\n");

  fs.writeFileSync(fullPath, frontmatter);
  entry.path = fullPath;
  logger.debug(`Saved entry: ${entry.id} to ${fullPath}`);
  return entry;
}

export function loadEntries(store: MemoryStore, category?: string): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries_list = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
    for (const entry of entries_list) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const full = path.join(entry.path ?? dir, entry.name);
        try {
          const text = fs.readFileSync(full, "utf-8");
          entries.push(parseEntry(full, text));
        } catch (err) {
          logger.warn(`Failed to parse entry: ${full}`, err);
        }
      }
    }
  };

  if (category) {
    const map: Record<string, string> = {
      inbox: inboxPath(store),
      project: projectPath(store, ""),
      topic: topicPath(store, ""),
      lesson: lessonPath(store),
      reference: referencePath(store),
    };
    const base = map[category];
    if (base) walk(base);
  } else {
    walk(store.root);
  }
  return deduplicate(entries, (e) => e.id);
}

export function searchEntries(store: MemoryStore, query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  const words = q.split(/\W+/).filter((w) => w.length > 2);
  return loadEntries(store).map((entry) => {
    const hay = `${entry.content} ${entry.topics.join(" ")} ${entry.tags.join(" ")} ${entry.people.join(" ")} ${entry.project ?? ""}`.toLowerCase();
    let score = 0;
    if (hay.includes(q)) score += 10;
    for (const w of words) {
      if (hay.includes(w)) score += 2;
    }
    return { entry, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.entry);
}

export function getMeta(store: MemoryStore): MemoryMeta {
  const entries = loadEntries(store);
  const bySource: Record<string, number> = {};
  const byProject: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const recentIds: string[] = [];
  const accessCounts: Array<{ id: string; count: number }> = [];

  for (const entry of entries) {
    bySource[entry.source] = (bySource[entry.source] || 0) + 1;
    if (entry.project) byProject[entry.project] = (byProject[entry.project] || 0) + 1;
    for (const topic of entry.topics) byTopic[topic] = (byTopic[topic] || 0) + 1;
    if (recentIds.length < 20) recentIds.push(entry.id);
    accessCounts.push({ id: entry.id, count: entry.accessCount });
  }

  const topAccessed = accessCounts.sort((a, b) => b.count - a.count).slice(0, 10).map((x) => x.id);

  return {
    total: entries.length,
    bySource,
    byProject,
    byTopic,
    recentIds,
    topAccessed,
  };
}

export function getTimeline(store: MemoryStore, limit = 50): MemoryEntry[] {
  const entries = loadEntries(store);
  return entries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getRelated(store: MemoryStore, entry: MemoryEntry, limit = 10): MemoryEntry[] {
  const all = loadEntries(store).filter((e) => e.id !== entry.id);
  const score = (e: MemoryEntry) => {
    let s = 0;
    if (e.project === entry.project) s += 3;
    for (const t of entry.topics) if (e.topics.includes(t)) s += 2;
    for (const tag of entry.tags) if (e.tags.includes(tag)) s += 1;
    const commonWords = new Set(
      e.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
    );
    for (const w of entry.content.toLowerCase().split(/\W+/).filter((w) => w.length > 3)) {
      if (commonWords.has(w)) s += 1;
    }
    s += e.importance * 2;
    s += e.confidence;
    s += Math.min(e.accessCount / 10, 1);
    return s;
  };
  return all.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function buildContextPlan(store: MemoryStore, query: string, budget: ContextBudget): ContextPlan {
  const candidates = searchEntries(store, query).slice(0, 50);
  const scored: ContextItem[] = [];
  const usedIds = new Set<string>();

  for (const entry of candidates) {
    if (usedIds.has(entry.id)) continue;
    usedIds.add(entry.id);

    let score = 0;
    let reason = "";

    if (entry.importance > 0.8) {
      score += 5;
      reason += "high-importance ";
    }
    if (entry.confidence > 0.9) {
      score += 3;
      reason += "high-confidence ";
    }
    if (entry.accessCount > 5) {
      score += Math.min(entry.accessCount, 10);
      reason += "frequently-accessed ";
    }
    score += entry.importance * 4;
    score += entry.confidence * 2;
    score += Math.min(entry.accessCount / 2, 5);

    const daysSinceAccess = (Date.now() - new Date(entry.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 1) score += 2;

    const tokens = estimateTokens(entry.content);
    scored.push({ entry, score, reason: reason.trim() || "relevance", tokens });
  }

  const sorted = scored.sort((a, b) => b.score - a.score);
  const selected: ContextItem[] = [];
  let total = 0;

  for (const item of sorted) {
    if (total + item.tokens > budget.availableForMemory) break;
    selected.push(item);
    total += item.tokens;
  }

  return { query, items: selected, totalTokens: total, budget };
}

export function exportForContext(store: MemoryStore, query: string, maxTokens = 2000): string {
  const plan = buildContextPlan(store, query, {
    maxTokens,
    reservedForSystem: 200,
    reservedForResponse: 400,
    availableForMemory: Math.max(100, maxTokens - 600),
  });

  const parts: string[] = [];
  for (const item of plan.items) {
    const snippet = `[${item.entry.source}] ${item.entry.project ?? ""} ${item.entry.topics.join(" ")} (score: ${item.score.toFixed(1)}, reason: ${item.reason})\n${item.entry.content}\n`;
    parts.push(snippet);
    touchEntry(store, item.entry);
  }
  return parts.join("\n---\n");
}

export function updateEntry(store: MemoryStore, entry: MemoryEntry, patch: Partial<MemoryEntry>): MemoryEntry {
  const updated = { ...entry, ...patch, updatedAt: new Date().toISOString() };
  const frontmatter = [
    "---",
    `id: ${updated.id}`,
    `createdAt: ${updated.createdAt}`,
    `updatedAt: ${updated.updatedAt}`,
    `source: ${updated.source}`,
    updated.project ? `project: ${updated.project}` : "",
    updated.topics?.length ? `topics: ${updated.topics.join(", ")}` : "",
    updated.people?.length ? `people: ${updated.people.join(", ")}` : "",
    updated.tags?.length ? `tags: ${updated.tags.join(", ")}` : "",
    updated.linkedIds?.length ? `linkedIds: ${updated.linkedIds.join(", ")}` : "",
    `importance: ${updated.importance}`,
    `confidence: ${updated.confidence}`,
    `accessCount: ${updated.accessCount}`,
    `lastAccessedAt: ${updated.lastAccessedAt}`,
    "---",
    "",
    updated.content,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(updated.path, frontmatter);
  logger.debug(`Updated entry: ${updated.id}`);
  return updated;
}

export function deleteEntry(store: MemoryStore, entry: MemoryEntry): void {
  if (fs.existsSync(entry.path)) {
    fs.unlinkSync(entry.path);
    logger.debug(`Deleted entry: ${entry.id}`);
  }
}

export function linkEntries(store: MemoryStore, source: MemoryEntry, target: MemoryEntry): MemoryEntry {
  const updatedSource = updateEntry(store, source, {
    linkedIds: [...source.linkedIds, target.id],
  });
  const updatedTarget = updateEntry(store, target, {
    linkedIds: [...target.linkedIds, source.id],
  });
  logger.debug(`Linked entries: ${source.id} <-> ${target.id}`);
  return updatedSource;
}

export function touchEntry(store: MemoryStore, entry: MemoryEntry): MemoryEntry {
  return updateEntry(store, entry, {
    accessCount: entry.accessCount + 1,
    lastAccessedAt: new Date().toISOString(),
  });
}

export function suggestTags(store: MemoryStore, entry: MemoryEntry, limit = 5): string[] {
  const related = getRelated(store, entry, 20);
  const tagCounts: Record<string, number> = {};
  for (const r of related) {
    for (const tag of r.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    for (const topic of r.topics) {
      tagCounts[topic] = (tagCounts[topic] || 0) + 1;
    }
  }
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function parseEntry(fullPath: string, text: string): MemoryEntry {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const frontmatter = fmMatch?.[1] ?? "";
  const content = fmMatch?.[2]?.trim() ?? text;

  const meta: Record<string, string> = {};
  for (const line of frontmatter.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }

  return {
    id: meta.id || crypto.randomUUID(),
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || new Date().toISOString(),
    path: fullPath,
    project: meta.project,
    topics: meta.topics ? meta.topics.split(",").map((s) => s.trim()) : [],
    people: meta.people ? meta.people.split(",").map((s) => s.trim()) : [],
    tags: meta.tags ? meta.tags.split(",").map((s) => s.trim()) : [],
    source: (meta.source as MemoryEntry["source"]) || "inbox",
    linkedIds: meta.linkedIds ? meta.linkedIds.split(",").map((s) => s.trim()) : [],
    content,
    importance: Number(meta.importance) || 0.5,
    confidence: Number(meta.confidence) || 0.8,
    accessCount: Number(meta.accessCount) || 0,
    lastAccessedAt: meta.lastAccessedAt || new Date().toISOString(),
  };
}
