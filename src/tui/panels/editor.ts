import blessed from "blessed";
import { MemoryEntry, MemoryStore } from "../../memory/types";
import { withErrorHandling } from "../../errors/tui-errors";
import { Theme, createTheme, DEFAULT_THEME_CONFIG } from "../../tui/theme";
import { getRelated } from "../../memory/store";
import { formatMemoryContent, tag } from "../../tui/format";

export type EditorOptions = {
  parent: any;
  top: number | string;
  left: number | string;
  width: string;
  height: string;
  theme?: Theme;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  store?: MemoryStore;
};

export function createEditor(opts: EditorOptions) {
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const box = blessed.box({
    parent: opts.parent,
    label: " content ",
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

  let editorTransitionTimer: NodeJS.Timeout | null = null;

  function render(entry: MemoryEntry | null) {
    withErrorHandling(() => {
      const t = tag(theme);
      if (!entry) {
        if (editorTransitionTimer) clearTimeout(editorTransitionTimer);
        box.setContent(t.muted("No entry selected."));
        box.scrollTo(0);
        if (box.screen) box.screen.render();
        return;
      }
      const relatedEntries = opts.store ? getRelated(opts.store, entry, 3) : [];
      const relatedSection =
        relatedEntries.length > 0
          ? [
              "",
              t.heading("RELATED"),
              "",
              ...relatedEntries.map(
                (e) =>
                  `→ {fg-${theme.accent}}${e.source}{/fg-${theme.accent}} | ${e.content.split("\n")[0].trim().slice(0, 50)}`,
              ),
            ]
          : [];
      const text = [
        formatMemoryContent(entry.content),
        "",
        t.divider(),
        t.heading("METADATA"),
        "",
        `${t.label("id:")}        ${entry.id}`,
        `${t.label("createdAt:")} ${entry.createdAt}`,
        `${t.label("updatedAt:")} ${entry.updatedAt}`,
        `${t.label("source:")}    ${entry.source}`,
        `${t.label("project:")}   ${entry.project || "(none)"}`,
        `${t.label("topics:")}    ${entry.topics.join(", ") || "(none)"}`,
        `${t.label("people:")}    ${entry.people.join(", ") || "(none)"}`,
        `${t.label("tags:")}      ${entry.tags.join(", ") || "(none)"}`,
        `${t.label("linkedIds:")} ${entry.linkedIds.join(", ") || "(none)"}`,
        `${t.label("path:")}      ${entry.path}`,
        ...relatedSection,
      ].join("\n");
      if (editorTransitionTimer) clearTimeout(editorTransitionTimer);
      box.setContent("");
      editorTransitionTimer = setTimeout(() => {
        if (!box.screen) return;
        box.setContent(text);
        box.scrollTo(0);
        box.screen.render();
        editorTransitionTimer = null;
      }, 20);
    }, () => {
      box.setContent("Error rendering entry.");
      box.scrollTo(0);
    });
  }

  return { box, render };
}
