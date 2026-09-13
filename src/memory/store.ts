import { MemoryEntry, MemoryStore } from "./types.ts";
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
    content,
  };
}
