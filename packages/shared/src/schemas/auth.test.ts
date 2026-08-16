import { describe, expect, it } from "vitest";

import { emailSchema, OTP_MAX_LENGTH, OTP_MIN_LENGTH, otpSchema } from "./auth";

describe("otpSchema", () => {
  // The bug this file exists for: both clients hardcoded /^\d{6}$/ while the
  // Supabase project was configured to issue 8-digit codes, so every correct
  // code was rejected in the client before it ever reached the server — on web
  // and on the app. A length rule that disagrees with the dashboard is worse
  // than no rule, because it fails on the happy path only.
  it("accepts every length Supabase can be configured to issue", () => {
    for (let n = OTP_MIN_LENGTH; n <= OTP_MAX_LENGTH; n += 1) {
      expect(otpSchema.safeParse("1".repeat(n)).success, `${n} digits`).toBe(true);
    }
  });

  it("accepts the 8-digit code this project actually issues", () => {
    expect(otpSchema.safeParse("12345678").success).toBe(true);
  });

  it("rejects lengths outside the supported range", () => {
    expect(otpSchema.safeParse("1".repeat(OTP_MIN_LENGTH - 1)).success).toBe(false);
    expect(otpSchema.safeParse("1".repeat(OTP_MAX_LENGTH + 1)).success).toBe(false);
    expect(otpSchema.safeParse("").success).toBe(false);
  });

  it("rejects anything that is not all digits", () => {
    expect(otpSchema.safeParse("12345a").success).toBe(false);
    expect(otpSchema.safeParse("123 456").success).toBe(false);
    expect(otpSchema.safeParse("+1234567").success).toBe(false);
  });

  it("trims surrounding whitespace, because pasting a code brings it along", () => {
    expect(otpSchema.safeParse("  12345678  ").success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("lowercases and trims, so the address matches what Supabase stored", () => {
    const parsed = emailSchema.safeParse("  Krish@Example.COM ");
    expect(parsed.success && parsed.data).toBe("krish@example.com");
  });

  it("rejects an address with no @", () => {
    expect(emailSchema.safeParse("notanemail").success).toBe(false);
  });
});
