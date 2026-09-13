# Terminal / CLI / TUI Feature Requests & Wishlists

## Summary of Findings from Reddit

Sources: r/commandline, r/linux, r/selfhosted, r/programming, r/unixporn, r/CLI

---

## Most Requested Features

### 1. Better TUI Rendering & Visual Design
- **Color-based emphasis / high contrast**: Users want stronger visual distinction for headings, warnings, and key phrases in AI CLI TUIs (Codex CLI, Claude Code competitors).
- **Syntax highlighting for code blocks**: Frequently requested across AI CLIs and general TUIs.
- **Markdown rendering**: Rich markdown streaming in TUIs is a major differentiator.
- **Better themes / customizable TUI styles**: Users want themeability and high-contrast presets.

### 2. Terminal Emulator Enhancements
- **Smooth scrolling**: One of the most upvoted wishes.
- **24-bit color support**: Proper termcap/terminfo entries so programs recognize true color.
- **Sixel graphics support**: For displaying images inline.
- **Kitty graphics protocol support**: To enable richer terminal experiences.
- **Better copy/paste**: Some TUIs actively block standard copy/paste; users want it to work everywhere.
- **Timestamped output / hover-to-see-timestamps**: For debugging long-running commands.
- **Keyboard-driven text selection**: Less reliance on mouse.

### 3. Navigation & Usability
- **Vim-style keybindings**: Consistently requested across TUIs.
- **Tab completion for dynamic content**: User names, group names, resource identifiers from live server queries.
- **Notebook-style / collapsible command buffers**: Each command in its own buffer, collapsible regions.
- **Search / filter / regex highlighting inside terminal output**: Quickly see only matching lines.
- **Bookmarks and history navigation**: Persistent command history with smart search.

### 4. Integration & Automation
- **LLM integration for TUIs**: Allow LLMs to see and interact with TUI apps (e.g., Terminal MCP).
- **Shell mode inside agent TUIs**: Tab completion for shell commands within AI CLI TUIs.
- **Automation / scripting support**: `expect`-like waitOutput features for Windows Terminal and others.
- **SSH convenience / discovery**: DNS SRV, Zeroconf, Tailscale-based SSH resource discovery.

### 5. Tooling Gaps & Desired New TUIs
- **Terminal REST client**: A Postman/Insomnia replacement fully in TUI.
- **Better system monitoring dashboards**: More polished alternatives to `htop`, `glances`, `btop`.
- **Database management TUIs**: For MySQL, PostgreSQL, ClickHouse, Redis, etc.
- **Git TUI improvements**: Better diff views, conflict resolution, and worktree support.
- **Kubernetes / container TUIs**: Enhanced Docker and K8s management interfaces.
- **File manager TUIs**: More feature-rich alternatives to `ranger` and `yazi`.
- **Time tracking / task management TUIs**: Better kanban and todo integrations.

### 6. Performance & Compatibility
- **Responsive TUIs**: Must work well in narrow terminals and under `tmux`/`mosh`/SSH.
- **Low latency rendering**: Avoid hardware rendering requirements.
- **Cross-platform consistency**: Same behavior across Linux, macOS, Windows, and in nested terminals.

---

## Representative Quotes

- "In 2025, I'd love to see a terminal that's designed for professional developers instead of system administrators and neovim nerds." — r/commandline
- "The only other feature I want is smooth scrolling, I can't believe there are no modern terminals with it." — r/commandline
- "In the Codex CLI interactive TUI, it is hard to visually distinguish important information from normal text." — GitHub/openai/codex #6531
- "I would enjoy to have a terminal user interface (TUI) where I can easily navigate through users, groups, service accounts." — GitHub/kanidm #4173
- "Allow LLMs to see and interact with your CLI / TUI apps." — r/CLI

---

## Related Tools Mentioned

- **TUI frameworks**: `bubbletea`, `textual`, `ink`, `opentui`, `ncurses`, `prompt_toolkit`
- **Popular TUIs**: `lazygit`, `lazydocker`, `k9s`, `btop`, `yazi`, `ranger`, `gitui`, `gh-dash`
- **Terminal emulators**: `ghostty`, `kitty`, `alacritty`, `wezterm`, `Windows Terminal`

---

*This summary was compiled from Reddit discussions across r/commandline, r/linux, r/selfhosted, r/programming, r/unixporn, and r/CLI.*
