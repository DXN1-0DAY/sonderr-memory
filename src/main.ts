#!/usr/bin/env bun
import { createStore, loadEntries, saveEntry, searchEntries, getTimeline, getMeta, exportForContext, deleteEntry, linkEntries, updateEntry } from "./memory/store";
import { MemoryEntry } from "./memory/types";
import { getAllTutorials, getTutorial } from "./tutorial";

const VERSION = "0.0.02";

// ── Types ──────────────────────────────────────────────────────────────────

interface Flags {
  json: boolean;
  plain: boolean;
  help: boolean;
  quiet: boolean;
}

interface CmdResult {
  ok: boolean;
  data?: unknown;
  text?: string;
  error?: string;
  hint?: string;
}

type CommandHandler = (args: string[], flags: Flags) => CmdResult | Promise<CmdResult>;

// ── Flag Parsing ────────────────────────────────────────────────────────────

function parseFlags(raw: string[]): { flags: Flags; rest: string[] } {
  const flags: Flags = { json: false, plain: false, help: false, quiet: false };
  const rest: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    switch (a) {
      case "--json":
      case "-j":
        flags.json = true;
        break;
      case "--plain":
      case "-p":
        flags.plain = true;
        break;
      case "--help":
      case "-h":
        flags.help = true;
        break;
      case "--quiet":
      case "-q":
        flags.quiet = true;
        break;
      case "--version":
      case "-v":
        console.log(VERSION);
        process.exit(0);
      default:
        rest.push(a);
    }
  }
  return { flags, rest };
}

// ── Output Formatting ──────────────────────────────────────────────────────

function printJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function printError(message: string, hint?: string, quiet = false) {
  if (!quiet) console.error(`error: ${message}`);
  if (hint && !quiet) console.error(`hint: ${hint}`);
}

function formatOutput(result: CmdResult, flags: Flags, defaultJson: boolean) {
  if (!result.ok) {
    printError(result.error || "unknown error", result.hint, flags.quiet);
    process.exit(1);
  }
  if (flags.json) {
    if (result.data !== undefined) {
      printJson(result.data);
    } else if (result.text !== undefined) {
      printJson({ output: result.text });
    }
    return;
  }
  if (flags.plain) {
    if (result.data !== undefined) {
      console.log(JSON.stringify(result.data));
    } else if (result.text !== undefined) {
      console.log(result.text);
    }
    return;
  }
  if (defaultJson && result.data !== undefined) {
    printJson(result.data);
  } else if (result.text !== undefined) {
    console.log(result.text);
  } else if (result.data !== undefined) {
    printJson(result.data);
  }
}

// ── Help ────────────────────────────────────────────────────────────────────

interface CmdMeta {
  name: string;
  aliases: string[];
  desc: string;
  defaultJson: boolean;
}

const COMMANDS: CmdMeta[] = [
  { name: "(default)", aliases: [], desc: "Launch TUI", defaultJson: false },
  { name: "tui", aliases: ["ui"], desc: "Launch the interactive TUI", defaultJson: false },
  { name: "remember", aliases: ["add"], desc: "Save a memory", defaultJson: true },
  { name: "search", aliases: [], desc: "Search memories", defaultJson: true },
  { name: "list", aliases: [], desc: "List all memories", defaultJson: true },
  { name: "timeline", aliases: [], desc: "Recent memories", defaultJson: true },
  { name: "stats", aliases: [], desc: "Show statistics", defaultJson: true },
  { name: "context", aliases: [], desc: "Export context (2k tokens)", defaultJson: false },
  { name: "export", aliases: [], desc: "Export context (5k tokens)", defaultJson: false },
  { name: "delete", aliases: [], desc: "Delete a memory", defaultJson: true },
  { name: "link", aliases: [], desc: "Link two memories", defaultJson: true },
  { name: "update", aliases: [], desc: "Update labels", defaultJson: true },
  { name: "mcp", aliases: ["serve"], desc: "Start MCP server", defaultJson: false },
  { name: "tutorial", aliases: [], desc: "Run a tutorial", defaultJson: false },
  { name: "help", aliases: [], desc: "Show this help", defaultJson: false },
];

const COMMAND_HELP: Record<string, { usage: string; options: string[]; examples: string[] }> = {
  remember: {
    usage: "sonderr-memory remember [options] <text>",
    options: [
      "--project <name>   Set project label",
      "--tags <a,b,c>     Comma-separated tags",
      "--topics <x,y,z>   Comma-separated topics",
      "--json             Output as JSON",
    ],
    examples: [
      'sonderr-memory remember "Fixed the auth bug"',
      'sonderr-memory remember "Built the MCP server" --project sonderr-memory --topics mcp,context',
    ],
  },
  add: {
    usage: "sonderr-memory add [options] <text>",
    options: [
      "--project <name>   Set project label",
      "--tags <a,b,c>     Comma-separated tags",
      "--topics <x,y,z>   Comma-separated topics",
      "--json             Output as JSON",
    ],
    examples: [
      'sonderr-memory add "New idea" --topics ideas',
    ],
  },
  search: {
    usage: "sonderr-memory search [options] <query>",
    options: ["--json  Output as JSON"],
    examples: [
      'sonderr-memory search "mcp server"',
      'sonderr-memory search "auth" --json',
    ],
  },
  list: {
    usage: "sonderr-memory list [options]",
    options: ["--json  Output as JSON"],
    examples: ["sonderr-memory list", "sonderr-memory list --json"],
  },
  timeline: {
    usage: "sonderr-memory timeline [options]",
    options: ["--json  Output as JSON"],
    examples: ["sonderr-memory timeline"],
  },
  stats: {
    usage: "sonderr-memory stats [options]",
    options: ["--json  Output as JSON"],
    examples: ["sonderr-memory stats --json"],
  },
  context: {
    usage: "sonderr-memory context [options] <query>",
    options: ["--plain  Output as plain text (default)", "--json  Output as JSON"],
    examples: ['sonderr-memory context "mcp setup"'],
  },
  export: {
    usage: "sonderr-memory export [options] <query>",
    options: ["--plain  Output as plain text (default)", "--json  Output as JSON"],
    examples: ['sonderr-memory export "mcp setup"'],
  },
  delete: {
    usage: "sonderr-memory delete [options] <id>",
    options: ["--json  Output as JSON"],
    examples: ["sonderr-memory delete abc123", "sonderr-memory delete abc123 --json"],
  },
  link: {
    usage: "sonderr-memory link [options] <source-id> <target-id>",
    options: ["--json  Output as JSON"],
    examples: ["sonderr-memory link abc123 def456"],
  },
  update: {
    usage: "sonderr-memory update [options] <id> [key=value ...]",
    options: [
      "--json            Output as JSON",
      "key=value         Supported: project, tags, topics, content",
    ],
    examples: [
      'sonderr-memory update abc123 project=myapp',
      'sonderr-memory update abc123 tags=bug,fix topics=auth',
    ],
  },
  mcp: {
    usage: "sonderr-memory mcp",
    options: [],
    examples: ["sonderr-memory mcp"],
  },
  serve: {
    usage: "sonderr-memory serve",
    options: [],
    examples: ["sonderr-memory serve"],
  },
  tutorial: {
    usage: "sonderr-memory tutorial [options] [<id>]",
    options: ["--json  Output tutorial as JSON"],
    examples: ["sonderr-memory tutorial", "sonderr-memory tutorial mcp-setup"],
  },
  help: {
    usage: "sonderr-memory help [<command>]",
    options: [],
    examples: ["sonderr-memory help", "sonderr-memory help search"],
  },
  tui: {
    usage: "sonderr-memory tui",
    options: [],
    examples: ["sonderr-memory", "sonderr-memory tui"],
  },
  ui: {
    usage: "sonderr-memory ui",
    options: [],
    examples: ["sonderr-memory ui"],
  },
};

function cmdMeta(name: string): CmdMeta | undefined {
  return COMMANDS.find(c => c.name === name || c.aliases.includes(name));
}

function printCommandHelp(name: string) {
  const meta = cmdMeta(name);
  const info = COMMAND_HELP[name];
  if (!meta || !info) {
    console.error(`No help available for: ${name}`);
    process.exit(1);
  }
  const aliasStr = meta.aliases.length ? ` (aliases: ${meta.aliases.join(", ")})` : "";
  console.log(`${info.usage}${aliasStr}\n`);
  if (info.options.length) {
    console.log("OPTIONS");
    for (const opt of info.options) console.log(`  ${opt}`);
    console.log();
  }
  if (info.examples.length) {
    console.log("EXAMPLES");
    for (const ex of info.examples) console.log(`  ${ex}`);
  }
}

function printFullHelp() {
  console.log(`sonderr-memory v${VERSION} — local-first context engine

USAGE
  sonderr-memory [options] [command] [args...]

COMMANDS`);
  for (const c of COMMANDS) {
    const aliasStr = c.aliases.length ? `, ${c.aliases.join(", ")}` : "";
    const jsonStr = c.defaultJson ? "  [--json]" : "";
    const nameLen = c.name.length + aliasStr.length;
    const pad = " ".repeat(Math.max(2, 20 - nameLen));
    console.log(`  ${c.name}${aliasStr}${pad}${c.desc}${jsonStr}`);
  }
  console.log(`
OPTIONS
  --json, -j      Force JSON output for data commands
  --plain, -p     Force plain text output
  --help, -h      Show help for a command
  --version, -v   Show version

ENVIRONMENT
  SONDERR_MEMORY_ROOT       Memory root      (default: ~/.sonderr-memory)
  SONDERR_MEMORY_MCP_PORT   MCP server port  (default: 3099)

EXAMPLES
  sonderr-memory remember "Fixed the auth bug"
  sonderr-memory remember "Built the MCP server" --project sonderr-memory --topics mcp,context
  sonderr-memory search "mcp server" --json
  sonderr-memory list --json
  sonderr-memory delete abc123 --json
  sonderr-memory context "mcp setup"
  sonderr-memory tutorial mcp-setup
  sonderr-memory`);
}

// ── String Utils ────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[m][n];
}

function suggestCommand(input: string): string | undefined {
  const names = Object.keys(commands);
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of names) {
    if (c.startsWith(input)) return c;
    const d = levenshtein(input, c);
    if (d < bestDist && d <= 3) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

// ── Commands ────────────────────────────────────────────────────────────────

const commands: Record<string, CommandHandler> = {
  tui: async () => {
    try {
      const { launchApp } = await import("./tui/app");
      launchApp();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`tui error: ${msg}`);
      process.exit(1);
    }
  },

  ui: async () => {
    try {
      const { launchApp } = await import("./tui/app");
      launchApp();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`tui error: ${msg}`);
      process.exit(1);
    }
  },

  remember: (args, _flags) => {
    const store = createStore();
    const extras: Partial<MemoryEntry> = {};
    const contentParts: string[] = [];

    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--project" && args[i + 1]) {
        extras.project = args[++i];
      } else if (args[i] === "--tags" && args[i + 1]) {
        extras.tags = args[++i].split(",").map(s => s.trim()).filter(Boolean);
      } else if (args[i] === "--topics" && args[i + 1]) {
        extras.topics = args[++i].split(",").map(s => s.trim()).filter(Boolean);
      } else {
        contentParts.push(args[i]);
      }
    }

    const content = contentParts.join(" ") || "(empty)";
    const entry = saveEntry(store, "inbox", `cli-${Date.now()}`, content, extras);
    return { ok: true, data: { id: entry.id, path: entry.path } };
  },

  add: (args, _flags) => commands.remember(args, _flags),

  search: (args, _flags) => {
    const store = createStore();
    const query = args[0] || "";
    const results = searchEntries(store, query);
    return {
      ok: true,
      data: results.map(r => ({
        id: r.id,
        source: r.source,
        content: r.content.slice(0, 100),
        ...(r.project ? { project: r.project } : {}),
        ...(r.topics.length ? { topics: r.topics } : {}),
      })),
    };
  },

  list: () => {
    const store = createStore();
    const entries = loadEntries(store);
    return {
      ok: true,
      data: entries.map(r => ({
        id: r.id,
        source: r.source,
        content: r.content.slice(0, 100),
        ...(r.project ? { project: r.project } : {}),
        ...(r.topics.length ? { topics: r.topics } : {}),
        ...(r.tags.length ? { tags: r.tags } : {}),
      })),
    };
  },

  timeline: () => {
    const store = createStore();
    const entries = getTimeline(store, 20);
    return {
      ok: true,
      data: entries.map(r => ({
        id: r.id,
        createdAt: r.createdAt,
        content: r.content.slice(0, 80),
      })),
    };
  },

  stats: () => {
    const store = createStore();
    const meta = getMeta(store);
    return { ok: true, data: meta };
  },

  context: (args, flags) => {
    const store = createStore();
    const query = args[0] || "";
    const ctx = exportForContext(store, query, 2000);
    if (flags.json) {
      return { ok: true, data: { query, maxTokens: 2000, content: ctx } };
    }
    return { ok: true, text: ctx };
  },

  export: (args, flags) => {
    const store = createStore();
    const query = args[0] || "";
    const ctx = exportForContext(store, query, 5000);
    if (flags.json) {
      return { ok: true, data: { query, maxTokens: 5000, content: ctx } };
    }
    return { ok: true, text: ctx };
  },

  delete: (args, _flags) => {
    const store = createStore();
    const id = args[0];
    if (!id) {
      return { ok: false, error: "missing required argument: <id>", hint: "usage: sonderr-memory delete <id>" };
    }
    const entries = loadEntries(store);
    const entry = entries.find(e => e.id.startsWith(id) || e.id === id);
    if (!entry) {
      return { ok: false, error: "entry not found", hint: `No entry matches '${id}'. Run 'sonderr-memory list' to see available entries.` };
    }
    deleteEntry(store, entry);
    return { ok: true, data: { id: entry.id, deleted: true } };
  },

  link: (args, _flags) => {
    const store = createStore();
    const [sourceId, targetId] = args;
    if (!sourceId || !targetId) {
      return { ok: false, error: "missing required arguments: <source-id> <target-id>", hint: "usage: sonderr-memory link <source-id> <target-id>" };
    }
    const entries = loadEntries(store);
    const source = entries.find(e => e.id.startsWith(sourceId) || e.id === sourceId);
    const target = entries.find(e => e.id.startsWith(targetId) || e.id === targetId);
    if (!source || !target) {
      const missing = !source ? sourceId : targetId;
      return { ok: false, error: "entry not found", hint: `No entry matches '${missing}'. Run 'sonderr-memory list' to see available entries.` };
    }
    linkEntries(store, source, target);
    return { ok: true, data: { source: source.id, target: target.id, linked: true } };
  },

  update: (args, _flags) => {
    const store = createStore();
    const id = args[0];
    if (!id) {
      return { ok: false, error: "missing required argument: <id>", hint: "usage: sonderr-memory update <id> key=value ..." };
    }
    const entries = loadEntries(store);
    const entry = entries.find(e => e.id.startsWith(id) || e.id === id);
    if (!entry) {
      return { ok: false, error: "entry not found", hint: `No entry matches '${id}'. Run 'sonderr-memory list' to see available entries.` };
    }
    const patch: Partial<MemoryEntry> = {};
    for (let i = 1; i < args.length; i++) {
      const [key, value] = args[i].split("=");
      if (!key || !value) continue;
      if (key === "project") patch.project = value;
      else if (key === "tags") patch.tags = value.split(",").map(s => s.trim()).filter(Boolean);
      else if (key === "topics") patch.topics = value.split(",").map(s => s.trim()).filter(Boolean);
      else if (key === "content") patch.content = value;
      else return { ok: false, error: `unknown update key: ${key}`, hint: "Supported keys: project, tags, topics, content" };
    }
    const updated = updateEntry(store, entry, patch);
    return { ok: true, data: { id: updated.id, updatedAt: updated.updatedAt } };
  },

  mcp: async () => {
    const { createMCPServer } = await import("./mcp-server");
    const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
    createMCPServer(port);
    return { ok: true };
  },

  serve: async () => {
    const { createMCPServer } = await import("./mcp-server");
    const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
    createMCPServer(port);
    return { ok: true };
  },

  tutorial: (args, flags) => {
    const tutorialId = args[0];
    if (!tutorialId) {
      console.log("Available tutorials:");
      for (const t of getAllTutorials()) {
        console.log(`  ${t.id}: ${t.name}`);
        console.log(`    ${t.description}`);
      }
      console.log("\nUsage: sonderr-memory tutorial <id>");
      return { ok: true };
    }
    const tutorial = getTutorial(tutorialId);
    if (!tutorial) {
      return { ok: false, error: `tutorial not found: ${tutorialId}`, hint: "Run 'sonderr-memory tutorial' to see available tutorials." };
    }
    if (flags.json) {
      return { ok: true, data: { id: tutorial.id, name: tutorial.name, description: tutorial.description, steps: tutorial.steps } };
    }
    console.log(`\n=== ${tutorial.name} ===\n`);
    console.log(tutorial.description);
    console.log("");
    tutorial.steps.forEach((step, i) => {
      console.log(`Step ${i + 1}: ${step.title}`);
      console.log(step.body);
      if (step.command) console.log(`\n$ ${step.command}\n`);
      if (step.hint) console.log(`Hint: ${step.hint}`);
      console.log("");
    });
    return { ok: true };
  },

  help: (args, _flags) => {
    if (args.length > 0) {
      printCommandHelp(args[0]);
    } else {
      printFullHelp();
    }
    return { ok: true };
  },
};

// ── Dispatch ────────────────────────────────────────────────────────────────

const cmd = process.argv[2] || "tui";
const { flags, rest: cmdArgs } = parseFlags(process.argv.slice(3));

(async () => {
  const handler = commands[cmd];

  if (!handler) {
    const suggestion = suggestCommand(cmd);
    console.error(`unknown command: ${cmd}`);
    if (suggestion) console.error(`Did you mean '${suggestion}'?`);
    console.error("Run 'sonderr-memory help' to see available commands.");
    process.exit(1);
  }

  if (flags.help) {
    printCommandHelp(cmd);
    process.exit(0);
  }

  try {
    const result = await handler(cmdArgs, flags);
    const meta = cmdMeta(cmd);
    formatOutput(result, flags, meta?.defaultJson ?? false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`error: ${msg}`);
    process.exit(1);
  }
})();
