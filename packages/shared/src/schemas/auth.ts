import { z } from "zod";

/**
 * Sign-in email + one-time code, shared by the web and the app.
 *
 * These live here rather than beside each surface because they are a
 * *definition* — what counts as a valid code — and the two clients talk to one
 * Supabase project. Two copies drifted once already: both hardcoded a 6-digit
 * code while the project was configured to issue 8, so every correct code was
 * rejected before it was ever sent to the server, on both platforms.
 *
 * Supabase's OTP length is a project setting, adjustable from 6 to 10 digits.
 * The range is accepted rather than any single length, so changing that setting
 * in the dashboard cannot silently break sign-in again. The server is the only
 * thing that decides whether a code is *correct*; this only decides whether it
 * is shaped like one, and a client-side length check that disagrees with the
 * dashboard is worse than no check at all.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const otpSchema = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\d{${OTP_MIN_LENGTH},${OTP_MAX_LENGTH}}$`),
    `Enter the code from your email (${OTP_MIN_LENGTH}–${OTP_MAX_LENGTH} digits)`,
  );
