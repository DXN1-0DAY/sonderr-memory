export type Theme = {
  fg: string;
  bg: string;
  bgPanel: string;
  accent: string;
  accentLight: string;
  border: { type: "line"; fg: string };
  focusBorder: { fg: string };
  selected: { bg: string; fg: string };
  cancelBg: string;
  cancelFocus: string;
  error: string;
  success: string;
  heading: string;
  muted: string;
  label: string;
  divider: string;
};

export function createTheme(config: { theme: { bg: string; fg: string; accent: string } }): Theme {
  const bg = config.theme.bg;
  const fg = config.theme.fg;
  const accent = config.theme.accent;

  const accentLight =
    accent === "#ffffff" ? "#cccccc" : accent === "#cc5500" ? "#e06600" : "#ff8533";

  const bgPanel =
    bg === "#f5f5f5" ? "#ffffff" : bg === "#000000" ? "#0a0a0a" : "#1a1a1a";

  const selectedFg = bg;

  const heading = accent;
  const muted = bg === "#f5f5f5" ? "#888888" : "#666666";
  const label = accent;
  const divider = accent;

  return {
    fg,
    bg,
    bgPanel,
    accent,
    accentLight,
    border: { type: "line", fg: accent },
    focusBorder: { fg: accent },
    selected: { bg: accent, fg: selectedFg },
    cancelBg: bg === "#f5f5f5" ? "#dddddd" : "#333333",
    cancelFocus: bg === "#f5f5f5" ? "#cccccc" : "#444444",
    error: "#ff5555",
    success: "#50fa7b",
    heading,
    muted,
    label,
    divider,
  };
}
