import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { safeTry } from "../../errors/tui-errors";
import { truncate } from "../../utils/array";
import { formatRelativeTime } from "../format";
import { Theme, createTheme, DEFAULT_THEME_CONFIG } from "../theme";
import { tag } from "../format";

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

function formatSidebarEntry(entry: MemoryEntry, theme: Theme): string {
  const pinned = isPinned(entry) ? `{fg-${theme.accent}}[★]{/fg-${theme.accent}}` : "    ";
  const link = entry.linkedIds.length > 0 ? `{fg-${theme.muted}}↗{/fg-${theme.muted}}` : " ";
  const id = entry.id.slice(0, 8);
  const source = entry.source.padEnd(9);
  const title = truncate(entry.content.split("\n")[0].trim(), 18);
  const time = formatRelativeTime(entry.updatedAt);
  return `${pinned}${link} ${id} | ${source} | ${title} | {fg-${theme.muted}}${time}{/fg-${theme.muted}}`;
}

export function createSidebar(opts: SidebarOptions) {
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const list = blessed.list({
    parent: opts.parent,
    label: " memories ",
    top: opts.top ?? 0,
    left: opts.left ?? 0,
    width: opts.width,
    height: opts.height,
    border: theme.border,
    padding: opts.padding,
    tags: true,
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
  } as any) as any;

  let borderFlashTimer: NodeJS.Timeout | null = null;

  list._theme = theme;

  list.on("select", (_el: unknown, idx: number) => {
    if (list.style && list.style.border) {
      if (borderFlashTimer) clearTimeout(borderFlashTimer);
      const originalFg = (list.style.border as any).fg;
      (list.style.border as any).fg = theme.accentLight;
      borderFlashTimer = setTimeout(() => {
        (list.style.border as any).fg = originalFg;
        borderFlashTimer = null;
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
  getGroup: (entry: MemoryEntry) => string,
  theme?: Theme
) {
  const grouped = new Map<string, MemoryEntry[]>();
  for (const entry of entries) {
    const key = getGroup(entry);
    const arr = grouped.get(key) || [];
    arr.push(entry);
    grouped.set(key, arr);
  }

  const resolvedTheme = theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const t = tag(resolvedTheme);

  const items: string[] = [];
  const entryMap = new Map<number, MemoryEntry>();
  let visualIdx = 0;
  let firstEntryIdx = -1;
  const prevSelectedId = list._selectedEntryId;

  for (const [group, groupEntries] of grouped) {
    items.push(t.heading(`── ${group} (${groupEntries.length}) ──`));
    visualIdx++;
    for (const entry of groupEntries.slice(0, 20)) {
      if (firstEntryIdx === -1) firstEntryIdx = visualIdx;
      entryMap.set(visualIdx, entry);
      items.push(`  ${formatSidebarEntry(entry, resolvedTheme)}`);
      visualIdx++;
    }
  }

  safeTry(() => {
    list.setItems(items.length ? items : ["(empty)"]);
    let selectedId: string | undefined;
    if (prevSelectedId) {
      for (const [idx, entry] of entryMap) {
        if (entry.id === prevSelectedId) {
          list.select(idx);
          selectedId = prevSelectedId;
          break;
        }
      }
    }
    if (!selectedId && firstEntryIdx >= 0) {
      list.select(firstEntryIdx);
      const firstEntry = entryMap.get(firstEntryIdx);
      if (firstEntry) selectedId = firstEntry.id;
    }
    list._entryMap = entryMap;
    list._selectedEntryId = selectedId;
  }, undefined);
}
