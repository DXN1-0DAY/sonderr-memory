export type CommandCategory =
  | "navigation"
  | "memory"
  | "search"
  | "view"
  | "system"
  | "tutorials"
  | "plugins";

export type CommandDef = {
  cmd: string;
  desc: string;
  shortcuts?: string[];
  examples?: string[];
  category: CommandCategory;
};

export const COMMANDS: CommandDef[] = [
  {
    cmd: "/help",
    desc: "show command reference",
    shortcuts: ["?"],
    category: "navigation",
    examples: ["/help"],
  },
  {
    cmd: "/commands",
    desc: "list all commands (this view)",
    category: "navigation",
    examples: ["/commands"],
  },
  {
    cmd: "/clear",
    desc: "clear the main view",
    category: "navigation",
    examples: ["/clear"],
  },
  {
    cmd: "/new",
    desc: "create a new memory",
    shortcuts: ["Ctrl+N"],
    category: "memory",
    examples: ["/new"],
  },
  {
    cmd: "/timeline",
    desc: "show recent memories",
    shortcuts: ["t"],
    category: "memory",
    examples: ["/timeline"],
  },
  {
    cmd: "/view [mode]",
    desc: "toggle or set view mode",
    category: "view",
    examples: ["/view", "/view compact", "/view expanded"],
  },
  {
    cmd: "/search <query>",
    desc: "search memories",
    shortcuts: ["Ctrl+S", "s"],
    category: "search",
    examples: ["/search mcp server"],
  },
  {
    cmd: "/filter <field>:<value>",
    desc: "filter results by field",
    shortcuts: ["f"],
    category: "search",
    examples: ["/filter project:sonderr-memory"],
  },
  {
    cmd: "/sort <field>",
    desc: "sort results by field",
    shortcuts: ["so"],
    category: "search",
    examples: ["/sort created", "/sort relevance"],
  },
  {
    cmd: "/clearfilters",
    desc: "clear all filters and sort",
    shortcuts: ["cf"],
    category: "search",
    examples: ["/clearfilters"],
  },
  {
    cmd: "/mcp",
    desc: "start MCP server",
    shortcuts: ["m"],
    category: "system",
    examples: ["/mcp"],
  },
  {
    cmd: "/stats",
    desc: "show statistics",
    shortcuts: ["st"],
    category: "system",
    examples: ["/stats"],
  },
  {
    cmd: "/recover",
    desc: "restore unsaved draft",
    category: "system",
    examples: ["/recover"],
  },
  {
    cmd: "/telemetry",
    desc: "toggle usage stats (local only)",
    category: "system",
    examples: ["/telemetry"],
  },
  {
    cmd: "/quit",
    desc: "quit application",
    shortcuts: ["Ctrl+Q", "q"],
    category: "system",
    examples: ["/quit"],
  },
  {
    cmd: "/tutorial",
    desc: "list available tutorials",
    category: "tutorials",
    examples: ["/tutorial", "/tutorial <id>"],
  },
  {
    cmd: "/tutorial <id>",
    desc: "run a tutorial by id",
    category: "tutorials",
    examples: ["/tutorial mcp-setup", "/tutorial cli-usage"],
  },
  {
    cmd: "/plugins",
    desc: "list plugins",
    category: "plugins",
    examples: ["/plugins", "/plugins toggle <id>"],
  },
  {
    cmd: "/plugins toggle <id>",
    desc: "toggle a plugin by id",
    category: "plugins",
    examples: ["/plugins toggle my-plugin"],
  },
];

export function formatCommands(): string {
  const categories = [...new Set(COMMANDS.map((c) => c.category))];
  const lines: string[] = ["COMMANDS", ""];

  const shortcuts = COMMANDS.filter((c) => c.shortcuts && c.shortcuts.length > 0);
  if (shortcuts.length > 0) {
    lines.push("── SHORTCUTS ──");
    for (const cmd of shortcuts) {
      lines.push(`  ${cmd.shortcuts!.join(", ").padEnd(24)} ${cmd.desc}`);
    }
    lines.push("");
  }

  for (const cat of categories) {
    lines.push(`── ${cat.toUpperCase()} ──`);
    for (const cmd of COMMANDS.filter((c) => c.category === cat)) {
      const shortcutStr = cmd.shortcuts?.length ? ` [${cmd.shortcuts.join(", ")}]` : "";
      lines.push(`  ${cmd.cmd.padEnd(24)} ${cmd.desc}${shortcutStr}`);
      if (cmd.examples?.length) {
        lines.push(`    examples: ${cmd.examples[0]}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
