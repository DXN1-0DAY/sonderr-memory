import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { MemoryStore } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";

export type MetadataOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
};

export function createMetadataPanel(opts: MetadataOptions) {
  const box = blessed.box({
    parent: opts.parent,
    label: " metadata ",
    top: opts.top,
    left: opts.left,
    width: opts.width,
    height: opts.height,
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

  function render(store: MemoryStore, entry: MemoryEntry | null) {
    withErrorHandling(() => {
      if (!entry) {
        box.setContent("Select an entry to view metadata.");
        return;
      }
      const lines = [
        `ID:        ${entry.id}`,
        `Short ID:  ${entry.id.slice(0, 8)}`,
        `Created:   ${entry.createdAt}`,
        `Updated:   ${entry.updatedAt}`,
        `Source:    ${entry.source}`,
        `Project:   ${entry.project || "(none)"}`,
        `Topics:    ${entry.topics.join(", ") || "(none)"}`,
        `People:    ${entry.people.join(", ") || "(none)"}`,
        `Tags:      ${entry.tags.join(", ") || "(none)"}`,
        `Linked:    ${entry.linkedIds.length > 0 ? entry.linkedIds.map((id: string) => id.slice(0, 8)).join(", ") : "(none)"}`,
        `Path:      ${entry.path}`,
      ];
      box.setContent(lines.join("\n"));
    }, () => {
      box.setContent("Error rendering metadata.");
    });
  }

  return { box, render };
}
