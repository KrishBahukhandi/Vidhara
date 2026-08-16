/**
 * Auth feature — web. The app twin is apps/mobile/src/features/auth/api.ts and
 * the two must stay in step: same code, same Supabase templates, same typed
 * Result contract (rules.md §3 — components never touch the client). The
 * schemas themselves now live in @nexlex/shared precisely so "in step" is
 * enforced rather than remembered.
 *
 * Sign-in is a code, never a link. Supabase's stock Magic Link template emits
 * {{ .ConfirmationURL }}; both it and Confirm signup were rewritten to send
 * {{ .Token }} instead (D-065), which is what makes the length check below
 * meaningful rather than a validation that can never pass.
 */
import { ERROR_CODES, emailSchema, err, ok, otpSchema, type Result } from "@nexlex/shared";

import { getBrowserClient } from "@/lib/supabase-browser";

export { emailSchema, OTP_MAX_LENGTH, OTP_MIN_LENGTH } from "@nexlex/shared";

const NOT_CONFIGURED = "Sign-in isn't available right now. Please try again later.";

/** Distinguishes "I already have an account" from "make me one". */
export type AuthMode = "signin" | "signup";


export async function requestOtp(
  emailInput: string,
  mode: AuthMode,
): Promise<Result<{ email: string }>> {
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success) {
    return err(ERROR_CODES.VALIDATION_FAILED, parsed.error.issues[0]?.message ?? "Invalid email");
  }

  const client = getBrowserClient();
  if (!client) return err(ERROR_CODES.PROVIDER_UNAVAILABLE, NOT_CONFIGURED);

  // The mode IS the shouldCreateUser flag. On "signin" Supabase refuses an
  // address it has never seen, which is what lets the panel say "no account
  // yet" instead of silently creating one — the previous behaviour, where a
  // typo in your own address quietly became a second empty account.
  //
  // Which template arrives follows from the same flag: a new address gets
  // "Confirm signup", a returning one gets "Magic Link". Both were rewritten
  // to emit {{ .Token }} (D-065); if either still sends a link, that path is
  // broken regardless of anything here.
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: mode === "signup" },
  });

  if (error) {
    // Supabase reports its own send-rate limit as a 429. Saying "try again"
    // to someone who must wait an hour is worse than saying nothing.
    if (error.status === 429) {
      return err(
        ERROR_CODES.PROVIDER_UNAVAILABLE,
        "Too many codes requested. Please wait a few minutes and try again.",
      );
    }
    // Refusing to create the user surfaces as 422 "Signups not allowed for
    // otp". Matched on both code and message because the string has changed
    // between GoTrue releases and this decides which screen the reader sees.
    const looksLikeNoAccount =
      mode === "signin" &&
      (error.status === 422 || /signups? not allowed|user not found/i.test(error.message));
    if (looksLikeNoAccount) {
      return err(ERROR_CODES.NO_ACCOUNT, "No Vidhara account uses that email yet.");
    }

    return err(ERROR_CODES.PROVIDER_UNAVAILABLE, "Couldn't send the code. Please try again.");
  }
  return ok({ email: parsed.data });
}

export async function verifyOtp(email: string, codeInput: string): Promise<Result<null>> {
  const parsed = otpSchema.safeParse(codeInput);
  if (!parsed.success) {
    return err(ERROR_CODES.VALIDATION_FAILED, parsed.error.issues[0]?.message ?? "Invalid code");
  }

  const client = getBrowserClient();
  if (!client) return err(ERROR_CODES.PROVIDER_UNAVAILABLE, NOT_CONFIGURED);

  const { error } = await client.auth.verifyOtp({
    email,
    token: parsed.data,
    type: "email",
  });
  if (error) return err(ERROR_CODES.UNAUTHORIZED, "That code didn't match. Try again.");
  return ok(null);
}

export async function signOut(): Promise<Result<null>> {
  const client = getBrowserClient();
  if (!client) return err(ERROR_CODES.PROVIDER_UNAVAILABLE, NOT_CONFIGURED);

  const { error } = await client.auth.signOut();
  if (error) return err(ERROR_CODES.INTERNAL, "Couldn't sign out. Please try again.");
  return ok(null);
}
