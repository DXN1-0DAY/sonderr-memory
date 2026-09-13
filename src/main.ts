#!/usr/bin/env bun
import { createStore, loadEntries, saveEntry, searchEntries, getTimeline, getMeta, exportForContext, deleteEntry, linkEntries, updateEntry } from "./memory/store";
import { MemoryEntry } from "./memory/types";
import { getAllTutorials, getTutorial } from "./tutorial";

type Command = (args: string[]) => void | Promise<void>;

const printJson = (data: unknown) => console.log(JSON.stringify(data, null, 2));

const commands: Record<string, Command> = {
  tui: async () => {
    const { launchApp } = await import("./tui/app");
    launchApp();
  },
  ui: async () => {
    const { launchApp } = await import("./tui/app");
    launchApp();
  },
  remember: (args) => {
    const store = createStore();
    const content = args.join(" ") || "(empty)";
    const entry = saveEntry(store, "inbox", `cli-${Date.now()}`, content);
    printJson({ id: entry.id, path: entry.path });
  },
  add: (args) => commands.remember(args),
  search: (args) => {
    const store = createStore();
    const query = args[0] || "";
    const results = searchEntries(store, query);
    printJson(results.map((r) => ({ id: r.id, source: r.source, content: r.content.slice(0, 100) })));
  },
  list: () => {
    const store = createStore();
    const entries = loadEntries(store);
    printJson(entries.map((r) => ({ id: r.id, source: r.source, content: r.content.slice(0, 100) })));
  },
  timeline: () => {
    const store = createStore();
    const entries = getTimeline(store, 20);
    printJson(entries.map((r) => ({ id: r.id, createdAt: r.createdAt, content: r.content.slice(0, 80) })));
  },
  stats: () => {
    const store = createStore();
    const meta = getMeta(store);
    printJson(meta);
  },
  context: (args) => {
    const store = createStore();
    const query = args[0] || "";
    const ctx = exportForContext(store, query, 2000);
    console.log(ctx);
  },
  export: (args) => {
    const store = createStore();
    const query = args[0] || "";
    const ctx = exportForContext(store, query, 5000);
    console.log(ctx);
  },
  delete: (args) => {
    const store = createStore();
    const id = args[0];
    if (!id) {
      console.error("usage: sonderr-memory delete <id>");
      process.exit(1);
    }
    const entries = loadEntries(store);
    const entry = entries.find((e) => e.id.startsWith(id) || e.id === id);
    if (!entry) {
      console.error("entry not found");
      process.exit(1);
    }
    deleteEntry(store, entry);
    console.log("deleted");
  },
  link: (args) => {
    const store = createStore();
    const [sourceId, targetId] = args;
    if (!sourceId || !targetId) {
      console.error("usage: sonderr-memory link <source-id> <target-id>");
      process.exit(1);
    }
    const entries = loadEntries(store);
    const source = entries.find((e) => e.id.startsWith(sourceId) || e.id === sourceId);
    const target = entries.find((e) => e.id.startsWith(targetId) || e.id === targetId);
    if (!source || !target) {
      console.error("entry not found");
      process.exit(1);
    }
    linkEntries(store, source, target);
    console.log("linked");
  },
  update: (args) => {
    const store = createStore();
    const id = args[0];
    if (!id) {
      console.error("usage: sonderr-memory update <id> key=value ...");
      process.exit(1);
    }
    const entries = loadEntries(store);
    const entry = entries.find((e) => e.id.startsWith(id) || e.id === id);
    if (!entry) {
      console.error("entry not found");
      process.exit(1);
    }
    const patch: Partial<MemoryEntry> = {};
    for (let i = 1; i < args.length; i++) {
      const [key, value] = args[i].split("=");
      if (key === "project") patch.project = value;
      if (key === "tags") patch.tags = value.split(",").map((s) => s.trim()).filter(Boolean);
      if (key === "topics") patch.topics = value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const updated = updateEntry(store, entry, patch);
    printJson({ id: updated.id, updatedAt: updated.updatedAt });
  },
  mcp: () => {
    import("./mcp-server").then(({ createMCPServer }) => {
      const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
      createMCPServer(port);
    }).catch((err) => {
      console.error("failed to start MCP server:", err);
      process.exit(1);
    });
  },
  serve: () => {
    import("./mcp-server").then(({ createMCPServer }) => {
      const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
      createMCPServer(port);
    }).catch((err) => {
      console.error("failed to start MCP server:", err);
      process.exit(1);
    });
  },
  tutorial: (args) => {
    const tutorialId = args[0];
    if (!tutorialId) {
      console.log("Available tutorials:");
      for (const t of getAllTutorials()) {
        console.log(`  ${t.id}: ${t.name}`);
        console.log(`    ${t.description}`);
      }
      console.log("\nUsage: sonderr-memory tutorial <id>");
      process.exit(0);
    }
    const tutorial = getTutorial(tutorialId);
    if (!tutorial) {
      console.error(`tutorial not found: ${tutorialId}`);
      process.exit(1);
    }
    console.log(`\n=== ${tutorial.name} ===\n`);
    console.log(tutorial.description);
    console.log("");
    tutorial.steps.forEach((step, i) => {
      console.log(`Step ${i + 1}: ${step.title}`);
      console.log(step.body);
      if (step.command) {
        console.log(`\n$ ${step.command}\n`);
      }
      if (step.hint) {
        console.log(`Hint: ${step.hint}`);
      }
      console.log("");
    });
  },
  help: () => {
    console.log(`
sonderr-memory - local-first context engine

commands:
  (default)            launch TUI
  tui, ui              launch TUI
  remember, add <text> save a new memory
  search <query>       search memories
  list                 list all memories
  timeline             recent memories
  stats                show stats
  context <query>      export context for agent
  export <query>       export context (larger)
  delete <id>          delete a memory
  link <src> <dst>     link two memories
  update <id> k=v...   update labels
  mcp, serve           start MCP server
  tutorial <id>        run a tutorial
  help                 show this help

tutorials:
  mcp-setup            MCP server setup guide
  cli-usage            CLI usage guide
  tui-walkthrough      TUI walkthrough

env:
  SONDERR_MEMORY_ROOT  memory root (default: ~/.sonderr-memory)
  SONDERR_MEMORY_MCP_PORT  MCP server port (default: 3099)
    `);
  },
};

const cmd = process.argv[2] || "tui";
const cmdArgs = process.argv.slice(3);

if (commands[cmd]) {
  try {
    await commands[cmd](cmdArgs);
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
} else {
  console.error(`unknown command: ${cmd}`);
  commands.help([]);
  process.exit(1);
}
