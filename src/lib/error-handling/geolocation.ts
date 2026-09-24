// src/lib/error-handling/geolocation.ts

import { createError } from "./app-error";
import { ErrorCode } from "./types";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp?: string;
  source?: string;
  offline?: boolean;
}

export interface ProjectGeoContext {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface GeoValidationOptions {
  required?: boolean;
  maxAccuracyMeters?: number;
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function haversineDistanceMeters(
  from: Pick<GeoPoint, "latitude" | "longitude">,
  to: Pick<GeoPoint, "latitude" | "longitude">
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function validateGeoLocation(
  location: GeoPoint | null | undefined,
  options: GeoValidationOptions = {}
): void {
  if (!location) {
    if (options.required) {
      throw createError(ErrorCode.GEO_MISSING);
    }
    return;
  }

  if (
    !isValidCoordinate(location.latitude) ||
    !isValidCoordinate(location.longitude) ||
    Math.abs(location.latitude) > 90 ||
    Math.abs(location.longitude) > 180
  ) {
    throw createError(ErrorCode.GEO_INVALID, {
      details: { location }
    });
  }

  if (
    typeof options.maxAccuracyMeters === "number" &&
    typeof location.accuracyMeters === "number" &&
    location.accuracyMeters > options.maxAccuracyMeters
  ) {
    throw createError(ErrorCode.GPS_DRIFT, {
      details: {
        accuracyMeters: location.accuracyMeters,
        maxAccuracyMeters: options.maxAccuracyMeters
      }
    });
  }
}

export function validateGeoWithinProject(
  location: GeoPoint,
  project: ProjectGeoContext,
  maxDistanceMeters?: number
): void {
  if (project.boundingBox) {
    const { north, south, east, west } = project.boundingBox;
    const outside =
      location.latitude > north ||
      location.latitude < south ||
      location.longitude > east ||
      location.longitude < west;

    if (outside) {
      throw createError(ErrorCode.GEO_OUT_OF_BOUNDS, {
        details: { location, project }
      });
    }
  }

  if (
    typeof project.latitude === "number" &&
    typeof project.longitude === "number" &&
    typeof maxDistanceMeters === "number"
  ) {
    const distance = haversineDistanceMeters(location, project);

    if (distance > maxDistanceMeters) {
      throw createError(ErrorCode.GPS_MISMATCH, {
        details: {
          distanceMeters: distance,
          maxDistanceMeters,
          location,
          project
        }
      });
    }
  }
}

export function validateGeoTimestamp(
  location: GeoPoint,
  capturedAt: string,
  maxDriftMs = 24 * 60 * 60 * 1000
): void {
  if (!location.timestamp || !capturedAt) {
    return;
  }

  const locationTime = Date.parse(location.timestamp);
  const captureTime = Date.parse(capturedAt);

  if (Number.isNaN(locationTime) || Number.isNaN(captureTime)) {
    throw createError(ErrorCode.INVALID_TIMESTAMP, {
      details: {
        locationTimestamp: location.timestamp,
        capturedAt
      }
    });
  }

  const drift = Math.abs(locationTime - captureTime);

  if (drift > maxDriftMs) {
    throw createError(ErrorCode.GEO_TIMESTAMP_MISMATCH, {
      details: {
        driftMs: drift,
        maxDriftMs,
        locationTimestamp: location.timestamp,
        capturedAt
      }
    });
  }
}

export function validateOfflineCapture(input: {
  offlineCapturedAt?: string;
  capturedAt?: string;
  requiresLocation?: boolean;
  location?: GeoPoint | null;
}): void {
  if (!input.offlineCapturedAt) {
    return;
  }

  const offlineTime = Date.parse(input.offlineCapturedAt);

  if (Number.isNaN(offlineTime)) {
    throw createError(ErrorCode.OFFLINE_CAPTURE_INVALID, {
      details: {
        offlineCapturedAt: input.offlineCapturedAt
      }
    });
  }

  if (input.capturedAt) {
    const captureTime = Date.parse(input.capturedAt);

    if (Number.isNaN(captureTime)) {
      throw createError(ErrorCode.INVALID_TIMESTAMP, {
        details: {
          capturedAt: input.capturedAt
        }
      });
    }

    if (captureTime < offlineTime) {
      throw createError(ErrorCode.TIMESTAMP_CONFLICT, {
        details: {
          capturedAt: input.capturedAt,
          offlineCapturedAt: input.offlineCapturedAt
        }
      });
    }
  }

  if (input.requiresLocation && !input.location) {
    throw createError(ErrorCode.OFFLINE_SYNC_REQUIRED, {
      details: {
        offlineCapturedAt: input.offlineCapturedAt
      }
    });
  }
}
