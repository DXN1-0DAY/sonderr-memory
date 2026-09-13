import { MemoryEntry, MemoryStore } from "../memory/types";
import { createStore, loadEntries, searchEntries, getTimeline, getRelated, exportForContext, saveEntry, getMeta, saveSessionState, loadSessionState, linkEntries } from "../memory/store";
import { withErrorHandling } from "../errors/tui-errors";
import { getAllTutorials, getTutorial } from "../tutorial";
import { loadConfig, saveConfig, getConfigPath } from "../config";
import { checkForUpdate } from "../update";
import { logger } from "../logger";
import { createTheme } from "./theme";
import { tag } from "./format";
import { showCreateMemoryForm } from "./forms";
import { createSidebar, renderSidebarItems, type SidebarOptions } from "./panels/sidebar";
import { createEditor, type EditorOptions } from "./panels/editor";
import { createTimeline, type TimelineOptions } from "./panels/timeline";
import { createMetadataPanel, type MetadataOptions } from "./panels/metadata";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Plugin, createPluginRegistry } from "../plugins/registry";

const CRASH_RECOVERY_PATH = path.join(os.tmpdir(), "sonderr-memory-draft.json");
const MAX_RECOVERY_AGE_MS = 24 * 60 * 60 * 1000;
const NARROW_THRESHOLD = 80;
const SIDEBAR_WIDTH = 28;
const META_WIDTH = 28;

export type AppOptions = {
  store?: MemoryStore;
  config?: ReturnType<typeof loadConfig>;
  plugins?: Plugin[];
};

export function launchApp(opts: AppOptions = {}) {
  const config = opts.config || loadConfig();
  const store = opts.store || createStore(config.store.root);
  const registry = createPluginRegistry();
  if (opts.plugins) {
    for (const plugin of opts.plugins) {
      registry.register(plugin);
    }
  }
  const hooks = registry.getHooks();
  const pluginCommands = registry.getCommands();
  const theme = createTheme(config);
  const ACCENT = theme.accent;
  const ACCENT_LIGHT = theme.accentLight;
  const BG = theme.bg;
  const BG_PANEL = theme.bgPanel;
  const FG = theme.fg;
  const BORDER = theme.border;
  const FOCUS_BORDER = theme.focusBorder;
  const SELECTED_BG = theme.selected.bg;
  const SELECTED_FG = theme.selected.fg;
  const CANCEL_BG = theme.cancelBg;
  const CANCEL_FOCUS = theme.cancelFocus;

  const screen = withErrorHandling(() => {
    return require("blessed").screen({
      smartCSR: true,
      title: "sonderr-memory",
      fullUnicode: true,
    });
  }, () => {
    logger.error("tui", "Failed to initialize terminal screen.");
    process.exit(1);
  }) as any;

  const main = withErrorHandling(() => {
    return require("blessed").box({
      parent: screen,
      label: " sonderr-memory ",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%-4",
      border: BORDER,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      tags: true,
      style: {
        fg: FG,
        bg: BG,
        focus: { border: FOCUS_BORDER },
      },
      scrollable: false,
      mouse: true,
      keys: true,
      vi: true,
    });
  }, () => null) as any;

  const inputBar = withErrorHandling(() => {
    return require("blessed").textbox({
      parent: screen,
      label: " command ",
      top: "100%-4",
      left: 0,
      width: "100%",
      height: 2,
      border: BORDER,
      style: { fg: FG, bg: BG_PANEL, focus: { border: FOCUS_BORDER } },
      keys: true,
      mouse: true,
    });
  }, () => null) as any;

  const helpFooter = withErrorHandling(() => {
    return require("blessed").box({
      parent: screen,
      top: "100%-2",
      left: 0,
      width: "100%",
      height: 1,
      style: { fg: FG, bg: BG_PANEL },
      content: " ? help | / commands | Ctrl+N new | Ctrl+S search | Tab: focus ",
    });
  }, () => null) as any;

  const statusBar = withErrorHandling(() => {
    return require("blessed").box({
      parent: screen,
      top: "100%-1",
      left: 0,
      width: "100%",
      height: 1,
      style: { fg: theme.bg, bg: ACCENT, bold: true },
      content: " ready ",
    });
  }, () => null) as any;

  let sidebar: any = null;
  let editor: any = null;
  let timelineList: any = null;
  let metadataPanel: any = null;
  let entries: MemoryEntry[] = [];
  let selectedEntry: MemoryEntry | null = null;
  let statusTimer: NodeJS.Timeout | null = null;
  let currentFilter: Record<string, string> = {};
  let currentSort: { field: string; direction: "asc" | "desc" } = { field: "relevance", direction: "desc" };
  let unsavedDraft = "";
  let lastPersistedDraft = "";
  let statusBarFlashTimer: NodeJS.Timeout | null = null;
  let mainTransitionTimer: NodeJS.Timeout | null = null;
  let paletteOpen = false;
  let recentCommands: string[] = [];
  let activeContext: "idle" | "sidebar" | "editor" | "timeline" | "metadata" | "input" | "modal" | "palette" = "idle";

  function getContextHint(): string {
    switch (activeContext) {
      case "sidebar":
        return " ? help | / commands | ↑↓ browse | Enter: select ";
      case "editor":
        return " ? help | / search | ↑↓ scroll | / context ";
      case "timeline":
        return " ? help | / commands | ↑↓ browse ";
      case "metadata":
        return " ? help | / commands | ↑↓ scroll ";
      case "input":
        return " Esc: cancel | Enter: submit | Tab: autocomplete ";
      case "modal":
        return " Tab: next | Shift+Tab: prev | Esc: cancel ";
      case "palette":
        return " ↑↓ select | Enter: run | Esc: close ";
      default:
        return " ? help | / commands | Ctrl+N new | Ctrl+S search | Tab: focus ";
    }
  }

  function updateContextHint(context: typeof activeContext) {
    activeContext = context;
    const hint = getContextHint();
    if (helpFooter) {
      (helpFooter as any).setContent(hint);
    }
    screen.render();
  }

  function isWide() {
    return screen.width >= NARROW_THRESHOLD;
  }

  function layoutPanels() {
    const wide = isWide();
    const mainHeight = main.height as number;
    const mainWidth = main.width as number;

    if (sidebar) sidebar.destroy();
    if (editor) editor.destroy();
    if (timelineList) timelineList.destroy();
    if (metadataPanel) metadataPanel.destroy();

    if (wide) {
      const sidebarW = SIDEBAR_WIDTH;
      const metaW = META_WIDTH;
      const editorW = mainWidth - sidebarW - metaW - 2;
      const editorH = Math.max(1, mainHeight - Math.floor(mainHeight * 0.35) - 1);
      const timelineH = Math.max(1, mainHeight - editorH - 1);

      sidebar = createSidebar({
        parent: main,
        width: `${sidebarW}`,
        height: "100%",
        top: 0,
        left: 0,
        onSelect: (entry) => {
          selectedEntry = entry;
          editor.render(entry);
          metadataPanel.render(store, entry);
        },
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      sidebar.on("focus", () => updateContextHint("sidebar"));
      sidebar.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });

      editor = createEditor({
        parent: main,
        top: 0,
        left: sidebarW + 1,
        width: `${editorW}`,
        height: "100%",
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      editor.box.on("focus", () => updateContextHint("editor"));
      editor.box.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });

      metadataPanel = createMetadataPanel({
        parent: main,
        top: 0,
        left: mainWidth - metaW,
        width: `${metaW}`,
        height: "100%",
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      metadataPanel.box.on("focus", () => updateContextHint("metadata"));
      metadataPanel.box.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });

      timelineList = createTimeline({
        parent: main,
        top: `${editorH + 1}`,
        left: sidebarW + 1,
        width: `${editorW}`,
        height: `${timelineH}`,
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      timelineList.on("focus", () => updateContextHint("timeline"));
      timelineList.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });
    } else {
      const editorH = Math.max(1, mainHeight - Math.floor(mainHeight * 0.35) - 1);
      const timelineH = Math.max(1, mainHeight - editorH - 1);

      editor = createEditor({
        parent: main,
        top: 0,
        left: 0,
        width: "100%",
        height: `${editorH}`,
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      editor.box.on("focus", () => updateContextHint("editor"));
      editor.box.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });

      metadataPanel = createMetadataPanel({
        parent: main,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      metadataPanel.box.on("focus", () => updateContextHint("metadata"));
      metadataPanel.box.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });

      timelineList = createTimeline({
        parent: main,
        top: `${editorH + 1}`,
        left: 0,
        width: "100%",
        height: `${timelineH}`,
        theme,
        padding: { top: 1, bottom: 1, left: 1, right: 1 },
      });

      timelineList.on("focus", () => updateContextHint("timeline"));
      timelineList.on("blur", () => {
        if (activeContext !== "modal" && activeContext !== "palette") {
          updateContextHint("idle");
        }
      });
    }

    if (selectedEntry) {
      editor.render(selectedEntry);
      metadataPanel.render(store, selectedEntry);
    }
    screen.render();
  }

  function persistDraft() {
    const current = (inputBar as any).value || "";
    if (current === lastPersistedDraft) return;
    lastPersistedDraft = current;
    withErrorHandling(() => {
      fs.writeFileSync(CRASH_RECOVERY_PATH, JSON.stringify({ value: current, ts: Date.now() }));
    }, () => {});
  }

  function clearDraft() {
    withErrorHandling(() => {
      if (fs.existsSync(CRASH_RECOVERY_PATH)) fs.unlinkSync(CRASH_RECOVERY_PATH);
      unsavedDraft = "";
      lastPersistedDraft = "";
    }, () => {});
  }

  function restoreDraft(): boolean {
    return withErrorHandling(() => {
      if (!fs.existsSync(CRASH_RECOVERY_PATH)) return false;
      const raw = fs.readFileSync(CRASH_RECOVERY_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > MAX_RECOVERY_AGE_MS) {
        fs.unlinkSync(CRASH_RECOVERY_PATH);
        return false;
      }
      unsavedDraft = data.value || "";
      lastPersistedDraft = unsavedDraft;
      (inputBar as any).value = unsavedDraft;
      (inputBar as any).focus();
      clearDraft();
      return true;
    }, () => false);
  }

  function checkRecovery() {
    withErrorHandling(() => {
      if (!fs.existsSync(CRASH_RECOVERY_PATH)) return;
      const raw = fs.readFileSync(CRASH_RECOVERY_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > MAX_RECOVERY_AGE_MS) {
        fs.unlinkSync(CRASH_RECOVERY_PATH);
        return;
      }
      const ageMin = Math.floor((Date.now() - data.ts) / 60000);
      statusBar.setContent(` recovered draft (${ageMin}m old) — type /recover to restore `);
      flashStatusBar();
    }, () => {});
  }

  function notify(message: string, duration = 2000) {
    if (statusTimer) clearTimeout(statusTimer);
    statusBar.setContent(` ${message} `);
    flashStatusBar();
    statusTimer = setTimeout(() => {
      statusTimer = null;
      const contextLabel = activeContext === "idle" ? "ready" : activeContext;
      statusBar.setContent(` ${contextLabel} `);
      screen.render();
    }, duration);
  }

  function flashStatusBar() {
    if (statusBarFlashTimer) clearTimeout(statusBarFlashTimer);
    const baseFg = theme.bg;
    const baseBg = ACCENT;
    (statusBar as any).style.fg = baseBg;
    (statusBar as any).style.bg = baseFg;
    (statusBar as any).style.underline = true;
    screen.render();
    statusBarFlashTimer = setTimeout(() => {
      (statusBar as any).style.fg = baseFg;
      (statusBar as any).style.bg = baseBg;
      (statusBar as any).style.underline = false;
      screen.render();
      statusBarFlashTimer = null;
    }, 150);
  }

  function transitionMain(content: string) {
    if (mainTransitionTimer) clearTimeout(mainTransitionTimer);
    main.setContent("");
    screen.render();
    mainTransitionTimer = setTimeout(() => {
      main.setContent(content);
      screen.render();
      mainTransitionTimer = null;
    }, 25);
  }

  function flashModal(form: any) {
    if (!form || !form.style || !form.style.border) return;
    const originalFg = (form.style.border as any).fg;
    (form.style.border as any).fg = ACCENT;
    screen.render();
    setTimeout(() => {
      (form.style.border as any).fg = originalFg;
      screen.render();
    }, 200);
  }

  let viewMode: "compact" | "expanded" = "compact";
  let formOpen = false;

  function renderWelcome() {
    withErrorHandling(() => {
      const t = tag(theme);
      transitionMain([
        "",
        t.heading("  sonderr-memory "),
        t.muted("  context engine for AI coding agents"),
        "",
        "  Type / for commands",
        "",
        t.divider(),
        "",
        "  Commands:",
        "    /tutorial      list tutorials",
        "    /mcp           start MCP server",
        "    /stats         show statistics",
        "    /timeline      recent memories",
        "    /view          toggle view mode",
        "    /help          show all commands",
        "",
        "  Shortcuts:",
        "    Ctrl+N         new memory",
        "    Ctrl+S         search",
        "    Ctrl+R         refresh",
        "    Ctrl+Q         quit",
        "    Tab            switch focus",
        "    ?              help",
      ].join("\n"));
    }, () => {});
  }

  function showTelemetryPrompt() {
    updateContextHint("modal");
    const prompt = withErrorHandling(() => {
      return require("blessed").form({
        parent: screen,
        top: "center",
        left: "center",
        width: "60%",
        height: "40%",
        label: " usage stats ",
        border: BORDER,
        style: { fg: FG, bg: BG_PANEL, focus: { border: FOCUS_BORDER } },
        keys: true,
        mouse: true,
      });
    }, () => null) as any;

    if (!prompt) return;

    const message = withErrorHandling(() => {
      return require("blessed").box({
        parent: prompt,
        top: 1,
        left: 1,
        width: "90%",
        height: "60%",
        content: "Help improve sonderr-memory with local usage statistics.\n\nAll data stays on your machine. No network requests are made.\nUsage data is stored in ~/.sonderr-memory/config.json and is never transmitted.",
        style: { fg: FG, bg: BG_PANEL },
        tags: true,
      });
    }, () => null) as any;

    const yesBtn = withErrorHandling(() => {
      return require("blessed").button({
        parent: prompt,
        label: " yes, opt in ",
        top: "70%",
        left: "center-20",
        width: 14,
        height: 3,
        mouse: true,
        style: { bg: ACCENT, fg: SELECTED_FG, bold: true, focus: { bg: ACCENT_LIGHT } },
      });
    }, () => null) as any;

    const noBtn = withErrorHandling(() => {
      return require("blessed").button({
        parent: prompt,
        label: " no, thanks ",
        top: "70%",
        left: "center+6",
        width: 14,
        height: 3,
        style: { bg: CANCEL_BG, fg: FG, focus: { bg: CANCEL_FOCUS } },
      });
    }, () => null) as any;

    const _hintBox = withErrorHandling(() => {
      return require("blessed").box({
        parent: prompt,
        top: "88%",
        left: 1,
        width: "100%-2",
        height: 1,
        style: { fg: FG, bg: BG_PANEL },
        content: " Tab: switch | Enter: select | Esc: no thanks ",
      });
    }, () => null) as any;

    const fields = [yesBtn, noBtn] as any[];

    fields.forEach((el) => {
      (el as any).on("keypress", (_ch: unknown, key: any) => {
        if (key.name === "tab" && !key.shift) {
          const idx = fields.indexOf(el);
          const next = fields.at(idx + 1) || fields[0];
          (next as any).focus();
          screen.render();
        } else if (key.name === "tab" && key.shift) {
          const idx = fields.indexOf(el);
          const prev = fields.at(idx - 1) || fields.at(-1);
          (prev as any).focus();
          screen.render();
        } else if (key.name === "escape") {
          (noBtn as any).press();
        }
      });
    });

    (yesBtn as any).on("press", () => {
      config.enableUsageStats = true;
      config.usageStats = { sessionCount: 1, lastUsedAt: new Date().toISOString(), commandCounts: {} };
      saveConfig(config);
      prompt.destroy();
      updateContextHint("idle");
      screen.render();
      notify("usage stats enabled — local only", 3000);
    });

    (noBtn as any).on("press", () => {
      config.enableUsageStats = false;
      saveConfig(config);
      prompt.destroy();
      updateContextHint("idle");
      screen.render();
      notify("usage stats disabled", 3000);
    });

    screen.append(prompt);
    flashModal(prompt);
    (yesBtn as any).focus();
    screen.render();
  }

  function recordUsage(command?: string) {
    if (!config.enableUsageStats) return;
    const stats = config.usageStats || { sessionCount: 0, lastUsedAt: null, commandCounts: {} as Record<string, number> };
    config.usageStats = {
      sessionCount: stats.sessionCount + 1,
      lastUsedAt: new Date().toISOString(),
      commandCounts: command
        ? { ...stats.commandCounts, [command]: ((stats.commandCounts || {})[command] || 0) + 1 }
        : stats.commandCounts,
    };
    saveConfig(config);
  }

  function showEntry(entry: MemoryEntry) {
    selectedEntry = entry;
    saveSessionState(store, { lastEntryId: entry.id });
    withErrorHandling(() => {
      if (editor) editor.render(entry);
      if (metadataPanel) metadataPanel.render(store, entry);
      statusBar.setContent(`loaded: ${entry.path.slice(0, 40)}`);
      flashStatusBar();
    }, () => {
      notify("error loading entry", 4000);
    });
  }

  function renderResultsList(results: MemoryEntry[], query: string) {
    withErrorHandling(() => {
      const t = tag(theme);
      const lines = [
        t.heading(`RESULTS: "${query}"`),
        "",
        ...results.map((r, i) =>
          `${i + 1}. ${r.createdAt.slice(0, 10)} | {fg-${theme.accent}}${r.source}{/fg-${theme.accent}} | ${r.project || "(none)"} | ${r.content.split("\n")[0].slice(0, 50)}`
        ),
      ];
      transitionMain(lines.join("\n"));
      const filterStr = Object.keys(currentFilter).length > 0
        ? ` | filter: ${Object.entries(currentFilter).map(([k, v]) => `${k}=${v}`).join(", ")}`
        : "";
      statusBar.setContent(`${results.length} results | ${currentSort.field} ${currentSort.direction}`);
      flashStatusBar();
    }, () => {
      statusBar.setContent(" error rendering results ");
      flashStatusBar();
    });
  }

  function refreshEntries() {
    withErrorHandling(() => {
      entries = loadEntries(store);
      if (entries.length > 0) {
        showRecentMemories();
      }
    }, () => {
      statusBar.setContent(" error loading entries (Ctrl+R to retry) ");
      flashStatusBar();
    });
  }

  function showRecentMemories() {
    withErrorHandling(() => {
      const recent = getTimeline(store, 20);
      if (recent.length === 0) {
        transitionMain("No memories yet. Create your first memory with Ctrl+N.");
        statusBar.setContent("empty");
        flashStatusBar();
        screen.render();
        return;
      }

      const lines: string[] = [];
      const t = tag(theme);
      for (const e of recent) {
        const title = e.content.split("\n")[0].slice(0, 80);
        const date = new Date(e.createdAt).toLocaleDateString();
        if (viewMode === "compact") {
          lines.push(`[${e.source.padEnd(9)}] ${title} | ${date}`);
        } else {
          lines.push(`[${e.source}] ${title}`);
          lines.push(`  project: ${e.project || "(none)"} | topics: ${e.topics.join(", ") || "(none)"} | tags: ${e.tags.join(", ") || "(none)"}`);
          lines.push(`  ${e.createdAt}`);
          lines.push("");
        }
      }

      transitionMain([t.heading("RECENT MEMORIES"), "", ...lines].join("\n"));
      statusBar.setContent(`${recent.length} memories`);
      flashStatusBar();
    }, () => {
      notify("error loading memories");
    });
  }

  function handleNewMemory() {
    formOpen = true;
    updateContextHint("modal");
    showCreateMemoryForm({
      screen,
      store,
      theme: createTheme(config),
      onSaved: () => refreshEntries(),
      notify,
      onFormClose: () => {
        formOpen = false;
        updateContextHint("idle");
      },
      contextEntry: selectedEntry ?? undefined,
    });
  }

  function handleSearch() {
    if (formOpen) return;
    updateContextHint("modal");
    const prompt = withErrorHandling(() => {
      return require("blessed").prompt({
        parent: screen,
        top: "center",
        left: "center",
        width: "50%",
        height: "shrink",
        border: BORDER,
        label: " search ",
        style: { fg: FG, bg: BG_PANEL, focus: { border: FOCUS_BORDER } },
        keys: true,
        mouse: true,
      });
    }, () => null) as any;

    if (!prompt) return;

    flashModal(prompt);
    (prompt as any).input("query", (err: Error | null, value: string) => {
      withErrorHandling(() => {
        prompt.destroy();
        updateContextHint("idle");
        if (value) {
          saveSessionState(store, { lastQuery: value });
          const results = searchEntries(store, value);
          if (results.length > 0) {
            showEntry(results[0]);
            statusBar.setContent(` search: ${value} (${results.length} results) `);
          } else {
            notify(`no results: ${value.slice(0, 20)}`);
          }
          screen.render();
        }
      }, () => {
        prompt.destroy();
        updateContextHint("idle");
        screen.render();
      });
    });

    screen.render();
  }

  function fuzzyScore(query: string, text: string): number {
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (!q) return 1;

    let qi = 0;
    let score = 0;
    let lastIdx = -1;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        score += 100 - Math.max(0, ti - lastIdx - 1);
        lastIdx = ti;
        qi++;
      }
    }
    return qi === q.length ? score : -1;
  }

  function getRecommendedCommands(): Array<{ cmd: string; desc: string }> {
    const scored = new Map<string, { cmd: string; desc: string; score: number }>();
    const commandCounts = config.usageStats?.commandCounts || {};

    const add = (cmd: string, desc: string, score: number) => {
      const existing = scored.get(cmd);
      if (existing) {
        existing.score = Math.max(existing.score, score);
      } else {
        scored.set(cmd, { cmd, desc, score });
      }
    };

    for (const item of [
      { cmd: "/tutorial", desc: "list tutorials" },
      { cmd: "/tutorial <id>", desc: "run tutorial" },
      { cmd: "/help", desc: "show help" },
      { cmd: "/mcp", desc: "start MCP server" },
      { cmd: "/stats", desc: "show statistics" },
      { cmd: "/timeline", desc: "show recent memories" },
      { cmd: "/view", desc: "toggle view mode" },
      { cmd: "/view compact", desc: "compact list view" },
      { cmd: "/view expanded", desc: "expanded list view" },
      { cmd: "/context <query>", desc: "preview context for query" },
      { cmd: "/clear", desc: "clear screen" },
      { cmd: "/search <query>", desc: "search memories" },
      { cmd: "/new", desc: "create new memory" },
      { cmd: "/recover", desc: "restore unsaved draft" },
      { cmd: "/quit", desc: "quit" },
    ]) {
      const baseCmd = item.cmd.split(" ")[0];
      add(item.cmd, item.desc, (commandCounts[baseCmd] || 0) * 2);
    }

    for (let i = recentCommands.length - 1; i >= 0; i--) {
      const cmd = recentCommands[i];
      const existing = scored.get(cmd);
      if (existing) {
        existing.score += (5 - i) * 1.5;
      }
    }

    if (selectedEntry) {
      const entry = selectedEntry;
      if (entry.project) {
        add(`/filter project:${entry.project}`, `filter by project: ${entry.project}`, 18);
        add(`/search ${entry.project}`, `search project: ${entry.project}`, 15);
      }
      for (const topic of entry.topics) {
        add(`/filter topic:${topic}`, `filter by topic: ${topic}`, 17);
        add(`/search ${topic}`, `search topic: ${topic}`, 14);
      }
      const contextQuery = entry.project || entry.topics[0] || entry.content.split("\n")[0].slice(0, 30);
      add(`/context ${contextQuery}`, `preview context for current entry`, 20);

      const nextSource =
        entry.source === "inbox"
          ? "project"
          : entry.source === "project"
            ? "lesson"
            : entry.source === "topic"
              ? "reference"
              : "lesson";
      add(`/new ${nextSource}`, `create ${nextSource} from ${entry.source}`, 12);

      if (entry.source === "inbox") {
        add("/new topic", "create topic from inbox", 11);
      } else if (entry.source === "project") {
        add("/new topic", "create topic from project", 11);
      } else if (entry.source === "topic") {
        add("/new project", "create project from topic", 11);
      }
    } else {
      add("/timeline", "show recent memories", 10);
      add("/stats", "show statistics", 8);
      add("/new", "create new memory", 9);
    }

    if (Object.keys(currentFilter).length > 0) {
      add("/clearfilters", "clear active filters", 19);
    }

    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((s) => ({ cmd: s.cmd, desc: s.desc }));
  }

  function showCommandPalette() {
    const commandList = [
      { cmd: "/tutorial", desc: "list tutorials" },
      { cmd: "/tutorial <id>", desc: "run tutorial" },
      { cmd: "/help", desc: "show help" },
      { cmd: "/mcp", desc: "start MCP server" },
      { cmd: "/stats", desc: "show statistics" },
      { cmd: "/timeline", desc: "show recent memories" },
      { cmd: "/view", desc: "toggle view mode" },
      { cmd: "/view compact", desc: "compact list view" },
      { cmd: "/view expanded", desc: "expanded list view" },
      { cmd: "/context <query>", desc: "preview context for query" },
      { cmd: "/clear", desc: "clear screen" },
      { cmd: "/search <query>", desc: "search memories" },
      { cmd: "/link <id>", desc: "link selected entry to another" },
      { cmd: "/related", desc: "show related entries" },
      { cmd: "/graph", desc: "show relationship graph" },
      { cmd: "/new", desc: "create new memory" },
      { cmd: "/recover", desc: "restore unsaved draft" },
      { cmd: "/quit", desc: "quit" },
    ];

    const tutorialList = getAllTutorials().map((t) => ({
      cmd: `/tutorial ${t.id}`,
      desc: t.name,
    }));

    const allItems = [...commandList, ...tutorialList];

    const palette = withErrorHandling(() => {
      return require("blessed").box({
        parent: screen,
        top: "20%",
        left: "center",
        width: "50%",
        height: "50%",
        border: BORDER,
        style: { fg: FG, bg: BG_PANEL },
        mouse: true,
        keys: false,
      });
    }, () => null) as any;

    if (!palette) return;

    const input = withErrorHandling(() => {
      return require("blessed").textbox({
        parent: palette,
        label: " command ",
        top: 0,
        left: 0,
        width: "100%",
        height: 3,
        border: BORDER,
        style: { fg: FG, bg: BG, focus: { border: FOCUS_BORDER } },
        keys: true,
        mouse: true,
      });
    }, () => null) as any;

    const list = withErrorHandling(() => {
      return require("blessed").list({
        parent: palette,
        top: 3,
        left: 0,
        width: "100%",
        height: "100%-3",
        border: theme.border,
        style: {
          fg: theme.fg,
          bg: theme.bgPanel,
          selected: theme.selected,
          focus: { border: theme.focusBorder },
        },
        items: allItems.map((i) => `${i.cmd.padEnd(24)} ${i.desc}`),
        keys: true,
        vi: true,
        mouse: true,
        interactive: false,
      });
    }, () => null) as any;

    if (!input || !list) return;

    paletteOpen = true;
    let currentItems = getRecommendedCommands();

    function updateSuggestions(query: string) {
      const q = query.trim();
      if (q) {
        const scored = allItems
          .map((item) => {
            const searchText = `${item.cmd} ${item.desc}`;
            const score = fuzzyScore(q, searchText);
            return { item, score };
          })
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score);
        currentItems = scored.map((s) => s.item);
      } else {
        currentItems = getRecommendedCommands();
      }
      (list as any).setItems(currentItems.map((i) => `${i.cmd.padEnd(24)} ${i.desc}`));
      (list as any).select(0);
      screen.render();
    }

    (input as any).on("keypress", (_ch: unknown, key: any) => {
      if (key.name === "escape") {
        paletteOpen = false;
        input.destroy();
        palette.destroy();
        updateContextHint("idle");
        statusBar.setContent(" ready ");
        screen.render();
      } else if (key.name === "up") {
        const current = (list as any).selected || 0;
        (list as any).select(Math.max(0, current - 1));
        screen.render();
      } else if (key.name === "down") {
        const current = (list as any).selected || 0;
        const max = ((list as any).items || []).length - 1;
        (list as any).select(Math.min(max, current + 1));
        screen.render();
      }
    });

    (input as any).on("submit", () => {
      const value = (input as any).value || "";
      paletteOpen = false;
      input.destroy();
      palette.destroy();
      updateContextHint("idle");
      const selectedIdx = (list as any).selected || 0;
      const selected = currentItems[selectedIdx];
      if (selected) {
        handleCommand(selected.cmd);
      } else if (value.trim()) {
        handleCommand(value.trim());
      } else {
        statusBar.setContent(" ready ");
        screen.render();
      }
    });

    (input as any).on("change", () => {
      updateSuggestions((input as any).value || "");
    });

    screen.append(palette);
    flashModal(palette);
    (input as any).value = "/";
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
      notify("starting MCP...", 3000);
      screen.render();
      import("../mcp-server").then(({ createMCPServer }) => {
        const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
        createMCPServer(port);
        statusBar.setContent(`MCP: :${port}`);
        screen.render();
      }).catch((err) => {
        notify("MCP: error", 4000);
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
      const t = tag(theme);
      const lines = [
        t.heading("STATISTICS"),
        "",
        `${t.label("total:")}    ${stats.total}`,
        "",
        t.heading("SOURCES"),
        ...Object.entries(stats.sources).map(([k, v]) => `${t.label(`${k}:`)} ${v}`),
        "",
        t.heading("PROJECTS"),
        ...Object.entries(stats.projects).map(([k, v]) => `${t.label(`${k}:`)} ${v}`),
      ];
      transitionMain(lines.join("\n"));
      statusBar.setContent("stats");
      flashStatusBar();
      screen.render();
    } else if (trimmed === "/timeline" || trimmed === "timeline") {
      const recent = getTimeline(store, 20);
      const t = tag(theme);
      const lines = [
        t.heading("TIMELINE"),
        "",
        ...recent.map((r) => `${r.createdAt} | ${r.source} | ${r.content.split("\n")[0].slice(0, 60)}`),
      ];
      transitionMain(lines.join("\n") || "(empty)");
      statusBar.setContent("timeline");
      flashStatusBar();
      screen.render();
    } else if (trimmed === "/clear" || trimmed === "clear") {
      transitionMain("");
      notify("cleared");
    } else if (trimmed === "/new" || trimmed === "new") {
      handleNewMemory();
    } else if (trimmed.startsWith("/search ") || trimmed.startsWith("search ")) {
      const query = trimmed.split(" ").slice(1).join(" ");
      if (query) {
        saveSessionState(store, { lastQuery: query });
        const results = searchEntries(store, query);
        if (results.length > 0) {
          showEntry(results[0]);
          statusBar.setContent(` search: ${query} (${results.length} results) `);
          flashStatusBar();
        } else {
          notify(`no results: ${query.slice(0, 20)}`);
        }
      }
    } else if (trimmed.startsWith("/filter ") || trimmed.startsWith("filter ")) {
      const args = trimmed.split(" ").slice(1).join(" ");
      const colonIdx = args.indexOf(":");
      if (colonIdx > 0) {
        const field = args.slice(0, colonIdx).trim();
        const value = args.slice(colonIdx + 1).trim();
        if (field && value) {
          currentFilter[field] = value;
          statusBar.setContent(` filter: ${field}=${value} `);
          screen.render();
        }
      }
    } else if (trimmed.startsWith("/sort ") || trimmed.startsWith("sort ")) {
      const field = trimmed.split(" ").slice(1).join(" ").trim();
      const validFields = ["created", "updated", "importance", "confidence", "access", "relevance"];
      if (validFields.includes(field)) {
        if (currentSort.field === field) {
          currentSort.direction = currentSort.direction === "desc" ? "asc" : "desc";
        } else {
          currentSort = { field, direction: "desc" };
        }
        statusBar.setContent(` sort: ${currentSort.field} ${currentSort.direction} `);
        screen.render();
      }
    } else if (trimmed === "/clearfilters" || trimmed === "clearfilters") {
      currentFilter = {};
      currentSort = { field: "relevance", direction: "desc" };
      statusBar.setContent(" filters cleared ");
      screen.render();
    } else if (trimmed === "/telemetry" || trimmed === "telemetry") {
      config.enableUsageStats = !config.enableUsageStats;
      if (config.enableUsageStats && !config.usageStats) {
        config.usageStats = { sessionCount: 0, lastUsedAt: null, commandCounts: {} };
      }
      saveConfig(config);
      notify(`usage stats ${config.enableUsageStats ? "enabled" : "disabled"} — local only`, 3000);
    } else if (trimmed === "/recover" || trimmed === "recover") {
      if (restoreDraft()) {
        notify("draft restored");
      } else {
        notify("no draft to recover", 4000);
      }
    } else if (trimmed === "/quit" || trimmed === "/q" || trimmed === "quit") {
      clearDraft();
      screen.destroy();
      process.exit(0);
    } else if (trimmed === "/plugins" || trimmed === "plugins") {
      showPluginList();
    } else if (trimmed.startsWith("/plugins toggle ") || trimmed.startsWith("plugins toggle ")) {
      const id = trimmed.split(/\s+/).slice(2).join(" ");
      if (id) handlePluginToggle(id);
    } else if (trimmed.startsWith("/")) {
      notify(`unknown: ${trimmed.slice(0, 20)}`, 4000);
      screen.render();
    }
  }

  function showTutorialList() {
    const tutorials = getAllTutorials();
    const t = tag(theme);
    const items = tutorials.map((tut) => `${tut.id}: ${tut.name}\n    ${tut.description}`);
    main.setContent([t.heading("Available tutorials:"), "", ...items, "", "Usage: /tutorial <id>"].join("\n"));
    statusBar.setContent("tutorials");
    screen.render();
  }

  function showPluginList(filterQuery?: string) {
    const plugins = (registry.list() ?? []).filter((p) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
    const t = tag(theme);
    const lines = [
      t.heading("PLUGINS"),
      "",
      ...plugins.map((p) => {
        const status = p.enabled ? "[ON ]" : "[OFF]";
        return `${status}  ${p.id.padEnd(18)} ${p.name}${p.description ? `  — ${p.description}` : ""}`;
      }),
      ...(registry.list().length > 0 ? ["", "Usage: /plugins toggle <id>", "       /plugins <filter>"] : ["", "(no plugin manager configured)"]),
    ];
    main.setContent(lines.join("\n"));
    statusBar.setContent(`plugins: ${plugins.length}`);
    screen.render();
  }

  function handlePluginToggle(id: string) {
    if (!registry) {
      notify("no plugin manager", 3000);
      screen.render();
      return;
    }
    const ok = registry.toggle(id);
    notify(ok ? `toggled: ${id}` : `plugin not found: ${id}`, 3000);
    showPluginList();
    screen.render();
  }

  function showTutorial(id: string) {
    const tutorial = getTutorial(id);
    if (!tutorial) {
      notify(`tutorial not found: ${id}`, 4000);
      screen.render();
      return;
    }
    const t = tag(theme);
    const lines: string[] = [
      t.heading(`=== ${tutorial.name} ===`),
      "",
      tutorial.description,
      "",
    ];
    tutorial.steps.forEach((step, i) => {
      lines.push(t.heading(`Step ${i + 1}: ${step.title}`));
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
    statusBar.setContent(`tutorial: ${tutorial.name.slice(0, 25)}`);
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
      "/filter <field>:<val>  filter results (source, project, topic, tag, person)",
      "/sort <field>          sort results (created, updated, importance, confidence, access)",
      "/clearfilters          clear all filters and sort",
      "/link <id>             link selected entry to another",
      "/related               show related entries",
      "/graph                 show relationship graph",
      "/new                   create new memory",
      "/recover               restore unsaved draft",
      "/telemetry             toggle usage stats (local only)",
      "/quit                  quit",
      "",
      `ROOT: ${store.root}`,
    ].join("\n"));
    statusBar.setContent("help");
    screen.render();
  }

  function handleRefresh() {
    refreshEntries();
    notify("refreshed");
    screen.render();
  }

  function handleQuit() {
    if (selectedEntry) {
      saveSessionState(store, { lastEntryId: selectedEntry.id });
    }
    clearDraft();
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
      statusBar.setContent(" ready ");
      screen.render();
    }, () => {});
  });
  screen.key(["/"], () => {
    showCommandPalette();
  });
  screen.key(["?"], showHelp);

  screen.on("resize", () => {
    layoutPanels();
  });

  const globalErrorHandler = (err: Error) => {
    persistDraft();
    notify(`error: ${err.message.slice(0, 30)}`, 4000);
  };

  process.on("uncaughtException", globalErrorHandler);
  process.on("unhandledRejection", (err) => {
    globalErrorHandler(err instanceof Error ? err : new Error(String(err)));
  });

  inputBar.on("submit", () => {
    const value = (inputBar as any).value || "";
    clearDraft();
    if (value.startsWith("/")) {
      recordUsage(value.split(" ")[0]);
    }
    handleCommand(value);
  });

  inputBar.on("focus", () => updateContextHint("input"));
  inputBar.on("blur", () => {
    if (activeContext !== "modal" && activeContext !== "palette") {
      updateContextHint("idle");
    }
  });

  inputBar.on("keypress", (_ch: unknown, key: any) => {
    if (key.name === "escape") {
      persistDraft();
      (inputBar as any).clearValue();
      (inputBar as any).blur();
      screen.render();
    }
  });

  inputBar.on("keypress", (_ch: unknown, key: any) => {
    if (key.name !== "escape" && key.name !== "enter") {
      persistDraft();
    }
  });

  layoutPanels();
  refreshEntries();
  renderWelcome();

  checkRecovery();

  const session = loadSessionState(store);
  if (session?.lastEntryId) {
    const found = entries.find((e) => e.id === session.lastEntryId);
    if (found) {
      showEntry(found);
      notify("restored session");
    }
  } else if (session?.lastQuery) {
    const results = searchEntries(store, session.lastQuery);
    if (results.length > 0) {
      showEntry(results[0]);
      notify(`restored search: ${session.lastQuery.slice(0, 20)}`);
    }
  }

  if (!fs.existsSync(getConfigPath(store))) {
    showTelemetryPrompt();
  } else if (config.enableUsageStats) {
    recordUsage();
  }

  (async () => {
    const latest = await checkForUpdate("0.0.02");
    if (latest) {
      notify(`update: ${latest.slice(0, 20)}`);
    } else {
      statusBar.setContent(" ready ");
    }
    screen.render();
  })();
}
