import blessed from "blessed";
import {
  createStore,
  loadEntries,
  saveEntry,
  searchEntries,
  getMeta,
  getTimeline,
  getRelated,
  exportForContext,
  updateEntry,
} from "../memory/store";
import { MemoryEntry } from "../memory/types";

const store = createStore();

function shortId(id: string): string {
  return id.slice(0, 8);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function groupEntries(entries: MemoryEntry[]): Map<string, MemoryEntry[]> {
  const grouped = new Map<string, MemoryEntry[]>();
  for (const entry of entries) {
    const key =
      entry.source === "inbox"
        ? `inbox/${entry.path.split("/").slice(-3, -1).join("/")}`
        : entry.source === "project"
          ? `projects/${entry.project || "unknown"}`
          : entry.source === "topic"
            ? `topics/${entry.topics[0] || "general"}`
            : entry.source === "lesson"
              ? "lessons"
              : "references";
    const list = grouped.get(key) || [];
    list.push(entry);
    grouped.set(key, list);
  }
  return grouped;
}

export function launchTUI() {
  const screen = blessed.screen({
    smartCSR: true,
    title: "sonderr-memory",
    fullUnicode: true,
  });

  const topBar = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    style: { fg: "#000000", bg: "#FF6A00", bold: true },
    content: " sonderr-memory | Ctrl+N new | Ctrl+S search | Ctrl+X context | Ctrl+Q quit | ? help ",
  } as any);

  const sidebar = blessed.list({
    parent: screen,
    label: " memory ",
    top: 1,
    left: 0,
    width: "30%",
    height: "60%",
    border: { type: "line", fg: "#FF6A00" },
    style: {
      fg: "#e6e6e6",
      bg: "#1a1a1a",
      selected: { bg: "#FF6A00", fg: "#000000" },
      focus: { border: { fg: "#FF6A00" } },
    },
    keys: true,
    vi: true,
    mouse: true,
  } as any);

  const main = blessed.box({
    parent: screen,
    label: " content ",
    top: 1,
    left: "30%",
    width: "70%",
    height: "60%",
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
  } as any);

  const rightPanel = blessed.box({
    parent: screen,
    label: " metadata ",
    top: 1,
    left: "70%",
    width: "30%",
    height: "60%",
    border: { type: "line", fg: "#FF6A00" },
    style: {
      fg: "#e6e6e6",
      bg: "#1a1a1a",
      focus: { border: { fg: "#FF6A00" } },
    },
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
  } as any);

  const timeline = blessed.list({
    parent: screen,
    label: " timeline ",
    top: "60%",
    left: 0,
    width: "100%",
    height: "20%",
    border: { type: "line", fg: "#FF6A00" },
    style: {
      fg: "#e6e6e6",
      bg: "#1a1a1a",
      selected: { bg: "#FF6A00", fg: "#000000" },
      focus: { border: { fg: "#FF6A00" } },
    },
    keys: true,
    vi: true,
    mouse: true,
  } as any);

  const statusBar = blessed.box({
    parent: screen,
    top: "100%-1",
    left: 0,
    width: "100%",
    height: 1,
    style: { fg: "#000000", bg: "#FF6A00", bold: true },
    content: " ready ",
  } as any);

  let entries: MemoryEntry[] = [];
  let selectedEntry: MemoryEntry | null = null;
  let timelineEntries: MemoryEntry[] = [];

  function renderRightPanel(entry: MemoryEntry | null) {
    if (!entry) {
      rightPanel.setContent("Select an entry to view metadata.");
      return;
    }
    const related = getRelated(store, entry, 5);
    const lines = [
      `ID:        ${entry.id}`,
      `Short ID:  ${shortId(entry.id)}`,
      `Created:   ${entry.createdAt}`,
      `Updated:   ${entry.updatedAt}`,
      `Age:       ${timeAgo(entry.createdAt)}`,
      `Source:    ${entry.source}`,
      `Project:   ${entry.project || "(none)"}`,
      `Topics:    ${entry.topics.join(", ") || "(none)"}`,
      `People:    ${entry.people.join(", ") || "(none)"}`,
      `Tags:      ${entry.tags.join(", ") || "(none)"}`,
      `Linked:    ${entry.linkedIds.length > 0 ? entry.linkedIds.map(shortId).join(", ") : "(none)"}`,
      `Path:      ${entry.path}`,
      "",
      "RELATED:",
      ...related.map((r) => `  ${shortId(r.id)} ${r.source} ${(r.project || r.topics[0] || "").slice(0, 20)}`),
    ];
    rightPanel.setContent(lines.join("\n"));
  }

  function refreshSidebar(filter?: string) {
    entries = filter ? searchEntries(store, filter) : loadEntries(store);
    const grouped = groupEntries(entries);
    const items: string[] = [];
    for (const [group, groupEntries] of grouped) {
      items.push(`[${group}] (${groupEntries.length})`);
      for (const entry of groupEntries.slice(0, 20)) {
        const title = entry.content.split("\n")[0].slice(0, 50);
        items.push(`  ${shortId(entry.id)} - ${title}`);
      }
    }
    sidebar.setItems(items.length ? items : ["(empty)"]);
    sidebar.select(0);
    screen.render();
  }

  function refreshTimeline() {
    timelineEntries = getTimeline(store, 40);
    const items = timelineEntries.map((entry) => {
      const title = entry.content.split("\n")[0].slice(0, 60);
      return `${timeAgo(entry.createdAt)} | ${entry.source} | ${title}`;
    });
    timeline.setItems(items.length ? items : ["(empty)"]);
    timeline.select(0);
    screen.render();
  }

  function showEntry(entry: MemoryEntry) {
    selectedEntry = entry;
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
    renderRightPanel(entry);
    statusBar.setContent(` loaded: ${entry.path} `);
    screen.render();
  }

  function createNew() {
    const form = blessed.form({
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
    } as any);

    const category = blessed.list({
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

    const projectInput = blessed.textbox({
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

    const topicsInput = blessed.textbox({
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

    const nameInput = blessed.textbox({
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

    const contentInput = blessed.textarea({
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

    const saveBtn = blessed.button({
      parent: form,
      label: " save ",
      top: "88%",
      left: "center",
      width: 12,
      height: 3,
      style: { bg: "#FF6A00", fg: "#000000", bold: true, focus: { bg: "#ff8533" } },
    } as any);

    const cancelBtn = blessed.button({
      parent: form,
      label: " cancel ",
      top: "88%",
      left: "center+14",
      width: 12,
      height: 3,
      style: { bg: "#333333", fg: "#e6e6e6", focus: { bg: "#444444" } },
    } as any);

    saveBtn.on("press", () => {
      const selectedIdx = (category as any).selected ?? 0;
      const cat = ((category as any).items ?? [])[selectedIdx] as MemoryEntry["source"];
      const topics = (topicsInput as any).value
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      saveEntry(store, cat, (nameInput as any).value || "untitled", (contentInput as any).value || "", {
        project: (projectInput as any).value || undefined,
        topics,
      });
      form.destroy();
      refreshSidebar();
      refreshTimeline();
      statusBar.setContent(" saved ");
      screen.render();
    });

    cancelBtn.on("press", () => {
      form.destroy();
      screen.render();
    });

    screen.append(form);
    (projectInput as any).focus();
    screen.render();
  }

  function editLabels() {
    if (!selectedEntry) {
      statusBar.setContent(" no entry selected ");
      screen.render();
      return;
    }

    const form = blessed.form({
      parent: screen,
      top: "center",
      left: "center",
      width: "60%",
      height: "50%",
      label: " edit labels ",
      border: { type: "line", fg: "#FF6A00" },
      style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
      keys: true,
      mouse: true,
    } as any);

    const projectInput = blessed.textbox({
      parent: form,
      label: " project ",
      top: 1,
      left: 1,
      width: "90%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      value: selectedEntry.project || "",
      keys: true,
      mouse: true,
    } as any);

    const topicsInput = blessed.textbox({
      parent: form,
      label: " topics ",
      top: 5,
      left: 1,
      width: "90%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      value: selectedEntry.topics.join(", "),
      keys: true,
      mouse: true,
    } as any);

    const tagsInput = blessed.textbox({
      parent: form,
      label: " tags ",
      top: 9,
      left: 1,
      width: "90%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      value: selectedEntry.tags.join(", "),
      keys: true,
      mouse: true,
    } as any);

    const saveBtn = blessed.button({
      parent: form,
      label: " save ",
      top: "80%",
      left: "center",
      width: 12,
      height: 3,
      style: { bg: "#FF6A00", fg: "#000000", bold: true, focus: { bg: "#ff8533" } },
    } as any);

    const cancelBtn = blessed.button({
      parent: form,
      label: " cancel ",
      top: "80%",
      left: "center+14",
      width: 12,
      height: 3,
      style: { bg: "#333333", fg: "#e6e6e6", focus: { bg: "#444444" } },
    } as any);

    saveBtn.on("press", () => {
      const updated = updateEntry(store, selectedEntry!, {
        project: (projectInput as any).value || undefined,
        topics: ((topicsInput as any).value || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        tags: ((tagsInput as any).value || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      });
      selectedEntry = updated;
      form.destroy();
      refreshSidebar();
      refreshTimeline();
      showEntry(updated);
      statusBar.setContent(" labels updated ");
      screen.render();
    });

    cancelBtn.on("press", () => {
      form.destroy();
      screen.render();
    });

    screen.append(form);
    (projectInput as any).focus();
    screen.render();
  }

  function searchPrompt() {
    const prompt = blessed.prompt({
      parent: screen,
      top: "center",
      left: "center",
      width: "60%",
      height: "shrink",
      border: { type: "line", fg: "#FF6A00" },
      label: " search ",
      style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
      keys: true,
      mouse: true,
    } as any);

    (prompt as any).input("query", (err: Error | null, value: string) => {
      prompt.destroy();
      if (value) {
        refreshSidebar(value);
        statusBar.setContent(` search: ${value} `);
        screen.render();
      }
    });

    screen.render();
  }

  function showContext() {
    if (!selectedEntry) {
      statusBar.setContent(" no entry selected ");
      screen.render();
      return;
    }
    const query = selectedEntry.content.split("\n")[0];
    const ctx = exportForContext(store, query, 1500);
    main.setContent(`--- context preview ---\n\n${ctx}`);
    statusBar.setContent(" context preview ");
    screen.render();
  }

  function showHelp() {
    main.setContent(
      [
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
        "Right      metadata / related",
        "Bottom     timeline",
        "",
        `ROOT: ${store.root}`,
      ].join("\n")
    );
    screen.render();
  }

  sidebar.on("select", (_el: unknown, idx: number) => {
    const visible = entries.slice(0, 200);
    const item = visible[idx];
    if (item) showEntry(item);
  });

  timeline.on("select", (_el: unknown, idx: number) => {
    const item = timelineEntries[idx];
    if (item) showEntry(item);
  });

  screen.key(["c-n"], () => createNew());
  screen.key(["c-s"], () => searchPrompt());
  screen.key(["c-l"], () => editLabels());
  screen.key(["c-x"], () => showContext());
  screen.key(["c-r"], () => {
    refreshSidebar();
    refreshTimeline();
    statusBar.setContent(" refreshed ");
    screen.render();
  });
  screen.key(["c-q", "C-c"], () => {
    screen.destroy();
    process.exit(0);
  });
  screen.key(["tab"], () => {
    if (screen.focused === main) (rightPanel as any).focus();
    else if (screen.focused === rightPanel) sidebar.focus();
    else if (screen.focused === timeline) main.focus();
    else main.focus();
    screen.render();
  });
  screen.key(["?"], () => showHelp());

  refreshSidebar();
  refreshTimeline();
  renderRightPanel(null);
  screen.render();
}
