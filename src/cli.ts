#!/usr/bin/env bun
import { launchApp } from "./tui/app";
import { createStore, loadEntries, saveEntry, searchEntries } from "./memory/store";

export function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "tui":
    case "ui":
    case undefined:
      launchApp();
      break;
    case "remember":
    case "add": {
      const store = createStore();
      const content = args.slice(1).join(" ") || "(empty)";
      saveEntry(store, "inbox", `cli-${Date.now()}`, content);
      console.log("saved");
      break;
    }
    case "search": {
      const store = createStore();
      const query = args[1] || "";
      const results = searchEntries(store, query);
      console.log(JSON.stringify(results.map((r) => ({ id: r.id, content: r.content.slice(0, 100) })), null, 2));
      break;
    }
    case "list": {
      const store = createStore();
      const entries = loadEntries(store);
      console.log(JSON.stringify(entries.map((r) => ({ id: r.id, source: r.source, content: r.content.slice(0, 100) })), null, 2));
      break;
    }
    default:
      console.log("unknown command");
      break;
  }
}

runCLI();
