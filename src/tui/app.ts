import { MemoryEntry, MemoryStore } from "../memory/types";
import { createStore, loadEntries, searchEntries, getTimeline, getRelated, exportForContext } from "../memory/store";
import { createSidebar, renderSidebarItems } from "./panels/sidebar";
import { createEditor } from "./panels/editor";
import { createMetadataPanel } from "./panels/metadata";
import { createTimeline } from "./panels/timeline";
import { showCreateMemoryForm, showEditLabelsForm, showSearchPrompt } from "./forms";
import { withErrorHandling } from "../errors/tui-errors";

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
      content: " sonderr-memory | Ctrl+N new | Ctrl+S search | Ctrl+L labels | Ctrl+X context | Ctrl+Q quit | ? help ",
    });
  }, () => null) as any;

  const sidebar = createSidebar({
    parent: screen,
    width: "30%",
    height: "60%",
    onSelect: (entry) => showEntry(entry),
  });

  const editor = createEditor({
    parent: screen,
    top: 0,
    left: "30%",
    width: "40%",
    height: "60%",
  });

  const metadata = createMetadataPanel({
    parent: screen,
    top: 0,
    left: "70%",
    width: "30%",
    height: "60%",
  });

  const timeline = createTimeline({
    parent: screen,
    top: "60%",
    left: 0,
    width: "100%",
    height: "20%",
  });

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
        "",
        "PANELS",
        "",
        "Left       memory tree",
        "Center     entry content",
        "Right      metadata",
        "Bottom     timeline",
        "",
        `ROOT: ${store.root}`,
      ].join("\n"));
      screen.render();
    }, () => {
      statusBar.setContent(" error showing help ");
    });
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

  const sidebarAny = sidebar as any;
  const timelineAny = timeline as any;

  sidebarAny.on("select", (_el: unknown, idx: number) => {
    const visible = entries.slice(0, 200);
    const item = visible[idx];
    if (item) showEntry(item);
  });

  timelineAny.on("select", (_el: unknown, idx: number) => {
    const item = timelineEntries[idx];
    if (item) showEntry(item);
  });

  screen.key(["c-n"], handleNewMemory);
  screen.key(["c-s"], handleSearch);
  screen.key(["c-l"], handleEditLabels);
  screen.key(["c-x"], handleContextPreview);
  screen.key(["c-r"], handleRefresh);
  screen.key(["c-q", "C-c"], handleQuit);
  screen.key(["tab"], () => {
    withErrorHandling(() => {
      const focused = screen.focused;
      if (focused === editor.box) metadata.box.focus();
      else if (focused === metadata.box) sidebarAny.focus();
      else if (focused === sidebarAny) timelineAny.focus();
      else editor.box.focus();
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
