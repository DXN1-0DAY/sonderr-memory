# Modern TUI Visual Design Trends

## 1. Color Palettes

### Dominant Themes
- **Catppuccin Mocha** is the de-facto standard for modern TUIs. Warm pastels on deep purple-black (`#1e1e2e` base). Mauve (`#cba6f7`) as primary accent, with extended semantic roles for Blue, Green, Yellow, Red, Peach, Teal, Sky, and Lavender.
- **Nord** remains popular for "arctic clean" aesthetics — frost blue accents on dark blue-gray, structured single-line borders, Aurora status colors.
- **Dracula** — purple + pink on blue-gray, full palette, dev-focused identity.
- **Tokyo Night** — blue + purple on storm background, teal for data paths.
- **Rosé Pine** — warm pink on dark purple, dim muted borders.

### Technical Standards
- **TrueColor (24-bit)** is now expected for modern TUIs, with graceful degradation: truecolor → 256-color → 16 ANSI → no color.
- **Perceptually uniform palettes**: Generate extended 256-color ramps from the terminal's actual ANSI palette using CIELAB interpolation (Ghostty/Rampa approach). This ensures contrast is perceptually correct across any terminal theme.
- **Semantic tokens over hardcoded colors**: Use role-based tokens (`textPrimary`, `statusError`, `diffAdd`) rather than fixed hex values. GitHub's TUIKit validates contrast across 60+ real terminal themes using APCA (Lc ≥ 30 for body text).
- **Respect `NO_COLOR`** and `FORCE_COLOR` environment variables.
- **Gradient ramps** for data severity: green → yellow → red (btop signature), or blue → pink for temperature.

### Tool-Specific Palettes
- **k9s**: Cool aqua/dodgerblue palette with orange ASCII logo. Selected row is black-on-aqua reverse. Seven Kubernetes-specific status colors.
- **Claude Code**: Warm terracotta (`#d77757`) brand accent, hot pink (`#fd5db1`) tool borders, lavender permission dialogs.
- **lazygit**: Green bold active borders, blue selected background, cyan for search/branch recency.

## 2. Typography

### Constraints & Strengths
- Terminal typography is monospace, fixed-width. This is a feature: alignment is trivial, tables are natural, spacing is precise.

### Hierarchy Rules
- **Bold (SGR 1)** is the only reliable weight tool. Use for titles, headings, and active indicators.
- **Dim (SGR 2)** is inconsistent across terminals — avoid it for hierarchy. Use semantic color tokens (`textMuted`, `textTertiary`) instead.
- **Italic (SGR 3)** has limited support; only use for paths or metadata when you can accept degradation.
- **Underline (SGR 4)** for links in supporting terminals.
- **Strikethrough (SGR 9)** — avoid, poor support.

### Unicode Width
- Stick to well-supported characters from common scripts. Avoid emoji ZWJ sequences and exotic scripts in critical UI.
- Braille patterns (`⠀`-`⣿`) and block elements (`▁▂▃▄▅▆▇█`) are widely supported and ideal for sparklines.

### Recommendations
- Establish a two-level heading hierarchy: `TextTitle` (bold, primary) and `TextHeading` (bold, secondary).
- Use three text colors max: `text` / `textMuted` / `dim`. Six combinations of weight × tone cover the entire system.

## 3. Iconography

### Principles
- **Use widely supported Unicode** — stick to characters in common monospace fonts.
- **Prefer established conventions**: `✓` success, `✗` failure, `●` active, `→` navigation.
- **Single-character icons** work best. Multi-character symbols misalign in tables.
- **Meaningful vs decorative**: Meaningful icons need text alternatives for screen readers. Decorative icons should be hidden from assistive technology.

### High-Resolution Graphics
- **Braille patterns** (2×4 dot matrix per cell) are the highest-resolution graphics available in text mode. btop uses them for sparklines and real-time graphs.
- **Block elements** (`▄█▟▙`) for medium-resolution half-block rendering.

### Tool Trends
- **Nerd Fonts are optional, not required**. k9s disables them by default. Node operators SSH from random boxes.
- **ASCII fallbacks** are essential: `✓ → *`, `✗ → x`, `● → @`, `→ → >`.

## 4. Density

### Spectrum
- **Very dense** (btop): Maximize metrics and graphs in every pixel. Zero padding, boxes share borders, minimal gaps.
- **Dense** (lazygit, k9s): Multi-panel layouts maximizing information. Zero-gap between panels, compact spacing.
- **Balanced** (Claude Code, Atomic): Clean conversation flow, minimal chrome, generous breathing room.
- **Cozy** (Catppuccin tools): Generous padding, soft spacing, warm pastels. Values "breathing room" over information density.

### Responsive Density
- Adapt layout at breakpoints: compact (<80 cols), narrow (80–119), wide (≥120).
- `portraitMode` in lazygit stacks all panels vertically in narrow terminals.
- Reserve space before you need it — fixed-width prefixes, explicit container widths, batched state transitions prevent layout shifts.

### Recommendation
- Choose density based on use case: monitoring dashboards lean dense, conversational UIs lean balanced, personal tools lean cozy.
- Always support the floor: test at 80×24 and narrower.

## 5. Border Styles

### Modern Standard: Rounded Corners
- `╭╮╰╯─│` is the dominant modern border style (lazygit, btop, catppuccin, Atomic).
- Connotes friendliness and modernity. Used for primary panels and focused surfaces.

### Utilitarian: Straight Single-Line
- `┌┐└┘─│` for infrastructure and DevOps tools (k9s). Cool, structured, no-nonsense.

### Signature Variations
- **btop inverted title brackets**: `┐title┌` creates a "notch" effect where titles feel embedded.
- **Claude Code dashed ASCII**: `- - - - |` for input boxes — casual, not corporate, deliberately avoiding Unicode box-drawing.
- **Hidden borders**: Borderless panels for tables and lists (catppuccin style).

### Border States
- **Active/Focused**: Primary accent color + bold. Immediately telegraphs "this is where input goes."
- **Inactive**: Muted gray or terminal default.
- **Search/Command**: Secondary accent color.
- **Error**: Red border.

### Dividers
- **Horizontal**: Single `─` or `──────────────────` in Muted.
- **Vertical inside tables**: `╎` (dotted vertical, U+254E) for column separation (btop).
- **Section breaks**: `── 🌸 ──` or `── ◦ ──` for gentle separation.

## 6. Visual Identity

### Distinctive Accents
- Every admired TUI has a single scarce accent color that carries primary actions, current selection, and mode indicators.
  - lazygit: **Green** (`#22c55e`)
  - k9s: **Aqua** (`#00ffff`)
  - btop: **Jewel tones** per box (green, olive, purple, red)
  - Claude Code: **Terracotta** (`#d77757`)
  - Catppuccin: **Mauve** (`#cba6f7`)

### Focus-Driven Design
- Focus is the primary visual state change: border color, interior lift, bold text.
- Contextual keymaps in footer change based on focused panel (lazygit, k9s, helix).
- "Expand-to-focus" behavior — focused panels grow to claim space.

### Data Visualization
- **Braille sparklines** for real-time data (btop).
- **Gradient meters**: green → yellow → red based on utilization.
- **Color-only animation** is preferred: shimmer sweeps across text without altering content, eliminating flicker.

### Motion
- **Shimmer effects** over frame animation. Color is continuous; position is discrete.
- Speed adapts to context: faster in alt-screen (dedicated attention), slower inline.
- Respect `reduced motion` — disable animation for screen readers.

### Command Bars & Keybinding Legends
- Bottom footer showing available actions is universal in admired TUIs.
- Keys in `[]` or distinct color, descriptions in muted text.
- Hint bars auto-format key names (arrow keys → Unicode symbols).

## 7. Recommendations

### Color System
1. **Adopt semantic color tokens** — `primary`, `secondary`, `success`, `warning`, `error`, `muted`, `surface`. Never hardcode hex values in components.
2. **Start from Catppuccin Mocha or Nord** unless you have strong brand reasons. Both have excellent contrast, broad community adoption, and perceptually uniform ramps.
3. **Support truecolor with graceful degradation**. Detect terminal capability via `COLORTERM` and fall back through 256 → 16 → no color.
4. **Use one scarce accent color** for primary actions, selection, and mode. Treat it like a brand color — use sparingly.

### Typography & Hierarchy
5. **Use bold for titles, color for hierarchy**. Dim is unreliable. Six combinations of weight × tone (text/textMuted/dim) cover the entire system.
6. **Avoid decorative Unicode** in critical UI. Stick to box-drawing characters, block elements, and braille patterns.
7. **Test Unicode width** across platforms. CJK characters, emoji, and combining marks break fixed-width layouts.

### Borders & Containers
8. **Default to rounded corners** (`╭╮╰╯`) for primary panels. Use straight borders (`┌┐└┘`) only for utilitarian/infrastructure tools.
9. **Embed titles in borders** — lazygit's `╭─ Branches ──────────╮` pattern is the modern standard.
10. **Always include horizontal padding** inside bordered boxes. Text touching borders is hard to read.

### Density & Layout
11. **Choose density deliberately**: dense for dashboards/monitors, balanced for conversational tools, cozy for personal apps.
12. **Support the 80×24 floor**. Test responsive behavior at narrow widths.
13. **Reserve space before you need it** — fixed-width prefixes, explicit container widths, batched transitions prevent layout shift.

### Iconography
14. **Use Unicode 9.0 characters only** for icons. Braille (`⠀`-`⣿`) for graphs, block elements (`▁▂▃▄▅▆▇█`) for bars.
15. **Provide ASCII fallbacks** for every icon. Node operators SSH from random boxes.
16. **Never rely on Nerd Fonts** as a dependency. Make them optional.

### Visual Identity
17. **Invest in a single distinctive gesture**: btop's braille graphs, lazygit's green active border, Claude Code's terracotta shimmer, k9s's orange logo.
18. **Use color animation over frame animation** — shimmer, pulse, lerp — for smoothness without flicker.
19. **Respect accessibility**: validate contrast with APCA, provide text alternatives for icons, hide decorative content from screen readers.

### Architecture
20. **Follow the Monospace Design TUI standard** for shared keyboard conventions, layout patterns, and component behavior. The standard provides falsifiable rules for review and audit.
21. **Use the alt-screen buffer** for full-screen TUIs. Always restore terminal state on exit, including `Ctrl+C` and `Ctrl+Z`.
22. **Batch all output into a single write per frame**. Only update cells that changed (dirty rectangles). Skip identical frames entirely.
