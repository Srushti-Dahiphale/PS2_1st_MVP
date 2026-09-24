// src/lib/error-handling/storage.ts

import { createError, toAppError } from "./app-error";
import { ErrorCode } from "./types";
import { RetryOptions, withRetry } from "./retry";

export interface StorageUploadInput {
  bytes?: Uint8Array;
  blob?: Blob;
  url?: string;
  filename: string;
  mimeType: string;
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw";
}

export interface StorageUploadResult {
  publicId: string;
  secureUrl: string;
  thumbnailUrl?: string;
  etag?: string;
  bytes?: number;
}

export interface StorageAdapter {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  delete?(publicId: string): Promise<void>;
}

export interface StorageErrorLike {
  statusCode?: number;
  status?: number;
  code?: string;
  message?: string;
}

function getStatus(error: unknown): number | undefined {
  const maybe = error as StorageErrorLike;
  return maybe.statusCode ?? maybe.status;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase();
  }

  const maybe = error as StorageErrorLike;
  return (maybe.message ?? "").toLowerCase();
}

export function mapStorageError(error: unknown, context?: Record<string, unknown>) {
  const appError = toAppError(error, context);
  if (appError.code !== ErrorCode.UNKNOWN && appError.code !== ErrorCode.INTERNAL) {
    return appError;
  }

  const status = getStatus(error);
  const message = getMessage(error);

  if (status === 401 || status === 403) {
    return createError(ErrorCode.STORAGE_PERMISSION_DENIED, { cause: error, context });
  }

  if (status === 404) {
    return createError(ErrorCode.OBJECT_NOT_FOUND, { cause: error, context });
  }

  if (status === 413) {
    return createError(ErrorCode.MEDIA_TOO_LARGE, { cause: error, context });
  }

  if (status === 429) {
    return createError(ErrorCode.RATE_LIMITED, { cause: error, context, retryable: true });
  }

  if (typeof status === "number" && status >= 500) {
    return createError(ErrorCode.STORAGE_UNAVAILABLE, { cause: error, context, retryable: true });
  }

  if (message.includes("quota")) {
    return createError(ErrorCode.STORAGE_QUOTA_EXCEEDED, { cause: error, context });
  }

  if (message.includes("abort")) {
    return createError(ErrorCode.UPLOAD_INTERRUPTED, { cause: error, context, retryable: true });
  }

  if (
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("network") ||
    message.includes("fetch failed")
  ) {
    return createError(ErrorCode.STORAGE_UNAVAILABLE, { cause: error, context, retryable: true });
  }

  return createError(ErrorCode.UPLOAD_FAILED, { cause: error, context, retryable: true });
}

export async function uploadWithRetries(
  adapter: StorageAdapter,
  input: StorageUploadInput,
  options: {
    retry?: RetryOptions;
    context?: Record<string, unknown>;
  } = {}
): Promise<StorageUploadResult> {
  try {
    return await withRetry(() => adapter.upload(input), options.retry);
  } catch (error) {
    throw mapStorageError(error, {
      ...(options.context ?? {}),
      filename: input.filename,
      mimeType: input.mimeType
    });
  }
}
