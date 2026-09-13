import blessed from "blessed";
import { MemoryEntry } from "../memory/types";
import { saveEntry, updateEntry, suggestTags } from "../memory/store";
import { withErrorHandling } from "../errors/tui-errors";
import { Theme, createTheme, DEFAULT_THEME_CONFIG } from "./theme";

function addPlaceholder(input: any, text: string) {
  let active = true;
  if (!input.value) {
    input.value = text;
  }
  input.on("focus", () => {
    if (active && input.value === text) {
      input.value = "";
      active = false;
    }
  });
}

function addFormKeys(form: any, fields: any[], saveBtn: any, cancelBtn: any) {
  fields.forEach((el) => {
    (el as any).on("keypress", (_ch: unknown, key: any) => {
      if (key.name === "escape") {
        (cancelBtn as any).press();
      } else if (key.ctrl && key.name === "s") {
        (saveBtn as any).press();
      } else if (key.name === "tab" && !key.shift) {
        const idx = fields.indexOf(el);
        const next = fields.at(idx + 1) || fields[0];
        (next as any).focus();
        (form.parent as any).render();
      } else if (key.name === "tab" && key.shift) {
        const idx = fields.indexOf(el);
        const prev = fields.at(idx - 1) || fields.at(-1);
        (prev as any).focus();
        (form.parent as any).render();
      } else if (key.name === "j") {
        const idx = fields.indexOf(el);
        const next = fields.at(idx + 1) || fields[0];
        (next as any).focus();
        (form.parent as any).render();
      } else if (key.name === "k") {
        const idx = fields.indexOf(el);
        const prev = fields.at(idx - 1) || fields.at(-1);
        (prev as any).focus();
        (form.parent as any).render();
      }
    });
  });
}

export type CreateMemoryOptions = {
  screen: any;
  store: any;
  onSaved: () => void;
  theme?: Theme;
  notify?: (message: string, duration?: number) => void;
  onFormClose?: () => void;
  contextEntry?: MemoryEntry;
};

export function showCreateMemoryForm(opts: CreateMemoryOptions) {
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const notify = opts.notify || ((_: string) => {});

  const form = blessed.form({
    parent: opts.screen,
    top: "center",
    left: "center",
    width: "70%",
    height: "60%",
    label: " new memory ",
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bgPanel, focus: { border: theme.focusBorder } },
    keys: true,
    mouse: true,
    vi: true,
  } as any);

  const category = blessed.list({
    parent: form,
    label: " category ",
    top: 1,
    left: 1,
    width: "40%",
    height: 6,
    style: { selected: theme.selected },
    items: ["inbox", "project", "topic", "lesson", "reference"],
  } as any);
  (category as any).select(0);

  const projectInput = blessed.textbox({
    parent: form,
    label: " project ",
    top: 8,
    left: 1,
    width: "40%",
    height: 3,
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(projectInput, "e.g. my-project");

  const topicsInput = blessed.textbox({
    parent: form,
    label: " topics ",
    top: 8,
    left: "50%",
    width: "50%",
    height: 3,
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(topicsInput, "comma-separated");

  const nameInput = blessed.textbox({
    parent: form,
    label: " title ",
    top: 12,
    left: 1,
    width: "90%",
    height: 3,
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(nameInput, "required");

  const contentInput = blessed.textarea({
    parent: form,
    label: " content ",
    top: 16,
    left: 1,
    width: "90%",
    height: "60%",
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(contentInput, "required");

  const saveBtn = blessed.button({
    parent: form,
    label: " save ",
    top: "88%",
    left: "center",
    width: 12,
    height: 3,
    mouse: true,
    style: { bg: theme.accent, fg: theme.selected.fg, bold: true, focus: { bg: theme.accentLight } },
  } as any);

  const cancelBtn = blessed.button({
    parent: form,
    label: " cancel ",
    top: "88%",
    left: "center+14",
    width: 12,
    height: 3,
    mouse: true,
    style: { bg: theme.cancelBg, fg: theme.fg, focus: { bg: theme.cancelFocus } },
  } as any);

  const _hintBox = blessed.box({
    parent: form,
    top: "92%",
    left: 1,
    width: "100%-2",
    height: 1,
    style: { fg: theme.fg, bg: theme.bgPanel },
    content: " j/k: next/prev | Ctrl+S: save | Esc: cancel | i: insert mode ",
  });

  const recommendationBox = blessed.box({
    parent: form,
    top: "84%",
    left: 1,
    width: "100%-2",
    height: 1,
    style: { fg: theme.fg, bg: theme.bgPanel },
    content: "",
  });

  if (opts.contextEntry) {
    const entry = opts.contextEntry;
    if (entry.project) {
      (projectInput as any).value = entry.project;
    }
    if (entry.topics.length > 0) {
      (topicsInput as any).value = entry.topics.join(", ");
    }

    const nextSource =
      entry.source === "inbox"
        ? "project"
        : entry.source === "project"
          ? "lesson"
          : entry.source === "topic"
            ? "reference"
            : "lesson";

    const tips: string[] = [];
    if (entry.project) tips.push(`project: ${entry.project}`);
    if (entry.topics.length) tips.push(`topics: ${entry.topics.join(", ")}`);
    tips.push(`suggested: ${nextSource}`);

    (recommendationBox as any).setContent(`Tip: ${tips.join(" | ")}`);
    (_hintBox as any).setContent(" j/k: next/prev | Ctrl+S: save | Esc: cancel | i: insert | see suggestions above ");
  }

  const fields = [category, projectInput, topicsInput, nameInput, contentInput, saveBtn, cancelBtn] as any[];

  addFormKeys(form, fields, saveBtn, cancelBtn);

  function validate(): string | null {
    const title = (nameInput as any).value || "";
    const content = (contentInput as any).value || "";
    if (title === "required" || !title.trim()) {
      flashFieldError(nameInput);
      return "Title is required";
    }
    if (content === "required" || !content.trim()) {
      flashFieldError(contentInput);
      return "Content is required";
    }
    return null;
  }

  function flashError(btn: any) {
    (btn as any).setLabel(" error ");
    (btn as any).style = { bg: theme.error, fg: theme.bg, bold: true };
    (opts.screen as any).render();
    setTimeout(() => {
      if ((btn as any).destroyed) return;
      (btn as any).setLabel(" save ");
      (btn as any).style = { bg: theme.accent, fg: theme.selected.fg, bold: true, focus: { bg: theme.accentLight } };
      (opts.screen as any).render();
    }, 1500);
  }

  function flashFieldError(input: any) {
    const originalBorderFg = input.style && input.style.border && input.style.border.fg;
    if (input.style && input.style.border) {
      input.style.border = { ...(input.style.border as any), fg: theme.error };
    }
    input.style.fg = theme.error;
    (opts.screen as any).render();
    setTimeout(() => {
      if (input.destroyed) return;
      if (originalBorderFg && input.style && input.style.border) {
        input.style.border = { ...(input.style.border as any), fg: originalBorderFg };
      }
      input.style.fg = theme.fg;
      (opts.screen as any).render();
    }, 1500);
  }

  saveBtn.on("press", () => {
    const err = validate();
    if (err) {
      notify(err, 3000);
      flashError(saveBtn);
      (nameInput as any).focus();
      return;
    }
    let saved = false;
    withErrorHandling(() => {
      const selectedIdx = (category as any).selected ?? 0;
      const cat = ((category as any).items ?? [])[selectedIdx] as MemoryEntry["source"];
      const project = (projectInput as any).value === "e.g. my-project" ? undefined : (projectInput as any).value || undefined;
      const topics = ((topicsInput as any).value === "comma-separated" ? "" : (topicsInput as any).value || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      saveEntry(opts.store, cat, (nameInput as any).value || "untitled", (contentInput as any).value || "", {
        project,
        topics,
      });
      form.destroy();
      opts.onSaved();
      saved = true;
    }, () => {
      notify("error saving entry", 3000);
      flashError(saveBtn);
    });
    if (saved) {
      opts.onFormClose?.();
    }
  });

  cancelBtn.on("press", () => {
    opts.onFormClose?.();
    form.destroy();
    (opts.screen as any).render();
  });

  opts.screen.append(form);
  (nameInput as any).focus();
  if ((nameInput as any).value === "required") {
    (nameInput as any).value = "";
  }
  (opts.screen as any).render();
}

export type EditLabelsOptions = {
  screen: any;
  store: any;
  entry: MemoryEntry;
  onUpdated: (entry: MemoryEntry) => void;
  theme?: Theme;
  notify?: (message: string, duration?: number) => void;
};

export function showEditLabelsForm(opts: EditLabelsOptions) {
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const notify = opts.notify || ((_: string) => {});

  const form = blessed.form({
    parent: opts.screen,
    top: "center",
    left: "center",
    width: "60%",
    height: "50%",
    label: " edit labels ",
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bgPanel, focus: { border: theme.focusBorder } },
    keys: true,
    mouse: true,
  } as any);

  const projectInput = blessed.textbox({
    parent: form,
    label: " project ",
    top: 1,
    left: 1,
    width: "90%",
    height: 3,
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    value: opts.entry.project || "",
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(projectInput, "e.g. my-project");

  const topicsInput = blessed.textbox({
    parent: form,
    label: " topics ",
    top: 5,
    left: 1,
    width: "90%",
    height: 3,
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    value: opts.entry.topics.join(", "),
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(topicsInput, "comma-separated");

  const tagsInput = blessed.textbox({
    parent: form,
    label: " tags ",
    top: 9,
    left: 1,
    width: "90%",
    height: 3,
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bg },
    value: opts.entry.tags.join(", "),
    keys: true,
    mouse: true,
  } as any);
  addPlaceholder(tagsInput, "comma-separated");

  const saveBtn = blessed.button({
    parent: form,
    label: " save ",
    top: "80%",
    left: "center",
    width: 12,
    height: 3,
    mouse: true,
    style: { bg: theme.accent, fg: theme.selected.fg, bold: true, focus: { bg: theme.accentLight } },
  } as any);

  const cancelBtn = blessed.button({
    parent: form,
    label: " cancel ",
    top: "80%",
    left: "center+14",
    width: 12,
    height: 3,
    mouse: true,
    style: { bg: theme.cancelBg, fg: theme.fg, focus: { bg: theme.cancelFocus } },
  } as any);

  const _hintBox = blessed.box({
    parent: form,
    top: "88%",
    left: 1,
    width: "100%-2",
    height: 1,
    style: { fg: theme.fg, bg: theme.bgPanel },
    content: " j/k: next/prev | Ctrl+S: save | Esc: cancel | i: insert mode ",
  });

  const recommended = suggestTags(opts.store, opts.entry, 5);
  const _recommendationBox = blessed.box({
    parent: form,
    top: "76%",
    left: 1,
    width: "100%-2",
    height: 1,
    style: { fg: "#e6e6e6", bg: "#1a1a1a" },
    content: recommended.length > 0 ? `Suggested: ${recommended.join(", ")}` : "",
  });

  const fields = [projectInput, topicsInput, tagsInput, saveBtn, cancelBtn] as any[];

  addFormKeys(form, fields, saveBtn, cancelBtn);

  function flashError(btn: any) {
    (btn as any).setLabel(" error ");
    (btn as any).style = { bg: theme.error, fg: theme.bg, bold: true };
    (opts.screen as any).render();
    setTimeout(() => {
      if ((btn as any).destroyed) return;
      (btn as any).setLabel(" save ");
      (btn as any).style = { bg: theme.accent, fg: theme.selected.fg, bold: true, focus: { bg: theme.accentLight } };
      (opts.screen as any).render();
    }, 1500);
  }

  saveBtn.on("press", () => {
    withErrorHandling(() => {
      const project = (projectInput as any).value === "e.g. my-project" ? undefined : (projectInput as any).value || undefined;
      const topics = ((topicsInput as any).value === "comma-separated" ? "" : (topicsInput as any).value || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const tags = ((tagsInput as any).value === "comma-separated" ? "" : (tagsInput as any).value || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const updated = updateEntry(opts.store, opts.entry, {
        project,
        topics,
        tags,
      });
      form.destroy();
      opts.onUpdated(updated);
    }, () => {
      notify("error updating entry", 3000);
      flashError(saveBtn);
    });
  });

  cancelBtn.on("press", () => {
    form.destroy();
    (opts.screen as any).render();
  });

  opts.screen.append(form);
  (projectInput as any).focus();
  if ((projectInput as any).value === "e.g. my-project") {
    (projectInput as any).value = "";
  }
  (opts.screen as any).render();
}

export type SearchOptions = {
  screen: any;
  onSubmit: (query: string) => void;
  theme?: Theme;
  notify?: (message: string, duration?: number) => void;
};

export function showSearchPrompt(opts: SearchOptions) {
  const theme = opts.theme || createTheme({ theme: DEFAULT_THEME_CONFIG });
  const prompt = blessed.prompt({
    parent: opts.screen,
    top: "center",
    left: "center",
    width: "60%",
    height: "shrink",
    label: " search ",
    border: theme.border,
    style: { fg: theme.fg, bg: theme.bgPanel, focus: { border: theme.focusBorder } },
    keys: true,
    mouse: true,
  } as any);

  const _hintBox = blessed.box({
    parent: prompt,
    top: "90%",
    left: 1,
    width: "100%-2",
    height: 1,
    style: { fg: theme.fg, bg: theme.bgPanel },
    content: " Enter: search | Esc: cancel ",
  });

  (prompt as any).input("query", "search...", (err: Error | null, value: string) => {
    withErrorHandling(() => {
      prompt.destroy();
      if (value && value !== "search...") opts.onSubmit(value);
    }, () => {
      prompt.destroy();
      opts.screen.render();
    });
  });

  opts.screen.render();
}
