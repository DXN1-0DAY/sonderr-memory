# TUI UX Best Practices for Local-First Knowledge/Memory Management Tools

> Actionable recommendations drawn from production TUIs (lazygit, k9s, btop, fern, ztlgr, memex, neuron, Synapxis) and design systems (Monospace Design TUI, GitHub TUIKit, FrankenTUI).

---

## 1. Layout

### Primary pattern: Persistent IDE Three-Panel
- **Left sidebar**: navigation tree (folders, tags, backlinks, knowledge graph). Fixed width (e.g., 25–35 cols), collapses on narrow terminals.
- **Center**: note list or primary content. This is where users spend most time — give it the lion's share of space.
- **Right**: live preview, metadata, backlinks, or AI inspector. Shows detail without losing list context.
- Miller Columns are a valid alternative for deep hierarchies: parent → current → preview.

### Responsive breakpoints (CSS-style)
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Xs | < 60 cols | Hide sidebar; single-column stack |
| Sm | 60–89 cols | Thin sidebar (18–20 cols) |
| Md | 90–119 cols | Standard sidebar + main |
| Lg | 120+ cols | Sidebar + main + inspector |

- Use **proportional/flex splits**, not absolute column counts.
- Always define a **minimum viable size** (typically 80×24). Below that, show a clear "terminal too small" message — never crash or wrap unpredictably.
- Handle `SIGWINCH` (terminal resize) gracefully; never rearrange panels without explicit user action. Spatial consistency is the foundation of TUI mental models.

### Spatial consistency rules
- Panels stay in the same position across the entire session.
- Header (title, mode, breadcrumb) → main area → footer (key hints) is the canonical vertical structure.
- Active/focused panel gets a distinct border (accent color, double-line, or bold). Unfocused panels dim slightly.

---

## 2. Keyboard-First Design

### The four-layer model (progressive disclosure)
| Layer | Audience | Examples | Visibility |
|-------|----------|----------|------------|
| L0 Universal | Everyone | `↑↓←→`, `Enter`, `Esc`, `q` | Always in footer |
| L1 Vim motions | Terminal natives | `j/k`, `h/l`, `/`, `?`, `:` | Always in footer |
| L2 Mnemonic actions | Intermediate users | `n` new, `d` delete, `s` search, `e` edit | `?` help overlay |
| L3 Power/composed | Experts | `:command`, macros, config | Documentation only |

### Lingua franca conventions (never deviate)
- `j`/`k` or `↑`/`↓` — navigate lists
- `h`/`l` — move between panels / collapse-expand
- `/` — fuzzy search / command palette
- `?` — context-sensitive help overlay
- `:` — command mode (extended actions)
- `Tab` / `Shift+Tab` — cycle focus between panels
- `Enter` — confirm / drill into
- `Esc` — cancel / back / close overlay
- `q` — quit (with confirmation if dirty state exists)
- `g`/`G` — jump to top/bottom of list

### Never override
- `Ctrl+C` (interrupt/cancel — user's emergency exit)
- `Ctrl+Z` (suspend — must properly exit/re-enter alt screen on resume)
- `Ctrl+\` (quit signal)

### Keybinding discoverability
- Show a **footer hint bar** with 3–6 most important keys for the current context.
- `?` opens a full keybinding overlay for the current screen.
- Consistent key meanings across the entire app (`n` always means "new", `d` always means "delete").
- Avoid mode proliferation. If modes are necessary (e.g., Normal/Insert/Visual as in fern), show the current mode prominently in the status bar.

---

## 3. Visual Design & Semantic Color

### Color as semantics, not decoration
Define a semantic token system. Map to ANSI → 256 → truecolor automatically:

| Token | Use |
|-------|-----|
| `text.primary` | Main body text |
| `text.muted` | Timestamps, metadata, secondary info |
| `text.emphasis` | Focused item, active header |
| `accent.primary` | Focused border, interactive elements |
| `accent.secondary` | Secondary highlights |
| `status.success` | Confirmed actions |
| `status.warning` | Recoverable issues |
| `status.error` | Failures, destructive warnings |
| `bg.surface` | Panel backgrounds (layered for depth) |

### Contrast & accessibility
- WCAG AA minimum: 4.5:1 ratio for body text, 3:1 for UI elements.
- Never use color as the **only** indicator of state — pair with symbols (`✓`, `✗`, `●`, `○`), text labels, or position.
- Respect `NO_COLOR` environment variable; the app must remain fully usable with 16 ANSI colors only.
- Test on monochrome/SSH sessions and with common colorblindness simulators.

### Typography & density
- Use **weight** (bold) and **reverse video** (highlighted rows) as primary emphasis tools — color is secondary.
- Information density is a feature, not a bug. TUIs that feel "fast" win. But avoid clutter: if the user says "this feels busy," audit — remove decorative elements, tighten spacing, use dividers intentionally.
- Use box-drawing characters (`─│┌┐└┘├┤┬┴┼`) for panel borders. Unicode is universally supported in modern terminals.

---

## 4. Search & Command Palette

- `/` opens fuzzy search across notes, tags, and links — this is the single most important feature in a knowledge TUI.
- `Ctrl+P` (or `/`) opens a **command palette** for all actions: create, move, delete, theme switch, sync — anything that would otherwise be hidden in menus.
- Search results should appear incrementally as the user types (no "press Enter to search" step unless unavoidable).
- Show context with results: filename, tag, date, preview snippet.

---

## 5. Feedback & State Communication

### Always show system state
- **Footer / status bar** (1–2 lines at bottom): current mode, item count, filter status, async operation progress.
- **Spinners** for indeterminate async work (indexing, AI generation, network sync).
- **Progress bars** for determinate operations.
- **Toast / inline messages** for success (`Saved`), failure (`Permission denied`), and warnings. Never silent.

### Async & non-blocking
- All I/O (file reads, DB queries, LLM calls) must run in background tasks. The UI must remain interactive.
- User must always be able to press `Esc` to cancel and return to a responsive interface.
- Show "Working..." before starting an operation, not after.

---

## 6. Data Model Alignment (Local-First)

### Memory/knowledge tools have specific structural needs
- **Plain files as source of truth**: store notes as `.md` (or `.org`) files. SQLite is a rebuildable index/search layer, not the canonical store. This preserves lock-in freedom and editor interoperability.
- **Wikilinks + backlinks**: `[[link]]` syntax should be auto-resolved, auto-renamed on rename, and displayed as a dedicated panel or sidebar section.
- **Tags**: hierarchical or flat, visually distinct from folders. Auto-indexed for search.
- **Temporal/metadata awareness**: show created/updated timestamps, session context, source references. Knowledge tools need provenance.
- **Knowledge graph**: if present, render as a dedicated view (not always-on) — graph rendering is expensive. Use `V` or `Alt+G` to toggle.

### Progressive disclosure of features
- Default view: simple list + preview.
- Advanced features (graph, backlinks, tags, AI search) are one keypress away, never forced onto the main screen.
- Helpful defaults: auto-detect PARA structure, suggest daily notes, index on first open without prompting.

---

## 7. Mode & Focus Management

- **Single focused widget** at a time. Unfocused panels dim borders slightly but remain readable.
- Focus moves with `Tab` / `Shift+Tab` (global) or arrow keys (within-panel). Both must work.
- Dialogs (delete confirmation, save-to picker) trap focus — `Tab` cycles only within the dialog. `Esc` closes.
- Current selection is always unambiguous: invert colors, add `▸` marker, or use bold+accent border.

---

## 8. Terminal Hygiene

- Use **alternate screen** (`smcup`/`rmcup`) for full TUIs so the user's scrollback is preserved on exit.
- On exit (`Ctrl+C`, `q`, signal), restore terminal state unconditionally — never leave the user in raw mode.
- `SIGWINCH` (resize) must never crash or deadlock.
- Support bracketed paste, Kitty keyboard protocol detection, and OSC 8 hyperlinks where available.
- Mouse: optional, never required. If supported, click = focus, double-click = activate, right-click = context. Disable mouse capture by default in text-heavy panels so native terminal selection works.

---

## 9. Local-First UX Patterns

### Offline-first messaging
- Show "offline" or "no index" states explicitly. Don't pretend to work if the DB is missing.
- Async indexing: show progress bar on first open, then silent background updates.
- Sync indicators (if git-backed): show dirty/modified count, last sync timestamp.

### Interoperability signals
- Always show the underlying file path or note ID somewhere (status bar or detail panel) so users understand what file they're editing.
- "Open in `$EDITOR`" (`e`) is a first-class action. The TUI is a navigator, not a replacement for the user's editor.
- Config in human-readable TOML/YAML, not a binary database. Document the config file location prominently.

---

## 10. Quick Checklist

- [ ] Works at 80×24 without breaking
- [ ] Header / main / footer structure is stable
- [ ] All features keyboard-accessible (no mouse required)
- [ ] `?` opens context-sensitive help with current keybindings
- [ ] Footer shows 3–6 key hints for current context
- [ ] Color has semantic tokens; works in 16-color mode
- [ ] Never uses color alone to convey state
- [ ] WCAG AA contrast met
- [ ] `Ctrl+C` exits cleanly; terminal state restored
- [ ] Resize (`SIGWINCH`) handled without crash
- [ ] Async operations show spinner/progress; `Esc` cancels
- [ ] Destructive actions require confirmation
- [ ] Spatial layout is deterministic (panels don't shuffle)
- [ ] Vim `hjkl` works for primary navigation
- [ ] `/` search is incremental and fuzzy
- [ ] Notes stored as plain Markdown files; SQLite is a rebuildable index
