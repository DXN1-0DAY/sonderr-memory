import { createStore, loadEntries, saveEntry, searchEntries, getTimeline, getMeta, exportForContext, deleteEntry, updateEntry, linkEntries } from "../memory/store";
import { MemoryEntry } from "../memory/types";
import * as fs from "fs";
import * as path from "path";

export type MCPTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type MCPResponse = {
  content: Array<{
    type: "text";
    text: string;
  }>;
};

const tools: MCPTool[] = [
  {
    name: "sonderr_memory_list_files",
    description: "List all files in the local sonderr-memory store, including configuration and indexes",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "sonderr_memory_get_file",
    description: "Read a file from the local sonderr-memory store by its relative path",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "sonderr_memory_labeling_guide",
    description: "Return the shared-memory labeling rules for consistent memories across AI clients",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sonderr_memory_save",
    description: "Save a new memory entry to the local store",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The memory content" },
        category: { type: "string", enum: ["inbox", "project", "topic", "lesson", "reference"] },
        project: { type: "string" },
        topics: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        title: { type: "string" },
      },
      required: ["content"],
    },
  },
  {
    name: "sonderr_memory_search",
    description: "Search memories by query string",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results" },
      },
      required: ["query"],
    },
  },
  {
    name: "sonderr_memory_list",
    description: "List all memory entries",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "sonderr_memory_get",
    description: "Get a specific memory entry by ID",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory entry ID or prefix" },
      },
      required: ["id"],
    },
  },
  {
    name: "sonderr_memory_update",
    description: "Update labels on a memory entry",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        project: { type: "string" },
        topics: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["id"],
    },
  },
  {
    name: "sonderr_memory_delete",
    description: "Delete a memory entry",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "sonderr_memory_link",
    description: "Link two memory entries together",
    inputSchema: {
      type: "object",
      properties: {
        source_id: { type: "string" },
        target_id: { type: "string" },
      },
      required: ["source_id", "target_id"],
    },
  },
  {
    name: "sonderr_memory_context",
    description: "Export context-relevant memories for agent injection",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Context query" },
        max_tokens: { type: "number", description: "Max token budget" },
      },
      required: ["query"],
    },
  },
  {
    name: "sonderr_memory_stats",
    description: "Get memory store statistics",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "sonderr_memory_timeline",
    description: "Get recent memories in chronological order",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max entries" },
      },
    },
  },
];

export function getTools(): MCPTool[] {
  return tools;
}

export function callTool(name: string, args: Record<string, unknown>): MCPResponse {
  const store = createStore();

  switch (name) {
    case "sonderr_memory_labeling_guide":
      return { content: [{ type: "text", text: JSON.stringify({ broad: "Stable category in topics: architecture, workflow, decision, bug, lesson, preference, reference", findable: "Concrete search terms in tags: technologies, files, commands, people, project names", precise: "Exact claim, result, constraint, or next action in title and content", rule: "Search before saving; link related entries; never store secrets." }, null, 2) }] };
    case "sonderr_memory_list_files": {
      const limit = Number(args.limit) || 500;
      const files: string[] = [];
      const walk = (dir: string) => {
        if (files.length >= limit) return;
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) walk(full); else files.push(path.relative(store.root, full));
          if (files.length >= limit) return;
        }
      };
      walk(store.root);
      return { content: [{ type: "text", text: JSON.stringify({ root: store.root, files }, null, 2) }] };
    }
    case "sonderr_memory_get_file": {
      const relative = String(args.path || "");
      const target = path.resolve(store.root, relative);
      if (target !== store.root && !target.startsWith(store.root + path.sep)) return { content: [{ type: "text", text: JSON.stringify({ error: "path outside store" }) }] };
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return { content: [{ type: "text", text: JSON.stringify({ error: "file not found" }) }] };
      return { content: [{ type: "text", text: fs.readFileSync(target, "utf8") }] };
    }
    case "sonderr_memory_save": {
      const content = String(args.content || "");
      const category = (args.category as MemoryEntry["source"]) || "inbox";
      const title = String(args.title || `memory-${Date.now()}`);
      const entry = saveEntry(store, category, title, content, {
        project: args.project as string | undefined,
        topics: (args.topics as string[]) || [],
        tags: (args.tags as string[]) || [],
      });
      return { content: [{ type: "text", text: JSON.stringify({ id: entry.id, path: entry.path, createdAt: entry.createdAt }, null, 2) }] };
    }

    case "sonderr_memory_search": {
      const query = String(args.query || "");
      const limit = Number(args.limit) || 20;
      const results = searchEntries(store, query).slice(0, limit);
      return { content: [{ type: "text", text: JSON.stringify(results.map((r) => ({ id: r.entry.id, source: r.entry.source, project: r.entry.project, topics: r.entry.topics, content: r.entry.content.slice(0, 200), score: r.score, matchedFields: r.matchedFields })), null, 2) }] };
    }

    case "sonderr_memory_list": {
      const category = args.category as string | undefined;
      const limit = Number(args.limit) || 100;
      const entries = loadEntries(store, category).slice(0, limit);
      return { content: [{ type: "text", text: JSON.stringify(entries.map((r) => ({ id: r.id, source: r.source, project: r.project, topics: r.topics, content: r.content.slice(0, 200) })), null, 2) }] };
    }

    case "sonderr_memory_get": {
      const idPrefix = String(args.id || "");
      const entries = loadEntries(store);
      const entry = entries.find((e) => e.id === idPrefix || e.id.startsWith(idPrefix));
      if (!entry) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "not found" }, null, 2) }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(entry, null, 2) }] };
    }

    case "sonderr_memory_update": {
      const idPrefix = String(args.id || "");
      const entries = loadEntries(store);
      const entry = entries.find((e) => e.id === idPrefix || e.id.startsWith(idPrefix));
      if (!entry) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "not found" }, null, 2) }] };
      }
      const updated = updateEntry(store, entry, {
        project: args.project as string | undefined,
        topics: (args.topics as string[]) || undefined,
        tags: (args.tags as string[]) || undefined,
      });
      return { content: [{ type: "text", text: JSON.stringify({ id: updated.id, updatedAt: updated.updatedAt }, null, 2) }] };
    }

    case "sonderr_memory_delete": {
      const idPrefix = String(args.id || "");
      const entries = loadEntries(store);
      const entry = entries.find((e) => e.id === idPrefix || e.id.startsWith(idPrefix));
      if (!entry) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "not found" }, null, 2) }] };
      }
      deleteEntry(store, entry);
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true, id: entry.id }, null, 2) }] };
    }

    case "sonderr_memory_link": {
      const sourceId = String(args.source_id || "");
      const targetId = String(args.target_id || "");
      const entries = loadEntries(store);
      const source = entries.find((e) => e.id === sourceId || e.id.startsWith(sourceId));
      const target = entries.find((e) => e.id === targetId || e.id.startsWith(targetId));
      if (!source || !target) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "entry not found" }, null, 2) }] };
      }
      linkEntries(store, source, target);
      return { content: [{ type: "text", text: JSON.stringify({ linked: true, source: source.id, target: target.id }, null, 2) }] };
    }

    case "sonderr_memory_context": {
      const query = String(args.query || "");
      const maxTokens = Number(args.max_tokens) || 2000;
      const ctx = exportForContext(store, query, maxTokens);
      return { content: [{ type: "text", text: ctx }] };
    }

    case "sonderr_memory_stats": {
      const meta = getMeta(store);
      return { content: [{ type: "text", text: JSON.stringify(meta, null, 2) }] };
    }

    case "sonderr_memory_timeline": {
      const limit = Number(args.limit) || 20;
      const entries = getTimeline(store, limit);
      return { content: [{ type: "text", text: JSON.stringify(entries.map((r) => ({ id: r.id, createdAt: r.createdAt, source: r.source, content: r.content.slice(0, 100) })), null, 2) }] };
    }

    default:
      return { content: [{ type: "text", text: JSON.stringify({ error: `unknown tool: ${name}` }, null, 2) }] };
  }
}
