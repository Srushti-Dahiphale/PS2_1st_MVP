// src/lib/error-handling/media.ts

import { createError } from "./app-error";
import { ErrorCode, EvidenceRole, ProgramDomain } from "./types";
import { GeoPoint } from "./geolocation";

export interface MediaQualityMetrics {
  blurScore?: number;
  brightnessScore?: number;
  duplicateScore?: number;
  visibilityScore?: number;
}

export interface MediaFile {
  id: string;
  domain: ProgramDomain;
  projectId: string;
  evidenceRole: EvidenceRole;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  bytes?: Uint8Array;
  blob?: Blob;
  url?: string;
  checksum?: string;
  externalId?: string;
  assetId?: string;
  stepId?: string;
  capturedAt?: string;
  uploadedAt?: string;
  offlineCapturedAt?: string;
  location?: GeoPoint;
  quality?: MediaQualityMetrics;
  integrityChecksumVerified?: boolean;
}

export interface MediaQualityRules {
  minBlurScore?: number;
  minBrightnessScore?: number;
  maxDuplicateScore?: number;
  requireQualityMetrics?: boolean;
}

export interface MediaValidationOptions extends MediaQualityRules {
  allowedMimeTypes: string[];
  maxImageBytes: number;
  maxVideoBytes: number;
}

export interface DuplicateDetector {
  findByChecksum?(checksum: string): Promise<string | null>;
  findByContentHash?(hash: string): Promise<string | null>;
  findByExternalId?(domain: ProgramDomain, externalId: string): Promise<string | null>;
}

export const DEFAULT_ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm"
];

function detectMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 12) {
    return null;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "video/mp4";
  }

  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }

  return null;
}

async function toBytes(file: MediaFile): Promise<Uint8Array | null> {
  if (file.bytes) {
    return file.bytes;
  }

  if (file.blob) {
    const buffer = await file.blob.arrayBuffer();
    return new Uint8Array(buffer);
  }

  return null;
}

export async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw createError(ErrorCode.MEDIA_PROCESSING_FAILED, {
      developerMessage: "Web Crypto is unavailable for checksum computation."
    });
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function validateMediaFileAsync(
  file: MediaFile,
  options: MediaValidationOptions
): Promise<void> {
  if (!file) {
    throw createError(ErrorCode.MISSING_EVIDENCE);
  }

  if (!file.filename || !file.mimeType) {
    throw createError(ErrorCode.MISSING_REQUIRED_FIELD, {
      details: {
        id: file.id,
        missing: !file.filename ? "filename" : "mimeType"
      }
    });
  }

  if (typeof file.sizeBytes !== "number" || file.sizeBytes <= 0) {
    throw createError(ErrorCode.MEDIA_DAMAGED, {
      details: { id: file.id }
    });
  }

  if (!options.allowedMimeTypes.includes(file.mimeType)) {
    throw createError(ErrorCode.MEDIA_FORMAT_UNSUPPORTED, {
      details: {
        id: file.id,
        mimeType: file.mimeType,
        allowedMimeTypes: options.allowedMimeTypes
      }
    });
  }

  const maxBytes = file.mimeType.startsWith("video/")
    ? options.maxVideoBytes
    : options.maxImageBytes;

  if (file.sizeBytes > maxBytes) {
    throw createError(ErrorCode.MEDIA_TOO_LARGE, {
      details: {
        id: file.id,
        sizeBytes: file.sizeBytes,
        maxBytes
      }
    });
  }

  const bytes = await toBytes(file);

  if (!bytes && !file.url) {
    throw createError(ErrorCode.MEDIA_INACCESSIBLE, {
      details: { id: file.id }
    });
  }

  if (bytes) {
    if (bytes.byteLength === 0) {
      throw createError(ErrorCode.MEDIA_CORRUPT, {
        details: { id: file.id }
      });
    }

    const detectedMime = detectMimeFromMagicBytes(bytes);

    if (!detectedMime) {
      throw createError(ErrorCode.MEDIA_CORRUPT, {
        details: {
          id: file.id,
          filename: file.filename
        }
      });
    }

    if (detectedMime !== file.mimeType) {
      throw createError(ErrorCode.MEDIA_INVALID, {
        details: {
          id: file.id,
          declaredMimeType: file.mimeType,
          detectedMimeType: detectedMime
        }
      });
    }
  }

  if (file.checksum && file.integrityChecksumVerified === false) {
    throw createError(ErrorCode.CHECKSUM_MISMATCH, {
      details: {
        id: file.id,
        checksum: file.checksum
      }
    });
  }
}

export function validateMediaQuality(
  file: MediaFile,
  rules: MediaQualityRules
): void {
  if (!file.quality) {
    if (rules.requireQualityMetrics) {
      throw createError(ErrorCode.INSUFFICIENT_EVIDENCE_QUALITY, {
        details: {
          id: file.id,
          reason: "Quality metrics missing."
        }
      });
    }
    return;
  }

  if (
    typeof rules.minBlurScore === "number" &&
    typeof file.quality.blurScore === "number" &&
    file.quality.blurScore < rules.minBlurScore
  ) {
    throw createError(ErrorCode.MEDIA_BLURRY, {
      details: {
        id: file.id,
        blurScore: file.quality.blurScore,
        minBlurScore: rules.minBlurScore
      }
    });
  }

  if (
    typeof rules.minBrightnessScore === "number" &&
    typeof file.quality.brightnessScore === "number" &&
    file.quality.brightnessScore < rules.minBrightnessScore
  ) {
    throw createError(ErrorCode.MEDIA_LOW_LIGHT, {
      details: {
        id: file.id,
        brightnessScore: file.quality.brightnessScore,
        minBrightnessScore: rules.minBrightnessScore
      }
    });
  }

  if (
    typeof rules.maxDuplicateScore === "number" &&
    typeof file.quality.duplicateScore === "number" &&
    file.quality.duplicateScore > rules.maxDuplicateScore
  ) {
    throw createError(ErrorCode.DUPLICATE_MEDIA, {
      details: {
        id: file.id,
        duplicateScore: file.quality.duplicateScore,
        maxDuplicateScore: rules.maxDuplicateScore
      }
    });
  }
}

export async function validateNotDuplicate(
  file: MediaFile,
  detector?: DuplicateDetector
): Promise<void> {
  if (!detector) {
    return;
  }

  if (file.checksum && detector.findByChecksum) {
    const existingId = await detector.findByChecksum(file.checksum);

    if (existingId && existingId !== file.id) {
      if (
        file.domain === ProgramDomain.RiverCleanup &&
        file.evidenceRole === EvidenceRole.CleanupLog
      ) {
        throw createError(ErrorCode.DUPLICATE_CLEANUP_LOG, {
          details: {
            id: file.id,
            existingId,
            checksum: file.checksum
          }
        });
      }

      throw createError(ErrorCode.DUPLICATE_MEDIA, {
        details: {
          id: file.id,
          existingId,
          checksum: file.checksum
        }
      });
    }
  }

  if (
    file.externalId &&
    file.domain === ProgramDomain.RiverCleanup &&
    detector.findByExternalId
  ) {
    const existingId = await detector.findByExternalId(file.domain, file.externalId);

    if (existingId && existingId !== file.id) {
      throw createError(ErrorCode.DUPLICATE_CLEANUP_LOG, {
        details: {
          id: file.id,
          existingId,
          externalId: file.externalId
        }
      });
    }
  }
}
