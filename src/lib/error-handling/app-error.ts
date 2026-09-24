// src/lib/error-handling/app-error.ts

import { ERROR_DEFINITIONS } from "./definitions";
import {
  ErrorCategory,
  ErrorCode,
  ErrorSeverity,
  Recoverability,
  SerializedError
} from "./types";

export interface AppErrorOptions {
  message?: string;
  developerMessage?: string;
  userMessage?: string;
  httpStatus?: number;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  recoverable?: Recoverability;
  retryable?: boolean;
  details?: Record<string, unknown>;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly isAppError = true as const;
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly httpStatus: number;
  readonly severity: ErrorSeverity;
  readonly recoverable: Recoverability;
  readonly retryable: boolean;
  readonly userMessage: string;
  readonly developerMessage: string;
  readonly details?: Record<string, unknown>;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const definition = ERROR_DEFINITIONS[code] ?? ERROR_DEFINITIONS[ErrorCode.UNKNOWN];
    const developerMessage = options.developerMessage ?? options.message ?? definition.developerMessage;

    super(developerMessage);

    this.name = "VergeTrackAppError";
    this.code = code;
    this.category = options.category ?? definition.category;
    this.httpStatus = options.httpStatus ?? definition.httpStatus;
    this.severity = options.severity ?? definition.severity;
    this.recoverable = options.recoverable ?? definition.recoverable;
    this.retryable = options.retryable ?? definition.retryable;
    this.userMessage = options.userMessage ?? definition.userMessage;
    this.developerMessage = developerMessage;
    this.details = options.details;
    this.context = options.context;
    this.cause = options.cause;

    const errorConstructor = Error as unknown as {
      captureStackTrace?: (target: object, constructor: object) => void;
    };

    if (typeof errorConstructor.captureStackTrace === "function") {
      errorConstructor.captureStackTrace(this, AppError);
    }
  }

  withContext(context: Record<string, unknown>): AppError {
    return new AppError(this.code, {
      message: this.developerMessage,
      developerMessage: this.developerMessage,
      userMessage: this.userMessage,
      httpStatus: this.httpStatus,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      details: this.details,
      cause: this.cause,
      context: {
        ...(this.context ?? {}),
        ...context
      }
    });
  }

  toPublicError() {
    return {
      code: this.code,
      category: this.category,
      message: this.userMessage,
      recoverable: this.recoverable,
      retryable: this.retryable,
      details: this.details
    };
  }

  toJSON(): SerializedError {
    const includeStack =
      typeof process !== "undefined" && process.env?.NODE_ENV === "development";

    return {
      code: this.code,
      category: this.category,
      httpStatus: this.httpStatus,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      message: this.developerMessage,
      userMessage: this.userMessage,
      details: this.details,
      context: this.context,
      stack: includeStack ? this.stack : undefined
    };
  }
}

export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof AppError ||
    (typeof error === "object" &&
      error !== null &&
      "isAppError" in error &&
      (error as { isAppError?: unknown }).isAppError === true)
  );
}

export function createError(code: ErrorCode, options?: AppErrorOptions): AppError {
  return new AppError(code, options);
}

export function toAppError(error: unknown, context?: Record<string, unknown>): AppError {
  if (isAppError(error)) {
    return context ? error.withContext(context) : error;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return createError(ErrorCode.NETWORK_TIMEOUT, {
        cause: error,
        context,
        message: error.message
      });
    }

    if (error.name === "QuotaExceededError") {
      return createError(ErrorCode.STORAGE_QUOTA_EXCEEDED, {
        cause: error,
        context,
        message: error.message
      });
    }

    if (error.name === "NotAllowedError") {
      return createError(ErrorCode.STORAGE_PERMISSION_DENIED, {
        cause: error,
        context,
        message: error.message
      });
    }

    if (error.name === "NotFoundError") {
      return createError(ErrorCode.OBJECT_NOT_FOUND, {
        cause: error,
        context,
        message: error.message
      });
    }

    if (error instanceof TypeError) {
      return createError(ErrorCode.NETWORK_REQUEST_FAILED, {
        cause: error,
        context,
        message: error.message
      });
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && (Object.values(ErrorCode) as string[]).includes(maybeCode)) {
      return createError(maybeCode as ErrorCode, {
        cause: error,
        context,
        message: error.message
      });
    }

    return createError(ErrorCode.INTERNAL, {
      cause: error,
      context,
      message: error.message
    });
  }

  return createError(ErrorCode.UNKNOWN, {
    cause: error,
    context,
    message: typeof error === "string" ? error : undefined
  });
}
