export class TUIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "TUIError";
  }
}

export function safeAsync<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    return fallback;
  }
}

export function withErrorHandling<T>(fn: () => T, onError: (err: Error) => T): T {
  try {
    return fn();
  } catch (err) {
    return onError(err instanceof Error ? err : new Error(String(err)));
  }
}
