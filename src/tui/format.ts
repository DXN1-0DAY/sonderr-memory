export function formatMemoryContent(content: string): string {
  let text = content.trim();
  text = text.replace(/^(#{1,6}\s.+)$/gm, "$1\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text;
}

export function formatPreviewText(content: string, maxLen = 100): string {
  const firstLine = content.split("\n")[0].trim();
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen - 3).trimEnd() + "...";
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function tag(theme: { heading: string; label: string; muted: string; divider: string }) {
  return {
    bold: (text: string) => `{bold}${text}{/bold}`,
    heading: (text: string) => `{bold}{fg-${theme.heading}}${text}{/fg-${theme.heading}}{/bold}`,
    muted: (text: string) => `{fg-${theme.muted}}${text}{/fg-${theme.muted}}`,
    label: (text: string) => `{bold}${text}{/bold}`,
    row: (label: string, value: string, valueColor?: string) => {
      const color = valueColor || theme.muted;
      return `{bold}${label}{/bold}{fg-${color}} ${value}{/fg-${color}}`;
    },
    divider: () => `{fg-${theme.divider}}${"─".repeat(30)}{/fg-${theme.divider}}`,
  };
}

