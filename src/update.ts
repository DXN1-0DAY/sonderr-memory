import { getStoreRoot } from "./utils/store-helpers";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const GITHUB_API = "https://api.github.com/repos/sonderr/sonderr-memory/releases/latest";
const CACHE_PATH = join(getStoreRoot(), ".update-check-cache");
const CACHE_TTL_MS = 1000 * 60 * 60;

export async function checkForUpdate(currentVersion: string): Promise<string | null> {
  try {
    if (existsSync(CACHE_PATH)) {
      const raw = readFileSync(CACHE_PATH, "utf-8");
      const cached = JSON.parse(raw);
      if (Date.now() - cached.ts < CACHE_TTL_MS && cached.latest) {
        return compareVersions(currentVersion, cached.latest) < 0 ? cached.latest : null;
      }
    }

    const res = await fetch(GITHUB_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout?.(5000) ?? undefined as any,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string; name?: string; html_url?: string };
    const latest = data.tag_name?.replace(/^v/, "") ?? null;
    if (!latest) return null;

    writeFileSync(CACHE_PATH, JSON.stringify({ ts: Date.now(), latest }), "utf-8");

    return compareVersions(currentVersion, latest) < 0 ? latest : null;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export function updateNotice(latest: string): string {
  return `update available: ${latest} (current: ${getCurrentVersion()})`;
}

export function getCurrentVersion(): string {
  return "0.0.02";
}
