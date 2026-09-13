export class TUIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "TUIError";
  }
}

export function safeTry<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export async function safeAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export function withErrorHandling<T>(fn: () => T, onError: (err: TUIError) => T): T {
  try {
    return fn();
  } catch (raw) {
    const err = raw instanceof Error
      ? new TUIError(raw.message, undefined, raw)
      : new TUIError(String(raw));
    return onError(err);
  }
}

export function formatStatusError(err: TUIError): string {
  const base = ` ${err.message.slice(0, 38)} `;
  const hint = err.hint ? ` (${err.hint})` : "";
  return `${base}${hint}`;
}
