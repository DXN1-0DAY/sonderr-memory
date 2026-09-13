import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { MemoryStore } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";
import { Theme, createTheme } from "../../tui/theme";

export type MetadataOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
  theme?: Theme;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
};

export function createMetadataPanel(opts: MetadataOptions) {
  const theme = opts.theme || createTheme({ theme: { bg: "#0d0d0d", fg: "#e6e6e6", accent: "#FF6A00" } });
  const box = blessed.box({
    parent: opts.parent,
    label: " metadata ",
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

  let metadataTransitionTimer: NodeJS.Timeout | null = null;

  function render(store: MemoryStore, entry: MemoryEntry | null) {
    withErrorHandling(() => {
      if (!entry) {
        if (metadataTransitionTimer) clearTimeout(metadataTransitionTimer);
        box.setContent("Select an entry to view metadata.");
        if (box.screen) box.screen.render();
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
      if (metadataTransitionTimer) clearTimeout(metadataTransitionTimer);
      box.setContent("");
      if (box.screen) box.screen.render();
      metadataTransitionTimer = setTimeout(() => {
        box.setContent(lines.join("\n"));
        metadataTransitionTimer = null;
      }, 20);
    }, () => {
      box.setContent("Error rendering metadata.");
      if (box.screen) box.screen.render();
    });
  }

  return { box, render };
}
