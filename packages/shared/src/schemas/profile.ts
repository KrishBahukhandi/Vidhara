import { z } from "zod";

/**
 * Profile schemas — single source of truth for profile validation
 * (rules.md §7: apps import, never duplicate).
 */
export const USER_ROLES = ["student", "aspirant", "advocate", "professor", "other"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Exam targets shown during onboarding; free-text additions allowed via "other". */
export const EXAM_TARGETS = [
  "judiciary-pcsj",
  "clat-pg",
  "aibe",
  "net-jrf-law",
  "semester-exams",
  "moot-court",
  "none",
] as const;

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Please enter your name")
  .max(60, "Name must be 60 characters or fewer");

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema.optional(),
  role: z.enum(USER_ROLES).optional(),
  examTargets: z
    .array(z.string().trim().min(1).max(80))
    .max(10, "Choose at most 10 exam targets")
    .optional(),
});

export const onboardingSchema = z.object({
  displayName: displayNameSchema,
  role: z.enum(USER_ROLES),
  examTargets: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
