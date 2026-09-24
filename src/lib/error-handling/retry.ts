// src/lib/error-handling/retry.ts

import { toAppError } from "./app-error";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableError(error: unknown): boolean {
  const appError = toAppError(error);
  return appError.retryable;
}

function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * baseDelayMs;
  return Math.min(maxDelayMs, exponential + jitter);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const canRetry =
        attempt < maxAttempts &&
        (options.shouldRetry
          ? options.shouldRetry(error, attempt)
          : isRetryableError(error));

      if (!canRetry) {
        throw toAppError(error);
      }

      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs);
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  throw toAppError(lastError);
}
