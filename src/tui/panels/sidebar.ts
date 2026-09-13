import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { safeTry } from "../../errors/tui-errors";
import { truncate } from "../../utils/array";
import { formatRelativeTime } from "../format";
import { Theme, createTheme } from "../theme";

export type SidebarOptions = {
  parent: any;
  width: string;
  height: string;
  top?: number | string;
  left?: number | string;
  onSelect: (entry: MemoryEntry) => void;
  theme?: Theme;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
};

function isPinned(entry: MemoryEntry): boolean {
  return entry.importance >= 0.8;
}

function formatSidebarEntry(entry: MemoryEntry): string {
  const pinned = isPinned(entry) ? "[★] " : "    ";
  const id = entry.id.slice(0, 8);
  const source = entry.source.padEnd(9);
  const title = truncate(entry.content.split("\n")[0].trim(), 32);
  const time = formatRelativeTime(entry.updatedAt);
  return `${pinned}${id} | ${source} | ${title} | ${time}`;
}

export function createSidebar(opts: SidebarOptions) {
  const theme = opts.theme || createTheme({ theme: { bg: "#0d0d0d", fg: "#e6e6e6", accent: "#FF6A00" } });
  const list = blessed.list({
    parent: opts.parent,
    label: " memories ",
    top: opts.top ?? 0,
    left: opts.left ?? 0,
    width: opts.width,
    height: opts.height,
    border: theme.border,
    padding: opts.padding,
    style: {
      fg: theme.fg,
      bg: theme.bgPanel,
      selected: theme.selected,
      focus: { border: theme.focusBorder },
    },
    keys: true,
    vi: true,
    mouse: true,
    alwaysScroll: true,
    scrollbar: { style: { fg: theme.accent } },
  } as any);

  list.on("select", (_el: unknown, idx: number) => {
    if (list.style && list.style.border) {
      const originalFg = (list.style.border as any).fg;
      (list.style.border as any).fg = theme.accentLight;
      setTimeout(() => {
        (list.style.border as any).fg = originalFg;
        if (list.screen) list.screen.render();
      }, 80);
    }
    const entry = (list as any)._entryMap?.get(idx);
    if (entry) {
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
  const entryMap = new Map<number, MemoryEntry>();
  let idx = 0;
  for (const [group, groupEntries] of grouped) {
    items.push(`── ${group} (${groupEntries.length}) ──`);
    for (const entry of groupEntries.slice(0, 20)) {
      entryMap.set(idx, entry);
      items.push(`  ${formatSidebarEntry(entry)}`);
      idx++;
    }
  }

  safeTry(() => {
    list.setItems(items.length ? items : ["(empty)"]);
    list.select(0);
    list._entryMap = entryMap;
  }, undefined);
}
