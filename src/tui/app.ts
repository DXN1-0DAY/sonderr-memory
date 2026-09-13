import { MemoryEntry, MemoryStore } from "../memory/types";
import { createStore, loadEntries, searchEntries, getTimeline, getRelated, exportForContext } from "../memory/store";
import { createSidebar, renderSidebarItems } from "./panels/sidebar";
import { createEditor } from "./panels/editor";
import { createMetadataPanel } from "./panels/metadata";
import { createTimeline } from "./panels/timeline";
import { showCreateMemoryForm, showEditLabelsForm, showSearchPrompt } from "./forms";
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

  const topBar = withErrorHandling(() => {
    return require("blessed").box({
      parent: screen,
      top: 0,
      left: 0,
      width: "100%",
      height: 1,
      style: { fg: "#000000", bg: "#FF6A00", bold: true },
      content: " sonderr-memory | Ctrl+N new | Ctrl+S search | Ctrl+L labels | Ctrl+X context | Ctrl+Q quit | / command mode | ? help ",
    });
  }, () => null) as any;

  const sidebar = createSidebar({
    parent: screen,
    width: "25%",
    height: "60%",
    onSelect: (entry) => showEntry(entry),
  });

  const editor = createEditor({
    parent: screen,
    top: 0,
    left: "25%",
    width: "50%",
    height: "60%",
  });

  const metadata = createMetadataPanel({
    parent: screen,
    top: 0,
    left: "75%",
    width: "25%",
    height: "60%",
  });

  const timeline = createTimeline({
    parent: screen,
    top: "60%",
    left: 0,
    width: "100%",
    height: "20%",
  });

  const inputBar = withErrorHandling(() => {
    return require("blessed").textbox({
      parent: screen,
      label: " /command ",
      top: "80%",
      left: 0,
      width: "100%",
      height: 3,
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
  let timelineEntries: MemoryEntry[] = [];

  function showEntry(entry: MemoryEntry) {
    selectedEntry = entry;
    editor.render(entry);
    metadata.render(store, entry);
    statusBar.setContent(` loaded: ${entry.path} `);
    screen.render();
  }

  function refreshSidebar(filter?: string) {
    withErrorHandling(() => {
      entries = filter ? searchEntries(store, filter) : loadEntries(store);
      renderSidebarItems(sidebar, entries, (entry) =>
        entry.source === "inbox"
          ? `inbox/${entry.path.split("/").slice(-3, -1).join("/")}`
          : entry.source === "project"
            ? `projects/${entry.project || "unknown"}`
            : entry.source === "topic"
              ? `topics/${entry.topics[0] || "general"}`
              : entry.source === "lesson"
                ? "lessons"
                : "references"
      );
    }, () => {
      statusBar.setContent(" error loading entries ");
    });
  }

  function refreshTimeline() {
    withErrorHandling(() => {
      timelineEntries = getTimeline(store, 40);
      timeline.render(timelineEntries);
    }, () => {
      statusBar.setContent(" error loading timeline ");
    });
  }

  function handleNewMemory() {
    showCreateMemoryForm({
      screen,
      store,
      onSaved: () => {
        refreshSidebar();
        refreshTimeline();
        statusBar.setContent(" saved ");
        screen.render();
      },
    });
  }

  function handleEditLabels() {
    const current = selectedEntry;
    if (!current) {
      statusBar.setContent(" no entry selected ");
      screen.render();
      return;
    }
    showEditLabelsForm({
      screen,
      store,
      entry: current,
      onUpdated: (updated) => {
        selectedEntry = updated;
        refreshSidebar();
        refreshTimeline();
        editor.render(updated);
        metadata.render(store, updated);
        statusBar.setContent(" labels updated ");
        screen.render();
      },
    });
  }

  function handleSearch() {
    showSearchPrompt({
      screen,
      onSubmit: (query) => {
        refreshSidebar(query);
        statusBar.setContent(` search: ${query} `);
        screen.render();
      },
    });
  }

  function handleContextPreview() {
    const current = selectedEntry;
    if (!current) {
      statusBar.setContent(" no entry selected ");
      screen.render();
      return;
    }
    withErrorHandling(() => {
      const query = current.content.split("\n")[0];
      const ctx = exportForContext(store, query, 1500);
      editor.box.setContent(`--- context preview ---\n\n${ctx}`);
      statusBar.setContent(" context preview ");
      screen.render();
    }, () => {
      statusBar.setContent(" error generating context ");
    });
  }

  function handleHelp() {
    withErrorHandling(() => {
      editor.box.setContent([
        "KEYBINDS",
        "",
        "Ctrl+N     new memory",
        "Ctrl+S     search",
        "Ctrl+L     edit labels",
        "Ctrl+X     context preview",
        "Ctrl+R     refresh",
        "Ctrl+Q     quit",
        "Up/Down    navigate sidebar / timeline",
        "Tab        switch panels",
        "Enter      view entry",
        "/          command mode",
        "",
        "COMMANDS",
        "",
        "/tutorial              list tutorials",
        "/tutorial <id>         run tutorial",
        "/help                  show this help",
        "/mcp                   start MCP server",
        "/stats                 show stats",
        "/timeline              show timeline",
        "/clear                 clear editor",
        "",
        `ROOT: ${store.root}`,
      ].join("\n"));
      screen.render();
    }, () => {
      statusBar.setContent(" error showing help ");
    });
  }

  function handleCommand(input: string) {
    const trimmed = input.trim();
    if (trimmed === "/tutorial" || trimmed === "tutorial") {
      showTutorialList();
    } else if (trimmed.startsWith("/tutorial ")) {
      showTutorial(trimmed.split(" ")[1]);
    } else if (trimmed === "/help" || trimmed === "help") {
      handleHelp();
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
      editor.box.setContent(JSON.stringify(stats, null, 2));
      statusBar.setContent(" stats ");
      screen.render();
    } else if (trimmed === "/timeline" || trimmed === "timeline") {
      const recent = getTimeline(store, 20);
      const lines = recent.map((r) => `${r.createdAt} | ${r.source} | ${r.content.split("\n")[0].slice(0, 60)}`);
      editor.box.setContent(lines.join("\n") || "(empty)");
      statusBar.setContent(" timeline ");
      screen.render();
    } else if (trimmed === "/clear" || trimmed === "clear") {
      editor.box.setContent("");
      statusBar.setContent(" cleared ");
      screen.render();
    } else if (trimmed.startsWith("/")) {
      statusBar.setContent(` unknown command: ${trimmed} `);
      screen.render();
    }
  }

  function showTutorialList() {
    const tutorials = getAllTutorials();
    const items = tutorials.map((t) => `${t.id}: ${t.name} - ${t.description}`);
    editor.box.setContent(["Available tutorials:", "", ...items, "", "Usage: /tutorial <id>"].join("\n"));
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
    editor.box.setContent(lines.join("\n"));
    statusBar.setContent(` tutorial: ${tutorial.name} `);
    screen.render();
  }

  function handleRefresh() {
    refreshSidebar();
    refreshTimeline();
    statusBar.setContent(" refreshed ");
    screen.render();
  }

  function handleQuit() {
    screen.destroy();
    process.exit(0);
  }

  sidebar.on("select", (_el: unknown, idx: number) => {
    const items = (sidebar as any).items || [];
    const item = items[idx];
    if (item && typeof item === "object" && "id" in item) {
      showEntry(item as MemoryEntry);
    }
  });

  timeline.list.on("select", (_el: unknown, idx: number) => {
    const item = timelineEntries[idx];
    if (item) showEntry(item);
  });

  screen.key(["c-n"], handleNewMemory);
  screen.key(["c-s"], handleSearch);
  screen.key(["c-l"], handleEditLabels);
  screen.key(["c-x"], handleContextPreview);
  screen.key(["c-r"], handleRefresh);
  screen.key(["c-q", "C-c"], handleQuit);
  screen.key(["/"], () => {
    inputBar.focus();
    inputBar.readInput((err: Error | null, value: string) => {
      withErrorHandling(() => {
        inputBar.clearValue();
        if (!value) return;
        handleCommand(value);
      }, () => {
        inputBar.clearValue();
        screen.render();
      });
    });
  });
  screen.key(["tab"], () => {
    withErrorHandling(() => {
      const focused = screen.focused;
      if (focused === editor.box) metadata.box.focus();
      else if (focused === metadata.box) sidebar.focus();
      else if (focused === sidebar) timeline.list.focus();
      else inputBar.focus();
      screen.render();
    }, () => {});
  });
  screen.key(["?"], handleHelp);

  const globalErrorHandler = (err: Error) => {
    statusBar.setContent(` error: ${err.message.slice(0, 40)} `);
    screen.render();
  };

  process.on("uncaughtException", globalErrorHandler);
  process.on("unhandledRejection", (err) => {
    globalErrorHandler(err instanceof Error ? err : new Error(String(err)));
  });

  refreshSidebar();
  refreshTimeline();
  metadata.render(store, null);
  screen.render();
}
