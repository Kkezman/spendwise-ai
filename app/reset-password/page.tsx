"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

type RecoveryState = "checking" | "valid" | "invalid" | "updated";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/recovery/status")
      .then((response) => {
        if (active) setRecoveryState(response.ok ? "valid" : "invalid");
      })
      .catch(() => {
        if (active) setRecoveryState("invalid");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setError("");
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8 || password.length > 256) {
      setError("Your password must be between 8 and 256 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/recovery/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        if (response.status === 401) setRecoveryState("invalid");
        throw new Error(payload.message ?? "Unable to update your password.");
      }
      setPassword("");
      setConfirmPassword("");
      setRecoveryState("updated");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update your password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Choose a new password for your account.">
      {recoveryState === "checking" && <p role="status" className="text-sm text-slate-600">Verifying your recovery session…</p>}

      {recoveryState === "invalid" && (
        <div className="space-y-4">
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            This recovery link is invalid, expired, or already used. Request a new recovery email to continue.
          </p>
          <Link href="/forgot-password" className="block text-center text-sm font-semibold text-emerald-700">
            Request a new recovery link
          </Link>
        </div>
      )}

      {recoveryState === "valid" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-3 text-slate-500" aria-label={showPassword ? "Hide new password" : "Show new password"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Use between 8 and 256 characters.</p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmation ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={256}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm focus:border-emerald-500 focus:outline-none"
                required
              />
              <button type="button" onClick={() => setShowConfirmation((visible) => !visible)} className="absolute inset-y-0 right-3 text-slate-500" aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"}>
                {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {isSigningOut ? "Signing out…" : "Cancel and sign out"}
          </button>
        </form>
      )}

      {recoveryState === "updated" && (
        <div className="space-y-4">
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Your password has been updated. Sign in with your new password.
          </p>
          <Link href="/login" className="block text-center text-sm font-semibold text-emerald-700">Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
