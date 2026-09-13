<div align="center">

[![sonderr-memory](https://img.shields.io/badge/sonderr--memory-context--engine-FF6A00?style=for-the-badge)](https://github.com/DXN1-termux/sonderr-memory) [![Version](https://img.shields.io/badge/version-0.0.06-FF6A00?style=for-the-badge)](https://github.com/DXN1-termux/sonderr-memory/releases) [![License](https://img.shields.io/badge/license-MIT-FF6A00?style=for-the-badge)](LICENSE) [![Bun](https://img.shields.io/badge/runtime-Bun-F472B6?style=for-the-badge)](https://bun.sh) [![TUI](https://img.shields.io/badge/TUI-blessed-1f425f?style=for-the-badge)](https://github.com/chjj/blessed)

# sonderr-memory

**Local-first, file-backed context engine for AI coding agents.**

Infinite memory through plain text files. Best-in-class context and memory MCP. No cloud. No database. No limits.

</div>

---

## What it is

sonderr-memory turns your machine into a **persistent, searchable memory store** for agentic coding. Every idea, decision, error, command, lesson, and reference is saved to disk as `.md` files, organized by project, topic, and time. The agent reads only what it needs. You keep everything.

No cloud. No subscription. No lock-in. Just files.

## Why it exists

AI agents today are amnesic. They forget what you built last week, what failed, and why you chose one approach over another. sonderr-memory gives them **durable memory** without sacrificing privacy or control.

- **Infinite recall**: filesystem-backed, grows forever
- **Fast retrieval**: full-text search, no database round-trips
- **Portable**: `.txt` / `.md` files you can grep, backup, and move
- **Private**: stored locally under `~/.sonderr-memory/`
- **Agent-ready**: MCP / CLI interface for any coding agent
- **Context export**: bounded-context snippets for agent prompts

## Install

### Option 1: curl install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/DXN1-termux/sonderr-memory/main/install.sh | bash
```

This installs the binary to `~/.local/bin/sonderr-memory` and adds it to your PATH if needed.

### Option 2: build from source

```bash
git clone https://github.com/DXN1-termux/sonderr-memory.git
cd sonderr-memory
bun install
bun run build
```

## Usage

```bash
sonderr-memory            # launch TUI
sonderr-memory --help     # help
```

### TUI hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+N` | New memory |
| `Ctrl+S` | Search |
| `Ctrl+R` | Refresh |
| `Ctrl+Q` | Quit |
| `Enter` | View entry |
| `Up/Down` | Navigate sidebar |
| `?` | Help |

## Memory structure

```text
~/.sonderr-memory/
├── inbox/
│   └── 2026/09/13/
│       └── 01-24-06-idea.md
├── projects/
│   ├── sonderr/
│   └── raio/
├── topics/
│   ├── architecture/
│   ├── bugs/
│   └── decisions/
├── lessons/
├── references/
└── index/
```

- Every entry is a plain `.md` file with frontmatter
- Append-only raw log. Curated summaries on top.
- Fast grep, fast search, fast backup.

## MCP Server

sonderr-memory ships with an MCP server for agent integration.

```bash
sonderr-memory mcp
```

Tools exposed:
- `sonderr_memory_save` - save a new memory
- `sonderr_memory_search` - search memories
- `sonderr_memory_list` - list all memories
- `sonderr_memory_get` - get a specific memory
- `sonderr_memory_update` - update labels
- `sonderr_memory_delete` - delete a memory
- `sonderr_memory_link` - link two memories
- `sonderr_memory_context` - export context for agent
- `sonderr_memory_stats` - get statistics
- `sonderr_memory_timeline` - recent memories

## Development

```bash
bun install
bun run dev
```

## Versioning

Patch +0.0.01 per release.

## License

MIT
