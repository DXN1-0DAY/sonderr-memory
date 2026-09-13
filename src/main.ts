import { createStore, inboxPath } from "./store.ts";
import { search } from "./search.ts";

const store = createStore();
console.log("sonderr-memory scaffold running");
console.log("inbox root:", inboxPath(store));
