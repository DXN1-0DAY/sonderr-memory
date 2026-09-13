import blessed from "blessed";
import { MemoryEntry } from "../memory/types";
import { saveEntry, updateEntry } from "../memory/store";
import { withErrorHandling } from "../errors/tui-errors";

export type CreateMemoryOptions = {
  screen: any;
  store: any;
  onSaved: () => void;
};

export function showCreateMemoryForm(opts: CreateMemoryOptions) {
  const form = blessed.form({
    parent: opts.screen,
    top: "center",
    left: "center",
    width: "70%",
    height: "60%",
    label: " new memory ",
    border: { type: "line", fg: "#FF6A00" },
    style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
    keys: true,
    mouse: true,
  } as any);

  const category = blessed.list({
    parent: form,
    label: " category ",
    top: 1,
    left: 1,
    width: "40%",
    height: 6,
    style: { selected: { bg: "#FF6A00", fg: "#000000" } },
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
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    keys: true,
    mouse: true,
  } as any);

  const topicsInput = blessed.textbox({
    parent: form,
    label: " topics ",
    top: 8,
    left: "50%",
    width: "50%",
    height: 3,
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    keys: true,
    mouse: true,
  } as any);

  const nameInput = blessed.textbox({
    parent: form,
    label: " title ",
    top: 12,
    left: 1,
    width: "90%",
    height: 3,
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    keys: true,
    mouse: true,
  } as any);

  const contentInput = blessed.textarea({
    parent: form,
    label: " content ",
    top: 16,
    left: 1,
    width: "90%",
    height: "60%",
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    keys: true,
    mouse: true,
  } as any);

  const saveBtn = blessed.button({
    parent: form,
    label: " save ",
    top: "88%",
    left: "center",
    width: 12,
    height: 3,
    style: { bg: "#FF6A00", fg: "#000000", bold: true, focus: { bg: "#ff8533" } },
  } as any);

  const cancelBtn = blessed.button({
    parent: form,
    label: " cancel ",
    top: "88%",
    left: "center+14",
    width: 12,
    height: 3,
    style: { bg: "#333333", fg: "#e6e6e6", focus: { bg: "#444444" } },
  } as any);

  saveBtn.on("press", () => {
    withErrorHandling(() => {
      const selectedIdx = (category as any).selected ?? 0;
      const cat = ((category as any).items ?? [])[selectedIdx] as MemoryEntry["source"];
      const topics = ((topicsInput as any).value || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      saveEntry(opts.store, cat, (nameInput as any).value || "untitled", (contentInput as any).value || "", {
        project: (projectInput as any).value || undefined,
        topics,
      });
      form.destroy();
      opts.onSaved();
    }, () => {
      (saveBtn as any).setLabel(" error ");
    });
  });

  cancelBtn.on("press", () => {
    form.destroy();
    opts.screen.render();
  });

  opts.screen.append(form);
  (projectInput as any).focus();
  opts.screen.render();
}

export type EditLabelsOptions = {
  screen: any;
  store: any;
  entry: MemoryEntry;
  onUpdated: (entry: MemoryEntry) => void;
};

export function showEditLabelsForm(opts: EditLabelsOptions) {
  const form = blessed.form({
    parent: opts.screen,
    top: "center",
    left: "center",
    width: "60%",
    height: "50%",
    label: " edit labels ",
    border: { type: "line", fg: "#FF6A00" },
    style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
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
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    value: opts.entry.project || "",
    keys: true,
    mouse: true,
  } as any);

  const topicsInput = blessed.textbox({
    parent: form,
    label: " topics ",
    top: 5,
    left: 1,
    width: "90%",
    height: 3,
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    value: opts.entry.topics.join(", "),
    keys: true,
    mouse: true,
  } as any);

  const tagsInput = blessed.textbox({
    parent: form,
    label: " tags ",
    top: 9,
    left: 1,
    width: "90%",
    height: 3,
    border: { type: "line" },
    style: { fg: "#e6e6e6", bg: "#0d0d0d" },
    value: opts.entry.tags.join(", "),
    keys: true,
    mouse: true,
  } as any);

  const saveBtn = blessed.button({
    parent: form,
    label: " save ",
    top: "80%",
    left: "center",
    width: 12,
    height: 3,
    style: { bg: "#FF6A00", fg: "#000000", bold: true, focus: { bg: "#ff8533" } },
  } as any);

  const cancelBtn = blessed.button({
    parent: form,
    label: " cancel ",
    top: "80%",
    left: "center+14",
    width: 12,
    height: 3,
    style: { bg: "#333333", fg: "#e6e6e6", focus: { bg: "#444444" } },
  } as any);

  saveBtn.on("press", () => {
    withErrorHandling(() => {
      const updated = updateEntry(opts.store, opts.entry, {
        project: (projectInput as any).value || undefined,
        topics: ((topicsInput as any).value || "").split(",").map((s: string) => s.trim()).filter(Boolean),
        tags: ((tagsInput as any).value || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      });
      form.destroy();
      opts.onUpdated(updated);
    }, () => {
      (saveBtn as any).setLabel(" error ");
    });
  });

  cancelBtn.on("press", () => {
    form.destroy();
    opts.screen.render();
  });

  opts.screen.append(form);
  (projectInput as any).focus();
  opts.screen.render();
}

export type SearchOptions = {
  screen: any;
  onSubmit: (query: string) => void;
};

export function showSearchPrompt(opts: SearchOptions) {
  const prompt = blessed.prompt({
    parent: opts.screen,
    top: "center",
    left: "center",
    width: "60%",
    height: "shrink",
    border: { type: "line", fg: "#FF6A00" },
    label: " search ",
    style: { fg: "#e6e6e6", bg: "#1a1a1a", focus: { border: { fg: "#FF6A00" } } },
    keys: true,
    mouse: true,
  } as any);

  (prompt as any).input("query", (err: Error | null, value: string) => {
    withErrorHandling(() => {
      prompt.destroy();
      if (value) opts.onSubmit(value);
    }, () => {
      prompt.destroy();
      opts.screen.render();
    });
  });

  opts.screen.render();
}
