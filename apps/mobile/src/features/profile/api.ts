/**
 * Profile feature — the Phase 0 exemplar every future feature copies:
 * shared Zod schema → validated input → supabase-js under RLS → typed Result.
 * Components never touch the supabase client directly (rules.md §3).
 */
import {
  ERROR_CODES,
  err,
  ok,
  onboardingSchema,
  profileUpdateSchema,
  type OnboardingInput,
  type ProfileUpdateInput,
  type Result,
} from "@nexlex/shared";
import type { Database } from "@nexlex/db";

import { supabase } from "@/lib/supabase";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getMyProfile(): Promise<Result<Profile>> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return err(ERROR_CODES.UNAUTHORIZED, "Please sign in again.");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  if (error) return err(ERROR_CODES.INTERNAL, "Couldn't load your profile. Pull to retry.");
  return ok(data);
}

export async function updateMyProfile(input: ProfileUpdateInput): Promise<Result<Profile>> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your details.";
    return err(ERROR_CODES.VALIDATION_FAILED, message);
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return err(ERROR_CODES.UNAUTHORIZED, "Please sign in again.");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...(parsed.data.displayName !== undefined && { display_name: parsed.data.displayName }),
      ...(parsed.data.role !== undefined && { role: parsed.data.role }),
      ...(parsed.data.examTargets !== undefined && { exam_targets: parsed.data.examTargets }),
    })
    .eq("id", auth.user.id)
    .select()
    .single();

  if (error) return err(ERROR_CODES.INTERNAL, "Couldn't save changes. Please try again.");
  return ok(data);
}

export async function completeOnboarding(input: OnboardingInput): Promise<Result<Profile>> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your details.";
    return err(ERROR_CODES.VALIDATION_FAILED, message);
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return err(ERROR_CODES.UNAUTHORIZED, "Please sign in again.");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      role: parsed.data.role,
      exam_targets: parsed.data.examTargets,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", auth.user.id)
    .select()
    .single();

  if (error) return err(ERROR_CODES.INTERNAL, "Couldn't finish setup. Please try again.");
  return ok(data);
}
