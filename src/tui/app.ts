import { MemoryEntry, MemoryStore } from "../memory/types";
import { createStore, loadEntries, searchEntries, getTimeline, getRelated, exportForContext, saveEntry } from "../memory/store";
import { withErrorHandling } from "../errors/tui-errors";
import { getAllTutorials, getTutorial } from "../tutorial";

export type AppOptions = {
  store?: MemoryStore;
};

export function launchApp(opts: AppOptions = {}) {
  const store = opts.store || createStore();

  const screen = withErrorHandling(() => {
    return require("blessed").screen({
      smartCSR: true,
      title: "sonderr-memory",
      fullUnicode: true,
    });
  }, () => {
    console.error("Failed to initialize terminal screen.");
    process.exit(1);
  }) as any;

  const main = withErrorHandling(() => {
    return require("blessed").box({
      parent: screen,
      label: " sonderr-memory ",
      top: 0,
      left: 0,
      width: "100%",
      height: "88%",
      border: { type: "line", fg: "#FF6A00" },
      style: {
        fg: "#e6e6e6",
        bg: "#0d0d0d",
        focus: { border: { fg: "#FF6A00" } },
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
    });
  }, () => null) as any;

  const inputBar = withErrorHandling(() => {
    return require("blessed").textbox({
      parent: screen,
      label: " command ",
      top: "88%",
      left: 0,
      width: "100%",
      height: "12%",
      border: { type: "line", fg: "#FF6A00" },
      style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
      keys: true,
      mouse: true,
    });
  }, () => null) as any;

  const statusBar = withErrorHandling(() => {
    return require("blessed").box({
      parent: screen,
      top: "100%-1",
      left: 0,
      width: "100%",
      height: 1,
      style: { fg: "#000000", bg: "#FF6A00", bold: true },
      content: " ready ",
    });
  }, () => null) as any;

  let entries: MemoryEntry[] = [];
  let selectedEntry: MemoryEntry | null = null;

  function renderWelcome() {
    withErrorHandling(() => {
      main.setContent([
        "╭──────────────────────────────────────────────────────────╮",
        "│                                                          │",
        "│   ███████╗██╗   ██╗███╗   ██╗██╗  ██╗                  │",
        "│   ██╔════╝██║   ██║████╗  ██║██║  ██║                  │",
        "│   ███████╗██║   ██║██╔██╗ ██║███████║                  │",
        "│   ╚════██║██║   ██║██║╚██╗██║██╔══██║                  │",
        "│   ███████║╚██████╔╝██║ ╚████║██║  ██║                  │",
        "│   ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝                  │",
        "│                                                          │",
        "│   context engine for AI coding agents                    │",
        "│                                                          │",
        "╰──────────────────────────────────────────────────────────╯",
        "",
        "Type / for commands",
        "",
        "  /tutorial      list tutorials",
        "  /mcp           start MCP server",
        "  /stats         show statistics",
        "  /timeline      recent memories",
        "  /help          show all commands",
        "",
        "Shortcuts:",
        "  Ctrl+N         new memory",
        "  Ctrl+S         search",
        "  Ctrl+R         refresh",
        "  Ctrl+Q         quit",
        "  Tab            switch focus",
        "  ?              help",
      ].join("\n"));
      screen.render();
    }, () => {});
  }

  function showEntry(entry: MemoryEntry) {
    selectedEntry = entry;
    withErrorHandling(() => {
      const text = [
        entry.content,
        "",
        "--- metadata ---",
        "",
        `id:        ${entry.id}`,
        `createdAt: ${entry.createdAt}`,
        `updatedAt: ${entry.updatedAt}`,
        `source:    ${entry.source}`,
        `project:   ${entry.project || "(none)"}`,
        `topics:    ${entry.topics.join(", ") || "(none)"}`,
        `people:    ${entry.people.join(", ") || "(none)"}`,
        `tags:      ${entry.tags.join(", ") || "(none)"}`,
        `linkedIds: ${entry.linkedIds.join(", ") || "(none)"}`,
        `path:      ${entry.path}`,
      ].join("\n");
      main.setContent(text);
      statusBar.setContent(` loaded: ${entry.path} `);
      screen.render();
    }, () => {
      statusBar.setContent(" error loading entry ");
    });
  }

  function refreshEntries() {
    withErrorHandling(() => {
      entries = loadEntries(store);
    }, () => {
      statusBar.setContent(" error loading entries ");
    });
  }

  function handleNewMemory() {
    const form = withErrorHandling(() => {
      return require("blessed").form({
        parent: screen,
        top: "center",
        left: "center",
        width: "70%",
        height: "60%",
        label: " new memory ",
        border: { type: "line", fg: "#FF6A00" },
        style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
        keys: true,
        mouse: true,
      });
    }, () => null) as any;

    if (!form) return;

    const category = require("blessed").list({
      parent: form,
      label: " category ",
      top: 1,
      left: 1,
      width: "40%",
      height: 6,
      style: { selected: { bg: "#FF6A00", fg: "#000000" } },
      items: ["inbox", "project", "topic", "lesson", "reference"],
    } as any);
    (category as any).select(0);

    const projectInput = require("blessed").textbox({
      parent: form,
      label: " project ",
      top: 8,
      left: 1,
      width: "40%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      keys: true,
      mouse: true,
    } as any);

    const topicsInput = require("blessed").textbox({
      parent: form,
      label: " topics ",
      top: 8,
      left: "50%",
      width: "50%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      keys: true,
      mouse: true,
    } as any);

    const nameInput = require("blessed").textbox({
      parent: form,
      label: " title ",
      top: 12,
      left: 1,
      width: "90%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      keys: true,
      mouse: true,
    } as any);

    const contentInput = require("blessed").textarea({
      parent: form,
      label: " content ",
      top: 16,
      left: 1,
      width: "90%",
      height: "60%",
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      keys: true,
      mouse: true,
    } as any);

    const saveBtn = require("blessed").button({
      parent: form,
      label: " save ",
      top: "88%",
      left: "center",
      width: 12,
      height: 3,
      style: { bg: "#FF6A00", fg: "#000000", bold: true, focus: { bg: "#ff8533" } },
    } as any);

    const cancelBtn = require("blessed").button({
      parent: form,
      label: " cancel ",
      top: "88%",
      left: "center+14",
      width: 12,
      height: 3,
      style: { bg: "#333333", fg: "#e6e6e6", focus: { bg: "#444444" } },
    } as any);

    saveBtn.on("press", () => {
      withErrorHandling(() => {
        const selectedIdx = (category as any).selected ?? 0;
        const cat = ((category as any).items ?? [])[selectedIdx];
        const topics = ((topicsInput as any).value || "").split(",").map((s: string) => s.trim()).filter(Boolean);
        saveEntry(store, cat, (nameInput as any).value || "untitled", (contentInput as any).value || "", {
          project: (projectInput as any).value || undefined,
          topics,
        });
        form.destroy();
        refreshEntries();
        statusBar.setContent(" saved ");
        screen.render();
      }, () => {
        statusBar.setContent(" error saving ");
      });
    });

    cancelBtn.on("press", () => {
      form.destroy();
      screen.render();
    });

    screen.append(form);
    (nameInput as any).focus();
    screen.render();
  }

  function handleSearch() {
    const prompt = withErrorHandling(() => {
      return require("blessed").prompt({
        parent: screen,
        top: "center",
        left: "center",
        width: "50%",
        height: "shrink",
        border: { type: "line", fg: "#FF6A00" },
        label: " search ",
        style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
        keys: true,
        mouse: true,
      });
    }, () => null) as any;

    if (!prompt) return;

    (prompt as any).input("query", (err: Error | null, value: string) => {
      withErrorHandling(() => {
        prompt.destroy();
        if (value) {
          const results = searchEntries(store, value);
          if (results.length > 0) {
            showEntry(results[0]);
            statusBar.setContent(` search: ${value} (${results.length} results) `);
          } else {
            statusBar.setContent(` no results for: ${value} `);
          }
          screen.render();
        }
      }, () => {
        prompt.destroy();
        screen.render();
      });
    });

    screen.render();
  }

  function showCommandPalette() {
    const commands = [
      { cmd: "/tutorial", desc: "list tutorials" },
      { cmd: "/tutorial <id>", desc: "run tutorial" },
      { cmd: "/help", desc: "show help" },
      { cmd: "/mcp", desc: "start MCP server" },
      { cmd: "/stats", desc: "show statistics" },
      { cmd: "/timeline", desc: "show recent memories" },
      { cmd: "/clear", desc: "clear screen" },
      { cmd: "/search <query>", desc: "search memories" },
      { cmd: "/new", desc: "create new memory" },
      { cmd: "/quit", desc: "quit" },
    ];

    const list = withErrorHandling(() => {
      return require("blessed").list({
        parent: screen,
        label: " commands ",
        top: "10%",
        left: "center",
        width: "50%",
        height: "60%",
        border: { type: "line", fg: "#FF6A00" },
        style: {
          fg: "#e6e6e6",
          bg: "#1a1a1a",
          selected: { bg: "#FF6A00", fg: "#000000" },
          focus: { border: { fg: "#FF6A00" } },
        },
        items: commands.map((c) => `${c.cmd.padEnd(20)} ${c.desc}`),
        keys: true,
        vi: true,
        mouse: true,
      });
    }, () => null) as any;

    if (!list) return;

    const input = withErrorHandling(() => {
      return require("blessed").textbox({
        parent: screen,
        label: " filter ",
        top: "5%",
        left: "center",
        width: "50%",
        height: 3,
        border: { type: "line", fg: "#FF6A00" },
        style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
        keys: true,
        mouse: true,
      });
    }, () => null) as any;

    if (!input) return;

    function updateSuggestions(query: string) {
      const filtered = commands.filter((c) => c.cmd.includes(query) || c.desc.includes(query));
      (list as any).setItems(filtered.map((c) => `${c.cmd.padEnd(20)} ${c.desc}`));
      (list as any).select(0);
      screen.render();
    }

    (input as any).on("keypress", (_ch: unknown, key: any) => {
      if (key.name === "escape") {
        input.destroy();
        list.destroy();
        screen.render();
      }
    });

    (input as any).on("submit", () => {
      const value = (input as any).value || "";
      input.destroy();
      list.destroy();
      handleCommand(value);
      screen.render();
    });

    (input as any).on("change", () => {
      updateSuggestions((input as any).value || "");
    });

    screen.append(input);
    screen.append(list);
    (input as any).focus();
    screen.render();
  }

  function handleCommand(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed === "/tutorial" || trimmed === "tutorial") {
      showTutorialList();
    } else if (trimmed.startsWith("/tutorial ")) {
      showTutorial(trimmed.split(" ")[1]);
    } else if (trimmed === "/help" || trimmed === "help") {
      showHelp();
    } else if (trimmed === "/mcp" || trimmed === "mcp") {
      statusBar.setContent(" starting MCP server... ");
      screen.render();
      import("../mcp-server").then(({ createMCPServer }) => {
        const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
        createMCPServer(port);
        statusBar.setContent(` MCP server running on :${port} `);
        screen.render();
      }).catch((err) => {
        statusBar.setContent(` MCP error: ${err instanceof Error ? err.message : String(err)} `);
        screen.render();
      });
    } else if (trimmed === "/stats" || trimmed === "stats") {
      const all = loadEntries(store);
      const stats = {
        total: all.length,
        sources: {} as Record<string, number>,
        projects: {} as Record<string, number>,
      };
      for (const e of all) {
        stats.sources[e.source] = (stats.sources[e.source] || 0) + 1;
        if (e.project) stats.projects[e.project] = (stats.projects[e.project] || 0) + 1;
      }
      main.setContent(JSON.stringify(stats, null, 2));
      statusBar.setContent(" stats ");
      screen.render();
    } else if (trimmed === "/timeline" || trimmed === "timeline") {
      const recent = getTimeline(store, 20);
      const lines = recent.map((r) => `${r.createdAt} | ${r.source} | ${r.content.split("\n")[0].slice(0, 60)}`);
      main.setContent(lines.join("\n") || "(empty)");
      statusBar.setContent(" timeline ");
      screen.render();
    } else if (trimmed === "/clear" || trimmed === "clear") {
      main.setContent("");
      statusBar.setContent(" cleared ");
      screen.render();
    } else if (trimmed === "/new" || trimmed === "new") {
      handleNewMemory();
    } else if (trimmed.startsWith("/search ") || trimmed.startsWith("search ")) {
      const query = trimmed.split(" ").slice(1).join(" ");
      if (query) {
        const results = searchEntries(store, query);
        if (results.length > 0) {
          showEntry(results[0]);
          statusBar.setContent(` search: ${query} (${results.length} results) `);
        } else {
          statusBar.setContent(` no results for: ${query} `);
        }
      }
    } else if (trimmed === "/quit" || trimmed === "/q" || trimmed === "quit") {
      screen.destroy();
      process.exit(0);
    } else if (trimmed.startsWith("/")) {
      statusBar.setContent(` unknown command: ${trimmed} `);
      screen.render();
    }
  }

  function showTutorialList() {
    const tutorials = getAllTutorials();
    const items = tutorials.map((t) => `${t.id}: ${t.name}\n    ${t.description}`);
    main.setContent(["Available tutorials:", "", ...items, "", "Usage: /tutorial <id>"].join("\n"));
    statusBar.setContent(" tutorials ");
    screen.render();
  }

  function showTutorial(id: string) {
    const tutorial = getTutorial(id);
    if (!tutorial) {
      statusBar.setContent(` tutorial not found: ${id} `);
      screen.render();
      return;
    }
    const lines: string[] = [
      `=== ${tutorial.name} ===`,
      "",
      tutorial.description,
      "",
    ];
    tutorial.steps.forEach((step, i) => {
      lines.push(`Step ${i + 1}: ${step.title}`);
      lines.push(step.body);
      if (step.command) {
        lines.push("");
        lines.push(`$ ${step.command}`);
      }
      if (step.hint) {
        lines.push(`Hint: ${step.hint}`);
      }
      lines.push("");
    });
    main.setContent(lines.join("\n"));
    statusBar.setContent(` tutorial: ${tutorial.name} `);
    screen.render();
  }

  function showHelp() {
    main.setContent([
      "KEYBINDS",
      "",
      "Ctrl+N     new memory",
      "Ctrl+S     search",
      "Ctrl+R     refresh",
      "Ctrl+Q     quit",
      "Tab        focus command bar",
      "?          help",
      "/          command palette",
      "",
      "COMMANDS",
      "",
      "/tutorial              list tutorials",
      "/tutorial <id>         run tutorial",
      "/help                  show this help",
      "/mcp                   start MCP server",
      "/stats                 show statistics",
      "/timeline              show timeline",
      "/clear                 clear screen",
      "/search <query>        search memories",
      "/new                   create new memory",
      "/quit                  quit",
      "",
      `ROOT: ${store.root}`,
    ].join("\n"));
    statusBar.setContent(" help ");
    screen.render();
  }

  function handleRefresh() {
    refreshEntries();
    statusBar.setContent(" refreshed ");
    screen.render();
  }

  function handleQuit() {
    screen.destroy();
    process.exit(0);
  }

  screen.key(["c-n"], handleNewMemory);
  screen.key(["c-s"], handleSearch);
  screen.key(["c-r"], handleRefresh);
  screen.key(["c-q", "C-c"], handleQuit);
  screen.key(["tab"], () => {
    withErrorHandling(() => {
      (inputBar as any).focus();
      screen.render();
    }, () => {});
  });
  screen.key(["/"], () => {
    showCommandPalette();
  });
  screen.key(["?"], showHelp);

  const globalErrorHandler = (err: Error) => {
    statusBar.setContent(` error: ${err.message.slice(0, 40)} `);
    screen.render();
  };

  process.on("uncaughtException", globalErrorHandler);
  process.on("unhandledRejection", (err) => {
    globalErrorHandler(err instanceof Error ? err : new Error(String(err)));
  });

  inputBar.on("submit", () => {
    const value = (inputBar as any).value || "";
    (inputBar as any).clearValue();
    handleCommand(value);
  });

  inputBar.on("keypress", (_ch: unknown, key: any) => {
    if (key.name === "escape") {
      (inputBar as any).clearValue();
      (inputBar as any).blur();
      screen.render();
    }
  });

  refreshEntries();
  renderWelcome();
  statusBar.setContent(" ready ");
  screen.render();
}
