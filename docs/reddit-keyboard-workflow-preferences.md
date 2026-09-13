# Reddit Keyboard Workflow Preferences Summary

Sources: r/vim, r/neovim, r/commandline, r/linux, r/productivity, r/software

## 1. Modal Editing & Vim-Style Navigation
- Strong preference for **modal editing** as a productivity multiplier, especially for repetitive edits.
- **hjkl vs arrow keys** remains debated: hjkl keeps hands on home row but requires learning; arrow keys are more universal across apps/modes.
- Many users adopt a **hybrid approach**: use hjkl inside Vim/Neovim, arrow keys elsewhere, or remap a modifier+hjkl system-wide.
- Non-US keyboard users often remap `[`/`]` to other keys because hjkl adjacency doesn’t fit all layouts.

## 2. Custom Keybindings & Muscle Memory
- Popular custom bindings:
  - `jk` or `kj` → Escape from insert mode
  - `Ctrl+h/j/k/l` → pane/window navigation across tmux, terminal, and editor
  - `Shift+h/l` → previous/next tab
  - `Alt+hjkl` → arrow keys system-wide
- Users invest heavily in **cross-app consistency** so muscle memory transfers between editors, browsers, terminals, and OS.
- Leader keys (`<Space>`, `,`, `;`) and **SpaceFn** layers are common on compact/60% keyboards.

## 3. Keyboard-Driven Apps & Extensions
- Applications with native/plugin vim bindings are favored: **ranger**, **vifm**, **qutebrowser**, **Zathura**, **VSCodeVim**, **ZenLeap** (Zen Browser).
- Terminal-centric workflows dominate: **tmux** + **Neovim** + **fzf** + **LazyVim** is a frequently cited stack.
- Users seek **vim layers** in GUI apps (browsers, Slack, Obsidian, task managers) and often build or adopt them.

## 4. Remapping Tools & System-Wide Layers
- **Linux**: `xremap`, `kanata`, `Input Remapper`, and `xmodmap` for app-specific or global remapping.
- **macOS**: Karabiner-Elements for complex layers, caps-tap-escape + modifier combos.
- **Windows**: PowerToys Keyboard Manager, AutoHotkey, plus hardware programmable keyboards (QMK/VIA).
- Toggleable vim-nav layers (e.g., hold a modifier to enable hjkl as arrows) are popular for avoiding conflicts.

## 5. Productivity & Ergonomics
- Keyboard-first workflows are associated with **fewer context switches** and **higher editing precision**.
- Some users report **RSI reduction** by using broader motion commands (`w`, `b`, `f`, `t`) instead of repeated `hjkl`.
- Cheat-sheet tools and **which-key** plugins help onboarding without memorizing hundreds of shortcuts upfront.
- Consensus: upfront learning cost is steep, but payoff compounds once muscle memory is established.

## 6. Common Pain Points
- **Inconsistent bindings** across apps remain the biggest friction.
- Arrow-key habits die hard; transitioning from GUI editors to Vim takes ~1 month of forced practice.
- Compact keyboards require layer management, which adds cognitive load until memorized.
