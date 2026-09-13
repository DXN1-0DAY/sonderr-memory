import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { TUIError, safeAsync, withErrorHandling } from "../../errors/tui-errors";

export type SidebarOptions = {
  parent: any;
  width: string;
  height: string;
  onSelect: (entry: MemoryEntry) => void;
};

export function createSidebar(opts: SidebarOptions) {
  const list = blessed.list({
    parent: opts.parent,
    label: " memory ",
    top: 0,
    left: 0,
    width: opts.width,
    height: opts.height,
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

  list.on("select", (_el: unknown, idx: number) => {
    const items = (list as any).items || [];
    const entry = items[idx];
    if (entry && typeof entry === "object" && "id" in entry) {
      opts.onSelect(entry as MemoryEntry);
    }
  });

  return list;
}

export function renderSidebarItems(
  list: any,
  entries: MemoryEntry[],
  getGroup: (entry: MemoryEntry) => string
) {
  const grouped = new Map<string, MemoryEntry[]>();
  for (const entry of entries) {
    const key = getGroup(entry);
    const arr = grouped.get(key) || [];
    arr.push(entry);
    grouped.set(key, arr);
  }

  const items: string[] = [];
  for (const [group, groupEntries] of grouped) {
    items.push(`[${group}] (${groupEntries.length})`);
    for (const entry of groupEntries.slice(0, 20)) {
      const title = entry.content.split("\n")[0].slice(0, 50);
      items.push(`  ${entry.id.slice(0, 8)} - ${title}`);
    }
  }

  safeAsync(() => {
    list.setItems(items.length ? items : ["(empty)"]);
    list.select(0);
  }, undefined);
}
