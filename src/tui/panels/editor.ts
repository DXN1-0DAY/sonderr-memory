import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { MemoryStore } from "../../memory/types";
import { TUIError, withErrorHandling } from "../../errors/tui-errors";

export type EditorOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
};

export function createEditor(opts: EditorOptions) {
  const box = blessed.box({
    parent: opts.parent,
    label: " content ",
    top: opts.top,
    left: opts.left,
    width: opts.width,
    height: opts.height,
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

  function render(entry: MemoryEntry | null) {
    withErrorHandling(() => {
      if (!entry) {
        box.setContent("No entry selected.");
        return;
      }
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
      box.setContent(text);
    }, () => {
      box.setContent("Error rendering entry.");
    });
  }

  return { box, render };
}
