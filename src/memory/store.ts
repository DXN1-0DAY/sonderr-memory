import { MemoryEntry, MemoryStore, MemoryMeta } from "./types";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.join(process.env.HOME || "/tmp", ".sonderr-memory");

export function ensureRoot(): string {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  return ROOT;
}

export function createStore(root = ROOT): MemoryStore {
  ensureRoot();
  return { root };
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
    extra.tags?.length ? `tags: ${extra.tags.join(", ")}` : "",
    extra.linkedIds?.length ? `linkedIds: ${extra.linkedIds.join(", ")}` : "",
    "---",
    "",
    content,
  ].filter(Boolean).join("\n");

  fs.writeFileSync(fullPath, frontmatter);
  entry.path = fullPath;
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
        } catch {
          // skip unreadable
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
  return entries;
}

export function searchEntries(store: MemoryStore, query: string): MemoryEntry[] {
  const q = query.toLowerCase();
  return loadEntries(store).filter((entry) => {
    const hay = `${entry.content} ${entry.topics.join(" ")} ${entry.tags.join(" ")} ${entry.people.join(" ")} ${entry.project ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export function getMeta(store: MemoryStore): MemoryMeta {
  const entries = loadEntries(store);
  const bySource: Record<string, number> = {};
  const byProject: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const recentIds: string[] = [];

  for (const entry of entries) {
    bySource[entry.source] = (bySource[entry.source] || 0) + 1;
    if (entry.project) byProject[entry.project] = (byProject[entry.project] || 0) + 1;
    for (const topic of entry.topics) byTopic[topic] = (byTopic[topic] || 0) + 1;
    if (recentIds.length < 20) recentIds.push(entry.id);
  }

  return {
    total: entries.length,
    bySource,
    byProject,
    byTopic,
    recentIds,
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
    return s;
  };
  return all.sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function exportForContext(store: MemoryStore, query: string, maxTokens = 2000): string {
  const results = searchEntries(store, query).slice(0, 5);
  const parts: string[] = [];
  let total = 0;
  for (const entry of results) {
    const snippet = `[${entry.source}] ${entry.project ?? ""} ${entry.topics.join(" ")}\n${entry.content}\n`;
    if (total + snippet.length > maxTokens) break;
    parts.push(snippet);
    total += snippet.length;
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
    "---",
    "",
    updated.content,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(updated.path, frontmatter);
  return updated;
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
  };
}
