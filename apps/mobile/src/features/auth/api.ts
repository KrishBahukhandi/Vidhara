import { ERROR_CODES, err, ok, type Result } from "@nexlex/shared";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));
const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export async function requestOtp(emailInput: string): Promise<Result<{ email: string }>> {
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success) {
    return err(ERROR_CODES.VALIDATION_FAILED, parsed.error.issues[0]?.message ?? "Invalid email");
  }
  if (!isSupabaseConfigured) {
    return err(
      ERROR_CODES.PROVIDER_UNAVAILABLE,
      "Backend not configured yet — add Supabase keys to apps/mobile/.env.",
    );
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return err(ERROR_CODES.PROVIDER_UNAVAILABLE, "Couldn't send the code. Please try again.");
  }
  return ok({ email: parsed.data });
}

export async function verifyOtp(email: string, codeInput: string): Promise<Result<null>> {
  const parsed = otpSchema.safeParse(codeInput);
  if (!parsed.success) {
    return err(ERROR_CODES.VALIDATION_FAILED, parsed.error.issues[0]?.message ?? "Invalid code");
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });
  if (error) return err(ERROR_CODES.UNAUTHORIZED, "That code didn't match. Try again.");
  return ok(null);
}
