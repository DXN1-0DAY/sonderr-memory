<div align="center">

[![sonderr-memory](https://img.shields.io/badge/sonderr--memory-context--engine-FF6A00?style=for-the-badge)](https://github.com/DXN1-0DAY/sonderr-memory) [![Version](https://img.shields.io/badge/version-0.0.16-FF6A00?style=for-the-badge)](https://github.com/DXN1-0DAY/sonderr-memory/releases) [![License](https://img.shields.io/badge/license-MIT-FF6A00?style=for-the-badge)](LICENSE) [![C%2B%2B23](https://img.shields.io/badge/manager-C%2B%2B23-00599C?style=for-the-badge)](https://isocpp.org/)

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
- **Smart ranking**: importance, confidence, access frequency, and recency scoring
- **Token budgeting**: context window management with automatic compaction

## Install

### Option 1: curl install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/DXN1-0DAY/sonderr-memory/main/install.sh | bash
```

This installs `sonderr-memory` as a global command. Running it with no arguments opens the C++23 manager. The one-line installer automatically clones, installs dependencies, builds the manager, creates the memory store, and installs the launcher. It will:
- Install Bun if missing
- Clone the application to `~/.local/share/sonderr-memory`
- Keep user memories separately in `~/.sonderr-memory`
- Install dependencies
- Create `~/.local/bin/sonderr-memory` wrapper
- Install `sonderr-memory` to `~/.local/bin`

The C++23 manager is local and does not use a web server. CLI and MCP commands use the JavaScript memory engine, and both sides read the same file-backed store. The optional MCP service listens on localhost only so AI clients can connect to it.

### Option 2: build from source

```bash
git clone https://github.com/DXN1-0DAY/sonderr-memory.git
cd sonderr-memory
bun install
bun run dev
```

## Usage

```bash
sonderr-memory            # launch TUI
sonderr-memory --help     # help
sonderr-memory mcp        # start MCP server
```

### TUI

sonderr-memory launches a clean, minimal TUI by default. No clutter, no complex panels.

```
sonderr-memory            # launch TUI
```

**Manager layout (C++23, local):**

The left sidebar switches between Memories, Files, Settings, MCP, and AI Prompt. The right pane shows the selected area. Use number keys `1`–`5` or `Tab` to switch sections.
- `j` / `k`: navigate memories
- `Enter`: open a memory
- `/`: search
- `n`: create a memory
- `s`: settings and store information
- `m`: start the separate JavaScript MCP service for AI clients
- `f`: browse every file in the local store
- `r`: refresh, `q`: quit
- `x`: safely delete the selected memory (requires typing `yes`)

**Command palette:**
Press `/` to open the command palette with autocomplete suggestions.

**Available commands:**
- `/tutorial` - list tutorials
- `/tutorial <id>` - run tutorial
- `/help` - show help
- `/mcp` - start MCP server
- `/stats` - show statistics
- `/timeline` - show recent memories
- `/clear` - clear screen
- `/search <query>` - search memories
- `/new` - create new memory
- `/quit` - quit

**Shortcuts:**
| Key | Action |
|-----|--------|
| `Ctrl+N` | New memory |
| `Ctrl+S` | Search |
| `Ctrl+R` | Refresh |
| `Ctrl+Q` | Quit |
| `Tab` | Focus command bar |
| `?` | Help |
| `/` | Command palette |

### CLI commands

```bash
sonderr-memory remember "idea text"                    # save a memory
sonderr-memory search "query"                          # search memories
sonderr-memory list                                    # list all memories
sonderr-memory timeline                               # recent memories
sonderr-memory stats                                  # show statistics
sonderr-memory context "query"                         # export context for agent
sonderr-memory export "query"                          # export larger context
sonderr-memory delete <id>                             # delete a memory
sonderr-memory link <src> <dst>                        # link two memories
sonderr-memory update <id> key=value ...               # update labels
sonderr-memory mcp                                     # start MCP server
sonderr-memory tutorial <id>                           # run a tutorial
```

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
- Importance and confidence scoring for better retrieval
- Access tracking for frequently-used memories

## Context window management

sonderr-memory manages context windows intelligently:

- **Token budgeting**: automatically reserves tokens for system prompts and responses
- **Importance scoring**: high-importance memories are prioritized
- **Confidence weighting**: high-confidence memories rank higher
- **Access frequency**: frequently-accessed memories are surfaced first
- **Recency boost**: recently accessed memories get a boost
- **Automatic compaction**: fits the best memories within your token budget

Example context export:

```bash
sonderr-memory context "mcp server setup"
```

This returns ranked, token-budgeted memories ready for agent injection.

## MCP Server

sonderr-memory ships with an MCP server for agent integration.

```bash
sonderr-memory mcp
```

Tools exposed:
- `sonderr_memory_list_files` / `sonderr_memory_get_file` - let connected AIs inspect the complete shared store, including config and indexes
- `sonderr_memory_labeling_guide` - lets every connected AI retrieve the same labeling rules
- `sonderr_memory_health` - confirms the shared store and MCP service are healthy

Copy [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md) into an AI client’s system/developer instructions. It standardizes broad, findable, and precise labels across every connected AI.
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

## Tutorials

sonderr-memory includes interactive tutorials:

```bash
sonderr-memory tutorial mcp-setup     # MCP server setup guide
sonderr-memory tutorial cli-usage     # CLI usage guide
sonderr-memory tutorial tui-walkthrough # TUI walkthrough
```

In the TUI, press `/` then `tutorial` or `/tutorial <id>`.

## Development

```bash
bun install
bun run dev
```

## Versioning

Patch +0.0.01 per release.

## License

MIT
