import blessed from "blessed";
import { MemoryEntry } from "../../memory/types";
import { MemoryStore } from "../../memory/types";
import { getRelated, loadEntries } from "../../memory/store";
import { withErrorHandling } from "../../errors/tui-errors";
import { Theme, createTheme, DEFAULT_THEME_CONFIG } from "../../tui/theme";
import { tag } from "../../tui/format";

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
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const box = blessed.box({
    parent: opts.parent,
    label: " metadata ",
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
      const t = tag(theme);
      if (!entry) {
        if (metadataTransitionTimer) clearTimeout(metadataTransitionTimer);
        box.setContent(t.muted("Select an entry to view metadata."));
        box.scrollTo(0);
        if (box.screen) box.screen.render();
        return;
      }
      const lines = [
        `${t.label("ID:")}        ${entry.id}`,
        `${t.label("Short ID:")}  ${entry.id.slice(0, 8)}`,
        `${t.label("Created:")}   ${entry.createdAt}`,
        `${t.label("Updated:")}   ${entry.updatedAt}`,
        `${t.label("Source:")}    ${entry.source}`,
        `${t.label("Project:")}   ${entry.project || "(none)"}`,
        `${t.label("Topics:")}    ${entry.topics.join(", ") || "(none)"}`,
        `${t.label("People:")}    ${entry.people.join(", ") || "(none)"}`,
        `${t.label("Tags:")}      ${entry.tags.length > 0 ? entry.tags.map((tag) => `{bold}{bg-${theme.accent}}{fg-${theme.bg}} ${tag} {/fg-${theme.bg}}{/bg-${theme.accent}}{/bold}`).join("  ") : t.muted("(none)")}`,
        `${t.label("Linked:")}    ${entry.linkedIds.length > 0 ? entry.linkedIds.map((id: string) => id.slice(0, 8)).join(", ") : t.muted("(none)")}`,
        `${t.label("Path:")}      ${entry.path}`,
      ];
      const allEntries = loadEntries(store);
      const linkedEntries = entry.linkedIds
        .map((id) => allEntries.find((e) => e.id === id))
        .filter((e): e is MemoryEntry => Boolean(e));
      const relatedEntries = getRelated(store, entry, 5);
      lines.push("");
      lines.push(t.heading("GRAPH"));
      lines.push("");
      if (linkedEntries.length > 0) {
        lines.push(`${t.label("Linked")} (${linkedEntries.length}):`);
        linkedEntries.forEach((e, i) => {
          const prefix = i === linkedEntries.length - 1 ? "  └─→" : "  ├─→";
          const preview = e.content.split("\n")[0].trim().slice(0, 28);
          lines.push(`${prefix} {fg-${theme.accent}}${e.source}{/fg-${theme.accent}} ${preview}`);
        });
        lines.push("");
      }
      if (relatedEntries.length > 0) {
        lines.push(`${t.label("Related")} (${relatedEntries.length}):`);
        relatedEntries.forEach((e, i) => {
          const prefix = i === relatedEntries.length - 1 ? "  └─•" : "  ├─•";
          const preview = e.content.split("\n")[0].trim().slice(0, 28);
          lines.push(`${prefix} {fg-${theme.accent}}${e.source}{/fg-${theme.accent}} ${preview}`);
        });
      }
      if (metadataTransitionTimer) clearTimeout(metadataTransitionTimer);
      box.setContent("");
      metadataTransitionTimer = setTimeout(() => {
        if (!box.screen) return;
        box.setContent(lines.join("\n"));
        box.scrollTo(0);
        box.screen.render();
        metadataTransitionTimer = null;
      }, 20);
    }, () => {
      box.setContent("Error rendering metadata.");
      box.scrollTo(0);
    });
  }

  return { box, render };
}
