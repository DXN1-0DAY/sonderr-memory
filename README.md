# sonderr-memory

Local-first, file-backed context engine for AI coding agents.

Infinite memory through plain text files, TUI-first, no cloud, no database.

## Concept

Every idea, decision, error, lesson, and command is saved to disk as `.txt` or `.md`. The agent reads what it needs from a structured folder, labels it, and uses it to maintain effectively infinite context across sessions.

## Structure

```text
~/.sonderr-memory/
├── inbox/
│   └── 2026-09-13/
│       └── 01-24-06-idea.txt
├── projects/
├── topics/
├── lessons/
├── references/
└── index/
```

- Pure text files, fastest possible read/write.
- Timestamped, labeled, source-annotated.
- Append-only raw log. Curated `.md` summaries on top.
- Optional local full-text search.
- No cloud, no vendor lock-in.

## TUI

Heavy terminal UI with:

- Memory tree browser
- Search and timeline
- Label editor
- Context preview
- Agent conversation panel
- Provenance for every injected memory

## Dev

```bash
bun install
bun run dev
```

## Versioning

Patch +0.0.01 per release.
