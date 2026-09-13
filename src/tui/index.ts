import blessed from "blessed";
import { createStore, loadEntries, saveEntry, searchEntries } from "../memory/store";
import { MemoryEntry } from "../memory/types";

const store = createStore();

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
    style: {
      fg: "#000000",
      bg: "#FF6A00",
      bold: true,
    },
    content: " sonderr-memory  |  Ctrl+N: new  |  Ctrl+S: search  |  Ctrl+Q: quit  |  Ctrl+R: refresh  |  ?: help ",
  });

  const sidebar = blessed.list({
    parent: screen,
    label: " memory ",
    top: 1,
    left: 0,
    width: "30%",
    height: "80%",
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
  });

  const main = blessed.box({
    parent: screen,
    label: " content ",
    top: 1,
    left: "30%",
    width: "70%",
    height: "80%",
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

  const statusBar = blessed.box({
    parent: screen,
    top: "100%-1",
    left: 0,
    width: "100%",
    height: 1,
    style: {
      fg: "#000000",
      bg: "#FF6A00",
      bold: true,
    },
    content: " ready ",
  });

  let entries: MemoryEntry[] = [];

  function refreshSidebar(filter?: string) {
    entries = filter ? searchEntries(store, filter) : loadEntries(store);
    const grouped: Record<string, MemoryEntry[]> = {};
    for (const entry of entries) {
      const key = entry.source === "inbox"
        ? `inbox/${entry.path.split("/").slice(-3, -1).join("/")}`
        : entry.source === "project"
          ? `projects/${entry.project || "unknown"}`
          : entry.source === "topic"
            ? `topics/${entry.topics[0] || "general"}`
            : entry.source === "lesson"
              ? "lessons"
              : "references";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    }

    const items: string[] = [];
    for (const [group, groupEntries] of Object.entries(grouped)) {
      items.push(`[${group}] (${groupEntries.length})`);
      for (const entry of groupEntries.slice(0, 20)) {
        const title = entry.content.split("\n")[0].slice(0, 50);
        items.push(`  ${entry.id.slice(0, 8)} - ${title}`);
      }
    }

    sidebar.setItems(items.length ? items : ["(empty)"]);
    sidebar.select(0);
    screen.render();
  }

  function showEntry(entry: MemoryEntry) {
    const text = [
      `ID:       ${entry.id}`,
      `Created:  ${entry.createdAt}`,
      `Updated:  ${entry.updatedAt}`,
      `Source:   ${entry.source}`,
      `Project:  ${entry.project || "(none)"}`,
      `Topics:   ${entry.topics.join(", ") || "(none)"}`,
      `People:   ${entry.people.join(", ") || "(none)"}`,
      `Tags:     ${entry.tags.join(", ") || "(none)"}`,
      `Path:     ${entry.path}`,
      "",
      "--- content ---",
      "",
      entry.content,
    ].join("\n");
    main.setContent(text);
    statusBar.setContent(` loaded: ${entry.path} `);
    screen.render();
  }

  function createNew() {
    const form = blessed.form({
      parent: screen,
      top: "center",
      left: "center",
      width: "60%",
      height: "50%",
      label: " new memory ",
      border: { type: "line", fg: "#FF6A00" },
      style: {
        fg: "#e6e6e6",
        bg: "#1a1a1a",
        focus: { border: { fg: "#FF6A00" } },
      },
      keys: true,
      mouse: true,
    });

    const category = blessed.list({
      parent: form,
      label: " category ",
      top: 1,
      left: 1,
      width: "50%",
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
      width: "50%",
      height: 3,
      border: { type: "line" },
      style: { fg: "#e6e6e6", bg: "#0d0d0d" },
      keys: true,
      mouse: true,
    });

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
    });

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
    });

    const saveBtn = blessed.button({
      parent: form,
      label: " save ",
      top: "80%",
      left: "center",
      width: 12,
      height: 3,
      style: {
        bg: "#FF6A00",
        fg: "#000000",
        bold: true,
        focus: { bg: "#ff8533" },
      },
    });

    const cancelBtn = blessed.button({
      parent: form,
      label: " cancel ",
      top: "80%",
      left: "center+14",
      width: 12,
      height: 3,
      style: {
        bg: "#333333",
        fg: "#e6e6e6",
        focus: { bg: "#444444" },
      },
    });

    saveBtn.on("press", () => {
      const selectedIdx = (category as any).selected ?? 0;
      const cat = ((category as any).items ?? [])[selectedIdx] as MemoryEntry["source"];
      saveEntry(store, cat, nameInput.value || "untitled", contentInput.value || "", {
        project: projectInput.value || undefined,
        topics: [],
        people: [],
        tags: [],
      });
      form.destroy();
      refreshSidebar();
      statusBar.setContent(" saved ");
      screen.render();
    });

    cancelBtn.on("press", () => {
      form.destroy();
      screen.render();
    });

    screen.append(form);
    (category as any).focus();
    screen.render();
  }

  function searchPrompt() {
    const prompt = blessed.prompt({
      parent: screen,
      top: "center",
      left: "center",
      width: "50%",
      height: "shrink",
      border: { type: "line", fg: "#FF6A00" },
      label: " search ",
      style: {
        fg: "#e6e6e6",
        bg: "#1a1a1a",
        focus: { border: { fg: "#FF6A00" } },
      },
      keys: true,
      mouse: true,
    });

    prompt.input("query", (err: Error | null, value: string) => {
      prompt.destroy();
      if (value) {
        refreshSidebar(value);
        statusBar.setContent(` search: ${value} `);
        screen.render();
      }
    });

    screen.render();
  }

  sidebar.on("select", (_el: unknown, idx: number) => {
    const visible = entries.slice(0, 200);
    const item = visible[idx];
    if (item) showEntry(item);
  });

  screen.key(["c-n"], () => createNew());
  screen.key(["c-s"], () => searchPrompt());
  screen.key(["c-r"], () => {
    refreshSidebar();
    statusBar.setContent(" refreshed ");
    screen.render();
  });
  screen.key(["c-q", "C-c"], () => {
    screen.destroy();
    process.exit(0);
  });
  screen.key(["?"], () => {
    main.setContent(
      [
        "KEYBINDS",
        "",
        "Ctrl+N   new memory",
        "Ctrl+S   search",
        "Ctrl+R   refresh",
        "Ctrl+Q   quit",
        "Up/Down  navigate sidebar",
        "Enter    view entry",
        "",
        "MEMORY ROOT",
        "",
        store.root,
      ].join("\n")
    );
    screen.render();
  });

  refreshSidebar();
  screen.render();
}
