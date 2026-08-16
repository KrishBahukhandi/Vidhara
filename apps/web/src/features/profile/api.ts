/**
 * Profile feature — web. Twin of apps/mobile/src/features/profile/api.ts, on
 * the same `profiles` table under the same owner-only RLS (migration 0001:
 * select/update where auth.uid() = id, with the signup trigger doing the
 * insert). Components never touch the supabase client (rules.md §3).
 */
import {
  ERROR_CODES,
  err,
  ok,
  onboardingSchema,
  type OnboardingInput,
  type Result,
} from "@nexlex/shared";
import type { Database } from "@nexlex/db";

import { getBrowserClient } from "@/lib/supabase-browser";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const NOT_CONFIGURED = "Your profile isn't available right now. Please try again later.";

export async function getMyProfile(): Promise<Result<Profile>> {
  const client = getBrowserClient();
  if (!client) return err(ERROR_CODES.PROVIDER_UNAVAILABLE, NOT_CONFIGURED);

  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return err(ERROR_CODES.UNAUTHORIZED, "Please sign in again.");

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  if (error) return err(ERROR_CODES.INTERNAL, "Couldn't load your profile. Please retry.");
  return ok(data);
}

export async function completeOnboarding(input: OnboardingInput): Promise<Result<Profile>> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Please check your details.";
    return err(ERROR_CODES.VALIDATION_FAILED, message);
  }

  const client = getBrowserClient();
  if (!client) return err(ERROR_CODES.PROVIDER_UNAVAILABLE, NOT_CONFIGURED);

  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return err(ERROR_CODES.UNAUTHORIZED, "Please sign in again.");

  // The row already exists — handle_new_user() inserts it on signup — so this
  // is an update, and there is no INSERT policy for it to fall back on.
  const { data, error } = await client
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

  if (error) return err(ERROR_CODES.INTERNAL, "Couldn't save your details. Please try again.");
  return ok(data);
}
