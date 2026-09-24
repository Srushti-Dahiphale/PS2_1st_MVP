// src/lib/error-handling/network.ts

import { createError, toAppError } from "./app-error";
import { ErrorCode } from "./types";
import { RetryOptions, withRetry } from "./retry";

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
  retry?: RetryOptions;
}

function mapHttpStatus(status: number, url: string) {
  const details = { status, url };

  switch (status) {
    case 401:
      return createError(ErrorCode.AUTH_REQUIRED, { details });
    case 403:
      return createError(ErrorCode.AUTH_FORBIDDEN, { details });
    case 404:
      return createError(ErrorCode.OBJECT_NOT_FOUND, { details });
    case 408:
      return createError(ErrorCode.NETWORK_TIMEOUT, { details });
    case 413:
      return createError(ErrorCode.MEDIA_TOO_LARGE, { details });
    case 415:
      return createError(ErrorCode.MEDIA_FORMAT_UNSUPPORTED, { details });
    case 429:
      return createError(ErrorCode.RATE_LIMITED, { details });
    case 502:
    case 503:
      return createError(ErrorCode.DEPENDENCY_UNAVAILABLE, { details });
    case 504:
      return createError(ErrorCode.NETWORK_TIMEOUT, { details });
    default:
      return createError(ErrorCode.DEPENDENCY_UNAVAILABLE, { details });
  }
}

function mapNetworkError(error: unknown, url: string) {
  const appError = toAppError(error, { url });

  if (appError.code !== ErrorCode.UNKNOWN && appError.code !== ErrorCode.INTERNAL) {
    return appError;
  }

  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return createError(ErrorCode.NETWORK_TIMEOUT, { cause: error, context: { url } });
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return createError(ErrorCode.NETWORK_OFFLINE, { cause: error, context: { url } });
  }

  if (error instanceof TypeError) {
    return createError(ErrorCode.NETWORK_REQUEST_FAILED, { cause: error, context: { url } });
  }

  return createError(ErrorCode.NETWORK_REQUEST_FAILED, { cause: error, context: { url } });
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 15_000, retry, ...init } = options;

  const request = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      if (!response.ok) {
        throw mapHttpStatus(response.status, url);
      }

      return response;
    } catch (error) {
      throw mapNetworkError(error, url);
    } finally {
      clearTimeout(timer);
    }
  };

  if (!retry) {
    return request();
  }

  return withRetry(request, retry);
}
