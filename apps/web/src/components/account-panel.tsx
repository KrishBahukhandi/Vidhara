"use client";

import { ERROR_CODES, EXAM_TARGETS, USER_ROLES, type UserRole } from "@nexlex/shared";
import { useEffect, useState } from "react";

import {
  OTP_MAX_LENGTH,
  OTP_MIN_LENGTH,
  requestOtp,
  signOut,
  verifyOtp,
  type AuthMode,
} from "@/features/auth/api";
import { useSession } from "@/features/auth/session";
import { completeOnboarding, getMyProfile } from "@/features/profile/api";
import { track } from "@/lib/analytics";

/** Same wording as the app's onboarding screen — one vocabulary, two surfaces. */
const ROLE_LABELS: Record<UserRole, string> = {
  student: "Law student",
  aspirant: "Judiciary aspirant",
  advocate: "Advocate",
  professor: "Faculty",
  other: "Other",
};

const TARGET_LABELS: Record<string, string> = {
  "judiciary-pcsj": "Judiciary (PCS-J)",
  "clat-pg": "CLAT PG",
  aibe: "AIBE",
  "net-jrf-law": "NET/JRF Law",
  "semester-exams": "Semester exams",
  "moot-court": "Moot court",
  none: "Just exploring",
};

type Step = "email" | "code" | "profile";

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-10 rounded-md border px-4 text-small font-medium transition-colors ${
        selected
          ? "border-brand bg-brand text-on-brand"
          : "border-border text-text-muted hover:border-brand"
      }`}>
      {label}
    </button>
  );
}

/**
 * Sign in, create an account, and the signed-in view.
 *
 * Sign-in and sign-up are separate on purpose. They were one flow first, which
 * read as friendly and behaved badly: `shouldCreateUser: true` means a typo in
 * your own address silently becomes a second, empty account, and the reader is
 * told nothing. Choosing the mode makes "no account uses that email yet" a
 * thing we can say.
 *
 * The trade-off is worth naming: saying that DOES reveal whether an address is
 * registered, which is email enumeration. It is accepted here because the
 * alternative — silently creating accounts on typos — is a worse failure for
 * this product, and because an account currently grants nothing an attacker
 * would want (no synced data, no payment, no personal records).
 */
export function AccountPanel() {
  const session = useSession();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [profileDone, setProfileDone] = useState<boolean | null>(null);

  // A signed-in reader who never finished onboarding should finish it, however
  // they got here — a reload mid-signup, or an account made before this screen
  // existed. Asked once on mount rather than trusted from the signup path.
  useEffect(() => {
    if (session.status !== "signed-in") {
      setProfileDone(null);
      return;
    }
    let active = true;
    void getMyProfile().then((res) => {
      if (!active) return;
      if (!res.ok) {
        setProfileDone(true); // don't trap anyone behind a failed read
        return;
      }
      setProfileDone(Boolean(res.data.onboarded_at));
      setDisplayName(res.data.display_name ?? "");
      setRole((res.data.role as UserRole | null) ?? null);
      setTargets(res.data.exam_targets ?? []);
    });
    return () => {
      active = false;
    };
  }, [session.status]);

  const toggleTarget = (t: string) =>
    setTargets((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  if (session.status === "loading") {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <p className="text-body text-text-muted">Checking your session…</p>
      </div>
    );
  }

  // ---- Signed in, but onboarding not finished -------------------------------
  if (session.status === "signed-in" && profileDone === false) {
    const submitProfile = async () => {
      if (busy) return;
      if (!role) {
        setError("Choose the option that fits you best");
        return;
      }
      setBusy(true);
      setError(null);
      const res = await completeOnboarding({ displayName, role, examTargets: targets });
      setBusy(false);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      track("onboarding_completed", { role });
      setProfileDone(true);
    };

    return (
      <form
        className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submitProfile();
        }}>
        <div>
          <p className="font-serif text-h2 font-semibold text-text">Tell us who you are</p>
          <p className="mt-2 text-body text-text-muted">
            A minute of setup. It shapes what we build next — nothing here is shown to anyone else.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-small font-medium text-text">Your name</span>
          <input
            type="text"
            autoComplete="name"
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we address you?"
            className="w-full rounded-md border border-border bg-bg p-3 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
        </label>

        <div>
          <p className="mb-2 text-small font-medium text-text">Which fits you best?</p>
          <div className="flex flex-wrap gap-2">
            {USER_ROLES.map((r) => (
              <Chip
                key={r}
                label={ROLE_LABELS[r]}
                selected={role === r}
                onClick={() => setRole(r)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-small font-medium text-text">
            Preparing for anything? <span className="text-text-faint">(optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAM_TARGETS.map((t) => (
              <Chip
                key={t}
                label={TARGET_LABELS[t] ?? t}
                selected={targets.includes(t)}
                onClick={() => toggleTarget(t)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !displayName.trim() || !role}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50">
            {busy ? "Saving…" : "Finish setup"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setProfileDone(true)}
            className="text-small text-text-muted underline underline-offset-4 transition-colors hover:text-text disabled:opacity-50">
            Skip for now
          </button>
        </div>

        {error ? (
          <p role="alert" className="text-small text-text">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  // ---- Signed in ------------------------------------------------------------
  if (session.status === "signed-in") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-md border border-border bg-surface p-6">
          <p className="text-small font-medium text-text-muted">Signed in as</p>
          <p className="mt-1 font-mono text-body text-text">{session.email}</p>
          {displayName ? (
            <p className="mt-3 text-body text-text">
              {displayName}
              {role ? <span className="text-text-muted"> · {ROLE_LABELS[role]}</span> : null}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setProfileDone(false)}
              className="inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text transition-colors hover:border-brand disabled:opacity-50">
              Edit details
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const res = await signOut();
                setBusy(false);
                if (!res.ok) setError(res.error.message);
                else {
                  track("signed_out");
                  setStep("email");
                  setMode("signin");
                  setEmail("");
                  setCode("");
                  setDisplayName("");
                  setRole(null);
                  setTargets([]);
                }
              }}
              className="inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text transition-colors hover:border-brand disabled:opacity-50">
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
          {error ? <p className="mt-3 text-small text-text-muted">{error}</p> : null}
        </div>

        <div className="rounded-md border border-border p-6">
          <p className="text-h3 font-semibold text-text">What your account does today</p>
          <p className="mt-2 text-body text-text-muted">
            Honestly: not much yet. Signing in proves the address is yours, and records who you are
            so we know who we&rsquo;re building for.
          </p>
          <p className="mt-3 text-body text-text-muted">
            Your saved sections, reading history, case diary and quiz streak all still live{" "}
            <strong className="font-semibold text-text">only on this device</strong> — they are not
            uploaded, and they will not appear on your phone. Sync is the next thing being built,
            and this account is what it will attach to.
          </p>
        </div>
      </div>
    );
  }

  // ---- Signed out -----------------------------------------------------------
  const submitEmail = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNoAccount(false);
    const res = await requestOtp(email, mode);
    setBusy(false);
    if (!res.ok) {
      if (res.error.code === ERROR_CODES.NO_ACCOUNT) {
        setNoAccount(true);
        setError(null);
      } else {
        setError(res.error.message);
      }
      return;
    }
    track("sign_in_code_requested", { mode });
    setEmail(res.data.email);
    setStep("code");
  };

  const submitCode = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await verifyOtp(email, code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    track("signed_in", { mode });
    // useSession's listener flips this panel; the profile effect then decides
    // whether onboarding is still owed.
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setNoAccount(false);
    setError(null);
    setStep("email");
    setCode("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-border bg-surface p-6">
        {step === "email" ? (
          <div className="mb-5 flex gap-2" role="tablist" aria-label="Sign in or create account">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`h-10 flex-1 rounded-md border text-small font-medium transition-colors ${
                  mode === m
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border text-text-muted hover:border-brand"
                }`}>
                {m === "signin" ? "I have an account" : "Create an account"}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (step === "email" ? submitEmail() : submitCode());
          }}>
          {step === "email" ? (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-small font-medium text-text">Your email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setNoAccount(false);
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-border bg-bg p-3 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
                />
              </label>

              {noAccount ? (
                <div className="rounded-md border border-warning p-4">
                  <p className="text-body text-text">
                    No Vidhara account uses <span className="font-mono">{email}</span> yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="mt-3 inline-flex h-10 items-center rounded-md bg-brand px-4 font-medium text-on-brand transition-opacity hover:opacity-90">
                    Create an account with this email
                  </button>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50">
                {busy ? "Sending code…" : "Email me a code"}
              </button>
              <p className="text-micro text-text-faint">
                {mode === "signin"
                  ? "We'll email a one-time code. There is no password."
                  : "We'll email a one-time code, then ask a couple of questions about you."}
              </p>
            </>
          ) : (
            <>
              <p className="text-body text-text-muted">
                We sent a code to <span className="font-mono text-text">{email}</span>. It expires
                in an hour.
              </p>
              <label className="flex flex-col gap-2">
                <span className="text-small font-medium text-text">Enter the code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_MAX_LENGTH}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Paste the code from your email"
                  className="w-full rounded-md border border-border bg-bg p-3 font-mono text-h3 tracking-[0.2em] text-text placeholder:font-sans placeholder:text-body placeholder:tracking-normal placeholder:text-text-faint focus:border-brand focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy || code.length < OTP_MIN_LENGTH}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50">
                  {busy ? "Checking…" : mode === "signup" ? "Verify and continue" : "Sign in"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => switchMode(mode)}
                  className="text-small text-text-muted underline underline-offset-4 transition-colors hover:text-text disabled:opacity-50">
                  Use a different email
                </button>
              </div>
            </>
          )}

          {error ? (
            <p role="alert" className="text-small text-text">
              {error}
            </p>
          ) : null}
        </form>
      </div>

      <div className="rounded-md border border-border p-6">
        <p className="text-h3 font-semibold text-text">You do not need an account</p>
        <p className="mt-2 text-body text-text-muted">
          Every act, the old⇄new mapping, search, the daily quiz and the advocate tools work
          signed-out and always will. Saved sections and your reading history are stored on this
          device, not on our servers.
        </p>
        <p className="mt-3 text-body text-text-muted">
          Signing in today proves the address is yours and tells us who we&rsquo;re building for. It
          does <strong className="font-semibold text-text">not</strong> yet sync anything between
          your phone and this browser — that is being built next.
        </p>
      </div>
    </div>
  );
}
