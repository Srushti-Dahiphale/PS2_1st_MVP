// src/lib/error-handling/definitions.ts

import {
  ErrorCategory,
  ErrorCode,
  ErrorSeverity,
  Recoverability
} from "./types";

export interface ErrorDefinition {
  category: ErrorCategory;
  httpStatus: number;
  severity: ErrorSeverity;
  recoverable: Recoverability;
  retryable: boolean;
  userMessage: string;
  developerMessage: string;
}

function define(
  category: ErrorCategory,
  httpStatus: number,
  developerMessage: string,
  overrides: Partial<Omit<ErrorDefinition, "category" | "httpStatus" | "developerMessage">> = {}
): ErrorDefinition {
  return {
    category,
    httpStatus,
    developerMessage,
    severity: overrides.severity ?? ErrorSeverity.Error,
    recoverable: overrides.recoverable ?? Recoverability.RecoverableWithUserAction,
    retryable: overrides.retryable ?? false,
    userMessage: overrides.userMessage ?? developerMessage
  };
}

export const ERROR_DEFINITIONS: Record<ErrorCode, ErrorDefinition> = {
  [ErrorCode.UNKNOWN]: define(
    ErrorCategory.Internal,
    500,
    "An unknown error occurred.",
    {
      severity: ErrorSeverity.Critical,
      recoverable: Recoverability.NonRecoverable,
      userMessage: "Something went wrong. Please try again."
    }
  ),
  [ErrorCode.INTERNAL]: define(
    ErrorCategory.Internal,
    500,
    "An internal server error occurred.",
    {
      severity: ErrorSeverity.Critical,
      recoverable: Recoverability.NonRecoverable,
      userMessage: "Something went wrong. Please try again."
    }
  ),
  [ErrorCode.VALIDATION_FAILED]: define(
    ErrorCategory.Validation,
    400,
    "One or more validation checks failed.",
    { userMessage: "The submitted information is invalid." }
  ),
  [ErrorCode.INVALID_INPUT]: define(
    ErrorCategory.Validation,
    400,
    "Input is invalid.",
    { userMessage: "Please correct the input and try again." }
  ),
  [ErrorCode.MISSING_REQUIRED_FIELD]: define(
    ErrorCategory.Validation,
    400,
    "A required field is missing.",
    { userMessage: "Required information is missing." }
  ),
  [ErrorCode.INVALID_ENUM_VALUE]: define(
    ErrorCategory.Validation,
    400,
    "An invalid enum value was provided.",
    { userMessage: "One of the selected values is invalid." }
  ),
  [ErrorCode.INVALID_DATE]: define(
    ErrorCategory.Validation,
    400,
    "A date value is invalid.",
    { userMessage: "Please provide a valid date." }
  ),
  [ErrorCode.INVALID_TIMESTAMP]: define(
    ErrorCategory.Validation,
    400,
    "A timestamp is invalid.",
    { userMessage: "Please provide a valid timestamp." }
  ),
  [ErrorCode.TIMESTAMP_CONFLICT]: define(
    ErrorCategory.Validation,
    409,
    "Evidence timestamps conflict.",
    { userMessage: "The evidence timestamps conflict. Review and correct them." }
  ),
  [ErrorCode.STEP_ORDER_VIOLATION]: define(
    ErrorCategory.DomainVerification,
    409,
    "Workflow steps are out of order.",
    { userMessage: "The submitted steps are out of order." }
  ),
  [ErrorCode.DUPLICATE_RECORD]: define(
    ErrorCategory.Conflict,
    409,
    "A duplicate record was detected.",
    { userMessage: "This record already exists." }
  ),
  [ErrorCode.DUPLICATE_MEDIA]: define(
    ErrorCategory.Conflict,
    409,
    "Duplicate media was detected.",
    { userMessage: "This media has already been submitted." }
  ),
  [ErrorCode.DUPLICATE_CLEANUP_LOG]: define(
    ErrorCategory.Conflict,
    409,
    "Duplicate cleanup log detected.",
    { userMessage: "This cleanup log has already been submitted." }
  ),
  [ErrorCode.INTEGRITY_CHECK_FAILED]: define(
    ErrorCategory.Integrity,
    422,
    "An integrity check failed.",
    { userMessage: "Evidence integrity could not be verified." }
  ),
  [ErrorCode.CHECKSUM_MISMATCH]: define(
    ErrorCategory.Integrity,
    422,
    "Checksum verification failed.",
    { userMessage: "The file failed integrity verification." }
  ),
  [ErrorCode.EVIDENCE_INCOMPLETE]: define(
    ErrorCategory.DomainVerification,
    422,
    "Required evidence is incomplete.",
    { userMessage: "Required evidence is incomplete." }
  ),
  [ErrorCode.PARTIAL_EVIDENCE_SET]: define(
    ErrorCategory.DomainVerification,
    422,
    "A partial evidence set was submitted.",
    { userMessage: "The evidence set is incomplete." }
  ),
  [ErrorCode.MISSING_EVIDENCE]: define(
    ErrorCategory.DomainVerification,
    422,
    "Required evidence is missing.",
    { userMessage: "Required evidence is missing." }
  ),
  [ErrorCode.MISSING_BEFORE_EVIDENCE]: define(
    ErrorCategory.DomainVerification,
    422,
    "Before evidence is missing.",
    { userMessage: "Before evidence is missing." }
  ),
  [ErrorCode.MISSING_AFTER_EVIDENCE]: define(
    ErrorCategory.DomainVerification,
    422,
    "After evidence is missing.",
    { userMessage: "After evidence is missing." }
  ),
  [ErrorCode.BEFORE_AFTER_MAPPING_FAILED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Before and after evidence could not be mapped.",
    { userMessage: "Before and after evidence could not be matched." }
  ),
  [ErrorCode.VERIFICATION_FAILED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Domain verification failed.",
    { userMessage: "The evidence could not be verified." }
  ),
  [ErrorCode.INSUFFICIENT_EVIDENCE_QUALITY]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Evidence quality is insufficient.",
    { userMessage: "The media quality is insufficient for verification." }
  ),
  [ErrorCode.MEDIA_BLURRY]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Media is too blurry.",
    { userMessage: "The image is too blurry. Please capture a clearer photo." }
  ),
  [ErrorCode.MEDIA_LOW_LIGHT]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Media has insufficient lighting.",
    { userMessage: "The image is too dark. Please capture it in better lighting." }
  ),
  [ErrorCode.MEDIA_CORRUPT]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Media file is corrupt.",
    { userMessage: "The file appears to be corrupt." }
  ),
  [ErrorCode.MEDIA_DAMAGED]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Media file is damaged or empty.",
    { userMessage: "The file appears to be damaged or empty." }
  ),
  [ErrorCode.MEDIA_INACCESSIBLE]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Media is inaccessible.",
    { userMessage: "The media file could not be accessed." }
  ),
  [ErrorCode.MEDIA_FORMAT_UNSUPPORTED]: define(
    ErrorCategory.Unsupported,
    415,
    "Media format is unsupported.",
    { userMessage: "This file format is not supported." }
  ),
  [ErrorCode.MEDIA_TOO_LARGE]: define(
    ErrorCategory.Validation,
    413,
    "Media file exceeds the allowed size limit.",
    { userMessage: "The file is too large." }
  ),
  [ErrorCode.MEDIA_INVALID]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Media file is invalid.",
    { userMessage: "The media file is invalid." }
  ),
  [ErrorCode.MEDIA_PROCESSING_FAILED]: define(
    ErrorCategory.MediaProcessing,
    500,
    "Media processing failed.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Media processing failed. Please try again."
    }
  ),
  [ErrorCode.MEDIA_METADATA_EXTRACTION_FAILED]: define(
    ErrorCategory.MediaProcessing,
    422,
    "Metadata extraction failed.",
    { userMessage: "Required metadata could not be extracted." }
  ),
  [ErrorCode.UPLOAD_FAILED]: define(
    ErrorCategory.Storage,
    500,
    "Upload failed.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Upload failed. Please try again."
    }
  ),
  [ErrorCode.UPLOAD_INTERRUPTED]: define(
    ErrorCategory.Storage,
    500,
    "Upload was interrupted.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Upload was interrupted. Please retry."
    }
  ),
  [ErrorCode.STORAGE_UNAVAILABLE]: define(
    ErrorCategory.Storage,
    503,
    "Storage service is unavailable.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Storage is temporarily unavailable. Please try again."
    }
  ),
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: define(
    ErrorCategory.Storage,
    507,
    "Storage quota exceeded.",
    {
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "Storage quota exceeded. Free up space or contact support."
    }
  ),
  [ErrorCode.STORAGE_PERMISSION_DENIED]: define(
    ErrorCategory.Authorization,
    403,
    "Storage permission denied.",
    {
      recoverable: Recoverability.NonRecoverable,
      userMessage: "Storage permission denied."
    }
  ),
  [ErrorCode.OBJECT_NOT_FOUND]: define(
    ErrorCategory.NotFound,
    404,
    "Requested object was not found.",
    { userMessage: "The requested item was not found." }
  ),
  [ErrorCode.NETWORK_OFFLINE]: define(
    ErrorCategory.Network,
    503,
    "Network is offline.",
    {
      retryable: true,
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "You appear to be offline. Reconnect and try again."
    }
  ),
  [ErrorCode.NETWORK_UNSTABLE]: define(
    ErrorCategory.Network,
    503,
    "Network connection is unstable.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Network connection is unstable. Please retry."
    }
  ),
  [ErrorCode.NETWORK_REQUEST_FAILED]: define(
    ErrorCategory.Network,
    502,
    "Network request failed.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Network request failed. Please try again."
    }
  ),
  [ErrorCode.NETWORK_TIMEOUT]: define(
    ErrorCategory.Timeout,
    504,
    "Network request timed out.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "The request timed out. Please try again."
    }
  ),
  [ErrorCode.DEPENDENCY_UNAVAILABLE]: define(
    ErrorCategory.Dependency,
    503,
    "A required dependency is unavailable.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "A required service is temporarily unavailable."
    }
  ),
  [ErrorCode.RATE_LIMITED]: define(
    ErrorCategory.RateLimit,
    429,
    "Rate limit exceeded.",
    {
      retryable: true,
      recoverable: Recoverability.Recoverable,
      userMessage: "Too many requests. Please wait and retry."
    }
  ),
  [ErrorCode.AUTH_REQUIRED]: define(
    ErrorCategory.Authentication,
    401,
    "Authentication is required.",
    {
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "Please sign in."
    }
  ),
  [ErrorCode.AUTH_TOKEN_INVALID]: define(
    ErrorCategory.Authentication,
    401,
    "Authentication token is invalid.",
    {
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "Your session is invalid. Please sign in again."
    }
  ),
  [ErrorCode.AUTH_TOKEN_EXPIRED]: define(
    ErrorCategory.Authentication,
    401,
    "Authentication token has expired.",
    {
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "Your session has expired. Please sign in again."
    }
  ),
  [ErrorCode.AUTH_FORBIDDEN]: define(
    ErrorCategory.Authorization,
    403,
    "Access is forbidden.",
    {
      recoverable: Recoverability.NonRecoverable,
      userMessage: "You do not have access to this action."
    }
  ),
  [ErrorCode.AUTH_INSUFFICIENT_ROLE]: define(
    ErrorCategory.Authorization,
    403,
    "User role is insufficient.",
    {
      recoverable: Recoverability.NonRecoverable,
      userMessage: "You do not have the required role."
    }
  ),
  [ErrorCode.AUTH_PROGRAM_ACCESS_DENIED]: define(
    ErrorCategory.Authorization,
    403,
    "Program access denied.",
    {
      recoverable: Recoverability.NonRecoverable,
      userMessage: "You do not have access to this program."
    }
  ),
  [ErrorCode.GEO_MISSING]: define(
    ErrorCategory.Geolocation,
    422,
    "Geolocation data is missing.",
    { userMessage: "Location information is missing." }
  ),
  [ErrorCode.GEO_INVALID]: define(
    ErrorCategory.Geolocation,
    422,
    "Geolocation data is invalid.",
    { userMessage: "Location information is invalid." }
  ),
  [ErrorCode.GPS_MISMATCH]: define(
    ErrorCategory.Geolocation,
    422,
    "GPS location does not match the expected project area.",
    { userMessage: "The captured location does not match the expected site." }
  ),
  [ErrorCode.GPS_DRIFT]: define(
    ErrorCategory.Geolocation,
    422,
    "GPS accuracy is too low or location drift detected.",
    { userMessage: "GPS accuracy is too low. Please recapture location." }
  ),
  [ErrorCode.GEO_OUT_OF_BOUNDS]: define(
    ErrorCategory.Geolocation,
    422,
    "Geolocation is outside allowed bounds.",
    { userMessage: "The location is outside the allowed area." }
  ),
  [ErrorCode.GEO_TIMESTAMP_MISMATCH]: define(
    ErrorCategory.Geolocation,
    422,
    "Geolocation timestamp conflicts with capture timestamp.",
    { userMessage: "Location timestamp does not match capture time." }
  ),
  [ErrorCode.OFFLINE_CAPTURE_INVALID]: define(
    ErrorCategory.OfflineSync,
    422,
    "Offline capture metadata is invalid.",
    { userMessage: "Offline capture data is invalid." }
  ),
  [ErrorCode.OFFLINE_SYNC_REQUIRED]: define(
    ErrorCategory.OfflineSync,
    409,
    "Offline data must be synchronized.",
    {
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "Please sync offline data before continuing."
    }
  ),
  [ErrorCode.OFFLINE_QUEUE_CORRUPT]: define(
    ErrorCategory.OfflineSync,
    422,
    "Offline queue is corrupt.",
    {
      recoverable: Recoverability.RecoverableWithUserAction,
      userMessage: "Offline queue is corrupt. Re-sync or re-capture evidence."
    }
  ),
  [ErrorCode.REFORESTATION_SAPLING_SURVIVAL_UNVERIFIED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Sapling survival evidence could not be verified.",
    { userMessage: "Sapling survival evidence could not be verified." }
  ),
  [ErrorCode.REFORESTATION_ECOSYSTEM_RECOVERY_UNVERIFIED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Ecosystem recovery evidence could not be verified.",
    { userMessage: "Ecosystem recovery evidence could not be verified." }
  ),
  [ErrorCode.REFORESTATION_PLOT_MISMATCH]: define(
    ErrorCategory.DomainVerification,
    422,
    "Reforestation plot location mismatch.",
    { userMessage: "The reforestation plot location does not match." }
  ),
  [ErrorCode.RIVER_CLEANUP_LOG_INVALID]: define(
    ErrorCategory.DomainVerification,
    422,
    "River cleanup log is invalid.",
    { userMessage: "The river cleanup log is invalid." }
  ),
  [ErrorCode.RIVER_AQUATIC_HEALTH_UNVERIFIED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Aquatic health evidence could not be verified.",
    { userMessage: "Aquatic health evidence could not be verified." }
  ),
  [ErrorCode.RIVER_TRASH_REMOVAL_UNVERIFIED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Trash removal evidence could not be verified.",
    { userMessage: "Trash removal evidence could not be verified." }
  ),
  [ErrorCode.WATER_ASSET_ID_INVALID]: define(
    ErrorCategory.DomainVerification,
    422,
    "Water/sanitation asset ID is invalid.",
    { userMessage: "The asset ID is invalid." }
  ),
  [ErrorCode.WATER_STRUCTURAL_INSPECTION_FAILED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Structural inspection failed or missing.",
    { userMessage: "Structural inspection evidence failed or is missing." }
  ),
  [ErrorCode.WATER_SANITATION_VERIFICATION_FAILED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Water/sanitation verification failed.",
    { userMessage: "Water/sanitation verification failed." }
  ),
  [ErrorCode.INFRASTRUCTURE_INTEGRITY_FAILED]: define(
    ErrorCategory.Integrity,
    422,
    "Infrastructure integrity check failed.",
    { userMessage: "Infrastructure integrity check failed." }
  ),
  [ErrorCode.DISASTER_DAMAGE_ASSESSMENT_INCOMPLETE]: define(
    ErrorCategory.DomainVerification,
    422,
    "Disaster damage assessment is incomplete.",
    { userMessage: "Disaster damage assessment is incomplete." }
  ),
  [ErrorCode.DISASTER_STRUCTURAL_SAFETY_UNVERIFIED]: define(
    ErrorCategory.DomainVerification,
    422,
    "Structural safety evidence could not be verified.",
    { userMessage: "Structural safety evidence could not be verified." }
  ),
  [ErrorCode.DISASTER_LOCATION_DRIFT]: define(
    ErrorCategory.Geolocation,
    422,
    "Disaster recovery location drift detected.",
    { userMessage: "Location drift detected. Please verify GPS capture." }
  ),
  [ErrorCode.DISASTER_TIMESTAMP_CONFLICT]: define(
    ErrorCategory.DomainVerification,
    409,
    "Disaster recovery timestamps conflict.",
    { userMessage: "Disaster evidence timestamps conflict." }
  ),
  [ErrorCode.CONFLICT]: define(
    ErrorCategory.Conflict,
    409,
    "A conflict occurred.",
    { userMessage: "A conflict occurred. Review the submitted data." }
  ),
  [ErrorCode.NOT_FOUND]: define(
    ErrorCategory.NotFound,
    404,
    "Resource not found.",
    { userMessage: "The requested resource was not found." }
  ),
  [ErrorCode.UNSUPPORTED_PROGRAM_DOMAIN]: define(
    ErrorCategory.Unsupported,
    400,
    "Unsupported program domain.",
    { userMessage: "This program domain is not supported." }
  )
};
