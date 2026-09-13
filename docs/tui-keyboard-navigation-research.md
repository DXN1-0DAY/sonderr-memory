# Modern TUI Keyboard Navigation Research

## 1. Vim-like Modes

Modern TUIs increasingly adopt vim-inspired modal editing for power users.

### Patterns
- **Mode stacking**: Normal (default), Insert, Visual, Operator-pending. Return via `Escape`.
- **Navigation mode toggle**: `Escape` enters a transient navigation mode without leaving the input context. Indicator (e.g., `NAV`) appears in the prompt.
- **Dual-mode keymaps**: Separate bindings for `vim-normal`, `vim-insert`, plus `emacs` fallback. Some apps (Atuin) conditionally bind keys per mode (`cursor-at-start && input-empty`).
- **Text objects**: Inner/around selectors (`i`/`a`) for operator-pending motions.

### Actionable recommendations
- Provide an opt-in vim mode with a clear mode indicator; do not force it by default.
- Bind `Escape` consistently to cancel/backtrack and to exit navigation mode.
- Support `j`/`k`, `gg`/`G`, `/`, `?`, `n`/`N` for scrolling and searching.

## 2. Mnemonics

Mnemonics bridge discoverability and speed by using memorable key associations.

### Patterns
- **HotKeys with underlined characters**: Terminal.Gui underlines mnemonic letters in labels, buttons, and menu items. `Alt+<letter>` jumps directly.
- **Consistent modifier discipline**: `Ctrl+<letter>` for standard actions; `Ctrl+Shift+<letter>` for inverse/extended actions; `Alt+<letter>` for access keys.
- **Mnemonic selection**: Choose consonants over thin vowels (`i`, `l`) to keep underlines visible across fonts.

### Actionable recommendations
- Underline a mnemonic character in every actionable label.
- Reserve `Alt+<letter>` for direct navigation; reserve `Ctrl` combinations for editing commands.
- Audit mnemonics for localization conflicts—what works in English may collide in translated strings.

## 3. Discoverable Keybinding UI

The #1 complaint about TUIs is that keybindings are invisible.

### Patterns
- **Contextual footer hint bar**: Always show active key hints at the bottom. Update dynamically when focus changes panels or views (e.g., Piper issue #196).
- **Context-sensitive help overlay**: `?` or `F1` opens a grouped overlay of bindings active in the current view only (bxt, DeepSeek-TUI, Zero).
- **Command palette**: `Ctrl+K` or `:` exposes every action as a searchable list, reducing the need to memorize chords.
- **Declarative keybinding registry**: Store bindings in a structured list (e.g., `keybinding_help.go`) so the help overlay is sourced from truth, not duplicated manually.

### Actionable recommendations
- Render a footer with 3–6 key actions relevant to the current focus.
- Make `?` toggle a help overlay grouped by context (Global, Sidebar, Transcript, Composer).
- Surface the command palette as the escape hatch for undiscoverable actions.

## 4. Focus Management

A single, visible, predictable focus is the foundation of keyboard usability.

### Patterns
- **Single active focus**: Only one component receives input at a time. Blur the previous before focusing the new (SCKelemen/tui).
- **Tab order**: `Tab`/`Shift+Tab` moves between `TabStop` views in layout order (left-to-right, top-to-bottom). `F6`/`Shift+F6` moves between `TabGroup` containers.
- **Arrow-key scoping**: Arrow keys navigate inside composites (lists, trees, tables); `Tab` moves between composites.
- **Focus trapping in modals**: On open, blur parent and focus the modal. On close, restore focus to the invoking element.
- **Visual focus indicator**: Use highlight rectangles, color shifts, or borders. Only one terminal cursor should be displayed at a time.

### Actionable recommendations
- Implement explicit `Focus()` / `Blur()` lifecycle methods on every focusable component.
- Never rely on derived state (e.g., border color) to indicate focus—use a boolean flag.
- Return focus to the previously focused element when a modal or overlay closes.
- Avoid positive `tabindex`-style ordering; follow natural layout flow instead.

## 5. Accessibility

Accessibility is not an overlay—it changes how you design rendering, motion, and input.

### Patterns
- **Reduce motion**: Provide `low_motion` and `NO_ANIMATIONS=1` env vars. Disable spinners, fade-ins, and pulsing indicators for screen readers.
- **Screen-reader-aware redraws**: Modern TUI frameworks (Ink, Bubble Tea, tcell) often redraw the entire grid on every tick, causing cursor chaos. Use terminal scrolling regions or minimize redraw frequency when screen readers are active.
- **Semantic structure**: TUIs are 2D grids of cells, not linear streams. Provide text alternatives for visual indicators (icons, progress bars). Hide decorative content.
- **Keyboard parity**: Every mouse action needs a keyboard equivalent. `Enter`/`Space` activate; `Escape` dismisses.
- **Contrast**: Validate against 60+ terminal themes using APCA. Body text Lc ≥ 30, decorative Lc ≥ 15.
- **Pure-text transcripts**: Keep output regions as plain text so platform screen readers (VoiceOver, NVDA, JAWS) can read them linearly.

### Actionable recommendations
- Add `low_motion`, `fancy_animations`, and `calm_mode` settings; gate motion behind them.
- Provide text labels for icons; suppress decorative Unicode from screen-reader announcements.
- Ensure the transcript/output area is a simple text stream with no custom cell-level cursor movement.
- Test with `NO_ANIMATIONS=1` and with a real screen reader before releasing.

## Cross-cutting Patterns

| Concern | Convention |
|---|---|
| Quit | `Ctrl+C` (interrupt) or `Ctrl+D` (EOF). Avoid `q` as the only quit path. |
| Help | `F1` or `Ctrl+/` for help; `?` for context-sensitive overlay; `:` or `Ctrl+K` for command palette. |
| Cancel / Backtrack | `Escape` closes modals, cancels input, and exits vim-like modes. |
| Leader keys | Optional `Ctrl+X` (or configurable) prefix for less-common commands (Altimate Code). |
| Search | `/` forward, `?` backward, `n`/`N` next/prev. Also expose `Ctrl+R` for history search. |
| Clipboard | `Ctrl+C`/`Ctrl+X`/`Ctrl+V` for copy/cut/paste when not conflicting with quit. |

## References

- Terminal.Gui navigation docs (TabStop, TabGroup, HotKeys)
- GitHub TUIKit foundations (keybinds, accessibility, contrast)
- OpenCode vim navigation plugin & opencode-vim keybinding registry
- Atuin custom keybindings (conditional bindings, five keymaps)
- DeepSeek-TUI KEYBINDINGS.md (context-grouped bindings, help overlay)
- OSNews "The text mode lie" (modern TUI accessibility pitfalls)
- Charmbracelet `huh` (first-class screen-reader support)
