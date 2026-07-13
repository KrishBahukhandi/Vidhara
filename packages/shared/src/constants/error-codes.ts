/**
 * Central error-code enum (rules.md §5). Every `{ ok: false }` result and every
 * /api/v1 error envelope uses one of these codes — never ad-hoc strings.
 */
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  UPGRADE_REQUIRED: "UPGRADE_REQUIRED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface AppError {
  code: ErrorCode;
  message: string;
}

/** Uniform result contract for actions/mutations (architecture.md §9). */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never>(code: ErrorCode, message: string): Result<T> => ({
  ok: false,
  error: { code, message },
});
