import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";
import { formatRelativeTime } from "../format";
import { Theme, createTheme, DEFAULT_THEME_CONFIG } from "../theme";

export type TimelineOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
  theme?: Theme;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  onSelect?: (entry: MemoryEntry) => void;
  searchMatches?: Map<string, { score: number; matchedFields: string[] }>;
};

function isPinned(entry: MemoryEntry): boolean {
  return entry.importance >= 0.8;
}

function formatTimelineEntry(
  entry: MemoryEntry,
  theme: Theme,
  matchInfo?: { score: number; matchedFields: string[] }
): string {
  const pinned = isPinned(entry) ? "[★] " : "";
  const age = formatRelativeTime(entry.createdAt);
  const title = (entry.content || "").split("\n")[0].trim().slice(0, 48);
  const matchBadge = matchInfo ? `{fg-${theme.accent}}[${String(matchInfo.score).padStart(3)}%]{/fg-${theme.accent}} ` : "";
  return `${pinned}{bold}${age}{/bold} | {fg-${theme.accent}}${entry.source}{/fg-${theme.accent}} | ${matchBadge}${title}`;
}

export function createTimeline(opts: TimelineOptions) {
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const list = blessed.list({
    parent: opts.parent,
    label: " timeline ",
    top: opts.top,
    left: opts.left,
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
    scrollbar: { style: { fg: theme.accent, bg: theme.bgPanel } },
  } as any);

  const entryMap = new Map<number, MemoryEntry>();
  let lastSelectedIndex = 0;
  let suppressSelectFlash = false;

  let borderFlashTimer: NodeJS.Timeout | null = null;

  list.on("select", (_el: unknown, idx: number) => {
    if (!suppressSelectFlash && list.style && list.style.border) {
      if (borderFlashTimer) clearTimeout(borderFlashTimer);
      const originalFg = (list.style.border as any).fg;
      (list.style.border as any).fg = theme.accentLight;
      borderFlashTimer = setTimeout(() => {
        (list.style.border as any).fg = originalFg;
        borderFlashTimer = null;
        if (list.screen) list.screen.render();
      }, 80);
    }
    const entry = entryMap.get(idx);
    if (entry && opts.onSelect) {
      opts.onSelect(entry);
    }
  });

  function render(entries: MemoryEntry[]) {
    withErrorHandling(() => {
      entryMap.clear();
      const searchMatches = (list as any)._searchMatches as Map<string, { score: number; matchedFields: string[] }> | undefined;
      const items = entries.map((entry) => formatTimelineEntry(entry, theme, searchMatches?.get(entry.id)));
      if (items.length === 0) {
        list.setItems(["(empty)"]);
      } else {
        list.setItems(items);
        entries.forEach((entry, idx) => entryMap.set(idx, entry));
        const newIdx = Math.min(lastSelectedIndex, items.length - 1);
        suppressSelectFlash = true;
        list.select(newIdx);
        lastSelectedIndex = newIdx;
        suppressSelectFlash = false;
      }
    }, () => {});
  }

  return { list, render, setSearchMatches(matches: Map<string, { score: number; matchedFields: string[] }>) { (list as any)._searchMatches = matches; } };
}
