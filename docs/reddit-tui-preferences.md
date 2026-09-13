# Reddit TUI Preferences Summary

## What Users Like About TUIs

### 1. Speed and Performance
- TUIs are substantially faster than GUI apps, especially over SSH/remote connections
- Users appreciate lightweight tools that don't consume excessive RAM/CPU
- Terminal-first tools avoid the overhead of display servers (X11/Wayland/Quartz)
- Many users cite being able to run TUIs on remote servers without GUI as a major benefit

### 2. Keyboard-Driven Workflows
- Vim-style keybindings (hjkl, /, g/G) are highly valued
- Keyboard-only navigation without needing a mouse is a core appeal
- Users want consistent, learnable keymaps across tools
- Tmux-style pane/session management is a popular pattern

### 3. Scriptability and Automation
- Terminal programs can be easily automated and chained together
- Scriptability is cited as "the point of Unix" by experienced users
- Tools that work well in pipelines are preferred

### 4. Visual Appeal and Theming
- Modern TUIs with rich colors, gradients, and visual effects are well-received
- Popular themes include Tokyo Night, Catppuccin, Nord, Gruvbox
- Users want customizable themes and the ability to use their terminal's native theme
- Inline images (via Kitty Graphics Protocol, Sixel, iTerm) are increasingly desired
- Visual features like minimaps, file previews, and album art are appreciated

### 5. Simplicity and Minimalism
- Users prefer simple, unobtrusive interfaces
- "Plaintext" aesthetics are favored by some power users
- Tools should not obstruct the workflow with flashy menus
- Integration with existing tools (fzf, bat, lesspipe) is valued

### 6. Remote Friendliness
- TUIs work reliably over SSH without X11 forwarding
- Session persistence (detach/reattach) is critical for remote work
- Users want tools that work the same locally and remotely

### 7. Specific Popular Features
- Fuzzy search across hosts/files/repos
- Real-time stats and monitoring (CPU, memory, network)
- File previews with syntax highlighting
- Docker/container management in terminal
- Music visualizers and lyrics sync
- Git repo dashboards

## What Users Dislike About TUIs

### 1. Poor Documentation and Help
- Tools that dump excessive documentation on `--help` are frustrating
- Users want concise, single-screen help with common usage
- Verbose options should go in man pages, not `--help`

### 2. Inconsistent Keybindings
- Non-intuitive shortcuts frustrate users
- Lack of standard conventions across TUI tools
- Mouse support issues when using tmux (selection spans panes, scrolling problems)

### 3. Resource Usage
- Some TUIs still feel sluggish compared to pure CLI tools
- GPU-accelerated terminals can be overkill for simple tasks
- Memory bloat in modern TUI frameworks

### 4. Setup Complexity
- Many TUIs require extensive configuration before being useful
- Font configuration is a common pain point
- Theme customization can be cumbersome

### 5. Limited Functionality
- Users wish for more TUI alternatives to GUI apps (video editing, PDF editing, etc.)
- Lack of TUI window managers compared to GUI alternatives
- Missing features in existing TUIs compared to their GUI counterparts

### 6. Terminal Compatibility Issues
- Graphics protocol support varies across terminals
- Some features only work in specific terminals (Kitty, WezTerm)
- TTY/console environments limit what's possible

### 7. Visual Clutter
- Over-designed TUIs with too many flashy elements can be distracting
- Poor responsive design for different terminal sizes

## Features Users Want from TUI Apps

### Core Features
1. **Vim keybindings** - hjkl navigation, `/` search, `g/G` for top/bottom
2. **Fuzzy search** - for files, hosts, commands, etc.
3. **Real-time monitoring** - live stats, logs, and updates
4. **Multi-panel/tiling** - split views for managing multiple items simultaneously
5. **Session persistence** - detach/reattach like tmux
6. **Offline operation** - no telemetry, no cloud dependencies

### Visual Features
1. **Rich previews** - file previews, image thumbnails, syntax highlighting
2. **Customizable themes** - easy theme switching, terminal-native themes
3. **Responsive layouts** - adapt to terminal size changes
4. **Minimaps** - for navigation in large datasets
5. **Inline images** - via Kitty Graphics, Sixel, iTerm protocols

### Workflow Features
1. **Quick actions** - single-keypress operations for common tasks
2. **Bulk operations** - select and act on multiple items
3. **Clipboard integration** - copy/paste support
4. **SSH/remote support** - work seamlessly over connections
5. **Plugin/extension systems** - for customization

### Integration Features
1. **Shell integration** - status bars, git info in prompt
2. **Tool compatibility** - work with fzf, bat, ripgrep, etc.
3. **Cloud provider sync** - for managing remote resources
4. **API access** - both TUI and CLI modes

### Quality of Life
1. **Fast startup** - under 100ms preferred
2. **Undo/redo** - for destructive operations
3. **Configuration via files** - not just CLI flags
4. **Good error messages** - actionable, not cryptic
5. **Extensive documentation** - but keep `--help` concise

## Popular TUI Tools Mentioned

### File Managers
- ranger, nnn, yazi, vifm, broot, mc, elio, veld

### System Monitoring
- btop, htop, bottom, k9s

### Development
- lazydocker, lazydocker, Managarr, git-scope, k9s

### Productivity
- tmux, zellij, kairo (task manager), LazySSH

### Media
- cava, lyre (music), spotatui (Spotify), mpv

### General
- fzf, bat, lesspipe, buku, googler, nnn, oxicord (Discord)

## Key Takeaways

1. **Modern TUIs are maturing** - Tools like Textual, Bubble Tea, and Ink are enabling richer, more accessible TUI development
2. **The line between TUI and GUI is blurring** - Graphics protocols, images, and visual effects are becoming expected
3. **Keyboard-first design is non-negotiable** - Vim users dominate the terminal community
4. **Simplicity wins** - The best TUIs do one thing well and integrate with the Unix philosophy
5. **Remote capability is a major differentiator** - Tools that work seamlessly over SSH have a significant advantage
6. **Theming and customization are increasingly important** - Users want their tools to match their aesthetic
7. **Performance still matters** - Even with modern hardware, fast, lightweight tools are preferred
