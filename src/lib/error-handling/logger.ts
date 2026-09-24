// src/lib/error-handling/logger.ts

import { toAppError } from "./app-error";
import { ErrorSeverity } from "./types";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = new Set([
  "authorization",
  "auth",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "apiSecret",
  "secret",
  "password",
  "cookie",
  "signature",
  "cloudinarySecret",
  "x-api-key"
]);

function redactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return Array.from(SENSITIVE_KEYS).some((sensitive) =>
    normalized.includes(sensitive.toLowerCase())
  );
}

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[MAX_DEPTH]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "function") {
    return "[FUNCTION]";
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (typeof Uint8Array !== "undefined" && value instanceof Uint8Array) {
    return {
      type: "Uint8Array",
      length: value.byteLength
    };
  }

  if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) {
    return {
      type: "ArrayBuffer",
      byteLength: value.byteLength
    };
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return {
      type: "Blob",
      size: value.size,
      mimeType: value.type
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = redactKey(key)
        ? REDACTED
        : redactSensitive(entry, depth + 1);
    }

    return output;
  }

  return String(value);
}

export interface LogInput {
  level: "info" | "warn" | "error" | "critical";
  message: string;
  code?: string;
  category?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

export function logEntry(entry: LogInput): void {
  const payload = {
    time: new Date().toISOString(),
    level: entry.level,
    message: entry.message,
    code: entry.code,
    category: entry.category,
    context: redactSensitive(entry.context ?? {}),
    error: redactSensitive(entry.error)
  };

  if (entry.level === "info") {
    console.info(JSON.stringify(payload));
    return;
  }

  if (entry.level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.error(JSON.stringify(payload));
}

export function logError(error: unknown, context?: Record<string, unknown>): void {
  const appError = toAppError(error, context);

  logEntry({
    level:
      appError.severity === ErrorSeverity.Critical
        ? "critical"
        : appError.severity === ErrorSeverity.Warning
          ? "warn"
          : "error",
    message: appError.developerMessage,
    code: appError.code,
    category: appError.category,
    context: appError.context,
    error: appError.toJSON()
  });
}

export function logWarning(message: string, context?: Record<string, unknown>): void {
  logEntry({
    level: "warn",
    message,
    context
  });
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  logEntry({
    level: "info",
    message,
    context
  });
}
