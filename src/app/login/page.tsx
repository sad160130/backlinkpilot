"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkEmailAllowed } from "./actions";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const initialError =
    searchParams.get("error") === "auth_failed"
      ? "Sign-in failed. Please try the magic link again."
      : "";

  const [email, setEmail] = useState("");
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const gate = await checkEmailAllowed(trimmed);
      if (!gate.ok) {
        setError(gate.error ?? "Not authorized.");
        return;
      }

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setSuccess("Check your email for a magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-forest text-4xl font-bold text-center">BacklinkPilot</h1>
        <p className="text-gray-500 text-center mt-2">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-forest mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-forest focus:outline-none focus:ring-2 focus:ring-jade focus:border-jade"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-jade text-white font-semibold py-2.5 hover:bg-forest transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>

          {error && (
            <p className="text-red-600 text-sm text-center" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-jade text-sm text-center" role="status">
              {success}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
