import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";
import { Theme, createTheme } from "../../tui/theme";

export type EditorOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
  theme?: Theme;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
};

export function createEditor(opts: EditorOptions) {
  const theme = opts.theme || createTheme({ theme: { bg: "#0d0d0d", fg: "#e6e6e6", accent: "#FF6A00" } });
  const box = blessed.box({
    parent: opts.parent,
    label: " content ",
    top: opts.top,
    left: opts.left,
    width: opts.width,
    height: opts.height,
    border: theme.border,
    padding: opts.padding,
    style: {
      fg: theme.fg,
      bg: theme.bgPanel,
      focus: { border: theme.focusBorder },
    },
    scrollable: true,
    alwaysScroll: true,
    keys: true,
    vi: true,
  } as any);

  let editorTransitionTimer: NodeJS.Timeout | null = null;

  function render(entry: MemoryEntry | null) {
    withErrorHandling(() => {
      if (!entry) {
        if (editorTransitionTimer) clearTimeout(editorTransitionTimer);
        box.setContent("No entry selected.");
        if (box.screen) box.screen.render();
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
      if (editorTransitionTimer) clearTimeout(editorTransitionTimer);
      box.setContent("");
      if (box.screen) box.screen.render();
      editorTransitionTimer = setTimeout(() => {
        box.setContent(text);
        editorTransitionTimer = null;
      }, 20);
    }, () => {
      box.setContent("Error rendering entry.");
      if (box.screen) box.screen.render();
    });
  }

  return { box, render };
}
