"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextUrl = search.get("next") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don't match. Double-check both and try again."
          : error.message
      );
      return;
    }
    router.push(nextUrl);
    router.refresh();
  }

  async function handleResetPassword() {
    setError(null);
    if (!email) {
      setError("Enter your email above first, then click Reset password again.");
      return;
    }
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-stone-50 px-6 py-10">
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8"
        noValidate
      >
        <h1 className="text-2xl font-semibold text-stone-900">Sign in</h1>
        <p className="mt-1 text-sm text-stone-500">Groomies admin</p>

        <div className="mt-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        ) : null}

        {resetSent ? (
          <p
            role="status"
            className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
          >
            If an account exists for that email, we've sent a reset link. Check your inbox.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={handleResetPassword}
          className="mt-3 inline-flex w-full items-center justify-center text-sm text-stone-600 hover:text-stone-900 underline underline-offset-2"
        >
          Reset password
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
