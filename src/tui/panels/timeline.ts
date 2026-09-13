import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";

export type TimelineOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
};

export function createTimeline(opts: TimelineOptions) {
  const list = blessed.list({
    parent: opts.parent,
    label: " timeline ",
    top: opts.top,
    left: opts.left,
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

  function render(entries: MemoryEntry[]) {
    withErrorHandling(() => {
      const items = entries.map((entry) => {
        const title = entry.content.split("\n")[0].slice(0, 60);
        const age = timeAgo(entry.createdAt);
        return `${age} | ${entry.source} | ${title}`;
      });
      list.setItems(items.length ? items : ["(empty)"]);
      list.select(0);
    }, () => {});
  }

  return { list, render };
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
