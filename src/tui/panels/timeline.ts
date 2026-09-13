import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";
import { formatRelativeTime } from "../format";
import { Theme, createTheme } from "../theme";

export type TimelineOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
  theme?: Theme;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
};

function isPinned(entry: MemoryEntry): boolean {
  return entry.importance >= 0.8;
}

function formatTimelineEntry(entry: MemoryEntry): string {
  const pinned = isPinned(entry) ? "[★] " : "";
  const age = formatRelativeTime(entry.createdAt);
  const title = entry.content.split("\n")[0].trim().slice(0, 48);
  return `${pinned}${age} | ${entry.source} | ${title}`;
}

export function createTimeline(opts: TimelineOptions) {
  const theme = opts.theme || createTheme({ theme: { bg: "#0d0d0d", fg: "#e6e6e6", accent: "#FF6A00" } });
  const list = blessed.list({
    parent: opts.parent,
    label: " timeline ",
    top: opts.top,
    left: opts.left,
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

  list.on("select", () => {
    if (list.style && list.style.border) {
      const originalFg = (list.style.border as any).fg;
      (list.style.border as any).fg = theme.accentLight;
      setTimeout(() => {
        (list.style.border as any).fg = originalFg;
        if (list.screen) list.screen.render();
      }, 80);
    }
  });

  function render(entries: MemoryEntry[]) {
    withErrorHandling(() => {
      const items = entries.map((entry) => formatTimelineEntry(entry));
      list.setItems(items.length ? items : ["(empty)"]);
      list.select(0);
    }, () => {});
  }

  return { list, render };
}
